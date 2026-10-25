import {prepareItem,rollPrepared,basicAttack} from './helpers.mjs';
import {test,expect,newPage,makeTable,joinTable,claimHero,state,saved} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
test('invitations live only in Table and all GM dice controls are visible with the shared divider',async({browser})=>{
 const gm=await newPage(browser);const code=await makeTable(gm);await expect(gm.locator('#panel [data-do=copy]')).toHaveCount(0);await expect(gm.locator('#gmDie,#gmDiceCount,#gmDicePrivate,[data-do=gmDiceRoll]')).toHaveCount(4);
 for(const selector of ['#gmDie','#gmDiceCount','#gmDicePrivate','[data-do=gmDiceRoll]'])await expect(gm.locator(selector)).toBeVisible();
 await expect(gm.locator('[data-do=gmDiceToggle]')).toHaveCount(0);await gm.locator('[data-do=gmtab][data-t=table]').click();await expect(gm.locator('#panel [data-do=copy]')).toHaveCount(1);await expect(gm.locator('#panel')).toContainText(code);
 const color=await bounded(gm.locator('#strip').evaluate(el=>({actual:getComputedStyle(el).borderTopColor,expected:getComputedStyle(el).getPropertyValue('--candle').trim()})),5000,'checking footer divider');expect(color.actual).toBe('rgb(184, 149, 90)');await gm.screenshot({path:'/workspace/sacrament-audit/streamlined-gm-footer.png'});expect(gm.errors).toEqual([]);
});
test('Roll damage hits its original target automatically even after selecting another card, and Undo works',async({browser})=>{
 const gm=await newPage(browser),p=await newPage(browser),code=await makeTable(gm);await joinTable(p,code,'Ann');await claimHero(p,'Thorne');
 await p.locator('#strip input[data-phys]').fill('15');await p.locator('#cards .c',{hasText:'Pit Ghoul'}).click();await prepareItem(p);await rollPrepared(p);
 await expect(p.locator('#feed li.success .tx')).toBeVisible();const before=await state(p),foe=Object.values(before.cards).find(c=>c.name==='Pit Ghoul'),gate=Object.values(before.cards).find(c=>c.name==='The Sealed Gate');
 await p.locator('#cards .c',{hasText:'The Sealed Gate'}).click();await p.locator('#physE').fill('4');await p.locator('#strip [data-do=effort]').first().click();await saved(p);await expect(p.locator('#feed')).toContainText('HP -');await expect(p.locator('[data-do=apply]')).toHaveCount(0);
 await expect.poll(async()=>(await state(gm)).cards[foe.id].hp.cur).toBe(13);expect((await state(p)).cards[gate.id].progress.cur).toBe(before.cards[gate.id].progress.cur);
 const roll=(await state(gm)).rolls.at(-1);expect(roll.applied.cardId).toBe(foe.id);expect(roll.effort.total).toBe(7);
 await bounded(gm.evaluate(async log=>{const s=window.__vtt.state(),k=Object.keys(localStorage).find(k=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(localStorage.getItem(k)).token;const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'undo',logId:log,actionId:'autoundo'+Math.random().toString(36).slice(2,8)+'.1'}})});if(!r.ok)throw Error('Undo failed');},roll.applied.log),15000,'undoing disposable automatic damage');await expect.poll(async()=>(await state(p)).cards[foe.id].hp.cur).toBe(20);expect(gm.errors.concat(p.errors)).toEqual([]);
});
