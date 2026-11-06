// What changed in the design between two manifests: screens, copy, interactions, components,
// tokens, entities, operations and front ⇄ back links. Feeds wcraft/specs/CHANGES.md, sync commit
// messages and PR/MR descriptions, so a spec update reads like a design changelog.
import { mdEscape, stableStringify } from '../util/common.mjs';

const byKey = (arr, k) => new Map((arr || []).map(x => [typeof k === 'function' ? k(x) : x[k], x]));
const same = (a, b) => stableStringify(a) === stableStringify(b);

export function diffManifests(prev, next) {
  const items = [];
  const add = (area, kind, text, extra = {}) => items.push({ area, kind, text, ...extra });
  if (!prev) {
    add('design', 'added', `First version: ${[next.screens.length && `${next.screens.length} screens`, next.surface?.mcp && `${next.surface.mcp.tools.length} MCP tools`, next.surface?.api && `${next.surface.api.endpoints.length} endpoints`, `${next.domain.operations.length} operations`].filter(Boolean).join(', ')}`);
    return { items, from: null, to: next.source.hash };
  }
  if (prev.source?.hash === next.source.hash) return { items, from: prev.source.hash, to: next.source.hash };

  const ps = byKey(prev.screens, 'key'), ns = byKey(next.screens, 'key');
  for (const [k, s] of ns) if (!ps.has(k)) add('screen', 'added', `Screen **${s.name}** added`, { screen: k });
  for (const [k, s] of ps) if (!ns.has(k)) add('screen', 'removed', `Screen **${s.name}** removed`, { screen: k });
  for (const [k, s] of ns) {
    const p = ps.get(k);
    if (!p || p.fingerprint === s.fingerprint) continue;
    const pt = byKey(p.texts, 'id'), nt = byKey(s.texts, 'id');
    let detailed = false;
    for (const [id, t] of nt) {
      const o = pt.get(id);
      if (!o) { add('copy', 'added', `${s.name}: new text “${mdEscape(t.characters)}”`, { screen: k, node: id }); detailed = true; }
      else if (o.characters !== t.characters) { add('copy', 'changed', `${s.name}: “${mdEscape(o.characters)}” → “${mdEscape(t.characters)}”`, { screen: k, node: id }); detailed = true; }
    }
    for (const [id, t] of pt) if (!nt.has(id)) { add('copy', 'removed', `${s.name}: text “${mdEscape(t.characters)}” removed`, { screen: k, node: id }); detailed = true; }
    const ak = a => `${a.id}|${a.type}|${a.destScreen}`;
    const pa = new Set(p.actions.map(ak)), na = new Set(s.actions.map(ak));
    for (const a of s.actions) if (!pa.has(ak(a))) { add('interaction', 'added', `${s.name}: “${mdEscape(a.label || a.name)}” → ${a.type}${a.destScreen ? ` ${a.destScreen}` : ''}`, { screen: k, node: a.id }); detailed = true; }
    for (const a of p.actions) if (!na.has(ak(a))) { add('interaction', 'removed', `${s.name}: interaction on “${mdEscape(a.label || a.name)}” removed`, { screen: k, node: a.id }); detailed = true; }
    if (s.width !== p.width || s.height !== p.height) { add('layout', 'changed', `${s.name}: frame ${p.width}×${p.height} → ${s.width}×${s.height}`, { screen: k }); detailed = true; }
    if (!detailed) add('layout', 'changed', `${s.name}: layout or styling changed`, { screen: k });
  }

  const pc = byKey(prev.components, 'key'), nc = byKey(next.components, 'key');
  for (const [k, c] of nc) if (!pc.has(k)) add('component', 'added', `Component **${c.name}** added`);
  for (const [k, c] of pc) if (!nc.has(k)) add('component', 'removed', `Component **${c.name}** removed`);
  for (const [k, c] of nc) if (pc.has(k) && pc.get(k).fingerprint !== c.fingerprint) add('component', 'changed', `Component **${c.name}** changed${pc.get(k).variants.length !== c.variants.length ? ` (${pc.get(k).variants.length} → ${c.variants.length} variants)` : ''}`);

  const pv = byKey(prev.tokens?.variables, 'name'), nv = byKey(next.tokens?.variables, 'name');
  for (const [k] of nv) if (!pv.has(k)) add('token', 'added', `Token \`${k}\` added`);
  for (const [k] of pv) if (!nv.has(k)) add('token', 'removed', `Token \`${k}\` removed`);
  for (const [k, v] of nv) if (pv.has(k) && !same(pv.get(k).values, v.values)) add('token', 'changed', `Token \`${k}\` value changed`);

  const pe = byKey(prev.domain?.entities, 'name'), ne = byKey(next.domain?.entities, 'name');
  for (const [k, e] of ne) {
    const o = pe.get(k);
    if (!o) { add('entity', 'added', `Entity **${k}** (${e.fields.map(f => f.name).join(', ')})`); continue; }
    const of = new Set(o.fields.map(f => f.name));
    for (const f of e.fields) if (!of.has(f.name)) add('entity', 'added', `Field \`${k}.${f.name}\` added`);
    const nf = new Set(e.fields.map(f => f.name));
    for (const f of o.fields) if (!nf.has(f.name)) add('entity', 'removed', `Field \`${k}.${f.name}\` removed`);
  }
  for (const [k] of pe) if (!ne.has(k)) add('entity', 'removed', `Entity **${k}** removed`);

  const opk = o => `${o.method} ${o.path}|${o.screen}`;
  const po = byKey(prev.domain?.operations, opk), no = byKey(next.domain?.operations, opk);
  for (const [k, o] of no) if (!po.has(k)) add('operation', 'added', `\`${o.method} ${o.path}\` on ${o.screen} (${o.confidence})`);
  for (const [k, o] of po) if (!no.has(k)) add('operation', 'removed', `\`${o.method} ${o.path}\` on ${o.screen} removed`);

  // MCP tools and public endpoints.
  const pt = byKey(prev.surface?.mcp?.tools, 'name'), nt = byKey(next.surface?.mcp?.tools, 'name');
  for (const [k, t] of nt) if (!pt.has(k)) add('mcp', 'added', `MCP tool \`${k}\` added${t.hints?.destructive ? ' (destructive)' : ''}`);
  for (const [k] of pt) if (!nt.has(k)) add('mcp', 'removed', `MCP tool \`${k}\` removed (breaking for agents that use it)`);
  for (const [k, t] of nt) {
    const o = pt.get(k);
    if (!o || o.fingerprint === t.fingerprint) continue;
    const oi = new Set(o.input.map(f => f.name)), ni = new Set(t.input.map(f => f.name));
    const added = t.input.filter(f => !oi.has(f.name)).map(f => `+\`${f.name}\`${f.required ? ' (required: breaking)' : ''}`);
    const removed = o.input.filter(f => !ni.has(f.name)).map(f => `−\`${f.name}\``);
    add('mcp', 'changed', `MCP tool \`${k}\`: ${[...added, ...removed].join(', ') || 'description, schema rules or annotations changed'}`);
  }
  const pep = byKey(prev.surface?.api?.endpoints, 'key'), nep = byKey(next.surface?.api?.endpoints, 'key');
  for (const [, x] of nep) if (!pep.has(x.key)) add('api', 'added', `Endpoint \`${x.method} ${x.path}\` added`);
  for (const [, x] of pep) if (!nep.has(x.key)) add('api', 'removed', `Endpoint \`${x.method} ${x.path}\` removed (breaking)`);
  for (const [k, x] of nep) if (pep.has(k) && pep.get(k).fingerprint !== x.fingerprint) add('api', 'changed', `Endpoint \`${x.method} ${x.path}\` changed (parameters, body, responses or auth)`);

  const lk = e => `${e.rel}|${e.node}|${e.op ?? e.field}`;
  const pl = new Set((prev.links?.edges ?? []).map(lk)), nl = new Set((next.links?.edges ?? []).map(lk));
  const addedL = (next.links?.edges ?? []).filter(e => !pl.has(lk(e))).length;
  const removedL = (prev.links?.edges ?? []).filter(e => !nl.has(lk(e))).length;
  if (addedL || removedL) add('links', 'changed', `Front ⇄ back links: +${addedL} −${removedL}`);
  const pg = (prev.links?.gaps ?? []).length, ng = (next.links?.gaps ?? []).length;
  if (pg !== ng) add('links', ng > pg ? 'added' : 'removed', `Gaps: ${pg} → ${ng}`);
  // Product functions
  const pf = byKey(prev.functions?.items, 'key'), nf = byKey(next.functions?.items, 'key');
  if (!prev.functions?.declared && next.functions?.declared) add('function', 'changed', `Functions declared: ${next.functions.items.map(f => `**${f.name}**`).join(', ')}`);
  else {
    for (const [k, f] of nf) if (!pf.has(k)) add('function', 'added', `Function **${f.name}** added`);
    for (const [k, f] of pf) if (!nf.has(k)) add('function', 'removed', `Function **${f.name}** removed`);
    for (const [k, f] of nf) {
      const p = pf.get(k);
      if (!p) continue;
      if (p.summary !== f.summary) add('function', 'changed', `Function **${f.name}**: purpose changed`);
      if (!same(p.screens, f.screens)) add('function', 'changed', `Function **${f.name}**: screens ${p.screens.length} → ${f.screens.length}`);
    }
  }

  return { items, from: prev.source.hash, to: next.source.hash };
}

const ICON = { added: '+', removed: '−', changed: '~' };

export function changesMarkdown(diff, { title } = {}) {
  if (!diff.items.length) return '';
  const L = [`### ${title ?? `${diff.from ?? '∅'} → ${diff.to}`}`, ''];
  for (const area of ['design', 'screen', 'copy', 'interaction', 'layout', 'component', 'token', 'mcp', 'api', 'entity', 'operation', 'links']) {
    const xs = diff.items.filter(i => i.area === area);
    for (const i of xs.slice(0, 40)) L.push(`- ${ICON[i.kind] ?? '·'} ${i.text}${i.node != null ? ` (\`#${i.node}\`)` : ''}`);
    if (xs.length > 40) L.push(`- … ${xs.length - 40} more ${area} changes`);
  }
  return L.join('\n');
}

export function summaryLine(diff) {
  if (!diff.items.length) return 'no design change';
  if (diff.items.some(i => i.area === 'design')) return 'first version';
  const count = a => diff.items.filter(i => i.area === a).length;
  return [['function', 'functions'], ['mcp', 'MCP tools'], ['api', 'endpoints'], ['screen', 'screens'], ['copy', 'copy'], ['interaction', 'interactions'], ['component', 'components'], ['operation', 'operations'], ['entity', 'data'], ['links', 'links']]
    .filter(([a]) => count(a)).map(([a, n]) => `${count(a)} ${n}`).join(', ') || `${diff.items.length} changes`;
}

const MARK = /<!-- weshcraft:change ([0-9a-f]+) -->/g;

/** Prepend one entry to CHANGES.md (newest first, at most `keep` entries). */
export function updateChangelog(existing, diff, { at = new Date(), keep = 30 } = {}) {
  if (!diff.items.length) return existing ?? null;
  const head = '# Design changelog\n\nEvery regeneration that changed the prototype, newest first. Written by WeshCraft from the manifest; `#id` cites the layer.\n';
  const entries = [];
  // What the user wrote before the first entry is theirs: it stays.
  let preamble = '';
  if (existing) {
    const parts = existing.split(/(?=<!-- weshcraft:change [0-9a-f]+ -->)/);
    preamble = (parts[0] ?? '').replace(/^# Design changelog\n\nEvery regeneration that changed the prototype, newest first\. Written by WeshCraft from the manifest; `#id` cites the layer\.\n/, '').trim();
    for (const p of parts.slice(1)) entries.push(p.trim());
  }
  if (entries[0]?.startsWith(`<!-- weshcraft:change ${diff.to} -->`)) entries.shift();
  entries.unshift(`<!-- weshcraft:change ${diff.to} -->\n${changesMarkdown(diff, { title: `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC · \`${diff.from ?? '∅'}\` → \`${diff.to}\`` })}`);
  return `${head}${preamble ? `${preamble}\n\n` : ''}${entries.slice(0, keep).join('\n\n')}\n`;
}

export { MARK };
