// The WeshCraft workspace: snapshot the prototype, build the front prototype, generate every spec
// as an independent job (run in parallel), optionally enrich them with an agent, then check parity.
// Progress is published on the event bus, which the browser UI streams live.
import fs from 'node:fs';
import path from 'node:path';
import { bus, pool, writeFileSafe } from '../util/common.mjs';
import { buildManifest } from '../model/manifest.mjs';
import { renderPrototype } from '../proto/html.mjs';
import { screenSpec, componentSpec, tokensSpec, tokensCss, flowsSpec } from './front.mjs';
import { domainSpec, apiSpec, openapi, conventionsSpec } from './back.mjs';
import { readNotes } from './contract.mjs';
import { agentPrompt, runAgent, sanitizeNotes, DEFAULT_AGENT } from './agent.mjs';
import { checkParity, parityMarkdown } from '../parity/check.mjs';

export class Workspace {
  /**
   * @param {{source: object, outDir: string, concurrency?: number, agent?: boolean|string}} o
   */
  constructor(o) {
    this.source = o.source;
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
  }

  emit(type, data) {
    const ev = { type, at: Date.now(), ...data };
    if (type === 'log') { this.log.push(ev); if (this.log.length > 200) this.log.shift(); }
    bus.emit('weshcraft', ev);
  }

  file(rel) { return path.join(this.outDir, rel); }

  async snapshot() {
    this.emit('log', { level: 'info', message: `Reading prototype from ${this.source.describe()}` });
    const { model, thumbnail } = await this.source.load();
    this.model = model;
    this.manifest = buildManifest(model);
    this.thumbnail = thumbnail;
    writeFileSafe(this.file('specs/manifest.json'), `${JSON.stringify(this.manifest, null, 1)}\n`);
    this.emit('manifest', { summary: this.summary() });
    return this.manifest;
  }

  summary() {
    const m = this.manifest;
    if (!m) return null;
    return {
      name: m.source.name, hash: m.source.hash,
      screens: m.screens.map(s => ({ key: s.key, name: s.name, id: s.id, width: s.width, height: s.height, devStatus: s.devStatus })),
      components: m.components.length, tokens: m.tokens.variables.length,
      entities: m.domain.entities.length, operations: m.domain.operations.length,
    };
  }

  /** Job list for the current manifest. */
  plan() {
    const m = this.manifest;
    const jobs = [];
    for (const s of m.screens) jobs.push({ id: `front:screen:${s.key}`, group: 'front', title: `Screen · ${s.name}`, file: `specs/front/screens/${s.key}.md`, fingerprint: s.fingerprint, node: s.id, screen: s.key, build: notes => screenSpec(this.model, m, s, { notes, ops: m.domain.operations, code: this.codeCache?.get(s.id), hasRender: fs.existsSync(this.file(`prototype/screens/${s.key}.png`)) }) });
    for (const c of m.components) jobs.push({ id: `front:component:${c.key}`, group: 'front', title: `Component · ${c.name}`, file: `specs/front/components/${c.key}.md`, fingerprint: c.fingerprint, node: c.id, build: notes => componentSpec(this.model, m, c, { notes, code: this.codeCache?.get(`c${c.id}`) }) });
    jobs.push({ id: 'front:tokens', group: 'front', title: 'Design tokens', file: 'specs/front/tokens.md', build: notes => tokensSpec(m, { notes }), extra: () => [['specs/front/tokens.css', tokensCss(m)]] });
    jobs.push({ id: 'front:flows', group: 'front', title: 'Navigation & flows', file: 'specs/front/flows.md', build: notes => flowsSpec(m, { notes }) });
    jobs.push({ id: 'back:domain', group: 'back', title: 'Domain model', file: 'specs/back/domain.md', build: notes => domainSpec(m, { notes }) });
    jobs.push({ id: 'back:api', group: 'back', title: 'API & OpenAPI', file: 'specs/back/api.md', build: notes => apiSpec(m, { notes }), extra: () => [['specs/back/openapi.json', `${JSON.stringify(openapi(m), null, 2)}\n`]] });
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
    if (this.source.kind !== 'mcp') return;
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
    const report = this.check();
    this.writeIndex();
    const ms = Date.now() - t0;
    this.emit('run', { status: 'finished', run: this.runs, ms, ok: report.ok, score: report.score });
    this.emit('log', { level: report.ok ? 'info' : 'warn', message: `Run ${this.runs}: ${jobs.length} specs in ${ms} ms, parity ${report.score}% (${report.errors} errors)` });
    return { jobs: [...this.jobs.values()].map(({ preview, ...j }) => j), report, ms };
  }

  /** Specs for screens/components deleted in FigCraft are removed, not left to rot. */
  removeOrphans() {
    const keep = new Set(this.plan().map(j => j.file));
    for (const dir of ['specs/front/screens', 'specs/front/components']) {
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
    const report = checkParity(this.manifest, this.outDir);
    this.report = report;
    writeFileSafe(this.file('specs/PARITY.md'), parityMarkdown(report, this.manifest));
    writeFileSafe(this.file('specs/parity.json'), `${JSON.stringify(report, null, 1)}\n`);
    this.emit('parity', { report });
    return report;
  }

  writeIndex() {
    const m = this.manifest;
    const L = [`# ${m.source.name} — specifications`, ''];
    L.push(`Generated by [WeshCraft](https://github.com/) from the FigCraft prototype \`${m.source.hash}\`. Parity: ${this.report.ok ? '✅ in sync' : '❌ out of sync'} (${this.report.score}%, see [PARITY.md](PARITY.md)).`);
    L.push('');
    L.push('- Clickable prototype: [`prototype/index.html`](../prototype/index.html)');
    L.push('- Manifest (machine-readable inventory of the prototype): [`manifest.json`](manifest.json)');
    L.push('');
    L.push('## Front end');
    L.push('');
    L.push('| Screen | Size | Texts | Interactions | Back-end calls |');
    L.push('|---|---|---|---|---|');
    for (const s of m.screens) L.push(`| [${s.name}](front/screens/${s.key}.md) | ${s.width}×${s.height} | ${s.texts.length} | ${s.actions.length} | ${m.domain.operations.filter(o => o.screen === s.key).map(o => `\`${o.method} ${o.path}\``).join(', ') || '—'} |`);
    L.push('');
    if (m.components.length) {
      L.push('Components: ' + m.components.map(c => `[${c.name}](front/components/${c.key}.md)`).join(' · '));
      L.push('');
    }
    L.push('Also: [design tokens](front/tokens.md) ([CSS](front/tokens.css)) · [navigation & flows](front/flows.md)');
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
      source: this.source.describe(),
      sourceKind: this.source.kind,
      log: this.log.slice(-50),
    };
  }
}
