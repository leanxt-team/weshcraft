// Front ⇄ back traceability: which layer triggers which operation, what it submits, which layers
// an operation fills, which layers show which entity field, and the gaps between them.
import { mdEscape } from '../util/common.mjs';
import { embedContract, notesBlock } from './contract.mjs';

const ref = id => (typeof id === 'number' ? `\`#${id}\`` : `\`${String(id).replace(/^(tool|ep):/, '')}\``);
const REL = { triggers: 'triggers', submits: 'submits', lists: 'is filled by', displays: 'shows', invokes: 'MCP tool calls it', exposes: 'public endpoint' };
const ICON = { triggers: '▶', submits: '⇢', lists: '☰', displays: '◉', invokes: '⚙', exposes: '↗' };
const SURFACE = { mcp: 'MCP tools', api: 'Public API' };
export const entityAnchor = name => `entity-${String(name).toLowerCase()}`;
const nodeId = s => s.replace(/[^A-Za-z0-9_]/g, '_');

export function linkContract(links) {
  return links.edges.map(e => ({ rel: e.rel, node: e.node, ...(e.op ? { op: e.op } : { field: e.field }) }));
}

/** Rows for one screen spec (front side of the links). */
export function screenLinkRows(manifest, screenKey) {
  const ops = new Map(manifest.domain.operations.map(o => [o.key, o]));
  return manifest.links.edges.filter(e => e.screen === screenKey).map(e => {
    if (e.op) {
      const o = ops.get(e.op);
      return { e, target: `[\`${o.method} ${o.path}\`](../../back/api.md#${o.key})`, extra: o.entity ? `returns \`${o.entity}${o.kind === 'list' ? '[]' : ''}\`` : '' };
    }
    const [entity] = e.field.split('.');
    const via = e.via && ops.get(e.via);
    return { e, target: `[\`${e.field}\`](../../back/domain.md#${entityAnchor(entity)})`, extra: via ? `loaded by [\`${via.method} ${via.path}\`](../../back/api.md#${via.key})` : '⚠️ no operation loads it' };
  });
}

export function linksSpec(manifest, { notes } = {}) {
  const { edges, gaps } = manifest.links;
  const ops = manifest.domain.operations;
  const screenName = k => manifest.screens.find(s => s.key === k)?.name ?? k;
  const L = ['# Front ⇄ back links', ''];
  L.push(`Every place where the prototype meets the back end: ${edges.filter(e => e.op).length} operation links and ${edges.filter(e => e.field).length} data links across ${new Set(edges.map(e => e.screen)).size} screens. ${gaps.length ? `**${gaps.length} gap${gaps.length > 1 ? 's' : ''}** (below).` : 'No gaps.'}`);
  L.push('');
  L.push('Legend: ▶ triggers an operation · ⇢ submits a request field · ☰ list filled by an operation · ◉ shows an entity field · ⚙ MCP tool calls it · ↗ public endpoint.');
  L.push('');
  if (edges.length) {
    L.push('## Map');
    L.push('');
    L.push('```mermaid');
    L.push('flowchart LR');
    L.push('  subgraph Front[Front end]');
    for (const s of manifest.screens.filter(s => edges.some(e => e.screen === s.key))) L.push(`    ${nodeId(s.key)}["${s.name.replace(/"/g, "'")}"]`);
    for (const [k, name] of Object.entries(SURFACE)) if (edges.some(e => e.screen === k)) L.push(`    ${nodeId(`surface_${k}`)}["${name}"]`);
    L.push('  end');
    L.push('  subgraph API');
    for (const o of ops) L.push(`    ${nodeId(o.key)}["${o.method} ${o.path}"]`);
    L.push('  end');
    L.push('  subgraph Domain');
    for (const e of manifest.domain.entities) L.push(`    ${nodeId(`ent-${e.name}`)}[("${e.name}")]`);
    L.push('  end');
    const seen = new Set();
    const line = (a, arrow, b, label) => { const k = `${a}${arrow}${b}${label}`; if (!seen.has(k)) { seen.add(k); L.push(`  ${a} ${arrow}${label ? `|${label}|` : ''} ${b}`); } };
    for (const o of ops) {
      if (o.screen && !SURFACE[o.screen]) line(nodeId(o.screen), o.kind === 'list' ? '<-.->' : '-->', nodeId(o.key), o.kind === 'list' ? 'list' : 'calls');
      for (const k of Object.keys(SURFACE)) if (edges.some(e => e.screen === k && e.op === o.key)) line(nodeId(`surface_${k}`), '-->', nodeId(o.key), 'calls');
      if (o.entity) line(nodeId(o.key), '-->', nodeId(`ent-${o.entity}`), 'returns');
    }
    for (const e of edges.filter(x => x.field)) line(nodeId(`ent-${e.field.split('.')[0]}`), '-.->', nodeId(e.screen), 'shown on');
    L.push('```');
    L.push('');
  }
  L.push('## Operations → front end');
  L.push('');
  if (!ops.length) L.push('No operations. Give a layer an API call (WeshCraft: Spec section › Calls, or `design_api`; FigCraft: a `METHOD /path` annotation) to add one.');
  for (const o of ops) {
    const mine = edges.filter(e => e.op === o.key);
    L.push(`### [\`${o.method} ${o.path}\`](back/api.md#${o.key}) — ${mdEscape(o.name)}`);
    L.push('');
    L.push(`${SURFACE[o.screen] ? `${SURFACE[o.screen]}: [\`${o.method} ${o.path}\`](front/api/${o.endpoint}.md)` : `Screen: [${mdEscape(screenName(o.screen))}](front/screens/${o.screen}.md)`} · ${o.kind} · ${o.confidence}${o.entity ? ` · returns [\`${o.entity}${o.kind === 'list' ? '[]' : ''}\`](back/domain.md#${entityAnchor(o.entity)})` : ''}`);
    L.push('');
    L.push('| Link | Layer | Element |');
    L.push('|---|---|---|');
    for (const e of mine) L.push(`| ${ICON[e.rel]} ${REL[e.rel]} | ${ref(e.node)} | ${mdEscape(e.label)} |`);
    if (o.entity) for (const e of edges.filter(x => x.field?.startsWith(`${o.entity}.`) && x.via === o.key)) L.push(`| ${ICON.displays} response \`${e.field}\` shown | ${ref(e.node)} | ${mdEscape(e.label)} |`);
    if (!mine.length) L.push('| — | — | not reached from any layer |');
    L.push('');
  }
  L.push('## Domain → front end');
  L.push('');
  if (!manifest.domain.entities.length) L.push('No entity is shown. Bind a layer to data (WeshCraft: Spec section › Shows, or `design_bind`; FigCraft: `{{entity.field}}` in text) to add one.');
  for (const ent of manifest.domain.entities) {
    L.push(`### [${ent.name}](back/domain.md#${entityAnchor(ent.name)})`);
    L.push('');
    L.push('| Field | Shown by | Screens | Loaded by |');
    L.push('|---|---|---|---|');
    for (const f of ent.fields) {
      const shown = edges.filter(e => e.field === `${ent.name}.${f.name}`);
      const screens = [...new Set(shown.map(e => e.screen))];
      const via = [...new Set(shown.map(e => e.via))].map(k => ops.find(o => o.key === k)).map(o => (o ? `[\`${o.method} ${o.path}\`](back/api.md#${o.key})` : '⚠️ nothing'));
      L.push(`| \`${f.name}\` | ${shown.map(e => ref(e.node)).join(' ') || '—'} | ${screens.map(k => `[${mdEscape(screenName(k))}](front/screens/${k}.md)`).join(', ') || '—'} | ${via.join(', ') || '—'} |`);
    }
    L.push('');
  }
  L.push('## Gaps');
  L.push('');
  if (!gaps.length) L.push('None: every field shown is loaded by an operation on its screen, and every operation is reached from a layer.');
  for (const g of gaps) L.push(`- ${g.kind === 'unloaded-data' ? `⚠️ ${ref(g.node)} on [${mdEscape(screenName(g.screen))}](front/screens/${g.screen}.md):` : '⚠️'} ${mdEscape(g.message)}.`);
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, '_No notes yet._'));
  L.push('');
  L.push(embedContract({ kind: 'links', sourceHash: manifest.source.hash, edges: linkContract(manifest.links), gaps: gaps.length }));
  L.push('');
  return L.join('\n');
}
