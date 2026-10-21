import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Bringing an earlier-rules character over to Sacrament's current rules (site/legacy/migrate.js). The old character is never changed.
const ctx = { window: {} }; vm.createContext(ctx);
const load = (p) => vm.runInContext(readFileSync(new URL('../site/' + p, import.meta.url), 'utf8'), ctx);
['legacy/data.js', 'legacy/rules.js'].forEach(load);
const OLD = ctx.window.SAC_DATA, SacRules = ctx.window.SacRules;
ctx.window.OLDDATA = OLD; ['sheet/gear.js', 'game/data.js', 'game/fx.js', 'game/engine.js', 'legacy/migrate.js'].forEach(load);
// the old library lives under SAC_DATA, the new one under HEARTS_DATA
const NEW = ctx.window.HEARTS_DATA, Engine = ctx.window.HeartsEngine;
const M = ctx.window.HeartsMigrate(OLD, SacRules, NEW, Engine), E = Engine(NEW);
const stores = JSON.parse(readFileSync(new URL('./fixtures/stores.json', import.meta.url), 'utf8'));
const chars = Object.values(stores).map((s) => s.chars[s.current]);
const J = (x) => JSON.parse(JSON.stringify(x));

test('there are three saved characters to work with', () => { assert.equal(chars.length, 3); });
test('readOld finds the builder’s characters and the table sheet, and ignores junk', () => {
  const store = { data: { 'sacrament-builder-v1': JSON.stringify(stores['Sister Maren']), 'sacrament-sheet-v2': JSON.stringify(Object.assign({ harm: 5 }, chars[1])) }, getItem(k) { return this.data[k] || null; } };
  const found = M.readOld(store); assert.deepEqual(J(found.map((f) => f.source)), ['the character builder', 'the table sheet']);
  assert.deepEqual(J(M.readOld({ getItem: () => '{not json' })), []); assert.deepEqual(J(M.readOld({ getItem: () => null })), []);
  assert.deepEqual(J(M.readOld({ getItem: (k) => (k === 'sacrament-builder-v1' ? JSON.stringify({ chars: { a: 7, b: null, c: { pack: 'x' } } }) : null) })), []);
});
test('describe reads the old character through the old rules', () => {
  const d = M.describe(chars[0]); assert.equal(d.name, 'Sister Maren'); assert.ok(d.abilities.length >= 3); assert.ok(d.gear.length >= 5); assert.ok(['Body', 'Mind', 'Spirit'].every((k) => Number.isInteger(d.scores[k])));
});
test('scores by rank: the best old score becomes +2, then +1, then +0; ties keep Body, Mind, Spirit order', () => {
  assert.deepEqual(J(M.spread({ Body: 3, Mind: 1, Spirit: 2 })), { Body: 2, Mind: 0, Spirit: 1 });
  assert.deepEqual(J(M.spread({ Body: 1, Mind: 1, Spirit: 1 })), { Body: 2, Mind: 1, Spirit: 0 });
  assert.deepEqual(J(M.spread({ Body: -1, Mind: 4, Spirit: 4 })), { Body: 0, Mind: 2, Spirit: 1 });
});
test('each saved character becomes a valid hero: spread, 1 Heart, ten slots, three relics and grimoires at most, nothing duplicated', () => {
  for (const raw of chars) {
    const r = M.convert(raw, {}), h = r.hero;
    assert.ok(E.validSpread(h.scores), raw.name + ' spread'); const hv = h.pack.filter((x) => x.id === 'harness').length * 10; assert.equal(h.max, 10 + hv); assert.equal(h.hp, 10 + hv);
    assert.ok(E.slotsUsed(h) <= 10, raw.name + ' slots'); assert.ok(E.startingKitOk(h), raw.name + ' relics');
    const ids = h.pack.map((p) => p.id); assert.equal(new Set(ids).size, ids.length, raw.name + ' no duplicates');
    assert.match(h.notes, new RegExp('Converted from ' + raw.name)); assert.equal(h.from, 'legacy:' + raw.id);
  }
});
test('the old character is not changed by looking at it or converting it', () => {
  for (const raw of chars) { const before = JSON.stringify(raw); M.describe(raw); M.convert(raw, {}); M.convert(raw, { skip: ['iw'] }); assert.equal(JSON.stringify(raw), before); }
});
test('what has no equivalent, or no room, is listed in the notes rather than lost', () => {
  const r = M.convert(chars[0], {}), left = r.left.map((l) => l.name);
  assert.ok(r.items.length >= 5); assert.ok(r.items.every((i) => i.kept || i.why));
  left.forEach((n) => assert.ok(r.notes.includes(n), n + ' is in the notes'));
  assert.match(r.notes, /Abilities you had:/);
});
test('equipped weapon and armour come first, and the person can leave an item out or choose the scores', () => {
  const d = M.describe(chars[0]), weapon = d.gear.find((g) => g.k === 'weapon' && g.equipped);
  const r = M.convert(chars[0], {}); assert.equal(r.items[0].from, weapon.u);
  const skipped = M.convert(chars[0], { skip: [weapon.u] }); assert.equal(skipped.items.find((i) => i.from === weapon.u).kept, false);
  const picked = M.convert(chars[0], { spread: { Body: 0, Mind: 1, Spirit: 2 } }); assert.equal(picked.hero.scores.WIS, 2); assert.equal(picked.hero.scores.CHA, 2);
});
test('a caster’s spells become a grimoire, a healer’s a litany', () => {
  const caster = J(chars[1]); caster.learned = OLD.nodes.filter((n) => n.type === 'spell' && n.path === 'Arcane' && n.level === 1).map((n) => n.id).slice(0, 1);
  const r = M.convert(caster, {}); assert.ok(r.hero.pack.some((p) => p.id === 'embers'));
  const healer = J(chars[2]); healer.learned = OLD.nodes.filter((n) => n.type === 'spell' && (n.heal || n.heals) && n.level <= 2).map((n) => n.id).slice(0, 1);
  assert.ok(M.convert(healer, {}).hero.pack.some((p) => p.id === 'litany'));
});
test('every old item has a mapping that points at a real item, or is deliberately without one', () => {
  for (const [old, [to]] of Object.entries(M.ITEMS)) assert.ok(E.item(to), old + ' → ' + to);
  const all = [...OLD.items.weapons, ...OLD.items.armour, ...OLD.items.trinkets, ...OLD.items.supplies];
  const none = all.filter((i) => !M.ITEMS[i.id]).map((i) => i.id);
  assert.deepEqual(J(none).sort(), ['s1', 's6', 's8', 't1', 't11', 't12', 't13', 't4', 't6', 't7'].sort(), 'only these have no equivalent');
});
test('hostile or broken saves convert without throwing', () => {
  const junk = [{ pack: { items: [{ k: 'weapon', id: '__proto__' }, { k: 'custom', n: 5 }, null, 4] }, learned: ['constructor', 7], name: { x: 1 } }, { pack: { items: [] }, learned: [] }, { pack: { gold: 'x', items: Array(200).fill({ k: 'weapon', id: 'w1' }) }, learned: [] }];
  junk.forEach((c) => { const r = M.convert(c, {}); assert.ok(E.slotsUsed(r.hero) <= 10); assert.ok(E.validSpread(r.hero.scores)); });
});
