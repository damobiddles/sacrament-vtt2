// The solo adventure (site/solo/): the engine plays the written scene with the table's own rules, and never changes the hero it was given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'solo/engine.js', 'solo/adventure-silent-bell.js']) require('../site/' + f);
const S = globalThis.SacramentSolo, A = globalThis.SacramentSoloAdventures['silent-bell'], T = globalThis.SacramentHeroTools, R = globalThis.SacramentRules;
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };

function playThrough(focus, seed) {
  const rnd = seeded(seed), die = (n) => 1 + Math.floor(rnd() * n), hero = T.generate(focus, rnd), before = JSON.stringify(hero), s = S.start(hero, A, die);
  for (let i = 0; i < 80 && !s.over; i++) {
    const ch = S.choices(s, A);
    const pick = ch.find((c) => c.kind === 'do') || ch.find((c) => c.kind === 'attack' || c.kind === 'push') || ch.find((c) => c.cmd === 'foe') || ch.find((c) => c.cmd === 'go down' && !s.flags.beat_eater) || ch.find((c) => c.cmd === 'go east') || ch.find((c) => c.cmd === 'go up') || ch.find((c) => c.cmd === 'go north') || ch[0];
    S.act(s, A, pick.cmd, die);
  }
  return { s, unchanged: JSON.stringify(hero) === before };
}

test('every ready-made hero can play the scene to an end, and the hero given to it is not changed', () => {
  for (const focus of ['fighter', 'scout', 'scholar', 'healer']) for (const seed of [1, 2, 5, 9, 11]) {
    const { s, unchanged } = playThrough(focus, seed);
    assert.ok(['won', 'dead'].includes(s.over), focus + ' seed ' + seed + ' did not finish');
    assert.ok(unchanged, 'the saved hero was changed');
    assert.ok(s.horror >= 0 && s.horror <= R.HORROR.max && s.hp.cur >= 0 && s.hp.cur <= s.hp.max);
  }
});

test('a missed attack offers a push, which costs 1 Horror; a natural 1 on the pushed attack costs 1 more', () => {
  const hero = T.generate('fighter', seeded(3));
  const s = S.start(hero, A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  assert.ok(s.fight, 'the Candle-Eater attacks in the crypt');
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([5, 1]));          // a miss, no natural 1
  assert.equal(s.horror, 0); assert.equal(s.fight.phase, 'push');
  const push = S.choices(s, A).find((c) => c.kind === 'push');
  S.act(s, A, push.cmd, fixed([1, 1, 1]));         // push (+1), natural 1 on the pushed attack (+1)
  assert.equal(s.horror, 2);
});

test('a plain check\'s natural 1 costs no Horror', () => {
  const s = S.start(T.generate('scout', seeded(4)), A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'do ledger', fixed([1]));
  assert.equal(s.horror, 0);
  assert.match(s.log.map((l) => l.t).join('\n'), /Target 12\. Miss/);
});

test('past the top of the meter the Horror is paid in blood, a d4 of HP per point', () => {
  const s = S.start(T.generate('fighter', seeded(6)), A, fixed([1]));
  s.horror = R.HORROR.max; const hp = s.hp.cur;
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([1, 3, 1]));          // natural 1 on an attack: 1 Horror that cannot go on the meter, paid with d4 = 3
  assert.equal(s.horror, R.HORROR.max);
  assert.ok(s.hp.cur <= hp - 3);
});

test('the offering box rolls on the real d100 loot table and the find goes to this copy of the hero', () => {
  const s = S.start(T.generate('fighter', seeded(8)), A, fixed([3, 1, 1, 1]));
  const gear = s.hero.gear.length; S.act(s, A, 'do box', fixed([3, 1, 1, 1]));
  assert.match(s.log.map((l) => l.t).join('\n'), /d100 3/);
  assert.equal(s.hero.gear.length, gear + 1);
});

test('typed commands become the same commands as the buttons', () => {
  const s = S.start(T.generate('fighter', seeded(2)), A, fixed([10]));
  assert.equal(S.parse(s, A, 'N'), 'go north');
  assert.equal(S.parse(s, A, 'talk to the woman'), 'do talk');
  assert.equal(S.parse(s, A, 'look'), 'look');
  assert.match(S.parse(s, A, 'dance'), /^\?/);
});

test('combat takes turns as at the table: a hit waits for Roll damage, then the hero ends the turn and the foe attacks', () => {
  const s = S.start(T.generate('fighter', seeded(3)), A, fixed([10]));
  S.act(s, A, 'go north', fixed([10])); S.act(s, A, 'go down', fixed([10]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([18]));
  assert.equal(s.fight.phase, 'damage');
  const reveal = s.log.filter((l) => l.outcome).pop().outcome;
  assert.equal(reveal.label, 'SUCCESS'); assert.ok(reveal.pendingDamage);
  assert.deepEqual(S.choices(s, A).map((c) => c.cmd), ['damage']);
  S.act(s, A, 'damage', fixed([2]));
  assert.equal(s.fight.phase, 'foe'); assert.ok(s.fight.hp.cur < s.fight.hp.max);
  S.act(s, A, 'foe', fixed([20, 3]));
  const foe = s.log.filter((l) => l.outcome).pop().outcome;
  assert.equal(foe.label, 'HIT'); assert.equal(foe.versus, 'Defence');
  assert.equal(s.fight.phase, 'hero'); assert.equal(s.fight.round, 2);
});
