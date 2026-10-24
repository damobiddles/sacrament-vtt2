import { test, expect, newPage, makeTable, joinTable } from './helpers.mjs';
test.setTimeout(60000);

test('a hero created in a second tab becomes available at the open table without reloading', async ({ browser }) => {
  const gm = await newPage(browser), code = await makeTable(gm, { sample: false });
  const player = await newPage(browser); await joinTable(player, code, 'First session');
  await expect(player.locator('[data-do=bring]')).toHaveCount(0);
  const popup = player.waitForEvent('popup');
  await player.locator('#panel a[href="/character/"]').click();
  const creator = await popup;
  await creator.locator('#generatorFocus').selectOption('fighter');
  await creator.locator('#generateHero').click();
  await creator.locator('#proposalName').fill('Agathe Vey');
  await creator.locator('#keepGenerated').click();
  await player.bringToFront();
  await expect(player.getByRole('button', { name: 'Bring Agathe Vey to this table', exact: true })).toBeVisible();
  await player.getByRole('button', { name: 'Bring Agathe Vey to this table', exact: true }).click();
  await expect(player.locator('.player-first-turn')).toBeVisible();
  await creator.locator('#sheetHere [data-text=name]').fill('Renamed local copy');
  await creator.locator('#sheetHere [data-text=name]').blur();
  await player.bringToFront();
  await expect(player.locator('#panel')).toContainText('Agathe Vey');
  expect(player.errors).toEqual([]);
});
