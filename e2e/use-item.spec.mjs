// Using an item at the table (the strip asks what the hero is using, and the player rolls the damage as its own step), and the GM's d100 loot table. A GM and a player in separate windows.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';

const hero = (page, name) => state(page).then((st) => Object.values(st.chars).find((c) => c.name === name));
async function setup(browser, viewport) {
  const gm = await newPage(browser), ann = await newPage(browser, viewport);
  const code = await makeTable(gm); await emptyPacks(gm);   /* these tests count gear from nothing */ await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  return { gm, ann };
}
/** Ann takes the Penitent's Blade on her sheet (it is on the starter list) and closes the sheet */
async function takeBlade(ann) {
  await ann.locator('#strip [data-do=sheet]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-item')).toContainText("Penitent's Blade");
}

test('Aiming at a foe: the strip asks what the hero is using; the hit rolls nothing more until the player presses Roll damage; Apply works as always', async ({ browser }) => {
  const { gm, ann } = await setup(browser); await takeBlade(ann);
  await expect(ann.locator('#sheetOverlay')).toContainText('Weapons Effort (d6)');
  await ann.locator('#sheetOverlay [data-sh=close]').click();
  const ghoul = ann.locator('#cards .c', { hasText: 'Pit Ghoul' }); const id = await ghoul.getAttribute('data-id'); const hp0 = (await state(ann)).cards[id].hp.cur;
  await ghoul.click();
  await expect(ann.locator('#strip .aim-prompt')).toContainText('How are you going to deal with');
  await ann.locator('.stat[data-stat=STR]').click();
  await expect(ann.locator('#strip [data-noitem]')).toContainText('Roll STR with no item');
  expect((await state(ann)).rolls.length).toBe(0);
  await ann.locator('[data-do=toggle][data-key=more]').click(); await ann.locator('[data-do=toggle][data-key=dice]').click(); await ann.locator('#strip input[data-phys]').fill('15');
  await ann.locator('#strip [data-do=sheet]').click();
  await ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" }).locator('[data-sh=use]').click();
  await expect(ann.locator('#panel .calc.ok')).toContainText('Success');
  await expect(ann.locator('#panel')).toContainText("Penitent's Blade");
  await expect(ann.locator('#panel')).toContainText('the result applies to the chosen target.');
  expect((await state(ann)).cards[id].hp.cur).toBe(hp0);
  await expect(ann.locator('#panel [data-do=effort]').first()).toContainText('Roll damage: Weapons d6 +3');    // one button, the item's own die
  await ann.locator('#panel [data-do=effort][data-cat=weapons]').click();
  await expect(ann.locator('#panel .calc').nth(1)).toContainText(/d6 \d \+ 3 Weapons = \d+ damage/);   /* against a foe it is called damage */
  const total = +(/= (\d+) damage/.exec(await ann.locator('#panel .calc').nth(1).innerText())[1]);
  await expect(ann.locator('[data-do=apply]')).toHaveCount(0); await expect(ann.locator('#panel')).toContainText('Applied'); await saved(ann);
  expect((await state(ann)).cards[id].hp.cur).toBe(hp0 - total);
  expect(ann.errors).toEqual([]); expect(gm.errors).toEqual([]);
});

test('Use on the sheet: it closes the sheet and shows the roll; an unequipped item says why it cannot be used; an item with no Effort has no Use button', async ({ browser }) => {
  const { ann } = await setup(browser); await takeBlade(ann);
  await ann.locator('#sheetOverlay #shAdd').selectOption('cloak'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-item', { hasText: "Pilgrim's Cloak" }).locator('[data-sh=use]')).toHaveCount(0);   // the cloak never rolls
  await ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" }).locator('[data-sh=move]').click();                 // to the pack
  await ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" }).locator('[data-sh=use]').click();
  await expect(ann.locator('#sheetOverlay .sh-msg')).toContainText("Equip the Penitent's Blade first");
  await ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" }).locator('[data-sh=move]').click();                 // back in hand
  await ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" }).locator('[data-sh=use]').click();
  await expect(ann.locator('#sheetOverlay')).toBeHidden();                                // the sheet gets out of the way
  await expect(ann.locator('#panel')).toContainText("Penitent's Blade");
  await ann.locator('#attackTarget').selectOption({label:'Pit Ghoul'}); await ann.locator('[data-do=confirmAttack]').click();
  await expect(ann.locator('#panel .calc').first()).toContainText('STR');
});

test('the GM\'s loot table: roll, see the find and a GM-only note, put it on the table hidden or give it to a hero; players are told nothing', async ({ browser }) => {
  const { gm, ann } = await setup(browser);
  await gm.locator('#panel [data-do=gmtab][data-t=loot]').click();
  await gm.locator('#physL').fill('100'); await gm.locator('[data-do=lootRoll]').click();
  await expect(gm.locator('#panel')).toContainText('Shard of a binding seal'); await expect(gm.locator('#panel')).toContainText('For you only');
  await expect(gm.locator('#panel')).toContainText('Tempts the Horror');
  await gm.locator('[data-do=rollPlace]').click(); await saved(gm);
  await expect.poll(async () => Object.values((await state(gm)).cards).filter((c) => c.name === 'Shard of a binding seal').length).toBe(1);
  const card = Object.values((await state(gm)).cards).find((c) => c.name === 'Shard of a binding seal'); expect(card.visible).toBe(false); expect(card.gmNotes).toMatch(/missing this/);
  await gm.locator('#lootHero').selectOption({ label: 'Thorne' }); await gm.locator('[data-do=lootGive]').click(); await saved(gm);
  await expect.poll(async () => ((await hero(gm, 'Thorne')).gear || []).map((g) => g.id).join()).toBe('sealshard');
  await ann.waitForTimeout(1500);
  const raw = JSON.stringify(await state(ann)); expect(raw).not.toMatch(/missing this|Loot roll/);
  await expect(ann.locator('#panel [data-do=gmtab]')).toHaveCount(0);
  expect(gm.errors).toEqual([]);
});

test('the sheet quick actions fit a phone @phone', async ({ browser }) => {
  const { ann } = await setup(browser, { width: 390, height: 844 }); await takeBlade(ann);
  await ann.locator('#sheetOverlay [data-sh=close]').click();
  await ann.locator('#strip [data-do=sheet]').click();
  await expect(ann.locator('#sheetOverlay [data-sh=quickUse]').first()).toBeVisible();
  const wide = await ann.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(wide).toBeLessThanOrEqual(1);
});
