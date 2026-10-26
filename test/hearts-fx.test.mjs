import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from '../scripts/hearts/sim.mjs';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// What items and spells do beyond their roll and Effort die is data (site/game/fx.js), so a new relic is a row of data and no new code.
const env = () => load(3);
const J = (x) => JSON.parse(JSON.stringify(x));
const sorted = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v));
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(readFileSync(new URL('../site/game/fx.js', import.meta.url), 'utf8'), ctx);
const F = ctx.window.HeartsFx;

test('every effect in the library is valid exactly as written', () => {
  const { D } = env();
  const cards = [...D.ITEMS, ...D.SPELLS].filter((c) => c.fx);
  assert.ok(cards.length >= 12, 'the library carries its effects');
  for (const c of cards) assert.equal(sorted(F.clean(c.fx)), sorted(c.fx), c.id + ' has fx the vocabulary rewrites or rejects');
});
test('the sanitiser keeps what it knows and drops the rest', () => {
  const out = F.clean([{ on: 'use', do: 'heal', dice: '1d8', kind: 'mend', target: 'ally', junk: 1 }, { on: 'nope', do: 'heal', dice: '1d8' }, { on: 'use', do: 'explode' }, { on: 'use', do: 'heal', dice: 'drop table' },
    { on: 'use', do: 'buff', to: 'defence' }, { on: 'use', do: 'status' }, { on: 'use', do: 'harm', dice: '1d20' }, null, 7, { on: '__proto__', do: 'constructor' }]);
  assert.equal(sorted(out), sorted([{ on: 'use', do: 'heal', dice: '1d8', kind: 'mend', target: 'ally' }]));
  assert.equal(F.clean(Array(30).fill({ on: 'use', do: 'tend' })).length, F.MAXFX);
  assert.deepEqual(J(F.clean('x')), []);
  assert.ok(F.clean([{ on: 'use', do: 'note', text: 'a\u0000b' + 'x'.repeat(300) }])[0].text.length <= 120);
});
test('every effect reads as a sentence', () => {
  const { D } = env(); for (const c of [...D.ITEMS, ...D.SPELLS]) for (const e of c.fx || []) assert.match(F.say(e), /\S/, c.id);
});

/* the proof that it is data: new items made of nothing but effects work without touching the engine */
function load2(D) { const c = { window: { HEARTS_DATA: D, HeartsFx: F } }; vm.createContext(c); vm.runInContext(readFileSync(new URL('../site/game/engine.js', import.meta.url), 'utf8'), c); return { D, E: c.window.HeartsEngine(D, (() => { let s = 9; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })()) }; }
const hero = (E, D, id) => E.newCharacter(D.CHARACTERS.find((c) => c.id === id));

test('a new relic made of effects tags every foe, with no new code', () => {
  const base = load(1); const D = JSON.parse(JSON.stringify(base.D));
  D.ITEMS.push({ id: 'saltbell', kind: 'relic', name: 'Salt bell', slots: 1, use: 'Action', roll: 'Spirit', horror: 1, does: 'Ring it and every foe is slowed.', fx: [{ on: 'use', do: 'status', tag: 'frozen', target: 'foes', until: 'round' }] });
  const { E } = load2(D), h = hero(E, D, 'maren'); E.addItem(h, 'saltbell');
  const hz = E.horror(), r = E.use({ horror: hz, scene: 12, turn: E.newTurn() }, h, 'saltbell', '', { d20: 19 });
  assert.equal(r.ok, true); assert.equal(hz.pos, 1); assert.equal(sorted(r.intents), sorted([{ k: 'status', who: 'foes', tag: 'frozen', until: 'round' }]));
});
test('a new healing item, bonus and cost made of effects behave like the built-in ones', () => {
  const base = load(1); const D = JSON.parse(JSON.stringify(base.D));
  D.ITEMS.push({ id: 'salve', kind: 'supply', name: 'Salve', slots: 1, use: 'Action', uses: 2, does: 'Heals an ally.', fx: [{ on: 'use', do: 'heal', dice: '1d6', kind: 'bandage', target: 'ally' }] });
  D.ITEMS.push({ id: 'thorn', kind: 'relic', name: 'Thorn crown', slots: 1, use: 'Free', horror: 1, does: 'Pain for power.', fx: [{ on: 'use', do: 'harm', dice: '1d4' }, { on: 'use', do: 'buff', to: 'check', n: 2, target: 'self' }] });
  D.ITEMS.push({ id: 'plume', kind: 'relic', name: 'Plume', slots: 1, use: 'Always', does: 'A showy guard.', fx: [{ on: 'always', do: 'buff', to: 'guard', n: 2 }] });
  const { E } = load2(D), a = hero(E, D, 'ottoline'), b = hero(E, D, 'aldric'); b.hp = 4; ['salve', 'thorn', 'plume'].forEach((i) => E.addItem(a, i));
  const r = E.use({ horror: E.horror(), scene: 12, turn: E.newTurn() }, a, 'salve', '', { target: b, d20: 20 });
  assert.ok(r.healed > 0 && b.hp > 4, 'the ally is healed'); assert.equal(a.pack.find((p) => p.id === 'salve').uses, 1);
  assert.equal(E.use({ horror: E.horror(), scene: 12 }, a, 'salve', '', { target: b, d20: 20 }).healed, 0, 'once per person per rest');
  const p = E.preRoll(a, E.horror(), 'thorn'); assert.equal(p.bonus, 2); assert.ok(p.damage >= 1 && p.damage <= 4);
  assert.equal(E.guardBonus(a), 4, 'a carried item that raises Guard by 2');
});
test('holy oil steps the Effort up against the unholy, and only against them', () => {
  const { E, D } = env(), h = hero(E, D, 'aldric'), hz = E.horror();
  assert.equal(E.effortAgainst(6, E.enemy('sexton'), 'weapon', h), 4, 'armoured, no oil: down one');
  E.use({ horror: hz, scene: 12, turn: E.newTurn() }, h, 'oil', '', { d20: 12 });
  assert.equal(E.effortAgainst(6, E.enemy('sexton'), 'weapon', h), 6, 'unholy and armoured, anointed: down one then up one');
  assert.equal(E.effortAgainst(6, E.enemy('rats'), 'weapon', h), 6, 'not unholy: the oil does nothing');
  assert.equal(E.effortAgainst(8, E.enemy('knight'), 'spell', h), 8, 'a spell is not a weapon');
  E.endScene([h]); assert.equal(E.effortAgainst(6, E.enemy('knight'), 'weapon', h), 4, 'the scene ends and so does the oil');
});
test('the Executioner’s blade strikes at d10 for 1 Horror, or once a scene at d12 for 3, from data', () => {
  const { E } = env(), h = E.newCharacter({ id: 'x', name: 'x', scores: { Body: 2, Mind: 1, Spirit: 0 }, kit: ['blade'] }), hz = E.horror(), foe = { def: E.enemy('rats'), hp: 99 };
  const a = E.use({ horror: hz, scene: 12 }, h, 'blade', '', { target: foe, d20: 12 }); assert.equal(hz.pos, 1); assert.equal(a.effort.die, 10);
  const b = E.use({ horror: hz, scene: 12 }, h, 'blade', '', { target: foe, d20: 12, mode: 'ultimate' }); assert.equal(hz.pos, 4); assert.equal(b.effort.die, 12);
  const c = E.use({ horror: hz, scene: 12 }, h, 'blade', '', { target: foe, d20: 12, mode: 'ultimate' }); assert.equal(c.ok, false); assert.equal(hz.pos, 4, 'the second ultimate is refused and costs nothing');
});
test('Bell and Censer tag the foes; Ward and Shield give an ally Defence; Spirits heal the drinker', () => {
  const { E, D } = env(), hz = E.horror(), t = () => E.newTurn();
  const o = hero(E, D, 'ottoline'); E.addItem(o, 'bell'); E.addItem(o, 'censer');
  assert.equal(sorted(E.use({ horror: hz, scene: 12, turn: t() }, o, 'bell', '', { d20: 18 }).intents), sorted([{ k: 'status', who: 'foes', tag: 'dazed', until: 'turn' }]));
  assert.equal(E.use({ horror: hz, scene: 12, turn: t() }, o, 'censer', '', { d20: 18 }).intents[0].tag, 'censer');
  const m = hero(E, D, 'maren'); assert.equal(sorted(E.use({ horror: hz, scene: 12, turn: t() }, m, 'litany', 'ward', { d20: 18, target: hero(E, D, 'aldric') }).intents), sorted([{ k: 'buff', who: 'ally', to: 'defence', n: 2, step: 0, until: 'turn' }]));
  const a = hero(E, D, 'aldric'); E.addItem(a, 'spirits'); a.hp = 5; const r = E.use({ horror: hz, scene: 12, turn: t() }, a, 'spirits', '', {}); assert.ok(r.healed > 0 && a.hp > 5); assert.match(r.notes.join(' '), /Hard/);
});
