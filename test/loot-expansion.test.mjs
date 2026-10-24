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
const added = G.found.slice(47);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

test('the expansion doubles each item category with stable catalogue definitions and every spell', () => {
  assert.equal(C.items.length, 178);
  assert.equal(added.length, 89);
  for (const [kind, total] of Object.entries({ weapon: 28, armour: 14, supply: 92, relic: 28, grimoire: 16 })) {
    assert.equal(C.items.filter(i => i.kind === kind).length, total, kind);
    assert.equal(added.filter(i => i.kind === kind).length, total / 2, kind);
  }
  // Approved equipment updates changed book costs, armour roles and ordinary weapons to Weapons d6.
  // This fingerprint locks the reviewed definitions, including the owner-approved Close/Near/Far/Very Far ranges; playtest-approved healing targets, Horror costs and explanations are included.
  assert.equal(hash(original.map(i => { const copy = { ...i }; delete copy.loot; delete copy.table; return copy; })), '25a4a2b7af84ae80592f77cdfa93863a2215cb65736230499429ed202b2f57e8');
  assert.equal(hash(G.spells), 'e1e9b6f5eac046a9a724fd578392a2d77ea5ecb1308c868e8ee7bb5b24324b5d');
});

test('every new find is reachable at both range boundaries, visible in the public reference, and GM-awarded only', () => {
  const html = lootCatalogue(G);
  const seen = new Set();
  for (const tab of G.tables) {
    for (let n = 1; n <= tab.die; n++) {
      const result = C.rollLoot(() => { throw Error('all dice were supplied'); }, [tab.loot[0], n]);
      assert.equal(result.ok, true, tab.id + ':' + n);
      seen.add(result.item.id);
    }
  }
  assert.equal(seen.size, 144); // The binding seal is the 145th find, awarded directly on 100.
  for (const item of added) {
    assert.ok(seen.has(item.id), item.id);
    assert.ok(html.includes('id="item-' + item.id + '"'), item.id);
    for (const n of item.loot) assert.equal(C.rollLoot(() => 1, [G.tables.find(t => t.id === item.table).loot[0], n]).item.id, item.id);
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
    ['grimoires', [96, 99], 100], ['supplies', [1, 35], 100], ['arms', [36, 58], 100], ['valuables', [59, 80], 100], ['relics', [81, 95], 100]
  ]);
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
