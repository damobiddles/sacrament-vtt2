// The GM's loot designer: design, edit and delete in a library; put an item on the table as a hidden card, reveal it, give it from the card or the library; players see none of the library or unrevealed cards.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';

test.setTimeout(120000);
const designer = (page) => page.locator('#lootOverlay');
const heroGear = async (page, name) => (Object.values((await state(page)).chars).find((c) => c.name === name).gear || []);
async function setup(browser, viewport) {
  const gm = await newPage(browser, viewport), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm);   /* these tests count gear from nothing */ await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await expect(gm.locator('[data-do=gmtab][data-t=loot]')).toBeVisible();
  await expect(async () => { await gm.locator('[data-do=gmtab][data-t=loot]').click(); await expect(gm.locator('[data-do=designLoot]')).toBeVisible({ timeout: 1500 }); }).toPass({ timeout: 15000 });   // a slow live table may still be drawing its tray
  return { gm, ann };
}
async function fill(gm, o) {
  const d = designer(gm);
  await d.locator('[data-lf=name]').fill(o.name);
  if (o.category) await d.locator('[data-lf=category]').selectOption(o.category);
  if (o.cat) await d.locator('[data-lf=cat]').selectOption(o.cat);
  if (o.flavour) await d.locator('[data-lf=flavour]').fill(o.flavour);
  if (o.does) await d.locator('[data-lf=does]').fill(o.does);
  if (o.notes) await d.locator('[data-lf=notes]').fill(o.notes);
  if (o.tempts) { await d.locator('[data-lseg=temptsHorror][data-v=true]').click(); await d.locator('[data-lf=horror]').fill(String(o.horror ?? 1)); }
}

test('design, edit and delete: the library shows it, the preview follows the form, and Delete asks twice', async ({ browser }) => {
  const { gm } = await setup(browser);
  await gm.locator('[data-do=designLoot]').click(); await expect(designer(gm)).toBeVisible();
  await fill(gm, { name: 'Ghoul-Tooth Charm', category: 'Curio', cat: 'magic', flavour: 'Strung on gut.', does: 'Hold it up.', notes: 'SECRETNOTE', tempts: true, horror: 2 });
  await expect(designer(gm).locator('#ltPrev')).toContainText('Ghoul-Tooth Charm'); await expect(designer(gm).locator('#ltPrev')).toContainText('Tempts the Horror · 2');
  await expect(designer(gm).locator('#ltPrev')).not.toContainText('SECRETNOTE');
  await designer(gm).locator('[data-lb=save]').click();
  await expect(designer(gm).locator('#ltLib')).toContainText('Ghoul-Tooth Charm'); await expect(designer(gm).locator('#ltLib')).toContainText('Library (1)');
  await designer(gm).locator('[data-lf=name]').fill('Ghoul-Tooth Charm II'); await designer(gm).locator('[data-lb=save]').click();
  await expect(designer(gm).locator('#ltLib')).toContainText('Ghoul-Tooth Charm II'); await expect(designer(gm).locator('#ltLib')).toContainText('Library (1)');
  await designer(gm).locator('#ltLib [data-lb=del]').click(); await expect(designer(gm).locator('#ltLib')).toContainText('Library (1)'); await expect(designer(gm).locator('#ltLib [data-lb=del]')).toHaveText('Really delete?');
  await designer(gm).locator('#ltLib [data-lb=del]').click(); await expect(designer(gm).locator('#ltLib')).toContainText('Library (0)');
  await designer(gm).locator('[data-lb=close]').first().click(); await expect(designer(gm)).toBeHidden(); expect(gm.errors).toEqual([]);
});

test('give from the library: it lands on the hero\'s sheet once with its details; the player can read it and the notes stay with the GM; the player never sees the library', async ({ browser }) => {
  const { gm, ann } = await setup(browser);
  await gm.locator('[data-do=designLoot]').click();
  await fill(gm, { name: 'Sexton Lantern', category: 'Mundane', flavour: 'Oil-black glass.', does: 'Shows what hides.', notes: 'SECRETNOTE' });
  await designer(gm).locator('[data-lb=save]').click(); await expect(designer(gm).locator('#ltLib')).toContainText('Sexton Lantern');
  await designer(gm).locator('#ltLib [data-lhero]').selectOption({ label: 'Thorne' });
  await designer(gm).locator('#ltLib [data-lb=give]').dblclick(); await saved(gm);
  await expect.poll(async () => (await heroGear(gm, 'Thorne')).length).toBe(1);
  await gm.waitForTimeout(800); expect((await heroGear(gm, 'Thorne')).length, 'a double click gave it once').toBe(1);
  await expect.poll(async () => (await heroGear(ann, 'Thorne')).length).toBe(1);
  await ann.locator('#strip [data-do=sheet]').click(); const it = ann.locator('#sheetOverlay .sh-item').filter({ hasText: 'Sexton Lantern' });
  await expect(it).toContainText('Oil-black glass.', { timeout: 15000 }); await expect(it).toContainText('Shows what hides.'); await expect(it.locator('.sh-supply')).toHaveText('Supply'); await expect(it.getByRole('button', { name: /equip/i })).toHaveCount(0);
  const raw = JSON.stringify(await state(ann)); expect(raw).not.toMatch(/SECRETNOTE|lootLib/);
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('a card: put on the table hidden (the player is told nothing), revealed (they read it, not the notes), then given to a hero from the card, which leaves the table', async ({ browser }) => {
  const { gm, ann } = await setup(browser);
  await gm.locator('[data-do=designLoot]').click();
  await fill(gm, { name: 'Vesper Seal', category: 'Valuable', flavour: 'Wax and a thumbprint.', notes: 'SECRETNOTE' });
  await designer(gm).locator('[data-lb=saveplace]').click(); await expect(designer(gm)).toContainText('put on the table, hidden');
  await designer(gm).locator('[data-lb=close]').first().click();
  const card = async (p) => Object.values((await state(p)).cards).find((c) => c.name === 'Vesper Seal');
  await expect.poll(async () => !!(await card(gm))).toBe(true); expect((await card(gm)).visible).toBe(false);
  await ann.waitForTimeout(1200); expect(await card(ann), 'hidden: the player has nothing').toBeUndefined(); expect(JSON.stringify(await state(ann))).not.toMatch(/Vesper|SECRETNOTE/);
  await gm.locator('#cards .c', { hasText: 'Vesper Seal' }).click();
  await gm.locator('#panel [data-do=visible]').click(); await saved(gm);
  await expect.poll(async () => (await card(ann))?.desc).toMatch(/Wax and a thumbprint/);
  expect(JSON.stringify(await state(ann))).not.toMatch(/SECRETNOTE/); expect((await card(ann)).loot).toBeUndefined();
  await gm.locator('#cardHero').selectOption({ label: 'Thorne' }); await gm.locator('[data-do=cardGive]').click(); await saved(gm);
  await expect.poll(async () => (await heroGear(gm, 'Thorne')).length).toBe(1); expect(await card(gm), 'the card left the table').toBeUndefined();
  await expect.poll(async () => (await card(ann))).toBeUndefined(); await gm.waitForTimeout(600); expect((await heroGear(gm, 'Thorne')).length).toBe(1);
  expect(gm.errors).toEqual([]);
});

test('a rolled item can be edited first and then put on the table or given; players have no loot controls at all', async ({ browser }) => {
  const { gm, ann } = await setup(browser);
  await gm.locator('#physL').fill('87 4'); await gm.locator('[data-do=lootRoll]').click(); await expect(gm.locator('#panel')).toContainText('Ashen Rosary');
  await expect(gm.locator('#panel')).toContainText('87 → Relics d8: 4');   // the d100 led to the Relics sub-table
  await gm.locator('[data-do=rollEdit]').click(); await expect(designer(gm).locator('[data-lf=name]')).toHaveValue('Ashen Rosary');
  await designer(gm).locator('[data-lf=name]').fill('Blackened Rosary'); await designer(gm).locator('[data-lb=placeform]').click(); await expect(designer(gm)).toContainText('Put on the table, hidden');
  await designer(gm).locator('[data-lb=close]').first().click();
  await expect.poll(async () => Object.values((await state(gm)).cards).some((c) => c.name === 'Blackened Rosary')).toBe(true);
  expect((await state(gm)).lootLib.length, 'a copy for the table is not saved to the library unless asked').toBe(0);
  await expect(ann.locator('[data-do=designLoot], #lootOverlay:not([hidden]), [data-do=gmtab]')).toHaveCount(0);
});

test('on a phone @phone the designer fits, the tabs switch between the library and the form, and nothing scrolls sideways', async ({ browser }) => {
  const { gm } = await setup(browser, { width: 390, height: 844 });
  await gm.locator('[data-do=designLoot]').click(); await expect(designer(gm).locator('.lt-tabs')).toBeVisible();
  await expect(designer(gm).locator('#ltForm')).toBeVisible(); await expect(designer(gm).locator('#ltLib')).toBeHidden();
  await fill(gm, { name: 'Bone Comb', category: 'Mundane' }); await designer(gm).locator('[data-lb=save]').click();
  await designer(gm).locator('[data-lb=tab][data-t=lib]').click(); await expect(designer(gm).locator('#ltLib')).toContainText('Bone Comb'); await expect(designer(gm).locator('#ltForm')).toBeHidden();
  const wide = await gm.evaluate(() => { const o = document.querySelector('#lootOverlay'); return o.scrollWidth - o.clientWidth; }); expect(wide).toBeLessThanOrEqual(1);
});
