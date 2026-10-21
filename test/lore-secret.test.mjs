// The world's secret (the GM ONLY part of docs/lore/sacrament-lore.md) must never reach a visitor or a player.
// The phrases that give it away are listed in that file, under "Guarded phrases"; this test reads them from there and fails if any appears
// (any capitalisation, any spacing) in anything the site serves, in the text the pages are built from, or in the server code that sends things to players.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const LORE = ROOT + 'docs/lore/sacrament-lore.md';
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.pdf', '.zip']);
const norm = (s) => s.toLowerCase().replace(/&rsquo;|&lsquo;|’|‘/g, "'").replace(/\s+/g, ' ');
const noTags = (s) => norm(s.replace(/<[^>]*>/g, ' '));

function guardedPhrases() {
  const text = readFileSync(LORE, 'utf8');
  const part2 = text.slice(text.search(/^## PART 2/m));
  const block = part2.slice(part2.search(/^### Guarded phrases/m));
  return [...block.matchAll(/^- `([^`]+)`/gm)].map((m) => norm(m[1]));
}
const walk = (dir, out = []) => {
  for (const f of readdirSync(dir)) {
    if (['node_modules', '.git', '.vtt-data', '.vtt-data-e2e', 'test-results', 'playwright-report'].includes(f)) continue;
    const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else if (!BINARY.has(extname(p).toLowerCase())) out.push(p);
  }
  return out;
};

test('the lore file has a public part and a GM-only part, and the GM-only part lists the phrases that are guarded', () => {
  assert.ok(existsSync(LORE), 'docs/lore/sacrament-lore.md is missing');
  const text = readFileSync(LORE, 'utf8');
  assert.match(text, /^## PART 1: PUBLIC/m);
  assert.match(text, /^## PART 2: GM ONLY/m);
  assert.ok(guardedPhrases().length >= 6, 'fewer than 6 guarded phrases are listed');
});

test('the lore file is not published: it sits outside the site folder', () => {
  assert.match(readFileSync(ROOT + 'netlify.toml', 'utf8'), /publish = "site"/);
  assert.ok(!existsSync(ROOT + 'site/lore') && !existsSync(ROOT + 'site/docs'));
});

test('no guarded phrase appears anywhere the site is served from, built from, or answered by', () => {
  const phrases = guardedPhrases();
  const found = [];
  for (const dir of ['site', 'content', 'netlify/functions']) {
    for (const file of walk(ROOT + dir)) {
      const raw = readFileSync(file, 'utf8'), a = norm(raw), b = noTags(raw);
      for (const ph of phrases) if (a.includes(ph) || b.includes(ph)) found.push(file.slice(ROOT.length) + '  contains  "' + ph + '"');
    }
  }
  assert.deepEqual(found, [], 'the GM-only secret is visible to players or visitors');
});
