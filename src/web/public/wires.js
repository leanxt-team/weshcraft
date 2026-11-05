// Wires that stay readable: several wires meeting the same side of a box get their own points along
// that side (ordered by where their other end is, so they do not cross on the way), and labels are
// moved apart when they would overlap. Shared by the diagrams (Functions, Data, Architecture, Logic,
// Front ⇄ back).

/**
 * Spread wire ends along box sides.
 * ends: [{ side: 'box-id:side', lo, hi (the side's extent), toward (the other end's coordinate along the side) }]
 * Sets `at` on each end: its coordinate along the side. One end alone sits in the middle.
 */
export function spreadEnds(ends, { gap = 10, pad = 7 } = {}) {
  const groups = new Map();
  for (const e of ends) { if (!groups.has(e.side)) groups.set(e.side, []); groups.get(e.side).push(e); }
  for (const list of groups.values()) {
    const { lo, hi } = list[0];
    const mid = (lo + hi) / 2;
    if (list.length === 1) { list[0].at = mid; continue; }
    list.sort((a, b) => a.toward - b.toward || (a.order ?? 0) - (b.order ?? 0));
    const span = Math.min(gap * (list.length - 1), Math.max(0, hi - lo - 2 * pad));
    list.forEach((e, i) => { e.at = mid - span / 2 + (span * i) / (list.length - 1); });
  }
  return ends;
}

/**
 * Move labels apart: labels [{x, y, w, h}] centred on (x, y). Each label that overlaps one already
 * placed slides along y (then x) by the smallest step that frees it. Returns the same objects.
 */
export function separateLabels(labels, { margin = 3 } = {}) {
  const placed = [];
  const hit = (a, b) => Math.abs(a.x - b.x) * 2 < a.w + b.w + margin * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + margin * 2;
  for (const l of [...labels].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const y0 = l.y, x0 = l.x;
    const tries = [[0, 0]];
    for (let k = 1; k <= 6; k++) { const dy = k * (l.h + margin); tries.push([0, dy], [0, -dy]); }
    for (let k = 1; k <= 3; k++) { const dx = k * (l.w / 2 + margin); tries.push([dx, 0], [-dx, 0]); }
    for (const [dx, dy] of tries) { l.x = x0 + dx; l.y = y0 + dy; if (!placed.some(p => hit(l, p))) break; }
    placed.push(l);
  }
  return labels;
}

/** A label's width for a text, approximately (no layout pass). */
export const labelWidth = (text, size = 10.5) => text.length * size * 0.6 + 12;
