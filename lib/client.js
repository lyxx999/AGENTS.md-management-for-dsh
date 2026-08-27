/**
 * @lyxx/dsh-agents-md — client half (classic-script bundle, served at
 * /plugins/@lyxx/dsh-agents-md/client.js by the ClientModuleRegistry — no build
 * step). The registration id MUST equal the installed package name: the host
 * keys the client-module graph row by bundle name and throws "loaded without
 * registering" on mismatch (boot-failure #3, see design doc §9).
 *
 * Registers one top-level settings page (slot `settings.section`, id
 * `agents-md`) with:
 *   - global zone: globalDir input (settingsScope, revision-fenced write) +
 *     source/mirror status cards + budget warnings + editor;
 *   - workspace zone: one row per workspace with an expandable plain-text
 *     editor (mtime-captured, save/delete, stale/mirror-failure handling);
 *   - non-loopback browsers get a read-only notice (settings RPC and /api
 *     remote calls are loopback-only).
 */
window.__ModuleLoader__.load({
  id: "@lyxx/dsh-agents-md",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const React = require("react");
    const h = React.createElement;
    const { useEffect, useRef, useState } = React;

    const SETTINGS_NS = "agent-instructions-ui";

    // ── CSS (package-prefixed ids/classes; injected once per page load) ──
    // Tokens are the REAL dsw alias set shipped by @deepseek-ai/dsh-client-ui-theme
    // (light: body{...}, dark: body[data-ds-dark-theme]{...} — both verified to
    // define every name used below). Fallbacks are dark-safe neutrals in case a
    // token ever goes missing. NOTE on specificity: the generic
    // ".dsh-agents-md button" rule (0,1,1) must never leak into the row head —
    // override it with the equally-or-more-specific
    // ".dsh-agents-md button.dsh-agents-md-rowhead" (0,2,1).
    const css = [
      ".dsh-agents-md-page{display:flex;flex-direction:column;gap:16px;padding:4px 8px;box-sizing:border-box;max-width:960px}",
      ".dsh-agents-md-page h1{font-size:18px;margin:0;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-page h2{font-size:15px;margin:0 0 8px;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-help{color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px;margin:0 0 8px;line-height:18px}",
      ".dsh-agents-md-dirrow{display:flex;align-items:center;gap:8px;margin:8px 0}",
      ".dsh-agents-md-dirrow label{white-space:nowrap;font-size:13px;color:var(--dsw-alias-label-secondary,#9aa0a6)}",
      ".dsh-agents-md-dirrow input{flex:1;min-width:0;padding:6px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);background:var(--dsw-alias-bg-base,#1f2023);color:var(--dsw-alias-label-primary,#f3f4f6);font-size:13px;box-sizing:border-box}",
      ".dsh-agents-md-dirrow input::placeholder{color:var(--dsw-alias-label-tertiary,#7d838a)}",
      ".dsh-agents-md-dirrow input:focus{outline:none;border-color:var(--dsw-alias-border-l4,#6b7076)}",
      ".dsh-agents-md-cards{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}",
      ".dsh-agents-md-card{flex:1;min-width:260px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:4px;box-sizing:border-box}",
      ".dsh-agents-md-cardlabel{font-weight:500;font-size:13px;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-cardpath{font-family:ui-monospace,Consolas,monospace;font-size:11px;word-break:break-all;color:var(--dsw-alias-label-tertiary,#7d838a)}",
      ".dsh-agents-md-cardstatus{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa0a6)}",
      ".dsh-agents-md-status{font-size:12px;padding:8px 10px;border-radius:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-status-ok{background:rgba(34,197,94,.12);color:var(--dsw-alias-state-success-primary,#4ed17e)}",
      ".dsh-agents-md-status-warn{background:rgba(217,134,41,.14);color:var(--dsw-alias-state-warn-label,#dd8629)}",
      ".dsh-agents-md-status-error{background:rgba(220,60,60,.13);color:var(--dsw-alias-state-error-primary,#f25a5a)}",
      ".dsh-agents-md-status button{margin-left:auto}",
      ".dsh-agents-md-rows{display:flex;flex-direction:column;gap:8px}",
      ".dsh-agents-md-row{border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:0;overflow:hidden}",
      ".dsh-agents-md button{padding:6px 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);background:var(--dsw-alias-bg-module-platform,#2a2c31);color:var(--dsw-alias-label-primary,#f3f4f6);font-size:13px;cursor:pointer}",
      ".dsh-agents-md button:hover:not(:disabled){background:var(--dsw-alias-button-ghost-active-fill,#33363c)}",
      ".dsh-agents-md button:active:not(:disabled){background:var(--dsw-alias-button-ghost-active-hover,#3a3d44)}",
      ".dsh-agents-md button:disabled{opacity:.5;cursor:default}",
      ".dsh-agents-md button.dsh-agents-md-danger{color:var(--dsw-alias-state-error-primary,#f25a5a);border-color:var(--dsw-alias-state-error-primary,#f25a5a);background:transparent}",
      ".dsh-agents-md button.dsh-agents-md-danger:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover-danger,rgba(242,90,90,.15))}",
      ".dsh-agents-md button.dsh-agents-md-rowhead{width:100%;padding:10px 12px;background:transparent;border:none;text-align:left;font-size:13px;box-sizing:border-box;display:flex;align-items:center;gap:10px;cursor:pointer}",
      ".dsh-agents-md button.dsh-agents-md-rowhead:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}",
      ".dsh-agents-md-rowtitle{font-weight:500;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-rowpath{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary,#7d838a);word-break:break-all;flex:1;min-width:0}",
      ".dsh-agents-md-rowmeta{white-space:nowrap;color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px}",
      ".dsh-agents-md-editor{border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-top:8px}",
      ".dsh-agents-md-editorhead{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-editorhead code{font-size:11px;word-break:break-all;color:var(--dsw-alias-label-tertiary,#7d838a)}",
      ".dsh-agents-md-editorbytes{font-size:11px;color:var(--dsw-alias-label-tertiary,#7d838a)}",
      ".dsh-agents-md-textarea{width:100%;min-height:320px;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:18px;resize:vertical;background:var(--dsw-alias-bg-base,#1f2023);color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-textarea:focus{outline:none;border-color:var(--dsw-alias-border-l4,#6b7076)}",
      ".dsh-agents-md-actions{display:flex;gap:8px;justify-content:flex-end}",
      ".dsh-agents-md-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center}",
      ".dsh-agents-md-mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-3,rgba(0,0,0,.48))}",
      ".dsh-agents-md-dialog{position:relative;background:var(--dsw-alias-bg-layer-2,#26282d);border:1px solid var(--dsw-alias-border-l3,#54585e);border-radius:16px;padding:20px;width:480px;max-width:calc(100vw - 48px);box-shadow:0 12px 40px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:10px;box-sizing:border-box;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-dialog h3{margin:0;font-size:15px;color:var(--dsw-alias-label-primary,#f3f4f6)}",
      ".dsh-agents-md-dialog code{word-break:break-all;font-size:11px;background:var(--dsw-alias-markdown-inline-code,#33363c);padding:4px 6px;border-radius:6px}",
      ".dsh-agents-md-notice{padding:24px;display:flex;flex-direction:column;gap:8px;max-width:720px}",
    ].join("\n");
    const cssTagId = "dsh-agents-md/page.css";
    let cssTag = null;
    if (typeof document !== "undefined" && document.querySelector('style[data-plugin-css="' + cssTagId + '"]') === null) {
      cssTag = document.createElement("style");
      cssTag.dataset.plugin = "dsh-agents-md";
      cssTag.dataset.pluginCss = cssTagId;
      cssTag.textContent = css;
      document.head.appendChild(cssTag);
    }

    // ── Strict codecs for the hand-written Remote contribution ──────────
    // The gateway only ever calls `codec.schema.parse(value)` (and requires
    // `codec.mode === "strict"`), so minimal schema objects suffice — no zod.
    // The typert registry's client-side validation (dsh-typert-registry
    // validateCodec → validateNonempty) ALSO requires a non-empty
    // `typeSymbol` on every strict codec — the shared type-identity marker
    // that generated contributions carry. It is read at $mount time, before
    // the codec is ever used: omitting it crashes renderer boot with
    // "Cannot read properties of undefined (reading 'length')" and the
    // desktop "Failed to load plugins" recovery screen.
    function strictSchema(typeSymbol, parse) {
      if (typeof typeSymbol !== "string" || typeSymbol.length === 0) throw new Error("strictSchema: typeSymbol is required");
      return { mode: "strict", typeSymbol, schema: { parse } };
    }
    const objectResult = strictSchema("dsh-agents-md#agentsMd/result", (value) => {
      if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("expected an object result");
      return value;
    });
    const stringParam = strictSchema("dsh-agents-md#agentsMd/string", (value) => {
      if (value === undefined) return undefined;
      if (typeof value !== "string") throw new Error("expected a string");
      return value;
    });
    const numberParam = strictSchema("dsh-agents-md#agentsMd/number", (value) => {
      if (value === undefined) return undefined;
      if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("expected a finite number");
      return value;
    });

    /**
     * Contribution for the host `agentsMd` remote namespace (SRC endpoints).
     * Wire argument names must match the host method parameter names
     * (path / content / baseMtimeMs).
     */
    const contribution = {
      package: "dsh-agents-md",
      descriptors: [
        {
          id: "dsh-agents-md#agentsMd/listWorkspaces",
          service: "agentsMd",
          namespace: "agentsMd",
          method: "listWorkspaces",
          invocation: { kind: "direct" },
          parameters: [],
          result: objectResult,
        },
        {
          id: "dsh-agents-md#agentsMd/readFile",
          service: "agentsMd",
          namespace: "agentsMd",
          method: "readFile",
          invocation: { kind: "direct" },
          parameters: [
            { name: "path", wire: "path", source: "json", codec: stringParam },
          ],
          result: objectResult,
        },
        {
          id: "dsh-agents-md#agentsMd/saveFile",
          service: "agentsMd",
          namespace: "agentsMd",
          method: "saveFile",
          invocation: { kind: "direct" },
          parameters: [
            { name: "path", wire: "path", source: "json", codec: stringParam },
            { name: "content", wire: "content", source: "json", codec: stringParam },
            { name: "baseMtimeMs", wire: "baseMtimeMs", source: "json", codec: numberParam },
          ],
          result: objectResult,
        },
        {
          id: "dsh-agents-md#agentsMd/deleteFile",
          service: "agentsMd",
          namespace: "agentsMd",
          method: "deleteFile",
          invocation: { kind: "direct" },
          parameters: [
            { name: "path", wire: "path", source: "json", codec: stringParam },
          ],
          result: objectResult,
        },
      ],
    };

    // ── Small helpers ────────────────────────────────────────────────────
    function errorMessage(error) {
      if (error !== null && typeof error === "object" && typeof error.message === "string") return error.message;
      try {
        return String(error);
      } catch {
        return "未知错误";
      }
    }
    function formatBytes(n) {
      if (typeof n !== "number" || !Number.isFinite(n) || n < 0) return "0 B";
      if (n < 1024) return n + " B";
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KiB";
      return (n / (1024 * 1024)).toFixed(2) + " MiB";
    }
    function utf8Bytes(text) {
      return new TextEncoder().encode(text).length;
    }

    /**
     * Unwrap one remote call result envelope: direct invocations resolve to
     * {ok:true, value} / {ok:false, error}. Business-level structured
     * failures (e.g. {ok:false, code:'stale'}) arrive inside `value`.
     */
    async function callRemote(service, method, values) {
      if (service === null || service === undefined) throw new Error("远程通道尚未就绪，请重试。");
      const result = await service[method](...values);
      if (result === null || typeof result !== "object" || result.ok !== true) {
        const message = result !== null && typeof result === "object" && result.error !== undefined && result.error !== null && typeof result.error.message === "string"
          ? result.error.message
          : "远程调用失败";
        throw new Error(message);
      }
      return result.value;
    }

    // ── UI components (plain JS, React.createElement only) ──────────────

    function FileCard(props) {
      return h("div", { className: "dsh-agents-md-card" },
        h("span", { className: "dsh-agents-md-cardlabel" }, props.label),
        h("code", { className: "dsh-agents-md-cardpath" }, props.path),
        h("span", { className: "dsh-agents-md-cardstatus" },
          props.exists ? "存在（" + formatBytes(props.sizeBytes) + "）" : "不存在"),
        props.note ? h("span", { className: "dsh-agents-md-help", style: { margin: 0 } }, props.note) : null,
      );
    }

    function StatusLine(props) {
      if (props.status === null || props.status === undefined) return null;
      const kind = props.status.kind === "warn" ? "warn" : props.status.kind === "ok" ? "ok" : "error";
      return h("div", { className: "dsh-agents-md-status dsh-agents-md-status-" + kind, role: "status" },
        h("span", null, props.status.text),
        props.status.action === "reload" ? h("button", { key: "reload", disabled: props.busy, onClick: props.onAction }, "重新加载") : null,
        props.status.action === "mirror" ? h("button", { key: "mirror", disabled: props.busy, onClick: props.onAction }, "重试镜像") : null,
      );
    }

    /** Plain-text AGENTS.md editor: mtime capture, save, delete-with-confirm. */
    function EditorPanel(props) {
      const file = props.file;
      const api = props.api;
      const limits = props.limits;
      const onDone = props.onDone;
      const [content, setContent] = useState("");
      const [mtimeMs, setMtimeMs] = useState(0);
      const [loadState, setLoadState] = useState("loading");
      const [status, setStatus] = useState(null);
      const [busy, setBusy] = useState(false);
      const [confirming, setConfirming] = useState(false);

      const load = () => {
        setLoadState("loading");
        setStatus(null);
        return api.readFile(file.path)
          .then((value) => {
            setContent(typeof value.content === "string" ? value.content : "");
            setMtimeMs(typeof value.mtimeMs === "number" ? value.mtimeMs : 0);
            setLoadState("ready");
          })
          .catch((error) => {
            setLoadState("error");
            setStatus({ kind: "error", text: "读取失败：" + errorMessage(error), action: "reload" });
          });
      };

      useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [file.path]);

      const bytes = utf8Bytes(content);
      const overBudget = bytes > limits.renderBudgetBytes;
      const overCap = bytes > limits.sourceCapBytes;

      const save = (contentToSend) => {
        setBusy(true);
        const base = mtimeMs === 0 ? undefined : mtimeMs;
        return api.saveFile(file.path, contentToSend, base)
          .then((result) => {
            if (result !== null && typeof result === "object" && result.ok === false) {
              if (result.code === "stale") setStatus({ kind: "warn", text: "文件在打开后被外部修改，请重新加载。", action: "reload" });
              else if (result.code === "too-large") setStatus({ kind: "error", text: "文件过大（" + formatBytes(result.bytes) + "），超过上限 " + formatBytes(result.capBytes) + "，无法保存。" });
              else setStatus({ kind: "error", text: "保存失败。" });
              return;
            }
            if (result !== null && typeof result === "object" && result.mirrored === false) {
              setStatus({ kind: "error", text: "源文件已保存，但镜像同步失败：" + (result.mirrorError || "未知错误") + "（内置加载器暂时读不到新内容）。", action: "mirror", content: contentToSend });
              return;
            }
            setStatus({ kind: "ok", text: "已保存" + (result !== null && typeof result === "object" && result.backupPath ? "（上一版备份到 " + result.backupPath + "）" : "") });
            // refresh the mtime gate for subsequent saves
            api.readFile(file.path)
              .then((fresh) => setMtimeMs(typeof fresh.mtimeMs === "number" ? fresh.mtimeMs : 0))
              .catch(() => {});
          })
          .catch((error) => {
            setStatus({ kind: "error", text: "保存失败：" + errorMessage(error) });
          })
          .then(() => setBusy(false));
      };

      const doDelete = () => {
        setBusy(true);
        return api.deleteFile(file.path)
          .then(() => {
            onDone();
          })
          .catch((error) => {
            setConfirming(false);
            setStatus({ kind: "error", text: "删除失败：" + errorMessage(error) });
            setBusy(false);
          });
      };

      const onStatusAction = () => {
        if (status === null || status === undefined) return;
        if (status.action === "reload") {
          load();
        } else if (status.action === "mirror") {
          save(status.content !== undefined ? status.content : content);
        }
      };

      return h("div", { className: "dsh-agents-md-editor" },
        h("div", { className: "dsh-agents-md-editorhead" },
          h("span", null, file.label),
          h("code", null, file.path),
          h("span", { className: "dsh-agents-md-editorbytes" },
            formatBytes(bytes) + (overBudget ? " · 超出渲染预算 " + formatBytes(limits.renderBudgetBytes) + "（加载器将截断/省略部分内容）" : ""))),
        loadState === "loading" ? h("p", null, "加载中…") : null,
        loadState === "error" && (status !== null && status.text) ? h("div", { className: "dsh-agents-md-status dsh-agents-md-status-error" }, status.text, h("button", { key: "retry", onClick: () => load() }, "重试")) : null,
        h("textarea", {
          id: "dsh-agents-md-textarea-" + file.path.replace(/[^a-zA-Z0-9._-]/g, "_"),
          className: "dsh-agents-md-textarea",
          value: content,
          spellCheck: false,
          placeholder: "（空文件 — 输入指令内容后保存）",
          disabled: loadState !== "ready" || busy,
          onChange: (event) => setContent(event.target.value),
        }),
        overCap ? h("div", { className: "dsh-agents-md-status dsh-agents-md-status-error" }, "内容超过上限 " + formatBytes(limits.sourceCapBytes) + "，保存将被拒绝，请缩减内容。") : null,
        h(StatusLine, { status, busy, onAction: onStatusAction }),
        h("div", { className: "dsh-agents-md-actions" },
          h("button", { disabled: loadState !== "ready" || busy || overCap, onClick: () => save(content) }, "保存"),
          h("button", { className: "dsh-agents-md-danger", disabled: loadState !== "ready" || busy, onClick: () => setConfirming(true) }, "删除")),
        confirming ? h("div", { className: "dsh-agents-md-overlay" },
          h("div", { className: "dsh-agents-md-mask" }),
          h("div", { className: "dsh-agents-md-dialog", role: "dialog", "aria-modal": "true" },
            h("h3", null, "确认删除"),
            h("p", null, "将永久删除以下 AGENTS.md 文件："),
            h("code", null, file.path),
            h("p", { className: "dsh-agents-md-help" }, "若全局源文件，其镜像会一并删除。.bak 备份（若存在）将保留，可用于恢复最近一版。"),
            h("div", { className: "dsh-agents-md-actions" },
              h("button", { disabled: busy, onClick: () => setConfirming(false) }, "取消"),
              h("button", { className: "dsh-agents-md-danger", disabled: busy, onClick: doDelete }, busy ? "删除中…" : "确认删除")))) : null,
      );
    }

    /** Global zone: globalDir input + source/mirror cards + editor. */
    function GlobalZone(props) {
      const g = props.global;
      const scope = props.scope;
      const limits = props.limits;
      const editing = props.editing;
      const onEdit = props.onEdit;
      const onChanged = props.onChanged;
      const initial = scope.getSnapshot();
      const initialDir = initial !== null && typeof initial === "object" && initial.value !== null && typeof initial.value === "object" && typeof initial.value.globalDir === "string" ? initial.value.globalDir : "";
      const [dirDraft, setDirDraft] = useState(initialDir);
      const touchedRef = useRef(initialDir !== "");
      const [dirStatus, setDirStatus] = useState(null);
      const [saving, setSaving] = useState(false);
      const [, setTick] = useState(0);

      useEffect(() => {
        // Re-render when the bound namespace changes (our own writes fold into
        // the mirror; external edits trigger a recovery read). Until the
        // user touches the input, keep the draft in sync with the resolved
        // value (the scope starts "loading" and resolves asynchronously).
        return scope.subscribe(() => {
          setTick((t) => t + 1);
          if (touchedRef.current) return;
          const snap = scope.getSnapshot();
          const dir = snap !== null && typeof snap === "object" && snap.value !== null && typeof snap.value === "object" && typeof snap.value.globalDir === "string" ? snap.value.globalDir : "";
          setDirDraft(dir);
          if (dir !== "") touchedRef.current = true;
        });
      }, [scope]);

      const snap = scope.getSnapshot();
      const currentDir = snap !== null && typeof snap === "object" && snap.value !== null && typeof snap.value === "object" && typeof snap.value.globalDir === "string" ? snap.value.globalDir : "";

      const saveDir = () => {
        setSaving(true);
        setDirStatus(null);
        const value = dirDraft.trim();
        return scope.set("globalDir", value)
          .then(() => {
            const settled = scope.getSnapshot();
            const applied = settled !== null && typeof settled === "object" && settled.value !== null && typeof settled.value === "object" && typeof settled.value.globalDir === "string" ? settled.value.globalDir : null;
            if (applied === value) {
              setDirDraft(value);
              setDirStatus({ kind: "ok", text: "已保存。目录更改只影响下一次保存的文件位置，不会迁移或删除原位置的文件。" });
              onChanged();
            } else {
              setDirStatus({ kind: "error", text: "保存未生效（可能被拒绝），请重试。" });
            }
          })
          .catch((error) => setDirStatus({ kind: "error", text: "保存失败：" + errorMessage(error) }))
          .then(() => setSaving(false));
      };

      const editorFile = { path: g.file, label: "全局 AGENTS.md" };

      return h("section", null,
        h("h2", null, "全局文件"),
        h("p", { className: "dsh-agents-md-help" },
          "全局 AGENTS.md 对所有会话生效。默认存储在 DSH 主目录，可改为任意目录；保存时自动镜像到内置加载器的固定读取点。"),
        h("div", { className: "dsh-agents-md-dirrow" },
          h("label", { htmlFor: "dsh-agents-md-globaldir" }, "全局目录"),
          h("input", {
            id: "dsh-agents-md-globaldir",
            type: "text",
            value: dirDraft,
            placeholder: "留空 = 默认主目录",
            onChange: (event) => {
              touchedRef.current = true;
              setDirDraft(event.target.value);
            },
          }),
          h("button", { disabled: saving, onClick: () => saveDir() }, "保存目录")),
        currentDir !== "" ? h("div", { className: "dsh-agents-md-help", style: { marginTop: 0 } }, "当前生效：" + g.dir) : h("div", { className: "dsh-agents-md-help", style: { marginTop: 0 } }, "当前生效（默认主目录）：" + g.dir),
        g.file === null
          ? h("div", { className: "dsh-agents-md-status dsh-agents-md-status-error" }, "全局目录无效（需为绝对路径，如 D:\\notes）。请修正后重新保存；当前无法创建/编辑全局源文件。")
          : null,
        h(StatusLine, { status: dirStatus, busy: saving, onAction: () => {} }),
        h("div", { className: "dsh-agents-md-cards" },
          h(FileCard, {
            label: "源文件",
            path: g.file,
            exists: g.exists,
            sizeBytes: g.sizeBytes,
            note: g.exists && g.sizeBytes > g.renderBudgetBytes ? "超出渲染预算 " + formatBytes(g.renderBudgetBytes) + "，加载器将截断/省略。" : null,
          }),
          h(FileCard, {
            label: "镜像（内置加载器读取点）",
            path: g.mirrorFile,
            exists: g.mirrorExists,
            sizeBytes: null,
            note: g.dir === g.mirrorFile ? "源文件即读取点，无需镜像。" : "保存源文件后自动同步。",
          })),
        h("button", { disabled: g.file === null, onClick: () => onEdit(editorFile) }, g.exists ? "编辑全局 AGENTS.md" : "创建全局 AGENTS.md"),
        g.file !== null && editing !== null && typeof editing === "object" && editing.path === g.file
          ? h(EditorPanel, { file: editorFile, api: props.api, limits, onDone: () => { onChanged(); } })
          : null,
      );
    }

    /** One workspace row with an inline expandable editor. */
    function WorkspaceRow(props) {
      const w = props.w;
      const editing = props.editing;
      const onEdit = props.onEdit;
      const file = w.agentsMd.file;
      const active = editing !== null && typeof editing === "object" && file !== null && editing.path === file;
      return h("div", { className: "dsh-agents-md-row" },
        h("button", {
          className: "dsh-agents-md-rowhead",
          disabled: file === null,
          onClick: () => onEdit({ path: file, label: "工作区 AGENTS.md — " + w.title }),
        },
          h("span", { className: "dsh-agents-md-rowtitle" }, w.title),
          h("span", { className: "dsh-agents-md-rowpath" }, w.path),
          h("span", { className: "dsh-agents-md-rowmeta" },
            w.sessionCount + " 个会话 · " +
            (w.agentsMd.exists ? "AGENTS.md 已存在（" + formatBytes(w.agentsMd.sizeBytes) + "）" : "AGENTS.md 缺失"))),
        active && file !== null
          ? h(EditorPanel, { file: { path: file, label: "工作区 AGENTS.md — " + w.title }, api: props.api, limits: props.limits, onDone: () => { props.onChanged(); } })
          : null,
      );
    }

    /** Top-level settings page (slot `settings.section`, id `agents-md`). */
    function AgentsMdPage(props) {
      const api = props.api;
      const scope = props.scope;
      const loopback = props.loopback;
      const [snapshot, setSnapshot] = useState(null);
      const [snapshotError, setSnapshotError] = useState(null);
      const [editing, setEditing] = useState(null);

      // Toggle: clicking the currently-open editor's file collapses it
      // (null); any other file opens that one instead.
      const toggleEditing = (file) =>
        setEditing((cur) => (cur !== null && typeof cur === "object" && file !== null && cur.path === file.path ? null : file));

      const refresh = () =>
        api.listWorkspaces()
          .then((value) => {
            setSnapshot(value);
            setSnapshotError(null);
          })
          .catch((error) => setSnapshotError(errorMessage(error)));

      useEffect(() => {
        refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);

      if (!loopback) {
        return h("div", { className: "dsh-agents-md dsh-agents-md-notice" },
          h("h1", null, "指令文件 (AGENTS.md)"),
          h("p", null, "此功能仅在 loopback（本机 127.0.0.1）浏览器中可用。当前为远程浏览器：设置面与文件操作接口都不对远程开放。请在运行 DSH Desktop 的机器上打开设置。"));
      }

      const g = snapshot !== null && typeof snapshot === "object" ? snapshot.global : null;
      const limits = g !== null
        ? { sourceCapBytes: g.sourceCapBytes, renderBudgetBytes: g.renderBudgetBytes }
        : { sourceCapBytes: 1048576, renderBudgetBytes: 65536 };

      return h("div", { className: "dsh-agents-md dsh-agents-md-page" },
        h("h1", null, "指令文件 (AGENTS.md)"),
        h("p", { className: "dsh-agents-md-help" },
          "管理全局与工作区的 AGENTS.md 指令文件。保存或删除后，内置加载器会在对应会话的下一个 agent step 自动读取新内容，无需重启。"),
        snapshotError !== null && snapshot === null
          ? h("div", { className: "dsh-agents-md-status dsh-agents-md-status-error" }, "加载失败：" + snapshotError, h("button", { key: "retry", onClick: () => refresh() }, "重试"))
          : null,
        g !== null
          ? h(GlobalZone, {
            global: g,
            scope,
            api,
            limits,
            editing,
            onEdit: toggleEditing,
            onChanged: () => refresh(),
          })
          : null,
        snapshot !== null && typeof snapshot === "object" && Array.isArray(snapshot.workspaces)
          ? h("section", null,
            h("h2", null, "工作区项目文件"),
            h("p", { className: "dsh-agents-md-help" }, "每个工作区根目录下的 AGENTS.md 只对该工作区的会话生效。"),
            snapshot.workspaces.length === 0
              ? h("p", { className: "dsh-agents-md-help" }, "（暂无已知工作区 — 工作区列表在打开本页时快照刷新）")
              : h("div", { className: "dsh-agents-md-rows" },
                snapshot.workspaces.map((w, i) =>
                  h(WorkspaceRow, {
                    key: (w.agentsMd.file !== null ? w.agentsMd.file : w.path) + ":" + String(i),
                    w,
                    api,
                    limits,
                    editing,
                    onEdit: toggleEditing,
                    onChanged: () => refresh(),
                  }))))
          : null,
      );
    }

    // ── Plugin entry ─────────────────────────────────────────────────────
    const inject = ["slots", "settingsScope", "connection", "remote"];

    async function apply(ctx) {
      // 1) Mount the hand-written Remote contribution (waits before
      //    activation completes; unmounts on fiber disposal).
      const unmount = await ctx.remote.$mount(contribution);

      // 2) Bind the settings namespace scope (auto-disposed on the caller fiber).
      const scope = ctx.settingsScope.bind({ namespace: SETTINGS_NS });

      // 3) Loopback fact (settings RPC + /api remote are loopback-only).
      const loopback = ctx.connection !== void 0 && ctx.connection.isLoopback === true;

      // 4) Stable API object over the mounted namespace. The namespace
      // service lives under the DOTTED key "remote.agentsMd" (RemoteNamespace
      // constructor: super(ctx, remoteServiceKey(name))). Do NOT read it as
      // `ctx.remote.agentsMd`: the traceable service proxy forwards that read
      // to a ctx property get on the dotted key, which the Cordis reflect
      // handler rejects unless "remote.agentsMd" is in this fiber's inject
      // list — and declaring it there would deadlock (the service only exists
      // after $mount, which only runs once this fiber activates). The
      // post-mount explicit optional read is the sanctioned access path.
      const remoteRef = { service: ctx.get("remote.agentsMd") };
      const api = {
        listWorkspaces: () => callRemote(remoteRef.service, "listWorkspaces", []),
        readFile: (path) => callRemote(remoteRef.service, "readFile", [path]),
        saveFile: (path, content, baseMtimeMs) => callRemote(remoteRef.service, "saveFile", [path, content, baseMtimeMs]),
        deleteFile: (path) => callRemote(remoteRef.service, "deleteFile", [path]),
      };

      // 5) Register the top-level settings page.
      const injected = () => ({ api, scope, loopback });
      const slotDisposer = ctx.slots.inject("settings.section", () =>
        ctx.slots.register(
          {
            name: "settings.section",
            id: "agents-md",
            order: 100,
            label: "指令文件 (AGENTS.md)",
            inject: injected,
          },
          AgentsMdPage,
        ));

      return async () => {
        if (slotDisposer !== void 0 && typeof slotDisposer.then === "function") await slotDisposer;
        else if (typeof slotDisposer === "function") await slotDisposer();
        await unmount();
        if (cssTag !== null) {
          try {
            cssTag.remove();
          } catch {
            // page already gone
          }
          cssTag = null;
        }
      };
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
