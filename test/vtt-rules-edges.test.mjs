// More checks of the game arithmetic: the edges, where mistakes usually hide. Dice, Effort, Hearts and HP, Targets, turns and timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
import { seededRng } from '../netlify/functions/_shared/vtt-core.mjs';
const R = globalThis.SacramentRules;

test('dice: a d20 outside 1 to 20 is refused, and every value from 1 to 20 is accepted', () => {
  for (const bad of [0, 21, -1, 100]) assert.throws(() => R.check({ d20: bad, stat: 0, target: 12 }), /1 to 20/, 'd20 ' + bad);
  for (let d = 1; d <= 20; d++) assert.equal(R.check({ d20: d, stat: 0, target: 12 }).d20, d);
});

test('dice: the server’s dice are repeatable for the same table and action, differ between actions, and spread over every face', () => {
  const a = seededRng('secret', 'act.1'), b = seededRng('secret', 'act.1');
  assert.deepEqual([a(), a(), a()], [b(), b(), b()], 'the same action rolls the same numbers (so a resent command cannot re-roll)');
  const c = seededRng('secret', 'act.2'); assert.notEqual(seededRng('secret', 'act.1')(), c(), 'another action rolls differently');
  assert.notEqual(seededRng('secret', 'x')(), seededRng('other', 'x')(), 'another table rolls differently');
  const seen = new Set(); let lo = 1, hi = 0;
  for (let i = 0; i < 4000; i++) { const v = seededRng('secret', 'id' + i)(); lo = Math.min(lo, v); hi = Math.max(hi, v); seen.add(1 + Math.floor(v * 20)); }
  assert.ok(lo >= 0 && hi < 1, 'always in [0, 1): ' + lo + ' to ' + hi);
  assert.equal(seen.size, 20, 'all 20 faces of a d20 come up');
});

test('stat checks: a stat and a bonus add, are held to ±10, and a missing number counts as 0', () => {
  assert.equal(R.check({ d20: 10, stat: 3, bonus: 2, target: 12 }).mod, 5);
  assert.equal(R.check({ d20: 10, stat: 9, bonus: 9, target: 12 }).mod, 10);
  assert.equal(R.check({ d20: 10, stat: -9, bonus: -9, target: 12 }).mod, -10);
  assert.equal(R.check({ d20: 10, target: 12 }).mod, 0);
  assert.equal(R.check({ d20: 10, stat: 'abc', target: 12 }).mod, 0);
});

test('stat checks: a natural 20 and a natural 1 are flagged, and neither changes whether the total meets the Target', () => {
  const hi = R.check({ d20: 20, stat: -10, target: 40 }), lo = R.check({ d20: 1, stat: 10, target: 5 });
  assert.equal(hi.nat20, true); assert.equal(hi.success, false, 'a 20 does not win by itself');
  assert.equal(lo.nat1, true); assert.equal(lo.success, true, 'a 1 does not lose by itself');
  assert.equal(R.check({ d20: 19, stat: 0, target: 12 }).nat20, false);
});

test('targets: Easy lowers by 3, Hard raises by 3, the Target never drops below 1, and an unknown word means Normal', () => {
  assert.equal(R.targetFor(12, 'easy'), 9); assert.equal(R.targetFor(12, 'normal'), 12); assert.equal(R.targetFor(12, 'hard'), 15);
  assert.equal(R.targetFor(2, 'easy'), 1); assert.equal(R.targetFor(0, 'easy'), 1); assert.equal(R.targetFor(-5, 'normal'), 1);
  assert.equal(R.targetFor(12, 'bogus'), 12); assert.equal(R.targetFor('12', 'hard'), 15);
  const c = R.check({ d20: 9, stat: 0, target: 12, adj: 'easy' });
  assert.equal(c.target, 9); assert.equal(c.baseTarget, 12); assert.equal(c.success, true);
  assert.match(R.sayCheck(c, 'DEX'), /Target 9 \(EASY, from 12\)/);
});

test('Effort: each kind uses its own die, its own bonus is added, and a roll outside the die is refused', () => {
  const dice = { basic: 4, weapons: 6, guns: 8, magic: 10, ultimate: 12 };
  for (const [cat, size] of Object.entries(dice)) {
    const e = R.effort({ cat, rolled: size, bonus: 2 });
    assert.equal(e.die, size); assert.equal(e.total, size + 2); assert.equal(e.cat, cat);
    assert.throws(() => R.effort({ cat, rolled: size + 1 }), new RegExp('1 to ' + size));
    assert.throws(() => R.effort({ cat, rolled: 0 }));
  }
  assert.equal(R.effort({ cat: 'nonsense', rolled: 3 }).cat, 'basic', 'an unknown kind is treated as basic');
  assert.equal(R.effort({ cat: 'weapons', rolled: 3, bonus: 99 }).bonus, 10, 'a bonus is held to +10');
  assert.equal(R.effort({ cat: 'weapons', rolled: 3, bonus: -4 }).bonus, 0, 'a bonus is never negative');
  assert.equal(R.sayEffort(R.effort({ cat: 'weapons', rolled: 4, bonus: 3 })), 'd6 4 + 3 Weapons = 7 Effort.');
  assert.equal(R.sayEffort(R.effort({ cat: 'basic', rolled: 2 })), 'd4 2 = 2 Effort.');
});

test('Effort: a table can change a die size, but only to a real die; anything else falls back', () => {
  assert.equal(R.effort({ cat: 'magic', rolled: 8, settings: { dice: { magic: 8 } } }).die, 8);
  assert.equal(R.settingsOf({ dice: { magic: 7 } }).dice.magic, 10);
  assert.equal(R.settingsOf({ dice: { guns: 'x' } }).dice.guns, 8);
  assert.equal(R.settingsOf(null).nat20Ultimate, true); assert.equal(R.settingsOf({ nat20Ultimate: false }).nat20Ultimate, false);
});

test('Hearts: ten points to a Heart, a part-Heart counts as a Heart, and nothing is below 0', () => {
  const cases = [[0, 0], [1, 1], [9, 1], [10, 1], [11, 2], [20, 2], [21, 3], [30, 3], [-5, 0], [100, 10]];
  for (const [points, hearts] of cases) assert.equal(R.hearts(points), hearts, points + ' points');
  assert.equal(R.HEART, 10);
});

test('HP: a change stops at 0 and at the maximum, and reports only what really moved', () => {
  assert.deepEqual(R.change(10, 10, -3), { cur: 7, applied: -3 });
  assert.deepEqual(R.change(2, 10, -5), { cur: 0, applied: -2 });
  assert.deepEqual(R.change(8, 10, 5), { cur: 10, applied: 2 });
  assert.deepEqual(R.change(0, 10, -1), { cur: 0, applied: 0 });
  assert.deepEqual(R.change(10, 10, 1), { cur: 10, applied: 0 });
  assert.deepEqual(R.change(5, 10, 0), { cur: 5, applied: 0 });
  assert.deepEqual(R.change('5', '10', '-2'), { cur: 3, applied: -2 }, 'numbers typed into a box arrive as text');
});

test('turns: the order goes forward and wraps into a new round, and going back undoes it', () => {
  assert.deepEqual(R.nextTurn(3, 0, 1), { idx: 1, round: 1, newRound: false });
  assert.deepEqual(R.nextTurn(3, 2, 1), { idx: 0, round: 2, newRound: true });
  assert.deepEqual(R.nextTurn(1, 0, 4), { idx: 0, round: 5, newRound: true }, 'a single place is a new round every turn');
  assert.deepEqual(R.nextTurn(0, 0, 1), { idx: 0, round: 1, newRound: false }, 'nobody in the order: nothing moves');
  assert.deepEqual(R.previousTurn(3, 1, 1), { idx: 0, round: 1, newRound: false });
  assert.deepEqual(R.previousTurn(3, 0, 2), { idx: 2, round: 1, newRound: false });
  assert.deepEqual(R.previousTurn(3, 0, 1), { idx: 2, round: 1, newRound: false }, 'never back past round 1');
});

test('timers: an automatic timer loses 1 a round, stops at 0 and says so once; paused and manual ones stay put', () => {
  const t = [{ cur: 2, auto: true }, { cur: 2, auto: true, paused: true }, { cur: 2, auto: false }, { cur: 0, auto: true }];
  assert.deepEqual(R.tickTimers(t), [{ i: 0, before: 2, after: 1, fired: false }]);
  assert.deepEqual(t.map((x) => x.cur), [1, 2, 2, 0]);
  assert.deepEqual(R.tickTimers(t), [{ i: 0, before: 1, after: 0, fired: true }]);
  assert.deepEqual(R.tickTimers(t), [], 'at 0 it does not fire again');
  assert.deepEqual(t.map((x) => x.cur), [0, 2, 2, 0]);
});
