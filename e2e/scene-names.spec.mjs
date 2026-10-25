import {test,expect,newPage,makeTable,joinTable,state,saved} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
const sceneTab=p=>p.locator('[data-do=gmtab][data-t=scene]');

test('GM can rename live and prepared scenes, cancel edits and keep scene contents',async({browser},info)=>{
 const gm=await newPage(browser),code=await makeTable(gm),player=await newPage(browser);await joinTable(player,code,'Player');
 const before=await state(gm),live=before.table.scene.id;await sceneTab(gm).click();
 const rename=()=>gm.locator('[data-do=renameScene][data-scene="'+live+'"]');
 await rename().click();await expect(gm.locator('#sceneName')).toBeFocused();await expect(gm.locator('#sceneName')).toHaveValue(before.table.scene.name);
 await gm.locator('#sceneName').fill('Cancelled name');await gm.locator('#sceneName').press('Escape');await expect(gm.locator('#sceneName')).toHaveCount(0);await expect(rename()).toBeFocused();expect((await state(gm)).table.scene.name).toBe(before.table.scene.name);
 const focusVersion=(await state(gm)).v,joining=await newPage(browser);await joinTable(joining,code,'Focus player');
 await expect.poll(async()=>(await state(gm)).v).toBeGreaterThan(focusVersion);await expect(rename()).toBeFocused();
 await rename().click();await gm.locator('#sceneName').fill('   ');await gm.locator('[data-do=saveSceneName]').click();await expect(gm.locator('#sceneName')).toBeVisible();expect((await state(gm)).table.scene.name).toBe(before.table.scene.name);
 await gm.locator('#sceneName').fill('Renamed live scene');await gm.screenshot({path:info.outputPath('scene-name-editor.png')});await gm.locator('#sceneName').press('Enter');
 await expect.poll(async()=>(await state(player)).table.scene.name).toBe('Renamed live scene');await saved(gm);
 const after=await state(gm);expect(after.table.scene.id).toBe(live);expect(after.cards).toEqual(before.cards);expect(after.layout).toEqual(before.layout);expect(after.table.scene.bg).toBe(before.table.scene.bg);
 await gm.reload();await expect(gm.locator('#app')).toBeVisible();expect((await state(gm)).table.scene.name).toBe('Renamed live scene');await sceneTab(gm).click();
 await gm.locator('#newScene').fill('Preparation');await gm.locator('[data-do=newScene]').click();await expect(gm.locator('.scene-list')).toContainText('Preparation');
 const prep=(await state(gm)).scenes.find(s=>s.name==='Preparation').id;await gm.locator('[data-do=renameScene][data-scene="'+prep+'"]').click();await gm.locator('#sceneName').fill('Private prepared scene');await gm.locator('[data-do=saveSceneName]').click();await saved(gm);
 await expect(gm.locator('.scene-list')).toContainText('Private prepared scene');
 const reply=await bounded(player.evaluate(async()=>{
  const s=window.__vtt.state(),entry=Object.entries(localStorage).find(([k])=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(entry[1]).token;
  const r=await fetch('/.netlify/functions/vtt?code='+s.code,{headers:{authorization:'Bearer '+token}});return r.text();
 }),15000,'checking the player reply for prepared scene names');expect(reply).not.toContain('Private prepared scene');
 await expect(player.locator('[data-do=renameScene]')).toHaveCount(0);
 await gm.locator('[data-do=reveal][data-scene="'+prep+'"]').click();await expect.poll(async()=>(await state(player)).table.scene.name).toBe('Private prepared scene');
 expect(gm.errors).toEqual([]);expect(player.errors).toEqual([]);
});

test('draft names survive other table updates and markup stays plain text',async({browser})=>{
 const gm=await newPage(browser),code=await makeTable(gm),other=await newPage(browser);await joinTable(other,code,'Other player');await sceneTab(gm).click();
 const id=(await state(gm)).table.scene.id;await gm.locator('[data-do=renameScene][data-scene="'+id+'"]').click();await gm.locator('#sceneName').fill('<img src=x onerror=alert(1)>');
 const initial=(await state(gm)).v;
 // Joining another player creates an ordinary table update while the GM types.
 const another=await newPage(browser);await joinTable(another,code,'Another player');await expect.poll(async()=>(await state(gm)).v).toBeGreaterThan(initial);
 await expect(gm.locator('#sceneName')).toHaveValue('<img src=x onerror=alert(1)>');await gm.locator('[data-do=saveSceneName]').click();await saved(gm);
 await expect(gm.locator('.scene-list')).toContainText('<img src=x onerror=alert(1)>');await expect(gm.locator('.scene-list img')).toHaveCount(0);expect(gm.errors).toEqual([]);
});

test('pending renames are protected before leaving and renaming works at the next table',async({browser})=>{
 const gm=await newPage(browser),first=await makeTable(gm);await sceneTab(gm).click();await gm.locator('[data-do=renameScene]').first().click();await gm.locator('#sceneName').fill('Pending name');
 let release,held=false;const gate=new Promise(resolve=>{release=resolve;});
 await gm.route('**/.netlify/functions/vtt',async route=>{
  const body=route.request().method()==='POST'?route.request().postDataJSON():null;
  if(!held&&body?.cmd?.type==='sceneUpdate'&&body.cmd.name){held=true;const response=await route.fetch();await bounded(gate,15000,'holding the first table rename reply');await route.fulfill({response});}else await route.continue();
 });
 try{
  await gm.locator('[data-do=saveSceneName]').click();await expect.poll(()=>held).toBe(true);
  await gm.locator('[data-do=gmtab][data-t=table]').click();await gm.locator('[data-do=leave]').first().click();await expect(gm.locator('#app')).toBeVisible();await expect(gm.locator('#feed')).toContainText('Wait for Saved');
  release();await saved(gm);await expect.poll(async()=>(await state(gm)).table.scene.name).toBe('Pending name');
  await gm.locator('[data-do=leave]').first().click();await expect(gm.locator('#entry')).toBeVisible();
  await gm.locator('#makeForm button[type=submit]').click();await expect(gm.locator('#app')).toBeVisible();expect((await state(gm)).code).not.toBe(first);
  release();await sceneTab(gm).click();await gm.locator('[data-do=renameScene]').first().click();await expect(gm.locator('#sceneName')).toBeVisible();
  await gm.locator('#sceneName').fill('Next table name');await gm.locator('[data-do=saveSceneName]').click();await expect.poll(async()=>(await state(gm)).table.scene.name).toBe('Next table name');expect(gm.errors).toEqual([]);
 }finally{release();}
});
