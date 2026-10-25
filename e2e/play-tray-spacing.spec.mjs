import {prepareItem} from './helpers.mjs';
import {test,expect,newPage,makeTable,saved} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);
test('Play tray keeps long turn names, order controls and session fields inside its column',async({browser},info)=>{
 const gm=await newPage(browser);await makeTable(gm);
 await gm.screenshot({path:info.outputPath('play-before-edit.png')});
 await bounded(gm.evaluate(async()=>{
  const s=window.__vtt.state(),entry=Object.entries(localStorage).find(([k])=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(entry[1]).token,ch=Object.values(s.chars)[0];
  const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{type:'cardUpdate',id:ch.cardId,patch:{name:'W'.repeat(60)},actionId:'traylayout.1'}})});if(!r.ok)throw Error('Could not rename test hero');
 }),15000,'preparing a long name in a disposable table');
 await expect(gm.locator('#panel .ol .n').first()).toContainText('W'.repeat(60));
 await gm.locator('[data-do=editOrder]').click();await saved(gm);
 for(const width of [1366,1024]){
  await gm.setViewportSize({width,height:900});
  const problems=await bounded(gm.locator('#panel').evaluate(panel=>{
   const p=panel.getBoundingClientRect(),style=getComputedStyle(panel),left=p.left+parseFloat(style.paddingLeft),right=p.right-parseFloat(style.paddingRight);
   return [...panel.querySelectorAll('button,input,select,label,.ol li')].filter(el=>el.getClientRects().length).flatMap(el=>{
    const r=el.getBoundingClientRect(),bad=[];if(r.left<left-1||r.right>right+1)bad.push(el.tagName+' outside column');if(el.matches('.ol .n')&&el.scrollWidth>el.clientWidth+1)bad.push('turn name overflows');return bad;
   });
  }),10000,'measuring Play tray controls');
  expect(problems).toEqual([]);
 }
 await gm.locator('[data-do=gmtab][data-t=table]').click();await gm.locator('#nextAt').fill('2026-11-01T19:30');await gm.locator('#nextNote').fill('Bring dice');await gm.locator('[data-do=nextSet]').click();await saved(gm);await expect(gm.locator('.tabbody')).toContainText('Bring dice');
 await gm.screenshot({path:info.outputPath('play-edited.png')});expect(gm.errors).toEqual([]);
});

for(const role of ['gm','player'])test(`${role}: target chooser has breathing room and its controls fit the tray`,async({browser},info)=>{
 const {joinTable,claimHero,openGmHeroSheet}=await import('./helpers.mjs');
 const gm=await newPage(browser),code=await makeTable(gm),page=role==='gm'?gm:await newPage(browser);
 if(role==='player'){await joinTable(page,code,'Ann');await claimHero(page,'Thorne');await prepareItem(page);}
 else await openGmHeroSheet(page);
 if(role==='gm') await page.locator('#sheetOverlay [data-sh=quickUse]').first().click();await expect(page.locator('#attackTarget')).toBeVisible();
 await page.locator('#attackTarget').selectOption({label:'Pit Ghoul'});await page.locator('#attackTarget').focus();
 for(const width of [1366,1024,683]){
  await page.setViewportSize({width,height:800});
  const spacing=await bounded(page.locator('#attackTarget').evaluate(select=>{
   const sec=select.closest('.sec'),row=sec.querySelector('.row'),s=select.getBoundingClientRect(),r=row.getBoundingClientRect(),panel=document.querySelector('#panel'),p=panel.getBoundingClientRect(),cs=getComputedStyle(panel),left=p.left+parseFloat(cs.paddingLeft),right=p.right-parseFloat(cs.paddingRight);
   return {gap:r.top-s.bottom,overflow:[...sec.querySelectorAll('button,select,label')].filter(el=>{const b=el.getBoundingClientRect();return b.left<left-1||b.right>right+1;}).map(el=>el.tagName)};
  }),5000,'checking target chooser spacing');
  expect(spacing.gap,'the focused target selector needs space before the action buttons').toBeGreaterThanOrEqual(8);expect(spacing.overflow).toEqual([]);
 }
 await page.screenshot({path:info.outputPath(role+'-target-spacing.png')});await page.locator('[data-do=cancelAttack]').click();await expect(page.locator('#attackTarget')).toHaveCount(0);expect(page.errors).toEqual([]);
});
