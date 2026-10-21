// The session recap and the next session date (2026-10-21): what the table counts, what it names, and who is sent what.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed, d20, die } from './vtt-helpers.mjs';

test('RECAP: a new table starts one; rolls, the hardest blow, a fall, a gift and the Horror are counted; only the GM is sent it', async () => {
  const t = await table({ dice: [] }); let st = await t.state();
  assert.ok(st.recap && st.recap.since > 0, 'a new table has a recap from the start');
  const p = await t.join('Ash'); const thorne = charNamed(st, 'Thorne'), ghoul = find(st, 'Pit Ghoul');
  await p.cmd({ type: 'claim', charId: thorne.id });
  t.queue(d20(20)); const r = await p.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id }); assert.equal(r.status, 200, JSON.stringify(r.body));
  t.queue(die(8, 8)); await p.cmd({ type: 'effort', rollId: r.body.result.rollId, cat: 'weapons' });
  await p.cmd({ type: 'apply', rollId: r.body.result.rollId, cardId: ghoul.id, field: 'hp' });
  t.queue(d20(1)); await p.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' });
  await t.gm.cmd({ type: 'track', id: thorne.cardId, field: 'hp', value: 0 });
  const bell = find(st, 'Warden’s Bell'); await t.gm.cmd({ type: 'giveCard', id: bell.id, pid: p.pid });
  st = await t.state(); const C = st.recap, h = C.heroes[thorne.id];
  assert.deepEqual([h.rolls, h.hits, h.n20, h.n1], [2, 1, 1, 1]);
  assert.ok(h.dealt > 0); assert.equal(C.best.who, 'Thorne'); assert.equal(C.best.on, 'Pit Ghoul'); assert.equal(C.best.n, h.dealt);
  assert.deepEqual(C.fell, ['Thorne']); assert.deepEqual(C.found, ['Ash: Warden’s Bell']);
  assert.equal(C.horrorPeak, 1, 'the natural 1 raised the Horror to 1');
  const ps = (await p.get()).body; assert.equal(ps.state.recap, undefined, 'a player is not sent the recap');
});

test('RECAP: a blow on a hidden card names it "something unseen"; Start a new session clears the tally (GM only)', async () => {
  const t = await table({ dice: [] }); let st = await t.state();
  const p = await t.join('Ash'); const wisp = charNamed(st, 'Wisp'); await p.cmd({ type: 'claim', charId: wisp.id });
  const made = await t.gm.cmd({ type: 'cardCreate', card: { name: 'The Thing in the Well', kind: 'token', visible: false, hp: { cur: 10, max: 10 } } }); const hid = made.body.result.id;
  t.queue(d20(19)); const r = await t.gm.cmd({ type: 'roll', charId: wisp.id, stat: 'INT', targetCardId: hid });
  t.queue(die(4, 6)); await t.gm.cmd({ type: 'effort', rollId: r.body.result.rollId, cat: 'basic' });
  await t.gm.cmd({ type: 'apply', rollId: r.body.result.rollId, cardId: hid, field: 'hp' });
  st = await t.state(); assert.equal(st.recap.best.on, 'something unseen'); assert.ok(!JSON.stringify(st.recap).includes('Well'));
  assert.equal((await p.cmd({ type: 'recapReset' })).status, 403);
  assert.equal((await t.gm.cmd({ type: 'recapReset' })).status, 200);
  st = await t.state(); assert.deepEqual(st.recap.heroes, {}); assert.equal(st.recap.best, null); assert.equal(st.recap.round0, st.table.round);
});

test('NEXT SESSION: the GM sets a time and a note; every player is sent it; a player cannot set it; clearing it removes it', async () => {
  const t = await table(); const p = await t.join('Ash');
  const at = Date.UTC(2026, 9, 30, 18, 30);
  assert.equal((await p.cmd({ type: 'nextSession', at })).status, 403);
  assert.equal((await t.gm.cmd({ type: 'nextSession', at: 'soon' })).status, 400);
  assert.equal((await t.gm.cmd({ type: 'nextSession', at, note: 'The crypt, at last' })).status, 200);
  let ps = (await p.get()).body.state; assert.deepEqual(ps.nextSession, { at, note: 'The crypt, at last' });
  assert.ok(ps.log.some((e) => /set the next session/.test(e.text)));
  await t.gm.cmd({ type: 'nextSession', at: null }); ps = (await p.get()).body.state; assert.equal(ps.nextSession, null);
});
