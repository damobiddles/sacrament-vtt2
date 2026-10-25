import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
import { lootCatalogue } from '../scripts/lib/loot-catalogue.mjs';
import { table, charNamed, die } from './vtt-helpers.mjs';
const G = globalThis.SACRAMENT_GEAR, C = globalThis.SacramentSheetCore;

test('every current grimoire has three distinct active spells and an explicit effect type', () => {
  for (const book of C.items.filter(i => i.kind === 'grimoire')) {
    assert.equal(book.spells.length, 3, book.name);
    assert.equal(new Set(book.spells).size, 3, book.name);
    for (const spell of C.spellsOf(book)) {
      assert.equal(spell.retired, undefined, spell.name);
      assert.ok(['damage', 'healing', 'esoteric'].includes(spell.effect), spell.name);
      if (spell.effect === 'damage') assert.ok(spell.cat && spell.effort, spell.name);
      else assert.ok(!spell.cat, spell.name + ' should not offer a damage roll');
    }
  }
});

test('three random spells use a fair six-sided die and cannot select a retired spell', () => {
  const book = C.item('untitled');
  assert.equal(book.pick, 3);
  assert.equal(book.pickDie, 6);
  assert.equal(C.spellsOf(book).length, 3);
});

test('healing tools and clearly esoteric finds do not offer damage', () => {
  for (const id of ['physician', 'stolepicks', 'fingerbone', 'wardenbell', 'ashenrosary', 'drownedlantern', 'houndtooth', 'stainedglass']) {
    assert.ok(!C.item(id).cat, id + ' still offers a damage roll');
  }
});

test('public loot reference lists every catalogue item, all tables and explicit spell effects', () => {
  const html = lootCatalogue(G);
  for (const item of C.items) assert.ok(html.includes('id="item-' + item.id + '"'), item.name);
  for (const t of G.tables) assert.ok(html.includes('id="table-' + t.id + '"'), t.name);
  for (const label of ['Damage', 'Healing', 'Esoteric effect']) assert.ok(html.includes(label));
  assert.ok(html.includes('43 different spells'));
  const hostile = structuredClone(G); hostile.items[0].name = '<script>bad()</script>';
  assert.ok(!lootCatalogue(hostile).includes('<script>bad()'));
});

test('a rolled grimoire keeps its three usable spells when given as custom loot', async () => {
  const t = await table(); const ch = charNamed(await t.state(), 'Thorne');
  const book = C.designOf(C.item('embers'));
  assert.equal(book.category, 'Grimoire');
  const r = await t.gm.cmd({ type: 'lootGive', charId: ch.id, item: { ...book, notes: 'PRIVATE CATALOGUE TEST' } });
  assert.equal(r.status, 200);
  const gear = charNamed(await t.state(), 'Thorne').gear[0];
  const copy = C.itemOf(gear);
  assert.equal(copy.kind, 'grimoire');
  assert.deepEqual(copy.spells, ['ember', 'kindle', 'pillarash']);
  assert.ok(!JSON.stringify(gear).includes('PRIVATE CATALOGUE TEST'));
  assert.equal(C.useOf({ gear: [{ ...gear, eq: true }] }, 0, 'ember').cat, 'magic');
  assert.equal((await t.gm.cmd({ type: 'lootSave', item: { ...book, spells: ['ember', 'ember', 'kindle'] } })).status, 400);
});

test('all six random-book die faces choose the intended three spells equally', async () => {
  for (let face = 1; face <= 6; face++) {
    const t = await table({ dice: [] }); const ch = charNamed(await t.state(), 'Thorne');
    const add = await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'add', id: 'untitled' } });
    assert.equal(add.status, 200);
    await t.gm.cmd({ type: 'sheet', charId: ch.id, op: { op: 'move', index: 0, eq: true } });
    t.queue(die(face, 6));
    const r = await t.gm.cmd({ type: 'useItem', charId: ch.id, index: 0 });
    assert.equal(r.status, 200);
    assert.equal(r.body.result.picked.spellId, ['watchingpage', 'borrowedface', 'doorinward'][Math.floor((face - 1) / 2)]);
  }
});
