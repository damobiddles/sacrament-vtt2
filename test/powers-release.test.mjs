import test from 'node:test';import assert from 'node:assert/strict';
import '../site/vtt/rules.js';import '../site/sheet/gear.js';import '../site/sheet/sheet-core.js';
import {table,charNamed,find} from './vtt-helpers.mjs';
const C=globalThis.SacramentSheetCore;
async function setup(){const t=await table(),p=await t.join('Ann'),h=charNamed(await t.state(),'Thorne');await p.cmd({type:'claim',charId:h.id});return {t,p,h};}
test('defined loot powers never present the flute or snare as damage and all unfinished powers explain their use',()=>{
 for(const id of ['boneflute','snare']){assert.ok(!C.item(id).cat,id);assert.equal(C.item(id).effect,'esoteric');}
 for(const id of ['thornedreliquary','lastrites','sealshard','boneflute','holywater','snare','physician','fingerbone','wardenbell','ashenrosary','drownedlantern','stainedglass','houndtooth']){const i=C.item(id);assert.ok(i.use&&i.band&&i.does.length>100,id);}
});
test('Push requires the active hero turn; the GM can explicitly grant one, once, without weakening ownership',async()=>{
 const {t,p,h}=await setup(),foe=find(await t.state(),'Pit Ghoul');await t.gm.cmd({type:'turnSet',idx:1});
 const r=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:2,attack:true,targetCardId:foe.id});assert.equal(r.status,200);assert.equal(r.body.state.rolls.at(-1).canPush,false);
 assert.equal((await p.cmd({type:'push',rollId:r.body.result.rollId})).status,400);assert.equal((await p.cmd({type:'pushOverride',rollId:r.body.result.rollId})).status,403);
 const g=await t.gm.cmd({type:'pushOverride',rollId:r.body.result.rollId});assert.equal(g.status,200);assert.equal(g.body.state.horror.cur,1);
 assert.equal((await t.gm.cmd({type:'pushOverride',rollId:r.body.result.rollId})).status,400);
 const next=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:2,attack:true,targetCardId:foe.id});assert.equal(next.body.state.rolls.at(-1).fromPush,true);assert.equal((await t.gm.cmd({type:'pushOverride',rollId:next.body.result.rollId})).status,400);
});
test('an area spell locks visible foes, costs once, hits every selected target once, and Undo restores all damage',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});
 const made=await t.gm.cmd({type:'cardCreate',card:{name:'Disposable second foe',kind:'token',visible:true,hp:{cur:20,max:20}}}),a=find(await t.state(),'Pit Ghoul'),b=made.body.result.id;
 const cast={type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[a.id,b]};
 const r=await p.cmd(cast,{client:'arearetry1',n:1});assert.equal(r.status,200);const id=r.body.result.rollId;assert.equal(r.body.state.rolls.at(-1).area,true);assert.equal(r.body.state.horror.cur,1);
 assert.equal((await p.cmd(cast,{client:'arearetry1',n:1})).body.result.duplicate,true);assert.equal((await p.cmd(cast)).status,400);
 assert.equal((await p.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:6})).status,200);
 assert.equal((await p.cmd({type:'apply',rollId:id,cardId:a.id,field:'hp'})).status,400,'area damage cannot be partly applied through the single-target route');
 const hit=await p.cmd({type:'applyArea',rollId:id,cardIds:[a.id,b]});assert.equal(hit.status,200);assert.equal(hit.body.state.cards[a.id].hp.cur,14);assert.equal(hit.body.state.cards[b].hp.cur,14);
 assert.equal((await p.cmd({type:'applyArea',rollId:id,cardIds:[a.id,b]})).status,409);
 const log=hit.body.result.log;assert.equal((await t.gm.cmd({type:'undo',logId:log})).status,200);const st=await t.state();assert.equal(st.cards[a.id].hp.cur,20);assert.equal(st.cards[b].hp.cur,20);assert.equal(st.recap.heroes[h.id].dealt,0);
 assert.equal((await p.cmd({type:'scenePowerReset',id:st.table.scene.id})).status,403);assert.equal((await t.gm.cmd({type:'scenePowerReset',id:st.table.scene.id})).status,200);assert.equal((await p.cmd(cast)).status,200);
});
test('area targeting rejects hidden targets and later projections reveal no newly hidden targets or HP',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});
 const hidden=await t.gm.cmd({type:'cardCreate',card:{name:'PRIVATE AREA ENEMY',kind:'token',visible:false,hp:{cur:17,max:17}}});const ghost=hidden.body.result.id,a=find(await t.state(),'Pit Ghoul');
 assert.equal((await p.cmd({type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[a.id,ghost]})).status,404);
 assert.equal((await t.state()).horror.cur,0);const r=await p.cmd({type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[a.id]});assert.equal(r.status,200);
 await t.gm.cmd({type:'cardUpdate',id:a.id,patch:{visible:false}});const raw=JSON.stringify((await p.get()).body);assert.ok(!raw.includes(a.id));assert.ok(!raw.includes('PRIVATE AREA ENEMY'));
});

test('critical damage adds to the normal roll and never counts heavy or Ultimate bonuses twice',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'vesperaxe'}});
 const r=await p.cmd({type:'useItem',charId:h.id,index:0,d20:20});assert.equal(r.status,200);
 const damage=await p.cmd({type:'effort',rollId:r.body.result.rollId,cat:'weapons',rolled:1,criticalRolled:1});assert.equal(damage.status,200);const e=damage.body.state.rolls.at(-1).effort;
 assert.equal(e.cat,'weapons');assert.equal(e.total,1+h.effort.weapons+2+1+h.effort.ultimate);assert.equal(e.critical.rolled,1);
 await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});const cast=await p.cmd({type:'useItem',charId:h.id,index:1,spellId:'rend',d20:20,targetCardIds:[find(await t.state(),'Pit Ghoul').id]});
 const ult=await p.cmd({type:'effort',rollId:cast.body.result.rollId,cat:'ultimate',rolled:2,criticalRolled:3});assert.equal(ult.status,200);assert.equal(ult.body.state.rolls.at(-1).effort.total,2+3+h.effort.ultimate);
});
test('crossbow accuracy is automatic, stays d6, and does not apply to a bow',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'crossbow'}});
 const r=await p.cmd({type:'useItem',charId:h.id,index:0,d20:10});assert.equal(r.status,200);assert.equal(r.body.state.rolls.at(-1).check.mod,h.stats.DEX+2);assert.equal(r.body.state.rolls.at(-1).check.success,true);
 const d=await p.cmd({type:'effort',rollId:r.body.result.rollId,cat:'weapons',rolled:3});assert.equal(d.body.state.rolls.at(-1).effort.die,6);assert.equal(C.attackBonus(C.item('bow')),0);
});
test('alternate relic modes and copied scene powers share their canonical limits',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'blade'}});
 const r=await p.cmd({type:'useItem',charId:h.id,index:0,mode:'ultimate',d20:15});assert.equal(r.status,200);assert.equal(r.body.state.horror.cur,3);assert.equal(r.body.state.rolls.at(-1).cat,'ultimate');assert.equal((await p.cmd({type:'useItem',charId:h.id,index:0,mode:'ultimate',d20:15})).status,400);
 const copy=C.designOf(C.item('blade'));await t.gm.cmd({type:'lootGive',item:copy,charId:h.id});assert.equal((await p.cmd({type:'useItem',charId:h.id,index:1,mode:'ultimate',d20:15})).status,400);
 assert.equal((await p.cmd({type:'useItem',charId:h.id,index:0,d20:15})).status,200,'normal mode remains available');
});

test('power completion preserves all catalogue IDs, slots, spell assignments and loot odds',async()=>{
 // Owner-approved themed editions; original books and spells are independently protected by themed-grimoires.test.
 const {createHash}=await import('node:crypto');
 const stable=Object.fromEntries(Object.entries(globalThis.SACRAMENT_GEAR).map(([k,a])=>[k,a.map(x=>Object.fromEntries(Object.entries(x).filter(([key])=>['id','kind','slots','table','loot','spells','pick','pickDie','die'].includes(key))))]));
 assert.equal(createHash('sha256').update(JSON.stringify(stable)).digest('hex'),'ca518935e211a75ee8130db80486a7890421457c00a20def0adff9811da9c960');
});

test('scene uses survive rest, reload and returning to a scene; reset invalidates pending limited damage',async()=>{
 const {t,p,h}=await setup(); await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'sealshard'}});
 const foe=find(await t.state(),'Pit Ghoul'), scene=(await t.state()).table.scene.id;
 const cast={type:'useItem',charId:h.id,index:0,d20:15,targetCardId:foe.id},first=await p.cmd(cast);assert.equal(first.status,200);
 const id=first.body.result.rollId;await t.gm.cmd({type:'rest'});assert.equal((await p.cmd(cast)).status,400);
 assert.ok((await p.get()).body.state.chars[h.id].usedPowers.sealshard,'fresh projection retains the allowance');
 const made=await t.gm.cmd({type:'sceneCreate',scene:{name:'Disposable other scene'}});assert.equal(made.status,200);
 await t.gm.cmd({type:'sceneReveal',id:made.body.result.id});await t.gm.cmd({type:'sceneReveal',id:scene});assert.equal((await p.cmd(cast)).status,400);
 await t.gm.cmd({type:'scenePowerReset',id:scene});assert.equal((await p.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:4})).status,409);assert.equal((await p.cmd(cast)).status,200);
});
test('only a GM may restore an allowance, and must undo its applied damage first',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'sealshard'}});
 const r=await p.cmd({type:'useItem',charId:h.id,index:0,d20:15}),id=r.body.result.rollId;
 const attempt=r.body.state.log.find(e=>e.text.includes('uses '+C.item('sealshard').name)).id;
 await p.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:4});await p.cmd({type:'apply',rollId:id,cardId:find(await t.state(),'Pit Ghoul').id,field:'hp'});
 assert.equal((await p.cmd({type:'undo',logId:attempt})).status,403);assert.equal((await t.gm.cmd({type:'undo',logId:attempt})).status,409);
 assert.equal((await t.gm.cmd({type:'undo',logId:(await t.state()).rolls.find(r=>r.id===id).applied.log})).status,200);assert.equal((await t.gm.cmd({type:'undo',logId:attempt})).status,200);
 assert.equal((await p.cmd({type:'apply',rollId:id,cardId:find(await t.state(),'Pit Ghoul').id,field:'hp'})).status,400);
 assert.equal((await p.cmd({type:'useItem',charId:h.id,index:0,d20:15})).status,200);
});
test('area application validates all targets before changing HP and cannot add a new target after casting',async()=>{
 const {t,p,h}=await setup();await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});const a=find(await t.state(),'Pit Ghoul');
 const made=await t.gm.cmd({type:'cardCreate',card:{name:'Second target',kind:'token',visible:true,hp:{cur:20,max:20}}}),b=made.body.result.id;
 const r=await p.cmd({type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[a.id,b]}),id=r.body.result.rollId;await p.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:5});
 assert.equal((await p.cmd({type:'applyArea',rollId:id,cardIds:[a.id,h.cardId]})).status,400);
 await t.gm.cmd({type:'cardDelete',id:b});assert.equal((await p.cmd({type:'applyArea',rollId:id,cardIds:[a.id,b]})).status,404);assert.equal(find(await t.state(),'Pit Ghoul').hp.cur,20);
 assert.equal((await p.cmd({type:'applyArea',rollId:id,cardIds:[a.id]})).status,200);
});

test('a failed attack cannot be saved for a Push after its exchange or scene has ended',async()=>{
 const {t,p,h}=await setup(),foe=find(await t.state(),'Pit Ghoul');
 const r=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:2,attack:true,targetCardId:foe.id}),id=r.body.result.rollId;
 await t.gm.cmd({type:'nextRound'});assert.equal((await p.cmd({type:'push',rollId:id})).status,400);assert.equal((await t.gm.cmd({type:'pushOverride',rollId:id})).status,400);
});
test('a saved pending critical keeps its original replacement rule and completed history stays unchanged',async()=>{
 const {memoryStore}=await import('../netlify/functions/_shared/vtt-service.mjs'),store=memoryStore(),t=await table({store});const h=charNamed(await t.state(),'Thorne');
 await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'sword'}});const r=await t.gm.cmd({type:'useItem',charId:h.id,index:0,d20:20}),id=r.body.result.rollId;
 const saved=await store.get(t.code);delete saved.data.rolls[id].criticalRule;await store.put(t.code,saved.data,saved.etag);
 const d=await t.gm.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:9});assert.equal(d.status,200);const effort=d.body.state.rolls.at(-1).effort;
 assert.equal(effort.cat,'ultimate');assert.equal(effort.total,9+h.effort.ultimate);assert.equal(effort.critical,undefined);assert.deepEqual((await t.state()).rolls.at(-1).effort,effort);
});
