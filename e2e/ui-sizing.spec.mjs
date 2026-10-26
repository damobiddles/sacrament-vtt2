import {test,expect,newPage,makeTable,joinTable,claimHero,prepareItem,rollPrepared} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';

async function inspect(page,selector){
 return bounded(page.locator(selector).evaluate(root=>{
  const issues=[];
  for(const e of root.querySelectorAll('button,label,input:not([type=checkbox]),select,summary,.note,.pill,.sh-pill,.sh-stat small')){
   const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;
   const s=getComputedStyle(e),name=(e.textContent||e.id).trim().slice(0,45);
   if(parseFloat(s.fontSize)<14)issues.push(name+': text '+s.fontSize);
   if(e.matches('button')&&r.height<39.5)issues.push(name+': height '+r.height);
   if(e.matches('button,select')&&e.scrollWidth>e.clientWidth+2)issues.push(name+': label clipped');
  }
  if(root.scrollWidth>root.clientWidth+2)issues.push('container overflows');
  return issues;
 }),5000,'checking readable controls');
}

for(const viewport of [{width:1366,height:800},{width:360,height:640}])test(`readable GM/player controls and reachable dice at ${viewport.width}px`,async({browser},info)=>{
 const gm=await newPage(browser,viewport),player=await newPage(browser,viewport),code=await makeTable(gm);
 for(const tab of ['play','scene','loot','table']){
  await gm.locator(`[data-do=gmtab][data-t=${tab}]`).click();expect(await inspect(gm,'#panel'),tab).toEqual([]);
 }
 expect(await inspect(gm,'#strip')).toEqual([]);
 await joinTable(player,code,'Reader');await claimHero(player,'Thorne');
 expect(await inspect(player,'#strip')).toEqual([]);
 await player.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(player);expect(await inspect(player,'#panel')).toEqual([]);
 await player.locator('#strip input[data-phys]').fill('15');await rollPrepared(player);
 await expect(player.locator('.die.landed')).toBeVisible();
 const die=await player.locator('.die.landed').first().boundingBox();expect(die.width).toBeGreaterThanOrEqual(viewport.width===360?64:72);
 // In narrow windows the tray and scene scroll together. Return to the scene
 // before checking the result card's own layout.
 if(viewport.width===360){await player.locator('#tablewrap').scrollIntoViewIfNeeded();await expect(player.locator('.die.landed')).toBeInViewport();await expect(player.locator('.reveal-action')).toBeInViewport();}
 await player.locator('.reveal-action').scrollIntoViewIfNeeded();await expect(player.locator('.reveal-action')).toBeInViewport();
 const covered=await bounded(player.locator('.reveal-who').evaluate(e=>{const r=e.getBoundingClientRect();return [.2,.5,.8].some(y=>!e.closest('.reveal-result').contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height*y)));}),5000,'checking result text is above map tools');expect(covered).toBe(false);
 await player.screenshot({path:info.outputPath('player-dice.png')});
 await player.locator('.reveal-action').focus();await player.locator('.reveal-action').press('Enter');await expect(player.locator('#feed')).toContainText('HP -');
 await gm.locator('#cards .c',{hasText:'Thorne'}).click();await gm.locator('#panel [data-do=sheet]').click();
 expect(await inspect(gm,'#sheetOverlay')).toEqual([]);
 await gm.screenshot({path:info.outputPath('sheet.png')});expect(gm.errors.concat(player.errors)).toEqual([]);
});

test('larger text keeps GM tabs and controls inside the tray',async({browser})=>{
 const gm=await newPage(browser,{width:1000,height:700});await makeTable(gm);
 await bounded(gm.evaluate(()=>{document.documentElement.style.fontSize='20px';}),5000,'enlarging text');
 for(const tab of ['play','scene','loot','table']){
  await gm.locator(`[data-do=gmtab][data-t=${tab}]`).click();expect(await inspect(gm,'#panel'),tab).toEqual([]);
 }
});
