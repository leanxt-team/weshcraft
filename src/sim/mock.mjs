// Simulation back end: a mock API generated from the back-end spec (manifest.domain), so the
// prototype can be used like the real app. Records are seeded from what the prototype shows
// (each repeated row is a record), writes validate the way the spec says, and scenarios let you
// see the states the spec requires: slow network, server errors, empty data, offline.
import crypto from 'node:crypto';

const FAKE = {
  name: ['Alex Martin', 'Sam Rivera', 'Jordan Lee'], firstName: ['Alex', 'Sam', 'Jordan'], lastName: ['Martin', 'Rivera', 'Lee'],
  email: ['alex@example.com', 'sam@example.com', 'jordan@example.com'], phone: ['+1 555 0101', '+1 555 0102', '+1 555 0103'],
  plan: ['Pro', 'Free', 'Team'], status: ['Active', 'Pending', 'Archived'], city: ['Banff', 'Canmore', 'Jasper'],
  title: ['First item', 'Second item', 'Third item'], location: ['Banff, AB', 'Canmore, AB', 'Jasper, AB'],
};
const isTemplate = v => typeof v === 'string' && /\{\{.*\}\}/.test(v);

function fakeValue(field, type, i) {
  const pool = FAKE[field] ?? Object.entries(FAKE).find(([k]) => field.toLowerCase().includes(k.toLowerCase()))?.[1];
  if (type === 'email') return FAKE.email[i % 3];
  if (type === 'number' || type === 'integer') return (i + 1) * 7;
  if (type === 'boolean') return i % 2 === 0;
  if (type === 'date' || type === 'datetime') return new Date(Date.UTC(2026, 0, 10 + i)).toISOString().slice(0, type === 'date' ? 10 : 19);
  return pool ? pool[i % pool.length] : `${field} ${i + 1}`;
}

export class Simulator {
  /** @param {() => object} getManifest */
  constructor(getManifest) {
    this.getManifest = getManifest;
    this.scenario = 'normal';
    this.latency = 250;
    this.log = [];
    this.listeners = new Set();
    this.store = null;
    this.hash = null;
  }

  /** Seed one store per entity from the prototype's own content. */
  reset() {
    const m = this.getManifest();
    this.hash = m.source.hash;
    const store = {};
    for (const e of m.domain.entities) {
      // A record per instance the prototype shows (its text properties), else made-up values.
      const samples = (e.samples ?? []).filter(x => !Object.values(x).some(isTemplate));
      const n = Math.max(samples.length, 3);
      store[e.name] = Array.from({ length: Math.min(n, 12) }, (_, i) => {
        const r = { id: crypto.randomUUID() };
        for (const f of e.fields) {
          const v = samples[i]?.[f.name];
          // Missing in this sample: borrow a real value the prototype shows for that field elsewhere.
          const real = samples.map(x => x[f.name]).filter(x => x != null && !isTemplate(x));
          r[f.name] = v != null && !isTemplate(v) ? v : real.length ? real[i % real.length] : fakeValue(f.name, f.type, i);
        }
        return r;
      });
    }
    this.store = store;
    this.emit({ type: 'reset' });
    return store;
  }

  ensure() {
    const m = this.getManifest();
    if (!this.store || this.hash !== m.source.hash) this.reset();
    return m;
  }

  configure({ scenario, latency } = {}) {
    if (scenario && ['normal', 'slow', 'errors', 'empty', 'offline'].includes(scenario)) this.scenario = scenario;
    if (latency != null) this.latency = Math.max(0, Math.min(10000, Number(latency) || 0));
    this.emit({ type: 'config', scenario: this.scenario, latency: this.latency });
    return { scenario: this.scenario, latency: this.latency };
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit(ev) { for (const fn of this.listeners) fn(ev); }

  /** Handle /sim/api/<path>. Returns {status, body}. */
  async handle(method, apiPath, body) {
    const m = this.ensure();
    const t0 = Date.now();
    const op = m.domain.operations.find(o => o.method === method && o.path === apiPath);
    const delay = this.scenario === 'slow' ? Math.max(this.latency, 1500) : this.latency;
    await new Promise(r => setTimeout(r, delay));
    let res;
    if (this.scenario === 'offline') res = { status: 503, body: { code: 'offline', message: 'Network unavailable (simulated)' } };
    else if (!op) res = { status: 404, body: { code: 'not_found', message: `${method} ${apiPath} is not in the API spec` } };
    else if (this.scenario === 'errors') res = { status: 500, body: { code: 'server_error', message: 'Something went wrong (simulated)' } };
    else res = this.run(op, m, body ?? {});
    const entry = { id: crypto.randomUUID(), at: t0, ms: Date.now() - t0, method, path: apiPath, op: op?.key ?? null, trigger: op?.trigger ?? null, screen: op?.screen ?? null, request: body ?? null, status: res.status, response: res.body, scenario: this.scenario };
    this.log.push(entry);
    if (this.log.length > 200) this.log.shift();
    this.emit({ type: 'call', entry });
    return res;
  }

  run(op, m, body) {
    const entity = op.entity ? m.domain.entities.find(e => e.name === op.entity) : null;
    const rows = entity ? this.store[entity.name] ?? (this.store[entity.name] = []) : null;
    if (op.method === 'GET') {
      if (op.kind === 'list') return { status: 200, body: { items: this.scenario === 'empty' ? [] : rows ?? [], next: null } };
      if (!entity) return { status: 200, body: {} };
      if (this.scenario === 'empty' || !rows.length) return { status: 404, body: { code: 'not_found', message: `No ${entity.name}` } };
      return { status: 200, body: rows[0] };
    }
    // Writes: validate the submitted inputs the way the spec's conventions say.
    const s = m.screens.find(x => x.key === op.screen);
    const errors = {};
    for (const id of op.fields || []) {
      const input = s?.inputs.find(i => i.id === id);
      if (!input) continue;
      const key = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const v = String(body[key] ?? '').trim();
      if (!v) errors[key] = 'Required';
      else if (input.kind === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors[key] = 'Enter a valid email address';
      else if (input.kind === 'password' && v.length < 8) errors[key] = 'At least 8 characters';
    }
    if (Object.keys(errors).length) return { status: 400, body: { code: 'validation', message: 'Check the highlighted fields', fields: errors } };
    if (op.method === 'DELETE') { if (rows?.length) rows.shift(); return { status: 204, body: null }; }
    // Map submitted fields onto entity fields by name (email_field -> email).
    const patch = {};
    if (entity) for (const f of entity.fields) {
      const hit = Object.keys(body).find(k => k === f.name || k.replace(/_?(field|input)$/, '') === f.name.toLowerCase());
      if (hit) patch[f.name] = body[hit];
    }
    if (op.method === 'POST') {
      if (!entity) return { status: 201, body: { ok: true } };
      const rec = { id: crypto.randomUUID(), ...Object.fromEntries(entity.fields.map((f, i) => [f.name, fakeValue(f.name, f.type, i)])), ...patch };
      rows.unshift(rec);
      return { status: 201, body: rec };
    }
    if (entity && rows.length) Object.assign(rows[0], patch);
    return { status: 200, body: entity && rows.length ? rows[0] : { ok: true } };
  }

  state() {
    this.ensure();
    return { scenario: this.scenario, latency: this.latency, store: this.store, log: this.log.slice(-50) };
  }
}
