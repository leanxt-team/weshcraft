// The OpenChamber extension, end to end, in a browser, against a stand-in for OpenChamber built from
// its source (sandboxed frames, its CSP, its message schema, HTML-only serving, no CORS header):
//   npm install && npm run build:openchamber && node test/openchamber/all.mjs
// Needs Playwright with Chromium (npm i -D playwright && npx playwright install chromium).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'weshcraft-oc-'));
const env = { ...process.env, SIM_NO_ACAO: '1', SIM_HTML_ONLY: '1' };
const runs = [
  ['run.mjs', [root, path.join(work, 'run'), work]],
  ['flow.mjs', [root, path.join(work, 'flow'), work]],
  ['run2.mjs', [root, path.join(work, 'pub')]],
];
let failed = 0;
for (const [script, args] of runs) {
  const out = execFileSync(process.execPath, [path.join(here, script), ...args], { env, encoding: 'utf8', maxBuffer: 1 << 26 });
  const lines = out.split('\n').filter(l => /^(PASS|FAIL|CRASH)/.test(l));
  failed += lines.filter(l => !l.startsWith('PASS')).length;
  console.log(`${script}: ${lines.filter(l => l.startsWith('PASS')).length} passed`);
  for (const l of lines.filter(x => !x.startsWith('PASS'))) console.log(`  ${l}`);
}
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
