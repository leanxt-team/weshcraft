// Where the prototype comes from: a .figcraft file on disk (offline, CI) or a live FigCraft
// session over MCP (headless `figcraft-cli mcp`, or `--attach <port>` to the running app).
import fs from 'node:fs';
import { readZip } from '../util/zip.mjs';
import { fromFigcraftFile, fromInspect, variablesFromRest } from '../model/normalize.mjs';
import { McpStdioClient } from './rpc.mjs';

export function readFigcraftArchive(file) {
  const buf = fs.readFileSync(file);
  if (buf[0] === 0x7b) return { document: JSON.parse(buf.toString('utf8')), thumbnail: null }; // plain JSON
  const entries = readZip(buf);
  const doc = entries.get('document.json');
  if (!doc) throw new Error(`${file}: no document.json in archive`);
  return { document: JSON.parse(doc.toString('utf8')), thumbnail: entries.get('thumbnail.png') ?? null, images: entries };
}

export class FileSource {
  constructor(file) { this.file = file; this.kind = 'file'; }
  describe() { return `file ${this.file}`; }
  async load() {
    const { document, thumbnail } = readFigcraftArchive(this.file);
    return { model: fromFigcraftFile(document), thumbnail };
  }
  /** Renders are not available offline; the prototype falls back to WeshCraft's own HTML. */
  async render() { return null; }
  async code() { return null; }
  close() {}
}

export class McpSource {
  /** @param {{command?: string, args?: string[], attach?: string|number, file?: string, timeoutMs?: number}} o */
  constructor(o = {}) {
    this.kind = 'mcp';
    const args = ['mcp', ...(o.attach ? ['--attach', String(o.attach)] : []), ...(o.args || [])];
    const cmd = o.command || process.env.FIGCRAFT_CLI || 'figcraft-cli';
    // A .js/.mjs "CLI" (e.g. the test double) runs under this Node.
    const script = /\.m?js$/.test(cmd);
    this.client = new McpStdioClient({ command: script ? process.execPath : cmd, args: script ? [cmd, ...args] : args, timeoutMs: o.timeoutMs });
    this.file = o.file || null;
    this.attach = o.attach || null;
    this.opened = false;
  }
  describe() { return this.attach ? `FigCraft app on port ${this.attach} (MCP)` : `figcraft-cli mcp${this.file ? ` ${this.file}` : ''}`; }

  async ensure() {
    await this.client.start();
    if (this.file && !this.opened) {
      await this.client.callTool('open_file', { path: this.file });
      this.opened = true;
    }
    return this.client;
  }

  async load() {
    const c = await this.ensure();
    const { json } = await c.callTool('inspect_document', { depth: 64, allPages: true, maxBytes: 64 * 1024 * 1024 });
    let variables = null;
    try {
      const v = await c.runCommand('variable.export', {});
      variables = variablesFromRest(typeof v?.text === 'string' ? JSON.parse(v.text) : v);
    } catch { /* older builds: tokens come only from bound names */ }
    const model = fromInspect(json, variables);
    if (model.truncated) throw new Error('FigCraft returned a truncated tree; the parity contract needs the whole document (raise maxBytes or split the file)');
    return { model, thumbnail: null };
  }

  /** PNG of a layer from FigCraft's own renderer: the visual reference for the prototype. */
  async render(id, scale = 2) {
    const c = await this.ensure();
    const r = await c.callTool('export', { ids: [id], format: 'png', scale });
    return r.images[0] ? Buffer.from(r.images[0].data, 'base64') : null;
  }

  /** FigCraft Dev Mode code for a layer (`html`, `react`, `tailwind`, `css`, ...). */
  async code(id, language = 'html') {
    const c = await this.ensure();
    const r = await c.runCommand('inspect.code', { id, language });
    return r?.code ?? null;
  }

  async call(name, args) { const c = await this.ensure(); return c.callToolRaw(name, args); }
  async tools() { const c = await this.ensure(); return c.listTools(); }
  close() { this.client.close(); }
}

export function sourceFromOptions(o) {
  if (o.attach || o.mcp) return new McpSource({ attach: o.attach, file: o.file, command: o.figcraftCli });
  if (!o.file) {
    if (o.surfaceOnly) return null;
    throw new Error('give a .figcraft file (--file), a FigCraft MCP source (--mcp / --attach <port>), or a non-visual front (--surface openapi.yaml|weshcraft.surface.json|tools.json, --mcp-server "cmd")');
  }
  return new FileSource(o.file);
}
