import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';
test.setTimeout(60000);
test('player prepares in Play, rolls only in the footer, and keeps outcomes in Activity with a scene dice reveal',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);
 await joinTable(p,code,'Activity player');await claimHero(p,'Thorne');
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();
 await expect(p.locator('#panel')).toContainText('How are you going to deal with');
 await expect(p.locator('#strip')).not.toContainText('How are you going to deal with');
 await p.locator('#panel [data-do=sheet]').click();
 await expect(p.locator('#sheetOverlay [data-sh=use],#sheetOverlay [data-sh=quickUse]')).toHaveCount(0);
 await p.locator('[data-sh=close]').click();
 const before=(await state(p)).rolls.length;
 await p.locator('#panel [data-do=prepareUse]').first().click();
 expect((await state(p)).rolls.length).toBe(before);
 await p.locator('#strip input[data-phys]').fill('20');
 await p.locator('#strip [data-do=commitUse]').click();await saved(p);
 await expect(p.locator('#feed')).toContainText('CRITICAL HIT');
 await expect(p.locator('#panel .calc,#toast')).toHaveCount(0);
 await expect(p.locator('#panel [data-do=effort]')).toHaveCount(0);
 await expect(p.locator('#dice .reveal-result')).toContainText('CRITICAL HIT');
 await p.locator('#strip [data-do=effort]').first().click();await saved(p);
 await expect.poll(async()=>!!(await state(p)).rolls.at(-1).applied).toBe(true);
 await expect(p.locator('#feed [data-do=undo]')).toBeVisible();
 expect(p.errors.concat(gm.errors)).toEqual([]);
});

test('typed damage dice survive another person changing the table',async({browser})=>{
 const {prepareItem,rollPrepared}=await import('./helpers.mjs');
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Dice player');await claimHero(p,'Thorne');
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);await p.locator('#strip input[data-phys]').fill('20');await rollPrepared(p);
 await p.locator('#physE').fill('4');await p.locator('#physCritical').fill('3');const before=(await state(p)).v;
 await gm.locator('#tTarget [data-d="1"]').click();await expect.poll(async()=>(await state(p)).v).toBeGreaterThan(before);
 await p.locator('#feed [data-do=feed]').focus();
 await expect(p.locator('#physE')).toHaveValue('4');await expect(p.locator('#physCritical')).toHaveValue('3');
 await p.locator('#strip [data-do=effort]').click();await saved(p);const r=(await state(p)).rolls.at(-1);
 expect(r.effort.rolled).toBe(4);expect(r.effort.critical.rolled).toBe(3);expect(r.applied).toBeTruthy();expect(p.errors.concat(gm.errors)).toEqual([]);
});

test('preparing does not spend an action, and replacing its item cannot use a different item',async({browser})=>{
 const {prepareItem,rollPrepared}=await import('./helpers.mjs');const {bounded}=await import('./contrast-lib.mjs');
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Gear player');await claimHero(p,'Thorne');
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);const ch=Object.values((await state(p)).chars).find(c=>c.name==='Thorne'),key=ch.gear[0].key;
 await bounded(gm.evaluate(async ({id,key})=>{
  const s=window.__vtt.state(),storageKey=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(localStorage.getItem(storageKey)).token;
  for(const [n,op] of [{op:'remove',index:0,gearKey:key},{op:'add',id:'sword'}].entries()){
   const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'sheet',charId:id,op,actionId:'preparedgear.'+(n+1)}})});if(!r.ok)throw Error('Could not prepare disposable replacement');
  }
 },{id:ch.id,key}),15000,'replacing disposable prepared gear');
 await expect.poll(async()=>(await state(p)).chars[ch.id].gear[0].key).not.toBe(key);
 await rollPrepared(p);await expect(p.locator('#feed')).toContainText('no longer available');expect((await state(p)).rolls).toHaveLength(0);expect((await state(p)).horror.cur).toBe(0);expect(p.errors.concat(gm.errors)).toEqual([]);
});


test('player dice preferences stay open and keep keyboard focus across table updates',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Preferences player');await claimHero(p,'Thorne');
 const summary=p.locator('.player-actions details').last().locator('summary');await summary.click();await summary.focus();
 const before=(await state(p)).v;await gm.locator('#tTarget [data-d="1"]').click();await expect.poll(async()=>(await state(p)).v).toBeGreaterThan(before);
 await expect(p.locator('#panel input[data-sound]')).toBeVisible();await expect(summary).toBeFocused();
 await p.locator('#panel input[data-sound]').uncheck();expect(p.errors.concat(gm.errors)).toEqual([]);
});
