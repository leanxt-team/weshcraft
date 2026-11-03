// Deterministic HTML/CSS rendering of the FigCraft model: the front prototype pushed to git.
// Every element carries data-node="<id>", the same ids the specs cite, so the web UI can link a
// spec line to the pixel it describes, and the clickable prototype follows FigCraft's own
// prototype connections. When a live FigCraft is attached, its renderer's PNGs and its Dev Mode
// HTML are stored next to this as the visual reference.
import { escapeHtml, round } from '../util/common.mjs';

const px = n => `${round(n, 2)}px`;
const rgba = (hex, a = 1) => {
  if (a >= 1) return hex;
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${round(a, 3)})`;
};

export function paintCss(p, w = 1, h = 1) {
  if (!p) return null;
  if (p.type === 'solid') return rgba(p.hex, p.alpha);
  if (p.type === 'gradient') {
    const stops = p.stops.map(s => `${rgba(s.hex, s.alpha * (p.opacity ?? 1))} ${round(s.position * 100, 2)}%`).join(', ');
    if (p.kind === 'radial') return `radial-gradient(${stops})`;
    if (p.kind === 'angular' || p.kind === 'conic') return `conic-gradient(${stops})`;
    const [fx, fy] = p.from ?? [0.5, 0];
    const [tx, ty] = p.to ?? [0.5, 1];
    const deg = round((Math.atan2((tx - fx) * w, -(ty - fy) * h) * 180) / Math.PI, 2);
    return `linear-gradient(${deg}deg, ${stops})`;
  }
  return null;
}

const ALIGN = { min: 'flex-start', center: 'center', max: 'flex-end', spaceBetween: 'space-between', space_between: 'space-between', spaceAround: 'space-around', space_around: 'space-around', spaceEvenly: 'space-evenly', space_evenly: 'space-evenly', baseline: 'baseline' };
const WEIGHT = { thin: 100, extralight: 200, light: 300, regular: 400, medium: 500, semibold: 600, bold: 700, extrabold: 800, black: 900 };

export function fontWeight(style = '') {
  const s = style.toLowerCase().replace(/[\s-]|italic/g, '');
  return WEIGHT[s] ?? 400;
}

function lineHeightCss(lh) {
  if (!lh || typeof lh !== 'object') return 'normal';
  if (lh.unit === 'percent') return String(round(lh.value / 100, 4));
  if (lh.unit === 'pixels' || lh.unit === 'px') return px(lh.value);
  return 'normal';
}
function letterSpacingCss(ls, size) {
  if (!ls || typeof ls !== 'object' || !ls.value) return null;
  return ls.unit === 'percent' ? px((ls.value / 100) * (size || 16)) : px(ls.value);
}

/** CSS declarations for one node (object form; the spec tables reuse it). */
export function nodeCss(model, n) {
  const parent = model.nodes.get(n.parent);
  const inFlow = parent?.layout && !n.absolute && parent.type !== 'page';
  const css = {};
  if (!inFlow && parent && parent.type !== 'page') { css.position = 'absolute'; css.left = px(n.x); css.top = px(n.y); }
  if (inFlow && parent.layout.mode === 'grid') {
    const sz = n.sizing ?? { h: 'fixed', v: 'fixed' };
    if (sz.h !== 'fill') css.width = px(n.width); else css['justify-self'] = 'stretch';
    if (sz.v !== 'fill' && sz.v !== 'hug') css.height = px(n.height);
    if (sz.v === 'fill') css['align-self'] = 'stretch';
    if (n.grid?.column != null) css['grid-column'] = `${n.grid.column + 1}${n.grid.columnSpan > 1 ? ` / span ${n.grid.columnSpan}` : ''}`;
    if (n.grid?.row != null) css['grid-row'] = `${n.grid.row + 1}${n.grid.rowSpan > 1 ? ` / span ${n.grid.rowSpan}` : ''}`;
  } else if (inFlow) {
    const main = parent.layout.mode === 'vertical' ? 'v' : 'h';
    const sz = n.sizing ?? { h: 'fixed', v: 'fixed' };
    css['flex-shrink'] = '0';
    if (sz[main] === 'fill') { css.flex = '1 1 0'; css['min-' + (main === 'h' ? 'width' : 'height')] = '0'; }
    const cross = main === 'h' ? 'v' : 'h';
    if (sz[cross] === 'fill') css['align-self'] = 'stretch';
    if (sz.h !== 'fill' && sz.h !== 'hug') css.width = px(n.width);
    if (sz.v !== 'fill' && sz.v !== 'hug') css.height = px(n.height);
    if (sz.h === 'hug' && n.type === 'text') css['white-space'] = 'nowrap';
  } else {
    css.width = px(n.width);
    css.height = px(n.height);
  }
  if (n.opacity < 1) css.opacity = String(round(n.opacity, 3));
  if (n.type !== 'text' && !isShape(n)) {
    const bgs = n.fills.slice().reverse().map(f => paintCss(f, n.width, n.height)).filter(Boolean);
    if (bgs.length === 1 && n.fills.at(-1).type === 'solid') css.background = bgs[0];
    else if (bgs.length) css.background = bgs.map(b => (b.includes('gradient') ? b : `linear-gradient(${b}, ${b})`)).join(', ');
    if (n.type === 'ellipse') css['border-radius'] = '50%';
    else if (Array.isArray(n.radius)) css['border-radius'] = n.radius.map(px).join(' ');
    else if (n.radius) css['border-radius'] = px(Math.min(n.radius, Math.max(n.width, n.height)));
    if (n.strokes.length && n.strokeWeight) {
      const s = n.strokes[0];
      const color = paintCss(s);
      css[n.strokeAlign === 'outside' ? 'outline' : 'box-shadow'] = n.strokeAlign === 'outside'
        ? `${px(n.strokeWeight)} solid ${color}`
        : `inset 0 0 0 ${px(n.strokeWeight)} ${color}`;
    }
    const shadows = n.effects.filter(e => e.type === 'dropShadow' || e.type === 'innerShadow').map(e =>
      `${e.type === 'innerShadow' ? 'inset ' : ''}${px(e.offset?.[0] ?? 0)} ${px(e.offset?.[1] ?? 0)} ${px(e.radius ?? 0)} ${px(e.spread ?? 0)} ${rgba(e.color?.hex ?? '#000000', e.color?.alpha ?? 0.25)}`);
    if (shadows.length) css['box-shadow'] = [css['box-shadow'], ...shadows].filter(Boolean).join(', ');
    const blur = n.effects.find(e => e.type === 'backgroundBlur' || e.type === 'layerBlur');
    if (blur) css[blur.type === 'backgroundBlur' ? 'backdrop-filter' : 'filter'] = `blur(${px((blur.radius ?? 0) / 2)})`;
    if (n.clip) css.overflow = 'hidden';
  }
  if (n.layout) {
    const l = n.layout;
    if (l.mode === 'grid') {
      css.display = 'grid';
      css['grid-template-columns'] = `repeat(${l.gridColumns || 1}, minmax(0, 1fr))`;
      css['align-items'] = 'start';
      css.gap = `${px(l.crossGap)} ${px(l.gap)}`;
    } else {
      css.display = 'flex';
      css['flex-direction'] = l.mode === 'vertical' ? 'column' : 'row';
      if (l.wrap) css['flex-wrap'] = 'wrap';
      if (l.mainAlign !== 'min') css['justify-content'] = ALIGN[l.mainAlign] ?? 'flex-start';
      css['align-items'] = ALIGN[l.crossAlign] ?? 'flex-start';
      if (l.gap) css.gap = l.wrap && l.crossGap ? `${px(l.crossGap)} ${px(l.gap)}` : px(l.gap);
    }
    if (l.padding.some(Boolean)) css.padding = l.padding.map(px).join(' ');
    css['box-sizing'] = 'border-box';
    if (n.type !== 'page' && !css.position) css.position = 'relative';
  }
  if (n.text) {
    const t = n.text;
    css['font-family'] = `'${t.fontFamily}', system-ui, sans-serif`;
    css['font-size'] = px(t.fontSize);
    css['font-weight'] = String(fontWeight(t.fontStyle));
    if (/italic/i.test(t.fontStyle)) css['font-style'] = 'italic';
    css['line-height'] = lineHeightCss(t.lineHeight);
    const ls = letterSpacingCss(t.letterSpacing, t.fontSize);
    if (ls) css['letter-spacing'] = ls;
    css['text-align'] = t.align === 'center' ? 'center' : t.align === 'right' ? 'right' : t.align === 'justified' ? 'justify' : 'left';
    const f = n.fills[0];
    if (f) css.color = paintCss(f);
    if (t.case === 'upper') css['text-transform'] = 'uppercase';
    if (t.case === 'lower') css['text-transform'] = 'lowercase';
    if (t.decoration === 'underline') css['text-decoration'] = 'underline';
    if (t.decoration === 'strikethrough') css['text-decoration'] = 'line-through';
    if (!css['white-space']) css['white-space'] = 'pre-wrap';
    if (t.autoResize === 'widthAndHeight' || t.autoResize === 'width_and_height') css['white-space'] = 'pre';
  }
  // Containers anchor their absolutely placed children (FigCraft x/y are parent-relative).
  if (!n.text && !isShape(n) && !css.position) css.position = 'relative';
  if (!n.visible) css.display = 'none';
  return css;
}

const isShape = n => ['vector', 'star', 'polygon', 'line', 'arrow', 'boolean', 'booleanOperation'].includes(n.type);

function vectorPath(net) {
  if (!net?.vertices?.length) return { closed: '', open: '' };
  const V = net.vertices;
  const segs = net.segments || [];
  const seg = (s, reverse) => {
    const [a, b, ta, tb] = reverse ? [s.b, s.a, s.tb, s.ta] : [s.a, s.b, s.ta, s.tb];
    const A = V[a], B = V[b];
    const straight = (!ta || (ta[0] === 0 && ta[1] === 0)) && (!tb || (tb[0] === 0 && tb[1] === 0));
    return { from: a, to: b, d: straight ? `L${round(B.x)} ${round(B.y)}` : `C${round(A.x + ta[0])} ${round(A.y + ta[1])} ${round(B.x + tb[0])} ${round(B.y + tb[1])} ${round(B.x)} ${round(B.y)}` };
  };
  const loops = (net.regions || []).flatMap(r => r.loops || []);
  const closed = [];
  for (const loop of loops) {
    let cur = null, d = '';
    for (const i of loop) {
      const s = segs[i];
      if (!s) continue;
      const fwd = cur == null || s.a === cur;
      const x = seg(s, !fwd);
      if (cur == null) d += `M${round(V[x.from].x)} ${round(V[x.from].y)}`;
      d += x.d;
      cur = x.to;
    }
    if (d) closed.push(`${d}Z`);
  }
  // Segments outside every region are open strokes (lines, curves, icon details).
  const used = new Set(loops.flat());
  let open = '', cur = null;
  segs.forEach((s, i) => {
    if (used.has(i)) return;
    const x = seg(s, false);
    if (cur !== x.from) open += `M${round(V[x.from].x)} ${round(V[x.from].y)}`;
    open += x.d;
    cur = x.to;
  });
  return { closed: closed.join(' '), open };
}

function shapeSvg(n) {
  const w = n.width || 1, h = n.height || 1;
  const fill = n.fills[0];
  let defs = '', fillAttr = 'none';
  if (fill?.type === 'solid') fillAttr = rgba(fill.hex, fill.alpha);
  else if (fill?.type === 'gradient') {
    const id = `g${n.id}`;
    const [fx, fy] = fill.from ?? [0.5, 0];
    const [tx, ty] = fill.to ?? [0.5, 1];
    const stops = fill.stops.map(s => `<stop offset="${s.position}" stop-color="${s.hex}" stop-opacity="${round(s.alpha * (fill.opacity ?? 1), 3)}"/>`).join('');
    defs = fill.kind === 'radial'
      ? `<defs><radialGradient id="${id}">${stops}</radialGradient></defs>`
      : `<defs><linearGradient id="${id}" x1="${fx}" y1="${fy}" x2="${tx}" y2="${ty}">${stops}</linearGradient></defs>`;
    fillAttr = `url(#${id})`;
  }
  const stroke = n.strokes[0];
  const strokeAttr = stroke && n.strokeWeight ? ` stroke="${paintCss(stroke)}" stroke-width="${n.strokeWeight}" stroke-linecap="round" stroke-linejoin="round"` : '';
  let shape = '';
  if (n.type === 'star' || n.type === 'polygon') {
    const count = n.geometry.count || 5, inner = n.type === 'star' ? (n.geometry.innerRatio ?? 0.38) : 1;
    const pts = [];
    const steps = n.type === 'star' ? count * 2 : count;
    for (let i = 0; i < steps; i++) {
      const r = n.type === 'star' && i % 2 ? inner : 1;
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / steps;
      pts.push(`${round(w / 2 + (Math.cos(a) * r * w) / 2)},${round(h / 2 + (Math.sin(a) * r * h) / 2)}`);
    }
    shape = `<polygon points="${pts.join(' ')}" fill="${fillAttr}"${strokeAttr}/>`;
  } else if (n.type === 'line' || n.type === 'arrow') {
    shape = `<line x1="0" y1="0" x2="${w}" y2="0"${strokeAttr || ' stroke="currentColor"'}/>`;
  } else {
    const { closed, open } = vectorPath(n.geometry.network);
    const rule = n.geometry.network?.regions?.[0]?.winding === 'evenOdd' ? 'evenodd' : 'nonzero';
    shape = (closed ? `<path d="${closed}" fill="${fillAttr}" fill-rule="${rule}"${strokeAttr}/>` : '')
      + (open ? `<path d="${open}" fill="none"${strokeAttr}/>` : '');
  }
  return `<svg width="${round(w)}" height="${round(h)}" viewBox="0 0 ${round(w)} ${round(h)}" overflow="visible" aria-hidden="true">${defs}${shape}</svg>`;
}

const styleAttr = css => Object.entries(css).map(([k, v]) => `${k}:${v}`).join(';');

function render(model, id, ctx) {
  const n = model.nodes.get(id);
  if (!n) return '';
  const css = nodeCss(model, n);
  if (ctx.root === id) { delete css.position; delete css.left; delete css.top; css.position = 'relative'; }
  const link = (n.interactions || []).flatMap(i => (i.actions || []).map(a => ({ trigger: i.trigger?.type, ...a })))
    .find(a => a.type === 'navigate' || a.type === 'back' || a.type === 'openUrl' || a.type === 'open_url');
  const attrs = [`data-node="${n.id}"`, `data-name="${escapeHtml(n.name)}"`];
  const lk = ctx.links?.get(n.id);
  if (lk) {
    attrs.push(`data-link="${lk.map(l => l.rel).join(' ')}"`, `data-link-label="${escapeHtml(lk.map(l => l.text).join(' · '))}"`);
    const ops = lk.filter(l => l.op).map(l => l.op);
    const fields = lk.filter(l => l.field).map(l => l.field);
    if (ops.length) attrs.push(`data-op="${escapeHtml(ops.join(' '))}"`);
    if (fields.length) attrs.push(`data-field="${escapeHtml(fields.join(' '))}"`);
  }
  if (link) {
    if (link.type === 'navigate' && ctx.screenOf(link.dest)) attrs.push(`data-go="${ctx.screenOf(link.dest)}"`);
    if (link.type === 'back') attrs.push('data-go="back"');
    if (link.url) attrs.push(`data-href="${escapeHtml(link.url)}"`);
    attrs.push('role="button" tabindex="0"');
    css.cursor = 'pointer';
  }
  if (n.text) return `<div ${attrs.join(' ')} style="${styleAttr(css)}">${escapeHtml(n.text.characters)}</div>`;
  if (isShape(n)) return `<div ${attrs.join(' ')} style="${styleAttr(css)}">${shapeSvg(n)}</div>`;
  const kids = n.children.map(c => render(model, c, ctx)).join('');
  return `<div ${attrs.join(' ')} style="${styleAttr(css)}">${kids}</div>`;
}

/** One screen as an HTML fragment (root element = the screen frame). */
export function renderScreen(model, screenId, screenOf = () => null, links = null) {
  return render(model, screenId, { root: screenId, screenOf, links });
}

/** node id -> [{rel, op|field, text}] for the data overlay. */
function linkIndex(manifest) {
  const ops = new Map(manifest.domain.operations.map(o => [o.key, o]));
  const idx = new Map();
  for (const e of manifest.links?.edges ?? []) {
    const o = e.op && ops.get(e.op);
    const text = o ? `${{ triggers: '▶', submits: '⇢', lists: '☰' }[e.rel]} ${o.method} ${o.path}` : `◉ ${e.field}`;
    idx.set(e.node, [...(idx.get(e.node) ?? []), { rel: e.rel, op: e.op, field: e.field, text }]);
  }
  return idx;
}

/** The clickable prototype: every screen, FigCraft prototype links wired, fonts from Google Fonts. */
export function renderPrototype(model, manifest, { title = manifest.source.name } = {}) {
  const keyById = new Map(manifest.screens.map(s => [s.id, s.key]));
  const screenOf = id => {
    let n = model.nodes.get(id);
    while (n) { if (keyById.has(n.id)) return keyById.get(n.id); n = model.nodes.get(n.parent); }
    return null;
  };
  const fonts = new Set();
  for (const n of model.nodes.values()) if (n.text?.fontFamily) fonts.add(n.text.fontFamily);
  const fontLink = fonts.size
    ? `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${[...fonts].sort().map(f => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:ital,wght@0,100..900;1,100..900`).join('&')}&display=swap">`
    : '';
  const start = manifest.flows[0]?.start ?? manifest.screens[0]?.key;
  const links = linkIndex(manifest);
  const screens = manifest.screens.map(s => `<section class="sc-screen" id="${s.key}" data-screen="${s.key}" aria-label="${escapeHtml(s.name)}"${s.key === start ? '' : ' hidden'}>${renderScreen(model, s.id, screenOf, links)}</section>`).join('\n');
  const tokens = manifest.tokens.variables.filter(v => v.type === 'color');
  const firstMode = v => Object.values(v.values)[0];
  const tokenCss = tokens.length ? `:root{${tokens.map(v => `${v.cssVar}:${firstMode(v)?.hex ?? 'initial'}`).join(';')}}` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — prototype</title>
<meta name="generator" content="weshcraft">
<meta name="color-scheme" content="light dark">
<meta name="weshcraft-source-hash" content="${manifest.source.hash}">
${fontLink}
<style>
${tokenCss}
html,body{margin:0;background:#1e1e1e;min-height:100%}
html.sc-embed,html.sc-embed body{background:transparent}
body{display:flex;flex-direction:column;align-items:center;gap:18px;padding:20px 16px 32px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif}
nav.sc-nav{display:flex;flex-wrap:nowrap;gap:2px;justify-content:flex-start;max-width:calc(100vw - 24px);overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch;padding:4px;border-radius:99px;background:rgba(255,255,255,.14);-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 6px 20px rgba(0,0,0,.18)}
nav.sc-nav::-webkit-scrollbar{display:none}
nav.sc-nav button{flex:none;white-space:nowrap;background:none;color:rgba(255,255,255,.85);border:0;border-radius:99px;padding:6px 13px;font:500 12.5px -apple-system,BlinkMacSystemFont,Inter,system-ui,sans-serif;cursor:pointer}
nav.sc-nav button[aria-current="true"]{background:rgba(255,255,255,.9);color:#1d1d1f;box-shadow:0 1px 4px rgba(0,0,0,.2)}
html.sc-embed nav.sc-nav{background:rgba(255,255,255,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 6px 20px rgba(15,23,42,.1)}
html.sc-embed nav.sc-nav button{color:rgba(60,60,67,.85)}
html.sc-embed nav.sc-nav button[aria-current="true"]{background:#fff;color:#1d1d1f}
@media (prefers-color-scheme:dark){html.sc-embed nav.sc-nav{background:rgba(44,46,54,.55);box-shadow:inset 0 1px 0 rgba(255,255,255,.12),0 6px 20px rgba(0,0,0,.3)}html.sc-embed nav.sc-nav button{color:rgba(235,235,245,.75)}html.sc-embed nav.sc-nav button[aria-current="true"]{background:rgba(255,255,255,.92);color:#1d1d1f}}
.sc-screen{max-width:100%;overflow:visible;border-radius:4px}
.sc-screen>[data-node]{box-shadow:0 1px 2px rgba(0,0,0,.12),0 24px 60px -12px rgba(15,23,42,.35)}
.sc-screen [data-go]:focus-visible{outline:2px solid #0d99ff;outline-offset:2px}
.sc-hl{outline:2px solid #ff3d7f!important;outline-offset:1px}
.sc-hl-op{outline:2px solid #3b82f6!important;outline-offset:1px}
.sc-hl-field{outline:2px solid #10b981!important;outline-offset:1px}
body.sc-data [data-link]{outline:1.5px dashed #10b981;outline-offset:1px}
body.sc-data [data-op]{outline:2px dashed #3b82f6}
body.sc-data [data-link]::after{content:attr(data-link-label);position:absolute;z-index:50;left:0;top:-15px;font:600 9.5px/1.3 ui-monospace,Menlo,monospace;color:#fff;background:#0f766e;padding:1px 5px;border-radius:4px;white-space:nowrap;pointer-events:none;max-width:260px;overflow:hidden;text-overflow:ellipsis}
body.sc-data [data-op]::after{background:#1d4ed8}
body.sc-data [data-link]{position:relative}
nav.sc-nav .sc-toggle{position:sticky;right:0;margin-left:4px;display:inline-flex;align-items:center;gap:6px;background:#2c2c2e!important;box-shadow:-14px 0 12px -4px #2c2c2e}
nav.sc-nav .sc-toggle::before{content:'';width:8px;height:8px;border-radius:50%;box-shadow:inset 0 0 0 1.5px #00a88a}
nav.sc-nav .sc-toggle[aria-pressed="true"]::before{background:#00a88a}
html.sc-embed nav.sc-nav .sc-toggle{background:#f7f8fa!important;box-shadow:-14px 0 12px -4px #f7f8fa}
@media (prefers-color-scheme:dark){html.sc-embed nav.sc-nav .sc-toggle{background:#2b2d34!important;box-shadow:-14px 0 12px -4px #2b2d34}}
@media (max-width:480px){nav.sc-nav button{padding:6px 11px;font-size:12px}}
nav.sc-nav .sc-toggle[aria-pressed="true"]{color:#00a88a!important}
</style>
</head>
<body>
<nav class="sc-nav" aria-label="Screens">${manifest.screens.map(s => `<button type="button" data-show="${s.key}">${escapeHtml(s.name)}</button>`).join('')}${links.size ? '<button type="button" class="sc-toggle" data-overlay aria-pressed="false" title="Show which layers call the back end (▶ ⇢ ☰) or show its data (◉). Shortcut: D">Data links</button>' : ''}</nav>
${screens}
<script>
(() => {
  if (parent !== window) document.documentElement.classList.add('sc-embed');
  // Fit screens wider than the viewport (phones, narrow panes) without changing the design.
  const fit = () => document.querySelectorAll('.sc-screen').forEach(s => {
    const f = s.firstElementChild;
    if (!f) return;
    s.style.zoom = '';
    const w = f.offsetWidth;
    const room = document.documentElement.clientWidth - 32;
    if (w > room && room > 0) s.style.zoom = String(Math.round((room / w) * 1000) / 1000);
  });
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);
  const hist = [];
  const show = (key, push = true) => {
    const cur = document.querySelector('.sc-screen:not([hidden])');
    if (!document.getElementById(key)) return;
    if (cur && push && cur.id !== key) hist.push(cur.id);
    document.querySelectorAll('.sc-screen').forEach(s => { s.hidden = s.id !== key; });
    fit();
    document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-current', String(b.dataset.show === key)));
    if (parent === window && location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    parent !== window && parent.postMessage({ weshcraft: 'screen', key }, '*');
  };
  const overlay = on => {
    document.body.classList.toggle('sc-data', on);
    document.querySelectorAll('[data-overlay]').forEach(b => b.setAttribute('aria-pressed', String(on)));
  };
  document.addEventListener('keydown', e => { if ((e.key === 'd' || e.key === 'D') && !e.target.closest('input,textarea')) overlay(!document.body.classList.contains('sc-data')); });
  document.addEventListener('click', e => {
    const t = e.target.closest('[data-overlay]'); if (t) return overlay(!document.body.classList.contains('sc-data'));
    if (document.body.classList.contains('sc-data')) {
      const l = e.target.closest('[data-link]');
      if (l && parent !== window) { e.preventDefault(); return parent.postMessage({ weshcraft: 'link', node: Number(l.dataset.node), op: l.dataset.op || null, field: l.dataset.field || null }, '*'); }
    }
    const b = e.target.closest('[data-show]'); if (b) return show(b.dataset.show);
    const g = e.target.closest('[data-go],[data-href]'); if (!g) return;
    if (g.dataset.href) return window.open(g.dataset.href, '_blank', 'noopener');
    if (g.dataset.go === 'back') { const k = hist.pop(); if (k) show(k, false); } else show(g.dataset.go);
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-go]')) { e.preventDefault(); e.target.click(); } });
  window.addEventListener('message', e => {
    const m = e.data || {};
    if (m.weshcraft === 'show') show(m.key);
    if (m.weshcraft === 'overlay') overlay(!!m.on);
    if (m.weshcraft === 'highlightMany') {
      document.querySelectorAll('.sc-hl,.sc-hl-op,.sc-hl-field').forEach(x => x.classList.remove('sc-hl', 'sc-hl-op', 'sc-hl-field'));
      let first = null;
      for (const h of m.items || []) {
        const el = document.querySelector('[data-node="' + Number(h.node) + '"]');
        if (!el) continue;
        el.classList.add(h.kind === 'op' ? 'sc-hl-op' : h.kind === 'field' ? 'sc-hl-field' : 'sc-hl');
        const s = el.closest('.sc-screen');
        if (!first && s && (m.screen ? s.id === m.screen : true)) first = el;
      }
      if (first) { const s = first.closest('.sc-screen'); if (s.hidden) show(s.id); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
    if (m.weshcraft === 'highlight') {
      document.querySelectorAll('.sc-hl').forEach(x => x.classList.remove('sc-hl'));
      const el = document.querySelector('[data-node="' + Number(m.node) + '"]');
      if (el) { const s = el.closest('.sc-screen'); if (s && s.hidden) show(s.id); el.classList.add('sc-hl'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
  });
  show(location.hash.slice(1) || ${JSON.stringify(start)}, false);
})();
</script>
</body>
</html>
`;
}
