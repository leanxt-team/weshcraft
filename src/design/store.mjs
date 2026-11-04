// The editable design: a FigCraft document held in memory, changed through a small set of
// operations (the same ones for the browser editor and for agents over MCP), with undo/redo, and
// written back to its .figcraft file (atomically, debounced). The file stays a FigCraft document:
// FigCraft opens it, and WeshCraft reloads it when FigCraft (or git) changes it on disk.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { EventEmitter } from 'node:events';
import { readZip, writeZip } from '../util/zip.mjs';
import { fromFigcraftFile } from '../model/normalize.mjs';
import { applyProps, rawDefaults, setBinding, setApi, setLink, addNote, rgba, CONTAINER_TYPES, CREATABLE } from './props.mjs';

const clone = v => (v === undefined ? undefined : structuredClone(v));
const SCREEN_GAP = 80;
const UNDO_LIMIT = 200;

export function blankDocument(name = 'Untitled') {
  return {
    format: 'figcraft', version: 1, imageIndex: {}, name, pages: [1], next_id: 2, styles: [],
    variables: { collections: [], variables: [] }, current_page: 1, document_colors: [], comments: [],
    nodes: {
      1: {
        id: 1, parent: null, children: [], name: 'Page 1', type: 'page',
        background: { r: 0.9607843, g: 0.9607843, b: 0.9607843, a: 1 }, flows: [], guides: [], width: 0, height: 0,
        prototype: { device: 'None', background: { r: 0.1176471, g: 0.1176471, b: 0.1176471, a: 1 }, rotation: 'portrait' },
      },
    },
  };
}

export class DesignStore extends EventEmitter {
  /** @param {string} file  a .figcraft archive or a .figcraft.json document */
  constructor(file, { saveDelayMs = 250 } = {}) {
    super();
    this.file = path.resolve(file);
    this.saveDelayMs = saveDelayMs;
    this.undoStack = [];
    this.redoStack = [];
    this.version = 0;
    this.entries = null; // other archive entries (thumbnail, images), kept as they are
    this.saveTimer = null;
    this.lastWritten = null; // hash of the bytes we wrote, so our own save does not look external
    this.journal = null;
  }

  static create(file, name) {
    const s = new DesignStore(file);
    s.doc = blankDocument(name ?? path.basename(file).replace(/\.figcraft(\.json)?$/i, ''));
    s.entries = file.toLowerCase().endsWith('.json') ? null : new Map();
    s.saveNow();
    return s;
  }

  static open(file) { const s = new DesignStore(file); s.load(); return s; }

  load() {
    const buf = fs.readFileSync(this.file);
    if (buf[0] === 0x7b) { this.doc = JSON.parse(buf.toString('utf8')); this.entries = null; }
    else {
      this.entries = readZip(buf);
      const d = this.entries.get('document.json');
      if (!d) throw new Error(`${this.file}: no document.json in archive`);
      this.doc = JSON.parse(d.toString('utf8'));
    }
    if (this.doc?.format !== 'figcraft') throw new Error(`${this.file}: not a FigCraft document`);
    this.lastWritten = sha(buf);
    this.model = null;
  }

  /** Reload when the file changed outside WeshCraft (FigCraft saved it, git checkout). */
  reloadIfChanged() {
    let buf;
    try { buf = fs.readFileSync(this.file); } catch { return false; }
    if (sha(buf) === this.lastWritten) return false;
    this.load();
    this.undoStack = []; this.redoStack = [];
    this.version++;
    this.emit('change', { version: this.version, label: 'Reloaded from disk', ids: null, by: 'disk' });
    return true;
  }

  // ---- reading ---------------------------------------------------------------------------------
  node(id) {
    const n = this.doc.nodes[String(id)];
    if (!n) throw new Error(`no layer #${id}`);
    return n;
  }
  has(id) { return !!this.doc.nodes[String(id)]; }

  /** The normalized model (what specs, prototype and parity read). Cached per version. */
  toModel() {
    if (!this.model || this.modelVersion !== this.version) { this.model = fromFigcraftFile(this.doc); this.modelVersion = this.version; }
    return this.model;
  }

  page(id) {
    let n = this.node(id);
    while (n.parent != null) n = this.node(n.parent);
    return n;
  }

  /** Top-level layers of a page (screens, component sets, sections). */
  screens(pageId = this.doc.current_page ?? this.doc.pages[0]) {
    return (this.node(pageId).children ?? []).map(id => this.node(id));
  }

  /** Resolve a layer reference: id, `#id`, a ref from this batch, or an exact layer name. */
  resolve(ref, refs = {}) {
    if (ref == null) throw new Error('missing layer reference');
    if (typeof ref === 'number') return this.node(ref).id;
    const s = String(ref).trim();
    if (refs[s] != null) return refs[s];
    if (/^#?\d+$/.test(s)) return this.node(Number(s.replace('#', ''))).id;
    const byName = Object.values(this.doc.nodes).filter(n => n.name === s);
    if (byName.length === 1) return byName[0].id;
    if (byName.length > 1) throw new Error(`"${s}" names ${byName.length} layers (${byName.slice(0, 5).map(n => `#${n.id}`).join(', ')}): use an id`);
    throw new Error(`no layer named "${s}"`);
  }

  // ---- transactions ----------------------------------------------------------------------------
  touch(id) {
    const k = String(id);
    if (!this.journal.nodes.has(k)) this.journal.nodes.set(k, clone(this.doc.nodes[k]) ?? null);
  }
  touchMeta() {
    this.journal.meta ??= clone({ next_id: this.doc.next_id, pages: this.doc.pages, variables: this.doc.variables, current_page: this.doc.current_page, name: this.doc.name });
  }

  /** Run `fn` as one undoable step. Throws (and rolls back) if `fn` throws. */
  transact(label, fn, { by = 'editor' } = {}) {
    if (this.journal) return fn(); // nested: part of the outer step
    this.journal = { nodes: new Map(), meta: null };
    let result;
    try {
      result = fn();
    } catch (e) {
      this.restore(this.journal);
      this.journal = null;
      throw e;
    }
    const entry = { label, ...this.journal };
    this.journal = null;
    if (!entry.nodes.size && !entry.meta) return result;
    this.undoStack.push(entry);
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack = [];
    this.changed(label, [...entry.nodes.keys()].map(Number), by);
    return result;
  }

  restore(entry) {
    for (const [k, before] of entry.nodes) { if (before === null) delete this.doc.nodes[k]; else this.doc.nodes[k] = before; }
    if (entry.meta) Object.assign(this.doc, entry.meta);
  }

  /** The state `entry` would overwrite, so the step can be redone/undone again. */
  inverse(entry) {
    const nodes = new Map();
    for (const k of entry.nodes.keys()) nodes.set(k, clone(this.doc.nodes[k]) ?? null);
    const meta = entry.meta ? clone({ next_id: this.doc.next_id, pages: this.doc.pages, variables: this.doc.variables, current_page: this.doc.current_page, name: this.doc.name }) : null;
    return { label: entry.label, nodes, meta };
  }

  undo(by = 'editor') {
    const e = this.undoStack.pop();
    if (!e) return null;
    this.redoStack.push(this.inverse(e));
    this.restore(e);
    this.changed(`Undo ${e.label}`, [...e.nodes.keys()].map(Number), by);
    return e.label;
  }

  redo(by = 'editor') {
    const e = this.redoStack.pop();
    if (!e) return null;
    this.undoStack.push(this.inverse(e));
    this.restore(e);
    this.changed(`Redo ${e.label}`, [...e.nodes.keys()].map(Number), by);
    return e.label;
  }

  changed(label, ids, by) {
    this.version++;
    this.emit('change', { version: this.version, label, ids, by });
    this.scheduleSave();
  }

  // ---- saving ----------------------------------------------------------------------------------
  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => { try { this.saveNow(); } catch (e) { this.emit('error', e); } }, this.saveDelayMs);
    this.saveTimer.unref?.();
  }

  saveNow() {
    clearTimeout(this.saveTimer);
    this.saveTimer = null;
    const json = JSON.stringify(this.doc);
    let buf;
    if (this.entries) {
      const entries = new Map(this.entries);
      entries.set('document.json', Buffer.from(json));
      // document.json first, as FigCraft writes it.
      buf = writeZip([['document.json', entries.get('document.json')], ...[...entries].filter(([k]) => k !== 'document.json')]);
    } else buf = Buffer.from(json);
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, buf);
    fs.renameSync(tmp, this.file);
    this.lastWritten = sha(buf);
    this.emit('saved', { version: this.version });
  }

  flush() { if (this.saveTimer) this.saveNow(); }

  // ---- operations ------------------------------------------------------------------------------
  newId() { this.touchMeta(); return this.doc.next_id++; }

  insertChild(parentId, id, index) {
    this.touch(parentId);
    const p = this.node(parentId);
    p.children = [...(p.children ?? [])];
    const i = index == null || index < 0 || index > p.children.length ? p.children.length : index;
    p.children.splice(i, 0, id);
  }

  detach(id) {
    const n = this.node(id);
    if (n.parent == null) return;
    this.touch(n.parent);
    const p = this.node(n.parent);
    p.children = (p.children ?? []).filter(c => c !== id);
  }

  container(id) {
    const p = this.node(id);
    if (!CONTAINER_TYPES.has(p.type)) throw new Error(`#${id} is a ${p.type}: only frames, components, sections and pages hold layers`);
    return p;
  }

  create({ parent, index, type = 'frame', props = {} }) {
    if (!CREATABLE.has(type)) throw new Error(`cannot create a ${type} (one of: ${[...CREATABLE].join(', ')})`);
    const parentId = parent ?? this.doc.current_page ?? this.doc.pages[0];
    this.container(parentId);
    const id = this.newId();
    const raw = rawDefaults(type, id, parentId);
    this.touch(id);
    this.doc.nodes[String(id)] = raw;
    applyProps(raw, props);
    this.insertChild(parentId, id, index);
    return id;
  }

  set(id, props) {
    this.touch(id);
    const raw = clone(this.node(id));
    applyProps(raw, props);
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  remove(ids) {
    const gone = [];
    const drop = id => {
      const n = this.doc.nodes[String(id)];
      if (!n) return;
      for (const c of n.children ?? []) drop(c);
      this.touch(id);
      delete this.doc.nodes[String(id)];
      gone.push(id);
    };
    for (const id of ids) {
      const n = this.node(id);
      if (n.type === 'page') throw new Error('pages cannot be deleted here');
      this.detach(id);
      drop(id);
    }
    // Links into deleted frames would dangle: clear them.
    const goneSet = new Set(gone);
    for (const n of Object.values(this.doc.nodes)) {
      if ((n.interactions ?? []).some(it => (it.actions ?? []).some(a => goneSet.has(a.dest)))) { this.touch(n.id); delete n.interactions; }
    }
    return gone;
  }

  move(id, parent, index) {
    const n = this.node(id);
    const parentId = parent ?? n.parent;
    this.container(parentId);
    for (let p = this.node(parentId); p; p = p.parent != null ? this.node(p.parent) : null) if (p.id === id) throw new Error(`cannot move #${id} into itself`);
    this.touch(id);
    if (parentId === n.parent) {
      const sibs = this.node(parentId).children;
      const from = sibs.indexOf(id);
      this.detach(id);
      this.insertChild(parentId, id, index != null && from < index ? index - 1 : index);
    } else {
      this.detach(id);
      this.node(id).parent = parentId;
      this.insertChild(parentId, id, index);
    }
    return id;
  }

  /** Deep copy of a subtree with fresh ids. Returns the new root id. */
  copyTree(id, parentId, map = new Map()) {
    const src = this.node(id);
    const nid = this.newId();
    map.set(id, nid);
    const raw = clone(src);
    raw.id = nid;
    raw.parent = parentId;
    this.touch(nid);
    this.doc.nodes[String(nid)] = raw;
    raw.children = (src.children ?? []).map(c => this.copyTree(c, nid, map));
    if (!raw.children.length && !src.children) delete raw.children;
    return nid;
  }

  duplicate(id, { parent, index, offset } = {}) {
    const n = this.node(id);
    if (n.type === 'page') throw new Error('pages cannot be duplicated here');
    const parentId = parent ?? n.parent;
    const map = new Map();
    const nid = this.copyTree(id, parentId, map);
    const raw = this.node(nid);
    raw.name = parent == null ? n.name : n.name;
    // Links inside the copy that point into the copy follow it.
    for (const newId of map.values()) {
      const c = this.node(newId);
      for (const it of c.interactions ?? []) for (const a of it.actions ?? []) if (map.has(a.dest)) a.dest = map.get(a.dest);
    }
    const sibs = this.node(parentId).children ?? [];
    const at = index ?? (parentId === n.parent ? sibs.indexOf(id) + 1 : undefined);
    this.insertChild(parentId, nid, at);
    const p = this.node(parentId);
    const inFlow = p.layout && !raw.child_layout?.absolute && p.type !== 'page';
    if (!inFlow && offset !== false) {
      const t = raw.transform ?? [1, 0, 0, 1, 0, 0];
      // Top-level frames go to the right (screens side by side); other layers shift a little.
      raw.transform = p.type === 'page' ? [t[0], t[1], t[2], t[3], t[4] + raw.width + SCREEN_GAP, t[5]] : [t[0], t[1], t[2], t[3], t[4] + 12, t[5] + 12];
    }
    return nid;
  }

  instance(componentId, { parent, index, props = {} } = {}) {
    const comp = this.node(componentId);
    if (comp.type !== 'component') throw new Error(`#${componentId} is a ${comp.type}, not a component`);
    const parentId = parent ?? this.doc.current_page;
    this.container(parentId);
    const map = new Map();
    const nid = this.copyTree(componentId, parentId, map);
    const raw = this.node(nid);
    raw.type = 'instance';
    raw.component = componentId;
    raw.props = {};
    delete raw.description;
    raw.transform = [1, 0, 0, 1, 0, 0];
    this.insertChild(parentId, nid, index);
    applyProps(raw, props);
    return nid;
  }

  /** A new screen (top-level frame) placed to the right of the existing ones. */
  screen({ name = 'Screen', width = 393, height = 852, fill = '#ffffff', layout, page, props = {} } = {}) {
    const pageId = page ?? this.doc.current_page ?? this.doc.pages[0];
    const right = this.screens(pageId).reduce((m, s) => Math.max(m, (s.transform?.[4] ?? 0) + (s.width ?? 0)), -SCREEN_GAP);
    const top = this.screens(pageId).filter(s => s.type === 'frame').reduce((m, s) => Math.min(m, s.transform?.[5] ?? 0), Infinity);
    return this.create({ parent: pageId, type: 'frame', props: { name, width, height, fill, x: right + SCREEN_GAP, y: Number.isFinite(top) ? top : 0, ...(layout ? { layout } : {}), ...props } });
  }

  link(id, l) {
    this.touch(id);
    const raw = clone(this.node(id));
    if (l?.dest != null) {
      const d = this.node(l.dest);
      if (d.type === 'page') throw new Error('links go to a frame, not a page');
    }
    setLink(raw, l);
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  bind(id, b) {
    this.touch(id);
    const raw = clone(this.node(id));
    if (b && !(b.entity && b.field)) throw new Error('bind needs entity and field (e.g. {entity: "trail", field: "name"})');
    setBinding(raw, b && !b.clear ? b : null);
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  api(id, a) {
    this.touch(id);
    const raw = clone(this.node(id));
    if (a && !a.clear && !(/^(GET|POST|PUT|PATCH|DELETE)$/i.test(a.method ?? '') && /^\//.test(a.path ?? ''))) throw new Error('api needs method (GET|POST|PUT|PATCH|DELETE) and a path starting with /');
    setApi(raw, a && !a.clear ? a : null);
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  note(id, text) {
    this.touch(id);
    const raw = clone(this.node(id));
    addNote(raw, text);
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  /** Create or update a design token (variable). Colours as hex; numbers as numbers. */
  token({ name, value, mode, collection = 'Tokens' }) {
    if (!name) throw new Error('token needs a name (e.g. color/primary)');
    this.touchMeta();
    const vars = clone(this.doc.variables ?? { collections: [], variables: [] });
    let col = vars.collections.find(c => c.name === collection || c.id === collection);
    if (!col) {
      const cid = `VariableCollectionId:${vars.collections.length + 1}`;
      col = { id: cid, name: collection, modes: [{ id: `${cid}/mode1`, name: 'Default' }] };
      vars.collections.push(col);
    }
    const modeId = mode ? (col.modes.find(m => m.name === mode || m.id === mode)?.id ?? (() => { const m = { id: `${col.id}/mode${col.modes.length + 1}`, name: mode }; col.modes.push(m); return m.id; })()) : col.modes[0].id;
    const isColor = typeof value === 'string' && /^#|^(white|black|transparent)$/i.test(value);
    let v = vars.variables.find(x => x.name === name);
    if (!v) {
      v = { id: `VariableID:${Math.max(0, ...vars.variables.map(x => Number(String(x.id).split(':')[1]) || 0)) + 1}`, name, collection: col.id, resolvedType: isColor ? 'color' : typeof value === 'number' ? 'float' : 'string', description: '', values: {} };
      vars.variables.push(v);
    }
    v.values = { ...v.values, [modeId]: isColor ? { type: 'color', value: rgba(value) } : { type: typeof value === 'number' ? 'float' : 'string', value } };
    this.doc.variables = vars;
    return v.id;
  }

  /** Paint a layer with a colour token: the fill takes the token's value and stays bound to it. */
  useToken(id, name) {
    const v = (this.doc.variables?.variables ?? []).find(x => x.name === name || x.id === name);
    if (!v) throw new Error(`no token "${name}"`);
    const col = this.doc.variables.collections.find(c => c.id === v.collection);
    const val = v.values[col?.modes[0]?.id] ?? Object.values(v.values)[0];
    if (val?.type !== 'color') throw new Error(`token ${v.name} is not a colour`);
    this.touch(id);
    const raw = clone(this.node(id));
    applyProps(raw, { fill: val.value });
    raw.bound = { ...(raw.bound ?? {}), fill: v.id };
    this.doc.nodes[String(id)] = raw;
    return id;
  }

  rename(name) { this.touchMeta(); this.doc.name = String(name); }

  /** A screen (top-level frame, also inside a section) by id, '#12' or its exact name. */
  screenRef(ref) {
    const tops = this.doc.pages.flatMap(p => (this.doc.nodes[String(p)]?.children ?? []).flatMap(id => { const n = this.doc.nodes[String(id)]; return n?.type === 'section' ? n.children ?? [] : [id]; })).map(id => this.doc.nodes[String(id)]).filter(Boolean);
    const s = String(ref).trim();
    const n = /^#?\d+$/.test(s) ? tops.find(x => x.id === Number(s.replace('#', ''))) : (tops.filter(x => x.name === s).length === 1 ? tops.find(x => x.name === s) : null);
    if (!n) throw new Error(tops.filter(x => x.name === s).length > 1 ? `"${s}" names several screens: use an id` : `no screen ${s}`);
    return n.id;
  }

  /** The product functions declared in this design (first page's pluginData.weshcraft), or null. */
  getFunctions() {
    const pid = this.doc.pages?.[0];
    const pd = pid != null ? this.doc.nodes[String(pid)]?.pluginData?.weshcraft : null;
    if (!pd) return null;
    try { const j = typeof pd === 'string' ? JSON.parse(pd) : pd; return Array.isArray(j?.functions) ? j.functions : null; } catch { return null; }
  }

  /**
   * Declare the product functions (the whole list; null clears it). Screens as ids, '#12' or exact
   * names; a screen listed twice stays in the last function that lists it.
   */
  setFunctions(list) {
    const pid = this.doc.pages?.[0];
    if (pid == null) throw new Error('the design has no page');
    let clean = null;
    if (list != null) {
      if (!Array.isArray(list)) throw new Error('functions must be a list of {name, summary?, screens?, operations?, tools?}');
      const owner = new Map();
      clean = [];
      const names = new Set();
      for (const f of list) {
        const name = String(f?.name ?? '').trim().slice(0, 80);
        if (!name) throw new Error('every function needs a name');
        if (names.has(name.toLowerCase())) throw new Error(`two functions are called ${name}`);
        names.add(name.toLowerCase());
        const screens = [];
        for (const ref of f.screens ?? []) {
          const id = this.screenRef(ref);
          if (owner.has(id)) { const prev = clean[owner.get(id)]; prev.screens = prev.screens.filter(x => x !== id); }
          owner.set(id, clean.length);
          if (!screens.includes(id)) screens.push(id);
        }
        const strs = xs => [...new Set((xs ?? []).map(x => String(x).trim()).filter(Boolean))];
        clean.push({ name, ...(String(f.summary ?? '').trim() ? { summary: String(f.summary).trim().slice(0, 400) } : {}), screens, ...(strs(f.operations).length ? { operations: strs(f.operations) } : {}), ...(strs(f.tools).length ? { tools: strs(f.tools) } : {}) });
      }
    }
    this.touch(pid);
    const raw = clone(this.node(pid));
    const pd = { ...(raw.pluginData ?? {}) };
    let cur = {};
    try { cur = pd.weshcraft ? (typeof pd.weshcraft === 'string' ? JSON.parse(pd.weshcraft) : pd.weshcraft) : {}; } catch { cur = {}; }
    if (clean) cur.functions = clean; else delete cur.functions;
    if (Object.keys(cur).length) pd.weshcraft = JSON.stringify(cur); else delete pd.weshcraft;
    raw.pluginData = pd;
    this.doc.nodes[String(pid)] = raw;
    return clean;
  }

  /**
   * Apply a batch of operations as one undo step. Each op may carry `ref` to name what it creates;
   * later ops can use that ref wherever an id is expected. Returns {refs, results}.
   */
  apply(ops, { by = 'agent', label } = {}) {
    if (!Array.isArray(ops) || !ops.length) throw new Error('ops must be a non-empty array');
    const refs = {};
    const results = [];
    const r = x => (x == null ? x : this.resolve(x, refs));
    this.transact(label ?? describeOps(ops), () => {
      ops.forEach((o, i) => {
        try {
          let out;
          switch (o.op) {
            case 'create': out = this.create({ parent: r(o.parent), index: o.index, type: o.type, props: o.props ?? {} }); break;
            case 'screen': out = this.screen({ name: o.name, width: o.width, height: o.height, fill: o.fill, layout: o.layout, props: o.props ?? {} }); break;
            case 'set': out = this.set(r(o.id), o.props ?? {}); break;
            case 'text': out = this.set(r(o.id), { text: o.text }); break;
            case 'delete': out = this.remove([].concat(o.ids ?? o.id).map(r)); break;
            case 'move': out = this.move(r(o.id), r(o.parent), o.index); break;
            case 'duplicate': out = this.duplicate(r(o.id), { parent: r(o.parent), index: o.index }); break;
            case 'instance': out = this.instance(r(o.component), { parent: r(o.parent), index: o.index, props: o.props ?? {} }); break;
            case 'link': out = this.link(r(o.id), o.clear ? null : { dest: o.to != null ? r(o.to) : undefined, url: o.url, back: o.back, transition: o.transition }); break;
            case 'bind': out = this.bind(r(o.id), o.clear ? null : { entity: o.entity, field: o.field, type: o.type }); break;
            case 'api': out = this.api(r(o.id), o.clear ? null : { method: o.method, path: o.path, returns: o.returns }); break;
            case 'note': out = this.note(r(o.id), o.text); break;
            case 'token': out = this.token({ name: o.name, value: o.value, mode: o.mode, collection: o.collection }); break;
            case 'useToken': out = this.useToken(r(o.id), o.token); break;
            case 'rename': this.rename(o.name); out = o.name; break;
            case 'functions': out = this.setFunctions(o.functions ?? null); break;
            default: throw new Error(`unknown op "${o.op}" (create, screen, set, text, delete, move, duplicate, instance, link, bind, api, note, token, useToken, rename)`);
          }
          if (o.ref) refs[o.ref] = out;
          results.push(out);
        } catch (e) {
          throw new Error(`op ${i + 1} (${o.op}${o.ref ? ` ${o.ref}` : ''}): ${e.message}`);
        }
      });
    }, { by });
    return { refs, results };
  }
}

function describeOps(ops) {
  if (ops.length === 1) {
    const o = ops[0];
    return { create: `Create ${o.type ?? 'frame'}`, screen: `Add screen ${o.name ?? ''}`.trim(), set: 'Change layer', text: 'Edit text', delete: 'Delete', move: 'Move', duplicate: 'Duplicate', instance: 'Insert instance', link: 'Prototype link', bind: 'Bind data', api: 'Annotate API', note: 'Add note', token: `Token ${o.name}`, useToken: 'Apply token', rename: 'Rename design', functions: 'Product functions' }[o.op] ?? o.op;
  }
  return `${ops.length} changes`;
}

const sha = buf => crypto.createHash('sha1').update(buf).digest('hex');
