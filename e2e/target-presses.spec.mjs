// Quick presses on the Target's + and −, on a slow connection: each press counts. (Each used to say "the number on screen, plus one", so presses made before
// the screen caught up were lost: three quick presses from 12 gave 13.)
import { test, expect } from '@playwright/test';
import { newPage, makeTable, saved, state } from './helpers.mjs';

test('three quick presses of the Target + on a slow connection raise it by three; two of − then lower it by two', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser);
  await makeTable(gm);
  await gm.route('**/.netlify/functions/vtt', async (r) => { if (r.request().method() === 'POST') await new Promise((ok) => setTimeout(ok, 700)); await r.continue(); });
  const plus = gm.locator('#tTarget [data-do=target][data-d="1"]'), minus = gm.locator('#tTarget [data-do=target][data-d="-1"]');
  await plus.click(); await plus.click(); await plus.click(); await saved(gm);
  await expect.poll(async () => (await state(gm)).table.target).toBe(15);
  await minus.click(); await minus.click(); await saved(gm);
  await expect.poll(async () => (await state(gm)).table.target).toBe(13);
  expect(gm.errors).toEqual([]);
  await gm.close();
});
