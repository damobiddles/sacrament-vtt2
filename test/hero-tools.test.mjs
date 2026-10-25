import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function setup() {
  const data = new Map(); let blocked = false;
  const ctx = vm.createContext({ localStorage: { getItem: k => data.get(k) ?? null, setItem: (k,v) => { if (blocked) throw Error('Quota'); data.set(k,v); } } });
  for (const f of ['vtt/rules.js','sheet/gear.js','sheet/sheet-core.js','sheet/heroes.js','sheet/hero-tools.js']) vm.runInContext(readFileSync(new URL('../site/' + f, import.meta.url),'utf8'),ctx);
  return { H:ctx.SacramentHeroes, T:ctx.SacramentHeroTools, C:ctx.SacramentSheetCore, data, block:()=>{blocked=true;} };
}
const plain = v => JSON.parse(JSON.stringify(v));
const backup = (H,heroes,extra={}) => JSON.stringify(H.backup({heroes,current:heroes[0]?.id,converted:{},...extra}));

test('every generated focus uses legal starting gear, points and slots, without saving a hero', () => {
  const {H,T,C,data}=setup();
  for (const focus of ['random','fighter','scout','scholar','healer']) for(let seed=1;seed<=80;seed++) {
    let x=seed; const rng=()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};
    const h=T.generate(focus,rng);
    assert.equal(C.problems(h,{gm:false}).length,0,focus); assert.equal(C.pointsLeft(h),0); assert.equal(C.effortLeft(h),0);
    assert.equal(h.hp.cur,10); assert.equal(h.hp.max,10);
    assert.ok(C.slotsUsed(h,'eq')<=10 && C.slotsUsed(h,'pack')<=10);
    assert.ok(h.gear.every(g=>!C.isFind(C.item(g.id))));
    assert.ok(!h.gear.some(g=>g.eq && C.weaponHands(C.item(g.id))===2) || !h.gear.some(g=>g.eq && C.armourPart(C.item(g.id))==='shield'));
    for(const g of h.gear) if(C.item(g.id).kind==='grimoire') assert.equal(C.item(g.id).slots,3);
    if(focus==='scholar') {const book=h.gear.find(g=>C.item(g.id).kind==='grimoire');const category={embers:'magic',quietmouths:'weapons'}[book.id];assert.ok(category,'scholar receives a current starter book');assert.equal(h.effort[category],3);}
    if(focus==='healer') {assert.equal(h.effort.weapons,3);assert.ok(h.gear.some(g=>g.id==='seventhpenance'));}
  }
  assert.equal(data.get(H.KEY),undefined);
});

test('actual backup round-trips notes, wounds, equipment and conversion links, with no preview writes', () => {
  const {H,T,C,data}=setup(), st=H.read(), h=H.blank('Cordula');
  h.notes='Private notes\nSecond line'; h.background='A pilgrim'; h.hp.cur=4;
  assert.equal(C.edit(h,{op:'add',id:'bandages'},{gm:false},h.hp).ok,true);h.gear[0].uses=0;
  const before=data.get(H.KEY), plan=T.planRestore(st,backup(H,[h],{converted:{oldhero:h.id}}));
  assert.equal(plan.ok,true,plan.message);assert.equal(data.get(H.KEY),before);assert.equal(st.heroes.length,0);
  assert.equal(T.restore(st,plan).ok,true);const read=H.read();assert.deepEqual(plain(read.heroes[0]),plain(h));assert.equal(read.converted.oldhero,h.id);
  const again=T.planRestore(read,backup(H,[h]));assert.equal(again.heroes.length,0);assert.equal(again.skipped,1);
});

test('changed versions are separate copies; repeating the restore skips the copy', () => {
  const {H,T}=setup(), st=H.read(), h=H.blank('Original');st.heroes.push(h);st.current=h.id;H.save(st);
  const changed=plain(h);changed.notes='Earlier version';
  const file=backup(H,[changed],{converted:{earlier:changed.id}}), plan=T.planRestore(st,file);
  assert.equal(plan.ok,true);assert.notEqual(plan.heroes[0].id,h.id);assert.equal(plan.heroes[0].restoredFrom,h.id);
  assert.equal(T.restore(st,plan).ok,true);assert.equal(st.heroes.length,2);assert.equal(st.heroes[0].notes,'');assert.equal(st.heroes[1].notes,'Earlier version');
  assert.equal(st.converted.earlier,st.heroes[1].id);
  const reloaded=H.read(), again=T.planRestore(reloaded,file);assert.equal(again.skipped,1);assert.equal(again.heroes.length,0);
});

test('independent heroes sharing a name and build are both preserved', () => {
  const {H,T}=setup(), st=H.read(), a=H.blank('Same'),b=H.blank('Same');st.heroes.push(a);H.save(st);
  assert.equal(T.restore(st,T.planRestore(st,backup(H,[b]))).ok,true);assert.equal(st.heroes.length,2);
});

test('malformed, unsupported, duplicate and oversized files leave saved heroes untouched', () => {
  const {H,T,data}=setup(),st=H.read(),h=H.blank('Kept');st.heroes.push(h);H.save(st);const before=data.get(H.KEY);
  const bad=plain(h);bad.gear=[{id:'missing-item',eq:true}];
  const custom=plain(h);custom.gear=[{id:'sword',eq:true,def:{name:'Forged'}}];
  const invalid=plain(h);invalid.hp.cur=9999;
  const inherited=plain(h);inherited.gear=[{id:'__proto__',eq:true}];
  const malformedId=plain(h);malformedId.gear=[{id:{toString:'invalid'},eq:true}];
  for(const file of ['{bad','{}',backup(H,[]),backup(H,[bad]),backup(H,[custom]),backup(H,[invalid]),backup(H,[inherited]),backup(H,[malformedId]),backup(H,[h,h]),' '.repeat(T.MAX_BACKUP+1)]) {
    assert.equal(T.planRestore(st,file).ok,false);assert.equal(data.get(H.KEY),before);assert.equal(st.heroes.length,1);
  }
});

test('capacity failure imports nothing, including the heroes that would fit', () => {
  const {H,T,data}=setup(),st=H.read();st.heroes=Array.from({length:29},()=>H.blank());H.save(st);const before=data.get(H.KEY);
  assert.equal(T.planRestore(st,backup(H,[H.blank(),H.blank()])).ok,false);assert.equal(data.get(H.KEY),before);
});

test('unreadable or unsaved current heroes prevent restore', () => {
  const {H,T,data}=setup(),file=backup(H,[H.blank()]);data.set(H.KEY,'{broken');
  assert.equal(T.planRestore(H.read(),file).ok,false);assert.equal(data.get(H.KEY),'{broken');
  data.delete(H.KEY);const st=H.read();st.unsaved=true;assert.equal(T.planRestore(st,file).ok,false);
});

test('storage failure keeps the original saved heroes and current in-memory heroes', () => {
  const {H,T,data,block}=setup(),st=H.read();st.heroes.push(H.blank('Kept'));H.save(st);const before=data.get(H.KEY),original=JSON.stringify(st);
  const plan=T.planRestore(st,backup(H,[H.blank('Incoming')]));block();assert.equal(T.restore(st,plan).ok,false);
  assert.equal(data.get(H.KEY),before);assert.equal(JSON.stringify(st),original);
});

test('another tab changing storage before or after preview cannot be overwritten by restore', () => {
  for(const beforePreview of [true,false]) {
    const {H,T,data}=setup(),st=H.read();st.heroes.push(H.blank());H.save(st);const file=backup(H,[H.blank()]);
    const plan=beforePreview?null:T.planRestore(st,file),other=JSON.stringify({heroes:[H.blank('Other tab')],current:'',converted:{}});data.set(H.KEY,other);
    assert.equal(beforePreview?T.planRestore(st,file).ok:T.restore(st,plan).ok,false);assert.equal(data.get(H.KEY),other);
  }
});

test('a preview becomes invalid when heroes are edited locally', () => {
  const {H,T}=setup(),st=H.read();st.heroes.push(H.blank());H.save(st);const plan=T.planRestore(st,backup(H,[H.blank()]));
  st.heroes[0].notes='New edit';assert.equal(T.restore(st,plan).ok,false);assert.equal(st.heroes.length,1);
});

test('conversion keys cannot pollute prototypes or replace existing conversion links', () => {
  const {H,T}=setup(),st=H.read(),h=H.blank();st.converted.old='kept';H.save(st);
  const converted=JSON.parse('{"__proto__":"'+h.id+'","constructor":"'+h.id+'","old":"'+h.id+'","new":"'+h.id+'"}');
  assert.equal(T.restore(st,T.planRestore(st,backup(H,[h],{converted}))).ok,true);
  assert.equal(st.converted.old,'kept');assert.equal(st.converted.new,h.id);assert.equal(Object.hasOwn(st.converted,'__proto__'),false);assert.equal(Object.hasOwn(st.converted,'constructor'),false);
});
