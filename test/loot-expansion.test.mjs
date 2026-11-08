import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
import { table, charNamed } from './vtt-helpers.mjs';
import { lootCatalogue } from '../scripts/lib/loot-catalogue.mjs';
const G = globalThis.SACRAMENT_GEAR, C = globalThis.SacramentSheetCore;
const original = [...G.items, ...G.relics, ...G.grimoires, ...G.found.slice(0, 47)];
const added = G.found.slice(47, 142);  // the 2026-11-01 expansion and grimoires; the path relics (2026-11-08) come after and are tested in path-relics.test
const pathRelics = G.found.filter(i => i.table === 'pathrelics');
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
// Owner decision 2026-11-06: story spells and items gained "tags" and "needs" (what each is good for). They are locked by the catalogue fingerprint in
// current-rules-audit.test; here they are set aside so these fingerprints still prove that nothing else about an item or spell moved.
const untag = ({ tags, needs, ...rest }) => rest;
// The numbers that lead to a sub-table, from the main d100 down (a table reached from another table needs its parent's number first).
const route = (tab) => tab.on ? [...route(G.tables.find(t => t.id === tab.on)), tab.loot[0]] : [tab.loot[0]];

test('the expansion doubles each item category with stable catalogue definitions and every spell', () => {
  // Owner decision 2026-11-01: six more grimoires (two each for Energy, Druidic and Necromancy) were added after the expansion.
  assert.equal(C.items.length, 184 + pathRelics.length);
  assert.equal(pathRelics.length, 100);
  assert.equal(added.length, 95);
  for (const [kind, total] of Object.entries({ weapon: 28, armour: 14, supply: 92, relic: 28 })) {
    assert.equal(C.items.filter(i => i.kind === kind && i.table !== 'pathrelics').length, total, kind);
    assert.equal(added.filter(i => i.kind === kind).length, total / 2, kind);
  }
  assert.equal(C.items.filter(i => i.kind === 'grimoire').length, 22);
  // The reviewed power definitions, area/scene limits and crossbow accuracy are included.
  // Approved equipment updates changed book costs, armour roles and ordinary weapons to Weapons d6.
  // Audit corrections: sling ranges and Black Candle detection now match their existing text.
  // This fingerprint locks the reviewed definitions, including the owner-approved Close/Near/Far/Very Far ranges; playtest-approved healing targets, Horror costs and explanations are included.
  assert.equal(hash(original.map(i => { const copy = untag(i); delete copy.loot; delete copy.table; return copy; })), '8bab618847fd8b1dd98e5686ee0b1514c8df3b23624980441625293b1dc439cb');
  // The original 23 spell mechanics are unchanged; the owner approved 20 new themed spells.
  // Owner decision 2026-11-01: every spell's wording was rewritten; the rest of each original spell is still locked.
  assert.equal(hash(G.spells.slice(0,23).map(untag).map(({ does, ...rules }) => rules)), '76303b6f6000a06080cbf471efbccd15b95b425a65900201220632491ada8ec7');
  assert.equal(hash(G.spells.map(untag)), 'a4e36ead81334f9fd57b31813ae838b6ad6111328ab3051f5d3c74dfa23585e9');
});

test('every new find is reachable at both range boundaries, visible in the public reference, and GM-awarded only', () => {
  const html = lootCatalogue(G);
  const seen = new Set();
  for (const tab of G.tables) {
    for (let n = 1; n <= tab.die; n++) {
      if (C.lootEntry(n, tab.id).table) continue;   // leads on into another sub-table, which this loop rolls in its turn
      const result = C.rollLoot(() => { throw Error('all dice were supplied'); }, [...route(tab), n]);
      assert.equal(result.ok, true, tab.id + ':' + n);
      seen.add(result.item.id);
    }
  }
  assert.equal(seen.size, 250); // The binding seal is the 251st find, awarded directly on 100.
  for (const item of added) {
    assert.ok(seen.has(item.id), item.id);
    assert.ok(html.includes('id="item-' + item.id + '"'), item.id);
    for (const n of item.loot) assert.equal(C.rollLoot(() => 1, [...route(G.tables.find(t => t.id === item.table)), n]).item.id, item.id);
    const hero = C.blankHero('Expansion test');
    assert.equal(C.edit(hero, { op: 'add', id: item.id }, { gm: false }).ok, false, item.id);
    assert.equal(C.edit(hero, { op: 'add', id: item.id }, { gm: true }).ok, true, item.id);
    if (item.kind === 'grimoire') {
      assert.deepEqual(C.makeCustom(C.designOf(item)).spells, item.spells, item.id);
      for (const spell of item.spells) assert.equal(C.useOf(hero, 0, spell).ok, true, item.id + ':' + spell);
    }
    if (item.effect && item.effect !== 'damage') assert.ok(!item.cat, item.id + ' must not offer damage');
  }
});

test('the main loot categories retain their original odds and all larger sub-tables use physical percentile dice', () => {
  assert.deepEqual(G.tables.map(t => [t.id, t.loot, t.die]), [
    ['grimoires', [96, 99], 100], ['supplies', [1, 35], 100], ['arms', [36, 58], 100], ['valuables', [59, 80], 100], ['relics', [81, 95], 100], ['pathrelics', [67, 100], 100]
  ]);
  assert.equal(G.tables.find(t => t.id === 'pathrelics').on, 'relics', 'the path relics are a share of the Relics table, so the main d100 odds do not move');
  assert.equal(C.rollLoot(() => 1, [100]).item.id, 'sealshard');
});

test('new finds roll and reach a hero through the server without revealing private notes', async () => {
  const t = await table(), player = await t.join('Expansion player');
  const hero = charNamed(await t.state(), 'Thorne');
  for (const id of ['tithemaul', 'watchjack', 'sailneedle', 'silverclasp', 'vigilcoal', 'lowdoors']) {
    const item = C.item(id), tab = G.tables.find(t => t.id === item.table);
    const rolled = await t.gm.cmd({ type: 'lootRoll', ns: [tab.loot[0], item.loot[0]] });
    assert.equal(rolled.status, 200); assert.equal(rolled.body.result.itemId, id);
    const given = await t.gm.cmd({ type: 'sheet', charId: hero.id, op: { op: 'add', id } });
    assert.equal(given.status, 200, id);
  }
  const state = await t.state();
  assert.deepEqual(charNamed(state, 'Thorne').gear.map(i => i.id), ['tithemaul', 'watchjack', 'sailneedle', 'silverclasp', 'vigilcoal', 'lowdoors']);
  assert.doesNotMatch(JSON.stringify((await player.get()).body), /Loot roll/);
});
