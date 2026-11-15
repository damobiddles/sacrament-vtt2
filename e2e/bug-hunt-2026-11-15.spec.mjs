// Bug hunt, 15 November 2026, in a real browser (desktop Chrome, laptop size).
// 1. The latest-activity line cut its second line and its Undo button in half (two lines did not fit the height kept for them).
// 2. The map jumped when the damage step appeared in the bottom strip: "Own die for damage" sat above its box and made the strip taller.
// 3. The result card: the verdict waits for the total, and the sum stays on the card (what was rolled, each modifier, the Target, by how much).
import { test, expect, newPage, makeTable, joinTable, claimHero, saved, prepareItem, rollPrepared } from './helpers.mjs';

const card = (page, name) => page.locator('#cards .c', { hasText: name }).first();

test('after a hit and its damage: the activity line shows both lines and its Undo whole, and the map keeps its size', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(ann, 'Pit Ghoul').click();
  const map0 = await ann.locator('#tablewrap').boundingBox();
  await prepareItem(ann, ':has-text("Hatchet")');
  await ann.locator('#strip input[data-phys]').fill('15'); await rollPrepared(ann); await saved(ann);
  await expect(ann.locator('#strip [data-do=effort]')).toBeVisible();
  const map1 = await ann.locator('#tablewrap').boundingBox();
  expect(Math.abs(map1.height - map0.height), 'the map must not shrink when the damage step appears').toBeLessThanOrEqual(1);
  await ann.locator('#strip [data-do=effort]').click(); await saved(ann);
  const undo = ann.locator('#feed .latest [data-do=undo]').first();
  await expect(undo).toBeVisible();
  const box = await ann.locator('#feed .latest').boundingBox(), u = await undo.boundingBox();
  expect(u.y + u.height, 'Undo must sit inside the line').toBeLessThanOrEqual(box.y + box.height + 0.5);
  const fits = await ann.locator('#feed .latest').evaluate((el) => el.scrollHeight <= el.clientHeight + 1);
  expect(fits, 'two activity lines must fit without scrolling').toBe(true);
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('the result card says the sum, the Target and by how much, and the verdict comes after the total', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(ann, 'Pit Ghoul').click();
  await prepareItem(ann, ':has-text("Hatchet")');
  await ann.locator('#strip input[data-phys]').fill('15'); await rollPrepared(ann);
  const reveal = ann.locator('#dice .reveal-result');
  await expect(reveal.locator('.reveal-outcome')).toHaveText('HIT');
  await expect(reveal.locator('.reveal-detail')).toHaveText('15 + 3 STR = 18 against Target 12');
  await expect(reveal.locator('.reveal-margin')).toHaveText('Made it by 6');
  await expect(gm.locator('#dice .reveal-result .reveal-detail')).toHaveText('15 + 3 STR = 18 against Target 12');
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});
