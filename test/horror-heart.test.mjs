// The Horror at the heart (the owner's decisions, 2026-11-09 playtest and 2026-11-11 review):
// past 21 each point costs 1 HP; each threshold fires once an adventure, until the GM starts a new one; 7 shakes every hero (their next roll is Hard),
// 14 gives every foe met from then on 2 more HP, 21 ends rest for the adventure; a party rest lowers the Horror by one d6, whatever the party's size.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';

const R = globalThis.SacramentRules;
const feed = (st) => st.log.map((e) => e.text).join(' | ');
const count = (st, re) => st.log.filter((e) => re.test(e.text)).length;
const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const set = (t, value) => t.gm.cmd({ type: 'horror', mode: 'set', value });

test('rules: 1 HP a point of blood, thresholds passed again in silence once fired, and one d6 for any rest', () => {
  assert.equal(R.HORROR.blood, 1); assert.equal(R.HORROR.bloodDie, undefined, 'the d4 is gone');
  assert.deepEqual(R.horrorMove(5, 10, [7]).crossed, [14], 'a fired threshold is not announced again');
  assert.deepEqual(R.horrorMove(5, 10).crossed, [7, 14]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(R.restDice), [1, 1, 1, 1, 1, 1]); assert.equal(R.REST.horrorDie, 6);
  assert.deepEqual(R.HORROR.dread, { shaken: 7, hunted: 14, arrived: 21, huntedHp: 2 });
  R.HORROR.thresholds.forEach((n) => assert.ok(R.HORROR.effects[n], 'threshold ' + n + ' says what it does'));
});

test('BLOOD: a push at 21 costs exactly 1 HP, with no die', async () => {
  const t = await table({ dice: [d20(2)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), ghoul = find(await t.state(), 'Pit Ghoul').id;
  await set(t, 21); const before = find(await t.state(), 'Thorne').hp.cur;
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul });
  const p = await ann.cmd({ type: 'push', rollId: r.body.state.rolls.at(-1).id }); assert.equal(p.status, 200);
  assert.equal(find(p.body.state, 'Thorne').hp.cur, before - 1);
  const line = p.body.state.log.find((e) => /pays in blood/.test(e.text)); assert.match(line.text, /^Thorne pays in blood: 1 HP \(now \d+\/\d+\)\.$/); assert.equal(line.dice, undefined);
});

test('ONCE AN ADVENTURE: 7 fires once; falling and climbing again is silent until the GM starts a new adventure', async () => {
  const t = await table();
  await set(t, 7); await set(t, 0); const st = (await set(t, 8)).body.state;
  assert.equal(count(st, /^The Horror stirs\./), 1, 'announced once'); assert.deepEqual(st.horror.fired, [7]);
  const na = await t.gm.cmd({ type: 'newAdventure' }); assert.equal(na.status, 200); assert.deepEqual(na.body.state.horror.fired, []);
  await set(t, 0); assert.equal(count((await set(t, 7)).body.state, /^The Horror stirs\./), 2, 'a new adventure fires it again');
  const ann = await t.join('Ann'); assert.equal((await ann.cmd({ type: 'newAdventure' })).status, 403, 'only the GM starts a new adventure');
});

test('SHAKEN at 7: every hero\'s next roll is Hard, and the roll after is not', async () => {
  const t = await table({ dice: [d20(10), d20(10), d20(10)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const st = (await set(t, 7)).body.state; assert.match(feed(st), /The Horror stirs\. Every hero is shaken: their next roll is Hard\./);
  const r1 = (await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' })).body.state.rolls.at(-1); assert.equal(r1.check.adj, 'hard');
  const r2 = (await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' })).body.state.rolls.at(-1); assert.equal(r2.check.adj, 'normal');
  const easy = (await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX', adj: 'easy' })).body.state.rolls.at(-1); assert.equal(easy.check.adj, 'easy');
});

test('HUNTED at 14: a foe met afterwards has 2 more HP; one already there does not', async () => {
  const t = await table(), ghoulBefore = find(await t.state(), 'Pit Ghoul').hp.max;
  await set(t, 14);
  const made = await t.gm.cmd({ type: 'cardCreate', card: { name: 'Grave Hound', kind: 'token', hp: { cur: 10, max: 10 } } });
  const st = made.body.state; assert.deepEqual(find(st, 'Grave Hound').hp, { cur: 12, max: 12 }); assert.equal(find(st, 'Pit Ghoul').hp.max, ghoulBefore);
  /* one prepared in another scene is met when that scene is shown */
  const sc = (await t.gm.cmd({ type: 'sceneCreate', name: 'The Byre' })).body.result.id;
  await t.gm.cmd({ type: 'cardCreate', card: { name: 'Byre Thing', kind: 'token', sceneId: sc, hp: { cur: 8, max: 8 } } });
  assert.equal(find(await t.state(), 'Byre Thing').hp.max, 8, 'not yet met');
  assert.equal(find((await t.gm.cmd({ type: 'sceneReveal', id: sc })).body.state, 'Byre Thing').hp.max, 10, 'met when shown');
  assert.equal(find((await t.gm.cmd({ type: 'sceneReveal', id: sc })).body.state, 'Byre Thing').hp.max, 10, 'only once');
});

test('ARRIVED at 21: no rest this adventure; a new adventure allows it again', async () => {
  const t = await table(); await set(t, 21);
  const r = await t.gm.cmd({ type: 'rest' }); assert.equal(r.status, 400); assert.match(JSON.stringify(r.body), /no more rest/i);
  await t.gm.cmd({ type: 'newAdventure' }); assert.equal((await t.gm.cmd({ type: 'rest' })).status, 200);
});

test('REST: one d6 off the Horror, whatever the size of the party', async () => {
  const t = await table({ dice: [die(4, 6)] }); await t.gm.cmd({ type: 'charCreate', char: { name: 'Third' } }); await t.gm.cmd({ type: 'charCreate', char: { name: 'Fourth' } });
  await set(t, 6); const r = await t.gm.cmd({ type: 'rest' }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 2); assert.match(feed(r.body.state), /Horror d6: 4\. The Horror falls by 4 \(now 2 of 21\)\./);
});

test('UNDO: taking back the rise that fired a threshold un-fires it, so it can fire again', async () => {
  const t = await table(), st = (await set(t, 7)).body.state, line = st.log.filter((e) => /raises the Horror/.test(e.text)).at(-1);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: line.id })).status, 200);
  const after = await t.state(); assert.deepEqual(after.horror.fired, []);
  assert.equal(count((await set(t, 7)).body.state, /^The Horror stirs\./), 2);
});
