// wcraft/specs/FUNCTIONS.md: how the product works at a glance. One diagram (who → functions → data,
// with where each function leads), then one short section per function. The other specs link here:
// every screen says which function it belongs to, the API groups its operations by function.
import { mdEscape } from '../util/common.mjs';
import { embedContract, notesBlock } from './contract.mjs';
import { ACTORS } from '../model/functions.mjs';
import { entityAnchor } from './links.mjs';

const NOTES_PLACEHOLDER = '_Product notes: goals, what is out of scope, open questions._';
const mid = s => String(s).replace(/[^A-Za-z0-9_]/g, '_');
const label = s => String(s).replace(/"/g, "'").replace(/[<>]/g, '');

export function functionsContract(manifest) {
  const f = manifest.functions;
  return {
    declared: f.declared,
    functions: f.items.map(x => ({ key: x.key, name: x.name, summary: x.summary, screens: x.screens, operations: x.operations, tools: x.tools, entities: x.entities, next: x.next.map(n => n.to) })),
    unassigned: f.unassigned,
  };
}

/** The diagram, in Mermaid (GitHub renders it). `prefix` is the path from the spec to the specs folder. */
export function functionsMermaid(manifest) {
  const f = manifest.functions;
  const L = ['flowchart LR'];
  const actors = [...new Set(f.items.flatMap(x => x.actors))];
  const entities = [...new Set(f.items.flatMap(x => x.entities.map(e => e.name)))].sort();
  if (actors.length) {
    L.push('  subgraph Who');
    for (const a of actors) L.push(`    actor_${a}(["${ACTORS[a]}"])`);
    L.push('  end');
  }
  L.push('  subgraph Functions');
  for (const x of f.items) L.push(`    ${mid(x.key)}["${label(x.name)}${x.summary ? `<br/><small>${label(x.summary).slice(0, 80)}</small>` : ''}"]`);
  L.push('  end');
  if (entities.length) {
    L.push('  subgraph Data');
    for (const e of entities) L.push(`    ${mid(`ent-${e}`)}[("${label(e)}")]`);
    L.push('  end');
  }
  for (const x of f.items) for (const a of x.actors) L.push(`  actor_${a} --> ${mid(x.key)}`);
  for (const x of f.items) for (const n of x.next) L.push(`  ${mid(x.key)} ==>|leads to| ${mid(n.to)}`);
  for (const x of f.items) for (const e of x.entities) L.push(`  ${mid(x.key)} ${e.access === 'reads' ? '-.->' : '-->'}|${e.access}| ${mid(`ent-${e.name}`)}`);
  return L.join('\n');
}

export function functionsSpec(manifest, { notes } = {}) {
  const f = manifest.functions;
  const scr = new Map(manifest.screens.map(s => [s.key, s]));
  const ops = new Map(manifest.domain.operations.map(o => [o.key, o]));
  const fn = new Map(f.items.map(x => [x.key, x]));
  const tools = new Map((manifest.surface?.mcp?.tools ?? []).map(t => [t.name, t]));
  const eps = new Map((manifest.surface?.api?.endpoints ?? []).map(e => [e.key, e]));
  const L = ['# How the product works', ''];
  L.push(`${f.items.length} function${f.items.length === 1 ? '' : 's'}: ${f.items.map(x => `[${mdEscape(x.name)}](#${x.key})`).join(' · ') || '—'}. Who uses each one, the data it reads and writes, and where it leads. The screen, API and map specs refer to these functions.`);
  L.push('');
  if (!f.declared) {
    L.push('**Suggested.** These functions are grouped from the prototype (flows, sections, navigation, API tags). Name them and give each a purpose (the Functions view, or `weshcraft_edit` {op:"function"}) to make them the product\'s.');
    L.push('');
  }
  if (f.items.length) {
    L.push('```mermaid');
    L.push(functionsMermaid(manifest));
    L.push('```');
    L.push('');
    L.push('Legend: ⇒ leads to (the user moves on to) · → writes · ⇢ reads.');
    L.push('');
  }
  for (const x of f.items) {
    L.push(`<a id="${x.key}"></a>`);
    L.push(`## ${mdEscape(x.name)}`);
    L.push('');
    L.push(x.summary ? mdEscape(x.summary) : '_Purpose not described yet._');
    L.push('');
    L.push('| | |');
    L.push('|---|---|');
    L.push(`| Who | ${x.actors.map(a => ACTORS[a]).join(', ') || '—'} |`);
    if (x.screens.length) L.push(`| Screens | ${x.screens.map(k => `[${mdEscape(scr.get(k).name)}](front/screens/${k}.md)`).join(' → ')} |`);
    if (x.operations.length) L.push(`| Operations | ${x.operations.map(k => `[\`${ops.get(k).method} ${ops.get(k).path}\`](back/api.md#${k})`).join(' · ')} |`);
    if (x.endpoints.length) L.push(`| Public API | ${x.endpoints.map(k => `[\`${eps.get(k).method} ${eps.get(k).path}\`](front/api/${k}.md)`).join(' · ')} |`);
    if (x.tools.length) L.push(`| MCP tools | ${x.tools.map(t => `[\`${t}\`](front/mcp/${tools.get(t).key}.md)`).join(' · ')} |`);
    L.push(`| Data | ${x.entities.map(e => `[${mdEscape(e.name)}](back/domain.md#${entityAnchor(e.name)}) (${e.access})`).join(' · ') || '—'} |`);
    L.push(`| Leads to | ${x.next.map(n => `[${mdEscape(fn.get(n.to).name)}](#${n.to})`).join(' · ') || '—'} |`);
    L.push(`| Code | tag \`@weshcraft ${x.key}\` · [what implements it](TRACE.md) |`);
    L.push('');
  }
  const u = f.unassigned;
  if (u.screens.length || u.operations.length || u.tools.length) {
    L.push('## Not in a function yet');
    L.push('');
    for (const k of u.screens) L.push(`- Screen [${mdEscape(scr.get(k).name)}](front/screens/${k}.md)`);
    for (const k of u.operations) L.push(`- Operation [\`${ops.get(k).method} ${ops.get(k).path}\`](back/api.md#${k})`);
    for (const t of u.tools) L.push(`- MCP tool \`${t}\``);
    L.push('');
  }
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'functions', sourceHash: manifest.source.hash, ...functionsContract(manifest) }));
  L.push('');
  return L.join('\n');
}
