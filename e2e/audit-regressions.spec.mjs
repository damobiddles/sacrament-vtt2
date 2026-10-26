import {test,expect,newPage,makeTable,joinTable,claimHero,saved,state,prepareItem,rollPrepared} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
async function setup(browser){const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Audit player');await claimHero(p,'Thorne');return {gm,p};}
async function attack(p){await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);await p.locator('#strip input[data-phys]').fill('15');await rollPrepared(p);await saved(p);}
test('designer validation stays visible inside the open dialog and preserves input',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();
 const d=gm.locator('#lootOverlay');await d.locator('[data-lf=name]').fill('Validation book');await d.locator('[data-lf=category]').selectOption('Grimoire');
 await d.locator('[data-lspell="0"]').selectOption('ember');await d.locator('[data-lspell="1"]').selectOption('ward');await d.locator('[data-lb=save]').click();
 await expect(d.locator('#ltMsg')).toContainText('three different spells');await expect(d.locator('[data-lf=name]')).toHaveValue('Validation book');
 expect(await bounded(d.locator('#ltMsg').evaluate(el=>!el.closest('[inert]')),3000,'validation accessibility')).toBe(true);
 expect((await state(gm)).lootLib).toHaveLength(0);
});
test('reload cannot offer old-scene damage or unselected player damage to the GM',async({browser})=>{
 const {gm,p}=await setup(browser);await attack(p);await expect(p.locator('#strip [data-do=effort]')).toBeVisible();
 await gm.reload();await expect(gm.locator('#app')).toBeVisible();await expect(gm.locator('#panel [data-do=effort]')).toHaveCount(0);
 await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('#panel [data-do=openScene]').first().click();const show=gm.locator('#panel [data-do=reveal]').first();await show.click();await saved(gm);
 const scene=(await state(gm)).table.scene.id;await expect.poll(async()=>(await state(p)).table.scene.id).toBe(scene);
 await p.reload();await expect(p.locator('#app')).toBeVisible();await expect(p.locator('#strip [data-do=effort]')).toHaveCount(0);expect(p.errors.concat(gm.errors)).toEqual([]);
});

async function give(gm,id){await bounded(gm.evaluate(async(id)=>{
 const s=window.__vtt.state(),ch=Object.values(s.chars).find(c=>c.name==='Thorne');
 const key=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(localStorage.getItem(key)).token;
 const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'sheet',charId:ch.id,op:{op:'add',id},actionId:'auditgear'+Math.random().toString(36).slice(2,10)+'.1'}})});
 if(!r.ok)throw Error('Disposable gear award failed: '+r.status+' '+(await r.text()).slice(0,300));
},id),5000,'award disposable gear');}
test('manual abilities explain their work and do not inherit an enemy target',async({browser})=>{
 const {gm,p}=await setup(browser);await give(gm,'litany');await give(gm,'chain');await give(gm,'oil');
 await expect.poll(async()=>Object.values((await state(p)).chars).find(c=>c.name==='Thorne').gear.some(g=>g.id==='chain')).toBe(true);
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();
 await prepareItem(p,'[data-spell="ward"]');await expect(p.locator('.player-actions')).toContainText('Choose an eligible ally with the GM');await expect(p.locator('.player-actions')).not.toContainText('Ready: Ward (The Seventh Penance) → Pit Ghoul');
 await prepareItem(p,'[data-i="'+Object.values((await state(p)).chars).find(c=>c.name==='Thorne').gear.findIndex(g=>g.id==='chain')+'"]');
 await expect(p.locator('#strip [data-do=commitUse]')).toHaveText('Use Penitent’s Chain'.replace('’',"'"));
 await p.locator('#panel [data-do=sheet]').click();await expect(p.locator('#sheetOverlay')).toContainText('supplied · track manually');expect(p.errors.concat(gm.errors)).toEqual([]);
});
test('a server rejection is visible in the designer rather than hidden Activity',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();
 await gm.route('**/.netlify/functions/vtt',async route=>{const body=route.request().postDataJSON();if(body?.cmd?.type==='lootSave')return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({ok:false,error:{code:'invalid',message:'The item could not be saved. Check its cost.'}})});await route.continue();});
 const d=gm.locator('#lootOverlay');await d.locator('[data-lf=name]').fill('Server validation');await d.locator('[data-lb=save]').click();
 await expect(d.locator('#ltMsg')).toContainText('Check its cost');await expect(d.locator('[data-lf=name]')).toHaveValue('Server validation');await expect(d).toBeVisible();expect(gm.errors).toEqual([]);
});

test('a read begun before an interrupted command cannot release queued gameplay',async({browser})=>{
 const {p}=await setup(browser);await saved(p);
 let oldRead,oldResponse,freshRead,changes=0,capture=true;
 await p.route('**/.netlify/functions/vtt**',async route=>{
  const request=route.request(),data=request.method()==='POST'?request.postDataJSON():null;
  if(data?.cmd?.type==='adjust'){changes++;if(changes===1){await route.abort();return;}}
  if(request.method()==='GET'){
   if(capture){capture=false;oldResponse=await route.fetch();oldRead=route;return;}
   if(await bounded(p.evaluate(()=>window.__vtt.ui.reconcile),3000,'checking recovery barrier')){freshRead=route;return;}
  }
  await route.continue();
 });
 await bounded(p.evaluate(()=>window.dispatchEvent(new Event('online'))),3000,'request a disposable old read');
 await expect.poll(()=>!!oldRead).toBe(true);
 await bounded(p.evaluate(()=>{window.__vtt.ui.maxTries=0;document.querySelector('#panel [data-do=hpAdj][data-d="-1"]').click();document.querySelector('#panel [data-do=hpAdj][data-d="-1"]').click();}),3000,'queue disposable HP changes');
 await expect.poll(()=>bounded(p.evaluate(()=>window.__vtt.ui.reconcile),3000,'waiting for recovery')).toBe(true);
 await oldRead.fulfill({response:oldResponse});
 await expect.poll(()=>!!freshRead||changes>1).toBe(true);expect(changes).toBe(1);
 await freshRead.continue();await saved(p);expect(changes).toBe(2);expect(p.errors).toEqual([]);
});
