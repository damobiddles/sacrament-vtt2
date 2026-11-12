// The Horror you can feel (the owner's go-ahead, 2026-11-11): as the meter climbs the picture darkens at its edges like guttering candles, and once
// the Horror has arrived the light dies now and then. Presentation only: the veil lies over the picture, never over text, and catches no clicks.
import { test, expect, newPage } from './helpers.mjs';

test('solo: the picture darkens as the Horror climbs, and the veil never blocks a choice', async ({ browser }) => {
  test.setTimeout(60000);
  const page = await newPage(browser);
  await page.addInitScript(() => { crypto.getRandomValues = (a) => { a.fill(0); return a; }; });
  await page.goto('/solo/');
  await page.locator('#takeHero').click();
  await expect(page.locator('#game')).toBeVisible();
  const frame = page.locator('.frame');
  await expect(frame.locator('.dread-veil')).toHaveCount(1);
  const at = async (h) => { await page.evaluate((n) => { window.__solo.state().horror = n; window.__solo.render(); }, h); return frame.evaluate((f) => ({ d: Number(getComputedStyle(f).getPropertyValue('--dread')), step: f.dataset.dreadStep })); };
  expect(await at(0)).toEqual({ d: 0, step: '0' });
  const mid = await at(10); expect(mid.step).toBe('1'); expect(mid.d).toBeCloseTo(10 / 21, 2);
  expect(await at(21)).toEqual({ d: 1, step: '3' });
  expect(await frame.locator('.dread-veil').evaluate((v) => getComputedStyle(v).pointerEvents)).toBe('none');
  if (process.env.DREAD_SHOTS) for (const h of [0, 10, 21]) { await at(h); await page.waitForTimeout(1600); await page.screenshot({ path: `${process.env.DREAD_SHOTS}/solo-horror-${h}.png` }); }
  /* a choice still takes a click with the Horror at its worst */
  await page.locator('#choices button.go').first().click();
  expect(page.errors).toEqual([]);
});

test('table: the map darkens for the GM and the players as the Horror climbs, under the cards', async ({ browser }) => {
  test.setTimeout(90000);
  const { makeTable, joinTable, saved } = await import('./helpers.mjs');
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann');
  const level = (page) => page.locator('#table').evaluate((t) => ({ d: Number(getComputedStyle(t).getPropertyValue('--dread')), step: t.dataset.dreadStep, veil: t.querySelectorAll(':scope > .dread-veil').length, under: getComputedStyle(t.querySelector('.dread-veil')).zIndex }));
  await expect.poll(async () => (await level(gm)).step).toBe('0');
  expect(await level(gm)).toEqual({ d: 0, step: '0', veil: 1, under: 'auto' });
  await gm.locator('[data-do=gmtab][data-t=table]').click();
  await gm.locator('#hzSet').fill('21'); await gm.locator('[data-do=horrorSet]').click(); await saved(gm);
  await expect.poll(async () => (await level(gm)).step).toBe('3');
  await expect.poll(async () => (await level(ann)).step, { timeout: 15000 }).toBe('3');
  expect((await level(ann)).d).toBe(1);
  if (process.env.DREAD_SHOTS) { await ann.waitForTimeout(1600); await ann.screenshot({ path: `${process.env.DREAD_SHOTS}/table-horror-21.png` }); }
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});
