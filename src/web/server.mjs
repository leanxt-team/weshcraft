// WeshCraft in the browser: the workspace UI (prototype + live spec builder + parity + publish),
// an SSE stream of build events, MCP over HTTP at /mcp, and a zip download of everything.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bus, containPath, writeFileSafe } from '../util/common.mjs';
import { writeZip } from '../util/zip.mjs';
import { openEditable } from '../design/source.mjs';
import { designApi } from './design-api.mjs';
import { accessSummary } from '../publish/credentials.mjs';
import { collectFiles } from '../publish/git.mjs';
import { ROOT, DESIGN } from '../layout.mjs';
import { parseTrusted, identity, forwarded, sameOrigin, clientIp } from './proxy.mjs';
import { codegraphState, codegraphImpact, codegraphCallers, codegraphQuery, codegraphExplore } from '../codegraph.mjs';
import { ownerOf } from './public/impact-core.js';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.figcraft': 'application/zip', '.zip': 'application/zip' };
const MAX_UPLOAD = 64 * 1024 * 1024;
const MAX_ZIP = 512 * 1024 * 1024;

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 2 * 1024 * 1024, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    let done = false;
    // A body that never ends must not hold the handler (and the socket) for minutes.
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(Object.assign(new Error('the request body took too long'), { status: 408 }));
      req.destroy();
    }, timeoutMs);
    timer.unref?.();
    const finish = (fn, arg) => { if (done) return; done = true; clearTimeout(timer); fn(arg); };
    req.on('data', c => {
      n += c.length;
      if (n > limit) { finish(reject, Object.assign(new Error('request too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => finish(resolve, Buffer.concat(chunks)));
    req.on('error', e => finish(reject, e));
  });
}

function serveFile(res, root, rel) {
  // The path stays inside the root: no `..`, no symlink out.
  const abs = containPath(root, rel);
  if (!abs) return send(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, { error: 'not found' });
  send(res, 200, fs.readFileSync(abs), TYPES[path.extname(abs)] ?? 'application/octet-stream');
}

/**
 * @param {{workspace, mcp, host?: string, port?: number, token?: string, figcraftWebUrl?: string,
 *          uploadsDir?: string, watch?: boolean, trustProxy?: string[], publicUrl?: string}} o
 */
export function startServer(o) {
  const ws = o.workspace;
  const token = o.token || null;
  const host = o.host || '127.0.0.1';
  const publicUrl = o.publicUrl || null;
  // Behind a proxy: the peers whose forwarded headers (the identity, the scheme, the host) are
  // believed. Empty by default: nothing is trusted until the operator says so.
  const trusted = parseTrusted(o.trustProxy || []);
  const hasProxy = (o.trustProxy || []).length > 0;
  if (!token && !hasProxy && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`refusing to listen on ${host} without --token or --trust-proxy (anyone on the network could publish with your git token)`);
  }
  const clients = new Set();
  // The code graph is slow and the interface asks on every click: the answers are cached for a few
  // minutes. The promise is what is cached, so two clicks at once share one call.
  const cgCache = new Map();
  const CG_TTL = 5 * 60_000;
  const cached = (key, make) => {
    const hit = cgCache.get(key);
    if (hit && Date.now() - hit.at < CG_TTL) return hit.value;
    const value = Promise.resolve(make()).catch(e => ({ ok: false, reason: e.message }));
    cgCache.set(key, { at: Date.now(), value });
    return value;
  };
  // Every workspace event (jobs, runs, parity, design edits) streams to every open browser.
  const broadcast = ev => {
    const data = `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
    for (const c of clients) {
      // A client that does not read must not make the server grow: drop it.
      if (!c.write(data)) { clients.delete(c); c.end(); }
    }
  };
  bus.on('weshcraft', broadcast);
  const authorized = (req, url) => {
    // Forward auth: the proxy already authenticated the user, so the token is not needed.
    if (hasProxy && identity(req, trusted)) return true;
    if (!token) return true;
    const h = req.headers.authorization || '';
    const cookie = /(?:^|;\s*)weshcraft=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    const given = h.startsWith('Bearer ') ? h.slice(7) : cookie || url.searchParams.get('token');
    if (!given || given.length !== token.length) return false;
    return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
  };

  // The design file can change outside WeshCraft (FigCraft saved it, git checkout). Watch its folder:
  // saves replace the file (rename), which a watch on the file itself would miss.
  let watcher = null;
  const watchFile = file => {
    watcher?.close();
    if (!o.watch || !file) return;
    let t = null;
    const base = path.basename(file);
    try {
      watcher = fs.watch(path.dirname(file), (_, name) => {
        if (name && name !== base) return;
        clearTimeout(t);
        t = setTimeout(() => {
          const store = ws.source?.store;
          if (store) { try { store.reloadIfChanged(); } catch (e) { ws.emit('log', { level: 'error', message: `could not reload ${base}: ${e.message}` }); } }
          else ws.run().catch(e => ws.emit('log', { level: 'error', message: e.message }));
        }, 300);
      });
    } catch { /* folder gone: nothing to watch */ }
  };
  if (ws.source?.kind === 'file') watchFile(ws.source.file);
  // Surface files (OpenAPI, MCP tool lists) regenerate on save too. The folder is watched, not
  // the file: a file that is replaced (every editor does that) would stop firing.
  const surfaceWatchers = [];
  if (o.watch) {
    let t = null;
    const rerun = () => { clearTimeout(t); t = setTimeout(() => ws.run().catch(e => ws.emit('log', { level: 'error', message: e.message })), 400); };
    const dirs = new Set((ws.surface?.files ?? []).map(f => path.dirname(f)));
    for (const dir of dirs) {
      try {
        surfaceWatchers.push(fs.watch(dir, (_e, name) => {
          if (name && !/\.(ya?ml|json)$/i.test(name)) return;
          rerun();
        }));
      } catch { /* the folder is gone: the run reports it */ }
    }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      // The liveness check a proxy makes: it says nothing and needs no token.
      if (url.pathname === '/healthz') return send(res, 200, { ok: true });
      // The proxy's identity, when it is trusted; the client's address for the log.
      const who = identity(req, trusted);
      const scheme = (forwarded(req, trusted).scheme || (publicUrl ? new URL(publicUrl).protocol.replace(':', '') : null) || (req.socket?.encrypted ? 'https' : 'http'));
      if (hasProxy && !who && !token) return send(res, 401, { error: 'unauthorized: the proxy did not forward an identity' });
      if (!authorized(req, url)) return send(res, 401, { error: 'unauthorized: open the URL with ?token=…' });
      // A cross-site request must not change anything: the proxy's login does not stop a page on
      // another site from posting (the browser sends the proxy's cookies by itself). The check
      // applies to the requests the proxy authenticated; the token and the cookie (SameSite)
      // already keep the others safe.
      if (who && !sameOrigin(req, { publicUrl, trusted })) return send(res, 403, { error: 'forbidden: cross-origin request' });
      if (token && url.searchParams.get('token')) {
        const attrs = [`weshcraft=${token}`, 'HttpOnly', 'SameSite=Strict', 'Path=/'];
        if (scheme === 'https') attrs.push('Secure');
        res.setHeader('Set-Cookie', attrs.join('; '));
      }
      const p = url.pathname;
      // Who changed something, and from where: the trail behind a proxy.
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        res.on('finish', () => {
          if (res.statusCode >= 400) return;
          ws.emit('log', { level: 'info', message: `${req.method} ${p} — ${who?.user ?? clientIp(req, trusted)}` });
        });
      }

      if (p === '/' || p === '/index.html') return serveFile(res, PUBLIC, 'index.html');
      if (p.startsWith('/app/')) return serveFile(res, PUBLIC, p.slice(5));
      // Only what WeshCraft writes: the output folder may be the user's repository root.
      if (p.startsWith('/out/')) {
        const rel = decodeURIComponent(p.slice(5));
        if (!rel.startsWith(`${ROOT}/`)) return send(res, 404, { error: 'not found' });
        return serveFile(res, ws.outDir, rel);
      }
      if (p === '/api/ping') return send(res, 200, { ok: true, app: 'weshcraft', outDir: ws.outDir });
      if (p === '/api/file') {
        // A file of the project, so the code behind a spec can be read here. Read-only, and
        // inside the project: the path is data, never a command.
        const rel = url.searchParams.get('path') || '';
        const abs = containPath(ws.outDir, rel);
        if (!abs) return send(res, 400, { error: 'path must stay inside the project' });
        let st;
        try { st = fs.statSync(abs); } catch { return send(res, 404, { error: 'not found' }); }
        if (!st.isFile()) return send(res, 404, { error: 'not found' });
        if (st.size > 1024 * 1024) return send(res, 413, { error: 'the file is too big to show here' });
        const line = Number(url.searchParams.get('line') || 0);
        const all = fs.readFileSync(abs, 'utf8').split('\n');
        const from = Math.max(0, (Number.isFinite(line) && line ? line - 30 : 0));
        const to = Math.min(all.length, from + 90);
        return send(res, 200, { path: rel.replace(/^\.?\//, ''), from: from + 1, to, lines: all.slice(from, to).map((text, i) => ({ n: from + i + 1, text })) });
      }
      if (p === '/api/codegraph') {
        // The code graph, for the browser: what a symbol reaches and what reaches it. The tool is
        // optional and slow, so the answers are cached for a few minutes. Every argument is data:
        // the tool runs in the project folder, never with an argument of the caller's choosing.
        const what = url.searchParams.get('what') || 'state';
        const dir = ws.outDir;
        const num = (v, d, min, max) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
        const text = (v, name) => {
          const s = String(v ?? '').trim().slice(0, 300);
          if (!s) return { error: `${name} is required` };
          if (s.startsWith('-')) return { error: `${name} must not start with "-"` };
          return { value: s };
        };
        // A symbol is a name, never a path: it goes to the tool as one argument.
        const symbol = (v, name) => {
          const s = text(v, name);
          if (s.error) return s;
          if (/[\\/]/.test(s.value) || s.value.includes('..')) return { error: `${name} must be a name, not a path` };
          return s;
        };
        const file = v => {
          const s = String(v ?? '').trim();
          if (!s) return { value: null };
          if (s.startsWith('-')) return { error: 'file must not start with "-"' };
          if (!containPath(dir, s)) return { error: 'file must stay inside the project' };
          return { value: s };
        };
        // A layer's id is enough: the symbol of the element it belongs to.
        const symbolOfNode = v => {
          const id = Number(v);
          if (!Number.isFinite(id)) return null;
          const owner = ownerOf(ws.manifest, id);
          if (!owner) return null;
          const el = (ws.trace?.elements ?? []).find(e => e.id === owner.key);
          return el?.code?.find(c => c.symbol)?.symbol ?? null;
        };
        if (what === 'state') return send(res, 200, await cached('state', () => codegraphState(dir)));
        if (what === 'impact' || what === 'callers') {
          // A symbol by name, or a layer's id: the symbol of the element it belongs to.
          const given = url.searchParams.get('symbol');
          let sym = given ? symbol(given, 'symbol') : { value: '' };
          if (!sym.error && !sym.value) {
            const fromNode = symbolOfNode(url.searchParams.get('node'));
            sym = fromNode ? { value: fromNode } : { error: 'symbol: the name of a symbol (or node: a layer id)' };
          }
          if (!sym.value) return send(res, 400, { error: sym.error ?? 'symbol: the name of a symbol (or node: a layer id)' });
          const f = file(url.searchParams.get('file'));
          if (f.error) return send(res, 400, { error: f.error });
          const depth = num(url.searchParams.get('depth'), 4, 1, 8);
          const key = `${what}|${sym.value}|${f.value ?? ''}|${depth}`;
          return send(res, 200, await cached(key, () => what === 'impact'
            ? codegraphImpact(dir, sym.value, { depth, file: f.value })
            : codegraphCallers(dir, sym.value, { file: f.value })));
        }
        if (what === 'query') {
          const q = text(url.searchParams.get('q') ?? url.searchParams.get('symbol'), 'q');
          if (q.error) return send(res, 400, { error: q.error });
          const limit = num(url.searchParams.get('limit'), 10, 1, 50);
          return send(res, 200, await cached(`query|${q.value}|${limit}`, () => codegraphQuery(dir, q.value, { limit })));
        }
        if (what === 'explore') {
          const q = text(url.searchParams.get('q'), 'q');
          if (q.error) return send(res, 400, { error: q.error });
          const maxFiles = num(url.searchParams.get('maxFiles'), 6, 1, 12);
          return send(res, 200, await cached(`explore|${q.value}|${maxFiles}`, () => codegraphExplore(dir, q.value, { maxFiles })));
        }
        return send(res, 400, { error: 'what: one of impact, callers, query, explore, state' });
      }
      if (p === '/api/state') return send(res, 200, { ...ws.state(), source: ws.describe().split(`${ws.outDir}${path.sep}`).join(''), sync: o.syncer?.status() ?? null, figcraftWebUrl: o.figcraftWebUrl ?? null, tokens: await accessSummary(), mcpUrl: '/mcp', user: who?.user ?? null, publicUrl });
      if (p === '/api/events') {
        // A proxy that buffers would hold the whole stream: say so, and keep it alive.
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(`event: hello\ndata: ${JSON.stringify({ type: 'hello' })}\n\n`);
        clients.add(res);
        const ping = setInterval(() => res.write(': ping\n\n'), 10000);
        req.on('close', () => { clearInterval(ping); clients.delete(res); });
        return;
      }
      if (p.startsWith('/api/design')) {
        const r = await designApi(ws, req, url, () => readBody(req, 8 * 1024 * 1024), { watchFile });
        return send(res, r.status ?? 200, r.body);
      }
      if (p === '/api/spec-tree') {
        if (req.method === 'GET') return send(res, 200, ws.specTree());
        if (req.method === 'POST') {
          const body = JSON.parse((await readBody(req)).toString() || '{}');
          if (!body.tree || !Array.isArray(body.tree.folders)) return send(res, 400, { error: 'tree: {folders, items}' });
          return send(res, 200, ws.setSpecTree(body.tree));
        }
      }
      if (p === '/api/run' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        ws.run({ force: !!body.force }).catch(e => ws.emit('log', { level: 'error', message: e.message }));
        return send(res, 202, { started: true });
      }
      if (p === '/api/upload' && req.method === 'POST') {
        const buf = await readBody(req, MAX_UPLOAD);
        const name = (url.searchParams.get('name') || 'design.figcraft').replace(/[^\w.-]+/g, '_').replace(/^\.+/, '') || 'design.figcraft';
        if (!/\.(figcraft|json)$/i.test(name)) return send(res, 400, { error: 'upload a .figcraft file' });
        const dir = o.uploadsDir || path.join(ws.outDir, DESIGN);
        const file = path.join(dir, name);
        // An existing design is never overwritten by an upload without being told to.
        if (fs.existsSync(file) && url.searchParams.get('overwrite') !== '1') {
          return send(res, 409, { error: `${name} already exists: open it instead, or upload with overwrite=1` });
        }
        fs.mkdirSync(dir, { recursive: true });
        writeFileSafe(file, buf); // atomic: an interrupted upload cannot truncate the design
        ws.useSource(openEditable(file));
        watchFile(file);
        ws.run({ force: true }).catch(e => ws.emit('log', { level: 'error', message: e.message }));
        return send(res, 202, { source: ws.describe() });
      }
      if (p === '/api/publish' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        return send(res, 200, await o.mcp.publish(body));
      }
      if (p === '/api/sync' && req.method === 'POST') {
        // {provider: github|gitlab|git, repo?, branch?, base?, apiUrl?, token?, pr?, push?, auto?, now?}
        const b = JSON.parse((await readBody(req)).toString() || '{}');
        if (!o.syncer) return send(res, 400, { error: 'sync unavailable' });
        if (b.provider) o.syncer.configure({ kind: b.provider, repo: b.repo || null, branch: b.branch || null, base: b.base || undefined, apiUrl: b.apiUrl || undefined, token: b.token || undefined, pr: b.pr !== false, push: !!b.push, auto: b.auto !== false });
        if (b.off) o.syncer.configure(null);
        const result = b.now === false || b.off ? null : await o.syncer.sync();
        return send(res, 200, { result, status: o.syncer.status() });
      }
      if (p === '/api/notes' && req.method === 'POST') {
        const body = JSON.parse((await readBody(req)).toString() || '{}');
        const r = await o.mcp.callTool('weshcraft_write_notes', body);
        return send(res, r.isError ? 400 : 200, JSON.parse(r.content[0].text.startsWith('{') ? r.content[0].text : JSON.stringify({ error: r.content[0].text })));
      }
      if (p === '/api/download.zip') {
        const provider = url.searchParams.get('provider') === 'gitlab' ? 'gitlab' : 'github';
        const files = collectFiles(ws.outDir, { provider, designInputs: ws.designInputs() });
        const name = (ws.manifest?.source.name || 'weshcraft').replace(/[^\w.-]+/g, '-');
        const total = files.reduce((n, f) => n + f.data.length, 0);
        // A zip is built in memory: say so instead of taking the server down.
        if (total > MAX_ZIP) return send(res, 413, { error: `the output is ${Math.round(total / 1024 / 1024)} MB: too big to zip here (the limit is ${Math.round(MAX_ZIP / 1024 / 1024)} MB)` });
        return send(res, 200, writeZip(files.map(f => [`${name}/${f.path}`, f.data])), 'application/zip', { 'Content-Disposition': `attachment; filename="${name}-specs.zip"` });
      }
      if (p === '/mcp') {
        if (req.method === 'GET') return send(res, 405, { error: 'this server does not stream server-initiated messages; POST JSON-RPC' }, undefined, { Allow: 'POST' });
        if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
        const msg = JSON.parse((await readBody(req)).toString());
        if (Array.isArray(msg)) {
          const out = (await Promise.all(msg.map(m => o.mcp.handle(m)))).filter(Boolean);
          return out.length ? send(res, 200, out) : send(res, 202, '');
        }
        const out = await o.mcp.handle(msg);
        return out ? send(res, 200, out, undefined, msg.method === 'initialize' ? { 'Mcp-Session-Id': crypto.randomUUID() } : {}) : send(res, 202, '');
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      return send(res, e.status || 500, { error: e.message });
    }
  });

  server.on('close', () => { bus.off('weshcraft', broadcast); watcher?.close(); for (const w of surfaceWatchers) w.close(); });
  // A proxy or a slow client must not hold a request open for ever.
  server.requestTimeout = 120_000;
  server.headersTimeout = 30_000;
  server.keepAliveTimeout = 20_000;
  return new Promise(resolve => {
    server.listen(o.port ?? 4600, host, () => {
      const addr = server.address();
      const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
      server.url = `http://${shown}:${addr.port}/${token ? `?token=${token}` : ''}`;
      resolve(server);
    });
  });
}
