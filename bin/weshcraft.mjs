#!/usr/bin/env node
// WeshCraft CLI. See `weshcraft help`.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { sourceFromOptions } from '../src/figcraft/source.mjs';
import { Workspace } from '../src/spec/workspace.mjs';
import { WeshCraftMcp } from '../src/mcp/server.mjs';
import { startServer } from '../src/web/server.mjs';
import { checkParity, parityMarkdown } from '../src/parity/check.mjs';
import { buildManifest } from '../src/model/manifest.mjs';
import { collectFiles } from '../src/publish/git.mjs';
import { writeZip } from '../src/util/zip.mjs';

const HELP = `weshcraft — FigCraft prototype in, front/back specs that match it out.

Usage
  weshcraft serve    [source] [--out DIR] [--port 4600] [--host 127.0.0.1] [--token T] [--agent [CMD]]
                     [--figcraft-web URL] [--no-watch] [--concurrency N]
      Browser workspace: clickable prototype, live spec builder, parity, publish. MCP over HTTP at /mcp.
  weshcraft mcp      [source] [--out DIR] [--web [--port 4600]] [--agent [CMD]] [--no-auto]
      MCP server on stdio: the FigCraft tools (as figcraft_*) plus weshcraft_* tools.
  weshcraft generate [source] [--out DIR] [--force] [--agent [CMD]]
  weshcraft check    --file F [--out DIR] [--format text|markdown|json]    exit 1 when out of sync
  weshcraft publish  [source] --provider github|gitlab --repo OWNER/NAME [--branch B] [--base B] [--api-url URL]
  weshcraft zip      [source] [--out DIR] [--zip FILE] [--provider github|gitlab]
  weshcraft init     [--figcraft-cli PATH] [--attach PORT]    write .mcp.json for Claude Code

Source (one of)
  --file design.figcraft     read the file (offline, CI); serve re-runs when it is saved
  --mcp [--file F]           spawn \`figcraft-cli mcp\` (headless), optionally opening F
  --attach PORT              drive the running FigCraft app (start it with \`figcraft --control PORT\`)
  --figcraft-cli PATH        figcraft-cli binary (default: $FIGCRAFT_CLI or figcraft-cli on PATH)

Agent pass
  --agent                    enrich each spec's Notes with \`claude -p\` and the wesh-spec-* skills
  --agent "my-cli --flags"   any CLI that reads a prompt on stdin and prints markdown

Environment: GITHUB_TOKEN, GITLAB_TOKEN, WESHCRAFT_AGENT_CMD, WESHCRAFT_PACKAGE (for CI templates).
`;

function opts(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    strict: true,
    options: {
      file: { type: 'string', short: 'f' }, mcp: { type: 'boolean' }, attach: { type: 'string' }, 'figcraft-cli': { type: 'string' },
      out: { type: 'string', short: 'o' }, port: { type: 'string' }, host: { type: 'string' }, token: { type: 'string' },
      agent: { type: 'string' }, 'figcraft-web': { type: 'string' }, 'no-watch': { type: 'boolean' }, concurrency: { type: 'string' },
      web: { type: 'boolean' }, 'no-auto': { type: 'boolean' }, force: { type: 'boolean' }, format: { type: 'string' },
      provider: { type: 'string' }, repo: { type: 'string' }, branch: { type: 'string' }, base: { type: 'string' }, 'api-url': { type: 'string' },
      zip: { type: 'string' }, title: { type: 'string' }, prefix: { type: 'string' }, help: { type: 'boolean', short: 'h' },
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

function workspace(o) {
  const file = o.file ?? o.positionals[0];
  const source = sourceFromOptions({ file: file && path.resolve(file), mcp: o.mcp, attach: o.attach, figcraftCli: o['figcraft-cli'] });
  return new Workspace({
    source, outDir: path.resolve(o.out ?? '.'), concurrency: o.concurrency ? Number(o.concurrency) : 6,
    agent: o.agent ? (o.agent === 'default' ? true : o.agent) : false,
  });
}

async function main() {
  const [cmd = 'help', ...rest] = process.argv.slice(2);
  if (cmd === 'help' || cmd === '--help' || cmd === '-h') { process.stdout.write(HELP); return; }
  const o = opts(normalizeAgent(rest));
  if (o.help) { process.stdout.write(HELP); return; }

  switch (cmd) {
    case 'serve': {
      const ws = workspace(o);
      const mcp = new WeshCraftMcp({ workspace: ws });
      const server = await startServer({ workspace: ws, mcp, port: o.port ? Number(o.port) : 4600, host: o.host, token: o.token || process.env.WESHCRAFT_TOKEN, figcraftWebUrl: o['figcraft-web'], watch: !o['no-watch'] });
      mcp.webUrl = server.url;
      process.stderr.write(`WeshCraft: ${server.url}\n  source:  ${ws.source.describe()}\n  output:  ${ws.outDir}\n  MCP:     ${server.url.replace(/\/(\?.*)?$/, '/mcp')}\n`);
      ws.run().catch(e => process.stderr.write(`first run failed: ${e.message}\n`));
      const stop = () => { ws.source.close(); server.close(); process.exit(0); };
      process.on('SIGINT', stop);
      process.on('SIGTERM', stop);
      return;
    }
    case 'mcp': {
      const ws = workspace(o);
      const mcp = new WeshCraftMcp({ workspace: ws, autoRun: !o['no-auto'] });
      if (o.web) {
        const server = await startServer({ workspace: ws, mcp, port: o.port ? Number(o.port) : 4600, host: o.host, token: o.token || process.env.WESHCRAFT_TOKEN, figcraftWebUrl: o['figcraft-web'], watch: !o['no-watch'] });
        mcp.webUrl = server.url;
        process.stderr.write(`WeshCraft web: ${server.url}\n`);
      }
      mcp.serveStdio().on('close', () => { ws.source.close(); process.exit(0); });
      return;
    }
    case 'generate': {
      const ws = workspace(o);
      try {
        const r = await ws.run({ force: !!o.force });
        for (const j of r.jobs) process.stdout.write(`${j.status.padEnd(9)} ${j.file}\n`);
        process.stdout.write(`\n${r.report.ok ? 'in sync' : 'OUT OF SYNC'}: ${r.report.checks} checks, ${r.report.errors} errors, ${r.ms} ms → ${ws.outDir}\n`);
        process.exitCode = r.report.ok ? 0 : 1;
      } finally { ws.source.close(); }
      return;
    }
    case 'check': {
      const ws = workspace(o);
      try {
        await ws.snapshot();
        const manifest = buildManifest(ws.model);
        const report = checkParity(manifest, ws.outDir);
        if (o.format === 'json') process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
        else if (o.format === 'markdown') process.stdout.write(parityMarkdown(report, manifest));
        else {
          for (const i of report.issues) process.stdout.write(`${i.level.padEnd(7)} ${i.file}: ${i.message}\n`);
          process.stdout.write(`${report.ok ? 'in sync' : 'OUT OF SYNC'}: ${report.checks} checks, ${report.errors} errors, ${report.warnings} warnings (score ${report.score}%)\n`);
        }
        process.exitCode = report.ok ? 0 : 1;
      } finally { ws.source.close(); }
      return;
    }
    case 'publish': {
      const ws = workspace(o);
      try {
        await ws.run();
        const mcp = new WeshCraftMcp({ workspace: ws, autoRun: false });
        const r = await mcp.publish({ provider: o.provider || 'github', repo: o.repo, branch: o.branch, base: o.base, apiUrl: o['api-url'], title: o.title, prefix: o.prefix });
        process.stdout.write(`${r.changed === false ? 'nothing changed' : 'published'}: ${r.url}\n`);
      } finally { ws.source.close(); }
      return;
    }
    case 'zip': {
      const ws = workspace(o);
      try {
        await ws.run();
        const provider = o.provider === 'gitlab' ? 'gitlab' : 'github';
        const files = collectFiles(ws.outDir, { provider, designFile: ws.source.file });
        const name = ws.manifest.source.name.replace(/[^\w.-]+/g, '-');
        const target = path.resolve(o.zip ?? `${name}-specs.zip`);
        fs.writeFileSync(target, writeZip(files.map(f => [`${name}/${f.path}`, f.data])));
        process.stdout.write(`${files.length} files → ${target}\n`);
      } finally { ws.source.close(); }
      return;
    }
    case 'init': {
      const file = path.resolve('.mcp.json');
      const cfg = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
      cfg.mcpServers ??= {};
      const cli = o['figcraft-cli'] || 'figcraft-cli';
      const serverArgs = ['mcp', ...(o.attach ? ['--attach', o.attach] : ['--mcp']), '--figcraft-cli', cli, '--out', '.', '--web'];
      // From a checkout: run this very file. With WESHCRAFT_PACKAGE (e.g. github:you/weshcraft): npx it.
      cfg.mcpServers.weshcraft = process.env.WESHCRAFT_PACKAGE
        ? { command: 'npx', args: ['--yes', process.env.WESHCRAFT_PACKAGE, ...serverArgs] }
        : { command: 'node', args: [fileURLToPath(import.meta.url), ...serverArgs] };
      fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
      process.stdout.write(`wrote ${file} (server "weshcraft"). Restart Claude Code, then run /wesh-plan-view-mode.\n`);
      return;
    }
    default:
      process.stderr.write(`unknown command ${cmd}\n\n${HELP}`);
      process.exitCode = 2;
  }
}

main().catch(e => { process.stderr.write(`weshcraft: ${e.message}\n`); process.exitCode = 1; });
