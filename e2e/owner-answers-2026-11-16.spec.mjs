// The owner's answers to the 16 November bug hunt's questions (desktop Chrome, laptop size).
import { test, expect, newPage, makeTable, joinTable, claimHero, saved, basicAttack } from './helpers.mjs';

const card = (page, name) => page.locator('#cards .c', { hasText: name }).first();

test('the GM has one Next turn, in the footer; the Play tab keeps the turn order without it', async ({ browser }) => {
  test.setTimeout(30000);
  const gm = await newPage(browser); await makeTable(gm);
  await gm.locator('[data-do=gmtab][data-t=play]').click();
  await expect(gm.locator('#panel .play-section h3', { hasText: 'Turn order' })).toBeVisible();
  await expect(gm.locator('#panel [data-do=endTurn]')).toHaveCount(0);
  await expect(gm.locator('#strip [data-do=endTurn]')).toBeVisible();
  expect(gm.errors).toEqual([]);
});

test('at a Horror threshold the GM reads it once, in the red bar; players still read it in their activity line', async ({ browser }) => {
  test.setTimeout(30000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await gm.evaluate(() => window.__vtt.send({ type: 'horror', mode: 'set', value: 21 })); await saved(gm);
  await expect(gm.locator('#feed .alert.hz')).toContainText('The Horror has arrived.');
  await expect(gm.locator('#feed .latest')).toContainText('now 21 of 21');
  await expect(gm.locator('#feed .latest')).not.toContainText('The Horror has arrived.');
  await expect(ann.locator('#feed .latest')).toContainText('The Horror has arrived.');
  /* once the GM has dealt with it, the full history still has the line */
  await gm.locator('[data-do=horrorAck]').click(); await saved(gm);
  await gm.locator('[data-do=feed]').click();
  await expect(gm.locator('#feed .history')).toContainText('The Horror has arrived.');
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('an attack without an item offers only Basic d4 for its damage', async ({ browser }) => {
  test.setTimeout(30000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(ann, 'Pit Ghoul').click();
  await basicAttack(ann, 15, 'STR'); await saved(ann);
  await expect(ann.locator('#strip [data-do=effort]')).toHaveCount(1);
  await expect(ann.locator('#strip [data-do=effort]')).toHaveText(/Basic d4/);
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('the rules tabs fit on one line at laptop size, with "Updates" last', async ({ browser }) => {
  test.setTimeout(30000);
  const page = await newPage(browser);
  await page.goto('/rules/');
  const tabs = page.locator('.rules-tabs a');
  await expect(tabs.last()).toHaveText('Updates');
  const tops = await tabs.evaluateAll((as) => [...new Set(as.map((a) => Math.round(a.getBoundingClientRect().top)))]);
  expect(tops.length, 'one row').toBe(1);
});
