import {basicAttack} from './helpers.mjs';
// Pushing on the screen: a failed roll offers the player a push; pressing it raises the Rising Horror by 1 for everyone and offers the same roll again;
// a natural 1 raises it by itself. A GM and a player in separate windows. Set PUSH_SHOTS=<folder> to keep pictures of each step.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, saved } from './helpers.mjs';

const SHOTS = process.env.PUSH_SHOTS || '';
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve());
const meter = (page) => page.locator('#tHorror .hz-meter');
const landed = (page) => page.waitForFunction(() => !window.SacramentDice || !window.SacramentDice.rolling(), null, { timeout: 10000 });
/* roll STR with what a physical die shows (Thorne has STR +3; the Target is 12) */
async function rollWith(page, n) {
  await page.locator('#cards .c', {hasText:'Pit Ghoul'}).click();
  await basicAttack(page,n);
  await saved(page); await landed(page);
}

test('Push: a failed roll offers a push; it raises the Horror by 1 and offers the same again, once; a natural 1 adds 1 by itself', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');

  await rollWith(ann, 15);   // 18: a success, nothing to push
  await expect(ann.locator('#feed li.success .tx')).toBeVisible(); await expect(ann.locator('#panel [data-do=push]')).toHaveCount(0);

  await rollWith(ann, 2);    // 5: a failure
  const offer = ann.locator('#panel .push');
  await expect(offer).toContainText('The Horror is listening.'); await expect(offer.locator('[data-do=push]')).toContainText('Push: act again +1 Horror');
  await expect(gm.locator('#panel [data-do=push]')).toHaveCount(0);   // the offer is the player's
  await shot(ann, '1-player-failed-roll-offer');

  await offer.locator('[data-do=push]').click(); await saved(ann);
  await expect(meter(ann)).toHaveAttribute('aria-valuenow', '1'); await expect(meter(gm)).toHaveAttribute('aria-valuenow', '1');
  await expect(ann.locator('#strip [data-do=again]')).toBeVisible();
  await gm.locator('[data-do=feed]').click(); await expect(gm.locator('#feed li.horror')).toContainText('Thorne pushes for a second action. The Horror rises 1 (now 1).');
  await shot(ann, '2-player-pushed');

  await ann.locator('#strip input[data-phys]').fill('1');   // the second action: the same again, on a natural 1
  await ann.locator('#strip [data-do=again]').click(); await saved(ann); await landed(ann);
  await expect(meter(ann)).toHaveAttribute('aria-valuenow', '2');
  await expect(ann.locator('#feed')).toContainText('rolled a natural 1');
  await expect(ann.locator('#panel [data-do=push]')).toHaveCount(0);   // the second action cannot be pushed again
  await shot(ann, '3-player-second-action-natural-1');
  await gm.close(); await ann.close();
});
