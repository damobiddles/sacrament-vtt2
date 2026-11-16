// Bug hunt, 16 November 2026, in a real browser (desktop Chrome, laptop size).
// 1. A dead hero's player was still offered every action (weapons, checks, the stat buttons in the bottom strip); the table refuses them all ("Thorne is dead."),
//    so each press only ended in an error. The dead cannot act (rules page, Healing, dying and rest): their player now sees why, and their last words, instead.
import { test, expect, newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const card = (page, name) => page.locator('#cards .c', { hasText: name }).first();

test('a dead hero’s player is offered no actions or rolls, only their last words; a round back brings the choices back', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  /* a check made just before the fall leaves its Effort waiting in the strip: the dead cannot roll it either */
  await ann.locator('#strip input[data-phys]').fill('18'); await ann.locator('#strip [data-do=check][data-stat=STR]').click(); await saved(ann);
  await expect(ann.locator('#strip [data-do=effort]').first()).toBeVisible();
  const thorne = Object.values((await state(gm)).cards).find((c) => c.name === 'Thorne');
  await gm.evaluate((id) => window.__vtt.send({ type: 'track', id, field: 'hp', mode: 'set', value: 0 }), thorne.id); await saved(gm);
  for (let i = 0; i < 3; i++) await gm.evaluate((id) => window.__vtt.send({ type: 'dying', cardId: id, op: 'round', d: -1 }), thorne.id);
  await saved(gm);
  await card(ann, 'Pit Ghoul').click();
  await expect(ann.locator('#panel .down-help')).toContainText('Thorne has died.');
  await expect(ann.locator('#panel .player-actions')).toHaveCount(0);
  await expect(ann.locator('#strip [data-do=check]')).toHaveCount(0);
  await expect(ann.locator('#strip [data-do=effort]')).toHaveCount(0);
  await expect(ann.locator('#strip input[data-phys]')).toHaveCount(0);
  await expect(ann.locator('#strip')).toContainText('Thorne has died');
  await expect(ann.locator('#panel [data-do=lastWords]')).toBeVisible();
  await expect(ann.locator('#panel [data-do=sheet]')).toBeVisible();
  /* the GM gives a round back: dying again, the hero may act (paying Horror), so the choices return */
  await gm.evaluate((id) => window.__vtt.send({ type: 'dying', cardId: id, op: 'round', d: 1 }), thorne.id); await saved(gm);
  await expect(ann.locator('#panel .player-actions')).toHaveCount(1);
  await expect(ann.locator('#strip [data-do=effort]').first(), 'the Effort still waiting comes back too').toBeVisible();
  expect(gm.errors.concat(ann.errors)).toEqual([]);
});
