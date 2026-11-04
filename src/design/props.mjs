// Friendly layer properties <-> FigCraft's raw document.json node format.
//
// Agents and the browser editor speak a small, flat vocabulary (hex colours, `padding: 16`,
// `layout: 'vertical'`, `sizing: {h: 'fill'}`); the store writes exactly what FigCraft writes in a
// .figcraft archive (snake_case, colours as {r,g,b,a} floats, transforms), so the file stays a
// valid FigCraft document that FigCraft itself can open.

export const CONTAINER_TYPES = new Set(['page', 'frame', 'component', 'componentSet', 'section', 'group', 'instance']);
export const SHAPE_TYPES = new Set(['rectangle', 'ellipse', 'star', 'polygon', 'line', 'vector']);
export const CREATABLE = new Set(['frame', 'rectangle', 'ellipse', 'text', 'component', 'section', 'star', 'polygon', 'line']);

const clamp01 = n => Math.max(0, Math.min(1, n));

/** '#rgb' | '#rgba' | '#rrggbb' | '#rrggbbaa' | {r,g,b,a} -> {r,g,b,a} floats. */
export function rgba(v) {
  if (v && typeof v === 'object' && 'r' in v) return { r: v.r, g: v.g, b: v.b, a: v.a ?? 1 };
  const s = String(v ?? '').trim();
  const named = { white: 'ffffff', black: '000000', transparent: '00000000' }[s.toLowerCase()];
  let h = named ?? s.replace(/^#/, '');
  if (!/^[0-9a-f]+$/i.test(h) || ![3, 4, 6, 8].includes(h.length)) throw new Error(`not a colour: ${JSON.stringify(v)} (use #rrggbb or #rrggbbaa)`);
  if (h.length <= 4) h = [...h].map(c => c + c).join('');
  const n = i => parseInt(h.slice(i, i + 2), 16) / 255;
  return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) : 1 };
}

export function hexOf(c) {
  if (!c) return null;
  const x = k => Math.round(clamp01(c[k] ?? 0) * 255).toString(16).padStart(2, '0');
  return `#${x('r')}${x('g')}${x('b')}${(c.a ?? 1) < 1 ? x('a') : ''}`;
}

const solid = (v, opacity = 1) => ({ type: 'solid', color: rgba(v), opacity, visible: true, blend: 'normal' });

/** A fill/stroke value: null/'none' clears, a colour, a {type:'gradient', ...} raw paint, or a list. */
function paintList(v) {
  if (v == null || v === 'none' || v === false) return [];
  if (Array.isArray(v)) return v.flatMap(paintList);
  if (typeof v === 'object' && v.type && v.type !== 'solid') return [v];
  if (typeof v === 'object' && v.type === 'solid') return [solid(v.color, v.opacity ?? 1)];
  return [solid(v)];
}

const FONT_STYLES = { 100: 'Thin', 200: 'Extra Light', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semi Bold', 700: 'Bold', 800: 'Extra Bold', 900: 'Black' };

function unit(v, fallbackUnit = 'pixels') {
  if (v == null) return undefined;
  if (typeof v === 'object') return v;
  if (v === 'auto') return { unit: 'auto', value: null };
  const s = String(v);
  if (s.endsWith('%')) return { unit: 'percent', value: Number(s.slice(0, -1)) };
  return { unit: fallbackUnit, value: Number(s.replace(/px$/, '')) };
}

const ALIGN = { start: 'min', min: 'min', center: 'center', end: 'max', max: 'max', 'space-between': 'spaceBetween', spaceBetween: 'spaceBetween', between: 'spaceBetween', stretch: 'stretch', baseline: 'baseline' };

/** Default raw node for a new layer of `type`. */
export function rawDefaults(type, id, parent) {
  const base = { id, parent, name: '', type, transform: [1, 0, 0, 1, 0, 0], width: 100, height: 100 };
  switch (type) {
    case 'frame': case 'component': return { ...base, name: type === 'component' ? 'Component' : 'Frame', children: [], fills: [solid('#ffffff')], clip: true, ...(type === 'component' ? { description: '', props: {} } : {}) };
    case 'section': return { ...base, name: 'Section', children: [], contents_hidden: false, width: 800, height: 600, fills: [solid('#ffffff')], strokes: [solid('#e6e6e6')], corners: { radii: [2, 2, 2, 2], smoothing: 0 } };
    case 'rectangle': return { ...base, name: 'Rectangle', blend: 'normal', fills: [solid('#d9d9d9')] };
    case 'ellipse': return { ...base, name: 'Ellipse', blend: 'normal', start: 0, sweep: Math.PI * 2, inner: 0, fills: [solid('#d9d9d9')] };
    case 'star': return { ...base, name: 'Star', blend: 'normal', count: 5, inner_ratio: 0.38, fills: [solid('#d9d9d9')] };
    case 'polygon': return { ...base, name: 'Polygon', blend: 'normal', count: 3, fills: [solid('#d9d9d9')] };
    case 'line': return { ...base, name: 'Line', blend: 'normal', height: 0, fills: [], strokes: [solid('#000000')], stroke: strokeDefaults(1) };
    case 'text': return {
      ...base, name: 'Text', characters: 'Text', width: 40, height: 22,
      style: { font_family: 'Inter', font_style: 'Regular', font_size: 16, line_height: { unit: 'auto', value: null }, letter_spacing: { unit: 'percent', value: 0 }, decoration: 'none', case: 'original', fills: null, link: null },
      fills: [solid('#000000')], auto_resize: 'widthAndHeight',
    };
    default: throw new Error(`cannot create a ${type} (one of: ${[...CREATABLE].join(', ')})`);
  }
}

const strokeDefaults = weight => ({ weight, align: 'inside', sides: null, cap_start: 'none', cap_end: 'none', join: 'miter', miter_limit: 4, dashes: [] });
const childLayout = raw => (raw.child_layout ??= { sizing_h: 'fixed', sizing_v: 'fixed', absolute: false, min_w: null, max_w: null, min_h: null, max_h: null, grid_column: null, grid_row: null, grid_column_span: 0, grid_row_span: 0 });

/** Rough text box for auto-sized text (the browser re-measures; specs do not depend on it). */
export function measureText(raw) {
  const s = raw.style ?? {};
  const size = s.font_size ?? 16;
  const lh = s.line_height?.unit === 'pixels' ? s.line_height.value : s.line_height?.unit === 'percent' ? (size * s.line_height.value) / 100 : size * 1.2;
  const lines = String(raw.characters ?? '').split('\n');
  const longest = Math.max(1, ...lines.map(l => l.length));
  return { width: Math.round(longest * size * 0.56 * 10) / 10, height: Math.round(lines.length * lh * 10) / 10 };
}

/** Apply friendly `props` to a raw node, in place. Unknown keys are an error (typos fail loudly). */
export function applyProps(raw, props = {}) {
  for (const [k, v] of Object.entries(props)) {
    switch (k) {
      case 'name': {
        // The data binding rides in the name (`Title @trail.name`): a rename keeps it unless it names one itself.
        const keep = /\s*@[A-Za-z_]\w*\.[A-Za-z_]\w*(?::\w+)?/.exec(raw.name ?? '');
        const next = String(v);
        raw.name = keep && !next.includes('@') ? `${next}${keep[0]}` : next;
        break;
      }
      case 'x': raw.transform = [...(raw.transform ?? [1, 0, 0, 1, 0, 0])]; raw.transform[4] = Number(v); break;
      case 'y': raw.transform = [...(raw.transform ?? [1, 0, 0, 1, 0, 0])]; raw.transform[5] = Number(v); break;
      case 'width': case 'w': raw.width = Math.max(0, Number(v)); if (raw.type === 'text' && raw.auto_resize === 'widthAndHeight') raw.auto_resize = 'height'; break;
      case 'height': case 'h': raw.height = Math.max(0, Number(v)); if (raw.type === 'text' && raw.auto_resize !== 'none') raw.auto_resize = 'none'; break;
      case 'visible': if (v) delete raw.visible; else raw.visible = false; break;
      case 'opacity': if (Number(v) >= 1) delete raw.opacity; else raw.opacity = clamp01(Number(v)); break;
      case 'clip': raw.clip = !!v; break;
      case 'fill': case 'fills': raw.fills = paintList(v); if (raw.bound) delete raw.bound.fill; break;
      case 'color': // text colour, or fill for shapes
        raw.fills = paintList(v); if (raw.bound) delete raw.bound.fill; break;
      case 'stroke': case 'strokes':
        raw.strokes = paintList(v);
        if (raw.strokes.length) raw.stroke = { ...(raw.stroke ?? strokeDefaults(1)) }; else delete raw.stroke;
        break;
      case 'strokeWeight': raw.stroke = { ...(raw.stroke ?? strokeDefaults(1)), weight: Number(v) }; break;
      case 'strokeAlign': raw.stroke = { ...(raw.stroke ?? strokeDefaults(1)), align: v }; break;
      case 'dashes': raw.stroke = { ...(raw.stroke ?? strokeDefaults(1)), dashes: v || [] }; break;
      case 'radius': case 'cornerRadius': {
        const r = Array.isArray(v) ? v.map(Number) : [v, v, v, v].map(Number);
        if (r.every(x => !x)) delete raw.corners; else raw.corners = { radii: r, smoothing: raw.corners?.smoothing ?? 0 };
        break;
      }
      case 'shadow': {
        const keep = (raw.effects ?? []).filter(e => e.type !== 'dropShadow');
        const list = v ? [].concat(v).map(s => ({ type: 'dropShadow', color: rgba(s.color ?? '#00000026'), offset: [Number(s.x ?? 0), Number(s.y ?? 4)], radius: Number(s.blur ?? 12), spread: Number(s.spread ?? 0), blend: 'normal', show_behind: false, visible: true })) : [];
        raw.effects = [...keep, ...list];
        if (!raw.effects.length) delete raw.effects;
        break;
      }
      case 'blur': {
        const keep = (raw.effects ?? []).filter(e => e.type !== 'backgroundBlur' && e.type !== 'layerBlur');
        raw.effects = v ? [...keep, { type: 'backgroundBlur', radius: Number(v), visible: true }] : keep;
        if (!raw.effects.length) delete raw.effects;
        break;
      }
      // text
      case 'text': case 'characters':
        if (raw.type !== 'text') throw new Error(`#${raw.id} is a ${raw.type}, not text`);
        raw.characters = String(v); break;
      case 'fontFamily': textStyle(raw).font_family = v; break;
      case 'fontStyle': textStyle(raw).font_style = v; break;
      case 'fontWeight': textStyle(raw).font_style = FONT_STYLES[Math.round(Number(v) / 100) * 100] ?? 'Regular'; break;
      case 'fontSize': textStyle(raw).font_size = Number(v); break;
      case 'lineHeight': textStyle(raw).line_height = unit(v); break;
      case 'letterSpacing': textStyle(raw).letter_spacing = unit(v, 'pixels'); break;
      case 'textCase': textStyle(raw).case = v; break;
      case 'textDecoration': textStyle(raw).decoration = v; break;
      case 'align': case 'textAlign': raw.align_h = v; break;
      case 'autoResize': raw.auto_resize = v; break;
      // auto layout on containers
      case 'layout': {
        if (!v || v === 'none') { delete raw.layout; break; }
        const cur = raw.layout ?? { mode: 'vertical', wrap: false, gap: 0, cross_gap: 0, padding: [0, 0, 0, 0], main_align: 'min', cross_align: 'min', grid_columns: 2, grid_rows: 2 };
        const l = typeof v === 'string' ? { mode: v } : v;
        raw.layout = { ...cur };
        for (const [lk, lv] of Object.entries(l)) {
          if (lk === 'mode') raw.layout.mode = lv === 'row' ? 'horizontal' : lv === 'column' ? 'vertical' : lv;
          else if (lk === 'gap') raw.layout.gap = Number(lv);
          else if (lk === 'padding') raw.layout.padding = Array.isArray(lv) ? (lv.length === 2 ? [lv[0], lv[1], lv[0], lv[1]] : lv).map(Number) : [lv, lv, lv, lv].map(Number);
          else if (lk === 'align' || lk === 'mainAlign') raw.layout.main_align = ALIGN[lv] ?? lv;
          else if (lk === 'crossAlign') raw.layout.cross_align = ALIGN[lv] ?? lv;
          else if (lk === 'wrap') raw.layout.wrap = !!lv;
          else if (lk === 'columns') raw.layout.grid_columns = Number(lv);
          else if (lk === 'rows') raw.layout.grid_rows = Number(lv);
          else throw new Error(`unknown layout key "${lk}" (mode, gap, padding, align, crossAlign, wrap, columns, rows)`);
        }
        break;
      }
      case 'gap': applyProps(raw, { layout: { gap: v } }); break;
      case 'padding': applyProps(raw, { layout: { padding: v } }); break;
      case 'sizing': {
        const cl = childLayout(raw);
        const s = typeof v === 'string' ? { h: v, v } : v;
        if (s.h) cl.sizing_h = s.h;
        if (s.v) cl.sizing_v = s.v;
        if (raw.type === 'text' && (s.h === 'fill' || s.h === 'fixed')) raw.auto_resize = 'height';
        break;
      }
      case 'absolute': childLayout(raw).absolute = !!v; break;
      case 'devStatus': if (v) raw.dev_status = v; else delete raw.dev_status; break;
      case 'description': raw.description = String(v); break;
      default:
        throw new Error(`unknown property "${k}". Known: name x y width height visible opacity clip fill stroke strokeWeight strokeAlign dashes radius shadow blur text fontFamily fontStyle fontWeight fontSize lineHeight letterSpacing textCase textDecoration align autoResize layout gap padding sizing absolute devStatus description`);
    }
  }
  if (raw.type === 'text' && (raw.auto_resize === 'widthAndHeight' || raw.auto_resize === 'height')) {
    const m = measureText(raw);
    if (raw.auto_resize === 'widthAndHeight') raw.width = m.width;
    raw.height = m.height;
  }
  return raw;
}

function textStyle(raw) {
  if (raw.type !== 'text') throw new Error(`#${raw.id} is a ${raw.type}, not text`);
  return (raw.style ??= {});
}

// ---- spec-oriented conventions (read by the manifest) -----------------------------------------
const BIND_RE = /\s*@[A-Za-z_]\w*\.[A-Za-z_]\w*(?::\w+)?/;
const API_RE = /\b(GET|POST|PUT|PATCH|DELETE)\s+\//;

/** Data binding lives in the layer name (`Title @trail.name:string`): visible in FigCraft, survives every save. */
export function setBinding(raw, b) {
  const base = String(raw.name ?? '').replace(BIND_RE, '').trim();
  raw.name = b ? `${base || 'Layer'} @${b.entity}.${b.field}${b.type && b.type !== 'string' ? `:${b.type}` : ''}`.trim() : base;
}

/** The API call a layer triggers (or a screen loads), as a Dev Mode annotation `METHOD /path → Entity`. */
export function setApi(raw, a) {
  const rest = (raw.annotations ?? []).filter(x => !API_RE.test(x.label ?? ''));
  const label = a ? `${String(a.method).toUpperCase()} ${a.path}${a.returns ? ` → ${a.returns}` : ''}` : null;
  raw.annotations = label ? [...rest, { label, properties: [], category: 'development' }] : rest;
  if (!raw.annotations.length) delete raw.annotations;
}

export function addNote(raw, text, category = 'development') {
  raw.annotations = [...(raw.annotations ?? []), { label: String(text), properties: [], category }];
}

/** A prototype interaction on click: navigate to a frame, open a URL, go back, or clear. */
export function setLink(raw, l) {
  if (!l || l.clear) { delete raw.interactions; return; }
  const action = l.back ? { type: 'back' } : l.url ? { type: 'openUrl', url: l.url } : { type: 'navigate', dest: Number(l.dest) };
  raw.interactions = [{ trigger: { type: l.trigger ?? 'onClick' }, actions: [action], transition: { type: l.transition ?? 'dissolve' }, duration_ms: l.durationMs ?? 250, easing: 'easeOut' }];
}
