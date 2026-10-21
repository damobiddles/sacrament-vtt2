// The private inventory page is generated from scripts/inventory/items.mjs and the generated page is committed. This makes sure the two never drift apart.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { items, groups } from '../scripts/inventory/items.mjs';

test('the committed inventory page is exactly what the data produces (run "npm run inventory" after editing the data)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inv-'));
  try {
    const r = spawnSync('node', ['scripts/inventory/build.mjs'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, INVENTORY_OUT: dir }, encoding: 'utf8' });
    assert.equal(r.status, 0, r.stderr);
    assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), readFileSync(new URL('../site/inventory/index.html', import.meta.url), 'utf8'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('every item has a known group, status and recommendation, and a recommendation always has a reason', () => {
  const ids = new Set(groups.map((g) => g.id));
  for (const it of items) {
    assert.ok(ids.has(it.g), it.name + ': unknown group');
    assert.ok(['works', 'broken', 'duplicate', 'unverified', 'redirect', 'locked', 'none', 'archived'].includes(it.status), it.name + ': status ' + it.status);
    assert.ok(['keep', 'merge', 'archive', 'decide'].includes(it.rec), it.name + ': rec ' + it.rec);
    for (const k of ['what', 'note', 'from', 'why']) assert.ok(it[k] && it[k].length > 5, it.name + ': missing ' + k);
    assert.ok(it.url || it.repo || it.display, it.name + ': nothing to show as its address');
  }
});

test('the inventory is private: no noindex omission, no sitemap entry', () => {
  const html = readFileSync(new URL('../site/inventory/index.html', import.meta.url), 'utf8');
  assert.match(html, /<meta name="robots" content="noindex, nofollow, noarchive">/);
  assert.ok(!/inventory/i.test(readFileSync(new URL('../site/sitemap.xml', import.meta.url), 'utf8')));
  assert.match(readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8'), /\/inventory\/\*[\s\S]*X-Robots-Tag = "noindex/);
});
