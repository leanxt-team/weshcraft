// The user's flow, end to end: OpenChamber panel (stand-in host) + the OpenCode plugin as "the bot".
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, WORK, OUT] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(150); } };
fs.rmSync(WORK, { recursive: true, force: true });
const mk = (n, files = {}) => { const d = path.join(WORK, n); fs.mkdirSync(d, { recursive: true }); for (const [rel, src] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, rel)), { recursive: true }); fs.copyFileSync(src, path.join(d, rel)); } return d; };
const FX = n => path.join(ROOT, 'test/fixtures', n);
const EXIST = mk('existing', { 'design/account.figcraft.json': FX('account.figcraft.json') });
execSync('git init -q -b main && git config user.email t@e.com && git config user.name T && git add -A && git commit -qm design', { cwd: EXIST, shell: '/bin/sh' });
const MONO = mk('mono', { 'apps/web/design/app.figcraft': FX('ridgeline-onboarding.figcraft') });
const EMPTY1 = mk('empty-hand'), EMPTY2 = mk('empty-bot');

const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const { createPlugin } = await import(path.join(ROOT, 'opencode/plugin.mjs'));
const service = createService(); const s = listen({ port: 47995, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47995, token: 't' } });
const b = await chromium.launch(); const errs = [];
const panel = async dir => {
  const p = await b.newPage({ viewport: { width: 520, height: 900 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/fonts\.g|Content Security/.test(m.text()) && errs.push(m.text()));
  const t0 = Date.now();
  await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(dir)}&w=500&h=880&surface=panel`);
  return { p, f: p.frameLocator('#f'), t0 };
};
/** The bot: the real OpenCode plugin in this project. */
const bot = async (dir, idleCheckMs = 800) => {
  const tools = new Map();
  const ctx = { location: { directory: dir }, options: {}, tool: { transform: async cb => cb({ namespace: () => {}, add: t => tools.set(`${t.options?.namespace}_${t.name}`, t) }), reload: async () => {} }, command: { transform: async () => {} }, session: { prompt: async () => {} } };
  const cleanup = await createPlugin({ idleCheckMs }).setup(ctx);
  const call = async (name, args = {}) => (await tools.get(name).execute(args, {})).content;
  return { tools, call, cleanup };
};
const canvasText = o => o.f.locator('#edScreen').innerText().catch(() => '');
const cleanups = [];
try {
  // 1. existing work
  let o = await panel(EXIST);
  const shown = await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) > 5, 20000);
  ok('existing work: the panel shows the design right away', !!shown, `${((Date.now() - o.t0) / 1000).toFixed(1)} s`);
  let B = await bot(EXIST); cleanups.push(B.cleanup);
  ok('existing work: the bot has the design tools', B.tools.has('design_edit') && B.tools.has('design_text'));
  await B.call('design_text', { edits: [{ id: 4, text: 'Join the trail club' }] });
  ok('bot edit appears on the canvas', !!await waitFor(async () => (await canvasText(o)).includes('Join the trail club'), 8000));
  ok('bot edit is in the specs', !!await waitFor(async () => fs.readFileSync(path.join(EXIST, 'specs/front/screens/scr-sign-up.md'), 'utf8').includes('Join the trail club'), 8000));
  const node = o.f.locator('#edScreen [data-node="5"]');
  const bb = await node.boundingBox();
  await o.p.keyboard.down('Control'); await o.p.mouse.click(bb.x + 3, bb.y + 3); await o.p.keyboard.up('Control');
  await o.p.keyboard.press('Enter'); await sleep(150); await o.p.keyboard.type('Edited by hand'); await o.p.keyboard.press('Enter');
  ok('hand edit is in the specs', !!await waitFor(async () => fs.readFileSync(path.join(EXIST, 'specs/front/screens/scr-sign-up.md'), 'utf8').includes('Edited by hand'), 8000));
  ok('the bot sees the hand edit', /Edited by hand/.test(await B.call('design_get', { id: 5 })));
  await o.p.screenshot({ path: `${OUT}/flow-existing.png` });
  // 5. branch switch: same panel, another branch
  fs.rmSync(path.join(EXIST, 'specs'), { recursive: true, force: true });
  execSync('git stash -u -q && git checkout -q -b redesign', { cwd: EXIST });
  await waitFor(async () => (await canvasText(o)).includes('Create your account'), 8000);
  const { DesignStore } = await import(path.join(ROOT, 'src/design/store.mjs'));
  const other = DesignStore.open(path.join(EXIST, 'design/account.figcraft.json'));
  other.apply([{ op: 'text', id: 4, text: 'Redesigned on a branch' }]); other.saveNow();
  execSync('git commit -qam redesign && git checkout -q main', { cwd: EXIST });
  execSync('git checkout -q redesign', { cwd: EXIST });
  ok('branch switch: the panel follows the checked-out design', !!await waitFor(async () => (await canvasText(o)).includes('Redesigned on a branch'), 10000));
  execSync('git checkout -q main', { cwd: EXIST });
  ok('branch switch back', !!await waitFor(async () => (await canvasText(o)).includes('Create your account'), 10000));
  await o.p.close();

  // 2. monorepo: the only design, opened without asking
  o = await panel(MONO);
  ok('monorepo: its only design opens directly', !!await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) > 5, 20000));
  ok('monorepo: remembered', !!await waitFor(async () => fs.existsSync(path.join(MONO, '.weshcraft.json')) || /apps\/web\/design/.test(await o.f.locator('#source').innerText()), 5000), await o.f.locator('#source').innerText());
  await o.p.close();

  // 3. empty project, started by hand; the bot picks it up by itself
  B = await bot(EMPTY1); cleanups.push(B.cleanup);
  ok('empty: the bot has only weshcraft_start', [...B.tools.keys()].join() === 'weshcraft_start');
  o = await panel(EMPTY1);
  await o.f.locator('#edEmpty .ed-preset').first().waitFor({ timeout: 20000 });
  await o.p.screenshot({ path: `${OUT}/flow-empty.png` });
  await o.f.locator('#edEmpty .ed-preset').first().click();
  ok('empty (hand): editor shows the first screen', !!await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) >= 1, 15000));
  ok('empty (hand): the bot gets the design tools without a restart', !!await waitFor(async () => B.tools.has('design_edit'), 10000), [...B.tools.keys()].slice(0, 6).join(','));
  await B.call('design_edit', { ops: [{ op: 'create', parent: 'Home', type: 'text', props: { text: 'Hello from the bot', x: 24, y: 80 } }] });
  ok('empty (hand): the bot edit shows in the panel', !!await waitFor(async () => (await canvasText(o)).includes('Hello from the bot'), 8000));
  await o.p.close();

  // 4. empty project, started by the bot; the open panel follows
  B = await bot(EMPTY2); cleanups.push(B.cleanup);
  o = await panel(EMPTY2);
  await o.f.locator('#edEmpty .ed-preset').first().waitFor({ timeout: 20000 });
  await B.call('weshcraft_start');
  await B.call('design_new', { name: 'Shop' });
  ok('empty (bot): the bot gets the editing tools', B.tools.has('design_edit'));
  await B.call('design_edit', { ops: [{ op: 'screen', name: 'Cart', ref: 's' }, { op: 'create', parent: 's', type: 'text', props: { text: 'Your cart', x: 24, y: 60, fontSize: 24 } }] });
  ok('empty (bot): the panel switches to the editor by itself', !!await waitFor(async () => (await canvasText(o)).includes('Your cart'), 10000));
  ok('empty (bot): specs written', !!await waitFor(async () => fs.existsSync(path.join(EMPTY2, 'specs/front/screens/scr-cart.md')), 8000));
  await o.p.screenshot({ path: `${OUT}/flow-bot-started.png` });
  await o.p.close();
  ok('no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
} catch (e) { R.push(`CRASH ${e.stack}`); }
console.log(R.join('\n'));
for (const c of cleanups) try { c?.(); } catch { /* */ }
await b.close(); service.stop(); s.close(); host.close(); setTimeout(() => process.exit(0), 500);
