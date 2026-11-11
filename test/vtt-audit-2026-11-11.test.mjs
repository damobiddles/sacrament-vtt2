// VTT audit, 11 November 2026: what a player is sent so the screen can say it before the roll.
// A hero shaken by the Horror (7) has a Hard next roll; the player and the GM must be able to see that, not only find it out from the result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, charNamed, find } from './vtt-helpers.mjs';

test('SHAKEN: every viewer is sent which heroes are shaken, and it clears with the roll it makes Hard', async () => {
  const t = await table({ dice: [d20(15)] }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  assert.equal(charNamed((await ann.get()).body.state, 'Thorne').shaken, false, 'not shaken before the Horror reaches 7');
  assert.equal((await t.gm.cmd({ type: 'horror', mode: 'set', value: 7 })).status, 200);
  const seen = (await ann.get()).body.state;
  assert.equal(charNamed(seen, 'Thorne').shaken, true, 'the player is told their hero is shaken');
  assert.equal(charNamed(seen, 'Wisp').shaken, true, 'and sees the other heroes are too');
  assert.equal(charNamed(await t.state(), 'Wisp').shaken, true, 'the GM sees it');
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }); assert.equal(r.status, 200);
  assert.equal(r.body.state.rolls.at(-1).check.adj, 'hard');
  assert.equal(charNamed(r.body.state, 'Thorne').shaken, false, 'the Hard roll used it up');
  assert.equal(charNamed(r.body.state, 'Wisp').shaken, true, 'the others are still shaken');
});

test('I AM DONE: only the player whose hero has the turn can say so; it shows once, and Next turn clears it', async () => {
  const t = await table(), ann = await t.join('Ann'), bo = await t.join('Bo'), st0 = await t.state();
  const thorne = charNamed(st0, 'Thorne'), wisp = charNamed(st0, 'Wisp');
  await ann.cmd({ type: 'claim', charId: thorne.id }); await bo.cmd({ type: 'claim', charId: wisp.id });
  assert.equal((await bo.cmd({ type: 'turnDone' })).status, 400, 'not Bo\'s turn');
  assert.equal((await t.gm.cmd({ type: 'turnDone' })).status, 400, 'the GM uses Next turn');
  const r = await ann.cmd({ type: 'turnDone' }); assert.equal(r.status, 200);
  assert.equal(r.body.state.table.done, true); assert.equal((await bo.get()).body.state.table.done, true, 'everyone sees it');
  await ann.cmd({ type: 'turnDone' }); const st = await t.state();
  assert.equal(st.log.filter((e) => /is done\. Over to the GM\./.test(e.text)).length, 1, 'said once');
  assert.equal(st.table.idx, 0, 'the turn has not moved: only the GM moves it');
  const st2 = (await t.gm.cmd({ type: 'endTurn', expect: { scene: st.table.scene.id, round: st.table.round, idx: st.table.idx } })).body.state;
  assert.equal(st2.table.done, false, 'the next turn starts fresh');
});

test('GOOD IDEA: the GM fills half of what is left of an Effort bar, once a card, and Undo puts it back', async () => {
  const t = await table(), ann = await t.join('Ann'), gate = find(await t.state(), 'The Sealed Gate');
  assert.equal((await ann.cmd({ type: 'goodIdea', id: gate.id })).status, 403, 'the GM\'s call');
  await t.gm.cmd({ type: 'track', id: gate.id, field: 'progress', d: 5 }).catch(() => {});
  const before = find(await t.state(), 'The Sealed Gate').progress, left = before.max - before.cur;
  const r = await t.gm.cmd({ type: 'goodIdea', id: gate.id }); assert.equal(r.status, 200);
  const after = find(r.body.state, 'The Sealed Gate').progress;
  assert.equal(after.cur, before.cur + Math.ceil(left / 2)); assert.equal(after.idea, true);
  assert.equal((await t.gm.cmd({ type: 'goodIdea', id: gate.id })).status, 400, 'once a card');
  const line = r.body.state.log.at(-1); assert.match(line.text, /A good idea: The Sealed Gate \+\d+ Effort/);
  const u = await t.gm.cmd({ type: 'undo', logId: line.id }); assert.equal(u.status, 200);
  const back = find(u.body.state, 'The Sealed Gate').progress; assert.equal(back.cur, before.cur); assert.ok(!back.idea, 'it can be used again after Undo');
});

test('SAMPLE: the sample heroes follow paths, so a new table shows the path button', async () => {
  const st = await (await table()).state();
  assert.deepEqual(['Thorne', 'Wisp', 'Brother Anselm Vey', 'Tilda the Ratcatcher'].map((n) => charNamed(st, n).path), ['Mercenary', 'Scholar', 'Priest', 'Hunter']);
});
