import test from 'node:test';
import assert from 'node:assert/strict';
import {table} from './vtt-helpers.mjs';

test('GM renames the live scene without changing its identity, cards, layout or background',async()=>{
 const t=await table({gear:true}),before=await t.state(),id=before.table.scene.id;
 const r=await t.gm.cmd({type:'sceneUpdate',id,name:'Renamed live scene'});assert.equal(r.status,200);
 const after=await t.state();assert.equal(after.table.scene.id,id);assert.equal(after.table.scene.name,'Renamed live scene');
 assert.equal(after.table.scene.bg,before.table.scene.bg);assert.deepEqual(after.cards,before.cards);assert.deepEqual(after.layout,before.layout);
 const p=await t.join('Player');assert.equal((await p.get()).body.state.table.scene.name,'Renamed live scene');
});

test('prepared scene names remain private and players cannot rename either scene',async()=>{
 const t=await table(),p=await t.join('Player'),id=(await t.gm.cmd({type:'sceneCreate',name:'Preparation'})).body.result.id;
 assert.equal((await t.gm.cmd({type:'sceneUpdate',id,name:'PRIVATE SCENE NAME'})).status,200);
 assert.ok(!JSON.stringify((await p.get()).body).includes('PRIVATE SCENE NAME'));
 for(const scene of [id,(await t.state()).table.scene.id])assert.equal((await p.cmd({type:'sceneUpdate',id:scene,name:'Player attempt'})).status,403);
 await t.gm.cmd({type:'sceneReveal',id});assert.equal((await p.get()).body.state.table.scene.name,'PRIVATE SCENE NAME');
});

test('empty names are refused, names are trimmed and limited, and unknown scenes are refused',async()=>{
 const t=await table(),id=(await t.state()).table.scene.id,original=(await t.state()).table.scene.name;
 for(const name of ['', '   ', '\n\t']){assert.equal((await t.gm.cmd({type:'sceneUpdate',id,name})).status,400);assert.equal((await t.state()).table.scene.name,original);}
 assert.equal((await t.gm.cmd({type:'sceneUpdate',id,name:'  New name  '})).status,200);assert.equal((await t.state()).table.scene.name,'New name');
 await t.gm.cmd({type:'sceneUpdate',id,name:'n'.repeat(80)});assert.equal((await t.state()).table.scene.name.length,60);
 assert.equal((await t.gm.cmd({type:'sceneUpdate',id:'missing',name:'Name'})).status,404);
});
