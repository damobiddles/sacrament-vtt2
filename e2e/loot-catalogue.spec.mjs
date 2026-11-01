import { test, expect, newPage, makeTable } from './helpers.mjs';

test('public loot tables link to complete three-spell books with clear effect labels', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/loot/');
  await expect(page.getByRole('heading', { name: 'Current Loot Tables', exact: true })).toBeVisible();
  const navigation = page.getByRole('navigation', { name: 'Loot sections' });
  await expect(navigation.getByRole('link', { name: 'Grimoires (d100)', exact: true })).toHaveAttribute('href', '#table-grimoires');
  await expect(navigation.getByRole('link', { name: 'Grimoires and spells', exact: true })).toHaveAttribute('href', '#loot-grimoire');
  const books = page.locator('#loot-grimoire .loot-entry');
  await expect(books).toHaveCount(22);
  await expect(page.locator('.loot-entry')).toHaveCount(184);
  await expect(page.locator('#item-lowdoors .loot-effect')).toHaveText(['Esoteric effect', 'Esoteric effect', 'Esoteric effect']);
  await expect(page.locator('#item-hospicevigil .loot-effect')).toHaveText(['Healing', 'Esoteric effect', 'Esoteric effect']);
  await expect(page.locator('#item-hospicerib')).toContainText('The table applies healing');
  await expect(page.locator('#table-arms')).toContainText('Processional Harness');
  for (let n = 0; n < 22; n++) await expect(books.nth(n).locator('.loot-spells > li')).toHaveCount(3);
  await expect(page.locator('#item-embers .loot-effect')).toHaveText(['Damage', 'Esoteric effect', 'Esoteric effect']);
  await expect(page.locator('#item-seventhpenance .loot-effect')).toHaveText(['Healing', 'Esoteric effect', 'Esoteric effect']);
  await page.locator('#table-d100').getByRole('link', { name: 'Grimoires — roll d100', exact: true }).click();
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

test('the public loot roller follows the VTT tables, shows book contents and supports repeated keyboard rolls', async ({ browser }) => {
  const page = await newPage(browser);
  const writes = [];
  page.on('request', request => { if (request.method() !== 'GET') writes.push(request.url()); });
  await page.goto('/loot/');
  const button = page.getByRole('button', { name: 'Roll loot', exact: true });
  const result = page.getByRole('status');
  await expect(button).toBeVisible();
  // A main-table 96, then 43 on Grimoires: the three-spell Litany of Low Doors.
  await page.evaluate(() => { const dice = [0.95, 0.42]; Math.random = () => dice.shift(); });
  await button.focus(); await button.press('Enter');
  await expect(result).toContainText('You rolled 96 → Grimoires d100: 43.');
  await expect(result.getByRole('heading', { name: 'The Litany of Low Doors', exact: true })).toBeVisible();
  await expect(result.locator('.loot-spells > li')).toHaveCount(3);
  await expect(result.getByRole('link', { name: 'View in the catalogue' })).toHaveAttribute('href', '#item-lowdoors');
  await expect(button).toBeFocused();
  // A direct result needs just one die. It replaces rather than appends the previous find.
  await page.evaluate(() => { Math.random = () => 0.99; });
  await button.press('Space');
  await expect(result).toContainText('You rolled 100.');
  await expect(result).toContainText('Shard of a binding seal');
  await expect(result.locator('.loot-spells')).toHaveCount(0);
  await expect(result.locator('article')).toHaveCount(1);
  await page.evaluate(() => { const dice = [0, 0.34]; Math.random = () => dice.shift(); });
  await button.click();
  await expect(result).toContainText('Sail Needle and Waxed Thread');
  await result.getByRole('link', { name: 'View in the catalogue' }).click();
  await expect(page).toHaveURL(/#item-sailneedle$/);
  expect(await page.evaluate(() => { const ids = [...document.querySelectorAll('[id]')].map(el => el.id); return new Set(ids).size === ids.length; })).toBe(true);
  expect(writes).toEqual([]);
  expect(page.errors).toEqual([]);
});

test('the loot search filters items and roll-table rows as you type, and clears with Escape', async ({ browser }) => {
  test.setTimeout(30000);
  const page = await newPage(browser);
  await page.goto('/loot/');
  const search = page.getByRole('searchbox', { name: 'Search the loot' });
  const visible = page.locator('.loot-entry:visible');
  await expect(search).toBeVisible();
  // The search comes first on the page, before the roller and the tables; the explanations come last.
  const order = await page.evaluate(() => ['#loot-search', '#loot-roller', '#table-d100', '#loot-weapon', '#about-loot'].map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
  expect([...order].sort((a, b) => a - b)).toEqual(order);
  await expect(page.locator('main .body > *').first()).toHaveAttribute('id', 'loot-search');
  await expect(visible).toHaveCount(184);
  await search.fill('cinder lectionary');
  await expect(visible).toHaveCount(1);
  await expect(page.locator('#item-cinderlectionary')).toBeVisible();
  await expect(page.locator('#loot-search-count')).toHaveText('1 of 184 items match.');
  // Roll tables keep only the rows that point at a match; sections with nothing left are hidden.
  await expect(page.locator('#table-grimoires tbody tr:visible')).toHaveCount(1);
  await expect(page.locator('#table-arms')).toBeHidden();
  await expect(page.locator('#loot-weapon')).toBeHidden();
  // A spell name finds the books that hold it, ignoring capitals.
  await search.fill('EMBER');
  await expect(page.locator('#item-embers')).toBeVisible();
  await search.fill('zzqx nothing');
  await expect(visible).toHaveCount(0);
  await expect(page.locator('#loot-search-count')).toHaveText('No loot matches “zzqx nothing”.');
  await search.press('Escape');
  await expect(search).toHaveValue('');
  await expect(visible).toHaveCount(184);
  await expect(page.locator('#loot-search-count')).toHaveText('');
  // A jump link to a section the search hid clears the search so the link still lands.
  await search.fill('cinder lectionary');
  await expect(page.locator('#loot-weapon')).toBeHidden();
  await page.getByRole('navigation', { name: 'Loot sections' }).getByRole('link', { name: 'Weapons', exact: true }).click();
  await expect(page.locator('#loot-weapon')).toBeVisible();
  await expect(search).toHaveValue('');
  expect(page.errors).toEqual([]);
});
