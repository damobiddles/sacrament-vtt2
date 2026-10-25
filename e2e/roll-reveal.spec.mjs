import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved,prepareItem,rollPrepared} from './helpers.mjs';
import {axeContrast} from './contrast-lib.mjs';
test.setTimeout(60000);
async function setup(browser){const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');return {gm,p};}
async function attack(p,n){await p.locator('#panel [data-do=ordinaryCheck]').click();await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);await p.locator('#strip input[data-phys]').fill(String(n));await rollPrepared(p);}
test('physical critical outcomes appear once in Activity; footer damage applies once',async({browser},info)=>{
 const {gm,p}=await setup(browser);await attack(p,20);
 await expect(p.locator('#feed .outcome')).toHaveText('CRITICAL HIT');await expect(p.locator('#feed')).toContainText('23 against Target 12');
 await expect(p.locator('#dice .die,.reveal-result,.reveal-damage,#panel .calc')).toHaveCount(0);
 await expect(gm.locator('#feed .outcome')).toHaveText('CRITICAL HIT');await expect(gm.locator('[data-do=effort]')).toHaveCount(0);
 await p.screenshot({path:info.outputPath('critical-activity.png')});expect(await axeContrast(p)).toEqual([]);
 await p.locator('#strip [data-do=effort]').click();await saved(p);await expect(p.locator('#feed')).toContainText('HP -');await expect(p.locator('[data-do=apply]')).toHaveCount(0);
 const r=(await state(p)).rolls.at(-1);expect(r.effort.critical).toBeTruthy();expect(Object.values((await state(p)).cards).find(c=>c.name==='Pit Ghoul').hp.cur).toBe(Math.max(0,20-r.effort.total));expect(gm.errors.concat(p.errors)).toEqual([]);
});
test('miss and failed ordinary check stay distinct with reduced motion',async({browser})=>{
 const {gm,p}=await setup(browser);await p.emulateMedia({reducedMotion:'reduce'});await attack(p,2);
 await expect(p.locator('#feed .outcome')).toHaveText('MISS');await expect(p.locator('#feed')).toContainText('5 against Target 12');await expect(p.locator('#dice .die')).toHaveCount(0);
 await p.locator('#panel [data-do=ordinaryCheck]').click();await p.locator('#strip input[data-phys]').fill('2');await p.locator('#strip [data-stat=WIS]').click();
 await expect(p.locator('#feed .outcome')).toHaveText('FAILED CHECK');await expect(p.locator('#panel .calc,.reveal-result')).toHaveCount(0);expect(gm.errors.concat(p.errors)).toEqual([]);
});
test('reconnecting restores pending damage without replaying dice; leaving clears feedback',async({browser})=>{
 const {p}=await setup(browser);await attack(p,15);await expect(p.locator('#feed .outcome')).toHaveText('SUCCESS');await p.reload();await expect(p.locator('#app')).toBeVisible();await expect(p.locator('#dice .die,.reveal-result')).toHaveCount(0);await expect(p.locator('#strip [data-do=effort]')).toBeVisible();
 await p.locator('#top [data-do=leave]').click();await p.locator('#top [data-do=leave]').click();await expect(p.locator('#entry')).toBeVisible();expect(p.errors).toEqual([]);
});
test('a shared update cannot reset the GM dice count while it is being typed',async({browser})=>{
 const gm=await newPage(browser),other=await newPage(browser),code=await makeTable(gm,{sample:false});await expect(gm.locator('#gmDie')).toBeVisible();
 await gm.locator('#gmDie').selectOption('8');await gm.locator('#gmDiceCount').fill('2');const before=(await state(gm)).v;
 await joinTable(other,code,'Update during typing');await expect.poll(async()=>(await state(gm)).v).toBeGreaterThan(before);
 await expect(gm.locator('#gmDiceCount')).toHaveValue('2');await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);
 expect((await state(gm)).log.find(e=>e.text.startsWith('GM rolls 2d8'))).toBeTruthy();expect(gm.errors.concat(other.errors)).toEqual([]);
});
