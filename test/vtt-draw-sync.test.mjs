// The drawing on the table is sent only to a screen that does not have it yet: each answer says which drawing it is (drawV), and a screen that says it has that
// one is sent the rest of the table without it. (It used to go with every answer: with a lot of drawing, about 200 KB a second for every person at the table.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { table } from './vtt-helpers.mjs';

const line = { type: 'draw', pts: [[10, 10], [20, 20], [30, 15]], color: '#e0b040' };

test('DRAWING: an answer to a screen that already has this drawing leaves it out; a changed drawing is sent again', async () => {
  const t = await table(); const p = await t.join('Ann');
  const get = (dv, token = p.token) => t.svc.handle({ method: 'GET', query: { code: t.code, dv }, token });
  let r = await get(''); assert.ok(Array.isArray(r.body.state.draw)); const dv0 = r.body.state.drawV, sceneId = r.body.state.table.scene.id; assert.equal(typeof dv0, 'number');
  r = await get(String(dv0)); assert.equal(r.body.state.draw, undefined, 'the same drawing is not sent again');

  await t.gm.cmd(line);
  r = await get(String(dv0)); assert.equal(r.body.state.draw.length, 1, 'a new line: the drawing is sent'); assert.ok(r.body.state.drawV > dv0);
  const dv1 = r.body.state.drawV;
  r = await get(String(dv1)); assert.equal(r.body.state.draw, undefined);

  /* a command's answer works the same way, when the screen says which drawing it has */
  const c = await t.svc.handle({ method: 'POST', body: { op: 'cmd', code: t.code, dv: dv1, cmd: { type: 'setTarget', delta: 1, actionId: 'drawtest.1' } }, token: t.gm.token });
  assert.equal(c.status, 200); assert.equal(c.body.state.draw, undefined);
  const u = await t.svc.handle({ method: 'POST', body: { op: 'cmd', code: t.code, dv: dv1, cmd: { type: 'drawUndo', sceneId, actionId: 'drawtest.2' } }, token: t.gm.token });
  assert.deepEqual(u.body.state.draw, []); assert.ok(u.body.state.drawV > dv1);
  await t.gm.cmd({ type: 'drawClear' }); r = await get(String(u.body.state.drawV)); assert.deepEqual(r.body.state.draw, [], 'clearing is a change too');
});

test('DRAWING: without saying which drawing it has, a screen is sent the whole of it, as before', async () => {
  const t = await table(); await t.gm.cmd(line);
  const r = await t.gm.get(); assert.equal(r.body.state.draw.length, 1);
});
