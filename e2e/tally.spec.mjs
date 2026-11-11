// The numbers that rise off the dice at the table, as in the solo game (the owner's ask, 2026-11-11): once the die lands, each modifier rises beside it
// and the total pops over it, on the roller's screen and on everyone else's. A blow on a token floats its number up from the token.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, state } from './helpers.mjs';

const SHOTS = process.env.TALLY_OUT || '';   /* a folder for pictures, when wanted (git-ignored) */

test('a player\'s check: the total rises over the die on their screen and on the GM\'s, and matches the server\'s', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await ann.locator('#strip .stat').first().click();
  const total = ann.locator('#tablewrap .tally-total b');
  await expect(total).toBeVisible({ timeout: 6000 });
  const line = (await state(ann)).log.filter((e) => e.tally).at(-1);
  await expect(total).toHaveText(String(line.tally[0].total));
  await expect(ann.locator('#tablewrap .tally-total small')).toHaveText(line.tally[0].word);
  if (SHOTS) await ann.screenshot({ path: SHOTS + '/1-player-total.png' });
  await expect(gm.locator('#tablewrap .tally-total b')).toHaveText(String(line.tally[0].total), { timeout: 8000 });
  if (SHOTS) await gm.screenshot({ path: SHOTS + '/2-gm-total.png' });
  await expect(ann.locator('#tablewrap .tally')).toHaveCount(0, { timeout: 6000 });   /* and it fades away by itself */
  expect(ann.errors.concat(gm.errors)).toEqual([]);
});

test('a blow on a token: its HP loss floats up from the token on every screen', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  const st = await state(gm), hero = Object.values(st.cards).find((c) => c.name === 'Thorne');
  await gm.locator('#cards [data-id="' + hero.id + '"]').click();
  await gm.locator('#panel [data-do=track][data-field=hp][data-d="-5"]').first().click();
  for (const p of [gm, ann]) await expect(p.locator('#tablewrap .float')).toHaveText('−5', { timeout: 8000 });
  if (SHOTS) await ann.screenshot({ path: SHOTS + '/3-blow.png' });
  expect(ann.errors.concat(gm.errors)).toEqual([]);
});
