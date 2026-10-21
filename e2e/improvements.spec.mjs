// The improvements of 2026-10-21 (after the UX pass), in real browsers: Your tables and the GM link, the turn reaching a player in another tab,
// trying the table from the home page, the session recap, the GM's monster library, the next session date, and installing the table on a phone.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const SHOTS = process.env.UX_SHOTS || '';   /* a folder for screenshots, when asked for */
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: SHOTS + '/' + name + '.png', fullPage: true }); };
const tokenOf = (page) => page.evaluate(() => { const s = window.__vtt.state(); return JSON.parse(localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-' + s.code)))).token; });

test('Your tables lists this browser’s tables; the GM link brings the GM back on a fresh browser', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser);
  const code = await makeTable(gm);
  await gm.locator('[data-do=gmtab][data-t=table]').click();
  await expect(gm.locator('#panel [data-do=copyKey]')).toBeVisible();
  await shot(gm, '1b-gm-link');
  /* the same browser, a second tab on the first screen: the table is listed */
  const again = await gm.context().newPage(); await again.goto('/vtt/?run');
  const row = again.locator('#myTables li', { hasText: code });
  await expect(row).toContainText('You are the GM'); await expect(row).toContainText('The Sealed Gate');
  await row.scrollIntoViewIfNeeded(); await shot(again, '1a-your-tables');
  /* forgetting asks first */
  await row.locator('[data-forget]').click(); await expect(row.locator('[data-forget]')).toContainText('Sure?');
  /* a fresh browser with the GM link is the GM, and the key is taken out of the address */
  const token = await tokenOf(gm);
  const other = await newPage(browser);
  await other.goto('/vtt/?room=' + code + '#key=' + token);
  await expect(other.locator('#app')).toBeVisible();
  expect((await state(other)).you.role).toBe('gm');
  expect(other.url()).not.toContain('#key');
  await other.goto('/vtt/?run'); await expect(other.locator('#myTables li', { hasText: code })).toContainText('You are the GM');
  expect(gm.errors).toEqual([]); expect(other.errors).toEqual([]);
});

test('the turn reaching a player in another tab marks the tab’s title and plays a chime; the chime can be turned off', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Wisp');
  await ann.locator('#strip .stat').first().hover(); await ann.mouse.down(); await ann.mouse.up();   /* a press on the page readies the sound */
  await ann.locator('#strip [data-do=toggle][data-key=more]').click(); await ann.locator('#strip [data-do=toggle][data-key=dice]').click();
  await expect(ann.locator('#strip input[data-sound]')).toBeChecked();
  /* Ann looks at another tab */
  await ann.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); });
  await gm.locator('#top [data-do=endTurn]').click(); await saved(gm);
  await expect.poll(() => ann.title(), { timeout: 15000 }).toBe('● Your turn · Sacrament RPG Table');
  expect(await ann.evaluate(() => window.__vtt.ui.chimed || 0)).toBe(1);
  /* she comes back: the title is put back */
  await ann.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(ann).toHaveTitle('Sacrament RPG Table');
  /* turned off, it stays quiet */
  await ann.locator('#strip input[data-sound]').uncheck();
  expect(await ann.evaluate(() => localStorage.getItem(Object.keys(localStorage).find((k) => k.endsWith('-sound'))))).toBe('0');
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('Try it now on the home page opens a sample table with you as the GM; trying again opens the same one', async ({ browser }) => {
  test.setTimeout(60000);
  const page = await newPage(browser);
  await page.goto('/');
  await shot(page, '3a-home-try');
  await page.getByRole('link', { name: 'Try it now' }).click();
  await expect(page.locator('#app')).toBeVisible();
  const first = await state(page); expect(first.you.role).toBe('gm'); expect(first.table.scene.name).toBe('The Sealed Gate');
  await expect(page.locator('#toast')).toContainText('This is a sample table');
  await shot(page, '3b-try-table');
  await page.goto('/vtt/?try'); await expect(page.locator('#app')).toBeVisible();
  expect((await state(page)).code).toBe(first.code);
  expect(page.errors).toEqual([]);
});

test('the GM saves a monster and adds it to another table, hidden and in the turn order', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser);
  await makeTable(gm);
  await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).first().click();
  await gm.locator('#panel [data-do=saveMonster]').click();
  await expect(gm.locator('#toast')).toContainText('Saved Pit Ghoul to your monsters');
  /* a second table in the same browser */
  await gm.goto('/vtt/?run'); await gm.locator('#makeSample').uncheck(); await gm.locator('#makeForm button[type=submit]').click(); await expect(gm.locator('#app')).toBeVisible();
  await gm.locator('[data-do=gmtab][data-t=scene]').click();
  const row = gm.locator('#panel li', { hasText: 'Pit Ghoul' }); await expect(row).toContainText('20 HP');
  await shot(gm, '5-your-monsters');
  await row.locator('[data-do=addMonster]').click(); await saved(gm);
  const st = await state(gm), ghoul = Object.values(st.cards).find((c) => c.name === 'Pit Ghoul');
  expect(ghoul.visible).toBe(false); expect(ghoul.hp).toMatchObject({ cur: 20, max: 20 }); expect(ghoul.gmNotes).toContain('bright light');
  expect(st.table.order.some((e) => e.id === ghoul.id)).toBe(true);
  /* forgetting asks first (the new card is selected: Back to the tabs) */
  await gm.locator('#panel [data-do=deselect]').click(); await gm.locator('[data-do=gmtab][data-t=scene]').click();
  await gm.locator('#panel li', { hasText: 'Pit Ghoul' }).locator('[data-do=forgetMonster]').click();
  await gm.locator('#panel li', { hasText: 'Pit Ghoul' }).locator('[data-do=forgetMonster]').click();
  await expect(gm.locator('#panel')).toContainText('None yet');
  expect(gm.errors).toEqual([]);
});

test('the next session: the GM sets it, the player sees it in their panel with calendar links; the GM’s recap shows the night', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await gm.locator('#panel #nextAt').fill('2026-10-30T19:30'); await gm.locator('#panel #nextNote').fill('Beyond the gate');
  await gm.locator('#panel [data-do=nextSet]').click(); await saved(gm);
  await expect(gm.locator('#panel')).toContainText('Beyond the gate');
  await shot(gm, '6a-gm-next-session');
  const box = ann.locator('#panel .sec.next');
  await expect(box).toContainText('Next session'); await expect(box).toContainText('Beyond the gate'); await expect(box).toContainText('30');
  await expect(box.getByRole('link', { name: 'Add to Google Calendar' })).toHaveAttribute('href', /calendar\.google\.com.*dates=20261030T/);
  await expect(box.getByRole('link', { name: 'Other calendars (.ics)' })).toHaveAttribute('href', /^data:text\/calendar/);
  await shot(ann, '6b-player-next-session');
  /* Ann rolls; the GM's recap counts it */
  await ann.locator('#strip .stat', { hasText: 'STR' }).click(); await saved(ann);
  await gm.locator('[data-do=gmtab][data-t=table]').click(); await gm.locator('[data-do=gmsub][data-s=recap]').click();
  const recap = gm.locator('#recapText');
  await expect(recap).toContainText('Thorne: 1 roll'); await expect(recap).toContainText('The Sealed Gate'); await expect(recap).toContainText('Next time:');
  await shot(gm, '4-gm-recap');
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('the table can be put on a home screen: its own manifest, starting at the table', async ({ browser }) => {
  test.setTimeout(30000);
  const page = await newPage(browser);
  await page.goto('/vtt/');
  const href = await page.locator('link[rel=manifest]').getAttribute('href'); expect(href).toBe('/vtt/manifest.webmanifest');
  const m = await page.evaluate(async (u) => (await fetch(u)).json(), href);
  expect(m.start_url).toBe('/vtt/'); expect(m.display).toBe('standalone'); expect(m.icons.some((i) => i.sizes === '512x512')).toBe(true);
  await expect(page.locator('#installBtn')).toBeHidden();   /* only shown when the browser offers to install */
  expect(page.errors).toEqual([]);
});
