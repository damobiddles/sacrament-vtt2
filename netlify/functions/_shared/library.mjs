// Validation for the published ability library. The node builder sends a library, this keeps only what the
// character builder understands, so a bad or hostile upload cannot break the public page.
// The effects vocabulary is shared with the browser (site/legacy/fx.js); importing it puts SacFx on globalThis.
import '../../../site/legacy/fx.js';
const Fx = globalThis.SacFx;
const TYPES = ['action', 'spell', 'passive'];
const STATS = ['Body', 'Mind', 'Spirit', 'Strength', 'Agility', 'Wits', 'Will']; // the old four are still read, and the character rules treat them as Body, Mind and Spirit
const USES = ['free', 'action', 'reaction', 'none']; // 'none': carried or lit, with no action of its own (items only)
const use = (u) => (u === 'quick' || u === 'full' ? 'action' : u); // libraries made when there was a quick action or a full turn
const SCORES = ['Body', 'Mind', 'Spirit'];
const icon = (v) => (/^[a-z]{2,12}$/.test(String(v || '')) ? String(v) : '');
/* an image an item names: a path on this site or an https address, nothing else */
const img = (v) => { v = String(v || ''); return /^(https:\/\/[\w.-]+\/?|\/(?!\/))[\w\-./%?=&#~:+]*$/.test(v) && v.length <= 300 && v.indexOf('//', 8) < 0 ? v : ''; };
const RESERVED = ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf'];
const int = (v, a, b, d) => { v = parseInt(v, 10); return Number.isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, n);

const KINDS = ['weapons', 'armour', 'trinkets', 'supplies'];
const ARMOUR = ['light', 'medium', 'heavy'];

/* Gear tables: optional. Either all four lists are present and valid, or the built-in gear is used. */
function sanitizeItems(it) {
  if (!it || typeof it !== 'object' || !KINDS.every((k) => Array.isArray(it[k]))) return null;
  const out = {};
  for (const k of KINDS) {
    if (it[k].length > 60) throw new Error('Too many items in ' + k + '.');
    const seen = new Set();
    out[k] = [];
    for (const x of it[k]) {
      if (!x || typeof x !== 'object') continue;
      const id = text(x.id, 20);
      if (!/^[\w-]{1,20}$/.test(id) || RESERVED.includes(id) || seen.has(id)) continue;
      seen.add(id);
      const o = { id, n: text(x.n || 'Item', 40), t: int(x.t, 1, 5, 1) };
      if (icon(x.icon)) o.icon = icon(x.icon);
      if (img(x.img)) o.img = img(x.img);
      if (x.sc && typeof x.sc === 'object') { const sc = {}; for (const z of SCORES) { const v = int(x.sc[z], -3, 3, 0); if (v) sc[z] = v; } if (Object.keys(sc).length) o.sc = sc; }
      if (k === 'weapons') { o.k = x.k === 'ranged' ? 'ranged' : 'melee'; o.s = int(x.s, 0, 9, 1); }
      else if (k === 'armour') { o.w = ARMOUR.includes(x.w) ? x.w : 'light'; }
      else if (k === 'trinkets') { if (USES.includes(use(x.use))) o.use = use(x.use); if (x.c != null) o.c = int(x.c, 0, 9, 1); o.r = int(x.r, 0, 5, 0); o.s = int(x.s, 0, 9, 1); o.d = text(x.d, 300); if (x.heal) o.heal = true; }
      else { o.s = int(x.s, 0, 9, 1); if (x.d) o.d = text(x.d, 300); if (x.heal) o.heal = true; if (!x.t) delete o.t; }
      const fx = Fx.clean(x.fx); if (fx.length) o.fx = fx;
      out[k].push(o);
    }
  }
  return out;
}

export function sanitizeLibrary(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.nodes) || !Array.isArray(input.edges)) throw new Error('A library needs nodes and edges.');
  if (input.nodes.length > 150 || input.edges.length > 400) throw new Error('That library is too large.');
  const seen = new Set();
  const nodes = [];
  for (const n of input.nodes) {
    if (!n || typeof n !== 'object' || !TYPES.includes(n.type)) continue;
    const id = text(n.id, 20);
    if (!/^[\w-]{1,20}$/.test(id) || RESERVED.includes(id) || seen.has(id)) continue;
    seen.add(id);
    const o = { id, type: n.type, name: text(n.name || 'Unnamed', 40), level: int(n.level, 1, 5, 1), desc: text(n.desc, 600), path: text(n.path || 'Other', 14) };
    if (n.cost != null) o.cost = int(n.cost, 0, 9, 0); // libraries made before turns had no tokens
    if (USES.includes(use(n.use)) && use(n.use) !== 'none' && n.type !== 'passive') o.use = use(n.use);
    if (SCORES.includes(n.score) && n.type === 'spell') o.score = n.score;
    if (icon(n.icon)) o.icon = icon(n.icon);
    if (img(n.img)) o.img = img(n.img);
    if (n.innate) o.innate = true;
    if (n.magic && n.type === 'action') o.magic = true;
    if (n.risk) o.risk = int(n.risk, 0, 5, 0);
    if (n.heal && n.type !== 'passive') { o.heal = true; if (n.heals) o.heals = int(n.heals, 1, 3, 1); }
    if (STATS.includes(n.stat)) { o.stat = n.stat; o.bonus = int(n.bonus, 0, 3, 0); }
    if (n.cap) o.cap = int(n.cap, 0, 5, 0);
    const fx = Fx.clean(n.fx); if (fx.length) o.fx = fx;
    nodes.push(o);
  }
  if (!nodes.length) throw new Error('A library needs at least one ability.');
  const edges = [];
  const key = new Set();
  for (const e of input.edges) {
    if (!Array.isArray(e) || e.length < 2) continue;
    const a = String(e[0]), b = String(e[1]);
    if (a === b || !seen.has(a) || !seen.has(b) || key.has(a + '>' + b)) continue;
    key.add(a + '>' + b); edges.push([a, b]);
  }
  const lib = { nodes, edges };
  const items = sanitizeItems(input.items);
  if (items) lib.items = items;
  return lib;
}
