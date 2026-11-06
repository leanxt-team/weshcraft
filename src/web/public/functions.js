import { spreadEnds } from '/app/wires.js';
import { productNav } from '/app/aspects.js';
// The Functions view: how the product works at a glance. Who uses it → its functions (in journey
// order, with where each leads) → the data they read and write. Click a function to see what makes
// it; when the design is editable here, name the functions, give each a purpose and its screens.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ACTORS = { user: 'People (app)', agent: 'AI agents (MCP)', api: 'Integrations (API)' };
const ACTOR_ICON = {
  user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
  agent: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01"/></svg>',
  api: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 5l-3 14"/></svg>',
};

/** Functions in the form the design stores them (screens as node ids). */
export function declaredFrom(m) {
  const screenId = new Map(m.screens.map(s => [s.key, s.id]));
  const ops = new Map(m.domain.operations.map(o => [o.key, o]));
  const toolOp = new Map((m.surface?.mcp?.tools ?? []).map(t => [t.name, t.op]));
  return m.functions.items.map(x => {
    const operations = x.operations.map(k => ops.get(k)).filter(o => o && !screenId.has(o.screen)).map(o => `${o.method} ${o.path}`);
    const tools = x.tools.filter(t => !toolOp.get(t) || !x.operations.includes(toolOp.get(t)));
    return { name: x.name, summary: x.summary || '', screens: x.screens.map(k => screenId.get(k)).filter(v => v != null), ...(operations.length ? { operations } : {}), ...(tools.length ? { tools } : {}) };
  });
}

export function createFunctionsView({ root, getManifest, getTrace = () => null, isEditable, openFile, showScreen, log }) {
  let sel = null; // a function's key
  let pick = null; // or who / which data: { a: actor } | { e: entity name }
  // What a selection lights up: the function and what it touches, or everything linked to a Who or a Data block.
  function lit(m) {
    const F = m.functions.items;
    if (sel) { const f = F.find(x => x.key === sel); return f ? { fns: new Set([f.key]), actors: new Set(f.actors), ents: new Set(f.entities.map(e => e.name)) } : null; }
    if (!pick) return null;
    const fns = F.filter(f => (pick.a ? f.actors.includes(pick.a) : f.entities.some(e => e.name === pick.e)));
    return {
      fns: new Set(fns.map(f => f.key)),
      actors: pick.a ? new Set([pick.a]) : new Set(fns.flatMap(f => f.actors)),
      ents: pick.e ? new Set([pick.e]) : new Set(fns.flatMap(f => f.entities.map(e => e.name))),
    };
  }

  async function save(list, label) {
    const r = await fetch('/api/design/op', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: [{ op: 'functions', functions: list }], label }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { log?.({ level: 'error', at: Date.now(), message: j.error || 'Could not save the functions' }); return false; }
    log?.({ level: 'info', at: Date.now(), message: `${label}: specs regenerating…` });
    return true;
  }

  const coverage = f => {
    const tr = getTrace();
    if (!tr?.elements) return '';
    const ids = new Set([...f.screens, ...f.operations, ...f.tools.map(t => `tool:${t}`)]);
    const els = tr.elements.filter(e => ids.has(e.id));
    return els.length ? `code ${els.filter(e => e.code.length).length}/${els.length}` : '';
  };

  function render() {
    const m = getManifest();
    if (!m?.functions) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const F = m.functions;
    const editable = isEditable();
    const scr = new Map(m.screens.map(s => [s.key, s]));
    const actors = Object.keys(ACTORS).filter(a => F.items.some(f => f.actors.includes(a)));
    const entities = [...new Set(F.items.flatMap(f => f.entities.map(e => e.name)))].sort();
    const name = new Map(F.items.map(f => [f.key, f.name]));
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    const card = f => `
      <div class="fn-card" role="button" tabindex="0" data-f="${esc(f.key)}" data-wc="${esc(f.key)}" aria-pressed="${sel === f.key}">
        <div class="fn-top"><span class="fn-name">${esc(f.name)}</span>${editable ? `<button type="button" class="fn-edit" data-edit="${esc(f.key)}" title="Edit ${esc(f.name)}" aria-label="Edit ${esc(f.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg></button>` : ''}</div>
        <div class="fn-sum${f.summary ? '' : ' none'}">${esc(f.summary || (editable ? 'Add a purpose' : 'No purpose yet'))}</div>
        <div class="fn-meta">${[f.screens.length && plural(f.screens.length, 'screen'), f.operations.length && plural(f.operations.length, 'operation'), f.tools.length && plural(f.tools.length, 'tool'), coverage(f)].filter(Boolean).map(t => `<span>${t}</span>`).join('') || '<span>empty</span>'}</div>
        ${f.next.length ? `<div class="fn-next">${f.next.map(n => `<span data-goto="${esc(n.to)}" data-wc="${esc(n.to)}">→ ${esc(name.get(n.to))}</span>`).join('')}</div>` : ''}
        <div class="fn-chips">${f.entities.map(e => `<span class="fn-ent ${e.access === 'reads' ? 'r' : 'w'}" title="${esc(e.access)}">${esc(e.name)}</span>`).join('')}</div>
      </div>`;
    const u = F.unassigned;
    const loose = u.screens.length + u.operations.length + u.tools.length;
    root.innerHTML = `${productNav('functions')}
      ${!F.declared ? `<div class="fn-banner"><div><strong>Suggested functions.</strong> Grouped from the prototype (flows, sections, navigation, API tags). ${editable ? 'Keep them, then rename them and give each a purpose.' : 'Name them with the agent (weshcraft_edit)' + (m.screens.length ? '' : ' or in weshcraft.surface.json (functions)') + '.'}</div>${editable ? '<button type="button" class="btn primary small" id="fnKeep">Keep these functions</button>' : ''}</div>` : ''}
      <div class="fn-cols">
        <div class="fn-col fn-who"><h4>Who</h4>${actors.map(a => `<div class="fn-actor" role="button" tabindex="0" data-a="${a}" aria-pressed="${pick?.a === a}" title="What ${esc(ACTORS[a])} use">${ACTOR_ICON[a]}<span>${ACTORS[a]}</span></div>`).join('') || '<p class="empty">—</p>'}</div>
        <div class="fn-col fn-fns"><h4>Functions <span>${F.items.length}</span></h4>${F.items.map(card).join('')}${editable ? '<button type="button" class="fn-add" id="fnAdd">+ Function</button>' : ''}</div>
        <div class="fn-col fn-data"><h4>Data</h4>${entities.map(e => `<div class="fn-entity" role="button" tabindex="0" data-e="${esc(e)}" data-wc="entity:${esc(e)}" aria-pressed="${pick?.e === e}" title="Which functions read or write ${esc(e)}"><svg viewBox="0 0 24 24" aria-hidden="true"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/></svg><span>${esc(e)}</span></div>`).join('') || '<p class="empty">—</p>'}</div>
        <svg class="fn-wires" aria-hidden="true"><defs><marker id="fnArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g class="g"></g></svg>
      </div>
      ${loose ? `<div class="fn-loose"><strong>Not in a function yet:</strong> ${[...u.screens.map(k => `<button type="button" data-screen="${esc(k)}" data-wc="${esc(k)}">${esc(scr.get(k)?.name)}</button>`), ...u.operations.map(k => { const o = m.domain.operations.find(x => x.key === k); return `<button type="button" data-op="${esc(k)}" data-wc="${esc(k)}">${esc(`${o.method} ${o.path}`)}</button>`; }), ...u.tools.map(t => `<span>${esc(t)}</span>`)].join(' ')}</div>` : ''}
      <div class="fn-detail" id="fnDetail"></div>`;
    detail();
    requestAnimationFrame(draw);
  }

  function detail() {
    const m = getManifest();
    const box = root.querySelector('#fnDetail');
    const f = m?.functions.items.find(x => x.key === sel);
    if (!box) return;
    if (!f && pick && m) { box.innerHTML = pickDetail(m); return; }
    if (!f) { box.innerHTML = '<p class="muted">Click a function to see the screens, operations and data that make it, or a Who or Data block to see what it is linked to.</p>'; return; }
    const scr = new Map(m.screens.map(s => [s.key, s]));
    const ops = new Map(m.domain.operations.map(o => [o.key, o]));
    const name = new Map(m.functions.items.map(x => [x.key, x.name]));
    const row = (label, html) => (html ? `<div class="fn-drow"><span>${label}</span><div>${html}</div></div>` : '');
    box.innerHTML = `
      <div class="fn-dhead"><h3>${esc(f.name)}</h3><button type="button" class="btn ghost small" data-spec="${esc(f.key)}">Open in the spec</button></div>
      ${f.summary ? `<p>${esc(f.summary)}</p>` : ''}
      ${row('Who', f.actors.map(a => esc(ACTORS[a])).join(', '))}
      ${row('Screens', f.screens.map(k => `<button type="button" data-screen="${esc(k)}" data-wc="${esc(k)}">${esc(scr.get(k)?.name)}</button>`).join('<i>→</i>'))}
      ${row('Operations', f.operations.map(k => `<button type="button" data-op="${esc(k)}" data-wc="${esc(k)}"><b class="v-${esc(ops.get(k).method.toLowerCase())}">${esc(ops.get(k).method)}</b> ${esc(ops.get(k).path)}</button>`).join(''))}
      ${row('MCP tools', f.tools.map(t => `<code>${esc(t)}</code>`).join(' '))}
      ${row('Data', f.entities.map(e => `<button type="button" data-entity="${esc(e.name)}" data-wc="entity:${esc(e.name)}">${esc(e.name)} <small>${esc(e.access)}</small></button>`).join(''))}
      ${row('Leads to', f.next.map(n => `<button type="button" data-goto="${esc(n.to)}" data-wc="${esc(n.to)}">${esc(name.get(n.to))}</button>`).join(''))}
      ${codeRows(f)}`;
  }

  function pickDetail(m) {
    const F = m.functions.items;
    const row = (label, html) => (html ? `<div class="fn-drow"><span>${label}</span><div>${html}</div></div>` : '');
    const fnBtn = f => `<button type="button" data-goto="${esc(f.key)}" data-wc="${esc(f.key)}">${esc(f.name)}</button>`;
    if (pick.a) {
      const fns = F.filter(f => f.actors.includes(pick.a));
      const ents = [...new Set(fns.flatMap(f => f.entities.map(e => e.name)))];
      return `<div class="fn-dhead"><h3>${esc(ACTORS[pick.a])}</h3></div>
        ${row('Functions', fns.map(fnBtn).join(''))}
        ${row('Data', ents.map(e => `<button type="button" data-entity="${esc(e)}" data-wc="entity:${esc(e)}">${esc(e)}</button>`).join(''))}`;
    }
    const uses = F.map(f => [f, f.entities.find(e => e.name === pick.e)]).filter(([, e]) => e);
    const by = acc => uses.filter(([, e]) => (acc === 'reads' ? e.access === 'reads' : e.access !== 'reads')).map(([f]) => fnBtn(f)).join('');
    return `<div class="fn-dhead"><h3>${esc(pick.e)}</h3><button type="button" class="btn ghost small" data-entity="${esc(pick.e)}">Open in the domain spec</button></div>
      ${row('Written by', by('writes'))}
      ${row('Read by', by('reads'))}
      ${row('Who', [...new Set(uses.flatMap(([f]) => f.actors))].map(a => esc(ACTORS[a])).join(', '))}`;
  }

  // Code that implements the function's elements (tags `@weshcraft <ref>` in the code), from wcraft/specs/trace.json.
  function codeRows(f) {
    const tr = getTrace();
    if (!tr?.elements) return '';
    const ids = new Set([f.key, ...f.screens, ...f.operations, ...f.tools.map(t => `tool:${t}`), ...f.entities.map(e => `entity:${e.name}`)]);
    const els = tr.elements.filter(e => ids.has(e.id));
    const done = els.filter(e => e.code.length);
    const todo = els.filter(e => !e.code.length && e.kind !== 'function');
    const loc = t => `<code title="${esc(t.lang)}">${esc(t.file)}:${t.line}${t.symbol ? ` ${esc(t.symbol)}` : ''}</code>`;
    return `<div class="fn-drow"><span>Code</span><div class="fn-code">${done.map(e => `<div><b>${esc(e.name)}</b> ${e.code.map(loc).join(' ')}</div>`).join('') || '<span class="muted">No code tagged yet.</span>'}${todo.length ? `<div class="muted">To tag: ${todo.map(e => `<code>@weshcraft ${esc(e.tag)}</code>`).join(' ')}</div>` : ''}</div></div>`;
  }

  function draw() {
    const wrap = root.querySelector('.fn-cols');
    const m = getManifest();
    if (!wrap || !m?.functions || wrap.offsetParent === null) return;
    const g = wrap.querySelector('.fn-wires .g');
    const svg = wrap.querySelector('.fn-wires');
    // Stacked (narrow): the cards carry the same facts; no wires.
    if (getComputedStyle(wrap).display !== 'grid') { g.innerHTML = ''; return; }
    const base = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth);
    svg.setAttribute('height', wrap.scrollHeight);
    const box = el => { const r = el.getBoundingClientRect(); return { l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, y: (r.top + r.bottom) / 2 - base.top }; };
    const card = k => wrap.querySelector(`.fn-card[data-f="${CSS.escape(k)}"]`);
    const out = [];
    const L = lit(m);
    const cls = (on, c) => `${c}${L ? (on ? ' on' : ' off') : ''}`;
    const fnOn = k => !!L?.fns.has(k);
    // Gather the wires first, then give each one its own point on the sides it meets.
    const wires = [];
    const end = (side, b, toward, vertical = false) => ({ side, lo: vertical ? b.l : b.t, hi: vertical ? b.r : b.b, toward });
    for (const f of m.functions.items) {
      const c = card(f.key);
      if (!c) continue;
      const cb = box(c);
      for (const a of f.actors) {
        const el = wrap.querySelector(`.fn-actor[data-a="${a}"]`);
        if (!el) continue;
        const ab = box(el);
        wires.push({ kind: 'who', on: sel ? sel === f.key : fnOn(f.key) && (!pick.a || pick.a === a), a: end(`a:${a}:r`, ab, cb.y), b: end(`f:${f.key}:l`, cb, ab.y), x1: ab.r, x2: cb.l });
      }
      for (const e of f.entities) {
        const el = wrap.querySelector(`.fn-entity[data-e="${CSS.escape(e.name)}"]`);
        if (!el) continue;
        const eb = box(el);
        wires.push({ kind: 'data', access: e.access, on: sel ? sel === f.key : fnOn(f.key) && (!pick.e || pick.e === e.name), a: end(`f:${f.key}:r`, cb, eb.y), b: end(`e:${e.name}:l`, eb, cb.y), x1: cb.r, x2: eb.l });
      }
      for (const n of f.next) {
        const d = card(n.to);
        if (!d) continue;
        const db = box(d);
        // arcs leave a card's left side downward-ordered and arrive below the who wires
        wires.push({ kind: 'next', on: sel ? sel === f.key || sel === n.to : fnOn(f.key) && fnOn(n.to), a: { ...end(`f:${f.key}:l`, cb, db.y), order: 1 }, b: { ...end(`f:${n.to}:l`, db, cb.y), order: 1 }, x: cb.l, span: Math.abs(db.y - cb.y) });
      }
    }
    spreadEnds(wires.flatMap(w => [w.a, w.b]));
    // Nested arcs: the longer the jump, the wider the arc, so they do not run over each other.
    const spans = [...new Set(wires.filter(w => w.kind === 'next').map(w => Math.round(w.span)))].sort((x, y) => x - y);
    for (const w of wires) {
      if (w.kind === 'who') {
        const x2 = w.x2 - 18, mid = (x2 - w.x1) / 2;
        out.push(`<path class="${cls(w.on, 'w who')}" d="M${w.x1} ${w.a.at} C${w.x1 + mid} ${w.a.at} ${x2 - mid} ${w.b.at} ${x2} ${w.b.at} L${w.x2} ${w.b.at}"/>`);
      } else if (w.kind === 'data') {
        const mid = (w.x2 - w.x1) / 2;
        out.push(`<path class="${cls(w.on, `w data ${w.access === 'reads' ? 'reads' : 'writes'}`)}" d="M${w.x1} ${w.a.at} C${w.x1 + mid} ${w.a.at} ${w.x2 - mid} ${w.b.at} ${w.x2} ${w.b.at}" marker-end="url(#fnArrow)"/>`);
      } else {
        const x = w.x - 4, bend = 14 + spans.indexOf(Math.round(w.span)) * 9;
        out.push(`<path class="${cls(w.on, 'w next')}" d="M${x} ${w.a.at} C${x - bend} ${w.a.at} ${x - bend} ${w.b.at} ${x} ${w.b.at}" marker-end="url(#fnArrow)"/>`);
      }
    }
    g.innerHTML = out.join('');
    wrap.querySelectorAll('.fn-actor, .fn-entity').forEach(el => {
      const on = !L || (el.dataset.a ? L.actors.has(el.dataset.a) : L.ents.has(el.dataset.e));
      el.classList.toggle('dim', !on);
      el.classList.toggle('lit', !!L && on && !!pick && (el.dataset.a ? pick.a === el.dataset.a : pick.e === el.dataset.e));
    });
    const near = k => (sel ? k === sel || m.functions.items.find(x => x.key === sel)?.next.some(n => n.to === k) || m.functions.items.find(x => x.key === k)?.next.some(n => n.to === sel) : fnOn(k));
    wrap.querySelectorAll('.fn-card').forEach(el => el.classList.toggle('dim', !!L && !near(el.dataset.f)));
  }

  function pressed() {
    root.querySelectorAll('.fn-card').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.f === sel)));
    root.querySelectorAll('.fn-actor').forEach(el => el.setAttribute('aria-pressed', String(pick?.a === el.dataset.a)));
    root.querySelectorAll('.fn-entity').forEach(el => el.setAttribute('aria-pressed', String(pick?.e === el.dataset.e)));
  }
  /** Who or Data: light up what it is linked to (again: clear). */
  function choose(p) {
    const same = pick && (p.a ? pick.a === p.a : pick.e === p.e);
    sel = null; pick = same ? null : p;
    pressed(); detail(); draw();
  }
  function select(k, { spec = true } = {}) {
    sel = sel === k ? null : k;
    pick = null;
    pressed();
    detail();
    draw();
    if (sel && spec) openFile(`wcraft/specs/FUNCTIONS.md#${sel}`, { quiet: true });
  }

  // ---- editing ----
  function editDialog(key) {
    const m = getManifest();
    const list = declaredFrom(m);
    const cur = key ? m.functions.items.find(x => x.key === key) : null;
    const i = cur ? m.functions.items.indexOf(cur) : -1;
    const me = i >= 0 ? list[i] : { name: '', summary: '', screens: [] };
    const owner = new Map();
    list.forEach((f, j) => { if (j !== i) for (const id of f.screens) owner.set(id, f.name); });
    const looseOps = m.domain.operations.filter(o => !m.screens.some(s => s.key === o.screen));
    const d = document.createElement('dialog');
    d.className = 'fn-dialog';
    d.innerHTML = `<form method="dialog">
      <h2>${cur ? 'Edit function' : 'New function'}</h2>
      <label class="fn-field"><span>Name</span><input name="fnName" maxlength="80" required value="${esc(me.name)}" placeholder="Find a trail"></label>
      <label class="fn-field"><span>Purpose</span><textarea name="fnSummary" rows="2" maxlength="400" placeholder="What it lets people do, in one sentence">${esc(me.summary)}</textarea></label>
      ${m.screens.length ? `<fieldset class="fn-pick"><legend>Screens</legend>${m.screens.map(s => `<label><input type="checkbox" name="screen" value="${s.id}" ${me.screens.includes(s.id) ? 'checked' : ''}><span>${esc(s.name)}</span>${owner.has(s.id) ? `<small>in ${esc(owner.get(s.id))}</small>` : ''}</label>`).join('')}</fieldset>` : ''}
      ${looseOps.length ? `<fieldset class="fn-pick"><legend>Operations without a screen</legend>${looseOps.map(o => `<label><input type="checkbox" name="op" value="${esc(`${o.method} ${o.path}`)}" ${(me.operations ?? []).includes(`${o.method} ${o.path}`) ? 'checked' : ''}><span>${esc(`${o.method} ${o.path}`)}</span></label>`).join('')}</fieldset>` : ''}
      <p class="fn-err" hidden></p>
      <div class="row">${cur ? '<button type="button" class="btn danger" value="delete">Delete</button>' : ''}<span class="spacer"></span><button type="button" class="btn ghost" value="cancel">Cancel</button><button type="submit" class="btn primary" value="save">Save</button></div>
    </form>`;
    document.body.append(d);
    const form = d.querySelector('form');
    const err = d.querySelector('.fn-err');
    const finish = () => { d.close(); d.remove(); };
    d.querySelector('[value="cancel"]').addEventListener('click', finish);
    d.addEventListener('cancel', () => setTimeout(() => d.remove()));
    d.querySelector('[value="delete"]')?.addEventListener('click', async () => {
      const next = list.filter((_, j) => j !== i);
      if (await save(next, `Remove function ${me.name}`)) { if (sel === key) sel = null; finish(); }
    });
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const nameV = form.elements.fnName.value.trim();
      if (!nameV) { err.hidden = false; err.textContent = 'Give the function a name.'; return; }
      if (list.some((f, j) => j !== i && f.name.toLowerCase() === nameV.toLowerCase())) { err.hidden = false; err.textContent = `There is already a function called ${nameV}.`; return; }
      const screens = [...form.querySelectorAll('input[name="screen"]:checked')].map(x => Number(x.value));
      const opsV = [...form.querySelectorAll('input[name="op"]:checked')].map(x => x.value);
      const mine = { ...me, name: nameV, summary: form.elements.fnSummary.value.trim(), screens, ...(opsV.length ? { operations: opsV } : { operations: undefined }) };
      // a screen belongs to one function: taken from the others
      const taken = new Set(screens);
      const next = list.map((f, j) => (j === i ? mine : { ...f, screens: f.screens.filter(x => !taken.has(x)) }));
      if (i < 0) next.push(mine);
      if (await save(next, cur ? `Function ${nameV}` : `Add function ${nameV}`)) finish();
    });
    d.showModal();
    form.elements.fnName.focus();
  }

  root.addEventListener('click', async e => {
    const t = e.target;
    const edit = t.closest('[data-edit]');
    if (edit) { e.stopPropagation(); return editDialog(edit.dataset.edit); }
    if (t.closest('#fnAdd')) return editDialog(null);
    if (t.closest('#fnKeep')) { const m = getManifest(); await save(declaredFrom(m), 'Keep the suggested functions'); return; }
    const go = t.closest('[data-goto]');
    if (go) { e.stopPropagation(); sel = null; return select(go.dataset.goto); }
    const sc = t.closest('[data-screen]');
    if (sc) return showScreen(sc.dataset.screen);
    const op = t.closest('[data-op]');
    if (op) return openFile(`wcraft/specs/back/api.md#${op.dataset.op}`);
    const en = t.closest('[data-entity]');
    if (en) return openFile(`wcraft/specs/back/domain.md#entity-${en.dataset.entity.toLowerCase()}`);
    const sp = t.closest('[data-spec]');
    if (sp) return openFile(`wcraft/specs/FUNCTIONS.md#${sp.dataset.spec}`);
    const c = t.closest('.fn-card');
    if (c) return select(c.dataset.f);
    const ac = t.closest('.fn-actor');
    if (ac) return choose({ a: ac.dataset.a });
    const ent = t.closest('.fn-entity');
    if (ent) return choose({ e: ent.dataset.e });
  });
  root.addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const c = e.target.closest?.('.fn-card, .fn-actor, .fn-entity');
    if (!c) return;
    e.preventDefault();
    if (c.dataset.f) select(c.dataset.f); else if (c.dataset.a) choose({ a: c.dataset.a }); else choose({ e: c.dataset.e });
  });
  new ResizeObserver(() => draw()).observe(root);

  return {
    render,
    draw,
    /** After a regeneration: keep the selection if the function still exists. */
    refresh() { const m = getManifest(); if (sel && !m?.functions?.items.some(x => x.key === sel)) sel = null; if (pick && !m?.functions?.items.some(f => (pick.a ? f.actors.includes(pick.a) : f.entities.some(e => e.name === pick.e)))) pick = null; render(); },
  };
}
