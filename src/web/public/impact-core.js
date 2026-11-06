// What a layer touches, and where a spec comes from: the chain from a layer to the spec sections
// that mention it, to the code that implements it, to the other product elements that code belongs
// to. Pure (no imports): the browser loads it as /app/impact-core.js, the server as a relative
// path, and both answer the same thing.

export const SPEC_ROOT = 'wcraft/specs';

/** The sections of a screen spec a layer can be in, in the order the spec has them. */
export const SCREEN_SECTIONS = [
  { id: 'copy', title: '§Copy' },
  { id: 'interactions', title: '§Interactions' },
  { id: 'inputs', title: '§Inputs' },
  { id: 'components', title: '§Components' },
  { id: 'links', title: '§Front ⇄ back links' },
  { id: 'layout', title: '§Layout' },
];

/** The sections of a component spec a layer can be in. */
export const COMPONENT_SECTIONS = [
  { id: 'variants', title: '§Variants' },
  { id: 'anatomy', title: '§Anatomy' },
];

const holds = (list, id) => (Array.isArray(list) ? list : []).some(x => (x && typeof x === 'object' ? x.node : x) === id);

/** The screen or the component a layer belongs to (null when it belongs to neither). */
export function ownerOf(manifest, node) {
  const id = Number(node);
  if (!Number.isFinite(id)) return null;
  const s = manifest?.screens?.find(x => x.id === id || (x.nodeIds ?? []).includes(id));
  if (s) return { kind: 'screen', id: s.id, key: s.key, name: s.name, spec: `${SPEC_ROOT}/front/screens/${s.key}.md`, layers: s.nodeIds ?? [s.id] };
  const c = manifest?.components?.find(x => x.id === id || (x.nodeIds ?? []).includes(id));
  if (c) return { kind: 'component', id: c.id, key: c.key, name: c.name, spec: `${SPEC_ROOT}/front/components/${c.key}.md`, layers: c.nodeIds ?? [c.id] };
  return null;
}

/** The sections of the spec that really mention the layer. */
export function sectionsFor(contract, node, kind = 'screen') {
  const id = Number(node);
  const out = [];
  if (kind === 'component') {
    if (holds(contract?.variants, id)) out.push(COMPONENT_SECTIONS[0]);
    out.push(COMPONENT_SECTIONS[1]);
    return out;
  }
  if (holds(contract?.copy, id)) out.push(SCREEN_SECTIONS[0]);
  if (holds(contract?.actions, id)) out.push(SCREEN_SECTIONS[1]);
  if (holds(contract?.inputs, id)) out.push(SCREEN_SECTIONS[2]);
  if (holds(contract?.instances, id)) out.push(SCREEN_SECTIONS[3]);
  if (holds(contract?.links, id)) out.push(SCREEN_SECTIONS[4]);
  out.push(SCREEN_SECTIONS[5]);
  return out;
}

/** The name of a layer, as the editor shows it. */
export function layerName(manifest, node) {
  const id = Number(node);
  for (const s of manifest?.screens ?? []) {
    const t = s.texts?.find(x => x.id === id);
    if (t) return t.name;
    const a = s.actions?.find(x => x.id === id);
    if (a) return a.name || a.label;
    const i = s.inputs?.find(x => x.id === id);
    if (i) return i.name;
    const n = s.instances?.find(x => x.id === id);
    if (n) return n.name;
  }
  for (const c of manifest?.components ?? []) {
    const v = c.variants?.find(x => x.id === id);
    if (v) return v.name;
  }
  return null;
}

/**
 * The chain, without the code graph: layer → the spec that covers it → the sections that mention
 * it → the element it belongs to → the code the trace knows for that element.
 */
export function chainFor({ manifest, trace, contract, node, name }) {
  const owner = ownerOf(manifest, node);
  if (!owner) return null;
  const el = (trace?.elements ?? []).find(e => e.id === owner.key) ?? null;
  const code = el?.code ?? [];
  const label = name ?? layerName(manifest, node) ?? owner.name;
  return {
    type: 'layer',
    node: Number(node),
    name: label,
    owner,
    spec: owner.spec,
    sections: sectionsFor(contract, node, owner.kind),
    element: el ? { id: el.id, kind: el.kind, name: el.name, tag: el.tag, graph: el.graph ?? null } : null,
    code,
    symbol: code.find(c => c.symbol)?.symbol ?? null,
    tag: el?.tag ? `@weshcraft ${el.tag}` : null,
    header: `WeshCraft · layer #${Number(node)} "${label}" — ${owner.kind} "${owner.name}" (${owner.key})`,
    textTitle: `Layer #${Number(node)} "${label}" — ${owner.kind} "${owner.name}" (${owner.key})`,
    read: `weshcraft_read {what:"layer", id:${Number(node)}}`,
    exploreName: owner.name,
  };
}

/** How an agent reads an element of the product. */
export function readHint(kind, id) {
  if (kind === 'screen') return `weshcraft_read {what:"manifest", screen:"${id}"}`;
  const what = { operation: 'api', endpoint: 'api', tool: 'api', entity: 'data', function: 'functions', component: 'manifest', rule: 'logic', lifecycle: 'logic', arch: 'architecture' }[kind] ?? 'manifest';
  return `weshcraft_read {what:"${what}"}`;
}

/**
 * The chain of a product element (a screen, an operation, an entity, a tool, a rule…): the spec
 * that describes it, the code that implements it, and what the code graph reaches from it.
 */
export function elementChain({ trace, id, name, kind, spec }) {
  const el = (trace?.elements ?? []).find(e => e.id === id) ?? null;
  const code = el?.code ?? [];
  const label = name ?? el?.name ?? id;
  const what = kind ?? el?.kind ?? 'element';
  const file = spec ?? el?.spec ?? '';
  return {
    type: 'element',
    id,
    name: label,
    kind: what,
    spec: file,
    sections: [],
    element: el ? { id: el.id, kind: el.kind, name: el.name, tag: el.tag, graph: el.graph ?? null } : null,
    code,
    symbol: code.find(c => c.symbol)?.symbol ?? null,
    tag: el?.tag ? `@weshcraft ${el.tag}` : null,
    header: `WeshCraft · ${what} "${label}" (${id})`,
    textTitle: `${what} "${label}" (${id})`,
    read: readHint(what, id),
    exploreName: label,
  };
}

/** The block a person or an agent can read: where this layer lives, in one piece of text. */
export function referenceBlock(chain) {
  if (!chain) return '';
  const L = [chain.header, ''];
  L.push(`  spec    ${chain.spec}${chain.sections?.length ? `  (${chain.sections.map(s => s.title).join(', ')})` : ''}`);
  L.push(`  read    ${chain.read}`);
  for (const c of chain.code) L.push(`  code    ${c.file}:${c.line}${c.symbol ? `  ${c.symbol}` : ''}${chain.tag ? `   (${chain.tag})` : ''}`);
  if (chain.symbol) {
    L.push(`  explore codegraph explore "how does ${chain.exploreName} work" --path .`);
    L.push(`  impact  codegraph impact ${chain.symbol} --depth 4 --path .`);
  }
  return L.join('\n');
}

/** The code graph commands for an element (the exploration part of a reference). */
export function exploreCommands(owner, symbol) {
  if (!owner) return [];
  const out = [];
  if (symbol) {
    out.push(`codegraph explore "how does ${owner.name} work" --path .`);
    out.push(`codegraph impact ${symbol} --depth 4 --path .`);
  }
  return out;
}

const where = c => `${c.file}:${c.line}${c.symbol ? `  ${c.symbol}` : ''}`;

/** The chain as text: what an agent reads. */
export function chainText(chain) {
  if (!chain) return 'Nothing found.';
  const callers = chain.callers ?? [];
  const affected = chain.affected ?? [];
  const nearby = chain.nearby ?? [];
  const L = [chain.textTitle, ''];
  L.push(`In the spec — ${chain.spec}`);
  for (const s of chain.sections ?? []) L.push(`  ${s.title}`);
  L.push('');
  L.push('In the code');
  if (chain.code.length) for (const c of chain.code) L.push(`  ${where(c)}${chain.tag ? `  (${chain.tag})` : ''}`);
  else L.push('  (no code tagged for this element yet)');
  if (callers.length) L.push(`  callers: ${callers.map(c => `${c.name} (${c.file}:${c.line})`).join(', ')}`);
  if (affected.length) L.push(`  affected: ${affected.map(a => `${a.name} (${a.file ?? '?'}:${a.line ?? '?'})`).join(', ')}`);
  if (chain.graph && chain.graph.ok === false) {
    const why = chain.graph.reason ?? '';
    L.push(`  ${/not installed/.test(why) ? 'codegraph is not installed — showing the tagged code only' : /not indexed/.test(why) ? 'the project is not indexed (codegraph init) — showing the tagged code only' : `codegraph: ${why}`}`);
  }
  L.push('');
  L.push('Nearby');
  if (nearby.length) for (const n of nearby) L.push(`  ${n.name} — ${n.kind} (${n.spec})`);
  else L.push('  (nothing else in the product)');
  return L.join('\n');
}

/** The elements the given symbols belong to (the product graph symbols and the tagged code). */
export function nearbyFor(trace, names) {
  const set = new Set((names ?? []).map(n => String(n ?? '').trim()).filter(Boolean));
  if (!set.size) return [];
  return (trace?.elements ?? []).filter(el => (el.graph && set.has(el.graph)) || (el.code ?? []).some(c => c.symbol && set.has(c.symbol)));
}

/**
 * Where a spec comes from: the element(s) it describes, the layers it covers and the code that
 * implements them. The spec file decides the element (a screen spec, the API spec, a tool spec…).
 */
export function provenanceFor({ manifest, trace, spec }) {
  const file = String(spec ?? '').trim().replace(/^\.\//, '');
  const m = manifest ?? {};
  const byId = new Map((trace?.elements ?? []).map(e => [e.id, e]));
  const elements = [];
  const add = (id, kind, name, link, layers = []) => {
    const t = byId.get(id);
    elements.push({ id, kind, name, spec: link ?? file, tag: t?.tag ? `@weshcraft ${t.tag}` : null, code: t?.code ?? [], graph: t?.graph ?? null, layers });
  };
  const layersOf = ids => [...new Set((ids ?? []).filter(x => typeof x === 'number'))];
  const done = (kind, layers = []) => ({ file, kind, elements, layers: [...new Set([...layers, ...elements.flatMap(e => e.layers)])] });

  let hit = /^wcraft\/specs\/front\/screens\/(.+)\.md$/.exec(file);
  if (hit) {
    const s = m.screens?.find(x => x.key === hit[1]);
    if (s) { add(s.key, 'screen', s.name, `${SPEC_ROOT}/front/screens/${s.key}.md`, s.nodeIds ?? []); return done('screen', s.nodeIds ?? []); }
  }
  hit = /^wcraft\/specs\/front\/components\/(.+)\.md$/.exec(file);
  if (hit) {
    const c = m.components?.find(x => x.key === hit[1]);
    if (c) { add(c.key, 'component', c.name, `${SPEC_ROOT}/front/components/${c.key}.md`, c.nodeIds ?? []); return done('component', c.nodeIds ?? []); }
  }
  hit = /^wcraft\/specs\/front\/mcp\/(.+)\.md$/.exec(file);
  if (hit) {
    const t = m.surface?.mcp?.tools?.find(x => x.key === hit[1]);
    if (t) { add(`tool:${t.name}`, 'tool', t.name, file); return done('tool'); }
  }
  hit = /^wcraft\/specs\/front\/api\/(.+)\.md$/.exec(file);
  if (hit) {
    const ep = m.surface?.api?.endpoints?.find(x => x.key === hit[1]);
    const op = m.domain?.operations?.find(x => x.endpoint === hit[1]);
    if (ep) {
      if (op) add(op.key, 'operation', `${op.method} ${op.path}`, file, layersOf([...(op.sources ?? []), op.trigger]));
      else add(`ep:${ep.method} ${ep.path}`, 'endpoint', `${ep.method} ${ep.path}`, file);
      return done('endpoint');
    }
  }
  if (file === `${SPEC_ROOT}/back/api.md`) {
    for (const o of m.domain?.operations ?? []) add(o.key, 'operation', `${o.method} ${o.path}`, `${file}#${o.key}`, layersOf([...(o.sources ?? []), o.trigger]));
    return done('operations');
  }
  if (file === `${SPEC_ROOT}/back/domain.md`) {
    for (const e of m.domain?.entities ?? []) add(`entity:${e.name}`, 'entity', e.name, `${file}#entity-${e.name.toLowerCase()}`, layersOf(e.fields.flatMap(f => f.sources ?? [])));
    return done('entities');
  }
  if (file === `${SPEC_ROOT}/FUNCTIONS.md`) {
    for (const f of m.functions?.items ?? []) {
      const layers = f.screens.flatMap(k => m.screens?.find(s => s.key === k)?.nodeIds ?? []);
      add(f.key, 'function', f.name, `${file}#${f.key}`, layers);
    }
    return done('functions');
  }
  if (file === `${SPEC_ROOT}/LOGIC.md`) {
    for (const r of m.logic?.rules ?? []) add(r.key, 'rule', r.name, file);
    for (const s of m.logic?.machines ?? []) add(s.key, 'lifecycle', `${s.entity}.${s.field ?? 'status'}`, file);
    return done('logic');
  }
  if (file === `${SPEC_ROOT}/DATA.md`) {
    for (const e of m.data?.entities ?? []) add(`entity:${e.name}`, 'entity', e.name, file, layersOf(m.domain?.entities?.find(x => x.name === e.name)?.fields.flatMap(f => f.sources ?? []) ?? []));
    return done('data');
  }
  if (file === `${SPEC_ROOT}/API.md`) {
    for (const o of m.domain?.operations ?? []) add(o.key, 'operation', `${o.method} ${o.path}`, file, layersOf([...(o.sources ?? []), o.trigger]));
    for (const t of m.surface?.mcp?.tools ?? []) add(`tool:${t.name}`, 'tool', t.name, file);
    for (const ep of m.surface?.api?.endpoints ?? []) add(`ep:${ep.method} ${ep.path}`, 'endpoint', `${ep.method} ${ep.path}`, file);
    return done('api');
  }
  if (file === `${SPEC_ROOT}/ARCHITECTURE.md`) {
    for (const c of m.architecture?.components ?? []) add(c.key, 'component', c.name, file);
    return done('architecture');
  }
  return done('unknown');
}

/** The provenance as text: what an agent reads. */
export function provenanceText(prov) {
  if (!prov) return 'No spec given.';
  const L = [`Where ${prov.file} comes from`, ''];
  L.push('The design');
  if (prov.elements.length) {
    for (const e of prov.elements) {
      const layers = e.layers?.length ? ` — layers ${e.layers.map(id => `#${id}`).join(', ')}` : '';
      L.push(`  ${e.kind} "${e.name}" (${e.id})${layers}`);
    }
  } else L.push('  (nothing: this spec is not about a design element)');
  L.push('');
  L.push('The code');
  const code = prov.elements.flatMap(e => e.code.map(c => ({ ...c, tag: e.tag })));
  if (code.length) for (const c of code) L.push(`  ${where(c)}${c.tag ? `  (${c.tag})` : ''}`);
  else L.push('  (no code tagged for it yet)');
  L.push('');
  L.push('The exploration');
  const first = prov.elements.find(e => e.code.some(c => c.symbol));
  const commands = first ? exploreCommands({ name: first.name }, first.code.find(c => c.symbol)?.symbol) : [];
  if (commands.length) for (const c of commands) L.push(`  ${c}`);
  else L.push('  (nothing to explore yet: no code is tagged for it)');
  return L.join('\n');
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** One row of the provenance block: a code location, with its tag. */
export function codeRow(c, tag) {
  return `<button type="button" class="imp-row code" data-file="${esc(c.file)}" data-line="${c.line ?? ''}"><code>${esc(c.file)}${c.line ? `:${c.line}` : ''}</code>${c.symbol ? ` <span class="muted">${esc(c.symbol)}</span>` : ''}${tag ? ` <code class="tag">${esc(tag)}</code>` : ''}</button>`;
}

/** The "Where this comes from" block of a spec: the design, the code, the exploration. */
export function provenanceHtml({ manifest, trace, spec }) {
  const prov = provenanceFor({ manifest, trace, spec });
  if (!prov || !prov.elements.length) return '';
  const design = prov.elements.map(e => {
    const layers = (e.layers ?? []).length
      ? ` <span class="prov-layers">${e.layers.map(id => `<button type="button" class="chip" data-node="${id}">#${id}</button>`).join('')}</span>`
      : '';
    return `<div class="prov-item"><span class="muted">${esc(e.kind)}</span> <strong>${esc(e.name)}</strong> <code>${esc(e.id)}</code>${layers}</div>`;
  }).join('');
  const code = prov.elements.flatMap(e => e.code.map(c => ({ ...c, tag: e.tag })));
  const codeHtml = code.length ? code.map(c => codeRow(c, c.tag)).join('') : '<p class="empty">No code is tagged for it yet.</p>';
  const first = prov.elements.find(e => e.code.some(c => c.symbol));
  const commands = first ? exploreCommands({ name: first.name }, first.code.find(c => c.symbol)?.symbol) : [];
  const explore = commands.length
    ? commands.map(c => `<div class="prov-item"><code>${esc(c)}</code></div>`).join('')
    : '<p class="empty">Nothing to explore yet.</p>';
  return `<section class="prov"><h3>Where this comes from</h3>`
    + `<div class="prov-group"><h4>The design</h4>${design}</div>`
    + `<div class="prov-group"><h4>The code</h4>${codeHtml}</div>`
    + `<div class="prov-group"><h4>The exploration</h4>${explore}</div>`
    + '</section>';
}
