// What changed in the design between two manifests: screens, copy, interactions, components,
// tokens, entities, operations and front ⇄ back links. Feeds specs/CHANGES.md, sync commit
// messages and PR/MR descriptions, so a spec update reads like a design changelog.
import { mdEscape, stableStringify } from '../util/common.mjs';

const byKey = (arr, k) => new Map((arr || []).map(x => [typeof k === 'function' ? k(x) : x[k], x]));
const same = (a, b) => stableStringify(a) === stableStringify(b);

export function diffManifests(prev, next) {
  const items = [];
  const add = (area, kind, text, extra = {}) => items.push({ area, kind, text, ...extra });
  if (!prev) {
    add('design', 'added', `First version: ${next.screens.length} screens, ${next.components.length} components, ${next.domain.operations.length} operations`);
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

  const lk = e => `${e.rel}|${e.node}|${e.op ?? e.field}`;
  const pl = new Set((prev.links?.edges ?? []).map(lk)), nl = new Set((next.links?.edges ?? []).map(lk));
  const addedL = (next.links?.edges ?? []).filter(e => !pl.has(lk(e))).length;
  const removedL = (prev.links?.edges ?? []).filter(e => !nl.has(lk(e))).length;
  if (addedL || removedL) add('links', 'changed', `Front ⇄ back links: +${addedL} −${removedL}`);
  const pg = (prev.links?.gaps ?? []).length, ng = (next.links?.gaps ?? []).length;
  if (pg !== ng) add('links', ng > pg ? 'added' : 'removed', `Gaps: ${pg} → ${ng}`);

  return { items, from: prev.source.hash, to: next.source.hash };
}

const ICON = { added: '+', removed: '−', changed: '~' };

export function changesMarkdown(diff, { title } = {}) {
  if (!diff.items.length) return '';
  const L = [`### ${title ?? `${diff.from ?? '∅'} → ${diff.to}`}`, ''];
  for (const area of ['design', 'screen', 'copy', 'interaction', 'layout', 'component', 'token', 'entity', 'operation', 'links']) {
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
  return [['screen', 'screens'], ['copy', 'copy'], ['interaction', 'interactions'], ['component', 'components'], ['operation', 'operations'], ['entity', 'data'], ['links', 'links']]
    .filter(([a]) => count(a)).map(([a, n]) => `${count(a)} ${n}`).join(', ') || `${diff.items.length} changes`;
}

const MARK = /<!-- weshcraft:change ([0-9a-f]+) -->/g;

/** Prepend one entry to CHANGES.md (newest first, at most `keep` entries). */
export function updateChangelog(existing, diff, { at = new Date(), keep = 30 } = {}) {
  if (!diff.items.length) return existing ?? null;
  const head = '# Design changelog\n\nEvery regeneration that changed the prototype, newest first. Written by WeshCraft from the manifest; `#id` cites the layer.\n';
  const entries = [];
  if (existing) {
    const parts = existing.split(/(?=<!-- weshcraft:change [0-9a-f]+ -->)/).slice(1);
    for (const p of parts) entries.push(p.trim());
  }
  if (entries[0]?.startsWith(`<!-- weshcraft:change ${diff.to} -->`)) entries.shift();
  entries.unshift(`<!-- weshcraft:change ${diff.to} -->\n${changesMarkdown(diff, { title: `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC · \`${diff.from ?? '∅'}\` → \`${diff.to}\`` })}`);
  return `${head}\n${entries.slice(0, keep).join('\n\n')}\n`;
}

export { MARK };
