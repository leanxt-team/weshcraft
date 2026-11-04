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

window.__wcStarted = 'script';
const host = connectHost();
window.__wcStarted = 'connecting';
document.documentElement.classList.add('oc');
let directory = null;
let resolveReady;
const ready = new Promise(r => { resolveReady = r; });
let readyAt = 0;

host.onReady(ctx => {
  window.__wcStarted = 'ready';
  try { applyHostReady(ctx, document.documentElement); } catch (e) { console.error(e); }
  document.documentElement.classList.add('oc');
  if (!readyAt) {
    readyAt = Date.now(); directory = ctx.directory ?? null; resolveReady();
    // Which project this is, next to the name.
    const brand = document.querySelector('.brand');
    if (brand && directory && !brand.querySelector('.oc-project')) { const s = document.createElement('span'); s.className = 'oc-project'; s.textContent = directory.split(/[\\/]/).filter(Boolean).pop(); s.title = directory; brand.append(s); }
  }
});
// Another project in the same window: start over with its WeshCraft.
host.onDirectory(d => {
  if (!readyAt || !d || d === directory) return;
  const n = document.createElement('div');
  n.className = 'oc-switching';
  n.textContent = `Opening ${d.split(/[\\/]/).filter(Boolean).pop()}…`;
  document.body.append(n);
  setTimeout(() => location.reload(), 60);
});

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

// The rail icon carries a dot when something needs a look: parity errors or a failed sync.
const badge = { errors: 0, syncFailed: false, shown: undefined };
function badgeFrom(e) {
  try {
    const d = JSON.parse(e.data);
    if (e.type === 'parity') badge.errors = d.report?.errors ?? 0;
    else if (e.type === 'sync') badge.syncFailed = d.status?.last ? d.status.last.ok === false : false;
    else return;
  } catch { return; }
  const n = badge.errors + (badge.syncFailed ? 1 : 0) || null;
  if (n !== badge.shown) { badge.shown = n; host.setBadge(n).catch(() => {}); }
}

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
        for (const e of j.events) badgeFrom(e);
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

// Links opened outside the panel use the address OpenChamber is reached with: on another machine,
// the service shares the prototype, specs and zip there (read-only, behind a token).
const hostName = () => {
  try {
    const a = location.ancestorOrigins;
    const origin = a && a.length ? a[a.length - 1] : document.referrer;
    return origin ? new URL(origin).hostname : '';
  } catch { return ''; }
};
let info = null;
const serverUrl = async path => {
  info ??= JSON.parse((await svc('GET', '/info', { query: { host: hostName() } })).body);
  const u = new URL(path, `${info.base}/`);
  if (info.token) u.searchParams.set('token', info.token);
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

// In OpenChamber the header is one line: name · project, the main views, parity, and a menu.
// Sync is driven from the ⋯ menu, so the sync pill, source and hash move out of the way (source and
// hash stay in the menu). After the app has wired its tabs (it measures them on load).
setTimeout(() => {
  const top = document.querySelector('.top');
  const tabs = document.querySelector('.stage > .tabs');
  if (top && tabs) { tabs.classList.add('oc-tabs'); top.querySelector('.brand')?.after(tabs); }
  const more = document.getElementById('more');
  if (more) { more.title = 'Actions'; top?.append(more); }
  // The menu opens under its button, not as a phone sheet.
  more?.addEventListener('click', () => requestAnimationFrame(() => {
    const d = document.getElementById('moreDlg');
    const r = more.getBoundingClientRect();
    if (!d) return;
           const want = Math.max(8, Math.round(document.documentElement.clientWidth - r.right));
           d.style.top = `${Math.round(r.bottom + 6)}px`; d.style.right = `${want}px`;
           const off = Math.round(document.documentElement.clientWidth - d.getBoundingClientRect().right) - want; // dialog margins vary by browser
           if (off) d.style.right = `${want - off}px`;
  }));
}, 0);

// ---- panel toggles: the spec list and the spec reader, shown or hidden from the header ----
// The spec is a main element: one button in the header, always in the same place; picking a spec
// anywhere shows it. Choices are remembered for this panel (best effort).
setTimeout(() => {
  const top = document.querySelector('.top');
  if (!top) return;
  const KEY = 'weshcraft.oc.panels';
  // The spec list is on by default, but not while designing (the editor has its screens and layers).
  let pref = { list: true, spec: true, listDesign: false };
  try { pref = { ...pref, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { /* storage blocked */ }
  const ICON = {
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/></svg>',
    spec: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/></svg>',
  };
  // One "Specs" menu in the header: tick the spec list and/or the spec panel.
  const group = document.createElement('div');
  group.className = 'oc-panels';
  const button = document.createElement('button');
  button.type = 'button'; button.id = 'ocSpecs'; button.title = 'Show the spec list and/or the spec';
  button.setAttribute('aria-haspopup', 'menu'); button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `${ICON.spec}<span>Specs</span><svg class="oc-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg>`;
  const menu = document.createElement('div');
  menu.className = 'oc-panels-menu'; menu.id = 'ocSpecsMenu'; menu.setAttribute('role', 'menu'); menu.hidden = true;
  const make = (key, label) => {
    const b = document.createElement('button');
    b.type = 'button'; b.id = `ocToggle-${key}`; b.dataset.panel = key; b.setAttribute('role', 'menuitemcheckbox');
    b.innerHTML = `<span class="oc-tick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span>${ICON[key]}<span>${label}</span>`;
    b.addEventListener('click', () => { const k = slot(key); set(k, !pref[k]); });
    menu.append(b);
  };
  make('list', 'Spec list');
  make('spec', 'Spec panel');
  group.append(button);
  document.body.append(menu);
  const parity = top.querySelector('.parity');
  (parity || top.querySelector('.more'))?.before(group);
  const close = () => { if (menu.hidden) return; menu.hidden = true; button.setAttribute('aria-expanded', 'false'); };
  button.addEventListener('click', () => {
    if (!menu.hidden) return close();
    const r = button.getBoundingClientRect();
    menu.hidden = false; button.setAttribute('aria-expanded', 'true');
    menu.style.top = `${Math.round(r.bottom + 6)}px`;
    menu.style.left = `${Math.round(Math.max(8, Math.min(r.left, document.documentElement.clientWidth - menu.offsetWidth - 8)))}px`;
    menu.querySelector('button')?.focus({ preventScroll: true });
  });
  document.addEventListener('pointerdown', e => { if (!menu.hidden && !menu.contains(e.target) && !button.contains(e.target)) close(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { close(); button.focus(); } });
  addEventListener('resize', close);
  const slot = key => (key === 'list' && document.body.classList.contains('editing') ? 'listDesign' : key);
  function apply() {
    const cl = document.body.classList;
    const noList = !pref[slot('list')], noSpec = !pref.spec;
    if (cl.contains('oc-no-list') !== noList) cl.toggle('oc-no-list', noList);
    if (cl.contains('oc-no-spec') !== noSpec) cl.toggle('oc-no-spec', noSpec);
    for (const b of menu.querySelectorAll('button')) {
      const v = String(!!pref[slot(b.dataset.panel)]);
      if (b.getAttribute('aria-checked') !== v) b.setAttribute('aria-checked', v);
    }
    const any = String(!noList || !noSpec);
    if (button.getAttribute('aria-pressed') !== any) button.setAttribute('aria-pressed', any);
  }
  new MutationObserver(apply).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  function set(key, on) {
    if (pref[key] === on) return;
    pref[key] = on;
    try { localStorage.setItem(KEY, JSON.stringify(pref)); } catch { /* storage blocked */ }
    apply();
  }
  window.__wc = Object.assign(window.__wc || {}, { panels: { set, get: () => ({ ...pref }) } });
  apply();
  // Picking a spec shows it.
  const showSpec = () => set('spec', true);
  document.getElementById('groups')?.addEventListener('click', e => { if (e.target.closest('.job')) showSpec(); });
  document.getElementById('issues')?.addEventListener('click', e => { if (e.target.closest('li[data-file]')) showSpec(); });
  document.getElementById('linkmap')?.addEventListener('click', e => { if (e.target.closest('[data-key], button, a')) showSpec(); });
}, 0);

// ---- dividers between the blocks: drag to resize them (for this visit), double-click to reset ----
setTimeout(() => {
  const layout = document.querySelector('.layout');
  const ed = document.querySelector('.tabpanel.ed');
  if (!layout) return;
  const q = s => document.querySelector(s);
  const visible = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
  // name, container, the block it resizes, which edge, the block that gives room, minimum width
  const defs = [
    { v: '--oc-list', box: layout, el: q('.builder'), edge: 'right', mid: q('.stage'), min: 160 },
    { v: '--oc-spec', box: layout, el: q('.reader'), edge: 'left', mid: q('.stage'), min: 240 },
    { v: '--oc-edl', box: ed, el: q('.ed-left'), edge: 'right', mid: q('.ed-center'), min: 120 },
    { v: '--oc-edr', box: ed, el: q('.ed-right'), edge: 'left', mid: q('.ed-center'), min: 200 },
  ].filter(d => d.box && d.el && d.mid);
  const MID_MIN = 220;
  for (const d of defs) {
    const h = d.h = document.createElement('div');
    h.className = 'oc-split'; h.dataset.split = d.v.slice(5); h.title = 'Drag to resize · double-click to reset';
    h.setAttribute('role', 'separator'); h.setAttribute('aria-orientation', 'vertical');
    d.box.append(h);
    h.addEventListener('dblclick', () => { document.body.style.removeProperty(d.v); place(); });
    h.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      e.preventDefault();
      h.setPointerCapture(e.pointerId);
      const x0 = e.clientX, w0 = d.el.getBoundingClientRect().width, room = d.mid.getBoundingClientRect().width - MID_MIN;
      const max = Math.max(d.min, w0 + room);
      h.classList.add('dragging'); document.body.classList.add('oc-resizing');
      const move = ev => {
        const dx = ev.clientX - x0;
        const w = Math.round(Math.min(max, Math.max(d.min, d.edge === 'right' ? w0 + dx : w0 - dx)));
        document.body.style.setProperty(d.v, `${w}px`);
        place();
      };
      const up = () => {
        h.removeEventListener('pointermove', move); h.removeEventListener('pointerup', up); h.removeEventListener('pointercancel', up);
        h.classList.remove('dragging'); document.body.classList.remove('oc-resizing');
        window.dispatchEvent(new Event('resize')); // the canvas and the prototype refit
      };
      h.addEventListener('pointermove', move); h.addEventListener('pointerup', up); h.addEventListener('pointercancel', up);
    });
  }
  function place() {
    for (const d of defs) {
      const show = visible(d.box) && visible(d.el) && visible(d.mid);
      d.h.hidden = !show;
      if (!show) continue;
      const r = d.el.getBoundingClientRect(), b = d.box.getBoundingClientRect();
      d.h.style.left = `${Math.round((d.edge === 'right' ? r.right : r.left) - b.left)}px`;
    }
  }
  let raf = 0;
  const later = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
  const ro = new ResizeObserver(later);
  for (const d of defs) { ro.observe(d.el); ro.observe(d.box); }
  new MutationObserver(later).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  for (const el of document.querySelectorAll('.tabpanel')) new MutationObserver(later).observe(el, { attributes: true, attributeFilter: ['hidden'] });
  addEventListener('resize', later);
  place();
}, 0);
