// Characters made under the earlier rules are brought over on the hero page (/character/), in an "Earlier characters" section.
import { test, expect } from './helpers.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { newPage } from './helpers.mjs';

const stores = JSON.parse(fs.readFileSync(path.resolve('test/fixtures/stores.json'), 'utf8'));
const old = JSON.stringify(stores['Sister Maren']);

async function withOldCharacter(browser, viewport) {
  const page = await newPage(browser, viewport);
  await page.context().addInitScript((o) => { if (!localStorage.getItem('sacrament-builder-v1')) localStorage.setItem('sacrament-builder-v1', o); }, old);
  return page;
}

test('an earlier character shows on the hero page, can be downloaded, and can become a new hero', async ({ browser }) => {
  const page = await withOldCharacter(browser);
  await page.goto('/character/');
  const section = page.locator('#earlier');
  await expect(section).toBeVisible();
  await expect(section).toContainText('Sister Maren');
  await expect(section).toContainText('exactly as you left it');
  await section.locator('summary').first().click();
  await expect(section).toContainText('Abilities');

  const [dl] = await Promise.all([page.waitForEvent('download'), section.locator('[data-dl]').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.json$/);

  await section.locator('[data-bring]').click();
  await expect(section.locator('[data-score]')).toHaveCount(3);
  await section.locator('[data-make]').click();
  await expect(section.locator('#made')).toContainText('is ready');

  // the hero list on the same page now has the new hero, and the old character is untouched
  await expect(page.locator('#heroSel option', { hasText: 'Sister Maren' })).toHaveCount(1);
  await expect(page.locator('#sheetHere [data-text=notes]')).toHaveValue(/Converted from/);
  expect(await page.evaluate(() => localStorage.getItem('sacrament-builder-v1'))).toBe(old);
  const made = await page.evaluate(() => JSON.parse(localStorage.getItem('sacrament-heroes-v2')));
  expect(made.heroes.length).toBe(1);
  expect(made.heroes[0].hp.max).toBe(10);
  expect(page.errors).toEqual([]);
});

test('with no earlier character in the browser there is no section, and the old rules are not downloaded', async ({ browser }) => {
  const page = await newPage(browser);
  const asked = [];
  page.on('request', (r) => asked.push(new URL(r.url()).pathname));
  await page.goto('/character/');
  await expect(page.locator('#heroSel')).toBeVisible();
  await expect(page.locator('#earlier')).toBeHidden();
  expect(asked.filter((p) => /legacy|earlier\//.test(p))).toEqual([]);
  expect(page.errors).toEqual([]);
});

test('the earlier section fits a phone, and the old address leads to it @phone', async ({ browser }) => {
  const page = await withOldCharacter(browser, { width: 390, height: 800 });
  // the redirect itself is Netlify's, so it can only be seen on the live site (npm run test:e2e with VTT_BASE); the unit tests read the rule
  await page.goto(process.env.VTT_BASE ? '/legacy/' : '/character/#earlier');
  await expect(page).toHaveURL(/\/character\/#earlier$/);
  await expect(page.locator('#earlier')).toBeVisible();
  await page.locator('#earlier summary').first().click();
  await page.locator('#earlier [data-bring]').click();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(wide).toBeLessThanOrEqual(1);
});
