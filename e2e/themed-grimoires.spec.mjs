import {test,expect,newPage,makeTable,joinTable,claimHero,saved,state,prepareItem,rollPrepared} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
test('the current catalogue shows ten themes and keeps older book links usable',async({browser},info)=>{
 const p=await newPage(browser);await p.goto('/loot/');
 await expect(p.locator('#loot-grimoire .loot-entry')).toHaveCount(16);await expect(p.locator('main')).toContainText('43 different spells');
 for(const [id,theme] of [['rimebound','Cold'],['rootbound','Nature'],['thornantler','Druidic'],['brokenbell','Energy'],['unsealedcanticles','Demonic']])await expect(p.locator('#item-'+id)).toContainText('Theme: '+theme);
 await p.goto('/loot/#item-charredantiphon');await expect(p.locator('#item-charredantiphon')).toHaveCount(1);await expect(p.locator('#item-rimebound h3')).toHaveText('The Rimebound Litany');
 await p.locator('#item-rimebound').screenshot({path:info.outputPath('cold-grimoire.png')});expect(p.errors).toEqual([]);
});
test('My heroes keeps the original book and offers current themed editions for new choices',async({browser})=>{
 const p=await newPage(browser);await p.addInitScript(()=>localStorage.setItem('sacrament-heroes-v2',JSON.stringify({heroes:[{id:'old-book',name:'Existing hero',stats:{},effort:{},gear:[{id:'litany',eq:true}],hp:{cur:7,max:10}}],current:'old-book'})));
 await p.goto('/character/');await expect(p.locator('.sh-spells')).toContainText('Speak with the Dead');await expect(p.locator('.sh-spells li')).toHaveCount(3);await expect(p.locator('.sh-item')).toContainText('Original spells');
 await expect(p.locator('#shAdd option[value=seventhpenance]')).toHaveCount(1);await expect(p.locator('#shAdd option[value=litany]')).toHaveCount(0);
 const old=await bounded(p.evaluate(()=>window.SacramentHeroes.read().heroes[0]),3000,'read a disposable saved hero');expect(old.gear[0].id).toBe('litany');expect(old.hp).toEqual({cur:7,max:10});expect(p.errors).toEqual([]);
});
test('a designed Nature book retains its theme and separates automatic damage from manual roots',async({browser},info)=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Theme player');await claimHero(p,'Thorne');
 await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();const d=gm.locator('#lootOverlay');
 await d.locator('[data-lf=name]').fill('The Rootbound Copy');await d.locator('[data-lf=category]').selectOption('Grimoire');await d.locator('[data-lf=theme]').selectOption('Nature');
 for(const [n,id]of ['thornlash','rootgrasp','greenpath'].entries())await d.locator('[data-lspell="'+n+'"]').selectOption(id);
 await d.locator('[data-lb=save]').click();await expect(d.locator('#ltLib')).toContainText('Nature');await d.locator('#ltLib [data-lhero]').selectOption({label:'Thorne'});await d.locator('#ltLib [data-lb=give]').click();await expect(d.locator('#ltMsg')).toContainText('Given to Thorne');
 await expect.poll(async()=>Object.values((await state(p)).chars).find(c=>c.name==='Thorne').gear.some(g=>g.def?.theme==='Nature')).toBe(true);
 await p.locator('#panel [data-do=sheet]').click();await expect(p.locator('#sheetOverlay')).toContainText('Nature');await expect(p.locator('#sheetOverlay')).toContainText('movement and escape checks are manual');await p.screenshot({path:info.outputPath('nature-spells.png')});await p.locator('[data-sh=close]').click();
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p,'[data-spell=thornlash]');await p.locator('#strip input[data-phys]').fill('15');await rollPrepared(p);await p.locator('#strip [data-do=effort]').click();await saved(p);expect((await state(p)).rolls.at(-1).applied).toBeTruthy();
 await prepareItem(p,'[data-spell=rootgrasp]');await expect(p.locator('.player-actions')).toContainText('movement and escape checks are manual');await p.locator('#strip input[data-phys]').fill('1');await rollPrepared(p);await saved(p);await expect(p.locator('#strip [data-do=effort]')).toHaveCount(0);expect((await state(p)).horror.cur).toBe(3);expect(p.errors.concat(gm.errors)).toEqual([]);
});

test('a restored physical die value is used for attacks and ordinary checks',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Restored die');await claimHero(p,'Thorne');
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);
 // Browser autofill/restoration can update a field and emit change without input.
 await bounded(p.locator('#strip input[data-phys]').evaluate(el=>{el.value='15';el.dispatchEvent(new Event('change',{bubbles:true}));}),3000,'restore the visible physical die');
 let sent;p.on('request',request=>{if(request.method()==='POST'){const body=request.postDataJSON();if(body?.cmd?.type==='useItem')sent=body.cmd.d20;}});
 await rollPrepared(p);await saved(p);expect(sent).toBe(15);expect((await state(p)).rolls.at(-1).check.d20).toBe(15);
 await p.locator('#panel [data-do=ordinaryCheck]').click();await bounded(p.locator('#strip input[data-phys]').evaluate(el=>{el.value='14';el.dispatchEvent(new Event('change',{bubbles:true}));}),3000,'restore an ordinary physical die');
 await p.locator('#strip [data-stat=STR]').click();await saved(p);expect((await state(p)).rolls.at(-1).check.d20).toBe(14);expect(p.errors.concat(gm.errors)).toEqual([]);
});

test('physical die entries survive preparation and a shared update',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Before preparation');await claimHero(p,'Thorne');
 await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await p.locator('#strip input[data-phys]').fill('15');await prepareItem(p);
 await gm.locator('#tTarget [data-d="1"]').click();await saved(gm);const version=(await state(gm)).v;await expect.poll(async()=>(await state(p)).v).toBeGreaterThanOrEqual(version);
 await expect(p.locator('#strip input[data-phys]')).toHaveValue('15');await rollPrepared(p);await saved(p);expect((await state(p)).rolls.at(-1).check.d20).toBe(15);expect(p.errors.concat(gm.errors)).toEqual([]);
});
test('an unused physical die is cleared when joining another table in the same page',async({browser})=>{
 const gm=await newPage(browser),other=await newPage(browser),p=await newPage(browser),first=await makeTable(gm),second=await makeTable(other);
 await joinTable(p,first,'First table');await claimHero(p,'Thorne');await p.locator('#strip input[data-phys]').fill('19');
 await p.locator('#top [data-do=leave]').click();await p.locator('#top [data-do=leave]').click();await expect(p.locator('#entry')).toBeVisible();
 await p.locator('#joinCode').fill(second);await p.locator('#joinName').fill('Second table');await p.locator('#joinForm button[type=submit]').click();await expect(p.locator('#app')).toBeVisible();await claimHero(p,'Thorne');
 await expect(p.locator('#strip input[data-phys]')).toHaveValue('');expect(p.errors.concat(gm.errors,other.errors)).toEqual([]);
});

test('GM dice entries and the private checkbox survive a shared redraw',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm,{sample:false});
 await bounded(gm.evaluate(()=>{window.pendingGmFields={count:document.querySelector('#gmDiceCount'),private:document.querySelector('#gmDicePrivate')};}),3000,'retain browser-restored GM controls');
 await gm.locator('#gmDie').selectOption('8');const before=(await state(gm)).v;await joinTable(p,code,'GM dice observer');await expect.poll(async()=>(await state(gm)).v).toBeGreaterThan(before);
 await bounded(gm.evaluate(()=>{const fields=window.pendingGmFields;fields.count.value='2';fields.count.dispatchEvent(new Event('input',{bubbles:true}));fields.count.dispatchEvent(new Event('change',{bubbles:true}));fields.private.checked=true;fields.private.dispatchEvent(new Event('change',{bubbles:true}));}),3000,'restore pending GM entries');
 await expect(gm.locator('#gmDiceCount')).toHaveValue('2');await expect(gm.locator('#gmDicePrivate')).toBeChecked();await gm.getByRole('button',{name:'Roll GM dice',exact:true}).click();await saved(gm);
 await expect(gm.locator('#feed')).toContainText('GM rolls 2d8');expect((await state(p)).log.some(e=>e.text.startsWith('GM rolls 2d8'))).toBe(false);expect(p.errors.concat(gm.errors)).toEqual([]);
});
