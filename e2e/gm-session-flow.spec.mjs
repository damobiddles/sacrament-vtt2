import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';
test.setTimeout(60000);

test('the GM can return to saved tables without losing authority',async({browser})=>{
 const gm=await newPage(browser),code=await makeTable(gm);
 await gm.locator('[data-do=gmtab][data-t=table]').click();await gm.getByRole('button',{name:'Back to my tables',exact:true}).click();
 await expect(gm.locator('#entry')).toBeVisible();await expect(gm.locator('#myTables')).toContainText(code);
 await gm.reload();await gm.locator('#myTables a[href="/vtt/?room='+code+'"]').click();
 await expect(gm.locator('#app')).toBeVisible();expect((await state(gm)).you.role).toBe('gm');
});

test('GM tabs stay available, work from the keyboard and separate combat from editing',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);
 await gm.locator('#cards .c',{hasText:'Pit Ghoul'}).click();
 await expect(gm.getByRole('tab')).toHaveCount(4);await expect(gm.locator('[data-do=attackToggle]')).toBeVisible();await expect(gm.locator('input[data-max]')).toHaveCount(0);
 await gm.getByRole('tab',{name:'Play',exact:true}).focus();await gm.keyboard.press('ArrowRight');await expect(gm.getByRole('tab',{name:'Scene',exact:true})).toBeFocused();await expect(gm.getByRole('tab',{name:'Scene',exact:true})).toHaveAttribute('aria-selected','true');
 await gm.keyboard.press('End');await expect(gm.getByRole('tab',{name:'Table',exact:true})).toBeFocused();await gm.keyboard.press('Home');await expect(gm.getByRole('tab',{name:'Play',exact:true})).toBeFocused();
 await expect(gm.locator('#panel [data-setting=sceneDanger],#panel #nextAt')).toHaveCount(0);
 await gm.locator('.turn-order [data-do=inspectTurn]').filter({hasText:'Wisp'}).click();expect((await state(gm)).table.idx).toBe(0);await expect(gm.locator('.cardname')).toHaveText('Wisp');
});

test('damage Undo remains attached to its result after someone else acts',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');
 await gm.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await gm.locator('[data-do=attackToggle]').click();
 const s=await state(gm),h=Object.values(s.chars).find(c=>c.name==='Thorne');await gm.locator('#atkHero').selectOption(h.cardId);await gm.locator('#physA').fill('15');await gm.locator('[data-do=monsterAttack]').click();await expect(gm.locator('[data-do=monsterEffort]')).toBeVisible();await gm.locator('#physE').fill('4');await gm.locator('[data-do=monsterEffort]').click();await saved(gm);
 await expect(gm.locator('#panel [data-do=undoDamage]')).toBeVisible();const id=await gm.locator('#panel [data-do=undoDamage]').getAttribute('data-id');
 await p.locator('#strip [data-do=hpAdj][data-d="-1"]').click();await saved(p);await expect.poll(async()=>(await state(gm)).cards[h.cardId].hp.cur).toBe(5);
 await gm.locator('#panel [data-do=undoDamage][data-id="'+id+'"]').click();await saved(gm);await expect.poll(async()=>(await state(p)).cards[h.cardId].hp.cur).toBe(9);
 expect(gm.errors.concat(p.errors)).toEqual([]);
});


test('private preparation hides attacks and live refresh, including an unfinished live attack',async({browser})=>{
 const gm=await newPage(browser);await makeTable(gm);const live=(await state(gm)).table.scene.id;
 await gm.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await gm.locator('[data-do=attackToggle]').click();await gm.locator('#physA').fill('20');await gm.locator('[data-do=monsterAttack]').click();await expect(gm.locator('[data-do=monsterEffort]')).toBeVisible();
 await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('#newScene').fill('The Crypt');await gm.locator('[data-do=newScene]').click();await expect(gm.locator('#banner')).toContainText('Preparing');
 await expect(gm.locator('[data-do=monsterEffort]')).toHaveCount(0);await gm.locator('[data-do=addEnemy]').click();await gm.locator('[data-do=cardEditDone]').click();await expect(gm.locator('[data-do=attackToggle]')).toHaveCount(0);
 await gm.locator('[data-do=gmtab][data-t=play]').click();await expect(gm.locator('[data-do=scenePowerReset]')).toHaveCount(0);
 await gm.locator('[data-do=gmtab][data-t=scene]').click();await gm.locator('[data-do=openScene][data-scene="'+live+'"]').click();await expect(gm.locator('[data-do=monsterEffort]')).toBeVisible();
 expect(gm.errors).toEqual([]);
});
