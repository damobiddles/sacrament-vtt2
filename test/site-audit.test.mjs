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

test('plain look-alike finds work like their twins (owner decision 2026-11-08, decision card)', () => {
  const all = [...G.items, ...G.relics, ...G.found], it = (id) => all.find((i) => i.id === id);
  const twins = { stubs: 'candles', hemprope: 'rope', spikesmallet: 'spikes', gravespade: 'spade', ironstaff: 'cudgel', silverdagger: 'knife' };
  const play = (i) => JSON.stringify(['kind', 'use', 'uses', 'roll', 'cat', 'effort', 'band', 'weaponStyle', 'defence'].map((k) => i[k] ?? null));
  for (const [find, twin] of Object.entries(twins)) assert.equal(play(it(find)), play(it(twin)), find + ' plays like ' + twin);
  assert.equal(it('gravespade').kind, 'weapon', 'it rolls like a weapon, so it is one');
  for (const [find, twin] of Object.entries({ hardbread: 'rations', chalksticks: 'chalk', flintsteel: 'tinder', sallet: 'helm' })) { assert.ok(it(find).does, find + ' has words'); assert.equal(it(find).use, it(twin).use, find); }
  for (const id of ['jerkin', 'sallet']) assert.match(it(id).does, /^Defence \+1 while equipped\./);
  // In the solo game the stubs are lit like candles (a use spent), not a lantern carried, and flint and steel lights a fire.
  const engine = read('site/solo/engine.js'), road = read('site/solo/road.js');
  assert.match(engine, /var CANDLES = \['candles', 'stubs'\]/); assert.doesNotMatch(engine, /var LIGHTS = \[[^\]]*'stubs'/);
  assert.match(road, /FIRE = LIGHTS\.concat\(\['tinder', 'flintsteel'\]\)/);
});

test('the Paths page counts a pushed relic roll among the natural 1s that add Horror, as the rules and the engine do (weekly audit 2026-11-09)', () => {
  const paths = read('content/landing/paths.md');
  assert.match(paths, /A natural 1 adds Horror only when the relic is used to attack or as a pushed second action/);
  assert.match(read('content/landing/rules-updates.md'), /A relic's natural 1 when pushed \(9 November 2026\)/);
});

test('news posts name the rules tabs as the site does (weekly audit 2026-11-09)', () => {
  const tabs = read('scripts/build-landing.mjs').match(/const RULES_TABS = (\[.*\]);/)[1];
  const names = [...tabs.matchAll(/'([^'/][^']*)'\]/g)].map((m) => m[1]);
  const dispatch = read('content/landing/blog/2026-11-09-the-november-dispatch.md');
  assert.ok(dispatch.includes('one row of tabs:** ' + names.slice(0, -1).join(', ') + ' and ' + names.at(-1) + '.'), 'the dispatch lists ' + names.join(', '));
});

test('the footer links both adventures and the Paths page, and names the rules tabs as the tabs do (owner decision 2026-11-10)', () => {
  const nav = read('site/nav.js');
  for (const link of ['<a href="/rules/paths/">Paths</a>', '<a href="/adventures/the-guest-at-greave/">The Guest at Greave</a>', '<a href="/adventures/the-rib-of-saint-hussey/">The Rib of Saint Hussey</a>', '<a href="/rules/updates/">Updates and errata</a>']) assert.ok(nav.includes(link), link);
});
