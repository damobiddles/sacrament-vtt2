// The GM's own loot: designed in a library kept for the table, put on the table as a hidden loot card or given straight to a hero's sheet; players never see the library or an unrevealed card.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';

const charm = { name: 'Ghoul-Tooth Charm', category: 'Curio', cat: 'magic', roll: 'WIS', slots: 1, flavour: 'Strung on gut. It is cold, and it hums when the dead are near.', does: 'Hold it up: nearby dead hesitate.', equippable: false, temptsHorror: true, horror: 1, notes: 'SECRETNOTE the dead it calms are the ones it was made from.' };
const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const lib = async (t) => (await t.state()).lootLib;
const gearOf = async (who, name) => charNamed((await who.get()).body.state, name).gear;
async function setup() { const t = await table(), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'); return { t, ann, thorne }; }
const save = async (t, item, id) => { const r = await t.gm.cmd({ type: 'lootSave', item, id }); assert.equal(r.status, 200); return r.body.result.id; };

test('DESIGN: an item is saved to the GM\'s library, can be edited, and can be deleted', async () => {
  const { t } = await setup(); assert.deepEqual(await lib(t), []);
  const id = await save(t, charm); let l = await lib(t); assert.equal(l.length, 1); assert.equal(l[0].name, 'Ghoul-Tooth Charm'); assert.equal(l[0].notes.startsWith('SECRETNOTE'), true);
  assert.equal(l[0].horror, 1); assert.equal(l[0].temptsHorror, true);
  await save(t, Object.assign({}, charm, { name: 'Ghoul-Tooth Charm II', horror: 3 }), id); l = await lib(t); assert.equal(l.length, 1, 'edited in place'); assert.equal(l[0].name, 'Ghoul-Tooth Charm II'); assert.equal(l[0].horror, 3);
  assert.equal((await t.gm.cmd({ type: 'lootDelete', id })).status, 200); assert.deepEqual(await lib(t), []);
  assert.equal((await t.gm.cmd({ type: 'lootDelete', id })).status, 404);
});

test('DESIGN: what is saved is tidied: a name is needed, numbers are kept sensible, valid zero Horror stays zero, a weapon is always equippable', async () => {
  const { t } = await setup();
  const id = await save(t, { name: '   ', category: 'Nonsense', cat: 'zzz', roll: 'XYZ', slots: 99, horror: 0, temptsHorror: true, equippable: false });
  const it = (await lib(t))[0]; assert.equal(it.id, id); assert.equal(it.name, 'Unnamed find'); assert.equal(it.category, 'Curio'); assert.equal(it.cat, ''); assert.equal(it.slots, 4); assert.equal(it.horror, 0);
  const w = await save(t, { name: 'Bone Saw', category: 'Weapon', cat: 'weapons', roll: 'STR', equippable: false }); assert.equal((await lib(t)).find((x) => x.id === w).equippable, true);
});

test('PLAYERS: a player cannot design, see the library, or use the commands, and the library and notes are in nothing a player is sent', async () => {
  const { t, ann, thorne } = await setup(); const id = await save(t, charm);
  for (const cmd of [{ type: 'lootSave', item: charm }, { type: 'lootDelete', id }, { type: 'lootPlace', libId: id }, { type: 'lootGive', libId: id, charId: thorne.id }]) assert.equal((await ann.cmd(cmd)).status, 403, cmd.type);
  const raw = JSON.stringify((await ann.get()).body); assert.doesNotMatch(raw, /SECRETNOTE|lootLib|Ghoul-Tooth/);
  await t.gm.cmd({ type: 'lootPlace', libId: id });
  const raw2 = JSON.stringify((await ann.get()).body); assert.doesNotMatch(raw2, /SECRETNOTE|Ghoul-Tooth|"loot"/, 'a hidden loot card is not sent to a player at all');
});

test('PLACE: an item goes on the table as a hidden loot card; revealing it shows players the name and text but never the notes; the card carries the item for giving', async () => {
  const { t, ann } = await setup(); const id = await save(t, charm);
  const r = await t.gm.cmd({ type: 'lootPlace', libId: id }); assert.equal(r.status, 200); const card = r.body.state.cards[r.body.result.id];
  assert.equal(card.kind, 'loot'); assert.equal(card.visible, false); assert.equal(card.name, 'Ghoul-Tooth Charm'); assert.equal(card.loot.name, 'Ghoul-Tooth Charm');
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: card.id, patch: { visible: true } })).status, 200);
  const seen = (await ann.get()).body.state.cards[card.id]; assert.equal(seen.name, 'Ghoul-Tooth Charm'); assert.match(seen.desc, /Strung on gut/); assert.match(seen.desc, /nearby dead hesitate/);
  const raw = JSON.stringify((await ann.get()).body); assert.doesNotMatch(raw, /SECRETNOTE/); assert.equal(seen.loot, undefined, 'the item behind the card is the GM\'s');
});

test('PLACE: a rolled item, edited first, can be put on the table without being saved to the library', async () => {
  const { t } = await setup(); const roll = await t.gm.cmd({ type: 'lootRoll', ns: [87, 14] }); const d = roll.body.result.design; assert.equal(d.name, 'Ashen Rosary'); assert.equal(d.category, 'Relic');
  const r = await t.gm.cmd({ type: 'lootPlace', item: Object.assign({}, d, { name: 'Blackened Rosary' }) }); assert.equal(r.status, 200);
  assert.ok(find(await t.state(), 'Blackened Rosary')); assert.deepEqual(await lib(t), []);
});

test('GIVE: from the library an item lands on the hero\'s sheet exactly once with its details and no notes; the player sees it and can use it', async () => {
  const { t, ann, thorne } = await setup(); const id = await save(t, charm);
  const cmd = { type: 'lootGive', libId: id, charId: thorne.id, actionId: 'kk1234567.1' };
  assert.equal((await t.gm.cmd(cmd)).status, 200); const again = await t.gm.cmd(cmd); assert.equal(again.status, 200); assert.equal(again.body.result.duplicate, true);
  const g = await gearOf(ann, 'Thorne'); assert.equal(g.length, 1, 'once'); assert.equal(g[0].def.name, 'Ghoul-Tooth Charm'); assert.equal(g[0].eq, false);
  assert.doesNotMatch(JSON.stringify((await ann.get()).body), /SECRETNOTE/);
  assert.equal((await lib(t)).length, 1, 'the library keeps it');
  const use = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0 }); assert.equal(use.status, 200); assert.equal(use.body.state.rolls.at(-1).item, 'Ghoul-Tooth Charm'); assert.equal(use.body.state.rolls.at(-1).stat, 'WIS');
});

test('GIVE: a later edit or delete in the library does not change what a hero already holds', async () => {
  const { t, ann, thorne } = await setup(); const id = await save(t, charm); await t.gm.cmd({ type: 'lootGive', libId: id, charId: thorne.id });
  await save(t, Object.assign({}, charm, { name: 'Changed' }), id); await t.gm.cmd({ type: 'lootDelete', id });
  assert.equal((await gearOf(ann, 'Thorne'))[0].def.name, 'Ghoul-Tooth Charm');
});

test('GIVE: from a card it lands on the sheet and the card leaves the table; a second give finds nothing to give', async () => {
  const { t, ann, thorne } = await setup(); const id = await save(t, charm);
  const placed = await t.gm.cmd({ type: 'lootPlace', libId: id }); const cardId = placed.body.result.id;
  assert.equal((await t.gm.cmd({ type: 'lootGive', cardId, charId: thorne.id })).status, 200);
  assert.equal(find(await t.state(), 'Ghoul-Tooth Charm'), undefined, 'the card is gone'); assert.equal((await gearOf(ann, 'Thorne')).length, 1);
  assert.equal((await t.gm.cmd({ type: 'lootGive', cardId, charId: thorne.id })).status, 404); assert.equal((await gearOf(ann, 'Thorne')).length, 1, 'never twice');
});

test('GIVE: when the sheet cannot take it (pack full) the card stays and the reason is in words', async () => {
  const { t, thorne } = await setup(); const big = await save(t, { name: 'Anvil', category: 'Mundane', slots: 4 });
  for (let i = 0; i < 2; i++) assert.equal((await t.gm.cmd({ type: 'lootGive', libId: big, charId: thorne.id })).status, 200);
  const placed = await t.gm.cmd({ type: 'lootPlace', libId: big }); const r = await t.gm.cmd({ type: 'lootGive', cardId: placed.body.result.id, charId: thorne.id, });
  assert.equal(r.status, 400); assert.match(r.body.error.message, /full|Drop/); assert.ok(find(await t.state(), 'Anvil'), 'the card is still there');
});

test('GIVE: a supply goes to the pack and cannot be equipped; an equippable item can; designed armour counts toward Defence', async () => {
  const { t, ann, thorne } = await setup();
  const sup = await save(t, { name: 'Sexton Lantern', category: 'Mundane', equippable: false }), mail = await save(t, { name: 'Gravemail', category: 'Armour', defence: 2, slots: 2 });
  await t.gm.cmd({ type: 'lootGive', libId: sup, charId: thorne.id }); await t.gm.cmd({ type: 'lootGive', libId: mail, charId: thorne.id });
  const g = await gearOf(ann, 'Thorne'); assert.equal(g[0].eq, false); assert.equal(g[1].eq, true);
  const bad = await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'move', index: 0, eq: true } }); assert.equal(bad.status, 400); assert.match(bad.body.error.message, /cannot be equipped/);
  const before = charNamed(await t.state(), 'Thorne').defence; assert.ok(before >= 12);
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'move', index: 1, eq: false } })).status, 200); assert.equal(charNamed(await t.state(), 'Thorne').defence, before - 2);
});

test('SAFETY: a player cannot slip a made-up item onto a sheet through the sheet command, or through bringing a hero', async () => {
  const { t, ann, thorne } = await setup(); const def = { id: 'xforged', name: 'Forged', category: 'Curio', cat: 'weapons', roll: 'STR' };
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'xforged', def } })).status, 400);
  const bj = await t.join('Bob'); const r = await bj.cmd({ type: 'bringHero', hero: { name: 'Fake', stats: { STR: 1 }, gear: [{ id: 'xforged', eq: false, def }] } });
  assert.equal(r.status, 200); assert.deepEqual(charNamed(await t.state(), 'Fake').gear, [], 'the made-up gear is dropped');
});

test('EDIT A CARD: the GM can change the item behind a loot card; the card\'s name and text follow', async () => {
  const { t, ann } = await setup(); const id = await save(t, charm); const cardId = (await t.gm.cmd({ type: 'lootPlace', libId: id })).body.result.id;
  await t.gm.cmd({ type: 'cardUpdate', id: cardId, patch: { visible: true } });
  assert.equal((await t.gm.cmd({ type: 'lootCardEdit', cardId, item: Object.assign({}, charm, { name: 'Brother Anselm Seal', flavour: 'Wax and a thumbprint.' }) })).status, 200);
  const seen = (await ann.get()).body.state.cards[cardId]; assert.equal(seen.name, 'Brother Anselm Seal'); assert.match(seen.desc, /Wax and a thumbprint/);
  assert.equal((await ann.cmd({ type: 'lootCardEdit', cardId, item: charm })).status, 403);
});

test('TABLES SAVED BEFORE THIS: a table saved with no library still works, and the GM sees an empty one', async () => {
  const store = memoryStore(), t = await table({ store }); const raw = store._raw.get(t.code), data = JSON.parse(raw.json); delete data.lootLib; store._raw.set(t.code, { json: JSON.stringify(data), etag: raw.etag });
  assert.deepEqual(await lib(t), []); assert.equal((await t.gm.cmd({ type: 'lootSave', item: charm })).status, 200); assert.equal((await lib(t)).length, 1);
});
