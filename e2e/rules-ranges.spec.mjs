import {test,expect,newPage,makeTable,openGmHeroSheet,saved} from './helpers.mjs';
test.setTimeout(60000);
test('current public rules and loot agree with the VTT range definitions',async({browser},info)=>{
 const page=await newPage(browser);
 for(const path of ['/rules/','/player-guide/','/gm-guide/','/loot/']){
  await page.goto(path);await expect(page.locator('.range-reference [data-range]')).toHaveCount(4);
  await expect(page.locator('.range-reference [data-range=near]')).toContainText('30 feet');await expect(page.locator('.range-reference [data-range=veryfar]')).toContainText('GM judges');
 }
 await expect(page.locator('#item-watchlongbow')).toContainText('Range: Very Far');await expect(page.locator('#item-spear')).toContainText('Range: Close');await expect(page.locator('#item-hatchet')).toContainText('Thrown: Near');
 await page.screenshot({path:info.outputPath('loot-ranges.png')});
 await makeTable(page);await openGmHeroSheet(page);await expect(page.locator('#sheetOverlay')).toContainText('Range: Close');await page.keyboard.press('Escape');await page.locator('#panel [data-do=deselect]').click();
 await page.locator('[data-do=gmtab][data-t=loot]').click();await page.locator('[data-do=designLoot]').click();await page.locator('[data-lf=name]').fill('Range audit rifle');await page.locator('[data-lf=category]').selectOption('Weapon');await page.locator('[data-lf=weaponStyle]').selectOption('firearm');await page.locator('[data-lf=band]').selectOption('veryfar');await expect(page.locator('#ltPrev')).toContainText('Range: Very Far');await page.locator('[data-lb=save]').click();await saved(page);await expect(page.locator('#ltLib')).toContainText('Range: Very Far');
 await page.screenshot({path:info.outputPath('designer-range.png')});expect(page.errors).toEqual([]);
});
