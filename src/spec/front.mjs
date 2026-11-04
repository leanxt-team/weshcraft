// Front-end specs: one per screen, one per component, plus tokens and navigation flows.
// Every value is read from the model (no guessing); every row cites its node as `#id`.
import { mdEscape, round } from '../util/common.mjs';
import { descendants } from '../model/normalize.mjs';
import { nodeCss, fontWeight } from '../proto/html.mjs';
import { embedContract, notesBlock } from './contract.mjs';
import { screenLinkRows, linkContract } from './links.mjs';
import { functionOfScreen } from '../model/functions.mjs';

const NOTES_PLACEHOLDER = '_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._';

const ref = id => `\`#${id}\``;
const q = s => `“${mdEscape(s)}”`;

// ---- colour / accessibility ------------------------------------------------------------------
function lum(hex) {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return round((x + 0.05) / (y + 0.05), 2);
}
function backdrop(model, id) {
  let n = model.nodes.get(model.nodes.get(id)?.parent);
  while (n) {
    const solid = [...n.fills].reverse().find(f => f.type === 'solid' && f.alpha > 0.5);
    if (solid) return solid.hex;
    const grad = n.fills.find(f => f.type === 'gradient');
    if (grad) return grad.stops[Math.floor(grad.stops.length / 2)].hex;
    if (n.type === 'page') return n.background?.hex ?? '#ffffff';
    n = model.nodes.get(n.parent);
  }
  return '#ffffff';
}

// ---- layout outline --------------------------------------------------------------------------
const SKIP_INSIDE = new Set(['vector', 'star', 'polygon', 'line', 'arrow', 'boolean', 'booleanOperation', 'text', 'ellipse', 'rectangle']);
function layoutLine(n) {
  const parts = [`${n.type}`, `${round(n.width)}×${round(n.height)}`];
  if (n.layout) {
    const l = n.layout;
    parts.push(l.mode === 'grid' ? `grid ${l.gridColumns} cols, gap ${l.crossGap}/${l.gap}` : `auto layout ${l.mode}, gap ${l.gap}`);
    if (l.padding.some(Boolean)) parts.push(`padding ${l.padding.join('/')}`);
    if (l.mode !== 'grid') parts.push(`align ${l.mainAlign}/${l.crossAlign}`);
  }
  if (n.sizing && (n.sizing.h !== 'fixed' || n.sizing.v !== 'fixed')) parts.push(`size ${n.sizing.h}×${n.sizing.v}`);
  if (n.absolute) parts.push('absolute');
  if (n.radius) parts.push(`radius ${Array.isArray(n.radius) ? n.radius.join('/') : n.radius}`);
  if (n.clip) parts.push('clips');
  if (!n.visible) parts.push('hidden');
  return parts.join(' · ');
}
function outline(model, id, depth = 0, max = 7, out = []) {
  const n = model.nodes.get(id);
  if (!n || depth > max) return out;
  out.push(`${'  '.repeat(depth)}- ${ref(n.id)} **${mdEscape(n.name)}** — ${layoutLine(n)}${n.type === 'instance' ? ` → instance of ${mdEscape(model.nodes.get(n.component)?.name ?? n.component)}` : ''}${n.text ? ` — ${q(n.text.characters.slice(0, 60))}${n.text.characters.length > 60 ? '…' : ''}` : ''}`);
  if (n.type === 'instance' && depth > 0) return out; // the component spec owns its insides
  if (!SKIP_INSIDE.has(n.type)) for (const c of n.children) outline(model, c, depth + 1, max, out);
  return out;
}

const css2str = css => Object.entries(css).map(([k, v]) => `  ${k}: ${v};`).join('\n');

// ---- per screen ------------------------------------------------------------------------------
export function screenSpec(model, manifest, screen, { notes, ops = [], code = null, hasRender = false } = {}) {
  const tokenName = id => manifest.tokens.variables.find(v => v.id === id)?.name;
  const screenName = key => manifest.screens.find(s => s.key === key)?.name ?? key;
  const root = model.nodes.get(screen.id);
  const usedTokens = new Set();
  for (const n of [root, ...descendants(model, screen.id)]) for (const v of Object.values(n.bound || {})) { const t = tokenName(v); if (t) usedTokens.add(t); }
  const comps = new Map();
  for (const i of screen.instances) {
    const owner = manifest.components.find(c => c.id === i.component || c.variants.some(v => v.id === i.component));
    if (owner) comps.set(owner.key, owner);
  }
  const opsHere = ops.filter(o => o.screen === screen.key);

  const copyRows = screen.texts.map(t => {
    const n = model.nodes.get(t.id);
    const fg = t.color ?? '#000000';
    const bg = backdrop(model, t.id);
    const ratio = contrast(fg, bg);
    const large = (n.text.fontSize >= 24) || (n.text.fontSize >= 18.66 && fontWeight(n.text.fontStyle) >= 700);
    const ok = ratio >= (large ? 3 : 4.5);
    return { t, n, fg, bg, ratio, ok, large };
  });

  const fn = functionOfScreen(manifest, screen.key);
  const L = [];
  L.push(`# Screen: ${screen.name}`);
  L.push('');
  L.push(`| | |\n|---|---|\n| Function | ${fn ? `[${mdEscape(fn.name)}](../../FUNCTIONS.md#${fn.key})${fn.summary ? ` — ${mdEscape(fn.summary)}` : ''}` : 'not in a function yet ([functions](../../FUNCTIONS.md))'} |\n| Node | ${ref(screen.id)} |\n| Page | ${mdEscape(screen.page)}${screen.section ? ` / ${mdEscape(screen.section)}` : ''} |\n| Frame | ${screen.width} × ${screen.height} px |\n| Dev status | ${screen.devStatus ?? 'not marked'} |\n| Fingerprint | \`${screen.fingerprint}\` |\n| Prototype | [prototype/index.html#${screen.key}](../../prototype/index.html#${screen.key})${hasRender ? ` · [FigCraft render](../../prototype/screens/${screen.key}.png)` : ''} |`);
  L.push('');
  L.push('## Purpose');
  L.push('');
  const inbound = manifest.screens.flatMap(s => s.actions.filter(a => a.destScreen === screen.key).map(a => `${q(a.label || a.name)} on ${s.name}`));
  L.push(`${screen.name} is reached from ${inbound.length ? inbound.join(', ') : manifest.flows.some(f => f.start === screen.key) ? 'the start of the flow' : 'outside the prototyped flows'}. It shows ${screen.texts.length} text layers, ${screen.instances.length} component instances and ${screen.actions.length} interactions.`);
  L.push('');
  L.push('## Layout');
  L.push('');
  L.push('Hierarchy, sizes and auto layout exactly as designed (px). Instances are specified in their component spec.');
  L.push('');
  L.push(...outline(model, screen.id));
  L.push('');
  L.push('Root frame CSS (generated from the prototype):');
  L.push('');
  L.push('```css');
  L.push(`.${screen.key} {\n${css2str({ ...nodeCss(model, root), position: 'relative' })}\n}`);
  L.push('```');
  L.push('');
  L.push('## Copy');
  L.push('');
  L.push('Shown verbatim. Typography and colour per layer; contrast is WCAG 2.1 against the nearest filled ancestor.');
  L.push('');
  L.push('| Node | Layer | Text | Typography | Colour | Contrast |');
  L.push('|---|---|---|---|---|---|');
  for (const { t, n, fg, bg, ratio, ok, large } of copyRows) {
    L.push(`| ${ref(t.id)} | ${mdEscape(t.name)} | ${mdEscape(t.characters)} | ${mdEscape(n.text.fontFamily)} ${mdEscape(n.text.fontStyle)} ${n.text.fontSize}px / ${n.text.lineHeight?.value ?? 'auto'}${n.text.lineHeight?.unit === 'percent' ? '%' : ''} | ${fg}${t.token ? ` (\`${t.token}\`)` : ''} on ${bg} | ${ratio}:1 ${ok ? '✅' : `⚠️ below ${large ? '3' : '4.5'}:1`} |`);
  }
  if (!copyRows.length) L.push('| — | — | (no text) | | | |');
  L.push('');
  L.push('## Components');
  L.push('');
  if (screen.instances.length) {
    L.push('| Node | Instance | Component | Props |');
    L.push('|---|---|---|---|');
    for (const i of screen.instances) {
      const owner = manifest.components.find(c => c.id === i.component || c.variants.some(v => v.id === i.component));
      const variant = model.nodes.get(i.component)?.name;
      L.push(`| ${ref(i.id)} | ${mdEscape(i.name)} | ${owner ? `[${mdEscape(owner.name)}](../components/${owner.key}.md)` : mdEscape(variant ?? String(i.component))}${owner?.kind === 'set' && variant ? ` · ${mdEscape(variant)}` : ''} | ${mdEscape(JSON.stringify(i.props))} |`);
    }
  } else L.push('No component instances.');
  L.push('');
  L.push('## Interactions');
  L.push('');
  if (screen.actions.length) {
    L.push('| Node | Element | Trigger | Action | Destination | Transition |');
    L.push('|---|---|---|---|---|---|');
    for (const a of screen.actions) {
      L.push(`| ${ref(a.id)} | ${mdEscape(a.label || a.name)} | ${a.trigger} | ${a.type} | ${a.destScreen ? `[${mdEscape(screenName(a.destScreen))}](${a.destScreen}.md)` : a.url ? mdEscape(a.url) : a.dest ?? '—'} | ${a.transition && a.transition !== 'instant' ? `${a.transition}${a.durationMs ? ` ${a.durationMs} ms` : ''}` : 'instant'} |`);
    }
  } else L.push('No prototype interactions on this screen.');
  L.push('');
  L.push('## Inputs');
  L.push('');
  if (screen.inputs.length) {
    L.push('| Node | Field | Kind | Placeholder / default | Validation |');
    L.push('|---|---|---|---|---|');
    for (const i of screen.inputs) L.push(`| ${ref(i.id)} | ${mdEscape(i.name)} | ${i.kind} | ${mdEscape(i.placeholder)} | ${i.kind === 'email' ? 'RFC 5322 address, required' : i.kind === 'password' ? 'required, min 8 chars (confirm)' : 'confirm with product'} |`);
  } else L.push('No input fields detected.');
  L.push('');
  L.push('## Front ⇄ back links');
  L.push('');
  const linkRows = screenLinkRows(manifest, screen.key);
  if (linkRows.length) {
    L.push('Where this screen meets the back end (full map: [LINKS.md](../../LINKS.md)). ▶ triggers · ⇢ submits · ☰ filled by · ◉ shows.');
    L.push('');
    L.push('| Layer | Element | Link | Back end | |');
    L.push('|---|---|---|---|---|');
    for (const { e, target, extra } of linkRows) L.push(`| ${ref(e.node)} | ${mdEscape(e.label)} | ${{ triggers: '▶ triggers', submits: '⇢ submits to', lists: '☰ filled by', displays: '◉ shows' }[e.rel]} | ${target} | ${extra} |`);
    for (const g of manifest.links.gaps.filter(x => x.screen === screen.key)) { L.push(''); L.push(`⚠️ Gap: ${mdEscape(g.message)}.`); }
  } else L.push('This screen has no back-end link (static content or navigation only).');
  L.push('');
  L.push('## Design tokens used');
  L.push('');
  L.push(usedTokens.size ? [...usedTokens].sort().map(t => `\`${t}\``).join(', ') : 'None bound; raw colours: ' + screen.colors.join(', '));
  L.push('');
  if (screen.annotations.length) {
    L.push('## Designer annotations');
    L.push('');
    for (const a of screen.annotations) L.push(`- ${ref(a.id)} ${mdEscape(a.name)} (${a.category ?? 'note'}): ${mdEscape(a.label)}`);
    L.push('');
  }
  L.push('## Acceptance criteria');
  L.push('');
  let k = 1;
  L.push(`${k++}. Renders at ${screen.width} × ${screen.height} px with the hierarchy, spacing and sizes in §Layout; a pixel comparison with the prototype render shows no difference above the project tolerance.`);
  L.push(`${k++}. Every text in §Copy is shown verbatim with its typography and colour.`);
  for (const a of screen.actions) {
    L.push(`${k++}. ${a.trigger === 'onClick' ? 'Activating' : `On ${a.trigger},`} ${q(a.label || a.name)} (${ref(a.id)}) ${a.type === 'navigate' ? `navigates to ${screenName(a.destScreen)}` : a.type === 'back' ? 'goes back to the previous screen' : a.type}${a.transition && a.transition !== 'instant' ? ` with a ${a.transition} transition${a.durationMs ? ` of ${a.durationMs} ms` : ''}` : ''}; it is reachable by keyboard and announced as a button.`);
  }
  for (const o of opsHere.filter(o => o.trigger)) L.push(`${k++}. Activating ${ref(o.trigger)} calls \`${o.method} ${o.path}\`; while pending the control is disabled; on error the screen stays and shows the error.`);
  for (const o of opsHere.filter(o => o.kind === 'list')) L.push(`${k++}. The list built from ${o.sources.map(ref).join(', ')} is filled from \`${o.method} ${o.path}\`, with loading and empty states.`);
  const bad = copyRows.filter(r => !r.ok);
  if (bad.length) L.push(`${k++}. Contrast: ${bad.map(r => ref(r.t.id)).join(', ')} ${bad.length > 1 ? 'are' : 'is'} below WCAG AA in the design; keep as designed or fix in the design first (the spec follows the prototype).`);
  L.push('');
  if (code) {
    L.push('## FigCraft Dev Mode code');
    L.push('');
    L.push('```html');
    L.push(code.trim());
    L.push('```');
    L.push('');
  }
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({
    kind: 'front-screen', key: screen.key, node: screen.id, fingerprint: screen.fingerprint, sourceHash: manifest.source.hash,
    function: fn?.key ?? null,
    size: [screen.width, screen.height],
    copy: screen.texts.map(t => ({ node: t.id, text: t.characters })),
    actions: screen.actions.map(a => ({ node: a.id, type: a.type, dest: a.destScreen })),
    instances: screen.instances.map(i => ({ node: i.id, component: i.component })),
    inputs: screen.inputs.map(i => i.id),
    operations: opsHere.map(o => o.key),
    links: linkContract({ edges: manifest.links.edges.filter(e => e.screen === screen.key) }),
    components: [...comps.keys()].sort(),
  }));
  L.push('');
  return L.join('\n');
}

// ---- per component ---------------------------------------------------------------------------
function variantProps(name) {
  const out = {};
  for (const part of String(name).split(',')) {
    const [k, v] = part.split('=').map(s => s?.trim());
    if (k && v) out[k] = v;
  }
  return out;
}

export function componentSpec(model, manifest, comp, { notes, code = null } = {}) {
  const node = model.nodes.get(comp.id);
  const L = [];
  L.push(`# Component: ${comp.name}`);
  L.push('');
  L.push(`| | |\n|---|---|\n| Node | ${ref(comp.id)} |\n| Kind | ${comp.kind === 'set' ? `component set, ${comp.variants.length} variants` : 'component'} |\n| Size | ${node.width} × ${node.height} px |\n| Used in | ${comp.usedIn.length ? comp.usedIn.map(k => `[${mdEscape(manifest.screens.find(s => s.key === k)?.name)}](../screens/${k}.md)`).join(', ') : 'not used on any screen'} |\n| Fingerprint | \`${comp.fingerprint}\` |`);
  L.push('');
  if (comp.description) { L.push(comp.description); L.push(''); }
  L.push('## Properties');
  L.push('');
  const axes = {};
  for (const v of comp.variants) for (const [k, val] of Object.entries(variantProps(v.name))) (axes[k] ??= new Set()).add(val);
  const defs = node.propDefs && typeof node.propDefs === 'object' ? node.propDefs : {};
  if (Object.keys(axes).length || Object.keys(defs).length) {
    L.push('| Property | Type | Values / default |');
    L.push('|---|---|---|');
    for (const [k, vals] of Object.entries(axes)) L.push(`| ${mdEscape(k)} | variant | ${[...vals].map(v => `\`${mdEscape(v)}\``).join(', ')} |`);
    for (const [k, d] of Object.entries(defs)) L.push(`| ${mdEscape(k.replace(/#.*$/, ''))} | ${mdEscape(d?.type ?? typeof d)} | ${mdEscape(JSON.stringify(d?.default ?? d?.value ?? d))} |`);
  } else L.push('No exposed properties.');
  L.push('');
  if (comp.variants.length) {
    L.push('## Variants');
    L.push('');
    L.push('| Node | Variant | Size | Visual |');
    L.push('|---|---|---|---|');
    for (const v of comp.variants) {
      const vn = model.nodes.get(v.id);
      const css = nodeCss(model, vn);
      L.push(`| ${ref(v.id)} | ${mdEscape(v.name)} | ${v.width} × ${v.height} | ${mdEscape([css.background, css['box-shadow'], css['border-radius'] && `radius ${css['border-radius']}`].filter(Boolean).join('; ') || '—')} |`);
    }
    L.push('');
  }
  L.push('## Anatomy');
  L.push('');
  L.push(...outline(model, comp.variants[0]?.id ?? comp.id, 0, 6));
  L.push('');
  L.push('## Styles');
  L.push('');
  L.push('```css');
  for (const target of comp.variants.length ? comp.variants : [{ id: comp.id, name: comp.name }]) {
    const css = nodeCss(model, model.nodes.get(target.id));
    delete css.position; delete css.left; delete css.top;
    L.push(`/* ${target.name} (#${target.id}) */\n.${comp.key}${comp.variants.length ? `[data-variant="${target.name.replace(/"/g, '')}"]` : ''} {\n${css2str(css)}\n}`);
  }
  L.push('```');
  L.push('');
  if (code) { L.push('## FigCraft Dev Mode code (React)'); L.push(''); L.push('```tsx'); L.push(code.trim()); L.push('```'); L.push(''); }
  L.push('## Acceptance criteria');
  L.push('');
  L.push(`1. Every variant above renders with the listed size and styles${comp.variants.length ? '; the variant is selected only through the listed properties' : ''}.`);
  L.push('2. Interactive variants (hover, pressed, disabled, selected) are reachable by pointer and keyboard; disabled ignores input.');
  L.push('3. Text content comes from properties, never hard-coded, where the design exposes a property.');
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'front-component', key: comp.key, node: comp.id, fingerprint: comp.fingerprint, sourceHash: manifest.source.hash, variants: comp.variants.map(v => v.id) }));
  L.push('');
  return L.join('\n');
}

// ---- tokens and flows ------------------------------------------------------------------------
const fmtVal = v => (v && typeof v === 'object' ? (v.hex ? `${v.hex}${v.alpha < 1 ? ` @${v.alpha}` : ''}` : v.alias ? `→ ${v.alias}` : JSON.stringify(v)) : String(v));

export function tokensSpec(manifest, { notes } = {}) {
  const { collections, variables } = manifest.tokens;
  const L = ['# Design tokens', ''];
  if (!variables.length) {
    L.push('The prototype defines no variables. Raw colours per screen are listed in each screen spec; consider creating tokens (WeshCraft: Tokens panel or `design_tokens`; FigCraft: `variable.create`) so code and design share names.');
  } else {
    for (const c of collections) {
      L.push(`## ${c.name}`);
      L.push('');
      L.push(`| Token | CSS variable | ${c.modes.join(' | ')} |`);
      L.push(`|---|---|${c.modes.map(() => '---').join('|')}|`);
      for (const v of variables.filter(x => x.id && x.values && Object.keys(x.values).some(k => k.startsWith(`${c.name}/`)))) {
        L.push(`| \`${v.name}\` | \`${v.cssVar}\` | ${c.modes.map(m => mdEscape(fmtVal(v.values[`${c.name}/${m}`]))).join(' | ')} |`);
      }
      L.push('');
    }
    L.push('CSS custom properties are generated in [`tokens.css`](tokens.css); the first mode of each collection is the default, other modes apply under `[data-<collection>="<mode>"]`.');
  }
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'front-tokens', sourceHash: manifest.source.hash, tokens: variables.map(v => ({ name: v.name, values: v.values })) }));
  L.push('');
  return L.join('\n');
}

export function tokensCss(manifest) {
  const { collections, variables } = manifest.tokens;
  const val = v => (v && typeof v === 'object' ? (v.hex ? (v.alpha < 1 ? `${v.hex}${Math.round(v.alpha * 255).toString(16).padStart(2, '0')}` : v.hex) : 'initial') : typeof v === 'number' ? `${v}px` : JSON.stringify(v));
  const out = ['/* Generated by WeshCraft from the FigCraft prototype. Do not edit; change the design. */'];
  for (const c of collections) {
    c.modes.forEach((m, i) => {
      const sel = i === 0 ? ':root' : `[data-${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}="${m.toLowerCase()}"]`;
      const lines = variables.filter(v => `${c.name}/${m}` in v.values).map(v => `  ${v.cssVar}: ${val(v.values[`${c.name}/${m}`])};`);
      if (lines.length) out.push(`${sel} {\n${lines.join('\n')}\n}`);
    });
  }
  return `${out.join('\n\n')}\n`;
}

export function flowsSpec(manifest, { notes } = {}) {
  const L = ['# Navigation and flows', ''];
  const edges = manifest.screens.flatMap(s => s.actions.filter(a => a.destScreen).map(a => ({ from: s.key, to: a.destScreen, label: a.label || a.name, node: a.id, transition: a.transition })));
  L.push('```mermaid');
  L.push('flowchart LR');
  // Screens grouped by product function (FUNCTIONS.md)
  const fns = manifest.functions?.items ?? [];
  for (const f of fns.filter(x => x.screens.length)) {
    L.push(`  subgraph ${f.key.replace(/-/g, '_')}["${f.name.replace(/"/g, "'")}"]`);
    for (const k of f.screens) { const s = manifest.screens.find(x => x.key === k); L.push(`    ${s.key.replace(/-/g, '_')}["${s.name.replace(/"/g, "'")}"]`); }
    L.push('  end');
  }
  for (const s of manifest.screens.filter(x => !fns.some(f => f.screens.includes(x.key)))) L.push(`  ${s.key.replace(/-/g, '_')}["${s.name.replace(/"/g, "'")}"]`);
  for (const e of edges) L.push(`  ${e.from.replace(/-/g, '_')} -- "${e.label.replace(/"/g, "'").slice(0, 30)}" --> ${e.to.replace(/-/g, '_')}`);
  L.push('```');
  L.push('');
  if (manifest.flows.length) {
    L.push('| Flow | Starts at | Description |');
    L.push('|---|---|---|');
    for (const f of manifest.flows) L.push(`| ${mdEscape(f.name)} | ${f.start ? `[${mdEscape(manifest.screens.find(s => s.key === f.start)?.name)}](screens/${f.start}.md)` : '—'} | ${mdEscape(f.description) || '—'} |`);
    L.push('');
  }
  L.push('| From | Element | To | Transition |');
  L.push('|---|---|---|---|');
  for (const e of edges) L.push(`| ${mdEscape(manifest.screens.find(s => s.key === e.from).name)} | ${ref(e.node)} ${mdEscape(e.label)} | ${mdEscape(manifest.screens.find(s => s.key === e.to).name)} | ${e.transition ?? 'instant'} |`);
  if (!edges.length) L.push('| — | — | — | — |');
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'front-flows', sourceHash: manifest.source.hash, edges: edges.map(e => ({ from: e.from, to: e.to, node: e.node })) }));
  L.push('');
  return L.join('\n');
}
