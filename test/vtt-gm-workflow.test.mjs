import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find, charNamed } from './vtt-helpers.mjs';

test('only the GM advances turns, even when it is the player’s own turn', async () => {
 const t=await table(),p=await t.join('Ann'),h=charNamed(await t.state(),'Thorne');
 await p.cmd({type:'claim',charId:h.id});await t.gm.cmd({type:'orderSet',order:[h.cardId]});
 const before=await t.state();assert.equal((await p.cmd({type:'endTurn'})).status,403);assert.equal((await t.state()).table.round,before.table.round);
 assert.equal((await t.gm.cmd({type:'endTurn'})).status,200);
});

test('rest lowers Horror with d10s while keeping one die per two living heroes', async () => {
 const t=await table({dice:[0.99,0.99]});await t.gm.cmd({type:'horror',value:21});
 const r=await t.gm.cmd({type:'rest'});assert.equal(r.status,200);const log=r.body.state.log.find(e=>e.id===r.body.result.log);
 assert.deepEqual(log.dice.map(d=>d.die),[10,10]);assert.equal(log.dice.reduce((n,d)=>n+d.n,0),20);assert.equal(r.body.state.horror.cur,1);
 await t.gm.cmd({type:'undo',logId:r.body.result.log});assert.equal((await t.state()).horror.cur,21);
});

test('scene deletion is GM-only, rejects the live scene, and preserves heroes and other scenes', async () => {
 const t=await table(),p=await t.join('Ann'),before=await t.state(),live=before.table.scene.id;
 const scene=(await t.gm.cmd({type:'sceneCreate',name:'Disposable room'})).body.result.id;
 const card=(await t.gm.cmd({type:'cardCreate',card:{name:'Disposable threat',sceneId:scene,hp:{cur:10,max:10},visible:false}})).body.result.id;
 assert.equal((await p.cmd({type:'sceneDelete',id:scene})).status,403);
 assert.equal((await t.gm.cmd({type:'sceneDelete',id:live})).status,400);
 assert.equal((await t.gm.cmd({type:'sceneDelete',id:scene})).status,200);
 const after=await t.state();assert.ok(!after.scenes.some(s=>s.id===scene));assert.ok(!after.cards[card]);
 assert.deepEqual(after.chars,before.chars);assert.ok(find(after,'Pit Ghoul'));assert.equal(after.table.scene.id,live);
});

test('deleting a scene removes its ink while keeping heroes, carried gear and privately held cards', async()=>{
 const t=await table({gear:true}),p=await t.join('Ann'),before=await t.state(),hero=charNamed(before,'Thorne');
 const sc=(await t.gm.cmd({type:'sceneCreate',name:'Disposable archive'})).body.result.id;
 const held=(await t.gm.cmd({type:'cardCreate',card:{kind:'loot',name:'Kept possession',sceneId:sc,visible:false}})).body.result.id;
 await t.gm.cmd({type:'giveCard',id:held,pid:p.pid});await t.gm.cmd({type:'cardUpdate',id:hero.cardId,patch:{sceneId:sc}});
 await t.gm.cmd({type:'draw',sceneId:sc,pts:[[10,10],[20,20]]});
 assert.equal((await t.gm.cmd({type:'sceneDelete',id:sc})).status,200);const after=await t.state();
 assert.deepEqual(after.chars,before.chars);assert.equal(after.cards[hero.cardId].sceneId,null);assert.equal(after.cards[held].owner,p.pid);assert.equal(after.cards[held].sceneId,null);assert.ok(!after.draw.some(d=>d.sceneId===sc));
 assert.ok(!JSON.stringify((await p.get()).body).includes('Disposable archive'));
});
