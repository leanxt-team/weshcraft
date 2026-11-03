// MCP client for FigCraft's server: newline-delimited JSON-RPC 2.0 over stdio
// (`figcraft-cli mcp` headless, or `figcraft-cli mcp --attach <port>` to drive the running app).
import { spawn } from 'node:child_process';
import readline from 'node:readline';

export class McpStdioClient {
  /** @param {{command: string, args?: string[], cwd?: string, env?: object, timeoutMs?: number}} opts */
  constructor(opts) {
    this.opts = { ...opts, args: opts.args ?? [], timeoutMs: opts.timeoutMs ?? 120_000 };
    this.nextId = 1;
    this.pending = new Map();
    this.proc = null;
    this.serverInfo = null;
    this.stderr = '';
  }

  async start() {
    if (this.proc) return this;
    const { command, args, cwd, env } = this.opts;
    this.proc = spawn(command, args, { cwd, env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    this.proc.stderr.on('data', d => { this.stderr = (this.stderr + d).slice(-8000); });
    this.proc.on('exit', code => {
      const err = new Error(`figcraft MCP server exited (code ${code}). ${this.stderr.trim().split('\n').slice(-3).join(' ')}`);
      for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(err); }
      this.pending.clear();
      this.proc = null;
    });
    this.proc.on('error', e => {
      for (const { reject, timer } of this.pending.values()) { clearTimeout(timer); reject(e); }
      this.pending.clear();
    });
    readline.createInterface({ input: this.proc.stdout, crlfDelay: Infinity }).on('line', line => this.#onLine(line));
    const init = await this.request('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'weshcraft', version: '0.1.0' },
    });
    this.serverInfo = init;
    this.notify('notifications/initialized', {});
    return this;
  }

  #onLine(line) {
    if (!line.trim()) return;
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.id == null || !this.pending.has(msg.id)) return;
    const { resolve, reject, timer } = this.pending.get(msg.id);
    clearTimeout(timer);
    this.pending.delete(msg.id);
    if (msg.error) reject(Object.assign(new Error(msg.error.message || 'MCP error'), { code: msg.error.code, data: msg.error.data }));
    else resolve(msg.result);
  }

  request(method, params) {
    if (!this.proc) return Promise.reject(new Error('figcraft MCP server is not running'));
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`figcraft MCP: ${method} timed out after ${this.opts.timeoutMs} ms`));
      }, this.opts.timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.proc.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
    });
  }

  notify(method, params) {
    this.proc?.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`);
  }

  listTools() { return this.request('tools/list', {}).then(r => r.tools || []); }

  /** Raw MCP tools/call result ({content, isError}). */
  callToolRaw(name, args = {}) { return this.request('tools/call', { name, arguments: args }); }

  /** tools/call, decoded: JSON text parsed, images returned as {mimeType, data}. Throws on isError. */
  async callTool(name, args = {}) {
    const r = await this.callToolRaw(name, args);
    const text = (r.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
    if (r.isError) throw new Error(`figcraft ${name}: ${text || 'tool error'}`);
    const images = (r.content || []).filter(c => c.type === 'image').map(c => ({ mimeType: c.mimeType, data: c.data }));
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* plain text result */ }
    return { json, text, images };
  }

  async runCommand(command, params = {}) {
    return (await this.callTool('run_command', { command, params })).json;
  }

  close() {
    if (!this.proc) return;
    this.proc.stdin.end();
    const p = this.proc;
    setTimeout(() => p.kill(), 500).unref();
  }
}
