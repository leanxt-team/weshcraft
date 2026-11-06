import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';

/** JSON with sorted keys: the same value always gives the same text (and hash). */
export function stableStringify(v) {
  if (v === null || typeof v !== 'object') return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  return `{${Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => `${JSON.stringify(k)}:${stableStringify(v[k])}`).join(',')}}`;
}

export const sha = (v, n = 12) =>
  crypto.createHash('sha256').update(typeof v === 'string' ? v : stableStringify(v)).digest('hex').slice(0, n);

export const slug = s =>
  String(s ?? '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'item';

export const pascal = s => slug(s).split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('') || 'Item';
export const camel = s => { const p = pascal(s); return p[0].toLowerCase() + p.slice(1); };

/**
 * Write a file without ever leaving it half-written: the bytes go to a temp file next to it,
 * are flushed to disk, and then replace the target in one atomic rename.
 */
export function writeFileSafe(file, data, { fsync = false } = {}) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    const fd = fs.openSync(tmp, 'w');
    try {
      fs.writeFileSync(fd, data);
      if (fsync) fs.fsyncSync(fd);
    } finally { fs.closeSync(fd); }
    fs.renameSync(tmp, file);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* the temp file is already gone */ }
    throw e;
  }
  if (fsync) {
    // The rename itself must survive a power cut: flush the directory entry too.
    try { const dir = fs.openSync(path.dirname(file), 'r'); fs.fsyncSync(dir); fs.closeSync(dir); } catch { /* not on every platform */ }
  }
}

/**
 * A path inside a root, or nothing: the path is resolved, followed through symlinks and checked
 * against the root. `..` segments and encoded separators never escape.
 * @returns {string|null} the absolute path, or null when it is outside
 */
export function containPath(root, rel) {
  const base = path.resolve(root);
  const raw = String(rel ?? '').replace(/^\/+/, '');
  if (!raw || raw.includes('\0')) return null;
  // Normalise the separators first, then refuse anything that still points outside.
  const parts = raw.split(/[\\/]+/);
  if (parts.some(p => p === '..')) return null;
  const abs = path.resolve(base, ...parts);
  if (abs !== base && !abs.startsWith(base + path.sep)) return null;
  // Symlinks: the real path decides, not the written one.
  try {
    const real = fs.realpathSync(abs);
    const realBase = fs.realpathSync(base);
    if (real !== realBase && !real.startsWith(realBase + path.sep)) return null;
    return abs;
  } catch {
    // The file does not exist yet: its parent must still be inside.
    const parent = path.dirname(abs);
    try {
      const realParent = fs.realpathSync(parent);
      const realBase = fs.realpathSync(base);
      if (realParent !== realBase && !realParent.startsWith(realBase + path.sep)) return null;
    } catch { /* the parent does not exist either: the resolved path already passed the check */ }
    return abs;
  }
}

/** Run async jobs with at most `limit` in flight. Results keep input order. */
export async function pool(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try { results[i] = { ok: true, value: await fn(items[i], i) }; }
      catch (error) { results[i] = { ok: false, error }; }
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, worker));
  return results;
}

/** A promise that settles after `ms`, so a hung call never wedges a caller. */
export function withTimeout(promise, ms, message = 'timed out') {
  let timer;
  const guard = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(message)), ms); timer.unref?.(); });
  return Promise.race([promise, guard]).finally(() => clearTimeout(timer));
}

/** Process-wide event bus: the web UI streams it over SSE. */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

export const round = (n, d = 2) => (typeof n === 'number' ? Math.round(n * 10 ** d) / 10 ** d : n);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const mdEscape = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
