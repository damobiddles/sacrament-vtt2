import {prepareItem,rollPrepared} from './helpers.mjs';
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
  await ann.locator('#panel [data-do=sheet]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-item')).toContainText("Penitent's Blade");
}

test('Play prepares an item, the footer rolls its check and damage, and Activity shows the sum',async({browser})=>{
 const {gm,ann}=await setup(browser);await takeBlade(ann);await expect(ann.locator('#sheetOverlay')).toContainText('Weapons Effort (d6)');await ann.locator('[data-sh=close]').click();
 await ann.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await expect(ann.locator('#panel')).toContainText('How are you going to deal with');
 const id=Object.values((await state(ann)).cards).find(c=>c.name==='Pit Ghoul').id,hp0=(await state(ann)).cards[id].hp.cur;
 await prepareItem(ann);expect((await state(ann)).rolls).toHaveLength(0);await ann.locator('#strip input[data-phys]').fill('15');await rollPrepared(ann);
 await expect(ann.locator('#feed li.success')).toContainText('Success');expect((await state(ann)).cards[id].hp.cur).toBe(hp0);
 await expect(ann.locator('#strip [data-do=effort]')).toContainText('Weapons d6');await ann.locator('#physE').fill('4');await ann.locator('#strip [data-do=effort]').click();await saved(ann);
 await expect(ann.locator('#feed')).toContainText('d6 4 + 3 Weapons = 7 damage');expect((await state(ann)).cards[id].hp.cur).toBe(hp0-7);await expect(ann.locator('[data-do=apply]')).toHaveCount(0);expect(ann.errors.concat(gm.errors)).toEqual([]);
});
test('sheet manages equipment; Play explains why an unequipped item cannot be prepared',async({browser})=>{
 const {ann}=await setup(browser);await takeBlade(ann);await ann.locator('#shAdd').selectOption('cloak');await ann.locator('[data-sh=add]').click();
 await expect(ann.locator('#sheetOverlay [data-sh=use],#sheetOverlay [data-sh=quickUse]')).toHaveCount(0);
 await ann.locator('.sh-item',{hasText:"Penitent's Blade"}).locator('[data-sh=move]').click();await saved(ann);await ann.locator('[data-sh=close]').click();
 await prepareItem(ann);await expect(ann.locator('#feed')).toContainText("Equip the Penitent's Blade first");await expect(ann.locator('[data-do=commitUse]')).toHaveCount(0);
 await ann.locator('#panel [data-do=sheet]').click();await ann.locator('.sh-item',{hasText:"Penitent's Blade"}).locator('[data-sh=move]').click();await saved(ann);await ann.locator('[data-sh=close]').click();
 await prepareItem(ann);await ann.locator('#attackTarget').selectOption({label:'Pit Ghoul'});await ann.locator('[data-do=confirmAttack]').click();await rollPrepared(ann);await expect(ann.locator('#feed')).toContainText('STR');expect(ann.errors).toEqual([]);
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
  await ann.locator('#panel [data-do=sheet]').click();
  await expect(ann.locator('#sheetOverlay [data-sh=quickUse]')).toHaveCount(0);await ann.locator('[data-sh=close]').click();await prepareItem(ann);await expect(ann.locator('#attackTarget')).toBeVisible();
  const wide = await ann.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(wide).toBeLessThanOrEqual(1);
});
