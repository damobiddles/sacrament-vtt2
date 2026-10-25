import {test,expect,newPage,makeTable,joinTable,claimHero,saved,state} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);

test('GM and player roles are explicit; the GM has dice without a player strip or an acting hero',async({browser},info)=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');
 await expect(gm.locator('[data-do=gmstrip],#actAs,#strip .stat')).toHaveCount(0);
 await expect(gm.locator('#tRole')).toHaveText('GM view');await expect(p.locator('#tRole')).toHaveText('Player view');
 expect(await gm.locator('#tRole').evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(await p.locator('#tRole').evaluate(e=>getComputedStyle(e).backgroundColor));
 await expect(p.locator('#strip .stat')).toHaveCount(6);await expect(p.locator('[data-do=endTurn],[data-do=gmDiceToggle]')).toHaveCount(0);
 await expect(gm.locator('#cards .tag')).not.toContainText(['(acting)']);
 await expect(gm.locator('#gmDie')).toBeVisible();await gm.locator('#gmDie').selectOption('10');await gm.locator('#gmDiceCount').fill('2');await gm.locator('#gmDicePrivate').check();await gm.locator('[data-do=gmDiceRoll]').click();await saved(gm);
 await expect(gm.locator('.gm-dice [role=status]')).toContainText('GM only:');
 const privateLog=(await state(gm)).log.find(e=>e.text.startsWith('GM rolls 2d10'));expect(privateLog).toBeTruthy();expect((await state(p)).log.some(e=>e.id===privateLog.id)).toBe(false);
 await gm.screenshot({path:info.outputPath('gm-view.png')});await p.screenshot({path:info.outputPath('player-view.png')});expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});

for(const viewport of [{width:683,height:500},{width:1000,height:500},{width:1366,height:768}])test(`GM controls and hero sheets are reachable at ${viewport.width} by ${viewport.height}`,async({browser},info)=>{
 const gm=await newPage(browser,viewport);await makeTable(gm);
 await gm.locator('#cards .c',{hasText:'Thorne'}).click();await gm.locator('#panel [data-do=sheet]').click();await expect(gm.locator('#sheetOverlay')).toBeVisible();
 await expect(gm.locator('#sheetOverlay [data-sh=gmRoll]')).toHaveCount(6);await gm.locator('#shGmAdj').selectOption('hard');await gm.locator('#shGmD20').fill('17');await gm.locator('#sheetOverlay [data-sh=gmRoll][data-stat=WIS]').click();await expect(gm.locator('#sheetOverlay')).toBeHidden();await saved(gm);
 await expect(gm.locator('#panel')).toContainText('WIS');expect((await state(gm)).rolls.at(-1).charId).toBe(Object.values((await state(gm)).chars).find(h=>h.name==='Thorne').id);
 expect((await state(gm)).rolls.at(-1).check.d20).toBe(17);expect((await state(gm)).rolls.at(-1).check.target).toBe(15);
 await gm.locator('[data-do=dismissRoll]').click();await gm.locator('#panel [data-do=deselect]').click();
 for(const t of ['scene','loot','table','play']){await gm.locator(`[data-do=gmtab][data-t=${t}]`).click();await expect(gm.locator(`[data-do=gmtab][data-t=${t}]`)).toHaveAttribute('aria-selected','true');}
 await gm.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await gm.locator('[data-do=attackToggle]').click();await gm.locator('#physA').fill('20');await gm.locator('[data-do=monsterAttack]').click();await gm.locator('[data-do=monsterEffort]').click();await saved(gm);
 await expect(gm.locator('#gmDie')).toBeVisible();await gm.locator('[data-do=gmDiceRoll]').click();await saved(gm);
 const layout=await bounded(gm.evaluate(()=>{const map=document.querySelector('#tablewrap').getBoundingClientRect(),panel=document.querySelector('#panel').getBoundingClientRect();return {wide:document.documentElement.scrollWidth-innerWidth,overlap:map.left<panel.right&&panel.left<map.right&&map.top<panel.bottom&&panel.top<map.bottom};}),5000,'checking compact GM layout');expect(layout.wide).toBeLessThanOrEqual(1);expect(layout.overlap).toBe(false);
 await gm.screenshot({path:info.outputPath('gm-layout.png')});expect(gm.errors).toEqual([]);
});

test('changing between GM and player sessions in one page replaces the role and controls',async({browser})=>{
 const page=await newPage(browser),other=await newPage(browser);await makeTable(page);const code=await makeTable(other);
 await page.locator('[data-do=gmtab][data-t=table]').click();await page.locator('#panel [data-do=leave]').click();await page.locator('#panel [data-do=leave]').click();await expect(page.locator('#entry')).toBeVisible();
 await page.locator('#joinCode').fill(code);await page.locator('#joinName').fill('Ann');await page.locator('#joinForm button[type=submit]').click();await claimHero(page,'Thorne');await expect(page.locator('#tRole')).toHaveText('Player view');
 await page.locator('#top [data-do=leave]').click();await page.locator('#top [data-do=leave]').click();await page.locator('#makeForm button[type=submit]').click();
 await expect(page.locator('#tRole')).toHaveText('GM view');await expect(page.locator('#strip .stat')).toHaveCount(0);await expect(page.locator('[data-do=gmDiceRoll]')).toBeVisible();expect(page.errors).toEqual([]);
});
