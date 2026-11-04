// The rail panel's header: one line (views, panel toggles, parity, actions menu) and the spec panel
// shown or hidden from it, at the widths an expanded rail panel takes.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, WORK, OUT = WORK] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(path.join(WORK, 'design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/ridgeline-onboarding.figcraft'), path.join(WORK, 'design/App.figcraft'));
const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService(); const s = listen({ port: 47996, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47996, token: 't' } });
const b = await chromium.launch(); const errs = [];
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
try {
  for (const [w, theme] of [[1280, 'light'], [960, 'dark']]) {
    const p = await b.newPage({ viewport: { width: w + 20, height: 820 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(WORK)}&w=${w}&h=800&surface=panel&theme=${theme}`);
    const f = p.frameLocator('#f');
    await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 });
    for (let i = 0; i < 60 && !/In sync/.test(await f.locator('#parity').innerText()); i++) await sleep(300);
    let fr = p.frames().find(x => x.url().includes('guest-files'));
    const geo = () => fr.evaluate(() => {
      const r = el => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
      const vis = s => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0; };
      const top = document.querySelector('.top');
      return {
        top: r(top), oneLine: [...top.children].filter(c => c.getBoundingClientRect().width).every(c => c.getBoundingClientRect().top < top.getBoundingClientRect().top + 30),
        tabsInTop: !!top.querySelector('.tabs [data-tab="proto"]'), syncHidden: !vis('#syncPill') && !vis('#source') && !vis('.top .actions'),
        reader: vis('.reader'), builder: vis('.builder'), canvas: r(document.querySelector('#edCanvas')), stage: r(document.querySelector('.stage')),
        specBtn: vis('#ocToggle-spec'), specPressed: document.querySelector('#ocToggle-spec')?.getAttribute('aria-pressed'),
      };
    });
    let g = await geo();
    ok(`${w}: header on one line`, g.oneLine && g.top.height < 52, JSON.stringify(g.top));
    ok(`${w}: views in the header`, g.tabsInTop);
    ok(`${w}: no logo or name in the header`, !(await f.locator('.top .brand').isVisible()));
    ok(`${w}: sync details left to Work Status`, g.syncHidden);
    ok(`${w}: Spec button in the header, on`, g.specBtn && g.specPressed === 'true');
    ok(`${w}: spec panel shown while designing`, g.reader, JSON.stringify(g));
    ok(`${w}: canvas keeps room`, g.canvas.width > 280, String(g.canvas.width));
    ok(`${w}: no Design/Spec switch in the inspector`, !(await f.locator('.ed-itabs').isVisible().catch(() => false)));
    await f.locator('#edScreens li').nth(1).click(); await sleep(1200);
    ok(`${w}: spec follows the screen being edited`, /2 Interests/.test(await f.locator('#specTitle').innerText()) || /Interests/.test((await f.locator('#doc').innerText()).slice(0, 200)), await f.locator('#specTitle').innerText());
    await f.locator('#edScreens li').nth(0).click(); await sleep(1000);
    // dividers: drag the spec, the inspector and the screens list wider
    const drag = async (name, dx) => {
      const h = f.locator(`.oc-split[data-split="${name}"]`);
      if (!(await h.isVisible())) return null;
      const box = await h.boundingBox(); const y = box.y + box.height / 2, x = box.x + box.width / 2;
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y, { steps: 3 }); await p.mouse.move(x + dx, y, { steps: 3 }); await p.mouse.up(); await sleep(250);
      return true;
    };
    const width = sel => fr.evaluate(s => document.querySelector(s).getBoundingClientRect().width, sel);
    for (const [name, sel, dx, grow] of [['spec', '.reader', -60, 1], ['edr', '.ed-right', -30, 1], ['edl', '.ed-left', 30, 1]]) {
      const w0 = await width(sel); const did = await drag(name, dx); const w1 = await width(sel);
      const cw = await width('.ed-center');
      ok(`${w}: divider resizes ${sel} (or stops at the canvas minimum)`, did && (Math.abs((w1 - w0) - Math.abs(dx) * grow) <= 3 || (w1 >= w0 && cw <= 224)), `${did} ${Math.round(w0)} → ${Math.round(w1)}, center ${Math.round(cw)}`);
    }
    ok(`${w}: canvas still has room`, (await width('#edCanvas')) >= 200, String(await width('#edCanvas')));
    await f.locator('.oc-split[data-split="spec"]').dblclick(); await sleep(250);
    await p.screenshot({ path: `${OUT}/h-${w}-design-spec.png` });
    await f.locator('#ocToggle-spec').click(); await sleep(400);
    g = await geo();
    ok(`${w}: Spec button hides the spec`, !g.reader && g.specPressed === 'false');
    await p.screenshot({ path: `${OUT}/h-${w}-design-nospec.png` });
    await f.locator('.top .tab[data-tab="proto"]').click(); await sleep(600);
    ok(`${w}: views switch from the header`, await f.locator('.tabpanel[data-panel="proto"]').isVisible());
    if (w >= 1200) {
      await f.locator('#ocToggle-list').click(); await sleep(300);
      ok(`${w}: Specs button hides the list`, !(await geo()).builder);
      await f.locator('#ocToggle-list').click(); await sleep(300);
      { const w0 = await width('.builder'); await drag('list', 50); const w1 = await width('.builder'); ok(`${w}: divider resizes the spec list`, Math.abs(w1 - w0 - 50) <= 3, `${Math.round(w0)} → ${Math.round(w1)}`); }
      await f.locator('#ocToggle-list').click(); await sleep(300);
      await f.locator('#ocToggle-list').click(); await sleep(300);
      await f.locator('.job >> nth=0').click(); await sleep(800);
    } else {
      ok(`${w}: list shows when the spec is hidden`, (await geo()).builder);
      await f.locator('.job >> nth=0').click(); await sleep(800);
    }
    g = await geo();
    ok(`${w}: picking a spec shows it`, g.reader && /\w/.test(await f.locator('#doc').innerText()));
    await p.screenshot({ path: `${OUT}/h-${w}-proto-spec.png` });
    await f.locator('#more').click(); await sleep(400);
    const menu = await fr.evaluate(() => { const d0 = document.querySelector('#moreDlg'); const d = document.querySelector('#moreDlg'); const r = d.getBoundingClientRect(); const m = document.querySelector('#more').getBoundingClientRect(); return { open: d.open, top: r.top, bottom: m.bottom, right: Math.round(document.documentElement.clientWidth - r.right), mr: Math.round(document.documentElement.clientWidth - m.right), h: r.height, sr: d.style.right, cw: document.documentElement.clientWidth, iw: innerWidth }; });
    ok(`${w}: actions menu drops under ⋯`, menu.open && menu.top >= menu.bottom && menu.top < menu.bottom + 16 && Math.abs(menu.right - menu.mr) < 3, JSON.stringify(menu));
    await p.screenshot({ path: `${OUT}/h-${w}-menu.png` });
    await p.keyboard.press('Escape'); await sleep(200);
    // the choice is remembered
    await p.reload(); await f.locator('#ocToggle-spec').waitFor({ timeout: 30000 }); await sleep(800); fr = p.frames().find(x => x.url().includes('guest-files'));
    ok(`${w}: spec choice remembered`, (await geo()).specPressed === 'true');
    await p.close();
  }
} catch (e) { R.push(`CRASH ${e.stack}`); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(R.join('\n'));
await b.close(); await host.close?.(); s.close?.(); service.stop?.();
process.exit(0);
