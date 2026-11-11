// The Play in person page (/play-in-person/): every download it offers is a real file in site/, the adventure is listed,
// the GM-only material is marked as such, and it is reachable from the navigation and the home page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url).pathname;

function built() {
  const out = mkdtempSync(join(tmpdir(), 'in-person-'));
  const r = spawnSync('node', ['scripts/build-landing.mjs'], { cwd: ROOT, env: { ...process.env, LANDING_OUT: out }, encoding: 'utf8', timeout: 30000 });
  assert.equal(r.status, 0, r.stderr);
  const read = (p) => readFileSync(join(out, p), 'utf8');
  return { read, cleanup: () => rmSync(out, { recursive: true, force: true }) };
}

test('every download linked from Play in person and the latest news post exists, and none is missing', () => {
  const b = built();
  try {
    for (const [page, least] of [['play-in-person/index.html', 6], ['news/the-guest-at-greave/index.html', 6], ['news/the-rib-of-saint-hussey/index.html', 3]]) {
      const links = [...b.read(page).matchAll(/href="(\/downloads\/[^"]+)"/g)].map((m) => m[1]);
      assert.ok(links.length >= least, page + ' links its downloads');
      for (const href of links) assert.ok(existsSync(join(ROOT, 'site', href)), page + ' links a missing file: ' + href);
    }
    const html = b.read('play-in-person/index.html');
    for (const href of ['/downloads/print-kit/sacrament-print-kit-A4.pdf', '/downloads/print-kit/sacrament-print-kit-Letter.pdf',
      '/downloads/players/sacrament-rules-cheat-sheet-A4.pdf', '/downloads/players/sacrament-rules-cheat-sheet-Letter.pdf',
      '/downloads/players/sacrament-hero-sheet-A4.pdf', '/downloads/players/sacrament-hero-sheet-Letter.pdf', '/downloads/adventures/the-guest-at-greave-A4.pdf',
      '/downloads/adventures/before-the-snow-A4.pdf', '/downloads/adventures/the-guest-at-greave-players-map-A4.pdf',
      '/adventures/the-guest-at-greave/', '/character/', '/loot/',
      '/downloads/adventures/the-rib-of-saint-hussey-gm-pack.zip', '/downloads/adventures/the-rib-of-saint-hussey-A4.pdf', '/downloads/adventures/the-rib-of-saint-hussey-Letter.pdf',
      '/adventures/the-rib-of-saint-hussey/', '/downloads/print-kit/sacrament-the-stranger-A4.pdf', '/downloads/print-kit/sacrament-the-stranger-Letter.pdf']) assert.ok(html.includes('href="' + href + '"'), 'offers ' + href);
    assert.match(html, /for the GM only/i, 'the adventure is marked GM-only');
    assert.ok(!html.includes('{{'), 'no placeholder is left in the page');
  } finally { b.cleanup(); }
});

test('Play in person is in the navigation, on the home page and in the sitemap, with the adventure', () => {
  const b = built();
  try {
    assert.match(b.read('index.html'), /<a href="\/play-in-person\/"[^>]*>Play in person<\/a>/);
    assert.match(b.read('index.html'), /class="site-paths"[\s\S]*href="\/play-in-person\/"/);
    const map = b.read('sitemap.xml');
    assert.ok(map.includes('/play-in-person/') && map.includes('/adventures/the-guest-at-greave/'));
  } finally { b.cleanup(); }
});
