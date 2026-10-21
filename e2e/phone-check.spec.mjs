// The fast phone check, run before every deploy (npm run phone-check): the home page and the table at 360×640 must not be broken, overlapping or off-screen.
// It is a smoke test, not a layout review. The full phone tests are the "phone suite" (npm run phone-suite).
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero } from './helpers.mjs';

test.setTimeout(45000);
const PHONE = { width: 360, height: 640 };

/** What is wrong on this screen: sideways scrolling, things off the edge, and controls with something else on top of them. */
async function problems(page, label) {
  const found = await page.evaluate(() => {
    const out = [], W = innerWidth, H = innerHeight;
    if (document.documentElement.scrollWidth > W + 1) out.push('the page scrolls sideways (' + document.documentElement.scrollWidth + ' wide on a ' + W + ' screen)');
    const scrolls = (e) => { const cs = getComputedStyle(e); return /(auto|scroll|hidden)/.test(cs.overflowX + cs.overflowY); };
    const name = (e) => (e.getAttribute('aria-label') || e.innerText || e.id || e.className || e.tagName).toString().replace(/\s+/g, ' ').trim().slice(0, 40);
    for (const e of document.querySelectorAll('button, a[href], input:not([type=hidden]), select, textarea, summary')) {
      const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || e.disabled) continue;
      let r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
      /* what the element can actually be seen through: the screen, narrowed by every ancestor that clips or scrolls it */
      let clip = { l: 0, t: 0, r: W, b: H }, p = e.parentElement, hidden = false;
      while (p && p !== document.body) { if (scrolls(p)) { const pr = p.getBoundingClientRect(); clip = { l: Math.max(clip.l, pr.left), t: Math.max(clip.t, pr.top), r: Math.min(clip.r, pr.right), b: Math.min(clip.b, pr.bottom) }; } p = p.parentElement; }
      const visL = Math.max(r.left, clip.l), visR = Math.min(r.right, clip.r), visT = Math.max(r.top, clip.t), visB = Math.min(r.bottom, clip.b);
      if (visR - visL < 4 || visB - visT < 4) continue;                                  // scrolled out of its own box: not on screen, not a fault
      const inScrollRow = (() => { let q = e.parentElement; while (q && q !== document.body) { const c = getComputedStyle(q); if (/(auto|scroll)/.test(c.overflowX) && q.scrollWidth > q.clientWidth + 1) return true; q = q.parentElement; } return false; })();
      if (!inScrollRow && (r.left < -1 || r.right > W + 1)) out.push('off the edge: ' + name(e) + ' (' + Math.round(r.left) + ' to ' + Math.round(r.right) + ')');
      let hit = null;                                                                  // nine points over the control: if another control sits on any of them, they overlap
      for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) {
        if (hit) break; const top = document.elementFromPoint(visL + (visR - visL) * fx, visT + (visB - visT) * fy);
        if (top && top !== e && !e.contains(top) && !top.contains(e)) { const c = top.closest('button, a[href], input, select, textarea, summary, label'); if (c && c !== e && !e.closest('label') && !c.contains(e)) hit = c; }
      }
      if (hit) out.push('overlapped: ' + name(e) + ' is covered by ' + name(hit));
    }
    return [...new Set(out)];
  });
  expect(found, `${label}:\n  ` + found.join('\n  ')).toEqual([]);
}

test('the home page and the table at 360×640 are not broken, overlapping or off-screen @phonecheck', async ({ browser }) => {
  const gm = await newPage(browser, PHONE), ann = await newPage(browser, PHONE);
  await gm.goto('/'); await expect(gm.locator('h1').first()).toBeVisible(); await problems(gm, 'the home page');
  await gm.goto('/vtt/'); await expect(gm.locator('#makeForm')).toBeVisible(); await problems(gm, 'the table’s first screen');
  await gm.locator('#makeForm button[type=submit]').click(); await expect(gm.locator('#app')).toBeVisible();
  const code = await gm.evaluate(() => window.__vtt.state().code);
  await problems(gm, 'the table as the GM');
  for (const t of ['scene', 'loot', 'table']) { await gm.locator(`#panel [data-do=gmtab][data-t=${t}]`).click(); await problems(gm, `the GM’s ${t} tab`); }
  await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).click(); await problems(gm, 'a monster selected, as the GM');
  await joinTable(ann, code, 'Ann'); await problems(gm, 'the table after a player joined');
  await problems(ann, 'the table as a player choosing a hero'); await claimHero(ann, 'Thorne'); await problems(ann, 'the table as a player with a hero');
  await ann.locator('#cards .c', { hasText: 'Pit Ghoul' }).click(); await ann.locator('#strip .stat', { hasText: 'STR' }).click();
  /* Thorne carries a hatchet, so a stat press first asks what he is using */
  await expect(ann.locator('#strip [data-do=roll][data-noitem]')).toBeVisible(); await problems(ann, 'a player choosing what to use'); await ann.locator('#strip [data-do=roll][data-noitem]').click(); await expect(ann.locator('#panel .calc')).toBeVisible(); await problems(ann, 'a player after a roll');
  expect(gm.errors, 'script errors (GM)').toEqual([]); expect(ann.errors, 'script errors (player)').toEqual([]);
});
