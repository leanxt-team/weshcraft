// The other aspects of the product, next to its functions:
//   logic         business rules (validation, permission, calculation, policy, event) and the
//                 lifecycle of the data (state machines). Declared in the design (weshcraft_edit,
//                 the Logic view); until then, inferred: required request fields, status enums and
//                 the operations that move them.
//   data          the entities, their fields, how they relate, who reads, writes and shows them.
//   api           every operation, public endpoint and MCP tool, grouped by function, with who
//                 calls it and what it returns.
//   architecture  the system's parts (clients, interfaces, services, stores, external systems) and
//                 how they talk. Declared (weshcraft_edit, the Architecture view); until then
//                 suggested from the design, the API and the MCP surface.
// Declared aspects live with the functions in the first page's pluginData.weshcraft.
import { slug } from '../util/common.mjs';

export const RULE_KINDS = ['validation', 'permission', 'calculation', 'policy', 'event'];
export const COMPONENT_KINDS = ['client', 'frontend', 'interface', 'service', 'store', 'external', 'queue'];

/** One declared aspect from the design model (pluginData.weshcraft[key]), or null. */
export function declaredAspect(model, key) {
  for (const pid of model?.pages ?? []) {
    const pd = model.nodes.get(pid)?.pluginData?.weshcraft;
    if (!pd) continue;
    try { const j = typeof pd === 'string' ? JSON.parse(pd) : pd; if (j?.[key] != null) return j[key]; } catch { /* not ours */ }
  }
  return null;
}

const stem = s => String(s).toLowerCase().replace(/[^a-z]/g, '').slice(0, 4);
const opLabel = o => `${o.method} ${o.path}`;

/** Resolve a ref (key, "METHOD /path", entity, tool, function or screen name) to an element id. */
export function refResolver(manifest) {
  const map = new Map();
  const add = (k, id) => { if (k) map.set(String(k).toLowerCase(), id); };
  for (const f of manifest.functions?.items ?? []) { add(f.key, f.key); add(f.name, f.key); }
  for (const s of manifest.screens) { add(s.key, s.key); add(s.name, s.key); }
  for (const c of manifest.components) { add(c.key, c.key); add(c.name, c.key); }
  for (const o of manifest.domain.operations) { add(o.key, o.key); add(opLabel(o), o.key); }
  for (const e of manifest.domain.entities) { add(e.name, `entity:${e.name}`); add(`entity:${e.name}`, `entity:${e.name}`); for (const f of e.fields) add(`${e.name}.${f.name}`, `field:${e.name}.${f.name}`); }
  for (const t of manifest.surface?.mcp?.tools ?? []) { add(t.name, `tool:${t.name}`); add(`tool:${t.name}`, `tool:${t.name}`); }
  return ref => {
    const r = String(ref ?? '').trim().replace(/\s+/g, ' ').replace(/^(get|post|put|patch|delete)\s/i, m => m.toUpperCase());
    return map.get(r.toLowerCase()) ?? null;
  };
}

/** The entity an operation acts on: what it returns, else what the closest path returns (/invoices/{id}/send → Invoice). */
export function entityOfOperation(manifest, o) {
  if (o.entity) return o.entity;
  const ops = manifest.domain.operations;
  let p = o.path;
  while (p && p !== '/') {
    const hit = ops.find(x => x.entity && x.path === p);
    if (hit) return hit.entity;
    p = p.replace(/\/[^/]*$/, '');
  }
  return null;
}

// ---- logic -----------------------------------------------------------------------------------
export function buildLogic(manifest, declared) {
  const resolve = refResolver(manifest);
  const missing = [];
  const keys = new Set();
  const key = (p, n) => { let k = `${p}-${slug(n) || 'x'}`; for (let i = 2; keys.has(k); i++) k = `${p}-${slug(n) || 'x'}-${i}`; keys.add(k); return k; };
  const refs = (list, owner) => (list ?? []).map(r => { const id = resolve(r); if (!id) missing.push({ owner, ref: r }); return id; }).filter(Boolean);
  const rules = [];
  const machines = [];
  const d = declared && typeof declared === 'object' ? declared : null;
  for (const r of d?.rules ?? []) {
    if (!String(r?.name ?? '').trim()) continue;
    const k = key('rule', r.name);
    rules.push({ key: k, name: String(r.name).trim(), kind: RULE_KINDS.includes(r.kind) ? r.kind : 'policy', text: String(r.text ?? '').trim(), applies: refs(r.applies, k), source: 'declared' });
  }
  for (const s of d?.states ?? []) {
    const ent = manifest.domain.entities.find(e => e.name.toLowerCase() === String(s?.entity ?? '').toLowerCase());
    const states = (s?.states ?? []).map(String).filter(Boolean);
    if (!states.length) continue;
    const k = key('states', `${s.entity}-${s.field ?? 'status'}`);
    if (!ent) missing.push({ owner: k, ref: s.entity });
    machines.push({
      key: k, entity: ent?.name ?? String(s.entity), field: s.field ?? 'status', states, initial: states.includes(s.initial) ? s.initial : states[0],
      transitions: (s.transitions ?? []).filter(t => (states.includes(t?.from) || t?.from === '*') && states.includes(t?.to)).map(t => ({ from: t.from, to: t.to, via: String(t.via ?? '').trim(), op: t.via ? resolve(t.via) : null })),
      source: 'declared',
    });
  }
  // Inferred: what the design and the API already say.
  const ops = manifest.domain.operations;
  for (const e of manifest.domain.entities) {
    for (const f of e.fields.filter(x => Array.isArray(x.enum) && x.enum.length > 1 && /^(status|state|stage|phase|step)$/i.test(x.name))) {
      if (machines.some(m => m.entity === e.name && m.field === f.name)) continue;
      const states = f.enum.map(String);
      const transitions = [];
      const unresolved = [];
      for (const o of ops.filter(x => entityOfOperation(manifest, x) === e.name && x.method !== 'GET')) {
        const verb = o.path.split('/').filter(Boolean).pop();
        if (/^\{.*\}$/.test(verb) || o.path.split('/').filter(Boolean).length < 2) continue;
        const to = states.find(s => stem(s) === stem(verb));
        if (to) transitions.push({ from: '*', to, via: opLabel(o), op: o.key });
        else unresolved.push({ via: opLabel(o), op: o.key });
      }
      const create = ops.find(x => x.method === 'POST' && x.entity === e.name && x.path.split('/').filter(Boolean).length === 1);
      machines.push({ key: key('states', `${e.name}-${f.name}`), entity: e.name, field: f.name, states, initial: states[0], transitions, unresolved, create: create ? { via: opLabel(create), op: create.key } : null, source: 'inferred' });
    }
  }
  for (const o of ops) {
    const req = (o.request?.fields ?? manifest.surface?.api?.endpoints.find(x => x.key === o.endpoint)?.body?.fields ?? []).filter(x => x.required);
    if (req.length) rules.push({ key: key('rule', `${o.method}-${o.path}-required`), name: `${opLabel(o)} requires ${req.map(x => x.name).join(', ')}`, kind: 'validation', text: req.map(x => `${x.name}${x.format ? ` (${x.format})` : x.type ? ` (${x.type})` : ''}${x.enum ? `: one of ${x.enum.join(', ')}` : ''}`).join('; '), applies: [o.key], source: 'inferred' });
  }
  // Design operations that submit inputs: the inputs must be validated before the call.
  const inputName = new Map(manifest.screens.flatMap(sc => sc.inputs.map(i => [i.id, i.name])));
  for (const o of ops.filter(x => (x.fields ?? []).length && !rules.some(r => r.applies.includes(x.key)))) {
    const names = o.fields.map(id => inputName.get(id)).filter(Boolean);
    if (names.length) rules.push({ key: key('rule', `${o.method}-${o.path}-inputs`), name: `${opLabel(o)} submits ${names.join(', ')}`, kind: 'validation', text: 'Validate each input before the call (format, required, length); the design does not say which constraints apply yet.', applies: [o.key, ...o.fields.map(id => manifest.screens.find(sc => sc.inputs.some(i => i.id === id))?.key).filter((v, i, a) => v && a.indexOf(v) === i)], source: 'inferred' });
  }
  if ((manifest.surface?.api?.auth ?? []).length) {
    const a = manifest.surface.api.auth;
    rules.push({ key: key('rule', 'api-auth'), name: `Public API requires ${a.map(x => x.scheme ?? x.type).join(' or ')} authentication`, kind: 'permission', text: a.map(x => `${x.name}: ${x.type}${x.scheme ? ` ${x.scheme}` : ''}`).join('; '), applies: [], source: 'inferred' });
  }
  return { declared: !!d && ((d.rules?.length ?? 0) + (d.states?.length ?? 0) > 0), rules, machines, missing };
}

// ---- data ------------------------------------------------------------------------------------
export function buildData(manifest) {
  const names = new Set(manifest.domain.entities.map(e => e.name));
  const byLower = new Map(manifest.domain.entities.map(e => [e.name.toLowerCase(), e.name]));
  const fns = manifest.functions?.items ?? [];
  const entities = manifest.domain.entities.map(e => {
    const relations = [];
    for (const f of e.fields) {
      const base = String(f.type ?? '').replace(/\[\]$/, '');
      let to = names.has(base) && base !== e.name ? base : null;
      const m = /^(.+?)_?id(s)?$/i.exec(f.name);
      if (!to && m && m[1].length > 1) to = byLower.get(m[1].toLowerCase()) ?? null;
      if (to && to !== e.name) relations.push({ field: f.name, to, many: /\[\]$/.test(f.type ?? '') || !!m?.[2] });
    }
    const opsReturning = manifest.domain.operations.filter(o => entityOfOperation(manifest, o) === e.name).map(o => o.key);
    return {
      name: e.name,
      fields: e.fields.map(f => ({ name: f.name, type: f.type, required: !!f.required, ...(f.enum ? { enum: f.enum } : {}) })),
      relations,
      readBy: fns.filter(f => f.entities.some(x => x.name === e.name && /reads/.test(x.access))).map(f => f.key),
      writtenBy: fns.filter(f => f.entities.some(x => x.name === e.name && /writes/.test(x.access))).map(f => f.key),
      shownOn: [...new Set(manifest.links.edges.filter(x => x.rel === 'displays' && x.field.split('.')[0] === e.name).map(x => x.screen))],
      operations: opsReturning,
    };
  });
  return { entities };
}

// ---- architecture ----------------------------------------------------------------------------
export function buildArchitecture(manifest, declared) {
  const resolve = refResolver(manifest);
  const missing = [];
  const keys = new Set();
  const key = n => { let k = `arc-${slug(n) || 'x'}`; for (let i = 2; keys.has(k); i++) k = `arc-${slug(n) || 'x'}-${i}`; keys.add(k); return k; };
  const d = declared && typeof declared === 'object' && Array.isArray(declared.components) && declared.components.length ? declared : null;
  const components = [];
  const links = [];
  if (d) {
    for (const c of d.components) {
      if (!String(c?.name ?? '').trim()) continue;
      const k = key(c.name);
      components.push({
        key: k, name: String(c.name).trim(), kind: COMPONENT_KINDS.includes(c.kind) ? c.kind : 'service', tech: String(c.tech ?? '').trim(), description: String(c.description ?? '').trim(),
        implements: (c.implements ?? []).map(r => { const id = resolve(r); if (!id) missing.push({ owner: k, ref: r }); return id; }).filter(Boolean),
        code: (c.code ?? []).map(String).filter(Boolean), source: 'declared',
      });
    }
    const byName = n => components.find(c => c.name.toLowerCase() === String(n ?? '').trim().toLowerCase() || c.key === n);
    for (const l of d.links ?? []) {
      const a = byName(l?.from), b = byName(l?.to);
      if (a && b) links.push({ from: a.key, to: b.key, label: String(l.label ?? '').trim() });
      else missing.push({ owner: 'links', ref: `${l?.from} → ${l?.to}` });
    }
  } else {
    // Suggested from what the design and the surface show.
    const ops = manifest.domain.operations;
    const tools = manifest.surface?.mcp?.tools ?? [];
    const eps = manifest.surface?.api?.endpoints ?? [];
    const add = (name, kind, extra = {}) => { const c = { key: key(name), name, kind, tech: '', description: '', implements: [], code: [], source: 'suggested', ...extra }; components.push(c); return c; };
    const people = manifest.screens.length ? add('People', 'client', { description: 'Use the app' }) : null;
    const agents = tools.length ? add('AI agents', 'client', { description: 'Call the MCP tools' }) : null;
    const integrations = eps.length ? add('Integrations', 'client', { description: 'Call the public API' }) : null;
    const front = manifest.screens.length ? add('Front end', 'frontend', { description: 'The app people use', implements: [...manifest.screens.map(s => s.key), ...manifest.components.map(c => c.key)] }) : null;
    const mcp = tools.length ? add('MCP server', 'interface', { description: 'Exposes the product to AI agents', implements: tools.map(t => `tool:${t.name}`) }) : null;
    const api = ops.length ? add(eps.length ? 'API' : 'Back end', 'service', { description: 'Runs the operations and the rules', implements: ops.map(o => o.key) }) : null;
    const db = manifest.domain.entities.length ? add('Database', 'store', { description: 'Holds the data', implements: manifest.domain.entities.map(e => `entity:${e.name}`) }) : null;
    const link = (a, b, label) => { if (a && b) links.push({ from: a.key, to: b.key, label }); };
    link(people, front, 'uses');
    link(agents, mcp, 'MCP');
    link(integrations, api, 'HTTPS');
    link(front, api, `${ops.filter(o => manifest.screens.some(s => s.key === o.screen)).length || ops.length} calls`);
    link(mcp, api, `${tools.filter(t => t.op).length} calls`);
    const writes = ops.filter(o => o.method !== 'GET').length, reads = ops.length - writes;
    link(api, db, [reads && 'reads', writes && 'writes'].filter(Boolean).join(', '));
  }
  return { declared: !!d, components, links, missing };
}

/** Architecture in the form the design stores (to start declaring from a suggestion). */
export function architectureToDeclared(manifest) {
  const a = manifest.architecture;
  if (!a) return { components: [], links: [] };
  const ids = new Map();
  for (const f of manifest.functions?.items ?? []) ids.set(f.key, f.key);
  const label = id => {
    if (id.startsWith('entity:')) return id.slice(7);
    if (id.startsWith('tool:')) return id.slice(5);
    const o = manifest.domain.operations.find(x => x.key === id);
    return o ? opLabel(o) : id;
  };
  const name = new Map(a.components.map(c => [c.key, c.name]));
  return {
    components: a.components.map(c => ({ name: c.name, kind: c.kind, ...(c.tech ? { tech: c.tech } : {}), ...(c.description ? { description: c.description } : {}), implements: c.implements.map(label), ...(c.code.length ? { code: c.code } : {}) })),
    links: a.links.map(l => ({ from: name.get(l.from), to: name.get(l.to), ...(l.label ? { label: l.label } : {}) })),
  };
}

/** Logic in the form the design stores: declared rules and machines only (inferred ones stay inferred). */
export function logicToDeclared(manifest, { includeInferred = false } = {}) {
  const l = manifest.logic;
  if (!l) return { rules: [], states: [] };
  const label = id => {
    if (id.startsWith('entity:')) return id.slice(7);
    if (id.startsWith('tool:')) return id.slice(5);
    if (id.startsWith('field:')) return id.slice(6);
    const o = manifest.domain.operations.find(x => x.key === id);
    return o ? opLabel(o) : id;
  };
  const keep = x => includeInferred || x.source === 'declared';
  return {
    rules: l.rules.filter(keep).map(r => ({ name: r.name, kind: r.kind, ...(r.text ? { text: r.text } : {}), ...(r.applies.length ? { applies: r.applies.map(label) } : {}) })),
    states: l.machines.filter(keep).map(m => ({ entity: m.entity, field: m.field, states: m.states, initial: m.initial, transitions: m.transitions.map(t => ({ from: t.from, to: t.to, ...(t.via ? { via: t.via } : {}) })) })),
  };
}
