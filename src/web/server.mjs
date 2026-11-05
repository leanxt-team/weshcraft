// WeshCraft in the browser: the workspace UI (prototype + live spec builder + parity + publish),
// an SSE stream of build events, MCP over HTTP at /mcp, and a zip download of everything.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { bus } from '../util/common.mjs';
import { writeZip } from '../util/zip.mjs';
import { openEditable } from '../design/source.mjs';
import { designApi } from './design-api.mjs';
import { accessSummary } from '../publish/credentials.mjs';
import { collectFiles } from '../publish/git.mjs';
import { ROOT, DESIGN } from '../layout.mjs';

const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.figcraft': 'application/zip', '.zip': 'application/zip' };
const MAX_UPLOAD = 64 * 1024 * 1024;

function send(res, status, body, type = 'application/json; charset=utf-8', extra = {}) {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on('data', c => {
      n += c.length;
      if (n > limit) { reject(Object.assign(new Error('request too large'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function serveFile(res, root, rel) {
  const abs = path.resolve(root, `.${path.posix.normalize(`/${rel}`)}`);
  if (abs !== root && !abs.startsWith(root + path.sep)) return send(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) return send(res, 404, { error: 'not found' });
  send(res, 200, fs.readFileSync(abs), TYPES[path.extname(abs)] ?? 'application/octet-stream');
}

/**
 * @param {{workspace, mcp, host?: string, port?: number, token?: string, figcraftWebUrl?: string, uploadsDir?: string, watch?: boolean}} o
 */
export function startServer(o) {
  const ws = o.workspace;
  const token = o.token || null;
  const host = o.host || '127.0.0.1';
  if (!token && !['127.0.0.1', 'localhost', '::1'].includes(host)) {
    throw new Error(`refusing to listen on ${host} without --token (anyone on the network could publish with your git token)`);
  }
  const clients = new Set();
  // Every workspace event (jobs, runs, parity, design edits) streams to every open browser.
  const broadcast = ev => {
    const data = `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
    for (const c of clients) c.write(data);
  };
  bus.on('weshcraft', broadcast);
  const authorized = (req, url) => {
    if (!token) return true;
    const h = req.headers.authorization || '';
    const cookie = /(?:^|;\s*)weshcraft=([^;]+)/.exec(req.headers.cookie || '')?.[1];
    const given = h.startsWith('Bearer ') ? h.slice(7) : cookie || url.searchParams.get('token');
    return !!given && given.length === token.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
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
  // Surface files (OpenAPI, MCP tool lists) regenerate on save too.
  if (o.watch) {
    let t = null;
    const rerun = () => { clearTimeout(t); t = setTimeout(() => ws.run().catch(e => ws.emit('log', { level: 'error', message: e.message })), 400); };
    for (const f of ws.surface?.files ?? []) {
      try { fs.watch(f, rerun); } catch { /* missing file: reported by the run */ }
      // Files a surface file points to (openapi.yaml next to weshcraft.surface.json).
      try { const dir = path.dirname(f); for (const n of fs.readdirSync(dir)) if (/\.(ya?ml|json)$/i.test(n) && path.join(dir, n) !== f) fs.watch(path.join(dir, n), rerun); } catch { /* ignore */ }
    }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      if (!authorized(req, url)) return send(res, 401, { error: 'unauthorized: open the URL with ?token=…' });
      if (token && url.searchParams.get('token')) res.setHeader('Set-Cookie', `weshcraft=${token}; HttpOnly; SameSite=Strict; Path=/`);
      const p = url.pathname;

      if (p === '/' || p === '/index.html') return serveFile(res, PUBLIC, 'index.html');
      if (p.startsWith('/app/')) return serveFile(res, PUBLIC, p.slice(5));
      // Only what WeshCraft writes: the output folder may be the user's repository root.
      if (p.startsWith('/out/')) {
        const rel = decodeURIComponent(p.slice(5));
        if (!rel.startsWith(`${ROOT}/`)) return send(res, 404, { error: 'not found' });
        return serveFile(res, ws.outDir, rel);
      }

      if (p === '/api/ping') return send(res, 200, { ok: true, app: 'weshcraft', outDir: ws.outDir });
      if (p === '/api/state') return send(res, 200, { ...ws.state(), source: ws.describe().split(`${ws.outDir}${path.sep}`).join(''), sync: o.syncer?.status() ?? null, figcraftWebUrl: o.figcraftWebUrl ?? null, tokens: await accessSummary(), mcpUrl: '/mcp' });
      if (p === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
        res.write(`event: hello\ndata: ${JSON.stringify({ type: 'hello' })}\n\n`);
        clients.add(res);
        const ping = setInterval(() => res.write(': ping\n\n'), 20000);
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
        fs.mkdirSync(dir, { recursive: true });
        const file = path.join(dir, name);
        fs.writeFileSync(file, buf);
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

  server.on('close', () => { bus.off('weshcraft', broadcast); watcher?.close(); });
  return new Promise(resolve => {
    server.listen(o.port ?? 4600, host, () => {
      const addr = server.address();
      const shown = host === '0.0.0.0' || host === '::' ? 'localhost' : host;
      server.url = `http://${shown}:${addr.port}/${token ? `?token=${token}` : ''}`;
      resolve(server);
    });
  });
}
