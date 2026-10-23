import test from 'node:test';
import assert from 'node:assert/strict';
import { table } from './vtt-helpers.mjs';

test('only the GM can draw, undo a line or clear ink, while players still see GM ink and can point', async () => {
  const t = await table(), player = await t.join('Drawing permissions');
  const sceneId = (await t.state()).table.scene.id;
  const line = { type: 'draw', sceneId, pts: [[10, 10], [20, 20]], color: '#e0b040' };
  assert.equal((await t.gm.cmd(line)).status, 200);
  const before = await t.state();
  for (const cmd of [line, { type: 'drawUndo', sceneId }, { type: 'drawClear', sceneId }]) {
    assert.equal((await player.cmd(cmd)).status, 403, cmd.type);
    assert.deepEqual((await t.state()).draw, before.draw);
  }
  assert.equal((await player.get()).body.state.draw.length, 1);
  assert.equal((await player.cmd({ type: 'point', sceneId, x: 30, y: 40 })).status, 200);
  assert.equal((await t.gm.cmd({ type: 'drawUndo', sceneId })).status, 200);
  assert.equal((await t.state()).draw.length, 0);
  assert.equal((await t.gm.cmd(line)).status, 200);
  assert.equal((await t.gm.cmd({ type: 'drawClear', sceneId })).status, 200);
  assert.equal((await t.state()).draw.length, 0);
});
