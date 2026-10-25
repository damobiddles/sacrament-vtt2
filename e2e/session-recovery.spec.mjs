import { test, expect } from './helpers.mjs';
import { newPage, makeTable, joinTable, claimHero, saved } from './helpers.mjs';

test('a delayed reply from a previous table cannot replace the new table', async ({ browser }) => {
  const p = await newPage(browser); await makeTable(p);
  const old = await p.evaluate(() => window.__vtt.state()); let held;
  await p.route('**/.netlify/functions/vtt**', async route => {
    if (route.request().method() === 'GET' && !held) { held = route; return; }
    await route.continue();
  });
  await expect.poll(() => !!held).toBe(true);
  await p.locator('[data-do=gmtab][data-t=table]').click();
  await p.locator('#panel [data-do=leave]').click();
  await p.locator('#makeForm button[type=submit]').click(); await expect(p.locator('#app')).toBeVisible();
  const next = await p.evaluate(() => window.__vtt.state().code); expect(next).not.toBe(old.code);
  await held.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: old, v: old.v }) });
  // Put a current request behind the released reply before checking the visible state.
  await p.evaluate(() => fetch('/.netlify/functions/vtt?code=ZZZZZZ'));
  expect(await p.evaluate(() => window.__vtt.state().code)).toBe(next);
  await saved(p);
});

test('storage failure gives the GM a persistent recovery link that reopens the same table', async ({ browser }, testInfo) => {
  const p = await newPage(browser);
  await p.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('ic' + 'rpg-vtt-')) throw new DOMException('Storage is full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  const code = await makeTable(p);
  await expect(p.locator('#recoveryWarning')).toBeVisible();
  await expect(p.locator('#recoveryWarning')).toContainText('cannot remember');
  await p.screenshot({ path: testInfo.outputPath('recovery-warning.png'), mask: [p.locator('#recoveryLink')] });
  const link = await p.locator('#recoveryLink').inputValue();
  expect(new URL(link).searchParams.get('room')).toBe(code);
  const downloadEvent = p.waitForEvent('download'); await p.locator('#recoveryDownload').click();
  const download = await downloadEvent; expect(download.suggestedFilename()).toContain('recovery.txt');
  await p.locator('#recoveryClose').click(); await expect(p.locator('#recoveryWarning')).toBeHidden();
  await p.locator('#tStatus [data-do=showRecovery]').click(); await expect(p.locator('#recoveryWarning')).toBeVisible();
  // The same blocked browser must also be able to reopen from its saved link.
  await p.goto(link); await expect(p.locator('#app')).toBeVisible();
  expect(await p.evaluate(() => window.__vtt.state().code)).toBe(code);
  const recovery = await newPage(browser); await recovery.goto(link);
  await expect(recovery.locator('#app')).toBeVisible();
  expect(await recovery.evaluate(() => window.__vtt.state().you.role)).toBe('gm');
  expect(await recovery.evaluate(() => window.__vtt.state().code)).toBe(code);
  await expect(recovery).not.toHaveURL(/#key=/);
});

test('queued gameplay waits until checking the saved state has finished', async ({ browser }) => {
  const gm = await newPage(browser), code = await makeTable(gm), p = await newPage(browser);
  await joinTable(p, code, 'Ann'); await claimHero(p, 'Thorne');
  let changes = 0, checking, releaseFirst;
  const first = new Promise(resolve => { releaseFirst = resolve; });
  await p.route('**/.netlify/functions/vtt**', async route => {
    const req = route.request(), data = req.method() === 'POST' ? req.postDataJSON() : null;
    if (data?.cmd?.type === 'adjust') {
      changes++;
      if (changes === 1) { await first; await route.abort(); return; }
    }
    if (req.method() === 'GET' && await p.evaluate(() => window.__vtt.ui.reconcile)) { checking = route; return; }
    await route.continue();
  });
  await p.evaluate(() => {
    window.__vtt.ui.maxTries = 0;
    document.querySelector('#strip [data-do=hpAdj][data-d="-1"]').click();
    document.querySelector('#strip [data-do=hpAdj][data-d="-1"]').click();
  });
  releaseFirst(); await expect.poll(() => !!checking).toBe(true);
  expect(changes).toBe(1);
  await checking.continue(); await saved(p);
  expect(changes).toBe(2);
});

test('an open sheet keeps the intended item when another editor removes an earlier item', async ({ browser }) => {
  const p = await newPage(browser); await makeTable(p);
  await p.locator('#cards .c', { hasText: 'Thorne' }).click();
  await p.locator('#panel [data-do=sheet]').click();
  await p.locator('#sheetOverlay #shAdd').selectOption('lantern');
  await p.locator('#sheetOverlay [data-sh=add]').click(); await saved(p);
  const before = await p.evaluate(() => {
    const ch = Object.values(window.__vtt.state().chars).find(c => c.name === 'Thorne');
    return { id: ch.id, gear: ch.gear };
  });
  expect(before.gear.length).toBeGreaterThan(1);
  // Keep the sheet's old DOM while polling delivers the changed inventory.
  await p.locator('#sheetOverlay [data-text=name]').focus();
  await p.evaluate(async ({ id, key }) => {
    const s = window.__vtt.state(), k = Object.keys(localStorage).find(k => k.endsWith(s.code));
    const token = JSON.parse(localStorage.getItem(k)).token;
    const res = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { actionId: 'othereditor.1', type: 'sheet', charId: id, op: { op: 'remove', gearKey: key } } }) });
    if (!res.ok) throw new Error('Other editor failed');
  }, { id: before.id, key: before.gear[0].key });
  await expect.poll(() => p.evaluate(id => window.__vtt.state().chars[id].gear.length, before.id)).toBe(before.gear.length - 1);
  await p.locator(`#sheetOverlay [data-sh=remove][data-gear="${before.gear[1].key}"]`).click();
  await saved(p);
  const after = await p.evaluate(id => window.__vtt.state().chars[id].gear, before.id);
  expect(after.some(g => g.key === before.gear[1].key)).toBe(false);
  expect(after.map(g => g.key)).toEqual(before.gear.slice(2).map(g => g.key));
});
