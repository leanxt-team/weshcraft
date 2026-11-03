// WeshCraft simulation runtime: injected into the prototype page served at /sim/.
// Turns the clickable prototype into a usable app backed by the mock API:
//   - input layers become real inputs; their values are the request body
//   - layers that trigger an operation call it (pending, validation errors, server errors)
//   - each screen loads its data on entry; bound layers and list rows show the records
//   - empty lists and failures show the states the spec asks for
// Every call is reported to the WeshCraft window (network log) with its operation and layer.
(() => {
  const meta = JSON.parse(document.getElementById('weshcraft-sim')?.textContent || '{"ops":[],"displays":[]}');
  const API = '/sim/api';
  const byNode = id => document.querySelector(`[data-node="${Number(id)}"]`);
  const post = msg => parent !== window && parent.postMessage({ weshcraft: 'sim', ...msg }, '*');
  const css = document.createElement('style');
  css.textContent = `
    .sim-input{all:unset;box-sizing:border-box;width:100%;min-width:0;font:inherit;color:inherit;letter-spacing:inherit;line-height:inherit;caret-color:currentColor}
    .sim-input::placeholder{color:inherit;opacity:1}
    .sim-err-field{box-shadow:inset 0 0 0 2px #ff3b30!important}
    .sim-err-msg{position:absolute;left:4px;top:calc(100% + 3px);font:500 11.5px -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;color:#ff3b30;white-space:nowrap;z-index:5}
    .sim-pending{opacity:.55;pointer-events:none;transition:opacity .2s}
    .sim-loading{position:relative;color:transparent!important}
    .sim-loading::after{content:'';position:absolute;inset:2px 0;border-radius:6px;background:linear-gradient(90deg,rgba(127,127,127,.14),rgba(127,127,127,.28),rgba(127,127,127,.14));background-size:200% 100%;animation:simshimmer 1.1s infinite}
    @keyframes simshimmer{to{background-position:-200% 0}}
    .sim-empty{display:flex;align-items:center;justify-content:center;min-height:72px;border-radius:14px;border:1.5px dashed rgba(127,127,127,.35);color:rgba(100,100,110,.9);font:500 13px -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;flex-shrink:0;align-self:stretch}
    .sim-gap{display:inline-block;padding:1px 8px;border-radius:99px;border:1.5px dashed #ff9f0a;color:#b25d00!important;background:rgba(255,159,10,.1);font-size:.8em!important;font-weight:600}
    .sim-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:100;display:flex;gap:10px;align-items:center;max-width:calc(100vw - 32px);padding:10px 12px 10px 16px;border-radius:16px;font:500 13px -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;color:#fff;background:rgba(28,28,30,.86);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 12px 30px rgba(0,0,0,.25)}
    .sim-toast button{all:unset;cursor:pointer;padding:5px 11px;border-radius:99px;background:rgba(255,255,255,.18);font-weight:600}
    .sim-toast code{font:600 12px ui-monospace,Menlo,monospace;opacity:.85}
  `;
  document.head.appendChild(css);

  // ---- inputs ------------------------------------------------------------------------------
  const TYPES = { email: 'email', password: 'password', search: 'search' };
  function mountInputs(root = document) {
    root.querySelectorAll('[data-input]:not(.sim-has-input)').forEach(el => {
      const label = el.querySelector('[data-node]') && [...el.querySelectorAll('[data-node]')].find(n => n.children.length === 0 && n.textContent.trim());
      const input = document.createElement('input');
      input.className = 'sim-input';
      input.type = TYPES[el.dataset.input] ?? 'text';
      input.placeholder = label?.textContent.trim() ?? '';
      input.name = (el.dataset.inputName || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      input.autocomplete = input.type === 'password' ? 'new-password' : input.type === 'email' ? 'email' : 'off';
      input.setAttribute('aria-label', el.dataset.inputName || input.placeholder);
      if (label) {
        // The input takes the placeholder layer's exact typography and place, then replaces it.
        input.style.cssText = `${label.getAttribute('style') || ''};width:100%;flex:1 1 auto;white-space:nowrap`;
        label.parentElement.insertBefore(input, label);
        label.style.display = 'none';
      }
      else el.appendChild(input);
      el.classList.add('sim-has-input');
      input.addEventListener('input', () => clearError(el));
      input.addEventListener('click', e => e.stopPropagation());
    });
  }
  function clearError(el) { el.classList.remove('sim-err-field'); el.querySelector('.sim-err-msg')?.remove(); }
  function showError(el, msg) {
    clearError(el);
    el.classList.add('sim-err-field');
    const m = document.createElement('div');
    m.className = 'sim-err-msg';
    m.textContent = msg;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.appendChild(m);
  }

  // ---- calls -------------------------------------------------------------------------------
  let toastTimer = null;
  function toast(html, retry) {
    document.querySelector('.sim-toast')?.remove();
    const t = document.createElement('div');
    t.className = 'sim-toast';
    t.setAttribute('role', 'alert');
    t.innerHTML = `<span>${html}</span>`;
    if (retry) { const b = document.createElement('button'); b.textContent = 'Retry'; b.onclick = () => { t.remove(); retry(); }; t.appendChild(b); }
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), retry ? 8000 : 3500);
  }
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  async function call(op, body) {
    const t0 = performance.now();
    let status = 0, data = null;
    try {
      const res = await fetch(API + op.path, { method: op.method, headers: { 'Content-Type': 'application/json' }, body: op.method === 'GET' ? undefined : JSON.stringify(body ?? {}) });
      status = res.status;
      const text = await res.text();
      data = text ? JSON.parse(text) : null;
    } catch (e) { status = 0; data = { code: 'network', message: e.message }; }
    post({ call: { op: op.key, method: op.method, path: op.path, status, ms: Math.round(performance.now() - t0), trigger: op.trigger, request: body ?? null, response: data } });
    return { status, data };
  }

  // ---- data on screens ---------------------------------------------------------------------
  const listTemplates = new Map(); // op key -> {parent, template, rows}
  function fill(el, field, record) {
    const name = field.split('.')[1];
    if (record && name in record) { el.textContent = String(record[name]); el.title = `${field} (simulated)`; }
  }
  function setLoading(nodes, on) { nodes.forEach(n => n?.classList.toggle('sim-loading', on)); }

  async function loadScreen(key) {
    const screen = document.getElementById(key);
    if (!screen) return;
    mountInputs(screen);
    const ops = meta.ops.filter(o => o.screen === key && o.method === 'GET');
    for (const op of ops) {
      const shown = meta.displays.filter(d => d.via === op.key).map(d => ({ ...d, el: byNode(d.node) })).filter(d => d.el);
      const rowEls = op.rows.map(byNode).filter(Boolean);
      setLoading(shown.map(d => d.el), true);
      const { status, data } = await call(op);
      setLoading(shown.map(d => d.el), false);
      if (status < 200 || status >= 300) {
        const msg = status === 503 ? 'You’re offline' : status === 404 ? 'Nothing here yet' : 'Couldn’t load this screen';
        if (op.kind === 'list') renderList(op, rowEls, []);
        toast(`${msg} · <code>${esc(op.method)} ${esc(op.path)} → ${status || 'network'}</code>`, () => loadScreen(key));
        continue;
      }
      if (op.kind === 'list') {
        const items = data?.items ?? [];
        renderList(op, rowEls, items);
        // Layers outside the rows that show the same entity (a featured card) take the first item.
        const inRows = el => rowEls.some(r => r.contains(el));
        for (const d of shown) if (!inRows(d.el)) fill(d.el, d.field, items[0]);
      } else {
        for (const d of shown) fill(d.el, d.field, data);
      }
    }
  }

  function renderList(op, rowEls, items) {
    let t = listTemplates.get(op.key);
    if (!t && rowEls.length) {
      t = { parent: rowEls[0].parentElement, template: rowEls[0].cloneNode(true), originals: rowEls };
      listTemplates.set(op.key, t);
    }
    if (!t) return;
    t.parent.querySelectorAll(`[data-sim-row="${op.key}"], .sim-empty[data-sim-for="${op.key}"]`).forEach(n => n.remove());
    t.originals.forEach(r => { r.style.display = 'none'; });
    if (!items.length) {
      const e = document.createElement('div');
      e.className = 'sim-empty';
      e.dataset.simFor = op.key;
      e.textContent = `No ${op.entity ? `${op.entity.toLowerCase()}s` : 'items'} yet`;
      t.parent.insertBefore(e, t.originals[0]);
      return;
    }
    const fields = meta.displays.filter(d => d.via === op.key);
    items.forEach((rec, i) => {
      const row = (t.originals[i] ? t.originals[i].cloneNode(true) : t.template.cloneNode(true));
      row.style.display = '';
      row.dataset.simRow = op.key;
      for (const d of fields) row.querySelectorAll(`[data-node="${d.node}"]`).forEach(el => fill(el, d.field, rec));
      // Fields of other rows map by layer position: fill those too.
      const counterpart = t.originals[0];
      if (counterpart) {
        const srcNodes = [...counterpart.querySelectorAll('[data-field]')];
        const dstNodes = [...row.querySelectorAll('[data-field]')];
        srcNodes.forEach((src, k) => { const f = src.dataset.field.split(' ')[0]; if (dstNodes[k]) fill(dstNodes[k], f, rec); });
      }
      t.parent.insertBefore(row, t.originals[0]);
    });
  }

  // ---- triggers ----------------------------------------------------------------------------
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-op]');
    if (!el) return;
    const op = meta.ops.find(o => o.trigger === Number(el.dataset.node) && o.method !== 'GET');
    if (!op) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const screen = el.closest('.sc-screen');
    const body = {};
    for (const f of op.fields) {
      const host = byNode(f.node);
      body[f.name] = host?.querySelector('input')?.value ?? '';
      if (host) clearError(host);
    }
    el.classList.add('sim-pending');
    const { status, data } = await call(op, body);
    el.classList.remove('sim-pending');
    if (status === 400 && data?.fields) {
      for (const f of op.fields) if (data.fields[f.name]) showError(byNode(f.node), data.fields[f.name]);
      return;
    }
    if (status < 200 || status >= 300) {
      toast(`${status === 503 ? 'You’re offline' : 'Couldn’t complete this'} · <code>${esc(op.method)} ${esc(op.path)} → ${status || 'network'}</code>`, () => el.click());
      return;
    }
    toast(`✓ ${esc(op.name)}`);
    // Success: continue the prototype's own connection, if any.
    if (el.dataset.go === 'back') window.__weshBack?.();
    else if (el.dataset.go) window.__weshShow?.(el.dataset.go);
    else if (screen) loadScreen(screen.id);
  }, true);

  // Bound layers no operation loads: show the gap instead of the raw {{template}}.
  function markGaps(key) {
    const screen = document.getElementById(key);
    if (!screen) return;
    screen.querySelectorAll('[data-field]').forEach(el => {
      const d = meta.displays.find(x => x.node === Number(el.dataset.node));
      if (d && !d.via && /\{\{.*\}\}/.test(el.textContent)) {
        el.innerHTML = '';
        const tag = document.createElement('span');
        tag.className = 'sim-gap';
        tag.textContent = `⚠ ${d.field}: nothing loads it`;
        tag.title = 'Gap in the specs: annotate the screen with the operation that loads this data (e.g. GET /x → Entity)';
        el.appendChild(tag);
      }
    });
  }
  document.addEventListener('weshcraft:screen', e => { loadScreen(e.detail.key); markGaps(e.detail.key); });
  window.addEventListener('message', e => { if (e.data?.weshcraft === 'simReload') { const s = document.querySelector('.sc-screen:not([hidden])'); if (s) loadScreen(s.id); } });
  const first = document.querySelector('.sc-screen:not([hidden])');
  if (first) { loadScreen(first.id); markGaps(first.id); }
  post({ ready: true, hash: meta.hash });
})();
