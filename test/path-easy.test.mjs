// Paths (the owner's decision, 2026-11-11): once a scene, a check that fits the hero's path is Easy. At the table the player says so and the GM judges whether it fits;
// in the solo game each path names one score and its first check on that score in a scene is Easy. Never on attacks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { table, d20, find, charNamed } from './vtt-helpers.mjs';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'vtt/tally.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'solo/engine.js']) require('../site/' + f);
const R = globalThis.SacramentRules, C = globalThis.SacramentSheetCore, G = globalThis.SACRAMENT_GEAR, S = globalThis.SacramentSolo;
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };

test('rules: every path names one score; easier steps Hard to normal and normal to Easy', () => {
  for (const p of G.paths) assert.ok(R.STATS.includes(p.score), p.name + ' names a score');
  assert.equal(C.pathScore({ path: 'Knight' }), 'STR'); assert.equal(C.pathScore({ path: '' }), '');
  assert.equal(R.easier('normal'), 'easy'); assert.equal(R.easier('hard'), 'normal'); assert.equal(R.easier('easy'), 'easy');
});

test('TABLE: a check that fits your path is Easy once a scene; the GM can refresh it; never on an attack; no path, no Easy', async () => {
  const t = await table({ dice: [d20(10), d20(10), d20(10), d20(10)] }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  const ghoul = find(await t.state(), 'Pit Ghoul').id;
  const none = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', path: true }); assert.equal(none.status, 400); assert.match(none.body.error.message, /no path/);
  assert.equal((await ann.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'path', value: 'Knight' } })).status, 200);
  const atk = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul, path: true }); assert.equal(atk.status, 400, 'not on an attack');
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', path: true }); assert.equal(r.status, 200);
  assert.equal(r.body.state.rolls.at(-1).check.adj, 'easy');
  assert.match(r.body.state.log.at(-1).text, /\(path, Knight: Easy\)/);
  assert.equal(r.body.state.chars[thorne.id].usedPowers['path:easy'] != null, true, 'the player sees it is spent');
  const again = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', path: true }); assert.equal(again.status, 400); assert.match(again.body.error.message, /already/);
  const st = await t.state(); assert.equal((await t.gm.cmd({ type: 'scenePowerReset', id: st.table.scene.id })).status, 200);
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', path: true, adj: 'hard' })).body.state.rolls.at(-1).check.adj, 'normal', 'Hard becomes normal');
});

test('SOLO: the first check on the path\'s score in a scene is Easy, and says so; the second is not; another score is not', () => {
  const seen = [];
  const adv = { id: 'p', title: 'Path test', target: 12, start: 'a', rooms: {
    a: { name: 'A room', short: 'a', text: 'A room.', actions: [{ id: 'lift', label: 'Lift', run: (api) => { seen.push(api.check('STR', { what: 'Lifting' }).adj); } }, { id: 'look', label: 'Look', run: (api) => { seen.push(api.check('WIS', { what: 'Looking' }).adj); } }, { id: 'on', label: 'On', run: (api) => api.go('b') }] },
    b: { name: 'B room', short: 'b', text: 'B room.', actions: [{ id: 'lift', label: 'Lift', run: (api) => { seen.push(api.check('STR', { what: 'Lifting' }).adj); } }] } } };
  const hero = C.cleanHero({ name: 'Ser Test', path: 'Knight', stats: { STR: 2, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }, effort: { basic: 1, weapons: 1, guns: 0, magic: 0, ultimate: 0 }, gear: [] });
  const s = S.start(hero, adv, fixed([15]));
  S.act(s, adv, 'do look', fixed([15])); S.act(s, adv, 'do lift', fixed([15])); S.act(s, adv, 'do lift', fixed([15]));
  S.act(s, adv, 'do on', fixed([15])); S.act(s, adv, 'do lift', fixed([15]));
  assert.deepEqual(seen, ['normal', 'easy', 'normal', 'easy'], 'WIS is not a Knight\'s; STR is Easy once in each scene');
  assert.match(s.log.map((l) => l.t).join('\n'), /Your path \(Knight\) fits that check: it was Easy, once this scene\./);
});
