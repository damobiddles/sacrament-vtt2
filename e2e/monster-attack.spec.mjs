// The GM's monster attacks, in a real browser: a GM and a player in separate windows.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

async function startTable(browser) {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  const ghoul = gm.locator('#cards .c', { hasText: 'Pit Ghoul' }); await ghoul.click(); await gm.locator('[data-do=attackToggle]').click();   // the attack form opens from “Attack a hero…”
  await gm.locator('#panel input[data-edit=attack]').fill('3'); await gm.locator('#panel input[data-edit=attack]').blur(); await saved(gm);
  await gm.locator('#atkHero').selectOption({ label: /Thorne/ }).catch(async () => { await gm.locator('#atkHero').selectOption({ index: 0 }); });
  return { gm, ann, ghoulId: await ghoul.getAttribute('data-id') };
}
/** the activity feed is folded to its last line until opened */
const openFeed = async (page) => { if ((await page.locator('#feed [data-do=feed]').first().getAttribute('aria-expanded')) !== 'true') await page.locator('#feed [data-do=feed]').first().click(); };
const thorneHp = async (page) => { const st = await state(page); return Object.values(st.cards).find((c) => c.name === 'Thorne').hp.cur; };

test('a hit: the GM presses Roll damage and it comes off the hero at once; the player sees it and the hero strip updates', async ({ browser }) => {
  const { gm, ann } = await startTable(browser);
  await expect(gm.locator('#atkHero')).toContainText('Thorne · Defence 14');
  await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
  await expect(gm.locator('#panel .calc.ok')).toContainText('against Defence 14. Hit.');
  await expect(gm.locator('[data-do=monsterEffort]')).toHaveCount(1); await expect(gm.locator('[data-do=monsterEffort]')).toContainText('Roll damage: Weapons d6');   // one button, the damage not yet rolled
  expect(await thorneHp(ann)).toBe(10);
  await gm.locator('#physE').fill('4'); await gm.locator('[data-do=monsterEffort][data-cat=weapons]').click();
  await expect(gm.locator('#panel')).toContainText('Applied');
  await saved(gm);
  await expect.poll(() => thorneHp(ann)).toBe(6);                      // d6 shows 4, no bonus: 10 - 4
  await expect(ann.locator('#strip .def')).toContainText('14');
  await openFeed(ann);
  await expect(ann.locator('#feed')).toContainText('Pit Ghoul attacks Thorne');
  await expect(ann.locator('#feed')).toContainText('HP -4 (now 6/10)');
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('a miss: no damage is offered and nothing changes', async ({ browser }) => {
  const { gm, ann } = await startTable(browser);
  await gm.locator('#physA').fill('1'); await gm.locator('[data-do=monsterAttack]').click();
  await expect(gm.locator('#panel .calc.bad')).toContainText('Miss');
  await expect(gm.locator('[data-do=monsterEffort]')).toHaveCount(0);
  await openFeed(ann);
  await expect(ann.locator('#feed')).toContainText('Pit Ghoul attacks Thorne');
  expect(await thorneHp(ann)).toBe(10);
});

test('Undo puts the hit points back, and a hero at 0 is marked dying for everyone', async ({ browser }) => {
  const { gm, ann } = await startTable(browser);
  await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
  await gm.locator('[data-do=monCat][data-cat=ultimate]').click(); await gm.locator('#physE').fill('12'); await gm.locator('[data-do=monsterEffort][data-cat=ultimate]').click();
  await expect(gm.locator('#panel')).toContainText('is down: DYING');   // a hero at 0 starts the d4 countdown (e2e/dying.spec.mjs)
  await expect.poll(() => thorneHp(ann)).toBe(0);
  await expect(ann.locator('#strip .atzero')).toBeVisible();
  await expect(ann.locator('#cards .c.down')).toContainText('DYING');
  await expect(gm.locator('#cards .c.down')).toContainText('DYING');
  await openFeed(gm);
  await gm.locator('#feed li', { hasText: 'HP -10' }).locator('[data-do=undo]').click();   // the damage line (the countdown has a line of its own)
  await expect.poll(() => thorneHp(ann)).toBe(10);
  await expect(ann.locator('#cards .c.down')).toHaveCount(0);
});

test('a player has no attack controls, and a hidden monster is "Something" in their feed', async ({ browser }) => {
  const { gm, ann, ghoulId } = await startTable(browser);
  await ann.locator('#cards .c', { hasText: 'Pit Ghoul' }).click();
  await expect(ann.locator('[data-do=monsterAttack]')).toHaveCount(0);
  await expect(ann.locator('input[data-edit=attack]')).toHaveCount(0);
  await gm.locator(`#cards .c[data-id="${ghoulId}"]`).click(); await gm.locator('[data-do=visible]').click(); await saved(gm);
  await gm.locator('#physA').fill('20'); await gm.locator('[data-do=monsterAttack]').click();
  await gm.locator('[data-do=monCat][data-cat=basic]').click(); await gm.locator('#physE').fill('2'); await gm.locator('[data-do=monsterEffort][data-cat=basic]').click(); await saved(gm);
  await openFeed(ann); await openFeed(gm);
  await expect(ann.locator('#feed')).toContainText('Something attacks Thorne');
  await expect(ann.locator('#feed')).not.toContainText('Pit Ghoul');
  await expect(gm.locator('#feed')).toContainText('Pit Ghoul attacks Thorne');
});
