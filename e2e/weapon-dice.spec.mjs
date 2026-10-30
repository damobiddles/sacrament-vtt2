import {test,expect,newPage,makeTable,joinTable,state} from './helpers.mjs';
import {bounded} from './contrast-lib.mjs';
test.setTimeout(60000);

test('saved bow bonuses remain editable, generator uses Weapons, and public loot shows d6',async({browser},info)=>{
 const page=await newPage(browser);await page.addInitScript(()=>{
  if(localStorage.getItem('sacrament-heroes-v2'))return;
  localStorage.setItem('sacrament-heroes-v2',JSON.stringify({heroes:[{id:'oldarcher',name:'Saved archer',stats:{DEX:3,CON:2,WIS:1},effort:{basic:1,guns:3},gear:[{id:'bow',eq:true}],hp:{cur:7,max:10},notes:'Saved private notes'}],current:'oldarcher',converted:{}}));
 });
 await page.goto('/character/');await expect(page.locator('#sheetHere')).toContainText('Your Guns bonus does not apply');
 await expect(page.locator('#sheetHere [data-text=notes]')).toHaveValue('Saved private notes');await expect(page.locator('.sh-hpn')).toHaveText('7 / 10');
 for(let n=0;n<3;n++){await page.locator('[data-sh=effort][data-k=guns][data-d="-1"]').click();await page.locator('[data-sh=effort][data-k=weapons][data-d="1"]').click();}
 await expect(page.locator('#sheetHere')).not.toContainText('Your Guns bonus does not apply');
 await page.locator('#generatorFocus').selectOption('scout');await page.locator('#generateHero').click();await expect(page.locator('#generatorPreview')).toContainText('Weapons +3');
 await page.screenshot({path:info.outputPath('weapon-effort-sheet.png'),fullPage:true});
 await page.goto('/loot/');await expect(page.locator('#item-bow')).toContainText('Weapons Effort d6');await expect(page.locator('#item-crossbow')).toContainText('Weapons Effort d6');
 expect(page.errors).toEqual([]);
});

test('GM designer separates bows and firearms and multiplayer bows use d6',async({browser})=>{
 const gm=await newPage(browser),code=await makeTable(gm,{sample:false});
 await gm.locator('[data-do=gmtab][data-t=loot]').click();await gm.locator('[data-do=designLoot]').click();
 await gm.locator('[data-lf=name]').fill('Gunpowder test');await gm.locator('[data-lf=category]').selectOption('Weapon');
 await gm.locator('[data-lf=weaponStyle]').selectOption('ranged');await expect(gm.locator('[data-lf=cat]')).toHaveValue('weapons');await expect(gm.locator('[data-lf=cat]')).toBeDisabled();
 await gm.locator('[data-lf=weaponStyle]').selectOption('firearm');await expect(gm.locator('[data-lf=cat]')).toHaveValue('guns');await expect(gm.locator('#ltPrev')).toContainText('d8');
 const player=await newPage(browser);await joinTable(player,code,'Archer');
 // Generate locally, then bring the saved scout into the disposable table.
 await player.goto('/character/');await player.locator('#generatorFocus').selectOption('scout');await player.locator('#generateHero').click();await player.locator('#keepGenerated').click();
 await player.goto('/vtt/?room='+code);await expect(player.locator('#app')).toBeVisible();
 // a slow table: it applies each change at once but its answer reaches the player 3 s late, so the player's screen trails the GM's
 await player.route('**/.netlify/functions/vtt',async r=>{const a=await r.fetch();await new Promise(ok=>setTimeout(ok,3000));await r.fulfill({response:a});});
 await player.locator('[data-do=bring]').click();
 await expect.poll(async()=>Object.values((await state(gm)).chars).length).toBe(1);
 await expect.poll(async()=>Object.values((await state(player)).chars).length,{timeout:15000}).toBe(1);   // the player's own screen, which can lag behind the GM's
 const result=await bounded(player.evaluate(async()=>{
  const s=window.__vtt.state(),ch=Object.values(s.chars)[0],entry=Object.entries(localStorage).find(([k])=>k.endsWith(s.code)&&!k.includes('join-')),token=JSON.parse(entry[1]).token;
  const weapon=ch.gear.find(g=>['bow','crossbow'].includes(g.id)),client='archertest'+Math.random().toString(36).slice(2,6);
  async function cmd(c,n){const r=await fetch('/.netlify/functions/vtt',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify({op:'cmd',code:s.code,cmd:{...c,actionId:client+'.'+n}})});return {status:r.status,body:await r.json()};}
  const hit=await cmd({type:'useItem',charId:ch.id,gearKey:weapon.key,d20:15},1);if(hit.status!==200)return hit;
  const rollId=hit.body.result.rollId;const damage=await cmd({type:'effort',rollId,cat:'guns',rolled:6},2);return {status:damage.status,roll:damage.body.state.rolls.find(r=>r.id===rollId)};
 }),15000,'using the scout bow in a disposable multiplayer table');
 expect(result.status).toBe(200);expect(result.roll.effort.die).toBe(6);expect(result.roll.effort.total).toBe(9);expect(result.roll.effort.cat).toBe('weapons');
 expect(gm.errors).toEqual([]);expect(player.errors).toEqual([]);
});
