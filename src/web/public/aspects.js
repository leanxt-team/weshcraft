// Logic, Data, API & MCP and Architecture views: the product's other aspects, next to Functions.
// Each one is drawn natively from the manifest (no library), clicks through to its spec, and —
// when the design is editable here — edits what it holds (logic, architecture) in one undo step.
import { matchTech, techIcon, techFacts, searchTech, CATEGORIES, BY_ID, KIND_GENERIC } from '/app/techcatalog.js';
import { spreadEnds, separateLabels, labelWidth } from '/app/wires.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const opLabel = o => `${o.method} ${o.path}`;
const plural = (n, w, p = `${w}s`) => `${n} ${n === 1 ? w : p}`;
const KIND_COLORS = { validation: 'blue', permission: 'red', calculation: 'violet', policy: 'amber', event: 'green' };
const ARCH_COLUMNS = [['client', 'Clients'], ['frontend', 'Front ends & interfaces'], ['service', 'Services'], ['store', 'Data & external']];
const ARCH_COLUMN_OF = { client: 0, frontend: 1, interface: 1, service: 2, queue: 2, store: 3, external: 3 };
const ICON = {
  client: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/></svg>',
  frontend: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M8 21h8"/></svg>',
  interface: '<svg viewBox="0 0 24 24"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg>',
  service: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><path d="M8 7h.01M8 17h.01"/></svg>',
  queue: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
  store: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/></svg>',
  external: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16"/></svg>',
  entity: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6v12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M4 20l4-1 11-11-3-3L5 16z"/></svg>',
};

// ---- shared ---------------------------------------------------------------------------------
async function saveOp(op, value, label, log) {
  const r = await fetch('/api/design/op', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ops: [{ op, [op]: value }], label }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { log?.({ level: 'error', at: Date.now(), message: j.error || `Could not save (${label})` }); return j.error || 'Could not save'; }
  log?.({ level: 'info', at: Date.now(), message: `${label}: specs regenerating…` });
  return null;
}

/** A form in a dialog: fields → values; resolves null on cancel. `extra` buttons resolve with their value. */
function formDialog({ title, body, submit = 'Save', danger = null, onSubmit, onOpen }) {
  return new Promise(resolve => {
    const d = document.createElement('dialog');
    d.className = 'fn-dialog av-dialog';
    d.innerHTML = `<form method="dialog"><h2>${esc(title)}</h2>${body}<p class="fn-err" hidden></p><div class="row">${danger ? `<button type="button" class="btn danger" value="danger">${esc(danger)}</button>` : ''}<span class="spacer"></span><button type="button" class="btn ghost" value="cancel">Cancel</button><button type="submit" class="btn primary" value="save">${esc(submit)}</button></div></form>`;
    document.body.append(d);
    const form = d.querySelector('form');
    const err = d.querySelector('.fn-err');
    const finish = v => { d.close(); d.remove(); resolve(v); };
    d.querySelector('[value="cancel"]').addEventListener('click', () => finish(null));
    d.addEventListener('cancel', () => setTimeout(() => { d.remove(); resolve(null); }));
    d.querySelector('[value="danger"]')?.addEventListener('click', async () => { const e = await onSubmit(form, 'danger'); if (e) { err.hidden = false; err.textContent = e; } else finish('danger'); });
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      const e = await onSubmit(form, 'save');
      if (e) { err.hidden = false; err.textContent = e; } else finish('save');
    });
    form.addEventListener('click', ev => {
      const add = ev.target.closest('[data-add-row]');
      if (add) { const tpl = form.querySelector(`template[data-row="${add.dataset.addRow}"]`); add.before(tpl.content.cloneNode(true)); }
      const rm = ev.target.closest('[data-rm-row]');
      if (rm) rm.closest('.av-row').remove();
    });
    onOpen?.(form);
    d.showModal();
    form.querySelector('input, textarea, select')?.focus();
  });
}

// ---- technologies: icons, what each is, alternatives (techcatalog.js) ----------------------------
const techLead = c => { const ts = matchTech(c.tech); return ts.find(e => e.cat !== 'generic') ?? ts[0] ?? BY_ID.get(KIND_GENERIC[c.kind] ?? 'g-server'); };
const techChip = (e, size = 13) => `<span class="av-chip tc-chip" title="${esc(e.desc)}">${techIcon(e, { size, title: false })}${esc(e.name)}</span>`;
/** What each technology of a component is, and what could replace it. */
function techDetail(tech) {
  const ts = matchTech(tech);
  if (!ts.length) return '';
  return ts.map(e => {
    const f = techFacts(e);
    return `<div class="tc-info">${techIcon(e, { size: 22 })}<div><div><b>${esc(f.name)}</b> <small>${esc(f.category)}</small></div><p>${esc(f.description)}</p>${f.alternatives.length ? `<div class="tc-alts"><span>Alternatives</span>${e.alts.map(a => (BY_ID.get(a) ? techChip(BY_ID.get(a), 12) : `<span class="av-chip tc-chip">${esc(a)}</span>`)).join('')}</div>` : ''}</div></div>`;
  }).join('');
}
/** The technology picker under a "tech" field: what is recognised, a search, every icon by category. */
function techPicker(value) {
  return `<div class="tc-pick" data-tc>
    <div class="tc-chosen" data-tc-chosen>${techChosen(value)}</div>
    <div class="tc-bar"><input type="search" class="tc-q" data-tc-q placeholder="Search technologies (Postgres, Lambda, Redis…)" aria-label="Search technologies"><select data-tc-cat aria-label="Category"><option value="">All categories</option>${CATEGORIES.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select></div>
    <div class="tc-grid" data-tc-grid role="listbox" aria-label="Technologies"></div>
  </div>`;
}
function techChosen(value) {
  const ts = matchTech(value);
  return ts.length ? ts.map(e => `<span class="av-chip tc-chip on" data-tc-rm="${esc(e.id)}" title="${esc(e.desc)}">${techIcon(e, { size: 13, title: false })}${esc(e.name)}<b aria-label="Remove">×</b></span>`).join('') : '<span class="muted small">Pick below, or type: Node 22 · Fastify · PostgreSQL 16</span>';
}
function wireTechPicker(form, input) {
  const box = form.querySelector('[data-tc]');
  if (!box) return;
  const grid = box.querySelector('[data-tc-grid]'), q = box.querySelector('[data-tc-q]'), cat = box.querySelector('[data-tc-cat]');
  const has = id => matchTech(input.value).some(e => e.id === id);
  const fill = () => {
    const list = searchTech(q.value).filter(e => !cat.value || e.cat === cat.value);
    const groups = q.value ? [['', list]] : CATEGORIES.map(([k, l]) => [l, list.filter(e => e.cat === k)]).filter(([, l]) => l.length);
    grid.innerHTML = groups.map(([label, l]) => `${label ? `<div class="tc-h">${esc(label)}</div>` : ''}${l.map(e => `<button type="button" class="tc-item" role="option" data-tc-id="${esc(e.id)}" aria-selected="${has(e.id)}" title="${esc(`${e.name}: ${e.desc}`)}">${techIcon(e, { size: 22, title: false })}<span>${esc(e.name)}</span></button>`).join('')}`).join('') || '<p class="muted small">Nothing matches. Type it in the field above: it is kept as written.</p>';
  };
  const chosen = () => { box.querySelector('[data-tc-chosen]').innerHTML = techChosen(input.value); grid.querySelectorAll('.tc-item').forEach(b => b.setAttribute('aria-selected', String(has(b.dataset.tcId)))); };
  const parts = () => input.value.split(/\s*·\s*/).map(s => s.trim()).filter(Boolean);
  const add = e => { input.value = [...parts(), e.name].join(' · '); chosen(); };
  const remove = e => { input.value = parts().filter(p => !matchTech(p).some(x => x.id === e.id)).join(' · '); chosen(); };
  grid.addEventListener('click', ev => { const b = ev.target.closest('[data-tc-id]'); if (!b) return; const e = BY_ID.get(b.dataset.tcId); if (has(e.id)) remove(e); else add(e); });
  box.querySelector('[data-tc-chosen]').addEventListener('click', ev => { const r = ev.target.closest('[data-tc-rm]'); if (r) remove(BY_ID.get(r.dataset.tcRm)); });
  q.addEventListener('input', fill); cat.addEventListener('change', fill); input.addEventListener('input', chosen);
  q.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); grid.querySelector('.tc-item')?.click(); } });
  fill();
}

/** Options for "applies to / implements": functions, screens, operations, entities, tools. */
function refOptions(m) {
  return [
    ...(m.functions?.items ?? []).map(f => ['Function', f.name, f.name]),
    ...m.screens.map(s => ['Screen', s.name, s.name]),
    ...m.domain.operations.map(o => ['Operation', opLabel(o), opLabel(o)]),
    ...m.domain.entities.map(e => ['Entity', e.name, e.name]),
    ...(m.surface?.mcp?.tools ?? []).map(t => ['MCP tool', t.name, t.name]),
  ];
}
function refLabel(m, id) {
  const o = m.domain.operations.find(x => x.key === id);
  if (o) return opLabel(o);
  if (/^(entity|tool|field):/.test(id)) return id.replace(/^(entity|tool|field):/, '');
  return m.functions?.items.find(f => f.key === id)?.name ?? m.screens.find(s => s.key === id)?.name ?? m.components.find(c => c.key === id)?.name ?? id;
}
function refPicker(m, name, selected) {
  const sel = new Set(selected.map(s => s.toLowerCase()));
  const groups = new Map();
  for (const [g, label, value] of refOptions(m)) groups.set(g, [...(groups.get(g) ?? []), [label, value]]);
  return `<fieldset class="fn-pick av-pick"><legend>${name === 'applies' ? 'Applies to' : 'Implements'}</legend>${[...groups].map(([g, list]) => `<div class="av-pick-g"><small>${esc(g)}</small>${list.map(([l, v]) => `<label><input type="checkbox" name="${name}" value="${esc(v)}" ${sel.has(v.toLowerCase()) ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</div>`).join('')}</fieldset>`;
}
/** Where an element's spec is. */
function specOf(m, id) {
  const o = m.domain.operations.find(x => x.key === id);
  if (o) return `specs/back/api.md#${o.key}`;
  if (id.startsWith('entity:')) return `specs/DATA.md#data-${id.slice(7).toLowerCase()}`;
  if (id.startsWith('field:')) return `specs/DATA.md#data-${id.slice(6).split('.')[0].toLowerCase()}`;
  if (id.startsWith('tool:')) { const t = m.surface?.mcp?.tools.find(x => x.name === id.slice(5)); return t ? `specs/front/mcp/${t.key}.md` : null; }
  if (id.startsWith('fn-')) return `specs/FUNCTIONS.md#${id}`;
  if (id.startsWith('scr-')) return `specs/front/screens/${id}.md`;
  if (id.startsWith('cmp-')) return `specs/front/components/${id}.md`;
  return null;
}
const chip = (m, id, cls = '') => `<button type="button" class="av-chip ${cls}" data-open="${esc(specOf(m, id) ?? '')}">${esc(refLabel(m, id))}</button>`;
const banner = (text, editable, keepId) => `<div class="fn-banner av-banner"><div>${text}</div>${editable && keepId ? `<button type="button" class="btn primary small" id="${keepId}">Keep as declared</button>` : ''}</div>`;
const head = (title, sub, actions = '') => `<div class="av-head"><div><h2>${esc(title)}</h2><p>${sub}</p></div><div class="av-actions">${actions}</div></div>`;
const PRODUCT_TABS = [['functions', 'Functions'], ['logic', 'Logic'], ['data', 'Data'], ['api', 'API & MCP'], ['architecture', 'Architecture']];
/** On a phone (one view at a time), the product views share one bottom-bar button: this strip switches between them. */
export const productNav = active => `<nav class="pnav" aria-label="Product">${PRODUCT_TABS.map(([k, l]) => `<button type="button" data-pnav="${k}" aria-current="${k === active}">${l}</button>`).join('')}</nav>`;

function bindCommon(root, { openFile, log }) {
  root.addEventListener('click', e => {
    const o = e.target.closest('[data-open]');
    if (o && o.dataset.open) { e.stopPropagation(); openFile(o.dataset.open); }
  });
}

// ---- Logic ----------------------------------------------------------------------------------
export function logicToDeclared(m, { includeInferred = false } = {}) {
  const l = m.logic;
  const keep = x => includeInferred || x.source === 'declared';
  return {
    rules: l.rules.filter(keep).map(r => ({ name: r.name, kind: r.kind, ...(r.text ? { text: r.text } : {}), ...(r.applies.length ? { applies: r.applies.map(id => refLabel(m, id)) } : {}) })),
    states: l.machines.filter(keep).map(x => ({ entity: x.entity, field: x.field, states: x.states, initial: x.initial, transitions: x.transitions.map(t => ({ from: t.from, to: t.to, ...(t.via ? { via: t.via } : {}) })) })),
  };
}

export function createLogicView({ root, getManifest, isEditable, openFile, log }) {
  bindCommon(root, { openFile, log });
  const save = (value, label) => saveOp('logic', value, label, log);
  const current = () => logicToDeclared(getManifest(), { includeInferred: false });

  function machineSvg(x) {
    // states in a row; transitions as arcs above (forward) or below (backward); "any" from a dashed origin
    return `<div class="lg-machine" data-machine="${esc(x.key)}"><div class="lg-states">
      <span class="lg-start" title="start" data-s="__start"></span>
      ${x.states.map(s => `<span class="lg-state${s === x.initial ? ' initial' : ''}" data-s="${esc(s)}">${esc(s)}</span>`).join('')}
    </div><svg class="lg-arcs" aria-hidden="true"><defs><marker id="lgA-${esc(x.key)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g></g></svg></div>`;
  }
  function drawArcs() {
    const m = getManifest();
    for (const box of root.querySelectorAll('.lg-machine')) {
      const x = m.logic.machines.find(y => y.key === box.dataset.machine);
      const g = box.querySelector('.lg-arcs g');
      if (!x || !g || box.offsetParent === null) continue;
      const base = box.getBoundingClientRect();
      const pos = s => { const el = box.querySelector(`[data-s="${CSS.escape(s)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { x: (r.left + r.right) / 2 - base.left, t: r.top - base.top, b: r.bottom - base.top, r: r.right - base.left, l: r.left - base.left }; };
      const out = [];
      const first = pos('__start'), init = pos(x.initial);
      if (first && init) out.push(`<path class="arc start" d="M${first.r} ${(first.t + first.b) / 2} L${init.l} ${(init.t + init.b) / 2}" marker-end="url(#lgA-${x.key})"/>`);
      const labels = [];
      const arcs = [];
      x.transitions.forEach(t => {
        const froms = t.from === '*' ? x.states.filter(s => s !== t.to) : [t.from];
        for (const f of froms) {
          const a = pos(f), b = pos(t.to);
          if (!a || !b) continue;
          const fwd = b.x > a.x;
          // forward above the states, backward below; each arc its own points on the pills
          const side = fwd ? 't' : 'b';
          arcs.push({ t, f, first: froms.length === 1 || f === froms[0], fwd, a, b, A: { side: `${f}:${side}`, lo: a.l, hi: a.r, toward: b.x }, B: { side: `${t.to}:${side}`, lo: b.l, hi: b.r, toward: a.x } });
        }
      });
      spreadEnds(arcs.flatMap(k => [k.A, k.B]), { gap: 8, pad: 6 });
      // longer jumps arc higher, so arcs nest instead of crossing
      const lens = [...new Set(arcs.map(k => Math.round(Math.abs(k.b.x - k.a.x))))].sort((p, q) => p - q);
      for (const k of arcs) {
        const y = k.fwd ? k.a.t : k.a.b;
        const h = (24 + lens.indexOf(Math.round(Math.abs(k.b.x - k.a.x))) * 16) * (k.fwd ? -1 : 1);
        out.push(`<path class="arc${k.t.from === '*' ? ' any' : ''}${k.t.op ? '' : ' manual'}" d="M${k.A.at} ${y} C${k.A.at} ${y + h} ${k.B.at} ${y + h} ${k.B.at} ${y}" marker-end="url(#lgA-${x.key})"/>`);
        const text = k.t.via || (k.t.from === '*' ? 'from any' : '');
        if (k.first && text) { const short = text.length > 28 ? `${text.slice(0, 27)}…` : text; labels.push({ x: (k.A.at + k.B.at) / 2, y: y + h * 0.75 + (k.fwd ? -7 : 9), w: labelWidth(short, 10), h: 12, text: short }); }
      }
      separateLabels(labels, { margin: 2 });
      g.innerHTML = out.join('') + labels.map(l => `<text x="${l.x}" y="${l.y + 3}" text-anchor="middle">${esc(l.text)}</text>`).join('');
      const svg = box.querySelector('.lg-arcs');
      svg.setAttribute('width', box.scrollWidth); svg.setAttribute('height', box.scrollHeight);
    }
  }

  function render() {
    const m = getManifest();
    if (!m?.logic) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const l = m.logic;
    const editable = isEditable();
    const inferred = l.rules.some(r => r.source === 'inferred') || l.machines.some(x => x.source === 'inferred');
    root.innerHTML = `${productNav('logic')}
      ${head('Logic', `What the screens and the API cannot show: ${plural(l.rules.length, 'rule')}, ${plural(l.machines.length, 'lifecycle')}.`, `${editable ? '<button type="button" class="btn small" id="lgAddRule">+ Rule</button><button type="button" class="btn small" id="lgAddMachine">+ Lifecycle</button>' : ''}<button type="button" class="btn ghost small" data-open="specs/LOGIC.md">Spec</button>`)}
      ${inferred ? banner(`<strong>${l.declared ? 'Partly inferred.' : 'Inferred.'}</strong> From required request fields, status values and the operations that change them. Keep them as declared, then complete what the design cannot say.`, editable, 'lgKeep') : ''}
      <section class="av-sec"><h3>Lifecycles</h3>${l.machines.length ? l.machines.map(x => `
        <article class="av-card lg-card">
          <header><span class="av-title">${esc(x.entity)}<span class="muted">.${esc(x.field)}</span></span>${x.source === 'inferred' ? '<span class="av-badge">inferred</span>' : ''}<span class="spacer"></span>${editable ? `<button type="button" class="fn-edit av-edit" data-edit-machine="${esc(x.key)}" title="Edit lifecycle" aria-label="Edit lifecycle">${ICON.edit}</button>` : ''}<button type="button" class="av-link" data-open="specs/LOGIC.md#${esc(x.key)}">spec</button></header>
          ${machineSvg(x)}
          <div class="lg-trans">${x.create ? `<span class="av-chip ok">created by ${esc(x.create.via)}</span>` : ''}${x.transitions.map(t => `<span class="av-chip">${t.from === '*' ? 'any' : esc(t.from)} → ${esc(t.to)}${t.via ? ` <small>${esc(t.via)}</small>` : ''}</span>`).join('')}${(x.unresolved ?? []).map(u => `<button type="button" class="av-chip warn" data-edit-machine="${esc(x.key)}" title="This operation changes ${esc(x.entity)}: say to which state">${esc(u.via)} → ?</button>`).join('')}</div>
        </article>`).join('') : `<p class="av-empty">No lifecycle yet. ${editable ? 'Add one for data that changes state (an order: draft → paid → shipped).' : ''}</p>`}</section>
      <section class="av-sec"><h3>Rules</h3>${l.rules.length ? `<div class="lg-rules">${['validation', 'permission', 'calculation', 'policy', 'event'].map(k => l.rules.filter(r => r.kind === k)).filter(x => x.length).map(list => list.map(r => `
        <article class="av-card lg-rule c-${KIND_COLORS[r.kind]}">
          <header><span class="lg-kind">${esc(r.kind)}</span>${r.source === 'inferred' ? '<span class="av-badge">inferred</span>' : ''}<span class="spacer"></span>${editable ? `<button type="button" class="fn-edit av-edit" data-edit-rule="${esc(r.key)}" title="Edit rule" aria-label="Edit rule">${ICON.edit}</button>` : ''}</header>
          <div class="av-title" data-open="specs/LOGIC.md#${esc(r.key)}">${esc(r.name)}</div>
          ${r.text ? `<p>${esc(r.text)}</p>` : ''}
          ${r.applies.length ? `<div class="av-chips">${r.applies.map(id => chip(m, id)).join('')}</div>` : ''}
        </article>`).join('')).join('')}</div>` : `<p class="av-empty">No rule yet.</p>`}</section>`;
    requestAnimationFrame(drawArcs);
  }

  async function editRule(key) {
    const m = getManifest();
    const r = key ? m.logic.rules.find(x => x.key === key) : null;
    const decl = current();
    await formDialog({
      title: r ? 'Edit rule' : 'New rule', danger: r?.source === 'declared' ? 'Delete' : null,
      body: `<label class="fn-field"><span>Rule</span><input name="name" maxlength="160" required value="${esc(r?.name ?? '')}" placeholder="An invoice can only be sent once"></label>
        <label class="fn-field"><span>Kind</span><select name="kind">${['validation', 'permission', 'calculation', 'policy', 'event'].map(k => `<option ${k === (r?.kind ?? 'policy') ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
        <label class="fn-field"><span>Details</span><textarea name="text" rows="3" maxlength="2000" placeholder="Conditions, formula, who may do it, what happens">${esc(r?.text ?? '')}</textarea></label>
        ${refPicker(m, 'applies', (r?.applies ?? []).map(id => refLabel(m, id)))}`,
      onSubmit: async (f, act) => {
        let rules = decl.rules.filter(x => !r || x.name !== r.name);
        if (act === 'save') {
          const name = f.elements.name.value.trim();
          if (!name) return 'Give the rule a name.';
          if (rules.some(x => x.name.toLowerCase() === name.toLowerCase())) return `There is already a rule called ${name}.`;
          rules = [...rules, { name, kind: f.elements.kind.value, text: f.elements.text.value.trim(), applies: [...f.querySelectorAll('input[name="applies"]:checked')].map(x => x.value) }];
        }
        return save({ ...decl, rules }, act === 'danger' ? 'Delete rule' : `Rule ${f.elements.name.value.trim()}`);
      },
    });
  }

  async function editMachine(key) {
    const m = getManifest();
    const x = key ? m.logic.machines.find(y => y.key === key) : null;
    const decl = current();
    const ops = m.domain.operations.map(opLabel);
    const trRow = (t = {}) => `<div class="av-row"><input name="from" value="${esc(t.from ?? '')}" placeholder="from (or *)" aria-label="From"><span>→</span><input name="to" value="${esc(t.to ?? '')}" placeholder="to" aria-label="To"><input name="via" list="lgOps" value="${esc(t.via ?? '')}" placeholder="through (operation or words)" aria-label="Through"><button type="button" class="av-x" data-rm-row aria-label="Remove">×</button></div>`;
    const trs = x ? [...x.transitions, ...(x.unresolved ?? []).map(u => ({ from: '*', to: '', via: u.via }))] : [];
    await formDialog({
      title: x ? `Lifecycle: ${x.entity}.${x.field}` : 'New lifecycle', danger: x?.source === 'declared' ? 'Delete' : null,
      body: `<div class="row2"><label class="fn-field"><span>Entity</span><input name="entity" required list="lgEnts" value="${esc(x?.entity ?? '')}" placeholder="Invoice"></label><label class="fn-field"><span>Field</span><input name="field" value="${esc(x?.field ?? 'status')}"></label></div>
        <label class="fn-field"><span>States, in order (the first is where it starts)</span><input name="states" required value="${esc((x?.states ?? []).join(', '))}" placeholder="draft, open, paid, void"></label>
        <fieldset class="fn-pick av-rows"><legend>Transitions</legend>${trs.map(trRow).join('')}<button type="button" class="btn ghost small" data-add-row="tr">+ Transition</button><template data-row="tr">${trRow()}</template></fieldset>
        <datalist id="lgOps">${ops.map(o => `<option value="${esc(o)}">`).join('')}</datalist><datalist id="lgEnts">${m.domain.entities.map(e => `<option value="${esc(e.name)}">`).join('')}</datalist>`,
      onSubmit: async (f, act) => {
        let states = decl.states.filter(y => !x || !(y.entity === x.entity && y.field === x.field));
        if (act === 'save') {
          const list = f.elements.states.value.split(',').map(s => s.trim()).filter(Boolean);
          if (!f.elements.entity.value.trim()) return 'Which entity?';
          if (list.length < 2) return 'At least two states.';
          const transitions = [...f.querySelectorAll('.av-row')].map(r => ({ from: r.querySelector('[name=from]').value.trim(), to: r.querySelector('[name=to]').value.trim(), via: r.querySelector('[name=via]').value.trim() })).filter(t => t.from || t.to);
          const bad = transitions.find(t => (t.from !== '*' && !list.includes(t.from)) || !list.includes(t.to));
          if (bad) return `Transition ${bad.from || '?'} → ${bad.to || '?'}: use the states above (or * for any).`;
          states = [...states, { entity: f.elements.entity.value.trim(), field: f.elements.field.value.trim() || 'status', states: list, initial: list[0], transitions }];
        }
        return save({ ...decl, states }, act === 'danger' ? 'Delete lifecycle' : `Lifecycle ${f.elements.entity.value.trim()}`);
      },
    });
  }

  root.addEventListener('click', async e => {
    if (e.target.closest('#lgAddRule')) return editRule(null);
    if (e.target.closest('#lgAddMachine')) return editMachine(null);
    if (e.target.closest('#lgKeep')) return save(logicToDeclared(getManifest(), { includeInferred: true }), 'Keep the inferred logic');
    const r = e.target.closest('[data-edit-rule]');
    if (r) return editRule(r.dataset.editRule);
    const x = e.target.closest('[data-edit-machine]');
    if (x) return editMachine(x.dataset.editMachine);
  });
  new ResizeObserver(() => drawArcs()).observe(root);
  return { render, draw: drawArcs, refresh: render };
}

// ---- Data -----------------------------------------------------------------------------------
export function createDataView({ root, getManifest, openFile, log }) {
  bindCommon(root, { openFile, log });
  let sel = null;
  function draw() {
    const m = getManifest();
    const wrap = root.querySelector('.dt-grid');
    if (!m?.data || !wrap || wrap.offsetParent === null) return;
    const svg = wrap.querySelector('.dt-wires');
    const base = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth); svg.setAttribute('height', wrap.scrollHeight);
    const out = [];
    const rels = [];
    for (const e of m.data.entities) for (const r of e.relations) {
      const from = wrap.querySelector(`.dt-card[data-e="${CSS.escape(e.name)}"] [data-f="${CSS.escape(r.field)}"]`);
      const to = wrap.querySelector(`.dt-card[data-e="${CSS.escape(r.to)}"] header`);
      if (!from || !to) continue;
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      const right = b.left > a.right;
      const ax = (right ? a.right : a.left) - base.left, ay = (a.top + a.bottom) / 2 - base.top;
      const bx = (right ? b.left : b.right) - base.left;
      // several relations into one card: each arrives at its own point of the header
      rels.push({ on: !sel || sel === e.name || sel === r.to, ax, ay, bx, end: { side: `${r.to}:${right ? 'l' : 'r'}`, lo: b.top - base.top, hi: b.bottom - base.top, toward: ay } });
    }
    spreadEnds(rels.map(x => x.end), { gap: 6, pad: 4 });
    for (const { on, ax, ay, bx, end } of rels) {
      const by = end.at;
      const dx = Math.max(30, Math.abs(bx - ax) / 2) * (bx > ax ? 1 : -1);
      out.push(`<path class="w${on ? '' : ' off'}" d="M${ax} ${ay} C${ax + dx} ${ay} ${bx - dx} ${by} ${bx} ${by}" marker-end="url(#dtA)"/><circle class="w-dot${on ? '' : ' off'}" cx="${ax}" cy="${ay}" r="3"/>`);
    }
    svg.querySelector('g').innerHTML = out.join('');
  }
  function detail() {
    const m = getManifest();
    const box = root.querySelector('#dtDetail');
    const e = m.data.entities.find(x => x.name === sel);
    if (!box) return;
    if (!e) { box.innerHTML = '<p class="muted">Click an entity to see who writes, reads and shows it.</p>'; return; }
    const fn = new Map((m.functions?.items ?? []).map(f => [f.key, f]));
    const row = (label, html) => (html ? `<div class="fn-drow"><span>${label}</span><div>${html}</div></div>` : '');
    const lc = m.logic?.machines.find(x => x.entity === e.name);
    box.innerHTML = `<div class="fn-dhead"><h3>${esc(e.name)}</h3><button type="button" class="btn ghost small" data-open="specs/DATA.md#data-${esc(e.name.toLowerCase())}">Open in the spec</button></div>
      ${row('Written by', e.writtenBy.map(k => chip(m, k)).join(''))}${row('Read by', e.readBy.map(k => chip(m, k)).join(''))}
      ${row('Shown on', e.shownOn.map(k => chip(m, k)).join(''))}${row('Operations', e.operations.map(k => chip(m, k)).join(''))}
      ${row('Relations', e.relations.map(r => `<span class="av-chip">${esc(r.field)} → ${esc(r.to)}${r.many ? ' (many)' : ''}</span>`).join(''))}
      ${lc ? row('Lifecycle', `<button type="button" class="av-chip" data-open="specs/LOGIC.md#${esc(lc.key)}">${lc.states.map(esc).join(' → ')}</button>`) : ''}`;
  }
  function render() {
    const m = getManifest();
    if (!m?.data) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const d = m.data;
    if (sel && !d.entities.some(e => e.name === sel)) sel = null;
    const relCount = d.entities.reduce((n, e) => n + e.relations.length, 0);
    root.innerHTML = `${productNav('data')}
      ${head('Data', `${plural(d.entities.length, 'entity', 'entities')}, ${plural(relCount, 'relation')}. Fields come from the design (bound layers) and the API schemas.`, '<button type="button" class="btn ghost small" data-open="specs/DATA.md">Spec</button>')}
      ${d.entities.length ? `<div class="dt-grid">${d.entities.map(e => {
        const lc = m.logic?.machines.find(x => x.entity === e.name);
        const rel = new Map(e.relations.map(r => [r.field, r]));
        return `<article class="av-card dt-card${sel === e.name ? ' sel' : ''}${sel && sel !== e.name && !e.relations.some(r => r.to === sel) && !d.entities.find(x => x.name === sel)?.relations.some(r => r.to === e.name) ? ' dim' : ''}" data-e="${esc(e.name)}" tabindex="0" role="button">
          <header>${ICON.entity}<span class="av-title">${esc(e.name)}</span><span class="spacer"></span><span class="dt-rw" title="written by · read by">${e.writtenBy.length ? `<b>W</b>${e.writtenBy.length}` : ''}${e.readBy.length ? `<b>R</b>${e.readBy.length}` : ''}</span></header>
          <ul>${e.fields.map(f => `<li data-f="${esc(f.name)}"${rel.has(f.name) ? ' class="rel"' : ''}><span class="dt-n">${esc(f.name)}${f.required ? '' : '<i>?</i>'}</span><span class="dt-t">${rel.has(f.name) ? `→ ${esc(rel.get(f.name).to)}` : esc(f.enum ? f.enum.join(' | ') : f.type)}</span></li>`).join('') || '<li class="muted">no field yet</li>'}</ul>
          ${lc ? `<footer>${lc.states.map(esc).join(' → ')}</footer>` : ''}
        </article>`;
      }).join('')}<svg class="dt-wires" aria-hidden="true"><defs><marker id="dtA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g></g></svg></div>
      <div class="fn-detail" id="dtDetail"></div>` : '<p class="av-empty">No data yet: bind a layer to data in the design (Shows: entity.field), or add an API schema.</p>'}`;
    detail();
    requestAnimationFrame(draw);
  }
  root.addEventListener('click', e => {
    const c = e.target.closest('.dt-card');
    if (c && !e.target.closest('[data-open]')) { sel = sel === c.dataset.e ? null : c.dataset.e; render(); }
  });
  root.addEventListener('keydown', e => { const c = e.target.closest?.('.dt-card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
  new ResizeObserver(() => draw()).observe(root);
  return { render, draw, refresh: render };
}

// ---- API & MCP ------------------------------------------------------------------------------
export function createApiView({ root, getManifest, openFile, log }) {
  bindCommon(root, { openFile, log });
  let filter = '';
  function render() {
    const m = getManifest();
    if (!m?.domain) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const ops = m.domain.operations;
    const tools = m.surface?.mcp?.tools ?? [];
    const eps = m.surface?.api?.endpoints ?? [];
    const f = filter.toLowerCase();
    const match = o => !f || `${opLabel(o)} ${o.name}`.toLowerCase().includes(f);
    const fns = m.functions?.items ?? [];
    const groups = [...fns.map(fn => [fn, ops.filter(o => fn.operations.includes(o.key) && match(o))]), [null, ops.filter(o => !fns.some(fn => fn.operations.includes(o.key)) && match(o))]].filter(([, l]) => l.length);
    const entityOf = o => o.entity ?? ops.find(x => x.entity && o.path.startsWith(x.path))?.entity ?? null;
    const row = o => {
      const from = [...m.screens.filter(s => s.key === o.screen).map(s => chip(m, s.key, 'scr')), ...tools.filter(t => t.op === o.key).map(t => chip(m, `tool:${t.name}`, 'tool')), ...(o.endpoint ? ['<span class="av-chip pub">public</span>'] : [])];
      const ent = entityOf(o);
      return `<div class="api-row" data-open="specs/back/api.md#${esc(o.key)}" role="button" tabindex="0"><span class="verb v-${esc(o.method.toLowerCase())}">${esc(o.method)}</span><code class="api-path">${esc(o.path).replace(/\{([^}]+)\}/g, '<i>{$1}</i>')}</code><span class="api-name">${esc(o.name)}</span><span class="api-from">${from.join('')}</span><span class="api-ret">${ent ? `<button type="button" class="av-chip ent" data-open="specs/DATA.md#data-${esc(ent.toLowerCase())}">${esc(ent)}${o.kind === 'list' ? '[]' : ''}</button>` : ''}</span>${o.confidence !== 'explicit' ? '<span class="av-badge">inferred</span>' : ''}</div>`;
    };
    root.innerHTML = `${productNav('api')}
      ${head('API & MCP', `${plural(ops.length, 'operation')}${eps.length ? ` · ${plural(eps.length, 'public endpoint')}` : ''}${tools.length ? ` · ${plural(tools.length, 'MCP tool')}` : ''}${(m.surface?.api?.auth ?? []).length ? ` · auth: ${m.surface.api.auth.map(a => esc(a.scheme ?? a.type)).join(', ')}` : ''}`, `<input type="search" class="av-search" id="apiFilter" placeholder="Filter" value="${esc(filter)}" aria-label="Filter operations"><button type="button" class="btn ghost small" data-open="specs/API.md">Spec</button><button type="button" class="btn ghost small" data-open="specs/back/api.md">Details</button>`)}
      ${groups.map(([fn, list]) => `<section class="av-sec api-g"><h3>${fn ? `<button type="button" class="av-h" data-open="specs/FUNCTIONS.md#${esc(fn.key)}">${esc(fn.name)}</button>${fn.summary ? `<small>${esc(fn.summary)}</small>` : ''}` : 'Not in a function'}</h3><div class="api-list">${list.map(row).join('')}</div></section>`).join('') || `<p class="av-empty">${ops.length ? 'Nothing matches.' : 'No operation yet: annotate a button or a screen with POST /path in the design, or add an OpenAPI / MCP surface.'}</p>`}
      ${tools.length ? `<section class="av-sec"><h3>MCP tools</h3><div class="api-tools">${tools.filter(t => !f || t.name.toLowerCase().includes(f)).map(t => `<article class="av-card api-tool" data-open="specs/front/mcp/${esc(t.key)}.md" role="button" tabindex="0"><header><span class="av-title">${esc(t.name)}</span><span class="spacer"></span>${t.hints?.readOnlyHint ? '<span class="av-badge ok">read-only</span>' : ''}${t.hints?.destructiveHint ? '<span class="av-badge bad">destructive</span>' : ''}</header><p>${esc((t.description || '').slice(0, 140))}</p><div class="av-chips">${t.op ? chip(m, t.op, 'op') : '<span class="av-chip warn">no operation</span>'}${t.input.length ? `<span class="av-chip">${plural(t.input.length, 'argument')}</span>` : ''}</div></article>`).join('')}</div></section>` : ''}`;
    const inp = root.querySelector('#apiFilter');
    inp?.addEventListener('input', () => { filter = inp.value; const pos = inp.selectionStart; render(); const again = root.querySelector('#apiFilter'); again.focus(); again.setSelectionRange(pos, pos); });
  }
  root.addEventListener('keydown', e => { const r = e.target.closest?.('[role="button"][data-open]'); if (r && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openFile(r.dataset.open); } });
  return { render, draw: () => {}, refresh: render };
}

// ---- Architecture ---------------------------------------------------------------------------
export function architectureToDeclared(m) {
  const a = m.architecture;
  const name = new Map(a.components.map(c => [c.key, c.name]));
  return {
    components: a.components.map(c => ({ name: c.name, kind: c.kind, ...(c.tech ? { tech: c.tech } : {}), ...(c.description ? { description: c.description } : {}), implements: c.implements.map(id => refLabel(m, id)), ...(c.code.length ? { code: c.code } : {}) })),
    links: a.links.map(l => ({ from: name.get(l.from), to: name.get(l.to), ...(l.label ? { label: l.label } : {}) })),
  };
}

export function createArchitectureView({ root, getManifest, getTrace = () => null, isEditable, openFile, log }) {
  bindCommon(root, { openFile, log });
  const save = (value, label) => saveOp('architecture', value, label, log);
  let sel = null;
  // Code folders behind a component: where the code tagged for what it implements lives (specs/trace.json).
  const codeDirs = c => {
    const tr = getTrace();
    const ids = new Set(c.implements);
    const dirs = new Set(c.code);
    for (const e of tr?.elements ?? []) if (ids.has(e.id)) for (const t of e.code) dirs.add(t.file.split('/').slice(0, -1).slice(0, 2).join('/') || '.');
    return [...dirs];
  };
  function summary(m, c) {
    const n = k => c.implements.filter(id => k(id)).length;
    return [n(id => id.startsWith('fn-')) && plural(n(id => id.startsWith('fn-')), 'function'), n(id => id.startsWith('scr-')) && plural(n(id => id.startsWith('scr-')), 'screen'), n(id => m.domain.operations.some(o => o.key === id)) && plural(n(id => m.domain.operations.some(o => o.key === id)), 'operation'), n(id => id.startsWith('entity:')) && plural(n(id => id.startsWith('entity:')), 'entity', 'entities'), n(id => id.startsWith('tool:')) && plural(n(id => id.startsWith('tool:')), 'tool')].filter(Boolean).join(' · ');
  }
  function draw() {
    const m = getManifest();
    const wrap = root.querySelector('.ar-cols');
    if (!m?.architecture || !wrap || wrap.offsetParent === null) return;
    const svg = wrap.querySelector('.ar-wires');
    const stacked = getComputedStyle(wrap).display !== 'grid';
    const base = wrap.getBoundingClientRect();
    svg.setAttribute('width', wrap.scrollWidth); svg.setAttribute('height', wrap.scrollHeight);
    const lsvg = wrap.querySelector('.ar-labels');
    lsvg?.setAttribute('width', wrap.scrollWidth); lsvg?.setAttribute('height', wrap.scrollHeight);
    const colsEl = [...wrap.querySelectorAll('.ar-col')];
    const colBottom = i => Math.max(0, ...[...colsEl[i].querySelectorAll('.ar-card')].map(c => c.getBoundingClientRect().bottom - base.top));
    const box = k => { const el = wrap.querySelector(`.ar-card[data-c="${CSS.escape(k)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - base.left, r: r.right - base.left, y: (r.top + r.bottom) / 2 - base.top, t: r.top - base.top, b: r.bottom - base.top, col: el.closest('.ar-col') }; };
    const out = [];
    // each link gets its own point on the sides it meets, ordered toward the other card (fewer crossings)
    const links = [];
    for (const l of m.architecture.links) {
      const a = box(l.from), b = box(l.to);
      if (!a || !b) continue;
      const on = !sel || sel === l.from || sel === l.to;
      if (stacked && a.col !== b.col) {
        const down = b.t > a.b;
        links.push({ l, on, mode: 'v', down, a: { side: `${l.from}:${down ? 'b' : 't'}`, lo: a.l, hi: a.r, toward: (b.l + b.r) / 2 }, b: { side: `${l.to}:${down ? 't' : 'b'}`, lo: b.l, hi: b.r, toward: (a.l + a.r) / 2 }, A: a, B: b });
      } else if (a.col === b.col) {
        links.push({ l, on, mode: 'same', a: { side: `${l.from}:r`, lo: a.t, hi: a.b, toward: b.y }, b: { side: `${l.to}:r`, lo: b.t, hi: b.b, toward: a.y }, A: a, B: b });
      } else {
        const fwd = b.l > a.r;
        const ia = colsEl.indexOf(a.col), ib = colsEl.indexOf(b.col);
        // a link that jumps over a column goes round its cards, through a lane below them
        const skip = Math.abs(ib - ia) > 1 ? Math.max(...Array.from({ length: Math.abs(ib - ia) - 1 }, (_, j) => colBottom(Math.min(ia, ib) + 1 + j))) : null;
        links.push({ l, on, mode: 'h', fwd, skip, a: { side: `${l.from}:${fwd ? 'r' : 'l'}`, lo: a.t, hi: a.b, toward: b.y }, b: { side: `${l.to}:${fwd ? 'l' : 'r'}`, lo: b.t, hi: b.b, toward: a.y }, A: a, B: b });
      }
    }
    spreadEnds(links.flatMap(k => [k.a, k.b]), { gap: 12 });
    const labels = [];
    let lanes = 0;
    links.forEach((k, i) => {
      const { A: a, B: b } = k;
      let d, lx, ly;
      if (k.mode === 'v') {
        const x1 = k.a.at, x2 = k.b.at, y1 = k.down ? a.b : a.t, y2 = k.down ? b.t : b.b, my = (y2 - y1) / 2;
        d = `M${x1} ${y1} C${x1} ${y1 + my} ${x2} ${y2 - my} ${x2} ${y2}`; lx = x1 + (x2 - x1) * 0.6; ly = y1 + (y2 - y1) * 0.5;
      } else if (k.mode === 'same') {
        const x = a.r, bend = 22 + (i % 3) * 10; d = `M${x} ${k.a.at} C${x + bend} ${k.a.at} ${x + bend} ${k.b.at} ${x} ${k.b.at}`; lx = x + bend * 0.75; ly = (k.a.at + k.b.at) / 2;
      } else if (k.skip != null) {
        const x1 = k.fwd ? a.r : a.l, x2 = k.fwd ? b.l : b.r, s = k.fwd ? 1 : -1;
        const lane = k.skip + 18 + (lanes++) * 12;
        d = `M${x1} ${k.a.at} C${x1 + 26 * s} ${k.a.at} ${x1 + 6 * s} ${lane} ${x1 + 32 * s} ${lane} L${x2 - 32 * s} ${lane} C${x2 - 6 * s} ${lane} ${x2 - 26 * s} ${k.b.at} ${x2} ${k.b.at}`;
        lx = (x1 + x2) / 2; ly = lane;
      } else {
        const x1 = k.fwd ? a.r : a.l, x2 = k.fwd ? b.l : b.r, mx = (x2 - x1) / 2;
        d = `M${x1} ${k.a.at} C${x1 + mx} ${k.a.at} ${x2 - mx} ${k.b.at} ${x2} ${k.b.at}`; lx = x1 + (x2 - x1) * 0.5; ly = (k.a.at + k.b.at) / 2;
      }
      out.push(`<path class="w${k.on ? '' : ' off'}" d="${d}" marker-end="url(#arA)"/>`);
      if (k.l.label && k.on) labels.push({ x: lx, y: ly, w: labelWidth(k.l.label), h: 18, text: k.l.label });
    });
    separateLabels(labels);
    // labels above the cards, so none hides behind one
    const lout = labels.map(t => `<g class="lbl"><rect x="${t.x - t.w / 2}" y="${t.y - 9}" width="${t.w}" height="18" rx="9"/><text x="${t.x}" y="${t.y + 4}" text-anchor="middle">${esc(t.text)}</text></g>`).join('');
    if (lsvg) lsvg.querySelector('g').innerHTML = lout; else out.push(lout);
    // room for the lanes under the cards
    wrap.style.paddingBottom = lanes ? `${18 + lanes * 12}px` : '';
    svg.querySelector('g').innerHTML = out.join('');
  }
  function render() {
    const m = getManifest();
    if (!m?.architecture) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const a = m.architecture;
    const editable = isEditable();
    if (sel && !a.components.some(c => c.key === sel)) sel = null;
    const cols = ARCH_COLUMNS.map(([, label], i) => [label, a.components.filter(c => ARCH_COLUMN_OF[c.kind] === i)]);
    const card = c => {
      const dirs = codeDirs(c);
      return `<article class="av-card ar-card k-${esc(c.kind)}${sel === c.key ? ' sel' : ''}" data-c="${esc(c.key)}" tabindex="0" role="button">
        <header><span class="ar-ic${matchTech(c.tech).length ? ' has-tech' : ''}">${techIcon(techLead(c), { size: 18 })}</span><span class="av-title">${esc(c.name)}</span><span class="spacer"></span>${editable ? `<button type="button" class="fn-edit av-edit" data-edit-c="${esc(c.key)}" title="Edit ${esc(c.name)}" aria-label="Edit ${esc(c.name)}">${ICON.edit}</button>` : ''}</header>
        ${c.tech ? `<div class="ar-tech">${c.tech.split(/\s*[,+·]\s*/).filter(Boolean).map(t => { const e = matchTech(t)[0]; return `<span${e ? ` title="${esc(e.desc)}"` : ''}>${e ? techIcon(e, { size: 12, title: false }) : ''}${esc(t)}</span>`; }).join('')}</div>` : ''}
        ${c.description ? `<p>${esc(c.description)}</p>` : ''}
        ${c.implements.length ? `<div class="ar-sum">${esc(summary(m, c))}</div>` : ''}
        ${dirs.length ? `<div class="ar-code">${dirs.slice(0, 4).map(d => `<code>${esc(d)}/</code>`).join('')}</div>` : ''}
      </article>`;
    };
    root.innerHTML = `${productNav('architecture')}
      ${head('Architecture', `${plural(a.components.length, 'component')}, ${plural(a.links.length, 'link')}.`, `${editable ? '<button type="button" class="btn small" id="arAdd">+ Component</button><button type="button" class="btn small" id="arLink">+ Link</button>' : ''}<button type="button" class="btn ghost small" data-open="specs/ARCHITECTURE.md">Spec</button>`)}
      ${!a.declared ? banner('<strong>Suggested.</strong> From the design, the API and the MCP surface. Keep it, then name the real technologies, services, stores and external systems.', editable, 'arKeep') : ''}
      <div class="ar-cols">${cols.map(([label, list]) => `<div class="ar-col"><h4>${esc(label)}</h4>${list.map(card).join('') || '<p class="av-empty small">—</p>'}</div>`).join('')}<svg class="ar-wires" aria-hidden="true"><defs><marker id="arA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g></g></svg><svg class="ar-wires ar-labels" aria-hidden="true"><g></g></svg></div>
      <div class="fn-detail" id="arDetail">${detailHtml(m, a)}</div>`;
    // the gap between layers fits the longest link label, so labels sit between the cards, not on them
    const longest = Math.max(0, ...a.links.map(l => (l.label ? labelWidth(l.label) : 0)));
    const colsBox = root.querySelector('.ar-cols');
    if (colsBox) colsBox.style.columnGap = `${Math.round(Math.min(120, Math.max(44, longest + 12)))}px`;
    requestAnimationFrame(draw);
  }
  function detailHtml(m, a) {
    const c = a.components.find(x => x.key === sel);
    if (!c) return '<p class="muted">Click a component to see what it implements and who it talks to.</p>';
    const name = new Map(a.components.map(x => [x.key, x.name]));
    const row = (label, html) => (html ? `<div class="fn-drow"><span>${label}</span><div>${html}</div></div>` : '');
    return `<div class="fn-dhead"><h3>${esc(c.name)}</h3><button type="button" class="btn ghost small" data-open="specs/ARCHITECTURE.md#${esc(c.key)}">Open in the spec</button></div>
      ${row('Kind', esc(c.kind))}${row('Technology', esc(c.tech))}${row('Stack', techDetail(c.tech))}${row('Implements', c.implements.map(id => chip(m, id)).join(''))}
      ${row('Talks to', a.links.filter(l => l.from === c.key).map(l => `<span class="av-chip">${esc(name.get(l.to))}${l.label ? ` <small>${esc(l.label)}</small>` : ''}</span>`).join(''))}
      ${row('Called by', a.links.filter(l => l.to === c.key).map(l => `<span class="av-chip">${esc(name.get(l.from))}${l.label ? ` <small>${esc(l.label)}</small>` : ''}</span>`).join(''))}
      ${row('Code', codeDirs(c).map(d => `<code>${esc(d)}/</code>`).join(' '))}`;
  }
  async function editComponent(key) {
    const m = getManifest();
    const decl = architectureToDeclared(m);
    const c = key ? m.architecture.components.find(x => x.key === key) : null;
    const cur = c ? decl.components.find(x => x.name === c.name) : null;
    await formDialog({
      title: c ? `Edit ${c.name}` : 'New component', danger: c ? 'Delete' : null,
      body: `<div class="row2"><label class="fn-field"><span>Name</span><input name="name" required maxlength="80" value="${esc(cur?.name ?? '')}" placeholder="Billing service"></label><label class="fn-field"><span>Kind</span><select name="kind">${['client', 'frontend', 'interface', 'service', 'queue', 'store', 'external'].map(k => `<option ${k === (cur?.kind ?? 'service') ? 'selected' : ''}>${k}</option>`).join('')}</select></label></div>
        <label class="fn-field"><span>Technology</span><input name="tech" maxlength="160" value="${esc(cur?.tech ?? '')}" placeholder="Node 22 · Fastify · PostgreSQL 16"></label>
        ${techPicker(cur?.tech ?? '')}
        <label class="fn-field"><span>Role</span><textarea name="description" rows="2" maxlength="400" placeholder="What it is responsible for">${esc(cur?.description ?? '')}</textarea></label>
        <label class="fn-field"><span>Code folders (comma separated)</span><input name="code" value="${esc((cur?.code ?? []).join(', '))}" placeholder="apps/api, packages/billing"></label>
        ${refPicker(m, 'implements', cur?.implements ?? [])}`,
      onOpen: f => wireTechPicker(f, f.elements.tech),
      onSubmit: async (f, act) => {
        let components = decl.components.filter(x => !cur || x.name !== cur.name);
        let links = decl.links;
        if (act === 'danger') links = links.filter(l => l.from !== cur.name && l.to !== cur.name);
        else {
          const name = f.elements.name.value.trim();
          if (!name) return 'Give the component a name.';
          if (components.some(x => x.name.toLowerCase() === name.toLowerCase())) return `There is already a component called ${name}.`;
          components = [...components, { name, kind: f.elements.kind.value, tech: f.elements.tech.value.trim(), description: f.elements.description.value.trim(), code: f.elements.code.value.split(',').map(s => s.trim()).filter(Boolean), implements: [...f.querySelectorAll('input[name="implements"]:checked')].map(x => x.value) }];
          if (cur && cur.name !== name) links = links.map(l => ({ ...l, from: l.from === cur.name ? name : l.from, to: l.to === cur.name ? name : l.to }));
        }
        return save({ components, links }, act === 'danger' ? `Remove ${cur.name}` : `Component ${f.elements.name.value.trim()}`);
      },
    });
  }
  async function editLinks() {
    const m = getManifest();
    const decl = architectureToDeclared(m);
    const names = decl.components.map(c => c.name);
    const opt = v => names.map(n => `<option ${n === v ? 'selected' : ''}>${esc(n)}</option>`).join('');
    const row = (l = {}) => `<div class="av-row"><select name="from" aria-label="From">${opt(l.from)}</select><span>→</span><select name="to" aria-label="To">${opt(l.to)}</select><input name="label" value="${esc(l.label ?? '')}" placeholder="how (HTTPS, SQL, events…)" aria-label="How"><button type="button" class="av-x" data-rm-row aria-label="Remove">×</button></div>`;
    await formDialog({
      title: 'Links',
      body: `<fieldset class="fn-pick av-rows"><legend>Who talks to whom</legend>${decl.links.map(row).join('')}<button type="button" class="btn ghost small" data-add-row="ln">+ Link</button><template data-row="ln">${row()}</template></fieldset>`,
      onSubmit: async f => {
        const links = [...f.querySelectorAll('.av-row')].map(r => ({ from: r.querySelector('[name=from]').value, to: r.querySelector('[name=to]').value, label: r.querySelector('[name=label]').value.trim() })).filter(l => l.from && l.to && l.from !== l.to);
        return save({ components: decl.components, links }, 'Architecture links');
      },
    });
  }
  root.addEventListener('click', async e => {
    if (e.target.closest('#arAdd')) return editComponent(null);
    if (e.target.closest('#arLink')) return editLinks();
    if (e.target.closest('#arKeep')) return save(architectureToDeclared(getManifest()), 'Keep the suggested architecture');
    const ed = e.target.closest('[data-edit-c]');
    if (ed) { e.stopPropagation(); return editComponent(ed.dataset.editC); }
    const c = e.target.closest('.ar-card');
    if (c && !e.target.closest('[data-open]')) { sel = sel === c.dataset.c ? null : c.dataset.c; render(); }
  });
  root.addEventListener('keydown', e => { const c = e.target.closest?.('.ar-card'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); c.click(); } });
  new ResizeObserver(() => draw()).observe(root);
  return { render, draw, refresh: render };
}
