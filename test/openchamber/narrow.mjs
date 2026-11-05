import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, P1, WORK, OUT] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
fs.rmSync(WORK, { recursive: true, force: true });
const P4 = path.join(WORK, 'mono'); fs.mkdirSync(path.join(P4, 'apps/mobile/design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/account.figcraft.json'), path.join(P4, 'apps/mobile/design/account.figcraft.json'));
fs.mkdirSync(path.join(P4, 'apps/web/design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/ridgeline-onboarding.figcraft'), path.join(P4, 'apps/web/design/onboarding.figcraft'));
const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService(); const s = listen({ port: 47994, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47994, token: 't' } });
const b = await chromium.launch(); const errs = [];
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const open = async (dir, w, h, theme = 'light') => {
  const p = await b.newPage({ viewport: { width: w + 20, height: h + 20 }, deviceScaleFactor: 2 });
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/fonts\.g|Content Security/.test(m.text()) && errs.push(m.text()));
  await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(dir)}&w=${w}&h=${h}&surface=panel&theme=${theme}`);
  return { p, f: p.frameLocator('#f') };
};
let o = await open(P1, 460, 860);
await o.f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 }); await o.p.waitForTimeout(800);
await o.p.screenshot({ path: `${OUT}/n-design.png` });
const t = await o.f.locator('#edScreen [data-node]').filter({ hasText: /^Where/ }).last().boundingBox();
await o.p.keyboard.down('Control'); await o.p.mouse.click(t.x + 4, t.y + 4); await o.p.keyboard.up('Control'); await o.p.waitForTimeout(700);
await o.p.screenshot({ path: `${OUT}/n-design-selected.png` });
const fr = () => o.p.frames().find(x => x.url().includes('guest-files'));
const geo = await fr().evaluate(() => {
  const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.width, height: b.height }; };
  return { canvas: r('#edCanvas'), tools: r('.ed-tools'), stage: r('.stage'), rail: r('.rail'), bar: getComputedStyle(document.querySelector('.phonebar')).display, vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth, cls: document.body.className };
});
ok('narrow: no phone layout (the section rail, no tab bar)', geo.bar === 'none' && geo.rail.width > 0 && geo.rail.right >= geo.vw - 1, JSON.stringify(geo.rail));
ok('narrow: toolbar above the canvas', geo.tools.bottom <= geo.canvas.top + 1, JSON.stringify([geo.tools.bottom, geo.canvas.top]));
ok('narrow: the canvas takes the view (side panes are drawers)', /ed-tight/.test(geo.cls) && geo.canvas.width >= geo.stage.width - 4 && geo.canvas.height > 500, JSON.stringify([geo.canvas, geo.stage]));
ok('narrow: no sideways scroll', geo.sw <= geo.vw + 1, `${geo.sw} > ${geo.vw}`);
await o.f.locator('.ed-tools .pane-toggle[data-panel="edr"]').click(); await o.p.waitForTimeout(400);
const ins = await fr().evaluate(() => { const i = document.querySelector('#edInspector').getBoundingClientRect(), c = document.querySelector('#edCanvas').getBoundingClientRect(); return { pos: getComputedStyle(document.querySelector('#edInspector')).position, left: i.left, right: i.right, cr: c.right, text: !!document.querySelector('#edInspector textarea[data-k="text"]') }; });
ok('narrow: » opens the inspector as a drawer over the canvas, with the selected layer', ins.pos === 'absolute' && ins.right <= ins.cr + 1 && ins.text, JSON.stringify(ins));
await o.p.screenshot({ path: `${OUT}/n-design-inspector.png` });
await o.f.locator('.ed-tools .pane-toggle[data-panel="edl"]').click(); await o.p.waitForTimeout(400);
ok('narrow: one editor drawer at a time', await fr().evaluate(() => document.body.classList.contains('dr-edl') && !document.body.classList.contains('dr-edr')));
await o.p.keyboard.press('Escape'); await o.p.waitForTimeout(300);
ok('narrow: Escape closes it', await fr().evaluate(() => !document.body.classList.contains('dr-edl')));
// every section at several widths: fits, head line inside, nothing past the rail
await o.p.close();
for (const [w, h] of [[340, 700], [460, 860], [620, 800], [820, 800], [1024, 768]]) {
  o = await open(P1, w, h);
  await o.f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 }); await o.p.waitForTimeout(600);
  for (const sec of ['design', 'proto', 'functions', 'logic', 'data', 'api', 'architecture', 'links', 'manifest']) {
    await o.f.locator(`.rail .tab[data-tab="${sec}"]`).click(); await o.p.waitForTimeout(350);
    const g = await fr().evaluate(() => {
      const vw = document.documentElement.clientWidth, rail = document.querySelector('.rail').getBoundingClientRect().left;
      const head = document.querySelector('.stage-head'), hb = head.getBoundingClientRect();
      const outHead = [...head.children].filter(c => c.getBoundingClientRect().width && (c.getBoundingClientRect().right > hb.right + 1 || c.getBoundingClientRect().left < hb.left - 1)).map(c => c.className);
      const stage = document.querySelector('.stage').getBoundingClientRect();
      return { sw: document.documentElement.scrollWidth, vw, stageRight: stage.right, rail, outHead, stageW: stage.width };
    });
    ok(`${w}px ${sec}: fits beside the rail, head line inside`, g.sw <= g.vw + 1 && g.stageRight <= g.rail + 1 && !g.outHead.length && g.stageW > 200, JSON.stringify(g));
  }
  if (w === 340 || w === 820) { await o.f.locator('.rail .tab[data-tab="architecture"]').click(); await o.p.waitForTimeout(400); await o.p.screenshot({ path: `${OUT}/n-${w}-architecture.png` }); }
  await o.p.close();
}
o = await open(P1, 460, 860);
await o.f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 }); await o.p.waitForTimeout(600);
await o.f.locator('.rail .tab[data-tab="proto"]').click(); await o.p.waitForTimeout(500);
await o.f.locator('.stage-head .pane-toggle[data-panel="left"]').click(); await o.p.waitForTimeout(400);
ok('narrow: « opens the spec list over the view', await fr().evaluate(() => document.body.classList.contains('dr-left') && getComputedStyle(document.querySelector('.builder')).position === 'absolute'));
await o.p.screenshot({ path: `${OUT}/n-specs.png` });
await o.f.locator('#groups button.job').nth(5).click(); await o.p.waitForTimeout(800);
ok('narrow: picking a spec swaps the list for the spec', await fr().evaluate(() => !document.body.classList.contains('dr-left') && document.body.classList.contains('dr-right') && /\w/.test(document.querySelector('#doc').innerText)));
await o.p.screenshot({ path: `${OUT}/n-read.png` });
await o.f.locator('.reader .drawer-close').click(); await o.p.waitForTimeout(300);
ok('narrow: × closes the spec', await fr().evaluate(() => !document.body.classList.contains('dr-right')));
await o.p.close();
// a monorepo whose design lives in a subfolder
o = await open(P4, 460, 860);
await o.f.locator('.ed-open').first().waitFor({ timeout: 30000 });
await o.p.waitForTimeout(400);
await o.p.screenshot({ path: `${OUT}/n-found.png` });
ok('several designs: the user picks', /apps\/mobile\/design\/account\.figcraft\.json/.test(await o.f.locator('.ed-found').innerText()) && /apps\/web\/design\/onboarding\.figcraft/.test(await o.f.locator('.ed-found').innerText()));
await o.f.locator('.ed-open', { hasText: 'apps/mobile/design/account.figcraft.json' }).click();
ok('open in place: editor shows its screens', !!await (async () => { for (let i = 0; i < 60; i++) { if (await o.f.locator('#edScreen [data-node]').count() > 3) return true; await o.p.waitForTimeout(250); } return false; })());
ok('choice remembered for the project', JSON.parse(fs.readFileSync(path.join(P4, '.weshcraft.json'), 'utf8')).file === 'apps/mobile/design/account.figcraft.json');
ok('edited in place (no copy)', !fs.existsSync(path.join(P4, 'design')));
await o.p.screenshot({ path: `${OUT}/n-opened.png` });
await o.p.close();
o = await open(P1, 460, 860, 'dark');
await o.f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 }); await o.p.waitForTimeout(800);
await o.p.screenshot({ path: `${OUT}/n-design-dark.png` });
await o.p.close();
ok('no errors', errs.length === 0, errs.slice(0, 3).join(' | '));
console.log(R.join('\n'));
await b.close(); service.stop(); s.close(); host.close(); setTimeout(() => process.exit(0), 300);
