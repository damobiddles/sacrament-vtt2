// Finds, using items, and the d100 loot table: the parts of the sheet's rules (sheet-core.js) that the loot table added.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';

const C = globalThis.SacramentSheetCore;
const player = { gm: false }, gm = { gm: true };
const hero = (o = {}) => Object.assign(C.blankHero('Thorne'), o);

test('finds: a player cannot add anything from the loot table, and the GM can add any of it', () => {
  const h = hero(); const add = (id, who) => C.edit(h, { op: 'add', id }, who, null);
  const a = add('gravespade', player); assert.equal(a.ok, false); assert.match(a.why, /find.*ask your GM/i);
  assert.equal(add('wardenbell', player).ok, false);
  assert.equal(add('gravespade', gm).ok, true); assert.equal(add('wardenbell', gm).ok, true);
  assert.equal(C.isFind(C.item('gravespade')), true); assert.equal(C.isFind(C.item('sword')), false);
  assert.ok(C.problems(hero({ gear: [{ id: 'jerkin', eq: true }] }), player).some((x) => /find/i.test(x)));
});

test('using an item: only an item with an Effort kind rolls Effort, a plain one without is refused, a weapon must be equipped, a grimoire is used through a spell, and a used-up flask is refused', () => {
  const h = hero(); for (const id of ['sword', 'cloak', 'embers']) C.edit(h, { op: 'add', id }, player, null);
  C.edit(h, { op: 'add', id: 'holywater' }, gm, null);
  const i = (id) => h.gear.findIndex((g) => g.id === id);
  const sword = C.useOf(h, i('sword')); assert.equal(sword.ok, true); assert.deepEqual([sword.stat, sword.cat], ['STR', 'weapons']);
  assert.match(C.useOf(h, i('cloak')).why, /no Effort die/);
  assert.match(C.useOf(h, i('embers')).why, /Choose one of the spells/);
  const ember = C.useOf(h, i('embers'), 'ember'); assert.equal(ember.ok, true); assert.deepEqual([ember.stat, ember.cat], ['INT', 'magic']);
  const kindle = C.useOf(h, i('embers'), 'kindle'); assert.equal(kindle.ok, true, 'a spell with no Effort die is still cast: it tempts the Horror'); assert.deepEqual([kindle.stat, kindle.cat, kindle.horror], ['', '', 1], 'no stat, so no check; no Effort; 1 Horror');
  assert.match(C.useOf(h, i('embers'), 'unmake').why, /Choose one of the spells/, 'a spell from another book');
  C.edit(h, { op: 'move', index: i('sword'), eq: false }, player, null); assert.match(C.useOf(h, i('sword')).why, /Equip the Penitent's Blade first/);
  assert.equal(C.useOf(h, i('holywater')).ok, true, 'a supply works from the pack');
  h.gear[i('holywater')].uses = 0; assert.match(C.useOf(h, i('holywater')).why, /no uses left/);
  assert.match(C.useOf(h, 99).why, /nothing there/);
});

test('the list of things a hero can use names each one and says why it cannot be used now', () => {
  const h = hero(); for (const id of ['sword', 'embers', 'cloak']) C.edit(h, { op: 'add', id }, player, null);
  C.edit(h, { op: 'move', index: 0, eq: false }, player, null);
  const list = C.actions(h); assert.deepEqual(list.map((x) => x.name), ["Penitent's Blade", 'Ember (The Ashen Psalter)', 'Kindle (The Ashen Psalter)', 'Ember Psalm (The Ashen Psalter)', 'Pillar of Ash (The Ashen Psalter)', 'Psalm of Ruin (The Ashen Psalter)', 'Pyre (The Ashen Psalter)']);   // the cloak never rolls and tempts nothing; every spell tempts the Horror, so each can be cast
  assert.equal(list[0].ok, false); assert.match(list[0].why, /Equip/); assert.equal(list[1].ok, true);
});

test('the loot table: 1-35, 36-58, 59-80 and 81-95 lead to sub-tables; 96-100 give their item; each sub-table number gives its item', () => {
  const to = (n) => C.lootEntry(n, 'd100').table.id;
  assert.deepEqual([to(1), to(35), to(36), to(58), to(59), to(80), to(81), to(95)], ['supplies', 'supplies', 'arms', 'arms', 'valuables', 'valuables', 'relics', 'relics']);
  assert.equal(C.lootItem(96).id, 'dust'); assert.equal(C.lootItem(100).id, 'sealshard'); assert.equal(C.lootItem(1), null, 'a number that leads into a sub-table is no item by itself');
  assert.equal(C.lootItem(0), null); assert.equal(C.lootItem(101), null);
  const on = (n, t) => C.lootEntry(n, t).item.id;
  assert.deepEqual([on(1, 'supplies'), on(2, 'supplies'), on(17, 'supplies'), on(18, 'supplies'), on(20, 'supplies')], ['stubs', 'stubs', 'lampoil', 'knuckrosary', 'purse']);
  assert.deepEqual([on(1, 'arms'), on(3, 'arms'), on(4, 'arms'), on(12, 'arms')], ['sword', 'watchbill', 'jerkin', 'silverdagger']);
  assert.deepEqual([on(1, 'valuables'), on(5, 'valuables'), on(12, 'valuables')], ['holywater', 'fingerbone', 'prebindcoin']);
});

test('a grimoire read by the die: one action, no spell chosen, and the die chooses among its first four spells', () => {
  const h = hero(); C.edit(h, { op: 'add', id: 'untitled' }, gm, null); C.edit(h, { op: 'add', id: 'cloak' }, player, null);
  const u = C.useOf(h, 0, 'borrowedface'); assert.equal(u.ok, true); assert.equal(u.pick, 4); assert.equal(u.spell, null, 'the spell asked for is ignored: the die chooses');
  assert.deepEqual(u.spells.map((s) => s.name), ['The Page That Watches', 'Borrowed Face', 'The Door Inward', 'Its Real Name']);
  const sp = C.useSpell(u, u.spells[3]); assert.deepEqual([sp.name, sp.stat, sp.cat, sp.horror], ['Its Real Name (Grimoire with no title)', '', '', 'd6']);
  assert.deepEqual(C.actions(h).map((a) => a.name), ['Read Grimoire with no title']);
  C.edit(h, { op: 'move', index: 0, eq: false }, gm, null); assert.match(C.useOf(h, 0).why, /Equip the Grimoire with no title first/);
});

test('a relic with no Effort die but a stat is used with a check; a designed find keeps a rolled Horror amount', () => {
  const h = hero(); C.edit(h, { op: 'add', id: 'bell' }, gm, null);
  const bell = C.useOf(h, 0); assert.equal(bell.ok, true); assert.deepEqual([bell.stat, bell.cat, bell.horror], ['CHA', '', 2]);
  assert.equal(C.makeCustom({ name: 'Vial', temptsHorror: true, horror: 'd4+2' }).horror, 'd4+2');
  assert.equal(C.makeCustom({ name: 'Vial', temptsHorror: true, horror: '3' }).horror, 3);
  assert.equal(C.makeCustom({ name: 'Vial', temptsHorror: true, horror: 'lots' }).horror, 0);
  assert.equal(C.makeCustom({ name: 'Vial', horror: 4 }).horror, 0, 'nothing that does not tempt the Horror carries an amount');
});

test('the loot sub-tables: 81 to 95 on the d100 lead into the Relics table, rolled on a d8, and typed numbers are used in order', () => {
  assert.equal(C.lootItem(81), null, 'a number that leads into a sub-table gives no item by itself');
  assert.equal(C.lootEntry(87, 'd100').table.id, 'relics'); assert.equal(C.lootEntry(4, 'relics').item.name, 'Ashen Rosary');
  const dice = [87, 4], rolled = [];
  const r = C.rollLoot((sides) => { rolled.push(sides); return dice.shift(); }); assert.equal(r.ok, true); assert.deepEqual(rolled, [100, 8], 'a d100, then the d8');
  assert.equal(r.item.name, 'Ashen Rosary'); assert.equal(C.sayLoot(r.steps), '87 → Relics d8: 4');
  const typed = C.rollLoot(() => { throw new Error('nothing should be rolled'); }, [90, 8]); assert.equal(typed.item.name, 'Fragment of stained glass'); assert.deepEqual(typed.steps.map((x) => x.typed), [true, true]);
  const half = C.rollLoot((sides) => { assert.equal(sides, 8); return 1; }, [95]); assert.equal(half.item.name, "The Warden's Bell", 'a typed d100 with the sub-table left to the table');
  assert.equal(C.rollLoot(() => 98).item.name, 'The Ashen Psalter', 'a number with an item rolls nothing more');
  assert.equal(C.rollLoot(() => 1, [42, 4]).item.name, 'Boiled leather jerkin', '42 leads into Arms and tools, a d12');
  assert.match(C.rollLoot(() => 1, [87, 9]).why, /A d8 shows 1 to 8/); assert.match(C.rollLoot(() => 1, [101]).why, /A d100 shows 1 to 100/);
});
