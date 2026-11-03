// The proto manifest: a deterministic, exhaustive inventory of what the visual prototype shows.
// Specs are written against it (every item cites node ids), and the parity check compares specs
// to a freshly extracted manifest. Same document in, byte-identical manifest out.
import { sha, slug, pascal, camel } from '../util/common.mjs';
import { descendants } from './normalize.mjs';

const SCREEN_TYPES = new Set(['frame', 'component', 'componentSet', 'instance']);
const INPUT_RE = /\b(input|field|text ?field|search|email|password|textarea|select|dropdown|picker|checkbox|toggle|switch|radio|slider|stepper)\b/i;
const BUTTON_RE = /\b(button|btn|cta|link|chip|tab|fab)\b/i;
const MUTATE_RE = /\b(save|create|add|new|submit|send|sign ?up|register|log ?in|sign ?in|continue|confirm|start|book|buy|pay|delete|remove|update|edit|allow|follow|join|apply|upload|post|publish|invite|done|finish)\b/i;

/** A layer's binding hints: pluginData.weshcraft JSON, `{{entity.field}}` in text, `@entity.field` in name. */
export function bindingOf(node) {
  const pd = node.pluginData?.weshcraft;
  if (pd) {
    try { return { ...JSON.parse(pd), confidence: 'explicit' }; } catch { /* ignore bad JSON */ }
  }
  const m = /\{\{\s*([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)\s*(?::\s*(\w+))?\}\}/.exec(node.text?.characters ?? '')
    || /@([A-Za-z_]\w*)\.([A-Za-z_]\w*)(?::(\w+))?/.exec(node.name ?? '');
  if (m) return { entity: pascal(m[1]), field: camel(m[2]), type: m[3] || 'string', confidence: 'explicit' };
  return null;
}

function apiAnnotation(node) {
  for (const a of node.annotations || []) {
    const m = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/[\w\-/{}.:]*)/.exec(a.label || '');
    // Optional result: `GET /users/me → User` (or `-> User`, `returns User`).
    const r = /(?:→|->|returns)\s*([A-Za-z]\w*)/.exec(a.label || '');
    if (m) return { method: m[1], path: m[2], confidence: 'explicit', note: a.label, entity: r ? pascal(r[1]) : null };
  }
  const pd = node.pluginData?.weshcraft;
  if (pd) {
    try {
      const j = JSON.parse(pd);
      if (j.action) {
        const [method, path] = String(j.action).split(/\s+/);
        return { method: method.toUpperCase(), path, confidence: 'explicit', note: j.note, entity: j.returns ? pascal(j.returns) : null };
      }
    } catch { /* ignore */ }
  }
  return null;
}

function tokenIndex(model) {
  const byId = new Map(model.variables.variables.map(v => [v.id, v]));
  return id => byId.get(id)?.name ?? null;
}

function textOf(model, id) {
  const n = model.nodes.get(id);
  if (n?.text) return n.text.characters;
  for (const d of descendants(model, id)) if (d.text && d.visible) return d.text.characters;
  return '';
}

/** Nodes whose content is part of the spec contract, per screen. */
function screenContents(model, screen, tok) {
  const texts = [], instances = [], actions = [], inputs = [], bindings = [], annotations = [], colors = new Set();
  const all = [screen, ...descendants(model, screen.id)];
  for (const n of all) {
    if (!n.visible) continue;
    for (const f of n.fills) if (f.type === 'solid') colors.add(f.hex);
    if (n.text) {
      texts.push({
        id: n.id, name: n.name, characters: n.text.characters,
        font: `${n.text.fontFamily} ${n.text.fontStyle} ${n.text.fontSize}`,
        color: n.fills[0]?.hex ?? null, token: tok(n.bound?.fill) ?? null,
      });
    }
    if (n.type === 'instance') {
      instances.push({ id: n.id, name: n.name, component: n.component, props: n.componentProps || {} });
    }
    for (const it of n.interactions || []) {
      for (const a of it.actions || []) {
        actions.push({
          id: n.id, name: n.name, label: textOf(model, n.id), trigger: it.trigger?.type ?? 'onClick',
          type: a.type, dest: a.dest ?? null, transition: it.transition?.type ?? null,
          durationMs: it.duration_ms ?? it.durationMs ?? null, url: a.url ?? null,
        });
      }
    }
    if (n !== screen && INPUT_RE.test(n.name) && (n.type === 'instance' || n.type === 'frame' || n.type === 'component')) {
      inputs.push({ id: n.id, name: n.name, placeholder: textOf(model, n.id), kind: (INPUT_RE.exec(n.name)[1] || 'input').toLowerCase().replace(' ', '') });
    }
    const b = bindingOf(n);
    if (b) bindings.push({ id: n.id, name: n.name, ...b });
    for (const a of n.annotations || []) annotations.push({ id: n.id, name: n.name, text: textOf(model, n.id), label: a.label, category: a.category ?? null, properties: a.properties ?? [] });
  }
  return { texts, instances, actions, inputs, bindings, annotations, colors: [...colors].sort(), nodeIds: all.map(n => n.id) };
}

/** The structural fingerprint of a subtree: changes whenever anything visible in it changes. */
function fingerprint(model, id) {
  // Only properties every FigCraft transport reports (file and MCP), so a snapshot taken live
  // and one re-read from the saved file in CI fingerprint the same.
  const pick = n => ({
    n: n.name, t: n.type, x: n.x, y: n.y, w: n.width, h: n.height, v: n.visible, o: n.opacity, f: n.fills, s: n.strokes,
    r: n.radius, l: n.layout, z: n.sizing, i: n.interactions, c: n.component, b: n.bound,
    tx: n.text && { c: n.text.characters, f: n.text.fontFamily, s: n.text.fontStyle, z: n.text.fontSize, lh: n.text.lineHeight, ls: n.text.letterSpacing, a: n.text.align },
  });
  const n = model.nodes.get(id);
  return sha([pick(n), ...[...descendants(model, id)].map(d => [d.id, pick(d)])]);
}

function screensOf(model) {
  const out = [];
  for (const pid of model.pages) {
    const page = model.nodes.get(pid);
    const visit = (ids, section) => {
      for (const id of ids) {
        const n = model.nodes.get(id);
        if (!n) continue;
        if (n.type === 'section') { visit(n.children, n.name); continue; }
        if (SCREEN_TYPES.has(n.type) && n.type !== 'componentSet' && n.type !== 'component') out.push({ node: n, page, section });
      }
    };
    visit(page.children, null);
  }
  return out;
}

function componentsOf(model) {
  const out = [];
  for (const n of model.nodes.values()) {
    if (n.type === 'componentSet') {
      out.push({
        id: n.id, key: `cmp-${slug(n.name)}`, name: n.name, kind: 'set', description: n.description,
        variants: n.children.map(c => model.nodes.get(c)).filter(Boolean).map(v => ({ id: v.id, name: v.name, width: v.width, height: v.height })),
        fingerprint: fingerprint(model, n.id), nodeIds: [n.id, ...[...descendants(model, n.id)].map(d => d.id)],
      });
    } else if (n.type === 'component' && model.nodes.get(n.parent)?.type !== 'componentSet') {
      out.push({ id: n.id, key: `cmp-${slug(n.name)}`, name: n.name, kind: 'component', description: n.description, propDefs: n.propDefs, variants: [], fingerprint: fingerprint(model, n.id), nodeIds: [n.id, ...[...descendants(model, n.id)].map(d => d.id)] });
    }
  }
  // Disambiguate equal keys deterministically.
  const seen = new Map();
  for (const c of out.sort((a, b) => a.id - b.id)) {
    const k = seen.get(c.key) ?? 0;
    seen.set(c.key, k + 1);
    if (k) c.key = `${c.key}-${k + 1}`;
  }
  return out;
}

function componentOwner(model, compId) {
  const n = model.nodes.get(compId);
  if (!n) return null;
  const p = model.nodes.get(n.parent);
  return p?.type === 'componentSet' ? p.id : n.id;
}

function tokensOf(model) {
  const { collections, variables } = model.variables;
  const modeName = new Map(collections.flatMap(c => c.modes.map(m => [m.id, `${c.name}/${m.name}`])));
  return {
    collections: collections.map(c => ({ id: c.id, name: c.name, modes: c.modes.map(m => m.name) })),
    variables: variables.map(v => ({
      id: v.id, name: v.name, type: v.type, cssVar: `--${slug(v.name)}`,
      values: Object.fromEntries(Object.entries(v.values).map(([m, val]) => [modeName.get(m) ?? m, val])),
    })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

/** Backend contract inferred from bindings, inputs, repeated components and actions. */
function domainOf(model, screens, components) {
  const entities = new Map();
  const addField = (entity, field, type, source, confidence) => {
    const e = entities.get(entity) ?? { name: entity, fields: new Map(), sources: new Set(), confidence };
    if (confidence === 'explicit') e.confidence = 'explicit';
    const f = e.fields.get(field) ?? { name: field, type, sources: [], confidence };
    f.sources.push(source);
    if (confidence === 'explicit') { f.confidence = 'explicit'; f.type = type; }
    e.fields.set(field, f);
    e.sources.add(source);
    entities.set(entity, e);
  };
  const compName = new Map(components.map(c => [c.id, c]));
  const operations = [];
  for (const s of screens) {
    for (const b of s.bindings) if (b.entity && b.field) addField(b.entity, b.field, b.type || 'string', b.id, 'explicit');
    // Repeated instances of one component inside one auto layout parent => a list of an entity.
    const groups = new Map();
    for (const inst of s.instances) {
      const parent = model.nodes.get(inst.id)?.parent;
      const owner = componentOwner(model, inst.component);
      const key = `${parent}:${owner}`;
      groups.set(key, [...(groups.get(key) ?? []), inst]);
    }
    for (const [, list] of groups) {
      const owner = componentOwner(model, list[0].component);
      const comp = compName.get(owner);
      if (!comp) continue;
      const repeated = list.length >= 2;
      const textProps = Object.entries(list[0].props || {}).filter(([, v]) => typeof v === 'string' || (v && typeof v.value === 'string'));
      if (!repeated && !textProps.length) continue;
      if (textProps.length === 0 && !repeated) continue;
      const entity = pascal(comp.name.replace(/\b(card|row|item|tile|cell|list|component|featured)\b/gi, '').trim() || comp.name);
      if (!textProps.length) continue;
      // Each text property is a field; its sources are the text layers that show its value in
      // every instance (matched by value), so front-end layers link to the exact field they show.
      for (const [prop] of textProps) {
        const field = camel(prop.replace(/#.*$/, ''));
        for (const inst of list) {
          const v = inst.props?.[prop];
          const value = typeof v === 'object' ? v?.value : v;
          const shown = [...descendants(model, inst.id)].filter(d => d.text && d.visible && d.text.characters === value);
          if (shown.length) for (const d of shown) addField(entity, field, 'string', d.id, 'inferred');
          else addField(entity, field, 'string', inst.id, 'inferred');
        }
      }
      if (repeated) {
        operations.push({
          key: `op-list-${slug(entity)}-${s.key}`, name: `List ${entity}`, method: 'GET', path: `/${slug(entity)}s`,
          screen: s.key, trigger: null, entity, kind: 'list', confidence: 'inferred', sources: list.map(i => i.id),
        });
      }
    }
    // Actions that mutate (by label) or that the designer annotated with an endpoint.
    for (const a of s.actions) {
      const node = model.nodes.get(a.id);
      const api = apiAnnotation(node);
      if (api) {
        operations.push({ key: `op-${slug(a.label || a.name)}-${a.id}`, name: a.label || a.name, method: api.method, path: api.path, screen: s.key, trigger: a.id, entity: api.entity, kind: 'annotated', confidence: 'explicit', sources: [a.id], fields: s.inputs.map(i => i.id) });
      } else if (MUTATE_RE.test(a.label) && (BUTTON_RE.test(a.name) || a.label)) {
        const verb = MUTATE_RE.exec(a.label)[1].toLowerCase();
        operations.push({
          key: `op-${slug(a.label)}-${a.id}`, name: a.label, method: /delete|remove/.test(verb) ? 'DELETE' : /update|edit/.test(verb) ? 'PATCH' : 'POST',
          path: `/${slug(s.name.replace(/^\d+\s*/, ''))}/${slug(verb)}`, screen: s.key, trigger: a.id, entity: null, kind: 'action',
          confidence: 'inferred', sources: [a.id], fields: s.inputs.map(i => i.id),
        });
      }
    }
    for (const n of s.annotations) {
      const api = apiAnnotation(model.nodes.get(n.id));
      if (api && !operations.some(o => o.trigger === n.id)) {
        operations.push({ key: `op-${slug(api.method + ' ' + api.path)}-${n.id}`, name: n.label, method: api.method, path: api.path, screen: s.key, trigger: api.entity && n.id === s.id ? null : n.id, entity: api.entity, kind: 'annotated', confidence: 'explicit', sources: [n.id], fields: api.method === 'GET' ? [] : s.inputs.map(i => i.id) });
      }
    }
  }
  const dedup = new Map();
  for (const o of operations) if (!dedup.has(o.key)) dedup.set(o.key, o);
  return {
    entities: [...entities.values()].map(e => ({
      name: e.name, confidence: e.confidence, sources: [...e.sources].sort((a, b) => a - b),
      fields: [...e.fields.values()].map(f => ({ ...f, sources: [...new Set(f.sources)].sort((a, b) => a - b) })),
    })).sort((a, b) => a.name.localeCompare(b.name)),
    operations: [...dedup.values()],
  };
}

/**
 * Front <-> back links: which layer triggers which operation, which inputs it submits, which
 * repeated layers an operation fills, which layers display which entity field, and the gaps
 * (data shown that no operation loads, operations nothing on screen triggers or shows).
 */
export function buildLinks(screens, domain) {
  const screenOf = new Map();
  for (const s of screens) for (const id of s.nodeIds) screenOf.set(id, s.key);
  const nodeName = new Map();
  for (const s of screens) {
    nodeName.set(s.id, s.name);
    for (const t of s.texts) nodeName.set(t.id, t.characters.length > 40 ? `${t.characters.slice(0, 40)}…` : t.characters);
    for (const i of s.instances) if (!nodeName.has(i.id)) nodeName.set(i.id, i.name);
    for (const i of s.inputs) nodeName.set(i.id, i.name);
    for (const a of s.actions) nodeName.set(a.id, a.label || a.name);
    for (const a of s.annotations) if (!nodeName.has(a.id)) nodeName.set(a.id, a.text || a.name);
  }
  const edges = [];
  const add = (rel, node, target, extra = {}) => {
    if (node == null) return;
    edges.push({ rel, node, screen: screenOf.get(node) ?? null, label: nodeName.get(node) ?? `#${node}`, ...target, ...extra });
  };
  for (const o of domain.operations) {
    if (o.trigger != null) add('triggers', o.trigger, { op: o.key });
    for (const f of o.fields || []) add('submits', f, { op: o.key });
    if (o.kind === 'list') for (const id of o.sources) add('lists', id, { op: o.key });
  }
  for (const e of domain.entities) for (const f of e.fields) for (const id of f.sources) add('displays', id, { field: `${e.name}.${f.name}` });
  // Which operation brings each displayed field to its screen.
  const loads = new Map();
  for (const o of domain.operations) if (o.entity) loads.set(`${o.screen}|${o.entity}`, o.key);
  for (const e of edges) if (e.rel === 'displays') e.via = loads.get(`${e.screen}|${e.field.split('.')[0]}`) ?? null;
  const gaps = [];
  for (const e of edges.filter(x => x.rel === 'displays' && !x.via)) gaps.push({ kind: 'unloaded-data', node: e.node, screen: e.screen, field: e.field, message: `${e.field} is shown on ${e.screen} but no operation on that screen loads ${e.field.split('.')[0]}` });
  for (const o of domain.operations) if (!edges.some(x => x.op === o.key || x.via === o.key)) gaps.push({ kind: 'unused-operation', op: o.key, message: `${o.method} ${o.path} is not triggered or shown by any layer` });
  const dedupGaps = [...new Map(gaps.map(g => [`${g.kind}|${g.screen}|${g.field ?? g.op}`, g])).values()];
  return { edges, gaps: dedupGaps };
}

/** A document with no pages: for services whose only "front" is an MCP server or an API. */
export function emptyModel(name = 'Service') {
  return { name, pages: [], nodes: new Map(), variables: { collections: [], variables: [] }, styles: [], comments: [], truncated: false };
}

const tokens = s => String(s ?? '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
const singular = w => w.replace(/ies$/, 'y').replace(/s$/, '');

/** Fold the MCP/API surface into the manifest: entities, operations and front ⇄ back links. */
function surfaceInto(surface, domain, links) {
  const out = { name: surface.name, mcp: null, api: null };
  const strip = x => { const { origin, ...rest } = x; return rest; };
  if (surface.api) {
    const api = strip(surface.api);
    out.api = api;
    // Entities: schemas the API returns (resources), with typed fields.
    const returned = new Set(api.endpoints.flatMap(e => e.responses.map(r => r.schema)).filter(n => n && api.schemas[n]));
    for (const name of [...returned].sort()) {
      const sch = api.schemas[name];
      const existing = domain.entities.find(e => e.name === name);
      const fields = sch.fields.filter(f => !f.name.includes('.')).map(f => ({ name: f.name, type: f.format === 'email' ? 'email' : f.format === 'date' ? 'date' : f.format === 'date-time' ? 'datetime' : f.format === 'uuid' ? 'id' : f.type, sources: [], confidence: 'explicit', required: !!f.required, ...(f.enum ? { enum: f.enum } : {}) }));
      if (existing) { for (const f of fields) if (!existing.fields.some(x => x.name === f.name)) existing.fields.push(f); existing.confidence = 'explicit'; existing.schema = name; }
      else domain.entities.push({ name, confidence: 'explicit', sources: [], fields, schema: name });
    }
    domain.entities.sort((a, b) => a.name.localeCompare(b.name));
    // Operations: one per endpoint (a visual operation on the same method + path is the same one).
    for (const ep of api.endpoints) {
      const ok = ep.responses.find(r => /^2/.test(r.status) && r.schema && api.schemas[r.schema]);
      const same = domain.operations.find(o => o.method === ep.method && o.path === ep.path);
      if (same) { same.endpoint = ep.key; same.confidence = 'explicit'; continue; }
      domain.operations.push({
        key: `op-${ep.key}`, name: ep.summary || ep.operationId || `${ep.method} ${ep.path}`, method: ep.method, path: ep.path, screen: 'api',
        trigger: null, entity: ok ? ok.schema : null, kind: ok?.list ? 'list' : 'endpoint', confidence: 'explicit', sources: [], fields: [], endpoint: ep.key,
      });
    }
    for (const ep of api.endpoints) {
      const op = domain.operations.find(o => o.endpoint === ep.key);
      links.edges.push({ rel: 'exposes', node: `ep:${ep.method} ${ep.path}`, screen: 'api', label: `${ep.method} ${ep.path}`, op: op.key });
    }
  }
  if (surface.mcp) {
    const mcp = strip(surface.mcp);
    out.mcp = mcp;
    const explicit = new Map((surface.links || []).filter(l => l.tool).map(l => [l.tool, l.endpoint ?? null]));
    for (const t of mcp.tools) {
      let op = null;
      if (explicit.has(t.name)) {
        const target = explicit.get(t.name);
        if (target) { const [m, ...p] = target.split(/\s+/); op = domain.operations.find(o => o.method === m.toUpperCase() && o.path === p.join(' ')); }
        t.link = target ? 'explicit' : 'none';
      } else if (out.api) {
        // Same words as an operationId (create_invoice <-> createInvoice), singular/plural tolerant.
        const want = tokens(t.name).map(singular).join(' ');
        const ep = out.api.endpoints.find(e => tokens(e.operationId).map(singular).join(' ') === want);
        if (ep) { op = domain.operations.find(o => o.endpoint === ep.key); t.link = 'inferred'; }
      }
      t.op = op?.key ?? null;
      if (op) links.edges.push({ rel: 'invokes', node: `tool:${t.name}`, screen: 'mcp', label: t.name, op: op.key });
    }
  }
  // Operations nothing reaches are gaps unless a public endpoint is the reason they exist.
  links.gaps = links.gaps.filter(g => g.kind !== 'unused-operation' || !links.edges.some(e => e.op === g.op));
  return out;
}

export function buildManifest(model, { sourceName = model.name, surface = null } = {}) {
  const tok = tokenIndex(model);
  const components = componentsOf(model);
  const keys = new Map();
  const screens = screensOf(model).map(({ node, page, section }) => {
    let key = `scr-${slug(node.name)}`;
    const k = keys.get(key) ?? 0;
    keys.set(key, k + 1);
    if (k) key = `${key}-${k + 1}`;
    const c = screenContents(model, node, tok);
    return {
      id: node.id, key, name: node.name, page: page.name, section, width: node.width, height: node.height,
      devStatus: node.devStatus, background: node.fills[0] ?? null,
      fingerprint: fingerprint(model, node.id), ...c,
    };
  });
  const byId = new Map(screens.map(s => [s.id, s]));
  const screenOfNode = id => {
    let n = model.nodes.get(id);
    while (n) { if (byId.has(n.id)) return byId.get(n.id).key; n = model.nodes.get(n.parent); }
    return null;
  };
  for (const s of screens) for (const a of s.actions) a.destScreen = a.dest != null ? screenOfNode(a.dest) : null;
  const flows = model.pages.flatMap(pid => (model.nodes.get(pid).flows || []).map(f => ({ name: f.name, start: screenOfNode(f.start), description: f.description || '' })));
  const usage = new Map();
  for (const s of screens) for (const i of s.instances) {
    const owner = componentOwner(model, i.component);
    usage.set(owner, [...new Set([...(usage.get(owner) ?? []), s.key])]);
  }
  for (const c of components) c.usedIn = usage.get(c.id) ?? [];
  const domain = domainOf(model, screens, components);
  const links = buildLinks(screens, domain);
  const surf = surface ? surfaceInto(surface, domain, links) : null;
  const manifest = {
    schema: 'weshcraft/manifest@2',
    source: { name: screens.length ? sourceName : surf?.name ?? sourceName, truncated: !!model.truncated },
    screens, components, tokens: tokensOf(model), flows, domain, links,
    ...(surf ? { surface: surf } : {}),
  };
  manifest.source.hash = sha({ screens, components, tokens: manifest.tokens, flows, domain, links, surface: surf }, 16);
  return manifest;
}
