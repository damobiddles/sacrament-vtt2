import test from 'node:test';import assert from 'node:assert/strict';
import {table,charNamed,find} from './vtt-helpers.mjs';
async function setup(){const t=await table({gear:true}),ann=await t.join('Ann'),observer=await t.join('Observer'),h=charNamed(await t.state(),'Thorne');await ann.cmd({type:'claim',charId:h.id});return {t,ann,observer,h};}
const outcome=r=>r.body.state.log.findLast(e=>e.outcome)?.outcome;
test('a public check shares only its display result with the table and uses actual success',async()=>{
 const {t,ann,observer,h}=await setup();let r=await ann.cmd({type:'roll',charId:h.id,stat:'STR',d20:15});assert.equal(outcome(r)?.label,'SUCCESS');assert.equal(outcome(r).total,18);assert.equal(outcome(r).target,12);assert.equal(outcome(r).who,'Thorne');
 assert.equal(outcome(await observer.get()).label,'SUCCESS');assert.equal(outcome(await observer.get()).own,false);assert.ok(!JSON.stringify(outcome(await observer.get())).includes('gear'));
 await t.gm.cmd({type:'setTarget',value:40});r=await ann.cmd({type:'roll',charId:h.id,stat:'STR',d20:20});assert.equal(outcome(r).label,'FAILED CHECK','natural 20 must not invent success');
});
test('misses, critical hits, ordinary failures and healing use the correct wording',async()=>{
 const {ann,h,t}=await setup(),foe=find(await t.state(),'Pit Ghoul');
 let r=await ann.cmd({type:'roll',charId:h.id,stat:'STR',d20:2,attack:true,targetCardId:foe.id});assert.equal(outcome(r)?.label,'MISS');assert.equal(outcome(r).targetName,'Pit Ghoul');
 r=await ann.cmd({type:'useItem',charId:h.id,index:0,d20:20,targetCardId:foe.id});assert.equal(outcome(r).label,'CRITICAL HIT');assert.equal(outcome(r).own,true);
 r=await ann.cmd({type:'roll',charId:h.id,stat:'WIS',d20:2});assert.equal(outcome(r).label,'FAILED CHECK');
});
test('private targets and hidden monster numbers never enter a player reveal',async()=>{
 const {t,ann,observer,h}=await setup();const hidden=await t.gm.cmd({type:'cardCreate',card:{name:'PRIVATE REVEAL FOE',kind:'token',visible:false,attack:7,hp:{cur:10,max:10}}});
 await t.gm.cmd({type:'monsterAttack',cardId:hidden.body.result.id,targetCardId:h.cardId,d20:20});let o=outcome(await observer.get());assert.equal(o.who,'Something');assert.ok(!JSON.stringify(o).includes('PRIVATE'));
 await t.gm.cmd({type:'cardUpdate',id:hidden.body.result.id,patch:{hideNumbers:true}});await t.gm.cmd({type:'monsterAttack',cardId:hidden.body.result.id,targetCardId:h.cardId,d20:19});o=outcome(await ann.get());assert.equal(o.total,undefined);assert.equal(o.d20,undefined);assert.equal(o.target,undefined);assert.equal(o.label,'HIT');assert.equal(o.hiddenNumbers,true);
 await t.gm.cmd({type:'roll',charId:h.id,stat:'WIS',d20:15,targetCardId:hidden.body.result.id});assert.ok(!JSON.stringify((await observer.get()).body).includes('PRIVATE REVEAL FOE'));
});
test('GM free dice are neutral rather than declaring success or failure',async()=>{
 const {t}=await setup();const r=await t.gm.cmd({type:'gmDice',sides:20,count:1,private:true});assert.equal(r.body.state.log.at(-1).outcome,undefined);
});
test('a scene change does not reveal an old scene check from a delayed activity batch',async()=>{
 const {t,ann,h}=await setup();await ann.cmd({type:'roll',charId:h.id,stat:'STR',d20:15});const s=await t.state(),next=s.scenes.find(sc=>sc.id!==s.table.scene.id).id;
 await t.gm.cmd({type:'sceneReveal',id:next});assert.equal(outcome(await ann.get()),undefined);
});
