import {test} from 'node:test';
import assert from 'node:assert/strict';
import {table,find} from './vtt-helpers.mjs';

test('preparing a hidden enemy cannot damage heroes in the live scene',async()=>{
 const t=await table(),s=await t.state(),other=s.scenes.find(x=>x.id!==s.table.scene.id).id,hero=find(s,'Thorne');
 const made=await t.gm.cmd({type:'cardCreate',card:{kind:'token',name:'Prepared enemy',sceneId:other,visible:false,hp:{cur:10,max:10},attack:2}});
 const before=hero.hp.cur,reply=await t.gm.cmd({type:'monsterAttack',cardId:made.body.result.id,targetCardId:hero.id,d20:20});
 assert.equal(reply.status,409);assert.equal((await t.state()).cards[hero.id].hp.cur,before);
});

test('monster damage cannot follow an attack into a different live scene',async()=>{
 const t=await table(),s=await t.state(),hero=find(s,'Thorne'),foe=find(s,'Pit Ghoul');
 const hit=await t.gm.cmd({type:'monsterAttack',cardId:foe.id,targetCardId:hero.id,d20:20});assert.equal(hit.status,200);
 await t.gm.cmd({type:'sceneReveal',id:s.scenes.find(x=>x.id!==s.table.scene.id).id});
 const damage=await t.gm.cmd({type:'monsterEffort',rollId:hit.body.result.rollId,cat:'weapons',rolled:4});
 assert.equal(damage.status,409);assert.equal((await t.state()).cards[hero.id].hp.cur,hero.hp.cur);
});

test('only the live encounter can be refreshed, and hidden live attackers still work',async()=>{
 const t=await table(),s=await t.state(),foe=find(s,'Pit Ghoul');
 assert.equal((await t.gm.cmd({type:'scenePowerReset',id:s.scenes.find(x=>x.id!==s.table.scene.id).id})).status,409);
 await t.gm.cmd({type:'cardUpdate',id:foe.id,patch:{visible:false}});
 assert.equal((await t.gm.cmd({type:'monsterAttack',cardId:foe.id,targetCardId:find(s,'Thorne').id,d20:20})).status,200);
});
