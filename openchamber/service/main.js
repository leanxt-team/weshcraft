// WeshCraft's OpenChamber service (manifest `contributes.service`, runtime host).
//
// OpenChamber pages are sandboxed: no network but this process, reached through the host's loopback
// proxy (`host.serviceRequest`). The service finds or starts the project's WeshCraft server (the
// same one the OpenCode plugin and every session use: one per project, stable port) and:
//   GET  /health
//   GET  /state?directory=…           sync status for the small panel (no server started for an empty project)
//   POST /sync {directory, …}         sync now / set the target (body as WeshCraft's /api/sync)
//   ANY  /wc/<path>?directory=…       the big panel's API calls, proxied to WeshCraft (starts it if needed)
//   GET  /events?directory=…&since=N  WeshCraft's live events, long-polled (pages cannot hold an SSE stream)
//   POST /upload?directory=…&name=…&id=…&part=i&parts=n   chunked upload (64 KB per request), base64 parts
// GitHub/GitLab access: the server resolves the OpenChamber account, gh/glab login or git credentials.
import http from 'node:http';
import { Bridge, detectConfig } from '../../opencode/plugin.mjs';

const EVENT_BUFFER = 500;
const POLL_MS = 12_000; // under the host's 20 s request timeout

export function createService(deps = {}) {
  const projects = new Map(); // directory → { bridge, events, seq, waiters, stream }

  const configFor = (directory, force) => (deps.config ? deps.config(directory, { force }) : detectConfig(directory, { force }));

  function project(directory, { force = false } = {}) {
    if (!directory || typeof directory !== 'string') return { error: 'no project open' };
    const known = projects.get(directory);
    if (known) return known;
    const cfg = configFor(directory, force);
    if (!cfg) return { none: true };
    if (cfg.error) return { error: cfg.error };
    const p = {
      bridge: deps.bridge ? deps.bridge(directory, cfg) : new Bridge(directory, cfg, { log: m => console.log(`[weshcraft] ${m}`) }),
      events: [], seq: 0, waiters: new Set(), stream: null,
    };
    projects.set(directory, p);
    return p;
  }

  const call = async (bridge, path, { method = 'GET', body } = {}) => {
    const r = await fetch(`${bridge.base}${path}`, { method, headers: bridge.headers(), body: method === 'GET' || method === 'HEAD' ? undefined : body, signal: AbortSignal.timeout(19_000) });
    return { status: r.status, body: await r.text() };
  };

  // ---- small panel ---------------------------------------------------------------------------
  async function state(directory) {
    if (!directory) return { status: 'none', directory: null };
    const p = project(directory);
    if (p.none) return { status: 'none', directory };
    if (p.error) return { status: 'error', directory, error: p.error };
    try { await p.bridge.start(); } catch (e) { return { status: 'error', directory, error: e.message }; }
    const st = JSON.parse((await call(p.bridge, '/api/state')).body);
    const r = st.report;
    return {
      status: 'ok', directory, url: p.bridge.url(), source: st.source, name: st.summary?.name ?? null, running: !!st.running,
      parity: r ? { ok: r.ok, score: r.score, errors: r.errors, warnings: r.warnings, checks: r.checks } : null,
      sync: st.sync ?? null,
      access: st.tokens ?? null,
    };
  }

  // ---- live events: one SSE stream per project, buffered for long-polling pages ---------------
  function ensureStream(p) {
    if (p.stream) return;
    const ac = new AbortController();
    p.stream = ac;
    (async () => {
      try {
        const r = await fetch(`${p.bridge.base}/api/events`, { headers: p.bridge.headers(), signal: ac.signal });
        const dec = new TextDecoder();
        let buf = '';
        for await (const chunk of r.body) {
          buf += dec.decode(chunk, { stream: true });
          let i;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i); buf = buf.slice(i + 2);
            const type = /^event: (.+)$/m.exec(block)?.[1];
            const data = /^data: (.*)$/m.exec(block)?.[1];
            if (!type || data == null || type === 'hello') continue;
            p.events.push({ seq: ++p.seq, type, data });
            if (p.events.length > EVENT_BUFFER) p.events.shift();
            for (const w of p.waiters) w();
          }
        }
      } catch { /* closed or server gone */ }
      p.stream = null;
    })();
  }

  async function events(p, since) {
    await p.bridge.start();
    ensureStream(p);
    if (since < 0) return { seq: p.seq, events: [] }; // a page joining now: only what happens next
    // A page that missed more than the buffer holds reloads its state instead.
    if (since > 0 && p.events.length && p.events[0].seq > since + 1) return { seq: p.seq, reset: true, events: [] };
    const fresh = () => p.events.filter(e => e.seq > since);
    if (!fresh().length) {
      await new Promise(resolve => {
        const done = () => { clearTimeout(t); p.waiters.delete(done); resolve(); };
        const t = setTimeout(done, deps.pollMs ?? POLL_MS);
        p.waiters.add(done);
      });
    }
    return { seq: p.seq, events: fresh() };
  }

  // ---- chunked uploads -----------------------------------------------------------------------
  const uploads = new Map();
  async function upload(p, q, body) {
    const id = q.get('id'), part = Number(q.get('part')), parts = Number(q.get('parts'));
    if (!id || !(parts > 0) || !(part >= 0 && part < parts)) return { status: 400, body: JSON.stringify({ error: 'bad upload part' }) };
    const u = uploads.get(id) ?? { parts: new Array(parts), at: Date.now() };
    u.parts[part] = Buffer.from(body, 'base64');
    uploads.set(id, u);
    if (u.parts.filter(Boolean).length < parts) return { status: 202, body: JSON.stringify({ received: part }) };
    uploads.delete(id);
    await p.bridge.start();
    const r = await fetch(`${p.bridge.base}/api/upload?name=${encodeURIComponent(q.get('name') || 'design.figcraft')}`, { method: 'POST', headers: { ...p.bridge.headers(), 'Content-Type': 'application/octet-stream' }, body: Buffer.concat(u.parts) });
    return { status: r.status, body: await r.text() };
  }

  async function handle(method, url, readBody) {
    const directory = url.searchParams.get('directory');
    if (url.pathname === '/health') return { status: 200, body: JSON.stringify({ ok: true }) };
    if (url.pathname === '/state' && method === 'GET') return { status: 200, body: JSON.stringify(await state(directory)) };
    // Everything below is the big panel or an action: start WeshCraft even without a design (it offers to start one).
    const p = project(directory, { force: true });
    if (p.error) return { status: 409, body: JSON.stringify({ error: p.error }) };
    if (url.pathname === '/sync' && method === 'POST') {
      await p.bridge.start();
      return call(p.bridge, '/api/sync', { method: 'POST', body: (await readBody()) || '{}' });
    }
    if (url.pathname === '/events' && method === 'GET') return { status: 200, body: JSON.stringify(await events(p, Number(url.searchParams.get('since') || 0))) };
    if (url.pathname === '/upload' && method === 'POST') return upload(p, url.searchParams, await readBody());
    if (url.pathname === '/info') { await p.bridge.start(); return { status: 200, body: JSON.stringify({ url: p.bridge.url(), base: p.bridge.base }) }; }
    if (url.pathname.startsWith('/wc/')) {
      await p.bridge.start();
      const q = new URLSearchParams(url.searchParams);
      q.delete('directory');
      const qs = q.toString();
      return call(p.bridge, `${url.pathname.slice(3)}${qs ? `?${qs}` : ''}`, { method, body: await readBody() });
    }
    return { status: 404, body: JSON.stringify({ error: 'not found' }) };
  }

  return {
    handle, state,
    stop: () => { for (const p of projects.values()) { p.stream?.abort(); p.bridge?.stop(); } },
  };
}

export function listen({ port, token, service = createService() }) {
  const server = http.createServer(async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(body); };
    if (req.headers.authorization !== `Bearer ${token}`) return reply(401, JSON.stringify({ error: 'unauthorized' }));
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const readBody = () => new Promise((resolve, reject) => { let s = ''; req.setEncoding('utf8'); req.on('data', c => { s += c; }); req.on('end', () => resolve(s)); req.on('error', reject); });
    try {
      const r = await service.handle(req.method, url, readBody);
      reply(r.status, r.body);
    } catch (e) {
      reply(502, JSON.stringify({ error: e.message }));
    }
  });
  server.listen(port, '127.0.0.1');
  return server;
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/').replace(/^(?=[A-Za-z]:)/, '/')}`).href;
if (isMain) {
  const port = Number(process.env.OPENCHAMBER_SERVICE_PORT);
  const token = process.env.OPENCHAMBER_SERVICE_TOKEN ?? '';
  if (!Number.isInteger(port) || port <= 0 || !token) {
    console.error('OPENCHAMBER_SERVICE_PORT and OPENCHAMBER_SERVICE_TOKEN are required');
    process.exit(1);
  }
  const service = createService();
  listen({ port, token, service });
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { service.stop(); process.exit(0); });
}
