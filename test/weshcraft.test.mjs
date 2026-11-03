import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { FileSource, McpSource } from '../src/figcraft/source.mjs';
import { buildManifest } from '../src/model/manifest.mjs';
import { Workspace } from '../src/spec/workspace.mjs';
import { checkParity } from '../src/parity/check.mjs';
import { readContract } from '../src/spec/contract.mjs';
import { WeshCraftMcp } from '../src/mcp/server.mjs';
import { readZip, writeZip } from '../src/util/zip.mjs';
import { collectFiles, publishGitHub } from '../src/publish/git.mjs';
import { contrast } from '../src/spec/front.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const APP = path.join(here, 'fixtures/ridgeline-app.figcraft');
const ONBOARDING = path.join(here, 'fixtures/ridgeline-onboarding.figcraft');
const FAKE = path.join(here, 'fake-figcraft-mcp.mjs');
const ACCOUNT = path.join(here, 'fixtures/account.figcraft.json');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'weshcraft-'));

test('manifest is deterministic and exhaustive for the onboarding flow', async () => {
  const a = buildManifest((await new FileSource(ONBOARDING).load()).model);
  const b = buildManifest((await new FileSource(ONBOARDING).load()).model);
  assert.equal(a.source.hash, b.source.hash);
  assert.deepEqual(a.screens.map(s => s.name), ['1 Welcome', '2 Interests', '3 Location', '4 All set']);
  const welcome = a.screens[0];
  const start = welcome.actions.find(x => x.label === 'Get started');
  assert.equal(start.destScreen, 'scr-2-interests');
  assert.equal(start.transition, 'push');
  assert.equal(a.flows[0].start, 'scr-1-welcome');
  assert.ok(a.screens[1].texts.some(t => t.characters === 'What do you love\nout there?'));
});

test('live FigCraft over MCP and the saved file give the same manifest', async () => {
  for (const f of [APP, ONBOARDING]) {
    const fromFile = buildManifest((await new FileSource(f).load()).model);
    const src = new McpSource({ command: FAKE, file: f });
    try {
      const live = buildManifest((await src.load()).model);
      assert.equal(live.source.hash, fromFile.source.hash, path.basename(f));
    } finally { src.close(); }
  }
});

test('generate writes every spec in sync; a second run changes nothing', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(APP), outDir: out });
  const r1 = await ws.run();
  assert.ok(r1.report.ok, JSON.stringify(r1.report.issues.slice(0, 3)));
  assert.ok(r1.jobs.every(j => j.status === 'done'));
  for (const f of ['prototype/index.html', 'specs/README.md', 'specs/back/openapi.json', 'specs/front/tokens.css', 'specs/front/screens/scr-home-light.md', 'specs/front/components/cmp-trail-row.md'])
    assert.ok(fs.existsSync(path.join(out, f)), f);
  const r2 = await ws.run();
  assert.ok(r2.jobs.every(j => j.status === 'unchanged'));
  const oa = JSON.parse(fs.readFileSync(path.join(out, 'specs/back/openapi.json'), 'utf8'));
  assert.equal(oa.openapi, '3.1.0');
  assert.ok(oa.paths['/trails'].get, 'list endpoint inferred from repeated Trail rows');
});

test('parity catches a design change the specs do not reflect', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: out });
  await ws.run();
  const m = structuredClone(ws.manifest);
  const s = m.screens.find(x => x.key === 'scr-2-interests');
  s.texts.find(t => t.characters === 'Continue').characters = 'Next';
  s.fingerprint = 'changed';
  const r = checkParity(m, out);
  assert.equal(r.ok, false);
  const codes = new Set(r.issues.map(i => i.code));
  for (const c of ['stale', 'copy-missing', 'copy-extra', 'copy-not-verbatim']) assert.ok(codes.has(c), c);
});

test('parity catches hand edits that remove copy or cite unknown layers', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: out });
  await ws.run();
  const f = path.join(out, 'specs/front/screens/scr-3-location.md');
  const md = fs.readFileSync(f, 'utf8').replace('| Allow location | Allow location |', '| Allow location | Allow |').replace('## Notes', 'See `#99999`.\n\n## Notes');
  fs.writeFileSync(f, md);
  const codes = ws.check().issues.map(i => i.code);
  assert.ok(codes.includes('dangling-ref'));
  assert.ok(codes.includes('copy-not-verbatim'));
});

test('notes survive regeneration and contracts stay intact', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: out });
  await ws.run();
  const mcp = new WeshCraftMcp({ workspace: ws, autoRun: false });
  const r = await mcp.callTool('weshcraft_write_notes', { path: 'specs/front/screens/scr-1-welcome.md', notes: '### Edge cases\n- Offline: `#2` shows cached illustration.' });
  assert.equal(r.isError, false);
  await ws.run({ force: true });
  const md = fs.readFileSync(path.join(out, 'specs/front/screens/scr-1-welcome.md'), 'utf8');
  assert.match(md, /Offline: `#2` shows cached illustration/);
  assert.equal(readContract(md).kind, 'front-screen');
  assert.ok(ws.report.ok);
});

test('notes paths cannot escape the output folder', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: out });
  const mcp = new WeshCraftMcp({ workspace: ws, autoRun: false });
  const r = await mcp.callTool('weshcraft_read_spec', { path: '../../etc/passwd' });
  assert.equal(r.isError, true);
});

test('agent pass fills notes through any stdin/stdout CLI and cannot add dangling refs', async () => {
  const out = tmp();
  const agent = path.join(out, 'agent.mjs');
  fs.writeFileSync(agent, "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const ids=[...s.matchAll(/`#(\\d+)`/g)].map(m=>m[1]);process.stdout.write('### Edge cases\\n- check `#'+ids[0]+'` and `#123456`\\n');});");
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: out, agent: `${process.execPath} ${agent}`, concurrency: 4 });
  const r = await ws.run();
  assert.ok(r.report.ok, JSON.stringify(r.report.issues.slice(0, 3)));
  const md = fs.readFileSync(path.join(out, 'specs/front/screens/scr-2-interests.md'), 'utf8');
  assert.match(md, /### Edge cases/);
  assert.match(md, /#123456 \(unknown layer\)/);
});

test('MCP: FigCraft tools are proxied and an edit regenerates the specs', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new McpSource({ command: FAKE, file: ONBOARDING }), outDir: out });
  const mcp = new WeshCraftMcp({ workspace: ws, debounceMs: 10 });
  try {
    const init = await mcp.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
    assert.equal(init.result.serverInfo.name, 'weshcraft');
    const list = await mcp.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = list.result.tools.map(t => t.name);
    assert.ok(names.includes('figcraft_set_properties') && names.includes('weshcraft_generate'));
    await ws.run();
    const welcome = ws.manifest.screens[0];
    const title = welcome.texts.find(t => t.characters.length > 10);
    const done = new Promise(resolve => { const t = setInterval(() => { if (!ws.running && ws.runs >= 2) { clearInterval(t); resolve(); } }, 20); });
    await mcp.handle({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'figcraft_set_properties', arguments: { ids: [title.id], props: { characters: 'Trails, sorted.' } } } });
    await done;
    const md = fs.readFileSync(path.join(out, `specs/front/screens/${welcome.key}.md`), 'utf8');
    assert.match(md, /Trails, sorted\./);
    assert.ok(ws.report.ok);
  } finally { ws.source.close(); }
});

test('zip round-trips and the bundle carries specs, prototype, design and CI', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(APP), outDir: out });
  await ws.run();
  const files = collectFiles(out, { provider: 'github', designFile: APP });
  const zip = readZip(writeZip(files.map(f => [f.path, f.data])));
  for (const p of ['specs/README.md', 'prototype/index.html', 'design/ridgeline-app.figcraft', '.github/workflows/weshcraft-parity.yml']) assert.ok(zip.has(p), p);
  assert.deepEqual(zip.get('design/ridgeline-app.figcraft'), fs.readFileSync(APP));
  const gl = collectFiles(out, { provider: 'gitlab' }).map(f => f.path);
  assert.ok(gl.includes('ci/weshcraft.gitlab-ci.yml'));
});

test('GitHub publish: branch, tree, commit, PR (mock API)', async () => {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; }).on('end', () => {
      calls.push(`${req.method} ${req.url}`);
      const json = v => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)); };
      const u = req.url;
      if (u === '/repos/o/r') return json({ default_branch: 'main', html_url: 'https://gh/o/r' });
      if (u === '/repos/o/r/git/ref/heads/main') return json({ object: { sha: 'base' } });
      if (u.startsWith('/repos/o/r/git/ref/heads/weshcraft')) { res.writeHead(404); return res.end('{"message":"Not Found"}'); }
      if (u === '/repos/o/r/git/refs') return json({});
      if (u === '/repos/o/r/git/commits/base') return json({ tree: { sha: 't0' } });
      if (u === '/repos/o/r/git/blobs') return json({ sha: 'blob' });
      if (u === '/repos/o/r/git/trees') { assert.ok(JSON.parse(body).tree.length > 3); return json({ sha: 't1' }); }
      if (u === '/repos/o/r/git/commits') return json({ sha: 'c1' });
      if (u.startsWith('/repos/o/r/git/refs/heads/')) return json({});
      if (u.startsWith('/repos/o/r/pulls?')) return json([]);
      if (u === '/repos/o/r/pulls') return json({ html_url: 'https://gh/o/r/pull/7', number: 7 });
      res.writeHead(500); res.end('{}');
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const files = [{ path: 'specs/a.md', data: Buffer.from('# a') }, { path: 'design/x.figcraft', data: Buffer.from([1, 2, 3]) }, { path: 'prototype/index.html', data: Buffer.from('<p>') }, { path: 'b.json', data: Buffer.from('{}') }];
    const r = await publishGitHub({ repo: 'o/r', token: 't', branch: 'weshcraft/x', title: 'Specs', body: 'b', files, apiUrl: `http://127.0.0.1:${server.address().port}` });
    assert.equal(r.url, 'https://gh/o/r/pull/7');
    assert.ok(calls.includes('POST /repos/o/r/git/refs'));
    assert.ok(calls.includes('POST /repos/o/r/git/blobs'), 'binary design file goes as a blob');
  } finally { server.close(); }
});

test('WCAG contrast math', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ffffff', '#ffffff'), 1);
});

test('front ⇄ back links: triggers, submits, displays, loaded-by and gaps', async () => {
  const m = buildManifest((await new FileSource(ACCOUNT).load()).model);
  const rel = (r, node) => m.links.edges.find(e => e.rel === r && e.node === node);
  const create = m.domain.operations.find(o => o.method === 'POST' && o.path === '/users');
  assert.equal(create.entity, 'User');
  const signup = m.screens.find(s => s.key === 'scr-sign-up');
  const button = signup.actions.find(a => a.label === 'Create account');
  assert.equal(rel('triggers', button.id).op, create.key);
  for (const input of signup.inputs) assert.equal(rel('submits', input.id).op, create.key, input.name);
  const name = m.screens.find(s => s.key === 'scr-profile').texts.find(t => t.characters === '{{user.name}}');
  const shows = rel('displays', name.id);
  assert.equal(shows.field, 'User.name');
  assert.equal(m.domain.operations.find(o => o.key === shows.via).path, '/users/me');
  assert.deepEqual(m.links.gaps.map(g => `${g.kind}:${g.field ?? g.op}`), ['unloaded-data:Subscription.plan']);
});

test('links show up on both sides and parity guards them', async () => {
  const out = tmp();
  const ws = new Workspace({ source: new FileSource(ACCOUNT), outDir: out });
  const r = await ws.run();
  assert.ok(r.report.ok, JSON.stringify(r.report.issues.slice(0, 3)));
  assert.ok(r.report.issues.some(i => i.code === 'gap-unloaded-data' && i.level === 'warning'));
  const read = f => fs.readFileSync(path.join(out, f), 'utf8');
  assert.match(read('specs/front/screens/scr-profile.md'), /\[`User\.name`\]\(\.\.\/\.\.\/back\/domain\.md#entity-user\) \| loaded by \[`GET \/users\/me`\]/);
  assert.match(read('specs/back/api.md'), /- Front end: ▶ `#\d+` Create account · ⇢ `#\d+` Email field/);
  assert.match(read('specs/back/domain.md'), /<a id="entity-user"><\/a>/);
  assert.match(read('specs/LINKS.md'), /flowchart LR/);
  const oa = JSON.parse(read('specs/back/openapi.json'));
  assert.equal(oa.paths['/users/me'].get.responses['200'].content['application/json'].schema.$ref, '#/components/schemas/User');
  assert.match(read('prototype/index.html'), /data-op="op-create-account-\d+"/);
  // Drop one link from the screen contract: parity must fail.
  const f = path.join(out, 'specs/front/screens/scr-sign-up.md');
  fs.writeFileSync(f, read('specs/front/screens/scr-sign-up.md').replace(/\{\n\s*"node": \d+,\n\s*"op": "op-create-account-\d+",\n\s*"rel": "submits"\n\s*\},?/, ''));
  assert.ok(ws.check().issues.some(i => i.code === 'links-differ'));
});

import { execFileSync } from 'node:child_process';
import { Syncer, parseTarget } from '../src/publish/sync.mjs';
import { publishGitLab, gitBlobSha } from '../src/publish/git.mjs';

const gitRepo = () => {
  const dir = tmp();
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Test');
  g('config', 'user.email', 'test@example.com');
  fs.writeFileSync(path.join(dir, 'README.md'), '# app\n');
  fs.writeFileSync(path.join(dir, 'notes.txt'), 'mine, uncommitted\n');
  g('add', 'README.md');
  g('commit', '-q', '-m', 'init');
  return { dir, g };
};

test('sync targets parse', () => {
  assert.deepEqual(parseTarget('github:o/r@specs'), { kind: 'github', repo: 'o/r', branch: 'specs' });
  assert.deepEqual(parseTarget('git'), { kind: 'git', repo: null, branch: null });
  assert.throws(() => parseTarget('github'));
  assert.throws(() => parseTarget('svn:x'));
});

test('local git sync commits only WeshCraft paths, then is a no-op, and never switches branches', async () => {
  const { dir, g } = gitRepo();
  const design = path.join(dir, 'design', 'account.figcraft.json');
  fs.mkdirSync(path.dirname(design));
  fs.copyFileSync(ACCOUNT, design);
  const ws = new Workspace({ source: new FileSource(design), outDir: dir });
  const sync = new Syncer(ws, parseTarget('git', { auto: false }));
  try {
    await ws.run();
    const r1 = await sync.sync();
    assert.equal(r1.changed, true);
    const files = g('show', '--name-only', '--format=', 'HEAD').split('\n');
    assert.ok(files.includes('specs/LINKS.md') && files.includes('prototype/index.html') && files.includes('design/account.figcraft.json'));
    assert.ok(files.includes('.github/workflows/weshcraft-parity.yml'));
    assert.ok(!files.includes('notes.txt'), 'user files are left alone');
    assert.match(g('status', '--porcelain'), /\?\? notes\.txt/);
    assert.doesNotMatch(g('log', '-1', '--format=%B'), /claude|co-authored/i);
    const r2 = await sync.sync();
    assert.equal(r2.changed, false);
    sync.configure(parseTarget('git@release', { auto: false }));
    await assert.rejects(sync.sync(), /check out release first/);
  } finally { sync.close(); }
});

test('auto sync runs after an in-sync regeneration', async () => {
  const { dir, g } = gitRepo();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: dir });
  const sync = new Syncer(ws, parseTarget('git', { auto: true }));
  try {
    await ws.run();
    for (let i = 0; i < 100 && !sync.last; i++) await new Promise(r => setTimeout(r, 20));
    while (sync.busy) await sync.busy.catch(() => {});
    assert.equal(sync.last?.ok, true, JSON.stringify(sync.last));
    assert.match(g('log', '-1', '--format=%s'), /^docs\(specs\): Ridgeline onboarding: first version/);
  } finally { sync.close(); }
});

test('MCP weshcraft_sync configures and runs a sync', async () => {
  const { dir } = gitRepo();
  const ws = new Workspace({ source: new FileSource(ONBOARDING), outDir: dir });
  const sync = new Syncer(ws);
  const mcp = new WeshCraftMcp({ workspace: ws, autoRun: false, syncer: sync });
  try {
    const r = await mcp.callTool('weshcraft_sync', { target: 'git', auto: false });
    assert.equal(r.isError, false, r.content[0].text);
    const out = JSON.parse(r.content[0].text);
    assert.equal(out.result.changed, true);
    assert.equal(out.status.target, 'git');
  } finally { sync.close(); }
});

test('GitLab sync skips files the branch already has', async () => {
  const same = Buffer.from('# same\n');
  const calls = [];
  const server = http.createServer((req, res) => {
    calls.push(`${req.method} ${req.url.split('?')[0]}`);
    const json = v => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)); };
    if (req.url === '/projects/g%2Fp') return json({ default_branch: 'main', web_url: 'https://gl/g/p' });
    if (req.url.startsWith('/projects/g%2Fp/repository/branches/')) return json({});
    if (req.url.startsWith('/projects/g%2Fp/repository/tree')) return json([{ type: 'blob', path: 'specs/a.md', id: gitBlobSha(same) }]);
    res.writeHead(500); res.end('{}');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  try {
    const r = await publishGitLab({ repo: 'g/p', token: 't', branch: 'weshcraft/specs', title: 't', body: 'b', files: [{ path: 'specs/a.md', data: same }], apiUrl: `http://127.0.0.1:${server.address().port}`, pr: false });
    assert.equal(r.changed, false);
    assert.ok(!calls.some(c => c.includes('/repository/commits')), 'no commit when nothing changed');
  } finally { server.close(); }
});

test('init: Claude Code MCP, OpenCode 2 plugin (default) or OpenCode 2 MCP (--no-plugin)', () => {
  const bin = path.join(here, '..', 'bin', 'weshcraft.mjs');
  const dir = tmp();
  execFileSync(process.execPath, [bin, 'init', '--client', 'both', '--attach', '7979', '--sync', 'git'], { cwd: dir });
  const claude = JSON.parse(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'));
  assert.ok(claude.mcpServers.weshcraft.args.includes('--attach'));
  assert.ok(claude.mcpServers.weshcraft.args.includes('git'));
  const shim = fs.readFileSync(path.join(dir, '.opencode/plugins/weshcraft.js'), 'utf8');
  assert.match(shim, /^export \{ default \} from "file:.*\/opencode\/plugin\.mjs";$/m);
  assert.equal(shim.match(/^export /gm).length, 1, 'only the default export');
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dir, '.opencode/weshcraft.json'), 'utf8')), { attach: 7979, sync: 'git' });
  assert.ok(!fs.existsSync(path.join(dir, 'opencode.json')), 'plugin mode adds no MCP entry (no duplicate tools)');
  const dir2 = tmp();
  fs.writeFileSync(path.join(dir2, 'opencode.json'), JSON.stringify({ mcp: { servers: { other: {} } } }));
  execFileSync(process.execPath, [bin, 'init', '--client', 'opencode', '--no-plugin'], { cwd: dir2 });
  const oc2 = JSON.parse(fs.readFileSync(path.join(dir2, 'opencode.json'), 'utf8'));
  assert.equal(oc2.mcp.servers.weshcraft.disabled, false);
  assert.ok(oc2.mcp.servers.other, 'existing servers kept');
  const dir3 = tmp();
  execFileSync(process.execPath, [bin, 'init', '--client', 'claude', '--surface', 'api/openapi.yaml'], { cwd: dir3 });
  const c3 = JSON.parse(fs.readFileSync(path.join(dir3, '.mcp.json'), 'utf8')).mcpServers.weshcraft.args;
  assert.ok(c3.includes('--surface') && !c3.includes('--mcp'), 'API-only projects need no FigCraft');
});

import { diffManifests, updateChangelog, summaryLine } from '../src/spec/diff.mjs';

test('design changelog: copy, screens and operations, newest first', async () => {
  const before = buildManifest((await new FileSource(ACCOUNT).load()).model);
  const doc = JSON.parse(fs.readFileSync(ACCOUNT, 'utf8'));
  for (const n of Object.values(doc.nodes)) if (n.characters === 'Create your account') n.characters = 'Join WeshTrails';
  const file = path.join(tmp(), 'edited.figcraft.json');
  fs.writeFileSync(file, JSON.stringify(doc));
  const after = buildManifest((await new FileSource(file).load()).model);
  const d = diffManifests(before, after);
  assert.ok(d.items.some(i => i.area === 'copy' && /Create your account.*Join WeshTrails/.test(i.text)));
  assert.equal(summaryLine(d), '1 copy');
  const log1 = updateChangelog(null, d);
  const log2 = updateChangelog(log1, diffManifests(after, before));
  assert.ok(log2.indexOf(before.source.hash) < log2.lastIndexOf(after.source.hash), 'newest entry first');
  assert.equal(diffManifests(after, after).items.length, 0);
  // Workspace writes CHANGES.md when the design on disk changed.
  const out = tmp();
  const w1 = new Workspace({ source: new FileSource(ACCOUNT), outDir: out });
  await w1.run();
  const w2 = new Workspace({ source: new FileSource(file), outDir: out });
  await w2.run();
  assert.match(fs.readFileSync(path.join(out, 'specs/CHANGES.md'), 'utf8'), /Join WeshTrails/);
});

import { parseYaml } from '../src/surface/yaml.mjs';
import { loadSurfaceFile, loadMcpServer, SurfaceSource } from '../src/surface/load.mjs';
import { emptyModel } from '../src/model/manifest.mjs';

const BILLING = path.join(here, 'fixtures/billing/weshcraft.surface.json');

test('YAML subset: maps, sequences, flow, block scalars, comments', () => {
  const y = parseYaml('a: 1\nb:\n  - x\n  - {k: v, n: [1, 2]}\nc: |\n  line one\n  line two\nd: "q: x" # note\ne: >-\n  folded\n  text\n');
  assert.deepEqual(y, { a: 1, b: ['x', { k: 'v', n: [1, 2] }], c: 'line one\nline two\n', d: 'q: x', e: 'folded text' });
  assert.throws(() => parseYaml('a: &x 1\nb: *x\n'));
});

test('surface: OpenAPI (YAML, $ref, allOf) and MCP tools become one manifest', () => {
  const s = loadSurfaceFile(BILLING);
  assert.equal(s.api.endpoints.length, 5);
  const list = s.api.endpoints.find(e => e.operationId === 'listInvoices');
  assert.deepEqual(list.params.map(p => p.name), ['status', 'limit'], 'parameter $ref resolved');
  assert.ok(s.api.schemas.Invoice.fields.some(f => f.name === 'status'), 'allOf merged');
  const m = buildManifest(emptyModel(), { surface: s });
  assert.equal(m.source.name, 'Billing service');
  assert.deepEqual(m.domain.entities.map(e => e.name), ['Customer', 'Invoice']);
  const tool = n => m.surface.mcp.tools.find(t => t.name === n);
  assert.equal(tool('create_invoice').link, 'explicit');
  assert.equal(tool('list_invoices').link, 'inferred', 'list_invoices ↔ listInvoices');
  assert.equal(tool('void_invoice').op, null);
  assert.ok(tool('void_invoice').hints.destructive);
  assert.ok(m.links.edges.some(e => e.rel === 'invokes' && e.node === 'tool:send_invoice'));
  assert.equal(m.links.gaps.length, 0);
});

test('non-visual workspace: MCP + API specs, catalog, parity, drift on a schema change', async () => {
  const dir = tmp();
  for (const f of fs.readdirSync(path.dirname(BILLING))) fs.copyFileSync(path.join(path.dirname(BILLING), f), path.join(dir, f));
  const out = tmp();
  const ws = new Workspace({ source: null, surface: new SurfaceSource({ files: [path.join(dir, 'weshcraft.surface.json')] }), outDir: out });
  const r = await ws.run();
  assert.ok(r.report.ok, JSON.stringify(r.report.issues.slice(0, 3)));
  for (const f of ['specs/front/mcp/README.md', 'specs/front/mcp/tool-void-invoice.md', 'specs/front/api/README.md', 'specs/front/api/ep-post-invoices.md', 'specs/back/openapi.json', 'specs/LINKS.md'])
    assert.ok(fs.existsSync(path.join(out, f)), f);
  assert.ok(!fs.existsSync(path.join(out, 'specs/front/flows.md')), 'no screens, no flows spec');
  const tool = fs.readFileSync(path.join(out, 'specs/front/mcp/tool-void-invoice.md'), 'utf8');
  assert.match(tool, /\*\*destructive\*\*/);
  assert.match(tool, /Calling without `reason` returns a tool error/);
  const proto = fs.readFileSync(path.join(out, 'prototype/index.html'), 'utf8');
  assert.match(proto, /id="surface-mcp"/);
  assert.match(proto, /data-node="tool:void_invoice"/);
  assert.match(proto, /data-node="ep:POST \/invoices"/);
  const oa = JSON.parse(fs.readFileSync(path.join(out, 'specs/back/openapi.json'), 'utf8'));
  assert.equal(oa.paths['/invoices'].post.operationId, 'createInvoice');
  assert.equal(oa.paths['/invoices'].post.requestBody.content['application/json'].schema.$ref, '#/components/schemas/InvoiceInput');
  // Change a tool's schema in the server: its spec is stale until regenerated.
  const tf = path.join(dir, 'mcp-tools.json');
  const tools = JSON.parse(fs.readFileSync(tf, 'utf8'));
  tools.tools.find(t => t.name === 'void_invoice').inputSchema.properties.notify = { type: 'boolean' };
  fs.writeFileSync(tf, JSON.stringify(tools));
  await ws.snapshot();
  const issues = ws.check().issues;
  assert.ok(issues.some(i => i.code === 'stale' && i.file === 'specs/front/mcp/tool-void-invoice.md'));
  assert.ok(issues.some(i => i.code === 'mcp-input-differs'));
  const r2 = await ws.run();
  assert.ok(r2.report.ok);
  assert.match(fs.readFileSync(path.join(out, 'specs/CHANGES.md'), 'utf8'), /MCP tool `void_invoice`: \+`notify`/);
  // Publishing carries the surface files and a CI check that uses them.
  const files = collectFiles(out, { provider: 'github', designInputs: ws.designInputs() });
  const names = files.map(f => f.path);
  for (const n of ['design/weshcraft.surface.json', 'design/openapi.yaml', 'design/mcp-tools.json']) assert.ok(names.includes(n), n);
  const ci = files.find(f => f.path === '.github/workflows/weshcraft-parity.yml').data.toString();
  assert.match(ci, /--surface design\/weshcraft\.surface\.json/);
  assert.doesNotMatch(ci, /--surface design\/openapi\.yaml/, 'referenced files are copied, not passed');
});

test('live MCP server introspection (tools/list over stdio) with a snapshot for CI', async () => {
  const s = await loadMcpServer(`${FAKE} --fixture ${ONBOARDING}`);
  assert.ok(s.mcp.tools.some(t => t.name === 'inspect_document'));
  const out = tmp();
  const src = new SurfaceSource({ servers: [`${FAKE}`], snapshotDir: path.join(out, 'design') });
  const ws = new Workspace({ source: null, surface: src, outDir: out });
  const r = await ws.run();
  assert.ok(r.report.ok, JSON.stringify(r.report.issues.slice(0, 3)));
  const snap = ws.designInputs().find(x => x.abs.endsWith('.mcp.json'));
  assert.ok(snap && fs.existsSync(snap.abs), 'snapshot written for CI');
  // The snapshot alone reproduces the same manifest (what CI checks against).
  const fromSnap = buildManifest(emptyModel(), { surface: loadSurfaceFile(snap.abs) });
  assert.equal(fromSnap.source.hash, ws.manifest.source.hash);
});


import { createPlugin, detectConfig, serveArgs } from '../opencode/plugin.mjs';

const billingProject = () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, 'design'));
  for (const f of fs.readdirSync(path.dirname(BILLING))) fs.copyFileSync(path.join(path.dirname(BILLING), f), path.join(dir, 'design', f));
  return dir;
};
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) throw new Error('timed out'); await new Promise(r => setTimeout(r, 150)); } };

test('OpenCode plugin: project detection and serve arguments', () => {
  assert.equal(detectConfig(tmp()), null, 'nothing to spec: idle');
  const dir = billingProject();
  const cfg = detectConfig(dir);
  assert.deepEqual(cfg.surface, ['design/weshcraft.surface.json']);
  assert.ok(cfg.port >= 4600 && cfg.port < 4900);
  assert.equal(detectConfig(dir).port, cfg.port, 'stable port per project');
  fs.mkdirSync(path.join(dir, '.opencode'));
  fs.writeFileSync(path.join(dir, '.opencode/weshcraft.json'), JSON.stringify({ surface: 'design/openapi.yaml', port: 4777, sync: 'git' }));
  const c2 = detectConfig(dir);
  assert.deepEqual(serveArgs(c2).slice(0, 8), ['serve', '--out', '.', '--port', '4777', '--concurrency', '6', '--surface']);
  assert.ok(serveArgs(c2).includes('--sync'));
});

test('OpenCode 2 plugin: starts WeshCraft, namespaced tools, /weshcraft command, regenerates on save, cleanup', async () => {
  const dir = billingProject();
  const port = 4870 + Math.floor(Math.random() * 25);
  const plugin = createPlugin({ config: { ...detectConfig(dir), port } });
  const tools = new Map(), namespaces = [], commands = new Map(), prompts = [];
  const ctx = {
    location: { directory: dir, project: { id: 'p', directory: dir, canonical: dir } },
    options: {},
    tool: { transform: async cb => cb({ namespace: n => namespaces.push(n.name), add: t => tools.set(`${t.options?.namespace ? `${t.options.namespace}_` : ''}${t.name}`, t) }) },
    command: { transform: async cb => cb({ add: c => commands.set(c.name, c) }) },
    session: { prompt: async p => prompts.push(p) },
  };
  const cleanup = await plugin.setup(ctx);
  try {
    assert.deepEqual(namespaces, ['weshcraft']);
    for (const n of ['weshcraft_open', 'weshcraft_status', 'weshcraft_generate', 'weshcraft_check', 'weshcraft_links', 'weshcraft_sync', 'weshcraft_read_spec']) assert.ok(tools.has(n), n);
    assert.equal(tools.get('weshcraft_links').input.additionalProperties, false);
    assert.deepEqual(tools.get('weshcraft_read_spec').input.required, ['path']);
    assert.match((await tools.get('weshcraft_open').execute({})).content, /^WeshCraft: http:\/\/127\.0\.0\.1:\d+\//);
    await waitFor(async () => /"ok": true/.test((await tools.get('weshcraft_check').execute({}, { signal: AbortSignal.timeout(5000) })).content));
    assert.match((await tools.get('weshcraft_read_spec').execute({ path: 'specs/front/mcp/tool-void-invoice.md' })).content, /\*\*destructive\*\*/);
    // /weshcraft sends the instructions into the session, with whatever the user typed after it.
    await commands.get('weshcraft').execute({ sessionID: 's1', prompt: { text: 'focus on the API' }, delivery: 'queue' });
    assert.equal(prompts[0].sessionID, 's1');
    assert.match(prompts[0].text, /Call weshcraft_open[\s\S]*focus on the API$/);
    // Saving the MCP tool list (by OpenCode or anyone) regenerates: the new tool gets its spec.
    const tf = path.join(dir, 'design', 'mcp-tools.json');
    const j = JSON.parse(fs.readFileSync(tf, 'utf8'));
    j.tools.push({ name: 'refund_invoice', description: 'Refund a paid invoice.', inputSchema: { type: 'object', required: ['id'], properties: { id: { type: 'string' } } }, annotations: { destructiveHint: true } });
    fs.writeFileSync(tf, JSON.stringify(j));
    await waitFor(async () => fs.existsSync(path.join(dir, 'specs/front/mcp/tool-refund-invoice.md')));
  } finally { cleanup?.(); }
  await waitFor(async () => { try { await fetch(`http://127.0.0.1:${port}/api/state`, { signal: AbortSignal.timeout(300) }); return false; } catch { return true; } });
});

test('OpenCode 2 plugin: idle where there is nothing to spec; options come from opencode.json', async () => {
  const empty = createPlugin();
  assert.equal(await empty.setup({ location: { directory: tmp() }, tool: { transform: () => assert.fail('no tools') } }), undefined);
  const dir = billingProject();
  assert.equal(detectConfig(tmp(), { surface: 'x.yaml', port: 4999 }).port, 4999, 'plugin options are config');
  assert.deepEqual(detectConfig(dir, { surface: 'design/openapi.yaml' }).surface, ['design/openapi.yaml'], 'options win over detection');
});

import { createService, listen } from '../openchamber/service/main.js';

test('OpenChamber extension: manifest, built frames, service (auth, state, run, empty project)', async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const oc = pkg.openchamber;
  assert.equal(oc.apiVersion, 1);
  for (const entry of [oc.contributes.panel.entry, oc.contributes.statusSection.entry, oc.contributes.service.entry, oc.contributes.panel.icon]) assert.ok(fs.existsSync(path.join(root, entry)), entry);
  for (const f of ['openchamber/panel/main.js', 'openchamber/status/main.js']) assert.ok(fs.statSync(path.join(root, f)).size > 1000, `${f} is built`);
  assert.ok(oc.contributes.tools.some(t => t.match === 'weshcraft_read_spec' && t.output === 'markdown'));
  // The SDK's own parser accepts it, when the dev dependency is installed.
  const parse = path.join(root, 'node_modules/@openchamber/sdk/dist/parse.js');
  if (fs.existsSync(parse)) assert.equal((await import(parse)).parseManifestJson(JSON.stringify(pkg)).ok, true);

  const dir = billingProject();
  const port = 4900 + Math.floor(Math.random() * 25);
  const service = createService({ config: d => (d === dir ? { ...detectConfig(d), port } : detectConfig(d)) });
  const svcPort = 4930 + Math.floor(Math.random() * 25);
  const server = listen({ port: svcPort, token: 't0k', service });
  const call = (p, init = {}, token = 't0k') => fetch(`http://127.0.0.1:${svcPort}${p}`, { ...init, headers: { authorization: `Bearer ${token}` } });
  try {
    await new Promise(r => server.once('listening', r));
    assert.equal((await call('/health', {}, 'wrong')).status, 401);
    const empty = await (await call(`/state?directory=${encodeURIComponent(fs.mkdtempSync(path.join(os.tmpdir(), 'wc-empty-')))}`)).json();
    assert.equal(empty.status, 'none');
    let st;
    await waitFor(async () => { st = await (await call(`/state?directory=${encodeURIComponent(dir)}`)).json(); return st.status === 'ok' && st.report?.ok; });
    assert.match(st.url, new RegExp(`^http://127\\.0\\.0\\.1:${port}/`));
    assert.ok(st.summary.tools > 0 && st.summary.endpoints > 0);
    assert.ok(st.jobs.some(j => j.file === 'specs/front/mcp/README.md'));
    assert.ok(!st.source.includes(dir), 'source is shown relative to the project');
    assert.equal((await call('/run', { method: 'POST', body: JSON.stringify({ directory: dir }) })).status, 200);
  } finally { service.stop(); server.close(); }
});
