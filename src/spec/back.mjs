// Back-end specs derived from the prototype: the domain model (entities and fields shown on
// screens), the operations screens trigger, and an OpenAPI 3.1 document. Each item records whether
// the designer stated it (explicit: pluginData `weshcraft`, `{{entity.field}}` text, `@entity.field`
// layer names, `GET /path` annotations) or WeshCraft inferred it (repeated components, action
// labels). Inferred items are listed as open questions until a designer or agent confirms them.
import { mdEscape, slug } from '../util/common.mjs';
import { embedContract, notesBlock } from './contract.mjs';
import { entityAnchor } from './links.mjs';

const NOTES_PLACEHOLDER = '_No notes yet. Agent or human additions go here; WeshCraft keeps this block when it regenerates the file._';
const ref = id => `\`#${id}\``;
const JSON_TYPES = { string: 'string', number: 'number', integer: 'integer', boolean: 'boolean', date: 'string', datetime: 'string', url: 'string', email: 'string', id: 'string' };
const FORMATS = { date: 'date', datetime: 'date-time', url: 'uri', email: 'email', id: 'uuid' };

function sample(manifest, field) {
  for (const s of manifest.screens) {
    for (const t of s.texts) if (field.sources.includes(t.id)) return t.characters;
    for (const i of s.instances) if (field.sources.includes(i.id)) {
      const v = Object.entries(i.props || {}).find(([k]) => slug(k.replace(/#.*$/, '')) === slug(field.name))?.[1];
      if (v != null) return typeof v === 'object' ? v.value ?? JSON.stringify(v) : String(v);
    }
  }
  return null;
}

export function domainSpec(manifest, { notes } = {}) {
  const { entities } = manifest.domain;
  const L = ['# Domain model', ''];
  L.push('Entities and fields the prototype displays or edits. Types come from explicit bindings; inferred fields default to `string` until confirmed.');
  L.push('');
  if (!entities.length) {
    L.push('No data-bearing elements were found. Bind layers to data in FigCraft to make them part of the contract:');
    L.push('');
    L.push('- text content `{{trail.name}}` or `{{trail.distance:number}}`');
    L.push('- a layer name `@trail.rating:number`');
    L.push('- layer data `set_properties {props: {pluginData: {weshcraft: "{\\"entity\\":\\"Trail\\",\\"field\\":\\"name\\"}"}}}`');
  }
  for (const e of entities) {
    L.push(`<a id="${entityAnchor(e.name)}"></a>`);
    L.push(`## ${e.name}`);
    L.push('');
    L.push(e.sources.length ? `Source layers: ${e.sources.map(ref).join(', ')} · ${e.confidence}` : `Source: API schema \`${e.schema ?? e.name}\` · ${e.confidence}`);
    L.push('');
    L.push('| Field | Type | Example | Shown by | Screens | Loaded by | Confidence |');
    L.push('|---|---|---|---|---|---|---|');
    L.push(`| id | id | — | — | — | — | required |`);
    for (const f of e.fields) {
      const shown = manifest.links.edges.filter(x => x.field === `${e.name}.${f.name}`);
      const screens = [...new Set(shown.map(x => x.screen))].map(k => `[${mdEscape(manifest.screens.find(s => s.key === k)?.name ?? k)}](../front/screens/${k}.md)`);
      const via = [...new Set(shown.map(x => x.via))].map(k => manifest.domain.operations.find(o => o.key === k)).map(o => (o ? `[\`${o.method} ${o.path}\`](api.md#${o.key})` : '⚠️ nothing'));
      L.push(`| ${f.name} | ${f.type} | ${mdEscape(sample(manifest, f) ?? '—')} | ${f.sources.map(ref).join(', ')} | ${screens.join(', ') || '—'} | ${via.join(', ') || '—'} | ${f.confidence} |`);
    }
    L.push('');
  }
  const open = entities.flatMap(e => e.fields.filter(f => f.confidence !== 'explicit').map(f => `${e.name}.${f.name}`));
  if (open.length) {
    L.push('## Open questions');
    L.push('');
    for (const o of open) L.push(`- Confirm type and constraints of \`${o}\` (inferred from a component property).`);
    L.push('');
  }
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'back-domain', sourceHash: manifest.source.hash, entities: entities.map(e => ({ name: e.name, fields: e.fields.map(f => f.name) })) }));
  L.push('');
  return L.join('\n');
}

export function apiSpec(manifest, { notes } = {}) {
  const ops = manifest.domain.operations;
  const L = ['# API', ''];
  L.push('Every operation a screen needs, grouped by screen. Conventions (auth, errors, pagination) are in [conventions](conventions.md); the machine-readable contract is [`openapi.json`](openapi.json).');
  L.push('');
  if (!ops.length) L.push('The prototype triggers no back-end operation. Annotate a layer with `GET /path` (Dev Mode annotation) or name actions with verbs (Save, Create, Continue…) to add one.');
  const groups = [...manifest.screens, ...(ops.some(o => o.screen === 'api') ? [{ key: 'api', name: 'Public API', inputs: [] }] : [])];
  for (const s of groups) {
    const here = ops.filter(o => o.screen === s.key);
    if (!here.length) continue;
    L.push(`## ${s.name}`);
    L.push('');
    for (const o of here) {
      L.push(`<a id="${o.key}"></a>`);
      L.push(`### \`${o.method} ${o.path}\` — ${mdEscape(o.name)}`);
      L.push('');
      L.push(s.key === 'api'
        ? `- Public endpoint: [\`${o.method} ${o.path}\`](../front/api/${o.endpoint}.md)`
        : `- Screen: [${mdEscape(s.name)}](../front/screens/${s.key}.md)${o.trigger ? `, triggered by ${ref(o.trigger)}` : ', on screen load'}`);
      const tools = manifest.surface?.mcp?.tools.filter(t => t.op === o.key) ?? [];
      if (tools.length) L.push(`- MCP: ${tools.map(t => `[\`${t.name}\`](../front/mcp/${t.key}.md)`).join(', ')}`);
      L.push(`- Kind: ${o.kind} · confidence: ${o.confidence}`);
      const used = manifest.links.edges.filter(x => x.op === o.key);
      // Screens' layers; MCP tools and public endpoints have their own lines above.
      const layers = used.filter(x => typeof x.node === 'number');
      if (layers.length) L.push(`- Front end: ${layers.map(x => `${{ triggers: '▶', submits: '⇢', lists: '☰' }[x.rel]} \`#${x.node}\` ${mdEscape(x.label)}`).join(' · ')}`);
      if (o.entity) {
        const shown = manifest.links.edges.filter(x => x.via === o.key);
        if (shown.length) L.push(`- Response shown: ${[...new Set(shown.map(x => x.field))].map(f => `\`${f}\` (${shown.filter(x => x.field === f).map(x => `\`#${x.node}\``).join(' ')})`).join(', ')}`);
      }
      if (o.entity) L.push(o.kind === 'list' ? `- Returns: \`${o.entity}[]\` (paginated)` : `- Returns: \`${o.entity}\``);
      const fields = (o.fields || []).map(id => s.inputs.find(i => i.id === id)).filter(Boolean);
      if (fields.length) L.push(`- Request body: ${fields.map(f => `\`${slug(f.name).replace(/-/g, '_')}\` from ${ref(f.id)}`).join(', ')}`);
      L.push(`- Errors: 400 validation (field errors shown next to the inputs), 401 unauthenticated, 409 conflict, 5xx shown as a retryable banner.`);
      L.push('');
    }
  }
  const inferred = ops.filter(o => o.confidence !== 'explicit');
  if (inferred.length) {
    L.push('## Open questions');
    L.push('');
    for (const o of inferred) L.push(`- \`${o.method} ${o.path}\` (${mdEscape(o.name)}) is inferred from ${o.kind === 'list' ? 'a repeated component' : 'an action label'}: confirm path, payload and whether it is needed.`);
    L.push('');
  }
  L.push('## Notes');
  L.push('');
  L.push(notesBlock(notes, NOTES_PLACEHOLDER));
  L.push('');
  L.push(embedContract({ kind: 'back-api', sourceHash: manifest.source.hash, operations: ops.map(o => ({ key: o.key, method: o.method, path: o.path, screen: o.screen, trigger: o.trigger })) }));
  L.push('');
  return L.join('\n');
}

export function openapi(manifest) {
  const schemas = {};
  for (const e of manifest.domain.entities) {
    schemas[e.name] = {
      type: 'object', required: ['id'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        ...Object.fromEntries(e.fields.map(f => [f.name, { type: JSON_TYPES[f.type] ?? 'string', ...(FORMATS[f.type] ? { format: FORMATS[f.type] } : {}), 'x-weshcraft-nodes': f.sources, 'x-weshcraft-confidence': f.confidence }])),
      },
    };
  }
  schemas.Error = { type: 'object', required: ['code', 'message'], properties: { code: { type: 'string' }, message: { type: 'string' }, fields: { type: 'object', additionalProperties: { type: 'string' } } } };
  const paths = {};
  for (const o of manifest.domain.operations) {
    const s = manifest.screens.find(x => x.key === o.screen);
    const fields = (o.fields || []).map(id => s?.inputs.find(i => i.id === id)).filter(Boolean);
    const op = {
      operationId: o.key.replace(/^op-/, '').replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase()),
      summary: o.name,
      tags: [s?.name ?? 'default'],
      responses: {
        [o.method === 'POST' ? '201' : o.method === 'DELETE' ? '204' : '200']: !o.entity
          ? { description: 'OK' }
          : o.kind === 'list'
            ? { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { items: { type: 'array', items: { $ref: `#/components/schemas/${o.entity}` } }, next: { type: ['string', 'null'] } } } } } }
            : { description: 'OK', content: { 'application/json': { schema: { $ref: `#/components/schemas/${o.entity}` } } } },
        400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        401: { description: 'Unauthenticated' },
      },
    };
    if (o.kind === 'list') op.parameters = [{ name: 'cursor', in: 'query', schema: { type: 'string' } }, { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }];
    // A public endpoint keeps its own parameters, body and tags.
    const ep = o.endpoint && manifest.surface?.api?.endpoints.find(e => e.key === o.endpoint);
    const jsonType = f => ({ type: /\[\]$/.test(f.type) ? 'array' : ['string', 'integer', 'number', 'boolean', 'object', 'array'].includes(f.type) ? f.type : 'string', ...(f.format ? { format: f.format } : {}), ...(f.enum ? { enum: f.enum } : {}), ...(f.description ? { description: f.description } : {}) });
    if (ep) {
      op.tags = ep.tags.length ? ep.tags : ['Public API'];
      if (ep.operationId) op.operationId = ep.operationId;
      if (ep.params.length) op.parameters = ep.params.map(p => ({ name: p.name, in: p.in, required: !!p.required, schema: jsonType(p), ...(p.description ? { description: p.description } : {}) }));
      if (ep.body) op.requestBody = { required: ep.body.required, content: { 'application/json': { schema: ep.body.ref ? { $ref: `#/components/schemas/${ep.body.ref}` } : { type: 'object', required: ep.body.fields.filter(f => f.required && !f.name.includes('.')).map(f => f.name), properties: Object.fromEntries(ep.body.fields.filter(f => !f.name.includes('.')).map(f => [f.name, jsonType(f)])) } } } };
      if (ep.body?.ref && !schemas[ep.body.ref]) {
        const sch = manifest.surface.api.schemas[ep.body.ref];
        if (sch) schemas[ep.body.ref] = { type: 'object', required: sch.fields.filter(f => f.required && !f.name.includes('.')).map(f => f.name), properties: Object.fromEntries(sch.fields.filter(f => !f.name.includes('.')).map(f => [f.name, jsonType(f)])) };
      }
      for (const r of ep.responses) if (!op.responses[r.status]) op.responses[r.status] = { description: r.description || 'See the API description' };
    } else if (fields.length && o.method !== 'GET' && o.method !== 'DELETE') {
      op.requestBody = { required: true, content: { 'application/json': { schema: { type: 'object', properties: Object.fromEntries(fields.map(f => [slug(f.name).replace(/-/g, '_'), { type: 'string', 'x-weshcraft-node': f.id }])) } } } };
    }
    const existing = paths[o.path]?.[o.method.toLowerCase()];
    if (existing) {
      // The same endpoint backs several screens: one operation, every caller listed.
      existing['x-weshcraft'].keys.push(o.key);
      existing['x-weshcraft'].screens.push(o.screen);
      continue;
    }
    op['x-weshcraft'] = { keys: [o.key], screens: [o.screen], trigger: o.trigger, confidence: o.confidence, sources: o.sources };
    (paths[o.path] ??= {})[o.method.toLowerCase()] = op;
  }
  return {
    openapi: '3.1.0',
    info: { title: `${manifest.source.name} API`, version: '0.1.0', 'x-weshcraft-source-hash': manifest.source.hash },
    paths,
    components: { schemas, securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } } },
    security: [{ bearer: [] }],
  };
}

export function conventionsSpec(manifest, { notes } = {}) {
  return [
    '# Back-end conventions',
    '',
    'Applies to every operation in [API](api.md) unless the operation says otherwise.',
    '',
    '- **Transport**: JSON over HTTPS, UTF-8, `application/json`. Times are RFC 3339 UTC.',
    '- **Auth**: bearer token on every call; unauthenticated calls get `401`, forbidden ones `403`.',
    '- **Validation**: done on the server for every write; errors are `400 {code, message, fields}` where `fields` maps each request field to a message the screen shows next to its input.',
    '- **Lists**: cursor pagination (`?cursor=&limit=`, limit 1–100, default 20), stable order, `next: null` on the last page.',
    '- **Idempotency**: `POST` accepts an `Idempotency-Key` header; a repeat within 24 h returns the first result.',
    '- **Concurrency**: updates carry `If-Match` with the entity ETag; a stale write gets `409`.',
    '- **Observability**: each request logs a request id (returned as `X-Request-Id`), route, status and latency; no personal data in logs.',
    '- **Performance**: p95 under 300 ms for reads backing a screen\'s first paint.',
    '',
    '## Notes',
    '',
    notesBlock(notes, NOTES_PLACEHOLDER),
    '',
    embedContract({ kind: 'back-conventions', sourceHash: manifest.source.hash }),
    '',
  ].join('\n');
}
