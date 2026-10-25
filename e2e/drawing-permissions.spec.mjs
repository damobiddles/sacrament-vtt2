import { test, expect, newPage, makeTable, joinTable, state } from './helpers.mjs';

test('GM drawing colours preview locally, save for players, survive reload and retain GM-only Undo/Clear', async ({ browser }, info) => {
  const gm = await newPage(browser), player = await newPage(browser);
  const code = await makeTable(gm); await joinTable(player, code, 'Drawing test');
  await expect(gm.locator('#drawColor')).toHaveCount(0);
  await expect(player.locator('#toolbar [data-tool=draw], #drawColor')).toHaveCount(0);
  await expect(player.locator('#toolbar [data-tool=point]')).toBeVisible();
  await expect(player.locator('#toolbar [data-tool=select]')).toBeVisible();
  await gm.locator('#toolbar [data-tool=draw]').click();
  const colors = [['Blue — water', '#4da6ff'], ['Green — trees', '#65b86a'], ['Red — fire', '#ed6a5e']];
  const box = await gm.locator('#table').boundingBox();
  for (let i = 0; i < colors.length; i++) {
    await gm.getByLabel('Drawing colour').selectOption({ label: colors[i][0] });
    const y = box.y + box.height * (0.7 + i * 0.08);
    await gm.mouse.move(box.x + box.width * 0.2, y); await gm.mouse.down();
    await gm.mouse.move(box.x + box.width * 0.4, y, { steps: 4 });
    await expect(gm.locator('#ink polyline.live')).toHaveAttribute('stroke', colors[i][1]);
    expect((await state(player)).draw.length).toBe(i);
    await gm.mouse.up();
    await expect.poll(async () => (await state(player)).draw.map(line => line.color)).toEqual(colors.slice(0, i + 1).map(color => color[1]));
    await expect(player.locator('#ink polyline').nth(i)).toHaveAttribute('stroke', colors[i][1]);
  }
  await gm.screenshot({ path: info.outputPath('gm-drawing-colours.png') });
  await player.reload(); await expect(player.locator('#app')).toBeVisible();
  expect((await state(player)).draw.map(line => line.color)).toEqual(colors.map(color => color[1]));
  await expect(player.locator('#ink polyline')).toHaveCount(3);
  await expect(player.locator('#drawColor, [data-do=drawUndo], [data-do=drawClear]')).toHaveCount(0);
  await gm.locator('[data-do=drawUndo]').click();
  await expect.poll(async () => (await state(player)).draw.map(line => line.color)).toEqual(colors.slice(0, 2).map(color => color[1]));
  await gm.locator('[data-do=drawClear]').click();
  await expect.poll(async () => (await state(player)).draw.length).toBe(0);
  expect(gm.errors).toEqual([]); expect(player.errors).toEqual([]);
});
