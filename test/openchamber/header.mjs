// Navigation in the rail panel: no header line, the section rail on the right, « » folding each
// side panels (one choice for every section, remembered), dividers, parity and ⋯ on the section line, and
// the spec folders, at the widths an expanded rail panel takes.
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
const cfg = () => { try { return JSON.parse(fs.readFileSync(path.join(WORK, '.weshcraft.json'), 'utf8')).specTree ?? null; } catch { return null; } };
try {
  for (const [w, theme] of [[1280, 'light'], [960, 'dark']]) {
    const p = await b.newPage({ viewport: { width: w + 20, height: 820 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(WORK)}&w=${w}&h=800&surface=panel&theme=${theme}`);
    const f = p.frameLocator('#f');
    await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 });
    for (let i = 0; i < 60 && !/In sync/.test(await f.locator('#parity').innerText()); i++) await sleep(300);
    let fr = p.frames().find(x => x.url().includes('guest-files'));
    // start from the defaults (the previous width's choices are kept in the extension storage)
    await sleep(500); await fr.evaluate(() => { localStorage.clear(); window.dispatchEvent(new StorageEvent('storage', { key: null })); }); await sleep(300);
    const geo = () => fr.evaluate(() => {
      const r = el => el ? (({ top, bottom, left, right, width, height }) => ({ top, bottom, left, right, width, height }))(el.getBoundingClientRect()) : null;
      const vis = s => { const el = document.querySelector(s); return !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0; };
      return {
        top: vis('.top'), rail: r(document.querySelector('.rail')), vw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth,
        reader: vis('.reader'), builder: vis('.builder'), edl: vis('.tabpanel.ed > .ed-left'), edr: vis('.tabpanel.ed > .ed-right'),
        canvas: r(document.querySelector('#edCanvas')), stage: r(document.querySelector('.stage')), layout: r(document.querySelector('.layout')),
        section: document.body.dataset.section, title: document.querySelector('#sectionTitle')?.textContent,
      };
    });
    const pane = k => f.locator(`.pane-toggle[data-panel="${k}"]:visible`).first();
    let g = await geo();
    ok(`${w}: no header line, the rail on the right edge`, !g.top && g.rail && g.vw - g.rail.right < 2 && g.rail.width <= 64 && g.rail.height > 700, JSON.stringify(g.rail));
    ok(`${w}: blocks stop at the rail, no sideways scroll`, g.layout.right <= g.rail.left + 1 && g.sw <= g.vw + 1, JSON.stringify([g.layout.right, g.rail.left, g.sw, g.vw]));
    const labels = await f.locator('.rail .tab:visible span:not(.badge)').allInnerTexts();
    ok(`${w}: one square icon per section`, ['Functions', 'Logic', 'Data', 'API & MCP', 'Architecture', 'Design', 'Prototype', 'Front ⇄ back', 'Manifest'].every(x => labels.includes(x)) && await f.locator('.rail .tab:visible svg').count() === labels.length, labels.join('|'));
    const tools = await fr.evaluate(() => { const r = s => document.querySelector(s).getBoundingClientRect(); const head = document.querySelector('.stage-head'); return { inHead: head.contains(document.querySelector('#parity')) && head.contains(document.querySelector('#more')), parity: r('#parity').right, more: [r('#more').left, r('#more').right], toggle: r('.stage-head .pane-toggle.right').left, head: r('.stage-head').right }; });
    ok(`${w}: parity and ⋯ at the end of the section line, before »`, tools.inHead && tools.more[0] - tools.parity < 16 && tools.toggle - tools.more[1] < 12, JSON.stringify(tools));
    ok(`${w}: everything shown at first`, g.section === 'design' && g.builder && g.reader && g.edl && g.edr, JSON.stringify(g));
    await pane('left').click(); await sleep(400);
    g = await geo();
    ok(`${w}: « folds the spec list`, !g.builder && g.reader, JSON.stringify(g));
    ok(`${w}: canvas keeps room`, g.canvas.width > 280, String(g.canvas.width));
    ok(`${w}: no Design/Spec switch in the inspector`, !(await f.locator('.ed-itabs').isVisible().catch(() => false)));
    await f.locator('#edScreens li[data-id]').nth(1).click(); await sleep(1200);
    ok(`${w}: spec follows the screen being edited`, /Interests/.test(await f.locator('#specTitle').innerText()) || /Interests/.test((await f.locator('#doc').innerText()).slice(0, 200)), await f.locator('#specTitle').innerText());
    await f.locator('#edScreens li[data-id]').nth(0).click(); await sleep(1000);
    // « » in the editor: screens/layers and the inspector
    await pane('edl').click(); await sleep(300);
    g = await geo(); const c0 = g.canvas.width;
    ok(`${w}: « folds screens and layers`, !g.edl && g.edr);
    await pane('edr').click(); await sleep(300);
    g = await geo();
    ok(`${w}: » folds the inspector, the canvas grows`, !g.edl && !g.edr && g.canvas.width > c0, `${Math.round(c0)} → ${Math.round(g.canvas.width)}`);
    await pane('edl').click(); await pane('edr').click(); await sleep(300);
    // dividers: drag the spec, the inspector and the screens list wider
    const drag = async (name, dx) => {
      const h = f.locator(`.oc-split[data-split="${name}"]`);
      if (!(await h.isVisible())) return null;
      const box = await h.boundingBox(); const y = box.y + box.height / 2, x = box.x + box.width / 2;
      await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + dx / 2, y, { steps: 3 }); await p.mouse.move(x + dx, y, { steps: 3 }); await p.mouse.up(); await sleep(250);
      return true;
    };
    const width = sel => fr.evaluate(s => document.querySelector(s).getBoundingClientRect().width, sel);
    for (const [name, sel, dx] of [['spec', '.reader', -60], ['edr', '.ed-right', -30], ['edl', '.ed-left', 30]]) {
      const w0 = await width(sel); const did = await drag(name, dx); const w1 = await width(sel);
      const cw = await width('.ed-center');
      ok(`${w}: divider resizes ${sel} (or stops at the canvas minimum)`, did && (Math.abs((w1 - w0) - Math.abs(dx)) <= 3 || (w1 >= w0 && cw <= 224)), `${did} ${Math.round(w0)} → ${Math.round(w1)}, center ${Math.round(cw)}`);
    }
    ok(`${w}: canvas still has room`, (await width('#edCanvas')) >= 200, String(await width('#edCanvas')));
    await f.locator('.oc-split[data-split="spec"]').dblclick(); await sleep(250);
    await p.screenshot({ path: `${OUT}/h-${w}-design.png` });
    await pane('right').click(); await sleep(400);
    g = await geo();
    ok(`${w}: » hides the spec, its divider goes`, !g.reader && !(await f.locator('.oc-split[data-split="spec"]').isVisible()));
    await pane('left').click(); await sleep(400);
    g = await geo();
    ok(`${w}: design: « shows the spec list`, g.builder && !g.reader && g.canvas.width >= 150, String(g.canvas.width));
    await p.screenshot({ path: `${OUT}/h-${w}-design-list.png` });
    // the prototype keeps its own choices
    await f.locator('.rail .tab[data-tab="proto"]').click(); await sleep(600);
    g = await geo();
    { await f.locator('.rail .tab[data-tab="architecture"]').click(); await sleep(600);
      if (await fr.evaluate(() => !document.body.classList.contains('no-right'))) { await pane('right').click(); await sleep(400); } // a short section alone (as in a tall panel)
      const h = await fr.evaluate(() => ({ vh: innerHeight, layout: document.querySelector('.layout').getBoundingClientRect().bottom, log: document.querySelector('.log').getBoundingClientRect().bottom }));
      ok(`${w}: a short section still fills the height, log line at the bottom`, h.log >= h.vh - 2 && h.layout >= h.vh - 40, JSON.stringify(h));
      await f.locator('.rail .tab[data-tab="proto"]').click(); await sleep(600); }
    ok(`${w}: rail switches section, title follows`, g.section === 'proto' && g.title === 'Prototype' && await f.locator('.tabpanel[data-panel="proto"]').isVisible(), JSON.stringify([g.section, g.title]));
    ok(`${w}: switching section keeps what is folded and shown`, g.builder && !g.reader && g.stage.width > 250, JSON.stringify(g));
    { const w0 = await width('.builder'); await drag('list', 40); const w1 = await width('.builder'); ok(`${w}: divider resizes the spec list`, Math.abs(w1 - w0 - 40) <= 3, `${Math.round(w0)} → ${Math.round(w1)}`); }
    await f.locator('.oc-split[data-split="list"]').dblclick(); await sleep(250);
    await f.locator('#groups button.job >> nth=0').click(); await sleep(800);
    g = await geo();
    ok(`${w}: picking a spec shows the spec panel`, g.reader && /\w/.test(await f.locator('#doc').innerText()));
    // spec folders
    if (w === 1280) {
      ok(`${w}: specs in default folders`, (await f.locator('#groups > .tfolder > .trow.head .t-name').allInnerTexts()).join('|').startsWith('Product|Front end'));
      await f.locator('#addFolder').click(); await sleep(400);
      await f.locator('#groups .t-rename').fill('Onboarding'); await p.keyboard.press('Enter'); await sleep(800);
      ok(`${w}: new folder saved to .weshcraft.json`, cfg()?.folders?.some(x => x.name === 'Onboarding'), JSON.stringify(cfg()));
      const item = f.locator('#groups .trow.item').filter({ hasText: /^Screen/ }).first();
      const id = await item.getAttribute('data-id');
      await item.hover(); await item.locator('.t-more').click(); await sleep(300);
      ok(`${w}: Move to… menu lists the folders`, (await f.locator('.t-menu button').allInnerTexts()).some(t => /Onboarding/.test(t)));
      await f.locator('.t-menu button', { hasText: 'Onboarding' }).click(); await sleep(800);
      ok(`${w}: spec moved into the folder`, cfg()?.folders?.find(x => x.name === 'Onboarding')?.items?.includes(id), JSON.stringify(cfg()?.folders?.find(x => x.name === 'Onboarding')));
      const src = f.locator('#groups .trow.item', { hasText: 'Design tokens' });
      await src.dragTo(f.locator('#groups > .tfolder > .trow.head', { hasText: 'Onboarding' })); await sleep(800);
      ok(`${w}: drag a spec into a folder`, cfg()?.folders?.find(x => x.name === 'Onboarding')?.items?.includes('front:tokens'), JSON.stringify(cfg()?.folders?.find(x => x.name === 'Onboarding')));
      await p.screenshot({ path: `${OUT}/h-${w}-folders.png` });
      const head = f.locator('#groups > .tfolder > .trow.head', { hasText: 'Onboarding' });
      await head.hover(); await head.locator('[data-del]').click(); await sleep(800);
      ok(`${w}: removing the folder moves its specs up`, !cfg()?.folders?.some(x => x.name === 'Onboarding') && cfg()?.items?.includes('front:tokens'), JSON.stringify(cfg()));
    }
    await f.locator('#more').click(); await sleep(400);
    const menu = await fr.evaluate(() => { const d = document.querySelector('#moreDlg'); const r = d.getBoundingClientRect(); const m = document.querySelector('#more').getBoundingClientRect(); return { open: d.open, top: r.top, bottom: m.bottom, right: Math.round(document.documentElement.clientWidth - r.right), mr: Math.round(document.documentElement.clientWidth - m.right) }; });
    ok(`${w}: actions menu drops under ⋯`, menu.open && menu.top >= menu.bottom && menu.top < menu.bottom + 16 && Math.abs(menu.right - menu.mr) < 3, JSON.stringify(menu));
    await p.screenshot({ path: `${OUT}/h-${w}-menu.png` });
    await p.keyboard.press('Escape'); await sleep(200);
    // the choice is remembered, and is the same in every section
    await pane('left').click(); await sleep(300);
    await p.reload(); await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 }); await sleep(800); fr = p.frames().find(x => x.url().includes('guest-files'));
    g = await geo();
    ok(`${w}: folded list remembered, in the next section too`, g.section === 'design' && !g.builder && g.reader, JSON.stringify(g));
    await p.close();
  }
} catch (e) { R.push(`CRASH ${e.stack}`); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(R.join('\n'));
await b.close(); await host.close?.(); s.close?.(); service.stop?.();
process.exit(0);
