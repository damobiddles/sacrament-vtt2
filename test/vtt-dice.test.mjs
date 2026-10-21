// Dice on screen: each roll's line in the activity feed carries the dice the server rolled, so every screen that reads the line can show them landing on the same number.
// A die typed in from a physical die carries none, and a monster whose numbers are hidden shows its dice to the GM only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const lastDice = (st) => st.log.filter((e) => e.dice).at(-1);
async function setup(dice) {
  const t = await table({ dice }), st = await t.state(), thorne = charNamed(st, 'Thorne'), ann = await t.join('Ann'), bo = await t.join('Bo');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  return { t, st, thorne, ann, bo };
}

test('a stat check and its Effort: the GM, the roller and another player are all sent the same dice', async () => {
  const { t, thorne, ann, bo } = await setup([d20(14)]);
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }); assert.equal(r.status, 200);
  for (const who of [t.gm, ann, bo]) assert.deepEqual(lastDice((await who.get()).body.state).dice, [{ die: 20, n: 14 }]);
  const size = (await t.state()).settings.dice.weapons;
  t.queue(die(3, size));
  assert.equal((await ann.cmd({ type: 'effort', rollId: r.body.result.rollId, cat: 'weapons' })).status, 200);
  for (const who of [t.gm, ann, bo]) assert.deepEqual(lastDice((await who.get()).body.state).dice, [{ die: size, n: 3 }]);
  const mine = lastDice((await ann.get()).body.state), theirs = lastDice((await bo.get()).body.state);
  assert.equal(mine.mine, true, 'the roller is told it is theirs (their result waits for the dice)'); assert.equal(theirs.mine, false);
});

test('a physical die carries no dice to show', async () => {
  const { thorne, ann } = await setup([]);
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', d20: 9 })).status, 200);
  const st = (await ann.get()).body.state; assert.ok(st.log.at(-1).text.includes('[physical die]')); assert.equal(st.log.at(-1).dice, undefined);
});

test('a monster with hidden numbers: the GM sees its die, players do not (their line says only hit or miss)', async () => {
  const { t, st, ann, bo } = await setup([d20(17), d20(12)]);
  const ghoul = find(st, 'Pit Ghoul'), hero = find(st, 'Thorne');
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 3, hideNumbers: true } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: hero.id })).status, 200);
  assert.deepEqual(lastDice(await t.state()).dice, [{ die: 20, n: 17 }]);
  for (const p of [ann, bo]) {
    const s2 = (await p.get()).body.state, line = s2.log.at(-1);
    assert.match(line.text, /attacks .*: (hit|miss)\.$/); assert.equal(line.dice, undefined, 'no die for a player');
    assert.ok(!JSON.stringify(s2.log).includes('"n":17'), 'the number is nowhere in the player\'s feed');
  }
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { hideNumbers: false } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: hero.id })).status, 200);
  assert.deepEqual(lastDice((await bo.get()).body.state).dice, [{ die: 20, n: 12 }], 'numbers shown: players see the die too');
});

test('a roll against a hidden card, and a loot roll, stay with the GM: no player is sent their dice', async () => {
  const { t, st, thorne, ann, bo } = await setup([d20(8), 0.365]);
  const ghoul = find(st, 'Pit Ghoul');
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { visible: false } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'lootRoll' })).status, 200);
  const gmDice = (await t.state()).log.filter((e) => e.dice).map((e) => e.dice[0].die);
  assert.deepEqual(gmDice.slice(-2), [20, 100]);
  for (const p of [ann, bo]) assert.equal((await p.get()).body.state.log.filter((e) => e.dice).length, 0);
});
