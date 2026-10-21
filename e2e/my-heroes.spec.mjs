// The My heroes page: the same sheet, away from the table, for building and editing heroes in this browser.
import { test, expect } from '@playwright/test';
import { newPage } from './helpers.mjs';

const stored = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('sacrament-heroes-v2') || 'null'));

test('building a hero from nothing: points, Effort and gear are limited with reasons, and it is kept after a reload', async ({ browser }) => {
  const page = await newPage(browser); await page.goto('/character/');
  await expect(page.locator('#sheetHere')).toContainText('no heroes saved');
  await page.locator('#newHero').click();
  const sheet = page.locator('#sheetHere');
  await sheet.locator('[data-text=name]').fill('Brother Wulfram'); await sheet.locator('[data-text=name]').blur();
  for (let i = 0; i < 6; i++) await sheet.locator('[data-sh=score][data-k=STR][data-d="1"]').click();
  await expect(sheet).toContainText('0 of 6 points left');
  await sheet.locator('[data-sh=score][data-k=DEX][data-d="1"]').click(); await expect(sheet.locator('.sh-msg')).toContainText('no points left');
  await sheet.locator('[data-sh=score][data-k=STR][data-d="1"]').click(); await expect(sheet.locator('.sh-msg')).toContainText('at most 6');
  await sheet.locator('[data-sh=effort][data-k=weapons][data-d="1"]').click(); await sheet.locator('[data-sh=effort][data-k=weapons][data-d="1"]').click();
  await sheet.locator('[data-sh=effort][data-k=weapons][data-d="1"]').click(); await sheet.locator('[data-sh=effort][data-k=weapons][data-d="1"]').click();
  await sheet.locator('[data-sh=effort][data-k=magic][data-d="1"]').click(); await expect(sheet.locator('.sh-msg')).toContainText('no Effort points left');
  await sheet.locator('#shAdd').selectOption('brigandine'); await sheet.locator('[data-sh=add]').click();
  await sheet.locator('#shAdd').selectOption('shield'); await sheet.locator('[data-sh=add]').click();
  await expect(sheet.locator('.sh-def')).toContainText('14');                       // 10 + CON 0 + armour (3 + 1)
  await sheet.locator('#shAdd').selectOption('chain').catch(() => {});
  await expect(sheet.locator('#shAdd optgroup[label^="Relics"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('#heroSel')).toContainText('Brother Wulfram'); await expect(page.locator('#sheetHere')).toContainText('Brigandine Coat');
  const st = await stored(page); expect(st.heroes[0].stats.STR).toBe(6); expect(st.heroes[0].effort.weapons).toBe(4); expect(page.errors).toEqual([]);
});

test('a ready-made hero is a copy that can be changed; heroes can be switched and deleted', async ({ browser }) => {
  const page = await newPage(browser); await page.goto('/character/');
  await page.locator('[data-ready=wren]').click(); await expect(page.locator('#sheetHere')).toContainText('Wren Ashdown');
  await page.locator('[data-ready=aldric]').click(); await expect(page.locator('#heroSel option')).toHaveCount(2);
  await page.locator('#heroSel').selectOption({ label: 'Wren Ashdown' }); await expect(page.locator('#sheetHere [data-text=calling]')).toHaveValue('Cartographer');
  page.once('dialog', (d) => d.accept()); await page.locator('#delHero').click();
  await expect(page.locator('#heroSel option')).toHaveCount(1); await expect(page.locator('#sheetHere')).toContainText('Brother Aldric');
});

test('heroes saved by the earlier version of the page are copied in, and the old copy is left alone', async ({ browser }) => {
  const page = await newPage(browser);
  const old = { heroes: [{ id: 'hold1', name: 'Old Maren', calling: 'Penitent', vow: 'Mend.', notes: 'kept', scores: { STR: 1, DEX: 0, CON: 2, INT: 0, WIS: 3, CHA: 0 }, effort: { basic: 0, weapons: 2, ranged: 1, magic: 1, ultimate: 0 }, max: 10, hp: 7, pack: [{ id: 'cudgel', eq: true }, { id: 'lantern', eq: false }], dying: null, stable: false, dead: false, healed: {}, scene: {}, guard: 0, tags: [] }], current: 'hold1', table: {}, converted: {} };
  await page.context().addInitScript((o) => { if (!localStorage.getItem('sacrament-hearts-v1')) localStorage.setItem('sacrament-hearts-v1', o); }, JSON.stringify(old));
  await page.goto('/character/');
  await expect(page.locator('#heroSel')).toContainText('Old Maren');
  const sheet = page.locator('#sheetHere'); await expect(sheet).toContainText('7 / 10'); await expect(sheet).toContainText("Pilgrim's Staff"); await expect(sheet).toContainText('Hooded Lantern');
  await expect(sheet.locator('[data-text=notes]')).toHaveValue('kept');
  const st = await stored(page); expect(st.heroes[0].effort.guns).toBe(1);   // "ranged" is called guns
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('sacrament-hearts-v1'))).heroes[0].name).toBe('Old Maren');
});

test('the sheet on this page fits a phone @phone', async ({ browser }) => {
  const page = await newPage(browser, { width: 390, height: 844 }); await page.goto('/character/'); await page.locator('[data-ready=maren]').click();
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(wide).toBeLessThanOrEqual(1);
});
