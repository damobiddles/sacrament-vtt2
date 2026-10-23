import { test, expect, newPage, makeTable, emptyPacks, joinTable, claimHero, saved, state } from './helpers.mjs';
import { bounded } from './contrast-lib.mjs';

test('the loot designer saves weapon and armour roles and fixes grimoires at three slots', async ({ browser }) => {
  const gm = await newPage(browser); await makeTable(gm);
  await gm.locator('[data-do=gmtab][data-t=loot]').click();
  await gm.locator('[data-do=designLoot]').click();
  const editor = gm.locator('#lootOverlay');
  await editor.locator('[data-lf=name]').fill('Heavy equipment test');
  await editor.locator('[data-lf=category]').selectOption('Weapon');
  await editor.locator('[data-lf=cat]').selectOption('weapons');
  await editor.locator('[data-lf=weaponStyle]').selectOption('heavy');
  await expect(editor.locator('[data-lf=slots]')).toHaveValue('2');
  await expect(editor.locator('#ltPrev')).toContainText('+2 heavy damage');
  await expect(editor.locator('[data-lf=cat]')).toBeDisabled();
  await editor.screenshot({ path: '/workspace/sacrament-audit/equipment-designer-preview.png' });
  await editor.locator('[data-lb=save]').click();
  await expect(editor.locator('#ltLib')).toContainText('Heavy equipment test');
  await editor.locator('#ltLib [data-lb=edit]').click();
  await expect(editor.locator('[data-lf=weaponStyle]')).toHaveValue('heavy');
  await editor.locator('[data-lf=category]').selectOption('Armour');
  await editor.locator('[data-lf=armourPart]').selectOption('head');
  await editor.locator('[data-lb=save]').click(); await saved(gm);
  await editor.locator('#ltLib [data-lb=edit]').click();
  await expect(editor.locator('[data-lf=armourPart]')).toHaveValue('head');
  await editor.locator('[data-lf=category]').selectOption('Grimoire');
  await expect(editor.locator('[data-lf=slots]')).toHaveValue('3');
  await expect(editor.locator('[data-lf=slots]')).toBeDisabled();
  expect(gm.errors).toEqual([]);
});

test('saved book loadouts show the new costs and can be rearranged without losing any item', async ({ browser }) => {
  const page = await newPage(browser);
  await page.addInitScript(() => {
    localStorage.setItem('sacrament-heroes-v2', JSON.stringify({ current: 'oldbooks', heroes: [{ id: 'oldbooks', name: 'Saved books test', stats: {}, effort: {}, hp: { cur: 20, max: 20 }, gear: ['embers', 'litany', 'dust', 'harness'].map(id => ({ id, eq: true })) }] }));
  });
  await page.goto('/character/');
  await expect(page.locator('.sh-note', { hasText: 'equipped gear uses 12 of 10 slots' })).toBeVisible();
  await expect(page.locator('.sh-spells')).toHaveCount(3);
  await page.locator('.sh-item', { hasText: 'Plate Harness' }).getByRole('button', { name: 'To the pack', exact: true }).click();
  await expect(page.locator('.sh-note', { hasText: 'equipped gear uses 12 of 10 slots' })).toHaveCount(0);
  await expect(page.locator('.sh-item')).toHaveCount(4);
  await expect(page.locator('.sh-item', { hasText: 'The Ashen Psalter' })).toContainText('3 slots');
  expect(page.errors).toEqual([]);
});

test('a player must put away their shield before a heavy attack and sees the extra damage in the shared result', async ({ browser }) => {
  const gm = await newPage(browser), ann = await newPage(browser);
  const code = await makeTable(gm); await emptyPacks(gm); await joinTable(ann, code, 'Ann'); await claimHero(ann, 'Thorne');
  await bounded(gm.evaluate(async () => {
    const s = window.__vtt.state(), ch = Object.values(s.chars).find(c => c.name === 'Thorne');
    const key = Object.keys(localStorage).find(k => k.endsWith(s.code) && !k.includes('join-'));
    const token = JSON.parse(localStorage.getItem(key)).token;
    for (const [n, id] of ['tithemaul', 'shield'].entries()) {
      const response = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token }, body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { actionId: 'equipmentgive.' + (n + 1), type: 'sheet', charId: ch.id, op: { op: 'add', id } } }) });
      if (!response.ok) throw Error('Could not give disposable equipment');
    }
  }), 15000, 'giving test equipment');
  await ann.locator('#strip [data-do=toggle][data-key=more]').click();
  await ann.locator('#strip [data-do=toggle][data-key=dice]').click();
  await ann.locator('#strip input[data-phys]').fill('15');
  await ann.locator('#strip [data-do=sheet]').click();
  const sheet = ann.locator('#sheetOverlay');
  const heavy = sheet.locator('.sh-item', { hasText: 'Tithe Barn Maul' });
  await expect(heavy).toBeVisible();
  await heavy.locator('[data-sh=use]').click();
  await expect(sheet.locator('.sh-msg')).toContainText('Move your shield to the pack first');
  await sheet.locator('.sh-item', { hasText: 'Heater Shield' }).getByRole('button', { name: 'To the pack', exact: true }).click();
  await heavy.locator('[data-sh=use]').click();
  await expect(sheet).toBeHidden();
  await ann.locator('#attackTarget').selectOption({label:'Pit Ghoul'}); await ann.locator('[data-do=confirmAttack]').click();
  await expect(ann.locator('#panel .calc.ok')).toContainText('Success');
  await expect(ann.locator('#panel [data-do=effort][data-cat=weapons]')).toContainText('+2 heavy');
  await ann.locator('#panel [data-do=effort][data-cat=weapons]').click();
  await expect(ann.locator('#panel')).toContainText('+ 2 heavy weapon');
  await expect.poll(async () => (await state(gm)).rolls.at(-1)?.effort?.weaponBonus).toBe(2);
  await ann.locator('#panel').screenshot({ path: '/workspace/sacrament-audit/equipment-damage-preview.png' });
  expect(gm.errors).toEqual([]); expect(ann.errors).toEqual([]);
});
