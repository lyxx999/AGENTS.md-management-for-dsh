/**
 * Host half of the AGENTS.md manager (row `agents-md-manager`).
 *
 * Adopts the proven architecture of the reference plugin
 * (github.com/lyxx999/AGENTS.md-management-for-dsh), adapted to the current
 * DSH Desktop 2.0.17 APIs:
 *   - Host entry is `export function apply(ctx)`; the gateway is constructed
 *     inside it (`new AgentsMdGateway(ctx)`), not a default-exported class.
 *   - `@Remote` methods are marked via `Remote(name)(prototype[name],
 *     { addInitializer })` + one `initializer.call(Object.create(prototype))`
 *     (no `__esDecorate`, no per-instance `__runInitializers`).
 *   - Services are read through `this.ctx.get(...)` (the Cordis Context gate
 *     rejects direct `this.ctx.<key>` reads for non-inject members).
 *   - `listWorkspaces()` returns a single snapshot { workspaces, global } in
 *     one RPC (the client renders both zones from it).
 *   - The `globalDir` setting uses the current `configEditor` service (the
 *     old `settings.register` API is gone in 2.0.17).
 *
 * This plugin only *writes* files: the built-in `dsh-agent-instructions`
 * loader reads AGENTS.md from disk at every agent step.
 */
import { copyFile, mkdir, readFile as readFileNode, rm, stat as statNode, writeFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, normalize, resolve } from 'node:path';
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';

export const name = 'agents-md-manager';

const AGENTS_MD = 'AGENTS.md';
const BACKUP_SUFFIX = '.bak';
/** Loader per-source cap (`maxSourceBytes` in dsh-agent-instructions). */
const SOURCE_CAP_BYTES = 1048576; // 1 MiB
/** Loader render budget (`maxBytes` in dsh-agent-instructions). */
const RENDER_BUDGET_BYTES = 65536; // 64 KiB
const PLUGIN_ENTRY = '@local/agents-md-manager';

/* ----------------------------- path helpers ---------------------------- */

/**
 * Canonicalize an absolute path (following symlinks) even when the final
 * component does not exist yet: walk up to the deepest existing ancestor,
 * realpath it, then re-append the missing components. Returns null when the
 * input is not an absolute path or no existing ancestor can be resolved.
 */
function canonicalize(input) {
	if (typeof input !== 'string' || input.length === 0) return null;
	if (!isAbsolute(input)) return null;
	let current = normalize(input);
	const tail = [];
	for (;;) {
		try {
			const root = realpathSync(current);
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

/** $DSH_HOME directory (the loader reads $DSH_HOME/AGENTS.md). */
function dshHomeDir() {
	if (process.env.DSH_HOME && process.env.DSH_HOME.trim()) return process.env.DSH_HOME.trim();
	const home = process.platform === 'win32'
		? (process.env.USERPROFILE || process.env.HOME || '')
		: (process.env.HOME || '');
	return join(home, '.dsh');
}

function byteLen(s) {
	let n = 0;
	for (let i = 0; i < s.length; i++) {
		const c = s.codePointAt(i);
		if (c > 0xffff) i++;
		n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
	}
	return n;
}

async function statInfo(p) {
	try {
		const s = await statNode(p);
		return { exists: s.isFile(), sizeBytes: s.isFile() ? s.size : 0, mtimeMs: s.mtimeMs };
	} catch {
		return { exists: false, sizeBytes: 0, mtimeMs: 0 };
	}
}

function err(code, message, extra = {}) {
	return Object.assign(new Error(message), { code, ...extra });
}

/* ------------------------------ gateway -------------------------------- */

class AgentsMdGateway extends TypertRemoteService {
	constructor(ctx) {
		super(ctx, 'agentsMd');
	}

	/** The current plugin Loader entry (addressed by patch id), or null. */
	configEntry() {
		const ce = this.ctx.get('configEditor');
		try {
			const entries = ce && typeof ce.entries === 'function' ? ce.entries() : [];
			return (entries || []).find((e) => e && e.options && e.options.id === PLUGIN_ENTRY) || null;
		} catch {
			return null;
		}
	}

	/** Current globalDir from the plugin config entry ('' = default home). */
	configGlobalDir() {
		const entry = this.configEntry();
		const cfg = entry && entry.options && entry.options.config;
		return (cfg && typeof cfg.globalDir === 'string') ? cfg.globalDir.trim() : '';
	}

	/** The allow-set, computed fresh on every call. */
	allowedPaths() {
		const dshHome = dshHomeDir();
		const configured = this.configGlobalDir();
		const globalDir = configured !== '' ? configured : dshHome;
		const source = canonicalize(join(globalDir, AGENTS_MD));
		const mirror = canonicalize(join(dshHome, AGENTS_MD));
		const set = new Set();
		if (source !== null) set.add(source);
		if (mirror !== null) set.add(mirror);
		for (const row of this.workspaces()) {
			const entry = canonicalize(join(row.path, AGENTS_MD));
			if (entry !== null) set.add(entry);
		}
		return { dshHome, globalDir: canonicalize(globalDir) ?? globalDir, source, mirror, set };
	}

	/** Exact canonical membership check; throws for any path outside the set. */
	requireAllowed(path) {
		const allowed = this.allowedPaths();
		const target = canonicalize(path);
		if (target === null || !allowed.set.has(target)) {
			throw err('not-allowed', `Path is outside the AGENTS.md allow-set: ${path}`);
		}
		return target;
	}

	/**
	 * Current workspace set: `workspaceRegistry.list()` (realpath-normalized
	 * path/title/sessionIds) with a `sessions.list()` + `header.cwd` dedup
	 * fallback. Snapshot semantics — no watcher.
	 */
	workspaces() {
		const registry = this.ctx.get('workspaceRegistry');
		if (registry !== void 0 && typeof registry.list === 'function') {
			try {
				const rows = [];
				for (const workspace of registry.list()) {
					const p = workspace !== null && typeof workspace === 'object' && typeof workspace.path === 'string' ? canonicalize(workspace.path) : null;
					if (p === null) continue;
					rows.push({
						path: p,
						title: typeof workspace.title === 'string' && workspace.title !== '' ? workspace.title : basename(p),
						sessionCount: Array.isArray(workspace.sessionIds) ? workspace.sessionIds.length : 0,
					});
				}
				if (rows.length > 0) return rows;
			} catch {
				// fall through to the session-based fallback
			}
		}
		const sessions = this.ctx.get('sessions');
		if (sessions === void 0 || typeof sessions.list !== 'function') return [];
		const byPath = new Map();
		for (const session of sessions.list()) {
			const cwd = session !== null && typeof session === 'object' && session.header !== null && typeof session.header === 'object' ? session.header.cwd : void 0;
			if (typeof cwd !== 'string' || cwd === '') continue;
			const p = canonicalize(cwd);
			if (p === null) continue;
			const row = byPath.get(p) ?? { path: p, title: basename(p), sessionCount: 0 };
			row.sessionCount += 1;
			byPath.set(p, row);
		}
		return [...byPath.values()];
	}

	/* --------------------------- remote methods ------------------------- */

	/** One RPC returns the full page snapshot: global zone + workspace rows. */
	async listWorkspaces() {
		const allowed = this.allowedPaths();
		const workspaces = [];
		for (const row of this.workspaces()) {
			const file = canonicalize(join(row.path, AGENTS_MD));
			const st = file !== null ? await statInfo(file) : null;
			workspaces.push({
				path: row.path,
				title: row.title,
				sessionCount: row.sessionCount,
				agentsMd: {
					file,
					exists: st !== null && st.exists,
					sizeBytes: st !== null ? st.sizeBytes : 0,
				},
			});
		}
		const sourceStat = allowed.source !== null ? await statInfo(allowed.source) : null;
		const mirrorStat = allowed.mirror !== null ? await statInfo(allowed.mirror) : null;
		return {
			workspaces,
			global: {
				dir: allowed.globalDir,
				file: allowed.source,
				exists: sourceStat !== null && sourceStat.exists,
				sizeBytes: sourceStat !== null ? sourceStat.sizeBytes : 0,
				mirrorFile: allowed.mirror,
				mirrorExists: mirrorStat !== null && mirrorStat.exists,
				sourceCapBytes: SOURCE_CAP_BYTES,
				renderBudgetBytes: RENDER_BUDGET_BYTES,
			},
		};
	}

	/** Persist the globalDir setting (only affects the next save's location). */
	async setConfig(cfg) {
		const dir = (cfg && typeof cfg.globalDir === 'string') ? cfg.globalDir.trim() : '';
		const ce = this.ctx.get('configEditor');
		const entry = this.configEntry();
		if (!entry) throw err('no-entry', 'plugin config entry not found');
		// `change` receives (current, inherited) → return the full next config.
		await ce.edit(entry, (current) => ({ ...(current || {}), globalDir: dir }));
		const allowed = this.allowedPaths();
		return { globalDir: allowed.globalDir, source: allowed.source, mirror: allowed.mirror };
	}

	/** Read one allowed AGENTS.md. Missing → empty content, mtimeMs 0. */
	async readFile(path) {
		const target = this.requireAllowed(path);
		let content;
		const nodeStat = await statInfo(target);
		if (!nodeStat.exists) content = '';
		else content = await readFileNode(target, 'utf8');
		return {
			path: target,
			content,
			sizeBytes: Buffer.byteLength(content, 'utf8'),
			mtimeMs: nodeStat.mtimeMs,
		};
	}

	/**
	 * Save one allowed AGENTS.md: 1 MiB hard cap, mtime-staleness gate, single
	 * .bak of the previous version. Global saves also mirror to the fixed
	 * loader read point (degrade + report on mirror failure).
	 */
	async saveFile(path, content, baseMtimeMs) {
		const target = this.requireAllowed(path);
		if (byteLen(content) > SOURCE_CAP_BYTES) {
			throw err('too-large', `File exceeds the ${SOURCE_CAP_BYTES} byte hard limit.`, { bytes: byteLen(content), capBytes: SOURCE_CAP_BYTES });
		}
		const prev = await statInfo(target);
		if (prev.exists && baseMtimeMs != null && Math.abs(prev.mtimeMs - baseMtimeMs) > 1) {
			throw err('stale', `File changed on disk while open: ${target}`, { currentMtimeMs: prev.mtimeMs });
		}
		let backupPath = null;
		if (prev.exists) {
			backupPath = target + BACKUP_SUFFIX;
			try { await copyFile(target, backupPath); } catch { /* best-effort backup */ }
		}
		await mkdir(dirname(target), { recursive: true });
		await writeFile(target, content, 'utf8');

		// Mirror: when the source is not the loader read point, sync it there.
		let mirrored = true;
		let mirrorError = null;
		let mirrorPath = null;
		const allowed = this.allowedPaths();
		if (allowed.source !== null && allowed.mirror !== null && allowed.source !== allowed.mirror && target === allowed.source) {
			mirrorPath = allowed.mirror;
			try {
				await mkdir(dirname(allowed.mirror), { recursive: true });
				await writeFile(allowed.mirror, content, 'utf8');
			} catch (e) {
				mirrored = false;
				mirrorError = String(e && e.message || e);
			}
		}

		const st = await statInfo(target);
		return {
			path: target,
			ok: true,
			mtimeMs: st.mtimeMs,
			sizeBytes: st.sizeBytes,
			backupPath,
			mirrored,
			mirrorPath,
			mirrorError,
		};
	}

	/** Delete one allowed AGENTS.md (source + its mirror, if it is global). */
	async deleteFile(path) {
		const target = this.requireAllowed(path);
		const allowed = this.allowedPaths();
		const targets = [target];
		if (allowed.source !== null && allowed.mirror !== null && allowed.source !== allowed.mirror && target === allowed.source) {
			targets.push(allowed.mirror);
		}
		for (const p of targets) {
			try { await rm(p, { force: true }); } catch { /* already absent */ }
		}
		return { ok: true, path: target, alsoDeleted: targets.slice(1) };
	}
}

/* ------------------- mark @Remote methods on the prototype -------------- */
// `Remote(name)` returns `(method, context) => addMarkerInitializer`; running
// the captured initializer once on a dummy instance marks the class
// prototype, which `remoteMethods(liveInstance)` / gateway SRC discovery reads.
{
	const prototype = AgentsMdGateway.prototype;
	for (const method of ['listWorkspaces', 'setConfig', 'readFile', 'saveFile', 'deleteFile']) {
		let initializer;
		Remote(method)(prototype[method], {
			name: method,
			private: false,
			static: false,
			addInitializer: (fn) => { initializer = fn; },
		});
		initializer.call(Object.create(prototype));
	}
}

export function apply(ctx) {
	// Publish the remote gateway as a service on this plugin's fiber.
	new AgentsMdGateway(ctx);
}

export default AgentsMdGateway;
