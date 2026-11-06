// The chain from a layer to what it affects: the spec sections that mention it, the code that
// implements the element it belongs to, the code graph's callers and affected symbols, and the
// product elements those symbols belong to.
//
// The code graph is optional: without it (not installed, or the project not indexed) the answer
// comes from the trace alone and says so in one line. The wrapper is injectable, so the chain can
// be answered with a fake graph (the tests do that).
import { codegraphImpact, codegraphCallers } from '../codegraph.mjs';
import { chainFor, referenceBlock, chainText, nearbyFor, provenanceFor, provenanceText } from '../web/public/impact-core.js';

/** The real code graph, behind one import: the tests pass their own. */
export const GRAPH = { impact: codegraphImpact, callers: codegraphCallers };

const failed = r => ({ ok: false, reason: r?.reason ?? 'the code graph did not answer' });

/**
 * What a layer affects.
 * @param {{manifest: object, trace: object, contract: object|null, node: number, name?: string,
 *          dir?: string, depth?: number, graph?: object}} o
 * @returns {Promise<object|null>} the chain, or null when the layer belongs to no screen
 */
export async function impactChain({ manifest, trace, contract, node, name, dir, depth = 4, graph = GRAPH }) {
  const chain = chainFor({ manifest, trace, contract, node, name });
  if (!chain) return null;
  const out = { ...chain, callers: [], affected: [], nearby: [], graph: null };
  if (!chain.symbol || !dir) return out;
  const [callers, impact] = await Promise.all([
    Promise.resolve(graph.callers(dir, chain.symbol, {})).catch(e => ({ ok: false, reason: e.message })),
    Promise.resolve(graph.impact(dir, chain.symbol, { depth })).catch(e => ({ ok: false, reason: e.message })),
  ]);
  out.callers = callers?.ok ? callers.callers ?? [] : [];
  out.affected = impact?.ok ? impact.affected ?? [] : [];
  // The affected symbols lead back to the product: the graph symbols and the tagged code.
  const names = [...out.callers.map(c => c.name), ...out.affected.map(a => a.name)];
  out.nearby = nearbyFor(trace, names).filter(el => el.id !== chain.element?.id);
  const why = [callers, impact].filter(r => r && r.ok === false).map(r => r.reason).filter(Boolean);
  out.graph = why.length ? { ok: false, reason: why[0] } : { ok: true };
  return out;
}

/** The chain of a layer, as the text a person or an agent reads. */
export async function impactText(o) {
  const chain = await impactChain(o);
  return { chain, text: chainText(chain), reference: referenceBlock(chain) };
}

/** Where a spec comes from: the elements it describes, their layers and their code. */
export function provenance({ manifest, trace, spec }) {
  const prov = provenanceFor({ manifest, trace, spec });
  return { provenance: prov, text: provenanceText(prov) };
}
