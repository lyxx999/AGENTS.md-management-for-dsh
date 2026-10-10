/**
 * Client half of the AGENTS.md manager: a first-level Settings page.
 *
 * Registers one entry into the `settings.section` list slot. The component
 * renders the global-file card (directory setting + live source/mirror status
 * + inline editor) and the workspace list (expandable inline editors), with
 * theme-token styling, a 64 KiB budget warning, and a read-only mode for
 * non-loopback (remote) browsers.
 *
 * All file access goes through the generated `ctx.remote.agentsMd` namespace
 * (mounted from remote.js), because the Client has no filesystem access.
 */
window.__ModuleLoader__.load({
	id: '@local/agents-md-manager',
	factory(require) {
		const React = require('react');
		const h = React.createElement;

		// Inline the agentsMd contribution (the client module table's sync
		// require cannot load files by relative path — only seed words and
		// registered module-table ids). Every codec is mode "strict" (the
		// api-gateway client's requireStrictCodec mandates it) with a permissive
		// create(): a minimal zod-v4-compatible object whose parse/safeParse pass
		// the value through unchanged, so no zod package is needed in the browser
		// and the Host enforces its own schema on receipt.
		const passthroughSchema = () => ({
			parse: (v) => v,
			safeParse: (v) => ({ success: true, data: v }),
			_zod: { def: { typeName: 'ZodAny', value: void 0 } },
		});
		const strictCodec = (typeSymbol) => ({ mode: 'strict', typeSymbol, create: passthroughSchema });
		const anyParam = (name) => ({ name, wire: name, source: 'json', codec: strictCodec('@local/agents-md-manager#' + name) });
		const anyResult = () => ({ mode: 'strict', typeSymbol: '@local/agents-md-manager#result', create: passthroughSchema });
		const TYPERT_REMOTE = {
			package: '@local/agents-md-manager',
			descriptors: [
				{ id: '@local/agents-md-manager#agentsMd/listWorkspaces', service: 'agentsMd', namespace: 'agentsMd', method: 'listWorkspaces', invocation: { kind: 'direct' }, parameters: [], result: anyResult() },
				{ id: '@local/agents-md-manager#agentsMd/setConfig', service: 'agentsMd', namespace: 'agentsMd', method: 'setConfig', invocation: { kind: 'direct' }, parameters: [anyParam('cfg')], result: anyResult() },
				{ id: '@local/agents-md-manager#agentsMd/readFile', service: 'agentsMd', namespace: 'agentsMd', method: 'readFile', invocation: { kind: 'direct' }, parameters: [anyParam('path')], result: anyResult() },
				{ id: '@local/agents-md-manager#agentsMd/saveFile', service: 'agentsMd', namespace: 'agentsMd', method: 'saveFile', invocation: { kind: 'direct' }, parameters: [anyParam('path'), anyParam('content'), anyParam('baseMtimeMs')], result: anyResult() },
				{ id: '@local/agents-md-manager#agentsMd/deleteFile', service: 'agentsMd', namespace: 'agentsMd', method: 'deleteFile', invocation: { kind: 'direct' }, parameters: [anyParam('path')], result: anyResult() },
			],
		};

		const NS = 'agents-md-manager';
		const inject = ['slots', 'locale', 'remote'];
		const BUDGET = 64 * 1024; // 64 KiB render budget

		// Locale dictionaries inlined (the client module table cannot require
		// files by relative path); en is the base, zh is the Chinese override.
		const LOCALE = {
			en: {
				nav: 'Instruction files (AGENTS.md)', title: 'Instruction files (AGENTS.md)',
				intro: 'Manage the global and per-workspace AGENTS.md instruction files. The built-in dsh-agent-instructions loader reads them from disk at every step; this page only writes the files.',
				global: 'Global file', globalDir: 'Global directory',
				globalDirHint: 'Leave empty to use the default ~/.dsh/AGENTS.md. Changing it only changes where the next save writes; existing files are not moved.',
				saveGlobalDir: 'Save directory', source: 'Source', mirror: 'Mirror',
				exists: 'exists', missing: 'missing', synced: 'synced', notSynced: 'not synced',
				editGlobal: 'Create / edit global AGENTS.md', workspaces: 'Workspace project files',
				noWorkspaces: 'No workspaces are known yet. Open a session in a folder and it will appear here.',
				none: 'No AGENTS.md', save: 'Save', delete: 'Delete', reload: 'Reload', retry: 'Retry', close: 'Close',
				budgetWarning: 'Exceeds the 64 KiB render budget — the loader may truncate this content.',
				tooLarge: 'File exceeds the 1 MiB hard limit and cannot be saved.',
				mtimeConflict: 'The file changed on disk while you were editing it. Reload to see the latest content.',
				confirmDeleteGlobal: 'Delete the global AGENTS.md? Both the source file and its mirror will be removed.',
				confirmDeleteWorkspace: 'Delete AGENTS.md for this workspace?',
				readonlyNotice: 'Read-only: file editing is only available from the local (loopback) browser. This page is read-only here.',
				mirrorDegraded: 'The file was saved, but the mirror to the loader read point failed.',
				footer: 'Changes take effect at the next agent step automatically — no restart required.',
				saveOk: 'Saved.', deleteOk: 'Deleted.', saveDirOk: 'Global directory updated. The next save writes there.',
				error: 'Operation failed', sameAsSource: 'same as source',
				cancel: 'Cancel', delTitleGlobal: 'Delete global AGENTS.md', delTitleWs: 'Delete this workspace AGENTS.md',
			},
			zh: {
				nav: '指令文件 (AGENTS.md)', title: '指令文件 (AGENTS.md)',
				intro: '管理全局与工作区 AGENTS.md 指令文件。内置的 dsh-agent-instructions 加载器每步从磁盘读取，本页面只负责写入文件。',
				global: '全局文件', globalDir: '全局目录',
				globalDirHint: '留空 = 默认 ~/.dsh/AGENTS.md。修改后只改变下一次保存的写入位置，不会搬迁旧文件。',
				saveGlobalDir: '保存目录', source: '源文件', mirror: '镜像',
				exists: '存在', missing: '不存在', synced: '已同步', notSynced: '未同步',
				editGlobal: '创建/编辑全局 AGENTS.md', workspaces: '工作区项目文件',
				noWorkspaces: '暂无已知工作区。在某个文件夹中打开会话后，这里会列出该工作区。',
				none: '无 AGENTS.md', save: '保存', delete: '删除', reload: '重载', retry: '重试', close: '关闭',
				budgetWarning: '超出 64 KiB 渲染预算，加载器可能截断内容。',
				tooLarge: '文件超出 1 MiB 硬上限，无法保存。',
				mtimeConflict: '文件在编辑期间被外部修改。请重载以查看最新内容。',
				confirmDeleteGlobal: '删除全局 AGENTS.md？源文件与镜像将一并删除。',
				confirmDeleteWorkspace: '删除该工作区的 AGENTS.md？',
				readonlyNotice: '只读：文件编辑仅对本机（loopback）浏览器开放。当前页面为只读。',
				mirrorDegraded: '文件已保存，但镜像到加载器读取点失败。',
				footer: '保存后下一个 agent step 自动生效，无需重启。',
				saveOk: '已保存。', deleteOk: '已删除。', saveDirOk: '全局目录已更新，下一次保存将写入新位置。',
				error: '操作失败', sameAsSource: '与源文件相同',
				cancel: '取消', delTitleGlobal: '删除全局 AGENTS.md', delTitleWs: '删除该工作区 AGENTS.md',
			},
		};

		/* ----------------------------- styles ----------------------------- */
		// Restyled to match the reference project's look: roomier spacing,
		// rounded cards, independent source/mirror status cards, full-row
		// clickable workspace heads, ok/warn/error status bars, and a modal
		// delete-confirm overlay. Tokens are the dsw alias set; fallbacks are
		// dark-safe neutrals.
		const styles = [
			'.amdPage{display:flex;flex-direction:column;gap:16px;padding:4px 8px;box-sizing:border-box;max-width:960px}',
			'.amdTitle{font-size:18px;margin:0;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdIntro{color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px;margin:0 0 8px;line-height:18px}',
			'.amdSectionHead{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:600;margin:0 0 8px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdHint{color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px;margin:0 0 8px;line-height:18px}',
			'.amdDirrow{display:flex;align-items:center;gap:8px;margin:8px 0}',
			'.amdDirrow label{white-space:nowrap;font-size:13px;color:var(--dsw-alias-label-secondary,#9aa0a6)}',
			'.amdDirInput{flex:1;min-width:0;padding:6px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);background:var(--dsw-alias-bg-base,#1f2023);color:var(--dsw-alias-label-primary,#f3f4f6);font-size:13px;box-sizing:border-box;outline:none}',
			'.amdDirInput::placeholder{color:var(--dsw-alias-label-tertiary,#7d838a)}',
			'.amdDirInput:focus{border-color:var(--dsw-alias-border-l4,#6b7076)}',
			'.amdCards{display:flex;gap:12px;flex-wrap:wrap;margin:8px 0}',
			'.amdCard{flex:1;min-width:260px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:10px 12px;font-size:12px;display:flex;flex-direction:column;gap:4px;box-sizing:border-box}',
			'.amdCardLabel{font-weight:500;font-size:13px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdCardPath{font-family:ui-monospace,Consolas,monospace;font-size:11px;word-break:break-all;color:var(--dsw-alias-label-tertiary,#7d838a)}',
			'.amdCardStatus{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa0a6)}',
			'.amdStatus{font-size:12px;padding:8px 10px;border-radius:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdStatusOk{background:rgba(34,197,94,.12);color:var(--dsw-alias-state-success-primary,#4ed17e)}',
			'.amdStatusWarn{background:rgba(217,134,41,.14);color:var(--dsw-alias-state-warn-primary,#dd8629)}',
			'.amdStatusError{background:rgba(220,60,60,.13);color:var(--dsw-alias-state-error-primary,#f25a5a)}',
			'.amdStatus button{margin-left:auto}',
			'.amdBtn{padding:6px 14px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);background:var(--dsw-alias-bg-layer-2,#2a2c31);color:var(--dsw-alias-label-primary,#f3f4f6);font-size:13px;cursor:pointer}',
			'.amdBtn:hover:not(:disabled){background:var(--dsw-alias-bg-overlay,#33363c)}',
			'.amdBtn:active:not(:disabled){background:var(--dsw-alias-bg-overlay,#3a3d44)}',
			'.amdBtn:disabled{opacity:.5;cursor:default}',
			'.amdBtnDanger{color:var(--dsw-alias-state-error-primary,#f25a5a);border-color:var(--dsw-alias-state-error-primary,#f25a5a);background:transparent}',
			'.amdBtnDanger:hover:not(:disabled){background:rgba(242,90,90,.15)}',
			'.amdRows{display:flex;flex-direction:column;gap:8px}',
			'.amdRow{border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:0;overflow:hidden}',
			'.amdRowHead{width:100%;padding:10px 12px;background:transparent;border:none;text-align:left;font-size:13px;box-sizing:border-box;display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdRowHead:hover:not(:disabled){background:rgba(255,255,255,.08)}',
			'.amdRowTitle{font-weight:500;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdRowPath{font-family:ui-monospace,Consolas,monospace;font-size:11px;color:var(--dsw-alias-label-tertiary,#7d838a);word-break:break-all;flex:1;min-width:0}',
			'.amdRowMeta{white-space:nowrap;color:var(--dsw-alias-label-secondary,#9aa0a6);font-size:12px}',
			'.amdEditor{border:1px solid var(--dsw-alias-border-l2,#4a4d52);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;margin-top:8px}',
			'.amdEditorHead{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdEditorHead code{font-size:11px;word-break:break-all;color:var(--dsw-alias-label-tertiary,#7d838a)}',
			'.amdEditorBytes{font-size:11px;color:var(--dsw-alias-label-tertiary,#7d838a)}',
			'.amdTextarea{width:100%;min-height:320px;box-sizing:border-box;padding:10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2,#4a4d52);font-family:ui-monospace,Consolas,monospace;font-size:12px;line-height:18px;resize:vertical;background:var(--dsw-alias-bg-base,#1f2023);color:var(--dsw-alias-label-primary,#f3f4f6);outline:none}',
			'.amdTextarea:focus{border-color:var(--dsw-alias-border-l4,#6b7076)}',
			'.amdActions{display:flex;gap:8px;justify-content:flex-end}',
			'.amdOverlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center}',
			'.amdMask{position:absolute;inset:0;background:rgba(0,0,0,.48)}',
			'.amdDialog{position:relative;background:var(--dsw-alias-bg-layer-2,#26282d);border:1px solid var(--dsw-alias-border-l2,#54585e);border-radius:16px;padding:20px;width:480px;max-width:calc(100vw - 48px);box-shadow:0 12px 40px rgba(0,0,0,.45);display:flex;flex-direction:column;gap:10px;box-sizing:border-box;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdDialog h3{margin:0;font-size:15px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdDialog code{word-break:break-all;font-size:11px;background:var(--dsw-alias-bg-overlay,#33363c);padding:4px 6px;border-radius:6px}',
			'.amdFooter{font-size:12px;color:var(--dsw-alias-label-secondary,#9aa0a6)}',
			'.amdBootError{padding:20px;font-size:13px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdBootError h2{font-size:15px;margin:0 0 12px;color:var(--dsw-alias-state-error-primary,#f25a5a)}',
			'.amdBootError pre{background:var(--dsw-alias-bg-layer-2,#26282d);border:1px solid var(--dsw-alias-border-l1,#4a4d52);border-radius:8px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--dsw-alias-state-error-primary,#f25a5a)}',
			'.amdReadonly{padding:24px;display:flex;flex-direction:column;gap:8px;max-width:720px;color:var(--dsw-alias-label-primary,#f3f4f6)}',
			'.amdEmpty{font-size:13px;color:var(--dsw-alias-label-secondary,#9aa0a6)}',
		].join('\n');

		// Inject the stylesheet once per page load (idempotent via the
		// data-plugin-css guard, mirroring the reference plugin). Without this
		// the className attributes render but no CSS applies → an unstyled page.
		const CSS_TAG_ID = 'agents-md-manager/page.css';
		(function injectCss() {
			try {
				if (typeof document === 'undefined') return;
				if (document.querySelector('style[data-plugin-css="' + CSS_TAG_ID + '"]') !== null) return;
				const tag = document.createElement('style');
				tag.dataset.plugin = 'agents-md-manager';
				tag.dataset.pluginCss = CSS_TAG_ID;
				tag.textContent = styles;
				document.head.appendChild(tag);
			} catch {}
		})();

		function fmtSize(n) {
			if (n == null) return '';
			if (n < 1024) return n + ' B';
			if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
			return (n / (1024 * 1024)).toFixed(2) + ' MB';
		}

		/* ---------------------------- error msg --------------------------- */
		function errMsg(e) {
			if (e && typeof e === 'object') {
				if (typeof e.message === 'string' && e.message) return e.message;
				if (typeof e.error === 'string') return e.error;
			}
			return String(e);
		}

		/**
		 * Unwrap one remote-call result envelope: the api-gateway client resolves
		 * a direct invocation to {ok:true, value} / {ok:false, error}. Business
		 * failures (stale / too-large / not-allowed) arrive as a thrown error OR
		 * inside value; we surface the envelope error and rethrow with its code.
		 */
		async function callRemote(method, values) {
			if (!ctx_remote) throw new Error('remote not ready');
			const result = await ctx_remote[method](...values);
			if (result && typeof result === 'object') {
				if (result.ok === false) {
					const code = result.error && result.error.code;
					const message = result.error && typeof result.error.message === 'string' ? result.error.message : '远程调用失败';
					throw Object.assign(new Error(message), { code });
				}
				if (result.ok === true || Object.hasOwn(result, 'value')) {
					return result.value !== undefined ? result.value : result;
				}
			}
			return result; // no envelope (defensive: some paths return raw)
		}

		/* ----------------------------- editor ----------------------------- */
		function Editor(props) {
			const { t, readOnly, path, isGlobal, onSaved, onDeleted } = props;
			const [text, setText] = React.useState('');
			const [mtime, setMtime] = React.useState(0);
			const [exists, setExists] = React.useState(false);
			const [busy, setBusy] = React.useState(false);
			const [err, setErr] = React.useState(null);
			const [notice, setNotice] = React.useState(null);
			const [mirrorWarn, setMirrorWarn] = React.useState(null);
			const [confirmingDelete, setConfirmingDelete] = React.useState(false);

			const doLoad = async (silent) => {
				try {
					const r = await callRemote('readFile', [path]);
					setText(r.content);
					setMtime(r.mtimeMs || 0);
					setExists(r.sizeBytes > 0 || r.mtimeMs > 0 || (typeof r.content === 'string' && r.content !== ''));
					if (!silent) setErr(null);
				} catch (e) {
					if (!silent) setErr(errMsg(e));
				}
			};

			React.useEffect(() => { doLoad(false); }, [path]);

			const bytes = byteLenLocal(text);
			const overBudget = bytes > BUDGET;
			const overHard = bytes > 1024 * 1024;

			const save = async () => {
				setBusy(true); setErr(null); setNotice(null); setMirrorWarn(null);
				try {
					const r = await callRemote('saveFile', [path, text, mtime]);
					setMtime(r.mtimeMs || 0);
					setExists(true);
					if (isGlobal && r && r.mirrored === false) setMirrorWarn(r.mirrorError || null);
					setNotice(t('saveOk'));
					onSaved && onSaved();
				} catch (e) {
					if (e && e.code === 'stale') setErr(t('mtimeConflict'));
					else if (e && e.code === 'too-large') setErr(t('tooLarge'));
					else setErr(errMsg(e));
				} finally { setBusy(false); }
			};

			const del = async () => {
				setBusy(true); setErr(null); setConfirmingDelete(false);
				try {
					await callRemote('deleteFile', [path]);
					setText(''); setMtime(0); setExists(false);
					setNotice(t('deleteOk'));
					onDeleted && onDeleted();
				} catch (e) { setErr(errMsg(e)); }
				finally { setBusy(false); }
			};

			const retryMirror = async () => {
				setBusy(true); setMirrorWarn(null);
				try {
					const fresh = await callRemote('readFile', [path]);
					await callRemote('saveFile', [path, text, fresh.mtimeMs || 0]);
					setNotice(t('saveOk')); onSaved && onSaved();
				}
				catch (e) { setMirrorWarn(errMsg(e)); }
				finally { setBusy(false); }
			};

			const confirmText = isGlobal ? t('confirmDeleteGlobal') : t('confirmDeleteWorkspace');
			return h('div', { className: 'amdEditor' },
				h('div', { className: 'amdEditorHead' },
					h('code', null, path),
					h('span', { className: 'amdEditorBytes' }, fmtSize(bytes) + (overBudget ? '  ⚠ 超出渲染预算' : '')),
				),
				overHard
					? h('div', { className: 'amdStatus amdStatusError' }, t('tooLarge'))
					: overBudget
						? h('div', { className: 'amdStatus amdStatusWarn' }, t('budgetWarning'))
						: null,
				h('textarea', {
					className: 'amdTextarea',
					value: text,
					spellCheck: false,
					disabled: readOnly || busy,
					placeholder: t('none'),
					onChange: (e) => setText(e.target.value),
				}),
				err ? h('div', { className: 'amdStatus amdStatusError' }, err) : null,
				notice ? h('div', { className: 'amdStatus amdStatusOk' }, notice) : null,
				mirrorWarn
					? h('div', { className: 'amdStatus amdStatusWarn' }, t('mirrorDegraded'),
						h('button', { className: 'amdBtn', disabled: busy, onClick: retryMirror }, t('retry')))
					: null,
				!readOnly ? h('div', { className: 'amdActions' },
					h('button', { className: 'amdBtn amdBtnDanger', disabled: busy || !exists, onClick: () => setConfirmingDelete(true) }, t('delete')),
					h('button', { className: 'amdBtn', disabled: busy, onClick: () => doLoad(false) }, t('reload')),
					h('button', { className: 'amdBtn', disabled: busy || overHard, onClick: save }, t('save')),
				) : h('div', { className: 'amdHint' }, t('readonlyNotice')),
				confirmingDelete ? h('div', { className: 'amdOverlay' },
					h('div', { className: 'amdMask', onClick: () => { if (!busy) setConfirmingDelete(false); } }),
					h('div', { className: 'amdDialog', role: 'dialog', 'aria-modal': true },
						h('h3', null, isGlobal ? t('delTitleGlobal') : t('delTitleWs')),
						h('p', { style: { margin: 0, fontSize: 13, color: 'var(--dsw-alias-label-secondary,#9aa0a6)' } }, confirmText),
						h('code', null, path),
						h('div', { className: 'amdActions' },
							h('button', { className: 'amdBtn', disabled: busy, onClick: () => setConfirmingDelete(false) }, t('cancel')),
							h('button', { className: 'amdBtn amdBtnDanger', disabled: busy, onClick: del }, t('delete')),
						),
					),
				) : null,
			);
		}

		// A local byte counter (the client cannot import the host helper).
		function byteLenLocal(s) {
			let n = 0;
			for (let i = 0; i < s.length; i++) {
				const c = s.codePointAt(i);
				if (c > 0xffff) i++;
				n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
			}
			return n;
		}

		/* --------------------------- status card -------------------------- */
		function FileCard(props) {
			const { label, path, exists, sizeBytes, statusText } = props;
			return h('div', { className: 'amdCard' },
				h('div', { className: 'amdCardLabel' }, label),
				path ? h('div', { className: 'amdCardPath' }, path) : null,
				h('div', { className: 'amdCardStatus' }, statusText + (exists && sizeBytes ? ' · ' + fmtSize(sizeBytes) : '')),
			);
		}

		function StatusLine(props) {
			const { kind, children } = props;
			const cls = kind === 'ok' ? 'amdStatusOk' : kind === 'warn' ? 'amdStatusWarn' : kind === 'error' ? 'amdStatusError' : '';
			return h('div', { className: 'amdStatus ' + cls }, children);
		}

		/* ------------------------- workspace row -------------------------- */
		function WorkspaceRow(props) {
			const { t, readOnly, row, expanded, onToggle, onChanged } = props;
			const file = row.agentsMd && row.agentsMd.file;
			const disabled = !file;
			const meta = (row.agentsMd && row.agentsMd.exists ? fmtSize(row.agentsMd.sizeBytes) : t('none')) + ' · ' + row.sessionCount + ' 会话';
			return h('div', { className: 'amdRow' },
				h('button', {
					type: 'button', className: 'amdRowHead', disabled: disabled, onClick: () => onToggle(),
					'aria-expanded': expanded ? 'true' : 'false',
				},
					h('span', null, disabled ? '·' : (expanded ? '▼' : '▶')),
					h('span', { className: 'amdRowTitle' }, row.title),
					h('span', { className: 'amdRowPath' }, row.path),
					h('span', { className: 'amdRowMeta' }, meta),
				),
				expanded && file
					? h(Editor, { t, readOnly, isGlobal: false, path: file, onSaved: onChanged, onDeleted: onChanged })
					: null,
			);
		}

		/* ----------------------------- page ------------------------------- */
		let ctx_remote = null; // the agentsMd NAMESPACE (ctx.remote.agentsMd), set in apply()
		let ctx_remote_host = null; // the parent ctx.remote (for .$host), set in apply()
		let ctx_locale = null; // set in apply(); the ctx param is not in component scope

		function Page(props) {
			const { close } = props;
			// All hooks called unconditionally (React rules of hooks).
			const [ready, setReady] = React.useState(false);
			const [snapshot, setSnapshot] = React.useState(null); // { global, workspaces }
			const [dirInput, setDirInput] = React.useState('');
			const [expanded, setExpanded] = React.useState('');
			const [globalEditing, setGlobalEditing] = React.useState(false);
			const [busy, setBusy] = React.useState(false);
			const [err, setErr] = React.useState(null);
			const [notice, setNotice] = React.useState(null);

			// Bulletproof: if the module-level handles are not yet set (apply
			// still running) or are otherwise unavailable, render a safe
			// fallback instead of throwing into a blank settings page.
			if (!ctx_locale || !ctx_remote || !ctx_remote_host) {
				return h('div', { className: 'amdPage' }, h('div', { className: 'amdEmpty' }, 'loading…'));
			}
			const t = ctx_locale.bind(NS);

			const isLoopback = !!(ctx_remote_host && ctx_remote_host.$host && ctx_remote_host.$host.isLoopback);
			const readOnly = !isLoopback;

			// One RPC returns the full page snapshot (global zone + workspace rows).
			const refresh = async () => {
				try {
					const r = await callRemote('listWorkspaces', []);
					const g = (r && r.global) || null;
					const ws = (r && Array.isArray(r.workspaces)) ? r.workspaces : [];
					setSnapshot({ global: g, workspaces: ws });
					setErr(null);
				} catch (e) { setErr(errMsg(e)); }
			};

			React.useEffect(() => {
				(async () => {
					try { await refresh(); setReady(true); }
					catch (e) { setErr(errMsg(e)); setReady(true); }
				})();
			}, []);

			const saveDir = async () => {
				setBusy(true); setErr(null); setNotice(null);
				try {
					await callRemote('setConfig', [{ globalDir: dirInput }]);
					setNotice(t('saveDirOk'));
					await refresh();
				} catch (e) { setErr(errMsg(e)); }
				finally { setBusy(false); }
			};

			const onChanged = async () => { await refresh(); };

			const g = snapshot && snapshot.global;
			const workspaces = (snapshot && snapshot.workspaces) || [];
			const globalFile = g && g.file;
			const isMirrorSource = !!(g && g.file && g.mirrorFile && g.file === g.mirrorFile);

			if (!ready) return h('div', { className: 'amdPage' }, h('div', { className: 'amdEmpty' }, '…'));

			return h('div', { className: 'amdPage' },
				h('h1', { className: 'amdTitle' }, t('title')),
				h('p', { className: 'amdIntro' }, t('intro')),

				/* Global file section */
				h('h2', { className: 'amdSectionHead' }, t('global')),
				h('p', { className: 'amdHint' }, t('globalDirHint')),
				h('div', { className: 'amdDirrow' },
					h('label', { htmlFor: 'amd-dir' }, t('globalDir')),
					h('input', {
						id: 'amd-dir', className: 'amdDirInput', value: dirInput,
						disabled: readOnly, placeholder: '~/.dsh/AGENTS.md',
						onChange: (e) => setDirInput(e.target.value),
					}),
					!readOnly ? h('button', { type: 'button', className: 'amdBtn', disabled: busy, onClick: saveDir }, t('saveGlobalDir')) : null,
				),
				g ? h('div', { className: 'amdCards' },
					h(FileCard, {
						label: t('source'), path: g.file, exists: !!g.exists, sizeBytes: g.sizeBytes || 0,
						statusText: g.exists ? t('exists') : t('missing'),
					}),
					h(FileCard, {
						label: t('mirror'), path: g.mirrorFile, exists: !!g.mirrorExists, sizeBytes: 0,
						statusText: isMirrorSource ? t('sameAsSource') : (g.mirrorExists ? t('synced') : t('notSynced')),
					}),
				) : null,
				g && g.exists && (g.sizeBytes || 0) > (g.renderBudgetBytes || BUDGET)
					? h(StatusLine, { kind: 'warn' }, t('budgetWarning'))
					: null,
				err ? h(StatusLine, { kind: 'error' }, err) : null,
				notice ? h(StatusLine, { kind: 'ok' }, notice) : null,
				globalEditing && globalFile
					? h(Editor, { t, readOnly, isGlobal: true, path: globalFile, onSaved: onChanged, onDeleted: onChanged })
					: !readOnly
						? h('div', null, h('button', { type: 'button', className: 'amdBtn', disabled: !globalFile, onClick: () => setGlobalEditing(true) }, t('editGlobal')))
						: null,

				/* Workspace section */
				h('h2', { className: 'amdSectionHead' }, t('workspaces')),
				workspaces.length === 0
					? h('p', { className: 'amdEmpty' }, t('noWorkspaces'))
					: h('div', { className: 'amdRows' },
						workspaces.map((row, i) =>
							h(WorkspaceRow, {
								key: ((row.agentsMd && row.agentsMd.file) || row.path) + ':' + i,
								t, readOnly, row,
								expanded: expanded === ((row.agentsMd && row.agentsMd.file) || row.path),
								onToggle: () => {
									const f = (row.agentsMd && row.agentsMd.file) || row.path;
									setExpanded((prev) => (prev === f ? '' : f));
								},
								onChanged,
							})),
					),

				h('p', { className: 'amdFooter' }, t('footer')),
			);
		}

		/* --------------------------- safe wrapper --------------------------- */
		// Catch render-time throws in Page (which React would otherwise swallow
		// into an empty page) and display them.
		function SafePage(props) {
			try {
				return Page(props);
			} catch (err) {
				const msg = (err && (err.stack || err.message)) || String(err);
				try { console.error('[agents-md-manager] Page render error:', err); } catch {}
				return h('div', { className: 'amdBootError' },
					h('h2', null, 'AGENTS.md — page render error'),
					h('pre', null, msg),
				);
			}
		}

		/* ------------------------------ apply ------------------------------ */
		async function apply(ctx) {
			try {
				ctx_remote_host = ctx.remote; // parent (for .$host), module-level handle
				ctx_locale = ctx.locale; // the ctx param is not in component scope
				const t = ctx.locale.bind(NS);

				// Register locale dictionaries (inlined above; the client module
				// table cannot require files by relative path).
				ctx.effect(() => ctx.locale.register(NS, LOCALE), 'agents-md: dictionaries');

				// Mount the remote namespace; $mount synchronously creates the
				// agentsMd getter on the remote service, so ctx.remote.agentsMd is
				// available immediately (only the base `remote` key is declared
				// statically — a static `remote.agentsMd` would park boot waiting
				// for a service that $mount has not created yet).
				const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
				// Resolve the namespace through the facade's ctx.get() (no
				// declaration gate) rather than a direct ctx.remote.agentsMd
				// property read, which the Context proxy refuses without the
				// namespaced key being a declared fiber inject entry.
				ctx_remote = ctx.get('remote.agentsMd') || ctx.remote.agentsMd;

				// Register the settings page.
				const disposeSlot = ctx.slots.inject('settings.section', () => ctx.slots.register({
					name: 'settings.section',
					id: 'agents-md',
					order: 5,
					label: () => t('nav'),
					locale: NS,
				}, SafePage));

				return () => {
					disposeSlot();
					if (disposeRemote) Promise.resolve(disposeRemote()).catch(() => {});
				};
			} catch (err) {
				// Diagnostic: surface the exact boot error in a settings row and
				// the renderer console, without taking the renderer boot down.
				const msg = (err && (err.stack || err.message)) || String(err);
				try { console.error('[agents-md-manager] apply failed:', err); } catch {}
				try {
					ctx.slots.inject('settings.section', () => ctx.slots.register({
						name: 'settings.section',
						id: 'agents-md',
						order: 5,
						label: () => 'AGENTS.md (boot error)',
					}, function AgentsMdBootError() {
						return h('div', { className: 'amdBootError' },
							h('h2', null, 'AGENTS.md plugin — client boot error'),
							h('pre', null, msg),
						);
					}));
				} catch {}
				return () => {};
			}
		}

		return { inject, apply };
	},
});
