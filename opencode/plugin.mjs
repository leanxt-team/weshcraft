// WeshCraft for OpenCode 2 (2.2+) and OpenChamber, which runs on the OpenCode server.
//
// In a project with a design (wcraft/design/*.figcraft) and/or a non-visual front (weshcraft.surface.json,
// openapi.*, wcraft/design/*.mcp.json), configured by .opencode/weshcraft.json or the plugin's options:
//   - starts `weshcraft serve` for the project (one per project, stable port, reused by sessions);
//     its own file watcher regenerates the specs when a design, OpenAPI or MCP file changes
//   - registers WeshCraft's one light set of tools by proxying the server's MCP endpoint: status, read,
//     edit, notes, generate, sync (and new while the project has no design)
//   - GitHub/GitLab access is inherited: the server gets OpenCode's environment and resolves the
//     OpenChamber account, gh/glab login or git credentials itself (src/publish/credentials.mjs)
//   - registers the /weshcraft command
//   - stops the server it started when the plugin unloads
// Nothing here blocks OpenCode: failures become tool errors or server-log lines.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { projectDesign } from '../src/design/discover.mjs';
import { DESIGN } from '../src/layout.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BIN = path.join(ROOT, 'bin', 'weshcraft.mjs');

/** Node to run the server with. OpenCode ships as a compiled binary, so `process.execPath` is
 *  that binary and cannot run a script: fall back to `node` from PATH (or $WESHCRAFT_NODE). */
const NODE_BIN = (() => {
  if (process.env.WESHCRAFT_NODE) return process.env.WESHCRAFT_NODE;
  const exe = path.basename(process.execPath || '');
  return /^node(\d+)?$/.test(exe) ? process.execPath : 'node';
})();

// ---- project configuration -------------------------------------------------------------------
export function detectConfig(dir, options = {}) {
  const file = path.join(dir, '.opencode', 'weshcraft.json');
  let cfg = { ...options };
  // The project's design: the one chosen before, wcraft/design/*.figcraft, or the only one in the repo.
  if (!cfg.file && !cfg.attach && !cfg.mcp) { const found = projectDesign(dir); if (found) cfg.file = found.file; }
  if (fs.existsSync(file)) {
    try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { return { error: `.opencode/weshcraft.json: ${e.message}` }; }
  }
  const exists = p => fs.existsSync(path.join(dir, p));
  const list = d => (exists(d) ? fs.readdirSync(path.join(dir, d)).map(n => path.posix.join(d, n)) : []);
  const candidates = [...list('.'), ...list(DESIGN), ...list('design'), ...list('api')].map(p => p.replace(/^\.\//, ''));
  if (!cfg.file && !cfg.attach && !cfg.mcp) cfg.file = candidates.find(p => /\.figcraft(\.json)?$/i.test(p));
  if (!cfg.surface && !cfg.mcpServer) {
    const surface = candidates.find(p => /weshcraft\.surface\.json$/i.test(p))
      ?? candidates.find(p => /openapi\.(ya?ml|json)$/i.test(p))
      ?? candidates.find(p => /\.mcp\.json$/i.test(p));
    if (surface) cfg.surface = [surface];
  }
  if (!cfg.file && !cfg.attach && !cfg.mcp && !cfg.surface?.length && !cfg.mcpServer?.length && !options.force) return null;
  return {
    out: '.', concurrency: 6, ...cfg,
    surface: [].concat(cfg.surface ?? []), mcpServer: [].concat(cfg.mcpServer ?? []),
    // One stable port per project, so every session of the project shares one server.
    autoPort: cfg.port == null,
    port: cfg.port ?? 4600 + (parseInt(crypto.createHash('sha1').update(path.resolve(dir)).digest('hex').slice(0, 4), 16) % 300),
  };
}

export function serveArgs(cfg) {
  const a = ['serve', '--out', cfg.out, '--port', String(cfg.port), '--concurrency', String(cfg.concurrency)];
  if (cfg.file) a.push('--file', cfg.file);
  if (cfg.attach) a.push('--attach', String(cfg.attach));
  if (cfg.mcp) a.push('--mcp');
  if (cfg.figcraftCli) a.push('--figcraft-cli', cfg.figcraftCli);
  for (const s of cfg.surface) a.push('--surface', s);
  for (const s of cfg.mcpServer) a.push('--mcp-server', s);
  if (cfg.sync) a.push('--sync', cfg.sync);
  if (cfg.agent) a.push('--agent', ...(cfg.agent === true ? [] : [cfg.agent]));
  if (cfg.token) a.push('--token', cfg.token);
  return a;
}

// ---- the WeshCraft server for this project --------------------------------------------------
export class Bridge {
  static PORT_SPAN = 12;
  constructor(dir, cfg, { log = () => {}, spawnImpl = spawn, nodePath = NODE_BIN, bin = BIN } = {}) {
    Object.assign(this, { dir, cfg, log, spawnImpl, nodePath, bin });
    this.base = `http://127.0.0.1:${cfg.port}`;
    this.port0 = cfg.port;
    this.child = null;
    this.ready = null;
    this.id = 0;
  }

  headers() { return { 'Content-Type': 'application/json', ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}) }; }

  /** What answers on a port: this project's WeshCraft, nothing, or something else. */
  async probe(port) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/ping`, { headers: this.headers(), signal: AbortSignal.timeout(800) });
      if (!r.ok) return 'taken';
      const j = await r.json().catch(() => ({}));
      const real = p => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
      return j.app === 'weshcraft' && (!j.outDir || real(j.outDir) === real(path.resolve(this.dir, this.cfg.out ?? '.'))) ? 'ours' : 'taken';
    } catch (e) {
      const code = e?.cause?.code ?? e?.code;
      return code === 'ECONNREFUSED' ? 'free' : 'taken';
    }
  }

  // The project's port comes from its path; when another project or program holds it, the next
  // ones are tried (PORT_SPAN), and every session looks for the project's server the same way.
  ports() { return this.cfg.autoPort ? Array.from({ length: Bridge.PORT_SPAN }, (_, i) => this.port0 + i) : [this.port0]; }
  use(port) { this.cfg = { ...this.cfg, port }; this.base = `http://127.0.0.1:${port}`; }

  async alive() {
    // Ours, for this project: another program on the port, or another project's WeshCraft, is not.
    for (const port of this.ports()) {
      const st = await this.probe(port);
      if (st === 'ours') { this.use(port); return true; }
      if (st === 'free') return false;
    }
    return false;
  }

  /** Reuse a server another session started, else start one. */
  start() {
    this.ready ??= (async () => {
      for (const port of this.ports()) {
        const st = await this.probe(port);
        if (st === 'ours') { this.use(port); return true; }
        if (st === 'taken') continue;
        this.use(port);
        const child = this.spawnImpl(this.nodePath, [this.bin, ...serveArgs(this.cfg)], { cwd: this.dir, stdio: 'ignore', detached: false, env: process.env });
        this.child = child;
        let exited = false;
        // A spawn that fails (no node on the PATH) must not kill the host.
        child.on?.('error', e => { exited = true; this.child = null; this.ready = null; this.log(`weshcraft server could not start: ${e.message}`); });
        child.on?.('exit', code => { exited = true; if (this.child === child) { this.log(`weshcraft server exited (${code})`); this.child = null; this.ready = null; } });
        // Never outlive OpenCode / OpenChamber (registered once, not once per spawn).
        if (!this.exitHook) { this.exitHook = true; process.once?.('exit', () => this.stop()); }
        for (let i = 0; i < 80; i++) {
          const now = await this.probe(port);
          if (now === 'ours') return true;
          if (exited && now !== 'free') break; // lost the port to someone else meanwhile: next one
          if (exited && i > 6) break;
          await new Promise(r => setTimeout(r, 150));
        }
        if (!exited) throw new Error(`WeshCraft did not start on ${this.base}`);
      }
      throw new Error(`WeshCraft could not find a free port from ${this.port0}`);
    })().catch(e => { this.ready = null; throw e; });
    return this.ready;
  }

  url() { return `${this.base}/${this.cfg.token ? `?token=${this.cfg.token}` : ''}`; }

  async rpc(method, params, signal) {
    await this.start();
    const r = await fetch(`${this.base}/mcp`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params }), signal: signal ?? AbortSignal.timeout(30_000) });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }

  // WeshCraft's one light set of tools (status, read, edit, notes, generate, sync, and new).
  tools() { return this.rpc('tools/list', {}).then(r => (r.tools || []).filter(t => /^weshcraft_/.test(t.name))); }

  /** Call a WeshCraft tool; returns its text (errors as text the model can read). */
  async call(name, args, signal) {
    const r = await this.rpc('tools/call', { name, arguments: args ?? {} }, signal);
    const text = (r.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    return r.isError ? `Error: ${text}` : text;
  }


  stop() { try { this.child?.kill(); } catch { /* already gone */ } }
}

// ---- plugin -----------------------------------------------------------------------------------
const COMMAND_TEXT = `Use the WeshCraft tools for this project.
1. Call weshcraft_status: give me the live link, then in at most 8 lines what the product is (screens, operations, entities, MCP tools), the parity result, what is declared or still suggested (functions, logic, architecture), spec ⇄ code coverage and whether git sync is on.
2. If parity is not ok, call weshcraft_read {what: "parity"} and list what is out of sync with what to change (the design through weshcraft_edit, the OpenAPI document or the MCP server — never the generated sections).
3. List open questions (the "next" items, inferred operations or fields, gaps, open transitions) as numbered questions with a recommended answer.`;

/** OpenCode tool definition (JSON Schema input) for a WeshCraft MCP tool: weshcraft_<name>. */
function toolDef(bridge, t, hooks = {}) {
  const schema = t.inputSchema && typeof t.inputSchema === 'object' ? t.inputSchema : { type: 'object', properties: {} };
  return {
    name: t.name.replace(/^weshcraft_/, ''),
    description: t.description ?? '',
    input: { type: 'object', properties: {}, ...schema, ...(schema.additionalProperties === undefined ? { additionalProperties: false } : {}) },
    options: { namespace: 'weshcraft' },
    execute: async (input, context) => {
      const content = await bridge.call(t.name, input ?? {}, context?.signal);
      // A new design: weshcraft_new leaves the list, the tools that edit it are ready next turn.
      if (t.name === 'weshcraft_new' && !content.startsWith('Error:')) await hooks.refresh?.();
      return { content };
    },
  };
}

/** Build the plugin. `deps` lets tests inject the config, spawn and the bridge. */
export function createPlugin(deps = {}) {
  return {
    id: 'weshcraft',
    async setup(ctx = {}) {
      const dir = ctx.location?.directory || process.cwd();
      const log = m => { try { console.log(`[weshcraft] ${m}`); } catch { /* ignore */ } };
      let cfg = deps.config ?? detectConfig(dir, ctx.options ?? {});
      if (cfg?.error) { log(cfg.error); return undefined; }
      let bridge = null;
      let hasDesign = false;
      const register = async () => {
        bridge ??= deps.bridge ?? new Bridge(dir, cfg, { log, spawnImpl: deps.spawn });
        let defs = [];
        try { defs = await bridge.tools(); } catch (e) { log(`could not start WeshCraft: ${e.message}`); }
        hasDesign = defs.length > 0 && !defs.some(t => t.name === 'weshcraft_new');
        await ctx.tool?.transform?.(editor => {
          editor.namespace({ name: 'weshcraft', description: 'WeshCraft: the design, the product (functions, logic, data, API & MCP, architecture) and specs kept in step, linked to the code, in git. Start with weshcraft_status.' });
          for (const t of defs) editor.add(toolDef(bridge, t, { refresh: async () => { await register(); await ctx.tool?.reload?.(); } }));
        });
      };
      if (cfg) await register();
      else {
        // Nothing to spec yet: no server, one tool to start WeshCraft when the user wants a design.
        await ctx.tool?.transform?.(editor => {
          editor.namespace({ name: 'weshcraft', description: 'WeshCraft: a spec-oriented design tool for this project.' });
          editor.add({
            name: 'new', description: 'Start WeshCraft in this project with a new design (wcraft/design/<name>.figcraft), or connect to the one the user opened in OpenChamber. Call it when the user wants a design, screens, a prototype or specs here; then weshcraft_edit designs and the specs follow every change.',
            input: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false }, options: { namespace: 'weshcraft' },
            execute: async input => {
              cfg = detectConfig(dir, { ...(ctx.options ?? {}), force: true });
              bridge ??= deps.bridge ?? new Bridge(dir, cfg, { log, spawnImpl: deps.spawn });
              await bridge.start();
              const names = await bridge.tools().then(ts => ts.map(t => t.name)).catch(() => []);
              const made = names.includes('weshcraft_new') ? await bridge.call('weshcraft_new', { name: input?.name || 'App' }) : 'the project already has a design';
              await register();
              await ctx.tool?.reload?.();
              watchDesign();
              return { content: `${made} — WeshCraft: ${bridge.url()} — next: weshcraft_status, then weshcraft_edit` };
            },
          });
        });
      }
      await ctx.command?.transform?.(editor => {
        editor.add({
          name: 'weshcraft',
          description: 'WeshCraft: link, parity, links and open questions for this project',
          execute: async ({ sessionID, prompt, delivery }) => {
            await ctx.session.prompt({ ...prompt, sessionID, delivery, text: `${COMMAND_TEXT}${prompt?.text ? `\n\n${prompt.text}` : ''}` });
          },
        });
      });
      // Unload or reload: stop the server this plugin started (one another session started keeps running).
      // Idle project: if the user starts WeshCraft from OpenChamber (or a browser), take its tools
      // without a restart. Cheap: one local HTTP check every few seconds, nothing when the port is free.
      let idleCheck = null;
      const tick = deps.idleCheckMs ?? 4000;
      // No design yet (or not yet loaded when the tools were listed): when one appears, from
      // OpenChamber, a browser or another session, take its design tools without a restart.
      const watchDesign = () => {
        if (hasDesign || idleCheck) return;
        idleCheck = setInterval(async () => {
          if (hasDesign) { clearInterval(idleCheck); idleCheck = null; return; }
          if (!bridge || !(await bridge.alive())) return;
          const names = await bridge.tools().then(ts => ts.map(t => t.name)).catch(() => []);
          if (!names.length || names.includes('weshcraft_new')) return;
          clearInterval(idleCheck); idleCheck = null;
          await register();
          await ctx.tool?.reload?.();
          log('WeshCraft has a design for this project: its tools are ready');
        }, tick);
        idleCheck.unref?.();
      };
      if (!cfg) {
        const probe = new Bridge(dir, detectConfig(dir, { ...(ctx.options ?? {}), force: true }), { log, spawnImpl: deps.spawn });
        idleCheck = setInterval(async () => {
          if (bridge) { clearInterval(idleCheck); idleCheck = null; watchDesign(); return; }
          if (!(await probe.alive())) return;
          clearInterval(idleCheck); idleCheck = null;
          cfg = probe.cfg;
          await register();
          await ctx.tool?.reload?.();
          log('WeshCraft is running for this project: design and spec tools are ready');
          watchDesign();
        }, tick);
        idleCheck.unref?.();
      } else watchDesign();
      return () => { clearInterval(idleCheck); bridge?.stop(); };
    },
  };
}

export default createPlugin();
