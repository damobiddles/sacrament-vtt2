import test from 'node:test';import assert from 'node:assert/strict';
import '../site/vtt/rules.js';import '../site/sheet/gear.js';import '../site/sheet/sheet-core.js';
import {table,charNamed,find} from './vtt-helpers.mjs';
const R=globalThis.SacramentRules,C=globalThis.SacramentSheetCore,G=globalThis.SACRAMENT_GEAR;
test('current loot ranges use the agreed bands without giving polearms throwing reach',()=>{
 assert.deepEqual(Object.keys(R.RANGES),['close','near','far','veryfar']);
 for(const i of [...C.items,...G.spells])if(i.band)assert.ok([...Object.keys(R.RANGES),'self','special'].includes(i.band),i.id+': '+i.band);
 for(const id of ['sword','knife','spear','billhook','tollpike'])assert.equal(C.item(id).band,'close',id);
 assert.equal(C.item('hatchet').thrownBand,'near');assert.equal(C.item('watchlongbow').band,'veryfar');assert.equal(C.item('crossbow').band,'far');
 assert.equal(G.spells.find(s=>s.id==='mend').band,'near');assert.equal(C.item('bandages').band,'close');
 for(const it of C.items.filter(i=>i.kind==='weapon'))assert.ok(it.band,it.id);
 for(const sp of G.spells)assert.ok(sp.band,sp.id);
});
test('a custom range survives library, card and hero-copy conversion',()=>{
 const raw={name:'Test rifle',category:'Weapon',weaponStyle:'firearm',cat:'guns',roll:'DEX',slots:2,band:'veryfar',does:'A test ranged weapon.'};
 const d=C.makeCustom(raw);assert.equal(d.band,'veryfar');assert.equal(C.makeCustom(C.designOf(d)).band,'veryfar');assert.equal(C.rangeText(d),'Range: Very Far');
 assert.equal(C.makeCustom({...raw,band:'invalid'}).band,'');assert.equal(C.makeCustom({...raw,band:'engaged'}).band,'close');
});
test('a fallen hero cannot start attacks, checks, item actions, Effort or Push; recovery restores actions',async()=>{
 const t=await table({gear:true}),p=await t.join('Ann');let st=await t.state();const h=charNamed(st,'Thorne'),foe=find(st,'Pit Ghoul');await p.cmd({type:'claim',charId:h.id});
 const successful=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15,attack:true,targetCardId:foe.id});
 const failed=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:2,attack:true,targetCardId:foe.id});assert.equal(failed.status,200);
 await t.gm.cmd({type:'adjust',cardId:h.cardId,field:'hp',delta:-10});
 const before=await t.state();
 for(const cmd of [{type:'roll',charId:h.id,stat:'STR',d20:15},{type:'useItem',charId:h.id,index:0,targetCardId:foe.id},{type:'freeEffort',charId:h.id,cat:'weapons'},{type:'effort',rollId:successful.body.result.rollId,cat:'weapons'},{type:'push',rollId:failed.body.result.rollId}]){
  const r=await p.cmd(cmd);assert.equal(r.status,400,cmd.type);assert.match(r.body.error.message,/fallen|0 HP/i);
 }
 assert.equal((await t.state()).horror.cur,before.horror.cur);assert.deepEqual((await t.state()).chars[h.id].gear,before.chars[h.id].gear);
 assert.equal((await t.gm.cmd({type:'gmDice',sides:6,count:1})).status,200);
 await t.gm.cmd({type:'rest'});assert.equal((await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15})).status,200);
});

// Reviewed power and equipment updates intentionally supersede the range-only snapshot.
// The separate stable-catalogue fingerprint in powers-release protects IDs, odds, slots and spell assignments.
test('reviewed catalogue mechanics and loot probabilities stay fixed',async()=>{
 // Owner-approved themed editions; original books and spells are independently protected by themed-grimoires.test.
 const {createHash}=await import('node:crypto');
 const data=Object.fromEntries(Object.entries(G).map(([k,a])=>[k,a.map(x=>Object.fromEntries(Object.entries(x).filter(([key])=>!['band','thrownBand','rangeNote','does'].includes(key))))]));
 assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),'1d4c7c5b62f1370bfbcba33c7fc8e51c0b9fba55ca8b14133f87a5122dcc55d2');
});
