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

export function writeFileSafe(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, file);
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

/** Process-wide event bus: the web UI streams it over SSE. */
export const bus = new EventEmitter();
bus.setMaxListeners(100);

export const round = (n, d = 2) => (typeof n === 'number' ? Math.round(n * 10 ** d) / 10 ** d : n);

export function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export const mdEscape = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
