// Keep a git repository in step with the specs.
//   github:owner/repo[@branch]   commit to a branch through the GitHub API (PR opened once, then updated)
//   gitlab:group/project[@branch] the same on GitLab.com or self-managed (MR)
//   git[@branch]                  commit in the local repository that holds the output folder, so
//                                 Claude Code, OpenCode or a human see it in `git log`; optional push
// Auto mode syncs after every regeneration that is in sync with the prototype. Runs one at a time;
// a run arriving mid-sync queues exactly one more.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { bus } from '../util/common.mjs';
import { collectFiles, prBody, publish, gitBlobSha } from './git.mjs';
import { ciFiles } from './ci.mjs';
import { changesMarkdown, summaryLine } from '../spec/diff.mjs';
import { resolveToken, describeSource } from './credentials.mjs';
import { GRAPH, SPECS, PROTOTYPE } from '../layout.mjs';
import { writeFileSafe } from '../util/common.mjs';

// Git never waits for a human: a remote that asks for credentials fails instead of hanging.
const run = (cmd, args, cwd) => new Promise((resolve, reject) => {
  execFile(cmd, args, { cwd, maxBuffer: 64 * 1024 * 1024, timeout: 120_000, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } }, (err, stdout, stderr) => {
    if (err) reject(Object.assign(new Error(`${cmd} ${args[0]}: ${(stderr || err.message).trim().split('\n').slice(-2).join(' ')}`), { code: err.code }));
    else resolve(stdout.trim());
  });
});

/** "github:o/r@b" | "gitlab:g/p@b" | "git" | "git@b" -> target */
export function parseTarget(spec, extra = {}) {
  if (!spec) return null;
  if (typeof spec === 'object') return { ...spec };
  const m = /^(github|gitlab|git)(?::([^@]+))?(?:@(.+))?$/.exec(String(spec).trim());
  if (!m) throw new Error(`bad sync target "${spec}": use github:owner/repo[@branch], gitlab:group/project[@branch] or git[@branch]`);
  const [, kind, repo, branch] = m;
  if (kind !== 'git' && !repo) throw new Error(`${kind} sync needs a repository: ${kind}:owner/name`);
  return { kind, repo: repo ?? null, branch: branch ?? null, ...extra };
}

export class Syncer {
  /** @param {import('../spec/workspace.mjs').Workspace} ws */
  constructor(ws, target = null) {
    this.ws = ws;
    this.target = null;
    this.last = null;
    this.busy = null;
    this.again = false;
    this.history = [];
    this.onRun = ev => {
      if (ev.type !== 'run' || ev.status !== 'finished' || !this.target?.auto) return;
      if (!ev.ok && !this.target.evenIfOutOfSync) { this.ws.emit('log', { level: 'warn', message: 'Sync skipped: specs are out of sync with the prototype' }); return; }
      this.sync().catch(() => {});
    };
    bus.on('weshcraft', this.onRun);
    if (target) this.configure(target);
  }

  configure(target) {
    this.target = target ? parseTarget(target) : null;
    if (this.target) this.target.auto ??= true;
    this.ws.emit('sync', { status: this.status() });
    return this.status();
  }

  status() {
    const t = this.target;
    return {
      target: t ? `${t.kind}${t.repo ? `:${t.repo}` : ''}${t.branch ? `@${t.branch}` : ''}` : null,
      auto: !!t?.auto, pr: t?.pr !== false, push: !!t?.push, busy: !!this.busy, last: this.last,
      history: (this.history ?? []).slice(-8).reverse(),
      kind: t?.kind ?? null, repo: t?.repo ?? null, branch: t?.branch ?? null, access: t ? (t.kind === 'git' ? 'your git setup' : this.access ?? null) : null,
    };
  }

  /** One sync now. Concurrent calls coalesce. */
  sync() {
    if (!this.target) return Promise.reject(new Error('no sync target: pass --sync github:owner/repo, gitlab:group/project or git'));
    if (this.busy) { this.again = true; return this.busy; }
    this.busy = (async () => {
      let result;
      do {
        this.again = false;
        this.ws.emit('sync', { status: { ...this.status(), busy: true } });
        try {
          if (!this.ws.report) await this.ws.run();
          result = this.target.kind === 'git' ? await this.syncLocal() : await this.syncRemote();
          this.last = { ok: true, at: Date.now(), ...result };
          this.ws.emit('log', { level: 'info', message: result.changed ? `Synced to ${this.status().target}: ${result.url ?? result.commit}` : `Sync: ${this.status().target} already up to date` });
        } catch (e) {
          this.last = { ok: false, at: Date.now(), error: e.message };
          this.ws.emit('log', { level: 'error', message: `Sync failed: ${e.message}` });
          result = this.last;
        }
        this.history.push(this.last);
        if (this.history.length > 20) this.history.shift();
      } while (this.again);
      this.busy = null;
      this.ws.emit('sync', { status: this.status() });
      if (result && result.ok === false) throw new Error(result.error);
      return result;
    })();
    return this.busy;
  }

  async syncRemote() {
    const t = this.target;
    const m = this.ws.manifest;
    const cred = await resolveToken(t.kind, { apiUrl: t.apiUrl, explicit: t.token });
    const kind = t.kind;
    if (!cred.token) throw new Error(`no ${kind === 'gitlab' ? 'GitLab' : 'GitHub'} access: sign in in OpenChamber (Settings › Integrations), run \`${kind === 'gitlab' ? 'glab' : 'gh'} auth login\`, set ${kind === 'gitlab' ? 'GITLAB_TOKEN' : 'GITHUB_TOKEN'}, or enter a token`);
    this.access = describeSource(cred);
    const token = cred.token;
    return publish(t.kind, {
      repo: t.repo, token, branch: t.branch || 'weshcraft/specs', base: t.base, apiUrl: t.apiUrl, pr: t.pr !== false,
      title: `Specs: ${m.source.name}`,
      body: prBody(this.ws.report, m, ['This branch is kept in sync by WeshCraft: every regeneration that matches the prototype is committed here.', this.ws.changes?.items.length ? `\n#### Latest design change\n\n${changesMarkdown(this.ws.changes, { title: summaryLine(this.ws.changes) })}` : '', 'Full history: `wcraft/specs/CHANGES.md`.'].filter(Boolean).join('\n')),
      files: collectFiles(this.ws.outDir, { provider: t.kind, designInputs: this.ws.designInputs(), prefix: t.prefix || '' }),
      message: `docs(specs): ${m.source.name}: ${summaryLine(this.ws.changes ?? { items: [] })}\n\nPrototype ${m.source.hash}, parity ${this.ws.report.score}% (${this.ws.report.checks} checks).\n\n${changesMarkdown(this.ws.changes ?? { items: [] }, { title: 'Design changes' }).replace(/^### .*\n\n/, '')}`.trim(),
    });
  }

  /** Commit only WeshCraft's own paths in the repository around the output folder. */
  async syncLocal() {
    const t = this.target;
    const out = (() => { try { return fs.realpathSync.native(this.ws.outDir); } catch { return this.ws.outDir; } })();
    const rawTop = await run('git', ['rev-parse', '--show-toplevel'], out).catch(() => { throw new Error(`${out} is not inside a git repository (git init, or use github:/gitlab:)`); });
    // Same spelling on both sides: on Windows git may report an 8.3 short path (RUNNER~1) while
    // Node holds the long one, and path.relative would then walk out of the repository.
    const real = p => { try { return fs.realpathSync.native(p); } catch { return path.resolve(p); } };
    const top = real(rawTop);
    for (const marker of ['MERGE_HEAD', 'REBASE_HEAD', 'rebase-merge', 'rebase-apply', 'CHERRY_PICK_HEAD']) {
      const p = await run('git', ['rev-parse', '--git-path', marker], top);
      if (fs.existsSync(path.resolve(top, p))) throw new Error(`repository is in the middle of a ${marker.toLowerCase().replace(/_head$/, '')}; finish it first`);
    }
    const current = await run('git', ['rev-parse', '--abbrev-ref', 'HEAD'], top);
    // A detached HEAD: a commit made there is only in the reflog, and git gc would delete it.
    if (current === 'HEAD') throw new Error('the repository is on a detached HEAD: check out a branch first (WeshCraft never switches branches in your working tree)');
    if (t.branch && current !== t.branch) throw new Error(`check out ${t.branch} first (on ${current}); WeshCraft never switches branches in your working tree`);
    const rel = p => path.relative(top, p).split(path.sep).join('/');
    const paths = [PROTOTYPE, SPECS, this.ws.graphFile ?? GRAPH].map(d => path.join(out, d)).filter(p => fs.existsSync(p)).map(rel);
    const inRepo = this.ws.designInputs().map(x => ({ ...x, abs: real(x.abs) })).filter(x => x.abs.startsWith(top + path.sep));
    for (const x of inRepo) paths.push(rel(x.abs));
    const ciArgs = inRepo.filter(x => x.arg).map(x => `${x.arg} ${rel(x.abs)}`).join(' ');
    // CI parity check: added once, never overwritten.
    const provider = t.ci || (fs.existsSync(path.join(top, '.gitlab-ci.yml')) ? 'gitlab' : 'github');
    for (const f of ciFiles(provider, { prefix: rel(out) === '' ? '' : rel(out), args: ciArgs || undefined })) {
      const abs = path.join(top, f.path);
      if (!fs.existsSync(abs)) writeFileSafe(abs, f.content);
      paths.push(f.path);
      // The GitLab file is only a job: the pipeline must include it, or it never runs.
      if (provider === 'gitlab') {
        const gitlabCi = path.join(top, '.gitlab-ci.yml');
        if (fs.existsSync(gitlabCi)) {
          const text = fs.readFileSync(gitlabCi, 'utf8');
          if (!text.includes(f.path)) {
            writeFileSafe(gitlabCi, `include:\n  - local: ${f.path}\n\n${text}`);
            paths.push('.gitlab-ci.yml');
          }
        }
      }
    }
    await run('git', ['add', '--', ...paths], top);
    const staged = await run('git', ['diff', '--cached', '--name-only', '--', ...paths], top);
    // Nothing new to commit: the push may still be waiting from an earlier attempt.
    if (!staged && !t.push) return { changed: false, branch: current };
    let commit = null;
    if (staged) {
      const m = this.ws.manifest;
      const ch = this.ws.changes ?? { items: [] };
      const details = changesMarkdown(ch, { title: 'x' }).replace(/^### x\n\n/, '');
      await run('git', ['commit', '-m', `docs(specs): ${m.source.name}: ${summaryLine(ch)}`, '-m', `Prototype ${m.source.hash}, parity ${this.ws.report.score}% (${this.ws.report.checks} checks).`, ...(details ? ['-m', details] : []), '--', ...paths], top);
      commit = await run('git', ['rev-parse', '--short', 'HEAD'], top);
    } else {
      commit = await run('git', ['rev-parse', '--short', 'HEAD'], top);
    }
    let pushed = false;
    if (t.push) {
      // Push when the branch is ahead of its upstream: a push that failed once is retried.
      const upstream = await run('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], top).catch(() => null);
      const ahead = upstream ? Number(await run('git', ['rev-list', '--count', `${upstream}..HEAD`], top).catch(() => '0')) : 1;
      if (ahead > 0) { await run('git', ['push', t.remote || 'origin', `HEAD:${current}`], top); pushed = true; }
    }
    return { changed: !!staged, commit, branch: current, files: staged ? staged.split('\n').length : 0, pushed };
  }

  close() { bus.off('weshcraft', this.onRun); }
}

export { gitBlobSha };
