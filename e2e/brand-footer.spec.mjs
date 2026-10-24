import { test, expect, newPage } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';
test.setTimeout(45000);

test('the brand kit supplies current fonts and shared footers link to YouTube with a local Ko-fi cup badge', async({browser},info)=>{
 const p=await newPage(browser);
 for(const path of ['/','/brand/','/resources/','/feedback/']){
  await p.goto(path);
  await expect(p.locator('.ic-foot a[href="https://www.youtube.com/@DungeonJukebox"]')).toHaveCount(1);
  const badge=p.locator('.ic-kofi .kofi-cup');await expect(badge).toBeVisible();
  expect(await bounded(badge.evaluate(img=>img.complete&&img.naturalWidth>0),5000,'checking local Ko-fi logo')).toBe(true);
 }
 await p.goto('/brand/');await expect(p.locator('main')).toContainText('Cormorant Garamond Bold');
 for(const filename of ['CormorantGaramond-Variable.ttf','CormorantGaramond-Italic-Variable.ttf','SourceSans3-Variable.ttf']){
  await expect(p.locator('a[href="/fonts/'+filename+'"]')).toHaveAttribute('download','');
  const r=await p.request.get('/fonts/'+filename);expect(r.status()).toBe(200);const bytes=await r.body();expect(bytes.readUInt32BE(0)).toBe(0x00010000);
 }
 await p.screenshot({path:info.outputPath('brand-kit-current-fonts.png'),fullPage:true});
 expect(p.errors).toEqual([]);
});
