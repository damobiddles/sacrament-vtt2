// The rules the character sheet enforces, for a hero's numbers and gear. The same code runs in the browser (on the sheet) and on the server (which has the last word).
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';

const R = globalThis.SacramentRules, C = globalThis.SacramentSheetCore;
const player = { gm: false }, gm = { gm: true };
const hero = (o = {}) => Object.assign(C.blankHero('Thorne'), o);
const hp = () => ({ cur: 10, max: 10 });
const ids = (h) => h.gear.map((g) => g.id + (g.eq ? '+' : '-')).join(',');

test('the numbers a hero is built with come from the rules settings: 6 points, no more than 6 in one score, 4 Effort points, ten slots in each set', () => {
  assert.deepEqual([R.BUILD.points, R.BUILD.scoreMax, R.BUILD.effortPoints, R.BUILD.slots, R.BUILD.magicItems, R.BUILD.playerGrimoires], [6, 6, 4, 10, 3, 1]);
});

test('scores: points are limited, one score is limited, and a spent score can be taken back', () => {
  const h = hero(); const edit = (stat, value) => C.edit(h, { op: 'score', stat, value }, player, null);
  assert.equal(edit('STR', 6).ok, true); assert.equal(h.stats.STR, 6);
  const r = edit('DEX', 1); assert.equal(r.ok, false); assert.match(r.why, /no points left.*all 6/i); assert.equal(h.stats.DEX, 0, 'refused means unchanged');
  assert.equal(edit('STR', 7).ok, false); assert.match(edit('STR', 7).why, /at most 6/);
  assert.equal(edit('STR', 4).ok, true); assert.equal(edit('DEX', 2).ok, true); assert.equal(C.pointsLeft(h), 0);
  assert.equal(edit('CON', -1).ok, false, 'a score cannot go below 0');
  assert.equal(edit('NOPE', 1).ok, false);
});

test('the "no points left" answer is right when the score already has points in it', () => {
  const h = hero({ stats: { STR: 1, DEX: 1, CON: 1, INT: 2, WIS: 1, CHA: 0 } });
  const r = C.edit(h, { op: 'score', stat: 'DEX', value: 2 }, player, null); assert.equal(r.ok, false); assert.match(r.why, /no points left/i);
  const g = hero({ stats: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 0 } });
  const r2 = C.edit(g, { op: 'score', stat: 'DEX', value: 4 }, player, null); assert.equal(r2.ok, false); assert.match(r2.why, /only 1 point left/);
});

test('Effort: four points, spread over the five kinds', () => {
  const h = hero(); const edit = (cat, value) => C.edit(h, { op: 'effort', cat, value }, player, null);
  assert.equal(edit('weapons', 3).ok, true); assert.equal(edit('basic', 2).ok, false); assert.match(edit('basic', 2).why, /1 Effort point left/);
  assert.equal(edit('basic', 1).ok, true); const r = edit('magic', 1); assert.equal(r.ok, false); assert.match(r.why, /no Effort points left/i);
  assert.equal(edit('guns', 1).ok, false); assert.equal(C.effortLeft(h), 0);
});

test('a hero already over a limit (a GM set it freely) can lower it, but not raise it, and other edits are not blocked', () => {
  const h = hero({ stats: { STR: 8, DEX: 3, CON: 0, INT: 0, WIS: 0, CHA: 0 } });
  assert.equal(C.edit(h, { op: 'score', stat: 'STR', value: 9 }, player, null).ok, false);
  assert.equal(C.edit(h, { op: 'score', stat: 'STR', value: 6 }, player, null).ok, true, 'moving towards the limit is allowed');
  assert.equal(C.edit(h, { op: 'text', field: 'vow', value: 'Keep the bell.' }, player, null).ok, true);
  assert.equal(h.vow, 'Keep the bell.');
});

test('text fields are kept to their length and plain text', () => {
  const h = hero(); C.edit(h, { op: 'text', field: 'notes', value: 'x'.repeat(5000) + '\u0007' }, player, null);
  assert.equal(h.notes.length, C.TEXT_LIMITS.notes);
  assert.equal(C.edit(h, { op: 'text', field: 'name', value: '   ' }, player, null).ok, false, 'a hero needs a name');
  assert.equal(C.edit(h, { op: 'text', field: 'secret', value: 'x' }, player, null).ok, false);
});

test('gear: an item goes where it usually goes (weapons and armour equipped, supplies in the pack) and slots are counted', () => {
  const h = hero(); const add = (id, who = player) => C.edit(h, { op: 'add', id }, who, null);
  assert.equal(add('sword').ok, true); assert.equal(add('cloak').ok, true); assert.equal(add('spear').ok, true);
  assert.equal(ids(h), 'sword+,cloak-,spear+'); assert.equal(C.slotsUsed(h, 'eq'), 3); assert.equal(C.slotsUsed(h, 'pack'), 1);
  assert.equal(add('nonsense').ok, false);
});

test('gear: when a set is full the sheet says why, in plain words, and offers nothing it cannot do', () => {
  const h = hero(); for (const id of ['spear', 'bow', 'crossbow', 'billhook']) C.edit(h, { op: 'add', id }, player, null);   // 8 slots equipped
  C.edit(h, { op: 'add', id: 'sword' }, player, null); C.edit(h, { op: 'add', id: 'cudgel' }, player, null);              // 10
  assert.equal(C.slotsUsed(h, 'eq'), 10);
  const r = C.edit(h, { op: 'add', id: 'gambeson' }, player, null);
  assert.equal(r.ok, true, 'armour finds room in the pack');
  assert.equal(h.gear.at(-1).eq, false);
  const full = hero(); for (const id of ['spear', 'bow', 'crossbow', 'billhook', 'sword', 'cudgel']) C.edit(full, { op: 'add', id }, player, null);
  for (const id of ['lantern', 'rope', 'picks', 'oil', 'spirits', 'bandages', 'candles', 'tinder', 'crowbar', 'spikes']) C.edit(full, { op: 'add', id }, player, null);
  assert.equal(C.slotsUsed(full, 'pack'), 10);
  const no = C.edit(full, { op: 'add', id: 'harness' }, player, null);
  assert.equal(no.ok, false); assert.match(no.why, /Plate Harness/); assert.match(no.why, /3 slots/); assert.match(no.why, /Drop something/);
  assert.equal(full.gear.length, 16, 'nothing was added');
});

test('moving gear between the equipped set and the pack needs room, and a supply cannot be equipped', () => {
  const h = hero(); C.edit(h, { op: 'add', id: 'sword' }, player, null); C.edit(h, { op: 'add', id: 'lantern' }, player, null);
  assert.equal(C.edit(h, { op: 'move', index: 0, eq: false }, player, null).ok, true); assert.equal(ids(h), 'sword-,lantern-');
  assert.equal(C.edit(h, { op: 'move', index: 0, eq: true }, player, null).ok, true);
  const r = C.edit(h, { op: 'move', index: 1, eq: true }, player, null); assert.equal(r.ok, false); assert.match(r.why, /supply.*pack/i);
  assert.equal(C.edit(h, { op: 'move', index: 9, eq: true }, player, null).ok, false);
});

test('a move that does not fit is refused with the numbers', () => {
  const h = hero(); for (const id of ['spear', 'bow', 'crossbow', 'billhook', 'sword', 'cudgel']) C.edit(h, { op: 'add', id }, player, null);   // 10 equipped
  C.edit(h, { op: 'add', id: 'gambeson' }, player, null);   // goes to the pack
  const r = C.edit(h, { op: 'move', index: 6, eq: true }, player, null); assert.equal(r.ok, false); assert.match(r.why, /equipped slots are full \(10 of 10/);
});

test('relics are the GM\'s to give; a player may pick one grimoire; a hero holds at most three magic items', () => {
  const h = hero(); const add = (id, who) => C.edit(h, { op: 'add', id }, who, null);
  const relic = add('chain', player); assert.equal(relic.ok, false); assert.match(relic.why, /relic.*ask your GM/i);
  assert.equal(add('embers', player).ok, true);
  const second = add('litany', player); assert.equal(second.ok, false); assert.match(second.why, /one grimoire.*ask your GM/i);
  assert.equal(add('litany', gm).ok, true); assert.equal(add('chain', gm).ok, true);
  const fourth = add('bell', gm); assert.equal(fourth.ok, false); assert.match(fourth.why, /no more than three/i);
});

test('armour feeds Defence: 10 + CON + armour, armour counting for at most +5, and the GM\'s own armour number still counts', () => {
  const h = hero({ stats: { STR: 0, DEX: 0, CON: 2, INT: 0, WIS: 0, CHA: 0 } });
  assert.equal(C.defence(h), 12);
  C.edit(h, { op: 'add', id: 'gambeson' }, player, null); assert.equal(C.armourBonus(h), 2); assert.equal(C.defence(h), 14);
  C.edit(h, { op: 'move', index: 0, eq: false }, player, null); assert.equal(C.defence(h), 12, 'armour in the pack does not count');
  h.armour = 2; assert.equal(C.defence(h), 14, 'the GM\'s number still counts');
  C.edit(h, { op: 'move', index: 0, eq: true }, player, null); C.edit(h, { op: 'add', id: 'brigandine' }, player, null);
  assert.equal(C.defence(h), 12 + 5, 'capped at +5 of armour');
});

test('the Plate Harness adds a Heart while worn and takes it away when it comes off, and a lower hit point total follows the new maximum', () => {
  const h = hero(), p = hp(); C.edit(h, { op: 'add', id: 'harness' }, player, p);
  assert.deepEqual(p, { cur: 20, max: 20 });
  p.cur = 15; C.edit(h, { op: 'move', index: 0, eq: false }, player, p); assert.deepEqual(p, { cur: 10, max: 10 });
  C.edit(h, { op: 'move', index: 0, eq: true }, player, p); assert.deepEqual(p, { cur: 20, max: 20 });
  C.edit(h, { op: 'remove', index: 0 }, player, p); assert.deepEqual(p, { cur: 10, max: 10 }); assert.equal(h.gear.length, 0);
});

test('removing gear that is not there is refused; a supply keeps its uses', () => {
  const h = hero(); assert.equal(C.edit(h, { op: 'remove', index: 0 }, player, null).ok, false);
  C.edit(h, { op: 'add', id: 'bandages' }, player, null); assert.equal(h.gear[0].uses, 3);
});

test('a refused edit changes nothing at all', () => {
  const h = hero(), before = JSON.stringify(h), p = hp();
  C.edit(h, { op: 'add', id: 'chain' }, player, p); C.edit(h, { op: 'score', stat: 'STR', value: 99 }, player, p);
  assert.equal(JSON.stringify(h), before); assert.deepEqual(p, hp());
});

test('a whole hero can be checked: what is over a limit is listed in words, and cleaning keeps only what is allowed', () => {
  const ok = hero({ stats: { STR: 3, DEX: 0, CON: 2, INT: 0, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 3, guns: 0, magic: 0, ultimate: 0 } });
  assert.deepEqual(C.problems(ok, player), []);
  const bad = hero({ stats: { STR: 6, DEX: 6, CON: 0, INT: 0, WIS: 0, CHA: 0 }, gear: [{ id: 'chain', eq: true }, { id: 'nonsense', eq: true }] });
  const list = C.problems(bad, player); assert.ok(list.some((x) => /12 points/.test(x))); assert.ok(list.some((x) => /relic/i.test(x))); assert.ok(list.some((x) => /nonsense/.test(x)));
  assert.ok(!C.problems(hero({ gear: [{ id: 'chain', eq: true }] }), { gm: false, arriving: true }).some((x) => /relic/i.test(x)), 'a ready-made kit may arrive with a relic');
  assert.ok(C.problems(hero({ gear: ['chain', 'bell', 'censer', 'candle'].map((id) => ({ id, eq: true })) }), { gm: false, arriving: true }).some((x) => /no more than three/.test(x)));
  assert.deepEqual(C.problems(hero({ gear: [{ id: 'chain', eq: true }] }), gm), [], 'the GM may give a relic');
  const c = C.cleanHero({ name: '  Wren  ', stats: { STR: 99, DEX: 'x' }, effort: { basic: 2 }, gear: [{ id: 'sword', eq: 'yes' }, { id: 'bogus' }], armour: 99, notes: 5, extra: 'x' });
  assert.equal(c.name, 'Wren'); assert.equal(c.stats.STR, 10); assert.equal(c.stats.DEX, 0); assert.equal(c.effort.basic, 2); assert.equal(c.armour, 10);
  assert.deepEqual(c.gear.map((g) => g.id), ['sword']); assert.equal(c.extra, undefined); assert.equal(c.notes, '5');
});
