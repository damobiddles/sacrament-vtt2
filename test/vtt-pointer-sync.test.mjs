// Pointing is not a change to the table: a pointer that moves leaves the table's version (v) alone and moves its own (pv), and a screen that asks "anything new?"
// is sent only the pointers. (Each move used to count as a change, so while someone pointed every screen downloaded and redrew the whole table up to four times a second.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { table } from './vtt-helpers.mjs';

test('POINTER: a move does not change the table version; a screen up to date is sent just the pointers', async () => {
  const t = await table(); const p = await t.join('Ann');
  const get = (q) => t.svc.handle({ method: 'GET', query: Object.assign({ code: t.code }, q), token: p.token });
  const first = await get({}); const v = first.body.state.v, pv = first.body.state.pv;
  assert.equal(typeof pv, 'number');
  const moved = await t.gm.cmd({ type: 'point', x: 30, y: 40 }); assert.equal(moved.status, 200);
  const after = await get({}); assert.equal(after.body.state.v, v, 'the table version did not move'); assert.ok(after.body.state.pv > pv);

  const r = await get({ since: v, pv });
  assert.equal(r.body.unchanged, true); assert.equal(r.body.state, undefined, 'the table itself is not sent');
  assert.equal(r.body.pointers.gm.x, 30); assert.equal(r.body.pv, after.body.state.pv);
  const quiet = await get({ since: v, pv: after.body.state.pv });
  assert.deepEqual(Object.keys(quiet.body).sort(), ['unchanged', 'v'], 'nothing new at all: nothing but that');

  /* a real change still moves the table version */
  await t.gm.cmd({ type: 'setTarget', delta: 1 }); const later = await get({ since: v, pv: after.body.state.pv });
  assert.ok(later.body.state && later.body.state.v > v);
});
