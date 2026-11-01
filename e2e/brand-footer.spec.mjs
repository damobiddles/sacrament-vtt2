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
 await p.goto('/brand/');await expect(p.locator('main')).toContainText('Cormorant Garamond Bold');await expect(p.locator('main')).toContainText('The wordmark is set in UnifrakturMaguntia');
 for(const filename of ['CormorantGaramond-Variable.ttf','CormorantGaramond-Italic-Variable.ttf','SourceSans3-Variable.ttf','UnifrakturMaguntia-Book.ttf']){
  await expect(p.locator('a[href="/fonts/'+filename+'"]')).toHaveAttribute('download','');
  const r=await p.request.get('/fonts/'+filename);expect(r.status()).toBe(200);const bytes=await r.body();expect(bytes.readUInt32BE(0)).toBe(0x00010000);
 }
 await p.screenshot({path:info.outputPath('brand-kit-current-fonts.png'),fullPage:true});
 expect(p.errors).toEqual([]);
});

test('the logo face sets the site name and page titles on the website, but never on the table', async({browser},info)=>{
 const p=await newPage(browser);
 const face=sel=>bounded(p.locator(sel).first().evaluate(el=>getComputedStyle(el).fontFamily),5000,'reading the font of '+sel);
 const loaded=()=>bounded(p.evaluate(async()=>{await document.fonts.ready;return document.fonts.check('400 48px UnifrakturMaguntia');}),8000,'waiting for the logo face');
 for(const path of ['/','/brand/','/how-to-play/','/news/','/character/']){
  await p.goto(path);await expect(p.locator('h1').first()).toBeVisible();
  expect(await face('h1'),path).toMatch(/^"?UnifrakturMaguntia/);
  expect(await face(path==='/character/'?'.sac-mark':'.ic-nav .ic-brand'),path).toMatch(/^"?UnifrakturMaguntia/);
  expect(await loaded(),path+' downloads the face').toBe(true);
 }
 await p.goto('/');await p.screenshot({path:info.outputPath('home-blackletter.png')});
 await p.goto('/vtt/');await expect(p.locator('h1').first()).toBeAttached();
 expect(await face('h1')).not.toMatch(/Unifraktur/i);
 expect(await bounded(p.evaluate(()=>[...document.styleSheets].map(s=>s.href||'').filter(h=>/landing|blackletter/.test(h))),5000,'listing table stylesheets')).toEqual([]);
 expect(p.errors).toEqual([]);
});
