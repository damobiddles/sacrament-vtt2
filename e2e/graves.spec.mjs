// Graves and bequests (the owner's go-ahead, 2026-11-11; rules.js BEQUEST): a fallen solo hero gets last words and a grave in the Chronicle,
// and may leave one thing they carried; the next road's hero carries it, once.
import { test, expect, newPage } from './helpers.mjs';

test('solo: a fallen hero is laid to rest, and the next hero carries what they left', async ({ browser }) => {
  test.setTimeout(60000);
  const page = await newPage(browser);
  await page.addInitScript(() => { crypto.getRandomValues = (a) => { a.fill(0); return a; }; });
  await page.goto('/solo/');
  await page.locator('#takeHero').click();
  await expect(page.locator('#game')).toBeVisible();
  const first = await page.evaluate(() => { const s = window.__solo.state(); s.hp.cur = 0; s.over = 'dead'; window.__solo.remember(); window.__solo.end(); return s.hero.name; });
  await expect(page.locator('#grave')).toBeVisible();
  const leave = page.locator('#leave');
  const pick = await leave.locator('option').nth(1).evaluate((o) => ({ value: o.value, name: o.textContent }));
  await page.locator('#lastWords').fill('Tell my mother I kept the candle lit.');
  await leave.selectOption(pick.value);
  await page.locator('#layToRest').click();
  await expect(page.locator('#graveSaid')).toContainText('The next hero on the road will carry ' + pick.name);
  await expect(page.locator('#layToRest')).toBeHidden();
  const card = await page.locator('#endCard').textContent(); expect(card).toContain('LAST WORDS'); expect(card).toContain('Tell my mother'); expect(card).toContain(pick.name);
  if (process.env.GRAVE_SHOTS) await page.locator('#end').screenshot({ path: `${process.env.GRAVE_SHOTS}/solo-graveside.png` });
  /* back to the start: the graveyard */
  await page.evaluate(() => { document.getElementById('end').close(); });
  await page.locator('#menuBtn').click(); await page.locator('#newHeroBtn').click();
  await expect(page.locator('#graveList li')).toHaveCount(1);
  await expect(page.locator('#graveList li')).toContainText(first);
  await expect(page.locator('#graveList li q')).toHaveText('Tell my mother I kept the candle lit.');
  await expect(page.locator('#graveList li small')).toContainText('for the next hero');
  if (process.env.GRAVE_SHOTS) await page.locator('#graves').screenshot({ path: `${process.env.GRAVE_SHOTS}/solo-graveyard.png` });
  /* the next hero carries it, once */
  await page.locator('#takeHero').click();
  await expect(page.locator('#log')).toContainText('Taken from the grave of ' + first + ': ' + pick.name);
  const has = await page.evaluate((id) => window.__solo.state().hero.gear.some((g) => (g.id || g) === id), pick.value);
  expect(has).toBe(true);
  await page.evaluate(() => { const s = window.__solo.state(); s.hp.cur = 0; s.over = 'fled'; window.__solo.remember(); });
  await page.locator('#menuBtn').click(); await page.locator('#newHeroBtn').click();
  await expect(page.locator('#graveList li small')).toContainText('taken up by');
  await page.locator('#takeHero').click();
  await expect(page.locator('#log')).not.toContainText('Taken from the grave');
  expect(page.errors).toEqual([]);
});
