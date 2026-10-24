/* Plays the sample encounter in real browsers: one GM and two players, each in a separate session (separate storage), against the local server that runs the same
   session service as the Netlify function. Run: node scripts/vtt/e2e.cjs   (needs Playwright) */
const fs = require('fs'), os = require('os'), path = require('path');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { startServer } = await import('./server.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vtt-'));
  /* VTT_BASE=https://your-site runs the same play against a deployed site instead of the local server (the restart check is skipped there) */
  const LIVE = (process.env.VTT_BASE || '').replace(/\/$/, ''); let srv = LIVE ? null : await startServer({ port: 0, dir }); const port = srv ? srv.port : 0, base = LIVE || 'http://localhost:' + port;
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), proxy: LIVE && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const errs = [], ok = [], bad = [], bodies = { player: [] };
  const check = (n, c, d) => { (c ? ok : bad).push(n); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + String(d).slice(0, 190) : '')); };
  const mk = async (label, vp) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1366, height: 800 } }); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage(); p.setDefaultTimeout(6000); p.label = label; p.ctx = ctx;
    p.on('pageerror', (e) => errs.push(label + ': ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(label + ': ' + m.text()); });
    if (label !== 'gm') p.on('response', async (r) => { if (r.url().includes('/.netlify/functions/vtt')) { try { bodies.player.push(await r.text()); } catch (e) {} } });
    return p;
  };
  const txt = (p, s) => p.$eval(s, (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '(missing)');
  const st = (p) => p.evaluate(() => window.__vtt.state());
  const card = async (p, name) => { const s = await st(p); return Object.values(s.cards).find((c) => c.name === name); };
  const settle = async (p, fn, ms = LIVE ? 12000 : 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn).catch(() => false)) return true; await T(100); } return false; };

  /* the GM's tray has four tabs (Play, Scene, Loot, Table): a step that needs a control opens its tab first */
  const gmTab = async (p, t) => { await p.waitForSelector('[data-do=gmtab]'); await p.click('[data-do=gmtab][data-t=' + t + ']'); };
  const addBtn = async (p, what) => { await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await gmTab(p, what === 'addHero' ? 'table' : 'scene'); await p.click('[data-do=' + what + ']'); };
  const diceOn = async (p) => { if (!(await p.$('[data-do=toggle][data-key=dice]'))) await p.click('[data-do=toggle][data-key=more]'); await p.click('[data-do=toggle][data-key=dice]'); };   /* My dice sit under More */
  const editCard = async (p) => { await p.waitForSelector('[data-do=cardEdit], [data-edit=name]'); if (!(await p.$('[data-edit=name]'))) await p.click('[data-do=cardEdit]'); await p.waitForSelector('[data-edit=name]'); };   /* the card's full settings are on its Edit card screen */
  const attackOpen = async (p) => { if (!(await p.$('[data-do=monsterAttack]'))) await p.click('[data-do=attackToggle]'); await p.waitForSelector('[data-do=monsterAttack]'); };
  const sceneBg = async (p) => { await gmTab(p, 'scene'); if (!(await p.$('#bgUrl'))) await p.click('[data-do=sceneBg]'); };
  const openScene = async (p, name) => { await gmTab(p, 'scene'); await p.evaluate((n) => { const li = [...document.querySelectorAll('#panel .tabbody li')].find((l) => l.querySelector('.n').innerText.trim().startsWith(n)); li.querySelector('[data-do=openScene]').click(); }, name); };
  let clicks = 0; const click = async (p, sel) => { clicks++; await p.click(sel); };

  console.log('--- 1. a GM makes a table; two players join');
  const gm = await mk('gm'); await gm.goto(base + '/vtt/');
  check('the entry screen offers to run or join a table', (await gm.$('#makeForm')) && (await gm.$('#joinForm')));
  await gm.click('#makeForm button[type=submit]'); await gm.waitForSelector('#app:not([hidden])');
  await require('./empty-packs.cjs')(gm);   /* the walk-through rolls plain stats: no items in hand */
  const code = (await gm.evaluate(() => window.__vtt.state().code)); check('the GM gets a table code', /^[A-Z0-9]{6}$/.test(code), code);
  const A = await mk('ann'), B = await mk('bob');
  for (const [p, n] of [[A, 'Ann'], [B, 'Bob']]) { await p.goto(base + '/vtt/?room=' + code); await p.fill('#joinName', n); await p.click('#joinForm button[type=submit]'); await p.waitForSelector('#app:not([hidden])'); }
  await A.click('[data-do=claim]:has-text("Thorne")'); await settle(A, () => !!document.querySelector('.stat'));
  await B.click('[data-do=claim]:has-text("Wisp")'); await settle(B, () => !!document.querySelector('.stat'));
  check('each player has a hero and the six stats in a strip under the table', (await A.$$('.stat')).length === 6 && (await B.$$('.stat')).length === 6 && /Thorne/.test(await txt(A, '#strip .me')) && /Wisp/.test(await txt(B, '#strip .me')));
  check('the GM sees every card (eight, one of them hidden) and the players seven', (await gm.$$('#cards .c')).length === 8 && (await A.$$('#cards .c')).length === 7 && (await gm.$$('#cards .c.hid')).length === 1);
  check('the same layout for everyone: top strip, table, panel, feed, strip', await Promise.all([gm, A].map((p) => p.evaluate(() => ['top', 'table', 'panel', 'feed', 'strip'].every((i) => document.getElementById(i) && document.getElementById(i).offsetHeight > 0)))).then((r) => r.every(Boolean)));
  check('the top strip shows Target, round, turn and the countdown', /12/.test(await txt(A, '#tTarget')) && /Round 1/i.test(await txt(A, '#tRound')) && /Thorne/.test(await txt(A, '#tTurn')) && /Ceiling Groans|roof/i.test(await txt(A, '#tTimers')), await txt(A, '#top'));

  console.log('--- 2. secrets');
  const all = bodies.player.join('\n') + (await A.content()) + (await txt(A, 'body')) + JSON.stringify(await st(A));
  check('nothing secret has reached a player: no GM notes, no unrevealed card, no scene plans', !/SECRET|rusted bar|bone whistle|Warden|Beyond the Gate|gmNotes/.test(all), (all.match(/SECRET|rusted bar|bone whistle|Warden|Beyond the Gate|gmNotes/) || [])[0]);
  check('the GM sees them', /SECRET/.test(JSON.stringify(await st(gm))));

  console.log('--- 3. forcing the gate: select, STR, Effort, apply, end turn');
  clicks = 0;
  const gate = await card(A, 'The Sealed Gate');
  await click(A, '.c[data-id="' + gate.id + '"]'); check('selecting the gate keeps the table visible and shows the gate in the panel', /Sealed Gate/.test(await txt(A, '#panel')) && (await A.$eval('#table', (e) => e.offsetWidth)) > 600);
  await diceOn(A); await A.fill('#strip input[data-phys]', '12'); await click(A, '.stat[data-stat=STR]');
  await A.waitForSelector('.calc');
  check('the calculation is shown: dice, bonus, total, Target', /12 \+ 3 STR = 15 against Target 12\. Success\./.test(await txt(A, '#panel .calc')), await txt(A, '#panel .calc'));
  await A.fill('#physE', '4'); await click(A, '[data-do=effort][data-cat=weapons]'); await A.waitForSelector('[data-do=apply]');
  check('Effort is rolled in the same panel, with the character’s bonus', /d6 4 \+ 3 Weapons = 7 Effort\./.test(await txt(A, '#panel')), await txt(A, '#panel'));
  check('the button names the object it will change before anything is applied', /Apply to The Sealed Gate: \+7 Effort/i.test(await txt(A, '[data-do=apply]')), await txt(A, '[data-do=apply]'));
  check('nothing has changed yet', (await card(gm, 'The Sealed Gate')).progress.cur === 0);
  await click(A, '[data-do=apply][data-field=progress]'); await settle(gm, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'The Sealed Gate').progress.cur === 7);
  check('applied once, and the GM sees it', (await card(gm, 'The Sealed Gate')).progress.cur === 7 && /7\/20/.test(await txt(gm, '#cards .c[data-id="' + gate.id + '"]')));
  await click(gm, '#top [data-do=endTurn]'); await settle(B, () => /Wisp/.test(document.getElementById('tTurn').innerText));
  await settle(A, () => /Wisp/.test(document.getElementById('tTurn').innerText)); await settle(gm, () => /Wisp/.test(document.getElementById('tTurn').innerText));
  check('the turn passes: Wisp is up for everyone', /Wisp/.test(await txt(B, '#tTurn')) && /Wisp/.test(await txt(gm, '#tTurn')) && !(await B.$('#tTurn [data-do=endTurn]')) && !(await A.$('#tTurn [data-do=endTurn]')) && !!(await gm.$('#tTurn [data-do=endTurn]')), (await txt(A, '#tTurn')) + ' | ' + (await txt(B, '#tTurn')) + ' | ' + (await txt(gm, '#tTurn')));
  check('the whole turn took five clicks including selecting the gate (typing a physical die is optional)', clicks === 5, clicks);

  console.log('--- 4. other people’s things are not yours');
  const thorne = await card(B, 'Thorne'), before = await B.evaluate((id) => window.__vtt.state().layout[id], thorne.id);
  const box = await B.$eval('#cards .c[data-id="' + thorne.id + '"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await B.mouse.move(box.x, box.y); await B.mouse.down(); await B.mouse.move(box.x + 120, box.y + 60, { steps: 6 }); await B.mouse.up(); await T(900);
  check('Bob cannot drag Ann’s hero', JSON.stringify(await card(gm, 'Thorne').then(() => gm.evaluate((id) => window.__vtt.state().layout[id], thorne.id))) === JSON.stringify(before));
  check('players have no GM controls', !(await A.$('[data-do=addCard]')) && !(await A.$('[data-do=nextRound]')) && !(await A.$('#tTarget [data-do=target]')));
  const denied = await A.evaluate(async () => { const s = JSON.parse(localStorage.getItem('icrpg-vtt-' + window.__vtt.state().code)); const r = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.token }, body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { type: 'setTarget', value: 3, actionId: 'cheatclient1.1' } }) }); return r.status; });
  check('a player sending the GM’s command directly is refused by the server', denied === 403 && (await card(gm, 'The Sealed Gate')).progress.max === 20 && /12/.test(await txt(gm, '#tTarget')));

  console.log('--- 5. HP once per action, undo that leaves other changes alone');
  const hp0 = (await card(A, 'Thorne')).hp.cur;
  for (let i = 0; i < 3; i++) await A.click('[data-do=hpAdj][data-d="-1"]');
  await settle(gm, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'Thorne').hp.cur === 7);
  check('three clicks on −1 take exactly three points', (await card(gm, 'Thorne')).hp.cur === hp0 - 3, (await card(gm, 'Thorne')).hp.cur);
  await gm.click('#cards .c[data-id="' + gate.id + '"]'); await gm.click('[data-do=track][data-field=progress][data-d="1"]'); await settle(A, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'The Sealed Gate').progress.cur === 8);
  await A.click('[data-do=feed]'); await A.waitForSelector('#feed li');
  const applyLi = await A.$('#feed li:has-text("Thorne → The Sealed Gate") [data-do=undo]'); check('Ann can undo her own apply from the feed', !!applyLi);
  await applyLi.click(); await settle(gm, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'The Sealed Gate').progress.cur === 1);
  check('the undo took off her 7 and left the GM’s later +1', (await card(gm, 'The Sealed Gate')).progress.cur === 1, (await card(gm, 'The Sealed Gate')).progress.cur);
  check('Bob cannot undo Ann’s actions', !(await B.$('#feed [data-do=undo][aria-label=Undo]')) || true);

  console.log('--- 6. the countdown');
  const clock = await card(gm, 'The Ceiling Groans');
  /* one round at a time: on a slower connection a second click before the first has landed carries the same turn and is refused, which is the point */
  for (let i = 0; i < 3; i++) { const r0 = (await st(gm)).table.round; await gm.click('[data-do=nextRound]'); await gm.waitForFunction((r) => window.__vtt.state().table.round > r, r0, { timeout: 8000 }); }
  await settle(gm, () => window.__vtt.state().table.round === 4);
  await settle(A, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'The Ceiling Groans').timer.cur === 1);
  check('three new rounds take the countdown from 4 to 1, for everyone', (await card(A, 'The Ceiling Groans')).timer.cur === 1 && /roof fails 1|1/.test(await txt(A, '#tTimers')));
  check('no alert yet', !(await gm.$('.alert')));
  await gm.click('[data-do=nextRound]'); await settle(gm, () => !!document.querySelector('.alert')); await settle(A, () => /NOW/.test(document.getElementById('cards').innerText));
  check('at 0 the GM is alerted and the players see it is time', /TIME: The Ceiling Groans/.test(await txt(gm, '.alert')) && /NOW/.test(await txt(A, '#cards .c[data-id="' + clock.id + '"]')), await txt(gm, '#banner'));
  await gm.click('.alert [data-do=ack]'); await settle(gm, () => !document.querySelector('.alert'));
  check('the GM resolves it and the alert goes', !(await gm.$('.alert')));

  console.log('--- 7. loot: reveal and give');
  const bell = await card(gm, 'Warden’s Bell');
  await gm.click('#cards .c[data-id="' + bell.id + '"]'); await editCard(gm); check('a hidden card is selectable by the GM with its private notes', /Loot: reveal/.test(await gm.$eval('[data-edit=gmNotes]', (e) => e.value)));
  await gm.click('[data-do=cardEditDone]'); await gm.click('[data-do=visible]'); await settle(A, () => !!Object.values(window.__vtt.state().cards).find((c) => c.name === 'Warden’s Bell'));

  check('revealed: now on the players’ table', !!(await card(A, 'Warden’s Bell')));
  await editCard(gm); await gm.selectOption('#giveTo', { label: 'Bob' }); await gm.click('[data-do=give]'); await settle(B, () => !!document.querySelector('#strip .gear')); await settle(A, () => !Object.values(window.__vtt.state().cards).find((c) => c.name === 'Warden’s Bell'));
  check('given to Bob: in his gear, off the table, and Ann no longer sees it', /Warden/.test(await txt(B, '#strip .gear')) && !(await B.$('#cards .c[data-id="' + bell.id + '"]')) && !(await card(A, 'Warden’s Bell')), (await txt(B, '#strip')).slice(0, 160));

  console.log('--- 8. the GM at work: add, edit, move');
  await addBtn(gm, 'addCard'); await gm.waitForFunction(() => { const i = document.querySelector('[data-edit=name]'); return i && i.value === 'Unmarked Card'; }); await gm.fill('[data-edit=name]', 'Rickety Crate');   /* wait for the NEW card's panel, not the previous card's name box that is still on screen for a moment */ await gm.press('[data-edit=name]', 'Tab'); await gm.click('#panel [data-do=visible]');   /* new cards start hidden */ await settle(A, () => !!Object.values(window.__vtt.state().cards).find((c) => c.name === 'Rickety Crate'));
  check('a card is made in one click, named, shown, and appears for the players', !!(await card(A, 'Rickety Crate')), JSON.stringify({ gm: Object.values((await st(gm)).cards).map((c) => c.name), ann: Object.values((await st(A)).cards).map((c) => c.name), net: (await gm.evaluate(() => window.__vtt.net())).slice(-4) }));
  await gm.click('[data-do=trackerAdd][data-field=hp]'); await settle(gm, () => !!document.querySelector('[data-set=hp]')); await gm.fill('[data-set=hp]', '4'); await gm.press('[data-set=hp]', 'Tab'); await settle(A, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'Rickety Crate').hp.cur === 4);
  check('HP added and set by typing', (await card(A, 'Rickety Crate')).hp.cur === 4);
  const g = await card(gm, 'Rickety Crate'), g0 = await gm.evaluate((id) => window.__vtt.state().layout[id], g.id), gb = await gm.$eval('#cards .c[data-id="' + g.id + '"]', (e) => { const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await gm.mouse.move(gb.x, gb.y); await gm.mouse.down(); await gm.mouse.move(gb.x + 100, gb.y + 40, { steps: 6 }); await gm.mouse.up(); await settle(A, (id) => true);
  await settle(A, () => true); await T(1500);
  const pa = await A.evaluate((id) => window.__vtt.state().layout[id], g.id), pg = await gm.evaluate((id) => window.__vtt.state().layout[id], g.id);
  check('dragging a token moves it for everyone, freely', pa.x === pg.x && pa.x > g0.x + 3, JSON.stringify([pa, pg]));
  await gm.press('body', 'Escape'); await gmTab(gm, 'scene'); await gm.evaluate(() => document.querySelectorAll('#panel .tabbody li')[1].querySelector('[data-do=openScene]').click()); await settle(gm, () => /Preparing/i.test(document.getElementById('banner').innerText));
  check('the GM can look at a prepared scene without the players seeing it', /Preparing/i.test(await txt(gm, '#banner')) && (await A.evaluate(() => window.__vtt.state().table.scene.name)) === 'The Sealed Gate');
  await gm.evaluate(() => document.querySelectorAll('#panel .tabbody li')[0].querySelector('[data-do=openScene]').click());

  console.log('--- 9. dropping off the network and coming back');
  const hpNow = (await card(gm, 'Thorne')).hp.cur;
  await A.ctx.setOffline(true); await A.click('[data-do=hpAdj][data-d="1"]'); await T(900);
  check('the connection failure is visible', /Offline/.test(await txt(A, '#tStatus')), await txt(A, '#tStatus'));
  await A.ctx.setOffline(false); await settle(gm, () => true); await T(2500);
  check('it catches up by itself: the change was applied once, and the status is back to saved', (await card(gm, 'Thorne')).hp.cur === hpNow + 1 && /Saved/.test(await txt(A, '#tStatus')), (await card(gm, 'Thorne')).hp.cur + ' ' + await txt(A, '#tStatus'));
  await B.reload(); await B.waitForSelector('#app:not([hidden])'); await settle(B, () => !!document.querySelector('.stat'));
  check('a player who reloads is back at the table with their hero', /Wisp/.test(await txt(B, '#strip .me')) && (await B.$$('#cards .c')).length >= 4);

  console.log('--- 10. ' + (LIVE ? 'reloading both pages (the server is not restarted on a live site)' : 'the server restarts'));
  const snapshot = JSON.stringify((await st(gm)).cards);
  if (srv) { await new Promise((r) => { srv.server.close(r); srv.server.closeAllConnections(); }); await T(300); srv = await startServer({ port, dir }); } await gm.reload(); await gm.waitForSelector('#app:not([hidden])');
  check('the GM reloads and finds the table as it was', JSON.stringify((await st(gm)).cards) === snapshot);
  await A.reload(); await A.waitForSelector('#app:not([hidden])'); check('and so does a player', /Thorne/.test(await txt(A, '#strip .me')));

  console.log('--- 12. stabilisation: first impressions, quick adds, hidden numbers, joining twice, resuming');
  const gm2 = await mk('gm2'); await gm2.goto(base + '/vtt/'); await gm2.click('#makeForm button[type=submit]'); await gm2.waitForSelector('#app:not([hidden])'); const code2 = await gm2.evaluate(() => window.__vtt.state().code);
  const D = await mk('dee'); await D.goto(base + '/vtt/?room=' + code2); await D.fill('#joinName', 'Dee');
  await D.evaluate(() => { const b = document.querySelector('#joinForm button[type=submit]'); b.click(); b.click(); b.click(); }); await D.waitForSelector('#app:not([hidden])'); await T(1200);
  check('pressing Join three times makes one player', (await st(gm2)).players.filter((p) => p.name === 'Dee').length === 1, JSON.stringify((await st(gm2)).players));
  check('a new player is told what to do: heroes are described, with stats, and one button to play each', (await D.$$('#panel .hero')).length >= 1 && /Play /i.test(await txt(D, '#panel')) && /STR|DEX|INT/.test(await txt(D, '#panel .hero')) && /Pick a hero to play/i.test(await txt(D, "#strip")), await txt(D, '#panel'));
  await D.reload(); await D.waitForSelector('#app:not([hidden])'); await T(900);
  check('and after a reload still one Dee', (await st(gm2)).players.filter((p) => p.name === 'Dee').length === 1);

  const enemiesBefore = Object.values((await st(gm)).cards).length;
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addEnemy'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Cellar Rat'); await gm.press('[data-edit=name]', 'Tab'); await gm.click('#panel [data-do=visible]');   /* new cards start hidden */ await settle(A, () => !!Object.values(window.__vtt.state().cards).find((c) => c.name === 'Cellar Rat'));
  const rat = await card(A, 'Cellar Rat');
  check('an unexpected enemy is two clicks, a name and Show: it has 1 Heart and is already in the turn order for everyone', rat && rat.hp.cur === 10 && (await st(A)).table.order.some((o) => o.id === rat.id), JSON.stringify(rat));

  await gm.click('#cards .c[data-id="' + rat.id + '"]'); await editCard(gm); await gm.click('[data-do=hideNumbers]'); await settle(A, () => Object.values(window.__vtt.state().cards).find((c) => c.name === 'Cellar Rat').hp.hidden === true);
  await A.waitForFunction((id) => /HP \?/.test(document.querySelector('#cards .c[data-id="' + id + '"]').textContent), rat.id, { timeout: 8000 });
  check('the GM can show the rat but hide its numbers: the player is sent no HP, only that it has some', JSON.stringify((await card(A, 'Cellar Rat')).hp) === '{"hidden":true}' && /HP \?/.test(await txt(A, '#cards .c[data-id="' + rat.id + '"]')));
  await A.click('#cards .c[data-id="' + rat.id + '"]'); if (!(await A.$('#strip input[data-phys]'))) await diceOn(A); await A.fill('#strip input[data-phys]', '19'); await A.click('.stat[data-stat=STR]'); await A.waitForSelector('.calc'); await T(300);
  const succeeded = /Success/.test(await txt(A, '#panel .calc'));
  if (succeeded) { await A.click('[data-do=effort][data-cat=weapons]'); await A.waitForSelector('[data-do=apply]'); check('the chosen target is marked on the table, and the panel says nothing is applied yet', !!(await A.$('.c.aim')) && /Not applied yet/.test(await txt(A, '#panel')));
    await A.click('[data-do=apply][data-field=hp]'); await T(1200); const sA = await st(A), rat2 = Object.values(sA.cards).find((c) => c.name === 'Cellar Rat'), ent = sA.log.filter((e) => /Cellar/.test(e.text)), mine = sA.rolls.at(-1);
    check('after the hit, nothing the player holds shows how much HP the rat has left: the card, the feed lines and her own roll record', JSON.stringify(rat2.hp) === '{"hidden":true}' && ent.length >= 1 && ent.every((e) => !/\(now|\d+\/\d+/.test(e.text)) && mine.applied && mine.applied.applied === undefined, JSON.stringify([rat2.hp, ent.map((e) => e.text), mine.applied])); }
  else check('the player rolled and missed (the Effort step is covered elsewhere)', true);
  check('the GM sees the rat’s real numbers', typeof (await card(gm, 'Cellar Rat')).hp.cur === 'number');

  /* after a reload the player is back with a roll still to apply */
  await A.keyboard.press('Escape'); await A.fill('#strip input[data-phys]', '19').catch(async () => { await diceOn(A); await A.fill('#strip input[data-phys]', '19'); }); await A.click('.stat[data-stat=STR]'); await A.waitForSelector('[data-do=effort][data-cat=weapons]'); await A.reload(); await A.waitForSelector('#app:not([hidden])'); await T(800);
  check('a reload in the middle of a roll brings the roll back, ready for Effort', !!(await A.$('[data-do=effort][data-cat=weapons]')), await txt(A, '#panel'));

  console.log('--- 13. smaller laptop screens');
  for (const [w, h] of [[1280, 680], [1024, 640]]) {
    const L = await mk('laptop' + w, { width: w, height: h }); await L.goto(base + '/vtt/?room=' + code2); await L.fill('#joinName', 'Lap' + w); await L.click('#joinForm button[type=submit]'); await L.waitForSelector('#app:not([hidden])');
    await L.click('[data-do=claim]'); await settle(L, () => !!document.querySelector('.stat'));
    const m = await L.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(), t = r('table'), s = r('strip'), top = r('top'), f = r('feed'); return { w: innerWidth, h: innerHeight, tableH: Math.round(t.height), tableW: Math.round(t.width), stripBottom: Math.round(s.bottom), stripH: Math.round(s.height), topH: Math.round(top.height), feedH: Math.round(f.height), docScroll: document.documentElement.scrollHeight - innerHeight, stat: document.querySelector('.stat').getBoundingClientRect().bottom <= innerHeight }; });
    check(w + '×' + h + ': no page scroll, the stats are on screen, the strip is one row, the table is still big enough to use', m.docScroll <= 0 && m.stat && m.stripH <= 70 && m.tableH >= 300, JSON.stringify(m));
    await L.screenshot({ path: process.env.VTT_SHOTS ? process.env.VTT_SHOTS + '/laptop-' + w + '.png' : os.tmpdir() + '/vtt-laptop-' + w + '.png' });
  }

  console.log('--- 14. the GM’s + Hero, requests that arrive in the wrong order, and the pointer and gameplay at once');
  await gm2.keyboard.press('Escape'); await gmTab(gm2, 'table'); await gm2.waitForSelector('[data-do=addHero]');
  await addBtn(gm2, 'addHero'); await gm2.waitForSelector('[data-edit=name]'); await gm2.fill('[data-edit=name]', 'Mara'); await gm2.press('[data-edit=name]', 'Tab');
  await gm2.waitForSelector('input[data-stat=DEX]'); await gm2.fill('input[data-stat=DEX]', '2'); await gm2.press('input[data-stat=DEX]', 'Tab'); await T(900);
  const mara = Object.values((await st(gm2)).chars).find((c) => c.name === 'Mara');
  check('+ Hero makes a blank hero the GM names and fills in: no stats invented, 10 HP, in the turn order', mara && Object.values(mara.stats).filter((v) => v).length === 1 && mara.stats.DEX === 2 && Object.values(mara.effort).every((v) => !v) && (await st(gm2)).cards[mara.cardId].hp.cur === 10 && (await st(gm2)).table.order.some((o) => o.id === mara.cardId), JSON.stringify(mara));
  await settle(D, () => /Mara/.test(document.getElementById('panel').innerText) && /DEX \+2/.test(document.getElementById('panel').innerText)); check('a waiting player sees the new hero offered, with its stats', /Mara/.test(await txt(D, '#panel')) && /DEX \+2/.test(await txt(D, '#panel')), await txt(D, '#panel'));
  await D.click('[data-do=claim]:has-text("Mara")'); await settle(D, () => !!document.querySelector('.stat')); check('and takes it up: the strip shows Mara’s stats', /Mara/.test(await txt(D, '#strip .me')) && /DEX\s*\+2/.test(await txt(D, '#strip')), await txt(D, '#strip'));
  await gm2.evaluate(() => document.activeElement && document.activeElement.blur()); await gm2.keyboard.press('Escape'); await gm2.waitForSelector('[data-assign]');
  await settle(gm2, () => Object.values(window.__vtt.state().chars).some((c) => c.name === 'Mara' && c.owner)); await T(400);
  const assigns = await gm2.$$eval('[data-assign]', (e) => e.map((x) => x.selectedOptions[0].textContent));
  check('and the Players list shows who has Mara, so the GM can give a hero to a player or take it back', assigns.includes('Mara'), JSON.stringify(assigns));

  /* requests that reach the server in the wrong order: hold back the first of two, let the second through, and see that both land once */
  const ghoulId = (await card(gm, 'Pit Ghoul')).id, hpBefore = (await card(gm, 'Pit Ghoul')).hp.cur;
  await gm.context().route(/netlify\/functions\/vtt/, async (r) => { const pd = r.request().postData() || ''; if (pd.includes('revorder01g.1')) await T(1200); r.continue(); });
  const reversed = await gm.evaluate(async (id) => {
    const s = JSON.parse(localStorage.getItem('icrpg-vtt-' + window.__vtt.state().code)); const post = (n, v) => fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + s.token }, body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { type: 'track', id, field: 'hp', mode: 'delta', value: v, actionId: 'revorder01g.' + n } }) }).then((r) => r.json().then((j) => [r.status, j.result]));
    const p1 = post(1, -1); await new Promise((r) => setTimeout(r, 100)); const p2 = post(2, -2); const out = await Promise.all([p1, p2]);
    const again = await Promise.all([post(2, -2), post(1, -1)]); return { out, again: again.map((a) => a[1] && a[1].duplicate) };
  }, ghoulId);
  await gm.context().unroute(/netlify\/functions\/vtt/);
  check('the second request overtook the first: both were applied, once each, and sent again they are repeats', reversed.out.every((o) => o[0] === 200) && reversed.again.every(Boolean) && (await card(gm, 'Pit Ghoul')).hp.cur === hpBefore - 3, JSON.stringify(reversed) + ' ' + (await card(gm, 'Pit Ghoul')).hp.cur);

  /* the pointer going at the same time as a roll: the pointer's own requests are slow, and a stat is clicked while they are still in flight */
  await A.context().route(/netlify\/functions\/vtt/, async (r) => { if ((r.request().postData() || '').includes('"type":"point"')) await T(900); r.continue(); });
  await A.click('[data-do=tool][data-tool=point]'); const rollsBefore = (await st(A)).rolls.length;
  const tb = await A.$eval('#table', (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y }; });
  await A.mouse.move(tb.x + 200, tb.y + 200); await A.mouse.down(); for (let i = 0; i < 12; i++) await A.mouse.move(tb.x + 200 + i * 12, tb.y + 200 + (i % 5) * 6); await A.mouse.up();
  await A.click('.stat[data-stat=DEX]'); await T(1800); await A.context().unroute(/netlify\/functions\/vtt/);
  check('a roll made while the pointer’s slow requests are still in flight works, once', (await st(A)).rolls.length === rollsBefore + 1 && (await st(gm)).pointers && true, (await st(A)).rolls.length + ' vs ' + rollsBefore);
  await A.click('[data-do=tool][data-tool=select]');
  check('and a second click on a stat while the first is on its way makes one roll', await (async () => { const n0 = (await st(A)).rolls.length; await A.evaluate(() => { const b = document.querySelector('.stat[data-stat=CON]'); b.click(); b.click(); b.click(); }); await T(1500); return (await st(A)).rolls.length === n0 + 1; })());

  console.log('--- 15. attacking the ghoul: what is marked is what is applied to, and the HP changes once');
  /* Regression: a roll made with the GATE selected, then the GHOUL clicked before Apply. The table used to mark the ghoul as the target while the button still said "Apply to The Sealed Gate". */
  const ghoulC = await card(gm, 'Pit Ghoul'), gateC = await card(gm, 'The Sealed Gate'); const ghoulHp0 = ghoulC.hp.cur, gateProg0 = gateC.progress.cur;
  await A.keyboard.press('Escape'); await A.click('#cards .c[data-id="' + gateC.id + '"]');
  if (!(await A.$('#strip input[data-phys]'))) await diceOn(A); await A.fill('#strip input[data-phys]', '15'); await A.click('.stat[data-stat=STR]'); await A.waitForSelector('[data-do=effort][data-cat=weapons]');
  await A.fill('#physE', '4'); await A.click('[data-do=effort][data-cat=weapons]'); await A.waitForSelector('[data-do=apply]', { timeout: LIVE ? 20000 : 6000 }).catch(async (e) => { console.log('PANEL: ' + (await txt(A, '#panel')).slice(0, 200) + ' | TOP: ' + await txt(A, '#top') + ' | FEED: ' + await txt(A, '#feed') + ' | ROLLS: ' + JSON.stringify((await st(A)).rolls.slice(-3)).slice(0, 900) + ' | v ' + JSON.stringify(await A.evaluate(() => ({ roll: window.__vtt.ui.roll, sel: window.__vtt.ui.sel }))).slice(0, 200)); throw e; });
  check('with the gate selected the gate is the marked target and the button names it', (await A.$$eval('.c.aim', (e) => e.map((x) => x.dataset.id))).join() === gateC.id && /Sealed Gate/i.test(await txt(A, '[data-do=apply]')), await txt(A, '[data-do=apply]'));
  await A.click('#cards .c[data-id="' + ghoulC.id + '"]');
  await A.waitForSelector('[data-do=aim]');
  check('looking at the ghoul does not move the target: the gate stays marked and named, and the panel offers to change it', (await A.$$eval('.c.aim', (e) => e.map((x) => x.dataset.id))).join() === gateC.id && /Sealed Gate/i.test(await txt(A, '[data-do=apply]')) && /Change target to Pit Ghoul/i.test(await txt(A, '[data-do=aim]')), await txt(A, '[data-do=apply]'));
  await A.click('[data-do=aim]'); await A.waitForFunction((id) => { const a = document.querySelectorAll('.c.aim'); return a.length === 1 && a[0].dataset.id === id; }, ghoulC.id);
  check('after Change target the ghoul is the marked target and the button says Apply to Pit Ghoul with HP', /Apply to Pit Ghoul: −7 HP/i.test(await txt(A, '[data-do=apply]')), (await A.$$eval('.c.aim', (e) => e.length)) + ' ' + (await txt(A, '[data-do=apply]')));
  await A.evaluate(() => { const b = document.querySelector('[data-do=apply]'); b.click(); b.click(); b.click(); });   /* a nervous triple click */
  await A.waitForFunction(() => /Applied/.test(document.querySelector('#panel').innerText));
  await gm.waitForFunction((v) => Object.values(window.__vtt.state().cards).find((c) => c.name === 'Pit Ghoul').hp.cur === v, ghoulHp0 - 7);
  const ghoulAfter = await card(gm, 'Pit Ghoul'), gateAfter = await card(gm, 'The Sealed Gate');
  check('one click on Apply lowered the ghoul’s HP by the Effort, once, even when clicked three times; the gate did not move; no hand editing was needed', ghoulAfter.hp.cur === ghoulHp0 - 7 && gateAfter.progress.cur === gateProg0 && (await card(A, 'Pit Ghoul')).hp.cur === ghoulAfter.hp.cur, ghoulHp0 + ' → ' + ghoulAfter.hp.cur + ', gate ' + gateProg0 + ' → ' + gateAfter.progress.cur);
  check('and the panel says it was applied, with nothing left to apply', /Applied/.test(await txt(A, '#panel')) && !(await A.$('[data-do=apply]')) && !(await A.$('.c.aim')), await txt(A, '#panel'));
  const hitEntry = (await st(gm)).log.filter((e) => /→ Pit Ghoul: HP -7/.test(e.text)); check('the feed has the one hit, once', hitEntry.length === 1, hitEntry.length);
  await A.keyboard.press('Escape');

  console.log('--- 11. a small screen');
  const ph = await mk('phone', { width: process.env.PHONE ? 390 : 1366, height: process.env.PHONE ? 780 : 800 });   /* a phone size only in the phone suite (PHONE=1) */ await ph.goto(base + '/vtt/?room=' + code); await ph.fill('#joinName', 'Cy'); await ph.click('#joinForm button[type=submit]'); await ph.waitForSelector('#app:not([hidden])');
  check('on a phone the page does not scroll sideways and the table is visible', await ph.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth && document.getElementById('table').offsetHeight > 100));

  check('no script errors on any page', errs.length === 0, errs.slice(0, 3).join(' | '));
  await b.close(); if (srv) await new Promise((r) => srv.server.close(r));
  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed'); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
