// The turn order when something leaves it: whoever is acting keeps the turn. (Deleting a card earlier in the order used to hand the turn to the next person.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find } from './vtt-helpers.mjs';

const acting = (st) => st.cards[st.table.order[st.table.idx].id].name;

test('TURN ORDER: deleting a card earlier in the order keeps the turn with whoever is acting', async () => {
  const t = await table();
  await t.gm.cmd({ type: 'turnSet', idx: 1 }); let st = await t.state(); assert.equal(acting(st), 'Wisp');
  await t.gm.cmd({ type: 'cardDelete', id: find(st, 'Thorne').id }); st = await t.state();
  assert.equal(acting(st), 'Wisp');
});

test('TURN ORDER: deleting the card whose turn it is passes the turn to the next in the order (the last place in the order stays the last)', async () => {
  const t = await table(); let st = await t.state();
  await t.gm.cmd({ type: 'turnSet', idx: 1 });
  await t.gm.cmd({ type: 'cardDelete', id: find(st, 'Wisp').id }); st = await t.state();
  assert.equal(acting(st), 'Brother Anselm Vey');
  await t.gm.cmd({ type: 'turnSet', idx: st.table.order.length - 1 }); st = await t.state(); assert.equal(acting(st), 'Pit Ghoul');
  await t.gm.cmd({ type: 'cardDelete', id: find(st, 'Pit Ghoul').id }); st = await t.state();
  assert.equal(st.table.idx, st.table.order.length - 1);   /* the last place is kept, as before: the GM moves the turn on when ready */
});

test('TURN ORDER: loot given to a hero from a card in the order keeps the turn with whoever is acting', async () => {
  const t = await table(); let st = await t.state();
  const placed = await t.gm.cmd({ type: 'lootPlace', item: { name: 'Bone Whistle', kind: 'relic' } }); assert.equal(placed.status, 200);
  const card = placed.body.result.id;
  await t.gm.cmd({ type: 'orderSet', order: [card].concat(st.table.order.map((o) => o.id)) });
  await t.gm.cmd({ type: 'turnSet', idx: 2 }); st = await t.state(); assert.equal(acting(st), 'Wisp');
  const thorne = Object.values(st.chars).find((c) => c.name === 'Thorne');
  const r = await t.gm.cmd({ type: 'lootGive', cardId: card, charId: thorne.id }); assert.equal(r.status, 200, JSON.stringify(r.body));
  st = await t.state(); assert.equal(acting(st), 'Wisp');
});
