// The Rising Horror's arithmetic (site/vtt/rules.js): what an amount is, how a rolled amount is worked out, and how the meter moves and crosses its thresholds.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../site/vtt/rules.js';

const R = globalThis.SacramentRules;

test('the numbers: a meter from 0 to 21, with thresholds at 7, 14 and 21, each with its own line', () => {
  assert.equal(R.HORROR.max, 21); assert.deepEqual(R.HORROR.thresholds, [7, 14, 21]);
  for (const t of R.HORROR.thresholds) assert.match(R.HORROR.lines[t], /^The Horror /);
});

test('an amount is a whole number or dice; 0, nothing, or nonsense is no amount', () => {
  assert.deepEqual(R.horrorSpec(3), { fixed: 3 }); assert.deepEqual(R.horrorSpec('2'), { fixed: 2 });
  assert.deepEqual(R.horrorSpec('d6'), { count: 1, sides: 6, plus: 0 }); assert.deepEqual(R.horrorSpec('d4+2'), { count: 1, sides: 4, plus: 2 }); assert.deepEqual(R.horrorSpec('2d4'), { count: 2, sides: 4, plus: 0 });
  for (const v of [0, '0', null, undefined, '', 'None', 'd5', 'd4-1', -2, 1.5]) assert.equal(R.horrorSpec(v), null, String(v));
  assert.equal(R.sayHorrorAmount('d4+2'), 'd4+2'); assert.equal(R.sayHorrorAmount(3), '3'); assert.equal(R.sayHorrorAmount('2d4'), '2d4');
});

test('a fixed amount is itself; a rolled amount uses the dice it is given and says how it was made', () => {
  assert.deepEqual(R.rollHorror(3, () => { throw new Error('a fixed amount rolls nothing'); }), { amount: 3, rolled: null, text: '3' });
  const r = R.rollHorror('d4+2', (sides) => { assert.equal(sides, 4); return 3; }); assert.equal(r.amount, 5); assert.deepEqual(r.rolled, [3]); assert.equal(r.text, '5 (d4+2: 3 + 2)');
  const two = R.rollHorror('2d4', () => 4); assert.equal(two.amount, 8); assert.equal(two.text, '8 (2d4: 4 + 4)');
  assert.equal(R.rollHorror(0, () => 1), null); assert.equal(R.rollHorror('None', () => 1), null);
});

test('the meter: it moves by the amount, never below 0 or above 21, and names each threshold passed on the way up', () => {
  assert.deepEqual(R.horrorMove(5, 1), { from: 5, to: 6, applied: 1, crossed: [], arrived: false });
  assert.deepEqual(R.horrorMove(6, 1).crossed, [7], 'reaching 7 exactly counts');
  assert.deepEqual(R.horrorMove(5, 10).crossed, [7, 14], 'passing two at once announces both');
  const top = R.horrorMove(19, 6); assert.deepEqual([top.to, top.applied, top.arrived], [21, 2, true]); assert.deepEqual(top.crossed, [21]);
  assert.deepEqual(R.horrorMove(21, 3), { from: 21, to: 21, applied: 0, crossed: [], arrived: true }, 'at 21 it stays at 21');
  const down = R.horrorMove(15, -20); assert.deepEqual([down.to, down.applied], [0, -15]); assert.deepEqual(down.crossed, [], 'going down crosses nothing');
  assert.deepEqual(R.horrorMove(7, 0).crossed, [], 'standing on a threshold is not crossing it again');
});
