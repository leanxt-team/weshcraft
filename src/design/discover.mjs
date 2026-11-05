// Which design a project already has, so WeshCraft opens it without being told:
//   1. the one chosen before (wcraft/config.json → file)
//   2. wcraft/design/*.figcraft (where WeshCraft keeps the design documents)
//   3. design/*.figcraft, the project root or api/ (a project that kept them there)
//   4. the only .figcraft anywhere in the project (monorepos: apps/web/design/…)
// Several candidates and no choice yet: the editor lets the user pick (and remembers it).
import fs from 'node:fs';
import path from 'node:path';
import { CONFIG, DESIGN, LEGACY } from '../layout.mjs';

const SKIP = new Set(['node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'coverage', '.next', '.cache', '.weshcraft-demo', 'prototype', 'specs', 'target', 'vendor']);
const IS_DESIGN = /\.figcraft(\.json)?$/i;
export const PROJECT_CONFIG = CONFIG;

/** FigCraft documents anywhere in the project, the WeshCraft folder first, then newest. */
export function designCandidates(root, { maxDepth = 6, limit = 50 } = {}) {
  const out = [];
  const walk = (dir, depth) => {
    if (depth > maxDepth || out.length >= limit * 4) return;
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) { if (!SKIP.has(e.name) && !e.name.startsWith('.')) walk(path.join(dir, e.name), depth + 1); continue; }
      if (!IS_DESIGN.test(e.name)) continue;
      const abs = path.join(dir, e.name);
      try { const st = fs.statSync(abs); out.push({ file: path.relative(root, abs).split(path.sep).join('/'), name: e.name.replace(IS_DESIGN, ''), size: st.size, mtime: st.mtimeMs }); } catch { /* vanished */ }
    }
  };
  walk(root, 0);
  const rank = f => (f.startsWith(`${DESIGN}/`) ? 0 : f.startsWith(`${LEGACY.design}/`) ? 1 : 2);
  return out.sort((a, b) => rank(a.file) - rank(b.file) || b.mtime - a.mtime).slice(0, limit);
}

/** The project's design: {file (relative), how} or null. */
export function projectDesign(root) {
  try {
    const remembered = JSON.parse(fs.readFileSync(path.join(root, PROJECT_CONFIG), 'utf8')).file;
    if (remembered && fs.existsSync(path.join(root, remembered))) return { file: remembered, how: 'remembered' };
  } catch { /* none */ }
  for (const d of [DESIGN, LEGACY.design, '.', 'api']) {
    let names = [];
    try { names = fs.readdirSync(path.join(root, d)).filter(n => IS_DESIGN.test(n)).sort(); } catch { /* no folder */ }
    if (names.length) return { file: path.posix.join(d, names[0]).replace(/^\.\//, ''), how: d === DESIGN ? 'weshcraft-folder' : 'design-folder' };
  }
  const all = designCandidates(root, { limit: 2 });
  return all.length === 1 ? { file: all[0].file, how: 'only-one' } : null;
}

export function rememberDesign(root, file) {
  const f = path.join(root, PROJECT_CONFIG);
  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { /* new */ }
  if (cfg.file === file) return;
  cfg.file = file;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, `${JSON.stringify(cfg, null, 2)}\n`);
}

/** The project's WeshCraft settings (wcraft/config.json): the remembered design, the specs' folders. */
export function readProjectConfig(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, PROJECT_CONFIG), 'utf8')); } catch { return {}; }
}
export function updateProjectConfig(root, patch) {
  const cfg = { ...readProjectConfig(root), ...patch };
  for (const [k, v] of Object.entries(patch)) if (v == null) delete cfg[k];
  fs.mkdirSync(path.dirname(path.join(root, PROJECT_CONFIG)), { recursive: true });
  fs.writeFileSync(path.join(root, PROJECT_CONFIG), `${JSON.stringify(cfg, null, 2)}\n`);
  return cfg;
}
