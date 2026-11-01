// Paying in blood (the owner's rule, 2026-11-01): once the Horror is full at 21, each point of a hero's Horror cost that cannot go on the meter
// (a push, a natural 1 that counts, a spell or item) costs that hero a d4 of HP instead, on its own line that only the GM can undo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const feed = (st) => st.log.map((e) => e.text).join(' | ');
const hp = (st) => find(st, 'Thorne').hp.cur;
async function setup(dice, horror = 21) {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'horror', mode: 'set', value: horror })).status, 200);
  return { t, ann, thorne, ghoul: find(await t.state(), 'Pit Ghoul').id };
}
const attack = (ann, thorne, ghoul, extra = {}) => ann.cmd(Object.assign({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul }, extra));
const last = (r) => r.body.state.rolls.at(-1);

test('BLOOD: a push at 21 costs the hero a d4 of HP, says so, and only the GM can undo it', async () => {
  const { t, ann, thorne, ghoul } = await setup([d20(2), die(3, 4)]);
  const before = hp(await t.state()), r = await attack(ann, thorne, ghoul);
  const p = await ann.cmd({ type: 'push', rollId: last(r).id }); assert.equal(p.status, 200);
  assert.equal(p.body.state.horror.cur, 21); assert.equal(hp(p.body.state), before - 3);
  assert.match(feed(p.body.state), /Thorne pays in blood: 1d4 shows 3, 3 HP \(now \d+\/\d+\)\./);
  const line = p.body.state.log.find((e) => e.text.includes('pays in blood')); assert.equal(line.undoable, false, 'the player cannot undo it');
  assert.equal((await ann.cmd({ type: 'undo', logId: line.id })).status, 403);
  const gmLine = (await t.state()).log.find((e) => e.text.includes('pays in blood'));
  assert.equal(hp((await t.gm.cmd({ type: 'undo', logId: gmLine.id })).body.state), before);
});

test('BLOOD: below 21 nothing is paid, and the meter takes the point as before', async () => {
  const { t, ann, thorne, ghoul } = await setup([d20(2)], 20);
  const before = hp(await t.state()), r = await attack(ann, thorne, ghoul);
  const p = await ann.cmd({ type: 'push', rollId: last(r).id });
  assert.equal(p.body.state.horror.cur, 21); assert.equal(hp(p.body.state), before); assert.doesNotMatch(feed(p.body.state), /pays in blood/);
});

test('BLOOD: a spell at 21 costs blood for its Horror, and its natural 1 adds a second d4 on its own line', async () => {
  const { t, ann, thorne } = await setup([d20(1), die(2, 4), die(4, 4)]);
  await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'embers' } });
  const before = hp(await t.state()), r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0, spellId: 'ember' }); assert.equal(r.status, 200);
  assert.equal(hp(r.body.state), before - 6); assert.equal((feed(r.body.state).match(/pays in blood/g) || []).length, 2);
});

test('BLOOD: a plain check\'s natural 1 at 21 costs nothing, since it adds no Horror', async () => {
  const { t, ann, thorne } = await setup([d20(1)]);
  const before = hp(await t.state()), r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' });
  assert.equal(hp(r.body.state), before); assert.doesNotMatch(feed(r.body.state), /pays in blood/);
});
