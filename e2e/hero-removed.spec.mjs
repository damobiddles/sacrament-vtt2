// A hero taken off the table while that hero's player has a roll open: the player's screen keeps working (it used to stop drawing, and after a reload the tray went blank).
// The screen offers no Remove for a hero today, so the table is asked directly, as the GM, the way a future button (or an old save) could.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

test('a hero removed by the GM while its player has a roll waiting: the player is told, and the screen keeps working, before and after a reload', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');

  /* a success with a physical 18: the panel waits for Effort */
  await ann.locator('#strip [data-do=toggle][data-key=more]').click(); await ann.locator('#strip [data-do=toggle][data-key=dice]').click();
  await ann.locator('#strip input[data-phys]').fill('18'); await ann.locator('#strip .stat', { hasText: 'STR' }).click(); await saved(ann);
  await expect(ann.locator('#panel [data-do=effort]').first()).toBeVisible();

  /* Thorne's token is removed, as the GM */
  const thorne = Object.values((await state(gm)).cards).find((c) => c.name === 'Thorne');
  const gone = await gm.evaluate(async (id) => { const code = window.__vtt.state().code, sess = JSON.parse(localStorage.getItem('ic' + 'rpg-vtt-' + code));
    const r = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + sess.token }, body: JSON.stringify({ op: 'cmd', code, cmd: { type: 'cardDelete', id, actionId: 'removetest.1' } }) }); return r.status; }, thorne.id);
  expect(gone).toBe(200);

  await expect(ann.locator('#panel')).toContainText('no longer at the table');
  await expect(ann.locator('#panel [data-do=effort]')).toHaveCount(0);
  await gm.locator('#tTarget [data-do=target][data-d="1"]').click(); await saved(gm);
  await expect(ann.locator('#tgtv')).toHaveText('13');
  await expect(ann.locator('[data-do=claim]').first()).toBeVisible();   // the strip is drawn again: Ann can take up another hero

  await ann.reload(); await expect(ann.locator('#app')).toBeVisible();
  await expect(ann.locator('[data-do=claim]').first()).toBeVisible();
  await expect(ann.locator('#tStatus [data-do=leave]')).toBeVisible();
  expect(ann.errors).toEqual([]); expect(gm.errors).toEqual([]);
  await gm.close(); await ann.close();
});
