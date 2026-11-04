// GitHub / GitLab access without asking for a token: WeshCraft uses the access the user's tools
// already have, in this order:
//   1. a token passed for this call (publish dialog, --token-free CLI flags never)
//   2. the environment: GITHUB_TOKEN / GH_TOKEN, GITLAB_TOKEN / GL_TOKEN (inherited from OpenCode)
//   3. the account signed in to OpenChamber (~/.config/openchamber, or $OPENCHAMBER_DATA_DIR),
//      following OpenChamber's own choice between its stored account and the CLI login
//   4. the gh / glab CLI login
//   5. git's credential helper for the host (what `git push` would use)
// Tokens are never logged or returned to a client: callers get {token} and a describable source.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile, spawn } from 'node:child_process';

const TTL_MS = 60_000;
const cache = new Map();

/** github.com for the public API, the host for GitHub Enterprise (…/api/v3). */
export function githubHost(apiUrl) {
  if (!apiUrl) return 'github.com';
  try { const h = new URL(apiUrl).host.toLowerCase(); return h === 'api.github.com' ? 'github.com' : h; } catch { return 'github.com'; }
}
/** https://gitlab.com by default, else the instance origin of …/api/v4. */
export function gitlabOrigin(apiUrl) {
  if (!apiUrl) return 'https://gitlab.com';
  try { return new URL(apiUrl).origin.toLowerCase(); } catch { return 'https://gitlab.com'; }
}

const dataDir = env => (env.OPENCHAMBER_DATA_DIR ? path.resolve(env.OPENCHAMBER_DATA_DIR) : path.join(env.HOME || os.homedir(), '.config', 'openchamber'));
const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

/** OpenChamber's stored account for a GitHub host / GitLab origin, or {cli: true} when it prefers the CLI login. */
export function openChamberAccount(provider, key, env = process.env) {
  const dir = dataDir(env);
  let inst = null;
  let tokenKey = 'token';
  if (provider === 'github') {
    tokenKey = 'accessToken';
    if (key === 'github.com') {
      const j = readJson(path.join(dir, 'github-auth.json'));
      if (j?.version === 3) inst = j.instances?.['github.com'] ?? null;
      else if (j?.version === 2) inst = { activeCredentialId: j.activeCredentialId, credentials: j.credentials ?? [], cliDisabled: false, cliActive: false };
    } else inst = readJson(path.join(dir, 'source-control-auth.json'))?.providers?.github?.instances?.[key] ?? null;
  } else {
    inst = readJson(path.join(dir, 'source-control-auth.json'))?.providers?.gitlab?.instances?.[key] ?? null;
  }
  if (!inst) return null;
  if (inst.cliActive) return { cli: true };
  const cred = (inst.credentials ?? []).find(c => c.credentialId === inst.activeCredentialId);
  const token = cred?.[tokenKey];
  if (typeof token === 'string' && token) return { token, account: cred.user?.login ?? cred.user?.username ?? cred.user?.name ?? null };
  return inst.cliDisabled ? { none: true } : null;
}

const run = (cmd, args, { env, input, timeout = 5000 } = {}) => new Promise(resolve => {
  if (input == null) {
    execFile(cmd, args, { encoding: 'utf8', timeout, windowsHide: true, env }, (err, stdout, stderr) => resolve({ ok: !err, stdout: stdout ?? '', stderr: stderr ?? '' }));
    return;
  }
  let p;
  try { p = spawn(cmd, args, { env, windowsHide: true }); } catch { resolve({ ok: false, stdout: '', stderr: '' }); return; }
  let stdout = '';
  const t = setTimeout(() => p.kill(), timeout);
  p.stdout.on('data', d => { stdout += d; });
  p.on('error', () => { clearTimeout(t); resolve({ ok: false, stdout: '', stderr: '' }); });
  p.on('close', code => { clearTimeout(t); resolve({ ok: code === 0, stdout, stderr: '' }); });
  p.stdin.end(input);
});

async function ghCli(host, env) {
  const r = await run('gh', ['auth', 'token'], { env: { ...env, GH_HOST: host, GH_PROMPT_DISABLED: '1' } });
  const token = r.ok ? r.stdout.trim() : '';
  return token && !/\s/.test(token) ? token : null;
}

async function glabCli(origin, env) {
  const host = new URL(origin).host;
  const stored = await run('glab', ['config', 'get', 'token', '--host', host], { env });
  const t1 = stored.ok ? stored.stdout.trim() : '';
  if (t1 && !/\s/.test(t1)) return t1;
  const status = await run('glab', ['auth', 'status', '--hostname', host, '--show-token'], { env });
  const m = /^\s*(?:[^\s\w]\s*)?Token(?: found)?:\s*(\S+)\s*$/m.exec(`${status.stdout}\n${status.stderr}`);
  return m && !/^\*+$/.test(m[1]) ? m[1] : null;
}

/** git's credential helper (osxkeychain, manager, store…): never prompts. */
async function gitCredential(host, env) {
  const r = await run('git', ['credential', 'fill'], { env: { ...env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never', GIT_ASKPASS: '', SSH_ASKPASS: '' }, input: `protocol=https\nhost=${host}\n\n` });
  if (!r.ok) return null;
  const m = /^password=(.+)$/m.exec(r.stdout);
  const user = /^username=(.+)$/m.exec(r.stdout)?.[1] ?? null;
  return m ? { token: m[1].trim(), account: user } : null;
}

const ENV_NAMES = { github: ['GITHUB_TOKEN', 'GH_TOKEN'], gitlab: ['GITLAB_TOKEN', 'GL_TOKEN'] };

/**
 * @returns {Promise<{token: string|null, source: string|null, account: string|null, host: string}>}
 * source: explicit | env:NAME | openchamber | gh | glab | git-credential | null
 */
export async function resolveToken(provider, { apiUrl, explicit, env = process.env, useCache = true } = {}) {
  const host = provider === 'gitlab' ? new URL(gitlabOrigin(apiUrl)).host : githubHost(apiUrl);
  if (explicit) return { token: explicit, source: 'explicit', account: null, host };
  for (const name of ENV_NAMES[provider] ?? []) if (env[name]) return { token: env[name], source: `env:${name}`, account: null, host };
  const key = `${provider}|${apiUrl ?? ''}|${dataDir(env)}`;
  const hit = useCache && cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
  const value = await (async () => {
    const oc = openChamberAccount(provider, provider === 'gitlab' ? gitlabOrigin(apiUrl) : host, env);
    if (oc?.token) return { token: oc.token, source: 'openchamber', account: oc.account, host };
    if (!oc?.none) {
      const cli = provider === 'gitlab' ? await glabCli(gitlabOrigin(apiUrl), env) : await ghCli(host, env);
      if (cli) return { token: cli, source: provider === 'gitlab' ? 'glab' : 'gh', account: null, host };
    }
    const g = await gitCredential(host, env);
    if (g?.token) return { token: g.token, source: 'git-credential', account: g.account, host };
    return { token: null, source: null, account: null, host };
  })();
  cache.set(key, { at: Date.now(), value });
  return value;
}

export function forgetCachedTokens() { cache.clear(); }

/** For the UI: where access comes from, never the token. */
export function describeSource(r) {
  if (!r?.token) return null;
  const who = r.account ? ` (${r.account})` : '';
  return {
    explicit: 'the token you entered',
    'env:GITHUB_TOKEN': 'GITHUB_TOKEN from the environment', 'env:GH_TOKEN': 'GH_TOKEN from the environment',
    'env:GITLAB_TOKEN': 'GITLAB_TOKEN from the environment', 'env:GL_TOKEN': 'GL_TOKEN from the environment',
    openchamber: `your OpenChamber account${who}`, gh: 'your GitHub CLI login (gh)', glab: 'your GitLab CLI login (glab)',
    'git-credential': `your git credentials${who}`,
  }[r.source] ?? r.source;
}

/** Availability per provider, for the browser and the OpenChamber panel. */
export async function accessSummary({ apiUrls = {}, env = process.env } = {}) {
  const out = {};
  for (const p of ['github', 'gitlab']) {
    const r = await resolveToken(p, { apiUrl: apiUrls[p], env });
    out[p] = { available: !!r.token, source: r.source, via: describeSource(r), host: r.host };
  }
  return out;
}
