import test from 'node:test';import assert from 'node:assert/strict';
import {table,charNamed,find} from './vtt-helpers.mjs';
async function setup(){const t=await table(),p=await t.join('Ann'),h=charNamed(await t.state(),'Thorne');await p.cmd({type:'claim',charId:h.id});return {t,p,h};}
test('rolling damage applies once to the locked target, retries never double it and Undo restores it',async()=>{
 const {t,p,h}=await setup(),foe=find(await t.state(),'Pit Ghoul');await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'sword'}});
 const hit=await p.cmd({type:'useItem',charId:h.id,index:0,d20:15,targetCardId:foe.id}),id=hit.body.result.rollId;
 const command={type:'effort',rollId:id,cat:'weapons',rolled:4,autoApply:true};let r=await p.cmd(command,{client:'autodamage1',n:1});assert.equal(r.status,200);assert.equal(r.body.state.cards[foe.id].hp.cur,13);assert.ok(r.body.state.rolls.at(-1).applied);
 r=await p.cmd(command,{client:'autodamage1',n:1});assert.equal(r.body.result.duplicate,true);assert.equal(r.body.state.cards[foe.id].hp.cur,13);
 assert.equal((await p.cmd(command)).status,409);const st=await t.state(),log=st.rolls.at(-1).applied.log;assert.equal((await t.gm.cmd({type:'undo',logId:log})).status,200);assert.equal(find(await t.state(),'Pit Ghoul').hp.cur,20);
});
test('area damage applies to selected foes together, including masked HP, and one Undo restores every target',async()=>{
 const {t,p,h}=await setup(),a=find(await t.state(),'Pit Ghoul');await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:'lastconfessions'}});
 const made=await t.gm.cmd({type:'cardCreate',card:{name:'Masked foe',kind:'token',visible:true,hideNumbers:true,hp:{cur:20,max:20}}}),b=made.body.result.id;
 const cast=await p.cmd({type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[a.id,b]}),id=cast.body.result.rollId;
 const r=await p.cmd({type:'effort',rollId:id,cat:'ultimate',rolled:5,autoApply:true});assert.equal(r.status,200);assert.equal(r.body.state.cards[a.id].hp.cur,15);assert.deepEqual(r.body.state.cards[b].hp,{hidden:true});
 assert.deepEqual(r.body.state.rolls.at(-1).applied.targets.find(x=>x.cardId===b),{cardId:b});const st=await t.state();assert.equal(st.cards[b].hp.cur,15);await t.gm.cmd({type:'undo',logId:st.rolls.at(-1).applied.log});assert.equal((await t.state()).cards[b].hp.cur,20);assert.equal(find(await t.state(),'Pit Ghoul').hp.cur,20);
});
test('missing targets refuse damage before a roll is saved and clients cannot redirect auto damage',async()=>{
 const {t,p,h}=await setup(),foe=find(await t.state(),'Pit Ghoul');const hit=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15,attack:true,targetCardId:foe.id}),id=hit.body.result.rollId;
 await t.gm.cmd({type:'cardDelete',id:foe.id});const r=await p.cmd({type:'effort',rollId:id,cat:'weapons',rolled:4,autoApply:true,cardId:h.cardId});assert.equal(r.status,404);assert.equal((await t.state()).rolls.at(-1).effort,null);assert.equal((await t.state()).cards[h.cardId].hp.cur,10);
});
test('task Effort advances the selected obstacle and old manual callers remain compatible',async()=>{
 const {t,p,h}=await setup(),gate=find(await t.state(),'The Sealed Gate');const r=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15,targetCardId:gate.id});
 const done=await p.cmd({type:'effort',rollId:r.body.result.rollId,cat:'weapons',rolled:4,autoApply:true});assert.equal(done.status,200);assert.equal(done.body.state.cards[gate.id].progress.cur,7);
 const legacy=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15,targetCardId:gate.id});await p.cmd({type:'effort',rollId:legacy.body.result.rollId,cat:'weapons',rolled:2});assert.equal(find(await t.state(),'The Sealed Gate').progress.cur,7);assert.equal((await t.state()).rolls.at(-1).applied,null);
});
