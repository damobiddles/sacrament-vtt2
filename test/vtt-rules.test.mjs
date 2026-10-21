import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';
const R = globalThis.SacramentRules;

test('a stat check reads as the sentence a table reads aloud', () => {
  const c = R.check({ d20: 12, stat: 2, target: 13 });
  assert.equal(c.total, 14); assert.equal(c.target, 13); assert.equal(c.success, true);
  assert.equal(R.sayCheck(c, 'STR'), '12 + 2 STR = 14 against Target 13. Success.');
  assert.equal(R.sayCheck(R.check({ d20: 5, stat: 2, target: 13 }), 'STR'), '5 + 2 STR = 7 against Target 13. Miss.');
});
test('the Target meets the total exactly: meeting it succeeds, one short misses', () => {
  assert.equal(R.check({ d20: 10, stat: 3, target: 13 }).success, true); assert.equal(R.check({ d20: 9, stat: 3, target: 13 }).success, false);
});
test('EASY lowers the Target by 3, HARD raises it by 3, NORMAL leaves it; the sentence says so', () => {
  assert.equal(R.targetFor(12, 'easy'), 9); assert.equal(R.targetFor(12, 'hard'), 15); assert.equal(R.targetFor(12, 'normal'), 12); assert.equal(R.targetFor(12), 12); assert.equal(R.targetFor(2, 'easy'), 1);
  const c = R.check({ d20: 10, stat: 0, target: 12, adj: 'hard' }); assert.equal(c.target, 15); assert.equal(c.success, false); assert.match(R.sayCheck(c, 'DEX'), /Target 15 \(HARD, from 12\)/);
});
test('a natural 20 offers Ultimate Effort (the table can switch that off); a 20 or a 1 changes nothing else, because no such rule is established', () => {
  const hi = R.check({ d20: 20, stat: -3, target: 30 }); assert.equal(hi.nat20, true); assert.equal(hi.offerUltimate, true); assert.equal(hi.success, false, 'success is only the total meeting the Target');
  assert.equal(R.check({ d20: 20, stat: 0, target: 5, settings: { nat20Ultimate: false } }).offerUltimate, false);
  assert.equal(R.check({ d20: 1, stat: 10, target: 5 }).success, true); assert.equal(R.check({ d20: 1, stat: 0, target: 5 }).nat1, true);
  assert.deepEqual(Object.keys(R.settingsOf({ nat20AutoSuccess: true, nat1AutoFail: true })).sort(), ['dice', 'nat20Ultimate']);
});
test('a stat and bonus never count for more than +10, and a d20 shows 1 to 20', () => {
  assert.equal(R.check({ d20: 10, stat: 8, bonus: 9, target: 5 }).mod, 10);
  assert.throws(() => R.check({ d20: 0, stat: 0, target: 5 })); assert.throws(() => R.check({ d20: 21, stat: 0, target: 5 }));
});
test('Effort: the die for its kind plus the hero’s bonus in that kind', () => {
  assert.deepEqual(R.CATS.map((k) => R.settingsOf({}).dice[k]), [4, 6, 8, 10, 12]);
  const e = R.effort({ cat: 'weapons', rolled: 4, bonus: 2 }); assert.equal(e.die, 6); assert.equal(e.total, 6); assert.equal(R.sayEffort(e), 'd6 4 + 2 Weapons = 6 Effort.');
  assert.throws(() => R.effort({ cat: 'basic', rolled: 5, bonus: 0 }), /d4 shows 1 to 4/); assert.equal(R.effort({ cat: 'ultimate', rolled: 12, bonus: 1 }).total, 13);
  assert.equal(R.effort({ cat: 'magic', rolled: 8, bonus: 0, settings: { dice: { magic: 8 } } }).die, 8, 'a table can set its own die');
  assert.equal(R.settingsOf({ dice: { magic: 7 } }).dice.magic, 10, 'a die that is not a die is ignored');
});
test('HP and task progress count in points, ten to a Heart, and a change stops at the ends and reports what really moved', () => {
  assert.equal(R.hearts(10), 1); assert.equal(R.hearts(11), 2); assert.equal(R.hearts(0), 0);
  assert.deepEqual(R.change(8, 10, -5), { cur: 3, applied: -5 }); assert.deepEqual(R.change(3, 10, -5), { cur: 0, applied: -3 }); assert.deepEqual(R.change(8, 10, 5), { cur: 10, applied: 2 });
});
test('the turn moves clockwise; passing the last place begins a new round; the first place goes back round', () => {
  assert.deepEqual(R.nextTurn(3, 0, 1), { idx: 1, round: 1, newRound: false }); assert.deepEqual(R.nextTurn(3, 2, 1), { idx: 0, round: 2, newRound: true });
  assert.deepEqual(R.previousTurn(3, 0, 2), { idx: 2, round: 1, newRound: false }); assert.equal(R.nextTurn(0, 0, 4).newRound, false);
});
test('round timers: automatic ones lose 1 as a round begins, paused ones and manual ones do not, none goes below 0, and the tick to 0 is reported once', () => {
  const t = [{ cur: 2, auto: true }, { cur: 2, auto: false }, { cur: 2, auto: true, paused: true }, { cur: 0, auto: true }];
  let r = R.tickTimers(t); assert.deepEqual(t.map((x) => x.cur), [1, 2, 2, 0]); assert.equal(r.length, 1); assert.equal(r[0].fired, false);
  r = R.tickTimers(t); assert.equal(t[0].cur, 0); assert.equal(r[0].fired, true); assert.equal(t[0].fired, true);
  r = R.tickTimers(t); assert.equal(r.length, 0, 'nothing happens at 0'); assert.equal(t[0].cur, 0);
});
