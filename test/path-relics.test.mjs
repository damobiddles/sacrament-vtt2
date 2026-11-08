// Path relics (owner request 2026-11-08): twenty magic relics, two for each of ten hero paths, on their own d100 table reached from the Relics table.
// They use the rules every relic already has (Horror on every use, limited uses like bandages, natural 1s as for any item). Owner decision 2026-11-08:
// a hero may choose a path, and a relic of their own path costs 1 less Horror to use, never below 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
import { table, d20, charNamed } from './vtt-helpers.mjs';
import { lootCatalogue } from '../scripts/lib/loot-catalogue.mjs';
const G = globalThis.SACRAMENT_GEAR, C = globalThis.SacramentSheetCore;
const PATHS = ['Druid', 'Necromancer', 'Hunter', 'Assassin', 'Mercenary', 'Priest', 'Witch', 'Penitent', 'Barber-surgeon', 'Witch-finder'];
const relics = G.found.filter((i) => i.table === 'pathrelics');

test('twenty path relics, two for each path, all magic relics that tempt the Horror', () => {
  assert.equal(relics.length, 20);
  for (const p of PATHS) assert.equal(relics.filter((i) => i.path === p).length, 2, p);
  assert.deepEqual([...new Set(relics.map((i) => i.path))], PATHS);
  const tagIds = G.tags.map((t) => t.id);
  for (const i of relics) {
    assert.equal(i.kind, 'relic', i.id); assert.equal(i.category, 'Relic', i.id); assert.equal(i.found, true, i.id);
    assert.equal(i.temptsHorror, true, i.id); assert.ok(Number.isInteger(i.horror) && i.horror >= 1, i.id);
    assert.match(i.does, new RegExp('adds? ' + i.horror + ' Horror'), i.id + ': its words state its Horror cost');
    if (i.uses) { assert.ok(i.uses >= 2 && i.uses <= 6, i.id); assert.match(i.does, new RegExp('\\b' + i.uses + ' uses\\b'), i.id + ': its words state how many uses it has'); }
    assert.ok(['damage', 'healing', 'esoteric'].includes(i.effect), i.id);
    if (i.effect === 'damage') assert.deepEqual([i.cat, i.effort, !!i.roll], ['magic', 10, true], i.id + ': damage relics roll Magic Effort d10 after a check, like the others');
    if (i.effect === 'healing') { assert.equal(C.healingOf(i).die, 8, i.id); assert.ok(!i.cat, i.id); }
    if (i.effect === 'esoteric') { assert.ok(!i.cat, i.id); assert.ok(i.tags && i.tags.length && i.tags.every((t) => tagIds.includes(t)), i.id + ': a story relic says what it is good for, so the solo game can use it'); }
    if ((i.tags || []).includes('bind')) assert.ok(i.roll, i.id + ': Bind only holds a foe after a successful check');
  }
});

test('they are found on the Relics table (67 to 100, then a third d100), and the main d100 odds do not move', () => {
  const tab = G.tables.find((t) => t.id === 'pathrelics');
  assert.deepEqual([tab.on, tab.loot, tab.die], ['relics', [67, 100], 100]);
  for (const item of relics) for (const n of item.loot) {
    const r = C.rollLoot(() => { throw Error('every die was typed'); }, [81, 67, n]);
    assert.equal(r.ok, true); assert.equal(r.item.id, item.id); assert.deepEqual(r.steps.map((s) => s.table), ['d100', 'relics', 'pathrelics']);
  }
  assert.equal(C.sayLoot(C.rollLoot(() => 1, [90, 100, 1]).steps), '90 → Relics d100: 100 → Path relics d100: 1');
  assert.equal(C.rollLoot(() => 1, [90, 66]).item.id, 'unshacklingring', 'the older relics share 1 to 66');
  const hero = C.blankHero('Path test');
  for (const i of relics) { assert.equal(C.edit(hero, { op: 'add', id: i.id }, { gm: false }).ok, false, i.id + ' is a find the GM gives out'); }
});

test('the loot page lists every path relic with its path and its uses, so the search finds them by path', () => {
  const html = lootCatalogue(G);
  assert.ok(html.includes('id="table-pathrelics"'));
  for (const i of relics) {
    const at = html.indexOf('id="item-' + i.id + '"'); assert.ok(at > 0, i.id);
    const entry = html.slice(at, html.indexOf('</article>', at));
    assert.ok(entry.includes('Path: ' + i.path), i.id);
    if (i.uses) assert.ok(entry.includes(i.uses + ' uses'), i.id);
  }
});

const setup = async (dice, id) => {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id } })).status, 200);
  const at = charNamed(await t.state(), 'Thorne').gear.findIndex((g) => g.id === id);
  assert.equal((await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'move', index: at, eq: true } })).status, 200);
  return { t, ann, thorne, at };
};
const gearOf = async (t, id) => charNamed(await t.state(), 'Thorne').gear.find((g) => g.id === id);

test('AT THE TABLE: a relic with uses spends one each time and adds its Horror; with none left it cannot be used', async () => {
  const { t, ann, thorne, at } = await setup(null, 'deadmanskey');
  assert.equal((await gearOf(t, 'deadmanskey')).uses, 3);
  for (let k = 1; k <= 3; k++) {
    const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at }); assert.equal(r.status, 200);
    assert.equal(r.body.state.horror.cur, 2 * k, 'each use adds 2 Horror (1 for an Assassin)');
    assert.equal((await gearOf(t, 'deadmanskey')).uses, 3 - k);
  }
  const spent = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at });
  assert.equal(spent.status, 400); assert.match(spent.body.error.message, /no uses left/);
  assert.equal((await t.state()).horror.cur, 6, 'a spent relic adds nothing');
});

test('AT THE TABLE: a miss still spends a use and adds the Horror; a natural 1 on an attack adds 1 more, on a plain check it does not', async () => {
  { const { t, ann, thorne, at } = await setup([d20(5)], 'waxpoppet');
    const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at }); assert.equal(r.status, 200);
    assert.equal(r.body.state.rolls.at(-1).check.success, false); assert.equal(r.body.state.horror.cur, 3);
    assert.equal((await gearOf(t, 'waxpoppet')).uses, 1); }
  { const { t, ann, thorne, at } = await setup([d20(1)], 'waxpoppet');
    const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at }); assert.equal(r.status, 200);
    assert.equal(r.body.state.horror.cur, 4, '3 for the poppet and 1 for a natural 1 on an attack'); void t; }
  { const { t, ann, thorne, at } = await setup([d20(1)], 'hangingacorns');
    const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at }); assert.equal(r.status, 200);
    assert.equal(r.body.state.horror.cur, 2, 'the acorns are a plain check: a natural 1 adds no Horror of its own');
    assert.equal((await gearOf(t, 'hangingacorns')).uses, 2); }
});

test('THE SHEET: uses the table counts say "left"; only uses the table cannot spend say "track manually"', () => {
  // Bug found 2026-11-08: the sheet labelled a relic's uses "supplied · track manually" although the table spends one on each use.
  for (const id of ['gibbethand', 'deadmanskey', 'windcord', 'waxpoppet', 'eulaliatears', 'bandages']) assert.equal(C.usesCounted(C.item(id)), true, id);
  for (const id of ['candles', 'oil']) assert.equal(C.usesCounted(C.item(id)), false, id + ' is used up by hand, so the sheet says to track it');
  for (const i of relics) if (i.uses) { const h = C.blankHero('Count'); C.edit(h, { op: 'add', id: i.id }, { gm: true }); h.gear[0].eq = true; assert.equal(C.useOf(h, 0).ok, true, i.id + ' is used through the table, which counts its uses'); }
});

test('PATHS: a hero chooses one of the ten paths or none; anything else is refused, and old heroes have none', () => {
  assert.deepEqual(C.PATHS, PATHS);
  const h = C.blankHero('Path'); assert.equal(h.path, '');
  assert.equal(C.edit(h, { op: 'path', value: 'Druid' }, { gm: false }).ok, true); assert.equal(h.path, 'Druid');
  assert.equal(C.edit(h, { op: 'path', value: 'Sorcerer' }, { gm: false }).ok, false); assert.equal(h.path, 'Druid');
  assert.equal(C.edit(h, { op: 'path', value: '' }, { gm: false }).ok, true); assert.equal(h.path, '');
  assert.equal(C.cleanHero({ name: 'Old' }).path, '', 'a hero saved before paths has none');
  assert.equal(C.cleanHero({ name: 'Odd', path: 'Pirate' }).path, '');
  assert.equal(C.cleanHero({ name: 'Kept', path: 'Witch-finder' }).path, 'Witch-finder');
});

test('PATHS: only a relic of the hero\'s own path is cheaper, by 1 and never below 1; spells, other relics and other paths pay in full', () => {
  const hero = (path, ...ids) => { const h = C.blankHero('P'); h.path = path; for (const id of ids) { C.edit(h, { op: 'add', id }, { gm: true }); } h.gear.forEach((g) => { g.eq = true; }); return h; };
  const cost = (h, i, spell) => { const u = C.useOf(h, i, spell); assert.equal(u.ok, true, u.why); return u.horror; };
  assert.equal(cost(hero('Necromancer', 'gibbethand'), 0), 2, '3 becomes 2');
  assert.equal(cost(hero('Necromancer', 'ossuarydust'), 0), 2);
  assert.equal(cost(hero('Assassin', 'deadmanskey'), 0), 1, '2 becomes 1');
  assert.equal(cost(hero('Witch', 'gibbethand'), 0), 3, 'another path pays in full');
  assert.equal(cost(hero('', 'gibbethand'), 0), 3, 'no path pays in full');
  assert.equal(cost(hero('Necromancer', 'mourningnail'), 0), 2, 'an older relic has no path');
  assert.equal(cost(hero('Druid', 'thornantler'), 0, 'windcanticle'), 1, 'a Druidic grimoire\'s spell is not a path relic');
  for (const i of relics) assert.ok(i.horror >= 2, i.id + ': every path relic costs at least 2, so its own path always pays less');
  const acts = C.actions(hero('Witch', 'waxpoppet')); assert.equal(acts[0].horror, 2, 'the sheet\'s Ready to use shows the lower cost');
});

test('AT THE TABLE: the path is saved with the hero, shown to everyone like the calling, and named in the Activity line', async () => {
  const { t, ann, thorne, at } = await setup([d20(5)], 'waxpoppet');
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'path', value: 'Witch' } })).status, 200);
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'path', value: 'Pirate' } })).status, 400);
  const bob = await t.join('Bob'); assert.equal(charNamed((await bob.get()).body.state, 'Thorne').path, 'Witch');
  const r = await ann.cmd({ type: 'useItem', charId: thorne.id, index: at }); assert.equal(r.status, 200);
  assert.equal(r.body.state.horror.cur, 2, 'the Wax Poppet costs 3, 2 on its own path');
  assert.match(r.body.state.log.map((e) => e.text).join(' | '), /own path: 1 less Horror/);
});
