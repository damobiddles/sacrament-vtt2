// Readability of buttons and text (the site has one theme, the dark one), on a laptop and a phone: every page, and the Sacrament RPG Table in its main screens
// (before a table, GM, player, panels and folds open, tools selected, a roll with Effort, the activity feed, a message pop-up).
// It fails if any text is under 4.5:1, or any button's label is under 4.5:1 in any state (normal, hover, pressed, keyboard focus, selected, disabled: 3:1),
// or the outline of a control that has no solid fill or label is under 3:1. See e2e/contrast-lib.mjs for how the colours are measured.
//
// To get a full list of what is wrong instead of a pass/fail, with pictures:   CONTRAST_AUDIT=1 CONTRAST_OUT=/some/folder npx playwright test e2e/contrast.spec.mjs
import { test, expect } from './helpers.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newPage, makeTable, joinTable, claimHero } from './helpers.mjs';
import { setTheme, checkScreen, bounded } from './contrast-lib.mjs';

const SCREEN_MS = 90000;   // no single screen may take longer than this to check

// CONTRAST_SET=quick checks a smaller, representative set of screens (for the checks run after every change); the default checks every screen.
const QUICK = process.env.CONTRAST_SET === 'quick';
const AUDIT = !!process.env.CONTRAST_AUDIT, OUT = process.env.CONTRAST_OUT || 'test-results/contrast';
const VIEWPORTS = { laptop: { width: 1366, height: 800 }, phone: { width: 390, height: 780 } };
const ALL_PAGES = ['/', '/the-game/', '/setting/', '/how-to-play/', '/news/', '/newsletter/', '/support/', '/privacy/', '/terms/', '/rules/', '/resources/', '/character/',
  '/blog/', '/blog/welcome/', '/adventure/', '/brand/', '/404.html', '/inventory/',
  '/vtt/', '/vtt/?join', '/vtt/?run', '/vtt/?room=ZZZZZZ'];
const QUICK_PAGES = ['/', '/how-to-play/', '/rules/', '/character/', '/vtt/?run', '/vtt/?room=ZZZZZZ'];
const PAGES = QUICK ? QUICK_PAGES : ALL_PAGES;

/** press something on the table if it can be pressed on this screen size (a phone covers some tools with its panel); never fail the test just because a screen could not be reached */
const press = (locator) => locator.click({ timeout: 4000, force: true }).catch(() => {});

/** open every fold and menu on the screen, so what is inside is measured too */
const openAll = (page) => page.evaluate(() => document.querySelectorAll('details').forEach((d) => { d.open = true; }));
/* a roll's dice land, and the panel shows the result, about a second after the roll: wait for that before checking a screen */
const landed = (page) => page.waitForFunction(() => !window.SacramentDice || !window.SacramentDice.rolling(), null, { timeout: 10000 });

async function visit(ctx, name, page, extra) {
  const { theme, vp, found } = ctx;
  const r = await bounded(checkScreen(page, theme, { perLook: AUDIT ? 0 : QUICK ? 1 : 2, ...extra }), SCREEN_MS, `checking the screen "${name}" (${theme}, ${ctx.vpName})`);
  if (AUDIT) {
    // a picture of the worst button on this screen, for the report
    const worst = [...r.buttons].filter((p) => p.rect && p.rect.w > 0).sort((a, b) => a.ratio - b.ratio).slice(0, 2);
    mkdirSync(OUT, { recursive: true });
    for (const [i, p] of worst.entries()) {
      const clip = { x: Math.max(0, p.rect.x - 30), y: Math.max(0, p.rect.y - 20), width: Math.min(vp.width, p.rect.w + 60), height: Math.min(vp.height, p.rect.h + 40) };
      await page.screenshot({ path: `${OUT}/${ctx.theme}-${ctx.vpName}-${name.replace(/[^a-z0-9]+/gi, '_')}-${i}.png`, clip }).catch(() => {});
    }
  }
  r.axe.forEach((a) => found.push({ screen: name, source: 'axe', where: a.where, text: a.text, ratio: a.ratio, needed: a.needed }));
  r.buttons.forEach((b) => found.push({ screen: name, source: 'button', where: b.el, kind: b.kind, state: b.state + (b.disabled ? ' (disabled)' : '') + (b.selected ? ' (selected)' : ''), ratio: b.ratio, needed: b.needed }));
}

// The laptop and the phone run side by side (each makes its own tables, so they cannot disturb each other).
test.describe.configure({ mode: 'parallel' });

for (const theme of ['dark']) {
  for (const vpName of ['laptop', 'phone']) {
    for (const group of QUICK ? ['all'] : ['pages', 'table']) {
    test(`${theme} theme, ${vpName}${vpName === 'phone' ? ' @phone' : ''}: text and buttons are readable on every page and table screen (${group})`, async ({ browser }) => {
      test.setTimeout(AUDIT ? 480000 : 240000);   // a whole run is about 2 to 5 minutes; much longer means something is stuck
      const vp = VIEWPORTS[vpName], found = [], ctx = { theme, vp, vpName, found };
      const page = await newPage(browser, vp);
      await setTheme(page, theme);

      // Keep each full scan bounded without extending its timeout. Both groups
      // together retain every screen and every button state in the original scan.
      if (group !== 'table') {
      // every ordinary page
      for (const path of PAGES) {
        await page.goto(path); await setTheme(page, theme);
        await page.waitForTimeout(150);
        await openAll(page);
        await visit(ctx, path, page);
      }

      // the My heroes page with a hero on it (the sheet), and the same sheet over the table
      await page.goto('/character/'); await setTheme(page, theme); await press(page.locator('[data-ready=maren]')); await page.waitForTimeout(150); await openAll(page); await visit(ctx, 'My heroes: a hero sheet', page);

      }

      if (group !== 'pages') {
      // the table: a GM
      const gm = await newPage(browser, vp); await setTheme(gm, theme);
      const code = await makeTable(gm); await setTheme(gm, theme);
      await visit(ctx, 'table GM: first look', gm);
      if (!QUICK) { await openAll(gm); await visit(ctx, 'table GM: folds open', gm); }
      await press(gm.locator('#cards .c', { hasText: 'Sealed Gate' })); await openAll(gm); await visit(ctx, 'table GM: a card selected', gm);
      if (!QUICK) { await press(gm.locator('#cards .c', { hasText: 'Thorne' }).first()); await openAll(gm); await visit(ctx, 'table GM: a hero token selected', gm); }
      await press(gm.locator('#cards .c', { hasText: 'Thorne' }).first()); await press(gm.locator('#panel [data-do=sheet]'));
      for (const id of ['sword', 'cloak', 'embers', 'wardenbell']) { await gm.locator('#sheetOverlay #shAdd').selectOption(id).catch(() => {}); await press(gm.locator('#sheetOverlay [data-sh=add]')); }
      await visit(ctx, 'table GM: a hero sheet over the table, with gear to use', gm); await gm.keyboard.press('Escape');
      // the GM's loot designer with an item in the library, and a hidden loot card selected with its Loot item section
      await press(gm.locator('#panel [data-do=deselect]')); await gm.locator('[data-do=gmtab][data-t=loot]').click(); await gm.locator('[data-do=designLoot]').click();
      await gm.locator('#lootOverlay [data-lf=name]').fill('Ghoul-Tooth Charm'); await gm.locator('#lootOverlay [data-lf=cat]').selectOption('magic'); await press(gm.locator('#lootOverlay [data-lseg=temptsHorror][data-v=true]')); await press(gm.locator('#lootOverlay [data-lb=saveplace]')); await gm.waitForTimeout(400);
      await visit(ctx, 'table GM: the loot designer', gm); await gm.keyboard.press('Escape');
      // each tab of the GM's tray
      for (const t of ['play', 'scene', 'loot', 'table']) { await press(gm.locator('#panel [data-do=deselect]')); await press(gm.locator(`[data-do=gmtab][data-t=${t}]`)); await visit(ctx, `table GM: the ${t} tab`, gm); }
      await press(gm.locator('#cards .c', { hasText: 'Ghoul-Tooth Charm' })); await openAll(gm); await visit(ctx, 'table GM: a loot card selected', gm);
      if (!QUICK) { await press(gm.locator('#toolbar .chip', { hasText: 'Point' }).first()); await visit(ctx, 'table GM: Point tool on', gm); }
      await press(gm.locator('#toolbar .chip', { hasText: 'Draw' }).first()); await visit(ctx, 'table GM: Draw tool on', gm);
      await press(gm.locator('#toolbar .chip', { hasText: 'Select' }).first());
      if (!QUICK) { await press(gm.locator('[data-do=gmtab][data-t=scene]')); await press(gm.locator('[data-do=addEnemy]')); await openAll(gm); await visit(ctx, 'table GM: a new enemy', gm); }
      await gm.keyboard.press('Escape');
      if (!QUICK) { await press(gm.locator('[data-do=feed]').first()); await visit(ctx, 'table GM: activity open', gm); }
      if (!QUICK) { await press(gm.locator('[data-do=gmtab][data-t=table]')); await press(gm.locator('[data-do=copy]').first()); await visit(ctx, 'table GM: a message pop-up', gm); }

      // the table: a player, claiming a hero and rolling
      const ann = await newPage(browser, vp); await setTheme(ann, theme);
      await joinTable(ann, code, 'Ann'); await setTheme(ann, theme);
      if (!QUICK) await visit(ctx, 'table player: choosing a hero', ann);
      await claimHero(ann, 'Thorne'); if (!QUICK) await visit(ctx, 'table player: hero claimed', ann);
      await press(ann.locator('#strip .stat').first());
      await ann.waitForTimeout(500); await landed(ann); await openAll(ann); await visit(ctx, 'table player: after a roll', ann);
      if (!QUICK) { await press(ann.locator('#strip [data-do=toggle][data-key=more]')); await press(ann.locator('#strip [data-do=toggle][data-key=effort]')); await visit(ctx, 'table player: Effort options open', ann); }
      if (!QUICK) { await press(ann.locator('#strip [data-do=toggle][data-key=dice]')); await visit(ctx, 'table player: dice options open', ann); }
      await press(ann.locator('[data-do=effort]').first()); await ann.waitForTimeout(500); await landed(ann); await visit(ctx, 'table player: an Effort result', ann);
      // a failed roll (a physical 2) with the offer to push, then pushed
      if (!QUICK) {
        if (!(await ann.locator('#strip input[data-phys]').count())) { await press(ann.locator('#strip [data-do=toggle][data-key=more]')); await press(ann.locator('#strip [data-do=toggle][data-key=dice]')); }
        await ann.locator('#strip input[data-phys]').fill('2', { timeout: 4000 }).catch(() => {}); await press(ann.locator('#strip .stat').first());
        await ann.waitForTimeout(500); await landed(ann); await visit(ctx, 'table player: a failed roll, the offer to push', ann);
        await press(ann.locator('#panel [data-do=push]')); await ann.waitForTimeout(500); await visit(ctx, 'table player: pushed', ann);
      }

      }

      if (AUDIT) { mkdirSync(OUT, { recursive: true }); writeFileSync(`${OUT}/report-${theme}-${vpName}-${group}.json`, JSON.stringify(found, null, 1)); }
      else expect(found, `unreadable text or buttons (${theme}, ${vpName}):\n` + found.slice(0, 40).map((f) => `${f.screen} | ${f.where} | ${f.kind || 'text'} ${f.state || ''} ${f.ratio} < ${f.needed}`).join('\n')).toEqual([]);
    });
    }
  }
}
