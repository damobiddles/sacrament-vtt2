import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
import {table,charNamed} from './vtt-helpers.mjs';
import {memoryStore} from '../netlify/functions/_shared/vtt-service.mjs';
const C=globalThis.SacramentSheetCore,R=globalThis.SacramentRules;

test('every ordinary catalogue weapon, including slings and weapon tools, uses Weapons d6',()=>{
  for(const it of C.items.filter(i=>i.kind==='weapon'&&!i.temptsHorror)) {
    assert.equal(it.cat,'weapons',it.id);assert.equal(it.effort,6,it.id);
  }
  assert.equal(R.DEFAULT_DICE.weapons,6);assert.equal(R.DEFAULT_DICE.guns,8);
});

test('custom bows cannot use Guns; explicit firearms retain d8 and two-handed requirements',()=>{
  const bow=C.makeCustom({category:'Weapon',weaponStyle:'ranged',cat:'guns',roll:'DEX'});
  assert.equal(bow.cat,'weapons');assert.equal(C.weaponHands(bow),2);
  const gun=C.makeCustom({category:'Weapon',weaponStyle:'firearm',cat:'weapons',roll:'DEX'});
  assert.equal(gun.cat,'guns');assert.equal(C.weaponHands(gun),2);assert.equal(C.damageBonus(gun),0);
  assert.equal(C.makeCustom({category:'Weapon',weaponStyle:'single',cat:'guns',roll:'DEX'}).cat,'guns','one-handed gun');
});

test('server uses Weapons bonus and d6 for a bow even when a client requests Guns',async()=>{
  const t=await table(),ch=charNamed(await t.state(),'Thorne');
  await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',id:'bow'}});
  const hit=await t.gm.cmd({type:'useItem',charId:ch.id,index:0,d20:15});assert.equal(hit.status,200);
  const rollId=hit.body.result.rollId;
  assert.equal((await t.gm.cmd({type:'effort',rollId,cat:'guns',rolled:7})).status,400,'a physical 7 is invalid for a d6');
  const result=await t.gm.cmd({type:'effort',rollId,cat:'guns',rolled:6});assert.equal(result.status,200);
  const roll=result.body.state.rolls.find(r=>r.id===rollId);assert.equal(roll.effort.die,6);assert.equal(roll.effort.cat,'weapons');assert.equal(roll.effort.total,6+ch.effort.weapons);
});

test('server keeps custom firearm d8 and Guns bonus',async()=>{
  const t=await table(),ch=charNamed(await t.state(),'Thorne');
  await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'effort',cat:'weapons',value:0}});
  await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'effort',cat:'guns',value:3}});
  await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',def:{category:'Weapon',name:'Gunpowder test',weaponStyle:'firearm',cat:'guns',roll:'DEX'}}});
  const hit=await t.gm.cmd({type:'useItem',charId:ch.id,index:0,d20:15});assert.equal(hit.status,200);
  const result=await t.gm.cmd({type:'effort',rollId:hit.body.result.rollId,rolled:8});assert.equal(result.status,200);
  const roll=result.body.state.rolls.find(r=>r.id===hit.body.result.rollId);assert.equal(roll.effort.die,8);assert.equal(roll.effort.total,11);
});

test('old pending bow attacks show and roll d6; completed history is left intact',async()=>{
  const store=memoryStore(),t=await table({store}),ch=charNamed(await t.state(),'Thorne');
  await t.gm.cmd({type:'sheet',charId:ch.id,op:{op:'add',id:'crossbow'}});
  const hit=await t.gm.cmd({type:'useItem',charId:ch.id,index:0,d20:15}),id=hit.body.result.rollId;
  const room=await store.get(t.code);delete room.data.rolls[id].weaponEffort;room.data.rolls[id].cat='guns';
  await store.put(t.code,room.data,room.etag);
  assert.equal((await t.state()).rolls.find(r=>r.id===id).cat,'weapons');
  const result=await t.gm.cmd({type:'effort',rollId:id,rolled:6});assert.equal(result.status,200);
  const saved=await store.get(t.code);saved.data.rolls[id].cat='guns';saved.data.rolls[id].effort={cat:'guns',die:8,rolled:8,bonus:0,total:8};delete saved.data.rolls[id].weaponEffort;await store.put(t.code,saved.data,saved.etag);
  assert.equal((await t.state()).rolls.find(r=>r.id===id).effort.die,8);
});

test('saved archers retain all points, wounds, gear and notes and get a reallocation reminder',()=>{
  const data=new Map(),ctx=vm.createContext({localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)}});
  for(const f of ['vtt/rules.js','sheet/gear.js','sheet/sheet-core.js','sheet/heroes.js','sheet/hero-tools.js'])vm.runInContext(readFileSync(new URL('../site/'+f,import.meta.url),'utf8'),ctx);
  const H=ctx.SacramentHeroes,h=H.blank('Saved archer');h.effort.guns=3;h.effort.basic=1;h.hp.cur=4;h.notes='Private notes';h.gear=[{id:'bow',eq:true}];
  const st={heroes:[h],current:h.id,converted:{}};H.save(st);const before=data.get(H.KEY),read=H.read();
  assert.equal(data.get(H.KEY),before);assert.equal(JSON.stringify(read.heroes[0]),JSON.stringify(h));
  assert.match(ctx.SacramentSheetCore.weaponEffortNote(read.heroes[0]),/Guns.*Weapons/);
  const generated=ctx.SacramentHeroTools.generate('scout');assert.equal(generated.effort.weapons,3);assert.equal(generated.effort.guns,0);
});
