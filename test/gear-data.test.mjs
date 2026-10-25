// The gear file (site/sheet/gear.js) is meant to be edited by the owner, so these checks say in plain words what is wrong with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/sheet/gear.js';

const G = globalThis.SACRAMENT_GEAR;
const all = () => [...G.items, ...G.relics, ...G.grimoires, ...(G.found || [])];

test('the plain gear list has about thirty items, in weapons, armour and supplies, and nothing magic', () => {
  assert.equal(G.items.length, 30);
  for (const k of ['weapon', 'armour', 'supply']) assert.ok(G.items.some((i) => i.kind === k), 'no ' + k + ' in the list');
  for (const i of G.items) assert.ok(['weapon', 'armour', 'supply'].includes(i.kind), i.name + ' is a ' + i.kind + ' but is in the plain list');
  assert.ok(G.relics.every((i) => i.kind === 'relic') && G.grimoires.every((i) => i.kind === 'grimoire'));
  assert.ok(G.grimoires.length >= 3 && G.relics.length >= 1);
});

test('every entry has what the sheet needs: a unique id, a name, a slot count, and a sentence saying what it does', () => {
  const seen = new Set();
  for (const i of all()) {
    assert.match(i.id, /^[a-z]+$/, 'the id "' + i.id + '" should be lower-case letters only');
    assert.ok(!seen.has(i.id), 'the id "' + i.id + '" is used twice'); seen.add(i.id);
    assert.ok(i.name && i.name.length <= 40, 'an item has no name, or a very long one: ' + i.id);
    assert.ok([1, 2, 3].includes(i.slots), i.name + ' takes ' + i.slots + ' slots: it should be 1, 2 or 3');
    assert.ok((i.does || i.flavour || '').length > 10, i.name + ' needs a sentence saying what it does, or a line of flavour');
    if (i.kind === 'armour') assert.ok(Number.isInteger(i.defence) && i.defence >= 0 && i.defence <= 5, i.name + ' needs a Defence bonus from 0 to 5');
    if (i.effort) assert.ok([4, 6, 8, 10, 12].includes(i.effort), i.name + ' has an Effort die of d' + i.effort + ': it should be d4, d6, d8, d10 or d12');
    if (i.cat) assert.ok(['basic', 'weapons', 'guns', 'magic', 'ultimate'].includes(i.cat), i.name + ' has an unknown kind of Effort: ' + i.cat);
  }
});

test('every spell, every grimoire and every magic item can tempt the Horror, and nothing plain claims to', () => {
  for (const s of G.spells) assert.equal(s.temptsHorror, s.effect !== 'healing', 'the spell ' + s.name + ' is missing "temptsHorror": true');
  for (const i of [...G.relics, ...G.grimoires]) assert.equal(i.temptsHorror, true, i.name + ' is missing "temptsHorror": true');
  for (const i of (G.found || []).filter((x) => x.kind === 'relic' || x.kind === 'grimoire')) assert.equal(i.temptsHorror, true, i.name + ' is missing "temptsHorror": true');
  for (const i of G.items) assert.ok(!i.temptsHorror, i.name + ' is a plain item but is marked as tempting the Horror: move it to the relics');
  for (const i of [...G.relics, ...G.grimoires, ...G.spells.filter(s => s.effect !== 'healing'), ...(G.found || []).filter((x) => x.temptsHorror)]) assert.ok((Number.isInteger(i.horror) && i.horror >= 1) || /^[1-9]?d(4|6|8|10|12|20)(\+[0-9]{1,2})?$/.test(i.horror), i.name + ' tempts the Horror, so it needs a "horror" amount: a whole number of 1 or more, or dice such as "d4+2"');
});

test('every grimoire lists spells that exist, and every spell belongs to a grimoire', () => {
  const ids = new Set(G.spells.map((s) => s.id));
  for (const g of [...G.grimoires, ...(G.found || []).filter((x) => x.kind === 'grimoire')]) { assert.ok(Array.isArray(g.spells), g.name + ' needs a spells list (it may be empty while its spells are unwritten)'); for (const s of g.spells) assert.ok(ids.has(s), g.name + ' lists the spell "' + s + '", which is not in the spell list'); }
  const books = [...G.grimoires, ...(G.found || []).filter((x) => x.kind === 'grimoire'), ...(G.retiredGrimoires || [])];   // a grimoire found on the loot table holds spells too
  for (const s of G.spells) assert.ok(books.some((g) => g.id === s.from && g.spells.includes(s.id)), 'the spell ' + s.name + ' is not in the grimoire it says it is from');
});

test('a grimoire read by the die ("pick") has at least that many spells; spell ids are unique', () => {
  const books = [...G.grimoires, ...(G.found || []).filter((x) => x.kind === 'grimoire')];
  for (const g of books.filter((x) => x.pick)) { assert.ok([4, 6, 8].includes(g.pickDie || g.pick), g.name + ' is read with a d' + g.pick + ': it should be d4, d6 or d8'); assert.ok(g.spells.length === g.pick, g.name + ' is read with a d' + g.pick + ' but has only ' + g.spells.length + ' spells'); }
  assert.equal(new Set(G.spells.map((s) => s.id)).size, G.spells.length, 'two spells share an id');
  for (const s of G.spells) assert.match(s.id, /^[a-z]+$/, 'the spell id "' + s.id + '" should be lower-case letters only');
});

test('names read like the lore: no punctuation oddities, and the example items from the naming guide are there', () => {
  const names = all().map((i) => i.name);
  for (const n of ["Penitent's Blade", "Pilgrim's Cloak", 'Tallow Candles', 'The Ashen Psalter', 'The Book of Quiet Mouths']) assert.ok(names.includes(n), n + ' is missing');
  for (const n of names) assert.ok(!/[<>"]| {2}/.test(n), 'odd characters in the name ' + n);
});

test('the loot tables: every number on the d100 and on each sub-table gives exactly one thing, and 145 things are listed in all', () => {
  const tables = [{ id: 'd100', die: 100 }, ...(G.tables || [])];
  for (const t of G.tables || []) {
    assert.match(t.id, /^[a-z]+$/, 'the table id "' + t.id + '" should be lower-case letters only'); assert.notEqual(t.id, 'd100');
    assert.ok([4, 6, 8, 10, 12, 20, 100].includes(t.die), 'the ' + t.name + ' table rolls a d' + t.die + ': it should be d4, d6, d8, d10, d12, d20 or d100');
    assert.ok(tables.some((x) => x.id === (t.on || 'd100')), 'the ' + t.name + ' table is reached from a table that does not exist: ' + t.on);
  }
  let listed = 0;
  for (const t of tables) {
    const hits = Array.from({ length: t.die }, () => []);
    const mark = (name, r) => { assert.ok(Array.isArray(r) && r[0] >= 1 && r[1] <= t.die && r[0] <= r[1], name + ' has numbers that are not from 1 to ' + t.die + ' on the ' + t.id + ' table'); for (let n = r[0]; n <= r[1]; n++) hits[n - 1].push(name); };
    for (const i of all()) if (i.loot && (i.table || 'd100') === t.id) { listed++; mark(i.name, i.loot); }
    for (const sub of G.tables || []) if ((sub.on || 'd100') === t.id) mark('the ' + sub.name + ' table', sub.loot);
    hits.forEach((h, k) => { assert.equal(h.length, 1, 'on the ' + t.id + ' table the roll ' + (k + 1) + ' gives ' + (h.length ? h.join(' and ') : 'nothing')); });
  }
  for (const i of all()) if (i.table) assert.ok((G.tables || []).some((t) => t.id === i.table), i.name + ' is on a table that does not exist: ' + i.table);
  assert.equal(listed, 145);
  const depth = (t, k = 1) => (!t.on || t.on === 'd100' ? k : depth(G.tables.find((x) => x.id === t.on), k + 1));
  for (const t of G.tables || []) assert.ok(depth(t) <= 3, 'the ' + t.name + ' table is more than three tables deep');
});

test('everything that has an Effort kind also has a stat to roll, and the kinds are the five the table knows', () => {
  const STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  for (const i of [...all(), ...G.spells]) if (i.cat) { assert.ok(['basic', 'weapons', 'guns', 'magic', 'ultimate'].includes(i.cat), i.name + ': unknown Effort kind ' + i.cat); if (i.kind !== 'grimoire') assert.ok(STATS.includes(i.roll), i.name + ' has an Effort kind but no stat to roll'); }
});

test('the items the loot table marks as tempting the Horror are exactly the ones flagged', () => {
  const flagged = (table) => all().filter((i) => i.loot && i.temptsHorror && (i.table || 'd100') === table).map((i) => i.loot[0]).sort((a, b) => a - b);
  assert.deepEqual(flagged('d100'), [100]);
  assert.deepEqual(flagged('valuables'), [13], 'the saint\'s finger bone, on the Valuables and curios table');
  for (const t of ['supplies', 'arms']) assert.deepEqual(flagged(t), [], 'nothing on the ' + t + ' table tempts the Horror');
  assert.deepEqual(flagged('relics'), [1, 5, 10, 14, 19, 23, 28, 32, 37, 41, 46, 51, 55, 60, 64, 69, 73, 78, 82, 87, 91, 96], 'everything on the Relics table tempts the Horror');
});

test('a note only the GM may read is never in this file (it is sent to every browser)', async () => {
  const { readFileSync } = await import('node:fs');
  const text = readFileSync(new URL('../site/sheet/gear.js', import.meta.url), 'utf8');
  assert.ok(!/missing this|\bGM:/.test(text.replace(/\/\*[\s\S]*?\*\//, '')), 'a GM-only note is in gear.js: move it to netlify/functions/_shared/loot-notes.mjs');
});
