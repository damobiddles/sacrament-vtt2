// Two bugs left over from the 2026-10-21 bug hunt: a player could undo their own End turn (and with it a new round's timers and countdowns), and a card in the turn
// order that the GM had given to a player showed as "Unseen" to the GM and fell out of the order on the next change.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed } from './vtt-helpers.mjs';

test('LEFTOVER 5: a player cannot undo the GM’s turn advance; the GM still can', async () => {
  const t = await table(); let st = await t.state();
  const p = await t.join('Ash'); await p.cmd({ type: 'claim', charId: charNamed(st, 'Thorne').id });
  st = await t.state(); assert.equal(st.cards[st.table.order[st.table.idx].id].name, 'Thorne');
  const ended = await t.gm.cmd({ type: 'endTurn', expect: { round: st.table.round, idx: st.table.idx } }); assert.equal(ended.status, 200, JSON.stringify(ended.body));
  const mine = (await p.get()).body.state.log.filter((e) => e.kind === 'turn').pop();
  assert.equal(mine.undoable, false, 'the player is not offered Undo on the GM’s turn advance');
  const r = await p.cmd({ type: 'undo', logId: mine.id }); assert.equal(r.status, 403);
  st = await t.state(); assert.equal(st.table.idx, 1, 'the turn stayed moved on');
  const gmLine = st.log.filter((e) => e.kind === 'turn').pop(); assert.equal(gmLine.undoable, true);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: gmLine.id })).status, 200);
  st = await t.state(); assert.equal(st.table.idx, 0);
});

test('LEFTOVER 7: a card in the turn order given to a player keeps its name for the GM and its place when the order changes', async () => {
  const t = await table(); let st = await t.state();
  const p = await t.join('Ash'); const ghoul = find(st, 'Pit Ghoul');
  assert.equal((await t.gm.cmd({ type: 'giveCard', id: ghoul.id, pid: p.pid })).status, 200);
  st = await t.state();
  const entry = st.table.order.find((e) => e.id === ghoul.id); assert.ok(entry, 'the GM still sees the card in the order, by its id');
  /* the GM moves the first hero to the end: every card is still there */
  const ids = st.table.order.map((e) => e.id); assert.ok(ids.every(Boolean));
  await t.gm.cmd({ type: 'orderSet', order: ids.slice(1).concat(ids[0]) });
  st = await t.state(); assert.ok(st.table.order.some((e) => e.id === ghoul.id), 'the given card is still in the order');
  /* the player still sees an unnamed place, as before */
  const ps = (await p.get()).body.state; assert.ok(ps.table.order.some((e) => e.hidden));
});
