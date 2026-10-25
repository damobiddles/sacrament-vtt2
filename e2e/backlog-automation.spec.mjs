import {prepareItem,rollPrepared,basicAttack} from './helpers.mjs';
import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
async function cmd(page,c){return bounded(page.evaluate(async c=>{const s=window.__vtt.state(),entry=Object.entries(localStorage).find(([k])=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(entry[1]).token;const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{...c,actionId:'automation'+Math.random().toString(36).slice(2,8)+'.1'}})});return {status:r.status,body:await r.json()};},c),15000,'updating a disposable test table');}
for(const [suffix,viewport] of [['',undefined],[' @phone',{width:390,height:844}]]) {
test('a player chooses who to heal, HP updates for everyone, limits are enforced and Party rest refreshes them'+suffix,async({browser},info)=>{
 const gm=await newPage(browser),code=await makeTable(gm),p=await newPage(browser,viewport);await joinTable(p,code,'Healer');await claimHero(p,'Thorne');const ch=Object.values((await state(gm)).chars).find(c=>c.name==='Thorne');
 await cmd(gm,{type:'sheet',charId:ch.id,op:{op:'add',id:'litany'}});await cmd(gm,{type:'adjust',cardId:ch.cardId,field:'hp',delta:-8});
 await expect(p.getByRole('button',{name:'My character',exact:true})).toBeVisible();await expect.poll(async()=>Object.values((await state(p)).chars).find(c=>c.id===ch.id).gear.length).toBe(2);

 async function cast(){await p.locator('#strip input[data-phys]').fill('15');await prepareItem(p,'[data-spell=mend]');await expect(p.locator('#panel')).toContainText('Choose who to heal');await p.locator('#attackTarget').selectOption(ch.cardId);await p.locator('[data-do=confirmAttack]').click();await rollPrepared(p);await saved(p);}
 await cast();await expect(p.locator('#feed')).toContainText('heals');await expect.poll(async()=>(await state(gm)).cards[ch.cardId].hp.cur).toBeGreaterThan(2);expect((await state(p)).horror.cur).toBe(0);
 await cmd(gm,{type:'adjust',cardId:ch.cardId,field:'hp',delta:-1});await cast();await expect(p.locator('#feed')).toContainText('already received this healing');
 await cmd(gm,{type:'rest'});await cmd(gm,{type:'adjust',cardId:ch.cardId,field:'hp',delta:-5});await cast();await expect(p.locator('#feed')).toContainText('heals');
 await p.screenshot({path:info.outputPath('healing-automatic.png'),fullPage:true});expect(p.errors).toEqual([]);expect(gm.errors).toEqual([]);
});
}
test('scene danger is explicit and custom Effort dice are labelled consistently in live sheets and loot previews',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);await gm.locator('[data-do=gmtab][data-t=table]').click();await gm.locator('[data-do=gmsub][data-s=rules]').click();await gm.locator('[data-setting=sceneDanger]').check();await saved(gm);expect((await state(gm)).settings.sceneDanger).toBe(true);
 await cmd(gm,{type:'settings',patch:{dice:{weapons:8}}});await gm.locator('#cards .c',{hasText:'Thorne'}).click();await gm.locator('#panel [data-do=sheet]').click();await expect(gm.locator('#sheetOverlay')).toContainText('Weapons d8');await gm.keyboard.press('Escape');await gm.locator('#panel [data-do=deselect]').click();
 await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();await gm.locator('[data-lf=category]').selectOption('Weapon');await expect(gm.locator('#ltPrev')).toContainText('d8');expect(gm.errors).toEqual([]);
});
