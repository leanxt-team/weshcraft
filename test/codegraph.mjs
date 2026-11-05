// The product graph with a real code graph: codegraph (the one wesh installs) indexes a project
// whose code is tagged `@weshcraft <ref>`, then finds the product, its screens and the code behind
// them. Needs the codegraph CLI (npm i -g @colbymchenry/codegraph@1.6.2, or CODEGRAPH=<path>);
// skipped without it.   npm run test:codegraph
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CG = process.env.CODEGRAPH || 'codegraph';
if (spawnSync(CG, ['version'], { encoding: 'utf8' }).status !== 0) { console.log('codegraph not found: skipped'); process.exit(0); }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weshcraft-cg-'));
const put = (f, t) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), t); };
fs.mkdirSync(path.join(dir, 'design'));
fs.copyFileSync(path.join(here, 'fixtures/account.figcraft.json'), path.join(dir, 'design/App.figcraft.json'));
put('src/api/users.ts', '// @weshcraft POST /users\nexport async function createUser(b: { email: string }) { return fetch("/users", { method: "POST", body: JSON.stringify(b) }); }\n/** @weshcraft GET /users/me */\nexport async function fetchMe() { return (await fetch("/users/me")).json(); }\n');
put('src/pages/SignUp.tsx', 'import { createUser } from "../api/users";\n// @weshcraft scr-sign-up\nexport function SignUpPage() { return createUser({ email: "a" }); }\n');
put('src/pages/Profile.tsx', 'import { fetchMe } from "../api/users";\n/** @weshcraft scr-profile */\nexport default function ProfilePage() { return fetchMe(); }\n');
put('server/routes.py', '# @weshcraft POST /users\ndef post_users(request):\n    return {"id": "1"}\n');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
run('git', ['init', '-q']);
run(process.execPath, [path.join(here, '../bin/weshcraft.mjs'), 'generate', '--file', 'design/App.figcraft.json']);
run('git', ['add', '-A']);
run(CG, ['init', '--yes', '.']);
const R = [];
const ok = (n, c, i = '') => R.push(`${c ? 'PASS' : 'FAIL'} ${n}${i && !c ? ` — ${i.slice(0, 400)}` : ''}`);
const explore = run(CG, ['explore', 'how does the Sign up function work']);
ok('explore: the function, its screens and their code', /fnSignUp/.test(explore) && /screenSignUp/.test(explore) && /SignUpPage/.test(explore), explore);
ok('explore: the product graph is not taken for tests', !/wcraft\/graph\.mjs`?\)? — .*tests:/.test(explore));
const callers = run(CG, ['callers', 'SignUpPage']);
ok('callers: the screen a component implements', /screenSignUp/.test(callers), callers);
const impact = run(CG, ['impact', 'fetchMe', '--depth', '4']);
ok('impact: a client call reaches its screen and function', /screenProfile/.test(impact) && /fnSignUp/.test(impact) && /opGetUsersMe/.test(impact), impact);
const py = run(CG, ['explore', 'POST /users operation: what implements it']);
ok('other languages: found through the tag', /post_users/.test(py) && /opPostUsers/.test(py), py);
console.log(R.join('\n'));
fs.rmSync(dir, { recursive: true, force: true });
process.exit(R.some(r => !r.startsWith('PASS')) ? 1 : 0);
