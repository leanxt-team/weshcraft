// What the rail panel and the Work Status section share: talking to the WeshCraft service,
// wording the state, and linking into the full WeshCraft view.
import { HostRequestError } from '@openchamber/sdk';

export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

export async function fetchState(host, directory) {
  const r = await host.serviceRequest({ method: 'GET', path: '/state', query: { directory: directory ?? '' } });
  const body = r.body ? JSON.parse(r.body) : {};
  if (r.status >= 400) throw new Error(body.error || `HTTP ${r.status}`);
  return body;
}

export async function post(host, path, body) {
  const r = await host.serviceRequest({ method: 'POST', path, body: JSON.stringify(body) });
  const parsed = r.body ? JSON.parse(r.body) : {};
  if (r.status >= 400) throw new Error(parsed.error || `HTTP ${r.status}`);
  return parsed;
}

export function describeError(error) {
  if (error instanceof HostRequestError) {
    if (error.code === 'NO_SERVICE') return 'Allow the WeshCraft service in Settings → Extensions to see this project’s specs.';
    if (error.code === 'DISABLED') return 'WeshCraft is paused in Settings → Extensions.';
    if (error.code === 'SERVICE_FAILED') return 'The WeshCraft service did not start. Reload it in Settings → Extensions.';
  }
  return error?.message || String(error);
}

/** Link into the WeshCraft view, optionally opening one spec. */
export function viewUrl(state, file) {
  if (!state?.url) return null;
  if (!file) return state.url;
  return `${state.url}${state.url.includes('?') ? '&' : '?'}open=${encodeURIComponent(file)}`;
}

/** Headline: badge label and tone. */
export function headline(state) {
  if (!state) return { label: 'Connecting', tone: 'neutral' };
  if (state.status === 'none') return { label: 'Not set up', tone: 'neutral' };
  if (state.status === 'error') return { label: 'Error', tone: 'error' };
  if (state.running) return { label: 'Generating', tone: 'info' };
  const r = state.report;
  if (!r) return { label: 'Waiting', tone: 'neutral' };
  if (r.ok) return { label: `In sync · ${r.score}%`, tone: 'success' };
  return { label: `Out of sync · ${r.errors}`, tone: 'error' };
}

/** What the product's front is, in a few words. */
export function frontLine(summary) {
  if (!summary) return '';
  const parts = [];
  if (summary.screens?.length) parts.push(plural(summary.screens.length, 'screen'));
  if (summary.tools) parts.push(plural(summary.tools, 'MCP tool'));
  if (summary.endpoints) parts.push(plural(summary.endpoints, 'endpoint'));
  parts.push(plural(summary.operations ?? 0, 'operation'));
  return parts.join(' · ');
}

export const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function ago(ts) {
  if (!ts) return '';
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return `${Math.floor(s / 86400)} d ago`;
}

export function syncLine(sync) {
  if (!sync) return 'Git sync off';
  if (sync.busy) return `Syncing to ${sync.target}…`;
  if (sync.last && !sync.last.ok) return `Sync to ${sync.target} failed: ${sync.last.error}`;
  if (sync.last) return `Synced to ${sync.target} · ${ago(sync.last.at)}`;
  return `Sync to ${sync.target}${sync.auto ? ' · automatic' : ''}`;
}

/** Poll while the frame is visible; slower when hidden. Returns a stop function. */
export function poller(fn, { visible = 2000, hidden = 10000 } = {}) {
  let stopped = false;
  let timer = null;
  let busy = false;
  const tick = async () => {
    if (stopped) return;
    if (!busy) { busy = true; try { await fn(); } finally { busy = false; } }
    timer = setTimeout(tick, document.hidden ? hidden : visible);
  };
  const now = () => { clearTimeout(timer); tick(); };
  document.addEventListener('visibilitychange', () => { if (!document.hidden) now(); });
  tick();
  return { stop: () => { stopped = true; clearTimeout(timer); }, now };
}
