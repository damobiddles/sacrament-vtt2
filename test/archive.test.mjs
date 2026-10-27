// Retiring a page means deleting it from the site, with its old address redirecting somewhere sensible. (Git history and the before-cleanup branch keep the old files; there is no archive folder.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = (p) => new URL('../' + p, import.meta.url);
const toml = () => readFileSync(root('netlify.toml'), 'utf8');

test('the earlier Basic Rules page is archived: gone from the site, kept in the archive, and its old address goes to the current rules', () => {
  assert.ok(!existsSync(root('site/legacy/rules/index.html')), 'still published');
  assert.match(toml(), /from = "\/legacy\/rules"\s+to = "\/rules\/"\s+status = 301/);
  assert.match(toml(), /from = "\/legacy\/rules\/\*"\s+to = "\/rules\/"\s+status = 301/);
});

test('nothing on the site still links to the archived rules page', () => {
  for (const f of ['site/rules/index.html', 'site/index.html', 'site/resources/index.html']) {
    assert.ok(!/legacy\/rules|href="rules\/">the legacy/.test(readFileSync(root(f), 'utf8')), f + ' still links to it');
  }
});

test('the example blog post is archived: it no longer builds into the blog, its old address goes to the news list', () => {
  assert.ok(!existsSync(root('content/landing/blog/2026-10-20-example-post-delete-me.md')), 'still in the blog folder');
  assert.match(toml(), /from = "\/icrpg\/blog\/example-post-delete-me"\s+to = "\/news\/"\s+status = 301/);
  assert.match(toml(), /from = "\/icrpg\/blog\/example-post-delete-me\/\*"\s+to = "\/news\/"\s+status = 301/);
  assert.ok(!/example-post-delete-me/.test(readFileSync(root('site/sitemap.xml'), 'utf8')), 'still in the sitemap');
});

test('the empty leftover folders are gone', () => {
  assert.ok(!existsSync(root('site/hearts')), 'site/hearts is still there');
});

test('the earlier-characters page is merged into the hero builder: old page removed, its address redirects, its script files stay for the builder', () => {
  assert.ok(!existsSync(root('site/legacy/index.html')), 'still published');
  assert.match(toml(), /from = "\/legacy"\s+to = "\/character\/#earlier"\s+status = 301/);
  assert.match(toml(), /from = "\/legacy\/"\s+to = "\/character\/#earlier"\s+status = 301/);
  for (const f of ['data.js', 'rules.js', 'migrate.js', 'fx.js']) assert.ok(existsSync(root('site/legacy/' + f)), f + ' is still needed');
  for (const f of ['site/rules/index.html', 'site/character/index.html']) assert.ok(!/href="(\.\.)?\/?(\.\.\/)?legacy\/"/.test(readFileSync(root(f), 'utf8')), f + ' still links to /legacy/');
});

test('the earlier home page is retired: its script is no longer published, and the live home page is the new one (built from content/landing/)', () => {
  assert.ok(!existsSync(root('site/app.js')), 'the old home page script is still published');
  const home = readFileSync(root('site/index.html'), 'utf8');
  assert.match(home, /<h1>Sacrament RPG<\/h1>/);
  assert.match(home, /href="\/vtt\/\?join"/);
  assert.ok(!/Looming Horror that climbs/.test(home), 'site/index.html is still the old home page');
});

test('the archived example post answers at its new address too (the inventory lists it there)', () => {
  assert.match(toml(), /from = "\/news\/example-post-delete-me"\s+to = "\/news\/"\s+status = 301/);
  assert.match(toml(), /from = "\/news\/example-post-delete-me\/"\s+to = "\/news\/"\s+status = 301/);
});

test('there is no archive folder: retired things are deleted and recovered from git history', () => {
  assert.ok(!existsSync(root('archive')), 'an archive folder came back');
  assert.ok(!existsSync(root('site/donate.js')), 'the unused donate script came back');
});

test('generated pictures, videos and reports are ignored by git, so they are never committed again', () => {
  const ignore = readFileSync(root('.gitignore'), 'utf8');
  for (const pattern of ['docs/**/*.png', 'docs/**/*.mp4', 'test-results/', 'playwright-report/']) assert.ok(ignore.includes(pattern), pattern + ' is not ignored');
});

test('the playtest sign-up is removed: no thank-you page, its address goes to the home page, and the home page build has no form', () => {
  assert.ok(!existsSync(root('site/thanks/index.html')), 'the thank-you page is still published');
  assert.match(toml(), /from = "\/thanks"\s+to = "\/"\s+status = 301/);
  assert.match(toml(), /from = "\/thanks\/"\s+to = "\/"\s+status = 301/);
  const build = readFileSync(root('scripts/build-landing.mjs'), 'utf8');
  assert.ok(!/name="sign-up"/.test(build), 'the build still writes a sign-up form');
  assert.doesNotMatch(readFileSync(root('site/index.html'), 'utf8'), /<form\b/i, 'the home page still has a form');
});
