// A roll that was applied to a card the player can no longer see must still read as applied (never "not applied yet"), without naming the card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed } from './vtt-helpers.mjs';

test('after the players are moved to another scene, their applied roll is still applied, and the old card is not named', async () => {
  const t = await table(), ann = await t.join('Ann'), st0 = await t.state(), ch = charNamed(st0, 'Thorne'), ghoul = find(st0, 'Pit Ghoul');
  assert.equal((await ann.cmd({ type: 'claim', charId: ch.id })).status, 200);
  const roll = await ann.cmd({ type: 'roll', charId: ch.id, stat: 'STR', d20: 20, targetCardId: ghoul.id }); assert.equal(roll.status, 200); const rid = roll.body.result.rollId;
  assert.equal((await ann.cmd({ type: 'effort', rollId: rid, cat: 'weapons', rolled: 4 })).status, 200);
  assert.equal((await ann.cmd({ type: 'apply', rollId: rid, cardId: ghoul.id, field: 'hp' })).status, 200);
  const before = (await ann.get()).body.state.rolls.find((r) => r.id === rid); assert.equal(before.applied.cardId, ghoul.id, 'while the ghoul is in view the roll names it');
  const sc = (await t.gm.cmd({ type: 'sceneCreate', name: 'Elsewhere' })).body.result.id; assert.equal((await t.gm.cmd({ type: 'sceneReveal', id: sc })).status, 200);
  const res = (await ann.get()).body, after = res.state.rolls.find((r) => r.id === rid);
  assert.ok(after.applied, 'still applied'); assert.equal(after.applied.cardId, null, 'but not to a card she can see'); assert.ok(!res.state.cards[ghoul.id], 'the ghoul is not in her view');
  for (const k of ['rolls', 'cards', 'table', 'chars']) assert.ok(!JSON.stringify(res.state[k]).includes('Pit Ghoul'), k + ' does not name the card (her own earlier activity line, which she saw at the time, is history and unchanged)');
});
