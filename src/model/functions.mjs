// Product functions: how the product works at a glance. A handful of functions (Sign up, Find a
// trail, Pay…), each with its purpose, who uses it, the screens, operations and tools that make it,
// the data it reads and writes, and where it leads. Declared in the design (the first page's
// pluginData.weshcraft.functions, edited with weshcraft_edit or the Functions view) or, until
// then, suggested from the prototype: flows, sections, navigation and API tags.
import { slug } from '../util/common.mjs';

export const ACTORS = {
  user: 'People (app)',
  agent: 'AI agents (MCP)',
  api: 'Integrations (API)',
};

/** The functions declared in a design model, or null. */
export function declaredFunctions(model) {
  for (const pid of model?.pages ?? []) {
    const pd = model.nodes.get(pid)?.pluginData?.weshcraft;
    if (!pd) continue;
    try {
      const j = typeof pd === 'string' ? JSON.parse(pd) : pd;
      if (Array.isArray(j?.functions)) return j.functions;
    } catch { /* not ours */ }
  }
  return null;
}

// "Home — Light", "Home - dark", "Home (tablet)" → "Home"
const baseName = s => String(s).replace(/\s*[—–-]\s*[^—–-]+$/, '').replace(/\s*\([^)]*\)\s*$/, '').trim() || String(s);
const opLabel = o => `${o.method} ${o.path}`;

/**
 * @param manifest  a manifest with screens, flows, domain, links (and surface)
 * @param declared  [{name, summary?, screens?: (node id | screen name | key)[], operations?: ("METHOD /path" | op key)[], tools?: string[]}] or null
 */
export function buildFunctions(manifest, declared) {
  const screens = manifest.screens;
  const ops = manifest.domain.operations;
  const tools = manifest.surface?.mcp?.tools ?? [];
  const endpoints = manifest.surface?.api?.endpoints ?? [];
  const screenBy = new Map();
  for (const s of screens) { screenBy.set(s.id, s); screenBy.set(s.key, s); screenBy.set(s.name.toLowerCase(), s); }
  const nav = screens.flatMap(s => s.actions.filter(a => a.destScreen && a.destScreen !== s.key).map(a => [s.key, a.destScreen]));
  const fnOfScreen = new Map(), fnOfOp = new Map(), fnOfTool = new Map();
  const items = [];
  const keys = new Set();
  const make = (name, extra = {}) => {
    let key = `fn-${slug(name) || 'function'}`;
    for (let i = 2; keys.has(key); i++) key = `fn-${slug(name) || 'function'}-${i}`;
    keys.add(key);
    const f = { key, name: String(name).trim() || 'Function', summary: '', screens: [], operations: [], tools: [], endpoints: [], entities: [], actors: [], next: [], ...extra };
    items.push(f);
    return f;
  };
  const putScreen = (f, s) => { if (s && !fnOfScreen.has(s.key)) { fnOfScreen.set(s.key, f); f.screens.push(s.key); } };
  const putOp = (f, o) => { if (o && !fnOfOp.has(o.key)) { fnOfOp.set(o.key, f); f.operations.push(o.key); } };
  const findOp = ref => ops.find(o => o.key === ref || opLabel(o) === String(ref).trim().replace(/\s+/, ' ').replace(/^(\w+)/, m => m.toUpperCase()));
  const missing = [];
  const isDeclared = Array.isArray(declared) && declared.length > 0;
  const tagOf = o => endpoints.find(e => e.key === o.endpoint)?.tags?.[0] ?? null;

  if (isDeclared) {
    for (const d of declared) {
      if (!d || !String(d.name ?? '').trim()) continue;
      const f = make(d.name, { summary: String(d.summary ?? '').trim() });
      for (const ref of d.screens ?? []) {
        const s = screenBy.get(ref) ?? screenBy.get(String(ref).toLowerCase()) ?? screenBy.get(Number(ref));
        if (s) putScreen(f, s); else missing.push({ function: f.key, kind: 'screen', ref });
      }
      for (const ref of d.operations ?? []) { const o = findOp(ref); if (o) putOp(f, o); else missing.push({ function: f.key, kind: 'operation', ref }); }
      for (const name of d.tools ?? []) { if (tools.some(t => t.name === name)) { if (!fnOfTool.has(name)) { fnOfTool.set(name, f); f.tools.push(name); } } else missing.push({ function: f.key, kind: 'tool', ref: name }); }
    }
  } else {
    // 1. prototype flows: what a flow reaches from its start, up to another flow's start
    const starts = new Set(manifest.flows.map(fl => fl.start).filter(Boolean));
    for (const fl of manifest.flows) {
      if (!fl.start || fnOfScreen.has(fl.start)) continue;
      const f = make(fl.name, { summary: fl.description || '' });
      const queue = [fl.start];
      while (queue.length) {
        const k = queue.shift();
        if (fnOfScreen.has(k) || (k !== fl.start && starts.has(k))) continue;
        putScreen(f, screenBy.get(k));
        for (const [a, b] of nav) if (a === k) queue.push(b);
      }
    }
    // 2. canvas sections
    const rest = () => screens.filter(s => !fnOfScreen.has(s.key));
    const bySection = new Map();
    for (const s of rest()) if (s.section) bySection.set(`${s.page}|${s.section}`, [...(bySection.get(`${s.page}|${s.section}`) ?? []), s]);
    for (const list of bySection.values()) { const f = make(list[0].section); for (const s of list) putScreen(f, s); }
    // 3. what navigation connects, variants of one screen together (Home — Light / Home — Dark)
    const left = rest();
    const parent = new Map(left.map(s => [s.key, s.key]));
    const find = k => (parent.get(k) === k ? k : (parent.set(k, find(parent.get(k))), parent.get(k)));
    const join = (a, b) => { if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b)); };
    // Steps of one path (a single way on, a single way in: a wizard), not a tab bar that links everything.
    const outs = k => new Set(nav.filter(([a]) => a === k).map(([, b]) => b));
    const ins = k => new Set(nav.filter(([, b]) => b === k).map(([a]) => a));
    for (const [a, b] of nav) if (outs(a).size === 1 && ins(b).size === 1) join(a, b);
    // Screens about the same thing: the entity their operations return or their layers show.
    const primary = new Map();
    for (const s of left) {
      const count = new Map();
      for (const o of ops) if (o.screen === s.key && o.entity) count.set(o.entity, (count.get(o.entity) ?? 0) + 2);
      for (const e of manifest.links.edges) if (e.rel === 'displays' && e.screen === s.key) { const n = e.field.split('.')[0]; count.set(n, (count.get(n) ?? 0) + 1); }
      const top = [...count].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))[0];
      if (top) primary.set(s.key, top[0]);
    }
    const byEntity = new Map();
    for (const s of left) { const e = primary.get(s.key); if (!e) continue; if (byEntity.has(e)) join(byEntity.get(e), s.key); else byEntity.set(e, s.key); }
    const byBase = new Map();
    for (const s of left) { const b = baseName(s.name).toLowerCase(); if (byBase.has(b)) join(byBase.get(b), s.key); else byBase.set(b, s.key); }
    const groups = new Map();
    for (const s of left) groups.set(find(s.key), [...(groups.get(find(s.key)) ?? []), s]);
    for (const list of groups.values()) {
      // named after the screen the group starts on: one nothing in the group leads to
      const inGroup = new Set(list.map(s => s.key));
      const first = list.find(s => !nav.some(([a, b]) => b === s.key && inGroup.has(a) && a !== s.key)) ?? list[0];
      const f = make(baseName(first.name));
      for (const s of [first, ...list.filter(x => x !== first)]) putScreen(f, s);
    }
  }

  // Operations: the function of the screen they belong to; then API tags; then their data.
  for (const o of ops) { const f = fnOfScreen.get(o.screen); if (f) putOp(f, o); }
  const byName = new Map(items.map(f => [f.name.toLowerCase(), f]));
  for (const o of ops.filter(x => !fnOfOp.has(x.key))) {
    const tag = tagOf(o);
    let f = tag ? byName.get(String(tag).toLowerCase()) : null;
    if (!f && o.entity && isDeclared) f = items.find(x => x.operations.some(k => ops.find(y => y.key === k)?.entity === o.entity)) ?? null;
    if (!f && !isDeclared) {
      const name = tag ?? (o.entity ? `${o.entity}s` : 'Other operations');
      f = byName.get(name.toLowerCase()) ?? make(name);
      byName.set(f.name.toLowerCase(), f);
    }
    if (f) putOp(f, o);
  }
  // MCP tools: the function of the operation they call.
  for (const t of tools) {
    if (fnOfTool.has(t.name)) continue;
    let f = t.op ? fnOfOp.get(t.op) : null;
    if (!f && !isDeclared) f = byName.get('agent tools') ?? make('Agent tools');
    if (f) { fnOfTool.set(t.name, f); f.tools.push(t.name); byName.set(f.name.toLowerCase(), f); }
  }
  for (const ep of endpoints) { const o = ops.find(x => x.endpoint === ep.key); const f = o && fnOfOp.get(o.key); if (f) f.endpoints.push(ep.key); }

  // Who uses each function, what data it touches, where it leads.
  const opBy = new Map(ops.map(o => [o.key, o]));
  for (const f of items) {
    if (f.screens.length) f.actors.push('user');
    if (f.tools.length) f.actors.push('agent');
    if (f.endpoints.length) f.actors.push('api');
    const data = new Map();
    const touch = (name, access) => { if (!name) return; const s = data.get(name) ?? new Set(); s.add(access); data.set(name, s); };
    // an operation without a declared result acts on what the same path returns (PATCH /users/me → User)
    const entityOf = o => o.entity ?? ops.find(x => x.path === o.path && x.entity)?.entity ?? null;
    for (const k of f.operations) { const o = opBy.get(k); touch(entityOf(o), o.method === 'GET' ? 'reads' : 'writes'); }
    for (const e of manifest.links.edges) if (e.rel === 'displays' && f.screens.includes(e.screen)) touch(e.field.split('.')[0], 'reads');
    f.entities = [...data].sort(([a], [b]) => a.localeCompare(b)).map(([name, s]) => ({ name, access: s.has('writes') ? (s.has('reads') ? 'reads, writes' : 'writes') : 'reads' }));
    const next = new Map();
    for (const [a, b] of nav) {
      if (!f.screens.includes(a)) continue;
      const g = fnOfScreen.get(b);
      if (g && g !== f) next.set(g.key, (next.get(g.key) ?? 0) + 1);
    }
    f.next = [...next].map(([to, count]) => ({ to, count }));
  }
  // Reading order: from where the product starts, along the journey.
  const startKey = manifest.flows.find(fl => fl.start)?.start ?? screens[0]?.key;
  const order = [];
  const seen = new Set();
  const visit = f => { if (!f || seen.has(f.key)) return; seen.add(f.key); order.push(f); };
  visit(startKey ? fnOfScreen.get(startKey) : null);
  for (let i = 0; i < order.length; i++) for (const n of order[i].next) visit(items.find(x => x.key === n.to));
  for (const f of items) visit(f);

  return {
    declared: isDeclared,
    items: order,
    unassigned: {
      screens: screens.filter(s => !fnOfScreen.has(s.key)).map(s => s.key),
      operations: ops.filter(o => !fnOfOp.has(o.key)).map(o => o.key),
      tools: tools.filter(t => !fnOfTool.has(t.name)).map(t => t.name),
    },
    missing,
  };
}

/** The function a screen belongs to (or null). */
export const functionOfScreen = (manifest, key) => manifest.functions?.items.find(f => f.screens.includes(key)) ?? null;
export const functionOfOperation = (manifest, key) => manifest.functions?.items.find(f => f.operations.includes(key)) ?? null;

/**
 * The functions in their declared form (what the design stores), from a manifest: declared ones as
 * they are, suggested ones as a starting point. Screens as node ids.
 */
export function toDeclared(manifest) {
  const f = manifest.functions;
  if (!f) return [];
  const screenId = new Map(manifest.screens.map(s => [s.key, s.id]));
  const ops = new Map(manifest.domain.operations.map(o => [o.key, o]));
  const toolOp = new Map((manifest.surface?.mcp?.tools ?? []).map(t => [t.name, t.op]));
  return f.items.map(x => {
    const operations = x.operations.map(k => ops.get(k)).filter(o => o && !screenId.has(o.screen)).map(o => `${o.method} ${o.path}`);
    const tools = x.tools.filter(t => !toolOp.get(t) || !x.operations.includes(toolOp.get(t)));
    return { name: x.name, ...(x.summary ? { summary: x.summary } : {}), screens: x.screens.map(k => screenId.get(k)).filter(v => v != null), ...(operations.length ? { operations } : {}), ...(tools.length ? { tools } : {}) };
  });
}
