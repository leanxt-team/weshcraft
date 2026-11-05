// The "prototype" of a service without screens: a browsable catalog of its MCP tools and public
// API endpoints, rendered into wcraft/prototype/index.html next to (or instead of) the screens.
import { escapeHtml as e } from '../util/common.mjs';
import { exampleFor } from '../surface/load.mjs';

const constraint = f => [f.enum ? f.enum.join(' | ') : null, f.format, f.min != null ? `≥ ${f.min}` : null, f.max != null ? `≤ ${f.max}` : null, f.default != null ? `= ${JSON.stringify(f.default)}` : null].filter(Boolean).join(' · ');

function fields(list, { location = false } = {}) {
  if (!list?.length) return '<p class="cat-none">None</p>';
  return `<div class="cat-tbl"><table><thead><tr><th>Name</th>${location ? '<th>In</th>' : ''}<th>Type</th><th>Rules</th><th>Description</th></tr></thead><tbody>${list.map(f => `<tr><td><code>${e(f.name)}</code>${f.required ? '<span class="cat-req" title="required">•</span>' : ''}</td>${location ? `<td>${e(f.in)}</td>` : ''}<td><span class="cat-type">${e(f.type ?? 'any')}</span></td><td>${e(constraint(f)) || '—'}</td><td>${e(f.description) || ''}</td></tr>`).join('')}</tbody></table></div>`;
}

const badge = (cls, text, title) => `<span class="cat-badge ${cls}" title="${e(title)}">${e(text)}</span>`;
const hintBadges = h => [
  h.readOnly ? badge('ok', 'read-only', 'Never changes state') : badge('', 'writes', 'Changes state'),
  h.destructive ? badge('bad', 'destructive', 'Can lose data: confirm before calling') : '',
  h.idempotent ? badge('', 'idempotent', 'Same call twice = same effect') : '',
  h.openWorld ? badge('warn', 'open world', 'Reaches systems outside this service') : '',
].join('');

function mcpSection(manifest) {
  const m = manifest.surface.mcp;
  const ops = new Map(manifest.domain.operations.map(o => [o.key, o]));
  const tool = t => {
    const op = t.op && ops.get(t.op);
    const call = JSON.stringify({ name: t.name, arguments: exampleFor(t.input) }, null, 2);
    return `<article class="cat-card" data-node="tool:${e(t.name)}" data-search="${e(`${t.name} ${t.title ?? ''} ${t.description}`.toLowerCase())}">
      <header><div class="cat-title"><code class="cat-name">${e(t.name)}</code>${t.title ? `<span class="cat-sub">${e(t.title)}</span>` : ''}</div><div class="cat-badges">${hintBadges(t.hints)}</div></header>
      <p class="cat-desc">${e(t.description) || '<em>No description.</em>'}</p>
      <details><summary>Arguments <span class="cat-count">${t.input.length}</span></summary>${fields(t.input)}</details>
      ${t.output ? `<details><summary>Structured output <span class="cat-count">${t.output.length}</span></summary>${fields(t.output)}</details>` : ''}
      <details><summary>Example call</summary><pre class="cat-code"><code>${e(call)}</code></pre></details>
      <footer>${op ? `<span class="cat-link" title="Back-end operation">→ <b class="m m-${e(op.method.toLowerCase())}">${e(op.method)}</b> ${e(op.path)}</span>` : t.link === 'none' ? '<span class="cat-link muted">Implemented in the server</span>' : '<span class="cat-link warn">No back-end operation</span>'}<a class="cat-spec" href="../specs/front/mcp/${e(t.key)}.md" data-open="wcraft/specs/front/mcp/${e(t.key)}.md">Spec</a></footer>
    </article>`;
  };
  return `<section class="sc-screen cat" id="surface-mcp" data-screen="surface-mcp" aria-label="MCP server" hidden>
    <div class="cat-wrap">
      <div class="cat-head"><div><div class="cat-kind">MCP server</div><h1>${e(m.server ?? manifest.surface.name)}</h1></div><div class="cat-meta">${m.version ? `<span>v${e(m.version)}</span>` : ''}<span>${m.tools.length} tool${m.tools.length === 1 ? '' : 's'}</span>${m.resources.length ? `<span>${m.resources.length} resource${m.resources.length === 1 ? '' : 's'}</span>` : ''}${m.prompts.length ? `<span>${m.prompts.length} prompt${m.prompts.length === 1 ? '' : 's'}</span>` : ''}</div></div>
      ${m.instructions ? `<p class="cat-intro">${e(m.instructions)}</p>` : ''}
      <input class="cat-search" type="search" placeholder="Filter tools" aria-label="Filter tools">
      <div class="cat-grid">${m.tools.map(tool).join('')}</div>
      ${m.resources.length ? `<h2>Resources</h2><div class="cat-list">${m.resources.map(r => `<div class="cat-row"><code>${e(r.uri)}</code><span>${e(r.name)}</span><span class="muted">${e(r.mimeType ?? '')}${r.template ? ' · template' : ''}</span></div>`).join('')}</div>` : ''}
      ${m.prompts.length ? `<h2>Prompts</h2><div class="cat-list">${m.prompts.map(p => `<div class="cat-row"><code>${e(p.name)}</code><span>${e(p.description)}</span><span class="muted">${p.arguments.map(a => e(a.name + (a.required ? '' : '?'))).join(', ')}</span></div>`).join('')}</div>` : ''}
    </div>
  </section>`;
}

function apiSection(manifest) {
  const api = manifest.surface.api;
  const tools = new Map();
  for (const t of manifest.surface.mcp?.tools ?? []) if (t.op) tools.set(t.op, [...(tools.get(t.op) ?? []), t.name]);
  const opOf = new Map(manifest.domain.operations.filter(o => o.endpoint).map(o => [o.endpoint, o]));
  const tags = [...new Set(api.endpoints.flatMap(x => (x.tags.length ? x.tags : ['Other'])))];
  const path = p => e(p).replace(/\{(\w+)\}/g, '<span class="cat-param">{$1}</span>');
  const ep = x => {
    const ok = x.responses.filter(r => /^2/.test(r.status));
    const used = tools.get(opOf.get(x.key)?.key) ?? [];
    const base = api.servers[0] ?? 'https://api.example.com';
    const body = x.body ? exampleFor(x.body.fields) : null;
    const curl = [`curl -X ${x.method} '${base}${x.path.replace(/\{(\w+)\}/g, '<$1>')}'`, x.security.length ? "  -H 'Authorization: Bearer <token>'" : null, body ? "  -H 'Content-Type: application/json'" : null, body ? `  -d '${JSON.stringify(body)}'` : null].filter(Boolean).join(' \\\n');
    return `<details class="cat-ep" data-node="ep:${e(`${x.method} ${x.path}`)}" data-search="${e(`${x.method} ${x.path} ${x.summary} ${x.operationId ?? ''}`.toLowerCase())}">
      <summary><b class="m m-${e(x.method.toLowerCase())}">${e(x.method)}</b><code class="cat-path">${path(x.path)}</code><span class="cat-sum">${e(x.summary)}</span><span class="cat-status">${ok.map(r => `<i>${e(r.status)}</i>`).join('')}</span></summary>
      <div class="cat-body">
        ${x.description ? `<p class="cat-desc">${e(x.description)}</p>` : ''}
        ${x.params.length ? `<h3>Parameters</h3>${fields(x.params, { location: true })}` : ''}
        ${x.body ? `<h3>Body${x.body.ref ? ` <code>${e(x.body.ref)}</code>` : ''}</h3>${fields(x.body.fields)}` : ''}
        <h3>Responses</h3><div class="cat-list">${x.responses.map(r => `<div class="cat-row"><i class="st st-${e(r.status[0])}">${e(r.status)}</i><span>${e(r.description)}</span><span class="muted">${r.schema ? e(r.schema + (r.list ? '[]' : '')) : ''}</span></div>`).join('')}</div>
        <h3>Example</h3><pre class="cat-code"><code>${e(curl)}</code></pre>
        <footer>${used.length ? `<span class="cat-link">MCP ${used.map(n => `<code>${e(n)}</code>`).join(' ')}</span>` : '<span></span>'}<a class="cat-spec" href="../specs/front/api/${e(x.key)}.md" data-open="wcraft/specs/front/api/${e(x.key)}.md">Spec</a></footer>
      </div>
    </details>`;
  };
  return `<section class="sc-screen cat" id="surface-api" data-screen="surface-api" aria-label="Public API" hidden>
    <div class="cat-wrap">
      <div class="cat-head"><div><div class="cat-kind">Public API</div><h1>${e(api.title)}</h1></div><div class="cat-meta">${api.version ? `<span>v${e(api.version)}</span>` : ''}<span>${api.endpoints.length} endpoint${api.endpoints.length === 1 ? '' : 's'}</span>${api.auth.map(a => `<span>${e(a.scheme ?? a.type)}</span>`).join('')}${api.servers[0] ? `<span><code>${e(api.servers[0])}</code></span>` : ''}</div></div>
      ${api.description ? `<p class="cat-intro">${e(api.description)}</p>` : ''}
      <input class="cat-search" type="search" placeholder="Filter endpoints" aria-label="Filter endpoints">
      ${tags.map(t => `<h2>${e(t)}</h2><div class="cat-eps">${api.endpoints.filter(x => (x.tags.length ? x.tags : ['Other']).includes(t)).map(ep).join('')}</div>`).join('')}
    </div>
  </section>`;
}

export function catalogSections(manifest) {
  if (!manifest.surface) return { html: '', keys: [] };
  const keys = [];
  let html = '';
  if (manifest.surface.mcp) { html += mcpSection(manifest); keys.push(['surface-mcp', 'MCP server']); }
  if (manifest.surface.api) { html += apiSection(manifest); keys.push(['surface-api', 'API']); }
  return { html, keys };
}

export const CATALOG_CSS = `
.cat{width:min(880px,100%)}
.cat-wrap{--c-bg:#ffffff;--c-fg:#1d1d1f;--c-2:rgba(60,60,67,.72);--c-3:rgba(60,60,67,.5);--c-line:rgba(15,23,42,.08);--c-fill:rgba(118,118,128,.08);--c-code:rgba(118,118,128,.1);
  background:var(--c-bg);color:var(--c-fg);border-radius:22px;padding:26px 26px 30px;box-shadow:0 1px 2px rgba(0,0,0,.1),0 24px 60px -12px rgba(15,23,42,.35);font:14px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;text-align:left}
@media (prefers-color-scheme:dark){.cat-wrap{--c-bg:#1c1c20;--c-fg:#f5f5f7;--c-2:rgba(235,235,245,.72);--c-3:rgba(235,235,245,.5);--c-line:rgba(255,255,255,.08);--c-fill:rgba(120,120,128,.16);--c-code:rgba(120,120,128,.2)}}
.cat code{font:12.5px ui-monospace,"SF Mono",Menlo,monospace}
.cat-head{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap}
.cat-kind{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--c-3)}
.cat h1{margin:2px 0 0;font-size:24px;letter-spacing:-.02em}
.cat h2{margin:26px 0 10px;font-size:15px;letter-spacing:-.01em}
.cat h3{margin:14px 0 6px;font-size:12px;color:var(--c-2);font-weight:600}
.cat-meta{display:flex;flex-wrap:wrap;gap:6px}
.cat-meta span{font-size:12px;color:var(--c-2);background:var(--c-fill);padding:3px 10px;border-radius:99px}
.cat-intro{color:var(--c-2);margin:12px 0 0;white-space:pre-line}
.cat-search{all:unset;box-sizing:border-box;display:block;width:100%;margin:18px 0 14px;padding:9px 14px;border-radius:12px;background:var(--c-fill);font-size:14px;color:var(--c-fg)}
.cat-search::placeholder{color:var(--c-3)}
.cat-search:focus{box-shadow:0 0 0 4px rgba(0,122,255,.18)}
.cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:12px}
.cat-card{display:flex;flex-direction:column;gap:8px;padding:16px 16px 12px;border-radius:16px;background:var(--c-bg);box-shadow:inset 0 0 0 1px var(--c-line),0 1px 2px rgba(0,0,0,.04);transition:box-shadow .2s,transform .2s}
.cat-card:hover{box-shadow:inset 0 0 0 1px var(--c-line),0 8px 24px rgba(15,23,42,.08);transform:translateY(-1px)}
.cat-card header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
.cat-title{display:flex;flex-direction:column;min-width:0}
.cat-name{font-size:14px!important;font-weight:600}
.cat-sub{font-size:12px;color:var(--c-3)}
.cat-badges{display:flex;flex-wrap:wrap;gap:4px;justify-content:flex-end}
.cat-badge{font-size:10.5px;font-weight:600;padding:2px 8px;border-radius:99px;background:var(--c-fill);color:var(--c-2);white-space:nowrap}
.cat-badge.ok{background:rgba(52,199,89,.15);color:#1f8a3a}.cat-badge.bad{background:rgba(255,59,48,.13);color:#d70015}.cat-badge.warn{background:rgba(255,159,10,.16);color:#b25d00}
@media (prefers-color-scheme:dark){.cat-badge.ok{color:#30d158}.cat-badge.bad{color:#ff6961}.cat-badge.warn{color:#ffb340}}
.cat-desc{margin:0;color:var(--c-2);font-size:13.5px}
.cat details>summary{cursor:pointer;list-style:none;font-size:12.5px;font-weight:500;color:var(--c-2);padding:4px 0;user-select:none}
.cat details>summary::-webkit-details-marker{display:none}
.cat-card details>summary::before{content:'›';display:inline-block;width:12px;transition:transform .2s;color:var(--c-3)}
.cat-card details[open]>summary::before{transform:rotate(90deg)}
.cat-count{font-size:11px;color:var(--c-3);margin-left:2px}
.cat-card footer,.cat-body footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:auto;padding-top:8px;border-top:1px solid var(--c-line);font-size:12px}
.cat-link{color:var(--c-2)}.cat-link.warn{color:#b25d00}.cat-link.muted{color:var(--c-3)}
.cat-spec{color:#007aff;text-decoration:none;font-weight:600;font-size:12px}
.cat-spec:hover{text-decoration:underline}
.m{display:inline-block;min-width:44px;text-align:center;font:700 10.5px ui-monospace,Menlo,monospace;color:#fff;padding:2px 6px;border-radius:6px;background:#8e8e93}
.m-get{background:#00a88a}.m-post{background:#007aff}.m-put,.m-patch{background:#ff9f0a}.m-delete{background:#ff3b30}
.cat-tbl{overflow-x:auto;margin:6px 0 4px;border-radius:12px;box-shadow:inset 0 0 0 1px var(--c-line)}
.cat-tbl table{border-collapse:collapse;width:100%;font-size:12px}
.cat-tbl th,.cat-tbl td{padding:6px 10px;text-align:left;vertical-align:top;border-bottom:1px solid var(--c-line)}
.cat-tbl tr:last-child td{border-bottom:0}
.cat-tbl th{font-size:11px;font-weight:600;color:var(--c-2);background:var(--c-fill);white-space:nowrap}
.cat-tbl td:first-child{white-space:nowrap}
.cat-type{font:500 11.5px ui-monospace,Menlo,monospace;color:#8944ab}
@media (prefers-color-scheme:dark){.cat-type{color:#bf5af2}}
.cat-req{color:#ff3b30;margin-left:4px;font-weight:700}
.cat-none{margin:4px 0;color:var(--c-3);font-size:12.5px}
.cat-code{margin:6px 0 2px;padding:10px 12px;border-radius:12px;background:var(--c-code);overflow-x:auto;font:11.5px/1.5 ui-monospace,Menlo,monospace}
.cat-list{display:flex;flex-direction:column;border-radius:12px;box-shadow:inset 0 0 0 1px var(--c-line);overflow:hidden}
.cat-row{display:grid;grid-template-columns:minmax(120px,auto) 1fr auto;gap:12px;align-items:center;padding:8px 12px;font-size:12.5px;border-bottom:1px solid var(--c-line)}
.cat-row:last-child{border-bottom:0}
.muted{color:var(--c-3)}
.cat-eps{display:flex;flex-direction:column;gap:8px}
.cat-ep{border-radius:14px;box-shadow:inset 0 0 0 1px var(--c-line);background:var(--c-bg);transition:box-shadow .2s}
.cat-ep[open]{box-shadow:inset 0 0 0 1px var(--c-line),0 8px 24px rgba(15,23,42,.08)}
.cat-ep>summary{display:grid!important;grid-template-columns:auto auto 1fr auto;gap:12px;align-items:center;padding:11px 14px!important;color:var(--c-fg)!important;font-size:13px!important}
.cat-path{font-weight:600}
.cat-param{color:#007aff}
.cat-sum{color:var(--c-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-status{display:flex;gap:4px}
.cat-status i,.st{font:600 10.5px ui-monospace,Menlo,monospace;font-style:normal;padding:1px 6px;border-radius:6px;background:rgba(52,199,89,.15);color:#1f8a3a}
.st-4,.st-5{background:rgba(255,59,48,.12);color:#d70015}.st-3{background:var(--c-fill);color:var(--c-2)}
.cat-body{padding:0 14px 12px}
.cat [hidden-by-filter]{display:none!important}
.cat-hl{box-shadow:inset 0 0 0 2px #007aff,0 8px 24px rgba(0,122,255,.18)!important}
@media (max-width:560px){.cat-wrap{padding:18px 14px 22px;border-radius:18px}.cat-grid{grid-template-columns:1fr}.cat-ep>summary{grid-template-columns:auto 1fr auto}.cat-sum{display:none}.cat-row{grid-template-columns:1fr}}
`;

export const CATALOG_JS = `
document.addEventListener('input', e => {
  const box = e.target.closest('.cat-search');
  if (!box) return;
  const q = box.value.trim().toLowerCase();
  box.closest('.cat-wrap').querySelectorAll('[data-search]').forEach(el => { if (!q || el.dataset.search.includes(q)) el.removeAttribute('hidden-by-filter'); else el.setAttribute('hidden-by-filter', ''); });
});
document.addEventListener('click', e => {
  const a = e.target.closest('[data-open]');
  if (a && parent !== window) { e.preventDefault(); parent.postMessage({ weshcraft: 'open', file: a.dataset.open }, '*'); }
});
`;
