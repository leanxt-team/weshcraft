// WeshCraft's MCP surface: one small set of tools for the whole product, the same in every client
// (Claude Code, OpenCode, OpenChamber). Reads go through one tool, every change through another:
//   weshcraft_status    where things stand and what to do next
//   weshcraft_read      the design (tree, find, layer, tokens, screenshot), the product (functions,
//                       logic, data, api, architecture, links, trace), the specs (spec, folders, manifest, parity)
//   weshcraft_edit      every change in one batch, one undo step: layers, copy, links, data bindings, API
//                       calls, tokens, and the product (functions, rules, lifecycles, components), spec folders
//   weshcraft_notes     the Notes block of a spec (what the design cannot say)
//   weshcraft_generate  regenerate the specs (also automatic after every change) and check parity
//   weshcraft_sync      sync to git / GitHub / GitLab, open a PR/MR
//   weshcraft_new       start a design (only when the project has none)
// The finer tools behind them (design_*, weshcraft_* of earlier versions) still answer when called by
// name, for older clients; they are not listed.
import { toDeclared } from '../model/functions.mjs';
import { logicToDeclared, architectureToDeclared, RULE_KINDS, COMPONENT_KINDS } from '../model/aspects.mjs';
import { searchTech, techFacts, matchTech } from '../web/public/techcatalog.js';

const OPS = [
  'Layers (applied in order; `ref` names what an op creates, later ops can use it as an id):',
  '{op:"screen", name, width?, height?, fill?, layout?, ref} · {op:"create", type: frame|text|rectangle|ellipse|component|section|star|polygon|line, parent, props, ref}',
  '{op:"set", id, props} · {op:"offset", id, dx, dy} (move by a delta) · {op:"text", id, text} · {op:"delete", ids} · {op:"move", id, parent?, index?} · {op:"duplicate", id, ref} · {op:"instance", component, parent, ref}',
  '{op:"link", id, to | url | back:true | clear:true} prototype link · {op:"bind", id, entity, field, type?} layer shows Entity.field · {op:"api", id, method, path, returns?} layer triggers (or screen loads) a call',
  '{op:"note", id, text} · {op:"token", name, value, mode?} · {op:"useToken", id, token} · {op:"rename", name}',
  'Product:',
  '{op:"function", name, rename?, summary?, screens?, addScreens?, removeScreens?, operations?, tools?} add/update a function · {op:"removeFunction", name} · {op:"keepFunctions"} declare the suggested ones',
  `{op:"rule", name, kind: ${RULE_KINDS.join('|')}, text?, applies?} · {op:"removeRule", name} · {op:"lifecycle", entity, field?, states, transitions:[{from (state or *), to, via}]} · {op:"removeLifecycle", entity} · {op:"keepLogic"}`,
  `{op:"component", name, rename?, kind: ${COMPONENT_KINDS.join('|')}, tech? ("Node 22 · Fastify · PostgreSQL 16": known names get their icon, description and alternatives), description?, implements?, code?} · {op:"removeComponent", name} · {op:"connect", from, to, label?} · {op:"disconnect", from, to} · {op:"keepArchitecture"}`,
  '{op:"specFolders", tree:{folders:[{name, folders, items:[spec ids]}], items}} how the spec list is organised',
  'Refs: layer ids (12, "#12"), exact names, or refs; screens by name or id; operations "METHOD /path"; entities, tools, functions by name.',
  'Props: name x y width height visible opacity clip fill stroke strokeWeight radius shadow blur text fontFamily fontStyle fontWeight fontSize lineHeight letterSpacing align layout ({mode,gap,padding,align,crossAlign,wrap}) gap padding sizing ({h,v}: fixed|hug|fill) devStatus description.',
].join('\n');

export const PUBLIC_TOOLS = [
  { name: 'weshcraft_status', description: 'Where the project stands: the design, the product (functions, logic, architecture: declared or suggested), parity, spec ⇄ code coverage, sync, the live URL, and what to do next. Start here.', inputSchema: { type: 'object', properties: {} } },
  {
    name: 'weshcraft_read',
    description: 'Read anything, compactly. what: tree (outline of the design, one line per layer; root: a screen) · find (query) · layer (id) · tokens · screenshot (id: a screen or layer, PNG) · functions · logic · data · api · architecture · links (front ⇄ back; screen, op, field filters) · trace (spec ⇄ code; function, untraced) · spec (path, e.g. wcraft/specs/LOGIC.md) · folders (the spec tree) · manifest (screen) · parity · technologies (query: the catalog of 440 tools and cloud services with what each is and its alternatives; or text: what a component tech line is recognised as).',
    inputSchema: { type: 'object', properties: {
      what: { type: 'string', enum: ['tree', 'find', 'layer', 'tokens', 'screenshot', 'functions', 'logic', 'data', 'api', 'architecture', 'links', 'trace', 'spec', 'folders', 'manifest', 'parity', 'technologies'] },
      root: { type: ['number', 'string'] }, depth: { type: 'number' }, query: { type: 'string' }, type: { type: 'string' }, id: { type: ['number', 'string'] }, scale: { type: 'number' },
      text: { type: 'string' }, path: { type: 'string' }, screen: { type: 'string' }, op: { type: 'string' }, field: { type: 'string' }, function: { type: 'string' }, untraced: { type: 'boolean' }, limit: { type: 'number' },
    }, required: ['what'] },
  },
  {
    name: 'weshcraft_edit',
    description: `Change the design and the product in one batch: one undo step for the user, specs regenerate after it (wait:true returns parity, design changes and gaps). undo / redo: steps to undo or redo instead (whoever made them).\n${OPS}`,
    inputSchema: { type: 'object', properties: { ops: { type: 'array', items: { type: 'object' } }, wait: { type: 'boolean' }, label: { type: 'string' }, undo: { type: 'number' }, redo: { type: 'number' } } },
  },
  { name: 'weshcraft_notes', description: 'Replace the Notes block of a spec (states, edge cases, a11y, analytics, decisions, open questions). Cite layers as `#id`. Facts come from the design: change the design (weshcraft_edit), not the notes.', inputSchema: { type: 'object', properties: { path: { type: 'string', description: 'e.g. wcraft/specs/front/screens/scr-home.md' }, notes: { type: 'string' } }, required: ['path', 'notes'] } },
  { name: 'weshcraft_generate', description: 'Regenerate the specs now (they also follow every change on their own) and check parity; force rewrites unchanged ones too. Also refreshes spec ⇄ code (after code changes).', inputSchema: { type: 'object', properties: { force: { type: 'boolean' } } } },
  {
    name: 'weshcraft_sync',
    description: 'Git: action sync (now; target sets where: git[@branch] in this repository, github:owner/repo[@branch], gitlab:group/project[@branch]; auto keeps it in step), publish (commit to a branch and open/update a PR/MR: provider github|gitlab, repo, branch, base), status, stop. Access is inherited (OpenChamber account, gh/glab login, git credentials, env tokens).',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['sync', 'publish', 'status', 'stop'] }, target: { type: 'string' }, auto: { type: 'boolean' }, pr: { type: 'boolean' }, push: { type: 'boolean' }, provider: { type: 'string', enum: ['github', 'gitlab'] }, repo: { type: 'string' }, branch: { type: 'string' }, base: { type: 'string' }, title: { type: 'string' }, apiUrl: { type: 'string' } }, required: ['action'] },
  },
];
export const NEW_TOOL = { name: 'weshcraft_new', description: 'Start a new, empty design (wcraft/design/<name>.figcraft) for this project; then weshcraft_edit adds screens. Only when the project has no design yet.', inputSchema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } };

const parse = r => { try { return JSON.parse(r.content[0].text); } catch { return r.content?.[0]?.text; } };
const text = (t, isError = false) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t) }], isError });
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();
const PRODUCT_OPS = new Set(['function', 'removeFunction', 'keepFunctions', 'functions', 'rule', 'removeRule', 'lifecycle', 'removeLifecycle', 'keepLogic', 'component', 'removeComponent', 'connect', 'disconnect', 'keepArchitecture', 'specFolders']);

/** Turn product ops into the design's stored aspects (functions, logic, architecture), plus spec folders. */
function productOps(ws, ops) {
  const store = ws.source.store;
  const m = ws.manifest;
  const keyToId = new Map((m?.screens ?? []).map(s => [s.key, s.id]));
  const ref = x => { if (keyToId.has(x)) return keyToId.get(x); try { return store.screenRef(x); } catch { return x; } }; // a screen made in this batch: by name
  let fns = null, logic = null, arch = null, folders = null;
  const F = () => (fns ??= (store.getFunctions() ?? (m ? toDeclared(m) : [])).map(f => ({ ...f, screens: (f.screens ?? []).map(ref) })));
  const L = (inferred = false) => (logic ??= structuredClone(store.getAspect('logic') ?? (m ? logicToDeclared(m, { includeInferred: inferred }) : { rules: [], states: [] })));
  const A = () => (arch ??= structuredClone(store.getAspect('architecture') ?? (m ? architectureToDeclared(m) : { components: [], links: [] })));
  for (const o of ops) {
    switch (o.op) {
      case 'functions': fns = (o.functions ?? []).map(f => ({ ...f, screens: (f.screens ?? []).map(ref) })); break;
      case 'keepFunctions': F(); break;
      case 'function': {
        const list = F();
        const i = list.findIndex(f => same(f.name, o.name));
        const cur = i >= 0 ? { ...list[i] } : { name: String(o.name).trim(), screens: [] };
        if (o.rename) cur.name = String(o.rename).trim();
        if (o.summary != null) cur.summary = o.summary;
        if (o.screens) cur.screens = o.screens.map(ref);
        if (o.addScreens) cur.screens = [...new Set([...cur.screens, ...o.addScreens.map(ref)])];
        if (o.removeScreens) { const rm = new Set(o.removeScreens.map(ref)); cur.screens = cur.screens.filter(x => !rm.has(x)); }
        if (o.operations) cur.operations = o.operations;
        if (o.tools) cur.tools = o.tools;
        const mine = new Set(cur.screens);
        fns = list.map((f, j) => (j === i ? cur : { ...f, screens: f.screens.filter(x => !mine.has(x)) }));
        if (i < 0) fns.push(cur);
        break;
      }
      case 'removeFunction': fns = F().filter(f => !same(f.name, o.name)); break;
      case 'keepLogic': { const l = L(true); if (m) { const inf = logicToDeclared(m, { includeInferred: true }); for (const r of inf.rules) if (!l.rules.some(x => x.name === r.name)) l.rules.push(r); for (const x of inf.states) if (!l.states.some(y => y.entity === x.entity)) l.states.push(x); } break; }
      case 'rule': { const l = L(); const { op, ...r } = o; const i = l.rules.findIndex(x => same(x.name, r.name)); if (i >= 0) l.rules[i] = { ...l.rules[i], ...r }; else l.rules.push(r); break; }
      case 'removeRule': { const l = L(); l.rules = l.rules.filter(x => !same(x.name, o.name)); break; }
      case 'lifecycle': { const l = L(); const { op, ...x } = o; const i = l.states.findIndex(y => same(y.entity, x.entity) && (y.field ?? 'status') === (x.field ?? y.field ?? 'status')); if (i >= 0) l.states[i] = x; else l.states.push(x); break; }
      case 'removeLifecycle': { const l = L(); l.states = l.states.filter(y => !same(y.entity, o.entity)); break; }
      case 'keepArchitecture': A(); break;
      case 'component': {
        const a = A();
        const { op, rename, ...c } = o;
        const i = a.components.findIndex(x => same(x.name, c.name));
        const next = { ...(i >= 0 ? a.components[i] : {}), ...c, ...(rename ? { name: rename } : {}) };
        if (i >= 0) { a.components[i] = next; if (rename) a.links = a.links.map(l => ({ ...l, from: same(l.from, c.name) ? rename : l.from, to: same(l.to, c.name) ? rename : l.to })); } else a.components.push(next);
        break;
      }
      case 'removeComponent': { const a = A(); a.components = a.components.filter(x => !same(x.name, o.name)); a.links = a.links.filter(l => !same(l.from, o.name) && !same(l.to, o.name)); break; }
      case 'connect': { const a = A(); const i = a.links.findIndex(l => same(l.from, o.from) && same(l.to, o.to)); const l = { from: o.from, to: o.to, ...(o.label ? { label: o.label } : {}) }; if (i >= 0) a.links[i] = l; else a.links.push(l); break; }
      case 'disconnect': { const a = A(); a.links = a.links.filter(l => !(same(l.from, o.from) && same(l.to, o.to))); break; }
      case 'specFolders': folders = o.tree; break;
      default: break;
    }
  }
  return [[...(fns ? [{ op: 'functions', functions: fns }] : []), ...(logic ? [{ op: 'logic', logic }] : []), ...(arch ? [{ op: 'architecture', architecture: arch }] : [])], folders];
}

/** One call of the public toolset. `mcp` is the WeshCraftMcp (its finer tools do the work). */
export async function callPublic(mcp, name, args = {}) {
  const ws = mcp.ws;
  const legacy = (n, a = {}) => mcp.callTool(n, a, { internal: true });
  switch (name) {
    case 'weshcraft_status': {
      if (!ws.manifest && ws.source) await ws.run().catch(() => {});
      const m = ws.manifest;
      const r = ws.report;
      const tr = ws.trace;
      const next = [];
      if (!ws.source && !ws.surface) next.push('weshcraft_new to start a design');
      if (m?.functions && !m.functions.declared && m.functions.items.length) next.push('declare the functions (weshcraft_edit {op:"function"} or {op:"keepFunctions"})');
      if (m?.logic?.machines.some(x => x.unresolved?.length)) next.push('resolve the open transitions (weshcraft_edit {op:"lifecycle"})');
      if (m?.architecture && !m.architecture.declared) next.push('declare the architecture with its technologies ({op:"keepArchitecture"}, then {op:"component"})');
      if (r && !r.ok) next.push(`fix ${r.errors} parity error${r.errors === 1 ? '' : 's'} (weshcraft_read {what:"parity"})`);
      if (tr && tr.coverage.traced < tr.coverage.total) next.push(`tag the code that implements the specs (${tr.coverage.traced}/${tr.coverage.total}: weshcraft_read {what:"trace", untraced:true})`);
      return text({
        design: ws.describe().split(`${ws.outDir}/`).join(''), editable: !!ws.source?.store,
        product: m ? { screens: m.screens.length, operations: m.domain.operations.length, entities: m.domain.entities.length, tools: m.surface?.mcp?.tools.length ?? 0, functions: `${m.functions.items.length} ${m.functions.declared ? 'declared' : 'suggested'}`, logic: `${m.logic.rules.length} rules, ${m.logic.machines.length} lifecycles${m.logic.declared ? '' : ' (inferred)'}`, architecture: `${m.architecture.components.length} components ${m.architecture.declared ? 'declared' : 'suggested'}` } : null,
        parity: r ? { ok: r.ok, score: r.score, errors: r.errors, warnings: r.warnings, top: r.issues.slice(0, 5).map(i => `${i.level} ${i.file}: ${i.message}`) } : null,
        code: tr ? tr.coverage : null,
        sync: mcp.syncer?.status() ? (({ target, auto, last }) => ({ target, auto, last: last && { ok: last.ok, at: last.at, url: last.url, error: last.error } }))(mcp.syncer.status()) : null,
        live: mcp.webUrl ?? null,
        next,
      });
    }
    case 'weshcraft_read': {
      const w = args.what;
      const design = { tree: 'design_tree', find: 'design_find', layer: 'design_get', tokens: 'design_tokens', screenshot: 'design_screenshot' };
      if (design[w]) {
        if (!ws.source?.store) return text(ws.source ? 'The design is not editable here (live FigCraft or --read-only): read the product with what: functions, data, api, manifest.' : 'No design yet: weshcraft_new.', true);
        return legacy(design[w], w === 'tokens' ? {} : args);
      }
      // the technology catalog: no design needed
      if (w === 'technologies') {
        const list = args.query ? searchTech(args.query, { limit: args.limit ?? 15 }) : matchTech(args.text ?? '');
        return text(list.map(e => techFacts(e)));
      }
      if (!ws.manifest) await ws.run();
      switch (w) {
        case 'functions': case 'logic': case 'architecture': return legacy(`design_${w}`, {});
        case 'data': return text(ws.manifest.data.entities.map(e => ({ name: e.name, fields: e.fields.map(f => `${f.name}${f.required ? '' : '?'}: ${f.enum ? f.enum.join('|') : f.type}`), relations: e.relations.map(r => `${r.field} → ${r.to}${r.many ? '[]' : ''}`), writtenBy: e.writtenBy, readBy: e.readBy, shownOn: e.shownOn })));
        case 'api': {
          const m = ws.manifest;
          const fnOf = k => m.functions.items.find(f => f.operations.includes(k))?.name ?? null;
          return text({ operations: m.domain.operations.map(o => ({ op: `${o.method} ${o.path}`, name: o.name, function: fnOf(o.key), screen: m.screens.find(s => s.key === o.screen)?.name ?? (o.screen === 'api' ? 'public API' : null), returns: o.entity, tools: (m.surface?.mcp?.tools ?? []).filter(t => t.op === o.key).map(t => t.name) })), tools: (m.surface?.mcp?.tools ?? []).map(t => ({ name: t.name, op: m.domain.operations.find(o => o.key === t.op) ? `${m.domain.operations.find(o => o.key === t.op).method} ${m.domain.operations.find(o => o.key === t.op).path}` : null })), auth: m.surface?.api?.auth ?? [] });
        }
        case 'links': return legacy('weshcraft_links', args);
        case 'trace': return legacy('weshcraft_trace', args);
        case 'spec': return legacy('weshcraft_read_spec', { path: args.path });
        case 'folders': return legacy('weshcraft_spec_folders', {});
        case 'manifest': return legacy('weshcraft_manifest', { screen: args.screen });
        case 'parity': return legacy('weshcraft_check', {});
        default: return text(`what: one of ${PUBLIC_TOOLS[1].inputSchema.properties.what.enum.join(', ')}`, true);
      }
    }
    case 'weshcraft_edit': {
      if (args.undo) return legacy('design_undo', { steps: args.undo });
      if (args.redo) return legacy('design_redo', { steps: args.redo });
      if (!ws.source?.store) return text(ws.source?.kind === 'mcp' ? 'The design lives in a live FigCraft: edit it there, or serve the .figcraft file to edit it here.' : ws.source ? 'This WeshCraft is read-only (--read-only).' : 'No design yet: weshcraft_new first.', true);
      const ops = args.ops ?? [];
      if (!Array.isArray(ops) || !ops.length) return text('ops: a non-empty list (see the tool description)', true);
      const layer = ops.filter(o => !PRODUCT_OPS.has(o.op));
      const [aspects, folders] = productOps(ws, ops.filter(o => PRODUCT_OPS.has(o.op)));
      let res = null;
      const all = [...layer, ...aspects];
      if (all.length) res = parse(await legacy('design_edit', { ops: all, wait: args.wait && !folders, label: args.label }));
      if (folders) { if (!ws.manifest) await ws.run(); ws.setSpecTree(folders); if (args.wait) { await ws.settled(); res = { ...(res ?? {}), parity: { ok: ws.report.ok, score: ws.report.score, errors: ws.report.errors } }; } }
      if (typeof res === 'string') return text(res, true);
      return text({ ...(res ?? {}), ...(folders ? { folders: 'saved' } : {}) });
    }
    case 'weshcraft_notes': return legacy('weshcraft_write_notes', args);
    case 'weshcraft_generate': {
      const r = parse(await legacy('weshcraft_generate', { force: args.force }));
      return text({ ms: r.ms, parity: r.parity && { ok: r.parity.ok, score: r.parity.score, errors: r.parity.errors, issues: r.parity.issues.slice(0, 15).map(i => `${i.level} ${i.file}: ${i.message}`) }, code: ws.trace?.coverage ?? null, live: mcp.webUrl ?? null });
    }
    case 'weshcraft_sync': {
      if (args.action === 'publish') return legacy('weshcraft_publish', args); // no action: sync now
      if (args.action === 'status') return text(mcp.syncer?.status() ?? 'sync is not available in this server');
      if (args.action === 'stop') { if (!mcp.syncer) return text('sync is not available in this server', true); mcp.syncer.configure(null); return text({ stopped: true }); }
      return legacy('weshcraft_sync', args);
    }
    case 'weshcraft_new': return legacy('design_new', args);
    default: return null;
  }
}
