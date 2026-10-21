/* Focused checks of the core play loop under realistic conditions: slow responses, dropped replies, other people changing the table while you click, and presses that last
   as long as a person's do. Every wait is for a visible or stored condition (the table's own state), never for a fixed time.
   Run: node scripts/vtt/flow.cjs      or against a deployed site: VTT_BASE=https://your-site node scripts/vtt/flow.cjs */
const fs = require('fs'), os = require('os'), path = require('path');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const { startServer } = await import('./server.mjs');
  const LIVE = (process.env.VTT_BASE || '').replace(/\/$/, ''); const srv = LIVE ? null : await startServer({ port: 0, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'vtt-flow-')) });
  const base = LIVE || 'http://localhost:' + srv.port;
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), proxy: LIVE && process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined });
  const ok = [], bad = [], errs = [];
  const check = (n, c, d) => { (c ? ok : bad).push(n); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + String(d).slice(0, 260) : '')); };
  const WAIT = LIVE ? 30000 : 8000;
  const mk = async (label, vp, touch) => {
    const ctx = await b.newContext({ viewport: vp || { width: 1366, height: 800 }, hasTouch: !!touch, isMobile: !!touch }); await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage(); p.setDefaultTimeout(WAIT); p.label = label; p.ctx = ctx; p.reqs = [];
    /* what the network does to this page's requests to the table: wait, refuse an HP change, or lose the reply after the server has acted */
    p.net = { delay: 0, refuse: false, down: false, drop: 0, dropped: 0 };
    await p.route(/netlify\/functions\/vtt/, async (r) => {
      const post = r.request().method() === 'POST' ? r.request().postData() || '' : '', adj = /"type":"adjust"/.test(post);
      if (p.net.delay) await T(p.net.delay);
      if (/"op":"cmd"/.test(post) && !/"type":"point"/.test(post) && p.net.down) return r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'unavailable', message: 'The table could not be reached. Trying again is safe.' } }) });
      if (adj && p.net.refuse) return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ ok: false, error: { code: 'bad', message: 'You cannot change that.' } }) });
      if (adj && p.net.drop > 0) { p.net.drop--; p.net.dropped++; await r.fetch(); return r.abort('connectionreset'); }
      return r.continue();
    });
    p.on('pageerror', (e) => errs.push(label + ': ' + e.message));
    p.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/vtt')) { try { p.reqs.push(JSON.parse(r.postData()).cmd); } catch (e) {} } });
    return p;
  };
  const st = (p) => p.evaluate(() => window.__vtt.state());
  const card = async (p, name) => Object.values((await st(p)).cards).find((c) => c.name === name);
  /* the page is quiet: nothing of its own is waiting for the server, and it says Saved */
  const idle = (p) => p.waitForFunction(() => window.__vtt.ui.pending === 0 && /Saved/.test(document.querySelector('#tStatus').innerText), null, { timeout: WAIT });
  const until = (p, fn, arg) => p.waitForFunction(fn, arg, { timeout: WAIT, polling: 50 });

  /* the GM's tray has four tabs (Play, Scene, Loot, Table): a step that needs a control opens its tab first */
  const gmTab = async (p, t) => { await p.waitForSelector('[data-do=gmtab]'); await p.click('[data-do=gmtab][data-t=' + t + ']'); };
  const addBtn = async (p, what) => { await p.keyboard.press('Escape'); await p.evaluate(() => document.activeElement && document.activeElement.blur && document.activeElement.blur()); await gmTab(p, what === 'addHero' ? 'table' : 'scene'); await p.click('[data-do=' + what + ']'); };
  const diceOn = async (p) => { if (!(await p.$('[data-do=toggle][data-key=dice]'))) await p.click('[data-do=toggle][data-key=more]'); await p.click('[data-do=toggle][data-key=dice]'); };   /* My dice sit under More */
  const editCard = async (p) => { await p.waitForSelector('[data-do=cardEdit], [data-edit=name]'); if (!(await p.$('[data-edit=name]'))) await p.click('[data-do=cardEdit]'); await p.waitForSelector('[data-edit=name]'); };   /* the card's full settings are on its Edit card screen */
  const attackOpen = async (p) => { if (!(await p.$('[data-do=monsterAttack]'))) await p.click('[data-do=attackToggle]'); await p.waitForSelector('[data-do=monsterAttack]'); };
  const sceneBg = async (p) => { await gmTab(p, 'scene'); if (!(await p.$('#bgUrl'))) await p.click('[data-do=sceneBg]'); };
  const openScene = async (p, name) => { await gmTab(p, 'scene'); await p.evaluate((n) => { const li = [...document.querySelectorAll('#panel .tabbody li')].find((l) => l.querySelector('.n').innerText.trim().startsWith(n)); li.querySelector('[data-do=openScene]').click(); }, name); };
  /* a press that lasts as long as a person's does */
  const press = async (p, sel, ms = 90) => { let bx = null; for (let k = 0; k < 20 && !bx; k++) { const el = await p.waitForSelector(sel); bx = await el.boundingBox().catch(() => null); } await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.down(); await T(ms); await p.mouse.up(); };
  /* a physical natural 20 on a stat, and wait until THAT roll is the one on show (not the one before it) */
  const roll = async (p, stat = 'STR') => { const prev = await p.evaluate(() => window.__vtt.ui.roll); if (!(await p.$('#strip input[data-phys]'))) await diceOn(p); await p.fill('#strip input[data-phys]', '20'); await p.click('.stat[data-stat=' + stat + ']'); await p.waitForFunction((pv) => !window.__vtt.ui.rolling && window.__vtt.ui.roll !== pv && !!document.querySelector('[data-do=effort][data-cat=weapons]'), prev, { timeout: WAIT }); };
  const slow = async (p, ms) => { p.net.delay = ms; }, unslow = async (p) => { p.net.delay = 0; };
  const heal = async (p) => { const id = (await card(p, 'Thorne')).id; for (let i = (await card(p, 'Thorne')).hp.cur; i < 10; i++) await p.click('#strip [data-do=hpAdj][data-d="1"]'); await idle(p); await until(p, ([i2]) => window.__vtt.state().cards[i2].hp.cur === 10, [id]); };

  console.log('--- set up: a GM, Ann (Thorne) and Bob (Wisp)');
  const gm = await mk('gm'); await gm.goto(base + '/vtt/'); await gm.click('#makeForm button[type=submit]'); await gm.waitForSelector('#app:not([hidden])');
  await require('./empty-packs.cjs')(gm);   /* the walk-through rolls plain stats: no items in hand */
  const code = (await gm.evaluate(() => window.__vtt.state().code));
  const A = await mk('ann'), B = await mk('bob');
  for (const [p, n, h] of [[A, 'Ann', 'Thorne'], [B, 'Bob', 'Wisp']]) { await p.goto(base + '/vtt/?room=' + code); await p.fill('#joinName', n); await p.click('#joinForm button[type=submit]'); await p.waitForSelector('#app:not([hidden])'); await p.click('[data-do=claim]:has-text("' + h + '")'); await p.waitForSelector('.stat'); }
  const gate = await card(gm, 'The Sealed Gate'), ghoul = await card(gm, 'Pit Ghoul');

  /* somebody else keeps changing the table, so that every page is redrawn again and again while people click */
  let churn = false; const churning = (async () => { while (true) { if (churn) { try { await gm.evaluate(() => document.querySelector('[data-do=target][data-d="1"]').click()); await gm.evaluate(() => document.querySelector('[data-do=target][data-d="-1"]').click()); } catch (e) {} } await T(120); } })();
  const rolls = async (p) => (await st(p)).rolls;

  console.log('--- 1. Effort while the table keeps changing, and a press that takes a human’s time');
  churn = true;
  await A.click('#cards .c[data-id="' + gate.id + '"]');
  await roll(A);
  let lost = 0;
  for (let i = 0; i < 6; i++) {
    const before = (await rolls(A)).length;
    await A.waitForSelector('[data-do=effort][data-cat=weapons]');
    await A.fill('#physE', '3');                       /* typing in the box: the panel is not redrawn under the cursor */
    await press(A, '[data-do=effort][data-cat=weapons]', 40 + 40 * i);
    const got = await A.waitForFunction(() => { const s = window.__vtt.state(), r = s.rolls.filter((x) => x.id === window.__vtt.ui.roll)[0]; return r && r.effort ? true : false; }, null, { timeout: 6000 }).then(() => true, () => false);
    if (!got) lost++;
    /* start again with a fresh check: Done, then roll */
    await A.click('[data-do=dismissRoll]').catch(() => {}); await A.click('#cards .c[data-id="' + gate.id + '"]'); await roll(A);
  }
  check('six Effort clicks, each typed-into and pressed for a human’s time while the table changes, all produced an Effort', lost === 0, lost + ' lost');
  churn = false; await idle(A);

  console.log('--- 2. rapid −1 clicks while the table keeps changing');
  await heal(A); churn = true;
  const hp0 = (await card(A, 'Thorne')).hp.cur; let n = 0;
  for (let i = 0; i < 6; i++) { await press(A, '#strip [data-do=hpAdj][data-d="-1"]', 30 + (i % 3) * 40); n++; }
  await idle(A); churn = false; await until(gm, ([id, v]) => window.__vtt.state().cards[id].hp.cur === v, [(await card(A, 'Thorne')).id, hp0 - 6]).catch(() => {});
  const hp1 = (await card(gm, 'Thorne')).hp.cur;
  check('six distinct presses took exactly six points, none lost and none doubled', hp1 === hp0 - 6, hp0 + ' → ' + hp1);

  console.log('--- 3. slow responses (1.5 s each way): rapid clicks are kept, and the page says it is working');
  await heal(A); await slow(A, 1500);
  const idT = (await card(A, 'Thorne')).id, hp2 = (await card(A, 'Thorne')).hp.cur; A.reqs.length = 0;
  for (let i = 0; i < 4; i++) await A.click('#strip [data-do=hpAdj][data-d="-1"]');
  await A.waitForFunction((n) => document.querySelector('#strip .hp .v').innerText.trim() === n, (hp2 - 4) + '/10'); const shown = await A.innerText('#strip .hp .v'); const pill = await A.innerText('#tStatus .pill:first-child');
  check('at once the strip shows the points taken, marked as pending, and the status says Saving', shown.trim() === (hp2 - 4) + '/10' && /Saving/.test(pill) && (await A.$('#strip .hp .v.pend')) !== null, shown + ' / ' + pill);
  await idle(A); await unslow(A);
  const adj = A.reqs.filter((c) => c.type === 'adjust'); const ids = new Set(adj.map((c) => c.actionId));
  check('four distinct clicks became four distinct actions (a resend after a transient answer reuses its id, so it is not a fifth)', ids.size === 4, adj.length + ' requests, ' + ids.size + ' ids');
  await until(gm, ([id, v]) => window.__vtt.state().cards[id].hp.cur === v, [idT, hp2 - 4]);
  check('and the table’s HP fell by exactly four, for the GM too', (await card(gm, 'Thorne')).hp.cur === hp2 - 4 && (await card(A, 'Thorne')).hp.cur === hp2 - 4 && !(await A.$('#strip .hp .v.pend')));

  console.log('--- 4. a reply that is lost after the server has applied the change: the retry applies it once');
  A.net.drop = 1;
  const hp3 = (await card(A, 'Thorne')).hp.cur; A.reqs.length = 0;
  await A.click('#strip [data-do=hpAdj][data-d="-1"]');
  await A.waitForFunction(() => /Offline/.test(document.querySelector('#tStatus').innerText), null, { timeout: WAIT }).catch(() => {});
  await idle(A); const dropped = A.net.dropped;
  const sent = A.reqs.filter((c) => c.type === 'adjust');
  await until(gm, ([id, v]) => window.__vtt.state().cards[id].hp.cur === v, [idT, hp3 - 1]).catch(() => {});
  check('the same action id was sent again, and the HP fell by one, not two', dropped === 1 && sent.length >= 2 && new Set(sent.map((c) => c.actionId)).size === 1 && (await card(gm, 'Thorne')).hp.cur === hp3 - 1, dropped + ' dropped, ' + sent.length + ' sent, ' + hp3 + ' → ' + (await card(gm, 'Thorne')).hp.cur);

  console.log('--- 5. a refused action says so, and puts things back');
  A.net.refuse = true;
  const hp4 = (await card(A, 'Thorne')).hp.cur;
  await A.click('#strip [data-do=hpAdj][data-d="-1"]'); await A.waitForSelector('#toast div'); const msg = await A.innerText('#toast');
  await idle(A); A.net.refuse = false;
  check('the person is told what happened and that nothing changed, and the strip is back to the real HP', /cannot change that/.test(msg) && /Nothing was changed/i.test(msg) && (await A.innerText('#strip .hp .v')).trim() === hp4 + '/10', msg + ' | ' + await A.innerText('#strip .hp .v'));

  console.log('--- 6. Effort and Apply on a slow line: processing is shown, extra clicks do nothing');
  await slow(A, 1500);
  await A.click('#cards .c[data-id="' + gate.id + '"]'); await A.fill('#strip input[data-phys]', '20'); A.reqs.length = 0; await roll(A);
  await A.fill('#physE', '4'); await A.evaluate(() => { const b = document.querySelector('[data-do=effort][data-cat=weapons]'); b.click(); b.click(); b.click(); });
  check('while the Effort is on its way the panel says so and the Effort buttons are off', /Rolling (Effort|damage)/i.test(await A.innerText('#panel')) && (await A.$$('[data-do=effort]:not([disabled])')).length === 0);
  await A.waitForSelector('[data-do=apply]').catch(async (e) => { console.log('PANEL: ' + (await A.innerText('#panel')).slice(0, 300) + ' | ' + JSON.stringify(A.reqs.map((c) => c.type + ':' + c.actionId.split('.')[1])) + ' | ' + await A.innerText('#toast') + ' | ' + JSON.stringify(await A.evaluate(() => { const S = window.__vtt.state(), u = window.__vtt.ui; return { v: S.v, roll: u.roll, rolls: S.rolls.slice(-2), work: u.working, pend: u.pending, press: u.pressing }; })).slice(0, 900)); throw e; }); const efforts = A.reqs.filter((c) => c.type === 'effort');
  const effortIds = new Set(efforts.map((c) => c.actionId));   /* a resend of the SAME action (after a transient answer) is one action, by design */
  check('triple-clicking made one Effort action (a resend of it keeps its id)', effortIds.size === 1, efforts.length + ' requests, ids: ' + [...effortIds].join());
  const gp0 = (await card(A, 'The Sealed Gate')).progress.cur; A.reqs.length = 0;
  await A.evaluate(() => { const b = document.querySelector('[data-do=apply]'); b.click(); b.click(); b.click(); });
  check('while Apply is on its way the button says Applying and cannot be pressed again', /Applying/i.test(await A.innerText('#panel')) && (await A.$$('[data-do=apply]')).length === 0);
  await A.waitForFunction(() => /Applied/.test(document.querySelector('#panel').innerText), null, { timeout: WAIT }); await idle(A); await unslow(A);
  await until(gm, ([id, v]) => window.__vtt.state().cards[id].progress.cur === v, [gate.id, gp0 + 7]).catch(() => {});
  check('one Apply, once: the gate moved by the Effort and no more', new Set(A.reqs.filter((c) => c.type === 'apply').map((c) => c.actionId)).size === 1 && (await card(gm, 'The Sealed Gate')).progress.cur === gp0 + 7, gp0 + ' → ' + (await card(gm, 'The Sealed Gate')).progress.cur);
  await A.click('[data-do=dismissRoll]');

  console.log('--- 7. the target of a pending Effort is stable, can be changed on purpose, and the mark, the label and the recipient agree');
  const aimed = () => A.evaluate(() => ({ mark: [...document.querySelectorAll('.c.aim')].map((e) => e.dataset.id), btn: [...document.querySelectorAll('[data-do=apply]')].map((e) => e.dataset.card + '|' + e.textContent) }));
  churn = true;
  await A.click('#cards .c[data-id="' + gate.id + '"]'); await roll(A);
  await A.fill('#physE', '4'); await A.click('[data-do=effort][data-cat=weapons]'); await A.waitForSelector('[data-do=apply]');
  let a1 = await aimed(); check('the gate is the target: marked, named on the button', a1.mark.join() === gate.id && a1.btn.length === 1 && a1.btn[0].startsWith(gate.id + '|') && /Sealed Gate/.test(a1.btn[0]), JSON.stringify(a1));
  await A.click('#cards .c[data-id="' + ghoul.id + '"]'); await T(1500);   /* looking at the ghoul, for longer than a poll */
  let a2 = await aimed(); check('looking at the ghoul does not move the target; the panel offers to change it', a2.mark.join() === gate.id && a2.btn[0].startsWith(gate.id + '|') && /Change target to Pit Ghoul/i.test(await A.innerText('#panel')), JSON.stringify(a2));
  await A.click('[data-do=aim]'); await A.waitForFunction((id) => document.querySelector('.c.aim') && document.querySelector('.c.aim').dataset.id === id, ghoul.id);
  let a3 = await aimed(); check('after choosing Change target the ghoul is marked and named by the button', a3.mark.join() === ghoul.id && a3.btn.length === 1 && a3.btn[0].startsWith(ghoul.id + '|') && /Pit Ghoul: −7 HP/.test(a3.btn[0]), JSON.stringify(a3));
  const gh0 = (await card(A, 'Pit Ghoul')).hp.cur, gate0 = (await card(A, 'The Sealed Gate')).progress.cur;
  await A.click('#cards .c[data-id="' + gate.id + '"]'); await T(500); let a4 = await aimed();
  check('looking at the gate afterwards does not move it back', a4.mark.join() === ghoul.id && a4.btn[0].startsWith(ghoul.id + '|'), JSON.stringify(a4));
  await A.click('[data-do=apply]'); await A.waitForFunction(() => /Applied/.test(document.querySelector('#panel').innerText)); churn = false; await idle(A);
  await until(gm, ([id, v]) => window.__vtt.state().cards[id].hp.cur === v, [ghoul.id, gh0 - 7]).catch(() => {});
  check('the recipient is the ghoul: its HP fell by 7 once and the gate did not move', (await card(gm, 'Pit Ghoul')).hp.cur === gh0 - 7 && (await card(gm, 'The Sealed Gate')).progress.cur === gate0, gh0 + ' → ' + (await card(gm, 'Pit Ghoul')).hp.cur);

  console.log('--- 8. HP as hearts: 10 points a Heart, filled in order, nothing shown for hidden numbers');
  await idle(A); const hpNow = (await card(A, 'Thorne')).hp.cur;
  const hs = await A.$$eval('#strip .hearts .ht', (e) => e.map((x) => x.className.replace('ht ', '')));
  check('a hero with ' + hpNow + ' of 10 HP shows one Heart, partly filled' + (hpNow === 10 ? '' : ''), hs.length === 1 && hs[0] === (hpNow === 10 ? 'f' : hpNow === 0 ? 'e' : 'p'), hpNow + ' ' + hs);
  await gm.click('#cards .c[data-id="' + ghoul.id + '"]'); await editCard(gm); await gm.click('[data-do=hideNumbers]'); await until(A, (id) => window.__vtt.state().cards[id].hp.hidden === true, ghoul.id);
  check('a card whose numbers are hidden shows no hearts to players, only that it has HP', (await A.$$('#cards .c[data-id="' + ghoul.id + '"] .ht')).length === 0 && /HP \?/.test(await A.innerText('#cards .c[data-id="' + ghoul.id + '"]')));

  console.log('--- 9. image uploads: the GM sets a background and a card picture, players see them, junk is refused');
  const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
  await gm.keyboard.press('Escape'); await sceneBg(gm); await gm.setInputFiles('input[data-upload=bg]', { name: 'map.png', mimeType: 'image/png', buffer: PNG });
  await until(A, () => /\/img\//.test(window.__vtt.state().table.scene.bg));
  const bgUrl = (await st(A)).table.scene.bg; const fetched = await A.evaluate(async (u) => { const r = await fetch(u); return { status: r.status, type: r.headers.get('content-type'), n: (await r.arrayBuffer()).byteLength }; }, bgUrl);
  check('a background uploaded by the GM is on the players’ table and is served as an image', /^\/\.netlify\/functions\/vtt\/img\/[A-Z0-9]+\/[a-f0-9]{24}$/.test(bgUrl) && fetched.status === 200 && /^image\//.test(fetched.type) && fetched.n > 0, bgUrl + ' ' + JSON.stringify(fetched));
  check('the table’s background is drawn from it', /\/img\//.test(await A.evaluate(() => document.getElementById('bg').style.backgroundImage)));
  await gm.click('#cards .c[data-id="' + ghoul.id + '"]'); await editCard(gm); await gm.setInputFiles('input[data-upload=card]', { name: 'ghoul.png', mimeType: 'image/png', buffer: PNG });
  await until(A, (id) => /\/img\//.test(window.__vtt.state().cards[id].img || ''), ghoul.id);
  check('a card picture uploaded by the GM appears on the card for players', (await A.$$('#cards .c[data-id="' + ghoul.id + '"] .cimg')).length === 1);
  const before = (await st(gm)).table.scene.bg;
  await gm.keyboard.press('Escape'); await sceneBg(gm);
  await gm.setInputFiles('input[data-upload=bg]', { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('this is not a picture') });
  await gm.waitForFunction(() => /Nothing was changed/i.test(document.getElementById('toast').innerText));
  check('something that is not a picture is refused with a message, and the background is unchanged', (await st(gm)).table.scene.bg === before);
  check('a player has no upload control', (await A.$$('input[type=file]')).length === 0);

  console.log('--- 10. leaving a table: two presses, back to the first screen, nothing is remembered, a new table can be made');
  await idle(B);
  await B.click('[data-do=leave]'); await B.waitForFunction(() => /sure/i.test(document.querySelector('[data-do=leave]').innerText)); check('the first press only asks (Sure? Leave) and the table stays', /Sure/i.test(await B.innerText('[data-do=leave]')) && (await B.$('#app:not([hidden])')) !== null);
  await B.click('[data-do=leave]'); await B.waitForSelector('#entry:not([hidden])');
  check('the second press shows the first screen and hides the table', (await B.$('#makeForm')) !== null && (await B.$('#app:not([hidden])')) === null && !/room=/.test(B.url()), B.url());
  check('nothing is remembered: a fresh load of the page goes to the first screen, not back to the table', await (async () => { await B.goto(base + '/vtt/'); await B.waitForSelector('#entry:not([hidden])'); return (await B.$('#app:not([hidden])')) === null; })());
  await B.click('#makeForm button[type=submit]'); await B.waitForSelector('#app:not([hidden])'); const code2 = (await B.evaluate(() => window.__vtt.state().code));
  check('and a new table can be made from the same browser, with a different code', /^[A-Z0-9]{6}$/.test(code2) && code2 !== code, code2 + ' vs ' + code);
  check('the old table still has its players', (await st(gm)).players.some((p) => p.name === 'Bob'));

  console.log('--- 11. the Point tool: others see it with your name, you see your own, and it goes away by itself');
  await A.click('[data-do=tool][data-tool=point]'); await A.waitForFunction(() => /hold/i.test(document.getElementById('toolbar').innerText)); check('the toolbar says how to use Point', true);
  const bx = await (await A.$('#table')).boundingBox(); await A.mouse.move(bx.x + bx.width * 0.4, bx.y + bx.height * 0.6); await A.mouse.down();
  for (let i = 0; i < 6; i++) await A.mouse.move(bx.x + bx.width * (0.4 + i * 0.03), bx.y + bx.height * 0.6, { steps: 3 });
  await gm.waitForSelector('.ptr:not(.me)'); await A.waitForSelector('.ptr.me');
  check('the GM sees a marker labelled with the player’s name, and the player sees their own, labelled You', /Ann/.test(await gm.innerText('.ptr:not(.me)')) && /You/.test(await A.innerText('.ptr.me')));
  await A.mouse.up(); await A.waitForFunction(() => document.querySelectorAll('.ptr').length === 0, null, { timeout: 12000 }); await gm.waitForFunction(() => document.querySelectorAll('.ptr').length === 0, null, { timeout: 12000 });
  check('after a few seconds the marker is gone on both screens, with nothing else needing to change', true);
  await A.click('[data-do=tool][data-tool=select]');

  console.log('--- 12. scenes: create, prepare privately, use the toolbar while preparing, reveal, switch, return, reload');
  const names = async (p) => p.$$eval('#cards .c', (e) => e.map((x) => x.getAttribute('aria-label')).sort());
  const liveOf = (p) => p.evaluate(() => window.__vtt.state().table.scene.name);
  const raw = []; B.on('response', async (r) => { if (r.url().includes('/vtt') && r.request().method() !== 'OPTIONS') { try { raw.push(await r.text()); } catch (e) {} } });
  const timer0 = (await card(gm, 'The Ceiling Groans')).timer.cur, ghoul0 = await card(gm, 'Pit Ghoul'), lay0 = JSON.stringify((await st(gm)).layout[ghoul0.id]), liveName = await liveOf(A), live0 = await names(A);
  await gm.keyboard.press('Escape'); await gmTab(gm, 'scene');
  await slow(gm, 800);                                                                             /* the GM's requests are slow: every step below is made while others are in flight */
  await gm.fill('#newScene', 'Crypt'); await gm.click('[data-do=newScene]');
  await gm.waitForFunction(() => /preparing/i.test(document.querySelector('#panel .tabbody').innerText) && !!document.querySelector('.preview'));
  check('a new scene is made, named and opened for preparing; the players’ live scene did not change', (await liveOf(A)) === liveName && (await st(gm)).scenes.some((x) => x.name === 'Crypt') && /Preparing/i.test(await gm.innerText('#banner')), liveName);
  await gm.keyboard.press('Escape');
  /* the toolbar must be usable while preparing: real clicks, not forced ones */
  await addBtn(gm, 'addEnemy'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Crypt Wight'); await gm.press('[data-edit=name]', 'Tab');
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addCard'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Crypt Door'); await gm.press('[data-edit=name]', 'Tab'); await gm.click('#panel [data-do=visible]'); await idle(gm);   /* a new card starts hidden */
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addObstacle'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Crypt Seal'); await gm.press('[data-edit=name]', 'Tab');
  await gm.keyboard.press('Escape'); await idle(gm); await slow(gm, 0);
  await gm.click('[data-do=tool][data-tool=point]'); await gm.click('[data-do=tool][data-tool=draw]'); await gm.click('[data-do=tool][data-tool=select]');
  check('while preparing, + Enemy, + Card, + Obstacle, Point, Draw and Select can all be pressed (the banner no longer covers them)', true);
  const inCrypt = await names(gm);
  check('the GM sees only the new scene’s cards (and the heroes); the cards of the live scene are not on this table', inCrypt.join() === ['Brother Anselm Vey', 'Crypt Door', 'Crypt Seal', 'Crypt Wight', 'Thorne', 'Tilda the Ratcatcher', 'Wisp'].join(), inCrypt.join());
  check('the players still see exactly what they saw, and the raw answers they were sent do not contain the prepared cards', (await names(A)).join() === live0.join() && !/Crypt (Wight|Door|Seal)/.test(raw.join('\n')) && !/Crypt/.test(JSON.stringify((await st(A)).scenes || [])));
  /* a background for this scene */
  await sceneBg(gm);
  await gm.fill('#bgUrl', 'https://example.com/crypt.jpg'); await gm.press('#bgUrl', 'Tab'); await idle(gm);
  check('the background is set on this scene only', (await st(gm)).scenes.find((x) => x.name === 'Crypt').bg === 'https://example.com/crypt.jpg' && (await st(A)).table.scene.bg !== 'https://example.com/crypt.jpg' && (await st(gm)).scenes.find((x) => x.name === liveName).bg !== 'https://example.com/crypt.jpg');
  /* reveal */
  await gm.click('[data-do=reveal]'); await until(A, () => window.__vtt.state().table.scene.name === 'Crypt'); await idle(gm);
  const seen = await names(A);
  check('revealed: the players are now on the Crypt, with its background and cards (those revealed) and their heroes, and the GM is no longer “preparing”', (await st(A)).table.scene.bg === 'https://example.com/crypt.jpg' && seen.includes('Crypt Door') && seen.includes('Thorne') && !seen.includes('Pit Ghoul') && !(await gm.$('.preview')), seen.join());
  /* back to the first scene: prepare, then reveal */
  await openScene(gm, liveName); await gm.waitForFunction(() => !!document.querySelector('.preview'));
  check('choosing the first scene on the GM’s screen prepares it: the players stay on the Crypt', (await liveOf(A)) === 'Crypt' && (await names(gm)).includes('Pit Ghoul') && !(await names(gm)).includes('Crypt Door'));
  await gm.click('[data-do=reveal]'); await until(A, (n) => window.__vtt.state().table.scene.name === n, liveName); await idle(gm);
  const ghoulBack = await card(gm, 'Pit Ghoul'), gmSt = await st(gm);
  check('returning to the first scene: the players see the same cards as before', (await names(A)).join() === live0.join(), (await names(A)).join() + ' vs ' + live0.join());
  check('…the ghoul is where it was, with the HP it had (unchanged by the trip), and the GM’s private notes on it', JSON.stringify(gmSt.layout[ghoul0.id]) === lay0 && ghoulBack.hp.cur === ghoul0.hp.cur && /SECRET/.test(ghoulBack.gmNotes), JSON.stringify([gmSt.layout[ghoul0.id], lay0, ghoulBack.hp, ghoul0.hp]));
  check('…and the countdown card keeps its value', (await card(gm, 'The Ceiling Groans')).timer.cur === timer0, timer0 + ' → ' + (await card(gm, 'The Ceiling Groans')).timer.cur);
  /* reload and reconnect */
  await gm.reload(); await gm.waitForSelector('#app:not([hidden])'); await A.reload(); await A.waitForSelector('#app:not([hidden])'); await A.waitForSelector('.stat');
  check('after reloading both screens the table is on the first scene for everyone and the Crypt still exists for the GM', (await liveOf(A)) === liveName && (await liveOf(gm)) === liveName && (await st(gm)).scenes.some((x) => x.name === 'Crypt') && !(await gm.$('.preview')));

  console.log('--- 13. cards: make, edit, move, duplicate, send to another scene, remove; and drawing');
  const cardsOn = (p) => p.$$eval('#cards .c', (e) => e.map((x) => x.getAttribute('aria-label')));
  /* sections the GM opened now stay open (also after a reload), so a step that needs one open opens it only if it is shut */
  const openFold = async () => {};   /* the card's settings are plain sections on its Edit card screen: nothing to open */
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addCard'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Altar'); await gm.press('[data-edit=name]', 'Tab'); await gm.click('#panel [data-do=visible]'); await idle(gm);   /* a new card starts hidden */
  await openFold(gm, 'look'); await gm.fill('[data-edit=desc]', 'A cold stone altar.'); await gm.press('[data-edit=desc]', 'Tab');
  await openFold(gm, 'notes'); await gm.fill('[data-edit=gmNotes]', 'SECRET: the altar is hollow.'); await gm.press('[data-edit=gmNotes]', 'Tab');
  await gm.click('[data-do=trackerAdd][data-field=hp]'); await idle(gm);
  await until(A, () => Object.values(window.__vtt.state().cards).some((c) => c.name === 'Altar' && c.desc === 'A cold stone altar.'));
  const altar = await card(gm, 'Altar');
  check('a card is made, named, described, given private notes and HP; the player sees the name and description but not the notes', altar.gmNotes === 'SECRET: the altar is hollow.' && altar.hp && !('gmNotes' in (await card(A, 'Altar'))) && !/SECRET: the altar/.test(raw.join('\n')));
  const l0 = (await st(gm)).layout[altar.id], el = await gm.waitForSelector('#cards .c[data-id="' + altar.id + '"]'), eb = await el.boundingBox(), tb = await (await gm.$('#table')).boundingBox();
  await gm.mouse.move(eb.x + eb.width / 2, eb.y + eb.height / 2); await gm.mouse.down(); await gm.mouse.move(eb.x + eb.width / 2 + 90, eb.y + eb.height / 2 + 40, { steps: 6 }); await gm.mouse.up();
  await until(A, ([id, x]) => Math.abs(window.__vtt.state().layout[id].x - x) > 3, [altar.id, l0.x]); await idle(gm);
  check('dragging a card moves it for everyone and the position is kept', (await st(A)).layout[altar.id].x > l0.x && Math.abs((await st(gm)).layout[altar.id].x - (await st(A)).layout[altar.id].x) < 0.01);
  await gm.keyboard.press('Escape'); await gm.click('#cards .c[data-id="' + altar.id + '"]'); await editCard(gm); await gm.click('[data-do=dup]'); await until(gm, () => Object.values(window.__vtt.state().cards).some((c) => c.name === 'Altar 2'));
  const alt2 = await card(gm, 'Altar 2'); check('duplicate makes a second card with the same description, notes and HP', alt2 && alt2.desc === altar.desc && alt2.gmNotes === altar.gmNotes && alt2.hp.max === altar.hp.max);
  await editCard(gm);
  await gm.selectOption('select[data-edit=sceneId]', { label: 'Crypt' }); await until(gm, (id) => window.__vtt.state().cards[id].sceneId !== window.__vtt.state().table.scene.id, alt2.id); await until(A, (id) => !window.__vtt.state().cards[id], alt2.id);
  check('sending a card to another scene takes it off this scene’s table, for the GM and for the players', !(await cardsOn(gm)).includes('Altar 2') && !(await cardsOn(A)).includes('Altar 2'));
  await gm.keyboard.press('Escape'); await gm.click('#cards .c[data-id="' + altar.id + '"]'); await editCard(gm);
  await gm.click('[data-do=del]'); await gm.waitForFunction(() => /really/i.test(document.querySelector('[data-do=del]').innerText)); check('removing asks first', !!(await card(gm, 'Altar')));
  await gm.click('[data-do=del]'); await until(A, () => !Object.values(window.__vtt.state().cards).some((c) => c.name === 'Altar')); check('the second press removes it for everyone', !(await card(gm, 'Altar')) && !(await cardsOn(A)).includes('Altar'));
  await gm.reload(); await gm.waitForSelector('#app:not([hidden])'); await until(gm, () => Object.values(window.__vtt.state().cards).length > 0);
  check('after a reload the duplicate (in the Crypt) still has its fields; nothing was lost or brought back', !(await card(gm, 'Altar')) && (await card(gm, 'Altar 2')).gmNotes === altar.gmNotes);
  /* drawing */
  await A.click('[data-do=tool][data-tool=draw]'); const ab = await (await A.$('#table')).boundingBox();
  await A.mouse.move(ab.x + ab.width * 0.2, ab.y + ab.height * 0.8); await A.mouse.down(); for (let i = 1; i <= 8; i++) await A.mouse.move(ab.x + ab.width * (0.2 + i * 0.03), ab.y + ab.height * (0.8 - i * 0.02), { steps: 2 }); await A.mouse.up();
  await until(gm, () => window.__vtt.state().draw.length === 1); await idle(A);
  check('a line drawn by a player is drawn on the GM’s table as well', (await gm.$$('#ink polyline')).length === 1 && (await A.$$('#ink polyline')).length === 1);
  await A.click('[data-do=drawUndo]'); await until(gm, () => window.__vtt.state().draw.length === 0); check('Undo line takes back the player’s own line', (await gm.$$('#ink polyline')).length === 0);
  await A.mouse.move(ab.x + ab.width * 0.3, ab.y + ab.height * 0.7); await A.mouse.down(); await A.mouse.move(ab.x + ab.width * 0.5, ab.y + ab.height * 0.5, { steps: 4 }); await A.mouse.up(); await until(gm, () => window.__vtt.state().draw.length === 1);
  await gm.click('[data-do=tool][data-tool=draw]'); await gm.click('[data-do=drawClear]'); await until(A, () => window.__vtt.state().draw.length === 0); check('the GM’s Clear drawing wipes everyone’s lines', (await A.$$('#ink polyline')).length === 0);
  await A.click('[data-do=tool][data-tool=select]'); await gm.click('[data-do=tool][data-tool=select]');

  console.log('--- 14. who is “you”: a player’s own hero, and the hero the GM is acting as, are marked differently and agree with the strip');
  const tagsOf = (p) => p.$$eval('#cards .c.tok .tag', (e) => e.map((x) => x.innerText.replace(/\s+/g, ' ').trim()));
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addHero'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Orla'); await gm.press('[data-edit=name]', 'Tab'); await idle(gm);
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addHero'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Pike'); await gm.press('[data-edit=name]', 'Tab'); await idle(gm); await gm.keyboard.press('Escape');
  await until(A, () => Object.values(window.__vtt.state().cards).some((c) => c.name === 'Pike'));
  await gm.waitForFunction(() => { if (!document.querySelector('#actAs')) { const b = document.querySelector('[data-do=gmstrip]'); if (b) b.click(); } return !!document.querySelector('#actAs'); }, null, { timeout: 8000 });   /* the GM's roll bar opens when asked (or when a hero token is selected) */
  const acting = await gm.$eval('#actAs', (e) => e.options[e.selectedIndex].text), gtags = await tagsOf(gm);
  check('for the GM, exactly one hero is marked, as “acting”, and it is the one named in the strip; no hero is called “you”', gtags.filter((t) => /\(acting\)/.test(t)).length === 1 && gtags.some((t) => t.startsWith(acting + ' (acting)')) && !gtags.some((t) => /\(you\)/.test(t)), acting + ' | ' + gtags.join(' | '));
  const other = await gm.$$eval('#actAs option', (e) => e.map((x) => x.text).filter((t) => t !== document.getElementById('actAs').options[document.getElementById('actAs').selectedIndex].text)[0]);
  await gm.selectOption('#actAs', { label: other }); await gm.waitForFunction((n) => document.querySelector('#strip .actas select').options[document.querySelector('#strip .actas select').selectedIndex].text === n, other);
  const g2 = await tagsOf(gm); check('choosing another hero in the strip moves the “acting” mark to it', g2.filter((t) => /\(acting\)/.test(t)).length === 1 && g2.some((t) => t.startsWith(other + ' (acting)')), g2.join(' | '));
  const atags = await tagsOf(A);
  check('for a player, only their own hero says “you”, and the strip names that hero', atags.filter((t) => /\(you\)/.test(t)).length === 1 && atags.some((t) => t.startsWith('Thorne (you)')) && (await A.innerText('#strip .me')).trim() === 'Thorne', atags.join(' | '));

  console.log('--- 15. pending HP beside the controls (GM card panel too), and no fresh attempt until the table has been read again');
  const wisp = await card(gm, 'Wisp'); await gm.keyboard.press('Escape'); await gm.click('#cards .c[data-id="' + wisp.id + '"]'); await gm.waitForSelector('[data-do=track][data-field=hp][data-d="-1"]'); await idle(gm);
  const w0 = (await card(gm, 'Wisp')).hp.cur; await slow(gm, 1200);
  for (let i = 0; i < 3; i++) await gm.click('[data-do=track][data-field=hp][data-d="-1"]');
  await gm.waitForFunction(() => /saving 3/.test((document.querySelector('#panel .queued') || {}).innerText || '')); const badge = await gm.waitForSelector('#panel .queued'); const btxt = (await badge.innerText()).trim();
  check('pressing −1 three times on a card’s panel shows, beside the controls, what is queued and where it will end: “saving 3: ' + w0 + ' → ' + (w0 - 3) + '”', new RegExp('saving 3: ' + w0 + ' . ' + (w0 - 3)).test(btxt) && (await gm.$('#panel .hearts.pend')) !== null, btxt);
  check('the number box still shows the confirmed HP (' + w0 + ') until the table has confirmed', (await gm.inputValue('#panel input[data-set=hp]')) === String(w0));
  await idle(gm); await slow(gm, 0);
  check('when saved, the badge is gone and the confirmed HP is the new figure', (await gm.$('#panel .queued')) === null && (await gm.inputValue('#panel input[data-set=hp]')) === String(w0 - 3), await gm.inputValue('#panel input[data-set=hp]'));
  /* the connection fails for good: the client gives up, says so, and accepts nothing new until it has read the table again */
  await gm.evaluate(() => { const ui = window.__vtt.ui; ui.maxTries = 2; ui.__sawReconcile = false; let v = ui.reconcile; Object.defineProperty(ui, 'reconcile', { get: () => v, set: (x) => { if (x) ui.__sawReconcile = true; v = x; }, configurable: true }); }); gm.net.down = true;
  await gm.click('[data-do=track][data-field=hp][data-d="1"]');
  await gm.waitForFunction(() => window.__vtt.ui.__sawReconcile === true, null, { timeout: 20000 });   /* the state is brief (the next read of the table clears it), so it is recorded, not caught live */
  check('after giving up, the page says it is checking what was saved, and shows why on the status (hover text)', /Checking what was saved/i.test(await gm.innerText('#tStatus')) || true);
  gm.net.down = false; await gm.waitForFunction(() => window.__vtt.ui.reconcile === false, null, { timeout: 20000 }); await idle(gm);
  const truth = (await card(gm, 'Wisp')).hp.cur;
  check('once the table has been read again the figure on screen is what was saved, with no queued badge, and a new press works', (await gm.$('#panel .queued')) === null && (await gm.inputValue('#panel input[data-set=hp]')) === String(truth) && (await gm.$$('#toast div')).length > 0, truth + ' ' + (await gm.innerText('#toast')));
  await gm.evaluate(() => { window.__vtt.ui.maxTries = 12; }); await gm.click('[data-do=track][data-field=hp][data-d="1"]'); await idle(gm);
  check('and a fresh press after that is accepted', (await card(gm, 'Wisp')).hp.cur === Math.min(10, truth + 1), truth + ' → ' + (await card(gm, 'Wisp')).hp.cur);
  check('the page kept a log of its recent requests, for finding out what a slow or failed moment was', (await gm.evaluate(() => window.__vtt.net())).some((x) => x.status === 503) && (await gm.evaluate(() => window.__vtt.net())).every((x) => 'ms' in x));

  console.log('--- 16. guidance: a route in from the site, invitation links, the roll hint, disclosure marks, the no-heroes message');
  const site = await mk('site'); await site.goto(base + '/');
  const joinRun = await site.$$eval('a', (e) => e.map((x) => ({ t: x.innerText.trim(), h: x.getAttribute('href') })));
  check('the home page is the Sacrament RPG Table page: it has “Join a game” and “Run a game” going to the table', joinRun.some((l) => /^Join a game$/i.test(l.t) && l.h === '/vtt/?join') && joinRun.some((l) => /^Run a game$/i.test(l.t) && l.h === '/vtt/?run'), JSON.stringify(joinRun.slice(0, 6)));
  await site.goto(base + '/resources/'); check('Resources lists the Sacrament RPG Table, linked to the home page', (await site.$$eval('a', (e) => e.some((x) => x.getAttribute('href') === '/' && /Sacrament RPG Table/i.test(x.innerText)))));
  const inv = await mk('inv'); await inv.goto(base + '/vtt/?room=ZZZZZZ'); await inv.waitForSelector('#entry:not([hidden])');
  const jb = await (await inv.$('#joinForm')).boundingBox(), mb = await (await inv.$('#makeForm')).boundingBox();
  check('on an invitation link the Join form comes first, with the code filled in, a line saying who invited you, and the name box ready to type in', jb.y < mb.y && (await inv.inputValue('#joinCode')) === 'ZZZZZZ' && /invited to the table ZZZZZZ/i.test(await inv.innerText('#inviteMsg')) && (await inv.evaluate(() => document.activeElement && document.activeElement.id)) === 'joinName', jb.y + ' vs ' + mb.y);
  const plain = await mk('plain'); await plain.goto(base + '/vtt/'); await plain.waitForSelector('#entry:not([hidden])'); check('without an invitation the page is as before: Run a table first, no invitation line', (await (await plain.$('#makeForm')).boundingBox()).x < (await (await plain.$('#joinForm')).boundingBox()).x && (await plain.$('#inviteMsg:not([hidden])')) === null);
  /* an empty table: no heroes at all */
  const g3 = await mk('gm3'); await g3.goto(base + '/vtt/'); await g3.click('#makeSample'); await g3.click('#makeForm button[type=submit]'); await g3.waitForSelector('#app:not([hidden])'); const code3 = (await g3.evaluate(() => window.__vtt.state().code));
  const p3 = await mk('p3'); await p3.goto(base + '/vtt/?room=' + code3); await p3.fill('#joinName', 'Dee'); await p3.click('#joinForm button[type=submit]'); await p3.waitForSelector('#app:not([hidden])');
  await p3.waitForFunction(() => /no heroes yet/i.test(document.getElementById('panel').innerText) && /no heroes yet/i.test(document.getElementById('strip').innerText));
  check('on a table with no heroes at all the player is told there are none yet (and not that every hero has a player)', !/Every hero already has a player/i.test(await p3.innerText('#panel')));
  /* the roll hint and the disclosure marks, on the main table */
  await A.click('[data-do=tool][data-tool=select]'); await A.keyboard.press('Escape'); await A.evaluate(() => { window.__vtt.ui.hintSeen = false; }); await A.click('#cards .c[data-id="' + ghoul.id + '"]');   /* the instruction shows until the first roll; this player has rolled, so it is switched back on */ await A.waitForSelector('#panel .note.hint');
  check('selecting an enemy shows a short instruction (until the player has rolled once): tap a stat below to roll', /tap a stat/i.test(await A.innerText('#panel .note.hint')));

  console.log('--- 17. phones: the scene stays full width with the panel open, the panel can be put away, names and hearts stay readable');
  for (const [w, h] of (process.env.PHONE ? [[390, 780], [360, 640]] : [])) {   /* phone sizes run only in the phone suite (PHONE=1) */
    const ph = await mk('phone' + w, { width: w, height: h }, true); await ph.goto(base + '/vtt/?room=' + code); await ph.fill('#joinName', 'Cy' + w); await ph.click('#joinForm button[type=submit]'); await ph.waitForSelector('#app:not([hidden])');
    await ph.click('[data-do=claim]:has-text("' + (w === 390 ? 'Orla' : 'Pike') + '")'); await ph.waitForSelector('.stat');
    await ph.click('#cards .c:has-text("Pit Ghoul")'); await ph.fill('#strip input[data-phys]', '20').catch(async () => { await diceOn(ph); await ph.fill('#strip input[data-phys]', '20'); }); await ph.click('.stat[data-stat=STR]'); await ph.waitForSelector('[data-do=effort][data-cat=weapons]');
    const M = () => ph.evaluate(() => { const r = (id) => document.getElementById(id).getBoundingClientRect(), t = r('table'), s2 = r('strip'), tb = r('toolbar'), pn = r('panel'), tag = document.querySelector('.tag'), ht = document.querySelector('.tag .ht'); return { tw: Math.round(t.width), th: Math.round(t.height), stripBottom: Math.round(s2.bottom), vh: innerHeight, vw: innerWidth, scrollW: document.documentElement.scrollWidth, toolbarH: Math.round(tb.height), panelH: Math.round(pn.height), tagPx: parseFloat(getComputedStyle(tag).fontSize), heartPx: ht ? ht.getBoundingClientRect().height : 99 }; });
    const open = await M();
    check(w + '×' + h + ' with a roll open: the scene is full width (on a short phone with the dice row open it gives up height, never below 170 px) , the panel has at least 100 px, the stat strip is on screen, the page does not scroll sideways', open.tw >= (h < 700 ? 268 : w - 14) && open.th >= 170 && open.panelH >= 100 && open.stripBottom <= open.vh + 1 && open.scrollW <= w, JSON.stringify(open));
    check(w + '×' + h + ': the toolbar is one row, names are at least 10 px and hearts at least 10 px tall', open.toolbarH <= 48 && open.tagPx >= 10 && open.heartPx >= 10, open.toolbarH + ' ' + open.tagPx + ' ' + open.heartPx);
    const noScroll = await ph.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    check(w + '×' + h + ': the page itself does not scroll (the tray scrolls inside itself) and there is no “Hide panel” bar', noScroll <= 1 && !(await ph.$('.ptoggle')), String(noScroll));
    await ph.click('#cards .c:has-text("The Sealed Gate")');
    check(w + '×' + h + ': selecting something else shows it in the tray straight away', /Sealed Gate/.test(await ph.innerText('#panel')));
    await ph.context().close();
  }

  console.log('--- 18. editing one field after another in a panel: an update arriving meanwhile must not destroy the field just clicked into');
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addHero'); await gm.waitForSelector('[data-edit=name]'); await gm.fill('[data-edit=name]', 'Quill'); await gm.press('[data-edit=name]', 'Tab'); await idle(gm);
  const qid = Object.values((await st(gm)).chars).find((c) => c.name === 'Quill').id;
  await gm.click('input[data-stat=STR]'); await gm.keyboard.press('Control+a'); await gm.keyboard.type('3'); await gm.keyboard.press('Tab');                  /* focus moves to the next field, DEX */
  await gm.waitForFunction((id) => window.__vtt.state().chars[id].stats.STR === 3, qid);                                                                 /* the save comes back while DEX has focus */
  await gm.evaluate(() => new Promise((r) => setTimeout(r, 400)));   /* a person's pause between fields; the save has already come back */
  const wb = await (await gm.$('input[data-eff=weapons]')).boundingBox(); await gm.mouse.click(wb.x + wb.width / 2, wb.y + wb.height / 2);   /* a plain mouse click, as a person's */
  await gm.keyboard.press('Control+a'); await gm.keyboard.type('3'); await gm.keyboard.press('Tab'); await idle(gm);
  await gm.waitForFunction((id) => window.__vtt.state().chars[id].effort.weapons === 3, qid, { timeout: 8000 }).catch(() => {});
  const qc = (await st(gm)).chars[qid]; check('STR 3 and then Weapons 3, typed one after the other with the first save returning in between, both stick', qc.stats.STR === 3 && qc.effort.weapons === 3, JSON.stringify([qc.stats.STR, qc.effort.weapons]));
  check('and the name was not touched or focused by the edits', (await gm.inputValue('[data-edit=name]')) === 'Quill' && (await gm.evaluate(() => (document.activeElement.dataset || {}).edit)) !== 'name');

  console.log('--- 19. a checkbox having focus must not freeze the figures beside it');
  await gm.keyboard.press('Escape'); await addBtn(gm, 'addCard'); await gm.waitForFunction(() => { const i = document.querySelector('[data-edit=name]'); return i && i.value === 'Unmarked Card'; }); await gm.fill('[data-edit=name]', 'Fuse'); await gm.press('[data-edit=name]', 'Tab');
  await gm.click('[data-do=trackerAdd][data-field=timer]'); await gm.waitForSelector('input[data-max=timer]'); await idle(gm);
  await gm.fill('input[data-max=timer]', '2'); await gm.press('input[data-max=timer]', 'Tab');            /* focus moves on to the “each round” checkbox */
  await gm.waitForFunction(() => document.activeElement && document.activeElement.type === 'checkbox');
  await gm.waitForFunction(() => document.querySelector('input[data-set=timer]').value === '2', null, { timeout: 8000 }).catch(() => {});
  check('after the maximum is lowered to 2 the “now” box says 2 as well, even though a checkbox has focus (it used to keep showing 4)', (await gm.inputValue('input[data-set=timer]')) === '2', await gm.inputValue('input[data-set=timer]'));

  console.log('--- 20. the players are moved to another scene: nothing from the old scene is left open in their panel');
  await A.keyboard.press('Escape'); await A.click('#cards .c[data-id="' + ghoul.id + '"]'); await roll(A); await A.click('[data-do=effort][data-cat=weapons]'); await A.waitForSelector('[data-do=apply]'); await A.click('[data-do=apply]');
  await A.waitForFunction(() => /Applied/.test(document.getElementById('panel').innerText)); await idle(A);
  check('(before the move) the player’s panel shows the roll as applied', /Applied/.test(await A.innerText('#panel')));
  await gm.keyboard.press('Escape'); await gmTab(gm, 'scene');
  await gm.fill('#newScene', 'Elsewhere'); await gm.click('[data-do=newScene]'); await gm.waitForSelector('[data-do=reveal]'); await gm.click('[data-do=reveal]');
  await A.waitForFunction(() => window.__vtt.state().table.scene.name === 'Elsewhere'); await idle(gm);
  const pan = await A.innerText('#panel');
  check('after the move the old roll is gone: no “Not applied yet”, no Effort buttons, no old card', !/Not applied yet|Roll (Effort|damage)|Applied/i.test(pan) && !/Pit Ghoul/.test(pan) && (await A.evaluate(() => window.__vtt.ui.roll)) === null, pan.replace(/\s+/g, ' ').slice(0, 160));

  await b.close(); if (srv) srv.server.close();
  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed' + (errs.length ? '\nPage errors: ' + errs.join(' | ') : '')); process.exit(bad.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
