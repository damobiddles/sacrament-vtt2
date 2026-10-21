// The main flows of the Sacrament RPG Table, done in a real browser the way a GM and players do them.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

test('the first screen loads and a GM can make a table with the sample encounter', async ({ browser }) => {
  const gm = await newPage(browser);
  await gm.goto('/vtt/');
  await expect(gm.locator('#makeForm')).toBeVisible();
  await expect(gm.locator('#joinForm')).toBeVisible();
  await makeTable(gm);
  await expect(gm.locator('#cards .c')).toHaveCount(8);              // four heroes, the gate, the ghoul, the countdown and the hidden bell, which only the GM sees
  await expect(gm.locator('#toolbar')).toContainText('Select');
  await expect(gm.locator('#strip')).toBeVisible();
  expect(gm.errors).toEqual([]);
});

test('a player who joins sees the table, but not what is hidden from them', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await joinTable(ann, code, 'Ann');
  await expect(ann.locator('#cards .c')).toHaveCount(7);             // everything except the hidden bell
  await expect(ann.locator('#cards')).not.toContainText('Warden');
  expect(ann.errors).toEqual([]);
});

test('a GM can place a token, name it, and drag it, and a player sees it move', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm, { sample: false });
  await joinTable(ann, code, 'Ann');

  await gm.locator('[data-do=gmtab][data-t=scene]').click(); await gm.locator('[data-do=addEnemy]').click();
  await gm.locator('[data-edit=name]').fill('Cellar Rat');
  await gm.locator('[data-edit=name]').press('Tab');
  await gm.keyboard.press('Escape');
  const token = gm.locator('#cards .c', { hasText: 'Cellar Rat' });
  await expect(token).toBeVisible();
  await expect(ann.locator('#cards .c', { hasText: 'Cellar Rat' })).toHaveCount(0);   /* new cards start hidden until the GM shows them */
  await token.click(); await gm.locator('#panel [data-do=visible]').click();
  await expect(ann.locator('#cards .c', { hasText: 'Cellar Rat' })).toBeVisible();

  const id = await token.getAttribute('data-id');
  const before = (await state(gm)).layout[id];
  const box = await token.boundingBox();
  await gm.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await gm.mouse.down();
  await gm.mouse.move(box.x + box.width / 2 + 140, box.y + box.height / 2 + 60, { steps: 8 });
  await gm.mouse.up();
  await saved(gm);

  const after = (await state(gm)).layout[id];
  expect(after.x).toBeGreaterThan(before.x + 5);
  expect(after.y).toBeGreaterThan(before.y + 3);
  await expect.poll(async () => ((await state(ann)).layout[id] || {}).x).toBeCloseTo(after.x, 1);   // the player's copy has the same place
});

test('a player claims a hero and rolls a stat: the sum, and whether it beats the Target, are shown', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await joinTable(ann, code, 'Ann');
  await claimHero(ann, 'Thorne');

  // a physical die, so the answer is known: 12 + Thorne's +3 STR = 15 against the sample's Target 12
  await ann.locator('[data-do=toggle][data-key=more]').click(); await ann.locator('[data-do=toggle][data-key=dice]').click();
  await ann.locator('#strip input[data-phys]').fill('12');
  await ann.locator('.stat[data-stat=STR]').click();
  await expect(ann.locator('#panel .calc')).toContainText('12 + 3 STR = 15 against Target 12');
  await expect(ann.locator('#panel .calc')).toContainText('Success');
  expect(ann.errors).toEqual([]);
});

test('a roll with the server’s own dice always lands between 1 and 20, plus the stat', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await joinTable(ann, code, 'Ann');
  await claimHero(ann, 'Thorne');
  for (let i = 0; i < 5; i++) {
    const before = (await state(ann)).rolls.length;
    await ann.locator('.stat[data-stat=DEX]').click();
    await expect.poll(async () => (await state(ann)).rolls.length).toBeGreaterThan(before);
    const r = (await state(ann)).rolls.at(-1);
    expect(r.check.d20).toBeGreaterThanOrEqual(1);
    expect(r.check.d20).toBeLessThanOrEqual(20);
    expect(r.check.total).toBe(r.check.d20 + r.check.mod);
    await ann.locator('[data-do=dismissRoll]').click().catch(() => {});
  }
});

test('Effort is rolled and applied to the selected enemy once, and its hearts go down', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await joinTable(ann, code, 'Ann');
  await claimHero(ann, 'Thorne');
  const ghoul = ann.locator('#cards .c', { hasText: 'Pit Ghoul' });
  const id = await ghoul.getAttribute('data-id');
  const hp0 = (await state(ann)).cards[id].hp.cur;

  await ghoul.click();
  await ann.locator('[data-do=toggle][data-key=more]').click(); await ann.locator('[data-do=toggle][data-key=dice]').click();
  await ann.locator('#strip input[data-phys]').fill('20');
  await ann.locator('.stat[data-stat=STR]').click();
  await ann.locator('#strip [data-do=roll][data-noitem]').click();   /* Thorne holds his hatchet, so the strip asks first */
  await ann.locator('#physE').fill('4');
  await ann.locator('[data-do=effort][data-cat=weapons]').click();
  const apply = ann.locator('[data-do=apply]');
  await expect(apply).toContainText('Pit Ghoul');
  await apply.click();
  await expect(ann.locator('#panel')).toContainText('Applied');
  await saved(ann);

  const hp1 = (await state(ann)).cards[id].hp.cur;
  expect(hp1).toBe(hp0 - 7);                                          // d6 shows 4, plus Thorne's +3 Weapons
  await expect(ann.locator('#cards .c', { hasText: 'Pit Ghoul' }).locator('.hearts')).toHaveCount(1);
});

test('reloading the page puts a player back at the table as the same hero', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await joinTable(ann, code, 'Ann');
  await claimHero(ann, 'Thorne');
  await ann.goto('/vtt/');                                            // no code: it remembers the table
  await expect(ann.locator('#app')).toBeVisible();
  await expect(ann.locator('#strip .me')).toContainText('Thorne');
});
