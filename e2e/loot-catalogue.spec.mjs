import { test, expect, newPage, makeTable } from './helpers.mjs';

test('public loot tables link to complete three-spell books with clear effect labels', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/loot/');
  await expect(page.getByRole('heading', { name: 'Current Loot Tables', exact: true })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Loot sections' });
  await expect(navigation.getByRole('link', { name: 'Grimoires (d8)', exact: true })).toHaveAttribute('href', '#table-grimoires');
  await expect(navigation.getByRole('link', { name: 'Grimoires and spells', exact: true })).toHaveAttribute('href', '#loot-grimoire');
  const books = page.locator('#loot-grimoire .loot-entry');
  await expect(books).toHaveCount(8);
  for (let n = 0; n < 8; n++) await expect(books.nth(n).locator('.loot-spells > li')).toHaveCount(3);
  await expect(page.locator('#item-embers .loot-effect')).toHaveText(['Damage', 'Esoteric effect', 'Esoteric effect']);
  await expect(page.locator('#item-litany .loot-effect')).toHaveText(['Healing', 'Esoteric effect', 'Esoteric effect']);
  await page.locator('#table-d100').getByRole('link', { name: 'Grimoires — roll d8', exact: true }).click();
  await expect(page).toHaveURL(/#table-grimoires$/);
  await page.locator('#table-grimoires').getByRole('link', { name: 'The Cinder Lectionary', exact: true }).click();
  await expect(page).toHaveURL(/#item-cinderlectionary$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('character sheets identify damaging, healing and esoteric spells without changing possessions', async ({ browser }) => {
  const page = await newPage(browser);
  await page.addInitScript(() => {
    localStorage.setItem('sacrament-heroes-v2', JSON.stringify({ heroes: [{ id: 'loot-labels', name: 'Loot labels', stats: {}, effort: {}, gear: [{ id: 'embers', eq: true }, { id: 'litany', eq: true }] }], current: 'loot-labels' }));
  });
  await page.goto('/character/');
  await expect(page.locator('.sh-spells')).toHaveCount(2);
  await expect(page.locator('.sh-spells').first().locator('li')).toHaveCount(3);
  await expect(page.locator('.sh-spells').first()).toContainText('Damage');
  await expect(page.locator('.sh-spells').first()).toContainText('Esoteric effect');
  await expect(page.locator('.sh-spells').nth(1)).toContainText('Healing');
});


test('the GM designer saves a three-spell grimoire without losing its contents', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await gm.locator('[data-do=gmtab][data-t=loot]').click();
  await gm.locator('[data-do=designLoot]').click();
  const editor = gm.locator('#lootOverlay');
  await editor.locator('[data-lf=name]').fill('Test grimoire');
  await editor.locator('[data-lf=category]').selectOption('Grimoire');
  await expect(editor.locator('[data-lf=cat]')).toBeDisabled();
  await editor.locator('[data-lspell="0"]').selectOption('ember');
  await editor.locator('[data-lspell="1"]').selectOption('kindle');
  await editor.locator('[data-lspell="2"]').selectOption('ward');
  await editor.locator('[data-lb=save]').click();
  await expect(editor.locator('#ltLib')).toContainText('Test grimoire');
  await editor.locator('#ltLib [data-lb=edit]').click();
  await expect(editor.locator('[data-lspell="0"]')).toHaveValue('ember');
  await expect(editor.locator('[data-lspell="1"]')).toHaveValue('kindle');
  await expect(editor.locator('[data-lspell="2"]')).toHaveValue('ward');
});
