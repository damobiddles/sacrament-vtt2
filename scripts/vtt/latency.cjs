/* Measures how long a change takes to reach another person's screen with the polling client: the GM presses Target +, and we time until a player's page holds the new
   Target. Repeated, with no added delay and with a delay on every request to the server (a stand-in for a slower connection). Local only: it shows the shape of the
   delay, not what a real network will do. Run: node scripts/vtt/latency.cjs [samples] */
const fs = require('fs'), os = require('os'), path = require('path');
const T = (ms) => new Promise((r) => setTimeout(r, ms));
const N = +process.argv[2] || 30;
(async () => {
  const { startServer } = await import('./server.mjs');
  const srv = await startServer({ port: 0, dir: fs.mkdtempSync(path.join(os.tmpdir(), 'vtt-lat-')) }), base = 'http://localhost:' + srv.port;
  let chromium; try { chromium = require('playwright').chromium; } catch { chromium = require('/opt/node22/lib/node_modules/playwright').chromium; }
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined) });
  const mk = async (delay) => { const c = await b.newContext({ viewport: { width: 1280, height: 720 } }); await c.route(/fonts\./, (r) => r.abort());
    if (delay) await c.route(/netlify\/functions\/vtt/, async (r) => { await T(delay); r.continue(); }); return c.newPage(); };
  const stats = (a) => { a = a.slice().sort((x, y) => x - y); const q = (p) => a[Math.min(a.length - 1, Math.floor(p * a.length))]; return { n: a.length, min: a[0], median: q(0.5), p95: q(0.95), max: a[a.length - 1], mean: Math.round(a.reduce((x, y) => x + y, 0) / a.length) }; };
  const out = {};
  for (const delay of [0, 150, 400]) {   /* one-way delay added to every request: a round trip costs about twice this */
    const gm = await mk(delay); await gm.goto(base + '/vtt/'); await gm.click('#makeForm button[type=submit]'); await gm.waitForSelector('#app:not([hidden])');
    const code = await gm.evaluate(() => window.__vtt.state().code);
    const pl = await mk(delay); await pl.goto(base + '/vtt/?room=' + code); await pl.fill('#joinName', 'P'); await pl.click('#joinForm button[type=submit]'); await pl.waitForSelector('#app:not([hidden])'); await T(1500);
    const seen = [];
    for (let i = 0; i < N; i++) {
      const before = await pl.evaluate(() => window.__vtt.state().table.target);
      await T(Math.random() * 1500);            /* the change lands at a random moment in the player's polling cycle */
      const t0 = Date.now(); await gm.click('#tTarget [data-do=target][data-d="' + (i % 2 ? '-1' : '1') + '"]');
      await pl.waitForFunction((v) => window.__vtt.state().table.target !== v, before, { timeout: 15000, polling: 20 }); seen.push(Date.now() - t0);
    }
    out['added delay each way ' + delay + ' ms'] = stats(seen); await gm.close(); await pl.close();
  }
  console.log(JSON.stringify(out, null, 1)); await b.close(); await new Promise((r) => srv.server.close(r));
})().catch((e) => { console.error(e); process.exit(2); });
