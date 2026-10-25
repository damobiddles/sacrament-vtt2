import { test, expect, newPage, makeTable, joinTable, claimHero, state, saved } from './helpers.mjs';
test.setTimeout(60000);

test('only the GM advances turns and obstacles can attack heroes', async ({ browser }, info) => {
 const gm=await newPage(browser),code=await makeTable(gm),p=await newPage(browser);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');
 await expect(p.locator('[data-do=endTurn]')).toHaveCount(0);
 await expect(gm.locator('#top [data-do=endTurn]')).toHaveCount(0);await expect(gm.locator('#panel [data-do=endTurn]')).toBeVisible();
 await gm.locator('#cards .c',{hasText:'The Sealed Gate'}).click();await gm.locator('[data-do=attackToggle]').click();await gm.locator('#physA').fill('20');await gm.locator('[data-do=monsterAttack]').click();
 await expect(gm.locator('#panel')).toContainText('A hit.');await gm.locator('[data-do=monsterEffort]').click();await saved(gm);
 await expect.poll(async()=>(await state(p)).cards[Object.values((await state(p)).chars).find(h=>h.name==='Thorne').cardId].hp.cur).toBeLessThan(10);
 await gm.locator('[data-do=gmtab][data-t=play]').click();await gm.locator('#panel [data-do=endTurn]').click();await saved(gm);await expect.poll(async()=>(await state(p)).table.idx).toBe(1);
 await gm.screenshot({path:info.outputPath('gm-view.png')});await p.screenshot({path:info.outputPath('player-view.png')});
 expect(gm.errors).toEqual([]);expect(p.errors).toEqual([]);
});

test('scene deletion requires confirmation, can be cancelled and preserves the party',async({browser},info)=>{
 const gm=await newPage(browser);await makeTable(gm);const before=await state(gm),live=before.table.scene.id;
 await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('#newScene').fill('Disposable chamber');await gm.locator('[data-do=newScene]').click();await saved(gm);
 const scene=(await state(gm)).scenes.find(s=>s.name==='Disposable chamber').id;
 await expect(gm.locator('[data-do=deleteScene][data-scene="'+live+'"]')).toHaveCount(0);
 await gm.locator('[data-do=deleteScene][data-scene="'+scene+'"]').click();await expect(gm.locator('.scene-delete')).toContainText('cannot be undone');await gm.locator('[data-do=cancelSceneDelete]').click();await expect(gm.locator('.scene-delete')).toHaveCount(0);
 await gm.locator('[data-do=deleteScene][data-scene="'+scene+'"]').click();await gm.screenshot({path:info.outputPath('scene-delete-confirmation.png')});await gm.locator('[data-do=confirmSceneDelete]').click();await saved(gm);
 expect((await state(gm)).scenes.some(s=>s.id===scene)).toBe(false);expect((await state(gm)).chars).toEqual(before.chars);expect((await state(gm)).table.scene.id).toBe(live);
 expect(gm.errors).toEqual([]);
});
