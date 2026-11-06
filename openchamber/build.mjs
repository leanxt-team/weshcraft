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
// No phone layout inside OpenChamber: whatever the panel's width, the desktop interface (rail, panels,
// drawers when narrow). The browser app's phone breakpoint is switched off; its desktop rules always apply.
const DESKTOP = s => s.replace(/\(max-width:\s*720px\)/g, '(max-width: 0px)').replace(/\(min-width:\s*721px\)/g, '(min-width: 0px)');

const common = { bundle: true, format: 'iife', platform: 'browser', target: 'es2021', minify: true, legalComments: 'none', banner };

// big panel: the whole app
const desktopPlugin = {
  name: 'weshcraft-desktop',
  setup(b) {
    b.onResolve({ filter: /^\/app\/editor\.js$/ }, () => ({ path: path.join(app, 'editor.js') }));
    b.onResolve({ filter: /^\/app\/execsum\.js$/ }, () => ({ path: path.join(app, 'execsum.js') }));
    b.onResolve({ filter: /^\/app\/functions\.js$/ }, () => ({ path: path.join(app, 'functions.js') }));
    b.onResolve({ filter: /^\/app\/aspects\.js$/ }, () => ({ path: path.join(app, 'aspects.js') }));
    b.onResolve({ filter: /^\/app\/spectree\.js$/ }, () => ({ path: path.join(app, 'spectree.js') }));
    b.onResolve({ filter: /^\/app\/techcatalog\.js$/ }, () => ({ path: path.join(app, 'techcatalog.js') }));
    b.onResolve({ filter: /^\/app\/wires\.js$/ }, () => ({ path: path.join(app, 'wires.js') }));
    b.onResolve({ filter: /^\/app\/contract\.js$/ }, () => ({ path: path.join(app, 'contract.js') }));
    b.onResolve({ filter: /^\/app\/impact\.js$/ }, () => ({ path: path.join(app, 'impact.js') }));
    b.onResolve({ filter: /^\/app\/impact-core\.js$/ }, () => ({ path: path.join(app, 'impact-core.js') }));
    b.onLoad({ filter: /src[\\/]web[\\/]public[\\/].*\.js$/ }, a => ({ contents: DESKTOP(fs.readFileSync(a.path, 'utf8')), loader: 'js' }));
  },
};
await build({ ...common, entryPoints: [path.join(here, 'src/page-entry.js')], outfile: path.join(here, 'page', 'main.js'), plugins: [desktopPlugin] });
fs.writeFileSync(path.join(here, 'page', 'app.css'), `/* generated from src/web/public/app.css */\n${DESKTOP(fs.readFileSync(path.join(app, 'app.css'), 'utf8'))}`);
fs.writeFileSync(path.join(here, 'page', 'oc-theme.css'), DESKTOP(fs.readFileSync(path.join(here, 'src', 'oc-theme.css'), 'utf8')));
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
for (const dir of ['page']) {
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
console.log('built openchamber/page (self-contained)');
