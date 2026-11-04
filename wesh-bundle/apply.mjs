#!/usr/bin/env node
// Adds WeshCraft view mode to a wesh checkout: /wesh-plan-view-mode (slash-only) plus the
// wesh-spec-front and wesh-spec-back skills, and registers them where wesh lists its skills.
// Idempotent: running it twice changes nothing the second time; on a wesh with an earlier bundle it
// brings the skills and the wesh-review clause up to date.
//   node apply.mjs /path/to/wesh            then, in wesh:  node install.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const wesh = path.resolve(process.argv[2] || '.');
const must = f => { if (!fs.existsSync(path.join(wesh, f))) { console.error(`${wesh} is not a wesh checkout (missing ${f})`); process.exit(2); } };
['install.mjs', 'core/CORE.md', 'README.md', 'skills/wesh-plan/SKILL.md'].forEach(must);

const changed = [];
const edit = (rel, fn) => {
  const f = path.join(wesh, rel);
  if (!fs.existsSync(f)) return;
  const before = fs.readFileSync(f, 'utf8');
  const after = fn(before);
  if (after !== before) { fs.writeFileSync(f, after); changed.push(rel); }
};

for (const name of ['wesh-plan-view-mode', 'wesh-spec-front', 'wesh-spec-back']) {
  // Every file of the skill (SKILL.md, and FORMAT.md for the advanced spec format).
  for (const file of fs.readdirSync(path.join(HERE, 'skills', name))) {
    const text = fs.readFileSync(path.join(HERE, 'skills', name, file), 'utf8');
    const rel = `skills/${name}/${file}`;
    const dst = path.join(wesh, rel);
    if (!fs.existsSync(dst) || fs.readFileSync(dst, 'utf8') !== text) {
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.writeFileSync(dst, text);
      changed.push(rel);
    }
  }
}

// wesh-plan and wesh-review recognise the advanced spec format.
edit('skills/wesh-plan/SKILL.md', s => (s.includes('wesh-plan-view-mode') ? s : s.replace('## 3. Write the spec\n', '## 3. Write the spec\nUI work with a FigCraft prototype, or a repo that already holds `specs/manifest.json` (WeshCraft advanced spec): suggest `/wesh-plan-view-mode` instead; it writes design, prototype and contract-checked front/back specs and keeps them in git.\n')));
const REVIEW_SPEC = 'WeshCraft advanced spec (`specs/manifest.json`, schema `weshcraft/manifest@*`): run `weshcraft check` first (out of sync is a finding); the spec is each screen\'s §Acceptance criteria, `specs/back/api.md`, `specs/back/openapi.json` and `specs/LINKS.md`; cite layers as `#id`.';
const REVIEW_TRACE = ' Which code implements which screen or operation: `specs/TRACE.md` (`@weshcraft <ref>` tags) and `codegraph impact <symbol> --depth 4` (reaches the screens and functions in `weshcraft.graph.mjs`, next to the design); changed code that implements an element but carries no tag is a finding.';
edit('skills/wesh-review/SKILL.md', s => {
  if (!s.includes('weshcraft')) return s.replace('None found: skip the spec axis.', `None found: skip the spec axis. ${REVIEW_SPEC}${REVIEW_TRACE}`);
  // an earlier bundle: add what is new
  if (!s.includes('specs/TRACE.md')) return s.replace('`specs/LINKS.md`; cite layers as `#id`.', `\`specs/LINKS.md\`; cite layers as \`#id\`.${REVIEW_TRACE}`);
  return s;
});

const USER_ONLY_OLD = "'wesh-level', 'wesh-plan', 'wesh-handoff', 'wesh-slim', 'wesh-debt'";
const USER_ONLY_NEW = "'wesh-level', 'wesh-plan', 'wesh-plan-view-mode', 'wesh-handoff', 'wesh-slim', 'wesh-debt'";
edit('install.mjs', s => s.replace(`const USER_ONLY = [${USER_ONLY_OLD}];`, `const USER_ONLY = [${USER_ONLY_NEW}];`));
edit('bench/reliability.test.mjs', s => s.split(`[${USER_ONLY_OLD}]`).join(`[${USER_ONLY_NEW}]`));

edit('core/CORE.md', s => (s.includes('wesh-plan-view-mode') ? s : s.replace('Fuzzy ask: suggest `/wesh-plan`.', 'Fuzzy ask: suggest `/wesh-plan`; UI work or FigCraft prototype: `/wesh-plan-view-mode`.')));

edit('README.md', s => {
  if (s.includes('wesh-plan-view-mode')) {
    return s.replace("It needs the WeshCraft MCP server, which wraps FigCraft's MCP:", 'It needs the WeshCraft MCP server (one small tool set, `weshcraft_*`):')
      .replace('npx weshcraft init            # writes .mcp.json: WeshCraft + live FigCraft (figcraft-cli on PATH)', "npx weshcraft init            # writes .mcp.json: WeshCraft on the project's design/*.figcraft")
      .replace('Decisions become FigCraft edits; WeshCraft regenerates', 'Decisions become design edits (`weshcraft_edit`); WeshCraft regenerates')
      .replace('`weshcraft_publish` opens a GitHub PR', '`weshcraft_sync` keeps a branch in step or opens a GitHub PR');
  }
  const row = /^\| `\/` only \| `\/wesh-plan` \|.*$/m;
  s = s.replace(row, m => `${m}\n| \`/\` only | \`/wesh-plan-view-mode\` | WeshCraft | plan on a FigCraft prototype over MCP; parallel front/back specs that match it; live in the browser; PR/MR |\n| auto | \`wesh-spec-front\` | WeshCraft | enrich generated front specs: states, a11y, analytics, questions |\n| auto | \`wesh-spec-back\` | WeshCraft | enrich generated back specs: validation, authz, errors, data |`);
  const section = `\n## View mode (WeshCraft)\n\n\`/wesh-plan-view-mode\` plans on a visual prototype instead of prose and writes an **advanced spec** (format: \`skills/wesh-plan-view-mode/FORMAT.md\`): the FigCraft design, a clickable prototype, contract-checked front and back specs, front ⇄ back links and a design changelog, kept in git. Modes: \`new\`, \`update\` (what changed in the design since the committed spec), \`sync\` and \`push\` (\`git\`, \`github:owner/repo\` or \`gitlab:group/project\`). It needs the WeshCraft MCP server (one small tool set, \`weshcraft_*\`):\n\n\`\`\`bash\nnpx weshcraft init            # writes .mcp.json: WeshCraft on the project's design/*.figcraft\n\`\`\`\n\nDecisions become design edits (\`weshcraft_edit\`); WeshCraft regenerates front and back specs in parallel, checks them against the prototype (copy, interactions, components, tokens, entities, operations) and shows everything live at the URL it prints. \`weshcraft_sync\` keeps a branch in step or opens a GitHub PR or GitLab MR with the prototype, the specs and a CI parity check.\n`;
  return s.replace(/\n## Install\n/, `${section}\n## Install\n`);
});

console.log(changed.length ? `updated ${changed.length} files in ${wesh}:\n  ${changed.join('\n  ')}\nnext: cd ${wesh} && node install.mjs` : 'already up to date');
