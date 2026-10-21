// The GM's monster attacks: a monster hits or misses a hero's Defence, and on a hit its Effort is rolled and taken off the hero at once.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';

const R = globalThis.SacramentRules;
const feed = (st) => st.log.map((e) => e.text);
async function setup(dice, { hidden = false, bonus = 3 } = {}) {
  const t = await table({ dice }), ghoul = find(await t.state(), 'Pit Ghoul'), thorne = find(await t.state(), 'Thorne');
  const patch = { attack: bonus }; if (hidden) patch.visible = false;
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch })).status, 200);
  return { t, ghoul, thorne, ann: await t.join('Ann') };
}
const attack = (t, ghoul, thorne, extra = {}) => t.gm.cmd(Object.assign({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: thorne.id }, extra));
const lastRoll = (r) => r.body.state.rolls.at(-1);

test('rules: a hero\'s Defence is 10 + CON + armour, armour counts for at most +5, and the bonus never passes +10; an attack hits when it reaches it', () => {
  assert.equal(R.defence(2, 2), 14);
  assert.equal(R.defence(0, 10), 15, 'armour is capped at +5');
  assert.equal(R.defence(10, 5), 20, 'the bonus is capped at +10');
  assert.equal(R.defence(-3, 0), 7);
  assert.equal(R.attack({ d20: 11, bonus: 3, defence: 14 }).hit, true, 'reaching the Defence is a hit');
  assert.equal(R.attack({ d20: 10, bonus: 3, defence: 14 }).hit, false);
  assert.equal(R.attack({ d20: 20, bonus: 0, defence: 25 }).hit, false, 'a natural 20 has no special effect here');
  assert.throws(() => R.attack({ d20: 21, bonus: 0, defence: 10 }));
});

test('HIT: the roll plus the attack bonus reaches the hero\'s Defence, Effort is rolled, and the damage is taken off at once', async () => {
  const { t, ghoul, thorne } = await setup([d20(11), die(4, 6)]);
  assert.equal(R.defence(2, 2), 14);
  const r = await attack(t, ghoul, thorne); assert.equal(r.status, 200);
  const roll = lastRoll(r); assert.equal(roll.check.success, true); assert.equal(roll.check.total, 14); assert.equal(roll.check.defence, 14);
  const e = await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' }); assert.equal(e.status, 200);
  const st = await t.state(); assert.equal(find(st, 'Thorne').hp.cur, 6, 'd6 showing 4, no monster bonus: 10 - 4');
  assert.equal(st.rolls.at(-1).applied.applied, -4);
  const lines = feed(st).join(' | '); assert.match(lines, /Pit Ghoul attacks Thorne/); assert.match(lines, /Hit/); assert.match(lines, /Thorne: HP -4 \(now 6\/10\)/);
});

test('MISS: below the Defence nothing is rolled and nothing changes', async () => {
  const { t, ghoul, thorne } = await setup([d20(10), die(4, 6)]);
  const roll = lastRoll(await attack(t, ghoul, thorne)); assert.equal(roll.check.success, false);
  const e = await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' }); assert.equal(e.status, 400, 'no Effort after a miss');
  const st = await t.state(); assert.equal(find(st, 'Thorne').hp.cur, 10); assert.match(feed(st).join(' | '), /Miss/);
});

test('ONCE: the same action sent again, or Effort rolled again, does not hit twice', async () => {
  const { t, ghoul, thorne } = await setup([d20(15), die(3, 6), die(3, 6), die(3, 6)]);
  const a = await attack(t, ghoul, thorne, {}); const roll = lastRoll(a);
  const cmd = { type: 'monsterEffort', rollId: roll.id, cat: 'weapons' };
  assert.equal((await t.gm.cmd(cmd, { client: 'gmclientaaag', n: 1 })).status, 200);
  const again = await t.gm.cmd(cmd, { client: 'gmclientaaag', n: 1 }); assert.equal(again.body.result.duplicate, true);
  assert.equal(find(await t.state(), 'Thorne').hp.cur, 7, 'taken off once');
  assert.equal((await t.gm.cmd(cmd)).status, 409, 'a fresh Effort for the same attack is refused');
  assert.equal(find(await t.state(), 'Thorne').hp.cur, 7);
});

test('UNDO: undoing the damage puts the hit points back, exactly like any other apply', async () => {
  const { t, thorne, ghoul } = await setup([d20(15), die(5, 6)]);
  const roll = lastRoll(await attack(t, ghoul, thorne)); await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' });
  let st = await t.state(); assert.equal(find(st, 'Thorne').hp.cur, 5);
  const entry = st.log.filter((e) => e.undoable).at(-1); assert.match(entry.text, /HP -5/);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: entry.id })).status, 200);
  st = await t.state(); assert.equal(find(st, 'Thorne').hp.cur, 10); assert.equal(st.rolls.at(-1).applied, null);
});

test('AT 0: hit points stop at 0, only the real amount is taken, and everyone is told the hero is at 0', async () => {
  const { t, thorne, ghoul, ann } = await setup([d20(20), die(6, 6)]);
  await t.gm.cmd({ type: 'track', id: thorne.id, field: 'hp', value: 3 });
  const roll = lastRoll(await attack(t, ghoul, thorne)); await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' });
  const st = await t.state(); assert.equal(find(st, 'Thorne').hp.cur, 0); assert.equal(st.rolls.at(-1).applied.applied, -3);
  const seen = (await ann.get()).body.state; assert.equal(find(seen, 'Thorne').hp.cur, 0); assert.match(feed(seen).join(' | '), /Thorne is at 0/);
});

test('ONLY THE GM: a player cannot make a monster attack or roll its Effort', async () => {
  const { t, thorne, ghoul, ann } = await setup([d20(15), die(4, 6)]);
  const roll = lastRoll(await attack(t, ghoul, thorne));
  const p1 = await ann.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: thorne.id }); assert.equal(p1.status, 403);
  const p2 = await ann.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' }); assert.equal(p2.status, 403);
  const p3 = await ann.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 9 } }); assert.equal(p3.status, 403);
  assert.equal(find(await t.state(), 'Thorne').hp.cur, 10);
});

test('HIDDEN MONSTER (A): the attack is public but the monster stays unnamed and its bonus never reaches a player', async () => {
  const { t, thorne, ghoul, ann } = await setup([d20(15), die(4, 6)], { hidden: true });
  const roll = lastRoll(await attack(t, ghoul, thorne)); await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' });
  const raw = JSON.stringify((await ann.get()).body);
  assert.doesNotMatch(raw, /Pit Ghoul/, 'the name is nowhere in what a player is sent');
  assert.doesNotMatch(raw, /"attack":/);
  const lines = feed((await ann.get()).body.state).join(' | '); assert.match(lines, /Something attacks Thorne/); assert.match(lines, /Thorne: HP -4 \(now 6\/10\)/);
  assert.equal(find((await ann.get()).body.state, 'Thorne').hp.cur, 6, 'the hero strip number is already updated');
  assert.match(feed(await t.state()).join(' | '), /Pit Ghoul attacks Thorne/, 'the GM reads the real name');
});

test('the target must be a hero and the attacker must not be one; the attack bonus is kept within -10 to +10 and blank counts as +0', async () => {
  const { t, thorne, ghoul } = await setup([d20(15)]);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: ghoul.id })).status, 400, 'not a hero');
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: thorne.id, targetCardId: thorne.id })).status, 400, 'a hero attacks with its own rolls');
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 99 } }); assert.equal(find(await t.state(), 'Pit Ghoul').attack, 10);
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: null } }); assert.equal(find(await t.state(), 'Pit Ghoul').attack, null);
  const roll = lastRoll(await attack(t, ghoul, thorne)); assert.equal(roll.check.mod, 0, 'blank is +0');
});
