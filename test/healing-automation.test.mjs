import test from 'node:test';import assert from 'node:assert/strict';import {table,charNamed,find} from './vtt-helpers.mjs';
async function setup(){const t=await table({dice:[]}),p=await t.join('Healer'),ch=charNamed(await t.state(),'Thorne');await p.cmd({type:'claim',charId:ch.id});await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',id:'litany'}});await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-9});return {t,p,ch};}
const mend=(p,ch,extra={})=>p.cmd({type:'useItem',charId:ch.id,index:0,spellId:'mend',d20:15,...extra});
test('Mend applies healing, costs no casting Horror, is once per target per rest and survives duplicate commands',async()=>{
 const {t,p,ch}=await setup(),cmd={type:'useItem',charId:ch.id,index:0,spellId:'mend',d20:15,targetCardId:ch.cardId};
 const a=await p.cmd(cmd,{client:'healonce01',n:1});assert.equal(a.status,200);assert.ok(a.body.state.cards[ch.cardId].hp.cur>1);assert.equal(a.body.state.horror.cur,0);
 const dup=await p.cmd(cmd,{client:'healonce01',n:1});assert.equal(dup.body.result.duplicate,true);assert.equal(dup.body.state.cards[ch.cardId].hp.cur,a.body.state.cards[ch.cardId].hp.cur);
 assert.equal((await mend(p,ch)).status,400);await t.gm.cmd({type:'rest'});await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-5});assert.equal((await mend(p,ch)).status,200);
});
test('healing works on another visible target, refuses hidden/dead targets, and never deals damage',async()=>{
 const {t,p,ch}=await setup(),target=find(await t.state(),'Wisp');await t.gm.cmd({type:'adjust',cardId:target.id,field:'hp',delta:-5});
 const r=await mend(p,ch,{targetCardId:target.id});assert.equal(r.status,200);assert.ok(r.body.state.cards[target.id].hp.cur>5);assert.equal(r.body.state.cards[ch.cardId].hp.cur,1);
 assert.equal((await p.cmd({type:'effort',rollId:r.body.result.rollId,cat:'magic'})).status,400);
 const hidden=(await t.gm.cmd({type:'cardCreate',card:{name:'Private patient',hp:{cur:1,max:10},visible:false}})).body.result.id;assert.equal((await mend(p,ch,{targetCardId:hidden})).status,404);
});
test('failed healing check consumes no rest allowance; natural 1 retains its general Horror point',async()=>{
 const {p,ch}=await setup();assert.equal((await mend(p,ch,{d20:1})).body.state.horror.cur,1);const r=await mend(p,ch);assert.equal(r.status,200);assert.ok(r.body.state.cards[ch.cardId].hp.cur>1);
});
test('bandages tend a dying hero and consume one use; Undo restores HP, charge and healing allowance',async()=>{
 const {t,p,ch}=await setup();await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',id:'bandages'}});const victim=find(await t.state(),'Wisp');await t.gm.cmd({type:'adjust',cardId:victim.id,field:'hp',delta:-10});
 const use=await p.cmd({type:'useItem',charId:ch.id,index:1,d20:15,targetCardId:victim.id});assert.equal(use.status,200);assert.equal(use.body.state.cards[victim.id].dying.stable,true);assert.equal(use.body.state.chars[ch.id].gear[1].uses,2);
 const m=await mend(p,ch);assert.equal(m.status,200);const healLog=m.body.result.healing.log;assert.equal((await t.gm.cmd({type:'undo',logId:healLog})).status,200);assert.equal((await t.state()).cards[ch.cardId].hp.cur,1);assert.equal((await mend(p,ch)).status,200);
});

test('downed targets can receive the same healing again, but dead heroes cannot be raised',async()=>{
 const {t,p,ch}=await setup();await mend(p,ch);await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-99});
 // Another caster must provide healing while the first hero is down.
 const other=charNamed(await t.state(),'Wisp');await t.gm.cmd({type:'sheet',charId:other.id,op:{op:'add',id:'litany'}});
 const raised=await t.gm.cmd({type:'useItem',charId:other.id,index:0,spellId:'mend',d20:15,targetCardId:ch.cardId});assert.equal(raised.status,200);assert.ok(raised.body.state.cards[ch.cardId].hp.cur>0);assert.equal(raised.body.state.cards[ch.cardId].dying,null);
 await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-99});for(let n=0;n<4;n++)await t.gm.cmd({type:'dying',cardId:ch.cardId,op:'round',d:-1});
 const dead=await t.gm.cmd({type:'useItem',charId:other.id,index:0,spellId:'mend',d20:15,targetCardId:ch.cardId});assert.equal(dead.status,400);assert.match(dead.body.error.message,/dead/);
});
test('Undo cannot overwrite healing performed after a rest; undoing in order restores the earlier allowance',async()=>{
 const {t,p,ch}=await setup();await mend(p,ch);const rest=await t.gm.cmd({type:'rest'});await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-7});const heal=await mend(p,ch);assert.equal(heal.status,200);
 assert.equal((await t.gm.cmd({type:'undo',logId:rest.body.result.log})).status,409);
 assert.equal((await t.gm.cmd({type:'undo',logId:heal.body.result.healing.log})).status,200);assert.equal((await t.gm.cmd({type:'undo',logId:rest.body.result.log})).status,200);
 assert.equal((await mend(p,ch)).status,400,'the pre-rest healing allowance remains spent');
});

test('a healing relic awarded through the loot designer retains its automated mechanics and listed Horror',async()=>{
 const {t,p,ch}=await setup();const C=globalThis.SacramentSheetCore,item=C.designOf(C.item('hospicerib'));
 const given=await t.gm.cmd({type:'lootGive',charId:ch.id,item});assert.equal(given.status,200);const g=given.body.state.chars[ch.id].gear.at(-1);
 assert.ok(C.healingOf(C.itemOf(g)));const heal=await p.cmd({type:'useItem',charId:ch.id,index:1,targetCardId:ch.cardId});assert.equal(heal.status,200);assert.ok(heal.body.state.cards[ch.cardId].hp.cur>1);assert.equal(heal.body.state.horror.cur,1);
});

test('healing a hidden patient does not reveal a private relic name through the shared Horror feed',async()=>{
 const {t,ch}=await setup(),other=await t.join('Observer'),C=globalThis.SacramentSheetCore;
 const item={...C.designOf(C.item('hospicerib')),name:'PRIVATE HEALING RELIC'};await t.gm.cmd({type:'lootGive',charId:ch.id,item});
 const target=(await t.gm.cmd({type:'cardCreate',card:{name:'PRIVATE PATIENT',visible:false,hp:{cur:1,max:10}}})).body.result.id;
 const result=await t.gm.cmd({type:'useItem',charId:ch.id,index:1,targetCardId:target});assert.equal(result.status,200);const raw=JSON.stringify((await other.get()).body);assert.ok(!raw.includes(item.name));assert.ok(!raw.includes('PRIVATE PATIENT'));
});

test('healing honours the table switch that disables natural-20 Ultimate Effort',async()=>{
 const {t,p,ch}=await setup();await t.gm.cmd({type:'settings',patch:{nat20Ultimate:false}});const healed=await mend(p,ch,{d20:20});assert.equal(healed.status,200);assert.equal(healed.body.result.healing.amount,5,'only the d8, with no additional d12');
});

test('unknown healing difficulty values are normalised before the server checks the roll',async()=>{
 const {p,ch}=await setup();const healed=await mend(p,ch,{adj:'__proto__'});assert.equal(healed.status,200);assert.equal(healed.body.state.rolls.at(-1).check.target,12);assert.ok(healed.body.state.cards[ch.cardId].hp.cur>1);
});
