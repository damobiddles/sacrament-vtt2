import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {table,charNamed,find} from './vtt-helpers.mjs';
import {lootCatalogue} from '../scripts/lib/loot-catalogue.mjs';
const C=globalThis.SacramentSheetCore,G=globalThis.SACRAMENT_GEAR;
const before=JSON.parse(fs.readFileSync(new URL('./fixtures/grimoires-before-themes.json',import.meta.url)));
test('sixteen current books have ten clear themes, three spells/slots and no duplicate selections',()=>{
 const books=C.items.filter(i=>i.kind==='grimoire');assert.equal(books.length,16);
 assert.equal(new Set(books.map(b=>b.theme)).size,10);
 assert.equal(new Set(books.map(b=>[...b.spells].sort().join(','))).size,16);
 for(const b of books){assert.ok(G.grimoireThemes.includes(b.theme));assert.equal(b.slots,3);assert.equal(b.spells.length,3);assert.equal(new Set(b.spells).size,3);assert.equal(C.spellsOf(b).length,3);}
 const used=new Set(books.flatMap(b=>b.spells));assert.equal(used.size,G.spells.length);assert.equal(G.spells.length,43);
});
test('every previously owned book, spell and backup retains its original mechanics',()=>{
 for(const old of before.books){const gear={id:old.id,eq:true},it=C.itemOf(gear);assert.ok(it);assert.equal(it.name,old.name);assert.deepEqual(it.spells,old.spells);assert.equal(it.slots,old.slots);assert.equal(it.pick,old.pick);
 const h=C.cleanHero({...C.blankHero('Compatibility'),gear:[gear]});assert.deepEqual(C.itemOf(h.gear[0]).spells,old.spells);}
 for(const spell of before.spells)assert.deepEqual(G.spells.find(s=>s.id===spell.id),spell);
 const retired=G.retiredGrimoires||[];assert.ok(retired.length>0);for(const old of retired)assert.ok(!C.items.some(i=>i.id===old.id));
});
test('all new spell actions honour damage/manual boundaries, Horror costs, retries and Undo',async()=>{
 for(const book of C.items.filter(i=>i.kind==='grimoire'))for(const id of book.spells){
  if(before.spells.some(s=>s.id===id))continue;
  const t=await table({dice:[]}),h=charNamed(await t.state(),'Thorne'),enemy=find(await t.state(),'Pit Ghoul');
  assert.equal((await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:book.id}})).status,200);
  const p=await t.join('Theme check');await p.cmd({type:'claim',charId:h.id});
  const command={type:'useItem',charId:h.id,index:0,spellId:id,d20:15,targetCardId:enemy.id,actionId:'themedspell.1'};
  if(book.pick)t.queue(((book.spells.indexOf(id)*2+1)-0.5)/6);
  const cast=await p.cmd(command);if(book.pick)assert.equal(cast.body.result.picked.spellId,id);assert.equal(cast.status,200,id);const r=cast.body.state.rolls.at(-1),spell=G.spells.find(s=>s.id===id);
  assert.equal(cast.body.state.horror.cur,1,id);assert.equal((await p.cmd(command)).body.state.horror.cur,1);
  if(spell.effect==='damage'){assert.equal(r.nonDamage,false);const damage=await p.cmd({type:'effort',rollId:r.id,cat:'magic',rolled:4,autoApply:true});assert.equal(damage.status,200);assert.equal(damage.body.state.rolls.at(-1).applied.cardId,enemy.id);const event=(await t.state()).rolls.at(-1).applied.log;assert.equal((await t.gm.cmd({type:'undo',logId:event})).status,200);assert.equal((await t.state()).cards[enemy.id].hp.cur,20);}
  else {assert.ok(!spell.cat);assert.equal(cast.body.state.cards[enemy.id].hp.cur,20);assert.match(C.automationText(spell),/manual/i);}
 }
});
test('themes survive designed copies and are shared with the website catalogue',()=>{
 const html=lootCatalogue(G);for(const book of C.items.filter(i=>i.kind==='grimoire')){assert.ok(html.includes(book.theme));const copy=C.makeCustom(C.designOf(book));assert.equal(copy.theme,book.theme);assert.deepEqual(copy.spells,book.spells);}
});

test('an old table can still cast its original spell while a new edition cannot borrow it',async()=>{
 for(const [id,expected] of [['dust',200],['quietmouths',400]]){
  const t=await table(),h=charNamed(await t.state(),'Thorne'),enemy=find(await t.state(),'Pit Ghoul');
  await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id}});const p=await t.join('Existing book');await p.cmd({type:'claim',charId:h.id});
  const r=await p.cmd({type:'useItem',charId:h.id,index:0,spellId:'unmake',d20:15,targetCardId:enemy.id});assert.equal(r.status,expected,id);
  assert.equal((await t.state()).chars[h.id].gear[0].id,id);assert.equal((await t.state()).horror.cur,expected===200?1:0);
 }
});

test('the themed random book advertises its actual d6 and maps all six faces fairly',async()=>{
 const book=C.item('namelesspact');assert.equal(C.actions({gear:[{id:book.id,eq:true}]}).find(a=>a.pick).pickDie,6);
 for(let face=1;face<=6;face++){
  const t=await table({dice:[]}),h=charNamed(await t.state(),'Thorne');await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id:book.id}});
  t.queue((face-0.5)/6);const r=await t.gm.cmd({type:'useItem',charId:h.id,index:0});assert.equal(r.status,200);assert.equal(r.body.result.picked.spellId,book.spells[Math.floor((face-1)/2)]);assert.equal(r.body.state.horror.cur,1);
 }
});

test('original and themed editions share Rend limits across rest and reconnect',async()=>{
 const t=await table(),h=charNamed(await t.state(),'Thorne'),enemy=find(await t.state(),'Pit Ghoul');
 for(const id of ['lastconfessions','unsealedcanticles'])assert.equal((await t.gm.cmd({type:'sheet',charId:h.id,op:{op:'add',id}})).status,200);
 const first=await t.gm.cmd({type:'useItem',charId:h.id,index:0,spellId:'rend',d20:15,targetCardIds:[enemy.id]});assert.equal(first.status,200);
 await t.gm.cmd({type:'rest'});await t.gm.get();
 const again=await t.gm.cmd({type:'useItem',charId:h.id,index:1,spellId:'rend',d20:15,targetCardIds:[enemy.id]});assert.equal(again.status,400);assert.match(again.body.error.message,/scene|used/i);
});
