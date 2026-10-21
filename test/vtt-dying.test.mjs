// Dying and the party's rest (the owner's choice, 2026-10-21), as the Rules page has them: a hero at 0 rolls a d4 countdown, each new round takes one off, at 0 they are dead;
// a blow on a dying hero takes a round off instead of damage; the GM marks a tended hero stable; any healing stands them up. A rest heals every living hero a Heart and
// lowers the Horror by a d6 for every two of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';

const R = globalThis.SacramentRules;
const feed = (st) => st.log.map((e) => e.text).join(' | ');
const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
/* Thorne has 10 HP and Defence 14; the sample's Pit Ghoul attacks with +3 once it is set. */
async function setup(dice) {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), st = await t.state();
  return { t, ann, thorne, card: find(st, 'Thorne'), ghoul: find(st, 'Pit Ghoul') };
}
const thorneOf = async (t) => find(await t.state(), 'Thorne');
const down = (who, card, n = 10) => who.cmd({ type: 'adjust', cardId: card.id, field: 'hp', delta: -n });
const lastLog = (st, re) => st.log.filter((e) => re.test(e.text)).at(-1);

test('rules: the d4 countdown, a round off, the GM\'s corrections, and the rest\'s dice', () => {
  assert.deepEqual(R.dyingFall(3), { left: 3, stable: false, dead: false });
  assert.deepEqual(R.dyingTick({ left: 2, stable: false, dead: false }), { left: 1, stable: false, dead: false });
  assert.deepEqual(R.dyingTick({ left: 1, stable: false, dead: false }), { left: 0, stable: false, dead: true });
  assert.deepEqual(R.dyingTick({ left: 2, stable: true, dead: false }), { left: 2, stable: true, dead: false }, 'a stable hero does not move');
  assert.deepEqual(R.dyingAdjust({ left: 0, stable: false, dead: true }, 1), { left: 1, stable: false, dead: false }, 'a round back brings the dead back to dying');
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(R.restDice), [1, 1, 2, 2, 3, 3]);
});

test('FALL: a hero brought to 0 rolls the d4 where everyone sees it, and is marked dying for the players too', async () => {
  const { t, ann, card } = await setup([die(3, 4)]);
  const r = await down(ann, card); assert.equal(r.status, 200);
  const st = r.body.state; assert.deepEqual(find(st, 'Thorne').dying, { left: 3, stable: false, dead: false }, 'the player is sent the countdown');
  const line = lastLog(st, /falls and is dying/); assert.equal(line.text, 'Thorne falls and is dying: d4 shows 3, 3 rounds left.'); assert.deepEqual(line.dice, [{ die: 4, n: 3 }]);
  assert.equal(line.undoable, false, 'the player cannot undo their own countdown away');
  assert.equal((await ann.cmd({ type: 'dying', cardId: card.id, op: 'stable' })).status, 403, 'only the GM marks a hero stable');
});

test('ROUNDS: each new round takes one off; at 0 the hero has died, the GM is alerted, and HP no longer rises', async () => {
  const { t, ann, card } = await setup([die(2, 4)]);
  await down(ann, card);
  const r1 = await t.gm.cmd({ type: 'nextRound' }); assert.equal(r1.status, 200);
  assert.equal(find(r1.body.state, 'Thorne').dying.left, 1); assert.match(feed(r1.body.state), /Thorne is dying: 1 round left\./);
  const r2 = await t.gm.cmd({ type: 'nextRound' }); const st = r2.body.state;
  assert.deepEqual(find(st, 'Thorne').dying, { left: 0, stable: false, dead: true }); assert.equal(lastLog(st, /has died/).kind, 'alert');
  assert.equal((await ann.cmd({ type: 'adjust', cardId: card.id, field: 'hp', delta: 1 })).status, 400, 'the dead are not healed');
  assert.equal((await t.gm.cmd({ type: 'track', id: card.id, field: 'hp', mode: 'delta', value: 5 })).status, 400);
  /* the GM can bring them back: a round, then healing */
  assert.equal((await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'round', d: 1 })).status, 200);
  assert.deepEqual((await thorneOf(t)).dying, { left: 1, stable: false, dead: false });
});

test('UNDO: taking back the round gives the round back; healing stands the hero up, and undoing the heal puts them back down where they were', async () => {
  const { t, ann, card } = await setup([die(3, 4)]);
  await down(ann, card);
  const r = await t.gm.cmd({ type: 'nextRound' }), turn = lastLog(r.body.state, /^Round/);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: turn.id })).status, 200); assert.equal((await thorneOf(t)).dying.left, 3);
  const h = await ann.cmd({ type: 'adjust', cardId: card.id, field: 'hp', delta: 2 }); assert.equal(find(h.body.state, 'Thorne').dying, null);
  const heal = lastLog(h.body.state, /HP \+2/); assert.match(heal.text, /Thorne is back on their feet\./);
  assert.equal((await ann.cmd({ type: 'undo', logId: heal.id })).status, 200);
  const back = await thorneOf(t); assert.equal(back.hp.cur, 0); assert.deepEqual(back.dying, { left: 3, stable: false, dead: false });
});

test('STABLE: the GM marks a tended hero stable; rounds pass them by; hurt again they roll a new d4', async () => {
  const { t, ann, card } = await setup([die(1, 4), die(4, 4)]);
  await down(ann, card);
  assert.equal((await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'stable' })).status, 200);
  await t.gm.cmd({ type: 'nextRound' }); assert.deepEqual((await thorneOf(t)).dying, { left: 1, stable: true, dead: false });
  const r = await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'hurt' }); assert.equal(r.status, 200);
  assert.deepEqual(find(r.body.state, 'Thorne').dying, { left: 4, stable: false, dead: false }); assert.match(feed(r.body.state), /Thorne is hurt again and is dying: d4 shows 4/);
});

test('BLOW: a monster\'s hit on a dying hero takes a round off instead of rolling damage, and on a stable one starts a new d4', async () => {
  const { t, ann, card, ghoul } = await setup([die(3, 4), d20(18), d20(18), die(2, 4)]);
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 3 } });
  await down(ann, card);
  const a = await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: card.id }), roll = a.body.state.rolls.at(-1); assert.equal(roll.check.hit, true);
  const b = await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' }); assert.equal(b.status, 200);
  assert.equal(find(b.body.state, 'Thorne').dying.left, 2); assert.equal(b.body.state.rolls.at(-1).effort, null, 'no damage was rolled');
  assert.match(feed(b.body.state), /Pit Ghoul strikes Thorne, who is down\. Thorne loses a round: 2 rounds left\./);
  assert.equal((await t.gm.cmd({ type: 'monsterEffort', rollId: roll.id, cat: 'weapons' })).status, 409, 'once');
  await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'stable' });
  const a2 = await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: card.id });
  const b2 = await t.gm.cmd({ type: 'monsterEffort', rollId: a2.body.state.rolls.at(-1).id, cat: 'weapons' });
  assert.deepEqual(find(b2.body.state, 'Thorne').dying, { left: 2, stable: false, dead: false }); assert.match(feed(b2.body.state), /is dying again: d4 shows 2/);
});

test('REST: every living hero recovers a Heart (the fallen stand up), the Horror falls by 2d6 for four heroes, and one Undo takes it all back', async () => {
  const { t, ann, card } = await setup([die(2, 4), die(3, 6), die(5, 6)]);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 12 });
  await down(ann, card);
  const wisp = find(await t.state(), 'Wisp'); await t.gm.cmd({ type: 'adjust', cardId: wisp.id, field: 'hp', delta: -4 });
  assert.equal((await ann.cmd({ type: 'rest' })).status, 403, 'only the GM calls a rest');
  const r = await t.gm.cmd({ type: 'rest' }); assert.equal(r.status, 200);
  const st = r.body.state; assert.equal(find(st, 'Thorne').hp.cur, 10); assert.equal(find(st, 'Thorne').dying, null); assert.equal(find(st, 'Wisp').hp.cur, 10);
  assert.equal(st.horror.cur, 4, '12 - (3 + 5)');
  const line = lastLog(st, /The party rests/); assert.match(line.text, /Thorne \+10 HP \(now 10\/10\), back on their feet; Wisp \+4 HP/); assert.match(line.text, /Horror 2d6: 3 \+ 5 = 8\. The Horror falls by 8 \(now 4\)\./);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: line.id })).status, 200);
  const u = await t.state(); assert.equal(find(u, 'Thorne').hp.cur, 0); assert.equal(find(u, 'Thorne').dying.left, 2); assert.equal(find(u, 'Wisp').hp.cur, 6); assert.equal(u.horror.cur, 12);
});

test('REST: the dead do not rest, and are not counted for the Horror\'s dice', async () => {
  const { t, ann, card } = await setup([die(1, 4), die(6, 6)]);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 10 });
  await down(ann, card); await t.gm.cmd({ type: 'nextRound' });
  const r = await t.gm.cmd({ type: 'rest' }); const st = r.body.state;
  assert.equal(find(st, 'Thorne').hp.cur, 0); assert.equal(find(st, 'Thorne').dying.dead, true);
  assert.match(lastLog(st, /The party rests/).text, /Horror 2d6: 6 \+ /, 'three living heroes: 2d6');
  assert.match(lastLog(st, /The party rests/).text, /Everyone is already at full health/, 'the living three were not hurt');
  assert.doesNotMatch(lastLog(st, /The party rests/).text, /Thorne/);
});

test('REST: with the Horror at 0 no dice are rolled, and everyone at full is said in a few words', async () => {
  const { t } = await setup([]);
  const r = await t.gm.cmd({ type: 'rest' }); assert.equal(r.status, 200);
  const line = lastLog(r.body.state, /The party rests/); assert.equal(line.text, 'The party rests. Everyone is already at full health. The Horror is at 0.'); assert.equal(line.dice, undefined);
  assert.equal(line.undoable, false, 'nothing changed, so there is nothing to undo');
});
