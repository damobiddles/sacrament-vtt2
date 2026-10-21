// Pushing and natural 1s (the owner's rule, 2026-10-20): after a failed check a hero may push for a second action, which raises the Rising Horror by 1;
// a hero's d20 that shows a natural 1 raises it by 1 by itself. Monsters' rolls do not count.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, find, charNamed } from './vtt-helpers.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const feed = (st) => st.log.map((e) => e.text).join(' | ');
const roll = (who, ch, extra = {}) => who.cmd(Object.assign({ type: 'roll', charId: ch.id, stat: 'STR' }, extra));
const last = (r) => r.body.state.rolls.at(-1);
const push = (who, rollId) => who.cmd({ type: 'push', rollId });

/* Thorne (STR +3) against the sample's Target 12: a 2 fails, a 15 succeeds. Thorne is first in the turn order. */
async function setup(dice) { const t = await table({ dice }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'); return { t, ann, thorne }; }

test('PUSH: a natural 1 on a hero\'s d20 raises the Horror by 1, and the feed says so', async () => {
  const { ann, thorne } = await setup([d20(1)]);
  const r = await roll(ann, thorne); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 1); assert.deepEqual(r.body.result.horror, { cur: 1, applied: 1, crossed: [] });
  assert.match(feed(r.body.state), /Thorne rolled a natural 1\. The Horror rises 1 \(now 1\)\./);
});

test('PUSH: a natural 1 typed in from a physical die counts too; any other failure adds nothing by itself', async () => {
  const { ann, thorne } = await setup([d20(2)]);
  assert.equal((await roll(ann, thorne)).body.state.horror.cur, 0, 'a plain failure costs nothing');
  assert.equal((await roll(ann, thorne, { d20: 1 })).body.state.horror.cur, 1);
});

test('PUSH: a natural 1 on an item\'s check adds its own point beside the item\'s Horror', async () => {
  const { t, ann, thorne } = await setup([d20(1)]);
  await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'embers' } });
  const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0, spellId: 'emberpsalm' }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 2, '1 for the spell, 1 for the natural 1');
  assert.match(feed(r.body.state), /Thorne rolled a natural 1\. The Horror rises 1 \(now 1\)\..*The Horror rises 1 \(now 2\)/);
});

test('PUSH: a monster\'s natural 1 does not raise the Horror', async () => {
  const { t } = await setup([d20(1)]), st = await t.state();
  const r = await t.gm.cmd({ type: 'monsterAttack', cardId: find(st, 'Pit Ghoul').id, targetCardId: find(st, 'Thorne').id }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 0);
});

test('PUSH: after a failed check the hero is offered a push; it raises the Horror by 1 and their next roll is the second action', async () => {
  const { t, ann, thorne } = await setup([d20(2), d20(15)]);
  const r1 = await roll(ann, thorne); assert.equal(last(r1).canPush, true);
  const p = await push(ann, last(r1).id); assert.equal(p.status, 200);
  assert.equal(p.body.state.horror.cur, 1); assert.match(feed(p.body.state), /Thorne pushes for a second action\. The Horror rises 1 \(now 1\)\./);
  assert.equal(last(p).pushed, true); assert.equal(last(p).canPush, false, 'pushed once, no more');
  assert.equal((await push(ann, last(r1).id)).status, 400, 'a roll is pushed once');
  const r2 = await roll(ann, thorne); assert.equal(last(r2).fromPush, true); assert.equal(last(r2).check.success, true);
  assert.equal((await t.state()).horror.cur, 1);
});

test('PUSH: a success, someone else\'s roll, an older roll and a pushed second action cannot be pushed', async () => {
  const { t, ann, thorne } = await setup([d20(15), d20(2), d20(2), d20(2)]);
  const ok = await roll(ann, thorne); assert.equal(last(ok).canPush, undefined);
  assert.equal((await push(ann, last(ok).id)).status, 400, 'it succeeded');
  const f1 = await roll(ann, thorne), bob = await t.join('Bob');
  assert.equal((await push(bob, last(f1).id)).status, 403, 'not Bob\'s roll');
  const f2 = await roll(ann, thorne); assert.equal((await push(ann, last(f1).id)).status, 400, 'only the latest roll');
  assert.equal((await push(ann, last(f2).id)).status, 200);
  const f3 = await roll(ann, thorne); assert.equal(last(f3).fromPush, true); assert.equal(last(f3).canPush, false);
  assert.equal((await push(ann, last(f3).id)).status, 400, 'the second action cannot be pushed again');
  assert.equal((await t.state()).horror.cur, 1);
});

test('PUSH: on the hero\'s own turn a push is once a turn; the next turn brings a new one', async () => {
  const { t, ann, thorne } = await setup([d20(2), d20(2), d20(2), d20(2)]);
  const st = await t.state(); assert.equal(st.table.order[st.table.idx].id, thorne.cardId, 'Thorne\'s turn is running');
  const f1 = await roll(ann, thorne); assert.equal((await push(ann, last(f1).id)).status, 200);
  await roll(ann, thorne);   /* the second action, failed */
  const f3 = await roll(ann, thorne); assert.equal(last(f3).canPush, false, 'pushed once this turn already');
  const s2 = await t.state(); assert.equal((await t.gm.cmd({ type: 'nextRound', expect: { round: s2.table.round, idx: s2.table.idx } })).status, 200);
  const f4 = await roll(ann, thorne); assert.equal(last(f4).canPush, true, 'Thorne\'s turn again, in a new round');
});

test('PUSH: a player cannot take back a push\'s Horror; the GM can', async () => {
  const { t, ann, thorne } = await setup([d20(2)]);
  const f = await roll(ann, thorne), p = await push(ann, last(f).id);
  const line = p.body.state.log.find((e) => /pushes/.test(e.text));
  assert.equal(line.undoable, false);
  assert.equal((await ann.cmd({ type: 'undo', logId: line.id })).status, 403);
  const gmLine = (await t.state()).log.find((e) => /pushes/.test(e.text)); assert.equal(gmLine.undoable, true);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: gmLine.id })).body.state.horror.cur, 0);
});
