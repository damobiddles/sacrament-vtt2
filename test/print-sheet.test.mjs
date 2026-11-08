// The printable character sheet (/character/print/): filled from a hero, safe with whatever arrives in the address,
// and the blackletter face stays on that page only (the owner does not want it on the table).
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

test('the blackletter face is loaded by the print page only, never by the table', () => {
  const hits = [];
  (function walk(dir) { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(html|css|js|mjs)$/.test(f) && /UnifrakturMaguntia/i.test(readFileSync(p, 'utf8'))) hits.push(p.slice(site.length)); } })(site);
  assert.ok(hits.every(f => f.startsWith('character/print/')), 'found outside the print page: ' + hits.join(', '));
  assert.ok(hits.includes('character/print/index.html'), 'the print page loads the face');
});

test('the sheet has the Marks box: a printed hero shows its marks and advances, the blank sheet is empty', () => {
  const { P, T, C } = setup();
  const h = T.generate('fighter', seeded(3));
  h.marks = 2; h.advances = { stats: 1, effort: 0 }; h.stats.STR = (h.stats.STR || 0) + 1;
  const out = P.html(P.read(hash(h)));
  assert.match(out, /<h2 class="ps-black">Marks<\/h2>/);
  assert.equal((out.match(/ps-ticks ps-big">(.*?)<\/p>/)[1].match(/ps-on/g) || []).length, 2, 'two marks ticked');
  assert.ok(out.includes('Scores 1 · Effort 0'), 'advances taken are printed');
  assert.ok(out.includes(C.scorePoints(h) - 1 + ' (+1 from advances) points to share'), 'the share grows with the advance');
  const blank = P.blank();
  assert.match(blank, /<h2 class="ps-black">Marks<\/h2>/);
  assert.ok(!/ps-on|ps-x/.test(blank), 'nothing ticked or crossed out on the blank sheet');
  assert.ok(!/[+−]\d/.test(blank.replace(/\+10|\+5|\+1 to one/g, '')), 'no score or bonus is filled in');
});
