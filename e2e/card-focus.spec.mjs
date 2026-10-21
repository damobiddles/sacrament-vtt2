// A card that has the keyboard's focus keeps it when the table updates. (The whole table used to be redrawn on every update, so the focus went back to the page.)
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, saved, state } from './helpers.mjs';

test('a card focused with the keyboard keeps the focus while the GM changes something else, and while its own numbers change', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann');
  const ghoul = Object.values((await state(ann)).cards).find((c) => c.name === 'Pit Ghoul');
  await ann.locator(`#cards [data-id="${ghoul.id}"]`).focus();
  const focused = () => ann.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));

  await gm.locator('#tTarget [data-do=target][data-d="1"]').click(); await saved(gm);
  await expect(ann.locator('#tgtv')).toHaveText('13');
  expect(await focused()).toBe('Pit Ghoul');

  /* the ghoul itself changes (it is hit for 3): it is drawn again and keeps the focus */
  await gm.evaluate(async (id) => { const code = window.__vtt.state().code, sess = JSON.parse(localStorage.getItem('ic' + 'rpg-vtt-' + code));
    await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + sess.token }, body: JSON.stringify({ op: 'cmd', code, cmd: { type: 'track', id, field: 'hp', mode: 'delta', value: -3, actionId: 'focustest.1' } }) }); }, ghoul.id);
  await expect.poll(async () => (await state(ann)).cards[ghoul.id].hp.cur).toBe(17);
  expect(await focused()).toBe('Pit Ghoul');
  expect(ann.errors).toEqual([]);
  await gm.close(); await ann.close();
});
