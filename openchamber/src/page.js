// The big panel: WeshCraft's full desktop interface inside OpenChamber (contributes.page).
// OpenChamber pages are sandboxed (opaque origin, no network but their own package): this shim runs
// before the app and routes everything through the extension's service:
//   fetch('/api/…', '/out/…')  → host.serviceRequest('/wc/…')
//   new EventSource('/api/events') → long-polling '/events'
//   the prototype <iframe> → its HTML as srcdoc
//   downloads, "open in a new tab", external links → host.openUrl (the desktop app's browser panel)
//   file uploads → base64 chunks under the 64 KB request limit
import { connectHost, HostRequestError } from '@openchamber/sdk';
import { applyHostReady } from '@openchamber/sdk/ui';

const host = connectHost();
document.documentElement.classList.add('oc');
let directory = null;
let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
let readyAt = 0;

host.onReady(ctx => {
  applyHostReady(ctx, document.documentElement);
  document.documentElement.classList.add('oc');
  if (!readyAt) { readyAt = Date.now(); directory = ctx.directory ?? null; resolveReady(); }
});
// Another project in the same window: start over with its WeshCraft.
host.onDirectory(d => { if (readyAt && d && d !== directory) location.reload(); });

// Never a blank page: say what is wrong in the page itself.
function showProblem(title, detail) {
  let box = document.getElementById('ocProblem');
  if (!box) {
    box = document.createElement('div');
    box.id = 'ocProblem';
    box.className = 'oc-problem';
    document.body.prepend(box);
  }
  box.innerHTML = '';
  const h = document.createElement('strong'); h.textContent = title;
  const p = document.createElement('div'); p.textContent = detail ?? '';
  box.append(h, p);
}
setTimeout(() => { if (!readyAt) showProblem('OpenChamber has not connected this page yet.', 'Check that WeshCraft is enabled in Settings → Extensions (OpenChamber 2.0.1 or later), then reload it there.'); }, 4000);
addEventListener('error', e => showProblem('WeshCraft page error', e.error?.stack || e.message));
addEventListener('unhandledrejection', e => {
  const err = e.reason;
  if (err instanceof HostRequestError || err?.name === 'HostRequestError' || !readyAt) { e.preventDefault(); showProblem('WeshCraft could not reach its service', explain(err)); }
});

function explain(err) {
  if (err instanceof HostRequestError || err?.code) {
    if (err.code === 'NO_SERVICE') return 'Allow the WeshCraft service in Settings → Extensions: it runs this project\'s WeshCraft.';
    if (err.code === 'DISABLED') return 'WeshCraft is paused in Settings → Extensions.';
    if (err.code === 'SERVICE_FAILED') return 'The WeshCraft service did not start. Reload it in Settings → Extensions.';
  }
  return err?.message || String(err);
}

async function svc(method, path, { body, query = {} } = {}) {
  await ready;
  if (!directory) { showProblem('No project open', 'Open a project in OpenChamber: WeshCraft works on the project of the open session.'); throw new Error('no project open'); }
  try {
    return await host.serviceRequest({ method, path, query: { ...query, directory }, body });
  } catch (err) {
    // Said here, not left to unhandledrejection: browsers mute those for this sandboxed page.
    if (['NO_SERVICE', 'DISABLED', 'SERVICE_FAILED'].includes(err?.code)) showProblem('WeshCraft could not reach its service', explain(err));
    throw err;
  }
}

const TYPES = { json: 'application/json', md: 'text/markdown', html: 'text/html', css: 'text/css' };
const typeOf = p => TYPES[p.split('.').pop()] ?? 'application/json';

async function upload(url, blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 45_000; // bytes; ~60 KB once base64-encoded
  const parts = Math.max(1, Math.ceil(bytes.length / CHUNK));
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  let last = null;
  for (let i = 0; i < parts; i++) {
    const slice = bytes.subarray(i * CHUNK, (i + 1) * CHUNK);
    let bin = '';
    for (let j = 0; j < slice.length; j += 8192) bin += String.fromCharCode(...slice.subarray(j, j + 8192));
    last = await svc('POST', '/upload', { body: btoa(bin), query: { name: url.searchParams.get('name') ?? 'design.figcraft', id, part: String(i), parts: String(parts) } });
    if (last.status >= 400) break;
  }
  return new Response(last.body, { status: last.status, headers: { 'Content-Type': 'application/json' } });
}

window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, 'http://weshcraft.local');
  const method = String(init.method || 'GET').toUpperCase();
  if (init.body instanceof Blob) return upload(url, init.body);
  const r = await svc(method, `/wc${url.pathname}`, { body: typeof init.body === 'string' ? init.body : undefined, query: Object.fromEntries(url.searchParams) });
  const empty = r.status === 204 || r.status === 304;
  return new Response(empty ? null : r.body, { status: r.status, headers: { 'Content-Type': typeOf(url.pathname) } });
};

class PollingEventSource {
  constructor() {
    this.listeners = new Map();
    this.onerror = null;
    this.since = -1;
    this.closed = false;
    this.loop();
  }
  addEventListener(type, fn) { if (!this.listeners.has(type)) this.listeners.set(type, new Set()); this.listeners.get(type).add(fn); }
  removeEventListener(type, fn) { this.listeners.get(type)?.delete(fn); }
  close() { this.closed = true; }
  async loop() {
    while (!this.closed) {
      try {
        const r = await svc('GET', '/events', { query: { since: String(this.since) } });
        if (r.status >= 400) throw new Error(`events: HTTP ${r.status}`);
        const j = JSON.parse(r.body);
        if (j.reset) { location.reload(); return; }
        for (const e of j.events) {
          for (const fn of this.listeners.get(e.type) ?? []) { try { fn({ type: e.type, data: e.data }); } catch (err) { console.error(err); } }
        }
        this.since = j.seq;
      } catch (err) {
        try { this.onerror?.(err); } catch { /* the app logs it */ }
        await new Promise(res => setTimeout(res, 2500));
      }
    }
  }
}
window.EventSource = PollingEventSource;

let info = null;
const serverUrl = async path => {
  info ??= JSON.parse((await svc('GET', '/info')).body);
  const u = new URL(path, `${info.base}/`);
  const t = new URL(info.url).searchParams.get('token');
  if (t) u.searchParams.set('token', t);
  return u.href;
};
const openOutside = async href => {
  try { await host.openUrl(/^https?:/.test(href) ? href : await serverUrl(href)); } catch (err) { host.toast({ kind: 'error', message: explain(err) }).catch(() => {}); }
};

window.__wc = {
  /** The prototype iframe: same HTML, delivered as srcdoc (the page cannot load URLs). */
  frame: async (frame, src) => {
    try {
      const u = new URL(src, 'http://weshcraft.local');
      const r = await svc('GET', `/wc${u.pathname}`);
      frame.removeAttribute('src');
      frame.srcdoc = r.status < 400 ? r.body : `<p style="font:13px system-ui;padding:16px">Prototype not built yet.</p>`;
    } catch (err) { frame.srcdoc = `<p style="font:13px system-ui;padding:16px">${String(explain(err)).replace(/[<&]/g, '')}</p>`; }
  },
  open: href => openOutside(href),
  host,
};

// Links that would leave the page: downloads, new tabs, other sites.
document.addEventListener('click', e => {
  const a = e.target.closest?.('a[href]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || a.dataset.href) return;
  if (a.hasAttribute('download') || a.target === '_blank' || /^https?:/.test(href)) { e.preventDefault(); openOutside(href); }
}, true);

// Sandboxed pages cannot submit forms (no allow-forms): run submissions as script events instead.
// `method="dialog"` forms close their dialog with the submitter's value, as browsers do.
function submitForm(form, submitter) {
  if (submitter && !submitter.formNoValidate && !form.noValidate && !form.checkValidity()) { form.reportValidity(); return; }
  let ev;
  try { ev = new SubmitEvent('submit', { bubbles: true, cancelable: true, submitter: submitter ?? null }); } catch { ev = new Event('submit', { bubbles: true, cancelable: true }); }
  const go = form.dispatchEvent(ev);
  if (go && (form.getAttribute('method') || '').toLowerCase() === 'dialog') form.closest('dialog')?.close(submitter?.value ?? '');
}
document.addEventListener('click', e => {
  const b = e.target.closest?.('button, input[type="submit"]');
  if (!b || !b.form || (b.type && b.type !== 'submit')) return;
  e.preventDefault();
  submitForm(b.form, b);
}, true);
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.defaultPrevented || e.isComposing) return;
  const t = e.target;
  if (!(t instanceof HTMLInputElement) || !t.form || ['checkbox', 'radio', 'button', 'submit', 'file'].includes(t.type)) return;
  e.preventDefault();
  submitForm(t.form, t.form.querySelector('button[type="submit"], button:not([type]), input[type="submit"]'));
}, true);
