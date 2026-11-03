#!/usr/bin/env node
// Builds test/fixtures/account.figcraft.json: a two-screen FigCraft document that uses every
// front ⇄ back convention (bindings, annotations, inputs, a gap). Run: node test/make-signup-fixture.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const C = (h, a = 1) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255, a });
const solid = h => [{ type: 'solid', color: C(h), opacity: 1, visible: true, blend: 'normal' }];
const nodes = {};
let next = 1;
const T = (x, y) => [1, 0, 0, 1, x, y];
const add = (parent, n) => {
  const id = next++;
  nodes[id] = { id, parent, children: [], ...n };
  if (parent) nodes[parent].children.push(id);
  return id;
};
const style = (size, weight = 'Regular') => ({ font_family: 'Inter', font_style: weight, font_size: size, line_height: { unit: 'percent', value: 140 }, letter_spacing: { unit: 'percent', value: 0 }, decoration: 'none', case: 'original', fills: null, link: null });
const col = (gap, pad) => ({ mode: 'vertical', wrap: false, gap, cross_gap: 0, padding: pad, main_align: 'min', cross_align: 'min', grid_columns: 2, grid_rows: 2 });
const row = (gap, pad, main = 'center') => ({ mode: 'horizontal', wrap: false, gap, cross_gap: 0, padding: pad, main_align: main, cross_align: 'center', grid_columns: 2, grid_rows: 2 });
const fill = (h = 'fill', v = 'hug') => ({ sizing_h: h, sizing_v: v, absolute: false });
const text = (parent, name, characters, size, color, weight) => add(parent, { name, type: 'text', characters, style: style(size, weight), fills: solid(color), width: 300, height: size * 1.4, child_layout: fill('hug', 'hug'), auto_resize: 'widthAndHeight' });
const field = (parent, name, placeholder) => {
  const f = add(parent, { name, type: 'frame', width: 329, height: 48, fills: solid('#f1f5f9'), corners: { radii: [10, 10, 10, 10] }, layout: row(8, [0, 14, 0, 14], 'min'), child_layout: fill('fill', 'fixed') });
  text(f, 'Placeholder', placeholder, 15, '#64748b');
  return f;
};
const button = (parent, label, extra = {}) => {
  const b = add(parent, { name: `Button/${label}`, type: 'frame', width: 329, height: 50, fills: solid('#0e7c66'), corners: { radii: [12, 12, 12, 12] }, layout: row(0, [0, 0, 0, 0]), child_layout: fill('fill', 'fixed'), ...extra });
  text(b, 'Label', label, 16, '#ffffff', 'SemiBold');
  return b;
};

const page = add(null, { name: 'Account', type: 'page', background: C('#1e1e1e'), flows: [], guides: [], width: 0, height: 0 });
const signup = add(page, { name: 'Sign up', type: 'frame', transform: T(0, 0), width: 393, height: 600, fills: solid('#ffffff'), clip: true, layout: col(14, [56, 32, 32, 32]) });
const profile = add(page, { name: 'Profile', type: 'frame', transform: T(460, 0), width: 393, height: 600, fills: solid('#f8fafc'), clip: true, layout: col(12, [56, 32, 32, 32]),
  annotations: [{ label: 'GET /users/me → User', properties: [], category: 'development' }] });
text(signup, 'Title', 'Create your account', 26, '#0f172a', 'Bold');
text(signup, 'Subtitle', 'Plan trips and save trails across devices.', 15, '#475569');
field(signup, 'Email field', 'you@example.com');
field(signup, 'Password field', 'At least 8 characters');
button(signup, 'Create account', {
  interactions: [{ trigger: { type: 'onClick' }, actions: [{ type: 'navigate', dest: profile }], transition: { type: 'dissolve' }, duration_ms: 250, easing: 'easeOut' }],
  annotations: [{ label: 'POST /users → User', properties: [], category: 'development' }],
});
text(profile, 'Name', '{{user.name}}', 24, '#0f172a', 'Bold');
text(profile, 'Email', '{{user.email:email}}', 15, '#475569');
text(profile, 'Plan', '{{subscription.plan}}', 15, '#0e7c66', 'SemiBold');
button(profile, 'Save', { annotations: [{ label: 'PATCH /users/me', properties: [], category: 'development' }] });

const doc = { format: 'figcraft', version: 1, imageIndex: [], name: 'Account', pages: [page], next_id: next, styles: [], variables: { collections: [], variables: [] }, current_page: page, document_colors: [], comments: [], nodes };
const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'account.figcraft.json');
fs.writeFileSync(out, `${JSON.stringify(doc)}\n`);
console.log(`wrote ${out}`);
