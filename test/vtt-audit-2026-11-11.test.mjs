// VTT audit, 11 November 2026: what a player is sent so the screen can say it before the roll.
// A hero shaken by the Horror (7) has a Hard next roll; the player and the GM must be able to see that, not only find it out from the result.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, charNamed } from './vtt-helpers.mjs';

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
