// Dying and the party's rest, in a real browser: a GM and a player in separate windows. The rules are tested in test/vtt-dying.test.mjs; this checks what people see and press.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const SHOTS = process.env.DYING_SHOTS || '';   /* a folder for screenshots, when asked for */
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png' }); };
const thorne = async (page) => Object.values((await state(page)).cards).find((c) => c.name === 'Thorne');
const openFeed = async (page) => { if ((await page.locator('#feed [data-do=feed]').first().getAttribute('aria-expanded')) !== 'true') await page.locator('#feed [data-do=feed]').first().click(); };

/* The Pit Ghoul (+3) hits Thorne with a physical 20; a hit for 12 takes him from 10 to 0. */
async function attack(gm, damage) {
  await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).click(); await gm.locator('[data-do=attackToggle]').click();
  await gm.locator('#atkHero').selectOption({ index: 0 });
  await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
  await expect(gm.locator('#panel .calc.ok')).toContainText('Hit.');
  if (damage) { await gm.locator('[data-do=monCat][data-cat=ultimate]').click(); await gm.locator('#physE').fill(String(damage)); await gm.locator('[data-do=monsterEffort][data-cat=ultimate]').click(); }
}

test('a hero brought to 0 is dying for everyone; the GM marks them stable; a blow while stable starts a new d4; a Party rest stands them up', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');

  await attack(gm, 12);
  await expect(gm.locator('#panel')).toContainText('is down: DYING');
  await expect.poll(async () => (await thorne(ann)).dying && (await thorne(ann)).dying.left).toBeGreaterThan(0);
  const left = (await thorne(ann)).dying.left;
  await expect(ann.locator('#strip .atzero')).toHaveText('DYING ' + left);
  await expect(ann.locator('#cards .c.down')).toContainText('DYING ' + left);
  await openFeed(ann); await expect(ann.locator('#feed')).toContainText('Thorne falls and is dying: d4 shows ' + left);
  await gm.locator('[data-do=dismissRoll]').click().catch(() => {});
  await shot(ann, '1-player-dying');

  /* the GM's buttons in Thorne's panel */
  await gm.locator('#cards .c', { hasText: 'Thorne' }).click();
  await expect(gm.locator('#panel [data-do=dying][data-op=stable]')).toBeVisible();
  await gm.locator('#panel [data-do=dying][data-op=round][data-d="1"]').click(); await saved(gm);
  await expect.poll(async () => (await thorne(ann)).dying.left).toBe(Math.min(left + 1, 9));
  await shot(gm, '2-gm-dying-buttons');
  await gm.locator('#panel [data-do=dying][data-op=stable]').click(); await saved(gm);
  await expect(ann.locator('#strip .atzero')).toHaveText('STABLE');

  /* a new round passes a stable hero by */
  await gm.locator('[data-do=nextRound]').click(); await saved(gm);
  await expect(ann.locator('#strip .atzero')).toHaveText('STABLE');

  /* a blow on a stable hero: no damage, a new d4 */
  await gm.locator('[data-do=deselect]').first().click().catch(() => {});
  await attack(gm, 0);
  const hurt = gm.locator('[data-do=monsterEffort]'); await expect(hurt).toContainText('Hurt again: Thorne rolls a new d4');
  await shot(gm, '3-gm-hit-on-a-fallen-hero');
  await hurt.click(); await saved(gm);
  await expect(gm.locator('#panel')).toContainText('Struck.');
  await expect(ann.locator('#strip .atzero')).toContainText('DYING');

  /* the Party rest, asked twice */
  await gm.locator('[data-do=dismissRoll]').click().catch(() => {});
  await gm.locator('[data-do=deselect]').first().click().catch(() => {});
  await gm.locator('[data-do=gmtab][data-t=table]').click(); await gm.locator('#hzSet').fill('12'); await gm.locator('[data-do=horrorSet]').click(); await saved(gm);
  await gm.locator('[data-do=gmtab][data-t=play]').click();
  const rest = gm.locator('[data-do=rest]'); await expect(rest).toHaveText('Party rest');
  await shot(gm, '4-gm-party-rest');
  await rest.click(); await expect(rest).toHaveText('Sure? The party rests'); await rest.click(); await saved(gm);
  await expect.poll(async () => (await thorne(ann)).hp.cur).toBe(10);
  await expect(ann.locator('#strip .atzero')).toHaveCount(0);
  await openFeed(gm); await expect(gm.locator('#feed')).toContainText('The party rests. Thorne +10 HP (now 10/10), back on their feet; the rest are already at full. Horror 2d6');
  await expect.poll(async () => (await state(ann)).horror.cur).toBeLessThan(12);
  await shot(gm, '5-gm-after-rest');
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('a player has no countdown buttons and no Party rest', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await attack(gm, 12); await saved(gm);
  await expect(ann.locator('#strip .atzero')).toContainText('DYING');
  await ann.locator('#cards .c', { hasText: 'Thorne' }).click();
  await expect(ann.locator('#panel .atzero')).toContainText('DYING');
  await expect(ann.locator('[data-do=dying]')).toHaveCount(0);
  await expect(ann.locator('[data-do=rest]')).toHaveCount(0);
  expect(ann.errors).toEqual([]);
});
