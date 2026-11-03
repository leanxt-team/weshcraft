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
    if (m) return { method: m[1], path: m[2], confidence: 'explicit', note: a.label };
  }
  const pd = node.pluginData?.weshcraft;
  if (pd) {
    try {
      const j = JSON.parse(pd);
      if (j.action) {
        const [method, path] = String(j.action).split(/\s+/);
        return { method: method.toUpperCase(), path, confidence: 'explicit', note: j.note };
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
    for (const a of n.annotations || []) annotations.push({ id: n.id, name: n.name, label: a.label, category: a.category ?? null, properties: a.properties ?? [] });
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
      for (const [prop] of textProps) addField(entity, camel(prop.replace(/#.*$/, '')), 'string', list[0].id, 'inferred');
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
        operations.push({ key: `op-${slug(a.label || a.name)}-${a.id}`, name: a.label || a.name, method: api.method, path: api.path, screen: s.key, trigger: a.id, entity: null, kind: 'annotated', confidence: 'explicit', sources: [a.id], fields: s.inputs.map(i => i.id) });
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
        operations.push({ key: `op-${slug(api.method + ' ' + api.path)}-${n.id}`, name: n.label, method: api.method, path: api.path, screen: s.key, trigger: n.id, entity: null, kind: 'annotated', confidence: 'explicit', sources: [n.id], fields: [] });
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

export function buildManifest(model, { sourceName = model.name } = {}) {
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
  const manifest = {
    schema: 'weshcraft/manifest@1',
    source: { name: sourceName, truncated: !!model.truncated },
    screens, components, tokens: tokensOf(model), flows, domain,
  };
  manifest.source.hash = sha({ screens, components, tokens: manifest.tokens, flows, domain }, 16);
  return manifest;
}
