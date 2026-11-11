// VTT audit, 11 November 2026, in a real browser (desktop Chrome): what a player is told on the table, and where.
// The "Your turn" and "hits you" banners had stopped appearing (only the chime and the tab title were left); the Horror's thresholds and a shaken hero
// were said only in the one-line feed; a pushed miss left its old result card over the map; Standalone Effort still offered Ultimate as a kind of Effort.
import { test, expect, newPage, makeTable, joinTable, claimHero, saved, basicAttack } from './helpers.mjs';

const card = (page, name) => page.locator('#cards .c', { hasText: name }).first();

test('a player is told on the table: their turn, a hit, the Horror passing 7 and what shaken means, before the roll', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Wisp');
  await gm.locator('[data-do=gmtab][data-t=play]').click(); await gm.locator('#panel [data-do=endTurn]').click(); await saved(gm);
  await expect(ann.locator('#banner .notice.turn')).toHaveText('Your turn, Wisp.');
  await expect(ann.locator('#banner .notice.turn')).toHaveCount(0, { timeout: 9000 });   /* it goes by itself */

  /* the GM's Horror meter opens the Horror controls */
  await gm.locator('#tHorror [data-do=horrorOpen]').click();
  await expect(gm.locator('[data-do=gmtab][data-t=table]')).toHaveAttribute('aria-selected', 'true');
  await expect(gm.locator('#panel .hz-gm')).toBeVisible();
  await gm.locator('#hzSet').fill('7'); await gm.locator('[data-do=horrorSet]').click(); await saved(gm);
  await expect(ann.locator('#banner .notice.horror')).toContainText('Every hero is shaken: your next roll is Hard.');
  await expect(ann.locator('#tHorror .hz-delta')).toHaveText('+7');
  await expect(ann.locator('#panel .flag.shaken')).toHaveText('Shaken: next roll Hard');
  await expect(ann.locator('#strip .note.warn')).toHaveText('Shaken: this roll is Hard.');
  await expect(gm.locator('#banner .notice')).toHaveCount(0);   /* the GM has the alert with Dealt with instead */
  await card(gm, 'Wisp').click(); await expect(gm.locator('#panel .flag.shaken')).toBeVisible();

  /* the roll uses it up, and the warning goes */
  await ann.locator('#strip [data-do=check][data-stat=INT]').click(); await saved(ann);
  await expect(ann.locator('#feed')).toContainText('(shaken: Hard)');
  await expect(ann.locator('#panel .flag.shaken')).toHaveCount(0); await expect(ann.locator('#strip .note.warn')).toHaveCount(0);
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('a hit on a player\'s hero shows its banner once the dice have landed', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(gm, 'Pit Ghoul').click(); if (await gm.locator('[data-do=attackToggle]', { hasText: 'Attack a hero' }).count()) await gm.locator('[data-do=attackToggle]').click();
  await gm.locator('#atkHero').selectOption({ index: 0 }); await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
  await expect(gm.locator('[data-do=monsterEffort]').first()).toBeVisible(); await gm.locator('#physE').fill('3'); await gm.locator('[data-do=monsterEffort]').first().click(); await saved(gm);
  await expect(ann.locator('#banner .notice.hit')).toContainText('Pit Ghoul hits you: −3 HP (now 7 of 10).');
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('pushing puts the missed result away; Standalone Effort offers the four kinds a hero has points in, not Ultimate', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(ann, 'Pit Ghoul').click(); await basicAttack(ann, 2);
  await expect(ann.locator('#dice .reveal-result')).toContainText('MISS');
  await ann.locator('#panel [data-do=push]').click(); await saved(ann);
  await expect(ann.locator('#dice .reveal-result')).toHaveCount(0);
  await expect(ann.locator('#tHorror .hz-delta')).toHaveText('+1');
  await ann.keyboard.press('Escape'); await ann.locator('#panel [data-do=standaloneEffort]').click();
  await expect(ann.locator('#strip [data-do=freeEffort]')).toHaveCount(4);
  await expect(ann.locator('#strip [data-do=freeEffort][data-cat=ultimate]')).toHaveCount(0);
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});

test('table sounds are off unless switched on, and are remembered on this screen', async ({ browser }) => {
  test.setTimeout(45000);
  const gm = await newPage(browser);
  await makeTable(gm); await gm.locator('[data-do=gmtab][data-t=table]').click();
  const box = gm.locator('#panel input[data-cues]'); await expect(box).not.toBeChecked();
  await box.check(); await gm.reload(); await expect(gm.locator('#app')).toBeVisible(); await gm.locator('[data-do=gmtab][data-t=table]').click();
  await expect(gm.locator('#panel input[data-cues]')).toBeChecked();
  expect(gm.errors).toEqual([]);
});
