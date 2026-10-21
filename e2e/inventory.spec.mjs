// The private inventory page (/inventory/): the owner's list of everything on the site. These checks make sure it stays private, stays complete, and does what it says.
import { test, expect } from './helpers.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { newPage } from './helpers.mjs';

const SITE = path.resolve('site');
const live = !!process.env.VTT_BASE;

/** every page the project builds or contains, as a web address (found by looking in the site folder) */
function sitePages() {
  const out = [];
  (function walk(dir, rel) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f), r = rel + '/' + f;
      if (fs.statSync(full).isDirectory()) { if (!['fonts', 'inventory'].includes(f)) walk(full, r); }
      else if (f === 'index.html') out.push(rel + '/');
      else if (f.endsWith('.html')) out.push(r);
    }
  })(SITE, '');
  return out.sort();
}

test('the inventory loads, is marked private, and lists the things it should', async ({ browser }) => {
  const page = await newPage(browser);
  const res = await page.goto('/inventory/');
  expect(res.status()).toBe(200);
  await expect(page.locator('h1')).toHaveText('Inventory');
  expect(await page.locator('meta[name=robots]').getAttribute('content')).toMatch(/noindex/);
  expect(await page.locator('.it').count()).toBeGreaterThan(40);
  for (const word of ['Keep', 'Archive', 'Works', 'Archived']) await expect(page.locator('body')).toContainText(word);
  expect(page.errors).toEqual([]);
});

test('it is unlisted: nothing links to it, it is not in the sitemap or robots.txt', async ({ browser }) => {
  const page = await newPage(browser);
  for (const p of sitePages()) {
    const html = await (await page.request.get(p)).text();
    expect(html, p + ' links to the inventory').not.toMatch(/href="[^"]*inventory/i);
  }
  expect(await (await page.request.get('/sitemap.xml')).text()).not.toMatch(/inventory/i);
  expect(await (await page.request.get('/robots.txt')).text()).not.toMatch(/inventory/i);
  const navjs = fs.readFileSync(path.join(SITE, 'nav.js'), 'utf8');
  expect(navjs).not.toMatch(/inventory/i);
});

test('it is complete: every page in the site folder appears in it', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/inventory/');
  const covered = await page.$$eval('.it', (els) => els.map((e) => (e.getAttribute('data-where') + ' ' + [...e.querySelectorAll('a.u')].map((a) => a.getAttribute('href')).join(' '))).join(' '));
  const missing = sitePages().filter((p) => !covered.includes(p));
  expect(missing, 'pages in the site folder that the inventory does not mention').toEqual([]);
});

test('each item has a recommendation and a decision box', async ({ browser }) => {
  const page = await newPage(browser);
  await page.goto('/inventory/');
  const n = await page.locator('.it').count();
  expect(await page.locator('.it select.decide').count()).toBe(n);
  expect(await page.locator('.it .badge[class*="rec-"]').count()).toBe(n);
  expect(await page.locator('.it .cols .badge', { hasText: 'Archived' }).count()).toBe(3);   // the three archived items are marked as done
  expect(await page.locator('#bar, .bar').count()).toBe(1);
});

test('choosing a different decision and copying gives a list the owner can paste back', async ({ browser }) => {
  const page = await newPage(browser);
  await page.addInitScript(() => { window.__copied = ''; Object.defineProperty(navigator, 'clipboard', { value: { writeText: (t) => { window.__copied = t; return Promise.resolve(); } }, configurable: true }); });
  await page.goto('/inventory/');
  const card = page.locator('.it[data-name="Brand kit"]');
  await card.locator('select.decide').selectOption('archive');
  await expect(card).toHaveClass(/changed/);
  await page.locator('#copy').click();
  await expect(page.locator('#copied')).toContainText('Copied');
  const text = await page.evaluate(() => window.__copied);
  const archiveBlock = text.split('\n\n').find((b) => b.startsWith('ARCHIVE'));
  expect(archiveBlock).toContain('Brand kit');
  expect(text.split('\n\n').find((b) => b.startsWith('KEEP'))).not.toContain('Brand kit');
});

test('on a 360×640 phone nothing scrolls sideways @phone', async ({ browser }) => {
  const page = await newPage(browser, { width: 360, height: 640 });
  await page.goto('/inventory/');
  const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  expect(m.sw).toBeLessThanOrEqual(m.iw);
});

test('on the live site every listed address answers the way the inventory says, and search engines are told to stay out', async ({ browser }) => {
  test.skip(!live, 'needs the live site: the redirects, the designer sign-in and the storage service exist only there');
  const page = await newPage(browser);
  const res = await page.goto('/inventory/');
  expect(res.headers()['x-robots-tag'] || '').toMatch(/noindex/);
  const items = await page.$$eval('.it', (els) => els.map((e) => ({ name: e.getAttribute('data-name'), href: (e.querySelector('a.u[href^="/"]') || {}).getAttribute && e.querySelector('a.u[href^="/"]').getAttribute('href'), status: e.querySelector('.cols .badge').textContent.trim() })));
  const wrong = [];
  for (const it of items.filter((i) => i.href)) {
    const r = await page.request.get(it.href, { maxRedirects: 5 });
    const code = r.status();
    const ok = { Works: code === 200 || (it.href.startsWith('/.netlify/') && code < 500), Redirect: code === 200, Archived: code === 200, Locked: code === 401, 'Nothing there': code === 404, Broken: code === 200, "Couldn't verify": code < 500 }[it.status];
    if (!ok) wrong.push(`${it.name} ${it.href}: says "${it.status}", got ${code}`);
  }
  expect(wrong).toEqual([]);
});
