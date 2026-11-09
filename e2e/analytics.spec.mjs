// Anonymous play counts in a real browser (site/analytics.js). On this computer nothing is sent (it is not the live site and the
// Website ID may be empty): the counts are only kept in SacStats.log, which is what these tests read.
import { test, expect, newPage, makeTable, saved } from './helpers.mjs';

const counted = (page) => page.evaluate(() => JSON.parse(JSON.stringify(window.SacStats.log)));

test('the table counts a new table, sitting down and a roll, with no table code or name', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser);
  const asked = []; gm.on('request', (r) => { if (/umami|\/stats\//.test(r.url())) asked.push(r.url()); });
  const code = await makeTable(gm);
  await expect.poll(async () => (await counted(gm)).map((e) => e.name)).toEqual(expect.arrayContaining(['table-created', 'table-opened']));
  await expect(gm.locator('#gmDie')).toBeVisible();
  await gm.locator('[data-do=gmDiceRoll]').click(); await saved(gm);
  await expect.poll(async () => (await counted(gm)).some((e) => e.name === 'table-roll' && e.data.kind === 'gmDice' && e.data.role === 'gm')).toBe(true);
  const log = await counted(gm);
  expect(log.find((e) => e.name === 'table-created').data).toEqual({ sample: true, kind: 'new' });
  expect(JSON.stringify(log)).not.toContain(code);
  expect(asked, 'nothing is sent to Umami from this computer').toEqual([]);
  expect(gm.errors).toEqual([]);
});

test('the solo game counts the start, places, and play time, with no hero name', async ({ browser }) => {
  test.setTimeout(60000);
  const page = await newPage(browser);
  await page.clock.install();
  /* every die shows 1, so the road always starts in the same scene, one with a way onward (the first scene is otherwise random) */
  await page.addInitScript(() => { crypto.getRandomValues = (a) => { a.fill(0); return a; }; });
  await page.goto('/solo/');
  await page.locator('#takeHero').click();
  await expect(page.locator('#game')).toBeVisible();
  const start = (await counted(page)).find((e) => e.name === 'solo-start');
  expect(start.data.path).toMatch(/^[A-Z]/); expect(start.data.hard).toBe(false); expect(start.data.scene).toMatch(/^[a-z-]+$/);
  /* walk somewhere: the first "go" choice */
  await page.locator('#choices button.go').first().click();
  await expect.poll(async () => (await counted(page)).some((e) => e.name === 'solo-place')).toBe(true);
  /* five minutes with the tab in front counts as "still playing" */
  await page.clock.runFor(5 * 60000 + 1000);
  await expect.poll(async () => (await counted(page)).find((e) => e.name === 'solo-playing')?.data.minutes).toBe(5);
  const hero = await page.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => /solo/.test(k)))).game.hero.name);
  expect(JSON.stringify(await counted(page))).not.toContain(hero);
  expect(page.errors).toEqual([]);
});

test('the ways into the table and the solo game, and downloads, are counted when pressed', async ({ browser }) => {
  test.setTimeout(30000);
  const page = await newPage(browser);
  await page.goto('/');
  const kinds = await page.evaluate(() => ['/solo/', '/play-online/', '/vtt/?try', '/downloads/players/sacrament-rules-cheat-sheet-A4.pdf', '/rules/', 'https://ko-fi.com/sacramentrpg'].map((h) => {
    const a = document.createElement('a'); a.href = h; return window.SacStats.linkEvent(a);
  }));
  expect(kinds).toEqual([['click-play-solo', {}], ['click-play-online', {}], ['click-table', { link: 'try' }], ['download', { file: 'sacrament-rules-cheat-sheet-A4' }], null, null]);
  expect(page.errors).toEqual([]);
});
