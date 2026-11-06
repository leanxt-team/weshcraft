// The two blocks every generated spec carries: the contract (which layers the spec covers, in a
// machine-readable form) and the Notes (what a human or an agent adds).
// Pure ESM, no Node: the browser reads the same blocks from the Markdown it shows, and the server
// writes and reads them (src/spec/contract.mjs re-exports this module).

const C_START = '<!-- weshcraft:contract';
const C_END = '-->';
const N_START = '<!-- weshcraft:notes:start -->';
const N_END = '<!-- weshcraft:notes:end -->';

/** The same value always gives the same text: the keys are sorted, the empty ones are dropped. */
function sorted(v) {
  if (v === null || typeof v !== 'object') return v ?? null;
  if (Array.isArray(v)) return v.map(sorted);
  const out = {};
  for (const k of Object.keys(v).filter(k => v[k] !== undefined).sort()) out[k] = sorted(v[k]);
  return out;
}

export function embedContract(contract) {
  // JSON never contains "-->" unescaped here: we escape '>' in strings.
  const json = JSON.stringify(sorted(contract), null, 1).replace(/-->/g, '--\\u003e');
  return `${C_START}\n${json}\n${C_END}`;
}

export function readContract(md) {
  const i = md.indexOf(C_START);
  if (i < 0) return null;
  const j = md.indexOf(C_END, i + C_START.length);
  if (j < 0) return null;
  try { return JSON.parse(md.slice(i + C_START.length, j)); } catch { return null; }
}

/** Markdown without the contract comment: what a reader sees. */
export function visibleText(md) {
  const i = md.indexOf(C_START);
  if (i < 0) return md;
  const j = md.indexOf(C_END, i + C_START.length);
  if (j < 0) return md;
  return md.slice(0, i) + md.slice(j + C_END.length);
}

export function readNotes(md) {
  if (!md) return null;
  const i = md.indexOf(N_START);
  const j = md.indexOf(N_END);
  if (i < 0 || j < i) return null;
  return md.slice(i + N_START.length, j).trim();
}

export function notesBlock(notes, placeholder) {
  return `${N_START}\n${(notes ?? '').trim() || placeholder}\n${N_END}`;
}

/** Node citations in visible text: `#123` in backticks. */
export function citedNodes(md) {
  const out = new Set();
  for (const m of visibleText(md).matchAll(/`#(\d+)`/g)) out.add(Number(m[1]));
  return out;
}
