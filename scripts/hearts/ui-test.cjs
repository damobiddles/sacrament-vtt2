/* Drives the Hearts prototype pages in a real browser: the rules page, the hero sheet and bringing an earlier character over.
   Run: node scripts/hearts/ui-test.cjs   (needs Playwright; serves ./site on a free port; uses a seeded Math.random so a run can be repeated: HEARTS_SEED=n) */
const http = require('http'), fs = require('fs'), path = require('path');
const site = path.join(__dirname, '..', '..', 'site');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const PW = process.env.PHONE ? 390 : 1366;   /* the phone-width steps run at phone width only in the phone suite (PHONE=1) */
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(site, path.normalize(p));
  if (!f.startsWith(site) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const T = (ms) => new Promise((r) => setTimeout(r, ms));
server.listen(0, async () => {
  const base = 'http://localhost:' + server.address().port;
  let chromium; try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--no-sandbox'] });
  const seed = +process.env.HEARTS_SEED || 11;
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript((s) => { let a = s >>> 0; Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }, seed);
  // block the web fonts so the test does not depend on the network
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const errs = [], ok = [], bad = [];
  const check = (n, c, d) => { (c ? ok : bad).push(n); console.log((c ? 'PASS ' : 'FAIL ') + n + (d ? '  — ' + String(d).slice(0, 170) : '')); };
  const open = async (url) => { const p = await ctx.newPage(); p.setDefaultTimeout(5000); p.on('pageerror', (e) => errs.push(url + ': ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errs.push(url + ' console: ' + m.text()); }); await p.goto(base + url); await T(300); return p; };
  const txt = (p, s) => p.$eval(s, (e) => e.innerText.replace(/\s+/g, ' ').trim()).catch(() => '(missing)');
  const noScroll = async (p, label) => check(label + ' has no sideways scroll', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), await p.evaluate(() => document.documentElement.scrollWidth + ' vs ' + window.innerWidth));

  console.log('--- 1. the rules page');
  let p = await open('/rules/');
  /* The earlier draft is retained behind an explicit disclosure; open it before checking its examples. */
  await p.click('.earlier-draft > summary'); await p.waitForSelector('#trackdemo', { state: 'visible' });
  check('the rules page draws its tables from the data (items, foes, aftershocks)', (await p.$$eval('#lib .icard', (e) => e.length)) >= 20 && (await p.$$eval('#foes tbody tr', (e) => e.length)) === 7 && (await p.$$eval('#aftertables tr', (e) => e.length)) === 21);
  check('it shows the four Target Numbers and a Horror track', (await p.$$eval('#scenes tbody tr', (e) => e.map((x) => x.cells[0].textContent))).join() === 'TN 10,TN 12,TN 14,TN 16' && /12 \/ 21/.test(await txt(p, '#trackdemo')));
  check('the rules page carries none of the replaced mechanics (twelve boxes, armour dice, durability) outside the legacy note', !/12 boxes|armour dice|durability/i.test((await txt(p, 'body')).replace(/The earlier rules, with ability trees and twelve boxes of harm[^.]*\./, '')));
  check('the rules page is indexable and canonical', !(await p.$('meta[name=robots]')) && /playsacrament.com\/rules\//.test(await p.getAttribute('link[rel=canonical]', 'href')));
  await p.setViewportSize({ width: PW, height: 800 }); await noScroll(p, 'the rules page at phone width');

  console.log('--- 2. the My heroes page and its sheet');
  p = await open('/character/');
  check('there are no heroes to start, and the generator replaces the ready-made selector', (await p.$$eval('#ready, [data-ready]', (e) => e.length)) === 0 && !!(await p.$('#generateHero')) && /no heroes saved/.test(await txt(p, '#sheetHere')));
  // An existing saved hero is still editable after the ready-made selector is retired.
  await Promise.race([p.evaluate(() => {
    const D = window.HEARTS_DATA, E = window.HeartsEngine(D), H = window.SacramentHeroes;
    const hero = H.fromEngine(E.newCharacter(D.CHARACTERS.find(c => c.id === 'ottoline')));
    localStorage.setItem(H.KEY, JSON.stringify({ heroes: [hero], current: hero.id, converted: {} }));
  }), new Promise((_, reject) => setTimeout(() => reject(Error('Could not seed existing hero')), 5000))]);
  await p.reload(); await T(200);
  check('Ottoline arrives with her kit in 8 of 10 equipped slots', /8 of 10 slots/.test(await txt(p, '#sheetHere')) && (await p.$$eval('#sheetHere .sh-item', (e) => e.length)) === 4, await txt(p, '#sheetHere .sh-sec:nth-of-type(1)'));
  check('hearts and defence are shown', (await p.$$eval('#sheetHere .sh-ht', (e) => e.length)) === 1 && /Defence\s*\d+/.test(await txt(p, '#sheetHere')));
  // slots: fill both sets to ten and refuse the next, with the reason on the sheet
  for (let k = 0; k < 22; k++) { await p.selectOption('#shAdd', 'cudgel'); await p.click('[data-sh=add]'); }
  check('both sets stop at ten slots', (await p.$$eval('#sheetHere h4 .sh-note', (e) => e.map((x) => x.textContent.trim()).join('|'))) === '10 of 10 slots|10 of 10 slots');
  await p.selectOption('#shAdd', 'harness'); await p.click('[data-sh=add]'); check('and it says why, in words', /Drop something first/.test(await txt(p, '#sheetHere .sh-msg')), await txt(p, '#sheetHere .sh-msg'));
  // point buy: six points among six scores, four among five kinds of Effort
  check('Ottoline has spent all six points and all four of Effort', /0 of 6 points left/.test(await txt(p, '#sheetHere')) && /0 of 4 points left/.test(await txt(p, '#sheetHere')));
  await p.click('[data-sh=score][data-k=INT][data-d="-1"]'); check('taking a point back frees one', /1 of 6 points left/.test(await txt(p, '#sheetHere')));
  await p.click('[data-sh=score][data-k=STR][data-d="1"]'); check('and spending it on another score uses it up', /0 of 6 points left/.test(await txt(p, '#sheetHere')));
  await p.click('[data-sh=score][data-k=DEX][data-d="1"]'); check('one more is refused in plain words', /no points left/.test(await txt(p, '#sheetHere .sh-msg')));
  await p.click('[data-sh=hp][data-d="-1"]'); await p.click('[data-sh=hp][data-d="-1"]'); check('hit points go down by hand', /8 \/ 10/.test(await txt(p, '#sheetHere .sh-hpn')), await txt(p, '#sheetHere .sh-hpn'));
  await p.reload(); await T(200); check('and the hero is still there after a reload, as it was left', /8 \/ 10/.test(await txt(p, '#sheetHere .sh-hpn')) && /Ottoline/.test(await p.$eval('#heroSel', (e) => e.selectedOptions[0].textContent)));
  await p.setViewportSize({ width: PW, height: 800 }); await noScroll(p, 'the hero sheet at phone width');
  console.log('--- 3. bringing an earlier-rules character over');
  const stores = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'test', 'fixtures', 'stores.json'), 'utf8'));
  const old = JSON.stringify(stores['Sister Maren']);
  const lctx = await b.newContext({ viewport: { width: 1100, height: 900 } }); await lctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await lctx.addInitScript((o) => { if (!localStorage.getItem('sacrament-builder-v1')) localStorage.setItem('sacrament-builder-v1', o); }, old);
  const lp = await lctx.newPage(); lp.setDefaultTimeout(5000); lp.on('pageerror', (e) => errs.push('legacy: ' + e.message));
  await lp.goto(base + '/character/#earlier'); await T(500);
  check('the old character is listed, read only, with its abilities and gear', (await lp.$$eval('#earlierList details', (e) => e.length)) === 1 && /Sister Maren/.test(await txt(lp, '#earlierList')) && /Abilities/.test(await lp.$eval('#earlierList', (e) => e.textContent)));
  check('it says nothing will be changed', /exactly as you left it/.test(await txt(lp, 'body')));
  await lp.click('summary'); await lp.click('[data-bring]'); await T(200);
  check('a proposal shows the scores by rank, the gear mapping and the notes', (await lp.$$eval('[data-score]', (e) => e.length)) === 3 && (await lp.$$eval('[data-prop] tbody tr', (e) => e.length)) >= 5 && /Converted from Sister Maren/.test(await txt(lp, '[data-prop]')), (await txt(lp, '[data-prop]')).slice(0, 200));
  const oldBefore = await lp.evaluate(() => localStorage.getItem('sacrament-builder-v1'));
  await lp.selectOption('[data-score=Body]', '2'); const spread = await lp.$$eval('[data-score]', (s) => s.map((x) => x.value).sort().join(''));
  check('changing a score swaps so the spread stays +2/+1/+0', spread === '012', spread);
  await lp.click('[data-make]'); await T(300);
  const made = await lp.evaluate(() => JSON.parse(localStorage.getItem('sacrament-heroes-v2')));
  check('the new hero exists with 1 Heart, and the old character is untouched', made.heroes.length === 1 && made.heroes[0].hp.max === 10 && /legacy:/.test(made.heroes[0].from) && (await lp.evaluate(() => localStorage.getItem('sacrament-builder-v1'))) === oldBefore && oldBefore === old);
  check('the page remembers which old character became a hero', Object.keys(made.converted).length === 1);
  await lp.goto(base + '/character/'); await T(300);
  check('the hero sheet opens the converted hero, with its notes', /Sister Maren/.test(await lp.$eval('#sheetHere [data-text=name]', (e) => e.value)) && /Converted from/.test(await lp.$eval('#sheetHere [data-text=notes]', (e) => e.value)));
  await lp.setViewportSize({ width: PW, height: 800 }); await lp.goto(base + '/character/#earlier'); await T(500); await lp.click('#earlierList summary'); await lp.click('[data-bring]'); await noScroll(lp, 'the earlier-characters section at phone width');
  check('no script errors on any page', errs.length === 0, errs.join(' | '));
  console.log('\n' + ok.length + ' passed, ' + bad.length + ' failed');
  await b.close(); server.close(); process.exit(bad.length ? 1 : 0);
});
