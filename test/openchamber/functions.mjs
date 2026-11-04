// The Functions view inside OpenChamber: the diagram in the rail panel (wide and narrow, light and
// dark), keeping the suggestion, editing a function in the sandbox (dialog forms), and the screen
// specs, the editor and the map following.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, WORK, OUT = WORK] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(path.join(WORK, 'design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/account.figcraft.json'), path.join(WORK, 'design/App.figcraft.json'));
const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService(); const s = listen({ port: 47998, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47998, token: 't' } });
const b = await chromium.launch(); const errs = [];
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const declared = () => { const d = JSON.parse(fs.readFileSync(path.join(WORK, 'design/App.figcraft.json'), 'utf8')); return JSON.parse(d.nodes[String(d.pages[0])].pluginData?.weshcraft || '{}').functions ?? null; };
try {
  const open = async (w, h, theme) => {
    const p = await b.newPage({ viewport: { width: w + 20, height: h + 20 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(WORK)}&w=${w}&h=${h}&surface=panel&theme=${theme}`);
    const f = p.frameLocator('#f');
    await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 });
    for (let i = 0; i < 60 && !/In sync/.test(await f.locator('#parity').innerText()); i++) await sleep(300);
    return { p, f };
  };
  // wide
  let { p, f } = await open(1280, 820, 'light');
  await f.locator('.rail .tab[data-tab="functions"]').click(); await sleep(700);
  ok('wide: Functions tab in the header', true);
  ok('wide: suggested, with Keep', await f.locator('#fnKeep').isVisible());
  ok('wide: diagram drawn (wires)', await f.locator('.fn-wires path.w').count() >= 2, String(await f.locator('.fn-wires path.w').count()));
  await p.screenshot({ path: `${OUT}/f-wide-suggested.png` });
  await f.locator('#fnKeep').click();
  ok('wide: kept into the design', !!(await (async () => { for (let i = 0; i < 30; i++) { if (declared()) return true; await sleep(200); } return false; })()), JSON.stringify(declared()));
  await sleep(1500);
  await f.locator('.fn-card').first().hover(); await f.locator('.fn-card .fn-edit').first().click(); await sleep(300);
  await f.locator('.fn-dialog input[name="fnName"]').fill('Join');
  await f.locator('.fn-dialog textarea[name="fnSummary"]').fill('Create an account in one step');
  await f.locator('.fn-dialog input[name="screen"]').nth(1).uncheck();
  await f.locator('.fn-dialog button[type="submit"]').click();
  ok('wide: edit saved through the sandbox form', !!(await (async () => { for (let i = 0; i < 30; i++) { if (declared()?.[0]?.name === 'Join') return true; await sleep(200); } return false; })()), JSON.stringify(declared()));
  await sleep(1500);
  await f.locator('#fnAdd').click(); await sleep(200);
  await f.locator('.fn-dialog input[name="fnName"]').fill('Manage profile');
  await f.locator('.fn-dialog textarea[name="fnSummary"]').fill('See and change your profile and plan');
  await f.locator('.fn-dialog input[name="screen"]').nth(1).check();
  await f.locator('.fn-dialog button[type="submit"]').click();
  for (let i = 0; i < 40 && (await f.locator('.fn-card').count()) < 2; i++) await sleep(200);
  await sleep(800);
  ok('wide: two functions, journey Join → Manage profile', /Manage profile/.test(await f.locator('.fn-card[data-f="fn-join"] .fn-next').innerText().catch(() => '')));
  await f.locator('.fn-card[data-f="fn-join"]').click(); await sleep(700);
  ok('wide: picking a function opens it in the spec', /How the product works/.test(await f.locator('#doc').innerText()));
  await p.screenshot({ path: `${OUT}/f-wide-declared.png` });
  await f.locator('.rail .tab[data-tab="links"]').click(); await sleep(600);
  ok('wide: the map labels screens with their function', /Join/.test(await f.locator('#linkmap .lfn').first().innerText().catch(() => '')));
  await f.locator('.rail .tab[data-tab="design"]').click(); await sleep(1200);
  ok('wide: editor groups screens by function', (await f.locator('#edScreens .ed-group').allInnerTexts()).join() === 'JOIN,MANAGE PROFILE' || (await f.locator('#edScreens .ed-group').allInnerTexts()).join().toLowerCase() === 'join,manage profile', (await f.locator('#edScreens .ed-group').allInnerTexts()).join());
  ok('wide: parity in sync', /In sync/.test(await f.locator('#parity').innerText()), await f.locator('#parity').innerText());
  await p.close();
  // narrow, dark
  ({ p, f } = await open(460, 860, 'dark'));
  await f.locator('.phonebar [data-view="functions"]').click(); await sleep(800);
  ok('narrow: Functions in the bottom bar', await f.locator('.fn-card').count() === 2);
  const geo = await p.frames().find(x => x.url().includes('guest-files')).evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); return { cards: r('.fn-fns'), bar: r('.phonebar'), wires: getComputedStyle(document.querySelector('.fn-wires')).display, w: innerWidth, sw: document.documentElement.scrollWidth }; });
  ok('narrow: stacked, no wires, no sideways scroll', geo.wires === 'none' && geo.sw <= geo.w + 1, JSON.stringify(geo));
  ok('narrow: cards carry the data', await f.locator('.fn-card .fn-ent').count() >= 2);
  ok('narrow: cards use the width', geo.cards.width > geo.w - 60, String(geo.cards.width));
  await p.screenshot({ path: `${OUT}/f-narrow-dark.png` });
  await f.locator('.fn-card[data-f="fn-join"] .fn-edit').click(); await sleep(300);
  const dlg = await p.frames().find(x => x.url().includes('guest-files')).evaluate(() => { const r = document.querySelector('.fn-dialog').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
  ok('narrow: edit dialog fits', dlg.l >= 0 && dlg.r <= dlg.w, JSON.stringify(dlg));
  await f.locator('.fn-dialog button[value="cancel"]').click();
  await p.close();
} catch (e) { R.push(`CRASH ${e.stack}`); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(R.join('\n'));
await b.close(); await host.close?.(); s.close?.(); service.stop?.();
process.exit(0);
