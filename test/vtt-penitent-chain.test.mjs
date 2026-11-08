// The Penitent's Chain at the table (owner, 2026-11-08): a Free use, once per turn; its user takes 1d4 that nothing reduces and adds +3 to their next check.
// The same listed effects (sheet-core effectsOf) are what the solo game plays. The Bone Bell and the Censer of Ash act on foes, which stay on the GM's cards.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const feed = (st) => st.log.map((e) => e.text).join(' | ');
async function setup(dice) {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'chain' } })).status, 200);
  return { t, ann, thorne };
}
const hp = (st) => find(st, 'Thorne').hp.cur;
const useChain = (ann, thorne) => ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 });

test("CHAIN: 1d4 HP that nothing reduces, its Horror, and +3 on the next check, which that check takes", async () => {
  const { t, ann, thorne } = await setup([die(3, 4), d20(9)]);
  const before = hp(await t.state()), h0 = (await t.state()).horror.cur;
  const r = await useChain(ann, thorne); assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(hp(r.body.state), before - 3); assert.ok(r.body.state.horror.cur > h0, 'it tempts the Horror');
  assert.match(feed(r.body.state), /Thorne's Penitent's Chain: d4 shows 3, 3 HP that nothing reduces .*; \+3 on Thorne's next roll\./);
  assert.equal(r.body.state.chars[thorne.id].checkBonus, 3, 'the player sees the bonus waiting');
  const stat = (await t.state()).chars[thorne.id].stats.STR;
  const roll = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }); assert.equal(roll.status, 200);
  assert.equal(roll.body.state.rolls.at(-1).check.total, 9 + stat + 3, 'the +3 is in the roll');
  assert.match(feed(roll.body.state), /\(\+3 from Penitent's Chain\)/);
  assert.equal(roll.body.state.chars[thorne.id].checkBonus, 0, 'used once');
});

test('CHAIN: once per turn, and not again while its +3 waits; a new turn allows it again', async () => {
  const { t, ann, thorne } = await setup([die(1, 4), d20(10), die(1, 4)]);
  assert.equal((await useChain(ann, thorne)).status, 200);
  const waiting = await useChain(ann, thorne); assert.equal(waiting.status, 400); assert.match(JSON.stringify(waiting.body), /Once per turn|still waiting/);
  await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' });
  const again = await useChain(ann, thorne); assert.equal(again.status, 400); assert.match(JSON.stringify(again.body), /Once per turn/);
  const st = await t.state(); assert.equal((await t.gm.cmd({ type: 'endTurn', expect: { round: st.table.round, idx: st.table.idx } })).status, 200);
  assert.equal((await useChain(ann, thorne)).status, 200, 'a new turn');
});

test('CHAIN: its user can take the line back while the +3 is unspent, which restores the HP, the bonus and the turn\'s use', async () => {
  const { t, ann, thorne } = await setup([die(2, 4)]);
  const before = hp(await t.state()); await useChain(ann, thorne);
  const line = (await ann.get()).body.state.log.find((e) => /Penitent's Chain: d4/.test(e.text)); assert.ok(line && line.undoable, 'the player may undo it');
  const u = await ann.cmd({ type: 'undo', logId: line.id }); assert.equal(u.status, 200, JSON.stringify(u.body));
  assert.equal(hp(u.body.state), before); assert.equal(u.body.state.chars[thorne.id].checkBonus, 0);
  assert.equal((await useChain(ann, thorne)).status, 200, 'it can be used again this turn after the undo');
});

test('CHAIN: once the +3 has gone into a roll, the line cannot be taken back', async () => {
  const { t, ann, thorne } = await setup([die(2, 4), d20(10)]);
  await useChain(ann, thorne); await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' });
  const line = (await t.state()).log.find((e) => /Penitent's Chain: d4/.test(e.text));
  assert.equal((await t.gm.cmd({ type: 'undo', logId: line.id })).status, 409);
});
