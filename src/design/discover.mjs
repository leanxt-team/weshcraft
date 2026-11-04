// Which design a project already has, so WeshCraft opens it without being told:
//   1. the one chosen before (.weshcraft.json → file)
//   2. design/*.figcraft (or the project root, or api/)
//   3. the only .figcraft anywhere in the project (monorepos: apps/web/design/…)
// Several candidates and no choice yet: the editor lets the user pick (and remembers it).
import fs from 'node:fs';
import path from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'coverage', '.next', '.cache', '.weshcraft-demo', 'prototype', 'specs', 'target', 'vendor']);
const IS_DESIGN = /\.figcraft(\.json)?$/i;
export const PROJECT_CONFIG = '.weshcraft.json';

/** FigCraft documents anywhere in the project, design/ first, then newest. */
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
  return out.sort((a, b) => (a.file.startsWith('design/') ? 0 : 1) - (b.file.startsWith('design/') ? 0 : 1) || b.mtime - a.mtime).slice(0, limit);
}

/** The project's design: {file (relative), how} or null. */
export function projectDesign(root) {
  try {
    const remembered = JSON.parse(fs.readFileSync(path.join(root, PROJECT_CONFIG), 'utf8')).file;
    if (remembered && fs.existsSync(path.join(root, remembered))) return { file: remembered, how: 'remembered' };
  } catch { /* none */ }
  for (const d of ['design', '.', 'api']) {
    let names = [];
    try { names = fs.readdirSync(path.join(root, d)).filter(n => IS_DESIGN.test(n)).sort(); } catch { /* no folder */ }
    if (names.length) return { file: path.posix.join(d, names[0]).replace(/^\.\//, ''), how: 'design-folder' };
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
  fs.writeFileSync(f, `${JSON.stringify(cfg, null, 2)}\n`);
}
