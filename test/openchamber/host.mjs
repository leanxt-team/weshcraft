// A stand-in for OpenChamber, as close to the real thing as its source allows:
//  - extension files served from /api/guest-files/<grant>/… with OpenChamber's CSP header
//    (sandbox allow-scripts + guestFramePolicy), its injected styles and scrollbar script, ACAO null
//  - pages in <iframe sandbox="allow-scripts"> (opaque origin), real @openchamber/sdk inside
//  - every guest message validated with OpenChamber's own guestMessageSchema
//  - service requests proxied to the extension's real service (Bearer token), which runs real WeshCraft
//  - host calls (open-url, toast, badge, resize, …) recorded for the test
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

export async function startHost({ root, sdkDir, service, port = 0 }) {
  const sdk = await import(path.join(sdkDir, 'dist/index.js'));
  const schemas = await import(path.join(sdkDir, 'dist/schemas.js'));
  const ui = await import(path.join(sdkDir, 'dist/ui/index.js'));
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png' };
  const log = [];
  const tokens = {
    light: { background: '#ffffff', elevated: '#ffffff', foreground: '#18181b', muted: '#71717a', subtle: '#f4f4f5', border: '#e4e4e7', hover: '#f4f4f5', selection: '#e0e7ff', focus: '#6366f1', primary: '#4f46e5', mutedSurface: '#fafafa', elevatedForeground: '#18181b', active: '#e4e4e7', selectionForeground: '#1e1b4b', primaryForeground: '#ffffff', primaryText: '#4338ca', successText: '#15803d', warningText: '#b45309', errorText: '#b91c1c', infoText: '#1d4ed8', success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6', font: '"IBM Plex Sans", system-ui, sans-serif', mono: '"IBM Plex Mono", ui-monospace, monospace', radius: '6px' },
  };
  tokens.dark = { ...tokens.light, background: '#111113', elevated: '#18181b', foreground: '#ededf0', muted: '#9898a3', subtle: '#1c1c20', border: '#2a2a30', hover: '#1f1f24', selection: '#2b2a55', focus: '#818cf8', primary: '#818cf8', mutedSurface: '#161619', elevatedForeground: '#ededf0', active: '#26262c', selectionForeground: '#e0e7ff', primaryForeground: '#0b0b0f', primaryText: '#a5b4fc', successText: '#4ade80', warningText: '#fbbf24', errorText: '#f87171', infoText: '#93c5fd' };

  const parent = q => {
    const mode = q.get('theme') === 'dark' ? 'dark' : 'light';
    const ready = { theme: { mode, tokens: tokens[mode] }, locale: 'en', directory: q.get('dir') || null, session: null, surface: q.get('surface') || 'panel', item: null, connection: { connected: false, account: null }, settings: {}, features: {} };
    const w = q.get('w') || '340', h = q.get('h') || '720';
    return `<!doctype html><html><body style="margin:0;background:${tokens[mode].background}">
<iframe id=f sandbox="allow-scripts" style="width:${w}px;height:${h}px;border:0;display:block" src="/api/guest-files/G/${q.get('entry')}"></iframe>
<script>
const ready=${JSON.stringify(ready)}; const f=document.getElementById('f'); window.__log=[]; window.__calls=[];
const mode=${JSON.stringify(q.get('mode') || 'ok')};
const reply=m=>f.contentWindow.postMessage(m,'*');
addEventListener('message', async e => {
  if (e.source !== f.contentWindow) return; const m = e.data; window.__log.push(m.type);
  const check = await (await fetch('/validate',{method:'POST',body:JSON.stringify(m)})).json(); if(!check.ok) window.__log.push('INVALID '+m.type+' '+check.error);
  if (m.type==='hello') { if (mode==='noready') return; return reply({channel:m.channel,v:1,type:'ready',payload:ready}); }
  if (!m.id) { window.__calls.push({type:m.type,payload:m.payload}); return; }
  window.__calls.push({type:m.type,payload:m.payload});
  if (m.type==='service-request') {
    if (mode==='noservice') return reply({channel:m.channel,v:1,type:'result',id:m.id,ok:false,error:'Service not granted',code:'NO_SERVICE'});
    const r=await fetch('/svc',{method:'POST',body:JSON.stringify(m.payload)}); return reply({channel:m.channel,v:1,type:'result',id:m.id,ok:true,payload:await r.json()});
  }
  reply({channel:m.channel,v:1,type:'result',id:m.id,ok:true,payload:{}});
});
</script></body></html>`;
  };

  const server = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    const body = await new Promise(r => { let s = ''; req.on('data', c => s += c); req.on('end', () => r(s)); });
    if (u.pathname === '/host') { res.writeHead(200, { 'content-type': 'text/html' }); return res.end(parent(u.searchParams)); }
    if (u.pathname === '/validate') {
      const r = schemas.guestMessageSchema.safeParse(JSON.parse(body));
      if (!r.success) log.push({ invalid: JSON.parse(body).type, issues: r.error.issues.slice(0, 2) });
      res.writeHead(200); return res.end(JSON.stringify({ ok: r.success, error: r.success ? null : JSON.stringify(r.error.issues).slice(0, 300) }));
    }
    if (u.pathname === '/svc') {
      const p = JSON.parse(body);
      const q = p.query ? `?${new URLSearchParams(p.query)}` : '';
      const r = await fetch(`http://127.0.0.1:${service.port}${p.path}${q}`, { method: p.method, headers: { authorization: `Bearer ${service.token}` }, body: p.method === 'GET' ? undefined : p.body });
      const text = await r.text();
      if (text.length > 8_000_000) log.push({ tooLarge: p.path, bytes: text.length });
      res.writeHead(200); return res.end(JSON.stringify({ status: r.status, body: text }));
    }
    if (u.pathname.startsWith('/api/guest-files/G/')) {
      const rel = decodeURIComponent(u.pathname.slice('/api/guest-files/G/'.length));
      const fp = path.join(root, rel);
      if (!fp.startsWith(root) || !fs.existsSync(fp) || !fs.statSync(fp).isFile()) { res.writeHead(404); return res.end(); }
      const ct = MIME[path.extname(fp)];
      // Like the OpenChamber that refused main.js: only the HTML pages are served.
      if (process.env.SIM_HTML_ONLY && !ct?.startsWith('text/html')) { res.writeHead(404); return res.end(); }
      if (!ct) { res.writeHead(404); return res.end(); }
      let out = fs.readFileSync(fp);
      if (ct.startsWith('text/html')) out = out.toString('utf8').replace(/^\s*<!doctype[^>]*>/i, d => `${d}<meta name="color-scheme" content="light dark">`) + `\n<style data-openchamber-guest-styles>${sdk.GUEST_SCROLLBAR_CSS}${ui.GUEST_UI_LOOK_CSS}</style>\n<script data-openchamber-guest-scrollbar>${sdk.GUEST_SCROLLBAR_SCRIPT}</script>`;
      if (process.env.SIM_CROSSORIGIN && ct.startsWith('text/html')) out = String(out).replace(/<script src="main\.js"/g, '<script crossorigin="anonymous" src="main.js"');
      res.writeHead(200, { 'content-type': ct, 'content-security-policy': `sandbox allow-scripts; ${sdk.guestFramePolicy(`${process.env.SIM_HOST || '127.0.0.1'}:${server.address().port}/api/guest-files/G/`, [])}`, ...(process.env.SIM_NO_ACAO ? {} : { 'access-control-allow-origin': 'null' }), 'x-content-type-options': 'nosniff' });
      return res.end(out);
    }
    res.writeHead(404); res.end();
  });
  // SIM_HOST: OpenChamber reached at another address than loopback (a LAN name or IP).
  await new Promise(r => server.listen(port, process.env.SIM_HOST ? '0.0.0.0' : '127.0.0.1', r));
  return { url: `http://${process.env.SIM_HOST || '127.0.0.1'}:${server.address().port}`, log, close: () => server.close() };
}

/** A GitHub REST double with state: branches, commits, pull requests; records the token used. */
export async function fakeGitHub() {
  const seen = { auth: new Set(), calls: [] };
  const refs = new Map([['main', 'base']]);
  const commits = new Map([['base', { tree: 't0' }]]);
  let prs = [];
  let n = 0;
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', d => { body += d; }).on('end', () => {
      seen.auth.add(req.headers.authorization ?? '');
      seen.calls.push(`${req.method} ${req.url}`);
      const json = (v, s = 200) => { res.writeHead(s, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(v)); };
      const m = /^\/repos\/([^/]+)\/([^/]+)(\/.*)?$/.exec(req.url.split('?')[0]);
      if (!m) return json({ message: 'Not Found' }, 404);
      const [, owner, repo, rest = ''] = m;
      if (repo === 'missing') return json({ message: 'Not Found' }, 404);
      const html = `https://github.example/${owner}/${repo}`;
      if (rest === '' && req.method === 'GET') return json({ default_branch: 'main', html_url: html });
      let r;
      if ((r = /^\/git\/ref\/heads\/(.+)$/.exec(rest))) { const sha = refs.get(decodeURIComponent(r[1])); return sha ? json({ object: { sha } }) : json({ message: 'Not Found' }, 404); }
      if (rest === '/git/refs' && req.method === 'POST') { const b = JSON.parse(body); refs.set(b.ref.replace('refs/heads/', ''), b.sha); return json({}); }
      if ((r = /^\/git\/refs\/heads\/(.+)$/.exec(rest))) { const b = JSON.parse(body); refs.set(decodeURIComponent(r[1]), b.sha); return json({}); }
      if ((r = /^\/git\/commits\/(.+)$/.exec(rest))) return json({ tree: { sha: commits.get(r[1])?.tree ?? 't0' } });
      if (rest === '/git/blobs') return json({ sha: `blob${++n}` });
      if (rest === '/git/trees') return json({ sha: `tree${++n}` });
      if (rest === '/git/commits') { const b = JSON.parse(body); const sha = `c${++n}`; commits.set(sha, { tree: b.tree }); return json({ sha }); }
      if (rest === '/pulls' && req.method === 'GET') return json(prs);
      if (rest === '/pulls' && req.method === 'POST') { const pr = { html_url: `${html}/pull/7`, number: 7 }; prs = [pr]; return json(pr); }
      if ((r = /^\/pulls\/(\d+)$/.exec(rest))) return json(prs[0] ?? {});
      return json({ message: `unhandled ${req.method} ${rest}` }, 500);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return { url: `http://127.0.0.1:${server.address().port}`, host: `127.0.0.1:${server.address().port}`, seen, close: () => server.close() };
}
