import { test, expect, newPage, makeTable, joinTable, state } from './helpers.mjs';

test('players have no drawing controls while GM ink still reaches their table', async ({ browser }) => {
  const gm = await newPage(browser), player = await newPage(browser);
  const code = await makeTable(gm); await joinTable(player, code, 'Drawing test');
  await expect(player.locator('#toolbar [data-tool=draw]')).toHaveCount(0);
  await expect(player.locator('#toolbar [data-tool=point]')).toBeVisible();
  await expect(player.locator('#toolbar [data-tool=select]')).toBeVisible();
  await gm.locator('#toolbar [data-tool=draw]').click();
  const box = await gm.locator('#table').boundingBox();
  await gm.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.8);
  await gm.mouse.down(); await gm.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.8, { steps: 4 }); await gm.mouse.up();
  await expect.poll(async () => (await state(player)).draw.length).toBe(1);
  await expect(player.locator('#ink polyline')).toHaveCount(1);
  await expect(player.locator('[data-do=drawUndo], [data-do=drawClear]')).toHaveCount(0);
  await player.screenshot({ path: '/workspace/sacrament-audit/player-toolbar-without-draw.png' });
  await gm.locator('[data-do=drawUndo]').click();
  await expect.poll(async () => (await state(player)).draw.length).toBe(0);
  expect(gm.errors).toEqual([]); expect(player.errors).toEqual([]);
});
