import {test,expect,newPage} from './helpers.mjs';
import {bounded,axeContrast} from './contrast-lib.mjs';
test.setTimeout(45000);
// Contract stand-in for the owner-supplied API. The real CDN is blocked here;
// this verifies our configuration and fallback, not Ko-fi's payment window.
const widget=`window.kofiWidgetOverlay={draw:function(handle,options){window.__supportConfig={handle,options};var w=document.createElement('div');w.className='floatingchat-container-wrap';w.style='position:fixed;left:16px;bottom:16px';var a=document.createElement('a');a.href='https://ko-fi.com/'+handle;a.textContent=options['floating-chat.donateButton.text'];a.style='display:inline-flex;align-items:center;min-height:44px;padding:10px 14px;box-sizing:border-box;background:'+options['floating-chat.donateButton.background-color']+';color:'+options['floating-chat.donateButton.text-color'];w.appendChild(a);document.body.appendChild(w);}};`;
for(const available of [true,false])test(`the floating support integration ${available?'uses the supplied widget settings':'keeps a padded direct link when blocked'}`,async({browser},info)=>{
 const page=await newPage(browser);await page.route('https://storage.ko-fi.com/**',r=>available?r.fulfill({contentType:'application/javascript',body:widget}):r.abort());
 for(const path of ['/','/how-to-play/']){
  await page.goto(path);await expect(page.locator('.ic-nav .kofi-button')).toHaveCount(0);
  const link=page.locator(available?'.floatingchat-container-wrap a':'.support-floating-fallback a');await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','https://ko-fi.com/sacramentrpg');
  await expect(page.locator('.ic-foot a[href="https://ko-fi.com/sacramentrpg"]')).toBeVisible();
  if(available){await expect(page.locator('.support-floating-fallback')).toBeHidden();const config=await bounded(page.evaluate(()=>window.__supportConfig),5000,'checking supplied widget configuration');expect(config).toEqual({handle:'sacramentrpg',options:{type:'floating-chat','floating-chat.donateButton.text':'Support me','floating-chat.donateButton.background-color':'#323842','floating-chat.donateButton.text-color':'#fff'}});}
  else {const style=await bounded(link.evaluate(el=>({height:el.getBoundingClientRect().height,padding:parseFloat(getComputedStyle(el).paddingTop)})),5000,'checking fallback spacing');expect(style.height).toBeGreaterThanOrEqual(44);expect(style.padding).toBeGreaterThanOrEqual(10);}
  for(const look of ['normal','hover','focus']){if(look==='hover')await link.hover();if(look==='focus')await link.focus();expect(await axeContrast(page)).toEqual([]);}
  if(path==='/')await page.screenshot({path:info.outputPath('floating-support.png')});
 }
 expect(page.errors).toEqual([]);
});
test('no donation script loads in the VTT or character editor',async({browser})=>{
 const p=await newPage(browser),requests=[];p.on('request',r=>{if(r.url().includes('storage.ko-fi.com'))requests.push(r.url());});
 for(const path of ['/vtt/','/character/']){await p.goto(path);await expect(p.locator('script[data-sac-kofi],.support-floating-fallback')).toHaveCount(0);}expect(requests).toEqual([]);
});
