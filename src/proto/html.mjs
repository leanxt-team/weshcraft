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
export function renderScreen(model, screenId, screenOf = () => null) {
  return render(model, screenId, { root: screenId, screenOf });
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
  const screens = manifest.screens.map(s => `<section class="sc-screen" id="${s.key}" data-screen="${s.key}" aria-label="${escapeHtml(s.name)}"${s.key === start ? '' : ' hidden'}>${renderScreen(model, s.id, screenOf)}</section>`).join('\n');
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
<meta name="weshcraft-source-hash" content="${manifest.source.hash}">
${fontLink}
<style>
${tokenCss}
html,body{margin:0;background:#1e1e1e;min-height:100%}
body{display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px 16px;font-family:system-ui,sans-serif}
nav.sc-nav{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
nav.sc-nav button{background:#2c2c2c;color:#e6e6e6;border:1px solid #444;border-radius:6px;padding:6px 10px;font:12px system-ui;cursor:pointer}
nav.sc-nav button[aria-current="true"]{background:#0d99ff;border-color:#0d99ff;color:#fff}
.sc-screen{max-width:100%;overflow:auto}
.sc-screen [data-go]:focus-visible{outline:2px solid #0d99ff;outline-offset:2px}
.sc-hl{outline:2px solid #ff3d7f!important;outline-offset:1px}
</style>
</head>
<body>
<nav class="sc-nav" aria-label="Screens">${manifest.screens.map(s => `<button type="button" data-show="${s.key}">${escapeHtml(s.name)}</button>`).join('')}</nav>
${screens}
<script>
(() => {
  const hist = [];
  const show = (key, push = true) => {
    const cur = document.querySelector('.sc-screen:not([hidden])');
    if (!document.getElementById(key)) return;
    if (cur && push && cur.id !== key) hist.push(cur.id);
    document.querySelectorAll('.sc-screen').forEach(s => { s.hidden = s.id !== key; });
    document.querySelectorAll('[data-show]').forEach(b => b.setAttribute('aria-current', String(b.dataset.show === key)));
    if (location.hash.slice(1) !== key) history.replaceState(null, '', '#' + key);
    parent !== window && parent.postMessage({ weshcraft: 'screen', key }, '*');
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-show]'); if (b) return show(b.dataset.show);
    const g = e.target.closest('[data-go],[data-href]'); if (!g) return;
    if (g.dataset.href) return window.open(g.dataset.href, '_blank', 'noopener');
    if (g.dataset.go === 'back') { const k = hist.pop(); if (k) show(k, false); } else show(g.dataset.go);
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('[data-go]')) { e.preventDefault(); e.target.click(); } });
  window.addEventListener('message', e => {
    const m = e.data || {};
    if (m.weshcraft === 'show') show(m.key);
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
