// Builds the OpenChamber extension pages (sandboxed iframes cannot load ES modules: one classic
// script each). The big panel is generated from the browser app itself, so it never drifts from it.
//   node openchamber/build.mjs        (needs the dev dependencies: npm install)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..', 'src', 'web', 'public');
const banner = { js: '/* WeshCraft for OpenChamber, built by openchamber/build.mjs. Edit openchamber/src or src/web/public, then rebuild. */' };
const DESKTOP = s => s; // narrow rail panel: one view at a time (restyled for OpenChamber in oc-theme.css); wide or expanded: desktop

const common = { bundle: true, format: 'iife', platform: 'browser', target: 'es2021', minify: true, legalComments: 'none', banner };

// small panel: rail + Work Status
for (const [dir, mode, height] of [['status', 'status', 52]]) {
  await build({ ...common, entryPoints: [path.join(here, 'src/sync.js')], outfile: path.join(here, dir, 'main.js') });
  fs.writeFileSync(path.join(here, dir, 'index.html'), smallShell(mode, height));
}

// big panel: the whole app
const desktopPlugin = {
  name: 'weshcraft-desktop',
  setup(b) {
    b.onResolve({ filter: /^\/app\/editor\.js$/ }, () => ({ path: path.join(app, 'editor.js') }));
    b.onLoad({ filter: /src[\\/]web[\\/]public[\\/].*\.js$/ }, a => ({ contents: DESKTOP(fs.readFileSync(a.path, 'utf8')), loader: 'js' }));
  },
};
await build({ ...common, entryPoints: [path.join(here, 'src/page-entry.js')], outfile: path.join(here, 'page', 'main.js'), plugins: [desktopPlugin] });
fs.writeFileSync(path.join(here, 'page', 'app.css'), `/* generated from src/web/public/app.css */\n${DESKTOP(fs.readFileSync(path.join(app, 'app.css'), 'utf8'))}`);
fs.copyFileSync(path.join(here, 'src', 'oc-theme.css'), path.join(here, 'page', 'oc-theme.css'));
const index = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const body = index.slice(index.indexOf('<body'), index.indexOf('</body>'))
  .replace(/<body[^>]*>/, '')
  .replace(/<script type="module" src="\/app\/app\.js"><\/script>/, '');
fs.writeFileSync(path.join(here, 'page', 'index.html'), `<!doctype html>
<html lang="en" class="oc">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeshCraft</title>
<link rel="stylesheet" href="app.css">
<link rel="stylesheet" href="oc-theme.css">
</head>
<body data-view="proto">
${body.trim()}
<script src="main.js" onerror="window.__wcStarted='load-error'"></script>
<script>
  // Independent of main.js: if it never loaded or never heard from OpenChamber, say which.
  setTimeout(function () {
    var s = window.__wcStarted;
    if (s === 'ready') return;
    var msg = s === 'load-error' ? 'main.js could not be loaded by OpenChamber (blocked or missing). Reload the extension in Settings → Extensions.' : (!s || s === 'loaded') ? 'The WeshCraft script did not start (it stopped while loading). Reload the extension in Settings → Extensions; if it persists, tell us the OpenChamber version.'
      : 'OpenChamber did not answer this panel (state: ' + s + '). Enable WeshCraft in Settings → Extensions, approve it, then reload it there.';
    var box = document.createElement('div'); box.className = 'oc-problem';
    var t = document.createElement('strong'); t.textContent = 'WeshCraft is not connected'; var d = document.createElement('div'); d.textContent = msg;
    box.appendChild(t); box.appendChild(d);
    var root = document.getElementById('root');
    if (root) { root.innerHTML = ''; root.appendChild(box); } else document.body.insertBefore(box, document.body.firstChild);
  }, 6000);
</script>
</body>
</html>
`);
// One self-contained file per page: script and styles inline. OpenChamber's frame policy allows
// inline code ('unsafe-inline'), and a page that loads nothing else cannot be broken by how a given
// OpenChamber version serves (or copies) the package's other files.
const inlineSafe = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
for (const dir of ['status', 'page']) {
  const f = path.join(here, dir, 'index.html');
  let html = fs.readFileSync(f, 'utf8');
  const js = fs.readFileSync(path.join(here, dir, 'main.js'), 'utf8');
  // The independent check first, then the app: a crash while parsing the app still gets reported.
  const check = /<script>\s*\/\/ Independent of main\.js[\s\S]*?<\/script>/.exec(html)[0];
  html = html.replace(check, '').replace(/<script src="main\.js"[^>]*><\/script>/, () => `${check.replace('Independent of main.js', 'Independent of the app script')}\n<script>window.__wcStarted = 'loaded';</script>\n<script>${inlineSafe(js)}</script>`);
  for (const css of ['app.css', 'oc-theme.css']) {
    const cf = path.join(here, dir, css);
    if (fs.existsSync(cf)) { html = html.replace(`<link rel="stylesheet" href="${css}">`, () => `<style>${fs.readFileSync(cf, 'utf8').replace(/<\/style/gi, '<\\/style')}</style>`); fs.rmSync(cf); }
  }
  if (/<script[^>]*\ssrc=|<link[^>]*stylesheet/.test(html)) throw new Error(`${dir}/index.html still loads a file`);
  fs.writeFileSync(f, html);
  fs.rmSync(path.join(here, dir, 'main.js'));
}
console.log('built openchamber/status, openchamber/page (self-contained)');

function smallShell(mode, height) {
  return `<!doctype html>
<html lang="en" data-mode="${mode}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>WeshCraft sync</title>
<style>
  html, body { margin: 0; }
  body { background: var(--oc-bg, Canvas); color: var(--oc-fg, CanvasText); font: 13px/1.45 var(--oc-font, system-ui, sans-serif); -webkit-font-smoothing: antialiased; }
  #root { box-sizing: border-box; display: flex; flex-direction: column; gap: 10px; padding: ${mode === 'status' ? '4px 8px' : '12px'}; }
  svg { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; }
  .oc-problem { padding: 12px; color: var(--oc-muted, GrayText); font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
  .oc-problem strong { display: block; color: var(--oc-fg, CanvasText); font-size: 13px; margin-bottom: 4px; }
  .sp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .sp-titles { min-width: 0; }
  .sp-title { margin: 0; font-size: 14px; font-weight: 600; }
  .sp-sub { color: var(--oc-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp-card { border: 1px solid var(--oc-border); background: var(--oc-muted-surface); border-radius: var(--oc-radius, 8px); padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .sp-target { display: flex; align-items: center; gap: 10px; }
  .sp-target svg { width: 22px; height: 22px; color: var(--oc-fg); }
  .sp-target svg path[d^="M12 2.5"] { fill: currentColor; stroke: none; }
  .sp-tt { min-width: 0; }
  .sp-repo { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sp-meta { color: var(--oc-muted); font-size: 12px; }
  .sp-line { margin: 0; font-size: 12.5px; overflow-wrap: anywhere; }
  .sp-line.tone-success { color: var(--oc-success-text, var(--oc-success)); }
  .sp-line.tone-error { color: var(--oc-error-text, var(--oc-error)); }
  .sp-line.tone-warning { color: var(--oc-warning-text, var(--oc-warning)); }
  .sp-line.tone-info { color: var(--oc-info-text, var(--oc-info)); }
  .sp-link { all: unset; cursor: pointer; color: var(--oc-primary-text, var(--oc-primary)); font-weight: 500; font-size: 12.5px; align-self: flex-start; }
  .sp-link:hover { text-decoration: underline; }
  .sp-link:focus-visible { outline: 2px solid var(--oc-focus); outline-offset: 2px; border-radius: 3px; }
  .sp-access, .sp-hint { margin: 0; color: var(--oc-muted); font-size: 11.5px; }
  .sp-dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; font-size: 12px; }
  .sp-dl dt { color: var(--oc-muted); }
  .sp-dl dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; }
  .sp-actions { display: flex; flex-wrap: wrap; gap: 6px; }
  .sp-h2 { margin: 0 0 4px; font-size: 11px; font-weight: 600; color: var(--oc-muted); text-transform: uppercase; letter-spacing: .06em; }
  .sp-hist ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
  .sp-hist li { display: grid; grid-template-columns: 8px 64px 1fr; align-items: center; gap: 8px; padding: 4px 6px; border-radius: calc(var(--oc-radius, 8px) - 2px); font-size: 12px; }
  .sp-hist li.click { cursor: pointer; }
  .sp-hist li.click:hover { background: var(--oc-hover); }
  .sp-hist .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--oc-success); }
  .sp-hist li.bad .dot { background: var(--oc-error); }
  .sp-hist .when { color: var(--oc-muted); font-variant-numeric: tabular-nums; }
  .sp-hist .what { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: var(--oc-mono); font-size: 11.5px; }
  .sp-hist li.bad .what { font-family: inherit; color: var(--oc-error-text, var(--oc-error)); }
  .sp-foot { display: flex; justify-content: flex-end; }
  .sp-empty { padding: 8px 0; }
  .sp-setup { display: grid; gap: 8px; border: 1px solid var(--oc-border); border-radius: var(--oc-radius, 8px); padding: 12px; background: var(--oc-muted-surface); }
  .sp-setup [hidden] { display: none !important; }
  .sp-seg { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; border-radius: var(--oc-radius, 8px); background: var(--oc-bg); border: 1px solid var(--oc-border); }
  .sp-seg label { display: flex; align-items: center; justify-content: center; gap: 6px; height: 28px; border-radius: calc(var(--oc-radius, 8px) - 2px); cursor: pointer; font-size: 12px; color: var(--oc-muted); }
  .sp-seg label svg { width: 15px; height: 15px; }
  .sp-seg label svg path[d^="M12 2.5"] { fill: currentColor; stroke: none; }
  .sp-seg input { position: absolute; opacity: 0; pointer-events: none; }
  .sp-seg label:has(input:checked) { background: var(--oc-selection); color: var(--oc-selection-fg, var(--oc-fg)); }
  .sp-seg label:has(input:focus-visible) { outline: 2px solid var(--oc-focus); }
  .sp-f { display: grid; gap: 4px; font-size: 12px; color: var(--oc-muted); }
  .sp-f input { height: 28px; padding: 0 8px; border: 1px solid var(--oc-border); border-radius: calc(var(--oc-radius, 8px) - 2px); background: var(--oc-bg); color: var(--oc-fg); font: inherit; font-size: 12.5px; }
  .sp-f input:focus { outline: none; border-color: var(--oc-focus); box-shadow: 0 0 0 2px color-mix(in srgb, var(--oc-focus) 30%, transparent); }
  .sp-chk { display: flex; align-items: center; gap: 6px; font-size: 12px; }
  .sp-chk input { accent-color: var(--oc-primary); margin: 0; }
  /* Work Status: sync, dense */
  html[data-mode="status"] #root { gap: 6px; padding: 6px 10px 8px; }
  .st-head { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .st-line { margin: 0; font-size: 12px; overflow-wrap: anywhere; color: var(--oc-muted); }
  .st-line.tone-success { color: var(--oc-success-text, var(--oc-success)); } .st-line.tone-error { color: var(--oc-error-text, var(--oc-error)); }
  .st-line.tone-warning { color: var(--oc-warning-text, var(--oc-warning)); } .st-line.tone-info { color: var(--oc-info-text, var(--oc-info)); }
  .st-actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .st-btns { display: inline-flex; gap: 4px; margin-left: auto; }
  .st-hist { list-style: none; margin: 0; padding: 0; display: grid; gap: 1px; }
  .st-hist li { display: grid; grid-template-columns: 7px 56px 1fr; align-items: center; gap: 6px; padding: 2px 4px; border-radius: 4px; font-size: 11.5px; }
  .st-hist li.click { cursor: pointer; } .st-hist li.click:hover { background: var(--oc-hover); }
  .st-hist .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--oc-success); } .st-hist li.bad .dot { background: var(--oc-error); }
  .st-hist .when { color: var(--oc-muted); } .st-hist .what { font-family: var(--oc-mono); font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st-hist li.bad .what { font-family: inherit; color: var(--oc-error-text, var(--oc-error)); }
  html[data-mode="status"] .sp-setup { padding: 8px; gap: 6px; }
  html[data-mode="status"] .sp-hint { display: none; }
  /* (legacy one-line row) */
  .st-row { all: unset; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 8px; padding: 4px 6px; border-radius: calc(var(--oc-radius, 8px) - 2px); cursor: pointer; }
  .st-row:hover:not(:disabled) { background: var(--oc-hover); }
  .st-row:disabled { cursor: default; }
  .st-row:focus-visible { outline: 2px solid var(--oc-focus); }
  .st-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--oc-muted); }
  .st-dot[data-tone="success"] { background: var(--oc-success); } .st-dot[data-tone="error"] { background: var(--oc-error); }
  .st-dot[data-tone="warning"] { background: var(--oc-warning); } .st-dot[data-tone="info"] { background: var(--oc-info); animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: .35; } }
  .st-label { font-weight: 600; white-space: nowrap; }
  .st-meta { flex: 1; min-width: 0; color: var(--oc-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .st-go { color: var(--oc-primary-text, var(--oc-primary)); font-weight: 500; }
  .st-sub { padding: 0 6px 2px 22px; color: var(--oc-muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<div id="root"><div class="oc-problem">Connecting to OpenChamber…</div></div>
<script src="main.js" onerror="window.__wcStarted='load-error'"></script>
<script>
  // Independent of main.js: if it never loaded or never heard from OpenChamber, say which.
  setTimeout(function () {
    var s = window.__wcStarted;
    if (s === 'ready') return;
    var msg = s === 'load-error' ? 'main.js could not be loaded by OpenChamber (blocked or missing). Reload the extension in Settings → Extensions.' : (!s || s === 'loaded') ? 'The WeshCraft script did not start (it stopped while loading). Reload the extension in Settings → Extensions; if it persists, tell us the OpenChamber version.'
      : 'OpenChamber did not answer this panel (state: ' + s + '). Enable WeshCraft in Settings → Extensions, approve it, then reload it there.';
    var box = document.createElement('div'); box.className = 'oc-problem';
    var t = document.createElement('strong'); t.textContent = 'WeshCraft is not connected'; var d = document.createElement('div'); d.textContent = msg;
    box.appendChild(t); box.appendChild(d);
    var root = document.getElementById('root');
    if (root) { root.innerHTML = ''; root.appendChild(box); } else document.body.insertBefore(box, document.body.firstChild);
  }, 6000);
</script>
</body>
</html>
`;
}
