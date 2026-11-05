// Logic, Data, API & MCP and Architecture inside OpenChamber: drawn, edited through the sandbox
// dialogs (stored in the design, one undo step each), specs following, narrow layout.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { startHost } from './host.mjs';
const [ROOT, WORK, OUT = WORK] = process.argv.slice(2);
const { chromium } = createRequire(import.meta.url)('playwright');
fs.rmSync(WORK, { recursive: true, force: true }); fs.mkdirSync(path.join(WORK, 'design'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'test/fixtures/account.figcraft.json'), path.join(WORK, 'design/App.figcraft.json'));
const { createService, listen } = await import(path.join(ROOT, 'openchamber/service/main.js'));
const service = createService(); const s = listen({ port: 47999, token: 't', service });
const host = await startHost({ root: ROOT, sdkDir: path.join(ROOT, 'node_modules/@openchamber/sdk'), service: { port: 47999, token: 't' } });
const b = await chromium.launch(); const errs = [];
const R = []; const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i ? ` — ${i}` : ''}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const stored = key => { const d = JSON.parse(fs.readFileSync(path.join(WORK, 'design/App.figcraft.json'), 'utf8')); return JSON.parse(d.nodes[String(d.pages[0])].pluginData?.weshcraft || '{}')[key] ?? null; };
const until = async (fn, ms = 8000) => { for (let i = 0; i < ms / 200; i++) { try { if (await fn()) return true; } catch { /* not yet */ } await sleep(200); } return false; };
const spec = f => fs.readFileSync(path.join(WORK, 'specs', f), 'utf8');
try {
  const open = async (w, h, theme) => {
    const p = await b.newPage({ viewport: { width: w + 20, height: h + 20 } });
    p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${host.url}/host?entry=openchamber/page/index.html&dir=${encodeURIComponent(WORK)}&w=${w}&h=${h}&surface=panel&theme=${theme}`);
    const f = p.frameLocator('#f');
    await f.locator('#edScreen [data-node]').first().waitFor({ timeout: 30000 });
    for (let i = 0; i < 60 && !/In sync/.test(await f.locator('#parity').innerText()); i++) await sleep(300);
    return { p, f, fr: () => p.frames().find(x => x.url().includes('guest-files')) };
  };
  let { p, f, fr } = await open(1280, 860, 'light');
  ok('tabs: Functions · Logic · Data · API & MCP · Architecture', (await f.locator('.rail .tab').allInnerTexts()).slice(0, 5).join('|') === 'Functions|Logic|Data|API & MCP|Architecture', (await f.locator('.rail .tab').allInnerTexts()).join('|'));
  ok('specs: the product group lists the five', (await f.locator('.job').allTextContents()).filter(t => /^(Functions|Logic|Data|API & MCP|Architecture)/.test(t.trim())).length === 5);

  // ---- Logic
  await f.locator('.rail .tab[data-tab="logic"]').click(); await sleep(600);
  ok('logic: inferred rule shown', /POST \/users submits/.test(await f.locator('#logicview').innerText()));
  await f.locator('#lgKeep').click();
  ok('logic: kept into the design', await until(() => stored('logic')?.rules?.length >= 1), JSON.stringify(stored('logic')));
  await sleep(1200);
  await f.locator('#lgAddRule').click(); await sleep(300);
  await f.locator('.av-dialog input[name="name"]').fill('Only the owner can edit a profile');
  await f.locator('.av-dialog select[name="kind"]').selectOption('permission');
  await f.locator('.av-dialog textarea[name="text"]').fill('The signed-in user, and nobody else, can change their own profile.');
  await f.locator('.av-dialog input[name="applies"][value="Profile"]').check();
  await f.locator('.av-dialog button[type="submit"]').click();
  ok('logic: rule added', await until(() => stored('logic')?.rules?.some(r => r.kind === 'permission' && r.applies?.includes('Profile'))), JSON.stringify(stored('logic')));
  await sleep(1500);
  await f.locator('#lgAddMachine').click(); await sleep(300);
  await f.locator('.av-dialog input[name="entity"]').fill('User');
  await f.locator('.av-dialog input[name="states"]').fill('invited, active, suspended');
  await f.locator('.av-dialog [data-add-row="tr"]').click();
  await f.locator('.av-dialog .av-row input[name="from"]').last().fill('invited');
  await f.locator('.av-dialog .av-row input[name="to"]').last().fill('active');
  await f.locator('.av-dialog .av-row input[name="via"]').last().fill('POST /users');
  await f.locator('.av-dialog [data-add-row="tr"]').click();
  await f.locator('.av-dialog .av-row input[name="from"]').last().fill('active');
  await f.locator('.av-dialog .av-row input[name="to"]').last().fill('nowhere');
  await f.locator('.av-dialog button[type="submit"]').click(); await sleep(300);
  ok('logic: an unknown state is refused in the dialog', /use the states above/.test(await f.locator('.av-dialog .fn-err').innerText()));
  await f.locator('.av-dialog .av-row input[name="to"]').last().fill('suspended');
  await f.locator('.av-dialog .av-row input[name="via"]').last().fill('admin suspends the account');
  await f.locator('.av-dialog button[type="submit"]').click();
  ok('logic: lifecycle stored', await until(() => stored('logic')?.states?.[0]?.transitions?.length === 2), JSON.stringify(stored('logic')?.states));
  ok('logic: lifecycle drawn with arcs', await until(async () => (await f.locator('#logicview .lg-arcs path.arc').count()) >= 3));
  await p.screenshot({ path: `${OUT}/x-logic.png` });
  ok('logic: LOGIC.md follows', await until(() => /### User\.status[\s\S]*invited[\s\S]*Only the owner can edit a profile/.test(spec('LOGIC.md'))));

  // ---- Data
  await f.locator('.rail .tab[data-tab="data"]').click(); await sleep(600);
  ok('data: one card per entity', await f.locator('#dataview .dt-card').count() === 2);
  await f.locator('#dataview .dt-card[data-e="User"]').click(); await sleep(400);
  ok('data: detail says who writes it', /Written by[\s\S]*Sign up/.test(await f.locator('#dtDetail').innerText()), await f.locator('#dtDetail').innerText());
  ok('data: lifecycle on the card', /invited → active → suspended/.test(await f.locator('#dataview .dt-card[data-e="User"]').innerText()));
  await p.screenshot({ path: `${OUT}/x-data.png` });

  // ---- API
  await f.locator('.rail .tab[data-tab="api"]').click(); await sleep(600);
  ok('api: one row per operation', await f.locator('#apiview .api-row').count() === 3);
  await f.locator('#apiFilter').fill('users/me'); await sleep(300);
  ok('api: filter', await f.locator('#apiview .api-row').count() === 2);
  await f.locator('#apiFilter').fill(''); await sleep(200);
  await f.locator('#apiview .api-row').first().click(); await sleep(600);
  ok('api: a row opens its operation spec', /API/.test(await f.locator('#specTitle').innerText()), await f.locator('#specTitle').innerText());
  await p.screenshot({ path: `${OUT}/x-api.png` });

  // ---- Architecture
  await f.locator('.rail .tab[data-tab="architecture"]').click(); await sleep(700);
  ok('architecture: suggested layers', (await f.locator('#archview .ar-card .av-title').allInnerTexts()).join('|') === 'People|Front end|Back end|Database', (await f.locator('#archview .ar-card .av-title').allInnerTexts()).join('|'));
  ok('architecture: wires drawn', await f.locator('#archview .ar-wires path.w').count() === 3);
  await f.locator('#arKeep').click();
  ok('architecture: kept', await until(() => stored('architecture')?.components?.length === 4));
  await sleep(1500);
  await f.locator('#archview .ar-card[data-c="arc-back-end"]').hover();
  await f.locator('#archview [data-edit-c="arc-back-end"]').click(); await sleep(300);
  await f.locator('.av-dialog input[name="tech"]').fill('Node 22 · Fastify');
  await f.locator('.av-dialog input[name="code"]').fill('server');
  await f.locator('.av-dialog button[type="submit"]').click();
  ok('architecture: component edited', await until(() => stored('architecture')?.components?.find(c => c.name === 'Back end')?.tech === 'Node 22 · Fastify'));
  await sleep(1500);
  await f.locator('#arAdd').click(); await sleep(300);
  await f.locator('.av-dialog input[name="name"]').fill('Email service');
  await f.locator('.av-dialog select[name="kind"]').selectOption('external');
  await f.locator('.av-dialog [data-tc-q]').fill('postm');
  await f.locator('.av-dialog .tc-item[data-tc-id="postmark"]').click();
  ok('architecture: the picker writes the technology', (await f.locator('.av-dialog input[name="tech"]').inputValue()) === 'Postmark' && await f.locator('.av-dialog [data-tc-chosen] .tc-chip').count() === 1);
  await f.locator('.av-dialog [data-tc-q]').fill(''); await f.locator('.av-dialog [data-tc-cat]').selectOption('aws');
  ok('architecture: hyperscaler services in the picker', await f.locator('.av-dialog .tc-item').count() >= 25 && await f.locator('.av-dialog .tc-item[data-tc-id="aws-ses"] svg.ti-aws').count() === 1);
  await f.locator('.av-dialog button[type="submit"]').click();
  await until(() => stored('architecture')?.components?.length === 5); await sleep(1500);
  await f.locator('#arLink').click(); await sleep(300);
  await f.locator('.av-dialog [data-add-row="ln"]').click();
  await f.locator('.av-dialog .av-row select[name="from"]').last().selectOption('Back end');
  await f.locator('.av-dialog .av-row select[name="to"]').last().selectOption('Email service');
  await f.locator('.av-dialog .av-row input[name="label"]').last().fill('sends emails');
  await f.locator('.av-dialog button[type="submit"]').click();
  ok('architecture: link added', await until(() => stored('architecture')?.links?.some(l => l.to === 'Email service' && l.label === 'sends emails')), JSON.stringify(stored('architecture')?.links));
  ok('architecture: ARCHITECTURE.md follows', await until(() => /Email service[\s\S]*Postmark/.test(spec('ARCHITECTURE.md')) && /Node 22 · Fastify/.test(spec('ARCHITECTURE.md'))));
  await sleep(1200);
  await f.locator('#archview .ar-card[data-c="arc-back-end"]').click(); await sleep(400);
  ok('architecture: detail lists what it talks to', /Talks to[\s\S]*Email service/.test(await f.locator('#arDetail').innerText()));
  ok('architecture: the card shows its technology icons', await f.locator('#archview .ar-card[data-c="arc-back-end"] .ar-ic.has-tech svg.ti-brand').count() === 1 && await f.locator('#archview .ar-card[data-c="arc-back-end"] .ar-tech svg.ti').count() === 2);
  ok('architecture: detail says what each technology is, with alternatives', /Node\.js[\s\S]*JavaScript on the server[\s\S]*Alternatives[\s\S]*Deno[\s\S]*Fastify[\s\S]*Express/.test(await f.locator('#arDetail').innerText()), await f.locator('#arDetail').innerText());
  ok('architecture: ARCHITECTURE.md lists the technologies and alternatives', /## Technologies[\s\S]*Postmark[^\n]*Resend/.test(spec('ARCHITECTURE.md')));
  ok('architecture: code folders shown', /server\//.test(await f.locator('#archview .ar-card[data-c="arc-back-end"]').innerText()));
  await p.screenshot({ path: `${OUT}/x-architecture.png` });
  ok('parity in sync after all edits', await until(async () => /In sync/.test(await f.locator('#parity').innerText()), 10000), await f.locator('#parity').innerText());
  // undo goes back one edit
  await p.keyboard.press('Escape');
  await p.close();

  // ---- narrow, dark: the same desktop interface, sections from the rail
  ({ p, f, fr } = await open(460, 860, 'dark'));
  await f.locator('.rail .tab[data-tab="architecture"]').click(); await sleep(700);
  ok('narrow: the rail switches section (no phone bar)', await f.locator('#archview .ar-card').first().isVisible() && await f.locator('.phonebar').isHidden());
  const geo = await fr().evaluate(() => ({ w: innerWidth, sw: document.documentElement.scrollWidth, layers: getComputedStyle(document.querySelector('.ar-cols')).flexDirection }));
  ok('narrow: layers top to bottom, no sideways scroll', geo.sw <= geo.w + 1 && geo.layers === 'column', JSON.stringify(geo));
  ok('narrow: wires drawn between layers', await f.locator('#archview .ar-wires path.w').count() >= 3);
  await p.screenshot({ path: `${OUT}/x-narrow-architecture.png` });
  await f.locator('.rail .tab[data-tab="logic"]').click(); await sleep(500);
  await p.screenshot({ path: `${OUT}/x-narrow-logic.png` });
  await p.close();
} catch (e) { R.push(`CRASH ${e.stack}`); }
ok('no page errors', !errs.length, errs.join(' | '));
console.log(R.join('\n'));
await b.close(); await host.close?.(); s.close?.(); service.stop?.();
process.exit(0);
