// Specs for non-visual fronts: MCP tools (an agent is the user) and public API endpoints (a
// developer is the user). Same rules as screens: facts from the source only, a Notes block kept
// across regenerations, and a contract the parity check compares with the surface.
import { mdEscape } from '../util/common.mjs';
import { embedContract, notesBlock } from './contract.mjs';
import { exampleFor } from '../surface/load.mjs';

const NOTES = '_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._';

const constraint = f => [
  f.enum ? `one of ${f.enum.map(v => `\`${v}\``).join(', ')}` : null,
  f.format ? `format \`${f.format}\`` : null,
  f.min != null ? `min ${f.min}` : null,
  f.max != null ? `max ${f.max}` : null,
  f.default != null ? `default \`${JSON.stringify(f.default)}\`` : null,
].filter(Boolean).join(' · ');

function fieldTable(fields, { location = false } = {}) {
  if (!fields?.length) return ['None.'];
  const L = [`| Name |${location ? ' In |' : ''} Type | Required | Constraints | Description |`, `|---|${location ? '---|' : ''}---|---|---|---|`];
  for (const f of fields) L.push(`| \`${f.name}\` |${location ? ` ${f.in} |` : ''} ${mdEscape(f.type ?? 'any')} | ${f.required ? 'yes' : 'no'} | ${mdEscape(constraint(f)) || '—'} | ${mdEscape(f.description) || '—'} |`);
  return L;
}

const SHORT = h => [h.readOnly ? 'read-only' : 'writes', h.destructive ? '**destructive**' : null, h.idempotent ? 'idempotent' : null, h.openWorld ? 'open world' : null].filter(Boolean).join(', ');
const HINTS = h => [h.readOnly ? 'read-only' : 'writes', h.destructive ? '**destructive**' : null, h.idempotent ? 'idempotent' : null, h.openWorld ? 'open world (reaches outside systems)' : 'closed world'].filter(Boolean).join(' · ');

export function mcpToolSpec(manifest, tool, { notes } = {}) {
  const op = tool.op ? manifest.domain.operations.find(o => o.key === tool.op) : null;
  const L = [`# MCP tool: \`${tool.name}\``, ''];
  L.push(`| | |\n|---|---|\n| Title | ${mdEscape(tool.title ?? '—')} |\n| Server | ${mdEscape(manifest.surface.mcp.server ?? '—')} |\n| Behaviour | ${HINTS(tool.hints)} |\n| Back end | ${op ? `[\`${op.method} ${op.path}\`](../../back/api.md#${op.key}) (${tool.link})` : tool.link === 'none' ? 'none (declared: implemented in the server)' : '⚠️ not linked to an operation'} |\n| Fingerprint | \`${tool.fingerprint}\` |`);
  L.push('');
  L.push('## Purpose');
  L.push('');
  L.push(tool.description || '_The tool has no description: agents choose tools by it, so write one in the server._');
  L.push('');
  L.push('## Input');
  L.push('');
  L.push(...fieldTable(tool.input));
  L.push('');
  if (tool.output) { L.push('## Structured output'); L.push(''); L.push(...fieldTable(tool.output)); L.push(''); }
  L.push('## Example call');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify({ method: 'tools/call', params: { name: tool.name, arguments: exampleFor(tool.input) } }, null, 2));
  L.push('```');
  L.push('');
  L.push('## Acceptance criteria');
  L.push('');
  let k = 1;
  for (const f of tool.input.filter(x => x.required && !x.name.includes('.'))) L.push(`${k++}. Calling without \`${f.name}\` returns a tool error (\`isError: true\`) naming the missing argument; nothing is changed.`);
  for (const f of tool.input.filter(x => x.enum)) L.push(`${k++}. \`${f.name}\` outside ${f.enum.map(v => `\`${v}\``).join(', ')} is rejected with the allowed values in the message.`);
  for (const f of tool.input.filter(x => x.min != null || x.max != null)) L.push(`${k++}. \`${f.name}\` is checked against ${[f.min != null && `min ${f.min}`, f.max != null && `max ${f.max}`].filter(Boolean).join(' and ')}.`);
  if (tool.hints.readOnly) L.push(`${k++}. Never changes state (read-only hint): safe for agents to call without confirmation.`);
  if (tool.hints.destructive) L.push(`${k++}. Destructive: clients must confirm with the user before calling; the description says what is lost.`);
  if (tool.hints.idempotent) L.push(`${k++}. Calling twice with the same arguments has the same effect as once.`);
  if (op) L.push(`${k++}. Performs \`${op.method} ${op.path}\` with the same validation and errors as the API${op.entity ? `, and returns the \`${op.entity}\` it gets back` : ''}.`);
  L.push(`${k++}. Errors are returned as tool results with \`isError: true\` and a message an agent can act on, never as protocol errors.`);
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES));
  L.push('');
  L.push(embedContract({ kind: 'front-mcp-tool', name: tool.name, fingerprint: tool.fingerprint, sourceHash: manifest.source.hash, input: tool.input.map(f => f.name), op: tool.op }));
  L.push('');
  return L.join('\n');
}

export function mcpIndexSpec(manifest, { notes } = {}) {
  const m = manifest.surface.mcp;
  const L = [`# MCP server${m.server ? `: ${m.server}` : ''}`, ''];
  if (m.instructions) { L.push(m.instructions); L.push(''); }
  const n = (k, w) => `${k} ${w}${k === 1 ? '' : 's'}`;
  L.push(`${n(m.tools.length, 'tool')}, ${n(m.resources.length, 'resource')}, ${n(m.prompts.length, 'prompt')}.${m.version ? ` Version ${m.version}.` : ''}`);
  L.push('');
  L.push('## Tools');
  L.push('');
  L.push('| Tool | Behaviour | Back end | Purpose |');
  L.push('|---|---|---|---|');
  for (const t of m.tools) {
    const op = t.op && manifest.domain.operations.find(o => o.key === t.op);
    L.push(`| [\`${t.name}\`](${t.key}.md) | ${SHORT(t.hints)} | ${op ? `\`${op.method} ${op.path}\`` : t.link === 'none' ? 'in server' : '⚠️ none'} | ${mdEscape(t.description.split(/(?<=\.)\s/)[0] || t.title || '—')} |`);
  }
  L.push('');
  if (m.resources.length) {
    L.push('## Resources');
    L.push('');
    L.push('| URI | Name | Type | Description |');
    L.push('|---|---|---|---|');
    for (const r of m.resources) L.push(`| \`${mdEscape(r.uri)}\`${r.template ? ' (template)' : ''} | ${mdEscape(r.name)} | ${mdEscape(r.mimeType ?? '—')} | ${mdEscape(r.description) || '—'} |`);
    L.push('');
  }
  if (m.prompts.length) {
    L.push('## Prompts');
    L.push('');
    for (const p of m.prompts) L.push(`- \`${p.name}\` — ${mdEscape(p.description) || '—'}${p.arguments.length ? ` Arguments: ${p.arguments.map(a => `\`${a.name}\`${a.required ? '' : '?'}`).join(', ')}.` : ''}`);
    L.push('');
  }
  L.push('## Conventions');
  L.push('');
  L.push('- Tool names are stable identifiers: renaming one is a breaking change for every agent prompt that uses it.');
  L.push('- Descriptions are the interface: they say when to use the tool, what it changes and what it returns.');
  L.push('- Input schemas validate before any effect; errors come back as tool results (`isError: true`).');
  L.push('- Annotations are honest: `readOnlyHint` only when nothing changes, `destructiveHint` whenever data can be lost.');
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES));
  L.push('');
  L.push(embedContract({ kind: 'front-mcp', sourceHash: manifest.source.hash, tools: m.tools.map(t => t.name), resources: m.resources.map(r => r.uri), prompts: m.prompts.map(p => p.name) }));
  L.push('');
  return L.join('\n');
}

const curl = (api, ep) => {
  const base = api.servers[0] ?? 'https://api.example.com';
  const path = ep.path.replace(/\{(\w+)\}/g, (_, n) => `<${n}>`);
  const q = ep.params.filter(p => p.in === 'query' && (p.required || p.default != null)).map(p => `${p.name}=${encodeURIComponent(p.default ?? `<${p.name}>`)}`).join('&');
  const body = ep.body ? exampleFor(ep.body.fields) : null;
  return [`curl -X ${ep.method} '${base}${path}${q ? `?${q}` : ''}'`, ep.security.length ? `  -H 'Authorization: Bearer <token>'` : null, body ? `  -H 'Content-Type: application/json'` : null, body ? `  -d '${JSON.stringify(body)}'` : null].filter(Boolean).join(' \\\n');
};

export function endpointSpec(manifest, ep, { notes } = {}) {
  const api = manifest.surface.api;
  const op = manifest.domain.operations.find(o => o.endpoint === ep.key);
  const tools = manifest.surface.mcp?.tools.filter(t => t.op === op?.key) ?? [];
  const L = [`# Endpoint: \`${ep.method} ${ep.path}\``, ''];
  L.push(`| | |\n|---|---|\n| Summary | ${mdEscape(ep.summary || '—')} |\n| operationId | ${ep.operationId ? `\`${ep.operationId}\`` : '—'} |\n| Tags | ${ep.tags.map(mdEscape).join(', ') || '—'} |\n| Auth | ${ep.security.length ? ep.security.map(x => `\`${x}\``).join(', ') : 'none'} |\n| Used by | ${tools.length ? tools.map(t => `[MCP \`${t.name}\`](../mcp/${t.key}.md)`).join(', ') : '—'} |\n| Fingerprint | \`${ep.fingerprint}\` |${ep.deprecated ? '\n| Status | **deprecated** |' : ''}`);
  L.push('');
  if (ep.description) { L.push(ep.description); L.push(''); }
  L.push('## Parameters');
  L.push('');
  L.push(...fieldTable(ep.params, { location: true }));
  L.push('');
  L.push('## Request body');
  L.push('');
  if (ep.body) { L.push(`${ep.body.required ? 'Required' : 'Optional'}${ep.body.ref ? `, schema \`${ep.body.ref}\`` : ''}.`); L.push(''); L.push(...fieldTable(ep.body.fields)); }
  else L.push('None.');
  L.push('');
  L.push('## Responses');
  L.push('');
  L.push('| Status | Body | Description |');
  L.push('|---|---|---|');
  for (const r of ep.responses) L.push(`| ${r.status} | ${r.schema ? `\`${r.schema}${r.list ? '[]' : ''}\`` : '—'} | ${mdEscape(r.description) || '—'} |`);
  L.push('');
  L.push('## Example');
  L.push('');
  L.push('```bash');
  L.push(curl(api, ep));
  L.push('```');
  L.push('');
  L.push('## Acceptance criteria');
  L.push('');
  let k = 1;
  for (const p of ep.params.filter(x => x.required)) L.push(`${k++}. Missing or malformed ${p.in} parameter \`${p.name}\` returns \`400\` (path: \`404\`) with the field named.`);
  for (const f of ep.body?.fields.filter(x => x.required && !x.name.includes('.')) ?? []) L.push(`${k++}. Body without \`${f.name}\` returns \`400\` with \`fields.${f.name}\`.`);
  for (const f of [...ep.params, ...(ep.body?.fields ?? [])].filter(x => x.enum)) L.push(`${k++}. \`${f.name}\` accepts only ${f.enum.map(v => `\`${v}\``).join(', ')}.`);
  for (const r of ep.responses) L.push(`${k++}. Responds \`${r.status}\`${r.schema ? ` with \`${r.schema}${r.list ? '[]' : ''}\`` : ''} when: ${mdEscape(r.description) || 'see the API description'}.`);
  if (ep.security.length) L.push(`${k++}. Without valid credentials (${ep.security.join(', ')}) responds \`401\`; without permission \`403\`.`);
  L.push('');
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES));
  L.push('');
  L.push(embedContract({ kind: 'front-endpoint', key: ep.key, fingerprint: ep.fingerprint, sourceHash: manifest.source.hash, method: ep.method, path: ep.path, op: op?.key ?? null }));
  L.push('');
  return L.join('\n');
}

export function apiIndexSpec(manifest, { notes } = {}) {
  const api = manifest.surface.api;
  const L = [`# Public API: ${mdEscape(api.title)}${api.version ? ` (${api.version})` : ''}`, ''];
  if (api.description) { L.push(api.description); L.push(''); }
  L.push(`| | |\n|---|---|\n| Servers | ${api.servers.map(x => `\`${x}\``).join(', ') || '—'} |\n| Auth | ${api.auth.map(a => `${a.name} (${a.type}${a.scheme ? ` ${a.scheme}` : ''})`).join(', ') || 'none'} |\n| Endpoints | ${api.endpoints.length} |\n| Schemas | ${Object.keys(api.schemas).length} |`);
  L.push('');
  const tags = [...new Set(api.endpoints.flatMap(e => (e.tags.length ? e.tags : ['Other'])))];
  for (const tag of tags) {
    L.push(`## ${mdEscape(tag)}`);
    L.push('');
    L.push('| Endpoint | Summary | Returns | MCP |');
    L.push('|---|---|---|---|');
    for (const ep of api.endpoints.filter(e => (e.tags.length ? e.tags : ['Other']).includes(tag))) {
      const op = manifest.domain.operations.find(o => o.endpoint === ep.key);
      const ok = ep.responses.find(r => /^2/.test(r.status));
      const tools = manifest.surface.mcp?.tools.filter(t => t.op === op?.key).map(t => `\`${t.name}\``) ?? [];
      L.push(`| [\`${ep.method} ${ep.path}\`](${ep.key}.md)${ep.deprecated ? ' ~~deprecated~~' : ''} | ${mdEscape(ep.summary) || '—'} | ${ok ? `${ok.status}${ok.schema ? ` \`${ok.schema}${ok.list ? '[]' : ''}\`` : ''}` : '—'} | ${tools.join(', ') || '—'} |`);
    }
    L.push('');
  }
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES));
  L.push('');
  L.push(embedContract({ kind: 'front-api', sourceHash: manifest.source.hash, endpoints: api.endpoints.map(e => e.key) }));
  L.push('');
  return L.join('\n');
}
