// On a slow table the table applies a change at once but its answer reaches the browser late. The browser's own regular check meanwhile shows the
// change from the table, and the sheet used to apply its still-waiting copy of the change on top of it, so a newly added item showed twice
// until the answer arrived. The table now says which of your actions it has already applied, and the sheet stops counting those twice.
import { test, expect } from './helpers.mjs';
import { newPage, makeTable, emptyPacks, joinTable, claimHero, saved } from './helpers.mjs';

test('on a slow table an added item is never shown twice while its answer is on its way', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await ann.locator('#panel [data-do=sheet]').click();
  await ann.route('**/.netlify/functions/vtt', async (r) => { if (r.request().method() !== 'POST' || !/"type":"sheet"/.test(r.request().postData() || '')) return r.continue(); const answer = await r.fetch(); await new Promise((ok) => setTimeout(ok, 4000)); await r.fulfill({ response: answer }); });
  const blades = ann.locator('#sheetOverlay .sh-item', { hasText: "Penitent's Blade" });
  await ann.locator('#sheetOverlay #shAdd').selectOption('sword'); await ann.locator('#sheetOverlay [data-sh=add]').click();
  await expect(blades).toHaveCount(1);
  // watch for 6 s, which covers several regular checks before and after the answer arrives
  const seen = new Set(); const end = Date.now() + 6000;
  while (Date.now() < end) { seen.add(await blades.count()); await ann.waitForTimeout(50); }
  expect([...seen], 'row counts seen while waiting').toEqual([1]);
  await expect(blades.first().locator('[data-sh=move]')).toBeEnabled({ timeout: 15000 });
  await saved(ann);
  expect(ann.errors).toEqual([]);
});
