import test from 'node:test';
import assert from 'node:assert/strict';
import { table, charNamed, find } from './vtt-helpers.mjs';
const SC = globalThis.SacramentSheetCore;

test('Heart equipment preserves wounds across repeated equip cycles and never raises a hero at zero', () => {
  const hero = SC.blankHero('Test hero'), hp = { cur: 1, max: 10 };
  assert.equal(SC.edit(hero, { op: 'add', id: 'harness' }, { gm: false }, hp).ok, true);
  assert.deepEqual(hp, { cur: 11, max: 20 });
  for (let i = 0; i < 3; i++) {
    SC.edit(hero, { op: 'move', index: 0, eq: false }, { gm: false }, hp);
    assert.deepEqual(hp, { cur: 1, max: 10 });
    SC.edit(hero, { op: 'move', index: 0, eq: true }, { gm: false }, hp);
    assert.deepEqual(hp, { cur: 11, max: 20 });
  }
  hp.cur = 0;
  SC.edit(hero, { op: 'move', index: 0, eq: false }, { gm: false }, hp);
  SC.edit(hero, { op: 'move', index: 0, eq: true }, { gm: false }, hp);
  assert.equal(hp.cur, 0);
});

test('concurrent removals keep identifying the same gear instance after indexes shift', async () => {
  const t = await table(), ch = charNamed(await t.state(), 'Thorne');
  for (const id of ['sword', 'sword', 'lantern']) await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id } });
  const before = charNamed(await t.state(), 'Thorne').gear;
  assert.ok(before[0].key && before[1].key && before[0].key !== before[1].key);
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'remove', index: 0, gearKey: before[0].key } });
  const r = await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'remove', index: 1, gearKey: before[1].key } });
  assert.equal(r.status, 200);
  assert.deepEqual(charNamed(await t.state(), 'Thorne').gear.map(g => g.id), ['lantern']);
  const stale = await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'remove', index: 0, gearKey: before[0].key } });
  assert.equal(stale.status, 409);
});

test('an old index-only client must refresh instead of changing an unknown item', async () => {
  const t = await table(), ch = charNamed(await t.state(), 'Thorne');
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id: 'sword' } });
  const r = await t.svc.handle({ method: 'POST', token: t.gm.token, body: { op: 'cmd', code: t.code, cmd: { actionId: 'oldclient.1', type: 'sheet', charId: ch.id, op: { op: 'remove', index: 0 } } } });
  assert.equal(r.status, 409);
  assert.match(r.body.error.message, /refresh/i);
  assert.equal(charNamed(await t.state(), 'Thorne').gear.length, 1);
});

test('using a removed item never spends a different item after the inventory shifts', async () => {
  const t = await table(), ch = charNamed(await t.state(), 'Thorne');
  for (const id of ['sword', 'sword']) await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id } });
  const key = charNamed(await t.state(), 'Thorne').gear[0].key;
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'remove', index: 0, gearKey: key } });
  const r = await t.gm.cmd({ type: 'useItem', charId: ch.id, index: 0, gearKey: key });
  assert.equal(r.status, 409);
  assert.equal((await t.state()).rolls.length, 0);
});

test('equipment changes preserve dead state and start dying if removing a Heart drops HP to zero', async () => {
  const t = await table(), ch = charNamed(await t.state(), 'Thorne'), card = find(await t.state(), 'Thorne');
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id: 'harness' } });
  await t.gm.cmd({ type: 'track', id: card.id, field: 'hp', value: 5 });
  const key = charNamed(await t.state(), 'Thorne').gear[0].key;
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'move', gearKey: key, eq: false } });
  assert.equal(find(await t.state(), 'Thorne').hp.cur, 0);
  assert.ok(find(await t.state(), 'Thorne').dying);
  for (let i = 0; i < 4; i++) await t.gm.cmd({ type: 'nextRound' });
  await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'move', gearKey: key, eq: true } });
  const after = find(await t.state(), 'Thorne');
  assert.equal(after.hp.cur, 0); assert.equal(after.dying.dead, true);
});

test('older tables gain stable item keys without losing gear, and deleted keys are never reused', async () => {
  const { memoryStore } = await import('../netlify/functions/_shared/vtt-service.mjs');
  const store = memoryStore(), t = await table({ store, gear: true });
  const room = await store.get(t.code), raw = Object.values(room.data.chars).find(c => c.name === 'Thorne');
  delete raw.gearSeq; raw.gear.forEach(g => { delete g.key; });
  await store.put(t.code, room.data, room.etag);
  const first = charNamed(await t.state(), 'Thorne');
  const second = charNamed(await t.state(), 'Thorne');
  assert.deepEqual(first.gear, second.gear);
  assert.equal(first.gear.length, raw.gear.length);
  const key = first.gear[0].key;
  await t.gm.cmd({ type: 'sheet', charId: first.id, op: { op: 'remove', gearKey: key } });
  await t.gm.cmd({ type: 'sheet', charId: first.id, op: { op: 'add', id: 'sword' } });
  assert.ok(charNamed(await t.state(), 'Thorne').gear.every(g => g.key !== key));
});
