// Supplies cannot be equipped at a table: the server refuses it, a hero brought in is cleaned, and a table saved before this rule is put right (the GM is told which heroes).
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const sheet = (who, charId, op) => who.cmd({ type: 'sheet', charId, op });
const gearOf = async (who, name) => charNamed((await who.get()).body.state, name).gear.map((g) => g.id + (g.eq ? '+' : '-')).join(',');

test('the server refuses an equip request for a supply, however it is sent; a weapon can still be equipped', async () => {
  const t = await table(), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  await sheet(ann, thorne.id, { op: 'add', id: 'bandages' }); await sheet(ann, thorne.id, { op: 'add', id: 'sword' });
  const r = await sheet(ann, thorne.id, { op: 'move', index: 0, eq: true }); assert.equal(r.status, 400); assert.match(r.body.error.message, /cannot be equipped/);
  assert.equal(await gearOf(ann, 'Thorne'), 'bandages-,sword+');
  const gm = await sheet(t.gm, thorne.id, { op: 'move', index: 0, eq: true }); assert.equal(gm.status, 400, 'the GM is held to it too');
  assert.equal((await sheet(ann, thorne.id, { op: 'move', index: 1, eq: false })).status, 200); assert.equal((await sheet(ann, thorne.id, { op: 'move', index: 1, eq: true })).status, 200);
  assert.equal(await gearOf(ann, 'Thorne'), 'bandages-,sword+');
});

test('a hero brought to a table with a supply marked equipped arrives with it in the pack', async () => {
  const t = await table(), ann = await t.join('Ann');
  const hero = { name: 'Wren Ashdown', stats: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 0, guns: 3, magic: 0, ultimate: 0 }, gear: [{ id: 'bandages', eq: true }, { id: 'crossbow', eq: true }] };
  assert.equal((await ann.cmd({ type: 'bringHero', hero })).status, 200); assert.equal(await gearOf(ann, 'Wren Ashdown'), 'bandages-,crossbow+');
});

test('a table saved before this rule is put right on its next command, and only the GM is told which heroes were affected', async () => {
  const store = memoryStore(), t = await table({ store }), ann = await t.join('Ann'), bob = await t.join('Bob');
  const thorne = await claim(t, ann, 'Thorne'), wisp = await claim(t, bob, 'Wisp');
  await sheet(ann, thorne.id, { op: 'add', id: 'bandages' }); await sheet(ann, thorne.id, { op: 'add', id: 'sword' }); await sheet(bob, wisp.id, { op: 'add', id: 'lantern' });
  // an old table: put the supplies in the equipped set and take away the marker that says the table has been put right
  const raw = store._raw.get(t.code), data = JSON.parse(raw.json);
  for (const ch of Object.values(data.chars)) for (const g of ch.gear || []) if (g.id === 'bandages' || g.id === 'lantern') g.eq = true;
  delete data.supplyFix; store._raw.set(t.code, { json: JSON.stringify(data), etag: raw.etag });
  // what anyone is sent already shows them in the pack
  assert.equal(await gearOf(ann, 'Thorne'), 'bandages-,sword+'); assert.equal(await gearOf(bob, 'Wisp'), 'lantern-');
  await t.gm.cmd({ type: 'setTarget', value: 13 });                                          // any command puts the table right
  const saved = JSON.parse(store._raw.get(t.code).json);
  assert.deepEqual(Object.values(saved.chars).find((c) => c.name === 'Thorne').gear.map((g) => g.eq), [false, true]);
  assert.deepEqual(Object.values(saved.chars).find((c) => c.name === 'Wisp').gear.map((g) => g.eq), [false]);
  const gmFeed = (await t.state()).log.map((e) => e.text).join(' | ');
  assert.match(gmFeed, /Supply items cannot be equipped.*Thorne: Linen Bandages.*Wisp: Hooded Lantern/);
  const raw2 = JSON.stringify((await bob.get()).body); assert.doesNotMatch(raw2, /Supply items cannot be equipped/, 'the players are not told');
  const again = await t.gm.cmd({ type: 'setTarget', value: 14 }); assert.equal(again.status, 200);
  assert.equal((await t.state()).log.filter((e) => /Supply items cannot be equipped/.test(e.text)).length, 1, 'said once');
});
