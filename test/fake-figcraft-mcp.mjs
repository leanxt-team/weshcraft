#!/usr/bin/env node
// A stand-in for `figcraft-cli mcp`, for tests and demos without the Rust build. It speaks the
// same newline-delimited JSON-RPC and answers the tools WeshCraft uses with FigCraft's documented
// shapes (camelCase layer trees with hex colours, `variable.export` REST JSON, PNG export), from a
// real .figcraft file. `set_properties` renames/edits layers so tests can simulate design changes.
import readline from 'node:readline';
import { readFigcraftArchive } from '../src/figcraft/source.mjs';

const args = process.argv.slice(2);
let file = null;
let doc = null;
let thumb = null;
const fileArg = args.indexOf('--fixture');
if (fileArg >= 0) open(args[fileArg + 1]);

function open(f) { file = f; const a = readFigcraftArchive(f); doc = a.document; thumb = a.thumbnail; }

const hex = c => `#${[c.r, c.g, c.b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('')}${c.a < 1 ? Math.round(c.a * 255).toString(16).padStart(2, '0') : ''}`;
const camel = v => (Array.isArray(v) ? v.map(camel) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), camel(x)])) : v);
function paints(p) { return (p || []).map(x => (x.type === 'solid' ? { type: 'solid', color: hex(x.color), ...(x.opacity < 1 ? { opacity: x.opacity } : {}), ...(x.visible === false ? { visible: false } : {}) } : x)); }

function node(id) {
  const n = doc.nodes[String(id)];
  const o = { id: n.id, name: n.name, type: n.type };
  if (n.type !== 'page') {
    if (n.visible === false) o.visible = false;
    if (n.opacity != null && n.opacity < 1) o.opacity = n.opacity;
    if (n.props && n.type !== 'instance') o.componentPropertyDefinitions = n.props;
    o.x = n.transform?.[4] ?? 0; o.y = n.transform?.[5] ?? 0; o.width = n.width; o.height = n.height;
    if (n.fills?.length) o.fills = paints(n.fills);
    if (n.strokes?.length) o.strokes = paints(n.strokes);
    if (n.stroke) o.strokeWeight = n.stroke.weight;
    if (n.corners) o.cornerRadius = n.corners.radii.every(r => r === n.corners.radii[0]) ? n.corners.radii[0] : n.corners.radii;
    if (n.effects) o.effects = n.effects;
    if (n.layout) o.layout = camel(n.layout);
    if (n.child_layout) { o.sizing = { horizontal: n.child_layout.sizing_h, vertical: n.child_layout.sizing_v }; if (n.child_layout.absolute) o.absolute = true; }
    if (n.clip) o.clip = true;
    if (n.interactions) o.interactions = n.interactions;
    if (n.annotations) o.annotations = n.annotations;
    if (n.dev_status) o.devStatus = n.dev_status;
    if (n.bound) o.boundVariables = n.bound;
    if (n.network) o.network = n.network;
    if (n.type === 'instance') { o.mainComponent = n.component; o.componentProperties = n.props || {}; }
    if (n.type === 'text') {
      o.characters = n.characters; o.fontFamily = n.style.font_family; o.fontStyle = n.style.font_style; o.fontSize = n.style.font_size;
      const label = u => (!u || u.unit === 'auto' ? 'Auto' : u.unit === 'percent' ? `${u.value}%` : `${u.value}`);
      o.lineHeight = label(n.style.line_height); o.letterSpacing = label(n.style.letter_spacing); o.textAlign = n.align_h ?? 'left';
    }
  } else if (n.flows) o.flows = n.flows;
  if (n.children?.length) o.children = n.children.map(node);
  return o;
}

function variableExport() {
  const v = doc.variables || { collections: [], variables: [] };
  const val = x => (x.type === 'color' ? x.value : x.type === 'alias' ? { type: 'VARIABLE_ALIAS', id: x.value } : x.value);
  return {
    meta: {
      variableCollections: Object.fromEntries(v.collections.map(c => [c.id, { name: c.name, modes: c.modes.map(m => ({ modeId: m.id, name: m.name })) }])),
      variables: Object.fromEntries(v.variables.map(x => [x.id, { name: x.name, variableCollectionId: x.collection, resolvedType: String(x.resolvedType).toUpperCase(), description: x.description, valuesByMode: Object.fromEntries(Object.entries(x.values).map(([m, y]) => [m, val(y)])) }])),
    },
  };
}

const ok = v => ({ content: [{ type: 'text', text: JSON.stringify(v) }], isError: false });
const bad = t => ({ content: [{ type: 'text', text: t }], isError: true });
const TOOLS = ['list_commands', 'run_command', 'batch', 'create_node', 'set_properties', 'inspect_document', 'get_node', 'select', 'export', 'screenshot', 'open_file', 'save_file', 'undo', 'redo', 'inspect_ui']
  .map(name => ({ name, description: `FigCraft ${name} (fake)`, inputSchema: { type: 'object' } }));

function call(name, a) {
  if (name === 'open_file') { open(a.path); return ok({ opened: { summary: { name: doc.name } } }); }
  if (!doc) return bad('no document open');
  switch (name) {
    case 'inspect_document': return ok({ name: doc.name, pages: doc.pages.map(node) });
    case 'get_node': return ok(node(a.id));
    case 'run_command':
      if (a.command === 'variable.export') return ok({ text: JSON.stringify(variableExport()) });
      if (a.command === 'inspect.code') return ok({ code: `<div class="n${a.params.id}"><!-- ${doc.nodes[a.params.id]?.name} --></div>` });
      return bad(`unknown command ${a.command}`);
    case 'set_properties':
      for (const id of a.ids) {
        const n = doc.nodes[String(id)];
        if (a.props.characters != null) n.characters = a.props.characters;
        if (a.props.name != null) n.name = a.props.name;
      }
      return ok({ updated: a.ids });
    case 'export': return { content: [{ type: 'image', data: (thumb ?? Buffer.alloc(0)).toString('base64'), mimeType: 'image/png' }, { type: 'text', text: '{}' }], isError: false };
    default: return ok({});
  }
}

readline.createInterface({ input: process.stdin }).on('line', line => {
  if (!line.trim()) return;
  const m = JSON.parse(line);
  if (m.id == null) return;
  let result;
  if (m.method === 'initialize') result = { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'figcraft (fake)', version: '0' } };
  else if (m.method === 'tools/list') result = { tools: TOOLS };
  else if (m.method === 'tools/call') result = call(m.params.name, m.params.arguments || {});
  else { process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'not found' } })}\n`); return; }
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: m.id, result })}\n`);
});
