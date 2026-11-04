// The small panel: where the specs are synced (GitHub, GitLab or this repository's git), whether the
// last sync worked, the pull/merge request, and Sync now. Same code for the rail panel and the Work
// Status section (compact). GitHub/GitLab access is inherited (OpenChamber account, gh/glab, git).
import { connectHost, HostRequestError } from '@openchamber/sdk';
import { applyHostReady, mountBadge, mountButton, mountEmpty, mountSpinner } from '@openchamber/sdk/ui';

window.__wcStarted = 'script';
const host = connectHost();
window.__wcStarted = 'connecting';
const root = document.querySelector('#root');
const compact = document.documentElement.dataset.mode === 'status';
let directory = null;
let state = null;
let error = null;
let mounted = false;
let readyAt = 0;
let timer = null;
let busyAction = false;

const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
const ago = ts => { if (!ts) return ''; const s = Math.max(0, (Date.now() - ts) / 1000); return s < 45 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : `${Math.round(s / 86400)} d ago`; };
const PROVIDER = { github: 'GitHub', gitlab: 'GitLab', git: 'Local git' };
const ICONS = {
  github: '<path d="M12 2.5a9.5 9.5 0 0 0-3 18.5c.5.1.7-.2.7-.5v-1.7c-2.6.6-3.2-1.2-3.2-1.2-.4-1.1-1-1.4-1-1.4-.9-.6 0-.6 0-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1 2.9.8.1-.6.3-1 .6-1.3-2.1-.2-4.3-1-4.3-4.6 0-1 .4-1.9 1-2.5-.1-.3-.4-1.2.1-2.5 0 0 .8-.3 2.6 1a9 9 0 0 1 4.8 0c1.8-1.3 2.6-1 2.6-1 .5 1.3.2 2.2.1 2.5.6.6 1 1.5 1 2.5 0 3.6-2.2 4.4-4.3 4.6.3.3.6.9.6 1.8v2.7c0 .3.2.6.7.5A9.5 9.5 0 0 0 12 2.5z"/>',
  gitlab: '<path d="M12 21L3.5 13.6 5.4 4l2.5 7.2h8.2L18.6 4l1.9 9.6z"/>',
  git: '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><circle cx="18" cy="8" r="2.2"/><path d="M6 8.2v7.6M18 10.2c0 4-6 3-11 6"/>',
};
const icon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k] ?? ICONS.git}</svg>`;

function explain(err) {
  if (err instanceof HostRequestError || err?.code) {
    if (err.code === 'NO_SERVICE') return 'Allow the WeshCraft service in Settings → Extensions to see this project\'s sync.';
    if (err.code === 'DISABLED') return 'WeshCraft is paused in Settings → Extensions.';
    if (err.code === 'SERVICE_FAILED') return 'The WeshCraft service did not start. Reload it in Settings → Extensions.';
  }
  return err?.message || String(err);
}

async function svc(method, path, body) {
  if (!directory && path !== '/state') throw new Error('Open a project in OpenChamber first.');
  const r = await host.serviceRequest({ method, path, query: { directory: directory ?? '' }, body: body == null ? undefined : JSON.stringify(body) });
  const j = r.body ? JSON.parse(r.body) : {};
  if (r.status >= 400) throw new Error(j.error || `HTTP ${r.status}`);
  return j;
}

/** What to show: one status word, its tone and a sentence. */
export function headline(st) {
  if (!st) return { label: 'Loading', tone: 'neutral', line: '' };
  if (st.status === 'none') return { label: 'No design', tone: 'neutral', line: 'Nothing to sync in this project yet.' };
  if (st.status === 'error') return { label: 'Error', tone: 'error', line: st.error };
  const s = st.sync;
  if (!s?.target) return { label: 'Not syncing', tone: 'neutral', line: 'Specs stay on this machine.' };
  if (s.busy) return { label: 'Syncing', tone: 'info', line: `Pushing to ${where(s)}…` };
  if (s.last && !s.last.ok) return { label: 'Sync failed', tone: 'error', line: s.last.error };
  if (st.parity && !st.parity.ok) return { label: 'Waiting', tone: 'warning', line: `Out of sync with the design (${st.parity.errors} issue${st.parity.errors === 1 ? '' : 's'}): only matching specs are synced.` };
  if (s.last?.ok) return { label: 'Synced', tone: 'success', line: `${s.last.changed === false ? 'Up to date' : 'Synced'} ${ago(s.last.at)}${s.last.commit ? ` · ${String(s.last.commit).slice(0, 7)}` : ''}` };
  return { label: 'Ready', tone: 'neutral', line: `Syncs to ${where(s)} after the next run.` };
}
const where = s => (s.kind === 'git' ? `this repository${s.branch ? ` (${s.branch})` : ''}` : `${s.repo}${s.branch ? ` @ ${s.branch}` : ''}`);

// ---- render --------------------------------------------------------------------------------
let badge = null;
function render() {
  const h = headline(error ? { status: 'error', error } : state);
  root.replaceChildren();
  if (!state && !error) { mountSpinner(root, { label: 'Reading the sync status…' }); return; }
  const s = state?.sync;
  const kind = s?.kind ?? null;
  if (compact) return renderCompact(h, s, kind);

  const head = el('header', 'sp-head');
  const titles = el('div', 'sp-titles');
  titles.append(el('h1', 'sp-title', 'WeshCraft sync'), el('div', 'sp-sub', state?.name ? `${state.name}${state.source ? ` · ${String(state.source).replace(/^file /, '')}` : ''}` : directory ? directory.split(/[\\/]/).pop() : 'No project open'));
  const badgeSlot = el('div');
  head.append(titles, badgeSlot);
  badge = mountBadge(badgeSlot, { label: h.label, tone: h.tone });
  root.append(head);

  if (error || state?.status === 'error') { const e = el('div', 'sp-empty'); mountEmpty(e, { title: 'Cannot read the sync status', body: h.line, action: { label: 'Retry', onClick: refresh } }); root.append(e); return; }
  if (state.status === 'none') {
    const e = el('div', 'sp-empty');
    mountEmpty(e, { title: 'No design in this project', body: 'Open WeshCraft from the Extension pages menu to start one; its specs can then sync to GitHub, GitLab or this repository.' });
    root.append(e);
    return;
  }

  if (s?.target) {
    const card = el('section', 'sp-card');
    const tgt = el('div', 'sp-target');
    tgt.innerHTML = icon(kind);
    const tt = el('div', 'sp-tt');
    tt.append(el('div', 'sp-repo', kind === 'git' ? 'This repository' : s.repo), el('div', 'sp-meta', `${PROVIDER[kind] ?? kind}${s.branch ? ` · ${s.branch}` : ''}${s.auto ? ' · automatic' : ''}${kind === 'git' && s.push ? ' · push' : ''}`));
    tgt.append(tt);
    card.append(tgt);
    const line = el('p', `sp-line tone-${h.tone}`, h.line);
    card.append(line);
    const url = s.last?.url;
    if (url) {
      const a = el('button', 'sp-link', s.last.number ? `${kind === 'gitlab' ? 'Merge request !' : 'Pull request #'}${s.last.number} ↗` : 'Open on the web ↗');
      a.type = 'button';
      a.title = url;
      a.addEventListener('click', () => host.openUrl(url).catch(() => {}));
      card.append(a);
    }
    if (s.access) card.append(el('p', 'sp-access', `Access: ${s.access}`));
    const rows = el('dl', 'sp-dl');
    const row = (k, v) => { rows.append(el('dt', '', k), el('dd', '', v)); };
    if (state.parity) row('Parity', `${state.parity.ok ? 'in sync' : 'out of sync'} · ${state.parity.score}% · ${state.parity.checks} checks`);
    if (s.last?.files != null) row('Last commit', `${s.last.files} file${s.last.files === 1 ? '' : 's'}${s.last.pushed ? ' · pushed' : ''}`);
    if (rows.children.length) card.append(rows);
    const actions = el('div', 'sp-actions');
    mountButton(actions, { label: 'Sync now', size: 'sm', loading: !!s.busy || busyAction, disabled: !!s.busy || busyAction, onClick: syncNow });
    mountButton(actions, { label: 'Open in browser', variant: 'outline', size: 'sm', onClick: () => state.url && host.openUrl(state.url).catch(() => {}) });
    card.append(actions);
    root.append(card);

    if (s.history?.length) {
      const hist = el('section', 'sp-hist');
      hist.append(el('h2', 'sp-h2', 'Recent syncs'));
      const ul = el('ul');
      for (const x of s.history) {
        const li = el('li', x.ok ? 'ok' : 'bad');
        li.append(el('span', 'dot'), el('span', 'when', ago(x.at)), el('span', 'what', x.ok ? (x.changed === false ? 'no change' : `${x.commit ? String(x.commit).slice(0, 7) : 'committed'}${x.files != null ? ` · ${x.files} files` : ''}`) : (x.error ?? 'failed')));
        if (x.url) { li.classList.add('click'); li.title = x.url; li.addEventListener('click', () => host.openUrl(x.url).catch(() => {})); }
        ul.append(li);
      }
      hist.append(ul);
      root.append(hist);
    }
    const stop = el('div', 'sp-foot');
    mountButton(stop, { label: 'Stop syncing', variant: 'ghost', size: 'xs', onClick: () => act({ off: true }, 'Sync stopped') });
    root.append(stop);
  } else {
    root.append(el('p', 'sp-line', h.line));
    root.append(setupForm());
  }
  root.append(el('p', 'sp-hint', 'Full WeshCraft (design, prototype, specs): Extension pages menu › WeshCraft.'));
}

/** Work Status: everything about sync, dense, as tall as its content (the section grows up to 320 px). */
function renderCompact(h, s, kind) {
  const head = el('div', 'st-head');
  const dot = el('span', 'st-dot'); dot.dataset.tone = h.tone;
  const where2 = s?.target ? (kind === 'git' ? 'this repository' : s.repo) : '';
  head.append(dot, el('span', 'st-label', h.label), el('span', 'st-meta', where2 ? `${PROVIDER[kind] ?? ''} · ${where2}${s.branch ? ` @ ${s.branch}` : ''}` : ''));
  root.append(head);
  if (error || state?.status === 'error') { root.append(el('p', 'st-line tone-error', h.line)); return; }
  if (state?.status === 'none') { root.append(el('p', 'st-line', 'No design in this project yet: open WeshCraft (rail) to start one, then sync its specs here.')); return; }
  if (h.line) root.append(el('p', `st-line tone-${h.tone}`, h.line));
  if (s?.target) {
    const links = el('div', 'st-actions');
    const url = s.last?.url;
    if (url) {
      const a = el('button', 'sp-link', s.last.number ? `${kind === 'gitlab' ? 'Merge request !' : 'Pull request #'}${s.last.number} ↗` : 'Open on the web ↗');
      a.type = 'button'; a.title = url;
      a.addEventListener('click', () => host.openUrl(url).catch(() => {}));
      links.append(a);
    }
    const btns = el('span', 'st-btns');
    mountButton(btns, { label: 'Sync now', size: 'xs', loading: !!s.busy || busyAction, disabled: !!s.busy || busyAction, onClick: syncNow });
    mountButton(btns, { label: 'Stop', variant: 'ghost', size: 'xs', onClick: () => act({ off: true }, 'Sync stopped') });
    links.append(btns);
    root.append(links);
    if (s.access) root.append(el('p', 'sp-access', `Access: ${s.access}`));
    if (s.history?.length) {
      const ul = el('ul', 'st-hist');
      for (const x of s.history.slice(0, 3)) {
        const li = el('li', x.ok ? 'ok' : 'bad');
        li.append(el('span', 'dot'), el('span', 'when', ago(x.at)), el('span', 'what', x.ok ? (x.changed === false ? 'no change' : `${x.commit ? String(x.commit).slice(0, 7) : 'committed'}${x.files != null ? ` · ${x.files} files` : ''}`) : (x.error ?? 'failed')));
        if (x.url) { li.classList.add('click'); li.title = x.url; li.addEventListener('click', () => host.openUrl(x.url).catch(() => {})); }
        ul.append(li);
      }
      root.append(ul);
    }
  } else if (state?.status === 'ok') root.append(setupForm());
}

/** The Work Status section is as tall as what it shows. */
let lastHeight = 0;
function fitHeight() {
  if (!compact) return;
  const hgt = Math.min(320, Math.max(28, Math.ceil(root.getBoundingClientRect().height) + 2));
  if (Math.abs(hgt - lastHeight) < 2) return;
  lastHeight = hgt;
  host.setHeight(hgt).catch(() => {});
}
if (compact) new ResizeObserver(fitHeight).observe(root);

function setupForm() {
  const f = el('form', 'sp-setup');
  const access = state?.access ?? {};
  f.innerHTML = `
    <div class="sp-seg" role="radiogroup" aria-label="Where">
      ${['github', 'gitlab', 'git'].map((k, i) => `<label><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''}>${icon(k)}<span>${PROVIDER[k]}</span></label>`).join('')}
    </div>
    <label class="sp-f remote">Repository <input name="repo" placeholder="owner/name or group/project" autocomplete="off" spellcheck="false"></label>
    <label class="sp-f">Branch <input name="branch" placeholder="weshcraft/specs" autocomplete="off" spellcheck="false"></label>
    <label class="sp-chk remote"><input type="checkbox" name="pr" checked> Open / update a pull or merge request</label>
    <label class="sp-chk local" hidden><input type="checkbox" name="push"> Push after committing</label>
    <p class="sp-access" data-access></p>
    <div class="sp-actions" data-go></div>`;
  const kindOf = () => new FormData(f).get('kind');
  const sync = () => {
    const k = kindOf();
    f.querySelectorAll('.remote').forEach(x => { x.hidden = k === 'git'; });
    f.querySelectorAll('.local').forEach(x => { x.hidden = k !== 'git'; });
    const a = access[k];
    f.querySelector('[data-access]').textContent = k === 'git' ? 'Commits only WeshCraft\'s files, on the current branch, with your git setup.' : a?.available ? `Access: ${a.via}.` : `No ${PROVIDER[k]} access found: sign in to ${PROVIDER[k]} in OpenChamber (Settings › Integrations) or with the ${k === 'gitlab' ? 'glab' : 'gh'} CLI.`;
  };
  f.addEventListener('change', sync);
  sync();
  mountButton(f.querySelector('[data-go]'), {
    label: 'Start syncing', size: 'sm', onClick: () => {
      const fd = new FormData(f);
      const k = fd.get('kind');
      const repo = String(fd.get('repo') || '').trim();
      if (k !== 'git' && !/^[\w.-]+(\/[\w.-]+)+$/.test(repo)) { host.toast({ kind: 'error', message: 'Repository: owner/name (GitHub) or group/project (GitLab)' }).catch(() => {}); return; }
      act({ provider: k, repo: k === 'git' ? null : repo, branch: String(fd.get('branch') || '').trim() || null, pr: fd.get('pr') === 'on', push: fd.get('push') === 'on', auto: true }, 'Syncing…');
    },
  });
  return f;
}

async function act(body, message) {
  busyAction = true;
  render();
  try {
    await svc('POST', '/sync', body);
    host.toast({ kind: 'success', message }).catch(() => {});
  } catch (e) {
    host.toast({ kind: 'error', message: explain(e) }).catch(() => {});
  } finally {
    busyAction = false;
    refresh();
  }
}
const syncNow = () => act({}, 'Synced');

async function refresh() {
  clearTimeout(timer);
  try { state = await svc('GET', '/state'); error = null; } catch (e) { error = explain(e); }
  // The form keeps what the user typed: no re-render while they are in it.
  if (!root.querySelector('.sp-setup:focus-within')) { try { render(); } catch (e) { fail('render', e); } }
  const h = headline(error ? { status: 'error', error } : state);
  if (!compact) host.setBadge(h.tone === 'error' ? 1 : null).catch(() => {});
  timer = setTimeout(refresh, document.hidden ? 15000 : state?.sync?.busy ? 1500 : 4000);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && mounted) refresh(); });

const watchdog = setTimeout(() => {
  if (readyAt) return;
  root.innerHTML = '<div class="oc-problem"><strong>OpenChamber has not connected this panel yet.</strong><div>Check that WeshCraft is enabled in Settings → Extensions (OpenChamber 2.0.1 or later), then reload it there.</div></div>';
}, 4000);
addEventListener('error', e => { root.innerHTML = ''; const b = el('div', 'oc-problem'); b.append(el('strong', '', 'WeshCraft panel error'), el('div', '', e.error?.stack || e.message)); root.append(b); });

// Errors here would be swallowed by the SDK (it catches listener errors): show them instead.
function fail(where, e) {
  root.innerHTML = '';
  const b = el('div', 'oc-problem');
  b.append(el('strong', '', `WeshCraft panel error (${where})`), el('div', '', String(e?.stack || e?.message || e)));
  root.append(b);
}
host.onReady(ctx => {
  window.__wcStarted = 'ready';
  try { applyHostReady(ctx, document.documentElement); } catch (e) { console.error(e); }
  if (mounted) return;
  mounted = true;
  readyAt = Date.now();
  clearTimeout(watchdog);
  try {
    directory = ctx.directory ?? null;
    render();
    refresh().catch(e => fail('refresh', e));
    host.onDirectory(d => { if (d !== directory) { directory = d; state = null; try { render(); } catch (e) { fail('render', e); } refresh().catch(e => fail('refresh', e)); } });
  } catch (e) { fail('start', e); }
});
