// The specs in folders: the project's own organisation of the spec list (folders, subfolders, which
// spec goes where). Shared by the browser (the Specs panel) and the server (specs/README.md).
// Stored in .weshcraft.json as `specTree`: { folders: [{ name, folders: [...], items: [specId] }], items: [specId] }.
// A spec not placed anywhere goes to its default folder (created when missing), so new specs always show.

/** Where a spec goes until someone moves it. */
export function defaultPath(id) {
  if (id.startsWith('product:')) return ['Product'];
  if (id.startsWith('front:screen:')) return ['Front end', 'Screens'];
  if (id.startsWith('front:component:')) return ['Front end', 'Components'];
  if (id.startsWith('front:mcp')) return ['Front end', 'MCP server'];
  if (id.startsWith('front:api')) return ['Front end', 'Public API'];
  if (id.startsWith('front:')) return ['Front end'];
  if (id.startsWith('back:')) return ['Back end'];
  if (id.startsWith('links:')) return ['Front ⇄ back'];
  return ['Other'];
}
const DEFAULT_ORDER = ['Product', 'Front end', 'Back end', 'Front ⇄ back', 'Other'];

const clean = f => ({ name: String(f?.name ?? '').trim() || 'Folder', folders: (f?.folders ?? []).map(clean), items: [...(f?.items ?? [])].map(String) });
export function normalize(stored) {
  return { folders: (stored?.folders ?? []).map(clean), items: [...(stored?.items ?? [])].map(String) };
}

/** The tree to show: stored placement, unknown ids dropped, unplaced ids in their default folder. */
export function buildTree(stored, ids) {
  const t = normalize(stored);
  const known = new Set(ids);
  const placed = new Set();
  const prune = f => { f.items = f.items.filter(i => known.has(i) && !placed.has(i) && placed.add(i)); f.folders.forEach(prune); };
  t.items = t.items.filter(i => known.has(i) && !placed.has(i) && placed.add(i));
  t.folders.forEach(prune);
  for (const id of ids) {
    if (placed.has(id)) continue;
    let level = t;
    for (const name of defaultPath(id)) {
      let f = level.folders.find(x => x.name === name);
      if (!f) {
        f = { name, folders: [], items: [] };
        // default top-level folders in their usual order; others at the end
        const at = level === t ? level.folders.findIndex(x => DEFAULT_ORDER.indexOf(x.name) > DEFAULT_ORDER.indexOf(name) && DEFAULT_ORDER.includes(x.name)) : -1;
        if (at >= 0) level.folders.splice(at, 0, f); else level.folders.push(f);
      }
      level = f;
    }
    level.items.push(id);
    placed.add(id);
  }
  return t;
}

/** The folder at a path (array of indexes); [] is the root. */
export const folderAt = (tree, path) => path.reduce((f, i) => f?.folders[i], tree);
export const countItems = f => f.items.length + f.folders.reduce((n, x) => n + countItems(x), 0);

/** Every folder as [path, labels]. */
export function allFolders(tree) {
  const out = [];
  const walk = (f, path, names) => f.folders.forEach((x, i) => { out.push([[...path, i], [...names, x.name]]); walk(x, [...path, i], [...names, x.name]); });
  walk(tree, [], []);
  return out;
}

const uniqueName = (siblings, base) => { let n = base; for (let i = 2; siblings.some(x => x.name.toLowerCase() === n.toLowerCase()); i++) n = `${base} ${i}`; return n; };

// ---- edits: each returns a new tree ----
const copy = t => JSON.parse(JSON.stringify(t));
export function addFolder(tree, parentPath, name = 'New folder') {
  const t = copy(tree);
  const p = folderAt(t, parentPath);
  const f = { name: uniqueName(p.folders, name), folders: [], items: [] };
  p.folders.push(f);
  return { tree: t, path: [...parentPath, p.folders.length - 1] };
}
export function renameFolder(tree, path, name) {
  const t = copy(tree);
  const parent = folderAt(t, path.slice(0, -1));
  const f = parent.folders[path.at(-1)];
  const n = String(name).trim();
  if (!n) throw new Error('A folder needs a name');
  if (parent.folders.some((x, i) => i !== path.at(-1) && x.name.toLowerCase() === n.toLowerCase())) throw new Error(`There is already a folder called ${n} here`);
  f.name = n;
  return t;
}
/** Remove a folder: what it holds moves up to its parent. */
export function removeFolder(tree, path) {
  const t = copy(tree);
  const parent = folderAt(t, path.slice(0, -1));
  const [f] = parent.folders.splice(path.at(-1), 1);
  parent.items.push(...f.items);
  for (const sub of f.folders) { sub.name = uniqueName(parent.folders, sub.name); parent.folders.push(sub); }
  return t;
}
const detach = (f, id) => { f.items = f.items.filter(x => x !== id); f.folders.forEach(x => detach(x, id)); };
/** Move a spec into a folder (path), optionally before another spec. */
export function moveItem(tree, id, path, beforeId = null) {
  const t = copy(tree);
  detach(t, id);
  const f = folderAt(t, path);
  const at = beforeId ? f.items.indexOf(beforeId) : -1;
  if (at >= 0) f.items.splice(at, 0, id); else f.items.push(id);
  return t;
}
/** Move a folder into another one (not into itself or below). */
export function moveFolder(tree, path, toPath) {
  if (toPath.length >= path.length && path.every((v, i) => toPath[i] === v)) throw new Error('A folder cannot go inside itself');
  const t = copy(tree);
  const from = folderAt(t, path.slice(0, -1));
  const target = folderAt(t, toPath);
  const f = from.folders[path.at(-1)];
  from.folders.splice(path.at(-1), 1, null);
  f.name = uniqueName(target.folders.filter(Boolean), f.name);
  target.folders.push(f);
  from.folders = from.folders.filter(Boolean);
  return t;
}
