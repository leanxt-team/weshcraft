// The Executive summary: the product in one screen, for someone who has not seen it yet.
// What people can do (the journey), the screens page by page, the back end in one line each, and
// what is still open. Everything is read from the manifest; the diagrams are drawn here, natively,
// like the other views: no library, no layout pass.
import { spreadEnds } from '/app/wires.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plural = (n, w, p = `${w}s`) => `${n} ${n === 1 ? w : p}`;
const ACTORS = { user: 'People (app)', agent: 'AI agents (MCP)', api: 'Integrations (API)' };

export function createExecSummaryView({ root, getManifest, getReport = () => null, openFile, showScreen }) {
  /** The wires of a diagram: pairs of boxes, drawn from side to side. */
  function wire(container, pairs, cls = '', marker = 'exArrow') {
    const svg = container?.querySelector('.ex-wires');
    const g = svg?.querySelector('.g');
    if (!svg || !g) return;
    const base = container.getBoundingClientRect();
    svg.setAttribute('width', container.scrollWidth);
    svg.setAttribute('height', container.scrollHeight);
    const box = el => { const r = el.getBoundingClientRect(); return { l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top, y: (r.top + r.bottom) / 2 - base.top }; };
    const ends = [];
    const out = [];
    for (const [from, to] of pairs) {
      const a = container.querySelector(from), b = container.querySelector(to);
      if (!a || !b) continue;
      const ab = box(a), bb = box(b);
      // Stacked (a narrow pane): the boxes are one under the other, not side by side: no wire.
      if (bb.t > ab.b - 2 || ab.t > bb.b - 2) continue;
      const e1 = { side: `a:${from}:r`, lo: ab.t, hi: ab.b, toward: bb.y };
      const e2 = { side: `b:${to}:l`, lo: bb.t, hi: bb.b, toward: ab.y };
      ends.push(e1, e2);
      out.push({ e1, e2, x1: ab.r, x2: bb.l });
    }
    spreadEnds(ends);
    g.innerHTML = out.map(w => {
      const mid = (w.x2 - w.x1) / 2;
      return `<path class="w ${cls}" d="M${w.x1} ${w.e1.at} C${w.x1 + mid} ${w.e1.at} ${w.x2 - mid} ${w.e2.at} ${w.x2} ${w.e2.at}" marker-end="url(#${marker})"/>`;
    }).join('');
  }

  function render() {
    const m = getManifest();
    if (!m) { root.innerHTML = '<p class="empty">No run yet.</p>'; return; }
    const report = getReport();
    const F = m.functions?.items ?? [];
    const scr = new Map(m.screens.map(s => [s.key, s]));
    const ops = m.domain.operations;
    const ents = m.domain.entities;
    const tools = m.surface?.mcp?.tools ?? [];
    const eps = m.surface?.api?.endpoints ?? [];

    // What the product is, in one line.
    const counts = [
      m.screens.length && plural(m.screens.length, 'screen'),
      ops.length && plural(ops.length, 'operation'),
      ents.length && plural(ents.length, 'entity', 'entities'),
      tools.length && plural(tools.length, 'MCP tool'),
      eps.length && plural(eps.length, 'public endpoint'),
    ].filter(Boolean);
    const status = !report ? '' : report.ok
      ? `<span class="ex-status ok">specs in sync</span>`
      : `<span class="ex-status bad">${plural(report.errors, 'spec')} out of sync</span>`;

    // The journey: who does what, in the order they do it.
    const fnCard = f => `
      <button type="button" class="ex-fn" data-f="${esc(f.key)}" title="Open the function in its spec">
        <span class="ex-fn-name">${esc(f.name)}</span>
        ${f.summary ? `<span class="ex-fn-sum">${esc(f.summary)}</span>` : ''}
        ${f.actors.length ? `<span class="ex-fn-who">${f.actors.map(a => esc(ACTORS[a] ?? a)).join(' · ')}</span>` : ''}
      </button>`;
    const journey = F.length ? `
      <div class="ex-journey">
        ${F.map(fnCard).join('')}
        <svg class="ex-wires" aria-hidden="true"><defs><marker id="exArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g class="g"></g></svg>
      </div>` : `<p class="empty">No functions yet — the product's building blocks come from the design.</p>`;

    // The screens, page by page. A service with no screens shows what agents and developers use.
    const pages = m.pages?.length ? m.pages : [{ name: 'Screens', key: null, screens: m.screens.map(s => s.key) }];
    const screens = m.screens.length ? `
      <section class="ex-card">
        <h3>The screens</h3>
        <p class="ex-hint">Every screen, page by page. Click one to see it in the prototype.</p>
        <div class="ex-pages">
          ${pages.map(p => `
            <div class="ex-page">
              <h4>${esc(p.name)}</h4>
              ${(p.screens ?? []).map(k => `<button type="button" class="ex-screen" data-screen="${esc(k)}" title="Show it in the prototype">${esc(scr.get(k)?.name ?? k)}</button>`).join('') || '<p class="empty">no screens</p>'}
            </div>`).join('')}
        </div>
      </section>` : (tools.length || eps.length ? `
      <section class="ex-card">
        <h3>What agents and developers use</h3>
        <p class="ex-hint">The product has no screens: it is an API and/or an MCP server.</p>
        <div class="ex-pages">
          ${tools.length ? `<div class="ex-page"><h4>MCP tools</h4>${tools.map(t => `<button type="button" class="ex-screen" data-tool="${esc(t.key)}" title="Open the tool in its spec"><code>${esc(t.name)}</code></button>`).join('')}</div>` : ''}
          ${eps.length ? `<div class="ex-page"><h4>Public API</h4>${eps.map(e => `<button type="button" class="ex-screen" data-ep="${esc(e.key)}" title="Open the endpoint in its spec"><b class="v-${esc(e.method.toLowerCase())}">${esc(e.method)}</b> ${esc(e.path)}</button>`).join('')}</div>` : ''}
        </div>
      </section>` : '');

    // The back end: what the product calls, and what it keeps.
    const backEnd = ops.length || ents.length ? `
      <div class="ex-api">
        <div class="ex-col"><h4>Operations</h4>${ops.map(o => `<button type="button" class="ex-op" data-op="${esc(o.key)}"><b class="v-${esc(o.method.toLowerCase())}">${esc(o.method)}</b> ${esc(o.path)}</button>`).join('') || '<p class="empty">none</p>'}</div>
        <div class="ex-col"><h4>Data</h4>${ents.map(e => `<button type="button" class="ex-ent" data-ent="${esc(e.name)}">${esc(e.name)}</button>`).join('') || '<p class="empty">none</p>'}</div>
        <svg class="ex-wires" aria-hidden="true"><defs><marker id="exArrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z"/></marker></defs><g class="g"></g></svg>
      </div>
      ${tools.length || eps.length ? `<p class="ex-more">${tools.length ? `MCP tools: ${tools.map(t => `<code>${esc(t.name)}</code>`).join(', ')}` : ''}${tools.length && eps.length ? ' · ' : ''}${eps.length ? `${plural(eps.length, 'public endpoint')}` : ''}</p>` : ''}` : '<p class="empty">No back end yet.</p>';

    // What is still open: the questions the design leaves.
    const open = [];
    for (const g of m.links?.gaps ?? []) open.push(g.message);
    const loose = m.functions?.unassigned;
    if (loose) {
      const names = [...loose.screens.map(k => scr.get(k)?.name ?? k)];
      if (names.length) open.push(`Not in a function yet: ${names.join(', ')}.`);
    }
    const questions = open.length ? `
      <section class="ex-card ex-open">
        <h3>Still open</h3>
        <ul>${open.slice(0, 8).map(q => `<li>${esc(q)}</li>`).join('')}</ul>
      </section>` : '';

    root.innerHTML = `
      <div class="ex-hero">
        <div class="ex-hero-top"><h2>${esc(m.source.name)}</h2>${status}</div>
        <p class="ex-lead">${esc(counts.join(' · ') || 'Nothing yet')}</p>
        ${m.functions && !m.functions.declared && F.length ? `<p class="ex-note">The functions are suggested — name them to make them the product's.</p>` : ''}
      </div>
      <section class="ex-card">
        <h3>What people can do</h3>
        <p class="ex-hint">The product as a handful of things people do, in the order they do them.</p>
        ${journey}
      </section>
      ${screens}
      <section class="ex-card">
        <h3>The back end</h3>
        <p class="ex-hint">What the product calls, and what it keeps.</p>
        ${backEnd}
      </section>
      ${questions}`;
    requestAnimationFrame(draw);
  }

  function draw() {
    const m = getManifest();
    if (!m) return;
    // The journey: a function to the one it leads to.
    const j = root.querySelector('.ex-journey');
    if (j) wire(j, (m.functions?.items ?? []).flatMap(f => f.next.map(n => [`.ex-fn[data-f="${CSS.escape(f.key)}"]`, `.ex-fn[data-f="${CSS.escape(n.to)}"]`])), 'next');
    // The back end: an operation to the data it returns.
    const api = root.querySelector('.ex-api');
    if (api) {
      const ops = m.domain.operations, ents = new Set(m.domain.entities.map(e => e.name));
      wire(api, ops.filter(o => o.entity && ents.has(o.entity)).map(o => [`.ex-op[data-op="${CSS.escape(o.key)}"]`, `.ex-ent[data-ent="${CSS.escape(o.entity)}"]`]), 'data', 'exArrow2');
    }
  }

  root.addEventListener('click', e => {
    const f = e.target.closest('.ex-fn');
    if (f) return openFile(`wcraft/specs/FUNCTIONS.md#${f.dataset.f}`);
    const s = e.target.closest('.ex-screen');
    if (s) return showScreen(s.dataset.screen);
    const t = e.target.closest('[data-tool]');
    if (t) return openFile(`wcraft/specs/front/mcp/${t.dataset.tool}.md`);
    const ep = e.target.closest('[data-ep]');
    if (ep) return openFile(`wcraft/specs/front/api/${ep.dataset.ep}.md`);
    const o = e.target.closest('.ex-op');
    if (o) return openFile(`wcraft/specs/back/api.md#${o.dataset.op}`);
    const en = e.target.closest('.ex-ent');
    if (en) return openFile(`wcraft/specs/back/domain.md#entity-${en.dataset.ent.toLowerCase()}`);
  });
  new ResizeObserver(() => draw()).observe(root);

  return { render, draw, refresh: render };
}
