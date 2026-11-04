// Compact, token-cheap views of the design for agents: an outline (one line per layer), a search,
// and one layer's editable properties in the same vocabulary `weshcraft_edit` accepts.
import { hexOf } from './props.mjs';

const r1 = n => Math.round(n * 10) / 10;
const q = s => JSON.stringify(String(s ?? '')).slice(0, 80);

function paintLabel(fills) {
  const f = (fills ?? []).find(p => p.visible !== false);
  if (!f) return '';
  if (f.type === 'solid') return hexOf({ ...f.color, a: (f.color?.a ?? 1) * (f.opacity ?? 1) });
  return f.type;
}

const API_RE = /\b(GET|POST|PUT|PATCH|DELETE)\s+\/\S*(?:\s*(?:→|->)\s*\w+)?/;

/** One line describing a raw layer. */
export function line(store, raw, { screenKeys } = {}) {
  const parts = [`#${raw.id}`, raw.type, q(raw.name)];
  if (raw.type === 'text') {
    parts.push(q(raw.characters));
    const s = raw.style ?? {};
    parts.push(`${s.font_family ?? ''} ${s.font_style ?? ''} ${s.font_size ?? ''}`.trim());
  }
  if (raw.type !== 'page') parts.push(`${r1(raw.width ?? 0)}×${r1(raw.height ?? 0)}${raw.transform ? ` @${r1(raw.transform[4])},${r1(raw.transform[5])}` : ''}`);
  const fill = paintLabel(raw.fills);
  if (fill) parts.push(raw.type === 'text' ? `color ${fill}` : `fill ${fill}`);
  if (raw.bound?.fill) {
    const v = (store.doc.variables?.variables ?? []).find(x => x.id === raw.bound.fill);
    if (v) parts.push(`token ${v.name}`);
  }
  if (raw.corners?.radii?.some(Boolean)) parts.push(`radius ${raw.corners.radii.every(x => x === raw.corners.radii[0]) ? raw.corners.radii[0] : raw.corners.radii.join('/')}`);
  if (raw.layout) {
    const l = raw.layout;
    parts.push(`${l.mode} gap ${l.gap} pad ${(l.padding ?? []).join('/')}${l.main_align !== 'min' ? ` align ${l.main_align}` : ''}${l.cross_align !== 'min' ? ` cross ${l.cross_align}` : ''}`);
  }
  const cl = raw.child_layout;
  if (cl && (cl.sizing_h !== 'fixed' || cl.sizing_v !== 'fixed')) parts.push(`size ${cl.sizing_h}/${cl.sizing_v}`);
  if (cl?.absolute) parts.push('absolute');
  if (raw.visible === false) parts.push('hidden');
  if (raw.type === 'instance') parts.push(`of #${raw.component}`);
  for (const it of raw.interactions ?? []) for (const a of it.actions ?? []) {
    if (a.type === 'navigate') parts.push(`▶ to #${a.dest}${screenKeys?.get(a.dest) ? ` (${screenKeys.get(a.dest)})` : ''}`);
    else if (a.type === 'back') parts.push('▶ back');
    else if (a.url) parts.push(`▶ url ${a.url}`);
  }
  for (const a of raw.annotations ?? []) {
    const m = API_RE.exec(a.label ?? '');
    parts.push(m ? `API ${m[0]}` : `note ${q(a.label)}`);
  }
  if (raw.dev_status) parts.push(`dev ${raw.dev_status}`);
  if (screenKeys?.has(raw.id)) parts.push(`= ${screenKeys.get(raw.id)}`);
  return parts.join(' · ');
}

/** Indented outline of a page or a subtree. */
export function tree(store, { root, depth = 8, screenKeys } = {}) {
  const start = root ?? store.doc.current_page ?? store.doc.pages[0];
  const out = [];
  const walk = (id, d) => {
    const raw = store.node(id);
    out.push(`${'  '.repeat(d)}${line(store, raw, { screenKeys })}`);
    if (d >= depth) { if (raw.children?.length) out.push(`${'  '.repeat(d + 1)}… ${raw.children.length} layers (weshcraft_read tree with root #${id})`); return; }
    for (const c of raw.children ?? []) walk(c, d + 1);
  };
  walk(start, 0);
  return out.join('\n');
}

/** Layers whose name or text contains `query` (case-insensitive), optionally of one type / inside one root. */
export function find(store, { query = '', type, root, limit = 40, screenKeys } = {}) {
  const needle = String(query).toLowerCase();
  const inside = root != null ? new Set(subtree(store, root)) : null;
  const hits = Object.values(store.doc.nodes).filter(n =>
    (!type || n.type === type) && (!inside || inside.has(n.id))
    && (!needle || String(n.name ?? '').toLowerCase().includes(needle) || String(n.characters ?? '').toLowerCase().includes(needle)));
  const lines = hits.slice(0, limit).map(n => line(store, n, { screenKeys }));
  if (hits.length > limit) lines.push(`… ${hits.length - limit} more (narrow the query, or pass type/root)`);
  return lines.join('\n') || `no layer matches "${query}"`;
}

export function subtree(store, id) {
  const out = [];
  const walk = x => { out.push(x); for (const c of store.node(x).children ?? []) walk(c); };
  walk(id);
  return out;
}

/** A layer's properties in weshcraft_edit's vocabulary (what you can pass back to `set`). */
export function props(store, id) {
  const raw = store.node(id);
  const o = { id: raw.id, type: raw.type, name: String(raw.name ?? '').replace(/\s*@[A-Za-z_]\w*\.[A-Za-z_]\w*(?::\w+)?/, '').trim() || raw.name, parent: raw.parent, children: raw.children ?? [] };
  if (raw.type !== 'page') Object.assign(o, { x: r1(raw.transform?.[4] ?? 0), y: r1(raw.transform?.[5] ?? 0), width: r1(raw.width ?? 0), height: r1(raw.height ?? 0) });
  if (raw.visible === false) o.visible = false;
  if (raw.opacity != null) o.opacity = raw.opacity;
  const fill = paintLabel(raw.fills);
  if (fill) o[raw.type === 'text' ? 'color' : 'fill'] = fill;
  const stroke = paintLabel(raw.strokes);
  if (stroke) Object.assign(o, { stroke, strokeWeight: raw.stroke?.weight ?? 1, strokeAlign: raw.stroke?.align });
  if (raw.corners) o.radius = raw.corners.radii.every(x => x === raw.corners.radii[0]) ? raw.corners.radii[0] : raw.corners.radii;
  if (raw.clip) o.clip = true;
  if (raw.type === 'text') {
    const s = raw.style ?? {};
    Object.assign(o, { text: raw.characters, fontFamily: s.font_family, fontStyle: s.font_style, fontSize: s.font_size, lineHeight: lh(s.line_height), letterSpacing: lh(s.letter_spacing), align: raw.align_h ?? 'left', autoResize: raw.auto_resize });
  }
  if (raw.layout) {
    const l = raw.layout;
    o.layout = { mode: l.mode, gap: l.gap, padding: l.padding, align: l.main_align, crossAlign: l.cross_align, wrap: !!l.wrap };
  }
  if (raw.child_layout) o.sizing = { h: raw.child_layout.sizing_h, v: raw.child_layout.sizing_v, ...(raw.child_layout.absolute ? { absolute: true } : {}) };
  const shadows = (raw.effects ?? []).filter(e => e.type === 'dropShadow');
  if (shadows.length) o.shadow = shadows.map(e => ({ x: e.offset?.[0], y: e.offset?.[1], blur: e.radius, spread: e.spread, color: hexOf(e.color) }));
  if (raw.type === 'instance') o.component = raw.component;
  const link = (raw.interactions ?? []).flatMap(i => i.actions ?? [])[0];
  if (link) o.link = link.type === 'navigate' ? { to: link.dest } : link.type === 'back' ? { back: true } : { url: link.url };
  const bind = /@([A-Za-z_]\w*)\.([A-Za-z_]\w*)(?::(\w+))?/.exec(raw.name ?? '');
  if (bind) o.bind = { entity: bind[1], field: bind[2], type: bind[3] ?? 'string' };
  const api = (raw.annotations ?? []).map(a => /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)(?:\s*(?:→|->)\s*(\w+))?/.exec(a.label ?? '')).find(Boolean);
  if (api) o.api = { method: api[1], path: api[2], ...(api[3] ? { returns: api[3] } : {}) };
  const notes = (raw.annotations ?? []).filter(a => !API_RE.test(a.label ?? '')).map(a => a.label);
  if (notes.length) o.notes = notes;
  if (raw.dev_status) o.devStatus = raw.dev_status;
  if (raw.bound?.fill) o.token = (store.doc.variables?.variables ?? []).find(v => v.id === raw.bound.fill)?.name;
  return o;
}

const lh = u => (!u ? undefined : u.unit === 'auto' ? 'auto' : u.unit === 'percent' ? `${u.value}%` : u.value);

/** Design tokens as `name = value` lines. */
export function tokens(store) {
  const v = store.doc.variables ?? { collections: [], variables: [] };
  return v.variables.map(x => {
    const col = v.collections.find(c => c.id === x.collection);
    const vals = Object.entries(x.values).map(([m, val]) => `${col?.modes.find(mm => mm.id === m)?.name ?? m}: ${val?.type === 'color' ? hexOf(val.value) : val?.type === 'alias' ? `→ ${val.value}` : JSON.stringify(val?.value ?? val)}`);
    return `${x.name} (${col?.name ?? '?'}) ${vals.join(', ')}`;
  }).join('\n') || 'no tokens';
}
