import test from 'node:test';import assert from 'node:assert/strict';import {table,find} from './vtt-helpers.mjs';
test('scene danger is opt-in, adds the scene bonus once, follows Target and preserves saved attack bonuses',async()=>{
 const t=await table(),st=await t.state(),foe=find(st,'Pit Ghoul'),hero=find(st,'Thorne'),base=foe.attack||0;
 async function attack(){const r=await t.gm.cmd({type:'monsterAttack',cardId:foe.id,targetCardId:hero.id,d20:10});assert.equal(r.status,200);return r.body.state.rolls.at(-1);}
 assert.equal((await attack()).check.mod,base);await t.gm.cmd({type:'settings',patch:{sceneDanger:true}});assert.equal((await attack()).check.mod,base+1);
 await t.gm.cmd({type:'setTarget',value:14});assert.equal((await attack()).check.mod,base+3);assert.equal((await t.state()).cards[foe.id].attack,foe.attack);
 await t.gm.cmd({type:'settings',patch:{sceneDanger:false}});assert.equal((await attack()).check.mod,base);
});
