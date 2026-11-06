#!/usr/bin/env node
// WeshCraft CLI. See `weshcraft help`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { sourceFromOptions } from '../src/figcraft/source.mjs';
import { openEditable } from '../src/design/source.mjs';
import { projectDesign } from '../src/design/discover.mjs';
import { Workspace } from '../src/spec/workspace.mjs';
import { WeshCraftMcp } from '../src/mcp/server.mjs';
import { startServer } from '../src/web/server.mjs';
import { checkParity, parityMarkdown } from '../src/parity/check.mjs';
import { buildManifest, emptyModel } from '../src/model/manifest.mjs';
import { collectFiles } from '../src/publish/git.mjs';
import { writeZip } from '../src/util/zip.mjs';
import { writeFileSafe } from '../src/util/common.mjs';
import { codeAtRisk } from '../src/codegraph.mjs';
import { Syncer, parseTarget } from '../src/publish/sync.mjs';
import { SurfaceSource } from '../src/surface/load.mjs';
import { migrate, DESIGN, spec } from '../src/layout.mjs';

const HELP = `weshcraft — a spec-oriented FigCraft: design in the browser or over MCP, get front/back specs that match it.

Everything WeshCraft writes for a project lives in one folder: wcraft/ (the specs, the prototype,
the design documents and the settings).

Usage
  weshcraft serve    [source] [--out DIR] [--port 4600] [--host 127.0.0.1] [--token T] [--agent [CMD]]
                     [--figcraft-web URL] [--no-watch] [--read-only] [--concurrency N]
      Browser workspace: design editor, clickable prototype, live spec builder, parity, publish.
      MCP over HTTP at /mcp. Edits the .figcraft in place (default: wcraft/design/*.figcraft, or start one).
  weshcraft mcp      [source] [--out DIR] [--web [--port 4600]] [--agent [CMD]] [--no-auto] [--read-only]
      MCP server on stdio: design_* (edit the design), weshcraft_* (specs), figcraft_* with a live FigCraft.
  weshcraft new      NAME [--out DIR]                 create wcraft/design/NAME.figcraft (an empty FigCraft document)
  weshcraft generate [source] [--out DIR] [--force] [--agent [CMD]]
  weshcraft check    --file F [--out DIR] [--format text|markdown|json]    exit 1 when out of sync
  weshcraft trace    --file F [--out DIR] [--format text|json]             spec ⇄ code: rescan @weshcraft tags, rewrite wcraft/graph.mjs and wcraft/specs/TRACE.md
  weshcraft diff     --file F [--out DIR] [--against GIT_REF] [--format markdown|json]
      What changed in the design since the specs on disk (or committed at GIT_REF).
  weshcraft publish  [source] --provider github|gitlab --repo OWNER/NAME [--branch B] [--base B] [--api-url URL]
  weshcraft zip      [source] [--out DIR] [--zip FILE] [--provider github|gitlab]
  weshcraft init     [--client claude|opencode|both] [--figcraft-cli PATH] [--attach PORT | --file F]
                     [--surface FILE] [--mcp-server CMD] [--sync TARGET]
      Claude Code: MCP server in .mcp.json. OpenCode 2 / OpenChamber: native plugin in .opencode/plugins
      (--global: ~/.config/opencode/plugins, shared with OpenChamber; --no-plugin: MCP server in opencode.json).

Non-visual fronts (with or without a design)
  --surface FILE             an OpenAPI document (JSON/YAML), an MCP tools/list dump, or a
                             weshcraft.surface.json combining them (repeatable)
  --mcp-server "CMD ARGS"    introspect a running MCP server over stdio (repeatable)

Source (one of)
  --file design.figcraft     read the file (offline, CI); serve re-runs when it is saved
  --mcp [--file F]           spawn \`figcraft-cli mcp\` (headless), optionally opening F
  --attach PORT              drive the running FigCraft app (start it with \`figcraft --control PORT\`)
  --figcraft-cli PATH        figcraft-cli binary (default: $FIGCRAFT_CLI or figcraft-cli on PATH)

Sync (serve, mcp, generate)
  --sync github:OWNER/REPO[@BRANCH]   commit to a branch via the GitHub API after every in-sync run;
                                      the PR is opened once and updated (--no-sync-pr: branch only)
  --sync gitlab:GROUP/PROJECT[@BRANCH] the same on GitLab (MR); --api-url for self-managed
  --sync git[@BRANCH]                 commit in the local repository around --out (Claude Code and
                                      OpenCode see it); --sync-push pushes with your git credentials
  --sync-manual                       only when asked (browser button, weshcraft_sync tool)

Behind a reverse proxy (forward auth)
  --trust-proxy ADDR        trust the identity and the scheme/host that this peer forwards
                            (repeatable: an address, a CIDR, or *). The headers are believed
                            only when the request came from there: Remote-User / X-Forwarded-User,
                            Remote-Email / X-Forwarded-Email, Remote-Groups / X-Forwarded-Groups
  --public-url URL          the address the users reach (the links WeshCraft prints and shares)
  Cross-site requests are refused (the proxy's login does not stop a page on another site from
  posting), the live stream is not buffered, and /healthz needs no token (a proxy's health check).

Agent pass
  --agent                    enrich each spec's Notes with \`claude -p\` and the wesh-spec-* skills
  --agent "my-cli --flags"   any CLI that reads a prompt on stdin and prints markdown

GitHub/GitLab access is inherited: GITHUB_TOKEN/GH_TOKEN, GITLAB_TOKEN/GL_TOKEN, else the account signed in
to OpenChamber, else the gh/glab CLI login, else git credentials. Also: WESHCRAFT_AGENT_CMD, WESHCRAFT_PACKAGE.
`;

function opts(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      file: { type: 'string', short: 'f' }, mcp: { type: 'boolean' }, attach: { type: 'string' }, 'figcraft-cli': { type: 'string' },
      out: { type: 'string', short: 'o' }, port: { type: 'string' }, host: { type: 'string' }, token: { type: 'string' },
      agent: { type: 'string' }, 'figcraft-web': { type: 'string' }, 'no-watch': { type: 'boolean' }, 'read-only': { type: 'boolean' }, 'no-plugin': { type: 'boolean' }, global: { type: 'boolean' }, concurrency: { type: 'string' },
      web: { type: 'boolean' }, 'no-auto': { type: 'boolean' }, force: { type: 'boolean' }, format: { type: 'string' },
      provider: { type: 'string' }, against: { type: 'string' }, repo: { type: 'string' }, branch: { type: 'string' }, base: { type: 'string' }, 'api-url': { type: 'string' },
      zip: { type: 'string' }, title: { type: 'string' }, prefix: { type: 'string' }, help: { type: 'boolean', short: 'h' },
      sync: { type: 'string' }, 'sync-push': { type: 'boolean' }, 'no-sync-pr': { type: 'boolean' }, 'sync-manual': { type: 'boolean' },
      client: { type: 'string' }, surface: { type: 'string', multiple: true }, 'mcp-server': { type: 'string', multiple: true },
      'trust-proxy': { type: 'string', multiple: true }, 'public-url': { type: 'string' },
    },
  });
  return { ...values, positionals };
}

// `--agent` with no value: parseArgs needs a value, so accept a bare flag too.
function normalizeAgent(argv) {
  const i = argv.indexOf('--agent');
  if (i >= 0 && (i === argv.length - 1 || argv[i + 1].startsWith('--'))) argv.splice(i + 1, 0, 'default');
  return argv;
}

function syncer(ws, o) {
  if (!o.sync) return new Syncer(ws);
  return new Syncer(ws, parseTarget(o.sync, { auto: !o['sync-manual'], pr: !o['no-sync-pr'], push: !!o['sync-push'], base: o.base, apiUrl: o['api-url'] }));
}

function workspace(o, { editable = false } = {}) {
  const outDir = path.resolve(o.out ?? '.');
  // A project written before the wcraft folder: move its files in first, so everything is in one place.
  const { relocated } = migrate(outDir, m => process.stderr.write(`weshcraft: ${m}\n`));
  // A path that moved (the design, a surface file) still points at the same file.
  const follow = f => {
    const abs = path.resolve(f);
    const rel = path.relative(outDir, abs).split(path.sep).join('/');
    return relocated[rel] ? path.join(outDir, relocated[rel]) : abs;
  };
  let file = o.file ?? o.positionals[0];
  // serve / mcp in a project: open its design (remembered, wcraft/design/, or the only one in the repo).
  if (!file && editable && !o.mcp && !o.attach) { const found = projectDesign(outDir); if (found) file = path.join(outDir, found.file); }
  if (file) file = follow(file);
  const surfaces = (o.surface ?? []).map(follow), servers = o['mcp-server'] ?? [];
  const surface = surfaces.length || servers.length ? new SurfaceSource({ files: surfaces, servers, snapshotDir: path.join(outDir, DESIGN) }) : null;
  const source = sourceFromOptions({ file: file && path.resolve(file), mcp: o.mcp, attach: o.attach, figcraftCli: o['figcraft-cli'], surfaceOnly: !!surface, editable, readOnly: !!o['read-only'] });
  return new Workspace({
    source, surface, outDir, concurrency: o.concurrency ? Number(o.concurrency) : 6,
    agent: o.agent ? (o.agent === 'default' ? true : o.agent) : false,
  });
}

// `weshcraft check | head`: a closed pipe ends the command quietly.
process.stdout.on('error', e => { if (e.code === 'EPIPE') process.exit(process.exitCode ?? 0); throw e; });

async function main() {
  const [cmd = 'help', ...rest] = process.argv.slice(2);
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') { process.stdout.write(HELP); return; }
  const o = opts(normalizeAgent(rest));
  if (o.help) { process.stdout.write(HELP); return; }

  switch (cmd) {
    case 'serve': {
      const ws = workspace(o, { editable: true });
      const sync = syncer(ws, o);
      const mcp = new WeshCraftMcp({ workspace: ws, syncer: sync });
      const server = await startServer({ workspace: ws, mcp, syncer: sync, port: o.port ? Number(o.port) : 4600, host: o.host, token: o.token || process.env.WESHCRAFT_TOKEN, figcraftWebUrl: o['figcraft-web'], watch: !o['no-watch'], trustProxy: o['trust-proxy'] || [], publicUrl: o['public-url'] || null });
      mcp.webUrl = server.url;
      const shown = o['public-url'] ? o['public-url'].replace(/\/$/, '') : server.url;
      process.stderr.write(`WeshCraft: ${shown}\n  source:  ${ws.describe()}\n  output:  ${ws.outDir}\n  MCP:     ${shown.replace(/\/(\?.*)?$/, '/mcp')}\n  sync:    ${sync.status().target ?? 'off'}${sync.status().auto ? ' (after every in-sync run)' : ''}${o['trust-proxy']?.length ? `\n  proxy:   trusting ${o['trust-proxy'].join(', ')}` : ''}\n`);
      ws.run().catch(e => process.stderr.write(`first run failed: ${e.message}\n`));
      const stop = () => { ws.source?.close(); server.close(); process.exit(0); };
      process.on('exit', () => ws.source?.store?.flush());
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
      return;
    }
    case 'new': {
      const name = o.positionals[0];
      if (!name) { process.stderr.write('weshcraft new NAME\n'); process.exitCode = 2; return; }
      const outDir = path.resolve(o.out ?? '.');
      const file = path.join(outDir, DESIGN, `${name.replace(/[^\w.-]+/g, '-')}.figcraft`);
      if (fs.existsSync(file)) { process.stderr.write(`${path.relative(process.cwd(), file)} already exists\n`); process.exitCode = 1; return; }
      fs.mkdirSync(path.dirname(file), { recursive: true });
      openEditable(file, name);
      process.stdout.write(`created ${path.relative(process.cwd(), file)}. Next: weshcraft serve\n`);
      return;
    }
    case 'mcp': {
      const ws = workspace(o, { editable: true });
      const sync = syncer(ws, o);
      const mcp = new WeshCraftMcp({ workspace: ws, autoRun: !o['no-auto'], syncer: sync });
      if (o.web) {
        const server = await startServer({ workspace: ws, mcp, syncer: sync, port: o.port ? Number(o.port) : 4600, host: o.host, token: o.token || process.env.WESHCRAFT_TOKEN, figcraftWebUrl: o['figcraft-web'], watch: !o['no-watch'], trustProxy: o['trust-proxy'] || [], publicUrl: o['public-url'] || null });
        mcp.webUrl = server.url;
        process.stderr.write(`WeshCraft web: ${server.url}\n`);
      }
      mcp.serveStdio().on('close', () => { ws.source?.close(); process.exit(0); });
      return;
    }
    case 'generate': {
      const ws = workspace(o);
      try {
        const sync = o.sync ? syncer(ws, { ...o, 'sync-manual': true }) : null;
        const r = await ws.run({ force: !!o.force });
        if (sync && r.ok) { const s = await sync.sync(); process.stdout.write(`sync: ${s.changed ? `committed ${s.commit ?? ''} ${s.url ?? ''}` : 'up to date'}\n`); }
        sync?.close();
        for (const j of r.jobs) process.stdout.write(`${j.status.padEnd(9)} ${j.file}\n`);
        process.stdout.write(`\n${r.ok ? 'in sync' : 'OUT OF SYNC'}: ${r.report.checks} checks, ${r.report.errors} errors${r.failed ? `, ${r.failed} specs could not be written` : ''}, ${r.ms} ms → ${ws.outDir}\n`);
        process.exitCode = r.ok ? 0 : 1;
      } finally { ws.source?.close(); }
      return;
    }
    case 'check': {
      const ws = workspace(o);
      try {
        // Compare with a fresh extraction, leaving wcraft/specs/manifest.json and CHANGES.md untouched.
        const { model } = ws.source ? await ws.source.load() : { model: emptyModel() };
        const manifest = buildManifest(model, { surface: ws.surface ? await ws.surface.load() : null });
        const report = checkParity(manifest, ws.outDir);
        // What the code graph says is at risk (when it can): the tests to run.
        const atRisk = report.ok ? null : await codeAtRisk(manifest, ws.outDir, report);
        if (o.format === 'json') process.stdout.write(`${JSON.stringify({ ...report, atRisk }, null, 1)}\n`);
        else if (o.format === 'markdown') process.stdout.write(parityMarkdown(report, manifest, { atRisk }));
        else {
          for (const i of report.issues) process.stdout.write(`${i.level.padEnd(7)} ${i.file}: ${i.message}\n`);
          process.stdout.write(`${report.ok ? 'in sync' : 'OUT OF SYNC'}: ${report.checks} checks, ${report.errors} errors, ${report.warnings} warnings (score ${report.score}%)\n`);
        }
        process.exitCode = report.ok ? 0 : 1;
      } finally { ws.source?.close(); }
      return;
    }
    case 'trace': {
      const ws = workspace(o);
      try {
        await ws.snapshot();
        const tr = ws.writeTrace();
        if (o.format === 'json') process.stdout.write(`${JSON.stringify({ coverage: tr.coverage, unknown: tr.unknown }, null, 1)}\n`);
        else {
          for (const e of tr.elements) if (e.code.length) process.stdout.write(`${e.kind.padEnd(9)} ${e.name}: ${e.code.map(t => `${t.file}:${t.line}${t.symbol ? ` ${t.symbol}` : ''}`).join(', ')}\n`);
          for (const t of tr.unknown) process.stdout.write(`unknown   ${t.file}:${t.line} @weshcraft ${t.ref}\n`);
          process.stdout.write(`${tr.coverage.traced}/${tr.coverage.total} elements have code · ${ws.graphFile} · ${spec('TRACE.md')}\n`);
        }
      } finally { ws.source?.close(); }
      return;
    }
    case 'diff': {
      // Design changes between the manifest committed at --against (default HEAD) or on disk, and now.
      const ws = workspace(o);
      try {
        const out = ws.outDir;
        let prev = null;
        if (o.against) {
          const { execFileSync } = await import('node:child_process');
          const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: out, encoding: 'utf8' }).trim();
          const rel = path.relative(top, path.join(out, spec('manifest.json'))).split(path.sep).join('/');
          try { prev = JSON.parse(execFileSync('git', ['show', `${o.against}:${rel}`], { cwd: top, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { prev = null; }
        } else if (fs.existsSync(path.join(out, spec('manifest.json')))) prev = JSON.parse(fs.readFileSync(path.join(out, spec('manifest.json')), 'utf8'));
        const { model } = ws.source ? await ws.source.load() : { model: emptyModel() };
        const { diffManifests, changesMarkdown, summaryLine } = await import('../src/spec/diff.mjs');
        const d = diffManifests(prev, buildManifest(model, { surface: ws.surface ? await ws.surface.load() : null }));
        if (o.format === 'json') process.stdout.write(`${JSON.stringify(d, null, 1)}\n`);
        else process.stdout.write(d.items.length ? `${changesMarkdown(d, { title: summaryLine(d) })}\n` : 'no design change\n');
      } finally { ws.source?.close(); }
      return;
    }
    case 'publish': {
      const ws = workspace(o);
      try {
        await ws.run();
        const mcp = new WeshCraftMcp({ workspace: ws, autoRun: false });
        const r = await mcp.publish({ provider: o.provider || 'github', repo: o.repo, branch: o.branch, base: o.base, apiUrl: o['api-url'], title: o.title, prefix: o.prefix });
        process.stdout.write(`${r.changed === false ? 'nothing changed' : 'published'}: ${r.url}\n`);
      } finally { ws.source?.close(); }
      return;
    }
    case 'zip': {
      const ws = workspace(o);
      try {
        await ws.run();
        const provider = o.provider === 'gitlab' ? 'gitlab' : 'github';
        const files = collectFiles(ws.outDir, { provider, designInputs: ws.designInputs() });
        const name = ws.manifest.source.name.replace(/[^\w.-]+/g, '-');
        const target = path.resolve(o.zip ?? `${name}-specs.zip`);
        writeFileSafe(target, writeZip(files.map(f => [`${name}/${f.path}`, f.data]))); // atomic
        process.stdout.write(`${files.length} files → ${target}\n`);
      } finally { ws.source?.close(); }
      return;
    }
    case 'init': {
      // MCP config for Claude Code (.mcp.json) and/or OpenCode (opencode.json), in this folder.
      const cli = o['figcraft-cli'] || 'figcraft-cli';
      const surfaceArgs = [...(o.surface ?? []).flatMap(f => ['--surface', f]), ...(o['mcp-server'] ?? []).flatMap(c => ['--mcp-server', c])];
      // Default: WeshCraft edits the project's design itself (wcraft/design/*.figcraft, or design_new).
      const visual = o.attach ? ['--attach', o.attach, '--figcraft-cli', cli] : o.mcp ? ['--mcp', '--figcraft-cli', cli] : o.file ? ['--file', o.file] : [];
      const serverArgs = ['mcp', ...visual, ...surfaceArgs, '--out', '.', '--web', ...(o.sync ? ['--sync', o.sync] : []), ...(o['sync-push'] ? ['--sync-push'] : [])];
      // From a checkout: run this very file. With WESHCRAFT_PACKAGE (e.g. github:you/weshcraft): npx it.
      const command = process.env.WESHCRAFT_PACKAGE ? ['npx', '--yes', process.env.WESHCRAFT_PACKAGE, ...serverArgs] : ['node', fileURLToPath(import.meta.url), ...serverArgs];
      const clients = (o.client || (fs.existsSync('opencode.json') || fs.existsSync('.opencode') ? 'both' : 'claude')).split(',').flatMap(c => (c === 'both' ? ['claude', 'opencode'] : [c]));
      // A file that is not plain JSON (a comment, a trailing comma) must not stop the whole command.
      const readJson = f => {
        if (!fs.existsSync(f)) return {};
        const text = fs.readFileSync(f, 'utf8');
        try { return JSON.parse(text); }
        catch (e) { throw new Error(`${f} is not valid JSON (${e.message}): fix it, or remove the file and run init again`); }
      };
      const writeJson = (f, obj) => writeFileSafe(f, `${JSON.stringify(obj, null, 2)}\n`);
      if (clients.includes('claude')) {
        const cfg = readJson('.mcp.json');
        (cfg.mcpServers ??= {}).weshcraft = { command: command[0], args: command.slice(1) };
        writeJson('.mcp.json', cfg);
        process.stdout.write(`wrote .mcp.json (Claude Code server "weshcraft")\n`);
      }
      if (clients.includes('opencode') && !o['no-plugin']) {
        // Native OpenCode 2 plugin (also OpenChamber): a one-line shim re-exporting the plugin from this
        // checkout, plus .opencode/weshcraft.json when options were given (the plugin detects the rest).
        const base = o.global ? path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'opencode') : '.opencode';
        const plugin = path.join(base, 'plugins', 'weshcraft.js');
        fs.mkdirSync(path.dirname(plugin), { recursive: true });
        const target = new URL('../opencode/plugin.mjs', import.meta.url).href;
        writeFileSafe(plugin, `// WeshCraft for OpenCode (written by \`weshcraft init\`). Re-exports the plugin from the WeshCraft checkout.\nexport { default } from ${JSON.stringify(target)};\n`);
        const cfg = {
          ...(o.file ? { file: o.file } : {}), ...(o.attach ? { attach: Number(o.attach) || o.attach } : {}),
          ...(o.surface?.length ? { surface: o.surface } : {}), ...(o['mcp-server']?.length ? { mcpServer: o['mcp-server'] } : {}),
          ...(o.sync ? { sync: o.sync } : {}), ...(o['figcraft-cli'] ? { figcraftCli: o['figcraft-cli'] } : {}),
        };
        if (Object.keys(cfg).length && !o.global) writeJson(path.join(base, 'weshcraft.json'), cfg);
        process.stdout.write(`wrote ${plugin}${Object.keys(cfg).length && !o.global ? `, ${path.join(base, 'weshcraft.json')}` : ''} (OpenCode 2 / OpenChamber plugin: tools + /weshcraft)\n`);
      } else if (clients.includes('opencode')) {
        const cfg = readJson('opencode.json');
        cfg.$schema ??= 'https://opencode.ai/config.json';
        // OpenCode 2 lists MCP servers under mcp.servers.
        cfg.mcp ??= {};
        (cfg.mcp.servers ??= {}).weshcraft = { type: 'local', command, disabled: false };
        writeJson('opencode.json', cfg);
        process.stdout.write(`wrote opencode.json (OpenCode 2 MCP server "weshcraft")\n`);
      }
      process.stdout.write('Restart your agent, then run /wesh-plan-view-mode.\n');
      return;
    }
    default:
      process.stderr.write(`unknown command ${cmd}\n\n${HELP}`);
      process.exitCode = 2;
  }
}

main().catch(e => { process.stderr.write(`weshcraft: ${e.message}\n`); process.exitCode = 1; });
