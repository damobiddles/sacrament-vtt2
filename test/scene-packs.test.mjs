import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash,randomBytes} from 'node:crypto';
import {table,find} from './vtt-helpers.mjs';import {memoryStore} from '../netlify/functions/_shared/vtt-service.mjs';import '../site/vtt/scene-pack.js';
const P=globalThis.SacramentScenePack,hash=b=>createHash('sha256').update(b).digest('hex'),job=()=>randomBytes(12).toString('hex');
const request=(t,body,actor=t.gm)=>t.svc.handle({method:'POST',token:actor.token,body:{code:t.code,...body}});
async function exported(t){const s=await t.state(),r=await request(t,{op:'sceneExport',sceneId:s.table.scene.id});assert.equal(r.status,200);const assets=r.body.sources.map(i=>{const bytes=fs.readFileSync(new URL('../site'+i.src,import.meta.url));r.body.manifest.images.push({ref:i.ref,mime:'image/webp',size:bytes.length,sha256:hash(bytes)});return {ref:i.ref,data:bytes.toString('base64')};});return {manifest:r.body.manifest,assets};}
async function begin(t,p,id=job(),extra={}){return {id,r:await request(t,{op:'sceneBegin',jobId:id,packId:hash(JSON.stringify(p)),manifest:p.manifest,...extra})};}
async function stage(t,p,id){for(const a of p.assets)assert.equal((await request(t,{op:'sceneStage',jobId:id,...a})).status,200);}
async function imported(t,p){const b=await begin(t,p);assert.equal(b.r.status,200,JSON.stringify(b.r.body.error));await stage(t,p,b.id);const r=await t.gm.cmd({type:'sceneImport',jobId:b.id});assert.equal(r.status,200,JSON.stringify(r.body.error));return {id:b.id,r};}

test('export is read-only, allowlisted, and excludes heroes, loot, possessions, private notes and source credentials',async()=>{
 const t=await table({gear:true}),s=await t.state();await t.gm.cmd({type:'cardCreate',card:{kind:'token',name:'Possessed secret',owner:'x',charId:Object.keys(s.chars)[0]}});await t.gm.cmd({type:'cardCreate',card:{kind:'card',name:'Embedded loot',loot:{private:'forbidden'}}});
 const before=await t.state(),p=await exported(t);assert.deepEqual(await t.state(),before);P.file(p);
 const text=JSON.stringify(p);for(const secret of ['Thorne','Wisp','Warden’s Bell','Possessed secret','Embedded loot','SECRET:',t.code,t.gm.token,'charId','gmNotes','players','lootLib'])assert.ok(!text.includes(secret),secret);
 assert.equal(p.manifest.cards.length,3);assert.ok(p.assets.length);P.dimensions(Buffer.from(p.assets[0].data,'base64'),'image/webp');
});

test('complete scene round trip preserves existing game and imports fresh trackers, drawings and independent images privately',async()=>{
 const source=await table(),st=await source.state();await source.gm.cmd({type:'track',id:find(st,'Pit Ghoul').id,field:'hp',d:-7});await source.gm.cmd({type:'move',id:find(st,'Pit Ghoul').id,x:46.25,y:36.125});await source.gm.cmd({type:'nextRound'});await source.gm.cmd({type:'draw',pts:[[2.5,3],[10,20]],color:'#4da6ff'});
 const p=await exported(source);p.manifest.instructions='The sealed gate opens after the ghoul falls.';
 const dest=await table({gear:true}),player=await dest.join('Unchanged player');await dest.gm.cmd({type:'horror',d:3});const before=await dest.state(),i=await imported(dest,p),after=await dest.state();
 for(const key of ['table','chars','players','horror','settings','lootLib'])assert.deepEqual(after[key],before[key],key);
 for(const [id,c]of Object.entries(before.cards)){assert.deepEqual(after.cards[id],c);assert.deepEqual(after.layout[id],before.layout[id]);}
 const cards=Object.values(after.cards).filter(c=>c.sceneId===i.r.body.result.id);assert.equal(cards.length,4);assert.equal(cards.find(c=>c.name==='Pit Ghoul').hp.cur,20);const foe=cards.find(c=>c.name==='Pit Ghoul');assert.equal(after.layout[foe.id].x,46.25);assert.equal(after.layout[foe.id].y,36.125);assert.equal(cards.find(c=>c.timer).timer.cur,4);assert.equal(cards.find(c=>c.timer).timer.paused,true);assert.equal(cards.find(c=>c.progress).progress.cur,0);
 assert.equal(cards.find(c=>c.name==='Encounter instructions').visible,false);assert.equal(cards.find(c=>c.name==='Encounter instructions').gmNotes,p.manifest.instructions);
 const scene=after.scenes.find(sc=>sc.id===i.r.body.result.id);assert.match(scene.bg,new RegExp('/img/'+dest.code+'/'));assert.notEqual(scene.id,st.table.scene.id);
 const raw=(await player.get()).body;assert.ok(!JSON.stringify(raw).includes(p.manifest.instructions));assert.ok(!JSON.stringify(raw).includes(i.id));assert.ok(!JSON.stringify(raw).includes(scene.bg));
 const drawings=i.r.body.state.draw.filter(d=>d.sceneId===scene.id);assert.deepEqual(drawings[0].pts,[[2.5,3],[10,20]]);assert.equal(drawings[0].color,'#4da6ff');
 await dest.gm.cmd({type:'nextRound'});assert.equal(Object.values((await dest.state()).cards).find(c=>c.sceneId===scene.id&&c.timer).timer.cur,4);
 const revealed=await dest.gm.cmd({type:'sceneReveal',id:scene.id});assert.ok(revealed.body.state.table.order.some(entry=>entry.id===foe.id),'imported enemies join their own encounter order');assert.ok(Object.values((await player.get()).body.state.cards).some(c=>c.name==='Pit Ghoul'));
});

test('all sharing operations and the final command require GM authority',async()=>{
 const t=await table(),p=await exported(t),player=await t.join('Player'),b=await begin(t,p);
 for(const op of ['sceneExport','sceneCheck','sceneBegin','sceneStage','sceneCancel'])assert.equal((await request(t,{op,jobId:b.id,manifest:p.manifest,packId:hash(JSON.stringify(p))},player)).status,403,op);
 assert.equal((await player.cmd({type:'sceneImport',jobId:b.id})).status,403);assert.equal((await request(t,{op:'sceneExport'}, {token:'stranger'})).status,403);
});

test('upload and commit retries, concurrent commits and lost begin replies create one complete scene',async()=>{
 const t=await table(),p=await exported(t),b=await begin(t,p),before=(await t.state()).scenes.length;assert.equal((await begin(t,p,b.id)).r.status,200);await stage(t,p,b.id);await stage(t,p,b.id);
 const rs=await Promise.all([t.gm.cmd({type:'sceneImport',jobId:b.id}),t.gm.cmd({type:'sceneImport',jobId:b.id})]);assert.ok(rs.every(r=>r.status===200));assert.equal(rs[0].body.result.id,rs[1].body.result.id);assert.equal((await t.state()).scenes.length,before+1);
 assert.equal((await begin(t,p,b.id)).r.body.result.alreadyImported,true);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).body.result.id,rs[0].body.result.id);
});

test('duplicates require explicit confirmation and never replace an existing scene',async()=>{
 const t=await table(),p=await exported(t);await imported(t,p);assert.equal((await begin(t,p)).r.status,409);const b=await begin(t,p,job(),{allowDuplicate:true});assert.equal(b.r.status,200);await stage(t,p,b.id);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).status,200);const names=(await t.state()).scenes.map(s=>s.name);assert.equal(new Set(names).size,names.length);
});

test('capacity failures do not evict drawings or change an active game; pending imports can be cancelled',async()=>{
 const store=memoryStore(),t=await table({store}),p=await exported(t);p.manifest.drawings=[{color:'#65b86a',points:[[0,0],[100,100]]}];
 const raw=await store.get(t.code);raw.data.draw=Array.from({length:120},(_,i)=>({id:'old'+i,sceneId:'sc1',by:'gm',color:'#ffffff',pts:[[0,0],[1,1]]}));await store.put(t.code,raw.data,raw.etag);const before=await t.state();assert.equal((await begin(t,p)).r.status,400);assert.deepEqual(await t.state(),before);
 p.manifest.drawings=[];const b=await begin(t,p);await stage(t,p,b.id);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:job()})).status,400);
 const cancelled=await request(t,{op:'sceneCancel',jobId:b.id});assert.equal(cancelled.status,200);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).status,400);assert.equal([...store._raw.keys()].filter(k=>k.startsWith('img:')).length,0);
});

test('incomplete or corrupt images cannot create a partial scene',async()=>{
 const t=await table(),p=await exported(t),b=await begin(t,p),before=await t.state();assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).status,400);assert.deepEqual(await t.state(),before);
 const a=p.assets[0];assert.equal((await request(t,{op:'sceneStage',jobId:b.id,ref:a.ref,data:Buffer.from('broken').toString('base64')})).status,400);assert.deepEqual(await t.state(),before);
});

test('reject unknown fields, owners, loot, external asset URLs, newer versions and invalid drawing/number limits',async()=>{
 const t=await table(),base=await exported(t);
 for(const mutate of [p=>p.manifest.version=2,p=>p.manifest.secret='x',p=>p.manifest.cards[0].owner='someone',p=>p.manifest.cards[0].kind='pc',p=>p.manifest.cards[0].loot={},p=>p.manifest.background='https://evil.test/image',p=>p.manifest.cards[0].hp=Infinity,p=>p.manifest.drawings=[{color:'url(evil)',points:[[1,2],[3,4]]}],p=>p.manifest.drawings=[{color:'#ffffff',points:[[NaN,2],[3,4]]}]]){
  const p=structuredClone(base);mutate(p);assert.throws(()=>P.file(p));assert.equal((await begin(t,p)).r.status,400);
 }
});

test('expired staging is private, cannot be committed, and is cleaned up on the next import',async()=>{
 const store=memoryStore(),t=await table({store}),p=await exported(t),b=await begin(t,p);await stage(t,p,b.id);const raw=await store.get(t.code);raw.data.sceneImports[b.id].expires=0;await store.put(t.code,raw.data,raw.etag);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).status,400);assert.equal((await begin(t,p)).r.status,200);assert.equal([...store._raw.keys()].filter(k=>k.startsWith('img:')).length,0);
});

test('capacity is rechecked at final save and does not expose images or cards from a failed import',async()=>{
 const store=memoryStore(),t=await table({store}),p=await exported(t),b=await begin(t,p);await stage(t,p,b.id);
 const raw=await store.get(t.code);for(let n=Object.keys(raw.data.cards).length;n<150;n++)raw.data.cards['existing'+n]={id:'existing'+n,kind:'card',name:'Already here',visible:false,sceneId:'sc1'};await store.put(t.code,raw.data,raw.etag);
 const before=await t.state(),r=await t.gm.cmd({type:'sceneImport',jobId:b.id});assert.equal(r.status,400);assert.deepEqual(await t.state(),before);assert.deepEqual((await store.get(t.code)).data.images||{},{});
});

test('a cancelled in-flight upload cannot populate a different import or delete its images',async()=>{
 const store=memoryStore(),original=store.putImage;let release,entered;const waiting=new Promise(r=>entered=r),hold=new Promise(r=>release=r);let once=true;
 store.putImage=async(...args)=>{if(once){once=false;entered();await hold;}return original(...args);};
 const t=await table({store}),p=await exported(t),b=await begin(t,p),upload=request(t,{op:'sceneStage',jobId:b.id,...p.assets[0]});await waiting;await request(t,{op:'sceneCancel',jobId:b.id});assert.equal((await begin(t,p,b.id)).r.status,200);release();assert.equal((await upload).status,400);await stage(t,p,b.id);assert.equal((await t.gm.cmd({type:'sceneImport',jobId:b.id})).status,200);assert.equal([...store._raw.keys()].filter(k=>k.startsWith('img:')).length,1);
});

test('the reviewed website pack is portable, complete and contains no sample heroes or original private notes',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../site/downloads/scenes/the-sealed-gate.sacrament-scene',import.meta.url),'utf8'));P.file(p);assert.equal(p.manifest.cards.length,3);assert.ok(p.manifest.instructions.includes('does not apply damage automatically'));
 for(const a of p.assets){const b=Buffer.from(a.data,'base64'),m=p.manifest.images.find(i=>i.ref===a.ref);assert.equal(hash(b),m.sha256);assert.equal(b.length,m.size);P.dimensions(b,m.mime);}
 assert.ok(!/Thorne|Wisp|SECRET:|Warden’s Bell|gmNotes|charId/.test(JSON.stringify(p)));
});

test('malformed import ids cannot match an ordinary scene and export cannot read inherited scene keys',async()=>{
 const t=await table(),before=await t.state();
 for(const jobId of [undefined,'','__proto__','constructor','not-an-import'])assert.equal((await t.gm.cmd({type:'sceneImport',jobId})).status,400);
 for(const sceneId of ['__proto__','constructor','missing'])assert.equal((await request(t,{op:'sceneExport',sceneId})).status,400);
 assert.deepEqual(await t.state(),before);
});
