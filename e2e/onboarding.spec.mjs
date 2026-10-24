import { test, expect, newPage, makeTable, joinTable } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';

test.setTimeout(60000);

test('current role guides have working contents and public rules omit the obsolete draft', async ({ browser }, testInfo) => {
  const page = await newPage(browser);
  await page.goto('/rules/');
  await expect(page.getByRole('link', { name: 'Player guide', exact: true })).toBeVisible();
  await expect(page.locator('.earlier-draft')).toHaveCount(0);
  await expect(page.locator('.range-reference tbody tr')).toHaveCount(4);
  await expect(page.locator('#current-rule-values')).toContainText('d10 per 2 living heroes');
  for (const path of ['/player-guide/', '/gm-guide/']) {
    await page.goto(path);
    const nav = page.getByRole('navigation', { name: 'On this page', exact: true });
    const links = await bounded(nav.locator('a').evaluateAll(as => as.map(a => a.getAttribute('href'))), 10000, 'reading guide contents');
    expect(links.length).toBeGreaterThan(5);
    for (const href of links) await expect(page.locator(href)).toHaveCount(1);
    await nav.locator('a').first().click();
    await expect(page.locator(links[0])).toBeInViewport();
    await expect(page.locator('main')).toContainText(/7, 14 (?:and|or) 21/);
    await page.screenshot({ path: testInfo.outputPath(path.includes('gm') ? 'gm-guide.png' : 'player-guide.png'), fullPage: true });
  }
  expect(page.errors).toEqual([]);
});

test('a first-time player can find creation and help before claiming any character', async ({ browser }, testInfo) => {
  const gm = await newPage(browser), code = await makeTable(gm, { sample: false });
  const page = await newPage(browser);
  await joinTable(page, code, 'New player');
  await expect(page.locator('#panel')).toContainText('Bring one from My heroes below');
  await expect(page.locator('#panel a[href="/character/"]')).toHaveAttribute('target', '_blank');
  await expect(page.locator('#panel a[href="/player-guide/"]')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('new-player.png') });
  await page.goto('/character/');
  await page.locator('#newHero').click();
  await expect(page.locator('#heroReadiness')).toContainText('6 score points left');
  await expect(page.locator('#heroReadiness')).toContainText('4 Effort points left');
  await page.screenshot({ path: testInfo.outputPath('blank-hero-guidance.png') });
  expect(page.errors).toEqual([]);
});
