import { test, expect, newPage, makeTable } from './helpers.mjs';

test('releasing one press cannot unlock a second press while a table update arrives', async ({ browser }) => {
  test.setTimeout(30000);
  const page = await newPage(browser);
  await makeTable(page);
  await page.locator('[data-do=target][data-d="1"]').evaluate((button) => {
    window.heldTargetButton = button;
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  // Let the first release's deferred redraw run while the second press is held.
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
  expect(await page.evaluate(() => window.__vtt.ui.pressing)).toBe(true);
  await page.locator('[data-do=target][data-d="1"]').evaluate(button => button.click());
  await page.waitForFunction(() => window.__vtt.state().table.target === 13);
  expect(await page.evaluate(() => window.heldTargetButton.isConnected)).toBe(true);
  await page.evaluate(() => window.heldTargetButton.dispatchEvent(new PointerEvent('pointerup', { bubbles: true })));
  await expect(page.locator('#tTarget')).toContainText('13');
});
