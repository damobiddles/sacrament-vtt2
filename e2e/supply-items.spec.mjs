// Supplies cannot be equipped: no Equip button anywhere, a small "Supply" label instead, and Equip still works on everything else.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved } from './helpers.mjs';

const item = (page, name) => page.locator('#sheetOverlay .sh-item, #sheetHere .sh-item').filter({ hasText: name });
async function setup(browser, viewport) {
  const gm = await newPage(browser), ann = await newPage(browser, viewport);
  const code = await makeTable(gm); await emptyPacks(gm);   /* these tests count gear from nothing */ await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  return { gm, ann };
}
async function addOnSheet(page, ...ids) { for (const id of ids) { await page.locator('#shAdd').selectOption(id); await page.locator('[data-sh=add]').click(); } }

test('at the table: a supply on the sheet has a Supply label and no Equip button; a weapon keeps its button and Equip still works', async ({ browser }) => {
  const { ann } = await setup(browser); await ann.locator('#strip [data-do=sheet]').click(); await addOnSheet(ann, 'bandages', 'sword', 'cloak');
  for (const name of ['Linen Bandages', "Pilgrim's Cloak"]) {
    const it = item(ann, name); await expect(it.locator('.sh-supply')).toHaveText('Supply');
    await expect(it.locator('[data-sh=move]')).toHaveCount(0); await expect(it.getByRole('button', { name: /equip/i })).toHaveCount(0);
    await expect(it.locator('[data-sh=remove]')).toHaveCount(1);                                           // it can still be dropped
  }
  const sword = item(ann, "Penitent's Blade"); await expect(sword.locator('.sh-supply')).toHaveCount(0);
  await expect(sword.locator('[data-sh=move]')).toHaveText('To the pack');
  await sword.locator('[data-sh=move]').click(); await expect(item(ann, "Penitent's Blade").locator('[data-sh=move]')).toHaveText('Equip');
  await item(ann, "Penitent's Blade").locator('[data-sh=move]').click(); await expect(item(ann, "Penitent's Blade").locator('[data-sh=move]')).toHaveText('To the pack');
  await expect(ann.locator('#sheetOverlay h4', { hasText: 'Equipped' })).toContainText('1 of 10');
  expect(ann.errors).toEqual([]);
});

test('nowhere else at the table offers Equip for a supply: the hero strip, its Items row, the side panel, and the GM\'s own sheet and panels', async ({ browser }) => {
  const { gm, ann } = await setup(browser); await ann.locator('#strip [data-do=sheet]').click(); await addOnSheet(ann, 'bandages', 'sword', 'lantern');
  await ann.locator('#sheetOverlay [data-sh=close]').click(); await saved(ann);
  await expect(ann.locator('[data-do=toggle][data-key=items]')).toHaveCount(0);
  await expect(ann.locator('#strip').getByText(/\bEquip\b/)).toHaveCount(0);
  await ann.locator('#cards .c', { hasText: 'Thorne' }).click(); await expect(ann.locator('#panel').getByText(/\bEquip\b/)).toHaveCount(0);
  await expect.poll(async () => gm.evaluate(() => Object.values(window.__vtt.state().chars).find((c) => c.name === 'Thorne').gear.length)).toBe(3);
  // the GM: the sheet from the hero's panel, and a found supply handed out from the loot panel
  await gm.locator('#cards .c', { hasText: 'Thorne' }).click(); await expect(gm.locator('#panel').getByText(/\bEquip\b/)).toHaveCount(0); await gm.locator('#panel [data-do=sheet]').click();
  await addOnSheet(gm, 'signet');
  for (const name of ['Linen Bandages', 'Hooded Lantern', 'Signet ring']) { await expect(item(gm, name).locator('.sh-supply')).toHaveText('Supply'); await expect(item(gm, name).getByRole('button', { name: /equip/i })).toHaveCount(0); }
  await expect(item(gm, "Penitent's Blade").locator('[data-sh=move]')).toHaveCount(1);
  await gm.locator('#sheetOverlay [data-sh=close]').click(); await gm.locator('#panel [data-do=deselect]').click(); await gm.locator('#panel [data-do=gmtab][data-t=loot]').click(); await expect(gm.locator('#panel').getByText(/\bEquip\b/)).toHaveCount(0);
});

test('on the My heroes page: supplies have the label, weapons and armour keep their buttons', async ({ browser }) => {
  const page = await newPage(browser); await page.goto('/character/'); await page.locator('[data-ready=wren]').click();
  const supplies = ["Locksmith's Picks", 'Rope and Grapnel', 'Hooded Lantern', 'Linen Bandages', 'Flask of Aqua Vitae'];
  for (const name of supplies) { const it = item(page, name); await expect(it.locator('.sh-supply'), name).toHaveText('Supply'); await expect(it.locator('[data-sh=move]'), name).toHaveCount(0); }
  for (const name of ['Windlass Crossbow', 'Quilted Gambeson']) { await expect(item(page, name).locator('.sh-supply')).toHaveCount(0); await expect(item(page, name).locator('[data-sh=move]')).toHaveText('To the pack'); }
  await item(page, 'Quilted Gambeson').locator('[data-sh=move]').click(); await expect(item(page, 'Quilted Gambeson').locator('[data-sh=move]')).toHaveText('Equip');
  await expect(page.getByText('Supply items cannot be equipped')).toHaveCount(0);                                // nothing needed putting right
});

test('a hero saved with a supply equipped is put right on My heroes, and the page says which hero and item, once', async ({ browser }) => {
  const page = await newPage(browser);
  await page.context().addInitScript(() => { if (!localStorage.getItem('sacrament-heroes-v2')) localStorage.setItem('sacrament-heroes-v2', JSON.stringify({ heroes: [{ id: 'hold', name: 'Old Maren', stats: { STR: 1, DEX: 0, CON: 2, INT: 0, WIS: 3, CHA: 0 }, effort: { basic: 0, weapons: 2, guns: 0, magic: 1, ultimate: 1 }, armour: 0, gear: [{ id: 'bandages', eq: true, uses: 3 }, { id: 'sword', eq: true }], hp: { cur: 10, max: 10 } }], current: 'hold', converted: {} })); });
  await page.goto('/character/');
  await expect(page.getByRole('status').filter({ hasText: 'Supply items cannot be equipped' })).toContainText('Old Maren: Linen Bandages');
  await expect(item(page, 'Linen Bandages').locator('.sh-supply')).toHaveText('Supply'); await expect(item(page, 'Linen Bandages').locator('[data-sh=move]')).toHaveCount(0);
  await expect(page.locator('#sheetHere h4', { hasText: 'Equipped' })).toContainText('1 of 10');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sacrament-heroes-v2')).heroes[0].gear.map((g) => g.id + (g.eq ? '+' : '-')).join());
  expect(saved).toBe('bandages-,sword+');
  await page.reload(); await expect(page.getByText('Supply items cannot be equipped')).toHaveCount(0);
});

test('on a phone @phone the label fits and nothing scrolls sideways', async ({ browser }) => {
  const { ann } = await setup(browser, { width: 390, height: 844 }); await ann.locator('#strip [data-do=sheet]').click(); await addOnSheet(ann, 'bandages', 'sword');
  await expect(item(ann, 'Linen Bandages').locator('.sh-supply')).toBeVisible();
  const wide = await ann.evaluate(() => { const o = document.querySelector('#sheetOverlay'); return o.scrollWidth - o.clientWidth; }); expect(wide).toBeLessThanOrEqual(1);
});
