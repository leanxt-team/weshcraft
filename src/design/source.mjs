// An editable design as a Workspace source: the specs read the in-memory document, so they follow
// every edit (browser editor, agents over MCP) without waiting for the file to be saved.
import fs from 'node:fs';
import { DesignStore } from './store.mjs';

export class StoreSource {
  constructor(store) {
    this.store = store;
    this.kind = 'file';
    this.file = store.file;
    this.editable = true;
  }
  /** Same wording as a read-only file source, so paths in specs and CI stay identical. */
  describe() { return `file ${this.file}`; }
  async load() { return { model: this.store.toModel(), thumbnail: this.store.entries?.get('thumbnail.png') ?? null }; }
  async render() { return null; }
  async code() { return null; }
  close() { this.store.flush(); }
}

/** Open a design for editing; a missing file becomes a new, empty FigCraft document. */
export function openEditable(file, name) {
  return new StoreSource(fs.existsSync(file) ? DesignStore.open(file) : DesignStore.create(file, name));
}
