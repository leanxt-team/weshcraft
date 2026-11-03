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
