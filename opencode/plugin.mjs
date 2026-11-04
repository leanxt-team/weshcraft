// WeshCraft for OpenCode 2 (2.2+) and OpenChamber, which runs on the OpenCode server.
//
// In a project with a design (design/*.figcraft) and/or a non-visual front (weshcraft.surface.json,
// openapi.*, design/*.mcp.json), configured by .opencode/weshcraft.json or the plugin's options:
//   - starts `weshcraft serve` for the project (one per project, stable port, reused by sessions);
//     its own file watcher regenerates the specs when a design, OpenAPI or MCP file changes
//   - registers the WeshCraft tools by proxying the server's MCP endpoint: `design_*` (edit the
//     design: tree, find, edit, text, bind, api, link, screens, tokens, undo), `weshcraft_*` (specs,
//     parity, links, sync, publish, weshcraft_open) and `figcraft_*` when a live FigCraft is attached
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
  // The project's design: the one chosen before, design/*.figcraft, or the only one in the repo.
  if (!cfg.file && !cfg.attach && !cfg.mcp) { const found = projectDesign(dir); if (found) cfg.file = found.file; }
  if (fs.existsSync(file)) {
    try { cfg = { ...cfg, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch (e) { return { error: `.opencode/weshcraft.json: ${e.message}` }; }
  }
  const exists = p => fs.existsSync(path.join(dir, p));
  const list = d => (exists(d) ? fs.readdirSync(path.join(dir, d)).map(n => path.posix.join(d, n)) : []);
  const candidates = [...list('.'), ...list('design'), ...list('api')].map(p => p.replace(/^\.\//, ''));
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
  constructor(dir, cfg, { log = () => {}, spawnImpl = spawn, nodePath = NODE_BIN, bin = BIN } = {}) {
    Object.assign(this, { dir, cfg, log, spawnImpl, nodePath, bin });
    this.base = `http://127.0.0.1:${cfg.port}`;
    this.child = null;
    this.ready = null;
    this.id = 0;
  }

  headers() { return { 'Content-Type': 'application/json', ...(this.cfg.token ? { Authorization: `Bearer ${this.cfg.token}` } : {}) }; }

  async alive() {
    // Ours, for this project: another program on the port, or another project's WeshCraft, is not.
    try {
      const r = await fetch(`${this.base}/api/ping`, { headers: this.headers(), signal: AbortSignal.timeout(1500) });
      if (!r.ok) return false;
      const j = await r.json();
      const real = p => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
      return j.app === 'weshcraft' && (!j.outDir || real(j.outDir) === real(path.resolve(this.dir, this.cfg.out ?? '.')));
    } catch { return false; }
  }

  /** Reuse a server another session started, else start one. */
  start() {
    this.ready ??= (async () => {
      if (await this.alive()) return true;
      this.child = this.spawnImpl(this.nodePath, [this.bin, ...serveArgs(this.cfg)], { cwd: this.dir, stdio: 'ignore', detached: false, env: process.env });
      this.child.on?.('exit', code => { this.log(`weshcraft server exited (${code})`); this.child = null; this.ready = null; });
      // Never outlive OpenCode / OpenChamber.
      process.once?.('exit', () => this.stop());
      for (let i = 0; i < 60; i++) { if (await this.alive()) return true; await new Promise(r => setTimeout(r, 150)); }
      throw new Error(`WeshCraft did not start on ${this.base}`);
    })().catch(e => { this.ready = null; throw e; });
    return this.ready;
  }

  url() { return `${this.base}/${this.cfg.token ? `?token=${this.cfg.token}` : ''}`; }

  async rpc(method, params, signal) {
    await this.start();
    const r = await fetch(`${this.base}/mcp`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ jsonrpc: '2.0', id: ++this.id, method, params }), signal });
    const j = await r.json();
    if (j.error) throw new Error(j.error.message);
    return j.result;
  }

  // WeshCraft's design and spec tools, and FigCraft's when a live FigCraft is attached. A PNG does
  // not travel as an OpenCode tool result: design_screenshot stays MCP-only.
  tools() { return this.rpc('tools/list', {}).then(r => (r.tools || []).filter(t => /^(weshcraft|figcraft|design)_/.test(t.name) && t.name !== 'design_screenshot')); }

  /** Call a WeshCraft tool; returns its text (errors as text the model can read). */
  async call(name, args, signal) {
    const r = await this.rpc('tools/call', { name, arguments: args ?? {} }, signal);
    const text = (r.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    return r.isError ? `Error: ${text}` : text;
  }


  stop() { try { this.child?.kill(); } catch { /* already gone */ } }
}

// ---- plugin -----------------------------------------------------------------------------------
const OPEN_TOOL = {
  name: 'weshcraft_open',
  description: 'The WeshCraft browser view for this project: clickable prototype or MCP/API catalog, spec builder, front ⇄ back map, parity, publish & sync. Returns the link to give the user.',
  inputSchema: { type: 'object', properties: {} },
};

const COMMAND_TEXT = `Use the WeshCraft tools for this project.
1. Call weshcraft_open and give me the link (it has the design editor, prototype and live specs).
2. Call weshcraft_status. In at most 8 lines: what the front is (screens, MCP tools, endpoints), the parity result, front ⇄ back links and gaps, and whether git sync is on.
3. If parity is not ok, call weshcraft_generate, then weshcraft_check, and list what is still out of sync with what to change (the design through design_edit, the OpenAPI document or the MCP server — never the generated sections).
4. List open questions from the specs (inferred operations or fields, gaps) as numbered questions with a recommended answer.`;

/** OpenCode tool definition (JSON Schema input) for a WeshCraft/FigCraft MCP tool. */
function toolDef(bridge, t, hooks = {}) {
  const [, ns, rest] = /^(weshcraft|figcraft|design)_(.+)$/.exec(t.name);
  const schema = t.inputSchema && typeof t.inputSchema === 'object' ? t.inputSchema : { type: 'object', properties: {} };
  return {
    name: rest,
    description: t.description ?? '',
    input: { type: 'object', properties: {}, ...schema, ...(schema.additionalProperties === undefined && ns !== 'figcraft' ? { additionalProperties: false } : {}) },
    options: { namespace: ns },
    execute: async (input, context) => {
      if (t.name === 'weshcraft_open') { await bridge.start(); return { content: `WeshCraft: ${bridge.url()}` }; }
      const content = await bridge.call(t.name, input ?? {}, context?.signal);
      // A new design brings the design_* editing tools: register them for the next turn.
      if (t.name === 'design_new' && !content.startsWith('Error:')) await hooks.refresh?.();
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
      const register = async () => {
        bridge ??= deps.bridge ?? new Bridge(dir, cfg, { log, spawnImpl: deps.spawn });
        let defs = [OPEN_TOOL];
        try { defs = [OPEN_TOOL, ...(await bridge.tools())]; } catch (e) { log(`could not start WeshCraft: ${e.message}`); }
        await ctx.tool?.transform?.(editor => {
          editor.namespace({ name: 'weshcraft', description: 'WeshCraft: specs that match the prototype, the MCP server and the API of this project, kept in sync and in git.' });
          if (defs.some(t => t.name.startsWith('design_'))) editor.namespace({ name: 'design', description: 'Edit this project\'s design (a FigCraft document) the way a designer would: every change regenerates the specs; the user sees it live in WeshCraft.' });
          if (defs.some(t => t.name.startsWith('figcraft_'))) editor.namespace({ name: 'figcraft', description: 'FigCraft design tools (live FigCraft attached to WeshCraft): edits regenerate the specs.' });
          for (const t of defs) editor.add(toolDef(bridge, t, { refresh: async () => { await register(); await ctx.tool?.reload?.(); } }));
        });
      };
      if (cfg) await register();
      else {
        // Nothing to spec yet: no server, one tool to start WeshCraft when the user wants a design.
        await ctx.tool?.transform?.(editor => {
          editor.namespace({ name: 'weshcraft', description: 'WeshCraft: a spec-oriented FigCraft for this project.' });
          editor.add({
            name: 'start', description: 'Start WeshCraft in this project, or connect to the one the user opened in OpenChamber. Call it whenever the user talks about a design, screens, a prototype or specs here: then design_new creates the design (or design_* edits the one the user started) and the specs follow every change.',
            input: { type: 'object', properties: {}, additionalProperties: false }, options: { namespace: 'weshcraft' },
            execute: async () => {
              cfg = detectConfig(dir, { ...(ctx.options ?? {}), force: true });
              await register();
              await ctx.tool?.reload?.();
              return { content: `WeshCraft started: ${bridge.url()} — next: design_new {name}` };
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
      if (!cfg) {
        const probe = new Bridge(dir, detectConfig(dir, { ...(ctx.options ?? {}), force: true }), { log, spawnImpl: deps.spawn });
        idleCheck = setInterval(async () => {
          if (bridge || !(await probe.alive())) return;
          clearInterval(idleCheck);
          cfg = probe.cfg;
          await register();
          await ctx.tool?.reload?.();
          log('WeshCraft is running for this project: design and spec tools are ready');
        }, deps.idleCheckMs ?? 4000);
        idleCheck.unref?.();
      }
      return () => { clearInterval(idleCheck); bridge?.stop(); };
    },
  };
}

export default createPlugin();
