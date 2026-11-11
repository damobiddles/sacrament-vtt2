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
test('a fallen hero acts only by crawling away (free) or by paying 1 Horror; the dead cannot act; recovery restores free actions',async()=>{
 const t=await table({gear:true}),p=await t.join('Ann');let st=await t.state();const h=charNamed(st,'Thorne'),foe=find(st,'Pit Ghoul');await p.cmd({type:'claim',charId:h.id});
 const successful=await p.cmd({type:'roll',charId:h.id,stat:'STR',d20:15,attack:true,targetCardId:foe.id});
 await t.gm.cmd({type:'adjust',cardId:h.cardId,field:'hp',delta:-10});
 const horror=async()=>(await t.state()).horror.cur;
 assert.equal((await p.cmd({type:'roll',charId:h.id,stat:'CON',d20:15})).status,200);assert.equal(await horror(),0,'crawling away is free');
 assert.equal((await p.cmd({type:'effort',rollId:successful.body.result.rollId,cat:'weapons'})).status,200);assert.equal(await horror(),0,'the damage of a blow already struck is free');
 let n=0;for(const cmd of [{type:'roll',charId:h.id,stat:'STR',d20:15},{type:'useItem',charId:h.id,index:0,targetCardId:foe.id},{type:'freeEffort',charId:h.id,cat:'weapons'}]){
  const r=await p.cmd(cmd);assert.equal(r.status,200,cmd.type);n++;assert.ok(await horror()>=n,cmd.type+' costs 1 Horror');
 }
 const card=find(await t.state(),'Thorne');for(let i=0;i<4;i++)await t.gm.cmd({type:'dying',cardId:card.id,op:'round',d:-1});
 const before=await t.state();assert.equal(before.cards[card.id].dying.dead,true);
 for(const cmd of [{type:'roll',charId:h.id,stat:'CON',d20:15},{type:'useItem',charId:h.id,index:0,targetCardId:foe.id},{type:'freeEffort',charId:h.id,cat:'weapons'}]){
  const r=await p.cmd(cmd);assert.equal(r.status,400,cmd.type);assert.match(r.body.error.message,/dead/i);
 }
 assert.equal((await t.state()).horror.cur,before.horror.cur);
});

// Reviewed power and equipment updates intentionally supersede the range-only snapshot.
// The separate stable-catalogue fingerprint in powers-release protects IDs, odds, slots and spell assignments.
test('reviewed catalogue mechanics and loot probabilities stay fixed',async()=>{
 // Owner decision 2026-11-11 (the Horror at the heart, choice 3): three rare guns on a re-divided Arms table; crossbows lose +2 to hit.
 // Owner decision 2026-11-11 (the Horror at the heart, choices 2 and 5): each path names one score for the solo game's once-a-scene Easy; the tags' fight words
 // name one of two results, Hinder (next attack rolls 3 less) or Stop (loses its next attack), with the same effects.
 // Owner-approved themed editions; original books and spells are independently protected by themed-grimoires.test.
 // Owner request 2026-11-08: twenty path relics (each with its hero path) and the Relics table re-divided to make room for them. Owner decision the same day:
 // heroes may choose a path (the list is under "paths"); every path relic costs 1 more Horror, and 1 less for a hero of its path.
 // Owner-approved 2026-11-07: the Light tag's words follow the Hooded Lantern (a WIS check to search or notice in the dark is Hard).
 // Owner decision 2026-11-08 (decision card): every relic belongs to a path; the 28 older relics cost 1 more Horror, 1 less on their own path.
 // Owner request 2026-11-08 (later): ten more paths (twenty in all) and 100 path relics, five per path, on the Path relics table.
 // Owner-approved 2026-11-06: story spells and items carry tags (what each is good for, with a default effect), plus the tag list.
 // Owner decision 2026-11-08 (decision card): eleven plain look-alike finds work like their twins (candle stubs, hemp rope, flint and steel, spikes and mallet,
 // hard bread, chalk sticks, Gravedigger's spade as a weapon, iron-shod staff, silvered dagger, sallet, jerkin).
 // Audit 2026-11-08: flavour lines added to the six older relics that had none (words only; every mechanic is unchanged).
 // Owner-approved 2026-11-01: four distinct editions and six new Energy, Druidic and Necromancy books; grimoire loot odds re-divided over 22 books.
 // Owner report 2026-11-10, finished 2026-11-11: spells and items that work only on something that must be there say so (needs: animal, person, body, writing, wild, obstacle, ally), like needs: corpse. Words for the GM only; no numbers changed.
 const {createHash}=await import('node:crypto');
 const data=Object.fromEntries(Object.entries(G).map(([k,a])=>[k,a.map(x=>Object.fromEntries(Object.entries(x).filter(([key])=>!['band','thrownBand','rangeNote','does'].includes(key))))]));
 assert.equal(createHash('sha256').update(JSON.stringify(data)).digest('hex'),'91aa48b77532415ac3f2071e6333ee8ac6595028ebb86442cce17412f19c3bd7');
});
