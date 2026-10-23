// The Rising Horror at the table: one shared meter that spells and items raise as they are used, thresholds that tell the GM, the arrival at 21,
// and the GM's own hand on it (adjust, reset, undo). Players can see it but never move it themselves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, charNamed } from './vtt-helpers.mjs';
import { emptyState, apply, project } from '../netlify/functions/_shared/vtt-core.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const give = (t, ch, id) => t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id } });
const feed = (st) => st.log.map((e) => e.text).join(' | ');
const spellIn = (st, ch, book) => charNamed(st, ch).gear.findIndex((g) => g.id === book);

async function setup(dice, gear = ['embers']) {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  for (const id of gear) await give(t, thorne, id);
  return { t, ann, thorne };
}
const cast = (who, ch, index, spellId, extra = {}) => who.cmd(Object.assign({ type: 'useItem', charId: ch.id, index, spellId }, extra));

test('HORROR: a table starts at 0 of 21, and everyone sees the same meter', async () => {
  const t = await table(), ann = await t.join('Ann');
  const gmView = await t.state(), annView = (await ann.get()).body.state;
  assert.deepEqual([gmView.horror.cur, gmView.horror.max, gmView.horror.thresholds], [0, 21, [7, 14, 21]]);
  assert.deepEqual([annView.horror.cur, annView.horror.max], [0, 21]);
  assert.equal(gmView.horror.alert, 0); assert.equal(annView.horror.alert, undefined, 'only the GM is told of a threshold to deal with');
});

test('HORROR: a spell with an Effort die raises the meter by its amount when cast, and the feed says so', async () => {
  const { ann, thorne } = await setup([d20(20), die(5, 10)]);
  const r = await cast(ann, thorne, 0, 'ember'); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 1); assert.deepEqual(r.body.result.horror, { cur: 1, applied: 1, crossed: [] });
  assert.match(feed(r.body.state), /Thorne read from The Ashen Psalter\. The Horror rises 1 \(now 1\)\./);
  assert.equal((await ann.get()).body.state.horror.cur, 1, 'the player who cast it sees it');
});

test('HORROR: a failed check still raises it (using it is what tempts the Horror)', async () => {
  const { ann, thorne } = await setup([d20(2)]);   /* not a 1: a natural 1 adds its own point (see vtt-push.test.mjs) */
  const r = await cast(ann, thorne, 0, 'ember'); assert.equal(r.status, 200);
  assert.equal(r.body.state.rolls.at(-1).check.success, false); assert.equal(r.body.state.horror.cur, 1);
});

test('HORROR: a spell with no Effort die and no stat is cast without a roll, and still raises it', async () => {
  const { t, ann, thorne } = await setup([], ['lastconfessions']);
  const r = await cast(ann, thorne, 0, 'waxmouth'); assert.equal(r.status, 200);
  assert.equal(r.body.result.rollId, null); assert.equal((await t.state()).rolls.length, 0, 'nothing was rolled');
  assert.match(feed(r.body.state), /Thorne uses Mouth of Wax \(The Book of Last Confessions\) \(no roll\)\. It tempts the Horror\./);
  assert.match(feed(r.body.state), /The Horror rises 3 \(now 3\)/);
});

test('HORROR: a rolled amount is rolled at the moment of use and shown in the feed', async () => {
  const { ann, thorne } = await setup([d20(20), die(3, 4)], ['cinderlectionary']);
  const r = await cast(ann, thorne, 0, 'pyre'); assert.equal(r.status, 200);
  assert.equal(r.body.state.rolls.at(-1).cat, 'ultimate'); assert.equal(r.body.state.rolls.at(-1).effort, null, 'the damage is the player\'s to roll, as its own step');
  assert.equal(r.body.state.horror.cur, 5); assert.match(feed(r.body.state), /The Horror rises 5 \(d4\+2: 3 \+ 2\) \(now 5\)\./);
});

test('HORROR: an item from the loot table raises it by its own amount', async () => {
  const { ann, thorne } = await setup([d20(20), die(4, 12)], ['sealshard']);
  const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 3); assert.match(feed(r.body.state), /Thorne used Shard of a binding seal\. The Horror rises 3 \(now 3\)\./);
});

test('HORROR: something that tempts nothing leaves the meter alone, and so does an amount the table cannot read', async () => {
  const { t, ann, thorne } = await setup([d20(20), die(4, 6)], ['sword']);
  const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 0); assert.doesNotMatch(feed(r.body.state), /Horror rises/);
  /* a designed item that tempts the Horror with an amount of 0 */
  await t.gm.cmd({ type: 'lootGive', charId: thorne.id, item: { name: 'Hollow reed', category: 'Curio', temptsHorror: true, horror: 0, cat: 'magic', roll: 'WIS' } });
  t.queue(d20(20), die(3, 10));
  const r2 = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 1 }); assert.equal(r2.status, 200);
  assert.equal(r2.body.state.horror.cur, 0, 'an amount of 0 does nothing'); assert.doesNotMatch(feed(r2.body.state), /Horror rises/);
});

test('HORROR: each threshold is announced to everyone and alerts the GM, who can mark it dealt with', async () => {
  const { t, ann, thorne } = await setup([], ['dust']);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 6 });
  const r = await cast(ann, thorne, 0, 'hush'); assert.equal(r.status, 200); assert.deepEqual(r.body.result.horror.crossed, [7]);
  const annView = (await ann.get()).body.state; assert.match(feed(annView), /The Horror stirs\./); assert.equal(annView.log.find((e) => /stirs/.test(e.text)).kind, 'alert');
  assert.equal((await t.state()).horror.alert, 7);
  assert.equal((await ann.cmd({ type: 'horrorAck' })).status, 403, 'a player cannot dismiss the GM\'s alert');
  assert.equal((await t.gm.cmd({ type: 'horrorAck' })).status, 200); assert.equal((await t.state()).horror.alert, 0);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 13 }); await cast(ann, thorne, 0, 'hush');
  const st = await t.state(); assert.match(feed(st), /The Horror draws near\./); assert.equal(st.horror.alert, 14);
});

test('HORROR: passing two thresholds at once announces both', async () => {
  const t = await table();
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 5 });
  const r = await t.gm.cmd({ type: 'horror', mode: 'delta', value: 10 }); assert.deepEqual(r.body.result.crossed, [7, 14]);
  const text = feed(await t.state()); assert.ok(text.indexOf('The Horror stirs.') < text.indexOf('The Horror draws near.'), 'in order, lowest first');
  assert.equal((await t.state()).horror.alert, 14);
});

test('HORROR: at 21 it has arrived; it stays at 21, a further rise adds nothing, and only the GM resets it', async () => {
  const { t, ann, thorne } = await setup([d20(20), die(4, 4)], ['cinderlectionary', 'embers']);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 19 });
  const r = await cast(ann, thorne, 0, 'pyre'); assert.equal(r.body.state.horror.cur, 21); assert.deepEqual(r.body.result.horror.crossed, [21]);
  assert.match(feed(r.body.state), /The Horror rises 2 of 6 \(d4\+2: 4 \+ 2\) \(now 21\)\./); assert.match(feed(r.body.state), /The Horror has arrived\./);
  assert.equal((await ann.get()).body.state.horror.cur, 21, 'the player sees it has arrived');
  const again = await cast(ann, thorne, 1, 'kindle'); assert.equal(again.body.state.horror.cur, 21); assert.match(feed(again.body.state), /The Horror can rise no further \(21\)\./);
  assert.equal((await ann.cmd({ type: 'horror', mode: 'set', value: 0 })).status, 403);
  const reset = await t.gm.cmd({ type: 'horror', mode: 'set', value: 0 }); assert.equal(reset.status, 200); assert.equal(reset.body.state.horror.cur, 0);
  assert.equal(reset.body.state.horror.alert, 0, 'below the threshold, nothing is left to deal with'); assert.match(feed(reset.body.state), /The GM lowers the Horror by 21 \(now 0\)\./);
});

test('HORROR: the GM adjusts it by hand and can undo a rise; a player can do neither, not even for their own spell', async () => {
  const { t, ann, thorne } = await setup([], ['lastconfessions']);
  const up = await t.gm.cmd({ type: 'horror', mode: 'delta', value: 2 }); assert.equal(up.body.state.horror.cur, 2); assert.match(feed(up.body.state), /The GM raises the Horror by 2 \(now 2\)\./);
  const down = await t.gm.cmd({ type: 'horror', mode: 'delta', value: -5 }); assert.equal(down.body.state.horror.cur, 0, 'never below 0');
  assert.equal((await t.gm.cmd({ type: 'horror', mode: 'delta', value: 'lots' })).status, 400);
  assert.equal((await ann.cmd({ type: 'horror', mode: 'delta', value: 3 })).status, 403, 'a player cannot raise it by hand');
  assert.equal((await ann.cmd({ type: 'horror', mode: 'set', value: 0 })).status, 403, 'nor lower it');
  await cast(ann, thorne, 0, 'confession');
  const annView = (await ann.get()).body.state, line = annView.log.find((e) => /rises 3/.test(e.text));
  assert.equal(line.undoable, false, 'the player is not offered an Undo for the Horror');
  assert.equal((await ann.cmd({ type: 'undo', logId: line.id })).status, 403, 'and cannot send one');
  const gmLine = (await t.state()).log.find((e) => e.id === line.id); assert.equal(gmLine.undoable, true, 'the GM is offered it');
  const u = await t.gm.cmd({ type: 'undo', logId: line.id }); assert.equal(u.status, 200); assert.equal(u.body.state.horror.cur, 0);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: line.id })).status, 409, 'once');
});

test('HORROR: the GM lowers it by a d6 the server rolls; everyone sees the die and the line, the GM can undo it, a player cannot send it', async () => {
  const t = await table({ dice: [die(4, 6)] }), ann = await t.join('Ann');
  assert.equal((await t.gm.cmd({ type: 'horror', mode: 'lowerRoll' })).status, 400, 'nothing to lower at 0');
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 9 });
  assert.equal((await ann.cmd({ type: 'horror', mode: 'lowerRoll' })).status, 403, 'a player cannot');
  const r = await t.gm.cmd({ type: 'horror', mode: 'lowerRoll' }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 5); assert.deepEqual([r.body.result.rolled, r.body.result.applied], [4, -4]);
  const annLine = (await ann.get()).body.state.log.at(-1);
  assert.equal(annLine.text, 'Horror d6: 4. The GM lowers the Horror by 4 (now 5).');
  assert.deepEqual(annLine.dice, [{ die: 6, n: 4 }], 'the players see the die land');
  const u = await t.gm.cmd({ type: 'undo', logId: annLine.id }); assert.equal(u.status, 200); assert.equal(u.body.state.horror.cur, 9);
  /* a roll bigger than what is left stops at 0, and says so */
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 2 }); t.queue(die(6, 6));
  const low = await t.gm.cmd({ type: 'horror', mode: 'lowerRoll' }); assert.equal(low.body.state.horror.cur, 0);
  assert.match(feed(low.body.state), /Horror d6: 6\. The GM lowers the Horror by 2 of 6 \(now 0\)\./);
});

test('HORROR: undoing the rise that passed a threshold clears the GM\'s alert', async () => {
  const t = await table();
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 6 }); await t.gm.cmd({ type: 'horror', mode: 'delta', value: 2 });
  const st = await t.state(); assert.equal(st.horror.alert, 7);
  const line = st.log.find((e) => /raises the Horror by 2/.test(e.text));
  const u = await t.gm.cmd({ type: 'undo', logId: line.id }); assert.equal(u.body.state.horror.cur, 6); assert.equal(u.body.state.horror.alert, 0);
});

test('HORROR: the grimoire with no title rolls d6 and the reader casts the spell that comes up, with its own Horror', async () => {
  const { ann, thorne } = await setup([die(5, 6)], ['untitled']);
  const r = await cast(ann, thorne, 0, 'realname'); assert.equal(r.status, 200, 'a spell asked for is ignored: the die chooses');
  assert.deepEqual(r.body.result.picked, { n: 5, spellId: 'doorinward', name: 'The Door Inward' });
  assert.match(feed(r.body.state), /Thorne reads Grimoire with no title: d6 shows 5, The Door Inward\./);
  assert.match(feed(r.body.state), /Thorne read from Grimoire with no title\. The Horror rises 2 \(now 2\)\./);
  const { ann: a2, thorne: t2 } = await setup([die(5, 6)], ['thresholdlectionary']);
  const r2 = await cast(a2, t2, 0, 'realname'); assert.equal(r2.status, 200);
  assert.match(feed(r2.body.state), /The Horror rises 5 \(d6: 5\) \(now 5\)\./, 'its own rolled amount');
  const { ann: a3, thorne: t3 } = await setup([die(1, 6)], ['untitled']);
  assert.equal((await cast(a3, t3, 0)).body.result.picked.name, 'The Page That Watches');
});

test('HORROR: a command sent twice raises it once', async () => {
  const { t, ann, thorne } = await setup([], ['dust']);
  const cmd = { type: 'useItem', charId: thorne.id, index: 0, spellId: 'stealword' };
  assert.equal((await ann.cmd(cmd, { client: 'horrorclient1g', n: 1 })).status, 200);
  assert.equal((await ann.cmd(cmd, { client: 'horrorclient1g', n: 1 })).body.result.duplicate, true);
  assert.equal((await t.state()).horror.cur, 2);
  const g = { type: 'horror', mode: 'delta', value: 4 };
  await t.gm.cmd(g, { client: 'horrorgm00001g', n: 1 }); await t.gm.cmd(g, { client: 'horrorgm00001g', n: 1 });
  assert.equal((await t.state()).horror.cur, 6);
});

test('HORROR: a table saved before the meter existed starts it at 0 on first use', () => {
  const s = emptyState('ABCD', 1, 'secret'); delete s.horror;
  const gm = { role: 'gm' };
  assert.equal(project(s, gm).horror.cur, 0);
  apply(s, { type: 'horror', mode: 'delta', value: 3, actionId: 'oldtable01.1' }, gm, { rng: () => 0.5, now: 2 });
  assert.equal(s.horror.cur, 3);
});

test('HORROR: a spell the hero holds but cannot use now (book not equipped) raises nothing', async () => {
  const { t, ann, thorne } = await setup([], ['dust']);
  await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'move', index: spellIn(await t.state(), 'Thorne', 'dust'), eq: false } });
  const r = await cast(ann, thorne, 0, 'hush'); assert.equal(r.status, 400); assert.match(r.body.error.message, /Equip/);
  assert.equal((await t.state()).horror.cur, 0);
});
