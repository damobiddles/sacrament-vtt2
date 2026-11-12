// Also: last words for a hero who has died (graves and bequests, rules.js BEQUEST).
// The Stranger (an optional rule, the owner's go-ahead 2026-11-11; rules.js STRANGER): the GM deals the slips, the table picks one player with a hero in secret
// and rolls their want. Who it is and what they want reaches only that player and the GM; the others read only that they are themselves. Once an adventure the
// table names a hero: right, the Horror falls by one d6; wrong, it rises by 2. A new adventure clears it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { table, die, charNamed } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';

const R = globalThis.SacramentRules;
const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
async function three(dice) {
  const t = await table({ dice }), ann = await t.join('Ann'), bo = await t.join('Bo'), cy = await t.join('Cy');
  await claim(t, ann, 'Thorne'); await claim(t, bo, 'Wisp'); await claim(t, cy, 'Tilda the Ratcatcher');
  return { t, ann, bo, cy };
}

test('rules: the Stranger has six wants, and the Rules page says each of them', () => {
  assert.equal(R.STRANGER.wants.length, 6); assert.equal(R.STRANGER.at, 14); assert.equal(R.STRANGER.wrong, 2); assert.equal(R.STRANGER.rightDie, 6);
  const page = readFileSync(new URL('../content/landing/rules.md', import.meta.url), 'utf8');
  R.STRANGER.wants.forEach((w) => assert.ok(page.includes(w), 'the Rules page has: ' + w));
});

test('STRANGER: only the chosen player and the GM ever learn who it is and what they want', async () => {
  /* dice: the seat (d3 → 2: the second player with a hero), then the want (d6 → 3) */
  const { t, ann, bo, cy } = await three([die(2, 3), die(3, 6)]);
  const r = await t.gm.cmd({ type: 'stranger', op: 'deal' }); assert.equal(r.status, 200);
  const want = R.STRANGER.wants[2];
  const gm = await t.state(); assert.equal(gm.stranger.want, want); assert.equal(gm.stranger.name, 'Wisp');
  const raw = async (p) => JSON.stringify((await p.get()).body);
  const [a, b, c] = [await raw(ann), await raw(bo), await raw(cy)];
  assert.ok(b.includes(want) && b.includes('you are the Stranger'), 'the Stranger reads their slip and want');
  for (const other of [a, c]) {
    assert.ok(!other.includes(want), 'no other player can read the want'); assert.ok(!/you are the Stranger|The Stranger is/.test(other), 'nor who it is');
    assert.ok(other.includes('you are yourself'));
  }
  assert.equal((await t.gm.cmd({ type: 'stranger', op: 'deal' })).status, 409, 'dealt once an adventure');
  assert.equal((await ann.cmd({ type: 'stranger', op: 'deal' })).status, 403, 'only the GM deals');
});

test('NAMING: right lowers the Horror by one d6; wrong raises it by 2; once an adventure; a new adventure clears it', async () => {
  let { t } = await three([die(1, 3), die(1, 6), die(4, 6)]);
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 14 }); await t.gm.cmd({ type: 'stranger', op: 'deal' });
  let st = await t.state(); const who = st.stranger.charId;
  const right = await t.gm.cmd({ type: 'stranger', op: 'name', charId: who }); assert.equal(right.status, 200); assert.equal(right.body.result.right, true);
  assert.equal(right.body.state.horror.cur, 10, 'down by the d6 (4)');
  assert.equal((await t.gm.cmd({ type: 'stranger', op: 'name', charId: who })).status, 409, 'once an adventure');
  assert.equal((await t.gm.cmd({ type: 'newAdventure' })).status, 200); assert.equal((await t.state()).stranger, undefined, 'a new adventure clears it');

  ({ t } = await three([die(1, 3), die(1, 6)]));
  await t.gm.cmd({ type: 'horror', mode: 'set', value: 14 }); await t.gm.cmd({ type: 'stranger', op: 'deal' });
  st = await t.state(); const wrong = Object.values(st.chars).find((ch) => ch.owner && ch.id !== st.stranger.charId);
  const w = await t.gm.cmd({ type: 'stranger', op: 'name', charId: wrong.id }); assert.equal(w.body.result.right, false); assert.equal(w.body.state.horror.cur, 16, 'up by 2');
});

test('the Stranger needs three players with heroes', async () => {
  const t = await table(), ann = await t.join('Ann'); await claim(t, ann, 'Thorne');
  const r = await t.gm.cmd({ type: 'stranger', op: 'deal' }); assert.equal(r.status, 400); assert.match(r.body.error.message || JSON.stringify(r.body), /at least 3 players/);
});

test('LAST WORDS: the player of a hero who has died says them once, for the whole table', async () => {
  const t = await table(), ann = await t.join('Ann'), bo = await t.join('Bo'), thorne = await claim(t, ann, 'Thorne');
  const card = (await t.state()).chars[thorne.id].cardId;
  assert.equal((await ann.cmd({ type: 'lastWords', charId: thorne.id, text: 'Not yet.' })).status, 400, 'only once they have died');
  assert.equal((await t.gm.cmd({ type: 'track', id: card, field: 'hp', mode: 'set', value: 0 })).status, 200);
  for (let i = 0; i < 3; i++) await t.gm.cmd({ type: 'dying', cardId: card, op: 'round', d: -1 });
  const st = await t.state();
  assert.ok(st.cards[card].dying && st.cards[card].dying.dead, 'Thorne has died');
  assert.equal((await bo.cmd({ type: 'lastWords', charId: thorne.id, text: 'Hers, not mine.' })).status, 403);
  const r = await ann.cmd({ type: 'lastWords', charId: thorne.id, text: 'Keep the lamp lit.' }); assert.equal(r.status, 200);
  const seen = JSON.stringify((await bo.get()).body.state.log); assert.ok(seen.includes('The last words of Thorne: “Keep the lamp lit.”'));
  assert.equal((await bo.get()).body.state.cards[card].lastWords, 'Keep the lamp lit.');
  assert.equal((await ann.cmd({ type: 'lastWords', charId: thorne.id, text: 'Again.' })).status, 409, 'once');
});
