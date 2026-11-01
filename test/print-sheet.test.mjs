// The printable character sheet (/character/print/): filled from a hero, safe with whatever arrives in the address,
// and the blackletter face never reaches the table (the owner finds it too hard to read during play).
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const site = new URL('../site/', import.meta.url).pathname;
function setup() {
  const ctx = vm.createContext({});
  for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'character/print/print.js']) vm.runInContext(readFileSync(join(site, f), 'utf8'), ctx);
  return { P: ctx.SacramentPrint, T: ctx.SacramentHeroTools, C: ctx.SacramentSheetCore };
}
const hash = h => '#' + encodeURIComponent(JSON.stringify(h));
const seeded = seed => { let x = seed; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; }; };

test('a generated hero prints with its name, scores, Defence, gear and spells', () => {
  const { P, T, C } = setup();
  for (const focus of ['fighter', 'scout', 'scholar', 'healer']) {
    const h = T.generate(focus, seeded(7)), back = P.read(hash(h)), out = P.html(back);
    assert.ok(out.includes(h.name) && out.includes(h.vow) && out.includes(h.calling), focus);
    assert.match(out, new RegExp('ps-total"><b>' + C.defence(h) + '<'));
    for (const g of h.gear) assert.ok(out.includes(C.item(g.id).name.replace(/'/g, '&#39;')), focus + ' prints ' + g.id);
    for (const g of h.gear) for (const sp of C.spellsOf(C.item(g.id))) assert.ok(out.includes(sp.name), focus + ' prints spell ' + sp.id);
    assert.equal(back.hp.max, 10);
  }
});

test('whatever is typed into the address is tidied: no markup, no unknown items, numbers in range', () => {
  const { P } = setup();
  assert.equal(P.read(''), null); assert.equal(P.read('#not json'), null); assert.equal(P.read(hash([1, 2])), null);
  const h = P.read(hash({ name: '<img src=x onerror=alert(1)>', stats: { STR: 99 }, gear: [{ id: 'nope', eq: true }, { id: 'sword', eq: true }], hp: { max: 'x', cur: 50 } }));
  const out = P.html(h);
  assert.ok(!out.includes('<img'), 'the name is printed as text');
  assert.ok(out.includes('&lt;img'));
  assert.deepEqual([...h.gear.map(g => g.id)], ['sword']);
  assert.ok(h.stats.STR <= 10);
  assert.deepEqual({ ...h.hp }, { max: 10, cur: 10 });
});

test('the blackletter face is used on the website (logo and page titles) and the print page, never on the table', () => {
  const hits = [];
  (function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(html|css|js|mjs)$/.test(f) && /UnifrakturMaguntia|blackletter/i.test(readFileSync(p, 'utf8'))) hits.push(p.slice(site.length)); } })(site);
  assert.deepEqual(hits.filter(f => f.startsWith('vtt/')), [], 'the table must never name the blackletter face');
  assert.ok(hits.includes('character/print/index.html'), 'the print page loads the face');
  // The website gets the face through landing.css (every public page) and /character/ links it directly.
  assert.match(readFileSync(join(site, 'landing.css'), 'utf8'), /^@import url\('\/blackletter\.css'\);/);
  assert.match(readFileSync(join(site, 'character/index.html'), 'utf8'), /<link rel="stylesheet" href="\/blackletter\.css">/);
  const css = readFileSync(join(site, 'blackletter.css'), 'utf8');
  assert.match(css, /url\('\/fonts\/UnifrakturMaguntia-Book\.ttf'\)/);
  assert.match(css, /(^|\n)h1,[^{]*\{font-family:var\(--blackletter\)/);
  // The table page must not pull in either stylesheet, so its headings stay in the readable face.
  const table = readFileSync(join(site, 'vtt/index.html'), 'utf8');
  assert.ok(!/landing\.css|blackletter\.css/.test(table), 'the table page links a website-only stylesheet');
  assert.ok(!/landing\.css|blackletter/.test(readFileSync(join(site, 'theme.css'), 'utf8')), 'theme.css is shared with the table and must stay free of the face');
});
