// MCP tools to design directly in WeshCraft (no FigCraft app needed): read the design cheaply,
// change it in one batched, undoable call, and get the spec consequences back.
import path from 'node:path';
import { createRequire } from 'node:module';
import { tree, find, props, tokens, subtree } from './describe.mjs';
import { openEditable } from './source.mjs';
import { rememberDesign } from './discover.mjs';
import { buildManifest } from '../model/manifest.mjs';
import { toDeclared, ACTORS } from '../model/functions.mjs';
import { logicToDeclared, architectureToDeclared, RULE_KINDS, COMPONENT_KINDS } from '../model/aspects.mjs';
import { renderPrototype } from '../proto/html.mjs';
import { summaryLine, diffManifests } from '../spec/diff.mjs';

const PROPS_DOC = 'Props: name x y width height visible opacity clip fill (#hex|null) stroke strokeWeight strokeAlign radius (n|[tl,tr,br,bl]) shadow ({x,y,blur,spread,color}|null) blur text fontFamily fontStyle fontWeight fontSize lineHeight (n|"140%"|"auto") letterSpacing align (left|center|right) layout ("vertical"|"horizontal"|"none"|{mode,gap,padding,align,crossAlign,wrap}) gap padding (n|[v,h]|[t,r,b,l]) sizing ({h,v}: fixed|hug|fill) absolute devStatus description. align values: start center end space-between.';
const ID = { description: 'layer id (number or "#12"), an exact layer name, or a ref from the same batch', type: ['number', 'string'] };

const OPS_DOC = [
  'Ops (all in one undo step, applied in order; `ref` names what an op creates so later ops can use it as an id):',
  '{op:"screen", name, width?=393, height?=852, fill?, layout?, ref} new top-level frame (placed right of the others)',
  '{op:"create", type: frame|text|rectangle|ellipse|component|section|star|polygon|line, parent, index?, props, ref}',
  '{op:"set", id, props} · {op:"text", id, text} · {op:"delete", ids:[…]} · {op:"move", id, parent?, index?} · {op:"duplicate", id, parent?, index?, ref}',
  '{op:"instance", component, parent, index?, props?, ref} · {op:"link", id, to (frame) | url | back:true | clear:true}',
  '{op:"bind", id, entity, field, type?} layer shows Entity.field (or clear:true) · {op:"api", id, method, path, returns?} layer triggers (or a screen frame loads) an API call (or clear:true)',
  '{op:"note", id, text} · {op:"token", name, value (#hex|number), mode?, collection?} · {op:"useToken", id, token} · {op:"rename", name}',
  'In a parent with auto layout, children flow (x/y ignored; use sizing); elsewhere x/y are relative to the parent.',
].join('\n');

export const DESIGN_TOOLS = [
  { name: 'design_tree', description: 'Outline of the design, one line per layer: id, type, name, text, size@position, fill, layout, size mode, ▶ links, API annotations, = screen key. Start here. Default: the current page; pass root (a screen) to zoom in.', inputSchema: { type: 'object', properties: { root: ID, depth: { type: 'number', description: 'default 8' } } } },
  { name: 'design_find', description: 'Find layers whose name or text contains query (case-insensitive). Same one-line format as design_tree.', inputSchema: { type: 'object', properties: { query: { type: 'string' }, type: { type: 'string', description: 'text, frame, instance, …' }, root: ID, limit: { type: 'number' } } } },
  { name: 'design_get', description: 'One layer\'s properties in the vocabulary design_edit accepts (plus link, bind, api, notes, token).', inputSchema: { type: 'object', properties: { id: ID }, required: ['id'] } },
  {
    name: 'design_edit',
    description: `Change the design: a batch of operations, one undo step. Specs regenerate automatically; pass wait:true to get the parity result and what changed in the specs.\n${OPS_DOC}\n${PROPS_DOC}`,
    inputSchema: { type: 'object', properties: { ops: { type: 'array', items: { type: 'object' } }, wait: { type: 'boolean' }, label: { type: 'string', description: 'undo label' } }, required: ['ops'] },
  },
  { name: 'design_create', description: `Create one layer. ${PROPS_DOC}`, inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['frame', 'text', 'rectangle', 'ellipse', 'component', 'section', 'star', 'polygon', 'line'] }, parent: ID, index: { type: 'number' }, props: { type: 'object' } }, required: ['type'] } },
  { name: 'design_set', description: `Set properties on one or more layers. ${PROPS_DOC}`, inputSchema: { type: 'object', properties: { ids: { type: 'array', items: ID }, id: ID, props: { type: 'object' } }, required: ['props'] } },
  { name: 'design_text', description: 'Change copy: several text layers at once.', inputSchema: { type: 'object', properties: { edits: { type: 'array', items: { type: 'object', properties: { id: ID, text: { type: 'string' } }, required: ['id', 'text'] } } }, required: ['edits'] } },
  { name: 'design_delete', description: 'Delete layers (and their children). Links pointing into deleted frames are cleared.', inputSchema: { type: 'object', properties: { ids: { type: 'array', items: ID } }, required: ['ids'] } },
  { name: 'design_move', description: 'Reorder a layer or move it into another parent.', inputSchema: { type: 'object', properties: { id: ID, parent: ID, index: { type: 'number' } }, required: ['id'] } },
  { name: 'design_duplicate', description: 'Duplicate a layer or a whole screen (a screen copy goes to the right; links inside it follow).', inputSchema: { type: 'object', properties: { id: ID, parent: ID, index: { type: 'number' } }, required: ['id'] } },
  { name: 'design_screen', description: 'Add a screen (top-level frame), optionally with auto layout, placed right of the others.', inputSchema: { type: 'object', properties: { name: { type: 'string' }, width: { type: 'number' }, height: { type: 'number' }, fill: { type: 'string' }, layout: {} }, required: ['name'] } },
  { name: 'design_link', description: 'Prototype link on click: to a frame (navigate), a url, back, or clear. Becomes an interaction in the screen spec and a navigation edge in flows.', inputSchema: { type: 'object', properties: { id: ID, to: ID, url: { type: 'string' }, back: { type: 'boolean' }, clear: { type: 'boolean' } }, required: ['id'] } },
  { name: 'design_bind', description: 'Bind a layer to data: it shows Entity.field. Becomes an explicit entity field in the domain spec and a ◉ link in the front ⇄ back map.', inputSchema: { type: 'object', properties: { id: ID, entity: { type: 'string' }, field: { type: 'string' }, type: { type: 'string', description: 'string (default), number, boolean, date, url, image, …' }, clear: { type: 'boolean' } }, required: ['id'] } },
  { name: 'design_api', description: 'The API call a layer triggers (button, form) or a screen frame loads: METHOD /path → Returns. Becomes an explicit operation in the API spec and OpenAPI, linked to the layer.', inputSchema: { type: 'object', properties: { id: ID, method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] }, path: { type: 'string' }, returns: { type: 'string' }, clear: { type: 'boolean' } }, required: ['id'] } },
  { name: 'design_tokens', description: 'List design tokens, or create/update one (name + value) and optionally paint layers with it (apply: ids).', inputSchema: { type: 'object', properties: { name: { type: 'string' }, value: { type: ['string', 'number'] }, mode: { type: 'string' }, collection: { type: 'string' }, apply: { type: 'array', items: ID } } } },
  {
    name: 'design_functions',
    description: 'The product functions: how the product works at a glance (Functions view, specs/FUNCTIONS.md). A handful of functions (Sign up, Find a trail, Pay…), each with a one-line purpose and the screens that make it; operations, data, who uses it and where it leads follow from the design. Screen specs, the API spec and the maps refer to them. Without arguments: the current functions (declared, or suggested from the prototype until you declare them) and what no function covers. To change them (one undo step): functions:[{name, summary, screens, operations?, tools?}] replaces the list; set:{name, rename?, summary?, screens?, addScreens?, removeScreens?, operations?, tools?} adds or updates one (the others stay; suggested ones become declared); remove:"name". screens: ids or exact screen names, each screen in one function; operations: "METHOD /path" for API-only operations; tools: MCP tool names not already reached through an operation.',
    inputSchema: { type: 'object', properties: {
      functions: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, summary: { type: 'string' }, screens: { type: 'array', items: ID }, operations: { type: 'array', items: { type: 'string' } }, tools: { type: 'array', items: { type: 'string' } } }, required: ['name'] } },
      set: { type: 'object', properties: { name: { type: 'string' }, rename: { type: 'string' }, summary: { type: 'string' }, screens: { type: 'array', items: ID }, addScreens: { type: 'array', items: ID }, removeScreens: { type: 'array', items: ID }, operations: { type: 'array', items: { type: 'string' } }, tools: { type: 'array', items: { type: 'string' } } }, required: ['name'] },
      remove: { type: 'string' }, wait: { type: 'boolean' },
    } },
  },
  {
    name: 'design_logic',
    description: `Business logic (Logic view, specs/LOGIC.md): rules (${RULE_KINDS.join(', ')}) and the lifecycle of data (state machines). Without arguments: current rules and state machines, declared or inferred (required request fields, status enums and the operations that move them; transitions an operation makes but whose target is unknown are listed as unresolved). To change (one undo step): rule:{name, kind, text, applies} adds or updates a rule (applies: functions, screens, operations "METHOD /path", entities, Entity.field, tools); removeRule:"name"; states:{entity, field?, states:[…], initial?, transitions:[{from (state or "*"), to, via ("METHOD /path" or words)}]} declares or replaces an entity's state machine; removeStates:"Entity"; keep:true declares the inferred ones as they are. Facts the design or API already state (screens, fields, operations) stay there: logic holds what they cannot show.`,
    inputSchema: { type: 'object', properties: {
      rule: { type: 'object', properties: { name: { type: 'string' }, kind: { type: 'string', enum: RULE_KINDS }, text: { type: 'string' }, applies: { type: 'array', items: { type: 'string' } } }, required: ['name'] },
      removeRule: { type: 'string' },
      states: { type: 'object', properties: { entity: { type: 'string' }, field: { type: 'string' }, states: { type: 'array', items: { type: 'string' } }, initial: { type: 'string' }, transitions: { type: 'array', items: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, via: { type: 'string' } } } } }, required: ['entity', 'states'] },
      removeStates: { type: 'string' }, keep: { type: 'boolean' }, wait: { type: 'boolean' },
    } },
  },
  {
    name: 'design_architecture',
    description: `Architecture (Architecture view, specs/ARCHITECTURE.md): the system's components (${COMPONENT_KINDS.join(', ')}) and how they talk. Without arguments: the current architecture (declared, or suggested from the design, the API and the MCP surface). To change (one undo step; a suggested architecture becomes declared): component:{name, kind, tech, description, implements:[functions, screens, "METHOD /path", entities, tools], code:[paths]} adds or updates one; removeComponent:"name"; link:{from, to, label} adds one (same ends: label updated); removeLink:{from, to}; keep:true declares the suggestion as it is.`,
    inputSchema: { type: 'object', properties: {
      component: { type: 'object', properties: { name: { type: 'string' }, rename: { type: 'string' }, kind: { type: 'string', enum: COMPONENT_KINDS }, tech: { type: 'string' }, description: { type: 'string' }, implements: { type: 'array', items: { type: 'string' } }, code: { type: 'array', items: { type: 'string' } } }, required: ['name'] },
      removeComponent: { type: 'string' },
      link: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, label: { type: 'string' } }, required: ['from', 'to'] },
      removeLink: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
      keep: { type: 'boolean' }, wait: { type: 'boolean' },
    } },
  },
  { name: 'design_undo', description: 'Undo the last design change(s), whoever made them (you or the user in the browser).', inputSchema: { type: 'object', properties: { steps: { type: 'number' } } } },
  { name: 'design_redo', description: 'Redo undone design change(s).', inputSchema: { type: 'object', properties: { steps: { type: 'number' } } } },
  { name: 'design_screenshot', description: 'PNG of a screen as the prototype renders it (needs Playwright with Chromium on this machine).', inputSchema: { type: 'object', properties: { id: ID, scale: { type: 'number' } }, required: ['id'] } },
];

export const NEW_DESIGN_TOOL = { name: 'design_new', description: 'Start a new, empty design (design/<name>.figcraft) in this project and edit it here. Only when the project has no design yet.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } };

const out = (t, isError = false) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t) }], isError });

export function screenKeys(ws) {
  return new Map((ws.manifest?.screens ?? []).map(s => [s.id, s.key]));
}

/** Handle a design_* call. `ws` is the Workspace; its source must be editable (except design_new). */
export async function callDesignTool(ws, name, args = {}) {
  if (name === 'design_new') {
    if (ws.source) return out(`this project already has a design: ${ws.describe()}`, true);
    const base = String(args.name || 'design').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'design';
    const file = path.join(ws.outDir, 'design', `${base}.figcraft`);
    ws.useSource(openEditable(file, args.name));
    rememberDesign(ws.outDir, path.relative(ws.outDir, file).split(path.sep).join('/'));
    await ws.run();
    return out({ created: path.relative(ws.outDir, file), next: 'design_screen to add the first screen' });
  }
  const store = ws.source?.store;
  if (!store) return out(ws.source?.kind === 'mcp' ? 'The design lives in a live FigCraft: use the figcraft_* tools.' : ws.source ? 'This WeshCraft is read-only (--read-only): the design cannot be edited here.' : 'No editable design: start with design_new, or serve a .figcraft file.', true);
  const keys = screenKeys(ws);
  const resolve = x => store.resolve(x);
  const done = async (summary, ops) => {
    const res = { ...summary, version: store.version };
    if (!args.wait) return out({ ...res, specs: 'regenerating (live in the browser view)' });
    const before = ws.manifest;
    await ws.settled();
    const r = ws.report;
    res.parity = r ? { ok: r.ok, score: r.score, errors: r.errors, issues: r.issues.slice(0, 15).map(i => `${i.level} ${i.file}: ${i.message}`) } : null;
    res.designChanges = before && ws.manifest ? summaryLine(diffManifests(before, ws.manifest)) : null;
    res.gaps = (ws.manifest?.links?.gaps ?? []).slice(0, 10).map(g => g.message);
    return out(res);
  };
  const edit = (ops, label) => store.apply(ops, { by: 'agent', label });

  switch (name) {
    case 'design_tree': return out(tree(store, { root: args.root != null ? resolve(args.root) : undefined, depth: args.depth ?? 8, screenKeys: keys }));
    case 'design_find': return out(find(store, { query: args.query, type: args.type, root: args.root != null ? resolve(args.root) : undefined, limit: args.limit ?? 40, screenKeys: keys }));
    case 'design_get': return out(props(store, resolve(args.id)));
    case 'design_edit': { const r = edit(args.ops, args.label); return done({ ok: true, refs: r.refs, results: r.results }); }
    case 'design_create': { const r = edit([{ op: 'create', type: args.type, parent: args.parent, index: args.index, props: args.props ?? {}, ref: 'new' }]); return done({ ok: true, id: r.refs.new }); }
    case 'design_set': { const ids = [].concat(args.ids ?? [], args.id ?? []); if (!ids.length) return out('give id or ids', true); edit(ids.map(id => ({ op: 'set', id, props: args.props }))); return done({ ok: true, ids: ids.map(resolve) }); }
    case 'design_text': edit((args.edits ?? []).map(e => ({ op: 'text', id: e.id, text: e.text })), 'Edit copy'); return done({ ok: true, changed: (args.edits ?? []).length });
    case 'design_delete': { const r = edit([{ op: 'delete', ids: args.ids }]); return done({ ok: true, deleted: r.results[0] }); }
    case 'design_move': edit([{ op: 'move', id: args.id, parent: args.parent, index: args.index }]); return done({ ok: true });
    case 'design_duplicate': { const r = edit([{ op: 'duplicate', id: args.id, parent: args.parent, index: args.index, ref: 'copy' }]); return done({ ok: true, id: r.refs.copy }); }
    case 'design_screen': { const r = edit([{ op: 'screen', name: args.name, width: args.width, height: args.height, fill: args.fill, layout: args.layout, ref: 'screen' }]); return done({ ok: true, id: r.refs.screen }); }
    case 'design_link': edit([{ op: 'link', id: args.id, to: args.to, url: args.url, back: args.back, clear: args.clear }]); return done({ ok: true });
    case 'design_bind': edit([{ op: 'bind', id: args.id, entity: args.entity, field: args.field, type: args.type, clear: args.clear }]); return done({ ok: true });
    case 'design_api': edit([{ op: 'api', id: args.id, method: args.method, path: args.path, returns: args.returns, clear: args.clear }]); return done({ ok: true });
    case 'design_tokens': {
      if (!args.name) return out(tokens(store));
      const ops = [];
      if (args.value != null) ops.push({ op: 'token', name: args.name, value: args.value, mode: args.mode, collection: args.collection });
      for (const id of args.apply ?? []) ops.push({ op: 'useToken', id, token: args.name });
      if (!ops.length) return out('give value (to create/update) and/or apply (ids to paint)', true);
      edit(ops, `Token ${args.name}`);
      return done({ ok: true, token: args.name });
    }
    case 'design_functions': {
      const m = ws.manifest;
      if (args.functions == null && args.set == null && args.remove == null) {
        const fns = m?.functions;
        if (!fns) return out('no run yet: try again in a moment', true);
        const scr = new Map(m.screens.map(s => [s.key, s]));
        const op = new Map(m.domain.operations.map(o => [o.key, `${o.method} ${o.path}`]));
        const name = new Map(fns.items.map(f => [f.key, f.name]));
        return out({
          declared: fns.declared,
          ...(fns.declared ? {} : { note: 'suggested from the prototype: declare them (functions:[…] or set:{…}) to make them the product\'s' }),
          functions: fns.items.map(f => ({ name: f.name, summary: f.summary || undefined, who: f.actors.map(a => ACTORS[a]), screens: f.screens.map(k => `${scr.get(k).name} #${scr.get(k).id}`), operations: f.operations.map(k => op.get(k)), tools: f.tools.length ? f.tools : undefined, data: f.entities.map(e => `${e.name} (${e.access})`), next: f.next.map(n => name.get(n.to)) })),
          notCovered: { screens: fns.unassigned.screens.map(k => `${scr.get(k).name} #${scr.get(k).id}`), operations: fns.unassigned.operations.map(k => op.get(k)), tools: fns.unassigned.tools },
          ...(fns.missing.length ? { unknownRefs: fns.missing } : {}),
        });
      }
      // Work from what the design holds now (the manifest may lag a few hundred ms behind).
      const keyToId = new Map((m?.screens ?? []).map(s => [s.key, s.id]));
      const ref = x => (keyToId.has(x) ? keyToId.get(x) : store.screenRef(x));
      let list = args.functions ?? store.getFunctions() ?? (m ? toDeclared(m) : []);
      list = list.map(f => ({ ...f, screens: (f.screens ?? []).map(ref) }));
      if (args.set) {
        const st = args.set;
        const i = list.findIndex(f => f.name.toLowerCase() === String(st.name).trim().toLowerCase());
        const cur = i >= 0 ? { ...list[i] } : { name: String(st.name).trim(), screens: [] };
        if (st.rename) cur.name = String(st.rename).trim();
        if (st.summary != null) cur.summary = st.summary;
        if (st.screens) cur.screens = st.screens.map(ref);
        if (st.addScreens) cur.screens = [...new Set([...cur.screens, ...st.addScreens.map(ref)])];
        if (st.removeScreens) { const rm = new Set(st.removeScreens.map(ref)); cur.screens = cur.screens.filter(x => !rm.has(x)); }
        if (st.operations) cur.operations = st.operations;
        if (st.tools) cur.tools = st.tools;
        // a screen belongs to one function: taken from the others
        const mine = new Set(cur.screens);
        list = list.map((f, j) => (j === i ? f : { ...f, screens: f.screens.filter(x => !mine.has(x)) }));
        if (i >= 0) list[i] = cur; else list.push(cur);
      }
      if (args.remove != null) list = list.filter(f => f.name.toLowerCase() !== String(args.remove).trim().toLowerCase());
      const r = edit([{ op: 'functions', functions: list }], 'Product functions');
      return done({ ok: true, functions: (r.results[0] ?? []).map(f => `${f.name} (${f.screens.length} screens)`) });
    }
    case 'design_logic': {
      const m = ws.manifest;
      const change = args.rule || args.removeRule != null || args.states || args.removeStates != null || args.keep;
      if (!change) {
        if (!m?.logic) return out('no run yet: try again in a moment', true);
        const name = id => { const o = m.domain.operations.find(x => x.key === id); return o ? `${o.method} ${o.path}` : m.screens.find(x => x.key === id)?.name ?? m.functions?.items.find(x => x.key === id)?.name ?? m.components.find(x => x.key === id)?.name ?? id.replace(/^(entity|tool|field):/, ''); };
        return out({
          declared: m.logic.declared,
          rules: m.logic.rules.map(r => ({ name: r.name, kind: r.kind, text: r.text || undefined, applies: r.applies.map(name), source: r.source })),
          states: m.logic.machines.map(x => ({ entity: x.entity, field: x.field, states: x.states, initial: x.initial, transitions: x.transitions.map(t => `${t.from} → ${t.to}${t.via ? ` (${t.via})` : ''}`), ...(x.unresolved?.length ? { unresolved: x.unresolved.map(u => `${u.via}: target state unknown`) } : {}), source: x.source })),
          ...(m.logic.missing.length ? { unknownRefs: m.logic.missing } : {}),
        });
      }
      const cur = store.getAspect('logic') ?? (m ? logicToDeclared(m, { includeInferred: !!args.keep }) : { rules: [], states: [] });
      let rules = [...(cur.rules ?? [])], states = [...(cur.states ?? [])];
      if (args.keep && m) { const inf = logicToDeclared(m, { includeInferred: true }); for (const r of inf.rules) if (!rules.some(x => x.name === r.name)) rules.push(r); for (const x of inf.states) if (!states.some(y => y.entity === x.entity)) states.push(x); }
      if (args.rule) { const i = rules.findIndex(r => r.name.toLowerCase() === String(args.rule.name).trim().toLowerCase()); const r = { ...(i >= 0 ? rules[i] : {}), ...args.rule }; if (i >= 0) rules[i] = r; else rules.push(r); }
      if (args.removeRule != null) rules = rules.filter(r => r.name.toLowerCase() !== String(args.removeRule).trim().toLowerCase());
      if (args.states) { const i = states.findIndex(x => x.entity.toLowerCase() === String(args.states.entity).trim().toLowerCase() && (x.field ?? 'status') === (args.states.field ?? x.field ?? 'status')); if (i >= 0) states[i] = args.states; else states.push(args.states); }
      if (args.removeStates != null) states = states.filter(x => x.entity.toLowerCase() !== String(args.removeStates).trim().toLowerCase());
      const r = edit([{ op: 'logic', logic: { rules, states } }], 'Logic');
      return done({ ok: true, rules: r.results[0].rules.length, states: r.results[0].states.map(x => x.entity) });
    }
    case 'design_architecture': {
      const m = ws.manifest;
      const change = args.component || args.removeComponent != null || args.link || args.removeLink || args.keep;
      if (!change) {
        if (!m?.architecture) return out('no run yet: try again in a moment', true);
        const a = m.architecture;
        const name = new Map(a.components.map(c => [c.key, c.name]));
        const decl = architectureToDeclared(m);
        return out({ declared: a.declared, ...(a.declared ? {} : { note: 'suggested from the design and the surface: declare it (keep:true, or component/link) to make it the product\'s' }), components: decl.components, links: a.links.map(l => `${name.get(l.from)} → ${name.get(l.to)}${l.label ? ` (${l.label})` : ''}`), ...(a.missing.length ? { unknownRefs: a.missing } : {}) });
      }
      const cur = store.getAspect('architecture') ?? (m ? architectureToDeclared(m) : { components: [], links: [] });
      let components = [...(cur.components ?? [])], links = [...(cur.links ?? [])];
      const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
      if (args.component) {
        const c = args.component;
        const i = components.findIndex(x => same(x.name, c.name));
        const { rename, ...rest } = c;
        const next = { ...(i >= 0 ? components[i] : {}), ...rest, ...(rename ? { name: rename } : {}) };
        if (i >= 0) { components[i] = next; if (rename) links = links.map(l => ({ ...l, from: same(l.from, c.name) ? rename : l.from, to: same(l.to, c.name) ? rename : l.to })); } else components.push(next);
      }
      if (args.removeComponent != null) { components = components.filter(x => !same(x.name, args.removeComponent)); links = links.filter(l => !same(l.from, args.removeComponent) && !same(l.to, args.removeComponent)); }
      if (args.link) { const i = links.findIndex(l => same(l.from, args.link.from) && same(l.to, args.link.to)); if (i >= 0) links[i] = { ...links[i], ...args.link }; else links.push(args.link); }
      if (args.removeLink) links = links.filter(l => !(same(l.from, args.removeLink.from) && same(l.to, args.removeLink.to)));
      const r = edit([{ op: 'architecture', architecture: { components, links } }], 'Architecture');
      return done({ ok: true, components: r.results[0].components.map(c => c.name), links: r.results[0].links.length });
    }
    case 'design_undo': case 'design_redo': {
      const labels = [];
      for (let i = 0; i < Math.max(1, args.steps ?? 1); i++) { const l = name === 'design_undo' ? store.undo('agent') : store.redo('agent'); if (!l) break; labels.push(l); }
      return done({ ok: labels.length > 0, [name === 'design_undo' ? 'undone' : 'redone']: labels });
    }
    case 'design_screenshot': return screenshot(ws, store, resolve(args.id), args.scale ?? 2);
    default: return out(`unknown tool ${name}`, true);
  }
}

async function screenshot(ws, store, id, scale) {
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { return out('design_screenshot needs Playwright (npm i -g playwright && npx playwright install chromium). The live view shows the same screen.', true); }
  const model = store.toModel();
  const manifest = buildManifest(model);
  const html = renderPrototype(model, manifest);
  const browser = await chromium.launch(process.env.WESHCRAFT_CHROMIUM ? { executablePath: process.env.WESHCRAFT_CHROMIUM } : {});
  try {
    const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { width: 1400, height: 1000 } });
    await page.setContent(html, { waitUntil: 'load' });
    const sel = `[data-node="${id}"]`;
    await page.evaluate(s => { const el = document.querySelector(s); const sec = el?.closest('.sc-screen'); document.querySelectorAll('.sc-screen').forEach(x => { x.hidden = x !== sec; }); }, sel);
    const el = await page.$(sel);
    if (!el) return out(`#${id} is not on a screen (only layers inside screens render)`, true);
    const png = await el.screenshot({ type: 'png' });
    return { content: [{ type: 'image', data: png.toString('base64'), mimeType: 'image/png' }, { type: 'text', text: `#${id} at ${scale}x` }], isError: false };
  } finally { await browser.close(); }
}

export { subtree };
