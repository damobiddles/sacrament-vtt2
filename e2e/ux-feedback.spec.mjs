// The 2026-10-21 UX pass, in real browsers: a new GM is shown how to invite players, a player is told whose turn it is, when their hero is hit and what dying means,
// a GM's d100 gift reaches the player, finished rolls are put away when the turn moves on, and the GM's cards lead with the right button.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const SHOTS = process.env.UX_SHOTS || '';   /* a folder for screenshots, when asked for */
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
const card = (page, name) => page.locator('#cards .c', { hasText: name }).first();
const endTurn = async (page) => { await page.locator('#top [data-do=endTurn]').click(); await saved(page); };

test('a new GM sees the code and the invite link first; the box goes once a player has a hero', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm, { sample: false });
  const box = gm.locator('#panel .sec.start');
  await expect(box).toContainText('Getting started'); await expect(box).toContainText(code);
  await expect(box.locator('[data-do=copy]')).toBeVisible(); await expect(box.locator('[data-do=addHero]')).toBeVisible();
  await shot(gm, '1-gm-getting-started');
  await box.locator('[data-do=addHero]').click(); await saved(gm);
  await gm.locator('[data-do=deselect], [data-do=cardEditDone]').first().click(); await gm.locator('[data-do=deselect]').first().click().catch(() => {});
  await joinTable(ann, code, 'Ann');
  await expect(gm.locator('#feed')).toContainText('Ann: Joined the table.');
  await ann.locator('[data-do=claim]').first().click(); await expect(ann.locator('#strip .stat').first()).toBeVisible();
  await expect(gm.locator('#panel .sec.start')).toHaveCount(0);
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('the turn reaching a player is announced to them; a finished roll is put away when the turn moves on; the panel says whose turn it is', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser), bo = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne'); await joinTable(bo, code, 'Bo'); await claimHero(bo, 'Wisp');
  await expect(bo.locator('#panel .turnline')).toContainText('It is Thorne’s turn.');
  await expect(ann.locator('#panel .turnline.mine')).toContainText('Your turn.');
  await expect(ann.locator('#strip')).toHaveClass(/myturn/); await expect(bo.locator('#strip')).not.toHaveClass(/myturn/);
  /* Wisp rolls out of turn with her own die, and misses */
  await bo.locator('#strip [data-do=toggle][data-key=more]').click(); await bo.locator('#strip [data-do=toggle][data-key=dice]').click();
  await card(bo, 'Pit Ghoul').click(); await bo.locator('#strip input[data-phys]').fill('2'); await bo.locator('#strip .stat', { hasText: 'STR' }).click(); await bo.locator('#strip [data-noitem]').click();
  await expect(bo.locator('#panel .calc.bad')).toContainText('Miss'); await expect(bo.locator('#panel [data-do=push]')).toBeVisible();
  await bo.locator('#panel [data-do=deselect]').click();  // look at the play panel while leaving the failed attack open
  await endTurn(gm);
  await expect(bo.locator('#banner .notice.turn')).toHaveText('Your turn, Wisp.');
  await expect(bo.locator('#strip')).toHaveClass(/myturn/);
  await expect(bo.locator('#panel [data-do=push]')).toHaveCount(0);   /* the old miss and its Push offer are put away */
  await expect(bo.locator('#panel .turnline.mine')).toContainText('Your turn.');
  await shot(bo, '2-player-your-turn');
  await expect(ann.locator('#feed')).toContainText('Thorne ends their turn. Wisp’s turn.');
  await expect(bo.locator('#banner .notice.turn')).toHaveCount(0, { timeout: 9000 });   /* it goes by itself */
  expect(bo.errors).toEqual([]);
});

test('a hit on a player\'s hero is told to them; a dying hero is told what can save them', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  const hit = async (damage) => {
    await card(gm, 'Pit Ghoul').click(); if (await gm.locator('[data-do=attackToggle]', { hasText: 'Attack a hero' }).count()) await gm.locator('[data-do=attackToggle]').click();
    await gm.locator('#atkHero').selectOption({ index: 0 }); await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
    await expect(gm.locator('[data-do=monsterEffort]')).toBeVisible(); if (await gm.locator('[data-do=monCat][data-cat=ultimate]').count()) await gm.locator('[data-do=monCat][data-cat=ultimate]').click(); await gm.locator('#physE').fill(String(damage)); await gm.locator('[data-do=monsterEffort][data-cat=ultimate]').click(); await saved(gm);
    await gm.locator('[data-do=dismissRoll]').click();
  };
  await hit(4);
  await expect(ann.locator('#banner .notice.hit')).toHaveText('Pit Ghoul hits you: −4 HP (now 6 of 10).');
  await expect(gm.locator('#banner .notice')).toHaveCount(0);   /* the GM rolled it: no notice for them */
  await shot(ann, '3-player-hit');
  await hit(6);
  await expect(ann.locator('#panel .down-help')).toContainText('You are dying');
  await expect(ann.locator('#panel .down-help')).toContainText('Tend you (a WIS check)');
  await shot(ann, '4-player-dying-help');
  await card(gm, 'Thorne').click(); await gm.locator('#panel [data-do=dying][data-op=stable]').click(); await saved(gm);
  await expect(ann.locator('#panel .down-help')).toContainText('You are stable.');
  expect(ann.errors).toEqual([]);
});

test('the GM\'s d100 gift reaches the player; damage is called damage; the Effort choice is explained', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await gm.locator('[data-do=gmtab][data-t=loot]').click(); await gm.locator('#physL').fill('78 6'); await gm.locator('[data-do=lootRoll]').click();
  await gm.locator('#lootHero').selectOption({ label: 'Thorne' }); await gm.locator('[data-do=lootGive]').click(); await saved(gm);
  await expect(ann.locator('#feed')).toContainText('The GM gives you');
  await expect(gm.locator('#feed')).toContainText('to Thorne.');
  /* a stat roll at the gate with the player's own die: the Effort kinds come with a line saying which is which */
  await card(ann, 'Sealed Gate').click();
  await ann.locator('#strip [data-do=toggle][data-key=more]').click(); await ann.locator('#strip [data-do=toggle][data-key=dice]').click(); await ann.locator('#strip input[data-phys]').fill('19');
  await ann.locator('#strip .stat', { hasText: 'STR' }).click();
  await ann.locator('#strip [data-do=roll][data-noitem]').click();
  await expect(ann.locator('#panel .cats')).toBeVisible();
  await expect(ann.locator('#panel')).toContainText('Pick what you did it with');
  /* the hatchet at the ghoul: the result says damage */
  await ann.locator('[data-do=dismissRoll]').click(); await card(ann, 'Pit Ghoul').click();
  await ann.locator('#strip input[data-phys]').fill('19');
  await ann.locator('#strip [data-do=sheet]').click();
  await ann.locator('#sheetOverlay .sh-item [data-sh=use]').first().click();
  await ann.locator('#panel [data-do=effort]').first().click();
  await expect(ann.locator('#panel .calc').last()).toContainText(/= \d+ damage\./);
  expect(ann.errors).toEqual([]); expect(gm.errors).toEqual([]);
});

test('the GM: a loot card leads with Show to players and shows its note; a new enemy starts hidden until shown', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(gm, 'Warden').click();
  await expect(gm.locator('#panel [data-do=attackToggle]')).toHaveCount(0);
  await expect(gm.locator('#panel [data-do=visible].main')).toHaveText('Show to players');
  await expect(gm.locator('#panel .gmnote')).toContainText('reveal when the ghoul is down');
  await card(gm, 'Ceiling Groans').click(); await expect(gm.locator('#panel [data-do=attackToggle]')).toHaveCount(0);
  await card(gm, 'Pit Ghoul').click(); await expect(gm.locator('#panel [data-do=attackToggle]')).toBeVisible();
  await gm.locator('[data-do=deselect]').click(); await gm.locator('[data-do=gmtab][data-t=scene]').click(); await gm.locator('[data-do=addEnemy]').click();
  await expect(gm.locator('#panel')).toContainText('Players do not see this card yet');
  await gm.locator('[data-edit=name]').fill('Bone Hound'); await gm.locator('[data-edit=name]').press('Enter'); await saved(gm);
  await expect(card(gm, 'Bone Hound')).toBeVisible();
  await expect.poll(async () => Object.values((await state(ann)).cards).some((c) => c.name === 'Bone Hound' || c.name === 'Nameless Creature')).toBe(false);
  await gm.locator('[data-do=cardEditDone]').click(); await gm.locator('#panel [data-do=visible]').click(); await saved(gm);
  await expect(card(ann, 'Bone Hound')).toBeVisible();
  expect(gm.errors).toEqual([]);
});

test('a hero with nothing to use is not told to choose an item', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await card(ann, 'Pit Ghoul').click();
  await expect(ann.locator('#panel .hint')).toContainText('choose what you are using below');
  await ann.locator('#strip [data-do=sheet]').click(); await ann.locator('[data-sh=remove]').first().click(); await ann.locator('[data-sh=close]').first().click(); await saved(ann);
  await card(ann, 'Pit Ghoul').click();
  await expect(ann.locator('#panel .hint')).toHaveText('To attack or try this, tap a stat below to roll against it.');
  expect(ann.errors).toEqual([]);
});
