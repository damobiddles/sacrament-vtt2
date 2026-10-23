// Using an item at the table: the check, then the item's own Effort die rolled by the player as its own step ("Roll damage"); and the GM's d100 loot roll.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const give = (t, ch, id) => t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id } });
const feed = (st) => st.log.map((e) => e.text).join(' | ');
const lastRoll = (r) => r.body.state.rolls.at(-1);

async function setup(dice) { const t = await table({ dice }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'); return { t, ann, thorne, ghoul: find(await t.state(), 'Pit Ghoul') }; }

test('USE: a check with the item\'s stat; on a success nothing more is rolled until the player rolls the damage, with the item\'s own die and their bonus; then Apply works as always', async () => {
  const { t, ann, thorne, ghoul } = await setup([d20(15), die(4, 6)]);
  await give(t, thorne, 'sword');
  const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0, targetCardId: ghoul.id }); assert.equal(r.status, 200);
  const hit = lastRoll(r); assert.equal(hit.stat, 'STR'); assert.equal(hit.check.success, true); assert.equal(hit.item, "Penitent's Blade");
  assert.equal(hit.effort, null, 'the damage waits for the player'); assert.equal(hit.cat, 'weapons');
  assert.match(feed(r.body.state), /Thorne uses Penitent's Blade · 15 \+ 3 STR = 18 against Target 12/); assert.doesNotMatch(feed(r.body.state), /Effort/);
  const dmg = await ann.cmd({ type: 'effort', rollId: hit.id, cat: 'basic' }); assert.equal(dmg.status, 200);
  const roll = lastRoll(dmg); assert.equal(roll.effort.cat, 'weapons', 'the item\'s own kind, whatever the screen sent'); assert.equal(roll.effort.rolled, 4); assert.equal(roll.effort.bonus, 3); assert.equal(roll.effort.total, 7);
  assert.match(feed(dmg.body.state), /Thorne · d6 4 \+ 3 Weapons = 7 damage/);
  const again = await ann.cmd({ type: 'effort', rollId: roll.id, cat: 'weapons' }); assert.equal(again.status, 409, 'the Effort has already been rolled: no second one');
  const ap = await ann.cmd({ type: 'apply', rollId: roll.id, cardId: ghoul.id, field: 'hp' }); assert.equal(ap.status, 200);
  assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 13, '20 - 7');
});

test('USE: a miss rolls no Effort', async () => {
  const { t, ann, thorne } = await setup([d20(2), die(4, 6)]);
  await give(t, thorne, 'sword');
  const roll = lastRoll(await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 })); assert.equal(roll.check.success, false); assert.equal(roll.effort, null);
});

test('USE: the Effort die is the table\'s, so a house rule that changes the Weapons die changes the roll', async () => {
  const { t, ann, thorne } = await setup([d20(15), die(7, 8)]);
  await t.gm.cmd({ type: 'settings', patch: { dice: { weapons: 8 } } }); await give(t, thorne, 'sword');
  const hit = lastRoll(await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }));
  const roll = lastRoll(await ann.cmd({ type: 'effort', rollId: hit.id })); assert.deepEqual([roll.effort.die, roll.effort.rolled, roll.effort.total], [8, 7, 10]);
});

test('USE: an item with no Effort kind never rolls, an unequipped weapon is refused, and the reasons are in words', async () => {
  const { t, ann, thorne } = await setup();
  await give(t, thorne, 'cloak'); await give(t, thorne, 'sword');
  const none = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }); assert.equal(none.status, 400); assert.match(none.body.error.message, /no Effort die/);
  await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'move', index: 1, eq: false } });
  const un = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 1 }); assert.equal(un.status, 400); assert.match(un.body.error.message, /Equip the Penitent's Blade first/);
  assert.equal((await t.state()).rolls.length, 0, 'nothing was rolled');
});

test('USE: a grimoire is used through one of its spells, and a found relic rolls its own kind of Effort', async () => {
  const { t, ann, thorne } = await setup([d20(15), die(6, 10), d20(15), die(3, 12)]);
  await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'embers' } }); await give(t, thorne, 'sealshard');
  const roll = async (cmd) => { const hit = lastRoll(await ann.cmd(cmd)); return lastRoll(await ann.cmd({ type: 'effort', rollId: hit.id })); };
  const ember = await roll({ type: 'useItem', charId: thorne.id, index: 0, spellId: 'ember' }); assert.deepEqual([ember.stat, ember.effort.cat, ember.effort.total], ['INT', 'magic', 6]);
  const shard = await roll({ type: 'useItem', charId: thorne.id, index: 1 }); assert.deepEqual([shard.stat, shard.effort.cat, shard.effort.die, shard.effort.total], ['WIS', 'ultimate', 12, 3 + 0]);
  assert.match(feed((await t.state())), /It tempts the Horror/);
  assert.equal((await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 })).status, 400, 'a grimoire needs a spell');
});

test('USE: a flask is used up, once; a resend does not use it twice', async () => {
  const { t, ann, thorne } = await setup([d20(15), die(5, 10)]);
  await give(t, thorne, 'holywater');
  const cmd = { type: 'useItem', charId: thorne.id, index: 0 };
  assert.equal((await ann.cmd(cmd, { client: 'useclient001g', n: 1 })).status, 200);
  assert.equal((await ann.cmd(cmd, { client: 'useclient001g', n: 1 })).body.result.duplicate, true);
  assert.equal(charNamed(await t.state(), 'Thorne').gear[0].uses, 0);
  const out = await ann.cmd(cmd); assert.equal(out.status, 400); assert.match(out.body.error.message, /no uses left/);
  assert.equal((await t.state()).rolls.length, 1);
});

test('USE: only the hero\'s player or the GM; another player is refused', async () => {
  const { t, thorne } = await setup([d20(15), die(4, 6), d20(15), die(4, 6)]);
  const bob = await t.join('Bob'); await claim(t, bob, 'Wisp'); await give(t, thorne, 'sword');
  assert.equal((await bob.cmd({ type: 'useItem', charId: thorne.id, index: 0 })).status, 403);
  assert.equal((await t.gm.cmd({ type: 'useItem', charId: thorne.id, index: 0 })).status, 200, 'the GM may use it for the hero');
});

test('LOOT: the GM rolls the d100 table; only the GM is told; a GM-only note reaches only the GM, even from the card made from the find', async () => {
  const t = await table({ dice: [die(42, 100), die(7, 100)] }), ann = await t.join('Ann');   // 42 leads into Arms and tools; its 7 is the jerkin
  const r = await t.gm.cmd({ type: 'lootRoll' }); assert.equal(r.status, 200); assert.deepEqual([r.body.result.n, r.body.result.itemId], [42, 'jerkin']);
  assert.equal((await ann.cmd({ type: 'lootRoll' })).status, 403);
  const typed = await t.gm.cmd({ type: 'lootRoll', n: 100 }); assert.equal(typed.body.result.itemId, 'sealshard'); assert.match(typed.body.result.gmNote, /missing this/);
  assert.equal((await t.gm.cmd({ type: 'lootRoll', n: 101 })).status, 400);
  const res = typed.body.result;
  await t.gm.cmd({ type: 'cardCreate', card: { name: res.name, kind: 'loot', desc: res.flavour, gmNotes: res.gmNote, visible: true } });
  const raw = JSON.stringify((await ann.get()).body);
  assert.doesNotMatch(raw, /missing this/); assert.doesNotMatch(raw, /Loot roll/, 'the roll itself is the GM\'s');
  assert.match(raw, /Black stone carved with a saint's name/, 'what the players may see is on the card');
});

test('LOOT: a d100 number that leads into a sub-table rolls it too, and the feed and the answer name both rolls', async () => {
  const t = await table({ dice: [die(88, 100), die(23, 100)] }), ann = await t.join('Ann');
  const r = await t.gm.cmd({ type: 'lootRoll' }); assert.equal(r.status, 200);
  assert.equal(r.body.result.itemId, 'houndtooth'); assert.equal(r.body.result.n, 88); assert.equal(r.body.result.said, '88 → Relics d100: 23');
  assert.deepEqual(r.body.result.steps.map((x) => [x.table, x.die, x.n]), [['d100', 100, 88], ['relics', 100, 23]]);
  assert.match(feed(await t.state()), /Loot roll 88 → Relics d100: 23: Hound-tooth charm\./);
  assert.doesNotMatch(feed((await ann.get()).body.state), /Loot roll/, 'only the GM is told');
  const typed = await t.gm.cmd({ type: 'lootRoll', ns: [81, 5] }); assert.equal(typed.body.result.name, 'The Thorned Reliquary');
  assert.equal((await t.gm.cmd({ type: 'lootRoll', ns: [81, 101] })).status, 400, 'a d100 shows 1 to 100');
  assert.equal((await t.gm.cmd({ type: 'lootRoll', n: 100 })).body.result.said, '100', 'a plain find says one number');
});

test('USE: a natural 20 may roll Ultimate in place of the item\'s own die when the table offers it, and not otherwise', async () => {
  const { t, ann, thorne } = await setup([d20(20), die(9, 12), d20(20), die(2, 6)]);
  await give(t, thorne, 'sword');
  const hit = lastRoll(await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }));
  assert.equal(lastRoll(await ann.cmd({ type: 'effort', rollId: hit.id, cat: 'ultimate' })).effort.cat, 'ultimate');
  await t.gm.cmd({ type: 'settings', patch: { nat20Ultimate: false } });
  const hit2 = lastRoll(await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }));
  assert.equal(lastRoll(await ann.cmd({ type: 'effort', rollId: hit2.id, cat: 'ultimate' })).effort.cat, 'weapons');
});
