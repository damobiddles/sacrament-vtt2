import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');

test('the rules updates and errata page exists and is linked from the rules pages and footer', () => {
  const page = read('content/landing/rules-updates.md');
  assert.match(page, /^---\ntitle: Rules updates and errata/);
  for (const heading of ['## Errata', '## Clarifications', '## 1 November 2026: the Horror']) assert.ok(page.includes(heading), heading);
  for (const f of ['rules.md', 'player-guide.md', 'gm-guide.md', 'how-to-play.md']) assert.ok(read('content/landing/' + f).includes('](/rules/updates/)'), f);
  assert.ok(read('site/nav.js').includes('href="/rules/updates/"'));
  assert.ok(read('scripts/build-landing.mjs').includes("path: '/rules/updates/'"));
});

test('public rules text no longer says the table adds no extra damage at 21', () => {
  assert.ok(!read('content/landing/player-guide.md').includes('aftershock tables, extra damage'));
  assert.ok(!read('site/adventures/the-guest-at-greave/index.html').includes('adds its 1 Horror as usual'));
});
