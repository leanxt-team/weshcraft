// One internal document model for both FigCraft inputs:
//  - a `.figcraft` archive's document.json (flat node map, snake_case, colours as {r,g,b,a} floats)
//  - FigCraft MCP `inspect_document` output (nested tree, camelCase, solid colours as CSS hex)
// Everything downstream (manifest, specs, prototype, parity) reads only this model.
import { round } from '../util/common.mjs';

const hex2 = n => Math.round(Math.max(0, Math.min(1, n)) * 255).toString(16).padStart(2, '0');

/** Colour to {hex: '#rrggbb', alpha}. Accepts {r,g,b,a} floats or '#rgb[a]' / '#rrggbb[aa]'. */
export function color(c) {
  if (!c) return null;
  if (typeof c === 'string') {
    let h = c.replace('#', '').toLowerCase();
    if (h.length === 3 || h.length === 4) h = [...h].map(x => x + x).join('');
    const alpha = h.length === 8 ? round(parseInt(h.slice(6, 8), 16) / 255, 3) : 1;
    return { hex: `#${h.slice(0, 6)}`, alpha };
  }
  return { hex: `#${hex2(c.r ?? 0)}${hex2(c.g ?? 0)}${hex2(c.b ?? 0)}`, alpha: round(c.a ?? 1, 3) };
}

function paint(p) {
  if (!p || p.visible === false) return null;
  const opacity = p.opacity ?? 1;
  if (p.type === 'solid') {
    const c = color(p.color);
    return { type: 'solid', hex: c.hex, alpha: round(c.alpha * opacity, 3) };
  }
  if (p.type === 'gradient') {
    return {
      type: 'gradient', kind: p.kind || 'linear', from: p.from, to: p.to, opacity,
      stops: (p.stops || []).map(s => ({ position: round(s.position, 4), ...color(s.color) })),
    };
  }
  if (p.type === 'image') return { type: 'image', image: p.image ?? p.hash ?? null, scale: p.scale_mode ?? p.scaleMode ?? 'fill', opacity };
  return { type: p.type || 'unknown', opacity };
}

const paints = arr => (Array.isArray(arr) ? arr.map(paint).filter(Boolean) : []);

function radius(n) {
  if (typeof n.cornerRadius === 'number') return n.cornerRadius;
  if (Array.isArray(n.cornerRadius)) return n.cornerRadius;
  const c = n.corners;
  if (!c) return 0;
  const radii = c.radii ?? c;
  if (Array.isArray(radii)) return radii.every(r => r === radii[0]) ? radii[0] : radii;
  return typeof radii === 'number' ? radii : 0;
}

function layout(l) {
  if (!l) return null;
  const pad = l.padding ?? [0, 0, 0, 0];
  return {
    mode: l.mode ?? 'horizontal',
    gap: l.gap ?? 0,
    crossGap: l.cross_gap ?? l.crossGap ?? 0,
    wrap: !!l.wrap,
    padding: Array.isArray(pad) ? pad : [pad, pad, pad, pad], // [top, right, bottom, left]
    mainAlign: l.main_align ?? l.mainAlign ?? 'min',
    crossAlign: l.cross_align ?? l.crossAlign ?? 'min',
    gridColumns: l.grid_columns ?? l.gridColumns,
    gridRows: l.grid_rows ?? l.gridRows,
  };
}

/** Line height / letter spacing: file form {unit, value} or MCP label "Auto" | "24" | "140%". */
function unitValue(v) {
  if (v == null) return null;
  if (typeof v === 'object') return v.unit === 'auto' ? { unit: 'auto', value: null } : { unit: v.unit === 'pixels' || v.unit === 'px' ? 'pixels' : v.unit, value: v.value ?? null };
  if (typeof v === 'number') return { unit: 'pixels', value: v };
  const s = String(v).trim();
  if (/^auto$/i.test(s)) return { unit: 'auto', value: null };
  if (s.endsWith('%')) return { unit: 'percent', value: Number(s.slice(0, -1)) };
  return { unit: 'pixels', value: Number(s.replace(/px$/, '')) };
}

function text(n) {
  if (n.type !== 'text') return null;
  const s = n.style ?? {};
  return {
    characters: n.characters ?? '',
    fontFamily: s.font_family ?? n.fontFamily ?? null,
    fontStyle: s.font_style ?? n.fontStyle ?? 'Regular',
    fontSize: s.font_size ?? n.fontSize ?? null,
    lineHeight: unitValue(s.line_height ?? n.lineHeight),
    letterSpacing: unitValue(s.letter_spacing ?? n.letterSpacing),
    align: n.align_h ?? n.textAlign ?? 'left',
    case: s.case ?? n.textCase ?? 'original',
    decoration: s.decoration ?? n.textDecoration ?? 'none',
    autoResize: n.auto_resize ?? n.textAutoResize ?? null,
  };
}

function effects(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(e => e && e.visible !== false).map(e => ({
    type: e.type, ...(e.color ? { color: color(e.color) } : {}),
    offset: e.offset, radius: e.radius, spread: e.spread,
  }));
}

function toNode(n, parentId) {
  const t = n.transform;
  const sizing = n.child_layout
    ? { h: n.child_layout.sizing_h, v: n.child_layout.sizing_v }
    : n.sizing ? { h: n.sizing.horizontal, v: n.sizing.vertical } : null;
  const stroke = n.stroke ?? {};
  return {
    id: Number(n.id),
    name: n.name ?? '',
    type: n.type,
    parent: n.parent ?? parentId ?? null,
    children: [],
    x: round(n.x ?? (Array.isArray(t) ? t[4] : 0)),
    y: round(n.y ?? (Array.isArray(t) ? t[5] : 0)),
    width: round(n.width ?? 0),
    height: round(n.height ?? 0),
    visible: n.visible !== false,
    opacity: n.opacity ?? 1,
    fills: paints(n.fills),
    strokes: paints(n.strokes),
    strokeWeight: stroke.weight ?? n.strokeWeight ?? (n.strokes?.length ? 1 : 0),
    radius: radius(n),
    effects: effects(n.effects),
    clip: !!n.clip,
    layout: layout(n.layout),
    sizing,
    absolute: !!(n.child_layout?.absolute ?? n.absolute),
    grid: n.child_layout
      ? { column: n.child_layout.grid_column, row: n.child_layout.grid_row, columnSpan: n.child_layout.grid_column_span, rowSpan: n.child_layout.grid_row_span }
      : n.gridCell?.anchored ? { column: n.gridCell.column, row: n.gridCell.row, columnSpan: n.gridCell.columnSpan, rowSpan: n.gridCell.rowSpan } : null,
    text: text(n),
    interactions: n.interactions ?? [],
    component: n.component ?? n.mainComponent ?? null,
    componentProps: n.props && n.type === 'instance' ? n.props : n.componentProperties ?? (n.type === 'instance' ? n.props ?? {} : {}),
    propDefs: n.type !== 'instance' ? n.props ?? n.componentPropertyDefinitions ?? null : null,
    propRefs: n.prop_refs ?? null,
    annotations: n.annotations ?? [],
    devStatus: n.dev_status ?? n.devStatus ?? null,
    devNote: n.dev_note ?? n.devNote ?? '',
    description: n.description ?? '',
    bound: n.bound ?? n.boundVariables ?? {},
    varModes: n.var_modes ?? null,
    pluginData: n.pluginData ?? n.plugin_data ?? {},
    flows: n.flows ?? null,
    background: n.background ? color(n.background) : null,
    prototype: n.prototype ?? null,
    strokeAlign: stroke.align ?? n.strokeAlign ?? 'center',
    dashes: stroke.dashes ?? n.dashes ?? [],
    geometry: {
      network: n.network ?? null, count: n.count ?? n.pointCount ?? null, innerRatio: n.inner_ratio ?? n.innerRadius ?? null,
      start: n.start ?? null, sweep: n.sweep ?? null, inner: n.inner ?? null,
    },
  };
}

function variablesFromFile(v) {
  if (!v) return { collections: [], variables: [] };
  return {
    collections: (v.collections || []).map(c => ({ id: c.id, name: c.name, modes: c.modes.map(m => ({ id: m.id, name: m.name })) })),
    variables: (v.variables || []).map(x => ({
      id: x.id, name: x.name, collection: x.collection, type: x.resolvedType, description: x.description || '',
      values: Object.fromEntries(Object.entries(x.values || {}).map(([mode, val]) => [mode, variableValue(val)])),
    })),
  };
}

function variableValue(val) {
  if (val == null) return null;
  if (val.type === 'color') return color(val.value);
  if (val.type === 'alias') return { alias: val.value ?? val.id };
  if (typeof val === 'object' && 'value' in val) return val.value;
  if (typeof val === 'object' && 'r' in val) return color(val);
  if (typeof val === 'object' && val.type === 'VARIABLE_ALIAS') return { alias: val.id };
  return val;
}

/** REST-API variables JSON (FigCraft `variable.export`) to the internal shape. */
export function variablesFromRest(json) {
  const meta = json?.meta ?? json;
  if (!meta?.variables) return { collections: [], variables: [] };
  return {
    collections: Object.entries(meta.variableCollections || {}).map(([id, c]) => ({
      id, name: c.name, modes: (c.modes || []).map(m => ({ id: m.modeId, name: m.name })),
    })),
    variables: Object.entries(meta.variables).map(([id, v]) => ({
      id, name: v.name, collection: v.variableCollectionId, type: String(v.resolvedType || '').toLowerCase(),
      description: v.description || '',
      values: Object.fromEntries(Object.entries(v.valuesByMode || {}).map(([m, val]) => [m, variableValue(val)])),
    })),
  };
}

/** document.json of a .figcraft archive -> model */
export function fromFigcraftFile(doc) {
  if (doc?.format !== 'figcraft') throw new Error('not a FigCraft document (format != "figcraft")');
  const nodes = new Map();
  for (const raw of Object.values(doc.nodes)) nodes.set(Number(raw.id), toNode(raw));
  for (const raw of Object.values(doc.nodes)) nodes.get(Number(raw.id)).children = (raw.children || []).map(Number);
  return finish({
    name: doc.name, pages: (doc.pages || []).map(Number), nodes,
    variables: variablesFromFile(doc.variables), styles: doc.styles ?? [], comments: doc.comments ?? [],
  });
}

/** FigCraft MCP `inspect_document {allPages: true, depth: 64}` -> model */
export function fromInspect(json, variables = null) {
  const nodes = new Map();
  const walk = (raw, parentId) => {
    const node = toNode(raw, parentId);
    nodes.set(node.id, node);
    node.children = (raw.children || []).map(c => walk(c, node.id).id);
    if (raw.childCount && !raw.children) node.truncated = true;
    return node;
  };
  const pagesRaw = json.pages ?? json.document?.pages ?? (json.children ? json.children : []);
  const pages = pagesRaw.map(p => walk({ ...p, type: p.type ?? 'page' }, null).id);
  return finish({
    name: json.name ?? json.document?.name ?? 'Untitled',
    pages, nodes, variables: variables ?? { collections: [], variables: [] },
    styles: json.styles ?? [], comments: [],
  });
}

function finish(model) {
  model.truncated = [...model.nodes.values()].some(n => n.truncated);
  return model;
}

/** Ancestors of a node up to (not including) its page. */
export function ancestors(model, id) {
  const out = [];
  let n = model.nodes.get(id);
  while (n && n.parent != null) {
    const p = model.nodes.get(n.parent);
    if (!p || p.type === 'page') break;
    out.push(p);
    n = p;
  }
  return out;
}

export function* descendants(model, id) {
  const n = model.nodes.get(id);
  if (!n) return;
  for (const c of n.children) {
    const child = model.nodes.get(c);
    if (!child) continue;
    yield child;
    yield* descendants(model, c);
  }
}
