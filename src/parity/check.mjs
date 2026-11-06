// Parity: do the specs (and the pushed prototype) describe exactly the prototype that exists now?
// Compares each spec's contract with a freshly extracted manifest. Runs offline from the .figcraft
// file, so CI can block a merge when design and spec drift apart.
import fs from 'node:fs';
import path from 'node:path';
import { readContract, visibleText, citedNodes, readNotes } from '../spec/contract.mjs';
import { stableStringify } from '../util/common.mjs';
import { functionsContract } from '../spec/functions.mjs';
import { logicContract, dataContract, apiOverviewContract, architectureContract } from '../spec/aspects.mjs';
import { scanTags, traceOf, graphModule, recordedGraphPath } from '../spec/trace.mjs';
import { spec as specPath, proto as protoPath } from '../layout.mjs';

const read = f => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const setEq = (a, b) => a.length === b.length && a.every(x => b.includes(x));
const key = o => stableStringify(o);

/**
 * @returns {{ok: boolean, score: number, checks: number, issues: Array<{level, code, file, message, node?}>, sourceHash: string}}
 */
export function checkParity(manifest, outDir, { graphFile } = {}) {
  const issues = [];
  let checks = 0;
  const err = (code, file, message, node) => issues.push({ level: 'error', code, file, message, ...(node != null ? { node } : {}) });
  const warn = (code, file, message, node) => issues.push({ level: 'warning', code, file, message, ...(node != null ? { node } : {}) });
  const rel = f => path.relative(outDir, f).split(path.sep).join('/');
  const allNodes = new Set(manifest.screens.flatMap(s => s.nodeIds));
  for (const c of manifest.components) for (const id of c.nodeIds ?? [c.id]) allNodes.add(id);
  const opKeys = new Set(manifest.domain.operations.map(o => o.key));

  const loadSpec = (file, kind) => {
    checks++;
    const md = read(file);
    if (md == null) { err('missing-spec', rel(file), `spec file is missing (${kind})`); return null; }
    const c = readContract(md);
    if (!c || c.kind !== kind) { err('no-contract', rel(file), `no ${kind} contract block; regenerate with \`weshcraft generate\``); return null; }
    checks++;
    if (c.sourceHash !== manifest.source.hash) warn('source-changed', rel(file), `written for prototype ${c.sourceHash}, prototype is now ${manifest.source.hash}`);
    const notes = readNotes(md) ?? '';
    for (const id of citedNodes(md)) {
      checks++;
      if (allNodes.has(id)) continue;
      // Notes survive regeneration: a layer deleted later leaves them pointing at nothing.
      if (notes.includes(`\`#${id}\``)) warn('dangling-ref', rel(file), `its Notes cite \`#${id}\`, a layer no longer in the design: update the Notes (Edit notes, or weshcraft_notes), or undo the deletion`, id);
      else err('dangling-ref', rel(file), `cites \`#${id}\`, which is not in the prototype`, id);
    }
    return { md, c, visible: visibleText(md) };
  };

  // Screens: fingerprint, copy, interactions, instances, inputs, back-end links.
  for (const s of manifest.screens) {
    const file = path.join(outDir, specPath('front/screens'), `${s.key}.md`);
    const screen = loadSpec(file, 'front-screen');
    if (!screen) continue;
    const { c, visible } = screen;
    const f = rel(file);
    checks++;
    if (c.fingerprint !== s.fingerprint) err('stale', f, `screen changed in the design since this spec was written (fingerprint ${c.fingerprint} → ${s.fingerprint})`, s.id);
    // Copy must be shown verbatim in the Copy table itself, on the row of its layer.
    const copyStart = visible.indexOf('\n## Copy');
    const copySection = copyStart < 0 ? '' : visible.slice(copyStart, visible.indexOf('\n## ', copyStart + 8) >>> 0);
    const rows = new Map(copySection.split('\n').filter(l => l.startsWith('| `#')).map(l => [Number(/`#(\d+)`/.exec(l)[1]), l]));
    const want = s.texts.map(t => key({ node: t.id, text: t.characters }));
    const have = (c.copy || []).map(key);
    for (const t of s.texts) {
      checks++;
      if (!have.includes(key({ node: t.id, text: t.characters }))) err('copy-missing', f, `text ${JSON.stringify(t.characters)} is in the prototype but not in the spec`, t.id);
      checks++;
      const shown = t.characters.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      const cells = rows.get(t.id)?.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim());
      if (cells?.[2] !== shown.trim()) err('copy-not-verbatim', f, `text ${JSON.stringify(t.characters)} is not shown verbatim on its row of the Copy table`, t.id);
    }
    for (const h of c.copy || []) { checks++; if (!want.includes(key(h))) err('copy-extra', f, `spec lists text ${JSON.stringify(h.text)} the prototype does not have`, h.node); }
    const wantA = s.actions.map(a => key({ node: a.id, type: a.type, dest: a.destScreen }));
    const haveA = (c.actions || []).map(key);
    checks++;
    if (!setEq(wantA, haveA)) err('interactions-differ', f, `interactions differ: prototype ${wantA.length}, spec ${haveA.length}`);
    const wantI = s.instances.map(i => key({ node: i.id, component: i.component }));
    checks++;
    if (!setEq(wantI, (c.instances || []).map(key))) err('instances-differ', f, 'component instances differ from the prototype');
    checks++;
    if (!setEq(s.inputs.map(i => i.id), c.inputs || [])) err('inputs-differ', f, 'input fields differ from the prototype');
    const wantOps = manifest.domain.operations.filter(o => o.screen === s.key).map(o => o.key);
    checks++;
    if (!setEq(wantOps, c.operations || [])) err('operations-differ', f, `back-end operations for this screen differ (expected ${wantOps.join(', ') || 'none'})`);
    const wantL = manifest.links.edges.filter(e => e.screen === s.key).map(e => key({ rel: e.rel, node: e.node, ...(e.op ? { op: e.op } : { field: e.field }) }));
    checks++;
    if (!setEq(wantL, (c.links || []).map(key))) err('links-differ', f, 'front ⇄ back links of this screen differ from the prototype');
    checks++;
    const fnKey = manifest.functions?.items.find(x => x.screens.includes(s.key))?.key ?? null;
    if ((c.function ?? null) !== fnKey) err('function-differs', f, `this screen belongs to ${fnKey ?? 'no function'} in FUNCTIONS.md, the spec says ${c.function ?? 'none'}`, s.id);
    checks++;
    if (c.size?.[0] !== s.width || c.size?.[1] !== s.height) err('size-differs', f, `frame size ${c.size?.join('×')} ≠ ${s.width}×${s.height}`, s.id);
  }

  // Product functions: the overview matches the prototype, and everything belongs to one.
  if (manifest.functions) {
    const file = path.join(outDir, specPath('FUNCTIONS.md'));
    const spec = loadSpec(file, 'functions');
    if (spec) {
      checks++;
      const { declared, functions, unassigned } = spec.c;
      if (key({ declared, functions, unassigned }) !== key(functionsContract(manifest))) err('functions-differ', specPath('FUNCTIONS.md'), 'the functions (screens, operations, data or journey) differ from the prototype');
    }
    const fns = manifest.functions;
    const scr = new Map(manifest.screens.map(x => [x.key, x]));
    const opn = new Map(manifest.domain.operations.map(o => [o.key, `${o.method} ${o.path}`]));
    if (!fns.declared && fns.items.length) warn('functions-suggested', specPath('FUNCTIONS.md'), `${fns.items.length === 1 ? 'the function is' : `the ${fns.items.length} functions are`} suggested from the prototype: name them and give each a purpose (the Functions view, or weshcraft_edit)`);
    for (const k of fns.unassigned.screens) { checks++; warn('not-in-a-function', specPath('FUNCTIONS.md'), `screen ${scr.get(k).name} is in no function`, scr.get(k).id); }
    for (const k of fns.unassigned.operations) { checks++; warn('not-in-a-function', specPath('FUNCTIONS.md'), `operation ${opn.get(k)} is in no function`); }
    for (const t of fns.unassigned.tools) { checks++; warn('not-in-a-function', specPath('FUNCTIONS.md'), `MCP tool ${t} is in no function`); }
    for (const x of fns.missing) { checks++; warn('function-unknown-ref', specPath('FUNCTIONS.md'), `function ${fns.items.find(i => i.key === x.function)?.name ?? x.function} lists ${x.kind} ${x.ref}, which is not in the prototype`); }
    for (const x of fns.items) if (!x.screens.length && !x.operations.length && !x.tools.length) { checks++; warn('empty-function', specPath('FUNCTIONS.md'), `function ${x.name} has no screen, operation or tool`); }
  }

  // Logic, data, API overview, architecture: each overview matches the product; declared refs exist.
  // Only the fields the check really asserts are compared: a WeshCraft upgrade that adds a field
  // must not turn every project's CI red.
  const pick = (o, fields) => Object.fromEntries(fields.filter(f => o?.[f] !== undefined).map(f => [f, o[f]]));
  for (const [file, kind, contract, what, fields] of [
    [specPath('LOGIC.md'), 'logic', manifest.logic && logicContract, 'rules or lifecycles', ['rules', 'machines']],
    [specPath('DATA.md'), 'data', manifest.data && dataContract, 'entities, relations or their use', ['entities']],
    [specPath('API.md'), 'api-overview', manifest.data && apiOverviewContract, 'operations, endpoints or tools', ['operations', 'endpoints', 'tools']],
    [specPath('ARCHITECTURE.md'), 'architecture', manifest.architecture && architectureContract, 'components or links', ['components', 'links']],
  ]) {
    if (!contract) continue;
    const spec = loadSpec(path.join(outDir, file), kind);
    if (!spec) continue;
    checks++;
    const want = contract(manifest);
    const have = pick(spec.c, fields);
    if (Object.keys(have).length !== fields.length) {
      warn(`${kind}-outdated`, file, `this spec was written by another version of WeshCraft: regenerate it`);
    } else if (key(have) !== key(pick(want, fields))) {
      err(`${kind}-differs`, file, `the ${what} differ from the product: regenerate`);
    }
  }
  for (const x of manifest.logic?.missing ?? []) { checks++; warn('logic-unknown-ref', specPath('LOGIC.md'), `${x.owner} refers to ${x.ref}, which is not in the product`); }
  for (const x of manifest.architecture?.missing ?? []) { checks++; warn('architecture-unknown-ref', specPath('ARCHITECTURE.md'), `${x.owner} refers to ${x.ref}, which is not in the product`); }
  for (const x of manifest.logic?.machines ?? []) for (const u of x.unresolved ?? []) { checks++; warn('logic-open-transition', specPath('LOGIC.md'), `${u.via} changes ${x.entity} but no ${x.field} says to what: declare the transition (Logic view, or weshcraft_edit {op:"lifecycle"})`); }

  // Spec ⇄ code: tags that point at nothing, and a product graph that no longer matches design and code.
  if (manifest.screens.length || manifest.domain.operations.length || manifest.surface?.mcp?.tools?.length) {
    const trace = traceOf(manifest, scanTags(outDir));
    for (const t of trace.unknown) { checks++; warn('trace-unknown', t.file, `\`@weshcraft ${t.ref}\` (line ${t.line}) names nothing in the design: renamed or removed? See ${specPath('TRACE.md')}`); }
    checks++;
    const gf = graphFile ?? recordedGraphPath(outDir);
    const g = read(path.join(outDir, gf));
    if (g == null) warn('trace-missing', gf, 'the product graph is missing: run weshcraft generate');
    else if (g !== graphModule(manifest, trace, { graphFile: gf })) warn('trace-stale', gf, 'the product graph does not match the design and the tagged code: run weshcraft generate (or weshcraft_trace)');
  }

  // Specs for screens that no longer exist.
  const screensDir = path.join(outDir, specPath('front/screens'));
  if (fs.existsSync(screensDir)) {
    for (const name of fs.readdirSync(screensDir)) {
      if (!name.endsWith('.md')) continue;
      checks++;
      if (!manifest.screens.some(s => `${s.key}.md` === name)) err('orphan-spec', specPath('front/screens', name), 'spec for a screen that is no longer in the prototype');
    }
  }

  // Component specs that no longer belong to a component.
  const compsDir = path.join(outDir, specPath('front/components'));
  if (fs.existsSync(compsDir)) {
    for (const name of fs.readdirSync(compsDir)) {
      if (!name.endsWith('.md')) continue;
      checks++;
      if (!manifest.components.some(c => `${c.key}.md` === name)) err('orphan-spec', specPath('front/components', name), 'spec for a component that is no longer in the prototype');
    }
  }
  for (const comp of manifest.components) {
    const file = path.join(outDir, specPath('front/components'), `${comp.key}.md`);
    const spec = loadSpec(file, 'front-component');
    if (!spec) continue;
    checks += 2;
    if (spec.c.fingerprint !== comp.fingerprint) err('stale', rel(file), 'component changed in the design since this spec was written', comp.id);
    if (!setEq(comp.variants.map(v => v.id), spec.c.variants || [])) err('variants-differ', rel(file), 'variants differ from the prototype');
  }

  // MCP tools and public endpoints: one spec each, fingerprints and argument lists match.
  const mcp = manifest.surface?.mcp;
  if (mcp) {
    const idx = loadSpec(path.join(outDir, specPath('front/mcp/README.md')), 'front-mcp');
    if (idx) { checks++; if (!setEq(mcp.tools.map(t => t.name), idx.c.tools || []) || !setEq(mcp.resources.map(r => r.uri), idx.c.resources || []) || !setEq(mcp.prompts.map(p => p.name), idx.c.prompts || [])) err('mcp-differs', specPath('front/mcp/README.md'), 'tools, resources or prompts differ from the MCP server'); }
    for (const t of mcp.tools) {
      const file = path.join(outDir, specPath('front/mcp'), `${t.key}.md`);
      const spec = loadSpec(file, 'front-mcp-tool');
      if (!spec) continue;
      checks += 3;
      if (spec.c.fingerprint !== t.fingerprint) err('stale', rel(file), `MCP tool ${t.name} changed (description, schema or annotations) since this spec was written`);
      if (!setEq(t.input.map(f => f.name), spec.c.input || [])) err('mcp-input-differs', rel(file), `arguments of ${t.name} differ from its input schema`);
      if ((spec.c.op ?? null) !== (t.op ?? null)) err('links-differ', rel(file), `back-end link of ${t.name} differs`);
    }
  }
  const apiSurf = manifest.surface?.api;
  if (apiSurf) {
    const idx = loadSpec(path.join(outDir, specPath('front/api/README.md')), 'front-api');
    if (idx) { checks++; if (!setEq(apiSurf.endpoints.map(e => e.key), idx.c.endpoints || [])) err('api-differs', specPath('front/api/README.md'), 'endpoints differ from the OpenAPI document'); }
    for (const ep of apiSurf.endpoints) {
      const file = path.join(outDir, specPath('front/api'), `${ep.key}.md`);
      const spec = loadSpec(file, 'front-endpoint');
      if (!spec) continue;
      checks++;
      if (spec.c.fingerprint !== ep.fingerprint) err('stale', rel(file), `${ep.method} ${ep.path} changed (parameters, body, responses or auth) since this spec was written`);
    }
  }
  for (const [dir, keys] of [[specPath('front/mcp'), new Set((mcp?.tools ?? []).map(t => `${t.key}.md`))], [specPath('front/api'), new Set((apiSurf?.endpoints ?? []).map(e => `${e.key}.md`))]]) {
    const abs = path.join(outDir, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs)) {
      if (!name.endsWith('.md') || name === 'README.md') continue;
      checks++;
      if (!keys.has(name)) err('orphan-spec', `${dir}/${name}`, 'spec for a tool or endpoint that no longer exists');
    }
  }

  const tokens = manifest.screens.length || manifest.tokens.variables.length ? loadSpec(path.join(outDir, specPath('front/tokens.md')), 'front-tokens') : null;
  if (tokens) {
    const want = manifest.tokens.variables.map(v => key({ name: v.name, values: v.values }));
    checks++;
    if (!setEq(want, (tokens.c.tokens || []).map(t => key({ name: t.name, values: t.values })))) err('tokens-differ', specPath('front/tokens.md'), 'token names or values differ from the prototype variables');
  }

  const flows = manifest.screens.length ? loadSpec(path.join(outDir, specPath('front/flows.md')), 'front-flows') : null;
  if (flows) {
    const want = manifest.screens.flatMap(s => s.actions.filter(a => a.destScreen).map(a => key({ from: s.key, to: a.destScreen, node: a.id })));
    checks++;
    if (!setEq(want, (flows.c.edges || []).map(key))) err('flows-differ', specPath('front/flows.md'), 'navigation edges differ from the prototype connections');
  }

  const domain = loadSpec(path.join(outDir, specPath('back/domain.md')), 'back-domain');
  if (domain) {
    const want = manifest.domain.entities.map(e => key({ name: e.name, fields: e.fields.map(f => f.name) }));
    checks++;
    if (!setEq(want, (domain.c.entities || []).map(key))) err('domain-differs', specPath('back/domain.md'), 'entities or fields differ from the data shown in the prototype');
  }

  const api = loadSpec(path.join(outDir, specPath('back/api.md')), 'back-api');
  if (api) {
    const have = new Set((api.c.operations || []).map(o => o.key));
    for (const k of opKeys) { checks++; if (!have.has(k)) err('operation-missing', specPath('back/api.md'), `operation ${k} is missing`); }
    for (const k of have) { checks++; if (!opKeys.has(k)) err('operation-extra', specPath('back/api.md'), `operation ${k} is not backed by the prototype`); }
  }
  loadSpec(path.join(outDir, specPath('back/conventions.md')), 'back-conventions');

  const links = loadSpec(path.join(outDir, specPath('LINKS.md')), 'links');
  if (links) {
    const want = manifest.links.edges.map(e => key({ rel: e.rel, node: e.node, ...(e.op ? { op: e.op } : { field: e.field }) }));
    checks++;
    if (!setEq(want, (links.c.edges || []).map(key))) err('links-differ', specPath('LINKS.md'), 'front ⇄ back links differ from the prototype');
  }
  // Gaps are design questions, not drift: a field shown that nothing loads, an operation nothing reaches.
  for (const g of manifest.links.gaps) warn(`gap-${g.kind}`, specPath('LINKS.md'), g.message, g.node);

  checks++;
  const oa = read(path.join(outDir, specPath('back/openapi.json')));
  if (!oa) err('missing-spec', specPath('back/openapi.json'), 'OpenAPI document is missing');
  else {
    try {
      const doc = JSON.parse(oa);
      checks++;
      if (doc.info?.['x-weshcraft-source-hash'] !== manifest.source.hash) warn('source-changed', specPath('back/openapi.json'), 'written for another prototype version');
      const keys = new Set(Object.values(doc.paths || {}).flatMap(p => Object.values(p).flatMap(o => o['x-weshcraft']?.keys ?? [])));
      for (const k of opKeys) { checks++; if (!keys.has(k)) err('operation-missing', specPath('back/openapi.json'), `operation ${k} is not in the OpenAPI document`); }
      for (const k of keys) { checks++; if (!opKeys.has(k)) err('operation-extra', specPath('back/openapi.json'), `operation ${k} is not backed by the prototype`); }
    } catch { err('invalid', specPath('back/openapi.json'), 'not valid JSON'); }
  }

  checks++;
  // The prototype is one file per page: every screen must be in the file of its page.
  const pageFiles = (manifest.pages ?? []).map(p => p.file ?? `${p.key}.html`);
  const files = [...new Set(['index.html', ...pageFiles])].map(f => ({ file: f, html: read(path.join(outDir, protoPath(f))) }));
  const shown = files.filter(f => f.html);
  if (!shown.length) err('missing-prototype', protoPath('index.html'), 'front prototype is missing');
  else {
    for (const f of shown) {
      checks++;
      const m = /name="weshcraft-source-hash" content="([0-9a-f]+)"/.exec(f.html);
      if (m?.[1] !== manifest.source.hash) warn('prototype-outdated', protoPath(f.file), `the prototype was built from ${m?.[1] ?? 'unknown'}, the design is now ${manifest.source.hash}`);
      // The design itself is what matters: a change in the inferred back end does not make the
      // prototype stale.
      const d = /name="weshcraft-design-hash" content="([0-9a-f]+)"/.exec(f.html);
      const want = manifest.source.design ?? manifest.source.hash;
      if ((d?.[1] ?? m?.[1]) !== want) err('prototype-stale', protoPath(f.file), `prototype built from ${d?.[1] ?? m?.[1] ?? 'unknown'}, design is ${want}`);
    }
    for (const s of manifest.screens) {
      checks++;
      const page = (manifest.pages ?? []).find(p => p.screens.includes(s.key));
      const file = page?.file ?? 'index.html';
      const html = files.find(f => f.file === file)?.html ?? '';
      if (!html.includes(`id="${s.key}"`)) err('prototype-screen-missing', protoPath(file), `screen ${s.name} is missing from the prototype`, s.id);
    }
  }

  const errors = issues.filter(i => i.level === 'error').length;
  return { ok: errors === 0, score: checks ? (errors ? Math.min(99.9, Math.floor(((checks - errors) / checks) * 1000) / 10) : 100) : 100, checks, errors, warnings: issues.length - errors, issues, sourceHash: manifest.source.hash };
}

export function parityMarkdown(report, manifest, { atRisk = null } = {}) {
  const L = ['# Spec ↔ prototype parity', ''];
  L.push(`${report.ok ? '✅ **In sync.**' : '❌ **Out of sync.**'} ${report.checks} checks, ${report.errors} errors, ${report.warnings} warnings, score ${report.score}%. Prototype \`${report.sourceHash}\` (${manifest.screens.length} screens, ${manifest.components.length} components, ${manifest.tokens.variables.length} tokens, ${manifest.domain.operations.length} operations).`);
  L.push('');
  if (report.issues.length) {
    L.push('| Level | Check | File | Detail |');
    L.push('|---|---|---|---|');
    for (const i of report.issues) L.push(`| ${i.level} | ${i.code} | \`${i.file}\` | ${i.message.replace(/\|/g, '\\|')}${i.node != null ? ` (\`#${i.node}\`)` : ''} |`);
  } else {
    L.push('Every screen, text, interaction, instance, input, component, token, navigation edge, entity and operation in the prototype is in the specs, verbatim, and nothing else is.');
  }
  // The code that is at risk: what the code graph says the change would touch.
  if (atRisk) {
    L.push('');
    if (atRisk.affectedTests?.length) {
      L.push(`**The code at risk.** These tests cover the code behind the specs that changed: ${atRisk.affectedTests.map(t => `\`${t}\``).join(', ')}.`);
    } else if (atRisk.files?.length) {
      L.push(`**The code at risk.** The specs that changed come from ${atRisk.files.map(f => `\`${f}\``).join(', ')}; the code graph found no test covering it.`);
    }
  }
  L.push('');
  return L.join('\n');
}
