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

// Owner decision 2026-11-11 (keep or pull back the solo game's rules): tags, Hinder and Stop, and "needs" notes leave what players read.
// The solo game keeps them in the gear list to decide what a story spell or item does there.
test('tags stay in the gear list for the solo game but no longer appear in the rules or on the hero sheet', async () => {
  await import('../site/sheet/gear.js'); const G = globalThis.SACRAMENT_GEAR;
  assert.ok(G.tags.length && G.spells.some((s) => s.tags), 'the solo game still reads tags from the gear list');
  for (const f of ['content/landing/rules.md', 'content/landing/player-guide.md', 'content/landing/gm-guide.md']) {
    const t = read(f); assert.ok(!t.includes('{{TAGS}}'), f); assert.doesNotMatch(t, /\bHinder\b|\btags?\b/i, f);
  }
  assert.doesNotMatch(read('site/sheet/sheet.js'), /tagText|tagLine/, 'the hero sheet shows no tag line');
  assert.ok(read('content/landing/rules.md').includes('**A spell or relic does what its words say.**'));
  assert.ok(read('content/landing/rules-updates.md').includes('## 6 November 2026: story spells and items'));
});
