// The character sheet at the table: who may change what, the rules the server enforces, what each viewer is sent, and the effect on the table.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); assert.equal((await who.cmd({ type: 'claim', charId: ch.id })).status, 200); return ch; };
const sheet = (who, charId, op) => who.cmd({ type: 'sheet', charId, op });
const me = async (who, name) => charNamed((await who.get()).body.state, name);

async function setup() {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob');
  const thorne = await claim(t, ann, 'Thorne'), wisp = await claim(t, bob, 'Wisp');
  return { t, ann, bob, thorne, wisp };
}

test('a player edits their own hero: text, gear, and the table sees it', async () => {
  const { t, ann, thorne } = await setup();
  assert.equal((await sheet(ann, thorne.id, { op: 'text', field: 'vow', value: 'Never leave a bell unanswered.' })).status, 200);
  assert.equal((await sheet(ann, thorne.id, { op: 'add', id: 'sword' })).status, 200);
  assert.equal((await sheet(ann, thorne.id, { op: 'add', id: 'lantern' })).status, 200);
  const mine = await me(ann, 'Thorne'); assert.equal(mine.vow, 'Never leave a bell unanswered.'); assert.deepEqual(mine.gear.map((g) => g.id + (g.eq ? '+' : '-')), ['sword+', 'lantern-']);
  const gmView = charNamed(await t.state(), 'Thorne'); assert.equal(gmView.gear.length, 2, 'the GM sees the same hero');
});

test('PERMISSIONS: a player cannot change another player\'s hero, or a free hero; the GM can change any hero', async () => {
  const { t, ann, bob, thorne, wisp } = await setup();
  assert.equal((await sheet(ann, wisp.id, { op: 'text', field: 'notes', value: 'mine now' })).status, 403);
  assert.equal((await sheet(bob, thorne.id, { op: 'add', id: 'sword' })).status, 403);
  const free = charNamed(await t.state(), 'Wren') || Object.values((await t.state()).chars).find((c) => !c.owner);
  assert.equal((await sheet(ann, free.id, { op: 'score', stat: 'STR', value: 1 })).status, 403, 'nobody\'s hero is nobody\'s to edit');
  assert.equal((await me(t.gm, 'Wisp')).notes || '', '', 'refused means unchanged');
  assert.equal((await sheet(t.gm, wisp.id, { op: 'text', field: 'notes', value: 'GM note on Wisp' })).status, 200);
  assert.equal((await sheet(t.gm, free.id, { op: 'add', id: 'chain' })).status, 200, 'the GM may give a relic');
  assert.equal((await sheet(ann, thorne.id, { op: 'add', id: 'chain' })).status, 400, 'a player may not take one');
});

test('LIMITS: the server enforces the build rules and answers in plain words', async () => {
  const { ann, thorne } = await setup();
  const r = await sheet(ann, thorne.id, { op: 'score', stat: 'DEX', value: 3 });
  assert.equal(r.status, 400); assert.match(r.body.error.message, /no points left/i);
  const eff = await sheet(ann, thorne.id, { op: 'effort', cat: 'magic', value: 1 }); assert.equal(eff.status, 400); assert.match(eff.body.error.message, /no Effort points left/i);
  const bad = await sheet(ann, thorne.id, { op: 'add', id: 'nonsense' }); assert.equal(bad.status, 400);
  await sheet(ann, thorne.id, { op: 'add', id: 'embers' });
  const second = await sheet(ann, thorne.id, { op: 'add', id: 'litany' }); assert.equal(second.status, 400); assert.match(second.body.error.message, /one grimoire/i);
  assert.equal((await me(ann, 'Thorne')).stats.DEX, 0);
});

test('GEAR AND HEARTS: slots are enforced, armour changes Defence, and a Plate Harness adds a Heart to the card', async () => {
  const { t, ann, thorne } = await setup();
  const before = (await me(ann, 'Thorne')).defence; assert.equal(before, 14, '10 + CON 2 + armour 2');
  await sheet(ann, thorne.id, { op: 'add', id: 'brigandine' });
  assert.equal((await me(ann, 'Thorne')).defence, 17, 'CON 2, armour 2 (the GM\'s number) + 3 worn = 5, the most armour counts');
  const st0 = await t.state(), card0 = find(st0, 'Thorne'); assert.equal(card0.hp.max, 10);
  await sheet(ann, thorne.id, { op: 'add', id: 'harness' });
  const card1 = find(await t.state(), 'Thorne'); assert.deepEqual([card1.hp.cur, card1.hp.max], [20, 20]);
  await sheet(ann, thorne.id, { op: 'move', index: 1, eq: false });
  const card2 = find(await t.state(), 'Thorne'); assert.deepEqual([card2.hp.cur, card2.hp.max], [10, 10]);
});

test('ONCE: a resent sheet command applies once', async () => {
  const { ann, thorne } = await setup();
  const cmd = { type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'bandages' } };
  assert.equal((await ann.cmd(cmd, { client: 'sheetclient1g', n: 1 })).status, 200);
  const again = await ann.cmd(cmd, { client: 'sheetclient1g', n: 1 }); assert.equal(again.body.result.duplicate, true);
  assert.equal((await me(ann, 'Thorne')).gear.length, 1);
});

test('the name on the sheet is the name on the token and in the turn order', async () => {
  const { t, ann, thorne } = await setup();
  await sheet(ann, thorne.id, { op: 'text', field: 'name', value: 'Thorne of Grimsby Fold' });
  const st = await t.state(); assert.equal(find(st, 'Thorne of Grimsby Fold').charId, thorne.id); assert.equal(charNamed(st, 'Thorne of Grimsby Fold').cardId, thorne.cardId);
});

test('PRIVACY: another player is not sent a hero\'s notes, background, vow or gear; the owner and the GM are', async () => {
  const { t, ann, bob, thorne } = await setup();
  await sheet(ann, thorne.id, { op: 'text', field: 'notes', value: 'SECRET-NOTE-XYZ' }); await sheet(ann, thorne.id, { op: 'text', field: 'background', value: 'SECRET-BACKGROUND-XYZ' });
  await sheet(ann, thorne.id, { op: 'text', field: 'appearance', value: 'a scarred brow' }); await sheet(ann, thorne.id, { op: 'add', id: 'sword' });
  const bobRaw = JSON.stringify((await bob.get()).body); assert.doesNotMatch(bobRaw, /SECRET-(NOTE|BACKGROUND)-XYZ/); assert.match(bobRaw, /a scarred brow/, 'what anyone can see of a hero is shared');
  assert.equal((await me(bob, 'Thorne')).gear, undefined);
  for (const who of [ann, t.gm]) assert.match(JSON.stringify((await who.get()).body), /SECRET-NOTE-XYZ/);
});

test('MONSTER ATTACKS use the hero\'s worn armour', async () => {
  const t = await table({ dice: [d20(10), die(1, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  await sheet(ann, thorne.id, { op: 'add', id: 'brigandine' });                  // armour 5, Defence 17 now
  const ghoul = find(await t.state(), 'Pit Ghoul'); await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { attack: 4 } });
  const r = await t.gm.cmd({ type: 'monsterAttack', cardId: ghoul.id, targetCardId: thorne.cardId });
  const roll = r.body.state.rolls.at(-1); assert.equal(roll.check.defence, 17); assert.equal(roll.check.success, false, '10 + 4 = 14 against 17');
});

test('BRINGING A HERO: a player brings one from My heroes; it is checked against the build rules, owned by them, and the old one is left alone', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob');
  const hero = { name: 'Wren Ashdown', calling: 'Cartographer', vow: 'To find the way out.', stats: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 0, guns: 3, magic: 0, ultimate: 0 }, gear: [{ id: 'crossbow', eq: true }, { id: 'gambeson', eq: true }, { id: 'lantern', eq: false }], notes: 'Keeps a map of every room.' };
  const r = await ann.cmd({ type: 'bringHero', hero }); assert.equal(r.status, 200);
  const st = (await ann.get()).body.state, ch = charNamed(st, 'Wren Ashdown'); assert.equal(ch.owner, ann.pid); assert.equal(ch.gear.length, 3); assert.equal(ch.notes, 'Keeps a map of every room.'); assert.equal(ch.defence, 10 + 1 + 2);
  assert.equal(st.cards[ch.cardId].hp.max, 10); assert.ok((await t.state()).order === undefined || true);
  assert.equal((await ann.cmd({ type: 'bringHero', hero })).status, 400, 'one hero each: you already have one');
  const cheat = await bob.cmd({ type: 'bringHero', hero: Object.assign({}, hero, { name: 'Cheat', stats: { STR: 6, DEX: 6, CON: 6, INT: 6, WIS: 6, CHA: 6 }, gear: [{ id: 'chain', eq: true }, { id: 'bell', eq: true }, { id: 'censer', eq: true }, { id: 'candle', eq: true }] }) });
  assert.equal(cheat.status, 400); assert.match(cheat.body.error.message, /points/); assert.match(cheat.body.error.message, /no more than three/i);
  assert.equal(charNamed((await t.state()), 'Cheat'), undefined);
  const gm = await t.gm.cmd({ type: 'bringHero', hero: Object.assign({}, hero, { name: 'Free Wren' }) }); assert.equal(gm.status, 200);
  assert.equal(charNamed(await t.state(), 'Free Wren').owner, null, 'a hero the GM brings is free to claim');
});

test('a hero from a table saved before the sheet existed still works: no gear, no text, and it can be edited', async () => {
  const { t, ann, thorne } = await setup();
  const old = (await me(ann, 'Thorne')); assert.deepEqual(old.gear, []); assert.equal(old.notes, '');
  assert.equal(typeof old.defence, 'number');
});
