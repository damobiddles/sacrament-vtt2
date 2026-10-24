import { test, expect, newPage } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';
test.setTimeout(60000);

test('public pages share one navigation and identify their section', async ({ browser }) => {
  const page = await newPage(browser); let expected;
  for (const path of ['/', '/how-to-play/', '/player-guide/', '/gm-guide/', '/the-game/', '/setting/', '/resources/', '/loot/', '/rules/', '/brand/', '/adventure/', '/news/', '/feedback/']) {
    await page.goto(path);
    await expect(page.locator('.ic-nav')).toHaveCount(1);
    const links = await bounded(page.locator('.ic-nav ul a').evaluateAll(as => as.map(a => [a.textContent.trim(), a.getAttribute('href')])), 10000, 'reading main navigation');
    expected ||= links; expect(links, path).toEqual(expected);
    await expect(page.locator('.ic-nav ul [aria-current=page]')).toHaveCount(1);
    await expect(page.locator('.ic-foot')).toHaveCount(1);
  }
  expect(page.errors).toEqual([]);
});

test('the keyboard skip link takes readers directly to the page content', async ({ browser }) => {
  const page = await newPage(browser); await page.goto('/how-to-play/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).toBeFocused(); await skip.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(page.errors).toEqual([]);
});

test('the published page list and its visible navigation lead to working destinations', async ({ browser }) => {
  const page = await newPage(browser);
  const sitemap = await page.request.get('/sitemap.xml'); expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).not.toMatch(/\/blog\/|\/support\/|\/inventory\/|\/builder\//);
  const paths = [...xml.matchAll(/<loc>https:\/\/playsacrament\.com([^<]*)<\/loc>/g)].map(m => m[1]);
  expect(paths).toContain('/vtt/'); expect(paths).toContain('/resources/');
  const destinations = new Set();
  for (const path of paths) {
    const response = await page.goto(path); expect(response.status(), path).toBe(200);
    const hrefs = await bounded(page.locator('.ic-nav a, .ic-foot a').evaluateAll(as => as.map(a => a.getAttribute('href')).filter(h => h?.startsWith('/'))), 10000, 'collecting public navigation links');
    for (const href of hrefs) destinations.add(href);
  }
  for (const href of destinations) expect((await page.request.get(href)).status(), href).toBe(200);
  expect(page.errors).toEqual([]);
});

test('new visitors can follow the game, first-session and resource journeys', async ({ browser }, info) => {
  const page = await newPage(browser); await page.goto('/');
  await page.locator('.ic-latest-image').scrollIntoViewIfNeeded();
  await expect.poll(() => bounded(page.locator('.ic-latest-image').evaluate(img => img.complete && img.naturalWidth > 0), 5000, 'checking latest news image')).toBe(true);
  await bounded(page.evaluate(() => window.scrollTo(0, 0)), 5000, 'returning to home heading');
  await page.screenshot({ path: info.outputPath('home.png'), fullPage: true });
  await page.getByRole('link', { name: 'Meet Sacrament RPG', exact: true }).click();
  await page.getByRole('link', { name: 'Start your first game', exact: true }).click();
  await page.getByRole('navigation', { name: 'Choose your role' }).getByRole('link', { name: 'I am a player' }).click();
  await expect(page.locator('#for-players')).toBeInViewport();
  await page.locator('main a[href="/player-guide/"]').first().click();
  await expect(page.locator('h1')).toHaveText('Player guide');
  await page.locator('.ic-nav').getByRole('link', { name: 'Resources', exact: true }).click();
  await expect(page.locator('.resource-grid a[download]')).toHaveCount(4);
  await expect(page.locator('main')).not.toContainText('Coming soon');
  for (const img of await page.locator('.resource-image').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => bounded(img.evaluate(el => el.complete && el.naturalWidth > 0), 5000, 'checking artwork preview')).toBe(true);
  }
  await bounded(page.evaluate(() => window.scrollTo(0, 0)), 5000, 'returning to resources heading');
  await page.screenshot({ path: info.outputPath('resources.png'), fullPage: true });
  await page.locator('.ic-nav').getByRole('link', { name: 'Feedback', exact: true }).click();
  await expect(page.locator('form[name=vtt-feedback]')).toHaveAttribute('action', '/feedback/thanks/');
  await expect(page.locator('main')).toContainText('does not ask for contact details');
  await page.screenshot({ path: info.outputPath('feedback.png'), fullPage: true });
  expect(page.errors).toEqual([]);
});
