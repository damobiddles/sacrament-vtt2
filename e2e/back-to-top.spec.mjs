import { test, expect, newPage } from './helpers.mjs';

test('reading pages offer a keyboard-accessible back-to-top shortcut with reduced-motion support', async ({ browser }) => {
  const page = await newPage(browser);
  for (const path of ['/loot/', '/player-guide/', '/gm-guide/', '/news/a-steadier-table/']) {
    await page.goto(path);
    const button = page.getByRole('button', { name: '↑ Back to top', exact: true });
    await expect(button).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, 800));
    await expect(button).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await button.focus(); await button.press('Enter');
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect(page.locator('h1').first()).toBeFocused();
    await expect(button).toBeHidden();
  }
  await page.goto('/vtt/');
  await expect(page.locator('.sac-back-top')).toHaveCount(0);
  expect(page.errors).toEqual([]);
});

test('the back-to-top button scrolls a long page and stays within the viewport', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/loot/');
  await page.evaluate(() => window.scrollTo(0, 800));
  const button = page.getByRole('button', { name: '↑ Back to top', exact: true });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(1366);
  await page.screenshot({ path: '/workspace/sacrament-audit/back-to-top-preview.png' });
  await button.click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
