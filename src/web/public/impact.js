// The layer menu, the impact panel and the provenance block: what a layer touches, and where a
// spec comes from. The browser's half of src/spec/impact.mjs (the same pure helpers, the same
// answers: the agent reads the chain as text, the person reads it as a panel).
// The imports are relative: the browser loads this file as /app/impact.js (so ./contract.js is
// /app/contract.js) and the server loads it from the same folder (so the pure helpers can be
// tested without a browser).
import { readContract } from './contract.js';
import { chainFor, elementChain, referenceBlock, ownerOf, nearbyFor, codeRow, provenanceHtml } from './impact-core.js';

export { provenanceHtml };

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Put text on the clipboard (plain text: an agent can read it). */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* no permission (a sandboxed host): the old way below */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/**
 * The menu of a layer or of a product element: a smart reference to copy, the link of its spec,
 * and what it affects.
 * @param {{x: number, y: number}} at where the pointer was
 * @param {string} head what the menu is about ("Layer #6", "screen "Sign up"")
 * @param {{reference: Function, spec: Function, impact: Function}} actions
 */
export function contextMenu(at, head, actions) {
  document.querySelectorAll('.t-menu').forEach(x => x.remove());
  const m = document.createElement('div');
  m.className = 'menu t-menu';
  m.setAttribute('role', 'menu');
  m.innerHTML = `<div class="t-menu-h">${esc(head)}</div>`
    + '<button type="button" role="menuitem" data-act="reference">Copy a smart reference</button>'
    + '<button type="button" role="menuitem" data-act="spec">Copy the spec link</button>'
    + '<hr>'
    + '<button type="button" role="menuitem" data-act="impact">What does this affect?</button>';
  document.body.append(m);
  const x = Math.max(8, Math.min(at?.x ?? 8, innerWidth - m.offsetWidth - 8));
  const y = Math.max(8, Math.min(at?.y ?? 8, innerHeight - m.offsetHeight - 8));
  m.style.left = `${x}px`;
  m.style.top = `${y}px`;
  const close = () => { m.remove(); document.removeEventListener('pointerdown', outside, true); };
  const outside = ev => { if (!m.contains(ev.target)) close(); };
  setTimeout(() => document.addEventListener('pointerdown', outside, true));
  m.addEventListener('click', ev => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    close();
    actions[b.dataset.act]?.();
  });
  m.querySelector('button')?.focus();
}

/** The menu of a layer (the editor's layer rows and canvas). */
export function layerMenu(at, layer, actions) {
  contextMenu(at, `Layer #${layer.id}`, {
    reference: () => actions.reference?.(layer),
    spec: () => actions.spec?.(layer),
    impact: () => actions.impact?.(layer),
  });
}

/** The chain of a layer, read in the browser: the spec is fetched to know its sections. */
export async function chainOf(node, { getManifest, getTrace }) {
  const manifest = getManifest();
  const owner = ownerOf(manifest, node);
  if (!owner) return null;
  let contract = null;
  try {
    const r = await fetch(`/out/${owner.spec}`);
    if (r.ok) contract = readContract(await r.text());
  } catch { /* the spec is not written yet: the chain still has the code */ }
  return chainFor({ manifest, trace: getTrace(), contract, node });
}

/** What the code graph says about the element's symbol (callers and affected symbols). */
export async function graphOf(chain, { getTrace } = {}) {
  const empty = { callers: [], affected: [], nearby: [], graph: null };
  if (!chain?.symbol) return empty;
  const ask = async what => {
    try {
      const r = await fetch(`/api/codegraph?what=${what}&symbol=${encodeURIComponent(chain.symbol)}${what === 'impact' ? '&depth=4' : ''}`);
      return r.ok ? await r.json() : { ok: false, reason: `HTTP ${r.status}` };
    } catch (e) { return { ok: false, reason: e.message }; }
  };
  const [callers, impact] = await Promise.all([ask('callers'), ask('impact')]);
  const names = [...(callers.callers ?? []).map(c => c.name), ...(impact.affected ?? []).map(a => a.name)];
  const why = [callers, impact].find(r => r.ok === false)?.reason;
  return {
    callers: callers.callers ?? [],
    affected: impact.affected ?? [],
    nearby: nearbyFor(getTrace?.(), names).filter(el => el.id !== chain.element?.id),
    graph: why ? { ok: false, reason: why } : { ok: true },
  };
}

const fileRow = codeRow;

/** The impact panel: three groups — in the spec, in the code, nearby. */
export function createImpactView({ root, getManifest, getTrace, openSpec, openLayer, showFile, log }) {
  const body = root.querySelector('.impact-body');
  let token = 0;
  const html = (chain, extra) => {
    const sections = chain.type === 'layer'
      ? (chain.sections.length
        ? chain.sections.map(s => `<button type="button" class="imp-row" data-spec="${esc(chain.spec)}#${s.id}">${esc(s.title)}</button>`).join('')
        : '<p class="empty">No section mentions this layer.</p>')
      : `<button type="button" class="imp-row" data-spec="${esc(chain.spec)}"><code>${esc(chain.spec)}</code></button>`;
    const code = chain.code.length
      ? chain.code.map(c => fileRow(c, chain.tag)).join('')
      : '<p class="empty">No code is tagged for this element yet.</p>';
    const callers = extra.callers.length
      ? extra.callers.map(c => `<div class="imp-row static"><span class="muted">callers</span> <code>${esc(c.name)}</code> <span class="muted">${esc(c.file ?? '')}${c.line ? `:${c.line}` : ''}</span></div>`).join('')
      : '';
    const affected = extra.affected.length
      ? extra.affected.map(a => `<div class="imp-row static"><span class="muted">affected</span> <code>${esc(a.name)}</code> <span class="muted">${esc(a.file ?? '')}${a.line ? `:${a.line}` : ''}</span></div>`).join('')
      : '';
    const nearby = extra.nearby.length
      ? extra.nearby.map(n => `<button type="button" class="imp-row" data-spec="${esc(n.spec ?? '')}"><span class="muted">${esc(n.kind)}</span> ${esc(n.name)}</button>`).join('')
      : '<p class="empty">Nothing else in the product.</p>';
    const note = extra.graph && extra.graph.ok === false
      ? `<p class="imp-note">${/not installed/.test(extra.graph.reason ?? '') ? 'codegraph is not installed — showing the tagged code only' : /not indexed/.test(extra.graph.reason ?? '') ? 'the project is not indexed (codegraph init) — showing the tagged code only' : `codegraph: ${esc(extra.graph.reason)}`}</p>`
      : '';
    const head = chain.type === 'layer'
      ? `<div class="imp-head"><h3>Layer #${chain.node} “${esc(chain.name)}”</h3><span class="muted">${esc(chain.owner.kind)} “${esc(chain.owner.name)}” (${esc(chain.owner.key)})</span></div>`
      : `<div class="imp-head"><h3>${esc(chain.kind)} “${esc(chain.name)}”</h3><span class="muted">${esc(chain.id)}</span></div>`;
    return head
      + '<section><h4>In the spec</h4>' + sections + '</section>'
      + '<section><h4>In the code</h4>' + code + callers + affected + note + '</section>'
      + '<section><h4>Nearby</h4>' + nearby + '</section>';
  };
  body.addEventListener('click', ev => {
    const b = ev.target.closest('[data-spec],[data-file],[data-node]');
    if (!b) return;
    if (b.dataset.spec) return openSpec(b.dataset.spec);
    if (b.dataset.file) return showFile(b.dataset.file, b.dataset.line ? Number(b.dataset.line) : null);
    if (b.dataset.node) return openLayer(Number(b.dataset.node));
  });
  const show = async chain => {
    const extra = await graphOf(chain, { getTrace });
    body.innerHTML = html(chain, extra);
    return chain;
  };
  return {
    /** The panel on a layer. */
    async open(node) {
      const mine = ++token;
      body.innerHTML = '<p class="empty">Looking…</p>';
      const chain = await chainOf(node, { getManifest, getTrace });
      if (mine !== token) return null;
      if (!chain) { body.innerHTML = '<p class="empty">This layer is not part of a screen or a component.</p>'; return null; }
      return show(chain);
    },
    /** The panel on a product element (a screen, an operation, an entity, a rule…). */
    async openElement(element) {
      const mine = ++token;
      body.innerHTML = '<p class="empty">Looking…</p>';
      const chain = elementChain({ trace: getTrace(), id: element.id, name: element.name, kind: element.kind, spec: element.spec });
      if (mine !== token) return null;
      return show(chain);
    },
    /** The reference block of a layer (what the menu copies). */
    async reference(node) {
      const chain = await chainOf(node, { getManifest, getTrace });
      return chain ? referenceBlock(chain) : '';
    },
    /** The spec link of a layer: the file, with the anchor of the section it is in. */
    async specLink(node) {
      const chain = await chainOf(node, { getManifest, getTrace });
      if (!chain) return null;
      const section = chain.sections[0];
      return section ? `${chain.spec}#${section.id}` : chain.spec;
    },
    /** The reference block of an element. */
    elementReference(element) {
      return referenceBlock(elementChain({ trace: getTrace(), id: element.id, name: element.name, kind: element.kind, spec: element.spec }));
    },
    /** The spec link of an element. */
    elementSpecLink(element) {
      const chain = elementChain({ trace: getTrace(), id: element.id, name: element.name, kind: element.kind, spec: element.spec });
      return chain.spec || null;
    },
  };
}
