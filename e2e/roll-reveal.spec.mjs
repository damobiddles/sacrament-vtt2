import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';
import {axeContrast,bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
async function setup(browser){const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');return {gm,p};}
async function physical(p,n){await p.locator('#strip [data-key=more]').click();await p.locator('#strip [data-key=dice]').click();await p.locator('#strip input[data-phys]').fill(String(n));}
async function attack(p,n){await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await physical(p,n);await p.locator('#strip [data-do=sheet]').click();await p.locator('#sheetOverlay .sh-item [data-sh=use]').first().click();}

test('a physical attack reveals the actual critical result to GM and player and its damage shortcut rolls once',async({browser})=>{
 const {gm,p}=await setup(browser);await attack(p,20);
 await expect(p.locator('.reveal-label')).toHaveText('CRITICAL HIT');await expect(p.locator('.reveal-summary')).toHaveText('23 total against Target 12.');await expect(p.locator('.reveal-context')).toContainText('Pit Ghoul');
 await expect(p.locator('#dice .die')).toHaveCount(0);await expect(p.locator('.reveal-damage')).toBeVisible();
 // Keep the brief reveal on screen while inspecting contrast, as keyboard focus does in use.
 await p.locator('.reveal-damage').focus();await expect(gm.locator('.reveal-label')).toHaveText('CRITICAL HIT');await expect(gm.locator('.reveal-damage')).toHaveCount(0);
 await p.screenshot({path:'/workspace/sacrament-audit/reveal-critical.png'});expect(await axeContrast(p)).toEqual([]);
 await p.locator('.reveal-damage').click();await saved(p);await expect(p.locator('.reveal-damage')).toHaveCount(0);await expect(p.locator('#panel [data-do=apply]')).toBeVisible();
 const r=(await state(p)).rolls.at(-1);expect(r.effort.critical).toBeTruthy();expect(r.applied).toBeNull();expect(Object.values((await state(p)).cards).find(c=>c.name==='Pit Ghoul').hp.cur).toBe(20,'damage is not applied until Apply');
 await p.locator('#panel [data-do=apply]').click();await saved(p);expect(Object.values((await state(p)).cards).find(c=>c.name==='Pit Ghoul').hp.cur).toBe(Math.max(0,20-r.effort.total));expect(gm.errors.concat(p.errors)).toEqual([]);
});
test('miss and failed check are distinct; reduced motion keeps a still readable result without dice',async({browser})=>{
 const {gm,p}=await setup(browser);await p.emulateMedia({reducedMotion:'reduce'});await attack(p,2);
 await expect(p.locator('.reveal-label')).toHaveText('MISS');await expect(p.locator('.reveal-summary')).toHaveText('5 total against Target 12.');await expect(p.locator('#dice .die,.reveal-damage')).toHaveCount(0);await p.screenshot({path:'/workspace/sacrament-audit/reveal-miss.png'});
 const h=Object.values((await state(p)).chars).find(c=>c.name==='Thorne');await bounded(p.evaluate(async h=>{
  const s=window.__vtt.state(),k=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(localStorage.getItem(k)).token;
  const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'roll',charId:h,stat:'WIS',d20:2,actionId:'revealcheck'+Math.random().toString(36).slice(2,8)+'.1'}})});if(!r.ok)throw Error('Could not make a disposable check');
 },h.id),15000,'checking a failed ordinary roll');
 await expect(p.locator('.reveal-label')).toHaveText('FAILED CHECK');await expect(p.locator('#dice .result-roll')).toHaveCount(1);await expect(p.locator('#dice .result-roll')).toHaveCount(0,{timeout:5000});expect(gm.errors.concat(p.errors)).toEqual([]);
});
test('a reveal never replays on reconnect and leaving removes it',async({browser})=>{
 const {p}=await setup(browser);await attack(p,15);await expect(p.locator('.reveal-label')).toHaveText('SUCCESS');await p.reload();await expect(p.locator('#app')).toBeVisible();await expect(p.locator('.reveal-result')).toHaveCount(0);
 await attack(p,15);await expect(p.locator('.reveal-label')).toHaveText('SUCCESS');await p.locator('#top [data-do=leave]').click();await p.locator('#top [data-do=leave]').click();await expect(p.locator('#entry')).toBeVisible();await expect(p.locator('.reveal-result')).toHaveCount(0);expect(p.errors).toEqual([]);
});

test('a shared update cannot reset the GM dice count while it is being typed',async({browser})=>{
 const gm=await newPage(browser),other=await newPage(browser),code=await makeTable(gm,{sample:false});await gm.getByRole('button',{name:'GM dice',exact:true}).click();
 await gm.locator('#gmDie').selectOption('8');await gm.locator('#gmDiceCount').fill('2');const before=(await state(gm)).v;
 await joinTable(other,code,'Update during typing');await expect.poll(async()=>(await state(gm)).v).toBeGreaterThan(before);
 await expect(gm.locator('#gmDiceCount')).toHaveValue('2');await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);
 expect((await state(gm)).log.find(e=>e.text.startsWith('GM rolls 2d8'))).toBeTruthy();expect(gm.errors.concat(other.errors)).toEqual([]);
});
