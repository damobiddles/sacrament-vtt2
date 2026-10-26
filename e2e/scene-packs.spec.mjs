import fs from 'node:fs/promises';
import {test,expect,newPage,makeTable,joinTable,state} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';

test.setTimeout(60000);
async function sceneTab(page){await page.locator('[data-do=gmtab][data-t=scene]').click();}
async function downloadScene(page){
 await sceneTab(page);await page.locator('[data-do=exportScene]').click();await expect(page.locator('#sceneTransferStatus')).toContainText('Ready to export');
 await expect(page.locator('#sceneShareNotes')).toHaveValue('');await page.locator('#sceneShareNotes').fill('Reusable tactics: the ghoul guards the gate.');
 const pending=page.waitForEvent('download');await page.locator('#sceneTransferGo').click();const download=await pending;expect(download.suggestedFilename()).toMatch(/\.sacrament-scene$/);
 const bytes=await fs.readFile(await download.path());await expect(page.locator('#sceneTransferStatus')).toContainText('downloaded');await page.locator('#sceneTransferClose').click();return bytes;
}
async function chooseScene(page,buffer){
 await sceneTab(page);await page.locator('[data-do=importScene]').click();await page.locator('#sceneImportFile').setInputFiles({name:'encounter.sacrament-scene',mimeType:'application/json',buffer});await expect(page.locator('#sceneTransferStatus')).toContainText('File checked');await expect(page.locator('#sceneTransferGo')).toBeEnabled();
}

for(const width of [1366,360])test(`GM exports and imports one portable private encounter at ${width}px`,async({browser},info)=>{
 const gm=await newPage(browser,{width,height:width===360?640:800});await makeTable(gm);const original=await state(gm),bytes=await downloadScene(gm);
 const file=JSON.parse(bytes.toString());expect(file.manifest.cards).toHaveLength(3);expect(file.assets).toHaveLength(1);expect(bytes.toString()).not.toContain('SECRET:');expect(bytes.toString()).not.toContain(original.code);expect(bytes.toString()).not.toContain('Thorne');
 const dest=await newPage(browser,{width,height:width===360?640:800}),code=await makeTable(dest),player=await newPage(browser);await joinTable(player,code,'Observer');await expect.poll(()=>state(dest).then(s=>s.players.map(p=>p.name))).toContain('Observer');const before=await state(dest);
 await chooseScene(dest,bytes);await dest.screenshot({path:info.outputPath('import-preview.png')});await dest.locator('#sceneTransferGo').click();await expect(dest.locator('#sceneTransferStatus')).toContainText('Scene added privately');await dest.locator('#sceneTransferClose').click();
 const after=await state(dest);expect(after.scenes).toHaveLength(before.scenes.length+1);for(const key of ['table','chars','horror','settings','players'])expect(after[key],key).toEqual(before[key]);
 const imported=after.scenes.find(s=>!before.scenes.some(old=>old.id===s.id));expect(imported.name).toBe('The Sealed Gate (2)');const cards=Object.values(after.cards).filter(c=>c.sceneId===imported.id);expect(cards).toHaveLength(4);expect(cards.find(c=>c.timer).timer.paused).toBe(true);expect(JSON.stringify(await state(player))).not.toContain('Reusable tactics');
 await dest.locator(`[data-do=openScene][data-scene=${imported.id}]`).click();expect((await state(dest)).table.scene.id).toBe(before.table.scene.id);await dest.screenshot({path:info.outputPath('private-scene.png')});
 await chooseScene(dest,bytes);await expect(dest.locator('#sceneImportDuplicate')).toBeVisible();await dest.locator('#sceneTransferGo').click();await expect(dest.locator('#sceneTransferStatus')).toContainText('Tick');expect((await state(dest)).scenes).toHaveLength(after.scenes.length);await dest.locator('#sceneTransferClose').click();
 expect(gm.errors.concat(dest.errors,player.errors)).toEqual([]);
});

test('a lost image-upload reply can be retried without partial scenes or duplicate images',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);const bytes=await downloadScene(gm),before=await state(gm);await chooseScene(gm,bytes);
 let dropped=false;await gm.route('**/.netlify/functions/vtt',async route=>{const body=route.request().postDataJSON();if(body?.op==='sceneStage'&&!dropped){dropped=true;await route.fetch();await route.abort();}else await route.continue();});
 await gm.locator('#sceneTransferGo').click();await expect(gm.locator('#sceneTransferStatus')).toContainText('retry safely');expect((await state(gm)).scenes).toHaveLength(before.scenes.length);await gm.locator('#sceneTransferGo').click();await expect(gm.locator('#sceneTransferStatus')).toContainText('Scene added privately');expect((await state(gm)).scenes).toHaveLength(before.scenes.length+1);expect(dropped).toBe(true);
});

test('invalid files are refused and the dialog supports keyboard focus and Escape',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);await sceneTab(gm);await gm.locator('[data-do=importScene]').click();await gm.locator('#sceneImportFile').setInputFiles({name:'bad.sacrament-scene',mimeType:'application/json',buffer:Buffer.from('{"manifest":{"format":"sacrament-scene","version":99},"assets":[]}')});
 await expect(gm.locator('#sceneTransferStatus')).toContainText('Cannot import');await expect(gm.locator('#sceneTransferGo')).toBeDisabled();
 await gm.locator('#sceneTransferClose').focus();await gm.keyboard.press('Tab');expect(await bounded(gm.evaluate(()=>document.querySelector('#sceneTransferOverlay').contains(document.activeElement)),5000,'checking dialog focus')).toBe(true);await gm.keyboard.press('Escape');await expect(gm.locator('#sceneTransferOverlay')).toBeHidden();await expect(gm.locator('[data-do=importScene]')).toBeFocused();expect(gm.errors).toEqual([]);
});

test('the Free Scenes website download imports on a phone and both sharing dialogs are readable',async({browser},info)=>{
 const {setTheme,checkScreen}=await import('./contrast-lib.mjs');
 const page=await newPage(browser,{width:360,height:640});await page.goto('/resources/');await page.getByRole('link',{name:'Find a scene',exact:true}).click();await expect(page).toHaveURL(/\/scenes\/$/);await expect(page.locator('h1')).toHaveText('Free Scenes');
 expect(await bounded(page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),5000,'checking scene library phone width')).toBeLessThanOrEqual(1);
 await setTheme(page,'dark');let readable=await bounded(checkScreen(page,'dark',{perLook:1}),90000,'checking the free scene library');expect(readable.axe).toEqual([]);expect(readable.buttons).toEqual([]);
 const pending=page.waitForEvent('download');await page.getByRole('link',{name:'Download The Sealed Gate scene pack',exact:true}).click();const downloaded=await pending,buffer=await fs.readFile(await downloaded.path());
 await makeTable(page);await chooseScene(page,buffer);readable=await bounded(checkScreen(page,'dark',{perLook:1}),90000,'checking the scene import dialog');expect(readable.axe).toEqual([]);expect(readable.buttons).toEqual([]);await page.screenshot({path:info.outputPath('website-pack-preview.png')});await page.locator('#sceneTransferGo').click();await expect(page.locator('#sceneTransferStatus')).toContainText('Scene added privately');await page.locator('#sceneTransferClose').click();
 await page.locator('[data-do=exportScene]').click();await expect(page.locator('#sceneTransferStatus')).toContainText('Ready to export');readable=await bounded(checkScreen(page,'dark',{perLook:1}),90000,'checking the scene export dialog');expect(readable.axe).toEqual([]);expect(readable.buttons).toEqual([]);expect(page.errors).toEqual([]);
});
