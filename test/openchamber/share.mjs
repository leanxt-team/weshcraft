// Links opened outside the panel use the address OpenChamber is reached with. Run with SIM_HOST set to a
// non-loopback address of this machine (all.mjs picks one): the prototype, specs and zip are shared there,
// read-only and behind a token; with OpenChamber on loopback, links stay on WeshCraft's own server.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, WORK] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
const SIM = process.env.SIM_HOST;
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(path.join(WORK, 'design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/ridgeline-onboarding.figcraft'), path.join(WORK, 'design/App.figcraft'));
const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService(); const s = listen({ port: 47997, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47997, token: 't' } });
const b = await chromium.launch(); const errs = [];
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  const p = await b.newPage({ viewport: { width: 1300, height: 820 } });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(WORK)}&w=1280&h=800&surface=panel`);
  const f = p.frameLocator('#f');
  await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 });
  for (let i = 0; i < 60 && !/In sync/.test(await f.locator('#parity').innerText()); i++) await sleep(300);
  await f.locator('.rail .tab[data-tab="proto"]').click(); await sleep(500);
  await f.locator('#openProto').click(); await sleep(800);
  await f.locator('#more').click(); await sleep(300); await f.locator('#moreDlg [data-act="zip"]').click(); await sleep(600);
  const urls = (await p.evaluate(() => window.__calls)).filter(c => c.type === 'open-url').map(c => c.payload?.url);
  const proto = urls.find(u => /prototype\/index\.html/.test(u)), zip = urls.find(u => /download\.zip/.test(u));
  ok('prototype link opened', !!proto, JSON.stringify(urls));
  if (SIM) {
    ok('prototype link on the OpenChamber address', new URL(proto).hostname === SIM, proto);
    ok('zip link on the OpenChamber address', new URL(zip).hostname === SIM, zip);
    const r = await fetch(proto); const html = await r.text();
    ok('the shared prototype opens', r.status === 200 && /<html/i.test(html) && /Welcome|summit/i.test(html), String(r.status));
    const cookie = r.headers.get('set-cookie')?.split(';')[0];
    const u = new URL(proto);
    const md = fs.readdirSync(path.join(WORK, 'specs/front/screens')).find(n => n.endsWith('.md'));
    const spec = await fetch(`${u.origin}/out/specs/front/screens/${md}`, { headers: { cookie } });
    ok('its own files load with the cookie (no token in the URL)', spec.status === 200 && /Screen/.test(await spec.text()), `${md} ${spec.status}`);
    ok('no token: refused', (await fetch(`${u.origin}/out/prototype/index.html`)).status === 401);
    ok('wrong token: refused', (await fetch(`${u.origin}/out/prototype/index.html?token=${'x'.repeat(u.searchParams.get('token').length)}`)).status === 401);
    ok('the API is not shared', (await fetch(`${u.origin}/api/state?token=${u.searchParams.get('token')}`)).status === 404);
    ok('read-only', (await fetch(`${u.origin}/out/prototype/index.html?token=${u.searchParams.get('token')}`, { method: 'POST' })).status === 404);
    const z = await fetch(zip);
    ok('the shared zip downloads', z.status === 200 && /zip/.test(z.headers.get('content-type') || '') && (await z.arrayBuffer()).byteLength > 1000, String(z.status));
    await p.goto(proto); await sleep(800);
    ok('the prototype renders in a browser tab', await p.locator('.sc-screen [data-node]').count() > 5);
  } else {
    ok('loopback OpenChamber: link stays on WeshCraft\'s server', /^http:\/\/127\.0\.0\.1:\d+\/out\/prototype\/index\.html/.test(proto), proto);
  }
} catch (e) { R.push(`CRASH ${e.stack}`); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(R.join('\n'));
await b.close(); await host.close?.(); s.close?.(); service.stop?.();
process.exit(0);
