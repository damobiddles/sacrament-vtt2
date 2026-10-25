import test from 'node:test';
import assert from 'node:assert/strict';
import {table,charNamed} from './vtt-helpers.mjs';
const C=globalThis.SacramentSheetCore;
test('armour retains its Heart through design, library, card and award without healing wounds',async()=>{
 for(const id of ['harness','processionalharness']){
  const t=await table(),h=charNamed(await t.state(),'Thorne');
  const design=C.designOf(C.item(id));assert.equal(C.makeCustom(design).hearts,1);
  const saved=await t.gm.cmd({type:'lootSave',item:design});assert.equal(saved.status,200);
  const placed=await t.gm.cmd({type:'lootPlace',libId:saved.body.result.id});assert.equal(placed.status,200);
  await t.gm.cmd({type:'adjust',cardId:h.cardId,delta:-3});
  const r=await t.gm.cmd({type:'lootGive',cardId:placed.body.result.id,charId:h.id});assert.equal(r.status,200);
  assert.deepEqual(r.body.state.cards[h.cardId].hp,{cur:17,max:20});
  const gear=r.body.state.chars[h.id].gear[0];assert.equal(C.itemOf(gear).hearts,1);
  const pack=await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'move',index:0,eq:false}});assert.equal(pack.status,200);
  assert.deepEqual(pack.body.state.cards[h.cardId].hp,{cur:7,max:10});
 }
});
test('new custom designs reject malformed Horror without creating a library item',async()=>{
 const t=await table();
 for(const horror of ['bogus',-1,'','d7','2d6+','1.5']){
  const r=await t.gm.cmd({type:'lootSave',item:{name:'Cost validation',category:'Curio',temptsHorror:true,horror}});
  assert.equal(r.status,400,String(horror));assert.match(r.body.error.message,/Horror/i);
 }
 assert.equal((await t.state()).lootLib.length,0);
 for(const horror of [0,1,'d4+2'])assert.equal((await t.gm.cmd({type:'lootSave',item:{name:'Valid cost',temptsHorror:true,horror}})).status,200);
});
test('sling reach and candle detection metadata match their existing descriptions',()=>{
 for(const id of ['sling','droversling','candle'])assert.equal(C.item(id).band,'far',id);
 assert.match(C.item('candle').rangeNote,/detect|detection/i);
});

test('manual effects have a shared explanation without pretending to apply them',()=>{
 assert.match(C.automationText(C.item('chain')),/self-harm.*check bonus.*manually/);
 assert.match(C.automationText(C.item('oil')),/Manual:.*quantities/);
 const ward=globalThis.SACRAMENT_GEAR.spells.find(s=>s.id==='ward');assert.match(C.automationText(ward),/eligible ally.*Defence manually/);
});
