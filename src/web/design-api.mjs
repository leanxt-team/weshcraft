// The browser editor's API: read the design (screens, layer tree, one layer, a rendered screen)
// and change it with the same operations agents use over MCP (one undo stack for both).
import fs from 'node:fs';
import path from 'node:path';
import { renderScreen } from '../proto/html.mjs';
import { props, tokens as tokenLines } from '../design/describe.mjs';
import { hexOf } from '../design/props.mjs';
import { openEditable } from '../design/source.mjs';
import { designCandidates, rememberDesign } from '../design/discover.mjs';
import { DESIGN } from '../layout.mjs';

import { toDeclared } from '../model/functions.mjs';

const json = async read => JSON.parse((await read()).toString() || '{}');

function summary(ws) {
  const store = ws.source?.store;
  if (!store) return { editable: false, reason: ws.source?.kind === 'mcp' ? 'live-figcraft' : ws.source ? 'read-only' : 'none' };
  const d = store.doc;
  const keys = new Map((ws.manifest?.screens ?? []).map(s => [s.id, s.key]));
  const fnOf = new Map((ws.manifest?.functions?.items ?? []).flatMap(f => f.screens.map(k => [k, f.name])));
  const page = store.node(d.current_page ?? d.pages[0]);
  const vars = d.variables ?? { collections: [], variables: [] };
  const firstVal = v => { const col = vars.collections.find(c => c.id === v.collection); return v.values[col?.modes[0]?.id] ?? Object.values(v.values)[0]; };
  return {
    editable: true,
    version: store.version,
    name: d.name,
    file: path.relative(ws.outDir, store.file).split(path.sep).join('/'),
    page: { id: page.id, name: page.name, background: hexOf(page.background) },
    pages: d.pages.map(id => ({ id, name: store.node(id).name })),
    screens: (page.children ?? []).map(id => store.node(id)).map(n => ({ id: n.id, name: n.name, type: n.type, width: n.width, height: n.height, x: n.transform?.[4] ?? 0, y: n.transform?.[5] ?? 0, key: keys.get(n.id) ?? null, function: fnOf.get(keys.get(n.id)) ?? null })),
    // Product functions: what the design declares (or the suggestion to start from), in order.
    functions: ws.manifest?.functions ? { declared: ws.manifest.functions.declared, list: store.getFunctions() ?? toDeclared(ws.manifest), order: ws.manifest.functions.items.map(f => f.name) } : null,
    components: Object.values(d.nodes).filter(n => n.type === 'component').map(n => ({ id: n.id, name: n.name })),
    tokens: vars.variables.map(v => { const val = firstVal(v); return { id: v.id, name: v.name, type: v.resolvedType, value: val?.type === 'color' ? hexOf(val.value) : val?.value ?? null }; }),
    undo: store.undoStack.at(-1)?.label ?? null,
    redo: store.redoStack.at(-1)?.label ?? null,
  };
}

/** Layer tree of one screen (or the page): what the layers panel shows. */
function layerTree(store, root) {
  const walk = id => {
    const n = store.node(id);
    return {
      id: n.id, type: n.type, name: String(n.name ?? '').replace(/\s*@[A-Za-z_]\w*\.[A-Za-z_]\w*(?::\w+)?/, '').trim() || n.name, hidden: n.visible === false,
      x: n.transform?.[4] ?? 0, y: n.transform?.[5] ?? 0, w: n.width ?? 0, h: n.height ?? 0,
      abs: !!n.child_layout?.absolute,
      text: n.type === 'text' ? String(n.characters ?? '').slice(0, 60) : undefined,
      flow: n.layout ? n.layout.mode : false, link: !!(n.interactions?.length), api: (n.annotations ?? []).some(a => /\b(GET|POST|PUT|PATCH|DELETE)\s+\//.test(a.label ?? '')),
      bind: /@[A-Za-z_]\w*\.[A-Za-z_]\w*/.test(n.name ?? ''),
      children: (n.children ?? []).map(walk),
    };
  };
  return walk(root);
}

export { designCandidates };
const remember = rememberDesign;

export async function designApi(ws, req, url, read, { watchFile } = {}) {
  const p = url.pathname;
  const store = ws.source?.store;
  try {
    if (p === '/api/design' && req.method === 'GET') return { body: { ...summary(ws), project: path.basename(ws.outDir) } };
    if (p === '/api/design/candidates') return { body: designCandidates(ws.outDir) };
    if (p === '/api/design/open' && req.method === 'POST') {
      const b = await json(read);
      const abs = path.resolve(ws.outDir, String(b.file || ''));
      if (!abs.startsWith(ws.outDir + path.sep) || !/\.figcraft(\.json)?$/i.test(abs) || !fs.existsSync(abs)) return { status: 400, body: { error: 'pick a .figcraft file inside this project' } };
      if (ws.source?.kind === 'mcp') return { status: 409, body: { error: 'this WeshCraft is attached to a live FigCraft' } };
      ws.useSource(openEditable(abs));
      watchFile?.(abs);
      remember(ws.outDir, path.relative(ws.outDir, abs).split(path.sep).join('/'));
      ws.run().catch(e => ws.emit('log', { level: 'error', message: e.message }));
      return { body: summary(ws) };
    }
    if (p === '/api/design/new' && req.method === 'POST') {
      if (ws.source) return { status: 409, body: { error: `this project already has a design: ${ws.describe()}` } };
      const b = await json(read);
      const base = String(b.name || 'design').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'design';
      const file = path.join(ws.outDir, DESIGN, `${base}.figcraft`);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      ws.useSource(openEditable(file, b.name || base));
      watchFile?.(file);
      remember(ws.outDir, path.relative(ws.outDir, file).split(path.sep).join('/'));
      // A first screen, so there is something to draw on.
      ws.source.store.apply([{ op: 'screen', name: b.screen || 'Home', width: b.width ?? 393, height: b.height ?? 852 }], { by: 'editor', label: 'New design' });
      return { body: summary(ws) };
    }
    if (!store) return { status: 409, body: { error: ws.source?.kind === 'mcp' ? 'The design is in a live FigCraft: edit it there.' : ws.source ? 'This server is read-only (--read-only).' : 'No design yet.' } };

    if (p === '/api/design/tree') {
      const root = url.searchParams.get('root');
      return { body: layerTree(store, root ? Number(root) : store.doc.current_page) };
    }
    if (p === '/api/design/node') return { body: props(store, Number(url.searchParams.get('id'))) };
    if (p === '/api/design/tokens') return { body: tokenLines(store) };
    if (p === '/api/design/render') {
      const id = Number(url.searchParams.get('id'));
      const model = store.toModel();
      if (!model.nodes.has(id)) return { status: 404, body: { error: `no layer #${id}` } };
      const fonts = new Set();
      const walk = x => { const n = model.nodes.get(x); if (!n) return; if (n.text?.fontFamily) fonts.add(n.text.fontFamily); n.children.forEach(walk); };
      walk(id);
      return { body: { id, version: store.version, html: renderScreen(model, id), fonts: [...fonts].sort() } };
    }
    if (req.method !== 'POST') return { status: 405, body: { error: 'POST' } };
    if (p === '/api/design/op') {
      const b = await json(read);
      const r = store.apply(b.ops, { by: 'editor', label: b.label });
      return { body: { ...r, version: store.version } };
    }
    if (p === '/api/design/undo') return { body: { label: store.undo('editor'), version: store.version } };
    if (p === '/api/design/redo') return { body: { label: store.redo('editor'), version: store.version } };
    return { status: 404, body: { error: 'not found' } };
  } catch (e) {
    return { status: 400, body: { error: e.message } };
  }
}
