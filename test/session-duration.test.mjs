import test from 'node:test';import assert from 'node:assert/strict';import {table,find} from './vtt-helpers.mjs';import {memoryStore,makeService} from '../netlify/functions/_shared/vtt-service.mjs';
test('session credentials, retries and private state survive six simulated hours and service recreation',async()=>{
 const store=memoryStore(),t=await table({store}),p=await t.join('Player'),st=await t.state(),hero=find(st,'Thorne');let clock=Date.now(),sequence=0;
 await t.gm.cmd({type:'cardUpdate',id:hero.id,patch:{gmNotes:'PRIVATE SOAK NOTE'}});
 for(let step=0;step<12;step++){
  clock+=30*60*1000;const svc=makeService({store,now:()=>++clock});
  const cmd={type:'setTarget',value:12+step%3,actionId:'durationgm.'+(++sequence)};
  const first=await svc.handle({method:'POST',token:t.gm.token,body:{op:'cmd',code:t.code,cmd}});assert.equal(first.status,200);
  const duplicate=await svc.handle({method:'POST',token:t.gm.token,body:{op:'cmd',code:t.code,cmd}});assert.equal(duplicate.body.result.duplicate,true);assert.equal(duplicate.body.state.v,first.body.state.v);
  const player=await svc.handle({method:'GET',token:p.token,query:{code:t.code}});assert.equal(player.status,200);assert.equal(player.body.state.table.target,cmd.value);assert.ok(!JSON.stringify(player.body).includes('PRIVATE SOAK NOTE'));
 }
});
