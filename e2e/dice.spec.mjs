// Dice tumbling on screen: a player rolls, the die tumbles on their screen and on the GM's, and both land on the number the server rolled.
// The roller's result waits until their die has landed. Anyone can switch the dice off for their own screen, and less-motion devices never see them.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const SHOTS = process.env.DICE_OUT || '';   /* a folder for pictures of the dice, when wanted (git-ignored) */
async function setup(browser) {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  return { gm, ann };
}
const lastRoll = (page) => state(page).then((st) => st.log.filter((e) => e.dice).at(-1));

test('a player\'s roll tumbles on their screen and on the GM\'s, and lands on the server\'s number; the result waits for it', async ({ browser }) => {
  test.setTimeout(60000);
  const { gm, ann } = await setup(browser);
  await ann.locator('#strip .stat').first().click();
  await expect(ann.locator('#dice .die')).toBeVisible();
  await expect(ann.locator('#feed')).toContainText('Rolling…');
  await expect(ann.locator('#feed .last')).toContainText('Rolling…');   /* the activity line does not give the number away yet */
  if (SHOTS) await ann.screenshot({ path: SHOTS + '/1-tumbling.png' });
  await expect(ann.locator('#dice .die.landed')).toBeVisible();
  const line = await lastRoll(ann); expect(line.dice[0].die).toBe(20);
  await expect(ann.locator('#dice .die.landed b')).toHaveText(String(line.dice[0].n));
  await expect(ann.locator('#strip')).toContainText('Thorne');
  if (line.dice[0].n !== 1) await expect(ann.locator('#feed .tx')).toContainText(String(line.dice[0].n) + ' ');   // a natural 1 adds a second feed line: the check below covers it
  /* landed, the line tells the result; on a natural 1 the line after it (the Horror rising) is the last one */
  await expect(ann.locator('#feed .last')).toContainText(line.dice[0].n === 1 ? 'rolled a natural 1' : 'against Target');
  if (SHOTS) await ann.screenshot({ path: SHOTS + '/2-landed.png' });
  /* the GM's screen picks the roll up on its next look at the table and shows the same die */
  await expect(gm.locator('#dice .die.landed b')).toHaveText(String(line.dice[0].n));
  if (SHOTS) await gm.screenshot({ path: SHOTS + '/3-gm.png' });
  await ann.locator('#dice .reveal-action').click(); await expect(ann.locator('#dice .dice-roll')).toHaveCount(0);   /* Continue dismisses an ordinary check */
  expect(ann.errors.concat(gm.errors)).toEqual([]);
});

test('the dice can be switched off for one screen, and the result then shows at once', async ({ browser }) => {
  test.setTimeout(60000);
  const { gm, ann } = await setup(browser);

  await ann.locator('.player-actions details').last().locator('summary').click();
  const sw = ann.locator('#panel [data-diceanim]'); await expect(sw).toBeChecked(); await sw.uncheck();
  await ann.locator('#strip .stat').first().click(); await saved(ann);
  await expect(ann.locator('#feed .tx').first()).toBeVisible();
  await expect(gm.locator('#dice .die')).toBeVisible();   /* the GM still has theirs */
  expect(await ann.locator('#dice .die').count()).toBe(0);
});

test('a device that asks for less motion is never shown the dice', async ({ browser }) => {
  test.setTimeout(60000);
  const { ann } = await setup(browser);
  await ann.emulateMedia({ reducedMotion: 'reduce' });
  await ann.locator('#strip .stat').first().click(); await saved(ann);
  await expect(ann.locator('#feed .tx').first()).toBeVisible();
  expect(await ann.locator('#dice .die').count()).toBe(0);
});
