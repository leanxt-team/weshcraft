// WeshCraft browser UI: live spec builder fed by SSE, prototype iframe, spec reader linked to
// prototype layers, parity list, notes editing and publishing.
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const state = { jobs: new Map(), current: null, view: 'read', summary: null, report: null, streams: new Map(), protoHash: null };

// ---- markdown (small, escapes everything first) ----------------------------------------------
function inline(s) {
  return esc(s)
    .replace(/`#(\d+)`/g, '<code class="nodechip" data-node="$1" title="Show in prototype">#$1</code>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_]+)_(?=[\s).,]|$)/g, '$1<em>$2</em>')
    .replace(/\[((?:[^[\]]|\[\])+)\]\(([^)\s]+)\)/g, (m, t, h) => `<a href="${/^(https?:|#)/.test(h) ? h : '#'}" data-href="${h}">${t}</a>`);
}
function markdown(md) {
  md = md.replace(/<!-- weshcraft:contract[\s\S]*?-->/g, '').replace(/<!-- weshcraft:notes:(start|end) -->/g, '').replace(/<a id="([\w-]+)"><\/a>/g, '@@anchor:$1@@');
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (/^```/.test(l)) {
      const lang = l.slice(3).trim();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push(lang === 'mermaid'
        ? `<figure class="diagram" data-src="${esc(buf.join('\n'))}"><pre><code>${esc(buf.join('\n'))}</code></pre></figure>`
        : `<pre data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const anchor = /^@@anchor:([\w-]+)@@$/.exec(l);
    if (anchor) { out.push(`<span class="anchor" id="${anchor[1]}"></span>`); i++; continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      const thead = head.some(Boolean) ? `<thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead>` : '';
      out.push(`<div class="tbl${thead ? '' : ' kv'}"><table>${thead}<tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) {
      const items = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s/.test(lines[i])) {
        const m = /^(\s*)([-*]|\d+\.)\s(.*)$/.exec(lines[i++]);
        items.push({ depth: Math.floor(m[1].length / 2), ordered: /\d/.test(m[2]), text: m[3] });
      }
      const ordered = items[0].ordered;
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map(it => `<li style="margin-left:${it.depth * 16}px">${inline(it.text)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    if (!l.trim()) { i++; continue; }
    const para = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|```|\||\s*([-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

// ---- builder list ----------------------------------------------------------------------------
const GROUPS = [
  ['front', 'Front end', j => j.group === 'front'],
  ['back', 'Back end', j => j.group === 'back'],
  ['links', 'Front ⇄ back', j => j.group === 'links'],
];
function since(j) {
  if (j.status === 'queued') return 'queued';
  if (j.status === 'unchanged') return 'unchanged';
  if (j.status === 'failed') return 'failed';
  if (j.finishedAt && j.startedAt) return `${j.finishedAt - j.startedAt} ms`;
  if (j.status === 'agent') return 'agent…';
  if (j.status === 'writing') return 'writing…';
  return j.status;
}
function renderJobs() {
  const jobs = [...state.jobs.values()];
  const done = jobs.filter(j => ['done', 'unchanged', 'failed'].includes(j.status)).length;
  $('#count').textContent = jobs.length ? `${done}/${jobs.length}` : '';
  $('#bar').style.width = jobs.length ? `${(done / jobs.length) * 100}%` : '0';
  if (!jobs.length) return;
  $('#groups').innerHTML = GROUPS.map(([key, label, f]) => {
    const list = jobs.filter(f);
    return `<div class="group"><h3>${label} <span>${list.length}</span></h3>${list.map(j => `<button type="button" class="job" data-id="${esc(j.id)}" aria-current="${state.current === j.id}"><span class="dot ${esc(j.status)}" title="${esc(j.status)}"></span><span class="title">${esc(j.title)}</span><span class="meta">${esc(since(j))}</span></button>`).join('')}</div>`;
  }).join('');
}

function renderParity() {
  const r = state.report;
  const el = $('#parity');
  if (!r) return;
  el.className = `parity ${r.ok ? 'ok' : 'bad'}`;
  el.textContent = r.ok ? `In sync · ${r.checks} checks` : `${r.errors} parity error${r.errors === 1 ? '' : 's'} · ${r.score}%`;
  $('#issuesCount').textContent = `${r.issues.length} issue${r.issues.length === 1 ? '' : 's'}`;
  $('#issues').innerHTML = r.issues.length
    ? r.issues.slice(0, 200).map(i => `<li class="${i.level}" data-file="${esc(i.file)}" data-node="${i.node ?? ''}"><span class="lvl">${i.level === 'error' ? '✕' : '!'}</span>${esc(i.message)}<span class="file">${esc(i.file)}</span></li>`).join('')
    : `<li class="ok">Every screen, text, interaction, component, token and operation matches the prototype.</li>`;
}

// ---- reader ----------------------------------------------------------------------------------
function scrollToAnchor(anchor) {
  if (!anchor) return;
  const el = document.getElementById(anchor);
  if (!el) return;
  const target = el.nextElementSibling ?? el;
  target.scrollIntoView({ block: 'start', behavior: 'smooth' });
  target.classList.add('flash');
  setTimeout(() => target.classList.remove('flash'), 1600);
}
async function openJob(id, anchor) {
  const j = state.jobs.get(id);
  if (!j) return;
  state.current = id;
  renderJobs();
  $('#specTitle').textContent = j.title;
  $('#editNotes').disabled = ['queued', 'writing', 'agent'].includes(j.status);
  $('#notesForm').hidden = true;
  let md = j.preview;
  if (!md) {
    const res = await fetch(`/out/${j.file}`);
    md = res.ok ? await res.text() : null;
  }
  showDoc(md, j.file);
  scrollToAnchor(anchor);
  const s = state.streams.get(id);
  $('#stream').hidden = !(j.status === 'agent');
  $('#streamText').textContent = s ?? '';
  if (j.screen && $('#follow').checked) protoPost({ weshcraft: 'show', key: j.screen });
}
function showDoc(md, file) {
  const doc = $('#doc');
  const same = doc.dataset.file === (file ?? '');
  const html = md ? markdown(md) : '<p class="empty">Not written yet.</p>';
  if (same && doc.dataset.html === html) return;
  doc.dataset.html = html;
  doc.innerHTML = html;
  $('#raw').textContent = md ?? '';
  doc.dataset.file = file ?? '';
  if (!same) { doc.scrollTop = 0; fadeIn(doc); }
  setView(state.view);
  renderDiagrams(doc);
}
// Diagrams: WeshCraft's own Mermaid flowcharts (flows, links), drawn natively in the app's style —
// no external library, works offline. Unknown syntax keeps the code block.
function parseFlow(src) {
  const nodes = new Map(), edges = [], groups = [];
  let group = null;
  const node = (id, label, shape) => {
    if (!nodes.has(id)) nodes.set(id, { id, label: id, shape: 'box', group: group?.id ?? null, order: nodes.size });
    const n = nodes.get(id);
    if (label != null) { n.label = label; n.shape = shape || 'box'; }
    if (group && !n.group) n.group = group.id;
    return n;
  };
  const ref = t => {
    const m = /^([\w-]+)(?:\[\("(.*)"\)\]|\["(.*)"\]|\[(.*)\])?$/.exec(t.trim());
    if (!m) return null;
    return node(m[1], m[2] ?? m[3] ?? m[4] ?? null, m[2] != null ? 'pill' : 'box').id;
  };
  for (const raw of src.split('\n')) {
    const l = raw.trim();
    if (!l || /^flowchart|^graph/.test(l)) continue;
    let m;
    if ((m = /^subgraph\s+([\w-]+)(?:\[(.*)\])?$/.exec(l))) { group = { id: m[1], label: m[2] ?? m[1] }; groups.push(group); continue; }
    if (l === 'end') { group = null; continue; }
    if ((m = /^(.+?)\s+(<-\.->|-\.->|-->|--\s*"([^"]*)"\s*-->)\s*(?:\|([^|]*)\|\s*)?(.+)$/.exec(l))) {
      const a = ref(m[1]), b = ref(m[5]);
      if (a && b) edges.push({ a, b, label: m[3] ?? m[4] ?? '', dashed: m[2].includes('.'), both: m[2].startsWith('<') });
      continue;
    }
    if (!ref(l)) return null;
  }
  if (!nodes.size) return null;
  // Columns: subgraphs in order, else longest path from the sources.
  let cols;
  if (groups.length) cols = groups.map(g => ({ label: g.label, nodes: [...nodes.values()].filter(n => n.group === g.id) }));
  else {
    const depth = new Map([...nodes.keys()].map(k => [k, 0]));
    for (let i = 0; i < nodes.size; i++) for (const e of edges) if (!e.both && e.a !== e.b) depth.set(e.b, Math.max(depth.get(e.b), Math.min(depth.get(e.a) + 1, nodes.size)));
    const max = Math.max(...depth.values());
    cols = Array.from({ length: max + 1 }, (_, i) => ({ label: null, nodes: [...nodes.values()].filter(n => depth.get(n.id) === i) }));
  }
  return { cols: cols.filter(c => c.nodes.length), edges };
}
function renderDiagrams(root) {
  for (const fig of root.querySelectorAll('figure.diagram:not(.done)')) {
    const g = parseFlow(fig.dataset.src);
    fig.classList.add('done');
    if (!g) continue;
    // Standard edge kinds read better as line styles + a legend than as text on every wire.
    const KINDS = { calls: 'calls an operation', list: 'list filled by', returns: 'returns', 'shown on': 'shown on screen' };
    g.legend = g.edges.length > 3 && g.edges.every(e => !e.label || e.label in KINDS);
    const kinds = g.legend ? [...new Set(g.edges.map(e => e.label).filter(Boolean))] : [];
    fig.innerHTML = `<div class="flow" style="--cols:${g.cols.length}">${g.cols.map(c => `<div class="flow-col">${c.label ? `<div class="flow-head">${esc(c.label)}</div>` : ''}${c.nodes.map(n => `<div class="flow-node ${n.shape}" data-id="${esc(n.id)}">${esc(n.label)}</div>`).join('')}</div>`).join('')}<svg class="flow-wires" aria-hidden="true"></svg></div><div class="flow-foot">${kinds.map(k => `<span class="flow-key k-${k.replace(/\s+/g, '-')}"><i></i>${esc(KINDS[k])}</span>`).join('')}<details class="flow-src"><summary>Mermaid source</summary><pre><code>${esc(fig.dataset.src)}</code></pre></details></div>`;
    const draw = () => drawFlow(fig, g);
    requestAnimationFrame(draw);
    new ResizeObserver(draw).observe(fig);
  }
}
function drawFlow(fig, g) {
  const wrap = fig.querySelector('.flow');
  const svg = fig.querySelector('.flow-wires');
  if (!wrap || !svg || !wrap.offsetParent) return;
  // Node offsets are relative to their column; columns are relative to the diagram.
  const box = id => { const el = wrap.querySelector(`[data-id="${CSS.escape(id)}"]`); const c = el?.parentElement; return el && { x: c.offsetLeft + el.offsetLeft, y: c.offsetTop + el.offsetTop, w: el.offsetWidth, h: el.offsetHeight, col: c }; };
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  const cols = [...wrap.querySelectorAll('.flow-col')];
  const labels = [];
  let out = '<defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8z" fill="context-stroke"/></marker></defs>';
  for (const e of g.edges) {
    const A = box(e.a), B = box(e.b);
    if (!A || !B) continue;
    const ca = cols.indexOf(A.col), cb = cols.indexOf(B.col);
    let d, lx, ly;
    if (ca === cb) { // same column: loop on the right side
      const x = A.x + A.w, y1 = A.y + A.h / 2, y2 = B.y + B.h / 2, bulge = 28;
      d = `M${x} ${y1} C${x + bulge} ${y1} ${x + bulge} ${y2} ${x} ${y2}`; lx = x + bulge - 4; ly = (y1 + y2) / 2;
    } else {
      const [P, Q] = ca < cb ? [A, B] : [B, A];
      const x1 = P.x + P.w, y1 = P.y + P.h / 2, x2 = Q.x, y2 = Q.y + Q.h / 2, m = (x2 - x1) / 2;
      d = ca < cb ? `M${x1} ${y1} C${x1 + m} ${y1} ${x2 - m} ${y2} ${x2} ${y2}` : `M${x2} ${y2} C${x2 - m} ${y2} ${x1 + m} ${y1} ${x1} ${y1}`;
      lx = (x1 + x2) / 2; ly = (y1 + y2) / 2;
    }
    out += `<path d="${d}" class="${e.dashed ? 'dashed' : ''} k-${(e.label || 'none').replace(/\s+/g, '-')}" marker-end="url(#arr)"${e.both ? ' marker-start="url(#arr)"' : ''}/>`;
    if (e.label && !g.legend) labels.push({ text: e.label, x: lx, y: ly });
  }
  svg.innerHTML = out;
  // Label pills, nudged apart so they never overlap.
  wrap.querySelectorAll('.flow-label').forEach(n => n.remove());
  const placed = [];
  for (const l of labels) {
    const el = document.createElement('span');
    el.className = 'flow-label';
    el.textContent = l.text;
    wrap.appendChild(el);
    const w = el.offsetWidth, h = el.offsetHeight;
    let y = l.y - h / 2;
    while (placed.some(p => Math.abs(p.x - l.x) < (p.w + w) / 2 + 4 && Math.abs(p.y - y) < h + 2)) y += h + 3;
    placed.push({ x: l.x, y, w });
    el.style.transform = `translate(${l.x - w / 2}px, ${y}px)`;
  }
}
function fadeIn(el) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  el.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
function setView(v) {
  state.view = v;
  document.querySelectorAll('.reader .segbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#doc').hidden = v !== 'read';
  $('#raw').hidden = v !== 'raw';
}
function openFile(target) {
  const [file, anchor] = target.split('#');
  const j = [...state.jobs.values()].find(x => x.file === file);
  if (j) return openJob(j.id, anchor);
  fetch(`/out/${file}`).then(r => (r.ok ? r.text() : null)).then(md => { state.current = null; renderJobs(); $('#specTitle').textContent = file; showDoc(md, file); scrollToAnchor(anchor); });
}

// ---- front ⇄ back link map ------------------------------------------------------------------
const REL_ICON = { triggers: '▶', submits: '⇢', lists: '☰', displays: '◉', invokes: '⚙', exposes: '↗' };
const SURFACE_GROUPS = [{ key: 'mcp', name: 'MCP tools' }, { key: 'api', name: 'Public API' }];
function linkGraph(m) {
  const ops = new Map(m.domain.operations.map(o => [o.key, o]));
  const edges = [];
  for (const e of m.links.edges) {
    if (e.op) edges.push({ a: `n:${e.node}`, b: `o:${e.op}`, rel: e.rel });
    else {
      edges.push({ a: `n:${e.node}`, b: `f:${e.field}`, rel: 'displays' });
      if (e.via) edges.push({ a: `o:${e.via}`, b: `f:${e.field}`, rel: 'returns' });
    }
  }
  // Operations that return an entity link to it (API resources, list endpoints).
  for (const o of m.domain.operations) if (o.entity && m.domain.entities.some(e => e.name === o.entity)) edges.push({ a: `o:${o.key}`, b: `e:${o.entity}`, rel: 'returns' });
  const uniq = [...new Map(edges.map(x => [`${x.a}|${x.b}|${x.rel}`, x])).values()];
  const adj = new Map();
  for (const x of uniq) { for (const [p, q] of [[x.a, x.b], [x.b, x.a]]) adj.set(p, [...(adj.get(p) ?? []), q]); }
  return { ops, edges: uniq, adj };
}
function renderLinkMap() {
  const m = state.manifest;
  const box = $('#linkmap');
  if (!m?.links) return;
  const { edges, gaps } = m.links;
  $('#linksBadge').textContent = edges.length ? String(edges.length) + (gaps.length ? ` · ${gaps.length}⚠` : '') : '';
  if (!edges.length) { box.innerHTML = '<p class="empty">No front ⇄ back links yet. In FigCraft, bind text to data (<code>{{trail.name}}</code>) or annotate a button with <code>POST /trails</code>; for an MCP server, link tools to endpoints in <code>weshcraft.surface.json</code>.</p>'; return; }
  state.graph = linkGraph(m);
  const screens = [...m.screens, ...SURFACE_GROUPS].filter(s => edges.some(e => e.screen === s.key));
  const nodeLabel = node => (typeof node === 'number' ? `#${node}` : node.startsWith('tool:') ? 'tool' : '');
  const nodeRow = (screen) => {
    const seen = new Map();
    for (const e of edges.filter(x => x.screen === screen.key)) seen.set(e.node, [...(seen.get(e.node) ?? []), e]);
    return [...seen].map(([node, es]) => `<button type="button" class="lrow ${es.some(x => x.op) ? 'is-op' : 'is-field'}" data-k="n:${node}" data-screen="${esc(screen.key)}"><span class="ic">${[...new Set(es.map(x => REL_ICON[x.rel]))].join('')}</span><span class="lt">${esc(es[0].label)}</span><code>${esc(nodeLabel(node))}</code></button>`).join('');
  };
  const opRow = o => `<button type="button" class="lrow is-op" data-k="o:${esc(o.key)}"><span class="verb v-${esc(o.method.toLowerCase())}">${esc(o.method)}</span><span class="lt">${esc(o.path)}</span><span class="conf ${o.confidence}">${o.confidence === 'explicit' ? '' : 'inferred'}</span></button><div class="lsub">${esc([...m.screens, ...SURFACE_GROUPS].find(s => s.key === o.screen)?.name ?? '')}</div>`;
  const ent = e => `<div class="lent"><div class="lhead" data-k="e:${esc(e.name)}">${esc(e.name)}</div>${e.fields.map(f => `<button type="button" class="lrow is-field" data-k="f:${esc(`${e.name}.${f.name}`)}"><span class="ic">◉</span><span class="lt">${esc(f.name)}</span><span class="conf ${f.confidence}">${esc(f.type)}</span></button>`).join('')}</div>`;
  box.innerHTML = `
    ${gaps.length ? `<div class="gaps">${gaps.map(g => `<button type="button" class="gap" data-k="${g.node != null ? `n:${g.node}` : `o:${esc(g.op)}`}">⚠ ${esc(g.message)}</button>`).join('')}</div>` : ''}
    <div class="lcols">
      <div class="lcol"><h4>Front end <span>layers</span></h4>${screens.map(s => `<div class="lscreen"><div class="lhead">${esc(s.name)}</div>${nodeRow(s)}</div>`).join('')}</div>
      <div class="lcol"><h4>API <span>operations</span></h4>${m.domain.operations.map(opRow).join('') || '<p class="empty">none</p>'}</div>
      <div class="lcol"><h4>Domain <span>entity fields</span></h4>${m.domain.entities.map(ent).join('') || '<p class="empty">none</p>'}</div>
      <svg class="lwires" aria-hidden="true"></svg>
    </div>
    <p class="legend"><span><span class="sw op"></span>calls an operation</span><span><span class="sw field"></span>shows data</span><span><span class="sw ret"></span>returned by</span><span class="hint">Click any item to trace it; the prototype highlights its layers.</span></p>`;
  requestAnimationFrame(drawWires);
}
function drawWires() {
  const wrap = $('#linkmap .lcols');
  if (!wrap || !state.graph || wrap.offsetParent === null) return;
  const svg = wrap.querySelector('.lwires');
  const base = wrap.getBoundingClientRect();
  svg.setAttribute('width', wrap.scrollWidth);
  svg.setAttribute('height', wrap.scrollHeight);
  const pos = k => { const el = wrap.querySelector(`[data-k="${CSS.escape(k)}"]`); if (!el) return null; const r = el.getBoundingClientRect(); return { l: r.left - base.left, r: r.right - base.left, y: r.top - base.top + r.height / 2 }; };
  const sel = state.linkSel;
  svg.innerHTML = state.graph.edges.map(x => {
    const a = pos(x.a), b = pos(x.b);
    if (!a || !b) return '';
    const [p, q] = a.l < b.l ? [a, b] : [b, a];
    const x1 = p.r, x2 = q.l, mid = (x2 - x1) / 2;
    const cls = x.rel === 'returns' ? 'ret' : x.rel === 'displays' ? 'field' : 'op';
    const on = sel && sel.has(x.a) && sel.has(x.b);
    return `<path class="w ${cls}${sel ? (on ? ' on' : ' off') : ''}" d="M${x1} ${p.y} C${x1 + mid} ${p.y} ${x2 - mid} ${q.y} ${x2} ${q.y}"/>`;
  }).join('');
}
function selectLink(k, { open = true } = {}) {
  const g = state.graph;
  if (!g) return;
  if (state.linkKey === k) { state.linkKey = null; state.linkSel = null; }
  else {
    // The item and what it is actually linked to: a layer → its operations, fields and the
    // operation that loads each field on its screen; an operation → its layers, and the layers
    // showing the data it loads (its own screen only); a field → layers showing it and loaders.
    const L = state.manifest.links.edges;
    const sel = new Set([k]);
    if (k.startsWith('n:')) {
      for (const e of L.filter(x => `n:${x.node}` === k)) {
        if (e.op) sel.add(`o:${e.op}`);
        if (e.field) { sel.add(`f:${e.field}`); if (e.via) sel.add(`o:${e.via}`); }
      }
    } else if (k.startsWith('o:')) {
      const op = k.slice(2);
      for (const e of L) {
        if (e.op === op) sel.add(`n:${e.node}`);
        if (e.via === op) { sel.add(`n:${e.node}`); sel.add(`f:${e.field}`); }
      }
    } else if (k.startsWith('f:')) {
      for (const e of L.filter(x => x.field === k.slice(2))) { sel.add(`n:${e.node}`); if (e.via) sel.add(`o:${e.via}`); }
    } else if (k.startsWith('e:')) {
      for (const n of g.adj.get(k) ?? []) { sel.add(n); for (const e of L.filter(x => `o:${x.op}` === n)) sel.add(`n:${e.node}`); }
    }
    // An operation also reaches the entity it returns; a front element reaches it through its operation.
    for (const x of [...sel]) if (x.startsWith('o:')) for (const n of g.adj.get(x) ?? []) if (n.startsWith('e:')) sel.add(n);
    state.linkKey = k;
    state.linkSel = sel;
  }
  document.querySelectorAll('#linkmap .lrow, #linkmap .gap, #linkmap .lhead[data-k]').forEach(el => {
    el.classList.toggle('sel', el.dataset.k === state.linkKey);
    el.classList.toggle('dim', !!state.linkSel && !state.linkSel.has(el.dataset.k));
  });
  drawWires();
  const sel = state.linkSel ?? new Set();
  const items = [...sel].filter(x => x.startsWith('n:')).map(x => {
    const raw = x.slice(2);
    const node = /^\d+$/.test(raw) ? Number(raw) : raw;
    return { node, kind: (g.adj.get(x) ?? []).some(y => y.startsWith('o:')) ? 'op' : 'field' };
  });
  protoPost({ weshcraft: 'highlightMany', items });
  if (!state.linkKey || !open) return;
  const m = state.manifest;
  if (k.startsWith('o:')) openFile(`specs/back/api.md#${k.slice(2)}`);
  else if (k.startsWith('f:') || k.startsWith('e:')) openFile(`specs/back/domain.md#entity-${k.slice(2).split('.')[0].toLowerCase()}`);
  else {
    const e = m.links.edges.find(x => `n:${x.node}` === k);
    if (!e) return;
    if (e.screen === 'mcp') openFile(`specs/front/mcp/${m.surface.mcp.tools.find(t => `tool:${t.name}` === e.node)?.key}.md`);
    else if (e.screen === 'api') openFile(`specs/front/api/${m.surface.api.endpoints.find(x => `ep:${x.method} ${x.path}` === e.node)?.key}.md`);
    else openFile(`specs/front/screens/${e.screen}.md`);
  }
}
$('#linkmap').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) selectLink(b.dataset.k); });
new ResizeObserver(() => drawWires()).observe($('#linkmap'));
$('#overlay').addEventListener('change', e => protoPost({ weshcraft: 'overlay', on: e.target.checked }));

// ---- prototype iframe ------------------------------------------------------------------------
const protoPost = msg => $('#proto').contentWindow?.postMessage(msg, '*');
function reloadProto(hash) {
  if (state.protoHash === hash) return;
  state.protoHash = hash;
  // No #fragment in the src: fragment navigation inside an iframe scrolls the parent page too.
  const frame = $('#proto');
  frame.classList.add('loading');
  frame.src = `/out/prototype/index.html?v=${hash}`;
  frame.onload = () => {
    requestAnimationFrame(() => frame.classList.remove('loading'));
    if (state.protoScreen) protoPost({ weshcraft: 'show', key: state.protoScreen });
    if ($('#overlay').checked) protoPost({ weshcraft: 'overlay', on: true });
  };
}
window.addEventListener('message', e => {
  if (e.source !== $('#proto').contentWindow) return;
  const m = e.data || {};
  if (m.weshcraft === 'link') {
    // A layer clicked in the prototype's data overlay: jump to its back-end spec and trace it.
    const op = m.op?.split(' ')[0];
    const field = m.field?.split(' ')[0];
    if (state.graph) { state.linkKey = null; selectLink(`n:${m.node}`, { open: false }); }
    if (op) openFile(`specs/back/api.md#${op}`);
    else if (field) openFile(`specs/back/domain.md#entity-${field.split('.')[0].toLowerCase()}`);
    return;
  }
  if (m.weshcraft === 'open' && typeof m.file === 'string' && /^specs\//.test(m.file)) { openFile(m.file); if (phone.matches) setPhoneView('read'); return; }
  if (m.weshcraft === 'screen') state.protoScreen = m.key;
  if (m.weshcraft === 'screen' && $('#follow').checked) {
    const j = state.jobs.get(m.key === 'surface-mcp' ? 'front:mcp' : m.key === 'surface-api' ? 'front:api' : `front:screen:${m.key}`);
    if (j && state.current !== j.id) openJob(j.id);
  }
});

// ---- events ----------------------------------------------------------------------------------
function log(ev) {
  const el = $('#log');
  el.innerHTML = `<span class="${esc(ev.level)}">${esc(new Date(ev.at).toLocaleTimeString())} · ${esc(ev.message)}</span>`;
}
function applySummary(s) {
  if (!s) return;
  state.summary = s;
  // A service with no screens: the "prototype" is its MCP/API catalog.
  const label = s.screens.length ? 'Prototype' : 'Catalog';
  const tab = document.querySelector('.tab[data-tab="proto"]');
  if (tab && tab.textContent !== label) tab.textContent = label;
  const pb = document.querySelector('.phonebar [data-view="proto"] span');
  if (pb) pb.textContent = label;
  $('#hash').textContent = s.hash;
  $('#manifest').textContent = 'Loading…';
  fetch('/out/specs/manifest.json').then(r => r.text()).then(t => {
    $('#manifest').innerHTML = esc(t)
      .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="jk">$1</span>$2')
      .replace(/:\s(&quot;.*?&quot;)/g, ': <span class="js">$1</span>')
      .replace(/:\s(-?\d[\d.e+-]*|true|false|null)/g, ': <span class="jn">$1</span>');
    try { state.manifest = JSON.parse(t); state.linkKey = null; state.linkSel = null; renderLinkMap(); } catch { /* partial write */ }
  });
}
function connect() {
  const es = new EventSource('/api/events');
  es.addEventListener('job', e => {
    const { job } = JSON.parse(e.data);
    state.jobs.set(job.id, job);
    if (job.status === 'agent' && !state.streams.has(job.id)) state.streams.set(job.id, '');
    renderJobs();
    if (state.current === job.id || (!state.current && job.status === 'writing')) openJob(job.id);
  });
  es.addEventListener('chunk', e => {
    const { id, chunk } = JSON.parse(e.data);
    state.streams.set(id, (state.streams.get(id) ?? '') + chunk);
    if (state.current === id) { $('#stream').hidden = false; const p = $('#streamText'); p.textContent = state.streams.get(id); p.scrollTop = p.scrollHeight; }
  });
  es.addEventListener('run', e => {
    const ev = JSON.parse(e.data);
    if (ev.status === 'started') { $('#parity').className = 'parity busy'; $('#parity').textContent = 'Building specs…'; state.streams.clear(); }
  });
  es.addEventListener('manifest', e => applySummary(JSON.parse(e.data).summary));
  es.addEventListener('prototype', e => reloadProto(JSON.parse(e.data).hash));
  es.addEventListener('parity', e => { state.report = JSON.parse(e.data).report; renderParity(); });
  es.addEventListener('log', e => log(JSON.parse(e.data)));
  es.addEventListener('sync', e => renderSync(JSON.parse(e.data).status));
  es.addEventListener('published', e => { const r = JSON.parse(e.data).result; log({ level: 'info', at: Date.now(), message: `Published: ${r.url}` }); });
  es.onerror = () => log({ level: 'warn', at: Date.now(), message: 'Connection lost, retrying…' });
}

async function init() {
  const st = await (await fetch('/api/state')).json();
  $('#source').textContent = st.source;
  $('#source').title = st.source;
  if (st.figcraftWebUrl) { $('#designTab').hidden = false; $('#design').dataset.src = st.figcraftWebUrl; }
  for (const j of st.jobs) state.jobs.set(j.id, j);
  state.report = st.report;
  if (st.summary) { applySummary(st.summary); reloadProto(st.summary.hash); }
  renderJobs();
  renderParity();
  (st.log || []).slice(-1).forEach(log);
  state.tokens = st.tokens;
  renderSync(st.sync);
  connect();
  if (!st.summary && !st.running) run(false);
}
async function run(force) {
  await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force }) });
}

// ---- wiring ----------------------------------------------------------------------------------
$('#groups').addEventListener('click', e => { const b = e.target.closest('.job'); if (b) openJob(b.dataset.id); });
$('#issues').addEventListener('click', e => {
  const li = e.target.closest('li[data-file]');
  if (!li) return;
  openFile(li.dataset.file);
  if (li.dataset.node) protoPost({ weshcraft: 'highlight', node: li.dataset.node });
});
$('#doc').addEventListener('click', e => {
  const chip = e.target.closest('.nodechip');
  if (chip) { selectTab('proto'); protoPost({ weshcraft: 'highlight', node: chip.dataset.node }); return; }
  const a = e.target.closest('a[data-href]');
  if (a && !/^https?:/.test(a.dataset.href)) {
    e.preventDefault();
    const base = ($('#doc').dataset.file || '').split('/').slice(0, -1);
    const target = a.dataset.href.split('#')[0];
    if (target.includes('prototype/index.html')) { const key = a.dataset.href.split('#')[1]; selectTab('proto'); protoPost({ weshcraft: 'show', key }); return; }
    const parts = [...base];
    for (const seg of target.split('/')) { if (seg === '..') parts.pop(); else if (seg && seg !== '.') parts.push(seg); }
    openFile(parts.join('/'));
  }
});
document.querySelectorAll('.reader .segbtn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
function selectTab(t) {
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  document.querySelectorAll('.tabpanel').forEach(p => {
    const show = p.dataset.panel === t;
    if (show && p.hidden) { p.hidden = false; fadeIn(p); } else p.hidden = !show;
  });
  if (t === 'design' && $('#design').src === 'about:blank') $('#design').src = $('#design').dataset.src;
  if (t === 'links') requestAnimationFrame(drawWires);
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.tab)));
$('#run').addEventListener('click', () => run(false));
$('#force').addEventListener('click', () => run(true));
$('#upload').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  log({ level: 'info', at: Date.now(), message: `Uploading ${f.name}…` });
  const r = await fetch(`/api/upload?name=${encodeURIComponent(f.name)}`, { method: 'POST', body: f });
  const j = await r.json();
  if (!r.ok) return log({ level: 'error', at: Date.now(), message: j.error });
  state.jobs.clear(); state.current = null; state.protoHash = null;
  $('#source').textContent = j.source;
  e.target.value = '';
});

$('#editNotes').addEventListener('click', () => {
  const md = $('#raw').textContent;
  const m = /<!-- weshcraft:notes:start -->\n([\s\S]*?)\n<!-- weshcraft:notes:end -->/.exec(md);
  $('#notesText').value = m && !m[1].startsWith('_No notes yet') ? m[1] : '';
  $('#notesForm').hidden = false;
  $('#notesText').focus();
});
$('#cancelNotes').addEventListener('click', () => { $('#notesForm').hidden = true; });
$('#notesForm').addEventListener('submit', async e => {
  e.preventDefault();
  const j = state.jobs.get(state.current);
  if (!j) return;
  const r = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: j.file, notes: $('#notesText').value }) });
  const res = await r.json();
  if (!r.ok) return log({ level: 'error', at: Date.now(), message: res.error });
  $('#notesForm').hidden = true;
  log({ level: 'info', at: Date.now(), message: `Notes saved in ${j.file}` });
});

const dlg = $('#publishDlg');
const syncTokenRow = () => {
  const p = new FormData($('#publishForm')).get('provider');
  $('#tokenRow').hidden = p === 'git' || !!state.tokens?.[p];
  document.querySelectorAll('#publishForm .remote').forEach(el => { el.hidden = p === 'git'; });
  document.querySelectorAll('#publishForm .local').forEach(el => { el.hidden = p !== 'git'; });
  $('#publishForm [name=repo]').required = p !== 'git';
  $('#publishForm [name=branch]').placeholder = p === 'git' ? 'current branch (never switched)' : 'weshcraft/specs';
  $('#publishGo').textContent = $('#publishForm [name=keep]').checked ? 'Sync now & keep in sync' : p === 'git' ? 'Commit now' : 'Publish';
  $('#syncOff').hidden = !state.sync?.target;
};
function renderSync(st) {
  if (!st) return;
  state.sync = st;
  const pill = $('#syncPill');
  pill.className = `syncpill${st.target ? ' on' : ''}${st.busy ? ' busy' : ''}${st.last && !st.last.ok ? ' err' : ''}`;
  const when = st.last?.at ? new Date(st.last.at).toLocaleTimeString() : null;
  pill.textContent = st.target ? `Sync: ${st.target}${st.auto ? ' · auto' : ''}${when ? ` · ${st.last.ok ? (st.last.changed ? '✓' : '=') : '✕'} ${when}` : ''}` : 'Sync: off';
  pill.title = st.last?.error ?? (st.last?.url ? st.last.url : st.target ? 'Click to sync now' : 'Set up git sync');
}
$('#syncPill').addEventListener('click', async () => {
  if (!state.sync?.target) { $('#publish').click(); return; }
  const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  const j = await r.json();
  if (!r.ok) log({ level: 'error', at: Date.now(), message: j.error });
});
$('#publish').addEventListener('click', () => { $('#publishResult').textContent = ''; syncTokenRow(); dlg.showModal(); });
$('#publishForm').addEventListener('change', syncTokenRow);
$('#publishForm').addEventListener('submit', async e => {
  if (e.submitter?.value === 'off') {
    e.preventDefault();
    const r = await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ off: true }) });
    renderSync((await r.json()).status);
    $('#publishResult').textContent = 'Sync stopped.';
    return;
  }
  if (e.submitter?.value !== 'go') return;
  e.preventDefault();
  const fd = new FormData(e.target);
  const body = Object.fromEntries([...fd].filter(([k, v]) => v && !['keep', 'pr', 'push'].includes(k)));
  const keep = fd.get('keep') === 'on';
  const syncing = keep || body.provider === 'git';
  const out = $('#publishResult');
  out.className = 'result';
  out.textContent = 'Publishing…';
  $('#publishGo').disabled = true;
  try {
    const r = syncing
      ? await fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, auto: keep, pr: fd.get('pr') === 'on', push: fd.get('push') === 'on' }) })
      : await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let j = await r.json();
    if (!r.ok) throw new Error(j.error);
    if (syncing) { renderSync(j.status); j = j.result; }
    out.className = 'result ok';
    const where = j.url ? `<a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.url)}</a>` : `commit <code>${esc(j.commit)}</code> on <code>${esc(j.branch)}</code>${j.pushed ? ' (pushed)' : ''}`;
    out.innerHTML = j.changed === false ? `Already up to date on <code>${esc(j.branch)}</code>.${keep ? ' Keeping it in sync.' : ''}` : `Done: ${where}${keep ? ' · keeping it in sync' : ''}`;
  } catch (err) {
    out.className = 'result err';
    out.textContent = err.message;
  } finally { $('#publishGo').disabled = false; }
});

init();


// ---- phone: one view at a time, iOS-style tab bar ---------------------------------------------
const phone = window.matchMedia('(max-width: 720px)');
function setPhoneView(v) {
  document.body.dataset.view = v;
  document.querySelectorAll('.phonebar [data-view]').forEach(b => b.setAttribute('aria-current', String(b.dataset.view === v)));
  if (v === 'proto' || v === 'links' || v === 'manifest') selectTab(v);
  if (v === 'links') requestAnimationFrame(drawWires);
  window.scrollTo(0, 0);
}
setPhoneView(document.body.dataset.view || 'proto');
document.querySelector('.phonebar').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) setPhoneView(b.dataset.view); });
$('#backToList').addEventListener('click', () => setPhoneView('specs'));
// Explicit picks on a phone take you to what you picked.
$('#groups').addEventListener('click', e => { if (phone.matches && e.target.closest('.job')) setPhoneView('read'); });
$('#issues').addEventListener('click', e => { if (phone.matches && e.target.closest('li[data-file]')) setPhoneView('read'); });
$('#doc').addEventListener('click', e => { if (phone.matches && e.target.closest('.nodechip')) setPhoneView('proto'); });
window.addEventListener('message', e => { if (phone.matches && e.source === $('#proto').contentWindow && e.data?.weshcraft === 'link') setPhoneView('read'); });
// In the links view a tapped item shows a "View spec" button for the spec it opened.
$('#linkmap').addEventListener('click', () => { $('#openSpec').hidden = !state.linkKey; });
$('#openSpec').addEventListener('click', () => setPhoneView('read'));

const moreDlg = $('#moreDlg');
$('#more').addEventListener('click', () => {
  $('#mSource').textContent = $('#source').textContent;
  $('#mHash').textContent = $('#hash').textContent;
  $('#mSync').hidden = !state.sync?.target;
  moreDlg.showModal();
});
moreDlg.addEventListener('click', e => {
  if (e.target === moreDlg) return moreDlg.close();
  const b = e.target.closest('[data-act]');
  if (!b) return;
  moreDlg.close();
  const act = b.dataset.act;
  if (act === 'run') $('#run').click();
  else if (act === 'force') $('#force').click();
  else if (act === 'upload') $('#upload').click();
  else if (act === 'publish') $('#publish').click();
  else if (act === 'sync') $('#syncPill').click();
  else if (act === 'zip') $('#zip').click();
  else if (act === 'manifest') setPhoneView('manifest');
  else if (act === 'openproto') window.open('/out/prototype/index.html', '_blank', 'noopener');
});
// Tab-bar badges: build progress and link gaps.
new MutationObserver(() => {
  const jobs = [...state.jobs.values()];
  const busy = jobs.some(j => j.status === 'queued' || j.status === 'writing' || j.status === 'agent');
  $('#pbSpecs').textContent = busy ? '•' : (state.report && !state.report.ok ? String(state.report.errors) : '');
  $('#pbSpecs').className = `pb-badge${busy ? ' busy' : state.report && !state.report.ok ? ' err' : ''}`;
  const gaps = state.manifest?.links?.gaps?.length ?? 0;
  $('#pbLinks').textContent = gaps ? String(gaps) : '';
}).observe($('#groups'), { childList: true, subtree: true, characterData: true });



// ---- sliding thumbs: segmented controls move, they don't jump -----------------------------
function thumbFor(container, isOn) {
  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  thumb.setAttribute('aria-hidden', 'true');
  container.classList.add('has-thumb');
  container.prepend(thumb);
  let first = true;
  const place = () => {
    const on = [...container.children].find(c => c !== thumb && c.offsetParent !== null && isOn(c));
    if (!on || !container.offsetParent) { thumb.style.opacity = '0'; first = true; return; }
    // Layout offsets, not client rects: immune to transforms (a dialog's opening animation, zoom).
    if (first) thumb.style.transition = 'none';
    thumb.style.opacity = '1';
    thumb.style.width = `${on.offsetWidth}px`;
    thumb.style.height = `${on.offsetHeight}px`;
    thumb.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    if (first) { void thumb.offsetWidth; thumb.style.transition = ''; first = false; }
  };
  new MutationObserver(place).observe(container, { attributes: true, subtree: true, attributeFilter: ['aria-selected', 'aria-pressed', 'aria-current', 'hidden', 'checked'] });
  container.addEventListener('change', place);
  container.addEventListener('scroll', place, { passive: true });
  new ResizeObserver(place).observe(container);
  requestAnimationFrame(place);
  return place;
}
thumbFor($('.stage .tabs'), c => c.getAttribute('aria-selected') === 'true');
thumbFor($('.reader .seg'), c => c.getAttribute('aria-pressed') === 'true');
thumbFor(document.querySelector('.phonebar'), c => c.getAttribute('aria-current') === 'true');
const providerThumb = thumbFor(document.querySelector('#publishForm fieldset.seg'), c => !!c.querySelector('input:checked'));
$('#publishDlg').addEventListener('click', () => requestAnimationFrame(providerThumb));
$('#publish').addEventListener('click', () => requestAnimationFrame(() => requestAnimationFrame(providerThumb)));
// Phone views cross-fade.
for (const pane of document.querySelectorAll('.builder, .stage, .reader')) {
  new MutationObserver(() => { if (phone.matches && getComputedStyle(pane).display !== 'none') fadeIn(pane); }).observe(document.body, { attributes: true, attributeFilter: ['data-view'] });
}
