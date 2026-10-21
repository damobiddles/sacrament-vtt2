// What can be equipped is decided by an item's data (its type, or its own "equippable" flag), never by its name; supplies stay in the pack.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';

const G = globalThis.SACRAMENT_GEAR;
// two test items with MISLEADING names, added to the list before the sheet's rules read it: a weapon that says it cannot be equipped, and a supply that says it can
G.items.push({ id: 'testunwieldy', kind: 'weapon', category: 'Weapon', name: 'Equipped Blade', slots: 1, equippable: false, roll: 'STR', cat: 'weapons', does: 'A blade that stays in the pack, whatever it is called.' });
G.items.push({ id: 'testworn', kind: 'supply', category: 'Mundane', name: 'Supply Satchel', slots: 1, equippable: true, does: 'A supply that may be worn, whatever it is called.' });
await import('../site/sheet/sheet-core.js');

const C = globalThis.SacramentSheetCore;
const player = { gm: false };
const hero = (o = {}) => Object.assign(C.blankHero('Thorne'), o);
const state = (h) => h.gear.map((g) => g.id + (g.eq ? '+' : '-')).join(',');

test('what counts as a supply comes from the data: the type, or the item\'s own flag, never its name', () => {
  assert.equal(C.canEquip(C.item('sword')), true); assert.equal(C.canEquip(C.item('gambeson')), true); assert.equal(C.canEquip(C.item('chain')), true); assert.equal(C.canEquip(C.item('embers')), true);
  assert.equal(C.canEquip(C.item('bandages')), false); assert.equal(C.canEquip(C.item('cloak')), false); assert.equal(C.canEquip(C.item('signet')), false); assert.equal(C.canEquip(C.item('boneflute')), false);
  assert.equal(C.canEquip(C.item('testunwieldy')), false, 'its own flag beats its type'); assert.equal(C.canEquip(C.item('testworn')), true, 'and the other way round');
  assert.equal(C.canEquip(null), false);
});

test('every supply on the list, starter and loot table, cannot be equipped, and nothing else on the list is held back', () => {
  const all = C.items.filter((i) => i.id !== 'testunwieldy' && i.id !== 'testworn');
  const supplies = all.filter((i) => i.kind === 'supply'); assert.equal(supplies.length, 46);
  for (const i of supplies) assert.equal(C.canEquip(i), false, i.name);
  for (const i of all.filter((x) => x.kind !== 'supply')) assert.equal(C.canEquip(i), true, i.name);
});

test('equipping a supply is refused, in words; an item that can be equipped still moves both ways', () => {
  const h = hero(); for (const id of ['bandages', 'sword']) C.edit(h, { op: 'add', id }, player, null);
  assert.equal(state(h), 'bandages-,sword+');
  const r = C.edit(h, { op: 'move', index: 0, eq: true }, player, null); assert.equal(r.ok, false); assert.match(r.why, /supply.*pack.*cannot be equipped/i); assert.equal(state(h), 'bandages-,sword+');
  assert.equal(C.edit(h, { op: 'move', index: 1, eq: false }, player, null).ok, true); assert.equal(state(h), 'bandages-,sword-');
  assert.equal(C.edit(h, { op: 'move', index: 1, eq: true }, player, null).ok, true); assert.equal(state(h), 'bandages-,sword+');
  const w = C.edit(h, { op: 'add', id: 'testunwieldy' }, player, null); assert.equal(w.ok, true); assert.equal(state(h), 'bandages-,sword+,testunwieldy-', 'a flagged item goes to the pack');
  const m = C.edit(h, { op: 'move', index: 2, eq: true }, player, null); assert.equal(m.ok, false); assert.match(m.why, /Equipped Blade cannot be equipped/);
  assert.equal(C.edit(h, { op: 'add', id: 'testworn' }, player, null).ok, true); assert.equal(h.gear.at(-1).eq, false, 'a supply goes to the pack even if it may be worn');
  assert.equal(C.edit(h, { op: 'move', index: 3, eq: true }, player, null).ok, true, 'but it may be moved into the equipped set when its own flag allows it');
});

test('a supply is never put in the equipped set to make room: when the pack is full it is refused', () => {
  const h = hero(); for (const id of ['spear', 'bow']) C.edit(h, { op: 'add', id }, player, null);   // equipped has room
  for (const id of ['lantern', 'rope', 'picks', 'oil', 'spirits', 'bandages', 'candles', 'tinder', 'crowbar', 'spikes']) C.edit(h, { op: 'add', id }, player, null);   // the pack: ten slots
  assert.equal(C.slotsUsed(h, 'pack'), 10);
  const r = C.edit(h, { op: 'add', id: 'cloak' }, player, null); assert.equal(r.ok, false); assert.match(r.why, /pack is full/); assert.match(r.why, /Drop something first/);
  assert.equal(C.slotsUsed(h, 'eq'), 4, 'nothing spilled into the equipped set'); assert.equal(h.gear.length, 12);
});

test('a supply that is somehow marked equipped counts as in the pack, and can be moved there cleanly', () => {
  const h = hero({ gear: [{ id: 'bandages', eq: true, uses: 3 }, { id: 'sword', eq: true }] });
  assert.equal(C.slotsUsed(h, 'eq'), 1); assert.equal(C.slotsUsed(h, 'pack'), 1);
  assert.equal(C.actions(h).length, 1, 'it still works from the pack');
});

test('fixing a hero that already has a supply equipped moves it to the pack and says which', () => {
  const h = hero({ gear: [{ id: 'bandages', eq: true, uses: 3 }, { id: 'sword', eq: true }, { id: 'lantern', eq: true }] });
  const moved = C.unequipSupplies(h, null); assert.deepEqual(moved, ['Linen Bandages', 'Hooded Lantern']); assert.equal(state(h), 'bandages-,sword+,lantern-');
  assert.deepEqual(C.unequipSupplies(h, null), [], 'nothing left to move');
});

test('a hero arriving with a supply marked equipped is cleaned: it arrives in the pack', () => {
  const c = C.cleanHero({ name: 'Wren', gear: [{ id: 'bandages', eq: true }, { id: 'sword', eq: true }] });
  assert.equal(state(c), 'bandages-,sword+');
});
