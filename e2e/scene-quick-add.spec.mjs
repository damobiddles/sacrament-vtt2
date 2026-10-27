// The GM's quick-add buttons (Enemy, Obstacle, Card) are what a GM reaches for when something unexpected happens mid-play.
// They must be visible on the Scene tab without scrolling the panel, however many scenes there are and on a smaller laptop window.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, saved, state } from './helpers.mjs';

const BUTTONS = ['addEnemy', 'addObstacle', 'addCard'];

async function expectQuickAddInView(gm) {
  await gm.locator('[data-do=gmtab][data-t=scene]').click();
  for (const b of BUTTONS) await expect(gm.locator('#panel [data-do=' + b + ']'), b + ' is in view without scrolling').toBeInViewport({ ratio: 1 });
}

test('the quick-add buttons are in view on the Scene tab at laptop size, with several scenes', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser); await makeTable(gm);
  await expectQuickAddInView(gm);
  for (const name of ['Cellar', 'Crypt', 'Bridge', 'Tower']) {            // a longer scene list must not push them out of sight
    await gm.locator('#newScene').fill(name); await gm.locator('#panel [data-do=newScene]').click(); await saved(gm);
  }
  await expectQuickAddInView(gm);
});

test('the quick-add buttons are in view on a smaller laptop window', async ({ browser }) => {
  const gm = await newPage(browser, { width: 1280, height: 680 }); await makeTable(gm);
  await expectQuickAddInView(gm);
});

test('the quick-add buttons still add an enemy, an obstacle and a card to the scene', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser); await makeTable(gm);
  await gm.locator('[data-do=gmtab][data-t=scene]').click();
  const count = async () => Object.keys((await state(gm)).cards).length;
  const before = await count();
  for (const [i, b] of BUTTONS.entries()) {
    await gm.locator('[data-do=gmtab][data-t=scene]').click();
    await gm.locator('#panel [data-do=' + b + ']').click(); await saved(gm);
    await expect.poll(count).toBe(before + i + 1);
  }
  expect(gm.errors).toEqual([]);
});
