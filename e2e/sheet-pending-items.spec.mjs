// Equipment buttons on a live sheet, on a slow connection. A newly added item shows at once, but the table gives it its key only when it answers;
// pressing Move or Drop before then used to send no key, and the table refused ("Please refresh this page before changing or using equipment").
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';

test('on a slow connection an item just added cannot be moved or dropped until the table has confirmed it, and then it can', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await ann.route('**/.netlify/functions/vtt', async (r) => { if (r.request().method() === 'POST') await new Promise((ok) => setTimeout(ok, 800)); await r.continue(); });
  await ann.locator('#panel [data-do=sheet]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  const blade = ann.locator('.sh-item', { hasText: "Penitent's Blade" });
  await expect(blade).toBeVisible();
  await expect(blade.locator('[data-sh=move]')).toBeDisabled();       // shown, but not yet confirmed by the table
  await expect(blade.locator('[data-sh=remove]')).toBeDisabled();
  await expect(blade.locator('[data-sh=move]')).toBeEnabled({ timeout: 15000 });   // the table answered and gave it its key
  await expect(blade.locator('[data-sh=remove]')).toBeEnabled();
  await blade.locator('[data-sh=move]').click(); await saved(ann);
  const hero = (await state(ann)).chars; const thorne = Object.values(hero).find((c) => c.name === 'Thorne');
  expect(thorne.gear.find((g) => g.id === 'sword').eq).toBeFalsy();    // it really moved to the pack
  await expect(ann.locator('#feed')).not.toContainText('Please refresh this page');
  expect(ann.errors).toEqual([]);
});

test('with a fast table an item just added can be moved straight away', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await ann.locator('#panel [data-do=sheet]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  const blade = ann.locator('.sh-item', { hasText: "Penitent's Blade" });
  await expect(blade.locator('[data-sh=move]')).toBeEnabled();
  await blade.locator('[data-sh=move]').click(); await saved(ann);
  await expect(ann.locator('#feed')).not.toContainText('Please refresh this page');
});
