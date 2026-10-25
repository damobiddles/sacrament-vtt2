// Small helpers shared by the browser tests: make a table as the GM, and join it as a player in a separate browser window.
import { test as base, expect } from '@playwright/test';

// These contexts are opened directly, so Playwright's page fixture does not close them.
// Stop their polling and release their browsers before the next test starts.
export const test = base.extend({
  cleanupContexts: [async ({ browser }, use) => {
    await use();
    await Promise.all(browser.contexts().map((context) => context.close()));
  }, { auto: true }],
});
export { expect };

export async function newPage(browser, viewport) {
  const context = await browser.newContext({ viewport: viewport || { width: 1366, height: 800 } });
  await context.route(/fonts\.(googleapis|gstatic)\.com|storage\.ko-fi\.com|\/\/ko-fi\.com\//, (r) => r.abort());
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  return page;
}

export async function makeTable(page, { sample = true } = {}) {
  await page.goto('/vtt/');
  if (!sample) await page.locator('#makeSample').uncheck();
  await page.locator('#makeForm button[type=submit]').click();
  await expect(page.locator('#app')).toBeVisible();
  const code = await page.evaluate(() => window.__vtt.state().code);   // the GM's top bar no longer shows the code
  expect(code).toMatch(/^[A-Z0-9]{6}$/);
  return code;
}

export async function joinTable(page, code, name) {
  await page.goto('/vtt/?room=' + code);
  await page.locator('#joinName').fill(name);
  await page.locator('#joinForm button[type=submit]').click();
  await expect(page.locator('#app')).toBeVisible();
}

export async function claimHero(page, heroName) {
  await page.locator(`[data-do=claim]:has-text("${heroName}")`).click();
  await expect(page.locator('#strip .stat').first()).toBeVisible();
}

/** the page has nothing of its own still waiting to be saved */
export async function saved(page) {
  await page.waitForFunction(() => window.__vtt.ui.pending === 0 && /Saved/.test(document.querySelector('#tStatus').innerText));
}

export const state = (page) => page.evaluate(() => window.__vtt.state());

/** The sample heroes carry the gear their descriptions name. A test that counts a hero's gear from nothing empties every pack first, as the GM, through the table's
    own sheet command (the same one the sheet's Drop button sends). */
export async function emptyPacks(gm) {
  const { bounded } = await import('./contrast-lib.mjs');
  await bounded(gm.evaluate(async () => {
    const s = window.__vtt.state(), key = Object.keys(localStorage).find((k) => k.endsWith(s.code) && !k.includes('join-'));
    const token = JSON.parse(localStorage.getItem(key)).token, client = 'emptypk' + Math.random().toString(36).slice(2, 8); let n = 0;
    for (const ch of Object.values(s.chars)) for (let i = (ch.gear || []).length - 1; i >= 0; i--) {
      const r = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { actionId: client + '.' + (++n), type: 'sheet', charId: ch.id, op: { op: 'remove', index: i, gearKey: ch.gear[i].key } } }) });
      if (r.status !== 200) throw new Error('could not empty ' + ch.name + '’s pack: ' + r.status);
    }
  }), 15000, 'emptying the sample heroes’ packs');
  await expect.poll(() => gm.evaluate(() => Object.values(window.__vtt.state().chars).every((c) => !(c.gear || []).length))).toBe(true);
}

/** GM hero actions live in the selected hero's sheet, separate from GM dice. */
export async function openGmHeroSheet(page, name = 'Thorne') {
  await page.locator('#cards .c', { hasText: name }).click();
  await page.locator('#panel [data-do=sheet]').click();
  await expect(page.locator('#sheetOverlay')).toBeVisible();
}
