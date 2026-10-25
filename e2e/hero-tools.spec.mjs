import { test, expect, newPage, makeTable, joinTable, state } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';

test.setTimeout(60000);
const stored=page=>bounded(page.evaluate(()=>localStorage.getItem('sacrament-heroes-v2')),15000,'reading local hero storage');
const upload=(page,text)=>page.locator('#restoreHeroesFile').setInputFiles({name:'heroes.json',mimeType:'application/json',buffer:Buffer.from(text)});

test('generated heroes are previews until kept, can be edited and brought to a table',async({browser},testInfo)=>{
  const page=await newPage(browser);await page.goto('/character/');
  await page.locator('#generatorFocus').selectOption('scholar');await page.locator('#generateHero').click();
  await expect(page.locator('#generatorPreview')).toContainText(/The Ashen Psalter|The Book of Quiet Mouths/);
  const silenceBook=(await page.locator('#generatorPreview').innerText()).includes('The Book of Quiet Mouths');
  await expect(page.locator('#generatorPreview')).toContainText(silenceBook ? 'Weapons +3' : 'Magic +3');await expect(page.locator('#generatorPreview')).toContainText('3 slots');
  expect(await stored(page)).toBe(null);await expect(page.locator('#sheetHere')).toContainText('no heroes saved');
  await page.screenshot({path:testInfo.outputPath('hero-generator.png'),fullPage:true});
  await page.locator('#generatorFocus').selectOption('fighter');
  await expect(page.locator('#focusHelp')).toContainText('straightforward first hero');
  await page.locator('#generateHero').click();
  await page.locator('#proposalName').fill('Agathe Vey');
  await page.locator('#proposalVow').fill('I will bring the missing home.');
  expect(await stored(page)).toBe(null);await page.locator('#keepGenerated').click();
  await expect(page.locator('#heroSel option')).toHaveCount(1);
  await expect(page.locator('#sheetHere [data-text=name]')).toHaveValue('Agathe Vey');
  await expect(page.locator('#sheetHere [data-text=vow]')).toHaveValue('I will bring the missing home.');
  await expect(page.locator('#heroReadiness')).toContainText('complete starting allocation');
  await expect(page.locator('#heroNextTitle')).toBeFocused();await expect(page.locator('#generatorPreview')).toBeEmpty();
  await page.locator('#sheetHere [data-text=name]').fill('Cordula Greave');await page.locator('#sheetHere [data-text=name]').blur();
  await page.reload();await expect(page.locator('#sheetHere [data-text=name]')).toHaveValue('Cordula Greave');
  const gm=await newPage(browser),code=await makeTable(gm,{sample:false});await joinTable(page,code,'Cordula');
  await page.locator('[data-do=bring]').click();
  await expect.poll(async()=>Object.values((await state(gm)).chars).some(h=>h.name==='Cordula Greave')).toBe(true);
  await expect(page.locator('.player-first-turn')).toBeVisible();
  await page.locator('.player-first-turn summary').click();
  await expect(page.locator('.player-first-turn')).toContainText('applies to the named target automatically');
  await page.goto('/character/');
  await page.locator('#sheetHere [data-text=name]').fill('Local copy only');await page.locator('#sheetHere [data-text=name]').blur();
  expect(Object.values((await state(gm)).chars).some(h=>h.name==='Cordula Greave')).toBe(true);
  expect(page.errors).toEqual([]);expect(gm.errors).toEqual([]);
});

test('downloaded backups restore in another browser only after confirmation and survive reload',async({browser},testInfo)=>{
  const source=await newPage(browser);await source.goto('/character/');await source.locator('#generatorFocus').selectOption('scout');await source.locator('#generateHero').click();await source.locator('#keepGenerated').click();
  await source.locator('#sheetHere [data-text=notes]').fill('Keep these private notes.');await source.locator('#sheetHere [data-text=notes]').blur();
  const event=source.waitForEvent('download');await source.locator('#downloadHeroes').click();const file=await (await event).path();
  const page=await newPage(browser);await page.goto('/character/');await page.locator('#newHero').click();
  const before=await stored(page);await page.locator('#restoreHeroesFile').setInputFiles(file);
  await expect(page.locator('#restorePreview')).toContainText('1 to add');expect(await stored(page)).toBe(before);
  await page.screenshot({path:testInfo.outputPath('backup-review.png'),fullPage:true});
  await page.locator('#restoreHeroes').click();await expect(page.locator('#restoreStatus')).toContainText('Restored 1 hero');
  await expect(page.locator('#heroSel option')).toHaveCount(2);await expect(page.locator('#sheetHere [data-text=notes]')).toHaveValue('Keep these private notes.');
  await page.reload();await expect(page.locator('#heroSel option')).toHaveCount(2);
  await page.locator('#restoreHeroesFile').setInputFiles(file);await expect(page.locator('#restorePreview')).toContainText('0 to add · 1 already here');
  await page.locator('#restoreHeroes').click();await expect(page.locator('#heroSel option')).toHaveCount(2);expect(page.errors).toEqual([]);
});

test('restore cancellation, invalid files and changed versions preserve existing heroes; names stay plain text',async({browser})=>{
  const page=await newPage(browser);await page.goto('/character/');await page.locator('#newHero').click();
  const before=await stored(page), data=JSON.parse(before), hero=data.heroes[0];hero.notes='A different version';hero.name='<img src=x onerror=alert(1)>';
  const file=JSON.stringify({format:'sacrament-heroes-backup',version:1,heroes:[hero],current:hero.id});
  await upload(page,file);await expect(page.locator('#restorePreview')).toContainText('separate restored copy');
  await expect(page.locator('#restorePreview img')).toHaveCount(0);expect(await stored(page)).toBe(before);
  await page.locator('#cancelRestore').click();expect(await stored(page)).toBe(before);await expect(page.locator('#restoreHeroes')).toBeHidden();
  await upload(page,'{broken');await expect(page.locator('#restoreStatus')).toContainText('not readable JSON');expect(await stored(page)).toBe(before);
  await upload(page,file);await expect(page.locator('#restoreHeroes')).toBeVisible();await page.locator('#restoreHeroes').click();
  await expect(page.locator('#heroSel option')).toHaveCount(2);await expect(page.locator('#heroSel')).toContainText('restored copy');
  const saved=JSON.parse(await stored(page));expect(saved.heroes[0].notes).toBe('');expect(saved.heroes[1].notes).toBe('A different version');expect(page.errors).toEqual([]);
});
