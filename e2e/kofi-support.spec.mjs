import { test, expect, newPage } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';
import { createRequire } from 'node:module';

const axe = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
test.setTimeout(45000);
// Reproduce the reported widget's white label on its configured blue background.
// This small stand-in makes the check independent of third-party network access.
const widget = `window.kofiwidget2={init:function(text,color,id){this.text=text;this.color=color;this.id=id;},draw:function(){document.write('<a class="kofi-button" href="https://ko-fi.com/'+this.id+'" style="background:'+this.color+';padding:10px 16px"><span class="kofitext" style="color:#fff">'+this.text+'</span></a>');}};`;

for (const available of [true, false]) {
  test(`support remains readable and usable when the external widget ${available ? 'loads' : 'is blocked'}`, async ({ browser }, info) => {
    const page = await newPage(browser);
    await page.route('https://storage.ko-fi.com/**', r => available ? r.fulfill({ contentType: 'application/javascript', body: widget }) : r.abort());
    for (const path of ['/', '/how-to-play/']) {
      await page.goto(path);
      const link = page.locator('.ic-kofi a');
      await expect(link).toBeVisible();
      await expect(link).toHaveAttribute('href', 'https://ko-fi.com/J4M02969C2');
      await expect(link).toHaveAccessibleName(/Support.*Ko-fi/i);
      await page.addScriptTag({ path: axe });
      for (const state of ['normal', 'hover', 'focus']) {
        if (state === 'hover') await link.hover();
        if (state === 'focus') await link.focus();
        const violations = await bounded(page.evaluate(async () => {
          const r = await window.axe.run('.ic-kofi', { runOnly: { type: 'rule', values: ['color-contrast'] } });
          return r.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.html) }));
        }), 10000, 'measuring support button contrast');
        expect(violations, `${path} support button (${state})`).toEqual([]);
      }
      if (path === '/') await page.screenshot({ path: info.outputPath('support-button.png') });
    }
    expect(page.errors).toEqual([]);
  });
}
