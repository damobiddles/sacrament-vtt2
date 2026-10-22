import { readFile } from 'node:fs/promises';
import { test, expect, newPage, makeTable, joinTable, claimHero, state } from './helpers.mjs';

test.setTimeout(45000);

test('failed hero saves show a persistent warning, export the latest changes and can be retried', async ({ browser }) => {
  const page=await newPage(browser);
  await page.addInitScript(() => {
    const set=Storage.prototype.setItem; window.blockHeroSave=true;
    Storage.prototype.setItem=function(k,v) { if(k==='sacrament-heroes-v2' && window.blockHeroSave) throw Error('Storage unavailable'); return set.call(this,k,v); };
  });
  await page.goto('/character/'); await page.locator('#newHero').click();
  await page.locator('[data-text=name]').fill('Saved in backup'); await page.locator('[data-text=name]').blur();
  await expect(page.locator('#heroSaveStatus')).toContainText('could not be saved');
  await expect(page.locator('#sheetHere .sh-sub')).toContainText('not saved');
  const event=page.waitForEvent('download'); await page.locator('#downloadHeroes').click();
  const download=await event, data=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(data.heroes[0].name).toBe('Saved in backup');
  await page.evaluate(() => { window.blockHeroSave=false; }); await page.locator('#retryHeroSave').click();
  await expect(page.locator('#heroSaveStatus')).toContainText('are saved');
  await page.reload(); await expect(page.locator('[data-text=name]')).toHaveValue('Saved in backup');
});

test('all 31 existing heroes remain available while every creation route respects the limit', async ({ browser }) => {
  const page=await newPage(browser);
  await page.addInitScript(() => {
    if(localStorage.getItem('sacrament-heroes-v2')) return;
    const heroes=Array.from({length:31},(_,i)=>({id:'hero'+i,name:'Hero '+i,stats:{},effort:{},gear:[]}));
    localStorage.setItem('sacrament-heroes-v2',JSON.stringify({heroes,current:'hero30'}));
  });
  await page.goto('/character/');
  await expect(page.locator('#heroSel option')).toHaveCount(31); await expect(page.locator('[data-text=name]')).toHaveValue('Hero 30');
  await expect(page.locator('#newHero')).toBeDisabled(); await expect(page.locator('#ready button').first()).toBeDisabled();
  expect(await page.evaluate(() => window.HeroesPage.addEngineHero({},'extra'))).toBe(null);
  await page.reload(); await expect(page.locator('#heroSel option')).toHaveCount(31);
});

test('unreadable hero data is not overwritten by edits and is included in the backup', async ({ browser }) => {
  const page=await newPage(browser); await page.addInitScript(() => localStorage.setItem('sacrament-heroes-v2','{broken'));
  await page.goto('/character/'); await expect(page.locator('#heroSaveStatus')).toContainText('could not be read');
  await page.locator('#newHero').click();
  expect(await page.evaluate(() => localStorage.getItem('sacrament-heroes-v2'))).toBe('{broken');
  const event=page.waitForEvent('download'); await page.locator('#downloadHeroes').click();
  const download=await event, data=JSON.parse(await readFile(await download.path(),'utf8'));
  expect(data.unreadableOriginal).toBe('{broken'); expect(data.heroes).toHaveLength(1);
});

test('the GM confirms player removal and their hero remains intact and available', async ({ browser }) => {
  const gm=await newPage(browser), code=await makeTable(gm), ann=await newPage(browser);
  await joinTable(ann,code,'Ann'); await claimHero(ann,'Thorne');
  const hero=Object.values((await state(ann)).chars).find(c=>c.name==='Thorne');
  await gm.locator('[data-do=gmtab][data-t=table]').click(); await gm.getByRole('button',{name:'Remove Ann',exact:true}).click();
  expect((await state(gm)).players).toHaveLength(1);
  await gm.getByRole('button',{name:'Confirm removal of Ann',exact:true}).click();
  await expect.poll(async()=>Object.values((await state(gm)).chars).find(c=>c.id===hero.id).owner).toBe(null);
  expect(Object.values((await state(gm)).chars).find(c=>c.id===hero.id).gear).toEqual(hero.gear);
  await expect(ann.locator('#tStatus')).toContainText('no longer');
});

test('drawing on a prepared scene stays private until that scene is shown', async ({ browser }) => {
  const gm=await newPage(browser),code=await makeTable(gm),ann=await newPage(browser); await joinTable(ann,code,'Ann');
  await gm.locator('[data-do=gmtab][data-t=scene]').click(); await gm.locator('#newScene').fill('Prepared scene'); await gm.locator('[data-do=newScene]').click();
  await expect(gm.locator('#banner')).toContainText('Preparing'); await gm.locator('[data-do=tool][data-tool=draw]').click();
  const box=await gm.locator('#table').boundingBox();
  await gm.mouse.move(box.x+box.width*.3,box.y+box.height*.5); await gm.mouse.down(); await gm.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:6}); await gm.mouse.up();
  await expect.poll(async()=>(await state(gm)).draw.length).toBe(1);
  const id=(await state(gm)).scenes.find(s=>s.name==='Prepared scene').id;
  // A completed player poll after the private draw must still contain no ink.
  await expect.poll(async()=>(await state(ann)).v).toBe((await state(gm)).v);
  expect((await state(ann)).draw).toEqual([]); await expect(ann.locator('#ink polyline')).toHaveCount(0);
  await gm.locator('[data-do=reveal][data-scene="'+id+'"]').click();
  await expect(ann.locator('#ink polyline')).toHaveCount(1);
});

test('ready actions appear above the sheet fields and use the selected equipment', async ({ browser }) => {
  const gm=await newPage(browser),code=await makeTable(gm),ann=await newPage(browser); await joinTable(ann,code,'Ann'); await claimHero(ann,'Thorne');
  await ann.locator('#cards .c',{hasText:'Pit Ghoul'}).click(); await ann.locator('#strip [data-do=sheet]').click();
  const action=ann.locator('#sheetOverlay [data-sh=quickUse]').first(), name=await action.textContent();
  expect((await action.boundingBox()).y).toBeLessThan((await ann.locator('#sheetOverlay [data-text=name]').boundingBox()).y);
  await action.click(); await expect(ann.locator('#sheetOverlay')).toBeHidden(); await expect(ann.locator('#panel .calc')).toBeVisible();
  await expect(ann.locator('#panel')).toContainText(name);
});

test('Fill width uses a narrow desktop viewport without changing shared token positions', async ({ browser },info) => {
  const gm=await newPage(browser,{width:877,height:863}); await makeTable(gm);
  await gm.locator('#cards .c',{hasText:'The Sealed Gate'}).click();
  const before=await gm.locator('#table').boundingBox(), layout=(await state(gm)).layout;
  const position=()=>gm.locator('#cards .c').first().evaluate(el=>{
    const r=el.getBoundingClientRect(),t=document.getElementById('table').getBoundingClientRect();
    return {x:(r.x+r.width/2-t.x)/t.width,y:(r.y+r.height/2-t.y)/t.height};
  });
  const old=await position(); await gm.locator('#mapWidthToggle').click();
  const after=await gm.locator('#table').boundingBox(),wrap=await gm.locator('#mapViewport').boundingBox(),next=await position();
  expect(after.width).toBeGreaterThan(before.width+10); expect(after.width).toBeGreaterThan(wrap.width-22);
  expect(after.width/after.height).toBeCloseTo(1.6,2); expect(next.x).toBeCloseTo(old.x,4); expect(next.y).toBeCloseTo(old.y,4);
  expect((await state(gm)).layout).toEqual(layout);
  await gm.screenshot({path:info.outputPath('map-fill-width.png')});
  await gm.locator('#mapWidthToggle').click(); expect((await gm.locator('#table').boundingBox()).width).toBeCloseTo(before.width,0);
});
