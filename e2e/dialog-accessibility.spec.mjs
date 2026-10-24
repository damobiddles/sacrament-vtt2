import {test,expect,newPage,makeTable,openGmHeroSheet} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
test('sheet and loot dialogs keep keyboard focus inside and restore it when closed',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);
 for(const kind of ['sheet','loot']){
  if(kind==='sheet')await openGmHeroSheet(gm);
  else{await gm.locator('[data-do=deselect]').click();await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();}
  const id=kind==='sheet'?'sheetOverlay':'lootOverlay',dialog=gm.locator('#'+id);await expect(dialog).toBeVisible();
  await expect(gm.locator('#app')).toHaveAttribute('inert','');
  const controls=dialog.locator('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href]');
  await controls.last().focus();await gm.keyboard.press('Tab');await expect(controls.first()).toBeFocused();
  await gm.keyboard.press('Shift+Tab');await expect(controls.last()).toBeFocused();
  await gm.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(gm.locator('#app')).not.toHaveAttribute('inert','');
  await expect(gm.locator(kind==='sheet'?'#panel [data-do=sheet]':'[data-do=designLoot]')).toBeFocused();
 }
 expect(gm.errors).toEqual([]);
});

test('the sheet reflows in a narrow desktop viewport and has no automated accessibility violations',async({browser},info)=>{
 const {createRequire}=await import('node:module');const page=await newPage(browser,{width:683,height:500});await makeTable(page);await openGmHeroSheet(page);
 await page.addScriptTag({path:createRequire(import.meta.url).resolve('axe-core/axe.min.js')});
 const violations=await bounded(page.evaluate(async()=>{const r=await window.axe.run('#sheetOverlay',{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}));}),15000,'checking sheet accessibility');expect(violations).toEqual([]);
 const overflow=await bounded(page.locator('#sheetOverlay').evaluate(el=>el.scrollWidth>el.clientWidth+1),5000,'checking sheet reflow');expect(overflow).toBe(false);await page.screenshot({path:info.outputPath('sheet-reflow.png'),fullPage:true});expect(page.errors).toEqual([]);
});
