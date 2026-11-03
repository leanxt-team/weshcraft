// A small YAML reader for the subset OpenAPI documents use: block maps and sequences, plain,
// quoted and block (| >) scalars, flow [a, b] and {a: b} on one line, comments. No anchors,
// tags or multiple documents (those raise an error rather than parse wrongly).
export function parseYaml(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const indentOf = l => l.length - l.trimStart().length;
  const isBlank = l => !l.trim() || /^\s*#/.test(l);
  const skip = () => { while (i < lines.length && isBlank(lines[i])) i++; };

  function scalar(raw) {
    let s = raw.trim();
    if (s === '' || s === '~' || s === 'null') return null;
    if (/^[&*!]/.test(s)) throw new Error(`YAML anchors/aliases/tags are not supported (line ${i + 1})`);
    // Quoted: up to the matching quote; anything after it (a comment) is ignored.
    if (s.startsWith('"')) { let j = 1; while (j < s.length && s[j] !== '"') j += s[j] === '\\' ? 2 : 1; return JSON.parse(s.slice(0, j + 1).replace(/\\'/g, "'")); }
    if (s.startsWith("'")) { let j = 1; while (j < s.length && !(s[j] === "'" && s[j + 1] !== "'")) j += s[j] === "'" ? 2 : 1; return s.slice(1, j).replace(/''/g, "'"); }
    if (s.startsWith('[') || s.startsWith('{')) return flow(s);
    s = s.replace(/\s+#.*$/, '');
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (/^[-+]?\d+$/.test(s)) return Number(s);
    if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(s)) return Number(s);
    return s;
  }

  function flow(s) {
    let p = 0;
    const ws = () => { while (/\s/.test(s[p])) p++; };
    const val = () => {
      ws();
      if (s[p] === '[') { p++; const a = []; ws(); if (s[p] === ']') { p++; return a; } for (;;) { a.push(val()); ws(); if (s[p] === ',') { p++; continue; } if (s[p] === ']') { p++; return a; } throw new Error(`bad YAML flow sequence: ${s}`); } }
      if (s[p] === '{') { p++; const o = {}; ws(); if (s[p] === '}') { p++; return o; } for (;;) { ws(); const k = token(':'); p++; o[k] = val(); ws(); if (s[p] === ',') { p++; continue; } if (s[p] === '}') { p++; return o; } throw new Error(`bad YAML flow map: ${s}`); } }
      return scalar(token(',]}'));
    };
    const token = stops => {
      ws();
      if (s[p] === '"' || s[p] === "'") { const q = s[p]; let j = p + 1; while (j < s.length && s[j] !== q) j += s[j] === '\\' ? 2 : 1; const t = s.slice(p, j + 1); p = j + 1; return q === '"' ? JSON.parse(t) : t.slice(1, -1); }
      let j = p; while (j < s.length && !stops.includes(s[j])) j++;
      const t = s.slice(p, j).trim(); p = j; return t;
    };
    return val();
  }

  function block(indent, style) {
    const out = [];
    // The block's own indentation is that of its first non-blank line.
    let k = i; while (k < lines.length && !lines[k].trim()) k++;
    if (k < lines.length && indentOf(lines[k]) > indent) indent = indentOf(lines[k]);
    while (i < lines.length && (isBlank(lines[i]) || indentOf(lines[i]) >= indent)) {
      out.push(lines[i].slice(Math.min(indent, indentOf(lines[i])) || 0));
      i++;
    }
    while (out.length && !out[out.length - 1].trim()) out.pop();
    return style === '|' ? `${out.join('\n')}\n` : `${out.map(l => l.trim()).join(' ').replace(/\s+/g, ' ').trim()}\n`;
  }

  function node(indent) {
    skip();
    if (i >= lines.length) return null;
    const l = lines[i];
    const ind = indentOf(l);
    if (ind < indent) return null;
    if (l.trimStart().startsWith('- ') || l.trim() === '-') return seq(ind);
    return map(ind);
  }

  function seq(ind) {
    const arr = [];
    for (;;) {
      skip();
      if (i >= lines.length) break;
      const l = lines[i];
      if (indentOf(l) !== ind || !(l.trimStart().startsWith('- ') || l.trim() === '-')) break;
      const rest = l.trimStart().slice(1);
      if (!rest.trim()) { i++; arr.push(node(ind + 1)); continue; }
      // "- key: value" starts a map whose keys are indented at the dash + 2.
      const inner = ind + 1 + (rest.length - rest.trimStart().length);
      if (/^\s*[^\s"'[{][^:]*:(\s|$)/.test(rest) || /^\s*["'][^"']*["']\s*:(\s|$)/.test(rest)) {
        lines[i] = ' '.repeat(inner) + rest.trimStart();
        arr.push(map(inner));
      } else { i++; arr.push(valueAfter(rest, ind + 1)); }
    }
    return arr;
  }

  function valueAfter(rest, childIndent) {
    const t = rest.trim();
    if (t === '|' || t === '|-' || t === '>' || t === '>-') { const v = block(childIndent, t[0]); return t.endsWith('-') ? v.replace(/\n$/, '') : v; }
    return scalar(t);
  }

  function map(ind) {
    const obj = {};
    for (;;) {
      skip();
      if (i >= lines.length) break;
      const l = lines[i];
      if (indentOf(l) !== ind) break;
      const body = l.trimStart();
      if (body.startsWith('- ')) break;
      const m = /^("(?:[^"\\]|\\.)*"|'[^']*'|[^:#][^:]*?)\s*:(?:\s+(.*))?$/.exec(body);
      if (!m) throw new Error(`cannot parse YAML line ${i + 1}: ${body}`);
      const key = m[1].startsWith('"') ? JSON.parse(m[1]) : m[1].startsWith("'") ? m[1].slice(1, -1) : m[1];
      i++;
      const rest = (m[2] ?? '').replace(/^\s*#.*$/, '');
      if (!rest.trim()) {
        skip();
        const next = lines[i];
        if (next !== undefined && (indentOf(next) > ind || (indentOf(next) === ind && next.trimStart().startsWith('- ')))) obj[key] = node(indentOf(next));
        else obj[key] = null;
      } else obj[key] = valueAfter(rest, ind + 1);
    }
    return obj;
  }

  if (/^---\s*$/m.test(text.split('\n').slice(1).join('\n'))) throw new Error('multiple YAML documents are not supported');
  lines.forEach((l, k) => { if (/^---\s*$/.test(l) || /^\.\.\.\s*$/.test(l)) lines[k] = ''; });
  return node(0);
}
