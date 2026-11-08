// Consistency audit (owner request 2026-11-08): things found in a full audit of the site, the loot and the solo game, kept fixed by these checks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import '../site/vtt/rules.js';
import '../site/sheet/gear.js';
import '../site/sheet/sheet-core.js';
const G = globalThis.SACRAMENT_GEAR;
const read = (f) => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const relics = [...G.items, ...G.relics, ...G.found].filter((i) => i.kind === 'relic');

test('every relic has a flavour line under its name, like the rest of the loot', () => {
  for (const i of relics) assert.ok(i.flavour && i.flavour.length > 10, i.id + ' has no flavour line');
});

test('every relic that makes a check says so in its own words', () => {
  // Found 2026-11-08: the Censer of Ash, Widow's Listening Veil and Ward Medal rolled a WIS check at the table, but their words did not mention one.
  // Seven were found 2026-11-08 (Bone Bell, Censer of Ash, Widow's Listening Veil, Ward Medal, Vigil Coal, Ash Rod, Mourning Nail). A relic you Strike with is an attack, like a weapon.
  for (const i of relics) if (i.roll && !/^Strike\b/.test(i.does)) assert.match(i.does, new RegExp('\\b' + i.roll + ' check\\b'), i.id + ' rolls ' + i.roll + ' but does not say so');
});

test('the site footer is styled by theme.css, so pages without the website styles (My heroes, the solo game) show it the same way', () => {
  const theme = read('site/theme.css'), landing = read('site/landing.css');
  for (const sel of ['.ic-foot{', '.site-footer-grid{', '.site-legal{']) { assert.ok(theme.includes(sel), sel + ' in theme.css'); }
  assert.ok(!landing.includes('.ic-foot{margin-top:40px;padding:30px'), 'the footer is defined once, in theme.css');
  assert.match(read('site/nav.js'), /\\\/character\\\/\?\$\/\.test\(path\)[^\n]*footer\(\)/, 'My heroes gets the footer');
  const solo = read('site/solo/index.html');
  assert.ok(solo.includes('<script src="/nav.js"></script>') && solo.includes('data-no-nav'), 'the solo page loads the shared footer, not the website menu');
  assert.match(read('site/solo/solo.js'), /SacramentSite\.footer\(\)/);
  assert.match(read('site/solo/solo.css'), /\.solo\.playing \.ic-foot\{display:none\}/, 'out of the way while a road is played');
});

test('the solo hero sheet explains paths in the same words as the sheet at the table', () => {
  assert.match(read('site/solo/index.html'), /id="sheetPath"/);
  assert.match(read('site/solo/solo.js'), /A relic of your own path costs 1 less Horror to use\./);
  assert.match(read('site/sheet/sheet.js'), /A relic of your own path costs 1 less Horror to use\./);
});

test('one name per page: the first rules tab is called Rules, like the menu and its heading', () => {
  assert.match(read('scripts/build-landing.mjs'), /\['\/rules\/', 'Rules'\]/);
});
