// The Rising Horror on the screen: the meter in the top bar for everyone, rising when a spell is cast, the GM's alert at a threshold, the arrival at 21 for
// everyone, and the GM's controls (players have none). A GM and a player in separate windows. Set HORROR_SHOTS=<folder> to keep pictures of each step.
import { test, expect } from '@playwright/test';
import { newPage, makeTable, joinTable, claimHero, saved, state } from './helpers.mjs';

const SHOTS = process.env.HORROR_SHOTS || '';
const shot = (page, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${name}.png` }) : Promise.resolve());
const meter = (page) => page.locator('#tHorror .hz-meter');
async function setup(browser, viewport) {
  const gm = await newPage(browser), ann = await newPage(browser, viewport);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  /* Ann takes the Ashen Psalter on her sheet (a player may choose one grimoire) */
  await ann.locator('#strip [data-do=sheet]').click();
  await ann.locator('#sheetOverlay #shAdd').selectOption('embers'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(ann.locator('#sheetOverlay .sh-item', { hasText: 'The Ashen Psalter' })).toContainText('Pillar of Ash');
  await ann.locator('#sheetOverlay [data-sh=close]').click(); await saved(ann);
  return { gm, ann };
}
async function castKindle(ann) {
  if (!(await ann.locator('#strip [data-do=useItem]').count())) await ann.locator('[data-do=toggle][data-key=items]').click();
  await ann.locator('#strip [data-do=useItem]', { hasText: 'Kindle' }).click(); await saved(ann);
}
async function gmSet(gm, n) {
  await gm.locator('[data-do=gmtab][data-t=table]').click();
  await gm.locator('#hzSet').fill(String(n)); await gm.locator('[data-do=horrorSet]').click(); await saved(gm);
}

test('The Horror: everyone sees one meter; a spell raises it; the GM is alerted at 7; at 21 everyone is told; only the GM has controls and Undo', async ({ browser }) => {
  test.setTimeout(90000);
  const { gm, ann } = await setup(browser);
  await expect(meter(gm)).toHaveAttribute('aria-valuenow', '0'); await expect(meter(ann)).toHaveAttribute('aria-valuenow', '0');
  await expect(ann.locator('#tHorror')).toContainText('0/21');

  await castKindle(ann);   // Kindle: no roll, 1 Horror
  await expect(meter(ann)).toHaveAttribute('aria-valuenow', '1'); await expect(meter(gm)).toHaveAttribute('aria-valuenow', '1');
  await expect(ann.locator('#strip [data-do=useItem]', { hasText: 'Kindle' })).toContainText('no roll · Horror 1');
  await ann.locator('[data-do=feed]').click();
  await expect(ann.locator('#feed li.horror')).toContainText('Thorne read from The Ashen Psalter. The Horror rises 1 (now 1).');
  await expect(ann.locator('#feed li.horror [data-do=undo]')).toHaveCount(0);   // a player cannot take the Horror back
  await expect(ann.locator('[data-do=horrorAdj], [data-do=horrorSet]')).toHaveCount(0);
  await shot(ann, '1-player-after-kindle');

  await gmSet(gm, 6); await castKindle(ann);
  await expect(meter(gm)).toHaveAttribute('aria-valuenow', '7');
  await expect(gm.locator('#banner .alert.hz')).toContainText('The Horror stirs.');
  await expect(ann.locator('#banner .alert.hz')).toHaveCount(0);   // the players read it in the feed; the alert is the GM's
  await expect(ann.locator('#feed')).toContainText('The Horror stirs.');
  await shot(gm, '2-gm-threshold-alert');
  await gm.locator('[data-do=horrorAck]').click(); await saved(gm); await expect(gm.locator('#banner .alert.hz')).toHaveCount(0);

  /* the GM's Undo on the rise puts it back */
  await gm.locator('[data-do=feed]').click();
  await gm.locator('#feed li.horror', { hasText: 'rises 1 (now 7)' }).locator('[data-do=undo]').click(); await saved(gm);
  await expect(meter(gm)).toHaveAttribute('aria-valuenow', '6'); await expect(meter(ann)).toHaveAttribute('aria-valuenow', '6');

  await gm.locator('[data-do=horrorAdj][data-d="1"]').click(); await saved(gm); await expect(meter(gm)).toHaveAttribute('aria-valuenow', '7');
  /* lowering by a d6: the server rolls it, and everyone reads the roll in the feed */
  await gm.locator('[data-do=horrorRoll]').click(); await saved(gm);
  await expect(ann.locator('#feed')).toContainText(/Horror d6: [1-6]\. The GM lowers the Horror by [1-6] \(now [0-6]\)\./);
  const afterRoll = (await state(gm)).horror.cur; expect(afterRoll).toBeLessThan(7); await expect(meter(ann)).toHaveAttribute('aria-valuenow', String(afterRoll));
  await shot(gm, '5-gm-lowered-by-d6');
  await gmSet(gm, 21);
  await expect(ann.locator('#banner .alert.hz')).toContainText('The Horror has arrived.');
  await expect(gm.locator('#banner .alert.hz')).toContainText('The Horror has arrived.');
  await expect(meter(ann)).toHaveClass(/arrived/);
  await shot(ann, '3-player-arrived'); await shot(gm, '4-gm-arrived-controls');
  await ann.locator('[data-do=arrivalSeen]').click(); await expect(ann.locator('#banner .alert.hz')).toHaveCount(0);
  /* reset asks first: the first press only turns the button into "Sure?" */
  await gm.locator('[data-do=horrorReset]').click(); await expect(gm.locator('[data-do=horrorReset]')).toHaveText('Sure? Reset to 0'); await shot(gm, '6-gm-reset-asks');
  expect((await state(gm)).horror.cur).toBe(21);
  await gm.locator('[data-do=horrorReset]').click(); await saved(gm);
  await expect(meter(ann)).toHaveAttribute('aria-valuenow', '0');
  await expect(gm.locator('[data-do=horrorRoll]')).toBeDisabled();
  expect((await state(gm)).horror.alert).toBe(0);
  expect(ann.errors).toEqual([]); expect(gm.errors).toEqual([]);
});

test('@phone The Horror at 360×640: the meter fits in the top bar beside the turn, with no sideways scroll, and the grimoire with no title is read with one button', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser, { width: 360, height: 640 });
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  const thorne = Object.values((await state(gm)).chars).find((c) => c.name === 'Thorne');
  /* the GM hands Thorne the grimoire with no title (a find: only the GM can) on Thorne's sheet */
  await gm.locator('[data-do=gmstrip]').click(); await gm.locator('#actAs').selectOption(thorne.id);
  await gm.locator('#strip [data-do=sheet]').click(); await gm.locator('#sheetOverlay #shAdd').selectOption('untitled'); await gm.locator('#sheetOverlay [data-sh=add]').click();
  await gm.locator('#sheetOverlay [data-sh=close]').click(); await saved(gm);
  await gmSet(gm, 12);
  const box = await meter(ann).boundingBox(); expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(await ann.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  await expect(ann.locator('#tHorror')).toContainText('12/21');
  await ann.locator('[data-do=toggle][data-key=items]').click();
  const read = ann.locator('#strip [data-do=useItem]', { hasText: 'Read Grimoire with no title' }); await expect(read).toHaveCount(1);
  await expect(read).toContainText('d4 spell');
  await read.click(); await saved(ann);
  await expect(ann.locator('#toast')).toContainText(/The die shows [1-4]: /);
  const after = +(await meter(ann).getAttribute('aria-valuenow')); expect(after).toBeGreaterThan(12);
  await shot(ann, '5-player-phone-after-reading');
  expect(ann.errors).toEqual([]); expect(gm.errors).toEqual([]);
});
