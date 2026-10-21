// The site has one look: the dark one. The light theme and the button that switched to it were removed on the owner's decision.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('the colour file has no light palette and no theme-switch button styling', () => {
  const css = read('site/theme.css');
  assert.ok(!/data-theme/.test(css), 'theme.css still has a light palette');
  assert.ok(!/sac-th/.test(css), 'theme.css still styles the theme button');
  assert.match(css, /color-scheme:dark/);
});

test('the top bar has no theme button, and ignores a "light" choice saved in someone\'s browser', () => {
  const js = read('site/nav.js');
  assert.ok(!/sac-th|Switch light/.test(js), 'nav.js still builds the theme button');
  assert.ok(!/setAttribute\('data-theme'/.test(js), 'nav.js still applies a saved theme');
});

test('no page style still has a light-theme rule', () => {
  for (const f of ['site/site.css', 'site/blog.css', 'site/landing.css', 'site/game/game.css', 'site/vtt/vtt.css']) assert.ok(!/data-theme/.test(read(f)), f + ' still has a light-theme rule');
});
