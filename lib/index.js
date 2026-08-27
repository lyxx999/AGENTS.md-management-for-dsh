/**
 * dsh-agents-md — host half (row `agents-md`).
 *
 * Provides:
 *   1) settings namespace `agent-instructions-ui` with a single field
 *      `globalDir` (empty string = default $DSH_HOME).
 *   2) `AgentsMdGateway` — a Typert Remote (SRC) service on wire namespace
 *      `agentsMd` exposing listWorkspaces / readFile / saveFile / deleteFile
 *      to the client settings page.
 *
 * File operations: read/write go through the `ctx.fs` seam when available
 * (atomic writes, version-gated via FsWriteIntent) with a node:fs
 * tmp+rename fallback; deletion uses node:fs/promises.rm because the seam
 * has no delete primitive. The built-in `dsh-agent-instructions` loader
 * reads the on-disk files per agent step — this plugin only places files.
 */
import { copyFile, mkdir, readFile as readFileNode, rename, rm, stat, writeFile } from "node:fs/promises";
import { realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize } from "node:path";
import z from "@deepseek-ai/schemastery";
import { settingsNamespace } from "@deepseek-ai/dsh-settings";
import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
import { resolveDshHome } from "@deepseek-ai/dsh-home-paths";

export const name = "dsh-agents-md";

/** Durable settings namespace (distinct from the built-in loader's `agent-instructions` service key). */
const SETTINGS_NS = "agent-instructions-ui";
const AGENTS_MD = "AGENTS.md";
const BACKUP_SUFFIX = ".bak";
/** Loader per-source cap (`maxSourceBytes` in dsh-agent-instructions). */
const SOURCE_CAP_BYTES = 1048576;
/** Loader render budget (`maxBytes` in dsh-agent-instructions). */
const RENDER_BUDGET_BYTES = 65536;

/** One field: where the global AGENTS.md source lives. Empty = default $DSH_HOME. */
const AgentsMdSettingsSchema = z.object({
  globalDir: z.string().default(""),
});

/** A write was rejected because the file changed after the caller's snapshot. */
class StaleWriteError extends Error {
  constructor(path) {
    super(`file changed before write: ${path}`);
    this.name = "StaleWriteError";
    this.code = "STALE_WRITE";
  }
}

/**
 * Canonicalize an absolute path (following symlinks) even when the final
 * component does not exist yet: walk up to the deepest existing ancestor,
 * realpath it, then re-append the missing components. Returns null when the
 * input is not an absolute path or no existing ancestor can be resolved.
 */
function canonicalize(input) {
  if (typeof input !== "string" || input.length === 0) return null;
  if (!isAbsolute(input)) return null; // no implicit cwd anchoring
  let current = normalize(input);
  const tail = [];
  for (;;) {
    try {
      const root = realpathSync(current);
      // tail[0] is the segment closest to root; re-append in that order.
      let canonical = root;
      for (let i = 0; i < tail.length; i += 1) canonical = join(canonical, tail[i]);
      return canonical;
    } catch {
      const parent = dirname(current);
      if (parent === current) return null; // reached the filesystem root
      tail.unshift(basename(current));
      current = parent;
    }
  }
}

class AgentsMdGateway extends TypertRemoteService {
  constructor(ctx) {
    super(ctx, "agentsMd");
  }

  // ── Path governance ────────────────────────────────────────────────────

  /**
   * Current workspace set: `workspaceRegistry.list()` (realpath-normalized
   * `path`, `title`, `sessionIds`) with a `sessions.list()` + `header.cwd`
   * dedup fallback. Snapshot semantics — no watcher (design §5).
   */
  workspaces() {
    const registry = this.ctx.get("workspaceRegistry");
    if (registry !== void 0 && typeof registry.list === "function") {
      try {
        const rows = [];
        for (const workspace of registry.list()) {
          const path = workspace !== null && typeof workspace === "object" && typeof workspace.path === "string" ? canonicalize(workspace.path) : null;
          if (path === null) continue;
          rows.push({
            path,
            title: typeof workspace.title === "string" && workspace.title !== "" ? workspace.title : basename(path),
            sessionCount: Array.isArray(workspace.sessionIds) ? workspace.sessionIds.length : 0,
          });
        }
        if (rows.length > 0) return rows;
      } catch {
        // fall through to the session-based fallback
      }
    }
    const sessions = this.ctx.get("sessions");
    if (sessions === void 0 || typeof sessions.list !== "function") return [];
    const byPath = new Map();
    for (const session of sessions.list()) {
      const cwd = session !== null && typeof session === "object" && session.header !== null && typeof session.header === "object" ? session.header.cwd : void 0;
      if (typeof cwd !== "string" || cwd === "") continue;
      const path = canonicalize(cwd);
      if (path === null) continue;
      const row = byPath.get(path) ?? { path, title: basename(path), sessionCount: 0 };
      row.sessionCount += 1;
      byPath.set(path, row);
    }
    return [...byPath.values()];
  }

  /**
   * The allow-set, computed fresh on every call (settings and the workspace
   * set may change between calls): the global source file, the fixed global
   * mirror file, and `<workspace>/AGENTS.md` for each current workspace —
   * all canonicalized (realpath). No other path is ever readable or writable.
   */
  allowedPaths() {
    const dshHome = resolveDshHome();
    const settings = this.ctx.get("settings");
    const section = settings !== void 0 && typeof settings.get === "function" ? settings.get(SETTINGS_NS) : void 0;
    const configured = section !== null && typeof section === "object" && typeof section.globalDir === "string" ? section.globalDir : "";
    const globalDir = configured !== "" ? configured : dshHome;
    const source = canonicalize(join(globalDir, AGENTS_MD));
    const mirror = canonicalize(join(dshHome, AGENTS_MD));
    const set = new Set();
    if (source !== null) set.add(source);
    if (mirror !== null) set.add(mirror);
    for (const row of this.workspaces()) {
      const entry = canonicalize(join(row.path, AGENTS_MD));
      if (entry !== null) set.add(entry);
    }
    return {
      dshHome,
      globalDir: canonicalize(globalDir) ?? globalDir,
      source,
      mirror,
      set,
    };
  }

  /** Shared validation for every method: exact canonical membership. */
  requireAllowed(path, set) {
    if (typeof path !== "string") throw new Error("path must be a string");
    const canonical = canonicalize(path);
    if (canonical === null) throw new Error(`path is not an absolute path: ${path}`);
    if (!set.has(canonical)) throw new Error(`path is not an allowed AGENTS.md location: ${canonical}`);
    return canonical;
  }

  // ── File primitives ────────────────────────────────────────────────────

  /** Copy an existing file to `<path>.bak` (single backup, overwritten). No-op + null when absent. */
  async backupFile(targetPath) {
    const existing = await stat(targetPath).catch(() => null);
    if (existing === null || !existing.isFile()) return null;
    await mkdir(dirname(targetPath), { recursive: true });
    await copyFile(targetPath, `${targetPath}${BACKUP_SUFFIX}`);
    return `${targetPath}${BACKUP_SUFFIX}`;
  }

  /**
   * Atomic text write. Prefers the `ctx.fs` seam with version intent
   * (replaceIfVersion on an observed version, createIfAbsent when the target
   * was absent). The raw node:fs tmp+rename fallback completes the call when
   * the seam is unavailable, when resolve failed for a non-FS reason, or when
   * the seam's fence returns the STRUCTURED policy denial FS_SANDBOX_DENIED:
   * the desktop deployment default for agentless host calls is
   * `workspace-write`, whose writable roots (workspace root + temp) exclude
   * the $DSH_HOME mirror — the built-in loader's fixed read point. The fence
   * is a policy check over MODEL-controlled paths (dsh-fs-sandbox doc); every
   * write through this plugin is USER-initiated (loopback-only settings UI,
   * human-typed/confirmed paths), so the raw fallback — the same atomic
   * tmp+rename the seam itself delegates to — is the sanctioned completion
   * for exactly that denial. All other FS_* failures still surface.
   */
  async writeContent(targetPath, content) {
    await mkdir(dirname(targetPath), { recursive: true });
    const fs = this.ctx.get("fs");
    if (fs !== void 0 && typeof fs.resolve === "function" && typeof fs.stat === "function" && typeof fs.writeText === "function") {
      let target;
      try {
        target = await fs.resolve(targetPath);
      } catch (error) {
        if (!(typeof error?.code === "string" && error.code.startsWith("FS_"))) target = void 0;
        else throw error;
      }
      if (target !== void 0) {
        try {
          const info = await fs.stat(target);
          if (info !== void 0) await fs.writeText(target, content, { kind: "replaceIfVersion", version: info.version });
          else await fs.writeText(target, content, { kind: "createIfAbsent" });
          return;
        } catch (error) {
          const code = typeof error?.code === "string" ? error.code : "";
          if (code === "FS_STALE_VERSION" || code === "FS_NOT_OBSERVED") throw new StaleWriteError(targetPath);
          if (code === "FS_SANDBOX_DENIED") {
            // structured policy denial, not an IO fault: fall through to the
            // raw atomic fallback below (see the method doc).
          } else if (code.startsWith("FS_")) throw error; // other policy/IO failure — do not mask with a second writer
        }
      }
    }
    await this.writeAtomicNode(targetPath, content);
  }

  async writeAtomicNode(targetPath, content) {
    const tmp = `${targetPath}.${process.pid}.${Date.now().toString(36)}.tmp`;
    await writeFile(tmp, content, "utf8");
    try {
      await rename(tmp, targetPath);
    } catch (error) {
      await rm(tmp, { force: true }).catch(() => {});
      throw error;
    }
  }

  // ── Remote methods (SRC endpoints: agentsMd/<method>) ──────────────────
  // Signature note: simple identifier parameters only (the gateway derives
  // the wire contract from Function.prototype.toString).

  /** Workspace list + global zone status snapshot (design §2.2 shape). */
  async listWorkspaces() {
    const allowed = this.allowedPaths();
    const workspaces = [];
    for (const row of this.workspaces()) {
      const file = canonicalize(join(row.path, AGENTS_MD));
      const st = file !== null ? await stat(file).catch(() => null) : null;
      workspaces.push({
        path: row.path,
        title: row.title,
        sessionCount: row.sessionCount,
        agentsMd: {
          file,
          exists: st !== null && st.isFile(),
          sizeBytes: st !== null && st.isFile() ? st.size : 0,
        },
      });
    }
    const sourceStat = allowed.source !== null ? await stat(allowed.source).catch(() => null) : null;
    const mirrorStat = allowed.mirror !== null ? await stat(allowed.mirror).catch(() => null) : null;
    return {
      workspaces,
      global: {
        dir: allowed.globalDir,
        file: allowed.source,
        exists: sourceStat !== null && sourceStat.isFile(),
        sizeBytes: sourceStat !== null && sourceStat.isFile() ? sourceStat.size : 0,
        mirrorFile: allowed.mirror,
        mirrorExists: mirrorStat !== null && mirrorStat.isFile(),
        sourceCapBytes: SOURCE_CAP_BYTES,
        renderBudgetBytes: RENDER_BUDGET_BYTES,
      },
    };
  }

  /**
   * Read one allowed AGENTS.md. Missing file → empty content with mtimeMs 0
   * (the "new file" marker the editor uses).
   */
  async readFile(path) {
    const allowed = this.allowedPaths();
    const target = this.requireAllowed(path, allowed.set);
    let content;
    const fs = this.ctx.get("fs");
    if (fs !== void 0 && typeof fs.resolve === "function" && typeof fs.readText === "function" && typeof fs.stat === "function") {
      let targetRef;
      try {
        targetRef = await fs.resolve(target);
      } catch (error) {
        if (typeof error?.code === "string" && error.code.startsWith("FS_")) throw error;
        targetRef = void 0;
      }
      if (targetRef !== void 0) {
        try {
          const info = await fs.stat(targetRef);
          content = info !== void 0 ? await fs.readText(targetRef) : "";
        } catch (error) {
          if (typeof error?.code === "string" && error.code.startsWith("FS_")) throw new Error(`readFile: ${error.message}`);
          content = void 0; // non-FS failure → node fallback below
        }
      }
    }
    const nodeStat = await stat(target).catch(() => null);
    if (content === void 0) {
      if (nodeStat === null || !nodeStat.isFile()) content = "";
      else content = await readFileNode(target, "utf8");
    }
    return {
      path: target,
      content,
      sizeBytes: Buffer.byteLength(content, "utf8"),
      mtimeMs: nodeStat !== null ? nodeStat.mtimeMs : 0,
    };
  }

  /**
   * Save one allowed AGENTS.md (design §2.5, step for step):
   * allow-set → byte cap → mtime staleness gate → .bak backup → atomic write
   * (version-gated) → mirror to <dshHome>/AGENTS.md when the source is the
   * configured global file and the mirror is a different file.
   *
   * Returns {ok:true, mirrored, mirrorNoop, backupPath, bytes} — degraded
   * {ok:true, mirrored:false, mirrorError} when the source saved but the
   * mirror failed — or {ok:false, code:'stale'|'too-large', ...}.
   */
  async saveFile(path, content, baseMtimeMs) {
    if (typeof content !== "string") throw new Error("saveFile: content must be a string");
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > SOURCE_CAP_BYTES) return { ok: false, code: "too-large", bytes, capBytes: SOURCE_CAP_BYTES };
    const allowed = this.allowedPaths();
    const target = this.requireAllowed(path, allowed.set);
    const before = await stat(target).catch(() => null);
    const existed = before !== null && before.isFile();
    if (existed && typeof baseMtimeMs === "number" && Number.isFinite(baseMtimeMs) && before.mtimeMs !== baseMtimeMs) {
      return { ok: false, code: "stale", currentMtimeMs: before.mtimeMs };
    }
    let backupPath = null;
    if (existed) backupPath = await this.backupFile(target);
    try {
      await this.writeContent(target, content);
    } catch (error) {
      if (error?.code === "STALE_WRITE") {
        const now = await stat(target).catch(() => null);
        return { ok: false, code: "stale", currentMtimeMs: now !== null ? now.mtimeMs : null };
      }
      throw error;
    }
    let mirrored = true;
    let mirrorNoop = true;
    let mirrorError;
    if (allowed.source !== null && target === allowed.source && allowed.mirror !== null && allowed.mirror !== target) {
      mirrorNoop = false;
      try {
        await this.backupFile(allowed.mirror); // keeps the last known-good mirror
        await this.writeContent(allowed.mirror, content);
      } catch (error) {
        mirrored = false;
        mirrorError = error instanceof Error ? error.message : String(error);
      }
    }
    return { ok: true, mirrored, mirrorNoop, backupPath, bytes };
  }

  /**
   * Delete one allowed AGENTS.md (+ its global mirror when the source is the
   * configured global file and the mirror is a different file). `.bak` files
   * are retained as the last recoverable versions. Re-stats to confirm.
   */
  async deleteFile(path) {
    const allowed = this.allowedPaths();
    const target = this.requireAllowed(path, allowed.set);
    const counterpart =
      allowed.source !== null && target === allowed.source && allowed.mirror !== null && allowed.mirror !== allowed.source
        ? allowed.mirror
        : null;
    for (const candidate of [target, counterpart]) {
      if (candidate === null) continue;
      try {
        await rm(candidate);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
    }
    const still = await stat(target).catch(() => null);
    if (still !== null) throw new Error(`deleteFile: file reappeared after deletion: ${target}`);
    if (counterpart !== null) {
      const stillMirror = await stat(counterpart).catch(() => null);
      if (stillMirror !== null) throw new Error(`deleteFile: mirror reappeared after deletion: ${counterpart}`);
    }
    return { ok: true, mirrorDeleted: counterpart !== null };
  }
}

/**
 * Manual @Remote application (the plain-JS equivalent of the TypeScript
 * decorator): `Remote(name)` returns a `(method, context) => addMarkerInitializer`
 * decorator; the initializer records the marker on
 * `Object.getPrototypeOf(this)`, so running it once against a dummy instance
 * of the class marks the class prototype — exactly what
 * `remoteMethods(liveInstance)` (and the gateway's SRC discovery) reads.
 */
{
  const prototype = AgentsMdGateway.prototype;
  for (const method of ["listWorkspaces", "readFile", "saveFile", "deleteFile"]) {
    let initializer;
    Remote(method)(prototype[method], {
      name: method,
      private: false,
      static: false,
      addInitializer: (fn) => {
        initializer = fn;
      },
    });
    initializer.call(Object.create(prototype));
  }
}

export function apply(ctx) {
  // 1) Settings namespace — an effect on the calling fiber, removed on dispose.
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.register(settingsNamespace(SETTINGS_NS), AgentsMdSettingsSchema);
  });
  // 2) Remote gateway — a service published on this plugin's fiber.
  new AgentsMdGateway(ctx);
}
