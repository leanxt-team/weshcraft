// Optional agent pass: a coding agent (Claude Code by default, any CLI that reads a prompt on
// stdin and writes markdown on stdout) enriches each generated spec with the wesh spec skills.
// The agent writes only the Notes block: facts stay in the generated, contract-checked sections,
// so an agent can add edge cases and questions but cannot make the spec drift from the prototype.
import { spawn } from 'node:child_process';

export const DEFAULT_AGENT = process.env.WESHCRAFT_AGENT_CMD || 'claude -p --output-format text';

function splitCommand(cmd) {
  const out = [];
  let cur = '', quote = null;
  for (const ch of cmd) {
    if (quote) { if (ch === quote) quote = null; else cur += ch; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (/\s/.test(ch)) { if (cur) { out.push(cur); cur = ''; } }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

export function agentPrompt(job, draft) {
  const skill = job.group === 'back' ? 'wesh-spec-back' : 'wesh-spec-front';
  return [
    `Use the ${skill} skill (if it is not installed, follow its rules from memory: facts from the prototype only, no invented values).`,
    '',
    `You are enriching one generated spec: ${job.title}.`,
    'The draft below is generated from a FigCraft prototype and is contract-checked against it. Do NOT restate or change its tables, copy, sizes, colours, interactions or operations.',
    'Write ONLY the content of its Notes section, in markdown, under these headings when they apply:',
    '### States (loading, empty, error, disabled, offline) · ### Edge cases · ### Accessibility · ### Analytics events · ### Security and privacy · ### Open questions',
    'Cite prototype layers as `#<id>` exactly as the draft does; cite only ids that appear in the draft. Keep it under 60 lines. No preamble.',
    '',
    '--- DRAFT ---',
    draft,
  ].join('\n');
}

/**
 * Run the agent; stream stdout chunks to onChunk. Resolves with the full text.
 * @param {{command?: string, cwd?: string, timeoutMs?: number}} opts
 */
export function runAgent(prompt, onChunk, { command = DEFAULT_AGENT, cwd, timeoutMs = 600_000 } = {}) {
  const [bin, ...args] = splitCommand(command);
  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd, stdio: ['pipe', 'pipe', 'pipe'], env: process.env });
    let out = '', err = '';
    const timer = setTimeout(() => { p.kill(); reject(new Error(`agent timed out after ${timeoutMs / 1000}s`)); }, timeoutMs);
    p.stdout.on('data', d => { out += d; onChunk?.(String(d)); });
    p.stderr.on('data', d => { err = (err + d).slice(-4000); });
    p.on('error', e => { clearTimeout(timer); reject(new Error(`cannot start agent \`${bin}\`: ${e.message}`)); });
    p.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(out.trim());
      else reject(new Error(`agent exited ${code}: ${err.trim().split('\n').slice(-3).join(' ')}`));
    });
    p.stdin.end(prompt);
  });
}

/** Keep only `#id` citations that exist; the agent cannot introduce dangling references. */
export function sanitizeNotes(text, allowedIds) {
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/`#(\d+)`/g, (m, id) => (allowedIds.has(Number(id)) ? m : `#${id} (unknown layer)`))
    .trim();
}
