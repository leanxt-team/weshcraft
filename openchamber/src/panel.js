// WeshCraft rail panel (and full-screen page): parity, what the front is, front ⇄ back links and
// gaps, every spec with its status, and the way into the full WeshCraft view.
import { connectHost } from '@openchamber/sdk';
import { applyHostReady, mountBadge, mountBanner, mountButton, mountEmpty, mountList, mountProgress, mountSpinner, mountTabs } from '@openchamber/sdk/ui';
import { describeError, el, fetchState, headline, plural, poller, post, syncLine, viewUrl } from './shared.js';

const host = connectHost();
const root = document.querySelector('#root');

let directory = null;
let state = null;
let tab = 'issues';
let mounted = false;
let loop = null;

const ui = {};

const STATUS_TONE = { done: 'success', unchanged: 'neutral', writing: 'info', agent: 'info', started: 'info', queued: 'neutral', failed: 'error' };

function open(file) {
  const url = viewUrl(state, file);
  if (url) host.openUrl(url).catch(e => host.toast({ kind: 'error', message: describeError(e) }));
}

async function action(kind) {
  const button = kind === 'run' ? ui.run : ui.sync;
  button.update({ loading: true });
  try {
    await post(host, kind === 'run' ? '/run' : '/sync', { directory, force: false });
    host.toast({ kind: 'info', message: kind === 'run' ? 'Regenerating the specs…' : 'Syncing to git…' });
  } catch (e) {
    host.toast({ kind: 'error', message: describeError(e) });
  } finally {
    button.update({ loading: false });
    loop?.now();
  }
}

function mount() {
  root.replaceChildren();
  const wrap = el('div', 'wc');

  const head = el('header', 'wc-head');
  const mark = el('div', 'wc-mark', 'W');
  const titles = el('div', 'wc-titles');
  ui.title = el('h1', 'wc-title', 'WeshCraft');
  ui.source = el('div', 'wc-sub');
  titles.append(ui.title, ui.source);
  const badgeSlot = el('div', 'wc-badge');
  head.append(mark, titles, badgeSlot);
  ui.badge = mountBadge(badgeSlot, { label: 'Connecting', tone: 'neutral' });

  ui.notice = el('div', 'wc-notice');
  ui.empty = el('div', 'wc-empty');
  ui.body = el('div', 'wc-body');

  const card = el('section', 'wc-card');
  const progressSlot = el('div', 'wc-progress');
  ui.progress = mountProgress(progressSlot, { value: 0, tone: 'neutral', label: 'Parity' });
  ui.stats = el('div', 'wc-stats');
  const actions = el('div', 'wc-actions');
  ui.open = mountButton(actions, { label: 'Open WeshCraft', size: 'sm', onClick: () => open() });
  ui.run = mountButton(actions, { label: 'Regenerate', variant: 'outline', size: 'sm', onClick: () => action('run') });
  card.append(progressSlot, ui.stats, actions);

  const tabsSlot = el('div', 'wc-tabs');
  ui.tabs = mountTabs(tabsSlot, { items: [], activeId: tab, trackBackground: true, onChange: id => { tab = id; renderList(); } });
  const listSlot = el('div', 'wc-list');
  ui.list = mountList(listSlot, { items: [], onSelect: select, emptyText: '', ariaLabel: 'WeshCraft' });

  const foot = el('footer', 'wc-foot');
  ui.syncText = el('span', 'wc-sync');
  const footActions = el('span', 'wc-foot-actions');
  ui.syncSlot = el('span');
  ui.sync = mountButton(ui.syncSlot, { label: 'Sync now', variant: 'ghost', size: 'xs', onClick: () => action('sync') });
  mountButton(footActions, { label: 'Ask agent', variant: 'ghost', size: 'xs', onClick: () => host.compose({ text: '/weshcraft ', mode: 'replace' }).catch(() => {}) });
  footActions.prepend(ui.syncSlot);
  foot.append(ui.syncText, footActions);

  ui.body.append(card, tabsSlot, listSlot, foot);
  wrap.append(head, ui.notice, ui.empty, ui.body);
  root.append(wrap);
}

function select(id) {
  const [kind, ...rest] = id.split(':');
  const value = rest.join(':');
  if (kind === 'file') open(value.replace(/~\d+$/, ''));
  else if (kind === 'gap') open('specs/LINKS.md');
}

function stat(label, value, tone) {
  const s = el('div', 'wc-stat');
  if (tone) s.dataset.tone = tone;
  s.append(el('div', 'wc-stat-value', String(value)), el('div', 'wc-stat-label', label));
  return s;
}

function renderList() {
  if (!state || state.status !== 'ok') return;
  const issues = state.report?.issues ?? [];
  const jobs = state.jobs ?? [];
  const gaps = state.gaps ?? [];
  ui.tabs.update({
    items: [
      { id: 'issues', label: 'Parity', count: issues.length },
      { id: 'specs', label: 'Specs', count: jobs.length },
      { id: 'gaps', label: 'Gaps', count: gaps.length },
    ],
    activeId: tab,
  });
  let items = [];
  let emptyText = '';
  if (tab === 'issues') {
    items = issues.map((i, n) => ({ id: `file:${i.file}~${n}`, title: i.message, subtitle: i.file, leading: i.node != null ? `#${i.node}` : undefined, badge: { label: i.code, tone: i.level === 'error' ? 'error' : 'warning' } }));
    emptyText = state.report ? 'Every spec matches the design.' : 'Not checked yet.';
  } else if (tab === 'specs') {
    items = jobs.map(j => ({ id: `file:${j.file}`, title: j.title, subtitle: j.file, badge: { label: j.status, tone: STATUS_TONE[j.status] ?? 'neutral' } }));
    emptyText = 'No specs yet.';
  } else {
    items = gaps.map((g, n) => ({ id: `gap:${n}`, title: g.message, subtitle: g.kind === 'unloaded-data' ? 'Shown, nothing loads it' : 'Nothing reaches it', badge: { label: 'gap', tone: 'warning' } }));
    emptyText = 'Every operation is reached and every field is loaded.';
  }
  // Ids must be unique: issue ids carry an index (~n), stripped on select.
  ui.list.update({ items, emptyText });
}

function render() {
  const h = headline(state);
  ui.badge.update(h);
  const ok = state?.status === 'ok';
  ui.body.hidden = !ok;
  ui.empty.hidden = ok;
  if (!state) { ui.empty.replaceChildren(); mountSpinner(ui.empty, { label: 'Looking for a design…' }); return; }
  if (state.status === 'none') {
    ui.source.textContent = directory ? directory.split(/[\\/]/).pop() : 'No project open';
    ui.empty.replaceChildren();
    mountEmpty(ui.empty, {
      title: directory ? 'No design in this project' : 'Open a project',
      body: directory ? 'Add a FigCraft design (design/*.figcraft), an OpenAPI document or weshcraft.surface.json, or let the agent set it up with /wesh-plan-view-mode.' : 'WeshCraft follows the project of the open session.',
      action: directory ? { label: 'Set up with the agent', onClick: () => host.compose({ text: '/wesh-plan-view-mode new', mode: 'replace' }).catch(() => {}) } : undefined,
    });
    host.setBadge(null).catch(() => {});
    return;
  }
  if (state.status === 'error') {
    ui.empty.replaceChildren();
    mountEmpty(ui.empty, { title: 'WeshCraft could not start', body: state.error, action: { label: 'Retry', onClick: () => loop?.now() } });
    return;
  }
  const s = state.summary;
  ui.source.textContent = s?.name ? `${s.name} · ${state.source}` : state.source;
  ui.source.title = state.source;
  const r = state.report;
  ui.progress.update({ value: r ? r.score : 0, tone: !r ? 'neutral' : r.ok ? 'success' : 'error', label: r ? `Parity · ${plural(r.checks, 'check')}${r.warnings ? ` · ${plural(r.warnings, 'warning')}` : ''}` : state.running ? 'Generating…' : 'Parity' });
  ui.stats.replaceChildren(
    ...(s?.screens?.length ? [stat('Screens', s.screens.length)] : []),
    ...(s?.tools ? [stat('MCP tools', s.tools)] : []),
    ...(s?.endpoints ? [stat('Endpoints', s.endpoints)] : []),
    stat('Operations', s?.operations ?? 0),
    ...(!s?.screens?.length || !s?.tools || !s?.endpoints ? [stat('Entities', s?.entities ?? 0)] : []),
    stat('Links', s?.links ?? 0),
    stat('Gaps', s?.gaps ?? 0, s?.gaps ? 'warning' : undefined),
  );
  ui.run.update({ disabled: !!state.running });
  ui.syncText.textContent = syncLine(state.sync);
  ui.syncSlot.hidden = !state.sync;
  ui.sync.update({ disabled: !!state.sync?.busy });
  renderList();
  const count = (r?.errors ?? 0) + (s?.gaps ?? 0);
  host.setBadge(count || null).catch(() => {});
}

let banner = null;
function notice(message) {
  if (!message) { banner?.dispose(); banner = null; return; }
  if (banner) banner.update({ tone: 'warning', title: message });
  else banner = mountBanner(ui.notice, { tone: 'warning', title: message });
}

async function refresh() {
  try {
    state = await fetchState(host, directory);
    notice(null);
  } catch (e) {
    notice(describeError(e));
  }
  render();
}

host.onReady(ctx => {
  applyHostReady(ctx, document.documentElement);
  document.documentElement.dataset.surface = ctx.surface;
  if (!mounted) {
    mounted = true;
    mount();
    directory = ctx.directory;
    render();
    loop = poller(refresh);
    host.onDirectory(next => { if (next !== directory) { directory = next; state = null; render(); loop.now(); } });
  }
});
