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
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, h) => `<a href="${/^(https?:|#)/.test(h) ? h : '#'}" data-href="${h}">${t}</a>`);
}
function markdown(md) {
  md = md.replace(/<!-- weshcraft:contract[\s\S]*?-->/g, '').replace(/<!-- weshcraft:notes:(start|end) -->/g, '').replace(/<a id="[^"]*"><\/a>/g, '');
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
      out.push(`<pre data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>`);
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(l);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\|/.test(l)) {
      const rows = [];
      while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
      const head = cells(rows[0]);
      const body = rows.slice(2).map(cells);
      out.push(`<table><thead><tr>${head.map(c => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map(r => `<tr>${r.map(c => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
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
async function openJob(id) {
  const j = state.jobs.get(id);
  if (!j) return;
  state.current = id;
  renderJobs();
  $('#specTitle').textContent = j.title;
  $('#editNotes').disabled = !['done', 'unchanged'].includes(j.status);
  $('#notesForm').hidden = true;
  let md = j.preview;
  if (!md) {
    const res = await fetch(`/out/${j.file}`);
    md = res.ok ? await res.text() : null;
  }
  showDoc(md, j.file);
  const s = state.streams.get(id);
  $('#stream').hidden = !(j.status === 'agent');
  $('#streamText').textContent = s ?? '';
  if (j.screen && $('#follow').checked) protoPost({ weshcraft: 'show', key: j.screen });
}
function showDoc(md, file) {
  $('#doc').innerHTML = md ? markdown(md) : '<p class="empty">Not written yet.</p>';
  $('#raw').textContent = md ?? '';
  $('#doc').dataset.file = file ?? '';
  setView(state.view);
}
function setView(v) {
  state.view = v;
  document.querySelectorAll('.segbtn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === v)));
  $('#doc').hidden = v !== 'read';
  $('#raw').hidden = v !== 'raw';
}
function openFile(file) {
  const j = [...state.jobs.values()].find(x => x.file === file);
  if (j) return openJob(j.id);
  fetch(`/out/${file}`).then(r => (r.ok ? r.text() : null)).then(md => { state.current = null; renderJobs(); $('#specTitle').textContent = file; showDoc(md, file); });
}

// ---- prototype iframe ------------------------------------------------------------------------
const protoPost = msg => $('#proto').contentWindow?.postMessage(msg, '*');
function reloadProto(hash) {
  if (state.protoHash === hash) return;
  state.protoHash = hash;
  const cur = $('#proto').contentWindow?.location?.hash || '';
  $('#proto').src = `/out/prototype/index.html?v=${hash}${cur}`;
}
window.addEventListener('message', e => {
  if (e.source !== $('#proto').contentWindow) return;
  const m = e.data || {};
  if (m.weshcraft === 'screen' && $('#follow').checked) {
    const j = state.jobs.get(`front:screen:${m.key}`);
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
  $('#hash').textContent = s.hash;
  $('#manifest').textContent = 'Loading…';
  fetch('/out/specs/manifest.json').then(r => r.text()).then(t => { $('#manifest').textContent = t; });
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
document.querySelectorAll('.segbtn').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
function selectTab(t) {
  document.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === t)));
  document.querySelectorAll('.tabpanel').forEach(p => { p.hidden = p.dataset.panel !== t; });
  if (t === 'design' && $('#design').src === 'about:blank') $('#design').src = $('#design').dataset.src;
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
  $('#tokenRow').hidden = !!state.tokens?.[p];
};
$('#publish').addEventListener('click', () => { $('#publishResult').textContent = ''; syncTokenRow(); dlg.showModal(); });
$('#publishForm').addEventListener('change', syncTokenRow);
$('#publishForm').addEventListener('submit', async e => {
  if (e.submitter?.value !== 'go') return;
  e.preventDefault();
  const body = Object.fromEntries([...new FormData(e.target)].filter(([, v]) => v));
  const out = $('#publishResult');
  out.className = 'result';
  out.textContent = 'Publishing…';
  $('#publishGo').disabled = true;
  try {
    const r = await fetch('/api/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    out.className = 'result ok';
    out.innerHTML = j.changed === false ? `Nothing changed on <code>${esc(j.branch)}</code>.` : `Done: <a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.url)}</a>`;
  } catch (err) {
    out.className = 'result err';
    out.textContent = err.message;
  } finally { $('#publishGo').disabled = false; }
});

init();
