// What the table tells people as they play (the 2026-10-21 UX pass): gifts, turns, arrivals, damage named as damage, and the sample heroes' gear.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';

const SC = globalThis.SacramentSheetCore;
const texts = (st) => st.log.map((e) => e.text);
const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };

test('GIFT: an item the GM puts on a hero\'s sheet (the d100 roll\'s "Give it to this hero") is told to that hero\'s player, and to nobody else', async () => {
  const t = await table(), ann = await t.join('Ann'), bo = await t.join('Bo'), thorne = await claim(t, ann, 'Thorne'); await claim(t, bo, 'Wisp');
  assert.equal((await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'astrolabe' } })).status, 200);
  const name = SC.item('astrolabe').name;
  assert.ok(texts((await ann.get()).body.state).includes('The GM gives you ' + name + '.'), 'the player is told');
  assert.ok(texts(await t.state()).includes('The GM gives ' + name + ' to Thorne.'), 'the GM reads who got it');
  assert.ok(!texts((await bo.get()).body.state).some((x) => x.includes(name)), 'another player is not told');
});

test('GIFT: a player adding to their own sheet writes nothing in the feed', async () => {
  const t = await table(), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const before = (await t.state()).log.length;
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'hatchet' } })).status, 200);
  assert.equal((await t.state()).log.length, before);
});

test('TURN: End turn says who finished and who is next', async () => {
  const t = await table(), ann = await t.join('Ann'); await claim(t, ann, 'Thorne');
  const st = await t.state();
  assert.equal((await ann.cmd({ type: 'endTurn', expect: { round: st.table.round, idx: st.table.idx } })).status, 200);
  assert.equal(texts((await ann.get()).body.state).at(-1), 'Thorne ends their turn. Wisp’s turn.');
});

test('TURN: a hidden card that ends its turn is not named to players; the GM reads both names', async () => {
  const t = await table(), ann = await t.join('Ann'); let st = await t.state();
  const ghoul = find(st, 'Pit Ghoul'), at = st.table.order.findIndex((e) => e.id === ghoul.id);
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { visible: false } }); await t.gm.cmd({ type: 'turnSet', idx: at });
  st = await t.state();
  assert.equal((await t.gm.cmd({ type: 'endTurn', expect: { round: st.table.round, idx: st.table.idx } })).status, 200);
  const pl = texts((await ann.get()).body.state).at(-1), gm = texts(await t.state()).at(-1);
  assert.doesNotMatch(pl, /Pit Ghoul/); assert.match(pl, /^Round 2\. Thorne’s turn\.$/);
  assert.equal(gm, 'Pit Ghoul ends their turn. Round 2. Thorne’s turn.');
});

test('JOIN: the GM\'s feed says when someone arrives, once, even if their join is sent again', async () => {
  const t = await table(), key = 'joinkey-abcdefgh';
  const j1 = await t.svc.handle({ method: 'POST', body: { op: 'join', code: t.code, name: 'Kit', joinKey: key } }); assert.equal(j1.status, 200);
  const j2 = await t.svc.handle({ method: 'POST', body: { op: 'join', code: t.code, name: 'Kit', joinKey: key } }); assert.equal(j2.status, 200);
  const lines = (await t.state()).log.filter((e) => e.text === 'Joined the table.');
  assert.equal(lines.length, 1); assert.equal(lines[0].who, 'Kit');
});

test('JOIN: a wrong code says what to do', async () => {
  const t = await table();
  const r = await t.svc.handle({ method: 'POST', body: { op: 'join', code: 'ZZZZZZ', name: 'Kit' } });
  assert.equal(r.status, 404); assert.equal(r.body.error.message, 'No table has that code. Check it with your GM.');
});

test('CLAIM: taking up a hero reads "Ann: Now playing Thorne."', async () => {
  const t = await table(), ann = await t.join('Ann'); await claim(t, ann, 'Thorne');
  const e = (await t.state()).log.at(-1); assert.equal(e.who, 'Ann'); assert.equal(e.text, 'Now playing Thorne.');
});

test('WORDS: what comes off HP is called damage; what fills an Effort bar is still Effort', async () => {
  const t = await table({ dice: [d20(15), die(4, 6), d20(15), die(4, 6), d20(15), die(3, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const st = await t.state(), ghoul = find(st, 'Pit Ghoul'), gate = find(st, 'The Sealed Gate');
  const hit = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id }); assert.equal(hit.status, 200);
  await ann.cmd({ type: 'effort', rollId: hit.body.state.rolls.at(-1).id, cat: 'weapons' });
  assert.match(texts(await t.state()).at(-1), /= 7 damage\.$/);
  const push = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id }); assert.equal(push.status, 200);
  await ann.cmd({ type: 'effort', rollId: push.body.state.rolls.at(-1).id, cat: 'weapons' });
  assert.match(texts(await t.state()).at(-1), /= 7 Effort\.$/);
  const a = await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: find(st, 'Thorne').id }); assert.equal(a.status, 200);
  await t.gm.cmd({ type: 'monsterEffort', rollId: a.body.state.rolls.at(-1).id, cat: 'weapons' });
  assert.ok(texts(await t.state()).some((x) => /^Pit Ghoul · d6 3 = 3 damage\.$/.test(x)), texts(await t.state()).join(' | '));
});

test('SAMPLE: each sample hero carries what their description names, ready to use', async () => {
  const t = await table({ gear: true }), st = await t.state();
  const has = (name) => charNamed(st, name).gear.map((g) => g.id);
  assert.deepEqual(has('Thorne'), ['hatchet']); assert.deepEqual(has('Wisp'), ['embers', 'chalk']);
  assert.deepEqual(has('Brother Anselm Vey'), ['cudgel', 'beads']); assert.deepEqual(has('Tilda the Ratcatcher'), ['knife', 'sling']);
  for (const ch of Object.values(st.chars)) {
    assert.deepEqual(SC.problems(ch, { gm: true }), [], ch.name + ' fits the build rules');
    assert.ok(SC.actions(ch).some((x) => x.ok), ch.name + ' has something to use');
  }
});
