import test from 'node:test';import assert from 'node:assert/strict';import {table,charNamed,find} from './vtt-helpers.mjs';
test('undoing a hero damage application removes it from damage totals and hardest blow',async()=>{
 const t=await table(),st=await t.state(),ch=charNamed(st,'Thorne'),foe=find(st,'Pit Ghoul');
 const r=await t.gm.cmd({type:'roll',charId:ch.id,stat:'STR',d20:15,targetCardId:foe.id});const rollId=r.body.result.rollId;await t.gm.cmd({type:'effort',rollId,cat:'weapons',rolled:4});
 const hit=await t.gm.cmd({type:'apply',rollId,cardId:foe.id,field:'hp'});assert.ok(hit.body.state.recap.heroes[ch.id].dealt>0);const line=hit.body.state.rolls.find(r=>r.id===rollId).applied.log;
 const undone=await t.gm.cmd({type:'undo',logId:line});assert.equal(undone.status,200);assert.equal(undone.body.state.recap.heroes[ch.id].dealt,0);assert.equal(undone.body.state.recap.best,null);
});
