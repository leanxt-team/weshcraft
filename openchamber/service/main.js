// WeshCraft's OpenChamber service (manifest `contributes.service`, runtime host).
//
// The rail panel and the Work Status section are sandboxed frames: they cannot reach the
// project's WeshCraft server themselves. This process does, on 127.0.0.1, through the host's
// loopback proxy (`host.serviceRequest`). It reuses the OpenCode plugin's bridge, so the panel,
// the plugin's tools and every session of a project talk to one WeshCraft server (same port).
//
//   GET  /health
//   GET  /state?directory=<project>   compact status for the panel (starts the server if needed)
//   POST /run   {directory, force?}   regenerate the specs
//   POST /sync  {directory}           sync now (target configured in WeshCraft)
import http from 'node:http';
import { Bridge, detectConfig } from '../../opencode/plugin.mjs';

const MAX_ISSUES = 60;

/** `file /abs/project/design/x.figcraft + …` → `design/x.figcraft + …` */
const relSource = (source, directory) => String(source ?? '').split(directory.replace(/[\\/]+$/, '')).join('').replace(/(^|\s)[\\/]/g, '$1').replace(/\bfile /g, '');

/** One bridge per project directory. `deps` lets tests inject a fake bridge. */
export function createService(deps = {}) {
  const bridges = new Map();
  const manifests = new Map(); // directory → { hash, gaps, links }

  const bridgeFor = directory => {
    if (!directory || typeof directory !== 'string') return { error: 'no project open' };
    if (bridges.has(directory)) return bridges.get(directory);
    const cfg = deps.config ? deps.config(directory) : detectConfig(directory);
    let entry;
    if (!cfg) entry = { none: true };
    else if (cfg.error) entry = { error: cfg.error };
    else entry = { bridge: deps.bridge ? deps.bridge(directory, cfg) : new Bridge(directory, cfg, { log: m => console.log(`[weshcraft] ${m}`) }) };
    // A project without a design is re-detected on the next poll (the user may add one).
    if (!entry.none) bridges.set(directory, entry);
    return entry;
  };

  const getJson = async (bridge, p, init = {}) => {
    const r = await fetch(`${bridge.base}${p}`, { ...init, headers: { ...bridge.headers(), ...(init.headers ?? {}) }, signal: AbortSignal.timeout(10_000) });
    if (!r.ok) throw new Error(`${p}: HTTP ${r.status}`);
    return r.json();
  };

  async function state(directory) {
    const entry = bridgeFor(directory);
    if (entry.none) return { status: 'none', directory };
    if (entry.error) return { status: 'error', directory, error: entry.error };
    const { bridge } = entry;
    try { await bridge.start(); } catch (e) { return { status: 'error', directory, error: e.message }; }
    const st = await getJson(bridge, '/api/state');
    const hash = st.summary?.hash;
    let links = manifests.get(directory);
    if (hash && links?.hash !== hash) {
      try {
        const m = await getJson(bridge, '/out/specs/manifest.json');
        links = { hash, gaps: (m.links?.gaps ?? []).map(g => ({ kind: g.kind, message: g.message ?? '', screen: g.screen ?? null, node: g.node ?? null, op: g.op ?? null, field: g.field ?? null })) };
        manifests.set(directory, links);
      } catch { links = { hash, gaps: [] }; }
    }
    const report = st.report;
    return {
      status: 'ok',
      directory,
      url: bridge.url(),
      source: relSource(st.source, directory),
      sourceKind: st.sourceKind,
      running: !!st.running,
      summary: st.summary,
      report: report ? { ok: report.ok, score: report.score, checks: report.checks, errors: report.errors, warnings: report.warnings, issues: report.issues.slice(0, MAX_ISSUES).map(i => ({ level: i.level, code: i.code, file: i.file, message: i.message, node: i.node ?? null })) } : null,
      jobs: (st.jobs ?? []).map(j => ({ id: j.id, group: j.group, title: j.title, file: j.file, status: j.status })),
      gaps: links?.gaps ?? [],
      sync: st.sync?.target ? { target: st.sync.target, auto: !!st.sync.auto, busy: !!st.sync.busy, last: st.sync.last ?? null } : null,
    };
  }

  async function post(directory, p, body) {
    const entry = bridgeFor(directory);
    if (!entry.bridge) return { status: 404, body: { error: entry.error ?? 'no WeshCraft design in this project' } };
    await entry.bridge.start();
    return { status: 200, body: await getJson(entry.bridge, p, { method: 'POST', body: JSON.stringify(body ?? {}) }) };
  }

  async function handle(method, url, readBody) {
    if (url.pathname === '/health') return { status: 200, body: { ok: true } };
    if (url.pathname === '/state' && method === 'GET') return { status: 200, body: await state(url.searchParams.get('directory')) };
    if ((url.pathname === '/run' || url.pathname === '/sync') && method === 'POST') {
      const body = JSON.parse((await readBody()) || '{}');
      return url.pathname === '/run' ? post(body.directory, '/api/run', { force: !!body.force }) : post(body.directory, '/api/sync', { now: true });
    }
    return { status: 404, body: { error: 'not found' } };
  }

  return { handle, state, stop: () => { for (const e of bridges.values()) e.bridge?.stop(); } };
}

/** Start the HTTP listener the host proxies to. */
export function listen({ port, token, service = createService() }) {
  const server = http.createServer(async (req, res) => {
    const reply = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };
    if (req.headers.authorization !== `Bearer ${token}`) return reply(401, { error: 'unauthorized' });
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');
    const readBody = () => new Promise((resolve, reject) => { let s = ''; req.on('data', c => { s += c; }); req.on('end', () => resolve(s)); req.on('error', reject); });
    try {
      const r = await service.handle(req.method, url, readBody);
      reply(r.status, r.body);
    } catch (e) {
      reply(502, { error: e.message });
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
  // Stop the WeshCraft servers this service started (one started by the OpenCode plugin keeps running).
  for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { service.stop(); process.exit(0); });
}
