// The code graph: an optional tool that knows the code (what calls what, what a change touches).
// WeshCraft uses it to answer "what does this affect?" and to tell a failing CI which tests are
// at risk. Everything degrades: when the tool is not installed, or the project is not indexed,
// the caller gets the tagged code (the trace) instead.

import { execFile } from 'node:child_process';

const BIN = process.env.CODEGRAPH || 'codegraph';
const TIMEOUT = 30_000;

/** Run the tool in the project folder. Never throws: the result says what happened. */
function run(dir, args, { timeout = TIMEOUT } = {}) {
  return new Promise(resolve => {
    execFile(BIN, args, { cwd: dir, timeout, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, NO_COLOR: '1' } }, (err, stdout, stderr) => {
      if (err && !stdout) {
        const code = err.code;
        if (code === 'ENOENT') return resolve({ ok: false, reason: 'not installed' });
        return resolve({ ok: false, reason: (stderr || err.message || '').trim().split('\n').slice(-1)[0] });
      }
      resolve({ ok: true, stdout });
    });
  });
}

/** Parse the tool's JSON, with a guard: a broken answer is no answer. */
function json(text) {
  try { return JSON.parse(text); } catch { return null; }
}

/** Is the tool there, and is the project indexed? */
export async function codegraphState(dir) {
  const r = await run(dir, ['status', '--json'], { timeout: 10_000 });
  if (!r.ok) return { available: false, reason: r.reason, indexed: false };
  const s = json(r.stdout);
  if (!s) return { available: true, indexed: false, reason: 'the index could not be read' };
  return {
    available: true,
    indexed: !!s.initialized,
    version: s.version ?? null,
    lastIndexed: s.lastIndexed ?? null,
    fileCount: s.fileCount ?? 0,
    nodeCount: s.nodeCount ?? 0,
    pending: s.pendingChanges?.added + s.pendingChanges?.modified + s.pendingChanges?.removed || 0,
    reason: s.initialized ? null : 'the project is not indexed (codegraph init)',
  };
}

/** Bring the index up to date. Background work: never blocks a run. */
export async function codegraphSync(dir) {
  const r = await run(dir, ['sync', '--quiet'], { timeout: 120_000 });
  return { ok: r.ok, reason: r.reason };
}

/** What a change to this symbol touches. */
export async function codegraphImpact(dir, symbol, { depth = 4, file = null } = {}) {
  if (!symbol) return { ok: false, reason: 'no symbol' };
  const args = ['impact', symbol, '--json', '--depth', String(depth)];
  if (file) args.push('--file', file);
  const r = await run(dir, args);
  if (!r.ok) return { ok: false, reason: r.reason };
  const data = json(r.stdout);
  if (!data) return { ok: false, reason: 'the answer could not be read' };
  return {
    ok: true,
    symbol: data.symbol,
    ambiguous: !!data.ambiguous,
    affected: (data.definitions ?? []).flatMap(d => d.affected ?? []).map(a => ({ name: a.name, kind: a.kind, file: a.filePath, line: a.startLine })),
    edges: (data.definitions ?? []).flatMap(d => d.edges ?? []),
  };
}

/** Who calls this symbol. */
export async function codegraphCallers(dir, symbol, { file = null, limit = 40 } = {}) {
  if (!symbol) return { ok: false, reason: 'no symbol' };
  const args = ['callers', symbol, '--json', '--limit', String(limit)];
  if (file) args.push('--file', file);
  const r = await run(dir, args);
  if (!r.ok) return { ok: false, reason: r.reason };
  const data = json(r.stdout);
  if (!data) return { ok: false, reason: 'the answer could not be read' };
  return {
    ok: true,
    symbol: data.symbol,
    callers: (data.definitions ?? []).flatMap(d => d.callers ?? []).map(c => ({ name: c.name, kind: c.kind, file: c.filePath, line: c.startLine })),
  };
}

/** Symbols whose name matches. */
export async function codegraphQuery(dir, search, { limit = 10 } = {}) {
  const r = await run(dir, ['query', search, '--json', '--limit', String(limit)]);
  if (!r.ok) return { ok: false, reason: r.reason };
  const data = json(r.stdout);
  if (!Array.isArray(data)) return { ok: false, reason: 'the answer could not be read' };
  return { ok: true, matches: data.map(x => ({ name: x.node?.name, kind: x.node?.kind, file: x.node?.filePath, line: x.node?.startLine, signature: x.node?.signature ?? null, score: x.score })) };
}

/** The narrative: the relevant symbols, their source and their blast radius. */
export async function codegraphExplore(dir, question, { maxFiles = 6 } = {}) {
  if (!question) return { ok: false, reason: 'no question' };
  const r = await run(dir, ['explore', question, '--max-files', String(maxFiles)], { timeout: 60_000 });
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, text: r.stdout };
}

/** The tests that a change in these files would affect. */
export async function codegraphAffected(dir, files, { depth = 5 } = {}) {
  if (!files?.length) return { ok: false, reason: 'no files' };
  const r = await run(dir, ['affected', ...files, '--json', '--depth', String(depth)], { timeout: 60_000 });
  if (!r.ok) return { ok: false, reason: r.reason };
  const data = json(r.stdout);
  if (!data) return { ok: false, reason: 'the answer could not be read' };
  return { ok: true, changedFiles: data.changedFiles ?? [], affectedTests: data.affectedTests ?? [] };
}

/**
 * The code behind the specs that are out of sync, and the tests that cover it: what a failing
 * parity check should tell you to run.
 */
export async function codeAtRisk(manifest, outDir, report) {
  const stale = new Set();
  for (const i of report?.issues ?? []) {
    const m = /front\/(?:screens|components)\/((?:scr|cmp)-[\w-]+)\.md$/.exec(i.file ?? '');
    if (m) stale.add(m[1]);
  }
  if (!stale.size) return null;
  const { traceOf, scanTags } = await import('./spec/trace.mjs');
  const trace = traceOf(manifest, scanTags(outDir));
  const files = new Set();
  for (const el of trace.elements) if (stale.has(el.id)) for (const c of el.code ?? []) files.add(c.file);
  if (!files.size) return { files: [], affectedTests: [] };
  const r = await codegraphAffected(outDir, [...files]);
  return r.ok ? { files: [...files], affectedTests: r.affectedTests } : null;
}
