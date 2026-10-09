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
				error: 'Operation failed',
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
				error: '操作失败',
			},
		};

		/* ----------------------------- styles ----------------------------- */
		const styles = [
			'.amdPage{display:flex;flex-direction:column;gap:16px;padding:2px 0;max-width:880px}',
			'.amdTitle{font-size:18px;font-weight:600;color:var(--dsw-alias-label-primary);margin:0}',
			'.amdIntro{font-size:13px;color:var(--dsw-alias-label-secondary);margin:0 0 4px;line-height:1.5}',
			'.amdSection{display:flex;flex-direction:column;gap:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:10px;background:var(--dsw-alias-bg-layer-1);padding:14px}',
			'.amdSectionHead{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)}',
			'.amdChevron{font-size:11px;color:var(--dsw-alias-label-secondary);width:12px;text-align:center}',
			'.amdFieldLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}',
			'.amdHint{font-size:12px;color:var(--dsw-alias-label-secondary);line-height:1.45}',
			'.amdRow{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
			'.amdDirInput{flex:1;min-width:220px;font-size:13px;padding:7px 9px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);outline:none}',
			'.amdDirInput:focus{border-color:var(--dsw-alias-brand-primary)}',
			'.amdStatusRow{display:flex;gap:10px;flex-wrap:wrap}',
			'.amdStatus{display:flex;align-items:center;gap:7px;font-size:12px;padding:7px 10px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);flex:1;min-width:180px}',
			'.amdDot{width:8px;height:8px;border-radius:50%;flex:none}',
			'.amdOk{background:var(--dsw-alias-state-success-primary)}',
			'.amdNo{background:var(--dsw-alias-state-idle-primary)}',
			'.amdWarnDot{background:var(--dsw-alias-state-warn-primary)}',
			'.amdBtn{font-size:13px;padding:7px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer}',
			'.amdBtn:hover{border-color:var(--dsw-alias-label-secondary)}',
			'.amdBtn.primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:#fff}',
			'.amdBtn.primary:hover{opacity:.92}',
			'.amdBtn.danger{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
			'.amdBtn:disabled{opacity:.5;cursor:default}',
			'.amdTextarea{width:100%;min-height:180px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;line-height:1.5;padding:10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);resize:vertical;outline:none;box-sizing:border-box}',
			'.amdTextarea:focus{border-color:var(--dsw-alias-brand-primary)}',
			'.amdEditor{display:flex;flex-direction:column;gap:8px;padding:10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base)}',
			'.amdWarn{font-size:12px;color:var(--dsw-alias-state-warn-primary);display:flex;align-items:center;gap:6px}',
			'.amdError{font-size:12px;color:var(--dsw-alias-state-error-primary);display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
			'.amdWsRow{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);cursor:pointer;font-size:13px;color:var(--dsw-alias-label-primary)}',
			'.amdWsRow:hover{border-color:var(--dsw-alias-label-secondary)}',
			'.amdWsPath{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:ui-monospace,monospace;font-size:12.5px}',
			'.amdWsSize{font-size:12px;color:var(--dsw-alias-label-secondary);white-space:nowrap}',
			'.amdWsNone{font-size:12px;color:var(--dsw-alias-state-idle-primary)}',
			'.amdWsBody{padding:0 4px 2px}',
			'.amdFooter{font-size:12px;color:var(--dsw-alias-label-secondary)}',
			'.amdBootError{padding:20px;font-size:13px;color:var(--dsw-alias-label-primary)}',
			'.amdBootError h2{font-size:15px;margin:0 0 12px;color:var(--dsw-alias-state-error-primary)}',
			'.amdBootError pre{background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-radius:8px;padding:12px;overflow:auto;white-space:pre-wrap;word-break:break-all;color:var(--dsw-alias-state-error-primary)}',
			'.amdReadonly{font-size:12.5px;color:var(--dsw-alias-state-warn-primary);padding:10px 12px;border:1px dashed var(--dsw-alias-state-warn-primary);border-radius:8px;background:var(--dsw-alias-bg-layer-1)}',
			'.amdEmpty{font-size:13px;color:var(--dsw-alias-label-secondary)}',
			'.amdLabel{font-size:12px;color:var(--dsw-alias-label-secondary)}',
		].join('\n');

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
					setNotice(r && r.backupPath ? t('saveOk') + ' (备份 ' + r.backupPath + ')' : t('saveOk'));
					onSaved && onSaved();
				} catch (e) {
					if (e && e.code === 'stale') setErr(t('mtimeConflict'));
					else if (e && e.code === 'too-large') setErr(t('tooLarge'));
					else setErr(errMsg(e));
				} finally { setBusy(false); }
			};

			const del = async () => {
				const ok = window.confirm(isGlobal ? t('confirmDeleteGlobal') : t('confirmDeleteWorkspace'));
				if (!ok) return;
				setBusy(true); setErr(null);
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

			return h('div', { className: 'amdEditor' },
				overHard
					? h('div', { className: 'amdError' }, '⛔ ' + t('tooLarge'))
					: overBudget
						? h('div', { className: 'amdWarn' }, '⚠ ' + t('budgetWarning'))
						: null,
				h('textarea', {
					className: 'amdTextarea',
					value: text,
					spellCheck: false,
					disabled: readOnly || busy,
					placeholder: t('none'),
					onChange: (e) => setText(e.target.value),
				}),
				err ? h('div', { className: 'amdError' }, '⚠ ' + err) : null,
				notice ? h('div', { className: 'amdWarn', style: { color: 'var(--dsw-alias-state-success-primary)' } }, '✓ ' + notice) : null,
				h('div', { className: 'amdRow' },
					readOnly
						? h('span', { className: 'amdHint' }, t('readonlyNotice'))
						: h(React.Fragment, null,
							h('button', { className: 'amdBtn primary', disabled: busy || overHard, onClick: save }, t('save')),
							h('button', { className: 'amdBtn danger', disabled: busy || !exists, onClick: del }, t('delete')),
							h('button', { className: 'amdBtn', disabled: busy, onClick: () => doLoad(false) }, t('reload')),
							mirrorWarn
								? h(React.Fragment, null,
									h('span', { className: 'amdWarn' }, '⚠ ' + t('mirrorDegraded')),
									h('button', { className: 'amdBtn', disabled: busy, onClick: retryMirror }, t('retry')))
								: null,
						),
				),
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
		function StatusPill({ label, exists, size, dotClass, labelForExist, labelForMissing }) {
			return h('div', { className: 'amdStatus' },
				h('span', { className: 'amdDot ' + dotClass }),
				h('span', null, label + ': ' + (exists ? labelForExist : labelForMissing) + (exists && size ? ' · ' + fmtSize(size) : '')),
			);
		}

		/* ------------------------- workspace row -------------------------- */
		function WorkspaceRow(props) {
			const { t, readOnly, row, expanded, onToggle, onChanged } = props;
			const file = row.agentsMd && row.agentsMd.file;
			return h('div', null,
				h('div', {
					className: 'amdWsRow',
					onClick: () => file && onToggle(),
					role: 'button',
					tabIndex: 0,
					onKeyDown: (e) => { if (file && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onToggle(); } },
				},
					h('span', { className: 'amdChevron' }, expanded ? '▼' : '▶'),
					h('span', { className: 'amdWsPath', title: row.path }, row.title + '  —  ' + row.path),
					row.agentsMd && row.agentsMd.exists
						? h('span', { className: 'amdWsSize' }, fmtSize(row.agentsMd.sizeBytes) + ' · ' + row.sessionCount + ' 会话')
						: h('span', { className: 'amdWsNone' }, t('none') + ' · ' + row.sessionCount + ' 会话'),
				),
				expanded && file
					? h('div', { className: 'amdWsBody' },
						h(Editor, { t, readOnly, isGlobal: false, path: file, onSaved: onChanged, onDeleted: onChanged }),
					)
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
				h('h2', { className: 'amdTitle' }, t('title')),
				h('p', { className: 'amdIntro' }, t('intro')),
				readOnly ? h('div', { className: 'amdReadonly' }, t('readonlyNotice')) : null,

				/* Global file section */
				h('div', { className: 'amdSection' },
					h('div', { className: 'amdSectionHead' },
						h('span', { className: 'amdChevron' }, '▤'), t('global')),
					h('label', { className: 'amdFieldLabel', htmlFor: 'amd-dir' }, t('globalDir')),
					h('div', { className: 'amdRow' },
						h('input', {
							id: 'amd-dir', className: 'amdDirInput', value: dirInput,
							disabled: readOnly, placeholder: '~/.dsh/AGENTS.md',
							onChange: (e) => setDirInput(e.target.value),
						}),
						!readOnly ? h('button', { className: 'amdBtn', disabled: busy, onClick: saveDir }, t('saveGlobalDir')) : null,
					),
					h('div', { className: 'amdHint' }, t('globalDirHint')),
					g ? h('div', { className: 'amdStatusRow' },
						h(StatusPill, {
							label: t('source'), exists: !!g.exists, size: g.sizeBytes || 0,
							dotClass: g.exists ? 'amdOk' : 'amdNo',
							labelForExist: t('exists'), labelForMissing: t('missing'),
						}),
						h(StatusPill, {
							label: t('mirror'), exists: !!g.mirrorExists, size: null,
							dotClass: (isMirrorSource || g.mirrorExists) ? 'amdOk' : 'amdNo',
							labelForExist: isMirrorSource ? t('exists') : t('synced'), labelForMissing: t('notSynced'),
						}),
					) : null,
					g && g.exists && (g.sizeBytes || 0) > (g.renderBudgetBytes || BUDGET)
						? h('div', { className: 'amdWarn' }, '⚠ ' + t('budgetWarning'))
						: null,
					err ? h('div', { className: 'amdError' }, '⚠ ' + err) : null,
					notice ? h('div', { className: 'amdWarn', style: { color: 'var(--dsw-alias-state-success-primary)' } }, '✓ ' + notice) : null,
					globalEditing && globalFile
						? h(Editor, { t, readOnly, isGlobal: true, path: globalFile, onSaved: onChanged, onDeleted: onChanged })
						: !readOnly
							? h('button', { className: 'amdBtn primary', disabled: !globalFile, onClick: () => setGlobalEditing(true) }, t('editGlobal'))
							: null,
					globalEditing && !readOnly ? h('button', { className: 'amdBtn', onClick: () => { setGlobalEditing(false); onChanged(); } }, t('close')) : null,
				),

				/* Workspace section */
				h('div', { className: 'amdSection' },
					h('div', { className: 'amdSectionHead' },
						h('span', { className: 'amdChevron' }, '▦'), t('workspaces')),
					workspaces.length === 0
						? h('div', { className: 'amdEmpty' }, t('noWorkspaces'))
						: workspaces.map((row, i) =>
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

				h('div', { className: 'amdFooter' }, t('footer')),
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
