import test from 'node:test';
import assert from 'node:assert/strict';
import { table, charNamed, find } from './vtt-helpers.mjs';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
const G=globalThis.SACRAMENT_GEAR,C=globalThis.SacramentSheetCore;

test('playtest: healing spells remain usable without Horror and other spells cost exactly one',()=>{
 for(const s of G.spells){assert.equal(s.horror,s.effect==='healing'?0:1,s.id);assert.equal(s.temptsHorror,s.effect!=='healing',s.id);}
 const h=C.blankHero('Healer');h.gear=[{id:'litany',eq:true}];
 assert.equal(C.useOf(h,0,'mend').ok,true);assert.ok(C.actions(h).some(a=>a.spellId==='mend'&&a.ok));
 assert.match(G.spells.find(s=>s.id==='mend').does,/yourself/i);
 for(const it of [...C.items,...G.spells].filter(i=>i.temptsHorror))assert.ok(C.horrorText(it).length>20,it.id);
});

test('playtest: healing checks never offer damage or Push and casting adds no Horror',async()=>{
 const t=await table(),p=await t.join('Healer'),ch=charNamed(await t.state(),'Thorne');await p.cmd({type:'claim',charId:ch.id});
 await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',id:'litany'}});
 await t.gm.cmd({type:'adjust',cardId:ch.cardId,field:'hp',delta:-9});
 for(const n of [2,15]){const r=await p.cmd({type:'useItem',charId:ch.id,index:0,spellId:'mend',d20:n,targetCardId:ch.cardId});assert.equal(r.status,200);const roll=r.body.state.rolls.at(-1);assert.equal(r.body.state.horror.cur,0);assert.ok(!roll.cat);assert.ok(!roll.canPush);assert.equal((await p.cmd({type:'push',rollId:roll.id})).status,400);}
});

test('playtest: only failed attacks can Push, including unarmed attacks with an explicit target',async()=>{
 const t=await table(),p=await t.join('Player'),st=await t.state(),ch=charNamed(st,'Thorne'),target=find(st,'Pit Ghoul').id;await p.cmd({type:'claim',charId:ch.id});
 const check=await p.cmd({type:'roll',charId:ch.id,stat:'STR',d20:2});assert.equal(check.body.state.rolls.at(-1).canPush,false);assert.equal((await p.cmd({type:'push',rollId:check.body.result.rollId})).status,400);
 const attack=await p.cmd({type:'roll',charId:ch.id,stat:'STR',d20:2,attack:true,targetCardId:target});assert.equal(attack.status,200);assert.equal(attack.body.state.rolls.at(-1).canPush,true);assert.equal((await p.cmd({type:'push',rollId:attack.body.result.rollId})).status,200);
});

test('playtest: GM dice work without a hero, keep private rolls private, and cannot change HP or Horror',async()=>{
 const t=await table(),p=await t.join('Player'),before=await t.state();
 for(const sides of [4,6,8,10,12,20,100]){const r=await t.gm.cmd({type:'gmDice',sides,count:2,private:true});assert.equal(r.status,200);assert.equal(r.body.result.dice.length,2);assert.ok(r.body.result.dice.every(d=>d.n>=1&&d.n<=sides));assert.equal((await p.get()).body.state.log.some(e=>e.id===r.body.result.logId),false);}
 assert.equal((await p.cmd({type:'gmDice',sides:6})).status,403);
 for(const extra of [{sides:7},{sides:6,count:0},{sides:6,count:21}])assert.equal((await t.gm.cmd({type:'gmDice',...extra})).status,400);
 const shared=await t.gm.cmd({type:'gmDice',sides:6,count:1});assert.equal((await p.get()).body.state.log.at(-1).id,shared.body.result.logId);
 const after=await t.state();assert.deepEqual(after.cards,before.cards);assert.deepEqual(after.horror,before.horror);assert.deepEqual(after.chars,before.chars);
});

test('playtest: custom relics keep rolled Horror costs and a public reason without GM notes',async()=>{
 const t=await table({dice:[(20-.5)/20,(3-.5)/4]}),p=await t.join('Player'),ch=charNamed(await t.state(),'Thorne');await p.cmd({type:'claim',charId:ch.id});
 const item={name:'Verification relic',category:'Relic',cat:'magic',roll:'INT',temptsHorror:true,horror:'d4+2',horrorReason:'Its forbidden flame tempts the Horror.',notes:'PRIVATE RULE NOTE'};
 assert.equal((await t.gm.cmd({type:'lootGive',charId:ch.id,item})).status,200);
 const r=await p.cmd({type:'useItem',charId:ch.id,index:0});assert.equal(r.status,200);assert.equal(r.body.state.horror.cur,5);assert.match(r.body.state.log.at(-1).text,/d4\+2: 3 \+ 2/);
 const held=r.body.state.chars[ch.id].gear[0];assert.match(C.horrorText(C.itemOf(held)),/d4\+2.*forbidden flame/);assert.ok(!JSON.stringify(r.body).includes(item.notes));
});
