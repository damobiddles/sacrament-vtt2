import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { table, charNamed } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';

function heroes(storage) {
  const ctx = vm.createContext({ localStorage: storage });
  for (const file of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js']) vm.runInContext(readFileSync(new URL('../site/' + file, import.meta.url), 'utf8'), ctx);
  return ctx.SacramentHeroes;
}
const line = (sceneId) => ({ type: 'draw', sceneId, pts: [[10, 10], [20, 20]], color: '#123456' });

test('saved heroes beyond the creation limit are preserved when read', () => {
  const data = new Map(), H = heroes({ getItem: k => data.get(k) || null, setItem: (k,v) => data.set(k,v) });
  const all = Array.from({length:31}, () => H.blank());
  data.set(H.KEY, JSON.stringify({ heroes: all, current: all[30].id }));
  const st = H.read(); assert.equal(st.heroes.length,31); assert.equal(st.current,all[30].id); assert.equal(H.canAdd(st),false);
});

test('failed saves are reported and a later successful save clears the error', () => {
  const data = new Map(); let blocked = true;
  const H = heroes({ getItem: k => data.get(k) || null, setItem: (k,v) => { if(blocked) throw Error('Quota'); data.set(k,v); } });
  const st = H.read(); st.heroes.push(H.blank());
  assert.equal(H.save(st),false); assert.ok(st.saveError); assert.equal(st.heroes.length,1);
  blocked=false; assert.equal(H.save(st),true); assert.equal(st.saveError,'');
});

test('corrupt saved data is retained for backup and cannot be overwritten', () => {
  const data = new Map(); const H = heroes({ getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v) });
  data.set(H.KEY,'{broken'); const st=H.read(); st.heroes.push(H.blank());
  assert.equal(H.save(st),false); assert.equal(data.get(H.KEY),'{broken'); assert.equal(H.backup(st).unreadableOriginal,'{broken');
});

test('removing a player revokes old credentials, frees their hero and never revives their token on rejoin', async () => {
  const t=await table(); const joinKey='same-browser-attempt';
  const join=()=>t.svc.handle({method:'POST',body:{op:'join',code:t.code,name:'Ann',joinKey}});
  const first=await join(), pid=first.body.pid, token=first.body.token, ch=charNamed(await t.state(),'Thorne');
  await t.gm.cmd({type:'assign',charId:ch.id,pid});
  assert.equal((await t.gm.cmd({type:'playerRemove',pid})).status,200);
  assert.equal((await t.svc.handle({method:'GET',query:{code:t.code},token})).status,401);
  assert.equal((await t.svc.handle({method:'POST',body:{op:'cmd',code:t.code,cmd:{type:'point',x:1,y:1,actionId:'revoked.1'}},token})).status,401);
  assert.equal(charNamed(await t.state(),'Thorne').owner,null);
  const again=await join(); assert.equal(again.status,200); assert.notEqual(again.body.token,token); assert.notEqual(again.body.pid,pid);
  assert.equal((await t.svc.handle({method:'GET',query:{code:t.code},token})).status,401);
});

test('only the GM can remove players and removal returns privately owned cards hidden', async () => {
  const t=await table(), a=await t.join('Ann'), b=await t.join('Bob');
  assert.equal((await a.cmd({type:'playerRemove',pid:b.pid})).status,403);
  const made=await t.gm.cmd({type:'cardCreate',card:{name:'Private possession',kind:'loot'}});
  await t.gm.cmd({type:'giveCard',id:made.body.result.id,pid:a.pid});
  await t.gm.cmd({type:'playerRemove',pid:a.pid});
  const card=(await t.state()).cards[made.body.result.id]; assert.equal(card.owner,null); assert.equal(card.visible,false);
  assert.equal((await b.get()).body.state.cards[card.id],undefined);
});

test('a full table accepts a new player after the GM releases a place', async () => {
  const t=await table(); const players=[];
  for(let i=0;i<12;i++) players.push(await t.join('Player '+i));
  assert.equal((await t.svc.handle({method:'POST',body:{op:'join',code:t.code,name:'Extra'}})).status,403);
  await t.gm.cmd({type:'playerRemove',pid:players[0].pid});
  assert.equal((await t.svc.handle({method:'POST',body:{op:'join',code:t.code,name:'Extra'}})).status,200);
});

test('prepared drawings and pointers never reach players, including pointer-only poll replies', async () => {
  const t=await table(), p=await t.join('Ann'), live=(await t.state()).table.scene.id;
  const id=(await t.gm.cmd({type:'sceneCreate',name:'Private preparation'})).body.result.id;
  await t.gm.cmd(line(live)); await t.gm.cmd(line(id));
  const state=(await p.get()).body.state; assert.equal(state.draw.length,1); assert.equal(state.draw[0].sceneId,live);
  await t.gm.cmd({type:'point',sceneId:id,x:20,y:30});
  const r=await t.svc.handle({method:'GET',query:{code:t.code,since:state.v,pv:0},token:p.token});
  assert.equal(r.body.state,undefined); assert.deepEqual(r.body.pointers,{});
  assert.equal((await p.cmd(line(id))).status,403);
  await t.gm.cmd({type:'sceneReveal',id});
  const next=(await p.get()).body.state; assert.equal(next.draw.length,1); assert.equal(next.draw[0].sceneId,id); assert.ok(next.drawV>state.drawV);
});

test('clearing and undoing drawings affect only the selected scene', async () => {
  const t=await table(), live=(await t.state()).table.scene.id;
  const id=(await t.gm.cmd({type:'sceneCreate',name:'Prepared scene'})).body.result.id;
  await t.gm.cmd(line(live)); await t.gm.cmd(line(id));
  await t.gm.cmd({type:'drawClear',sceneId:id});
  assert.equal((await t.state()).draw.length,1); assert.equal((await t.state()).draw[0].sceneId,live);
  await t.gm.cmd({type:'drawUndo',sceneId:id}); assert.equal((await t.state()).draw.length,1);
});

test('legacy drawings stay with their original live scene after revealing another scene', async () => {
  const store=memoryStore(),t=await table({store}), live=(await t.state()).table.scene.id;
  const id=(await t.gm.cmd({type:'sceneCreate',name:'Next scene'})).body.result.id;
  const old=await store.get(t.code); old.data.draw=[{id:'legacy',by:'gm',pts:[[1,1],[2,2]],color:'#123456'}]; await store.put(t.code,old.data,old.etag);
  await t.gm.cmd({type:'sceneReveal',id}); const st=await t.state(); assert.equal(st.draw[0].sceneId,live);
  const p=await t.join('Ann'); assert.deepEqual((await p.get()).body.state.draw,[]);
});

test('a drawing on a full table cannot evict ink from another scene', async () => {
  const t=await table(),live=(await t.state()).table.scene.id;
  const id=(await t.gm.cmd({type:'sceneCreate',name:'Other scene'})).body.result.id;
  for(let i=0;i<120;i++) assert.equal((await t.gm.cmd(line(live))).status,200);
  assert.equal((await t.gm.cmd(line(id))).status,400);
  assert.equal((await t.state()).draw.filter(s=>s.sceneId===live).length,120);
});

test('older GM pages must refresh before annotating a table with multiple scenes', async () => {
  const t=await table(); await t.gm.cmd({type:'sceneCreate',name:'Private scene'});
  for(const cmd of [{type:'draw',pts:[[1,1],[2,2]]},{type:'drawUndo'},{type:'drawClear'},{type:'point',x:10,y:20}]) {
    const r=await t.gm.cmd({...cmd,sceneId:null}); assert.equal(r.status,409); assert.match(r.body.error.message,/refresh/i);
  }
});
