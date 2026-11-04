// Non-visual "fronts": an MCP server's tools/resources/prompts and a public HTTP API (OpenAPI).
// Sources: an OpenAPI file (JSON or YAML), an MCP tools/list dump, a live MCP server over stdio,
// or a weshcraft.surface.json combining them. Everything is normalised into one `surface` that
// the manifest, the specs, the catalog page and the parity check read.
import fs from 'node:fs';
import path from 'node:path';
import { parseYaml } from './yaml.mjs';
import { McpStdioClient } from '../figcraft/rpc.mjs';
import { sha, slug } from '../util/common.mjs';

const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

function readStructured(file) {
  const text = fs.readFileSync(file, 'utf8');
  return /\.ya?ml$/i.test(file) || !/^\s*[{[]/.test(text) ? parseYaml(text) : JSON.parse(text);
}

/** JSON Schema -> flat fields [{name, type, required, description, enum, format, min, max, default}] (2 levels, local $ref). */
export function schemaFields(schema, root, { prefix = '', depth = 0, required = [] } = {}) {
  const resolve = s => {
    let n = 0;
    while (s?.$ref && n++ < 8) {
      const m = /^#\/(.+)$/.exec(s.$ref);
      s = m ? m[1].split('/').reduce((o, k) => o?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], root) : null;
    }
    return s ?? {};
  };
  const s = resolve(schema);
  const all = s.allOf ? s.allOf.map(resolve).reduce((a, b) => ({ ...a, ...b, properties: { ...a.properties, ...b.properties }, required: [...(a.required || []), ...(b.required || [])] }), {}) : s;
  const out = [];
  const req = new Set([...(all.required || []), ...required]);
  for (const [name, raw] of Object.entries(all.properties || {})) {
    const p = resolve(raw);
    const type = Array.isArray(p.type) ? p.type.filter(t => t !== 'null').join(' | ') : p.type ?? (p.enum ? 'string' : p.properties ? 'object' : p.items ? 'array' : 'any');
    const itemType = p.items ? (resolve(p.items).type ?? (p.items.$ref ? p.items.$ref.split('/').pop() : 'any')) : null;
    out.push({
      name: prefix + name, type: type === 'array' && itemType ? `${itemType}[]` : type, required: req.has(name),
      description: (p.description ?? '').trim(), enum: p.enum ?? null, format: p.format ?? null,
      min: p.minimum ?? p.minLength ?? p.minItems ?? null, max: p.maximum ?? p.maxLength ?? p.maxItems ?? null,
      default: p.default ?? null, ref: raw?.$ref ? raw.$ref.split('/').pop() : null,
    });
    if (type === 'object' && p.properties && depth < 1) out.push(...schemaFields(p, root, { prefix: `${prefix}${name}.`, depth: depth + 1 }));
  }
  return out;
}

/** Example value for a schema (for "example call" blocks). */
export function exampleFor(fields) {
  const obj = {};
  for (const f of fields.filter(x => !x.name.includes('.'))) {
    const v = f.default ?? (f.enum ? f.enum[0] : f.type === 'integer' ? (f.min ?? 1) : f.type === 'number' ? (f.min ?? 10.5) : f.type === 'boolean' ? true
      : f.type?.endsWith('[]') ? [] : f.type === 'object' ? {} : f.format === 'email' ? 'ada@example.com' : f.format === 'uuid' ? '3f6e…' : f.format === 'date-time' ? '2026-01-31T09:00:00Z' : f.format === 'date' ? '2026-01-31' : f.format === 'uri' ? 'https://example.com' : `<${f.name}>`);
    if (f.required || f.default != null) obj[f.name] = v;
  }
  return obj;
}

function fromOpenApi(doc, origin) {
  const endpoints = [];
  for (const [p, item] of Object.entries(doc.paths || {})) {
    for (const m of METHODS) {
      const op = item?.[m];
      if (!op) continue;
      const deref = x => (x?.$ref ? x.$ref.split('/').slice(1).reduce((o, k) => o?.[k.replace(/~1/g, '/').replace(/~0/g, '~')], doc) : x);
      const params = [...(item.parameters || []), ...(op.parameters || [])].map(deref).filter(Boolean).map(prm => {
        const f = schemaFields({ properties: { [prm.name]: prm.schema || {} }, required: prm.required ? [prm.name] : [] }, doc)[0] || {};
        return { ...f, name: prm.name, in: prm.in, required: !!prm.required || prm.in === 'path', description: (prm.description ?? f.description ?? '').trim() };
      });
      const bodySchema = op.requestBody?.content?.['application/json']?.schema ?? Object.values(op.requestBody?.content || {})[0]?.schema;
      const responses = Object.entries(op.responses || {}).map(([status, r]) => {
        const sch = r?.content?.['application/json']?.schema ?? Object.values(r?.content || {})[0]?.schema;
        const ref = sch?.$ref ?? sch?.items?.$ref ?? sch?.properties?.items?.items?.$ref ?? null;
        return { status: String(status), description: (r?.description ?? '').trim(), schema: ref ? ref.split('/').pop() : sch?.type ?? null, list: !!(sch?.items || sch?.properties?.items) };
      });
      const key = `ep-${m}-${slug(p.replace(/[{}]/g, ''))}`;
      const ep = {
        key, method: m.toUpperCase(), path: p, operationId: op.operationId ?? null, summary: (op.summary ?? '').trim(), description: (op.description ?? '').trim(),
        tags: op.tags ?? [], deprecated: !!op.deprecated, params,
        body: bodySchema ? { ref: bodySchema.$ref ? bodySchema.$ref.split('/').pop() : null, required: !!op.requestBody?.required, fields: schemaFields(bodySchema, doc) } : null,
        responses, security: (op.security ?? doc.security ?? []).flatMap(s => Object.keys(s)),
      };
      ep.fingerprint = sha({ m, p, params: ep.params, body: ep.body, responses: ep.responses, security: ep.security, deprecated: ep.deprecated });
      endpoints.push(ep);
    }
  }
  const schemas = Object.fromEntries(Object.entries(doc.components?.schemas || {}).map(([n, s]) => [n, { name: n, description: (s.description ?? '').trim(), fields: schemaFields(s, doc) }]));
  return {
    title: doc.info?.title ?? 'API', version: doc.info?.version ?? null, description: (doc.info?.description ?? '').trim(),
    servers: (doc.servers || []).map(s => s.url), origin, endpoints, schemas,
    auth: Object.entries(doc.components?.securitySchemes || {}).map(([n, s]) => ({ name: n, type: s.type, scheme: s.scheme ?? s.in ?? null })),
  };
}

function fromMcp({ tools = [], resources = [], prompts = [], server = null, instructions = null }, origin) {
  return {
    server: server?.name ?? null, version: server?.version ?? null, instructions: instructions ?? null, origin,
    tools: tools.map(t => {
      const input = schemaFields(t.inputSchema || {}, t.inputSchema || {});
      const output = t.outputSchema ? schemaFields(t.outputSchema, t.outputSchema) : null;
      const a = t.annotations || {};
      const tool = {
        key: `tool-${slug(t.name)}`, name: t.name, title: t.title ?? a.title ?? null, description: (t.description ?? '').trim(), input, output,
        hints: { readOnly: !!a.readOnlyHint, destructive: a.destructiveHint ?? !a.readOnlyHint, idempotent: !!a.idempotentHint, openWorld: a.openWorldHint ?? true },
      };
      tool.fingerprint = sha({ n: t.name, d: tool.description, i: t.inputSchema ?? null, o: t.outputSchema ?? null, a });
      return tool;
    }).sort((x, y) => x.name.localeCompare(y.name)),
    resources: resources.map(r => ({ uri: r.uri ?? r.uriTemplate, name: r.name ?? r.uri, description: (r.description ?? '').trim(), mimeType: r.mimeType ?? null, template: !!r.uriTemplate })),
    prompts: prompts.map(p => ({ name: p.name, description: (p.description ?? '').trim(), arguments: (p.arguments || []).map(x => ({ name: x.name, required: !!x.required, description: x.description ?? '' })) })),
  };
}

/** Load any supported surface file. */
export function loadSurfaceFile(file) {
  const doc = readStructured(file);
  const dir = path.dirname(file);
  const used = [];
  const rel = f => { const abs = path.resolve(dir, f); used.push(abs); return abs; };
  const done = x => Object.assign(x, { files: [path.resolve(file), ...used] });
  return done(loadSurfaceDoc(doc, file, rel));
}

function loadSurfaceDoc(doc, file, rel) {
  if (doc?.openapi || doc?.swagger) return { name: doc.info?.title ?? path.basename(file), api: fromOpenApi(doc, file), mcp: null };
  const list = doc?.result?.tools ? doc.result : doc?.tools && !doc.weshcraft ? doc : null;
  if (list) return { name: doc.server?.name ?? path.basename(file, path.extname(file)), mcp: fromMcp(list, file), api: null };
  if (doc?.weshcraft || doc?.mcp || doc?.api) {
    const api = doc.api ? (typeof doc.api === 'string' || doc.api.openapi === undefined && doc.api.file ? fromOpenApi(readStructured(rel(doc.api.file ?? doc.api)), rel(doc.api.file ?? doc.api)) : fromOpenApi(doc.api, file)) : null;
    const mcp = doc.mcp ? (typeof doc.mcp === 'string' ? fromMcp(readStructured(rel(doc.mcp)), rel(doc.mcp)) : fromMcp(doc.mcp, file)) : null;
    return { name: doc.name ?? api?.title ?? mcp?.server ?? 'Service', api, mcp, links: doc.links ?? [], functions: Array.isArray(doc.functions) ? doc.functions : null };
  }
  throw new Error(`${file}: not an OpenAPI document, an MCP tools/list result or a weshcraft surface file`);
}

/** Introspect a running MCP server over stdio (the command line is split on spaces; quote with "). */
export async function loadMcpServer(commandLine, { timeoutMs = 30_000 } = {}) {
  const parts = commandLine.match(/"[^"]*"|'[^']*'|\S+/g).map(x => x.replace(/^["']|["']$/g, ''));
  const script = /\.m?js$/.test(parts[0]);
  const client = new McpStdioClient({ command: script ? process.execPath : parts[0], args: script ? parts : parts.slice(1), timeoutMs });
  try {
    await client.start();
    const page = async (method, key) => { const all = []; let cursor; for (let n = 0; n < 50; n++) { const r = await client.request(method, cursor ? { cursor } : {}).catch(() => null); if (!r) break; all.push(...(r[key] || [])); if (!r.nextCursor) break; cursor = r.nextCursor; } return all; };
    const tools = await page('tools/list', 'tools');
    const resources = await page('resources/list', 'resources');
    const templates = await page('resources/templates/list', 'resourceTemplates');
    const prompts = await page('prompts/list', 'prompts');
    const info = client.serverInfo ?? {};
    const raw = { server: info.serverInfo ?? null, instructions: info.instructions ?? null, tools, resources: [...resources, ...templates], prompts };
    return { name: info.serverInfo?.name ?? 'MCP server', mcp: fromMcp(raw, `mcp: ${commandLine}`), api: null, raw };
  } finally { client.close(); }
}

/** Several sources merge into one surface (one MCP server and one API at most). */
export function mergeSurfaces(list) {
  const out = { name: list.map(s => s.name).filter(Boolean).join(' + ') || 'Service', mcp: null, api: null, links: [] };
  for (const s of list) {
    if (s.mcp) out.mcp = out.mcp ? { ...out.mcp, tools: [...out.mcp.tools, ...s.mcp.tools], resources: [...out.mcp.resources, ...s.mcp.resources], prompts: [...out.mcp.prompts, ...s.mcp.prompts] } : s.mcp;
    if (s.api) out.api = out.api ? { ...out.api, endpoints: [...out.api.endpoints, ...s.api.endpoints], schemas: { ...out.api.schemas, ...s.api.schemas } } : s.api;
    out.links.push(...(s.links || []));
    if (s.functions) out.functions = [...(out.functions ?? []), ...s.functions];
  }
  return out;
}

export class SurfaceSource {
  /** @param {{files?: string[], servers?: string[], snapshotDir?: string}} o */
  constructor(o) { this.files = (o.files || []).map(f => path.resolve(f)); this.servers = o.servers || []; this.snapshotDir = o.snapshotDir ?? null; this.inputs = []; }
  describe() { return [...this.files.map(f => path.basename(f)), ...this.servers.map(s => `mcp: ${s.split(/\s+/)[0]}`)].join(' + '); }
  async load() {
    const parts = this.files.map(loadSurfaceFile);
    const inputs = parts.flatMap(p => p.files.map((f, i) => ({ abs: f, arg: i === 0 ? '--surface' : null })));
    for (const s of this.servers) {
      const part = await loadMcpServer(s);
      parts.push(part);
      // A live server is snapshotted next to the specs so CI can check against it.
      if (this.snapshotDir) {
        const abs = path.join(this.snapshotDir, `${slug(part.name)}.mcp.json`);
        fs.mkdirSync(this.snapshotDir, { recursive: true });
        fs.writeFileSync(abs, `${JSON.stringify(part.raw, null, 2)}\n`);
        inputs.push({ abs, arg: '--surface' });
      }
    }
    this.inputs = inputs;
    return parts.length ? mergeSurfaces(parts) : null;
  }
}
