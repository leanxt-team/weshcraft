// Every spec file carries a machine-readable contract (an HTML comment, invisible when rendered)
// that lists exactly which prototype facts it covers. The parity check compares contracts with a
// fresh manifest; prose around it (human or agent written) is kept across regenerations.
import { stableStringify } from '../util/common.mjs';

const C_START = '<!-- weshcraft:contract';
const C_END = '-->';
const N_START = '<!-- weshcraft:notes:start -->';
const N_END = '<!-- weshcraft:notes:end -->';

export function embedContract(contract) {
  // JSON never contains "-->" unescaped here: we escape '>' in strings.
  const json = JSON.stringify(JSON.parse(stableStringify(contract)), null, 1).replace(/-->/g, '--\\u003e');
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
