// Each Horror threshold fires once an adventure (the owner's rule, 2026-11-09): after a rest or the GM lowers the meter, climbing past it again tells nobody,
// so resting never sets a threshold off twice. The GM's New adventure lets them fire again; undoing the rise that passed one un-fires it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table } from './vtt-helpers.mjs';

const alerts = (st, line) => st.log.filter((e) => e.kind === 'alert' && e.text === line).length;
const set = (t, value) => t.gm.cmd({ type: 'horror', mode: 'set', value });

test('ONCE: 7 alerts the GM the first time only; after it falls and climbs again, no second alert', async () => {
  const t = await table();
  let r = await set(t, 7); assert.equal(r.status, 200); assert.equal(alerts(r.body.state, 'The Horror stirs.'), 1); assert.deepEqual(r.body.state.horror.fired, [7]);
  assert.equal(r.body.state.horror.alert, 7);
  await set(t, 3); r = await set(t, 8);
  assert.equal(alerts(r.body.state, 'The Horror stirs.'), 1, 'not again'); assert.equal(r.body.state.horror.alert, 0); assert.deepEqual(r.body.result.crossed, []);
  r = await set(t, 14); assert.equal(alerts(r.body.state, 'The Horror draws near.'), 1, 'a new one still fires'); assert.deepEqual(r.body.state.horror.fired, [7, 14]);
});

test('ONCE: New adventure lets the thresholds fire again, leaves the meter alone, and needs something to have fired', async () => {
  const t = await table(), ann = await t.join('Ann');
  assert.equal((await t.gm.cmd({ type: 'horror', mode: 'newAdventure' })).status, 400, 'nothing has fired yet');
  await set(t, 7); await set(t, 0);
  assert.equal((await ann.cmd({ type: 'horror', mode: 'newAdventure' })).status, 403, 'only the GM');
  let r = await t.gm.cmd({ type: 'horror', mode: 'newAdventure' }); assert.equal(r.status, 200);
  assert.deepEqual(r.body.state.horror.fired, []); assert.equal(r.body.state.horror.cur, 0);
  assert.ok(r.body.state.log.some((e) => /A new adventure/.test(e.text)));
  r = await set(t, 7); assert.equal(alerts(r.body.state, 'The Horror stirs.'), 2, 'it fires again');
});

test('ONCE: undoing the rise that passed a threshold un-fires it, so the next climb announces it', async () => {
  const t = await table();
  let r = await set(t, 7); const line = r.body.state.log.find((e) => e.kind === 'horror');
  r = await t.gm.cmd({ type: 'undo', logId: line.id }); assert.equal(r.status, 200); assert.deepEqual(r.body.state.horror.fired, []);
  r = await set(t, 7); assert.equal(alerts(r.body.state, 'The Horror stirs.'), 2);
});
