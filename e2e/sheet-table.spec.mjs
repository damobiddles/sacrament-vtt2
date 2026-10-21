// The character sheet at the table: a full-screen panel over a table that keeps running, with a GM and players in separate windows.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';

const hero = (page, name) => state(page).then((st) => Object.values(st.chars).find((c) => c.name === name));
async function two(browser, viewport) {
  const gm = await newPage(browser), ann = await newPage(browser, viewport), bob = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm);   /* these tests count gear from nothing */
  await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne'); await joinTable(bob, code, 'Bob'); await claimHero(bob, 'Wisp');
  return { gm, ann, bob };
}
const openSheet = async (page) => { await page.locator('#strip [data-do=sheet]').click(); await expect(page.locator('#sheetOverlay')).toBeVisible(); };

test('the Sheet button opens the hero over the table, and closing it returns straight to play', async ({ browser }) => {
  const { ann } = await two(browser);
  await openSheet(ann);
  const box = await ann.locator('#sheetOverlay').boundingBox(), vp = ann.viewportSize();
  expect(box.width).toBe(vp.width); expect(box.height).toBe(vp.height);          // it fills the screen
  await expect(ann.locator('#sheetOverlay')).toContainText('Thorne'); await expect(ann.locator('#sheetOverlay')).toContainText('Defence 14');
  await expect(ann.locator('#tStatus')).toContainText('Saved');                    // still connected underneath
  // nothing from the table shows through or on top: whatever is under each toolbar button is the sheet
  const uncovered = await ann.evaluate(() => [...document.querySelectorAll('#toolbar .chip, #strip button, #tTarget button')].filter((b) => { const r = b.getBoundingClientRect(); if (!r.width) return false; const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !(top && top.closest('#sheetOverlay')); }).map((b) => b.id || b.dataset.do || b.className));
  expect(uncovered, 'table controls showing on top of the sheet').toEqual([]);
  await ann.locator('#sheetOverlay [data-sh=close]').click();
  await expect(ann.locator('#sheetOverlay')).toBeHidden(); await expect(ann.locator('#strip .stat').first()).toBeVisible();
  await openSheet(ann); await ann.keyboard.press('Escape'); await expect(ann.locator('#sheetOverlay')).toBeHidden();
  expect(ann.errors).toEqual([]);
});

test('editing: a player changes text, scores and gear, and the table has it at once', async ({ browser }) => {
  const { gm, ann } = await two(browser); await openSheet(ann);
  await ann.locator('#sheetOverlay [data-text=vow]').fill('Never leave a bell unanswered.'); await ann.locator('#sheetOverlay [data-text=vow]').blur();
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-item')).toContainText("Penitent's Blade");
  await ann.locator('#sheetOverlay [data-sh=score][data-k=STR][data-d="-1"]').click();         // Thorne's STR 3 -> 2, a point is free
  await ann.locator('#sheetOverlay [data-sh=score][data-k=DEX][data-d="1"]').click();
  await saved(ann);
  await expect.poll(async () => (await hero(gm, 'Thorne')).vow).toBe('Never leave a bell unanswered.');
  await expect.poll(async () => { const h = await hero(gm, 'Thorne'); return h.gear.map((g) => g.id).join() + '|' + h.stats.STR + h.stats.DEX; }).toBe('sword|21');
  await expect(ann.locator('#sheetOverlay')).toContainText('0 of 6 points left');
});

test('limits: the sheet says why, in plain words, and sends nothing', async ({ browser }) => {
  const { gm, ann } = await two(browser); await openSheet(ann);
  const requests = []; ann.on('request', (r) => { if (r.method() === 'POST' && /"type":"sheet"/.test(r.postData() || '')) requests.push(r.postData()); });
  await ann.locator('#sheetOverlay [data-sh=score][data-k=DEX][data-d="1"]').click();
  await expect(ann.locator('#sheetOverlay .sh-msg')).toContainText('no points left');
  await ann.locator('#sheetOverlay #shAdd').selectOption('embers'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('litany'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-msg')).toContainText('one grimoire');
  await expect(ann.locator('#sheetOverlay #shAdd optgroup[label^="Relics"]')).toHaveCount(0);   // relics are not offered to a player
  expect(requests.length).toBe(1);                                                              // only the first grimoire was sent
  expect((await hero(gm, 'Thorne')).stats.DEX).toBe(0);
  await expect(ann.locator('#sheetOverlay')).toContainText('Tempts the Horror');
});

test('permissions: a player has a Sheet button only for their own hero; the GM can open and edit every hero', async ({ browser }) => {
  const { gm, ann, bob } = await two(browser);
  await ann.locator('#cards .c', { hasText: 'Wisp' }).click();
  await expect(ann.locator('#panel [data-do=sheet]')).toHaveCount(0);                // nothing for someone else's hero
  await ann.locator('#cards .c', { hasText: 'Thorne' }).click(); await expect(ann.locator('#panel [data-do=sheet]')).toHaveCount(1);
  await gm.locator('#cards .c', { hasText: 'Wisp' }).click(); await gm.locator('#panel [data-do=sheet]').click();
  await expect(gm.locator('#sheetOverlay')).toContainText('Wisp'); await expect(gm.locator('#sheetOverlay')).toContainText('Relics');   // the GM may give a relic
  await gm.locator('#sheetOverlay [data-text=notes]').fill('GM note on Wisp'); await gm.locator('#sheetOverlay [data-text=notes]').blur(); await saved(gm);
  await openSheet(bob);
  await expect(bob.locator('#sheetOverlay [data-text=notes]')).toHaveValue('GM note on Wisp');     // the player sees the GM's change on an open sheet
});

test('live: what happens at the table shows on an open sheet, and the sheet\'s name shows on the token', async ({ browser }) => {
  const { gm, ann } = await two(browser); await openSheet(ann);
  const thorneCard = (await hero(gm, 'Thorne')).cardId;
  await gm.locator(`#cards .c[data-id="${thorneCard}"]`).click();
  await gm.locator('#panel [data-do=track][data-field=hp][data-d="-5"]').click(); await saved(gm);
  await expect(ann.locator('#sheetOverlay .sh-hpn')).toHaveText('5 / 10');
  await ann.locator('#sheetOverlay [data-sh=hp][data-d="1"]').click(); await saved(ann);
  await expect.poll(async () => (await state(gm)).cards[thorneCard].hp.cur).toBe(6);
  await ann.locator('#sheetOverlay [data-text=name]').fill('Thorne of Grimsby Fold'); await ann.locator('#sheetOverlay [data-text=name]').blur(); await saved(ann);
  await expect(gm.locator('#cards .c', { hasText: 'Thorne of Grimsby Fold' })).toHaveCount(1);
});

test('on a phone @phone the sheet fills the screen, does not scroll sideways, and the table is still there when it closes', async ({ browser }) => {
  const { ann } = await two(browser, { width: 390, height: 844 }); await openSheet(ann);
  const wide = await ann.evaluate(() => { const el = document.querySelector('#sheetOverlay'); return el.scrollWidth - el.clientWidth; }); expect(wide).toBeLessThanOrEqual(1);
  const box = await ann.locator('#sheetOverlay').boundingBox(); expect([box.width, box.height]).toEqual([390, 844]);
  await ann.locator('#sheetOverlay #shAdd').scrollIntoViewIfNeeded(); await ann.locator('#sheetOverlay [data-sh=close]').click();
  await expect(ann.locator('#cards .c').first()).toBeVisible();
});

test('bringing a hero from My heroes: it is checked, becomes yours, and the table shows it', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm, { sample: false });
  await ann.context().addInitScript(() => { if (!localStorage.getItem('sacrament-heroes-v2')) localStorage.setItem('sacrament-heroes-v2', JSON.stringify({ heroes: [{ id: 'hx1', name: 'Wren Ashdown', calling: 'Cartographer', stats: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 0, guns: 3, magic: 0, ultimate: 0 }, armour: 0, gear: [{ id: 'crossbow', eq: true }, { id: 'gambeson', eq: true }], hp: { cur: 10, max: 10 } }], current: 'hx1', converted: {} })); });
  await joinTable(ann, code, 'Ann');
  await ann.locator('[data-do=bring]').click();
  await expect(ann.locator('#strip')).toContainText('Wren Ashdown');
  await openSheet(ann); await expect(ann.locator('#sheetOverlay')).toContainText('Defence 13');
  await expect.poll(async () => ((await hero(gm, 'Wren Ashdown')) || {}).owner || '').not.toBe('');
});

test('on a slow connection quick clicks are judged against what you have already done, not the last answer the table sent', async ({ browser }) => {
  const { gm, ann } = await two(browser); await openSheet(ann);
  await ann.route(/\.netlify\/functions\/vtt|\/api\/vtt/, async (route) => { if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 700)); await route.continue(); });
  const sheet = ann.locator('#sheetOverlay');
  await sheet.locator('[data-sh=score][data-k=STR][data-d="-1"]').click();             // frees a point...
  await sheet.locator('[data-sh=score][data-k=DEX][data-d="1"]').click();              // ...which the very next click uses, before the table has answered
  await expect(sheet.locator('.sh-msg')).not.toContainText('no points left');
  await sheet.locator('#shAdd').selectOption('embers'); await sheet.locator('[data-sh=add]').click();
  await sheet.locator('#shAdd').selectOption('litany'); await sheet.locator('[data-sh=add]').click();
  await expect(sheet.locator('.sh-msg')).toContainText('one grimoire');                 // refused at once, with the reason, because the first book is already counted
  await expect.poll(async () => { const h = await hero(gm, 'Thorne'); return h.stats.STR + '' + h.stats.DEX + '|' + h.gear.map((g) => g.id).join(); }, { timeout: 15000 }).toBe('21|embers');
  await expect(sheet).toContainText('0 of 6 points left');
});
