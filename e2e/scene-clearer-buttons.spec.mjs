// Scene management wording. "Open" on a scene row only opened it privately for the GM, which nothing said; it is now "Prepare", the row of the live scene
// says "Back to live" while the GM is preparing another, a line explains the difference, and a scene with nothing in it says what to do next.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, saved } from './helpers.mjs';

async function sceneTab(gm) { await gm.locator('[data-do=gmtab][data-t=scene]').click(); }

test('scene rows say Prepare and Back to live, and a line explains that players keep seeing the live scene until Show to players', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser); await makeTable(gm); await sceneTab(gm);
  const prepare = gm.locator('#panel [data-do=openScene]');
  await expect(prepare).toHaveText('Prepare');
  await expect(prepare).toHaveAttribute('aria-label', /^Prepare scene: /);
  await expect(gm.locator('#panel')).toContainText('players keep seeing the live scene until you press Show to players');
  await expect(gm.locator('#panel')).toContainText('Show another scene to players before deleting the live scene');   // the older line is still there
  await prepare.click();
  await expect(gm.locator('#panel [data-do=reveal]')).toHaveText('Show to players');
  const back = gm.locator('#panel [data-do=openScene]');
  await expect(back).toHaveText('Back to live');
  await expect(gm.locator('.pill', { hasText: 'Preparing' })).toBeVisible();
  await back.click();
  await expect(gm.locator('#panel [data-do=reveal]')).toHaveCount(0);   // back on the live scene, nothing left to show
  await expect(gm.locator('.pill', { hasText: 'Preparing' })).toHaveCount(0);
  expect(gm.errors).toEqual([]);
});

test('an empty scene says what to do next, and the hint goes once something is on it', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser); await makeTable(gm); await sceneTab(gm);
  const hint = gm.locator('#panel .scene-empty');
  await expect(hint).toHaveCount(0);                                                  // the sample scene has cards on it
  await gm.locator('#newScene').fill('Cellar'); await gm.locator('#panel [data-do=newScene]').click(); await saved(gm);
  await expect(gm.locator('.pill', { hasText: 'Preparing' })).toBeVisible();          // a scene just added is opened for preparing straight away
  await expect(hint).toBeVisible();
  await expect(hint).toContainText('Nothing on this scene yet');
  await expect(hint).toContainText('picture');                                       // it has no picture either
  await expect(hint).toContainText('Show to players');                               // it is being prepared, so it is not live yet
  await gm.locator('#panel [data-do=addEnemy]').click(); await saved(gm);
  await expect(hint).toHaveCount(0);
  expect(gm.errors).toEqual([]);
});
