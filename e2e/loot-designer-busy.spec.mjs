// The loot designer takes one action at a time. On a slow table a second Save or Give pressed while the first was still on its way was dropped
// silently, so an edit made straight after saving was lost and a Give did nothing. Its action buttons now wait, visibly, until the table has answered.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';

test.setTimeout(120000);
const designer = (page) => page.locator('#lootOverlay');
const heroGear = async (page, name) => (Object.values((await state(page)).chars).find((c) => c.name === name).gear || []);
async function setup(browser) {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await expect(async () => { await gm.locator('[data-do=gmtab][data-t=loot]').click(); await expect(gm.locator('[data-do=designLoot]')).toBeVisible({ timeout: 1500 }); }).toPass({ timeout: 15000 });
  /* a slow table: it applies each action at once, but its answer takes 2.5 s to reach the browser. The browser's own regular check (every second) shows the change meanwhile. */
  await gm.route('**/.netlify/functions/vtt', async (r) => { if (r.request().method() !== 'POST') return r.continue(); const answer = await r.fetch(); await new Promise((ok) => setTimeout(ok, 2500)); await r.fulfill({ response: answer }); });
  return { gm, ann };
}

test('on a slow table the designer\'s buttons wait for the answer, so a second Save lands and a double-clicked Give gives once', async ({ browser }) => {
  const { gm, ann } = await setup(browser);
  await gm.locator('[data-do=designLoot]').click();
  const d = designer(gm);
  await d.locator('[data-lf=name]').fill('Sexton Lantern'); await d.locator('[data-lb=save]').click();
  await expect(d.locator('#ltLib')).toContainText('Sexton Lantern');              // the library already shows it (from the table's state), before the answer has arrived
  await expect(d.locator('[data-lb=save]')).toBeDisabled();                       // ...so the buttons wait, and say so
  await expect(d.locator('#ltLib [data-lb=give]')).toBeDisabled();
  await expect(d.locator('#ltLib [data-lb=give]')).toHaveAttribute('title', /Saving/);
  await expect(d.locator('[data-lb=save]')).toBeEnabled({ timeout: 20000 });      // the answer arrived
  await expect(d.locator('#ltLib [data-lb=give]')).toBeEnabled();
  await d.locator('[data-lf=name]').fill('Sexton Lantern II'); await d.locator('[data-lb=save]').click();
  await expect(d.locator('#ltLib')).toContainText('Sexton Lantern II'); await expect(d.locator('#ltLib')).toContainText('Library (1)');   // an edit, not a second item
  await expect(d.locator('[data-lb=save]')).toBeEnabled({ timeout: 20000 });
  await d.locator('#ltLib [data-lhero]').selectOption({ label: 'Thorne' });
  await d.locator('#ltLib [data-lb=give]').dblclick(); await saved(gm);
  await expect.poll(async () => (await heroGear(gm, 'Thorne')).length).toBe(1);
  await gm.waitForTimeout(3500); expect((await heroGear(gm, 'Thorne')).length, 'a double click gave it once').toBe(1);
  await expect.poll(async () => (await heroGear(ann, 'Thorne')).length).toBe(1);
  expect(gm.errors).toEqual([]);
});
