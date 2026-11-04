// The WeshCraft workspace: snapshot the prototype, build the front prototype, generate every spec
// as an independent job (run in parallel), optionally enrich them with an agent, then check parity.
// Progress is published on the event bus, which the browser UI streams live.
import fs from 'node:fs';
import path from 'node:path';
import { bus, pool, writeFileSafe } from '../util/common.mjs';
import { buildManifest, emptyModel } from '../model/manifest.mjs';
import { renderPrototype } from '../proto/html.mjs';
import { screenSpec, componentSpec, tokensSpec, tokensCss, flowsSpec } from './front.mjs';
import { domainSpec, apiSpec, openapi, conventionsSpec } from './back.mjs';
import { linksSpec } from './links.mjs';
import { functionsSpec } from './functions.mjs';
import { logicSpec, dataSpec, apiOverviewSpec, architectureSpec } from './aspects.mjs';
import { scanTags, traceOf, graphModule, traceSpec, graphPath, recordedGraphPath } from './trace.mjs';
import { mcpToolSpec, mcpIndexSpec, endpointSpec, apiIndexSpec } from './surface.mjs';
import { readNotes } from './contract.mjs';
import { diffManifests, updateChangelog, summaryLine } from './diff.mjs';
import { agentPrompt, runAgent, sanitizeNotes, DEFAULT_AGENT } from './agent.mjs';
import { checkParity, parityMarkdown } from '../parity/check.mjs';

export class Workspace {
  /**
   * @param {{source: object, outDir: string, concurrency?: number, agent?: boolean|string}} o
   */
  constructor(o) {
    this.source = null;
    this.surface = o.surface ?? null; // MCP server / public API ("front" without screens)
    this.outDir = path.resolve(o.outDir);
    this.concurrency = o.concurrency ?? 6;
    this.agent = o.agent ? (typeof o.agent === 'string' ? o.agent : DEFAULT_AGENT) : null;
    this.jobs = new Map();
    this.manifest = null;
    this.model = null;
    this.report = null;
    this.running = null;
    this.runs = 0;
    this.log = [];
    this.editDelayMs = o.editDelayMs ?? 350;
    this.useSource(o.source ?? null);
  }

  /** Switch the design source; an editable design regenerates the specs shortly after each edit. */
  useSource(src) {
    if (this.source && this.source !== src) { this.offChange?.(); this.source.close?.(); }
    this.source = src;
    this.offChange = null;
    this.emit('source', { source: this.describe().split(`${this.outDir}${path.sep}`).join('') });
    const store = src?.store;
    if (store) {
      const onChange = ev => { this.emit('design', ev); this.schedule(); };
      store.on('change', onChange);
      this.offChange = () => store.off('change', onChange);
    }
  }

  /** Regenerate soon (debounced); an edit that lands during a run triggers one more run after it. */
  schedule(delayMs = this.editDelayMs) {
    this.dirty = true;
    clearTimeout(this.soonTimer);
    this.soonTimer = setTimeout(() => { this.soonTimer = null; this.kick(); }, delayMs);
    this.soonTimer.unref?.();
  }

  kick() {
    if (this.running) { this.running.finally(() => { if (this.dirty && !this.soonTimer) this.kick(); }); return; }
    this.dirty = false;
    this.run().catch(e => this.emit('log', { level: 'error', message: e.message }));
  }

  /** Resolves once every scheduled regeneration has finished. */
  async settled() {
    for (;;) {
      if (this.soonTimer || this.dirty) { await new Promise(r => setTimeout(r, 40)); continue; }
      if (this.running) { await this.running.catch(() => {}); continue; }
      return;
    }
  }

  emit(type, data) {
    const ev = { type, at: Date.now(), ...data };
    if (type === 'log') { this.log.push(ev); if (this.log.length > 200) this.log.shift(); }
    bus.emit('weshcraft', ev);
  }

  file(rel) { return path.join(this.outDir, rel); }

  async snapshot() {
    this.emit('log', { level: 'info', message: `Reading ${this.describe()}` });
    const { model, thumbnail } = this.source ? await this.source.load() : { model: emptyModel(), thumbnail: null };
    const surface = this.surface ? await this.surface.load() : null;
    this.model = model;
    this.surfaceData = surface;
    this.manifest = buildManifest(model, { surface });
    this.thumbnail = thumbnail;
    // What changed since the manifest on disk (the last run, or what git checked out).
    const prevFile = this.file('specs/manifest.json');
    let prev = null;
    try { prev = fs.existsSync(prevFile) ? JSON.parse(fs.readFileSync(prevFile, 'utf8')) : null; } catch { prev = null; }
    if (prev?.source?.hash !== this.manifest.source.hash) {
      this.changes = diffManifests(prev, this.manifest);
      // Not on the very first run into an empty folder: nothing to compare with.
      if (prev) {
        const cf = this.file('specs/CHANGES.md');
        const next = updateChangelog(fs.existsSync(cf) ? fs.readFileSync(cf, 'utf8') : null, this.changes);
        if (next) writeFileSafe(cf, next);
        this.emit('log', { level: 'info', message: `Design changed: ${summaryLine(this.changes)}` });
      }
    } else if (!this.changes) this.changes = { items: [], from: prev?.source?.hash ?? null, to: this.manifest.source.hash };
    writeFileSafe(prevFile, `${JSON.stringify(this.manifest, null, 1)}\n`);
    this.emit('manifest', { summary: this.summary() });
    return this.manifest;
  }

  /** Files that define the product (design + surfaces), with the CLI flag CI needs for each. */
  designInputs() {
    const out = [];
    if (this.source?.file) out.push({ abs: path.resolve(this.source.file), arg: '--file' });
    for (const x of this.surface?.inputs ?? []) if (!out.some(y => y.abs === x.abs)) out.push(x);
    return out;
  }

  describe() {
    return [this.source && this.source.kind !== 'none' ? this.source.describe() : null, this.surface?.describe()].filter(Boolean).join(' + ') || 'nothing';
  }

  summary() {
    const m = this.manifest;
    if (!m) return null;
    return {
      name: m.source.name, hash: m.source.hash,
      screens: m.screens.map(s => ({ key: s.key, name: s.name, id: s.id, width: s.width, height: s.height, devStatus: s.devStatus })),
      components: m.components.length, tokens: m.tokens.variables.length,
      entities: m.domain.entities.length, operations: m.domain.operations.length,
      tools: m.surface?.mcp?.tools.length ?? 0, endpoints: m.surface?.api?.endpoints.length ?? 0, links: m.links.edges.length, gaps: m.links.gaps.length,
    };
  }

  /** Job list for the current manifest. */
  plan() {
    const m = this.manifest;
    const jobs = [];
    jobs.push({ id: 'product:functions', group: 'product', title: 'Functions', file: 'specs/FUNCTIONS.md', build: notes => functionsSpec(m, { notes }) });
    jobs.push({ id: 'product:logic', group: 'product', title: 'Logic', file: 'specs/LOGIC.md', build: notes => logicSpec(m, { notes }) });
    jobs.push({ id: 'product:data', group: 'product', title: 'Data', file: 'specs/DATA.md', build: notes => dataSpec(m, { notes }) });
    jobs.push({ id: 'product:api', group: 'product', title: 'API & MCP', file: 'specs/API.md', build: notes => apiOverviewSpec(m, { notes }) });
    jobs.push({ id: 'product:architecture', group: 'product', title: 'Architecture', file: 'specs/ARCHITECTURE.md', build: notes => architectureSpec(m, { notes }) });
    for (const s of m.screens) jobs.push({ id: `front:screen:${s.key}`, group: 'front', title: `Screen · ${s.name}`, file: `specs/front/screens/${s.key}.md`, fingerprint: s.fingerprint, node: s.id, screen: s.key, build: notes => screenSpec(this.model, m, s, { notes, ops: m.domain.operations, code: this.codeCache?.get(s.id), hasRender: fs.existsSync(this.file(`prototype/screens/${s.key}.png`)) }) });
    for (const c of m.components) jobs.push({ id: `front:component:${c.key}`, group: 'front', title: `Component · ${c.name}`, file: `specs/front/components/${c.key}.md`, fingerprint: c.fingerprint, node: c.id, build: notes => componentSpec(this.model, m, c, { notes, code: this.codeCache?.get(`c${c.id}`) }) });
    if (m.surface?.mcp) {
      jobs.push({ id: 'front:mcp', group: 'front', title: 'MCP server', file: 'specs/front/mcp/README.md', build: notes => mcpIndexSpec(m, { notes }) });
      for (const t of m.surface.mcp.tools) jobs.push({ id: `front:mcp:${t.name}`, group: 'front', title: `MCP · ${t.name}`, file: `specs/front/mcp/${t.key}.md`, node: `tool:${t.name}`, build: notes => mcpToolSpec(m, t, { notes }) });
    }
    if (m.surface?.api) {
      jobs.push({ id: 'front:api', group: 'front', title: 'Public API', file: 'specs/front/api/README.md', build: notes => apiIndexSpec(m, { notes }) });
      for (const ep of m.surface.api.endpoints) jobs.push({ id: `front:api:${ep.key}`, group: 'front', title: `API · ${ep.method} ${ep.path}`, file: `specs/front/api/${ep.key}.md`, node: `ep:${ep.method} ${ep.path}`, build: notes => endpointSpec(m, ep, { notes }) });
    }
    if (m.screens.length || m.tokens.variables.length) jobs.push({ id: 'front:tokens', group: 'front', title: 'Design tokens', file: 'specs/front/tokens.md', build: notes => tokensSpec(m, { notes }), extra: () => [['specs/front/tokens.css', tokensCss(m)]] });
    if (m.screens.length) jobs.push({ id: 'front:flows', group: 'front', title: 'Navigation & flows', file: 'specs/front/flows.md', build: notes => flowsSpec(m, { notes }) });
    jobs.push({ id: 'back:domain', group: 'back', title: 'Domain model', file: 'specs/back/domain.md', build: notes => domainSpec(m, { notes }) });
    jobs.push({ id: 'back:api', group: 'back', title: 'API & OpenAPI', file: 'specs/back/api.md', build: notes => apiSpec(m, { notes }), extra: () => [['specs/back/openapi.json', `${JSON.stringify(openapi(m), null, 2)}\n`]] });
    jobs.push({ id: 'links:map', group: 'links', title: 'Front ⇄ back map', file: 'specs/LINKS.md', build: notes => linksSpec(m, { notes }) });
    jobs.push({ id: 'back:conventions', group: 'back', title: 'Back-end conventions', file: 'specs/back/conventions.md', build: notes => conventionsSpec(m, { notes }) });
    return jobs;
  }

  setJob(job, patch) {
    const cur = { ...(this.jobs.get(job.id) ?? { id: job.id, group: job.group, title: job.title, file: job.file, node: job.node ?? null, screen: job.screen ?? null }), ...patch };
    this.jobs.set(job.id, cur);
    this.emit('job', { job: cur });
    return cur;
  }

  /** FigCraft renders and Dev Mode code, when a live FigCraft is attached. */
  async references() {
    this.codeCache = new Map();
    if (this.source?.kind !== 'mcp') return;
    const m = this.manifest;
    await pool(m.screens, 2, async s => {
      try {
        const png = await this.source.render(s.id, 2);
        if (png) writeFileSafe(this.file(`prototype/screens/${s.key}.png`), png);
        const html = await this.source.code(s.id, 'html');
        if (html) writeFileSafe(this.file(`prototype/figcraft/${s.key}.html`), html);
      } catch (e) { this.emit('log', { level: 'warn', message: `FigCraft render of ${s.name} failed: ${e.message}` }); }
    });
    await pool(m.components, 2, async c => {
      try { const code = await this.source.code(c.id, 'react'); if (code) this.codeCache.set(`c${c.id}`, code); }
      catch { /* component code is optional */ }
    });
  }

  writePrototype() {
    const html = renderPrototype(this.model, this.manifest);
    writeFileSafe(this.file('prototype/index.html'), html);
    writeFileSafe(this.file('prototype/tokens.css'), tokensCss(this.manifest));
    if (this.thumbnail) writeFileSafe(this.file('prototype/thumbnail.png'), this.thumbnail);
    return html;
  }

  async runJob(job, { force }) {
    const target = this.file(job.file);
    const prev = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
    const notes = readNotes(prev);
    let md = job.build(notes);
    // Same output for the same prototype and notes: nothing to write, no agent call.
    const unchanged = prev === md;
    for (const [rel, data] of job.extra?.() ?? []) writeFileSafe(this.file(rel), data);
    if (unchanged && !force) {
      this.setJob(job, { status: 'unchanged', finishedAt: Date.now(), preview: prev });
      return;
    }
    this.setJob(job, { status: 'writing', startedAt: Date.now(), preview: md });
    if (this.agent) {
      this.setJob(job, { status: 'agent', preview: md, agentText: '' });
      let streamed = '';
      try {
        const text = await runAgent(agentPrompt(job, md), chunk => {
          streamed += chunk;
          this.emit('chunk', { id: job.id, chunk });
        }, { cwd: this.outDir, command: this.agent });
        const allowed = new Set([...md.matchAll(/`#(\d+)`/g)].map(x => Number(x[1])));
        md = job.build(sanitizeNotes(text, allowed));
      } catch (e) {
        this.emit('log', { level: 'warn', message: `${job.title}: agent pass skipped (${e.message})` });
      }
      void streamed;
    }
    writeFileSafe(target, md);
    this.setJob(job, { status: 'done', finishedAt: Date.now(), preview: md });
  }

  /** Snapshot + prototype + all specs in parallel + parity. Concurrent calls share one run. */
  run(opts = {}) {
    if (this.running) return this.running;
    this.running = this.#run(opts).finally(() => { this.running = null; });
    return this.running;
  }

  async #run({ force = false } = {}) {
    const t0 = Date.now();
    this.runs++;
    this.emit('run', { status: 'started', run: this.runs });
    await this.snapshot();
    await this.references();
    this.writePrototype();
    this.emit('prototype', { hash: this.manifest.source.hash });
    const jobs = this.plan();
    this.jobs.clear();
    for (const j of jobs) this.setJob(j, { status: 'queued', preview: null, startedAt: null, finishedAt: null, error: null });
    const results = await pool(jobs, this.concurrency, j => this.runJob(j, { force }));
    results.forEach((r, i) => { if (!r.ok) this.setJob(jobs[i], { status: 'failed', error: String(r.error?.message ?? r.error) }); });
    this.removeOrphans();
    this.writeTrace();
    const report = this.check();
    this.writeIndex();
    const ms = Date.now() - t0;
    this.emit('run', { status: 'finished', run: this.runs, ms, ok: report.ok, score: report.score });
    this.emit('log', { level: report.ok ? 'info' : 'warn', message: `Run ${this.runs}: ${jobs.length} specs in ${ms} ms, parity ${report.score}% (${report.errors} errors)` });
    return { jobs: [...this.jobs.values()].map(({ preview, ...j }) => j), report, ms };
  }

  /**
   * Spec ⇄ code: find the `@weshcraft` tags in the project's code, write the product graph code graphs
   * index (weshcraft.graph.mjs next to the design) and specs/TRACE.md + trace.json. Also on demand (weshcraft_trace):
   * code changes do not trigger a run.
   */
  writeTrace() {
    if (!this.manifest) return null;
    const trace = traceOf(this.manifest, scanTags(this.outDir));
    this.trace = trace;
    const put = (rel, text) => { const f = this.file(rel); if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== text) writeFileSafe(f, text); };
    const graphFile = graphPath(this.outDir, this.designInputs());
    // Moved (another design opened): the old graph goes; nothing to trace yet: nothing is written.
    const before = recordedGraphPath(this.outDir);
    if (before !== graphFile) { const old = this.file(before); try { if (fs.readFileSync(old, 'utf8').includes('WeshCraft product graph')) fs.rmSync(old); } catch { /* none */ } }
    this.graphFile = graphFile;
    if (!trace.elements.length) { for (const f of ['specs/TRACE.md', 'specs/trace.json']) fs.rmSync(this.file(f), { force: true }); return trace; }
    put(graphFile, graphModule(this.manifest, trace, { graphFile }));
    put('specs/TRACE.md', `${traceSpec(this.manifest, trace, { graphFile })}\n`);
    put('specs/trace.json', `${JSON.stringify({ graph: graphFile, coverage: trace.coverage, elements: trace.elements.map(e => ({ id: e.id, kind: e.kind, name: e.name, tag: e.kind === 'operation' ? e.refs[1] : e.refs[0], code: e.code.map(t => ({ file: t.file, line: t.line, symbol: t.symbol, lang: t.lang })) })), unknown: trace.unknown.map(t => ({ file: t.file, line: t.line, ref: t.ref })) }, null, 1)}\n`);
    this.emit('trace', { coverage: trace.coverage, unknown: trace.unknown.length });
    return trace;
  }

  /** Specs for screens/components deleted in FigCraft are removed, not left to rot. */
  removeOrphans() {
    const keep = new Set(this.plan().map(j => j.file));
    for (const dir of ['specs/front/screens', 'specs/front/components', 'specs/front/mcp', 'specs/front/api']) {
      const abs = this.file(dir);
      if (!fs.existsSync(abs)) continue;
      for (const f of fs.readdirSync(abs)) {
        if (f.endsWith('.md') && !keep.has(`${dir}/${f}`)) {
          fs.rmSync(path.join(abs, f));
          this.emit('log', { level: 'info', message: `Removed ${dir}/${f}: no longer in the prototype` });
        }
      }
    }
  }

  check() {
    const report = checkParity(this.manifest, this.outDir, { graphFile: this.graphFile });
    this.report = report;
    writeFileSafe(this.file('specs/PARITY.md'), parityMarkdown(report, this.manifest));
    writeFileSafe(this.file('specs/parity.json'), `${JSON.stringify(report, null, 1)}\n`);
    this.emit('parity', { report });
    return report;
  }

  writeIndex() {
    const m = this.manifest;
    const L = [`# ${m.source.name} — specifications`, ''];
    const from = [m.screens.length ? 'the FigCraft prototype' : null, m.surface?.mcp ? 'the MCP server' : null, m.surface?.api ? 'the public API' : null].filter(Boolean).join(', ');
    L.push(`Generated by WeshCraft from ${from || 'the design'} \`${m.source.hash}\`. Parity: ${this.report.ok ? '✅ in sync' : '❌ out of sync'} (${this.report.score}%, see [PARITY.md](PARITY.md)).`);
    L.push('');
    L.push(`- ${m.screens.length ? 'Clickable prototype' : 'Interface catalog'}: [\`prototype/index.html\`](../prototype/index.html)`);
    L.push('- Manifest (machine-readable inventory): [`manifest.json`](manifest.json)');
    L.push('');
    L.push('## Front end');
    L.push('');
    if (m.screens.length) {
      L.push('| Screen | Size | Texts | Interactions | Back-end calls |');
      L.push('|---|---|---|---|---|');
      for (const s of m.screens) L.push(`| [${s.name}](front/screens/${s.key}.md) | ${s.width}×${s.height} | ${s.texts.length} | ${s.actions.length} | ${m.domain.operations.filter(o => o.screen === s.key).map(o => `\`${o.method} ${o.path}\``).join(', ') || '—'} |`);
      L.push('');
    }
    if (m.surface?.mcp) { L.push(`- [MCP server](front/mcp/README.md): ${m.surface.mcp.tools.map(t => `[\`${t.name}\`](front/mcp/${t.key}.md)`).join(' · ')}`); }
    if (m.surface?.api) { L.push(`- [Public API](front/api/README.md): ${m.surface.api.endpoints.length} endpoints`); }
    if (m.surface) L.push('');
    if (m.components.length) {
      L.push('Components: ' + m.components.map(c => `[${c.name}](front/components/${c.key}.md)`).join(' · '));
      L.push('');
    }
    if (m.screens.length) L.push('Also: [design tokens](front/tokens.md) ([CSS](front/tokens.css)) · [navigation & flows](front/flows.md)');
    L.push('');
    const { edges, gaps } = m.links;
    L.push(`## Front ⇄ back`);
    L.push('');
    L.push(`[LINKS.md](LINKS.md): ${edges.filter(e => e.op).length} operation links, ${edges.filter(e => e.field).length} data links, ${gaps.length} gap${gaps.length === 1 ? '' : 's'}.`);
    L.push('');
    L.push('## Back end');
    L.push('');
    L.push('[Domain model](back/domain.md) · [API](back/api.md) ([OpenAPI](back/openapi.json)) · [Conventions](back/conventions.md)');
    L.push('');
    writeFileSafe(this.file('specs/README.md'), `${L.join('\n')}\n`);
  }

  state() {
    return {
      summary: this.summary(),
      jobs: [...this.jobs.values()],
      report: this.report,
      running: !!this.running,
      agent: this.agent,
      source: this.describe(),
      sourceKind: this.source?.kind ?? 'none',
      log: this.log.slice(-50),
    };
  }
}
