// Spec ⇄ code traceability, for code graphs (codegraph) and for people.
//
// Code says what it implements with a tag in a comment, next to the symbol:
//   // @weshcraft scr-sign-up            (a screen)        # @weshcraft POST /users   (an operation)
//   /** @weshcraft fn-join, User */      (a function, an entity; several refs separated by commas)
// Refs: any key from the specs (fn-…, scr-…, cmp-…, op-…), "METHOD /path", an entity name, an MCP tool name.
//
// From the tags and the manifest WeshCraft writes:
//   design/weshcraft.graph.mjs  the product as code: one symbol per function, screen, component, operation,
//                               entity and MCP tool, calling each other the way the product works and calling
//                               the tagged code. Never imported, never run: code graphs index it, so
//                               `codegraph explore "how does Sign up work"` returns the function, its screens,
//                               operations and the code behind them, and `codegraph impact <symbol>` reaches
//                               the screens and functions a code change touches.
//   specs/TRACE.md, trace.json  element → code locations, what has no code yet, tags that point nowhere.
import fs from 'node:fs';
import path from 'node:path';

export const GRAPH_FILE = 'design/weshcraft.graph.mjs';
const GRAPH_NAME = 'weshcraft.graph.mjs';

/** Where the product graph goes: next to the design (or the surface file) when it is in the project, else design/. */
export function graphPath(outDir, inputs = []) {
  const root = path.resolve(outDir);
  for (const x of inputs) {
    const abs = path.resolve(x.abs ?? x);
    if (abs.startsWith(root + path.sep)) return path.posix.join(path.relative(root, path.dirname(abs)).split(path.sep).join('/') || '.', GRAPH_NAME).replace(/^\.\//, '');
  }
  return GRAPH_FILE;
}

/** The product graph path a previous run recorded (specs/trace.json), else the default. */
export function recordedGraphPath(outDir) {
  try { return JSON.parse(fs.readFileSync(path.join(outDir, 'specs/trace.json'), 'utf8')).graph || GRAPH_FILE; } catch { return GRAPH_FILE; }
}
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor', '.next', '.nuxt', '.svelte-kit', '.venv', 'venv', '__pycache__', 'coverage', '.codegraph', 'prototype', 'specs', 'Pods', '.gradle', '.idea', '.vscode', '.turbo', '.cache']);
const LANG = {
  js: 'javascript', jsx: 'javascript', mjs: 'javascript', cjs: 'javascript', ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  vue: 'vue', svelte: 'svelte', astro: 'astro', py: 'python', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', kts: 'kotlin', swift: 'swift',
  rb: 'ruby', php: 'php', cs: 'csharp', dart: 'dart', scala: 'scala', lua: 'lua',
};
const JSLIKE = new Set(['javascript', 'typescript']);
const TAG = /@weshcraft\s+([^\n]*?)\s*(?:\*\/|-->|$)/g;

/** Declarations a tag can sit on (the tag's line, or the next few lines). */
function declaration(line, lang) {
  let m;
  if (JSLIKE.has(lang) || lang === 'vue' || lang === 'svelte' || lang === 'astro') {
    if ((m = /^\s*(export\s+)?(default\s+)?(?:async\s+)?function\*?\s+([A-Za-z_$][\w$]*)/.exec(line))) return { name: m[3], exported: !!m[1], isDefault: !!m[2], kind: 'function' };
    if ((m = /^\s*(export\s+)?(default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/.exec(line))) return { name: m[3], exported: !!m[1], isDefault: !!m[2], kind: 'class' };
    if ((m = /^\s*(export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=/.exec(line))) return { name: m[2], exported: !!m[1], isDefault: false, kind: 'value' };
    if ((m = /^\s*export\s+(?:interface|type|enum)\s+([A-Za-z_$][\w$]*)/.exec(line))) return { name: m[1], exported: true, isDefault: false, kind: 'type' };
    if ((m = /^\s*export\s+default\s+([A-Za-z_$][\w$]*)\s*;?\s*$/.exec(line))) return { name: m[1], exported: true, isDefault: true, kind: 'value' };
    if ((m = /^\s*(?:public\s+|private\s+|protected\s+|static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::[^{]+)?\{/.exec(line)) && !/^(if|for|while|switch|catch|function|return)$/.test(m[1])) return { name: m[1], exported: false, isDefault: false, kind: 'method' };
    return null;
  }
  const pats = {
    python: /^\s*(?:async\s+)?(?:def|class)\s+(\w+)/, go: /^\s*(?:func\s+(?:\([^)]*\)\s*)?|type\s+)(\w+)/, rust: /^\s*(?:pub(?:\([^)]*\))?\s+)?(?:async\s+)?(?:fn|struct|enum|trait|impl)\s+(\w+)/,
    ruby: /^\s*(?:def\s+(?:self\.)?|class\s+|module\s+)(\w+)/, php: /^\s*(?:(?:public|private|protected|static|abstract|final)\s+)*(?:function|class|interface|trait)\s+(\w+)/,
    lua: /^\s*(?:local\s+)?function\s+([\w.:]+)/,
  };
  if (pats[lang]) return (m = pats[lang].exec(line)) ? { name: m[1], exported: false, isDefault: false, kind: 'symbol' } : null;
  // Java, Kotlin, Swift, C#, Dart, Scala: types and members
  if ((m = /^\s*(?:@\w+(?:\([^)]*\))?\s*)*(?:(?:public|private|protected|internal|open|override|static|final|abstract|sealed|data|suspend|async|export)\s+)*(?:class|interface|struct|enum|record|object|protocol|fun|func|def|trait)\s+(\w+)/.exec(line))) return { name: m[1], exported: false, isDefault: false, kind: 'symbol' };
  if ((m = /^\s*(?:(?:public|private|protected|internal|static|final|async|override|virtual)\s+)+[\w<>\[\],.? ]+\s+(\w+)\s*\(/.exec(line))) return { name: m[1], exported: false, isDefault: false, kind: 'symbol' };
  return null;
}

/** Every `@weshcraft` tag in the project's source files. */
export function scanTags(root, { maxFiles = 20000 } = {}) {
  const tags = [];
  let files = 0;
  const walk = dir => {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (files >= maxFiles) return;
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(abs); continue; }
      const lang = LANG[path.extname(e.name).slice(1).toLowerCase()];
      if (!lang || e.name === GRAPH_NAME) continue;
      let st;
      try { st = fs.statSync(abs); } catch { continue; }
      if (st.size > 1_000_000) continue;
      files++;
      const text = fs.readFileSync(abs, 'utf8');
      if (!text.includes('@weshcraft')) continue;
      const lines = text.split('\n');
      lines.forEach((line, i) => {
        TAG.lastIndex = 0;
        let m;
        while ((m = TAG.exec(line))) {
          const refs = m[1].split(',').map(r => r.trim().replace(/^[`'"]|[`'"]$/g, '')).filter(Boolean);
          // the symbol: on this line (code before the comment), else the next declaration below
          let decl = declaration(line.slice(0, line.indexOf('@weshcraft')).replace(/\/\/\s*$|\/\*+\s*$|#\s*$/, ''), lang);
          for (let j = i + 1; !decl && j < Math.min(lines.length, i + 8); j++) {
            const l = lines[j];
            if (/^\s*(\/\/|\*|\/\*|#|@|<!--|$)/.test(l) && !/^\s*@\w+\s*(\(|$)/.test(l) && !declaration(l, lang)) continue;
            decl = declaration(l, lang);
            if (!decl) break;
          }
          for (const ref of refs) tags.push({ ref, file: path.relative(root, abs).split(path.sep).join('/'), line: i + 1, lang, symbol: decl?.name ?? null, exported: !!decl?.exported, isDefault: !!decl?.isDefault, kind: decl?.kind ?? 'file' });
        }
      });
    }
  };
  walk(path.resolve(root));
  return tags;
}

// ---- the product's elements -----------------------------------------------------------------
const words = s => String(s).replace(/\{([^}]+)\}/g, ' $1 ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').split(/[^A-Za-z0-9]+/).filter(Boolean);
const pascal = s => words(s).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('') || 'X';

/** Every traceable element: id, kind, name, spec link, the refs a tag may use, and how elements call each other. */
export function elements(manifest) {
  const out = [];
  const ops = manifest.domain.operations;
  const fns = manifest.functions?.items ?? [];
  for (const f of fns) out.push({ id: f.key, kind: 'function', name: f.name, spec: `specs/FUNCTIONS.md#${f.key}`, refs: [f.key], summary: f.summary });
  for (const s of manifest.screens) out.push({ id: s.key, kind: 'screen', name: s.name, spec: `specs/front/screens/${s.key}.md`, refs: [s.key] });
  for (const c of manifest.components) out.push({ id: c.key, kind: 'component', name: c.name, spec: `specs/front/components/${c.key}.md`, refs: [c.key] });
  for (const o of ops) out.push({ id: o.key, kind: 'operation', name: `${o.method} ${o.path}`, spec: `specs/back/api.md#${o.key}`, refs: [o.key, `${o.method} ${o.path}`] });
  for (const e of manifest.domain.entities) out.push({ id: `entity:${e.name}`, kind: 'entity', name: e.name, spec: `specs/back/domain.md#entity-${e.name.toLowerCase()}`, refs: [e.name, `entity:${e.name}`] });
  for (const t of manifest.surface?.mcp?.tools ?? []) out.push({ id: `tool:${t.name}`, kind: 'tool', name: t.name, spec: `specs/front/mcp/${t.key}.md`, refs: [t.name, `tool:${t.name}`] });
  return out;
}

/** The tag a piece of code should carry for an element (the simplest unambiguous one). */
export const tagFor = el => (el.kind === 'operation' ? el.refs[1] : el.refs[0]);

/** Match tags to elements: links per element, tags that point nowhere. */
export function traceOf(manifest, tags) {
  const els = elements(manifest);
  const byRef = new Map();
  for (const el of els) for (const r of el.refs) byRef.set(r.toLowerCase(), el);
  const norm = r => r.trim().replace(/\s+/g, ' ').replace(/^(get|post|put|patch|delete)\s/i, m => m.toUpperCase()).toLowerCase();
  const links = new Map(els.map(el => [el.id, []]));
  const unknown = [];
  for (const t of tags) {
    const el = byRef.get(norm(t.ref)) ?? byRef.get(t.ref.toLowerCase());
    if (el) { if (!links.get(el.id).some(x => x.file === t.file && x.line === t.line)) links.get(el.id).push(t); } else unknown.push(t);
  }
  const counted = els.filter(el => el.kind !== 'function');
  return {
    elements: els.map(el => ({ ...el, code: links.get(el.id) })),
    unknown,
    coverage: { traced: counted.filter(el => links.get(el.id).length).length, total: counted.length },
  };
}

// ---- design/weshcraft.graph.mjs ------------------------------------------------------------
export function graphModule(manifest, trace, { source = '', graphFile = GRAPH_FILE } = {}) {
  const used = new Set();
  const ident = (prefix, name) => {
    let id = `${prefix}${pascal(name)}`;
    for (let i = 2; used.has(id); i++) id = `${prefix}${pascal(name)}${i}`;
    used.add(id);
    return id;
  };
  const KIND = { function: 'fn', screen: 'screen', component: 'component', operation: 'op', entity: 'entity', tool: 'tool' };
  const sym = new Map();
  for (const el of trace.elements) sym.set(el.id, ident(KIND[el.kind], el.kind === 'operation' ? el.name.replace(/^(\w+)\s/, '$1 ') : el.name));
  const root = ident('weshcraft', 'product');
  // Code that can be imported (exported JS/TS symbols) is called; the rest is named in the comment.
  const imports = new Map(); // file → { names: Map(name → local), def: local }
  const local = new Map();
  const importOf = t => {
    if (!JSLIKE.has(t.lang) || !t.symbol || !t.exported || t.kind === 'type' || t.kind === 'method') return null;
    const k = `${t.file}#${t.isDefault ? 'default' : t.symbol}`;
    if (local.has(k)) return local.get(k);
    let name = t.symbol;
    for (let i = 2; used.has(name); i++) name = `${t.symbol}_${i}`;
    used.add(name);
    const out = { name, cls: t.kind === 'class' };
    local.set(k, out);
    const e = imports.get(t.file) ?? { names: new Map(), def: null };
    if (t.isDefault) e.def = name; else e.names.set(t.symbol, name);
    imports.set(t.file, e);
    return out;
  };
  const relImport = file => {
    let rel = path.posix.relative(path.posix.dirname(graphFile), file);
    if (!rel.startsWith('.')) rel = `./${rel}`;
    return /\.(ts|tsx|mts|cts)$/.test(rel) ? rel.replace(/\.(ts|tsx|mts|cts)$/, '') : rel;
  };
  const el = new Map(trace.elements.map(e => [e.id, e]));
  const m = manifest;
  const opsOfScreen = k => m.domain.operations.filter(o => o.screen === k).map(o => o.key);
  const compsOfScreen = s => [...new Set(s.instances.map(i => m.components.find(c => c.id === i.component || c.variants?.some(v => v.id === i.component))?.key).filter(Boolean))];
  const entityOfOp = o => o.entity ?? m.domain.operations.find(x => x.path === o.path && x.entity)?.entity ?? null;
  const calls = new Map(); // element → elements it calls
  const fnOfScreen = new Map();
  for (const f of m.functions?.items ?? []) {
    calls.set(f.key, [...f.screens, ...f.operations.filter(k => !f.screens.includes(m.domain.operations.find(o => o.key === k)?.screen)), ...f.tools.map(t => `tool:${t}`)]);
    for (const s of f.screens) fnOfScreen.set(s, f);
  }
  const shownOn = k => [...new Set(m.links.edges.filter(e => e.rel === 'displays' && e.screen === k).map(e => `entity:${e.field.split('.')[0]}`))];
  for (const s of m.screens) calls.set(s.key, [...compsOfScreen(s), ...opsOfScreen(s.key), ...shownOn(s.key).filter(id => !opsOfScreen(s.key).some(k => entityOfOp(m.domain.operations.find(o => o.key === k)) === id.slice(7)))]);
  for (const o of m.domain.operations) calls.set(o.key, entityOfOp(o) ? [`entity:${entityOfOp(o)}`] : []);
  for (const t of m.surface?.mcp?.tools ?? []) calls.set(`tool:${t.name}`, t.op ? [t.op] : []);
  const fnName = new Map((m.functions?.items ?? []).map(f => [f.key, f.name]));

  const body = [];
  const doc = (e, extra = []) => {
    const lines = [`${{ function: 'Function', screen: 'Screen', component: 'Component', operation: 'Operation', entity: 'Entity', tool: 'MCP tool' }[e.kind]} «${e.name}»${e.summary ? `: ${e.summary}` : ''}`, ...extra, `Spec: ${e.spec}`, `Tag the code that implements it: @weshcraft ${tagFor(e)}`];
    const other = e.code.filter(t => !importOf(t));
    if (other.length) lines.push(`Code: ${other.map(t => `${t.file}:${t.line}${t.symbol ? ` ${t.symbol}` : ''}`).join(', ')}`);
    return `/**\n${lines.map(l => ` * ${String(l).replace(/\*\//g, '*\\/')}`).join('\n')}\n */`;
  };
  const fnBody = e => {
    const inner = [...(calls.get(e.id) ?? []).filter(id => sym.has(id)).map(id => `${sym.get(id)}();`)];
    for (const t of e.code) { const im = importOf(t); if (im) inner.push(im.cls ? `new ${im.name}();` : `${im.name}();`); }
    return inner.length ? `{\n  ${inner.join('\n  ')}\n}` : '{}';
  };
  body.push(`/**\n * How «${m.source.name}» works: its functions, in journey order.\n * Spec: specs/FUNCTIONS.md\n */\nexport function ${root}() {\n  ${(m.functions?.items ?? []).map(f => `${sym.get(f.key)}();`).join('\n  ') || '// no functions yet'}\n}`);
  for (const e of trace.elements) {
    const extra = [];
    if (e.kind === 'function') {
      const f = m.functions.items.find(x => x.key === e.id);
      extra.push(`Who: ${f.actors.map(a => ({ user: 'people (app)', agent: 'AI agents (MCP)', api: 'integrations (API)' }[a])).join(', ') || '—'}`);
      if (f.entities.length) extra.push(`Data: ${f.entities.map(x => `${x.name} (${x.access})`).join(', ')}`);
      if (f.next.length) extra.push(`Leads to: ${f.next.map(n => `${fnName.get(n.to)} (${sym.get(n.to)})`).join(', ')}`);
    }
    if (e.kind === 'screen' && fnOfScreen.get(e.id)) extra.push(`Function: ${fnOfScreen.get(e.id).name} (${sym.get(fnOfScreen.get(e.id).key)})`);
    body.push(`${doc(e, extra)}\nexport function ${sym.get(e.id)}() ${fnBody(e)}`);
  }
  const head = [
    '// @ts-nocheck',
    '/* eslint-disable */',
    `// WeshCraft product graph for ${m.source.name}${source ? ` (${source})` : ''}. Generated: do not edit; regenerated with the specs.`,
    '// Never imported, never run. It lets code graphs (codegraph) see the product: functions → screens,',
    '// components → operations → entities, and the code tagged `@weshcraft <ref>` that implements each one.',
    '//   codegraph explore "how does <function> work" · codegraph impact <symbol> · codegraph callers <symbol>',
    '',
    ...[...imports].map(([file, e]) => `import ${[e.def, e.names.size ? `{ ${[...e.names].map(([n, l]) => (n === l ? n : `${n} as ${l}`)).join(', ')} }` : null].filter(Boolean).join(', ')} from '${relImport(file)}';`),
  ];
  return `${head.join('\n')}${imports.size ? '\n' : ''}\n${body.join('\n\n')}\n`;
}

// ---- specs/TRACE.md ---------------------------------------------------------------------
export function traceSpec(manifest, trace, { graphFile = GRAPH_FILE } = {}) {
  const L = ['# Spec ⇄ code', ''];
  const { traced, total } = trace.coverage;
  L.push(`${traced} of ${total} screens, components, operations, entities and tools have code tagged for them. Tag the code that implements an element with its ref in a comment (\`// @weshcraft scr-sign-up\`, \`# @weshcraft POST /users\`); WeshCraft finds the tags, lists them here and links them in [\`${graphFile}\`](../${graphFile}), the product graph code graphs index (\`codegraph explore "how does <function> work"\`).`);
  L.push('');
  const byId = new Map(trace.elements.map(e => [e.id, e]));
  const row = e => `| ${e.kind} | [${e.name.replace(/\|/g, '\\|')}](${e.spec.replace(/^specs\//, '')}) | \`@weshcraft ${tagFor(e)}\` | ${e.code.map(t => `\`${t.file}:${t.line}\`${t.symbol ? ` ${t.symbol}` : ''}`).join('<br>') || '—'} |`;
  const seen = new Set();
  const section = (title, ids) => {
    const list = ids.map(id => byId.get(id)).filter(e => e && !seen.has(e.id));
    if (!list.length) return;
    list.forEach(e => seen.add(e.id));
    L.push(`## ${title}`, '', '| | Element | Tag | Code |', '|---|---|---|---|', ...list.map(row), '');
  };
  const entityOf = o => o.entity ?? manifest.domain.operations.find(x => x.path === o.path && x.entity)?.entity;
  for (const f of manifest.functions?.items ?? []) {
    const comps = f.screens.flatMap(k => manifest.screens.find(s => s.key === k).instances.map(i => manifest.components.find(c => c.id === i.component || c.variants?.some(v => v.id === i.component))?.key)).filter(Boolean);
    const ops = f.operations;
    const ents = [...new Set(ops.map(k => entityOf(manifest.domain.operations.find(o => o.key === k))).filter(Boolean))].map(n => `entity:${n}`);
    section(`Function: ${f.name}`, [f.key, ...f.screens, ...comps, ...ops, ...ents, ...f.tools.map(t => `tool:${t}`)]);
  }
  section('Not in a function', trace.elements.map(e => e.id));
  if (trace.unknown.length) {
    L.push('## Tags that point nowhere', '', ...trace.unknown.map(t => `- \`${t.file}:${t.line}\` \`@weshcraft ${t.ref}\`: no such element in the design (renamed or removed?)`), '');
  }
  return L.join('\n');
}
