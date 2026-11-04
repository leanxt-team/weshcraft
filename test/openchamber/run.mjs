// End-to-end test of the OpenChamber extension against the stand-in host (host.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { startHost, fakeGitHub } from './host.mjs';

const [ROOT, WORK, SHOTS] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
const R = [];
const ok = (n, c, i = '') => { R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitFor = async (fn, ms = 15000, step = 200) => { const t0 = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v) return v; if (Date.now() - t0 > ms) return null; await sleep(step); } };

// ---- projects and a fake home with an OpenChamber GitHub account ----
fs.rmSync(WORK, { recursive: true, force: true });
const proj = n => { const d = path.join(WORK, n); fs.mkdirSync(path.join(d, 'design'), { recursive: true }); return d; };
const P1 = proj('repo'), P2 = proj('gh'), P3 = path.join(WORK, 'empty');
fs.mkdirSync(P3, { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/ridgeline-app.figcraft'), path.join(P1, 'design/ridgeline-app.figcraft'));
fs.copyFileSync(path.join(ROOT, 'test/fixtures/account.figcraft.json'), path.join(P2, 'design/account.figcraft.json'));
execSync('git init -q && git config user.email t@example.com && git config user.name Tester && echo "# app" > README.md && git add -A && git commit -qm init', { cwd: P1, shell: '/bin/sh' });
const gh = await fakeGitHub();
const HOME = path.join(WORK, 'home');
fs.mkdirSync(path.join(HOME, '.config/openchamber'), { recursive: true });
fs.writeFileSync(path.join(HOME, '.config/openchamber/source-control-auth.json'), JSON.stringify({ version: 3, providers: { gitlab: { instances: {} }, github: { instances: { [gh.host]: { activeCredentialId: 'e1', cliDisabled: false, cliActive: false, credentials: [{ credentialId: 'e1', accessToken: 'oc-secret-token', user: { id: 3, login: 'vcroise' } }] } } } } }));
// The service gets only PATH, HOME, temp and locale from OpenChamber: do the same.
for (const k of Object.keys(process.env)) if (!['PATH', 'TMPDIR', 'LANG', 'LC_ALL'].includes(k)) delete process.env[k];
process.env.HOME = HOME;

const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService();
const svcServer = listen({ port: 47990, token: 'svc-token', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47990, token: 'svc-token' } });
const svc = async (p, q, body) => { const r = await fetch(`http://127.0.0.1:47990${p}?${new URLSearchParams(q)}`, { method: body ? 'POST' : 'GET', headers: { authorization: 'Bearer svc-token' }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, json: await r.json().catch(() => null) }; };

const browser = await chromium.launch();
const errs = [];
const open = async (entry, dir, { theme = 'light', w = 340, h = 760, surface = 'panel', mode = 'ok' } = {}) => {
  const p = await browser.newPage({ viewport: { width: Number(w) + 20, height: Number(h) + 20 } });
  p.on('console', m => { if (m.type() === 'error' && !/fonts\.g|ERR_BLOCKED|Content Security Policy.*fonts/.test(m.text())) errs.push(`${entry} ${m.text()}`); });
  p.on('pageerror', e => errs.push(`${entry} ${e.message}`));
  await p.goto(`${host.url}/host?${new URLSearchParams({ entry, dir: dir ?? '', theme, w, h, surface, mode })}`);
  return { p, f: p.frameLocator('#f'), frame: () => p.frames().find(x => x.url().includes('guest-files')) };
};
const text = async o => (await o.frame()?.evaluate(() => document.body.innerText).catch(() => '')) ?? '';
const calls = async (o, type) => (await o.p.evaluate(() => window.__calls)).filter(c => !type || c.type === type);

try {
  // ===== A. Work Status: everything about sync, local git =====
  const ST = 'openchamber/status/index.html';
  const stOpts = (o = {}) => ({ w: 340, h: 320, surface: 'status', ...o });
  let o = await open(ST, P1, stOpts());
  ok('status: "Not syncing" and the setup form', !!await waitFor(async () => /Not syncing/.test(await text(o)) && /Start syncing/.test(await text(o))), (await text(o)).slice(0, 80).replace(/\n/g, ' | '));
  ok('status: the section is sized to its content', !!await waitFor(async () => (await calls(o, 'resize')).some(c => (c.payload?.height ?? 0) > 120)), JSON.stringify((await calls(o, 'resize')).map(c => c.payload)));
  await o.p.screenshot({ path: `${SHOTS}/a-status-off-light.png` });
  await o.f.locator('.sp-seg label:has(input[value="git"])').click();
  ok('status: local git hides repository field', await o.f.locator('input[name="repo"]').isHidden());
  await o.f.locator('[data-go] button').click();
  ok('status: local git sync → Synced', !!await waitFor(async () => /Synced/.test(await text(o)), 30000), (await text(o)).slice(0, 160).replace(/\n/g, ' | '));
  const log1 = execSync('git log --oneline', { cwd: P1 }).toString();
  ok('status: commit created in the repository', /docs\(specs\)/.test(log1), log1.split('\n')[0]);
  ok('status: recent syncs listed', await o.f.locator('.st-hist li.ok').count() >= 1);
  ok('status: toast on success', (await calls(o, 'toast')).some(c => c.payload?.kind === 'success'));
  ok('status: no clipped lines (height follows content)', await o.frame().evaluate(() => document.getElementById('root').getBoundingClientRect().height < 320));
  await o.p.screenshot({ path: `${SHOTS}/a-status-git-light.png` });
  await o.p.close();
  o = await open(ST, P1, stOpts({ theme: 'dark' }));
  await waitFor(async () => /Synced/.test(await text(o)));
  await o.p.screenshot({ path: `${SHOTS}/a-status-git-dark.png` });
  await o.p.close();

  // ===== C. GitHub through the OpenChamber account =====
  const set = await svc('/sync', { directory: P2 }, { provider: 'github', repo: 'acme/app', branch: 'weshcraft/specs', apiUrl: gh.url, pr: true, auto: true });
  ok('github sync via service', set.status === 200 && set.json?.result?.url?.endsWith('/pull/7'), JSON.stringify(set.json).slice(0, 200));
  ok('github: token inherited from the OpenChamber account', [...gh.seen.auth].some(a => a.includes('oc-secret-token')), [...gh.seen.auth].join(','));
  o = await open(ST, P2, stOpts());
  ok('status: GitHub synced with PR link', !!await waitFor(async () => /Pull request #7/.test(await text(o))), (await text(o)).slice(0, 200).replace(/\n/g, ' | '));
  ok('status: says where access comes from', /your OpenChamber account \(vcroise\)/.test(await text(o)));
  await o.f.locator('.sp-link').click();
  await sleep(300);
  ok('status: PR link opens through the host', (await calls(o, 'open-url')).some(c => c.payload?.url === 'https://github.example/acme/app/pull/7'));
  await o.p.screenshot({ path: `${SHOTS}/c-status-github-light.png` });
  await o.f.locator('.st-btns button:has-text("Sync now")').click();
  await waitFor(async () => (await o.f.locator('.st-hist li').count()) >= 2, 20000);
  ok('status: Sync now adds a history entry', await o.f.locator('.st-hist li').count() >= 2);
  await o.p.close();
  o = await open(ST, P2, stOpts({ theme: 'dark' }));
  await waitFor(async () => /#7/.test(await text(o)));
  await o.p.screenshot({ path: `${SHOTS}/c-status-github-dark.png` });
  await o.p.close();

  // ===== D. failure =====
  await svc('/sync', { directory: P2 }, { provider: 'github', repo: 'acme/missing', apiUrl: gh.url, auto: true });
  o = await open(ST, P2, stOpts());
  ok('status: failed sync is shown with its reason', !!await waitFor(async () => /Sync failed/.test(await text(o)) && /404/.test(await text(o))), (await text(o)).slice(0, 220).replace(/\n/g, ' | '));
  await o.p.screenshot({ path: `${SHOTS}/d-status-failed-light.png` });
  await o.f.locator('.st-btns button:has-text("Stop")').click();
  ok('status: Stop returns to the setup form', !!await waitFor(async () => /Start syncing/.test(await text(o))));
  await o.p.close();
  // the rail panel (full interface) shows a badge when a sync fails
  await svc('/sync', { directory: P2 }, { provider: 'github', repo: 'acme/missing', apiUrl: gh.url, auto: true }).catch(() => {});
  o = await open('openchamber/page/index.html', P2, { w: 520, h: 820, surface: 'panel' });
  await waitFor(async () => /In sync|Out of sync/.test(await text(o)), 30000);
  await svc('/sync', { directory: P2 }, {}).catch(() => {});
  ok('rail panel: badge when the sync fails', !!await waitFor(async () => (await calls(o, 'badge')).some(c => (c.payload?.count ?? 0) >= 1), 10000), JSON.stringify(await calls(o, 'badge')).slice(0, 120));
  await svc('/sync', { directory: P2 }, { off: true });
  await o.p.close();

  // ===== R. rail panel = the full interface, narrow and wide =====
  o = await open('openchamber/page/index.html', P1, { w: 480, h: 860, surface: 'panel' });
  ok('rail (narrow): full interface, one view at a time', !!await waitFor(async () => (await o.f.locator('.phonebar').isVisible()) && /In sync/.test(await text(o)), 30000));
  ok('rail (narrow): Design view with the canvas', !!await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) > 10, 15000));
  await o.p.screenshot({ path: `${SHOTS}/r-rail-narrow-design.png` });
  for (const v of ['specs', 'proto', 'links', 'read', 'design']) {
    await o.f.locator(`.phonebar [data-view="${v}"]`).click(); await sleep(500);
    ok(`rail (narrow): ${v} view`, (await o.frame().evaluate(() => document.body.dataset.view)) === v);
    if (v === 'specs' || v === 'proto') await o.p.screenshot({ path: `${SHOTS}/r-rail-narrow-${v}.png` });
  }
  await o.f.locator('.more').click(); await sleep(300);
  ok('rail (narrow): actions sheet', await o.f.locator('#moreDlg').isVisible());
  await o.p.keyboard.press('Escape');
  await o.p.close();
  o = await open('openchamber/page/index.html', P1, { w: 1240, h: 820, surface: 'panel', theme: 'dark' });
  ok('rail (expanded): desktop layout', !!await waitFor(async () => (await o.f.locator('.phonebar').isHidden()) && (await o.f.locator('#edScreen [data-node]').count()) > 10, 30000));
  await o.p.screenshot({ path: `${SHOTS}/r-rail-wide-dark.png` });
  await o.p.close();

  // ===== E. big panel: full WeshCraft =====
  for (const theme of ['light', 'dark']) {
    o = await open('openchamber/page/index.html', P1, { w: 1440, h: 880, surface: 'page', theme });
    ok(`page (${theme}): app loads in the sandbox`, !!await waitFor(async () => /In sync/.test(await text(o)), 30000), (await text(o)).slice(0, 120).replace(/\n/g, ' | '));
    ok(`page (${theme}): Design tab default, screen rendered`, !!await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) > 10));
    await sleep(600);
    await o.p.screenshot({ path: `${SHOTS}/e-page-design-${theme}.png` });
    await o.p.close();
  }
  o = await open('openchamber/page/index.html', P1, { w: 1440, h: 880, surface: 'page' });
  await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) > 10, 30000);
  ok('page: OpenChamber theme applied', await o.frame().evaluate(() => getComputedStyle(document.body).backgroundColor === 'rgb(255, 255, 255)' && document.documentElement.classList.contains('oc') && getComputedStyle(document.querySelector('.top')).backdropFilter === 'none'));
  ok('page: desktop layout (no phone bar)', await o.f.locator('.phonebar').isHidden());
  // edit text through the inspector
  const title = await o.frame().evaluate(() => [...document.querySelectorAll('#edScreen [data-node]')].find(e => e.textContent === 'Where to today?')?.dataset.node);
  const tb = await o.f.locator(`#edScreen [data-node="${title}"]`).boundingBox();
  await o.p.keyboard.down('Control'); await o.p.mouse.click(tb.x + 5, tb.y + 5); await o.p.keyboard.up('Control');
  await waitFor(async () => (await o.f.locator('#edInspector textarea[data-k="text"]').count()) === 1);
  const logBefore = await o.f.locator('#log').innerText();
  await o.f.locator('#edInspector textarea[data-k="text"]').fill('Where next?');
  await o.f.locator('#edInspector textarea[data-k="text"]').blur();
  ok('page: edit saved to the project design', !!await waitFor(async () => { const { DesignStore } = await import(path.join(ROOT, 'src/design/store.mjs')); return Object.values(DesignStore.open(path.join(P1, 'design/ridgeline-app.figcraft')).doc.nodes).some(n => n.characters === 'Where next?'); }, 10000));
  ok('page: live events update the spec builder', !!await waitFor(async () => (await o.f.locator('#log').innerText()) !== logBefore && /Run \d+:|Synced to/.test(await o.f.locator("#log").innerText()), 15000), await o.f.locator('#log').innerText());
  // agent edit arrives live
  const info = (await svc('/info', { directory: P1 })).json;
  await fetch(`${info.base}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'design_text', arguments: { edits: [{ id: Number(title), text: 'Agent was here' }] } } }) });
  ok('page: an agent edit shows on the canvas (event stream)', !!await waitFor(async () => (await o.f.locator('#edScreen').innerText()).includes('Agent was here'), 15000));
  await o.p.keyboard.press('Control+z');
  ok('page: undo from the page', !!await waitFor(async () => !(await o.f.locator('#edScreen').innerText()).includes('Agent was here')));
  // prototype tab
  await o.f.locator('.tab[data-tab="proto"]').click();
  const proto = await waitFor(async () => { const fr = o.p.frames().find(x => x.parentFrame() === o.frame() && !x.url().includes('guest-files')); return fr && (await fr.locator('.sc-screen [data-node]').count()) > 10 ? fr : null; }, 15000);
  ok('page: prototype renders (srcdoc)', !!proto);
  if (proto) { await proto.locator('nav.sc-nav button').nth(1).click(); await sleep(400); ok('page: prototype navigation', (await proto.locator('.sc-screen:not([hidden])').getAttribute('data-screen')) !== 'scr-home-light'); }
  await o.f.locator('.job >> nth=0').click(); await sleep(800);
  ok('page: spec reader opens a spec', (await o.f.locator('#doc').innerText()).length > 200);
  await o.p.screenshot({ path: `${SHOTS}/e-page-proto-light.png` });
  // links & manifest
  await o.f.locator('.tab[data-tab="links"]').click(); await sleep(600);
  ok('page: front ⇄ back map', await o.f.locator('#linkmap [data-k]').count() > 5);
  // publish dialog: access hint
  await o.f.locator('#more').click(); await sleep(300); await o.f.locator('#moreDlg [data-act="publish"]').click(); await sleep(400);
  ok('page: publish dialog says where access comes from', /Access:|No GitHub access found/.test(await o.f.locator('#accessHint').innerText()), await o.f.locator('#accessHint').innerText());
  await o.p.screenshot({ path: `${SHOTS}/e-page-publish-light.png` });
  await o.p.keyboard.press('Escape');
  // zip and "open prototype in new tab" leave through the host
  await o.f.locator('#more').click(); await sleep(300); await o.f.locator('#moreDlg [data-act="zip"]').click(); await sleep(500);
  ok('page: zip download opens via host', (await calls(o, 'open-url')).some(c => /\/api\/download\.zip$/.test(c.payload?.url)), JSON.stringify((await calls(o, 'open-url')).map(c => c.payload?.url)));
  // upload a 300 KB .figcraft (chunked)
  await o.f.locator('#upload').setInputFiles(path.join(ROOT, 'test/fixtures/ridgeline-onboarding.figcraft'));
  ok('page: chunked upload switches the design', !!await waitFor(async () => /onboarding/.test(await o.f.locator('#source').innerText()), 30000), await o.f.locator('#source').innerText());
  ok('page: uploaded screens in the editor', !!await waitFor(async () => /Welcome/.test(await o.f.locator('#edScreens').innerText().catch(() => '')) || (await o.f.locator('.tab[data-tab="design"]').click().then(() => sleep(1500)).then(() => /Welcome/.test('')) ), 20000) || /Welcome/.test(await o.f.locator('#edScreens').innerText()));
  // delete-screen confirmation (sandbox has no window.confirm)
  await o.f.locator('.tab[data-tab="design"]').click(); await sleep(1200);
  const before = await o.f.locator('#edScreens li').count();
  await o.f.locator('#edScreens li').last().hover();
  await o.f.locator('#edScreens li').last().locator('[data-act="del"]').click();
  ok('page: delete asks in a dialog', await o.f.locator('dialog.ed-confirm').isVisible());
  await o.f.locator('dialog.ed-confirm button[value="ok"]').click();
  ok('page: screen deleted after confirming', !!await waitFor(async () => (await o.f.locator('#edScreens li').count()) === before - 1));
  await o.p.close();

  // ===== F. empty project: start a design from the page =====
  o = await open('openchamber/status/index.html', P3, { w: 340, h: 200, surface: 'status' });
  ok('status (empty project): No design', !!await waitFor(async () => /No design/.test(await text(o))));
  await o.p.close();
  o = await open('openchamber/page/index.html', P3, { w: 1440, h: 880, surface: 'page' });
  ok('page (empty project): Start a design', !!await waitFor(async () => /Start a design/.test(await text(o)), 30000));
  await o.p.screenshot({ path: `${SHOTS}/f-page-empty-light.png` });
  await o.f.locator('#edEmpty .ed-preset').first().click();
  ok('page (empty project): design created and shown', !!await waitFor(async () => (await o.f.locator('#edScreen [data-node]').count()) >= 1 && fs.existsSync(path.join(P3, 'design/App.figcraft')), 20000));
  await o.p.close();

  // ===== G. no host / no service =====
  o = await open('openchamber/page/index.html', P1, { w: 1000, h: 600, surface: 'page', mode: 'noready' });
  ok('page without OpenChamber says so', !!await waitFor(async () => /has not connected this page/.test(await text(o)), 8000));
  await o.p.close();
  o = await open('openchamber/status/index.html', P1, { mode: 'noready' });
  ok('status section without OpenChamber says so', !!await waitFor(async () => /has not connected this panel/.test(await text(o)), 8000));
  await o.p.close();
  o = await open('openchamber/page/index.html', P1, { w: 1000, h: 600, surface: 'page', mode: 'noservice' });
  ok('page without the service explains how to allow it', !!await waitFor(async () => /Allow the WeshCraft service/.test(await text(o)), 8000));
  await o.p.screenshot({ path: `${SHOTS}/g-page-noservice.png` });
  await o.p.close();
  o = await open('openchamber/status/index.html', P1, { mode: 'noservice' });
  ok('status section without the service explains how to allow it', !!await waitFor(async () => /Allow the WeshCraft service/.test(await text(o)), 8000));
  await o.p.close();

  ok('every guest message valid for OpenChamber', host.log.filter(x => x.invalid).length === 0, JSON.stringify(host.log.filter(x => x.invalid)).slice(0, 300));
  ok('no console errors', errs.length === 0, errs.slice(0, 4).join(' | '));
} catch (e) {
  R.push(`CRASH ${e.stack}`);
} finally {
  console.log(R.join('\n'));
  await browser.close();
  service.stop(); svcServer.close(); host.close(); gh.close();
  setTimeout(() => process.exit(0), 500);
}
