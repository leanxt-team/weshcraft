// WeshCraft design editor: FigCraft's core editing tools in the browser, on the same document and
// undo stack agents use over MCP. The server renders each screen exactly as the prototype does;
// this module draws selection, handles and tools over it, and sends operations back.
import { layerMenu } from '/app/impact.js';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const PAD = 64;
const CONTAINERS = new Set(['frame', 'component', 'section', 'page']);
const PRESETS = [['iPhone', 393, 852], ['Android', 412, 915], ['iPad', 834, 1194], ['Desktop', 1440, 1024], ['Card', 360, 240]];
const ICON = {
  frame: '<path d="M8 3v18M16 3v18M3 8h18M3 16h18"/>', component: '<path d="M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4zM7 8l4 4-4 4-4-4zM17 8l4 4-4 4-4-4z"/>',
  componentSet: '<path d="M12 3l4 4-4 4-4-4zM12 13l4 4-4 4-4-4z"/>', instance: '<path d="M12 4l8 8-8 8-8-8z"/>', text: '<path d="M5 6V4.5h14V6M12 4.5V20M9 20h6"/>',
  rectangle: '<rect x="4" y="6" width="16" height="12" rx="1.5"/>', ellipse: '<circle cx="12" cy="12" r="7.5"/>', vector: '<path d="M4 18C8 4 16 20 20 6"/>',
  star: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>', section: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h7"/>',
  line: '<path d="M4 20L20 4"/>', polygon: '<path d="M12 4l8 15H4z"/>', group: '<rect x="4" y="4" width="16" height="16" rx="2" stroke-dasharray="3 3"/>',
};
const icon = t => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[t] ?? ICON.frame}</svg>`;

export function createEditor({ openFile, markdown, log, layerActions }) {
  const E = {
    S: null, screenId: null, tree: null, nodes: new Map(), sel: [], tool: 'select', zoom: 1, fit: true,
    version: -1, open: new Set(), insp: 'design', fonts: new Set(), busy: null, pending: false, editing: null,
  };
  const canvas = $('#edCanvas'), scroller = $('#edScroller'), world = $('#edWorld'), screenEl = $('#edScreen');
  const overlay = $('#edOverlay');
  scroller.append(overlay); // overlay draws in screen pixels, unscaled (crisp handles at any zoom)

  // ---- server -------------------------------------------------------------------------------
  const api = async (path, body) => {
    const r = await fetch(`/api/design${path}`, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    return j;
  };
  const status = (msg, kind = '') => { const el = $('#edStatus'); el.textContent = msg; el.className = `ed-status ${kind}`; if (kind !== 'err') clearTimeout(status.t), (status.t = setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 2600)); };

  async function ops(list, label) {
    try {
      const r = await api('/op', { ops: list, label });
      await refresh();
      return r;
    } catch (e) { status(e.message, 'err'); log?.({ level: 'error', at: Date.now(), message: e.message }); return null; }
  }

  // ---- loading ------------------------------------------------------------------------------
  /** Coalesced: a call during a refresh schedules one more pass and resolves when it is done. */
  function refresh() {
    if (E.busy) { E.pending = true; return E.busy; }
    E.busy = refreshLoop().finally(() => { E.busy = null; });
    return E.busy;
  }
  async function refreshLoop() {
    try {
      do {
        E.pending = false;
        const S = await api('');
        E.S = S;
        if (!S.editable) { showEmpty(S.reason); return; }
        $('#edEmpty').hidden = true;
        if (!S.screens.some(s => s.id === E.screenId)) E.screenId = (S.screens.find(s => s.type === 'frame') ?? S.screens[0])?.id ?? null;
        if (E.screenId == null) { renderScreens(); showEmpty('no-screen'); return; }
        const [tree, render] = await Promise.all([api(`/tree?root=${E.screenId}`), api(`/render?id=${E.screenId}`)]);
        E.tree = tree;
        indexTree();
        E.sel = E.sel.filter(id => E.nodes.has(id));
        E.version = S.version;
        loadFonts(render.fonts);
        if (E.editing == null) screenEl.innerHTML = render.html;
        renderScreens();
        renderLayers();
        layoutWorld();
        drawOverlay();
        renderUndo();
        await renderInspector();
        const key = S.screens.find(x => x.id === E.screenId)?.key;
        if (key && key !== E.shownKey) { E.shownKey = key; document.dispatchEvent(new CustomEvent('weshcraft:screen', { detail: { key } })); }
      } while (E.pending);
    } catch (e) { status(e.message, 'err'); }
  }

  function indexTree() {
    E.nodes = new Map();
    const walk = (n, parent, depth) => { E.nodes.set(n.id, { ...n, parent, depth }); n.children.forEach(c => walk(c, n.id, depth + 1)); };
    walk(E.tree, null, 0);
  }
  const node = id => E.nodes.get(id);
  const parentOf = id => node(id)?.parent;
  const inFlow = id => { const n = node(id); const p = n && node(n.parent); return !!(p?.flow && !n.abs); };
  const elOf = id => screenEl.querySelector(`[data-node="${id}"]`);
  const isContainer = id => CONTAINERS.has(node(id)?.type);

  function loadFonts(fonts) {
    const missing = fonts.filter(f => !E.fonts.has(f));
    if (!missing.length) return;
    missing.forEach(f => E.fonts.add(f));
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?${missing.map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,100..900;1,100..900`).join('&')}&display=swap`;
    l.onload = () => drawOverlay();
    document.head.append(l);
  }

  function showEmpty(reason) {
    const el = $('#edEmpty');
    el.hidden = false;
    screenEl.innerHTML = ''; overlay.innerHTML = '';
    $('#edLayers').innerHTML = ''; $('#edInspector').innerHTML = '';
    if (reason === 'live-figcraft') el.innerHTML = '<div class="ed-card"><h3>Designing in FigCraft</h3><p>This workspace is attached to a live FigCraft: edit there, or let agents use the <code>figcraft_*</code> tools. Specs follow every change.</p></div>';
    else if (reason === 'read-only') el.innerHTML = '<div class="ed-card"><h3>Read-only</h3><p>This WeshCraft was started with <code>--read-only</code>: the design is shown in the Prototype tab and edited elsewhere (FigCraft, another WeshCraft). Specs still follow every save.</p></div>';
    else if (reason === 'no-screen') el.innerHTML = '<div class="ed-card"><h3>No screen yet</h3><p>Add the first screen of this design.</p><div class="ed-presets" data-act="presets"></div></div>';
    else el.innerHTML = `<form class="ed-card" id="edNewForm"><h3>Start a design</h3><p>A new FigCraft document in <code>wcraft/design/</code>: draw screens here, or let your agent build them (<code>weshcraft_edit</code>). Specs are written as you go.</p><label>Name <input name="name" value="App" required autocomplete="off"></label><div class="ed-presets" data-act="new"></div><p class="muted small">Or open an existing <code>.figcraft</code> from the menu.</p></form>`;
    if (reason === 'none') {
      // Designs already in this project (any folder): open one in place, before starting a new one.
      api('/candidates').then(list => {
        if (!list?.length || !el.querySelector('#edNewForm')) return;
        const box = document.createElement('div');
        box.className = 'ed-card ed-found';
        box.innerHTML = `<h3>Designs in ${esc(E.S?.project ?? 'this project')}</h3><p>Open one to edit it in place; WeshCraft remembers it for this project.</p><ul>${list.map(c => `<li><button type="button" class="ed-open" data-file="${esc(c.file)}"><span class="nm">${esc(c.name)}</span><code>${esc(c.file)}</code></button></li>`).join('')}</ul>`;
        el.prepend(box);
      }).catch(() => {});
    }
    const host = el.querySelector('.ed-presets');
    if (host) host.innerHTML = PRESETS.map(([n, w, h]) => `<button type="button" class="ed-preset" data-w="${w}" data-h="${h}"><span class="ed-pv" style="aspect-ratio:${w}/${h}"></span>${n}<small>${w}×${h}</small></button>`).join('');
  }
  $('#edEmpty').addEventListener('click', async e => {
    const openBtn = e.target.closest('.ed-open');
    if (openBtn) {
      openBtn.disabled = true;
      try { await api('/open', { file: openBtn.dataset.file }); E.screenId = null; E.fit = true; await refresh(); onAvailable?.(true); status(`Opened ${openBtn.dataset.file}`); } catch (err) { status(err.message, 'err'); openBtn.disabled = false; }
      return;
    }
    const b = e.target.closest('.ed-preset');
    if (!b) return;
    const w = Number(b.dataset.w), h = Number(b.dataset.h);
    if (b.parentElement.dataset.act === 'new') {
      const name = $('#edNewForm [name=name]').value.trim() || 'App';
      try { await api('/new', { name, width: w, height: h, screen: 'Home' }); E.screenId = null; await refresh(); onAvailable?.(true); } catch (err) { status(err.message, 'err'); }
    } else await addScreen(w, h);
  });

  // ---- screens list -------------------------------------------------------------------------
  function renderScreens() {
    const list = $('#edScreens');
    const item = s => `<li role="option" data-id="${s.id}" title="${esc(s.name)} · ${Math.round(s.width)}×${Math.round(s.height)}">${icon(s.type)}<span class="nm">${esc(s.name)}</span><span class="dim">${Math.round(s.width)}×${Math.round(s.height)}</span><span class="acts"><button type="button" data-act="dup" title="Duplicate screen" aria-label="Duplicate"><svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg></button><button type="button" data-act="del" title="Delete screen" aria-label="Delete"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button></span></li>`;
    const screens = E.S?.screens ?? [];
    const order = E.S?.functions?.order ?? [];
    let html;
    if (order.length && screens.some(s => s.function)) {
      // grouped by product function (the Functions view), in journey order
      const groups = [...order.map(n => [n, screens.filter(s => s.function === n)]), ['Not in a function', screens.filter(s => s.key && (!s.function || !order.includes(s.function)))], ['Other', screens.filter(s => !s.key)]].filter(([, l]) => l.length);
      html = groups.map(([n, l]) => `<li class="ed-group" role="presentation">${esc(n)}</li>${l.map(item).join('')}`).join('');
    } else html = screens.map(item).join('');
    // Rebuild only when the list changed: a rebuild between two clicks would swallow a double-click.
    if (html !== list.dataset.html) { list.innerHTML = html; list.dataset.html = html; }
    list.querySelectorAll('li[data-id]').forEach(li => li.setAttribute('aria-selected', String(Number(li.dataset.id) === E.screenId)));
  }
  $('#edScreens').addEventListener('click', async e => {
    const li = e.target.closest('li[data-id]');
    if (!li) { if (e.target === e.currentTarget && matchMedia('(max-width: 720px)').matches) $('#edAddScreen').click(); return; }
    const id = Number(li.dataset.id);
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'dup') { const r = await ops([{ op: 'duplicate', id, ref: 'c' }], 'Duplicate screen'); if (r) { E.screenId = r.refs.c; E.sel = []; E.fit = true; refresh(); } return; }
    if (act === 'del') {
      const s = E.S.screens.find(x => x.id === id);
      if (!(await askConfirm(`Delete screen “${s?.name}”?`, 'Its specs go with it. Undo brings both back.', 'Delete'))) return;
      await ops([{ op: 'delete', ids: [id] }], 'Delete screen');
      return;
    }
    if (id !== E.screenId) { E.screenId = id; E.sel = []; E.fit = true; refresh(); }
  });
  $('#edScreens').addEventListener('dblclick', e => {
    const li = e.target.closest('li[data-id]');
    if (li) inlineRename(li.querySelector('.nm'), Number(li.dataset.id));
  });
  $('#edAddScreen').addEventListener('click', e => menu(e.currentTarget, PRESETS.map(([n, w, h]) => ({ label: `${n}`, hint: `${w}×${h}`, run: () => addScreen(w, h) }))));
  async function addScreen(w, h) {
    const n = (E.S?.screens?.length ?? 0) + 1;
    const r = await ops([{ op: 'screen', name: `Screen ${n}`, width: w, height: h, ref: 's' }], 'Add screen');
    if (r) { E.screenId = r.refs.s; E.sel = []; E.fit = true; refresh(); }
  }

  function inlineRename(span, id) {
    const old = span.textContent;
    const inp = document.createElement('input');
    inp.className = 'ed-rename';
    inp.value = node(id)?.name ?? E.S.screens.find(s => s.id === id)?.name ?? old;
    span.replaceWith(inp);
    inp.focus(); inp.select();
    let done = false;
    const finish = ok => { if (done) return; done = true; const v = inp.value.trim(); inp.replaceWith(span); if (ok && v && v !== old) ops([{ op: 'set', id, props: { name: v } }], 'Rename'); };
    inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') finish(true); if (ev.key === 'Escape') finish(false); });
    inp.addEventListener('blur', () => finish(true));
  }

  // ---- layers -------------------------------------------------------------------------------
  function renderLayers() {
    for (const id of E.sel) for (let p = parentOf(id); p != null; p = parentOf(p)) E.open.add(p);
    E.open.add(E.screenId);
    const rows = [];
    const walk = (n, d) => {
      const kids = n.children ?? [];
      const open = E.open.has(n.id);
      const badges = n.link || n.api || n.bind ? `<span class="bdg">${n.api ? '<i class="b-api" title="Calls an API"></i>' : ''}${n.bind ? '<i class="b-bind" title="Shows data"></i>' : ''}${n.link ? '<i class="b-link" title="Prototype link"></i>' : ''}</span>` : '';
      rows.push(`<li role="treeitem" ${kids.length ? `aria-expanded="${open}"` : ''} data-id="${n.id}" draggable="${d > 0}" class="${n.hidden ? 'off' : ''}" style="--d:${d}">`
        + `<button type="button" class="tw" tabindex="-1" aria-hidden="true">${kids.length ? '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>' : ''}</button>`
        + `${icon(n.type)}<span class="nm">${esc(n.text && n.type === 'text' ? n.name || n.text : n.name)}</span>${badges}`
        + (d > 0 ? `<button type="button" class="eye" data-act="eye" title="${n.hidden ? 'Show' : 'Hide'}" aria-label="${n.hidden ? 'Show' : 'Hide'}"><svg viewBox="0 0 24 24">${n.hidden ? '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 9 6 9 6a16 16 0 0 1-3 3.4M6.4 6.5C4.2 8 3 12 3 12s4 6 9 6a8.8 8.8 0 0 0 4-.9"/>' : '<path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>'}</svg></button>` : '')
        + '</li>');
      if (open) kids.forEach(k => walk(k, d + 1));
    };
    if (E.tree) walk(E.tree, 0);
    const list = $('#edLayers');
    const html = rows.join('');
    if (html !== list.dataset.html) { list.innerHTML = html; list.dataset.html = html; }
    list.querySelectorAll('li[data-id]').forEach(li => li.setAttribute('aria-selected', String(E.sel.includes(Number(li.dataset.id)))));
    $('#edLayerCount').textContent = E.nodes.size ? String(E.nodes.size) : '';
    const cur = list.querySelector('li[aria-selected="true"]');
    cur?.scrollIntoView({ block: 'nearest' });
  }
  const layers = $('#edLayers');
  layers.addEventListener('click', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    if (e.target.closest('.tw')) { if (E.open.has(id)) E.open.delete(id); else E.open.add(id); renderLayers(); return; }
    if (e.target.closest('[data-act="eye"]')) { ops([{ op: 'set', id, props: { visible: !!node(id).hidden } }], node(id).hidden ? 'Show layer' : 'Hide layer'); return; }
    select(e.shiftKey ? toggle(E.sel, id) : [id]);
    elOf(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
  layers.addEventListener('dblclick', e => {
    const li = e.target.closest('li[data-id]');
    if (li && !e.target.closest('button')) inlineRename(li.querySelector('.nm'), Number(li.dataset.id));
  });
  // The layer's menu: a smart reference to copy, the link of its spec, what it affects.
  function layerMenuAt(e, id) {
    const n = node(id);
    if (!n) return;
    e.preventDefault();
    const name = n.text && n.type === 'text' ? (n.name || n.text) : n.name;
    layerMenu({ x: e.clientX, y: e.clientY }, { id, name }, {
      reference: layer => layerActions?.reference?.(layer),
      spec: layer => layerActions?.spec?.(layer),
      impact: layer => layerActions?.impact?.(layer),
    });
  }
  layers.addEventListener('contextmenu', e => {
    const li = e.target.closest('li[data-id]');
    if (!li) return;
    const id = Number(li.dataset.id);
    if (!E.sel.includes(id)) select([id]);
    layerMenuAt(e, id);
  });
  let dragRow = null;
  layers.addEventListener('dragstart', e => { const li = e.target.closest('li[data-id]'); dragRow = Number(li.dataset.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragRow)); });
  layers.addEventListener('dragover', e => {
    const li = e.target.closest('li[data-id]');
    if (!li || dragRow == null) return;
    e.preventDefault();
    const r = li.getBoundingClientRect();
    const t = (e.clientY - r.top) / r.height;
    const id = Number(li.dataset.id);
    const zone = isContainer(id) && t > 0.3 && t < 0.7 ? 'in' : t < 0.5 ? 'before' : 'after';
    layers.querySelectorAll('[data-drop]').forEach(x => x.removeAttribute('data-drop'));
    li.dataset.drop = id === E.screenId ? 'in' : zone;
  });
  layers.addEventListener('dragleave', e => { if (!layers.contains(e.relatedTarget)) layers.querySelectorAll('[data-drop]').forEach(x => x.removeAttribute('data-drop')); });
  layers.addEventListener('drop', e => {
    e.preventDefault();
    const li = layers.querySelector('[data-drop]');
    const src = dragRow; dragRow = null;
    if (!li || src == null) return;
    const id = Number(li.dataset.id), zone = li.dataset.drop;
    li.removeAttribute('data-drop');
    if (id === src || isInside(id, src)) return;
    if (zone === 'in') { ops([{ op: 'move', id: src, parent: id }], 'Move layer'); return; }
    const p = parentOf(id);
    const idx = node(p).children.map(c => c.id).indexOf(id) + (zone === 'after' ? 1 : 0);
    ops([{ op: 'move', id: src, parent: p, index: idx }], 'Reorder layer');
  });
  layers.addEventListener('dragend', () => { dragRow = null; layers.querySelectorAll('[data-drop]').forEach(x => x.removeAttribute('data-drop')); });
  const isInside = (id, anc) => { for (let p = id; p != null; p = parentOf(p)) if (p === anc) return true; return false; };
  const toggle = (arr, id) => (arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  // ---- world / zoom -------------------------------------------------------------------------
  function layoutWorld() {
    const s = E.S?.screens?.find(x => x.id === E.screenId);
    if (!s) return;
    const box = canvas.getBoundingClientRect();
    const PAD = matchMedia('(max-width: 720px)').matches ? 18 : 64;
    if (E.fit && box.width > 0) E.zoom = Math.max(0.1, Math.min(2, (box.width - PAD * 2) / s.width, (box.height - PAD * 2) / s.height));
    world.style.width = `${s.width}px`;
    world.style.height = `${s.height}px`;
    world.style.transform = `scale(${E.zoom})`;
    scroller.style.width = `${Math.max(box.width, s.width * E.zoom + PAD * 2)}px`;
    scroller.style.height = `${Math.max(box.height, s.height * E.zoom + PAD * 2)}px`;
    // Centre the screen when it is smaller than the canvas.
    const ox = Math.max(PAD, (box.width - s.width * E.zoom) / 2), oy = Math.max(PAD, (box.height - s.height * E.zoom) / 2);
    world.style.left = `${ox}px`; world.style.top = `${oy}px`;
    E.origin = { x: ox, y: oy };
    $('#edZoomFit').textContent = `${Math.round(E.zoom * 100)}%`;
  }
  const setZoom = (z, fit = false) => { E.fit = fit; E.zoom = Math.max(0.1, Math.min(8, z)); layoutWorld(); drawOverlay(); };
  $('#edZoomIn').addEventListener('click', () => setZoom(E.zoom * 1.25));
  $('#edZoomOut').addEventListener('click', () => setZoom(E.zoom / 1.25));
  $('#edZoomFit').addEventListener('click', () => setZoom(1, true));
  canvas.addEventListener('wheel', e => { if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); setZoom(E.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1)); }, { passive: false });
  new ResizeObserver(() => { if (E.fit) { layoutWorld(); drawOverlay(); } }).observe(canvas);

  /** A layer's box in design pixels, relative to the screen. */
  function boxOf(id) {
    const el = elOf(id);
    if (!el) return null;
    const w = world.getBoundingClientRect(), r = el.getBoundingClientRect();
    return { x: (r.left - w.left) / E.zoom, y: (r.top - w.top) / E.zoom, w: r.width / E.zoom, h: r.height / E.zoom };
  }
  const toScreen = b => ({ x: E.origin.x + b.x * E.zoom, y: E.origin.y + b.y * E.zoom, w: b.w * E.zoom, h: b.h * E.zoom });
  /** Pointer -> design pixels relative to the screen. */
  function designPoint(e) { const w = world.getBoundingClientRect(); return { x: (e.clientX - w.left) / E.zoom, y: (e.clientY - w.top) / E.zoom }; }

  // ---- overlay ------------------------------------------------------------------------------
  function drawOverlay(extra = '') {
    if (!E.origin) return;
    const parts = [];
    if (E.hover != null && !E.sel.includes(E.hover)) { const b = boxOf(E.hover); if (b) parts.push(rectHtml(toScreen(b), 'hov')); }
    for (const id of E.sel) {
      const b = boxOf(id);
      if (!b) continue;
      const s = toScreen(b);
      parts.push(rectHtml(s, 'sel'));
      if (E.sel.length === 1 && id !== E.screenId || (E.sel.length === 1 && id === E.screenId)) {
        parts.push(['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].map(h => `<i class="hd" data-h="${h}" style="left:${s.x + (h.includes('w') ? 0 : h.includes('e') ? s.w : s.w / 2)}px;top:${s.y + (h.includes('n') ? 0 : h.includes('s') ? s.h : s.h / 2)}px"></i>`).join(''));
        parts.push(`<span class="ed-size" style="left:${s.x + s.w / 2}px;top:${s.y + s.h + 8}px">${Math.round(b.w)} × ${Math.round(b.h)}</span>`);
      }
    }
    if (E.sel.length === 1) {
      const n = node(E.sel[0]);
      const b = boxOf(E.sel[0]);
      if (n && b) { const s = toScreen(b); parts.push(`<span class="ed-label" style="left:${s.x}px;top:${s.y - 20}px">${esc(n.name || n.type)}${n.api ? ' · API' : ''}${n.bind ? ' · ◉' : ''}${n.link ? ' · ▶' : ''}</span>`); }
    }
    overlay.innerHTML = parts.join('') + extra;
  }
  const rectHtml = (s, cls) => `<div class="ed-box ${cls}" style="left:${s.x}px;top:${s.y}px;width:${s.w}px;height:${s.h}px"></div>`;

  // ---- selection ----------------------------------------------------------------------------
  async function select(ids) {
    if (E.wantUrl != null && !ids.includes(E.wantUrl)) E.wantUrl = null;
    E.sel = ids;
    renderLayers();
    drawOverlay();
    await renderInspector();
  }

  /** Path from the screen down to the deepest layer under the pointer. */
  function hitPath(e) {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const hit = els.find(el => el.dataset?.node && screenEl.contains(el));
    if (!hit) return [];
    const path = [];
    for (let el = hit; el && el !== screenEl; el = el.parentElement) if (el.dataset?.node) path.unshift(Number(el.dataset.node));
    return path;
  }
  /** Figma-style pick: top-level child of the screen first; once inside a container, its siblings. */
  function pick(path, deep) {
    if (!path.length) return null;
    if (deep) return path.at(-1);
    const cur = E.sel[0];
    const at = path.indexOf(cur);
    // Inside the current selection: keep it (so it can be dragged). The screen itself gives way to its children.
    if (at >= 0 && cur !== E.screenId) return cur;
    if (cur === E.screenId) return path[1] ?? path[0];
    const curParent = parentOf(cur);
    const pi = path.indexOf(curParent);
    if (cur != null && pi >= 0 && pi + 1 < path.length) return path[pi + 1];
    return path[1] ?? path[0];
  }

  // ---- pointer: select, move, resize, draw --------------------------------------------------
  let drag = null;
  scroller.addEventListener('pointermove', e => {
    if (drag) return dragMove(e);
    if (E.tool !== 'select' || E.editing != null) return;
    const path = hitPath(e);
    const h = pick(path, e.metaKey || e.ctrlKey);
    if (h !== E.hover) { E.hover = h; drawOverlay(); }
  });
  scroller.addEventListener('pointerleave', () => { if (!drag && E.hover != null) { E.hover = null; drawOverlay(); } });
  scroller.addEventListener('pointerdown', e => {
    if (e.button !== 0 || E.editing != null) return;
    canvas.focus({ preventScroll: true });
    const handle = e.target.closest('.hd');
    if (handle && E.sel.length === 1) return startResize(e, handle.dataset.h);
    if (E.tool !== 'select') return startDraw(e);
    const path = hitPath(e);
    if (!path.length) { select([]); return; }
    const id = pick(path, e.metaKey || e.ctrlKey);
    if (e.shiftKey) { select(toggle(E.sel, id)); return; }
    if (!E.sel.includes(id)) select([id]);
    if (id === E.screenId) return;
    drag = { kind: 'move', start: designPoint(e), sx: e.clientX, sy: e.clientY, id, moved: false, pid: e.pointerId };
    scroller.setPointerCapture(e.pointerId);
  });
  scroller.addEventListener('pointerup', e => { if (drag) dragEnd(e); });
  scroller.addEventListener('pointercancel', () => { if (drag) { cancelDrag(); } });
  scroller.addEventListener('dblclick', e => {
    if (E.tool !== 'select') return;
    const path = hitPath(e);
    const cur = E.sel[0];
    if (cur != null && node(cur)?.type === 'text' && path.includes(cur)) return editText(cur);
    const i = path.indexOf(cur);
    const next = i >= 0 && i + 1 < path.length ? path[i + 1] : path.at(-1);
    if (next == null) return;
    if (node(next)?.type === 'text' && next === path.at(-1) && cur === next) return editText(next);
    select([next]);
  });
  scroller.addEventListener('contextmenu', e => {
    // The selected layer, or the one under the pointer.
    const path = hitPath(e);
    const id = (E.sel.length === 1 && path.includes(E.sel[0])) ? E.sel[0] : (pick(path, true) ?? E.sel[0] ?? null);
    if (id == null) return;
    if (!E.sel.includes(id)) select([id]);
    layerMenuAt(e, id);
  });

  function startResize(e, h) {
    const id = E.sel[0];
    const b = boxOf(id);
    const n = node(id);
    drag = { kind: 'resize', h, id, b, start: designPoint(e), pid: e.pointerId, flow: inFlow(id), px: n.x, py: n.y };
    scroller.setPointerCapture(e.pointerId);
    e.stopPropagation();
  }

  function startDraw(e) {
    const p = designPoint(e);
    drag = { kind: 'draw', start: p, cur: p, pid: e.pointerId };
    scroller.setPointerCapture(e.pointerId);
  }

  function dropTarget(e, exclude) {
    // Deepest container under the pointer that is not the dragged layer (or inside it), and not an instance's insides.
    const els = document.elementsFromPoint(e.clientX, e.clientY).filter(el => el.dataset?.node && screenEl.contains(el));
    for (const el of els) {
      const id = Number(el.dataset.node);
      if (exclude != null && isInside(id, exclude)) continue;
      if (!isContainer(id)) continue;
      let insideInstance = false;
      for (let p = parentOf(id); p != null; p = parentOf(p)) if (node(p)?.type === 'instance') insideInstance = true;
      if (!insideInstance) return id;
    }
    return E.screenId;
  }

  /** Where in a flow container a drop at the pointer lands: index + indicator line (screen px). */
  function flowSlot(container, p, exclude) {
    const c = node(container);
    const kids = c.children.map(k => k.id).filter(id => id !== exclude && !node(id).abs);
    const el = elOf(container);
    const cs = el ? getComputedStyle(el) : null;
    const horizontal = cs ? cs.flexDirection === 'row' : true;
    let index = c.children.length;
    let line = null;
    for (const id of kids) {
      const b = boxOf(id);
      if (!b) continue;
      const mid = horizontal ? b.x + b.w / 2 : b.y + b.h / 2;
      if ((horizontal ? p.x : p.y) < mid) { index = c.children.findIndex(k => k.id === id); line = horizontal ? { x: b.x - 2, y: b.y, w: 2, h: b.h } : { x: b.x, y: b.y - 2, w: b.w, h: 2 }; break; }
    }
    if (!line && kids.length) {
      const b = boxOf(kids.at(-1));
      line = horizontal ? { x: b.x + b.w, y: b.y, w: 2, h: b.h } : { x: b.x, y: b.y + b.h, w: b.w, h: 2 };
    }
    if (!line) { const b = boxOf(container); line = horizontal ? { x: b.x + 4, y: b.y + 4, w: 2, h: Math.max(8, b.h - 8) } : { x: b.x + 4, y: b.y + 4, w: Math.max(8, b.w - 8), h: 2 }; }
    // Moving later in the same parent: the index counts the layer itself.
    return { index, line };
  }

  function dragMove(e) {
    const p = designPoint(e);
    if (drag.kind === 'draw') {
      drag.cur = p;
      const r = norm(drag.start, p);
      drawOverlay(rectHtml(toScreen(r), 'draw'));
      return;
    }
    if (drag.kind === 'resize') {
      const r = resized(drag, p, e.shiftKey);
      drag.r = r;
      drawOverlay(rectHtml(toScreen(r), 'draw') + `<span class="ed-size" style="left:${toScreen(r).x + toScreen(r).w / 2}px;top:${toScreen(r).y + toScreen(r).h + 8}px">${Math.round(r.w)} × ${Math.round(r.h)}</span>`);
      return;
    }
    // move
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
    drag.moved = true;
    const dx = p.x - drag.start.x, dy = p.y - drag.start.y;
    const el = elOf(drag.id);
    if (el) { el.style.translate = `${dx}px ${dy}px`; el.style.pointerEvents = 'none'; el.style.opacity = '.85'; el.style.zIndex = '30'; }
    const target = dropTarget(e, drag.id);
    drag.target = target;
    let extra = '';
    if (node(target)?.flow) {
      const slot = flowSlot(target, p, drag.id);
      drag.slot = slot;
      extra = `<div class="ed-ins" style="left:${toScreen(slot.line).x}px;top:${toScreen(slot.line).y}px;width:${Math.max(2, toScreen(slot.line).w)}px;height:${Math.max(2, toScreen(slot.line).h)}px"></div>`;
    } else drag.slot = null;
    if (target !== parentOf(drag.id)) { const tb = boxOf(target); if (tb) extra += rectHtml(toScreen(tb), 'target'); }
    drawOverlay(extra);
  }

  function resized(d, p, keep) {
    let { x, y, w, h } = d.b;
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (d.h.includes('e')) w = Math.max(1, w + dx);
    if (d.h.includes('s')) h = Math.max(1, h + dy);
    if (d.h.includes('w')) { w = Math.max(1, w - dx); x = d.b.x + d.b.w - w; }
    if (d.h.includes('n')) { h = Math.max(1, h - dy); y = d.b.y + d.b.h - h; }
    if (keep && d.b.w && d.b.h) { const ratio = d.b.w / d.b.h; if (d.h === 'n' || d.h === 's') w = h * ratio; else h = w / ratio; }
    return { x, y, w, h };
  }
  const norm = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
  const R = v => Math.round(v);

  function cancelDrag() {
    const el = drag && elOf(drag.id);
    if (el) { el.style.translate = ''; el.style.pointerEvents = ''; el.style.opacity = ''; el.style.zIndex = ''; }
    drag = null;
    drawOverlay();
  }

  async function dragEnd(e) {
    const d = drag;
    try { scroller.releasePointerCapture(d.pid); } catch { /* released */ }
    if (d.kind === 'draw') { drag = null; return finishDraw(d, e); }
    if (d.kind === 'resize') {
      drag = null;
      const r = d.r;
      if (!r) return drawOverlay();
      const props = { width: R(r.w), height: R(r.h) };
      // The position moves by a delta, not to an absolute place: the tree the drag started from
      // may already be out of date (an agent moved the layer meanwhile).
      const dx = r.x - d.b.x, dy = r.y - d.b.y;
      const shift = !d.flow && d.id !== E.screenId && (dx || dy) ? [{ op: 'offset', id: d.id, dx: R(dx), dy: R(dy) }] : [];
      if (d.flow) {
        const cur = node(d.id);
        const sizing = {};
        if (R(r.w) !== R(d.b.w)) sizing.h = 'fixed';
        if (R(r.h) !== R(d.b.h)) sizing.v = 'fixed';
        if (Object.keys(sizing).length && cur) props.sizing = sizing;
      }
      return ops([...shift, { op: 'set', id: d.id, props }], 'Resize');
    }
    // move
    const moved = d.moved;
    const target = d.target, slot = d.slot;
    cancelDrag();
    if (!moved) return;
    const p = designPoint(e);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    const parent = parentOf(d.id);
    if (target === parent && !node(parent).flow) return ops([{ op: 'offset', id: d.id, dx: R(dx), dy: R(dy) }], 'Move');
    if (target === parent && slot) {
      const from = node(parent).children.findIndex(k => k.id === d.id);
      if (slot.index === from || slot.index === from + 1) return;
      return ops([{ op: 'move', id: d.id, parent, index: slot.index }], 'Reorder');
    }
    if (node(target)?.flow) return ops([{ op: 'move', id: d.id, parent: target, index: slot?.index }], 'Move into');
    // Absolute placement inside another container: keep where it was dropped.
    const b = boxOf(d.id), tb = boxOf(target);
    return ops([{ op: 'move', id: d.id, parent: target }, { op: 'set', id: d.id, props: { x: R(b.x + dx - tb.x), y: R(b.y + dy - tb.y) } }], 'Move into');
  }

  async function finishDraw(d, e) {
    let r = norm(d.start, d.cur);
    const tool = E.tool;
    const click = r.w < 4 && r.h < 4;
    if (click) r = { x: d.start.x, y: d.start.y, w: tool === 'text' ? 0 : tool === 'frame' ? 200 : 100, h: tool === 'text' ? 0 : tool === 'frame' ? 120 : 100 };
    const target = dropTarget(e, null);
    const tb = boxOf(target);
    const tn = node(target);
    const props = {};
    if (tool !== 'text' || !click) Object.assign(props, { width: R(r.w), height: R(r.h) });
    if (tool === 'text') { props.text = 'Text'; if (!click) props.autoResize = 'height'; }
    if (tool === 'frame') props.name = 'Frame';
    let index;
    if (tn?.flow) index = flowSlot(target, d.start, null).index;
    else { props.x = R(r.x - tb.x); props.y = R(r.y - tb.y); }
    setTool('select');
    drawOverlay();
    const res = await ops([{ op: 'create', type: tool, parent: target, index, props, ref: 'n' }], `Draw ${tool}`);
    if (res) { await select([res.refs.n]); if (tool === 'text') editText(res.refs.n, true); }
  }

  // ---- text editing in place ----------------------------------------------------------------
  function editText(id, fresh = false) {
    const el = elOf(id);
    if (!el || node(id)?.type !== 'text') return;
    E.editing = id;
    const before = el.textContent;
    el.contentEditable = 'plaintext-only';
    if (el.contentEditable !== 'plaintext-only') el.contentEditable = 'true';
    el.classList.add('ed-editing');
    el.style.cursor = 'text';
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const s = getSelection(); s.removeAllRanges(); s.addRange(range);
    overlay.innerHTML = '';
    const stop = async commit => {
      if (E.editing !== id) return;
      E.editing = null;
      el.removeEventListener('keydown', onKey); el.removeEventListener('blur', onBlur);
      el.contentEditable = 'false'; el.classList.remove('ed-editing');
      const text = el.innerText.replace(/\n$/, '');
      if (commit && text !== before && text.length) await ops([{ op: 'text', id, text }], 'Edit text');
      else if (commit && !text.length && fresh) await ops([{ op: 'delete', ids: [id] }], 'Delete empty text');
      else { el.textContent = before; drawOverlay(); }
    };
    const onKey = ev => { ev.stopPropagation(); if (ev.key === 'Escape') { ev.preventDefault(); stop(!fresh ? false : true); } else if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); stop(true); } };
    const onBlur = () => stop(true);
    el.addEventListener('keydown', onKey);
    el.addEventListener('blur', onBlur);
  }

  // ---- tools & keyboard ---------------------------------------------------------------------
  function setTool(t) {
    E.tool = t;
    document.querySelectorAll('#edToolSeg [data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    canvas.dataset.tool = t;
  }
  $('#edToolSeg').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool); });
  $('#edUndo').addEventListener('click', () => undo());
  $('#edRedo').addEventListener('click', () => redo());
  async function undo() { try { const r = await api('/undo', {}); if (r.label) status(`Undid ${r.label}`); await refresh(); } catch (e) { status(e.message, 'err'); } }
  async function redo() { try { const r = await api('/redo', {}); if (r.label) status(`Redid ${r.label}`); await refresh(); } catch (e) { status(e.message, 'err'); } }
  function renderUndo() {
    $('#edUndo').disabled = !E.S?.undo; $('#edUndo').title = E.S?.undo ? `Undo ${E.S.undo} (⌘Z)` : 'Nothing to undo';
    $('#edRedo').disabled = !E.S?.redo; $('#edRedo').title = E.S?.redo ? `Redo ${E.S.redo} (⇧⌘Z)` : 'Nothing to redo';
  }

  $('#edComponents').addEventListener('click', e => {
    const comps = E.S?.components ?? [];
    const target = E.sel.length === 1 && isContainer(E.sel[0]) ? E.sel[0] : E.screenId;
    menu(e.currentTarget, comps.length ? comps.map(c => ({ label: c.name, hint: `#${c.id}`, run: async () => { const r = await ops([{ op: 'instance', component: c.id, parent: target, ref: 'i' }], `Insert ${c.name}`); if (r) select([r.refs.i]); } }))
      : [{ label: 'No components in this design', disabled: true }]);
  });

  document.addEventListener('keydown', e => {
    if (!document.body.classList.contains('editing') || E.editing != null) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable="plaintext-only"], dialog')) return;
    const mod = e.metaKey || e.ctrlKey;
    const k = e.key.toLowerCase();
    if (mod && k === 'z') { e.preventDefault(); return e.shiftKey ? redo() : undo(); }
    if (mod && k === 'y') { e.preventDefault(); return redo(); }
    if (mod && (k === '=' || k === '+')) { e.preventDefault(); return setZoom(E.zoom * 1.25); }
    if (mod && k === '-') { e.preventDefault(); return setZoom(E.zoom / 1.25); }
    if (mod && k === '0') { e.preventDefault(); return setZoom(1); }
    if (e.shiftKey && k === '!') return setZoom(1, true);
    if (mod && k === 'd' && E.sel.length) { e.preventDefault(); return duplicateSel(); }
    if (mod && k === 'a') { e.preventDefault(); const p = E.sel.length ? parentOf(E.sel[0]) ?? E.screenId : E.screenId; return select(node(p).children.map(c => c.id)); }
    if (mod) return;
    if (k === 'v') return setTool('select');
    if (k === 'f' || k === 'a') return setTool('frame');
    if (k === 'r') return setTool('rectangle');
    if (k === 'o') return setTool('ellipse');
    if (k === 't') return setTool('text');
    if (k === 'escape') { if (E.tool !== 'select') return setTool('select'); const p = E.sel.length === 1 ? parentOf(E.sel[0]) : null; return select(p != null ? [p] : []); }
    if (k === 'enter' && E.sel.length === 1) { const n = node(E.sel[0]); if (n.type === 'text') return editText(n.id); if (n.children?.length) return select([n.children[0].id]); return; }
    if ((k === 'delete' || k === 'backspace') && E.sel.length) { e.preventDefault(); const ids = E.sel.filter(id => id !== E.screenId); if (ids.length) { E.sel = []; ops([{ op: 'delete', ids }], ids.length > 1 ? `Delete ${ids.length} layers` : 'Delete layer'); } return; }
    if (k.startsWith('arrow') && E.sel.length) { e.preventDefault(); return nudge(k, e.shiftKey ? 10 : 1); }
  });

  async function duplicateSel() {
    const list = E.sel.filter(id => id !== E.screenId).map((id, i) => ({ op: 'duplicate', id, ref: `d${i}` }));
    if (!list.length) return;
    const r = await ops(list, 'Duplicate');
    if (r) select(Object.values(r.refs));
  }

  function nudge(k, step) {
    const list = [];
    for (const id of E.sel) {
      if (id === E.screenId) continue;
      if (inFlow(id)) {
        const p = parentOf(id);
        const kids = node(p).children.map(c => c.id);
        const i = kids.indexOf(id);
        const back = k === 'arrowup' || k === 'arrowleft';
        const to = back ? i - 1 : i + 2;
        if (to >= 0 && to <= kids.length) list.push({ op: 'move', id, parent: p, index: to });
      } else {
        const n = node(id);
        const dx = k === 'arrowleft' ? -step : k === 'arrowright' ? step : 0, dy = k === 'arrowup' ? -step : k === 'arrowdown' ? step : 0;
        list.push({ op: 'set', id, props: { x: R(n.x + dx), y: R(n.y + dy) } });
      }
    }
    if (list.length) ops(list, 'Nudge');
  }

  /** A confirmation in a dialog: window.confirm is blocked in sandboxed hosts (OpenChamber). */
  function askConfirm(title, body, action) {
    return new Promise(resolve => {
      const d = document.createElement('dialog');
      d.className = 'ed-confirm';
      d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2><p class="muted">${esc(body)}</p><div class="row"><button class="btn danger" value="ok">${esc(action)}</button><button class="btn ghost" value="cancel">Cancel</button></div></form>`;
      document.body.append(d);
      d.addEventListener('close', () => { resolve(d.returnValue === 'ok'); d.remove(); });
      d.showModal();
      d.querySelector('button[value="cancel"]').focus();
    });
  }

  // ---- menu ---------------------------------------------------------------------------------
  function menu(anchor, items) {
    const m = $('#edMenu');
    m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" ${it.disabled ? 'disabled' : ''}>${esc(it.label)}${it.hint ? `<small>${esc(it.hint)}</small>` : ''}</button>`).join('');
    const r = anchor.getBoundingClientRect();
    m.hidden = false;
    m.style.left = `${Math.min(r.left, innerWidth - m.offsetWidth - 8)}px`;
    m.style.top = `${r.bottom + 6}px`;
    const close = () => { m.hidden = true; document.removeEventListener('pointerdown', outside, true); };
    const outside = ev => { if (!m.contains(ev.target) && ev.target !== anchor) close(); };
    setTimeout(() => document.addEventListener('pointerdown', outside, true));
    m.onclick = ev => { const b = ev.target.closest('[data-i]'); if (!b) return; close(); items[Number(b.dataset.i)].run?.(); };
    m.querySelector('button:not([disabled])')?.focus();
  }

  // ---- inspector ----------------------------------------------------------------------------
  const field = (label, html, cls = '') => `<label class="f ${cls}"><span>${label}</span>${html}</label>`;
  const num = (k, v, extra = '') => `<input type="number" step="any" data-k="${k}" value="${v ?? ''}" ${extra}>`;
  const sel = (k, opts, v) => `<select data-k="${k}">${opts.map(([val, lab]) => `<option value="${esc(val)}" ${String(val) === String(v ?? '') ? 'selected' : ''}>${esc(lab)}</option>`).join('')}</select>`;
  const colorField = (k, v, label = 'Fill') => `<div class="f color${v ? '' : ' none'}"><span>${label}</span><input type="color" data-kc="${k}" value="${esc((v || '#000000').slice(0, 7))}" aria-label="${label} colour"><input type="text" data-k="${k}" value="${esc(v ?? '')}" placeholder="none" spellcheck="false" aria-label="${label} hex">${v ? `<button type="button" class="x" data-clear="${k}" title="Remove ${label.toLowerCase()}" aria-label="Remove">×</button>` : ''}</div>`;

  async function renderInspector() {
    const box = $('#edInspector');
    box.dataset.sel = String(E.sel.length);
    const tabs = `<div class="ed-itabs" role="tablist"><button type="button" role="tab" data-itab="design" aria-selected="${E.insp === 'design'}">Design</button><button type="button" role="tab" data-itab="spec" aria-selected="${E.insp === 'spec'}">Spec</button></div>`;
    if (E.insp === 'spec') { box.innerHTML = `${tabs}<div class="ed-spec" id="edSpec"><p class="empty">Loading…</p></div>`; return renderSpecTab(); }
    if (!E.sel.length) { box.innerHTML = tabs + docPanel(); return; }
    if (E.sel.length > 1) {
      box.innerHTML = `${tabs}<section class="ed-sec"><h4>${E.sel.length} layers</h4>${colorField('fill', '')}${field('Opacity', num('opacity', '', 'min="0" max="1" step="0.05"'))}${field('Radius', num('radius', ''))}<div class="row"><button type="button" class="btn small" data-do="dup">Duplicate</button><button type="button" class="btn small danger" data-do="del">Delete</button></div></section>`;
      return;
    }
    const id = E.sel[0];
    let p;
    try { p = await api(`/node?id=${id}`); } catch { return; }
    if (E.sel[0] !== id || E.insp !== 'design') return;
    E.props = p;
    const isText = p.type === 'text', isCont = CONTAINERS.has(p.type) || p.type === 'instance';
    const isScreen = id === E.screenId;
    const flow = inFlow(id);
    const screens = (E.S?.screens ?? []).filter(s => s.type === 'frame');
    const linkVal = E.wantUrl === id ? 'url' : p.link?.back ? 'back' : p.link?.url ? 'url' : p.link?.to != null ? String(p.link.to) : '';
    const tokens = (E.S?.tokens ?? []).filter(t => t.type === 'color');
    const html = [tabs,
      `<section class="ed-sec head"><div class="ed-ttl">${icon(p.type)}<input class="ed-name" data-k="name" value="${esc(p.name)}" aria-label="Layer name"><code class="ed-id" title="Cite as \`#${id}\` in notes">#${id}</code></div><div class="muted small">${esc(p.type)}${p.component ? ` of #${p.component}` : ''}${isScreen ? ' · screen' : ''}</div></section>`,
      // Spec first: this is what the specs read.
      `<section class="ed-sec spec"><h4>Spec</h4>`,
      isScreen && E.S?.functions ? field('Function', sel('function', [['', '— none'], ...E.S.functions.list.map(f => [f.name, f.name]), ['+new', 'New function…']], E.S.screens.find(x => x.id === id)?.function ?? '')) : '',
      !isScreen ? field('On click', sel('link', [['', 'No link'], ['back', 'Back'], ['url', 'Open URL…'], ...screens.filter(s => s.id !== E.screenId).map(s => [String(s.id), `→ ${s.name}`])], linkVal)) : '',
      linkVal === 'url' ? field('URL', `<input type="url" data-k="url" value="${esc(p.link?.url ?? '')}" placeholder="https://">`) : '',
      `<div class="f api"><span>${isScreen ? 'Loads' : 'Calls'}</span>${sel('apiMethod', [['', '—'], ['GET', 'GET'], ['POST', 'POST'], ['PUT', 'PUT'], ['PATCH', 'PATCH'], ['DELETE', 'DELETE']], p.api?.method)}<input data-k="apiPath" value="${esc(p.api?.path ?? '')}" placeholder="/path" spellcheck="false" aria-label="API path"><input data-k="apiReturns" value="${esc(p.api?.returns ?? '')}" placeholder="→ Entity" spellcheck="false" aria-label="Returns"></div>`,
      !isScreen ? `<div class="f bind"><span>Shows</span><input data-k="bindEntity" value="${esc(p.bind?.entity ?? '')}" placeholder="entity" spellcheck="false" aria-label="Entity"><b>.</b><input data-k="bindField" value="${esc(p.bind?.field ?? '')}" placeholder="field" spellcheck="false" aria-label="Field">${sel('bindType', [['string', 'text'], ['number', 'number'], ['boolean', 'bool'], ['date', 'date'], ['url', 'url'], ['image', 'image'], ['email', 'email'], ['money', 'money']], p.bind?.type ?? 'string')}</div>` : '',
      field('Dev status', sel('devStatus', [['', 'None'], ['readyForDev', 'Ready for dev'], ['completed', 'Completed']], p.devStatus ?? '')),
      `<div class="ed-notes">${(p.notes ?? []).map(n => `<p class="note">${esc(n)}</p>`).join('')}<input data-k="note" placeholder="Add a note for the spec…" aria-label="Add note"></div>`,
      `<div class="row wrap"><button type="button" class="link small" data-do="spec">Open the screen spec ›</button><button type="button" class="link small" data-do="impact">What does this affect? ›</button></div></section>`,
      `<section class="ed-sec"><h4>Layout</h4><div class="grid4">${field('X', num('x', p.x, flow || isScreen ? 'disabled' : ''))}${field('Y', num('y', p.y, flow || isScreen ? 'disabled' : ''))}${field('W', num('width', p.width))}${field('H', num('height', p.height))}</div>`,
      flow || p.sizing ? `<div class="grid2">${field('Width', sel('sizingH', [['fixed', 'Fixed'], ['hug', 'Hug'], ['fill', 'Fill']], p.sizing?.h ?? 'fixed'))}${field('Height', sel('sizingV', [['fixed', 'Fixed'], ['hug', 'Hug'], ['fill', 'Fill']], p.sizing?.v ?? 'fixed'))}</div>` : '',
      flow ? `<label class="chk"><input type="checkbox" data-k="absolute" ${p.sizing?.absolute ? 'checked' : ''}> Absolute position</label>` : '',
      `</section>`,
      isCont && p.type !== 'instance' ? `<section class="ed-sec"><h4>Auto layout</h4><div class="ed-seg small" role="radiogroup" aria-label="Direction">${[['none', 'None'], ['vertical', '↓ Column'], ['horizontal', '→ Row']].map(([v, l]) => `<button type="button" data-layout="${v}" aria-pressed="${(p.layout?.mode ?? 'none') === v}">${l}</button>`).join('')}</div>${p.layout ? `<div class="grid2">${field('Gap', num('gap', p.layout.gap))}${field('Padding', `<input data-k="padding" value="${esc(uniform(p.layout.padding))}" placeholder="16 or 16 24" spellcheck="false">`)}</div><div class="grid2">${field('Align', sel('align', [['min', 'Start'], ['center', 'Center'], ['max', 'End'], ['spaceBetween', 'Space between']], p.layout.align))}${field('Cross', sel('crossAlign', [['min', 'Start'], ['center', 'Center'], ['max', 'End'], ['stretch', 'Stretch']], p.layout.crossAlign))}</div>` : ''}</section>` : '',
      isText ? `<section class="ed-sec"><h4>Text</h4><textarea data-k="text" rows="${Math.min(6, Math.max(2, String(p.text).split('\n').length))}" aria-label="Text">${esc(p.text)}</textarea><div class="grid2">${field('Font', `<input data-k="fontFamily" value="${esc(p.fontFamily)}" list="edFonts" spellcheck="false">`)}${field('Weight', sel('fontStyle', weights(p.fontStyle), p.fontStyle))}</div><div class="grid3">${field('Size', num('fontSize', p.fontSize, 'min="1"'))}${field('Line', `<input data-k="lineHeight" value="${esc(p.lineHeight ?? 'auto')}" spellcheck="false">`)}${field('Letter', `<input data-k="letterSpacing" value="${esc(p.letterSpacing ?? 0)}" spellcheck="false">`)}</div><div class="ed-seg small" role="radiogroup" aria-label="Alignment">${['left', 'center', 'right'].map(a => `<button type="button" data-align="${a}" aria-pressed="${(p.align ?? 'left') === a}">${a[0].toUpperCase() + a.slice(1)}</button>`).join('')}</div>${colorField('color', p.color, 'Color')}</section>`
        : `<section class="ed-sec"><h4>Fill</h4>${colorField('fill', p.fill)}${tokens.length ? field('Token', sel('token', [['', p.token ? p.token : '—'], ...tokens.map(t => [t.name, `${t.name}  ${t.value}`])], p.token ? '' : '')) : ''}</section>`,
      !isText ? `<section class="ed-sec"><h4>Appearance</h4><div class="grid2">${field('Radius', `<input data-k="radius" value="${esc(Array.isArray(p.radius) ? p.radius.join(' ') : p.radius ?? 0)}" spellcheck="false">`)}${field('Opacity', num('opacity', p.opacity ?? 1, 'min="0" max="1" step="0.05"'))}</div>${colorField('stroke', p.stroke, 'Stroke')}${p.stroke ? field('Stroke width', num('strokeWeight', p.strokeWeight, 'min="0"')) : ''}<label class="chk"><input type="checkbox" data-k="shadowOn" ${p.shadow ? 'checked' : ''}> Drop shadow</label>${isCont ? `<label class="chk"><input type="checkbox" data-k="clip" ${p.clip ? 'checked' : ''}> Clip content</label>` : ''}</section>` : `<section class="ed-sec"><h4>Appearance</h4>${field('Opacity', num('opacity', p.opacity ?? 1, 'min="0" max="1" step="0.05"'))}</section>`,
      !isScreen ? `<section class="ed-sec"><div class="row"><button type="button" class="btn small" data-do="dup">Duplicate</button><button type="button" class="btn small danger" data-do="del">Delete</button></div></section>` : `<section class="ed-sec"><div class="row"><button type="button" class="btn small" data-do="dup">Duplicate screen</button></div></section>`,
    ].join('');
    box.innerHTML = `${html}<datalist id="edFonts">${['Inter', 'Roboto', 'SF Pro Text', 'Helvetica Neue', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans 3', 'IBM Plex Sans', 'DM Sans', 'Manrope', 'Space Grotesk', 'Merriweather', 'Playfair Display', 'JetBrains Mono'].map(f => `<option value="${f}">`).join('')}</datalist>`;
  }
  const WEIGHTS = ['Thin', 'Extra Light', 'Light', 'Regular', 'Medium', 'Semi Bold', 'Bold', 'Extra Bold', 'Black'];
  const weights = cur => [...WEIGHTS, ...(cur && !WEIGHTS.includes(cur) ? [cur] : [])].map(w => [w, w]);
  const uniform = pad => (pad ?? [0, 0, 0, 0]).every(v => v === pad[0]) ? String(pad[0]) : pad[0] === pad[2] && pad[1] === pad[3] ? `${pad[0]} ${pad[1]}` : pad.join(' ');

  function docPanel() {
    const s = E.S;
    const tokens = s?.tokens ?? [];
    return `<section class="ed-sec head"><div class="ed-ttl">${icon('page')}<input class="ed-name" data-doc="name" value="${esc(s?.name ?? '')}" aria-label="Design name"></div><div class="muted small">${esc(s?.file ?? '')}</div></section>`
      + `<section class="ed-sec"><h4>Screens</h4><p class="muted small">${s?.screens.length ?? 0} on this page. Click a layer on the canvas to edit it; double-click to go deeper or edit text.</p><div class="ed-presets small">${PRESETS.map(([n, w, h]) => `<button type="button" class="ed-preset" data-w="${w}" data-h="${h}"><span class="ed-pv" style="aspect-ratio:${w}/${h}"></span>${n}<small>${w}×${h}</small></button>`).join('')}</div></section>`
      + `<section class="ed-sec"><h4>Tokens</h4>${tokens.length ? `<ul class="ed-tokens">${tokens.map(t => `<li>${t.type === 'color' ? `<i style="background:${esc(t.value)}"></i>` : '<i class="num"></i>'}<span>${esc(t.name)}</span><code>${esc(t.value)}</code></li>`).join('')}</ul>` : '<p class="muted small">No tokens yet.</p>'}<div class="f tokenadd"><input data-tok="name" placeholder="color/primary" spellcheck="false" aria-label="Token name"><input data-tok="value" placeholder="#2563eb" spellcheck="false" aria-label="Token value"><button type="button" class="btn small" data-do="token">Add</button></div></section>`
      + `<section class="ed-sec"><h4>Shortcuts</h4><dl class="ed-keys"><dt>V F R O T</dt><dd>Move, frame, rectangle, ellipse, text</dd><dt>⌘Z ⇧⌘Z</dt><dd>Undo, redo (shared with agents)</dd><dt>⌘D ⌫</dt><dd>Duplicate, delete</dd><dt>Arrows</dt><dd>Nudge 1px (⇧ 10px), reorder in auto layout</dd><dt>Esc Enter</dt><dd>Parent, first child / edit text</dd><dt>⌘± ⇧1</dt><dd>Zoom, fit</dd></dl></section>`;
  }

  async function renderSpecTab() {
    const el = $('#edSpec');
    const s = E.S?.screens?.find(x => x.id === E.screenId);
    if (!s?.key) { el.innerHTML = '<p class="empty">The spec for this screen appears after the next run.</p>'; return; }
    const file = `wcraft/specs/front/screens/${s.key}.md`;
    const r = await fetch(`/out/${file}`);
    if (!r.ok) { el.innerHTML = '<p class="empty">Writing the spec…</p>'; return; }
    const md = await r.text();
    el.innerHTML = `<div class="ed-spechead"><code>${esc(file)}</code><button type="button" class="link small" data-do="spec">Open in reader ›</button></div><article class="doc">${markdown(md)}</article>`;
    for (const id of E.sel) el.querySelectorAll(`.nodechip[data-node="${id}"]`).forEach((c, i) => { c.classList.add('hit'); if (i === 0) c.scrollIntoView({ block: 'center' }); });
  }

  // inspector events
  const insp = $('#edInspector');
  insp.addEventListener('click', async e => {
    const t = e.target;
    const itab = t.closest('[data-itab]');
    if (itab) { E.insp = itab.dataset.itab; return renderInspector(); }
    const chip = t.closest('.nodechip');
    if (chip) { const id = Number(chip.dataset.node); if (E.nodes.has(id)) { E.insp = 'design'; select([id]); } return; }
    const preset = t.closest('.ed-preset');
    if (preset) return addScreen(Number(preset.dataset.w), Number(preset.dataset.h));
    const lay = t.closest('[data-layout]');
    if (lay) return setProps({ layout: lay.dataset.layout === 'none' ? 'none' : { mode: lay.dataset.layout } }, 'Auto layout');
    const al = t.closest('[data-align]');
    if (al) return setProps({ align: al.dataset.align }, 'Text align');
    const clr = t.closest('[data-clear]');
    if (clr) return setProps({ [clr.dataset.clear === 'color' ? 'fill' : clr.dataset.clear]: null }, 'Remove paint');
    const act = t.closest('[data-do]')?.dataset.do;
    if (act === 'del') { const ids = E.sel.filter(id => id !== E.screenId); E.sel = []; return ops([{ op: 'delete', ids }], 'Delete'); }
    if (act === 'dup') { if (E.sel[0] === E.screenId) { const r = await ops([{ op: 'duplicate', id: E.screenId, ref: 'c' }], 'Duplicate screen'); if (r) { E.screenId = r.refs.c; E.sel = []; E.fit = true; refresh(); } return; } return duplicateSel(); }
    if (act === 'spec') { const s = E.S?.screens?.find(x => x.id === E.screenId); if (s?.key) openFile(`wcraft/specs/front/screens/${s.key}.md`); return; }
    if (act === 'impact') { const id = E.sel[0]; if (id != null) layerActions?.impact?.({ id, name: node(id)?.name ?? '' }); return; }
    if (act === 'token') {
      const name = insp.querySelector('[data-tok=name]').value.trim(), value = insp.querySelector('[data-tok=value]').value.trim();
      if (!name || !value) return status('Token needs a name and a value', 'err');
      return ops([{ op: 'token', name, value: /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : value }], `Token ${name}`);
    }
  });
  insp.addEventListener('input', e => { if (e.target.dataset.kc) { const txt = e.target.parentElement.querySelector(`[data-k="${e.target.dataset.kc}"]`); if (txt) txt.value = e.target.value; } });
  insp.addEventListener('change', e => onField(e.target));
  insp.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input:not([type=checkbox]), select')) { e.preventDefault(); e.target.blur(); } });

  function setProps(props, label) { const ids = E.sel.length ? E.sel : [E.screenId]; return ops(ids.map(id => ({ op: 'set', id, props })), label); }

  function onField(t) {
    if (t.dataset.doc === 'name') return t.value.trim() && ops([{ op: 'rename', name: t.value.trim() }], 'Rename design');
    const k = t.dataset.k ?? t.dataset.kc;
    if (!k || t.dataset.tok) return;
    const v = t.type === 'checkbox' ? t.checked : t.value;
    const id = E.sel[0];
    const p = E.props ?? {};
    const numv = x => (x === '' ? undefined : Number(x));
    switch (k) {
      case 'name': return v.trim() && setProps({ name: v.trim() }, 'Rename');
      case 'function': {
        // a screen belongs to one function: out of all, then into the chosen (or a new) one
        const list = (E.S?.functions?.list ?? []).map(f => ({ ...f, screens: (f.screens ?? []).filter(x => x !== id) }));
        let name = v;
        if (v === '+new') {
          const base = (E.S.screens.find(x => x.id === id)?.name ?? 'Function').replace(/\s*[—–-]\s*[^—–-]+$/, '').trim() || 'Function';
          name = base; for (let i = 2; list.some(f => f.name.toLowerCase() === name.toLowerCase()); i++) name = `${base} ${i}`;
          list.push({ name, screens: [] });
        }
        if (name) list.find(f => f.name === name).screens.push(id);
        return ops([{ op: 'functions', functions: list }], name ? `Screen in ${name}` : 'Screen out of its function');
      }
      case 'x': case 'y': case 'width': case 'height': case 'fontSize': case 'gap': case 'strokeWeight': case 'opacity':
        if (v === '' || Number.isNaN(Number(v))) return;
        if (k === 'gap') return setProps({ layout: { gap: Number(v) } }, 'Gap');
        return setProps({ [k]: Number(v) }, k);
      case 'fill': case 'color': case 'stroke':
        return setProps({ [k === 'color' ? 'fill' : k]: v.trim() ? (v.trim().startsWith('#') ? v.trim() : `#${v.trim()}`) : null }, k === 'stroke' ? 'Stroke' : 'Fill');
      case 'radius': { const parts = String(v).trim().split(/[\s,]+/).map(Number).filter(n => !Number.isNaN(n)); return setProps({ radius: parts.length === 4 ? parts : parts[0] ?? 0 }, 'Radius'); }
      case 'padding': { const parts = String(v).trim().split(/[\s,]+/).map(Number).filter(n => !Number.isNaN(n)); return setProps({ layout: { padding: parts.length === 1 ? parts[0] : parts } }, 'Padding'); }
      case 'align': case 'crossAlign': return setProps({ layout: { [k]: v } }, 'Alignment');
      case 'sizingH': return setProps({ sizing: { h: v } }, 'Sizing');
      case 'sizingV': return setProps({ sizing: { v } }, 'Sizing');
      case 'absolute': return setProps({ absolute: v }, 'Absolute');
      case 'clip': return setProps({ clip: v }, 'Clip');
      case 'shadowOn': return setProps({ shadow: v ? { x: 0, y: 4, blur: 16, color: '#0f172a26' } : null }, 'Shadow');
      case 'text': return ops([{ op: 'text', id, text: v }], 'Edit text');
      case 'fontFamily': case 'fontStyle': case 'lineHeight': case 'letterSpacing': return setProps({ [k]: k === 'lineHeight' || k === 'letterSpacing' ? (/^-?\d+(\.\d+)?$/.test(v) ? Number(v) : v) : v }, 'Text style');
      case 'devStatus': return setProps({ devStatus: v || null }, 'Dev status');
      case 'token': return v && ops(E.sel.map(i => ({ op: 'useToken', id: i, token: v })), `Apply ${v}`);
      case 'link':
        if (v === 'url') { E.wantUrl = id; return renderInspector().then(() => insp.querySelector('[data-k=url]')?.focus()); }
        E.wantUrl = null;
        return ops([{ op: 'link', id, ...(v === '' ? { clear: true } : v === 'back' ? { back: true } : { to: Number(v) }) }], 'Prototype link');
      case 'url': E.wantUrl = null; return v.trim() && ops([{ op: 'link', id, url: v.trim() }], 'Prototype link');
      case 'apiMethod': case 'apiPath': case 'apiReturns': {
        const m = insp.querySelector('[data-k=apiMethod]').value, path = insp.querySelector('[data-k=apiPath]').value.trim(), ret = insp.querySelector('[data-k=apiReturns]').value.trim().replace(/^→\s*/, '');
        if (!m && !path) return p.api ? ops([{ op: 'api', id, clear: true }], 'Remove API') : undefined;
        if (!m || !path.startsWith('/')) return status('API: pick a method and a path starting with /');
        return ops([{ op: 'api', id, method: m, path, returns: ret || undefined }], 'API call');
      }
      case 'bindEntity': case 'bindField': case 'bindType': {
        const en = insp.querySelector('[data-k=bindEntity]').value.trim(), fi = insp.querySelector('[data-k=bindField]').value.trim(), ty = insp.querySelector('[data-k=bindType]').value;
        if (!en && !fi) return p.bind ? ops([{ op: 'bind', id, clear: true }], 'Remove binding') : undefined;
        if (!en || !fi) return;
        return ops([{ op: 'bind', id, entity: en, field: fi, type: ty }], 'Bind data');
      }
      case 'note': return v.trim() && ops([{ op: 'note', id, text: v.trim() }], 'Add note');
      default: return undefined;
    }
  }

  // ---- live updates -------------------------------------------------------------------------
  let shown = false;
  let onAvailable = null;
  return {
    async init(cb) { onAvailable = cb; const S = await api('').catch(() => null); if (S?.reason !== 'read-only') onAvailable?.(!!S?.editable, S); },
    shown() { shown = true; refresh(); },
    /** Another screen (the layer asked for is not on this one). */
    async showScreen(id) { if (id == null || id === E.screenId) return; E.screenId = id; E.sel = []; E.fit = true; await refresh(); },
    /** Select a layer and show it (from the provenance block or the impact panel). */
    async show(id) {
      if (!E.nodes.has(id)) return false;
      for (let p = parentOf(id); p != null; p = parentOf(p)) E.open.add(p);
      await select([id]);
      elOf(id)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      return true;
    },
    /** A design change from anyone (agent, another tab, FigCraft saving the file). */
    onDesign(ev) { if (shown && document.body.classList.contains('editing') && ev.version !== E.version) refresh(); else if (ev.version !== E.version) E.stale = true; },
    /** Specs were regenerated: screen keys may have changed; the Spec tab refreshes. */
    onRegenerated() { if (shown && document.body.classList.contains('editing')) { api('').then(S => { E.S = S; renderScreens(); if (E.insp === 'spec') renderSpecTab(); else if (!$('#edInspector').contains(document.activeElement) || document.activeElement?.dataset.k === 'function') renderInspector(); }).catch(() => {}); } },
    available() { return !!E.S?.editable; },
    onSource() { E.screenId = null; E.sel = []; E.fit = true; E.version = -1; if (shown) refresh(); },
  };
}
