// The Stranger at the table (an optional rule, the owner's go-ahead 2026-11-11): the GM deals the slips from the Table tab, the chosen player alone sees
// "You are the Stranger" and their want in their panel, and the GM enters the name the players agree on.
import { test, expect, newPage, makeTable, joinTable, claimHero, saved } from './helpers.mjs';

test('table: the GM deals the Stranger, one player alone reads it, and the table names a hero', async ({ browser }) => {
  test.setTimeout(120000);
  const gm = await newPage(browser), p = [await newPage(browser), await newPage(browser), await newPage(browser)];
  const code = await makeTable(gm);
  const heroes = ['Thorne', 'Wisp', 'Tilda the Ratcatcher'];
  for (let i = 0; i < 3; i++) { await joinTable(p[i], code, 'P' + i); await claimHero(p[i], heroes[i]); await saved(p[i]); }
  await gm.locator('[data-do=gmtab][data-t=table]').click();
  await gm.locator('[data-do=strangerDeal]').click(); await saved(gm);
  await expect(gm.locator('#panel')).toContainText('The Stranger is');
  const name = await gm.locator('#panel p:has-text("The Stranger is") b').textContent();
  await expect.poll(async () => { const n = []; for (const x of p) n.push(await x.locator('.stranger-slip').count()); return n.reduce((a, b) => a + b, 0); }, { timeout: 15000 }).toBe(1);
  const k = heroes.indexOf(name);
  await expect(p[k].locator('.stranger-slip')).toContainText('Your want:');
  if (process.env.STRANGER_SHOTS) { await p[k].screenshot({ path: `${process.env.STRANGER_SHOTS}/table-stranger-player.png` }); await gm.locator('#panel').screenshot({ path: `${process.env.STRANGER_SHOTS}/table-stranger-gm.png` }); }
  /* the table names the right hero */
  await gm.locator('#strangerPick').selectOption({ label: name }); await gm.locator('[data-do=strangerName]').click(); await saved(gm);
  await expect(gm.locator('#panel')).toContainText(': right.');
  await expect(p[k].locator('.stranger-slip')).toHaveCount(0, { timeout: 15000 });
  for (const x of [gm, ...p]) expect(x.errors).toEqual([]);
});

test('table: the player of a hero who has died types their last words, and the table reads them', async ({ browser }) => {
  test.setTimeout(90000);
  const gm = await newPage(browser), ann = await newPage(browser), bo = await newPage(browser);
  const code = await makeTable(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne'); await joinTable(bo, code, 'Bo');
  const card = await ann.evaluate(() => Object.values(window.__vtt.state().chars).find((c) => c.name === 'Thorne').cardId);
  /* the GM brings Thorne down and runs out the countdown, through the table's own commands */
  await gm.evaluate(async (id) => { const send = window.__vtt.send; await send({ type: 'track', id, field: 'hp', mode: 'set', value: 0 }); for (let i = 0; i < 3; i++) await send({ type: 'dying', cardId: id, op: 'round', d: -1 }); }, card);
  await expect(ann.locator('#lastWords')).toBeVisible({ timeout: 15000 });
  await ann.locator('#lastWords').fill('Keep the lamp lit.');
  await ann.locator('[data-do=lastWords]').click(); await saved(ann);
  await expect(bo.locator('#feed')).toContainText('The last words of Thorne: “Keep the lamp lit.”', { timeout: 15000 });
  await expect(ann.locator('.down-help')).toContainText('Their last words: “Keep the lamp lit.”');
  if (process.env.STRANGER_SHOTS) await ann.screenshot({ path: `${process.env.STRANGER_SHOTS}/table-last-words.png` });
  for (const x of [gm, ann, bo]) expect(x.errors).toEqual([]);
});
