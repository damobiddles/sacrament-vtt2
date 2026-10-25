import {test,expect,newPage,makeTable,joinTable,claimHero,emptyPacks,state,saved} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';

async function command(page,cmd){
 return bounded(page.evaluate(async cmd=>{
  const s=window.__vtt.state(),key=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-'));
  const token=JSON.parse(localStorage.getItem(key)).token;
  const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{...cmd,actionId:'powers'+Math.random().toString(36).slice(2,10)+'.1'}})});
  const b=await r.json();if(!r.ok)throw Error(b.error?.message||r.status);return b;
 },cmd),15000,'preparing a disposable playtest');
}
async function physical(page,n){
 if(!await page.locator('#strip input[data-phys]').count()){
  await page.locator('#strip [data-do=toggle][data-key=more]').click();
  await page.locator('#strip [data-do=toggle][data-key=dice]').click();
 }
 await page.locator('#strip input[data-phys]').fill(String(n));
}

test('an area spell selects several visible foes, applies one critical roll, survives reload and has one shared Undo',async({browser})=>{
 test.setTimeout(60000);
 const gm=await newPage(browser),ann=await newPage(browser),code=await makeTable(gm);await emptyPacks(gm);
 await joinTable(ann,code,'Ann');await claimHero(ann,'Thorne');const h=Object.values((await state(gm)).chars).find(c=>c.name==='Thorne');
 await command(gm,{type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});
 const made=await command(gm,{type:'cardCreate',card:{name:'Disposable second foe',kind:'token',visible:true,hp:{cur:20,max:20}}});
 await command(gm,{type:'cardCreate',card:{name:'PRIVATE AREA FOE',kind:'token',visible:false,hp:{cur:20,max:20}}});
 await expect.poll(async()=> (await state(ann)).chars[h.id].gear.length).toBe(1);
 await physical(ann,20);await ann.locator('#strip [data-do=sheet]').click();
 await ann.locator('#sheetOverlay [data-sh=quickUse][data-spell=rend]').click();
 await expect(ann.locator('.area-targets')).toBeVisible();await expect(ann.locator('.area-targets')).not.toContainText('PRIVATE');
 await ann.locator('.area-targets label',{hasText:'Pit Ghoul'}).check();await ann.locator('.area-targets label',{hasText:'Disposable second foe'}).check();
 await ann.locator('#panel').screenshot({path:'/workspace/sacrament-audit/powers-area-picker.png'});
 await ann.locator('[data-do=confirmAttack]').click();await expect(ann.locator('#panel')).toContainText('Critical: your normal Effort');
 await ann.locator('#physE').fill('2');await ann.locator('#physCritical').fill('3');await ann.locator('#panel [data-do=effort]').click();
 await expect(ann.locator('#panel')).toContainText('damage to each target');await expect(ann.locator('[data-do=applyArea]')).toHaveCount(0);await expect(ann.locator('#panel')).toContainText('Applied');await saved(ann);
 const r=(await state(ann)).rolls.at(-1),damage=r.effort.total,ghoul=Object.values((await state(ann)).cards).find(c=>c.name==='Pit Ghoul');
 expect(ghoul.hp.cur).toBe(20-damage);expect((await state(ann)).cards[made.result.id].hp.cur).toBe(20-damage);
 await expect.poll(async()=> (await state(gm)).cards[made.result.id].hp.cur).toBe(20-damage);
 await ann.locator('#panel').screenshot({path:'/workspace/sacrament-audit/powers-area-damage.png'});
 await ann.reload();await expect(ann.locator('#app')).toBeVisible();expect((await state(ann)).chars[h.id].usedPowers.rend).toBeTruthy();
 const log=(await state(gm)).rolls.find(x=>x.id===r.id).applied.log;await command(gm,{type:'undo',logId:log});
 await expect.poll(async()=> (await state(ann)).cards[made.result.id].hp.cur).toBe(20);expect((await state(ann)).cards[ghoul.id].hp.cur).toBe(20);
 await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('[data-do=scenePowerReset]').click();
 await expect(gm.locator('[data-do=scenePowerReset]')).toContainText('Confirm');await gm.locator('[data-do=scenePowerReset]').click();await saved(gm);
 await expect.poll(async()=> Object.keys((await state(ann)).chars[h.id].usedPowers).length).toBe(0);
 expect(gm.errors).toEqual([]);expect(ann.errors).toEqual([]);
});

test('off-turn Push needs an explicit GM exception and its second action cannot Push again',async({browser})=>{
 test.setTimeout(60000);const gm=await newPage(browser),ann=await newPage(browser),code=await makeTable(gm);
 await joinTable(ann,code,'Ann');await claimHero(ann,'Thorne');await command(gm,{type:'turnSet',idx:1});
 await expect(ann.locator('#strip')).not.toHaveClass(/myturn/);await physical(ann,2);
 await ann.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await ann.locator('#strip .stat',{hasText:'STR'}).click();await ann.locator('#strip [data-noitem]').click();
 await expect(ann.locator('#panel')).toContainText('Push is available on your turn');await expect(ann.locator('[data-do=push]')).toHaveCount(0);
 await gm.locator('#cards .c',{hasText:'Thorne'}).click();await expect(gm.locator('[data-do=allowPush]')).toBeVisible();await gm.locator('[data-do=allowPush]').click();await saved(gm);
 await expect.poll(async()=> (await state(ann)).horror.cur).toBe(1);await expect(gm.locator('[data-do=allowPush]')).toHaveCount(0);
 await ann.locator('#panel [data-do=dismissRoll]').click();await physical(ann,2);await ann.locator('#strip .stat',{hasText:'STR'}).click();await ann.locator('#strip [data-noitem]').click();
 await expect.poll(async()=> (await state(ann)).rolls.at(-1).fromPush).toBe(true);await expect(ann.locator('[data-do=push]')).toHaveCount(0);
 await expect(gm.locator('[data-do=allowPush]')).toHaveCount(0);expect(gm.errors).toEqual([]);expect(ann.errors).toEqual([]);
});
