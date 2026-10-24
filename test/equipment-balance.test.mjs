import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';
import { table, charNamed, die, d20 } from './vtt-helpers.mjs';
const C = globalThis.SacramentSheetCore;
const hero = gear => ({ ...C.blankHero('Equipment test'), gear: gear.map(id => ({ id, eq: true })) });

test('every standard and custom grimoire costs exactly three slots', () => {
  for (const book of C.items.filter(i => i.kind === 'grimoire')) assert.equal(book.slots, 3, book.name);
  assert.equal(C.makeCustom({ category: 'Grimoire', slots: 1 }).slots, 3);
  assert.equal(C.makeCustom({ category: 'Grimoire', slots: 4 }).slots, 3);
});

test('body armour cannot stack, but a helmet and shield remain compatible', () => {
  const h = hero(['gambeson']);
  assert.equal(C.edit(h, { op: 'add', id: 'brigandine' }, { gm: true }).ok, true);
  assert.equal(h.gear[1].eq, false, 'a second suit is stored safely in the pack');
  assert.equal(C.edit(h, { op: 'move', index: 1, eq: true }, { gm: true }).ok, false);
  assert.equal(C.edit(h, { op: 'add', id: 'helm' }, { gm: true }).ok, true);
  assert.equal(C.edit(h, { op: 'add', id: 'shield' }, { gm: true }).ok, true);
  assert.equal(C.armourBonus(h), 4);
  assert.equal(C.armourBonus(hero(['gambeson', 'brigandine'])), 3, 'legacy overlapping suits contribute only the strongest');
});

test('two-handed attacks cannot gain a shield benefit; heavy melee has a distinct bonus', () => {
  const h = hero(['tithemaul', 'shield']);
  assert.equal(C.useOf(h, 0).ok, false);
  h.gear[1].eq = false;
  assert.equal(C.useOf(h, 0).ok, true);
  assert.equal(C.useOf(h, 0).damageBonus, 2);
  assert.equal(C.useOf(hero(['spear']), 0).damageBonus, 0, 'reach is not also heavy damage');
  assert.equal(C.useOf(hero(['sword']), 0).damageBonus, 0);
});

test('legacy overfull book loadouts keep every item and explain how to restore usable equipment', () => {
  const h = hero(['embers', 'litany', 'dust', 'harness']);
  assert.equal(h.gear.length, 4);
  assert.equal(C.useOf(h, 0, 'ember').ok, false);
  assert.match(C.useOf(h, 0, 'ember').why, /slots|pack/i);
  assert.equal(C.edit(h, { op: 'move', index: 3, eq: false }, { gm: true }).ok, true);
  assert.equal(C.useOf(h, 0, 'ember').ok, true);
});

test('server heavy damage uses the rolled weapon, survives gear changes and cannot be forged or applied twice', async () => {
  const t = await table({ dice: [d20(15), die(4, 6)] });
  const ch = charNamed(await t.state(), 'Thorne');
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id: 'tithemaul' } });
  const hit = await t.gm.cmd({ type: 'useItem', charId: ch.id, index: 0, damageBonus: 100 });
  assert.equal(hit.status, 200);
  const rollId = hit.body.result.rollId;
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'remove', index: 0 } });
  const damage = await t.gm.cmd({ type: 'effort', rollId, damageBonus: 100 });
  assert.equal(damage.status, 200);
  const roll = damage.body.state.rolls.find(r => r.id === rollId);
  assert.equal(roll.effort.total, 4 + ch.effort.weapons + 2);
  assert.equal(roll.effort.weaponBonus, 2);
  assert.equal((await t.gm.cmd({ type: 'effort', rollId })).status, 409);
});

test('custom loot keeps grip and armour roles through library conversion, with safe legacy defaults', () => {
  const heavy = C.makeCustom({ name: 'Heavy test', category: 'Weapon', slots: 1, cat: 'weapons', weaponStyle: 'heavy' });
  assert.equal(heavy.slots, 2);
  assert.equal(C.damageBonus(heavy), 2);
  assert.equal(C.weaponHands(heavy), 2);
  assert.equal(C.makeCustom(C.designOf(heavy)).weaponStyle, 'heavy');
  const helmet = C.makeCustom({ name: 'Helmet test', category: 'Armour', armourPart: 'head', defence: 1 });
  assert.equal(C.makeCustom(C.designOf(helmet)).armourPart, 'head');
  assert.equal(C.makeCustom({ category: 'Armour' }).armourPart, 'body');
  assert.equal(C.makeCustom({ category: 'Weapon' }).weaponStyle, 'single');
});

test('legacy armour reconciliation preserves all items and wounds, is idempotent, and never revives or kills a hero', () => {
  for (const [cur, expected] of [[18, 8], [5, 1], [0, 0]]) {
    const h = hero(['harness', 'processionalharness']), hp = { cur, max: 30 };
    assert.equal(C.reconcileArmour(h, hp).length, 1);
    assert.equal(h.gear.length, 2);
    assert.equal(h.gear.filter(g => g.eq).length, 1);
    assert.deepEqual(hp, { cur: expected, max: 20 });
    assert.deepEqual(C.reconcileArmour(h, hp), []);
    assert.deepEqual(hp, { cur: expected, max: 20 });
  }
});

test('heavy damage respects house dice and adds its bonus once alongside an extra critical die', async () => {
  const t = await table(); const ch = charNamed(await t.state(), 'Thorne');
  await t.gm.cmd({ type: 'settings', patch: { dice: { weapons: 8 } } });
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id: 'vesperaxe' } });
  for (const [d20, cat, rolled, size] of [[15, 'weapons', 7, 8], [20, 'weapons', 7, 8]]) {
    const hit = await t.gm.cmd({ type: 'useItem', charId: ch.id, index: 0, d20 });
    const damage = await t.gm.cmd({ type: 'effort', rollId: hit.body.result.rollId, cat, rolled, criticalRolled: 9 });
    const e = damage.body.state.rolls.at(-1).effort;
    assert.equal(e.die, size);
    assert.equal(e.total, rolled + ch.effort[cat] + 2 + (d20 === 20 ? 9 + ch.effort.ultimate : 0));
    assert.equal(!!e.critical, d20 === 20);
  }
  const free = await t.gm.cmd({ type: 'freeEffort', charId: ch.id, cat: 'weapons', damageBonus: 100, rolled: 4 });
  assert.equal(free.body.state.rolls.at(-1).effort.total, 4 + ch.effort.weapons);
});


test('saved-table armour correction is private, keeps every item and applies only once', async () => {
  const store = memoryStore(), t = await table({ store }), other = await t.join('Observer');
  const room = await store.get(t.code), ch = Object.values(room.data.chars).find(c => c.name === 'Thorne');
  ch.gear = [{ id: 'harness', eq: true }, { id: 'processionalharness', eq: true }];
  room.data.cards[ch.cardId].hp = { cur: 18, max: 30 };
  delete room.data.armourFix;
  await store.put(t.code, room.data, room.etag);
  const command = { type: 'sheet', charId: ch.id, op: { op: 'text', field: 'notes', value: 'Disposable migration check' } };
  assert.equal((await t.gm.cmd(command)).status, 200);
  let saved = (await store.get(t.code)).data;
  assert.deepEqual(saved.cards[ch.cardId].hp, { cur: 8, max: 20 });
  assert.equal(saved.chars[ch.id].gear.length, 2);
  assert.equal(saved.chars[ch.id].gear.filter(g => g.eq).length, 1);
  assert.equal((await t.gm.cmd(command)).status, 200);
  saved = (await store.get(t.code)).data;
  assert.deepEqual(saved.cards[ch.cardId].hp, { cur: 8, max: 20 });
  assert.equal(saved.log.filter(e => e.text.startsWith('Spare armour moved')).length, 1);
  assert.doesNotMatch(JSON.stringify((await other.get()).body), /Spare armour moved|Disposable migration check/);
});

test('future catalogue weapons and armour must declare the roles used by the equipment rules', () => {
  for (const it of C.items) {
    if (it.kind === 'weapon') {
      assert.ok(['single', 'heavy', 'reach', 'ranged', 'crossbow'].includes(it.weaponStyle), it.name);
      if (C.weaponHands(it) === 2) assert.ok(it.slots >= 2, it.name);
    }
    if (it.kind === 'armour') assert.ok(['body', 'head', 'shield'].includes(it.armourPart), it.name);
  }
});
