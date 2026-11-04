// WeshCraft's MCP server: one light set of tools for the whole product (toolset.mjs): status, read,
// edit, notes, generate, sync (and new). WeshCraft edits the .figcraft document itself: no FigCraft app
// and no second set of tools. Every design change triggers a debounced spec run, so specs follow live.
// Transports: newline-delimited JSON-RPC over stdio, and Streamable HTTP (POST /mcp) in `serve`.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { readNotes } from '../spec/contract.mjs';
import { collectFiles, prBody, publish } from '../publish/git.mjs';
import { parseTarget } from '../publish/sync.mjs';
import { resolveToken } from '../publish/credentials.mjs';
import { callDesignTool } from '../design/tools.mjs';
import { PUBLIC_TOOLS, NEW_TOOL, callPublic } from './toolset.mjs';

const PROTOCOL = '2025-06-18';

const text = (t, isError = false) => ({ content: [{ type: 'text', text: typeof t === 'string' ? t : JSON.stringify(t, null, 1) }], isError });

const SPEC_TOOLS = [
  { name: 'weshcraft_status', description: 'Prototype summary, every spec job with its status, and the parity result.', inputSchema: { type: 'object', properties: {} } },
  { name: 'weshcraft_generate', description: 'Snapshot the design, rebuild the front prototype and regenerate every front/back spec in parallel, then check parity. Unchanged specs are skipped unless force is true.', inputSchema: { type: 'object', properties: { force: { type: 'boolean' } } } },
  { name: 'weshcraft_check', description: 'Check that specs and prototype match the current design exactly. Returns issues with file, node and fix hint.', inputSchema: { type: 'object', properties: {} } },
  { name: 'weshcraft_manifest', description: 'The proto manifest (screens, texts, interactions, components, tokens, flows, domain, operations), or one screen of it.', inputSchema: { type: 'object', properties: { screen: { type: 'string', description: 'screen key, e.g. scr-home' } } } },
  { name: 'weshcraft_trace', description: 'Spec ⇄ code: which code implements each function, screen, component, operation, entity and MCP tool, found from `@weshcraft <ref>` tags in comments next to the symbol (`// @weshcraft scr-sign-up`, `# @weshcraft POST /users`; the ref is in each spec header). Rescans the code and rewrites design/weshcraft.graph.mjs (the product graph codegraph indexes: codegraph explore "how does <function> work", codegraph impact <symbol>) and specs/TRACE.md. Call it after implementing or moving code. Filter with function (key or name) or untraced:true for what has no code yet.', inputSchema: { type: 'object', properties: { function: { type: 'string' }, untraced: { type: 'boolean' } } } },
  { name: 'weshcraft_spec_folders', description: 'The specs in folders (the Specs panel, specs/README.md, saved in .weshcraft.json). Without arguments: the folder tree with each spec\'s id and title. With tree: {folders: [{name, folders, items: [spec ids]}], items: [spec ids]} replaces it (specs left out go back to their default folder).', inputSchema: { type: 'object', properties: { tree: { type: 'object' } } } },
  { name: 'weshcraft_links', description: 'Front ⇄ back links: which layers trigger or submit to which operation, which layers show which entity field and which operation loads it, plus gaps. Filter by screen key, operation key or Entity.field.', inputSchema: { type: 'object', properties: { screen: { type: 'string' }, op: { type: 'string' }, field: { type: 'string' } } } },
  { name: 'weshcraft_read_spec', description: 'Read a generated file, e.g. specs/front/screens/scr-home.md or specs/back/api.md.', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  { name: 'weshcraft_write_notes', description: 'Replace the Notes block of one spec (states, edge cases, a11y, analytics, open questions). Generated sections are not editable: change the design instead (design_* tools). Cite layers as `#id`.', inputSchema: { type: 'object', properties: { path: { type: 'string' }, notes: { type: 'string' } }, required: ['path', 'notes'] } },
  { name: 'weshcraft_sync', description: 'Sync prototype + specs to git now, and optionally set the target: github:owner/repo[@branch] or gitlab:group/project[@branch] (API commit to a branch, PR/MR opened once then updated), or git[@branch] (commit in the local repository holding the output folder; push optional). auto: also sync after every in-sync regeneration.', inputSchema: { type: 'object', properties: { target: { type: 'string' }, auto: { type: 'boolean' }, pr: { type: 'boolean' }, push: { type: 'boolean' }, base: { type: 'string' }, apiUrl: { type: 'string' } } } },
  { name: 'weshcraft_publish', description: 'Commit prototype + specs (+ CI parity check and the .figcraft source) to a branch and open or update a GitHub PR / GitLab MR. Access is inherited (OpenChamber account, gh/glab login, git credentials, GITHUB_TOKEN/GITLAB_TOKEN).', inputSchema: { type: 'object', properties: { provider: { type: 'string', enum: ['github', 'gitlab'] }, repo: { type: 'string', description: 'owner/name (GitHub) or group/project (GitLab)' }, branch: { type: 'string' }, base: { type: 'string' }, title: { type: 'string' }, apiUrl: { type: 'string' } }, required: ['provider', 'repo'] } },
];

export class WeshCraftMcp {
  /** @param {{workspace: import('../spec/workspace.mjs').Workspace, autoRun?: boolean, debounceMs?: number, webUrl?: string}} o */
  constructor(o) {
    this.ws = o.workspace;
    this.autoRun = o.autoRun ?? true;
    this.debounceMs = o.debounceMs ?? 1500;
    this.webUrl = o.webUrl ?? null;
    this.timer = null;
    this.figcraftTools = null;
    this.syncer = o.syncer ?? null;
  }

  /** One light set of tools (toolset.mjs); the finer ones behind it answer by name but are not listed. */
  async tools() {
    return this.ws.source ? [...PUBLIC_TOOLS] : [...PUBLIC_TOOLS, NEW_TOOL];
  }

  scheduleRun() {
    if (!this.autoRun) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.ws.run().catch(e => this.ws.emit('log', { level: 'error', message: e.message })), this.debounceMs);
    this.timer.unref?.();
  }

  safePath(p) {
    const abs = path.resolve(this.ws.outDir, String(p || ''));
    if (!abs.startsWith(this.ws.outDir + path.sep)) throw new Error('path must stay inside the WeshCraft output folder');
    return abs;
  }

  /** `internal`: the finer tool of that name, not the public one (the public ones call them). */
  async callTool(name, args = {}, { internal = false } = {}) {
    try {
      if (!internal) { const pub = await callPublic(this, name, args); if (pub) return pub; }
      if (name.startsWith('design_')) return await callDesignTool(this.ws, name, args);
      switch (name) {
        case 'weshcraft_status': return text({ ...this.ws.state(), log: undefined, jobs: this.ws.state().jobs.map(({ preview, ...j }) => j), web: this.webUrl, sync: this.syncer?.status() ?? null });
        case 'weshcraft_generate': {
          const r = await this.ws.run({ force: !!args.force });
          return text({ ms: r.ms, parity: { ok: r.report.ok, score: r.report.score, errors: r.report.errors, issues: r.report.issues.slice(0, 30) }, jobs: r.jobs.map(j => `${j.status} ${j.file}`), web: this.webUrl });
        }
        case 'weshcraft_check': {
          await this.ws.snapshot();
          const r = this.ws.check();
          return text({ ok: r.ok, score: r.score, checks: r.checks, issues: r.issues, hint: r.ok ? 'in sync' : 'run weshcraft_generate to rewrite stale specs; dangling references and copy differences mean the design changed' });
        }
        case 'weshcraft_manifest': {
          if (!this.ws.manifest) await this.ws.snapshot();
          const m = this.ws.manifest;
          if (args.screen) {
            const s = m.screens.find(x => x.key === args.screen || x.name === args.screen);
            return s ? text(s) : text(`no screen ${args.screen}; screens: ${m.screens.map(x => x.key).join(', ')}`, true);
          }
          return text(m);
        }
        case 'weshcraft_trace': {
          if (!this.ws.manifest) await this.ws.run();
          const tr = this.ws.writeTrace();
          const fns = this.ws.manifest.functions?.items ?? [];
          const fn = args.function ? fns.find(f => f.key === args.function || f.name.toLowerCase() === String(args.function).toLowerCase()) : null;
          if (args.function && !fn) return text(`no function ${args.function}: ${fns.map(f => f.name).join(', ')}`, true);
          const inFn = id => !fn || id === fn.key || fn.screens.includes(id) || fn.operations.includes(id) || fn.tools.some(t => `tool:${t}` === id) || fn.entities.some(e => `entity:${e.name}` === id);
          const els = tr.elements.filter(e => inFn(e.id) && (!args.untraced || (!e.code.length && e.kind !== 'function')));
          return text({
            coverage: tr.coverage, graph: this.ws.graphFile, map: 'specs/TRACE.md',
            elements: els.map(e => ({ kind: e.kind, name: e.name, tag: `@weshcraft ${e.kind === 'operation' ? e.refs[1] : e.refs[0]}`, spec: e.spec, code: e.code.map(t => `${t.file}:${t.line}${t.symbol ? ` ${t.symbol}` : ''}`) })),
            ...(tr.unknown.length ? { tagsPointingNowhere: tr.unknown.map(t => `${t.file}:${t.line} @weshcraft ${t.ref}`) } : {}),
          });
        }
        case 'weshcraft_spec_folders': {
          if (!this.ws.manifest) await this.ws.run();
          const r = args.tree ? this.ws.setSpecTree(args.tree) : this.ws.specTree();
          const show = f => ({ ...(f.name ? { name: f.name } : {}), ...(f.items.length ? { items: f.items.map(id => `${id} (${r.titles[id].title})`) } : {}), ...(f.folders.length ? { folders: f.folders.map(show) } : {}) });
          return text(show(r.tree));
        }
        case 'weshcraft_links': {
          if (!this.ws.manifest) await this.ws.snapshot();
          const { edges, gaps } = this.ws.manifest.links;
          const pick = e => (!args.screen || e.screen === args.screen) && (!args.op || e.op === args.op || e.via === args.op) && (!args.field || e.field === args.field);
          const ops = this.ws.manifest.domain.operations.filter(o => !args.op || o.key === args.op).map(o => ({ key: o.key, method: o.method, path: o.path, screen: o.screen, entity: o.entity, confidence: o.confidence }));
          return text({ edges: edges.filter(pick), operations: ops, gaps: gaps.filter(g => (!args.screen || g.screen === args.screen) && (!args.field || g.field === args.field) && (!args.op || g.op === args.op)) });
        }
        case 'weshcraft_read_spec': {
          const abs = this.safePath(args.path);
          return fs.existsSync(abs) ? text(fs.readFileSync(abs, 'utf8')) : text(`not found: ${args.path}`, true);
        }
        case 'weshcraft_write_notes': {
          const abs = this.safePath(args.path);
          if (!fs.existsSync(abs)) return text(`not found: ${args.path}`, true);
          const md = fs.readFileSync(abs, 'utf8');
          if (readNotes(md) == null) return text('this file has no Notes block', true);
          const next = md.replace(/(<!-- weshcraft:notes:start -->\n)[\s\S]*?(\n<!-- weshcraft:notes:end -->)/, (_, a, b) => `${a}${String(args.notes).replace(/<!--[\s\S]*?-->/g, '').trim()}${b}`);
          fs.writeFileSync(abs, next);
          const job = [...this.ws.jobs.values()].find(j => j.file === path.relative(this.ws.outDir, abs).split(path.sep).join('/'));
          if (job) this.ws.setJob(job, { status: 'done', preview: next, finishedAt: Date.now() });
          const r = this.ws.manifest ? this.ws.check() : null;
          return text({ written: args.path, parity: r && { ok: r.ok, score: r.score, issues: r.issues.filter(i => i.file === args.path) } });
        }
        case 'weshcraft_sync': {
          if (!this.syncer) return text('sync is not available in this server', true);
          if (args.target) this.syncer.configure(parseTarget(args.target, { auto: args.auto ?? true, pr: args.pr, push: args.push, base: args.base, apiUrl: args.apiUrl }));
          else if (this.syncer.target) Object.assign(this.syncer.target, Object.fromEntries(Object.entries({ auto: args.auto, pr: args.pr, push: args.push }).filter(([, v]) => v !== undefined)));
          const result = await this.syncer.sync();
          return text({ result, status: this.syncer.status() });
        }
        case 'weshcraft_publish': return text(await this.publish(args));
        default: return text(`unknown tool ${name}`, true);
      }
    } catch (e) {
      return text(e.message, true);
    }
  }

  async publish(args) {
    if (!this.ws.report) await this.ws.run();
    const provider = args.provider === 'gitlab' ? 'gitlab' : 'github';
    const kind = provider;
    const token = (await resolveToken(provider, { apiUrl: args.apiUrl, explicit: args.token })).token;
    if (!token) throw new Error(`no ${kind === 'gitlab' ? 'GitLab' : 'GitHub'} access: sign in in OpenChamber (Settings › Integrations), run \`${kind === 'gitlab' ? 'glab' : 'gh'} auth login\`, set ${kind === 'gitlab' ? 'GITLAB_TOKEN' : 'GITHUB_TOKEN'}, or enter a token`);
    const m = this.ws.manifest;
    const files = collectFiles(this.ws.outDir, { provider, designInputs: this.ws.designInputs(), prefix: args.prefix || '' });
    const res = await publish(provider, {
      repo: args.repo, token, branch: args.branch || `weshcraft/${m.source.hash}`, base: args.base, apiUrl: args.apiUrl,
      title: args.title || `Specs: ${m.source.name} (${m.screens.length} screens, parity ${this.ws.report.score}%)`,
      body: prBody(this.ws.report, m), files,
      message: `docs(specs): ${m.source.name} prototype ${m.source.hash}\n\nGenerated by WeshCraft from the FigCraft prototype.`,
    });
    this.ws.emit('published', { result: res });
    return res;
  }

  /** Handle one JSON-RPC message; returns the response object or null for notifications. */
  async handle(msg) {
    const { id, method, params } = msg ?? {};
    const reply = result => (id == null ? null : { jsonrpc: '2.0', id, result });
    const fail = (code, message) => (id == null ? null : { jsonrpc: '2.0', id, error: { code, message } });
    if (msg?.jsonrpc !== '2.0' || typeof method !== 'string') return fail(-32600, 'invalid request');
    switch (method) {
      case 'initialize':
        return reply({
          protocolVersion: [PROTOCOL, '2025-03-26', '2024-11-05'].includes(params?.protocolVersion) ? params.protocolVersion : PROTOCOL,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'weshcraft', version: '0.1.0' },
          instructions: [
            'WeshCraft: a design, the product it describes (functions, logic, data, API & MCP, architecture) and specs kept in step with both, linked to the code. Seven tools:',
            '- weshcraft_status first: where things stand, what to do next.',
            '- weshcraft_read {what}: tree / find / layer / tokens / screenshot of the design; functions, logic, data, api, architecture, links, trace of the product; spec, folders, manifest, parity.',
            this.ws.source?.store ? '- weshcraft_edit {ops}: every change in one batch and one undo step (layers, copy, links, bindings, API calls, tokens; functions, rules, lifecycles, components; spec folders). Read the tree for ids first; wait:true returns parity.'
              : this.ws.source ? '- The design is not editable here (live FigCraft or --read-only): read only.'
              : '- weshcraft_new starts a design (or the project is an API / MCP service only), then weshcraft_edit.',
            '- weshcraft_notes for what the design cannot say; weshcraft_generate to regenerate now (also after code changes); weshcraft_sync for git, GitHub and GitLab.',
            'Facts in specs come from the design: change the design, not the specs. Declare what is suggested or inferred (functions, logic, architecture). Tag code with `// @weshcraft <ref>` (each spec header gives it).',
            this.webUrl ? `Live view: ${this.webUrl}` : '',
          ].filter(Boolean).join('\n'),
        });
      case 'notifications/initialized':
      case 'notifications/cancelled':
        return null;
      case 'ping': return reply({});
      case 'tools/list': return reply({ tools: await this.tools() });
      case 'tools/call': return reply(await this.callTool(params?.name, params?.arguments ?? {}));
      default: return fail(-32601, `method not found: ${method}`);
    }
  }

  /** stdio transport (for `claude mcp add weshcraft -- weshcraft mcp ...`). */
  serveStdio(input = process.stdin, output = process.stdout) {
    const rl = readline.createInterface({ input, crlfDelay: Infinity });
    rl.on('line', async line => {
      if (!line.trim()) return;
      let msg;
      try { msg = JSON.parse(line); } catch { output.write(`${JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })}\n`); return; }
      const res = await this.handle(msg);
      if (res) output.write(`${JSON.stringify(res)}\n`);
    });
    return rl;
  }
}
