import {test,expect,newPage,makeTable,joinTable,claimHero,saved,state,prepareItem,rollPrepared} from './helpers.mjs';
import {axeContrast,bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
async function setup(browser){const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Dice player');await claimHero(p,'Thorne');return {gm,p};}
async function attack(p,n){await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);await p.locator('#strip input[data-phys]').fill(String(n));await rollPrepared(p);await saved(p);}
test('a hit tumbles over the scene and waits for damage instead of a dismissal timer',async({browser},info)=>{
 const {gm,p}=await setup(browser);await attack(p,15);
 const reveal=p.locator('#dice .reveal-result');await expect(reveal).toBeVisible();await expect(reveal).toContainText('SUCCESS');await expect(p.locator('#dice .die.landed b')).toHaveText('15');
 expect(await bounded(p.locator('#dice').evaluate(el=>!!el.closest('#tablewrap')),3000,'dice over scene')).toBe(true);
 await expect(reveal.getByRole('button',{name:'Roll damage',exact:true})).toBeVisible();
 // Longer than the former spin/hold/fade interval: an intentional timed-behaviour assertion.
 await p.waitForTimeout(3200);await expect(reveal).toBeVisible();
 await gm.locator('#gmDie').selectOption('6');await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);
 await expect.poll(async()=>(await state(p)).v).toBeGreaterThanOrEqual((await state(gm)).v);await expect(reveal).toContainText('SUCCESS');
 await p.screenshot({path:info.outputPath('persistent-hit.png')});expect(await axeContrast(p)).toEqual([]);
 await reveal.getByRole('button',{name:'Roll damage',exact:true}).dblclick();await saved(p);await expect(reveal).toHaveCount(0);
 const s=await state(p),r=s.rolls.at(-1);expect(r.applied).toBeTruthy();expect(Object.values(s.cards).find(c=>c.name==='Pit Ghoul').hp.cur).toBe(Math.max(0,20-r.effort.total));expect(p.errors.concat(gm.errors)).toEqual([]);
});
test('reduced motion keeps a readable miss until Continue; Push stays in Play',async({browser})=>{
 const {p}=await setup(browser);await p.emulateMedia({reducedMotion:'reduce'});await attack(p,2);
 await expect(p.locator('#dice .reveal-result')).toContainText('MISS');await expect(p.locator('#dice .die')).toHaveCount(0);
 await expect(p.locator('#dice button')).toHaveText('Continue');await p.locator('#dice button').click();await expect(p.locator('#dice .reveal-result')).toHaveCount(0);
 await expect(p.locator('#feed')).toContainText('MISS');expect(p.errors).toEqual([]);
});
