// WeshCraft in Work Status: one line, parity and links at a glance; click opens the full view.
import { connectHost } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';
import { describeError, el, fetchState, frontLine, headline, poller, viewUrl } from './shared.js';

const host = connectHost();
const root = document.querySelector('#root');
let directory = null;
let state = null;
let error = null;
let mounted = false;
let loop = null;

const row = el('button', 'st-row');
row.type = 'button';
const dot = el('span', 'st-dot');
const label = el('span', 'st-label');
const meta = el('span', 'st-meta');
const go = el('span', 'st-go', 'Open');
row.append(dot, label, meta, go);
const sub = el('div', 'st-sub');
row.addEventListener('click', () => { const u = viewUrl(state); if (u) host.openUrl(u).catch(() => {}); });

function render() {
  const h = headline(state);
  dot.dataset.tone = h.tone;
  label.textContent = error ? 'WeshCraft' : h.label;
  const ok = state?.status === 'ok';
  row.disabled = !ok;
  go.hidden = !ok;
  if (error) { meta.textContent = ''; sub.textContent = error; }
  else if (!state) { meta.textContent = ''; sub.textContent = 'Looking for a design…'; }
  else if (state.status === 'none') { meta.textContent = ''; sub.textContent = 'No design in this project.'; }
  else if (state.status === 'error') { meta.textContent = ''; sub.textContent = state.error; }
  else {
    const s = state.summary;
    meta.textContent = s ? `${s.links} links${s.gaps ? ` · ${s.gaps} gap${s.gaps === 1 ? '' : 's'}` : ''}` : '';
    sub.textContent = frontLine(s) || state.source;
  }
}

async function refresh() {
  try { state = await fetchState(host, directory); error = null; } catch (e) { error = describeError(e); }
  render();
}

host.onReady(ctx => {
  applyHostReady(ctx, document.documentElement);
  if (mounted) return;
  mounted = true;
  directory = ctx.directory;
  root.append(row, sub);
  render();
  host.setHeight(56).catch(() => {});
  loop = poller(refresh, { visible: 3000, hidden: 15000 });
  host.onDirectory(next => { if (next !== directory) { directory = next; state = null; render(); loop.now(); } });
});
