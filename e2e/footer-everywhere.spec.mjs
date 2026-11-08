// Consistency audit (owner request 2026-11-08): every page you scroll ends with the site footer, including My heroes and the solo game's start screen.
// The table (/vtt/) fills the screen and the printable hero sheet is for paper, so they have none.
import { test, expect, newPage } from './helpers.mjs';
test.setTimeout(60000);

test('My heroes and the solo start screen end with the site footer; the solo footer is out of the way while a road is played', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/character/');
  await expect(page.locator('footer.ic-foot')).toHaveCount(1);
  await expect(page.locator('footer.ic-foot').getByRole('link', { name: 'Privacy Policy' })).toBeVisible();
  await page.goto('/solo/');
  await expect(page.locator('.ic-nav')).toHaveCount(0);   // the solo game keeps its own top bar
  await expect(page.locator('footer.ic-foot')).toBeVisible();
  await expect(page.locator('footer.ic-foot .site-footer-grid')).toHaveCSS('display', 'grid');
  await page.getByRole('button', { name: /Take this hero/ }).click();
  await expect(page.locator('#game')).toBeVisible();
  await expect(page.locator('footer.ic-foot')).toBeHidden();
  await page.goto('/vtt/');
  await expect(page.locator('footer.ic-foot')).toHaveCount(0);
  expect(page.errors).toEqual([]);
});

test('the tag table on the Rules page fits a phone screen without scrolling sideways @phone', async ({ browser }) => {
  const page = await newPage(browser, { width: 390, height: 844 });
  await page.goto('/rules/');
  await expect(page.locator('.tag-reference')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
