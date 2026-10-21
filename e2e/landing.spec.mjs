// The Sacrament RPG home page and its pages (/, /the-game/, /news/ and so on): every page loads, every link works, the two big buttons land in the right place in the table,
// it works on a small phone, and the newsletter form sends nothing anywhere.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, claimHero } from './helpers.mjs';

const PAGES = ['/', '/the-game/', '/setting/', '/how-to-play/', '/news/', '/newsletter/', '/support/', '/privacy/', '/terms/'];

test('every page loads, has a title and one heading, and nothing errors', async ({ browser }) => {
  const page = await newPage(browser);
  const failed = [];
  page.on('response', (r) => { if (r.status() >= 400 && !/fonts\./.test(r.url())) failed.push(r.status() + ' ' + r.url()); });
  for (const path of PAGES) {
    const res = await page.goto(path);
    expect(res.status(), path).toBe(200);
    await expect(page, path).toHaveTitle(/Sacrament RPG/);
    await expect(page.locator('h1'), path).toHaveCount(1);
    await expect(page.locator('.ic-nav'), path).toBeVisible();
  }
  expect(page.errors).toEqual([]);
  expect(failed).toEqual([]);
});

test('every link on every page works (inside this site), and none is a dead "#"', async ({ browser }) => {
  const page = await newPage(browser);
  const seen = new Map();
  for (const path of PAGES) {
    await page.goto(path);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
    for (const h of hrefs) {
      expect(h, path + ' has a dead link').not.toBe('#');
      if (/^https?:\/\/|^mailto:/.test(h)) continue;                       // outside links are not followed
      const url = new URL(h, 'http://x.test' + path), key = url.pathname + url.search;
      if (!seen.has(key)) seen.set(key, path);
    }
  }
  expect(seen.size).toBeGreaterThan(10);
  for (const [key, from] of seen) {
    const r = await page.request.get(key);
    expect(r.status(), key + ' (linked from ' + from + ')').toBe(200);
  }
});

test('the navigation bar is the same on every page and marks where you are', async ({ browser }) => {
  const page = await newPage(browser);
  let first;
  for (const path of PAGES) {
    await page.goto(path);
    const links = await page.$$eval('.ic-nav a', (as) => as.map((a) => a.textContent.trim() + '>' + a.getAttribute('href')));
    first = first || links;
    expect(links, path).toEqual(first);
    if (!path.startsWith('/privacy') && !path.startsWith('/terms')) await expect(page.locator('.ic-nav a[aria-current=page]'), path).toHaveCount(1);
  }
  expect(first.join(' ')).toContain('Home>/');
});

test('"Join a game" opens the join form first, ready for the table code, and a player can really join', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await ann.goto('/');
  await ann.getByRole('link', { name: 'Join a game' }).click();
  await expect(ann).toHaveURL(/\/vtt\/\?join$/);
  await expect(ann.locator('#joinForm')).toBeVisible();
  const joinBox = await ann.locator('#joinForm').boundingBox(), makeBox = await ann.locator('#makeForm').boundingBox();
  expect(joinBox.y).toBeLessThan(makeBox.y);                                // the join form comes first
  await expect(ann.locator('#joinCode')).toBeFocused();
  await ann.locator('#joinCode').fill(code);
  await ann.locator('#joinName').fill('Ann');
  await ann.locator('#joinForm button[type=submit]').click();
  await expect(ann.locator('#app')).toBeVisible();
  await claimHero(ann, 'Thorne');
});

test('"Run a game" opens the make-a-table form first, and a GM can really make a table', async ({ browser }) => {
  const gm = await newPage(browser);
  await gm.goto('/');
  await gm.getByRole('link', { name: 'Run a game' }).click();
  await expect(gm).toHaveURL(/\/vtt\/\?run$/);
  const joinBox = await gm.locator('#joinForm').boundingBox(), makeBox = await gm.locator('#makeForm').boundingBox();
  expect(makeBox.y).toBeLessThan(joinBox.y);
  await expect(gm.locator('#makeForm button[type=submit]')).toBeFocused();
  await gm.locator('#makeForm button[type=submit]').click();
  await expect(gm.locator('#app')).toBeVisible();
  await gm.locator('#panel [data-do=gmtab][data-t=table]').click(); await expect(gm.locator('#panel')).toContainText(/[A-Z0-9]{6}/);   // the GM finds the code under Table
});

test('arriving from the landing page does not throw away a table already in progress: it is offered as a link', async ({ browser }) => {
  const gm = await newPage(browser);
  const code = await makeTable(gm);
  await gm.goto('/vtt/?run');
  await expect(gm.locator('#entry')).toBeVisible();                          // the entry screen, not the old table
  await expect(gm.locator('#resume a')).toContainText(code);
  await gm.locator('#resume a').click();
  await expect(gm.locator('#app')).toBeVisible();
});

test('the old ways in still work: the plain table address and an invitation link', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm);
  await ann.goto('/vtt/');
  await expect(ann.locator('#entry')).toBeVisible();
  await expect(ann.locator('#inviteMsg')).toBeHidden();
  await ann.goto('/vtt/?room=' + code);
  await expect(ann.locator('#inviteMsg')).toContainText(code);
  await expect(ann.locator('#joinCode')).toHaveValue(code);
});

test('the newsletter form asks for consent and sends nothing anywhere', async ({ browser, baseURL }) => {
  const page = await newPage(browser);
  const own = new URL(baseURL).origin;                                  // this site, whether on this computer or live
  const sent = [];
  page.on('request', (r) => { if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) return;   /* the site's typefaces, loaded on every page */
    if (!r.url().startsWith(own) || r.method() !== 'GET' || /email/i.test(r.url())) sent.push(r.method() + ' ' + r.url()); });
  await page.goto('/newsletter/');
  await page.locator('#nl-email').fill('someone@example.com');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.locator('#nl-msg')).toContainText('tick the box');
  await page.locator('#nl-consent').check();
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.locator('#nl-msg')).toContainText('not switched on');
  await expect(page.locator('.ic-form')).toContainText('Signup is not switched on yet');
  await expect(page.locator('#nl-consent')).toBeVisible();
  expect(await page.locator('label.check').innerText()).toMatch(/unsubscribe/i);
  expect(sent).toEqual([]);
  expect(page.url()).not.toContain('email');
});

test('the support page has a working donate button that goes to the Ko-fi page, and says running costs money', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/support/');
  await expect(page.locator('main')).toContainText('costs money');
  await expect(page.locator('main a:has-text("Donate")')).toHaveAttribute('href', 'https://ko-fi.com/sacramentrpg');
  await expect(page.locator('#donate')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('coming soon');
});

test('placeholders for the owner are clearly marked on the setting page', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/setting/');
  expect(await page.locator('blockquote.todo').count()).toBeGreaterThanOrEqual(6);
  await expect(page.locator('blockquote.todo').first()).toContainText('YOUR TEXT HERE');
});

for (const [w, h] of [[360, 640], [390, 780]]) {
  test(`on a ${w}×${h} phone nothing scrolls sideways, the two buttons are easy to tap, and text is readable @phone`, async ({ browser }) => {
    const page = await newPage(browser, { width: w, height: h });
    for (const path of PAGES) {
      await page.goto(path);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, font: parseFloat(getComputedStyle(document.body).fontSize) }));
      expect(m.sw, path + ' scrolls sideways').toBeLessThanOrEqual(m.iw);
      expect(m.font, path).toBeGreaterThanOrEqual(16);
    }
    await page.goto('/');
    for (const name of ['Join a game', 'Run a game']) {
      const box = await page.getByRole('link', { name }).boundingBox();
      expect(box.height, name).toBeGreaterThanOrEqual(44);
      expect(box.x, name).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, name).toBeLessThanOrEqual(w);
    }
    // both buttons are visible without scrolling on the smallest phone
    const lowest = await page.getByRole('link', { name: 'Run a game' }).boundingBox();
    expect(lowest.y + lowest.height).toBeLessThanOrEqual(h);
  });
}

test('the home page has no sign-up form and no link to one, and still has its buttons', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('Sacrament RPG');
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('#join')).toHaveCount(0);
  await expect(page.getByText('Sign up for playtests')).toHaveCount(0);
  await expect(page.locator('a[href*="#join"], a[href*="thanks"]')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Join a game' })).toHaveAttribute('href', '/vtt/?join');
  await expect(page.getByRole('link', { name: 'Run a game' })).toHaveAttribute('href', '/vtt/?run');
  await expect(page.getByRole('link', { name: 'Build and manage characters' })).toHaveAttribute('href', '/character/');
});

test('the "Build and manage characters" button opens the character sheet page, and fits a phone @phone', async ({ browser }) => {
  const page = await newPage(browser, { width: 390, height: 844 });
  await page.goto('/');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); expect(wide).toBeLessThanOrEqual(1);
  await page.getByRole('link', { name: 'Build and manage characters' }).click();
  await expect(page).toHaveURL(/\/character\/$/);
  await expect(page.locator('h1')).toHaveText('My heroes');
  await expect(page.locator('#sheetHere')).toContainText('no heroes saved');   // the page's own script has started
  await page.locator('#newHero').click();
  await expect(page.locator('#sheetHere')).toContainText('Scores');
});

test('nothing on any page of the site links to the removed sign-up, and its thank-you page is gone', async ({ browser }) => {
  const page = await newPage(browser);
  for (const path of ['/', '/news/', '/blog/welcome/', '/how-to-play/', '/newsletter/']) {
    await page.goto(path);
    await expect(page.locator('a[href*="#join"], a[href*="/thanks"]'), path).toHaveCount(0);
  }
  const r = await page.goto('/thanks/'); expect(r.url().endsWith('/thanks/') && r.status() === 200 && /counted/i.test(await page.content()), 'the thank-you page is still published').toBe(false);
});
