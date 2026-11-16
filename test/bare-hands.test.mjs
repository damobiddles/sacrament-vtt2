// Attack without an item (the owner's decision, 2026-11-16): bare hands or wits are Basic d4, as the Rules page says and as solo already plays it.
// At the table the player was offered Weapons, Guns and Magic dice for the damage too.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

test('TABLE: an attack without an item rolls Basic d4 damage, whatever kind the page asks for', async () => {
  const t = await table({ dice: [d20(15), die(3, 4)] }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  const ghoul = find(await t.state(), 'Pit Ghoul').id;
  const hit = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul }); assert.equal(hit.status, 200);
  const roll = hit.body.state.rolls.at(-1); assert.equal(roll.check.success, true); assert.equal(roll.cat, 'basic', 'the page is told the die before the damage step');
  const dmg = await ann.cmd({ type: 'effort', rollId: roll.id, cat: 'magic' }); assert.equal(dmg.status, 200);
  const e = dmg.body.state.rolls.find((r) => r.id === roll.id).effort;
  assert.equal(e.cat, 'basic'); assert.equal(e.die, 4);
});
