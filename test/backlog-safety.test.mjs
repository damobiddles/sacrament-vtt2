import test from 'node:test';import assert from 'node:assert/strict';import {table} from './vtt-helpers.mjs';import {memoryStore,IMAGES} from '../netlify/functions/_shared/vtt-service.mjs';
test('simultaneous score and Effort increments each count once without exceeding the build budget',async()=>{
 const t=await table(),p=await t.join('Player'),id=(await t.gm.cmd({type:'charCreate',char:{name:'Concurrent edit'}})).body.result.id;await p.cmd({type:'claim',charId:id});
 for(const [op,key]of [['score','stat'],['effort','cat']]){
  const field=op==='score'?'STR':'weapons',r=await Promise.all([p.cmd({type:'sheet',charId:id,op:{op,[key]:field,delta:1}}),t.gm.cmd({type:'sheet',charId:id,op:{op,[key]:field,delta:1}})]);assert.ok(r.every(x=>x.status===200));const c=(await t.state()).chars[id];assert.equal((op==='score'?c.stats:c.effort)[field],2);
 }
});
test('concurrent uploads cannot exceed the total byte limit and failed reservations leave no orphan image',async()=>{
 const store=memoryStore(),t=await table({store}),raw=await store.get(t.code);raw.data.images={aaaaaaaaaaaaaaaaaaaaaaaa:{mime:'image/png',size:IMAGES.tableBytes-20,at:1}};await store.put(t.code,raw.data,raw.etag);
 const image=Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47]),Buffer.alloc(12)]);
 const upload=()=>t.svc.handle({method:'POST',token:t.gm.token,body:{op:'upload',code:t.code,data:image.toString('base64')}});
 const results=await Promise.all([upload(),upload()]);assert.equal(results.filter(x=>x.status===200).length,1);assert.equal(results.filter(x=>x.status!==200).length,1);
 const after=(await store.get(t.code)).data;assert.ok(Object.values(after.images).reduce((n,m)=>n+m.size,0)<=IMAGES.tableBytes);assert.equal([...store._raw.keys()].filter(k=>k.startsWith('img:')).length,1);
});
test('importing a hero cannot claim another player identity or expose private notes to other players',async()=>{
 const t=await table(),a=await t.join('Importer'),b=await t.join('Other');
 const imported=await a.cmd({type:'bringHero',hero:{name:'Imported',owner:b.pid,notes:'PRIVATE IMPORT NOTE',stats:{STR:2},effort:{weapons:2},gear:[]}});assert.equal(imported.status,200);const id=imported.body.result.id;assert.equal(imported.body.state.chars[id].owner,a.pid);
 assert.ok(!JSON.stringify((await b.get()).body).includes('PRIVATE IMPORT NOTE'));assert.equal((await b.cmd({type:'sheet',charId:id,op:{op:'text',field:'notes',value:'Changed'}})).status,403);
});
