// The numbers that rise off the dice at the table (the owner's ask, 2026-11-11, as in the solo game): each roll's line carries what it adds up to,
// the parts and the total, so every screen that is shown the dice is shown the same numbers. Display only: the parts add up to the rules' own total,
// and a monster whose numbers are hidden shows its tally to the GM only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const lastTally = (st) => st.log.filter((e) => e.tally).at(-1);
const adds = (t, first) => first + t.parts.reduce((a, p) => a + p.n, 0);
async function setup(dice) {
  const t = await table({ dice }), st = await t.state(), thorne = charNamed(st, 'Thorne'), ann = await t.join('Ann'), bo = await t.join('Bo');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  return { t, st, thorne, ann, bo };
}

test('a stat check and its Effort: every screen is sent the same parts and total, and they add up to the rules\' numbers', async () => {
  const { t, thorne, ann, bo } = await setup([d20(14)]);
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }); assert.equal(r.status, 200);
  const st = await t.state(), line = lastTally(st), roll = st.rolls.find((x) => x.id === r.body.result.rollId), [one] = line.tally;
  assert.equal(one.total, roll.check.total); assert.equal(adds(one, 14), roll.check.total, 'the parts and the die make the total');
  assert.equal(one.word, 'against Target ' + roll.check.target); assert.equal(one.good, roll.check.success);
  assert.ok(one.parts.every((p) => p.n !== 0 && p.t), 'no empty parts');
  if (thorne.stats.STR) assert.deepEqual(one.parts[0], { n: thorne.stats.STR, t: 'STR' });
  for (const who of [ann, bo]) assert.deepEqual(lastTally((await who.get()).body.state).tally, line.tally, 'players see the same numbers as the GM');
  const size = st.settings.dice.weapons; t.queue(die(3, size));
  assert.equal((await ann.cmd({ type: 'effort', rollId: r.body.result.rollId, cat: 'weapons' })).status, 200);
  const st2 = await t.state(), eff = st2.rolls.find((x) => x.id === r.body.result.rollId).effort, e = lastTally(st2).tally[0];
  assert.equal(e.total, eff.total); assert.equal(adds(e, 3), eff.total);
  for (const who of [ann, bo]) assert.deepEqual(lastTally((await who.get()).body.state).tally, lastTally(st2).tally);
});

test('a monster attack shows its attack bonus against the hero\'s Defence; hidden numbers keep it from the players', async () => {
  const { t, st, ann, bo } = await setup([d20(12), d20(17)]);
  const ghoul = find(st, 'Pit Ghoul'), hero = find(st, 'Thorne');
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 3 } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: hero.id })).status, 200);
  const s1 = await t.state(), roll = s1.rolls.at(-1), one = lastTally(s1).tally[0];
  assert.equal(one.total, roll.check.total); assert.equal(adds(one, 12), roll.check.total); assert.match(one.word, /^against Defence \d+$/);
  assert.equal(one.good, !roll.check.hit, 'a hit on a hero is shown as bad news');
  assert.deepEqual(lastTally((await bo.get()).body.state).tally, lastTally(s1).tally);
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { hideNumbers: true } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: hero.id })).status, 200);
  assert.equal((await t.state()).log.at(-1).tally[0].total, 17 + 3, 'the GM still sees it');
  for (const p of [ann, bo]) {
    const s2 = (await p.get()).body.state, line = s2.log.at(-1);
    assert.equal(line.tally, undefined, 'no tally for a player'); assert.ok(!JSON.stringify(s2.log).includes('"total":20'), 'the total is nowhere in the player\'s feed');
  }
});

test('a physical die: the result card still shows the tally, and hidden monsters stay hidden even with no dice', async () => {
  const { t, st, thorne, ann, bo } = await setup([]);
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', d20: 9 })).status, 200);
  const line = (await bo.get()).body.state.log.at(-1); assert.equal(line.dice, undefined); assert.equal(adds(line.tally[0], 9), line.tally[0].total);
  const ghoul = find(st, 'Pit Ghoul'), hero = find(st, 'Thorne');
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 3, hideNumbers: true } })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: hero.id, d20: 11 })).status, 200);
  for (const p of [ann, bo]) assert.equal((await p.get()).body.state.log.at(-1).tally, undefined);
});

test('GM dice: several dice show their total; one die needs none', async () => {
  const { t, bo } = await setup([die(2, 6), die(5, 6), die(4, 6)]);
  assert.equal((await t.gm.cmd({ type: 'gmDice', sides: 6, count: 2 })).status, 200);
  assert.deepEqual(lastTally((await bo.get()).body.state).tally, [{ parts: [], total: 7, word: 'total', good: true }]);
  assert.equal((await t.gm.cmd({ type: 'gmDice', sides: 6, count: 1 })).status, 200);
  assert.equal((await bo.get()).body.state.log.at(-1).tally, undefined);
});

test('solo and the table draw the numbers with the same shared file', async () => {
  const fs = await import('node:fs');
  const read = (f) => fs.readFileSync(new URL('../site/' + f, import.meta.url), 'utf8');
  for (const page of ['vtt/index.html', 'solo/index.html']) { assert.match(read(page), /tally\.js/); assert.match(read(page), /tally\.css/); }
  assert.doesNotMatch(read('solo/solo.css'), /\.tally-part\{/, 'the drawing lives in tally.css only');
  assert.doesNotMatch(read('solo/solo.js'), /tally-part/, 'and in tally.js only');
});
