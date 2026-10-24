import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
async function command(page,cmd){return bounded(page.evaluate(async cmd=>{
 const s=window.__vtt.state(),k=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(localStorage.getItem(k)).token;
 const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{...cmd,actionId:'sceneorder'+Math.random().toString(36).slice(2,8)+'.1'}})});
 const body=await r.json();if(!r.ok)throw Error(body.error?.message||r.status);return body;
},cmd),15000,'preparing a disposable scene-order check');}
const ids=s=>s.table.order.map(x=>x.id);
async function reveal(gm,id){await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('[data-do=openScene][data-scene="'+id+'"]').click();await gm.locator('[data-do=reveal][data-scene="'+id+'"]').click();await saved(gm);}

test('GM and player change scenes without carrying enemies across, and edited orders survive returning and reload',async({browser})=>{
 const gm=await newPage(browser),player=await newPage(browser),code=await makeTable(gm);await joinTable(player,code,'Scene-order player');await claimHero(player,'Thorne');
 const original=await state(gm),first=original.table.scene.id,second=original.scenes.find(s=>s.id!==first).id;
 const thorne=Object.values(original.chars).find(c=>c.name==='Thorne'),wisp=Object.values(original.chars).find(c=>c.name==='Wisp'),foe=Object.values(original.cards).find(c=>c.name==='Pit Ghoul');
 const a=[foe.id,wisp.cardId,thorne.cardId];await command(gm,{type:'orderSet',order:a});await command(gm,{type:'turnSet',idx:1});
 const made=await command(gm,{type:'cardCreate',card:{name:'Private prepared enemy',kind:'token',sceneId:second,visible:false,hp:{cur:10,max:10}},addToOrder:true});
 await expect.poll(async()=>ids(await state(gm))).toEqual(a);expect(JSON.stringify(await state(player))).not.toContain(made.result.id);
 await reveal(gm,second);await expect.poll(async()=>(await state(player)).table.scene.id).toBe(second);
 await expect.poll(async()=>ids(await state(gm))).toContain(made.result.id);expect(ids(await state(gm))).not.toContain(foe.id);expect(JSON.stringify(await state(player))).not.toContain('Private prepared enemy');
 const b=[thorne.cardId,made.result.id];await command(gm,{type:'orderSet',order:b});await command(gm,{type:'turnSet',idx:0});
 await reveal(gm,first);await gm.locator('[data-do=gmtab][data-t=play]').click();await expect.poll(async()=>ids(await state(gm))).toEqual(a);expect((await state(gm)).table.idx).toBe(1);
 await expect(gm.locator('.turn-order')).toContainText('Pit Ghoul');await expect(gm.locator('.turn-order')).not.toContainText('Private prepared enemy');await expect(gm.locator('#panel')).toContainText('Each scene remembers its order');
 await expect.poll(async()=>ids(await state(player))).toEqual(a);await gm.screenshot({path:'/workspace/sacrament-audit/scene-order-return.png'});
 await reveal(gm,second);await expect.poll(async()=>ids(await state(gm))).toEqual(b);await gm.reload();await expect(gm.locator('#app')).toBeVisible();expect(ids(await state(gm))).toEqual(b);expect((await state(gm)).table.idx).toBe(0);
 await player.reload();await expect(player.locator('#app')).toBeVisible();expect((await state(player)).table.scene.id).toBe(second);expect((await state(player)).table.order[1]).toEqual({hidden:true});
 expect(gm.errors).toEqual([]);expect(player.errors).toEqual([]);
});

test('an empty remembered order can be rebuilt after reloading the table',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);await command(gm,{type:'orderSet',order:[]});await gm.reload();await expect(gm.locator('#app')).toBeVisible();
 await gm.locator('[data-do=gmtab][data-t=play]').click();await expect(gm.locator('#panel')).toContainText('Nobody is in the turn order yet.');
 await gm.locator('[data-do=editOrder]').click();await gm.locator('#addOrder').selectOption({label:'Thorne'});await gm.locator('[data-do=addOrder]').click();await saved(gm);
 await expect(gm.locator('.turn-order')).toContainText('Thorne');expect((await state(gm)).table.order).toHaveLength(1);expect(gm.errors).toEqual([]);
});
