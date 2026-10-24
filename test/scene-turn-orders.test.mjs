import test from 'node:test';import assert from 'node:assert/strict';
import {table,charNamed,find} from './vtt-helpers.mjs';
const order=s=>s.table.order.map(x=>x.id), heroes=s=>Object.values(s.cards).filter(c=>c.kind==='pc').map(c=>c.id);

test('each scene keeps its edited order and current actor, including an existing unsplit table',async()=>{
 const t=await table(),st=await t.state(),first=st.table.scene.id,second=st.scenes.find(x=>x.id!==first).id,h=charNamed(st,'Thorne'),w=charNamed(st,'Wisp'),foe=find(st,'Pit Ghoul');
 const a=[foe.id,h.cardId,w.cardId];await t.gm.cmd({type:'orderSet',order:a});await t.gm.cmd({type:'turnSet',idx:1});
 let r=await t.gm.cmd({type:'sceneReveal',id:second});assert.equal(r.status,200);assert.deepEqual(new Set(order(r.body.state)),new Set(heroes(st)));assert.ok(!order(r.body.state).includes(foe.id));
 const b=[w.cardId,h.cardId];await t.gm.cmd({type:'orderSet',order:b});await t.gm.cmd({type:'turnSet',idx:1});
 r=await t.gm.cmd({type:'sceneReveal',id:first});assert.deepEqual(order(r.body.state),a);assert.equal(r.body.state.table.idx,1);
 r=await t.gm.cmd({type:'sceneReveal',id:second});assert.deepEqual(order(r.body.state),b);assert.equal(r.body.state.table.idx,1);
 assert.deepEqual(order(await t.state()),b,'fresh read preserves the active scene order');
});
test('a prepared enemy joins only its scene order and never leaks in player replies',async()=>{
 const t=await table(),p=await t.join('Observer'),st=await t.state(),first=st.table.scene.id,second=st.scenes.find(x=>x.id!==first).id;
 const made=await t.gm.cmd({type:'cardCreate',card:{name:'PRIVATE PREPARED FOE',kind:'token',sceneId:second,visible:false,hp:{cur:10,max:10}},addToOrder:true}),id=made.body.result.id;
 assert.deepEqual(order(made.body.state),order(st));assert.ok(!JSON.stringify((await p.get()).body).includes(id));
 const r=await t.gm.cmd({type:'sceneReveal',id:second});assert.ok(order(r.body.state).includes(id));assert.ok(!order(r.body.state).includes(find(st,'Pit Ghoul').id));
 await t.gm.cmd({type:'sceneReveal',id:first});assert.deepEqual(order(await t.state()),order(st));
});
test('deleted cards are removed from saved orders without losing the current actor',async()=>{
 const t=await table(),st=await t.state(),first=st.table.scene.id,second=st.scenes.find(x=>x.id!==first).id,h=charNamed(st,'Thorne'),foe=find(st,'Pit Ghoul');
 await t.gm.cmd({type:'orderSet',order:[foe.id,h.cardId]});await t.gm.cmd({type:'turnSet',idx:1});await t.gm.cmd({type:'sceneReveal',id:second});await t.gm.cmd({type:'cardDelete',id:foe.id});
 const r=await t.gm.cmd({type:'sceneReveal',id:first});assert.deepEqual(order(r.body.state),[h.cardId]);assert.equal(r.body.state.table.idx,0);
});
test('scene switches do not tick timers, advance rounds or accept stale scene turn commands',async()=>{
 const t=await table(),st=await t.state(),first=st.table.scene.id,second=st.scenes.find(x=>x.id!==first).id;
 await t.gm.cmd({type:'sceneReveal',id:second});let now=await t.state();assert.equal(now.table.round,st.table.round);
 for(const c of Object.values(st.cards).filter(c=>c.timer))assert.deepEqual((await t.gm.cmd({type:'sceneReveal',id:first})).body.state.cards[c.id].timer,c.timer);
 await t.gm.cmd({type:'sceneReveal',id:second});now=await t.state();
 assert.equal((await t.gm.cmd({type:'endTurn',expect:{scene:first,idx:now.table.idx,round:now.table.round}})).status,409);
 assert.equal((await t.gm.cmd({type:'orderSet',sceneId:first,order:[]})).status,409);
 const p=await t.join('Player');assert.equal((await p.cmd({type:'orderSet',order:[]})).status,403);
});

test('empty scene orders remain empty and new heroes join existing scene orders',async()=>{
 const t=await table(),st=await t.state(),a=st.table.scene.id,b=st.scenes.find(x=>x.id!==a).id;
 await t.gm.cmd({type:'sceneReveal',id:b});await t.gm.cmd({type:'orderSet',order:[]});await t.gm.cmd({type:'sceneReveal',id:a});await t.gm.cmd({type:'sceneReveal',id:b});assert.deepEqual(order(await t.state()),[]);
 await t.gm.cmd({type:'sceneReveal',id:a});const made=await t.gm.cmd({type:'charCreate',char:{name:'New test hero'}});assert.equal(made.status,200);
 const h=Object.values(made.body.state.chars).find(c=>c.name==='New test hero');await t.gm.cmd({type:'sceneReveal',id:b});assert.deepEqual(order(await t.state()),[h.cardId]);
});
test('moving and deleting enemies cleans saved orders and Undo cannot move a different scene turn',async()=>{
 const t=await table(),st=await t.state(),a=st.table.scene.id,b=st.scenes.find(x=>x.id!==a).id,foe=find(st,'Pit Ghoul');
 await t.gm.cmd({type:'endTurn'});const turn=(await t.state()).log.findLast(e=>e.kind==='turn');
 await t.gm.cmd({type:'sceneReveal',id:b});await t.gm.cmd({type:'turnSet',idx:1});assert.equal((await t.gm.cmd({type:'undo',logId:turn.id})).status,409);
 await t.gm.cmd({type:'cardUpdate',id:foe.id,patch:{sceneId:b}});assert.ok(order(await t.state()).includes(foe.id));await t.gm.cmd({type:'sceneReveal',id:a});assert.ok(!order(await t.state()).includes(foe.id));
 await t.gm.cmd({type:'sceneDelete',id:b});assert.ok(!(await t.state()).cards[foe.id]);
});

test('an old shared order seeds every prepared scene before the first switch, preserving tracked enemies',async()=>{
 const {memoryStore}=await import('../netlify/functions/_shared/vtt-service.mjs'),store=memoryStore(),t=await table({store}),st=await t.state(),a=st.table.scene.id,b=st.scenes.find(x=>x.id!==a).id;
 const third=await t.gm.cmd({type:'sceneCreate',name:'Third scene'}),c=third.body.result.id;
 const one=await t.gm.cmd({type:'cardCreate',card:{name:'Old second enemy',kind:'token',sceneId:b,visible:false,hp:{cur:10,max:10}}});
 const two=await t.gm.cmd({type:'cardCreate',card:{name:'Old third enemy',kind:'token',sceneId:c,visible:false,hp:{cur:10,max:10}}});
 const saved=await store.get(t.code);Object.values(saved.data.scenes).forEach(sc=>{delete sc.turns;});saved.data.table.order.push(one.body.result.id,two.body.result.id);await store.put(t.code,saved.data,saved.etag);
 let r=await t.gm.cmd({type:'sceneReveal',id:b});assert.ok(order(r.body.state).includes(one.body.result.id));r=await t.gm.cmd({type:'sceneReveal',id:c});assert.ok(order(r.body.state).includes(two.body.result.id));assert.ok(!order(r.body.state).includes(one.body.result.id));
});
