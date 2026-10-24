import {test,expect,newPage,makeTable,joinTable,claimHero,saved,state} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);

test('GM dice need no hero and private results do not reach a player',async({browser},info)=>{
 const gm=await newPage(browser),code=await makeTable(gm,{sample:false}),p=await newPage(browser);await joinTable(p,code,'Player');
 await gm.getByRole('button',{name:'GM dice',exact:true}).click();await gm.locator('#gmDie').selectOption('8');await gm.locator('#gmDiceCount').fill('2');await gm.locator('#gmDicePrivate').check();
 await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);await expect(gm.locator('.gm-dice [role=status]')).toContainText('GM only:');
 const privateLog=(await state(gm)).log.find(e=>e.text.startsWith('GM rolls 2d8'));expect(privateLog).toBeTruthy();expect((await state(p)).log.some(e=>e.id===privateLog.id)).toBe(false);
 await gm.locator('#gmDicePrivate').uncheck();await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);await expect(p.locator('#feed')).toContainText('GM rolls 2d8');
 await gm.screenshot({path:info.outputPath('gm-dice.png'),fullPage:true});expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});

test('an item attack chooses a target before rolling and keeps it through damage and reload',async({browser},info)=>{
 const gm=await newPage(browser),code=await makeTable(gm),p=await newPage(browser);await joinTable(p,code,'Player');await claimHero(p,'Thorne');
 await p.locator('#strip [data-do=toggle][data-key=more]').click();await p.locator('#strip [data-do=toggle][data-key=dice]').click();await p.locator('#strip input[data-phys]').fill('15');
 await p.locator('#strip [data-do=sheet]').click();await p.locator('#sheetOverlay [data-sh=quickUse]').first().click();
 await expect(p.locator('#attackTarget')).toBeVisible();expect((await state(p)).rolls).toHaveLength(0);
 await p.locator('[data-do=confirmAttack]').click();expect((await state(p)).rolls).toHaveLength(0);
 await p.locator('#attackTarget').selectOption({label:'Pit Ghoul'});await p.locator('[data-do=confirmAttack]').click();await expect(p.locator('#panel .calc.ok')).toBeVisible();
 await expect(p.locator('#panel')).toContainText('Target: Pit Ghoul');await p.locator('#cards .c',{hasText:'The Sealed Gate'}).click();
 await p.locator('[data-do=effort][data-cat=weapons]').click();await expect(p.locator('[data-do=apply][data-field=hp]')).toContainText('Apply to Pit Ghoul');await saved(p);
 await p.reload();await expect(p.locator('[data-do=apply][data-field=hp]')).toContainText('Apply to Pit Ghoul');
 await p.screenshot({path:info.outputPath('attack-target.png'),fullPage:true});await p.locator('[data-do=apply][data-field=hp]').click();await saved(p);
 await expect.poll(async()=>Object.values((await state(gm)).cards).find(c=>c.name==='Pit Ghoul').hp.cur).toBeLessThan(20);
 expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});

test('healing remains usable, shows zero Horror and no damage or Push controls',async({browser})=>{
 const gm=await newPage(browser),code=await makeTable(gm),p=await newPage(browser);await joinTable(p,code,'Player');await claimHero(p,'Thorne');
 await bounded(gm.evaluate(async()=>{
  const s=window.__vtt.state(),ch=Object.values(s.chars).find(c=>c.name==='Thorne'),entry=Object.entries(localStorage).find(([k])=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(entry[1]).token;
  const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'sheet',charId:ch.id,op:{op:'add',id:'litany'},actionId:'healingbook.1'}})});if(!r.ok)throw Error('Could not give test book');
  const hurt=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'adjust',cardId:ch.cardId,field:'hp',delta:-5,actionId:'healingbook.2'}})});if(!hurt.ok)throw Error('Could not prepare test patient');
 }),15000,'giving a disposable healing grimoire');
 await expect.poll(async()=>Object.values((await state(p)).chars).find(c=>c.name==='Thorne').gear.length).toBe(2);
 await p.locator('#strip [data-do=toggle][data-key=more]').click();await p.locator('#strip [data-do=toggle][data-key=dice]').click();await p.locator('#strip input[data-phys]').fill('15');
 await p.locator('#strip [data-do=sheet]').click();const mend=p.locator('#sheetOverlay .sh-spells li',{hasText:'Mend'});await expect(mend).toContainText('No Horror cost');await expect(mend).toContainText('Yourself or any target');await mend.locator('[data-sh=use]').click();
 await p.locator('#attackTarget').selectOption({label:'Thorne'});await p.locator('[data-do=confirmAttack]').click();
 await expect(p.locator('#panel')).toContainText('Healing rolled:');await expect(p.locator('[data-do=effort],[data-do=push]')).toHaveCount(0);expect((await state(p)).horror.cur).toBe(0);
 expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});

test('a selected enemy does not turn an ordinary stat check into a Pushable attack',async({browser})=>{
 const gm=await newPage(browser),code=await makeTable(gm),p=await newPage(browser);await joinTable(p,code,'Player');await claimHero(p,'Thorne');
 await p.locator('#strip [data-do=toggle][data-key=more]').click();await p.locator('#strip [data-do=toggle][data-key=dice]').click();
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await p.locator('#strip input[data-phys]').fill('2');await p.locator('#strip [data-do=roll][data-stat=STR]').click();await p.locator('#strip [data-do=check]').click();
 await expect(p.locator('#panel .calc.bad')).toBeVisible();await expect(p.locator('[data-do=push]')).toHaveCount(0);
 await p.locator('#strip input[data-phys]').fill('2');await p.locator('#strip [data-do=roll][data-stat=STR]').click();await p.locator('#strip [data-attack="1"]').click();await expect(p.locator('[data-do=push]')).toBeVisible();
 expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});
