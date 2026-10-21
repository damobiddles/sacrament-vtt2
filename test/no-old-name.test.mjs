// The old ruleset and the people behind it must never be named or linked anywhere a visitor can see, and must not linger in the repo either.
// The banned terms (any capitalisation): the old product name, "Index Card" in any form (Index Card RPG, Index Card Role Playing Game, index cards),
// and the publisher's name. They are written in pieces below so that this file passes its own check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';

const TERMS = new RegExp(['ic' + 'rpg', 'index[\\s_-]*' + 'card', 'rune' + 'hammer'].join('|'), 'i');
const ROOT = new URL('../', import.meta.url).pathname;
// The owner's one exception (2026-10-21): the playtest-launch news post thanks the game Sacrament is built on, by name, with no shop links.
// Only that post's source and its built page may name it; the ban holds everywhere else.
const HOMAGE = new Set(['content/landing/blog/2026-10-21-the-table-is-open.md', 'site/news/the-table-is-open/index.html']);
const BINARY = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.pdf', '.zip']);

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (['node_modules', '.git', '.vtt-data', '.vtt-data-e2e', 'test-results', 'playwright-report', '.netlify'].includes(f)) continue;
    const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
}
function scan(dir, skip = () => false) {
  const found = [];
  for (const file of walk(dir)) {
    const rel = relative(ROOT, file);
    if (skip(rel) || HOMAGE.has(rel)) continue;
    if (TERMS.test(rel)) found.push(rel + ' (file name)');
    if (BINARY.has(extname(file).toLowerCase())) continue;
    readFileSync(file, 'utf8').split('\n').forEach((l, i) => { if (TERMS.test(l)) found.push(rel + ':' + (i + 1) + '  ' + l.trim().slice(0, 100)); });
  }
  return found;
}

test('the site is built (home page and its pages are present), so the checks below really look at them', () => {
  for (const p of ['index.html', 'the-game/index.html', 'news/index.html', 'privacy/index.html']) assert.ok(existsSync(ROOT + 'site/' + p), p + ' is missing: run the build first');
});

test('none of the banned terms appears in what the site publishes: not in text, titles, link previews, alt text, scripts, styles, links or file names', () => {
  assert.deepEqual(scan(ROOT + 'site/'), [], 'a banned term is visible to visitors');
});

test('none appears in the text the pages are built from, or in the server code that answers visitors (except the one storage-area name that must not change)', () => {
  const storage = (rel, l) => rel === 'netlify/functions/vtt.mjs' && /getStore\(\{ name: '/.test(l);
  const found = scan(ROOT + 'content/').concat(scan(ROOT + 'netlify/').filter((x) => !storage(x.split(':')[0], readLine(x))));
  assert.deepEqual(found, []);
});
function readLine(x) { const m = x.match(/^(.*?):(\d+)\s/); return m ? readFileSync(ROOT + m[1], 'utf8').split('\n')[+m[2] - 1] : ''; }

test('none lingers elsewhere in the repo (docs, scripts, notes), except where an old address, a saved-data name or the archive must keep it', () => {
  const allowed = new Set([
    'netlify.toml',                          // the redirects from the old addresses
    'package-lock.json',
    'test/old-addresses.test.mjs', 'test/archive.test.mjs',   // check those redirects
    'test/vtt-blobs-client.test.mjs',        // the storage-area name used in a mock
    'scripts/vtt/e2e.cjs',                   // reads the saved-table key in the browser
    'netlify/functions/vtt.mjs',             // the storage-area name (checked above)
    'test/landing-build.test.mjs',           // contains none, but is allowed to name a test folder prefix
  ]);
  const found = scan(ROOT, (rel) => rel.startsWith('archive/') || rel.startsWith('site/') || rel.startsWith('content/') || rel.startsWith('netlify/') || allowed.has(rel) || rel === 'test/no-old-name.test.mjs');
  assert.deepEqual(found, [], 'remove the reference, or (if saved data or an old address needs it) add the file to the allowed list with the reason');
});
