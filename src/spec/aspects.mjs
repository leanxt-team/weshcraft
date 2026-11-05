// The product's other aspects, one spec each, next to FUNCTIONS.md:
//   specs/LOGIC.md         rules and state machines
//   specs/DATA.md          entities, relations, who reads / writes / shows them (fields in back/domain.md)
//   specs/API.md           operations, public endpoints and MCP tools by function (details in back/api.md, front/api, front/mcp)
//   specs/ARCHITECTURE.md  components and how they talk
// Each carries a contract (checked by parity) and a Notes block (decisions, open questions).
import { mdEscape } from '../util/common.mjs';
import { embedContract, notesBlock } from './contract.mjs';
import { entityAnchor } from './links.mjs';
import { entityOfOperation } from '../model/aspects.mjs';
import { matchTech, techFacts } from '../web/public/techcatalog.js';

const mid = s => String(s).replace(/[^A-Za-z0-9_]/g, '_');
const q = s => String(s).replace(/"/g, "'").replace(/[<>|]/g, ' ');
const opLabel = o => `${o.method} ${o.path}`;

/** Links to an element id from a spec at specs/<file>. */
function elementLink(m, id) {
  const op = m.domain.operations.find(o => o.key === id);
  if (op) return `[\`${opLabel(op)}\`](back/api.md#${op.key})`;
  if (id.startsWith('entity:')) return `[${mdEscape(id.slice(7))}](back/domain.md#${entityAnchor(id.slice(7))})`;
  if (id.startsWith('field:')) { const [e, f] = id.slice(6).split('.'); return `[\`${e}.${f}\`](back/domain.md#${entityAnchor(e)})`; }
  if (id.startsWith('tool:')) { const t = m.surface?.mcp?.tools.find(x => x.name === id.slice(5)); return t ? `[\`${t.name}\`](front/mcp/${t.key}.md)` : `\`${id.slice(5)}\``; }
  const fn = m.functions?.items.find(f => f.key === id);
  if (fn) return `[${mdEscape(fn.name)}](FUNCTIONS.md#${fn.key})`;
  const s = m.screens.find(x => x.key === id);
  if (s) return `[${mdEscape(s.name)}](front/screens/${s.key}.md)`;
  const c = m.components.find(x => x.key === id);
  if (c) return `[${mdEscape(c.name)}](front/components/${c.key}.md)`;
  return `\`${id}\``;
}
const notes = (L, n, ph) => { L.push('## Notes', '', notesBlock(n, ph), ''); };

// ---- LOGIC.md ----
export const logicContract = m => ({
  declared: m.logic.declared,
  rules: m.logic.rules.map(r => ({ key: r.key, name: r.name, kind: r.kind, text: r.text, applies: r.applies, source: r.source })),
  machines: m.logic.machines.map(x => ({ key: x.key, entity: x.entity, field: x.field, states: x.states, initial: x.initial, transitions: x.transitions.map(t => [t.from, t.to, t.via]), source: x.source })),
});

export function logicSpec(m, { notes: n } = {}) {
  const l = m.logic;
  const L = ['# Logic', ''];
  L.push(`What the screens and the API cannot show: ${l.rules.length} rule${l.rules.length === 1 ? '' : 's'} and ${l.machines.length} lifecycle${l.machines.length === 1 ? '' : 's'}. ${l.declared ? '' : 'Nothing is declared yet: what follows is inferred from the design and the API (required fields, status values, operations). Declare rules and lifecycles in the Logic view or with `weshcraft_edit` {op:"rule"} / {op:"lifecycle"}.'}`.trim());
  L.push('');
  if (l.machines.length) {
    L.push('## Lifecycles', '');
    for (const x of l.machines) {
      L.push(`<a id="${x.key}"></a>`, `### ${mdEscape(x.entity)}.${mdEscape(x.field)}${x.source === 'inferred' ? ' (inferred)' : ''}`, '');
      L.push('```mermaid', 'flowchart LR', `  start(["start"]) --> ${mid(`s_${x.initial}`)}`);
      for (const s of x.states) L.push(`  ${mid(`s_${s}`)}(["${q(s)}"])`);
      for (const t of x.transitions) {
        const froms = t.from === '*' ? x.states.filter(s => s !== t.to) : [t.from];
        for (const f of froms) L.push(`  ${mid(`s_${f}`)} -->${t.via ? `|${q(t.via)}|` : ''} ${mid(`s_${t.to}`)}`);
      }
      L.push('```', '');
      L.push(`States: ${x.states.map(s => `\`${s}\``).join(' → ')} (starts as \`${x.initial}\`${x.create ? `, on [\`${x.create.via}\`](back/api.md#${x.create.op})` : ''}).`, '');
      if (x.transitions.length) {
        L.push('| From | To | Through |', '|---|---|---|');
        for (const t of x.transitions) L.push(`| ${t.from === '*' ? 'any' : `\`${t.from}\``} | \`${t.to}\` | ${t.op ? elementLink(m, t.op) : mdEscape(t.via || '—')} |`);
        L.push('');
      }
      if (x.unresolved?.length) L.push(`Open: ${x.unresolved.map(u => `[\`${u.via}\`](back/api.md#${u.op})`).join(', ')} change${x.unresolved.length === 1 ? 's' : ''} ${mdEscape(x.entity)} but no state says to what: declare the transition.`, '');
    }
  }
  if (l.rules.length) {
    L.push('## Rules', '');
    for (const kind of ['validation', 'permission', 'calculation', 'policy', 'event']) {
      const list = l.rules.filter(r => r.kind === kind);
      if (!list.length) continue;
      L.push(`### ${kind[0].toUpperCase()}${kind.slice(1)}`, '', '| Rule | Details | Applies to |', '|---|---|---|');
      for (const r of list) L.push(`| <a id="${r.key}"></a>${mdEscape(r.name)}${r.source === 'inferred' ? ' _(inferred)_' : ''} | ${mdEscape(r.text || '—')} | ${r.applies.map(id => elementLink(m, id)).join(' · ') || '—'} |`);
      L.push('');
    }
  }
  if (!l.rules.length && !l.machines.length) L.push('No rules and no lifecycles yet.', '');
  notes(L, n, '_Edge cases, invariants, open questions about the logic._');
  L.push(embedContract({ kind: 'logic', sourceHash: m.source.hash, ...logicContract(m) }), '');
  return L.join('\n');
}

// ---- DATA.md ----
export const dataContract = m => ({ entities: m.data.entities.map(e => ({ name: e.name, fields: e.fields.map(f => f.name), relations: e.relations, readBy: e.readBy, writtenBy: e.writtenBy, shownOn: e.shownOn })) });

export function dataSpec(m, { notes: n } = {}) {
  const d = m.data;
  const fn = new Map((m.functions?.items ?? []).map(f => [f.key, f]));
  const L = ['# Data', ''];
  L.push(`${d.entities.length} entit${d.entities.length === 1 ? 'y' : 'ies'}, how they relate, and who reads, writes and shows them. Fields, types and examples are in [the domain model](back/domain.md); lifecycles in [logic](LOGIC.md).`, '');
  if (d.entities.length) {
    L.push('```mermaid', 'erDiagram');
    for (const e of d.entities) {
      L.push(`  ${mid(e.name)} {`);
      for (const f of e.fields) L.push(`    ${mid(String(f.type || 'string').replace(/\[\]$/, '_list'))} ${mid(f.name)}${f.required ? ' "required"' : ''}`);
      L.push('  }');
    }
    for (const e of d.entities) for (const r of e.relations) L.push(`  ${mid(r.to)} ||--o${r.many ? '{' : '|'} ${mid(e.name)} : "${q(r.field)}"`);
    L.push('```', '');
  }
  for (const e of d.entities) {
    const lc = m.logic?.machines.find(x => x.entity === e.name);
    L.push(`<a id="data-${e.name.toLowerCase()}"></a>`, `## ${mdEscape(e.name)}`, '', '| | |', '|---|---|');
    L.push(`| Fields | ${e.fields.map(f => `\`${f.name}\`${f.required ? '' : '?'}`).join(', ') || '—'} ([details](back/domain.md#${entityAnchor(e.name)})) |`);
    L.push(`| Relations | ${e.relations.map(r => `\`${r.field}\` → [${mdEscape(r.to)}](#data-${r.to.toLowerCase()})${r.many ? ' (many)' : ''}`).join(' · ') || '—'} |`);
    L.push(`| Written by | ${e.writtenBy.map(k => `[${mdEscape(fn.get(k).name)}](FUNCTIONS.md#${k})`).join(' · ') || '—'} |`);
    L.push(`| Read by | ${e.readBy.map(k => `[${mdEscape(fn.get(k).name)}](FUNCTIONS.md#${k})`).join(' · ') || '—'} |`);
    L.push(`| Shown on | ${e.shownOn.map(k => elementLink(m, k)).join(' · ') || '—'} |`);
    L.push(`| Operations | ${e.operations.map(k => elementLink(m, k)).join(' · ') || '—'} |`);
    if (lc) L.push(`| Lifecycle | [${lc.states.map(s => `\`${s}\``).join(' → ')}](LOGIC.md#${lc.key}) |`);
    L.push('');
  }
  notes(L, n, '_Ownership, retention, privacy (personal data), volumes, indexes, migrations._');
  L.push(embedContract({ kind: 'data', sourceHash: m.source.hash, ...dataContract(m) }), '');
  return L.join('\n');
}

// ---- API.md ----
export const apiOverviewContract = m => ({
  operations: m.domain.operations.map(o => ({ key: o.key, method: o.method, path: o.path, fn: m.functions?.items.find(f => f.operations.includes(o.key))?.key ?? null })),
  endpoints: (m.surface?.api?.endpoints ?? []).map(e => e.key),
  tools: (m.surface?.mcp?.tools ?? []).map(t => ({ name: t.name, op: t.op ?? null })),
});

export function apiOverviewSpec(m, { notes: n } = {}) {
  const ops = m.domain.operations;
  const tools = m.surface?.mcp?.tools ?? [];
  const eps = m.surface?.api?.endpoints ?? [];
  const L = ['# API & MCP', ''];
  L.push(`${ops.length} operation${ops.length === 1 ? '' : 's'}${eps.length ? `, ${eps.length} public endpoint${eps.length === 1 ? '' : 's'}` : ''}${tools.length ? `, ${tools.length} MCP tool${tools.length === 1 ? '' : 's'}` : ''}, by function. Request and response details are in [the API spec](back/api.md) and [\`openapi.json\`](back/openapi.json); conventions (auth, errors, pagination) in [conventions](back/conventions.md).`, '');
  if ((m.surface?.api?.auth ?? []).length) L.push(`Authentication: ${m.surface.api.auth.map(a => `${a.name} (${a.type}${a.scheme ? ` ${a.scheme}` : ''})`).join(', ')}.`, '');
  const row = o => {
    const from = [
      ...m.screens.filter(s => s.key === o.screen).map(s => elementLink(m, s.key)),
      ...tools.filter(t => t.op === o.key).map(t => elementLink(m, `tool:${t.name}`)),
      ...(o.endpoint ? [`public \`${opLabel(o)}\``] : []),
    ];
    const ent = entityOfOperation(m, o);
    return `| [\`${o.method}\`](back/api.md#${o.key}) | \`${o.path}\` | ${mdEscape(o.name)} | ${from.join(' · ') || '—'} | ${ent ? `[${mdEscape(ent)}](DATA.md#data-${ent.toLowerCase()})${o.kind === 'list' ? '[]' : ''}` : '—'} |`;
  };
  const groups = [...(m.functions?.items ?? []).map(f => [f, ops.filter(o => f.operations.includes(o.key))]), [null, ops.filter(o => !(m.functions?.items ?? []).some(f => f.operations.includes(o.key)))]].filter(([, l]) => l.length);
  for (const [f, list] of groups) {
    L.push(f ? `## ${mdEscape(f.name)}` : '## Not in a function', '');
    if (f?.summary) L.push(mdEscape(f.summary), '');
    L.push('| Method | Path | What | Called from | Returns |', '|---|---|---|---|---|', ...list.map(row), '');
  }
  if (tools.length) {
    L.push('## MCP tools', '', '| Tool | Behaviour | Operation |', '|---|---|---|');
    for (const t of tools) L.push(`| ${elementLink(m, `tool:${t.name}`)} | ${[t.hints?.readOnlyHint && 'read-only', t.hints?.destructiveHint && 'destructive', t.hints?.idempotentHint && 'idempotent'].filter(Boolean).join(', ') || '—'} | ${t.op ? elementLink(m, t.op) : '⚠️ none'} |`);
    L.push('');
  }
  if (!ops.length && !tools.length) L.push('No operation yet: annotate a layer with `POST /path` in the design, or add an OpenAPI / MCP surface.', '');
  notes(L, n, '_Versioning, rate limits, idempotency, webhooks, open questions._');
  L.push(embedContract({ kind: 'api-overview', sourceHash: m.source.hash, ...apiOverviewContract(m) }), '');
  return L.join('\n');
}

// ---- ARCHITECTURE.md ----
export const architectureContract = m => ({ declared: m.architecture.declared, components: m.architecture.components.map(c => ({ key: c.key, name: c.name, kind: c.kind, tech: c.tech, implements: c.implements })), links: m.architecture.links });

const KIND_LABEL = { client: 'Clients', frontend: 'Front ends', interface: 'Interfaces', service: 'Services', queue: 'Queues', store: 'Data stores', external: 'External systems' };
const KIND_ORDER = ['client', 'frontend', 'interface', 'service', 'queue', 'store', 'external'];

export function architectureSpec(m, { notes: n, codeDirs = null } = {}) {
  const a = m.architecture;
  const name = new Map(a.components.map(c => [c.key, c.name]));
  const L = ['# Architecture', ''];
  L.push(`${a.components.length} component${a.components.length === 1 ? '' : 's'} and how they talk. ${a.declared ? '' : 'Suggested from the design, the API and the MCP surface: declare the real one (the Architecture view, or `weshcraft_edit` {op:"component"} / {op:"connect"}) with its technologies.'}`.trim(), '');
  if (a.components.length) {
    L.push('```mermaid', 'flowchart LR');
    for (const k of KIND_ORDER) {
      const list = a.components.filter(c => c.kind === k);
      if (!list.length) continue;
      L.push(`  subgraph ${mid(`k_${k}`)}["${KIND_LABEL[k]}"]`);
      for (const c of list) L.push(`    ${mid(c.key)}${k === 'store' ? `[("${q(c.name)}")]` : k === 'client' ? `(["${q(c.name)}"])` : `["${q(c.name)}${c.tech ? `<br/><small>${q(c.tech)}</small>` : ''}"]`}`);
      L.push('  end');
    }
    for (const l of a.links) L.push(`  ${mid(l.from)} -->${l.label ? `|${q(l.label)}|` : ''} ${mid(l.to)}`);
    L.push('```', '');
    L.push('| Component | Kind | Technology | Implements | Code |', '|---|---|---|---|---|');
    for (const k of KIND_ORDER) for (const c of a.components.filter(x => x.kind === k)) {
      const impl = c.implements.length > 6 ? `${c.implements.slice(0, 6).map(id => elementLink(m, id)).join(' · ')} · +${c.implements.length - 6}` : c.implements.map(id => elementLink(m, id)).join(' · ');
      const code = [...c.code, ...(codeDirs?.get(c.key) ?? [])].filter((v, i, x) => x.indexOf(v) === i);
      L.push(`| <a id="${c.key}"></a>**${mdEscape(c.name)}**${c.description ? `<br>${mdEscape(c.description)}` : ''} | ${c.kind} | ${mdEscape(c.tech || '—')} | ${impl || '—'} | ${code.map(p => `\`${p}\``).join(' ') || '—'} |`);
    }
    L.push('');
    if (a.links.length) {
      L.push('| From | To | How |', '|---|---|---|');
      for (const l of a.links) L.push(`| ${mdEscape(name.get(l.from))} | ${mdEscape(name.get(l.to))} | ${mdEscape(l.label || '—')} |`);
      L.push('');
    }    // What each named technology is, and what could replace it (the WeshCraft catalog).
    const used = new Map();
    for (const c of a.components) for (const e of matchTech(c.tech)) if (e.cat !== 'generic') { if (!used.has(e.id)) used.set(e.id, { e, by: [] }); used.get(e.id).by.push(c.name); }
    if (used.size) {
      L.push('## Technologies', '', '| Technology | Used by | What it is | Alternatives |', '|---|---|---|---|');
      for (const { e, by } of used.values()) { const f = techFacts(e); L.push(`| **${mdEscape(f.name)}** <small>${mdEscape(f.category)}</small> | ${by.map(mdEscape).join(', ')} | ${mdEscape(f.description)} | ${f.alternatives.map(mdEscape).join(', ') || '—'} |`); }
      L.push('');
    }
  }
  notes(L, n, '_Decisions and their reasons (ADRs), deployment, environments, scaling, security boundaries._');
  L.push(embedContract({ kind: 'architecture', sourceHash: m.source.hash, ...architectureContract(m) }), '');
  return L.join('\n');
}
