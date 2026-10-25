// The GM's tray: four tabs (Play, Scene, Loot, Table) when nothing is selected, a toolbar of sections when a card is, and nothing of it for players.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero } from './helpers.mjs';

const tab = (page, t) => page.locator(`#panel [data-do=gmtab][data-t=${t}]`);
const body = (page) => page.locator('#panel .tabbody');

test('the GM has four persistent tabs and a short card view when a monster is, and a player has neither', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await expect(gm.locator('#panel [data-do=gmtab]')).toHaveCount(4);
  for (const t of ['Play', 'Scene', 'Loot', 'Table']) await expect(gm.locator('#panel [data-do=gmtab]', { hasText: t })).toBeVisible();
  await expect(tab(gm, 'play')).toHaveAttribute('aria-selected', 'true'); await expect(gm.locator('#panel details')).toHaveCount(0);
  await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).click();
  await expect(gm.locator('#panel [data-do=deselect]')).toBeVisible(); await expect(gm.locator('#panel .cardname')).toHaveText('Pit Ghoul');
  await expect(gm.locator('#panel [data-do=attackToggle]')).toBeVisible(); await expect(gm.locator('#panel [data-do=visible]')).toBeVisible(); await expect(gm.locator('#panel [data-do=cardEdit]')).toBeVisible();
  await expect(gm.locator('#panel [data-do=gmtab]')).toHaveCount(4); await expect(gm.locator('#panel [data-edit=name]'), 'the settings are one tap away, not on the card').toHaveCount(0);
  await expect(ann.locator('#panel [data-do=gmtab]')).toHaveCount(0);
  await ann.locator('#cards .c', { hasText: 'Pit Ghoul' }).click(); await expect(ann.locator('#panel [data-do=gmtab], [data-do=cardEdit], [data-do=attackToggle]')).toHaveCount(0);
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('each tab holds what belongs to it, the chosen tab stays chosen while a card is looked at, and there is no icon or capital letters on them', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await expect(body(gm)).toContainText('Turn order'); await expect(body(gm).locator('li')).toHaveCount(5);
  await tab(gm, 'scene').click(); await expect(tab(gm, 'scene')).toHaveAttribute('aria-selected', 'true');
  await expect(body(gm)).toContainText('The Sealed Gate'); await expect(body(gm)).toContainText('Live');
  for (const k of ['addEnemy', 'addObstacle', 'addCard']) await expect(gm.locator(`#panel [data-do=${k}]`), k).toBeVisible();
  await expect(gm.locator('#toolbar [data-do=addEnemy]')).toHaveCount(0);                      // the table's own tools are only Select, Point and Draw
  await tab(gm, 'loot').click(); await expect(gm.locator('#panel [data-do=lootRoll]')).toBeVisible(); await expect(gm.locator('#panel [data-do=designLoot]')).toBeVisible();
  await tab(gm, 'table').click(); await expect(gm.locator('#panel [data-do=copy]')).toBeVisible(); await expect(gm.locator('#panel [data-do=leave]')).toBeVisible(); await expect(gm.locator('#panel [data-do=addHero]')).toBeVisible();
  await expect(body(gm)).toContainText('House rules'); await expect(body(gm)).toContainText('Running things by hand');
  await tab(gm, 'scene').click(); await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).click(); await gm.locator('#panel [data-do=deselect]').click();
  await expect(tab(gm, 'scene')).toHaveAttribute('aria-selected', 'true');                    // back where the GM was
  await expect(gm.locator('#panel .cardname')).toHaveCount(0);                              // persistent tabs can already be selected before the card closes
  const look = await gm.evaluate(() => { const b = document.querySelector('#panel [data-do=gmtab]'); return { caps: getComputedStyle(b).textTransform, icons: document.querySelectorAll('#panel svg, #gmbar svg').length }; });
  expect(look.caps).toBe('none'); expect(look.icons, 'no icon in the tray').toBe(0);
  expect(gm.errors).toEqual([]);
});

test('Play: the turn order shows who is up, Edit order reveals the move and remove buttons, and Add lists only cards that are not in the order yet', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await expect(body(gm).locator('li.cur')).toContainText('Thorne'); await expect(body(gm).locator('[data-do=up]')).toHaveCount(0); await expect(gm.locator('#addOrder')).toHaveCount(0);
  await body(gm).locator('[data-do=editOrder]').click();
  await expect(body(gm).locator('[data-do=up]')).toHaveCount(5); await expect(gm.locator('#addOrder option')).toContainText(['The Sealed Gate']);
  const opts = await gm.locator('#addOrder option').allInnerTexts(); expect(opts, 'nobody who is already in the order is offered').not.toContain('Thorne'); expect(opts).not.toContain('Pit Ghoul');
  await gm.locator('[data-do=addOrder]').click(); await expect(body(gm).locator('li')).toHaveCount(6);
  await expect(async () => { const o = await gm.locator('#addOrder option').allInnerTexts(); expect(o).not.toContain('The Sealed Gate'); }).toPass();
  await body(gm).locator('li', { hasText: 'Wisp' }).locator('[data-do=turnTo]').click(); await expect(body(gm).locator('li.cur')).toContainText('Wisp');
  await body(gm).locator('[data-do=editOrder]').click(); await expect(body(gm).locator('[data-do=up]')).toHaveCount(0);
  expect(gm.errors).toEqual([]);
});

test('Scene: a new scene is prepared, shown to players with one button, and the first scene can be opened again', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann');
  await tab(gm, 'scene').click(); await gm.locator('#newScene').fill('The Crypt'); await gm.locator('[data-do=newScene]').click();
  const row = body(gm).locator('li', { hasText: 'The Crypt' }); await expect(row).toContainText('Preparing'); await expect(gm.locator('#banner')).toContainText('Preparing');
  await expect(ann.locator('#tStatus')).toBeVisible();
  await row.locator('[data-do=reveal]').click();
  await expect.poll(async () => (await gm.evaluate(() => window.__vtt.state().table.scene.name))).toBe('The Crypt');
  await expect.poll(async () => (await ann.evaluate(() => window.__vtt.state().table.scene.name))).toBe('The Crypt');
  await expect(body(gm).locator('li', { hasText: 'The Crypt' })).toContainText('Live');
  await body(gm).locator('li', { hasText: 'The Sealed Gate' }).locator('[data-do=openScene]').click(); await expect(gm.locator('#banner')).toContainText('Preparing');
  await body(gm).locator('li', { hasText: 'The Sealed Gate' }).locator('[data-do=reveal]').click();
  await expect.poll(async () => (await ann.evaluate(() => window.__vtt.state().table.scene.name))).toBe('The Sealed Gate');
  await expect(body(gm).locator('#bgUrl')).toHaveCount(0); await body(gm).locator('[data-do=sceneBg]').click(); await expect(gm.locator('#bgUrl')).toBeVisible();
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});

test('Table: the invite link and the code are here (not in the top bar), safe return is labelled clearly, and House rules open and close', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await expect(gm.locator('#top [data-do=copy], #top [data-do=leave]')).toHaveCount(0); await expect(gm.locator('#tStatus .pill')).toHaveCount(1);   // only the Saved note is left of the GM's status
  await expect(ann.locator('#top [data-do=leave]')).toBeVisible(); await expect(ann.locator('#tStatus .pill')).toHaveCount(2);
  await tab(gm, 'table').click(); await expect(body(gm)).toContainText(code); await expect(body(gm).locator('li', { hasText: 'Ann' }).locator('select')).toHaveValue(/./);
  await expect(gm.locator('#panel [data-do=leave]')).toHaveText('Back to my tables');
  await body(gm).locator('[data-do=gmsub][data-s=rules]').click(); await expect(body(gm)).toContainText('House rules'); await expect(gm.locator('[data-setting=nat20Ultimate]')).toBeVisible();
  await body(gm).locator('[data-do=gmsub][data-s=""]').click(); await expect(body(gm)).toContainText('Invite players');
  expect(gm.errors).toEqual([]);
});

test('a selected monster: one main button opens the attack form in place, Edit card opens the settings, Back returns, and nothing is left open on another card', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await gm.locator('#cards .c', { hasText: 'Pit Ghoul' }).click();
  await expect(gm.locator('#panel .btn.main')).toHaveCount(1); await expect(gm.locator('#panel [data-do=monsterAttack]')).toHaveCount(0);
  await gm.locator('#panel [data-do=attackToggle]').click(); await expect(gm.locator('#panel [data-do=monsterAttack]')).toBeVisible(); await expect(gm.locator('#atkHero')).toBeVisible();
  await gm.locator('#panel [data-do=cardEdit]').click(); await expect(gm.locator('#panel [data-edit=name]')).toHaveValue('Pit Ghoul');
  for (const k of ['desc', 'gmNotes']) await expect(gm.locator(`#panel [data-edit=${k}]`), k).toBeVisible();
  await expect(gm.locator('#panel [data-edit=img],#panel input[data-upload=card]')).toHaveCount(0);
  await expect(gm.locator('#panel [data-do=dup]')).toBeVisible(); await expect(gm.locator('#panel [data-do=del]')).toBeVisible(); await expect(gm.locator('#panel [data-do=hideNumbers]')).toBeVisible();
  await gm.locator('#panel [data-do=cardEditDone]').click(); await expect(gm.locator('#panel .cardname')).toHaveText('Pit Ghoul');
  await gm.locator('#cards .c', { hasText: 'Sealed Gate' }).click(); await expect(gm.locator('#panel [data-do=attackToggle]')).toHaveCount(1);   /* obstacles can now attack heroes, using the same GM controls */ await expect(gm.locator('#panel [data-edit=name]')).toHaveCount(0);
  await gm.locator('#panel [data-do=deselect]').click(); await expect(tab(gm, 'play')).toBeVisible();
  const look = await gm.evaluate(() => ({ caps: getComputedStyle(document.querySelector('#panel [data-do=gmtab]')).textTransform, icons: document.querySelectorAll('#panel svg').length })); expect(look.caps).toBe('none'); expect(look.icons).toBe(0);
  expect(gm.errors).toEqual([]);
});

test('a new card opens straight on its Edit card screen so it can be named, and Remove asks twice', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await tab(gm, 'scene').click(); await gm.locator('[data-do=addCard]').click();
  await expect(gm.locator('#panel [data-edit=name]')).toHaveValue('Unmarked Card'); await gm.locator('#panel [data-edit=name]').fill('Rusty Key'); await gm.locator('#panel [data-edit=name]').press('Tab');
  await gm.locator('#panel [data-do=cardEditDone]').click(); await expect(gm.locator('#panel .cardname')).toHaveText('Rusty Key');
  await gm.locator('#panel [data-do=cardEdit]').click(); await gm.locator('#panel [data-do=del]').click(); await expect(gm.locator('#panel [data-do=del]')).toContainText('Really'); await gm.locator('#panel [data-do=del]').click();
  await expect(tab(gm, 'play')).toBeVisible(); await expect(gm.locator('#cards .c', { hasText: 'Rusty Key' })).toHaveCount(0);
  expect(gm.errors).toEqual([]);
});

test('on a small phone (360 by 640) @phone the page does not scroll: the scene keeps its size, the tray has room and its tabs are in view, and nothing scrolls sideways', async ({ browser }) => {
  const gm = await newPage(browser, { width: 360, height: 640 }); await makeTable(gm);
  const m = await gm.evaluate(() => ({ table: Math.round(document.querySelector('#table').getBoundingClientRect().height), panel: Math.round(document.querySelector('#panel').getBoundingClientRect().height), wide: document.documentElement.scrollWidth - window.innerWidth, tall: document.documentElement.scrollHeight - window.innerHeight, top: Math.round(document.querySelector('#top').getBoundingClientRect().height) }));
  expect(m.table, 'the scene is squeezed').toBeGreaterThanOrEqual(215);
  expect(m.panel, 'the tray has no room').toBeGreaterThanOrEqual(195); expect(m.wide).toBeLessThanOrEqual(1); expect(m.tall, 'the page scrolls instead of the tray').toBeLessThanOrEqual(1);
  expect(m.top, 'the top bar takes too much of a short screen').toBeLessThanOrEqual(110);
  for (const t of ['play', 'scene', 'loot', 'table']) { const b = await tab(gm, t).boundingBox(); expect(b.x, t + ' is cut off at the left').toBeGreaterThanOrEqual(-1); expect(b.x + b.width, t + ' is cut off at the right').toBeLessThanOrEqual(361); expect(b.y + b.height, t + ' is below the screen').toBeLessThanOrEqual(640); expect(b.height).toBeGreaterThanOrEqual(40); }
});

test('spacing: in a narrow tray the turn order buttons stay inside it, and rows of buttons start at the same left edge as the rest of the tray', async ({ browser }) => {
  test.setTimeout(60000);
  const gm = await newPage(browser, { width: 1000, height: 760 }); await makeTable(gm);
  await body(gm).locator('[data-do=editOrder]').click(); await expect(body(gm).locator('[data-do=up]')).toHaveCount(5);
  const over = await gm.evaluate(() => { const p = document.querySelector('#panel').getBoundingClientRect(); return [...document.querySelectorAll('#panel .ol button')].filter((b) => b.getBoundingClientRect().right > p.right - 4).map((b) => b.textContent); });
  expect(over, 'buttons cut off at the right edge of the tray').toEqual([]);
  await tab(gm, 'scene').click();
  const lefts = await gm.evaluate(() => ['h3', '[data-do=addEnemy]', '#newScene'].map((s) => Math.round(document.querySelector('#panel .tabbody ' + s).getBoundingClientRect().left)));
  expect(new Set(lefts).size, 'headings, buttons and boxes line up: ' + lefts).toBe(1);
  await tab(gm, 'loot').click();
  const loot = await gm.evaluate(() => { const l = document.querySelector('#panel label.phys'), r = document.createRange(); r.selectNodeContents(l.firstChild); return [r.getBoundingClientRect().left, l.querySelector('input').getBoundingClientRect().left].map(Math.round); });
  expect(loot[0], 'the "Own d100" words sit at the left of their box, not centred over it').toBe(loot[1]);
  expect(gm.errors).toEqual([]);
});
