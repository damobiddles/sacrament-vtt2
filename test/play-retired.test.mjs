// The earlier "Looming Horror" table (/play/, /play/local/) was retired. Its pages, its Firebase set-up and its tests are gone; old links go to the home page;
// nothing on the site points to it; and tables saved earlier that use its stone picture as a background still show it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = (p) => new URL('../' + p, import.meta.url).pathname;
const toml = readFileSync(root('netlify.toml'), 'utf8');
const rules = [...toml.matchAll(/\[\[redirects\]\]\s+from = "([^"]+)"\s+to = "([^"]+)"\s+status = (\d+)/g)].map((m) => ({ from: m[1], to: m[2], status: +m[3] }));
function resolve(path) {   // the first matching rule, the way Netlify reads them
  for (const r of rules) {
    const star = r.from.endsWith('/*');
    if (star ? path.startsWith(r.from.slice(0, -1)) : r.from === path) return { status: r.status, to: r.to.replace(':splat', star ? path.slice(r.from.length - 1) : '') };
  }
  return null;
}
const walk = (dir, out = []) => { for (const f of readdirSync(dir)) { const p = join(dir, f); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); } return out; };

test('the retired table, its Firebase set-up and its stand-in tests are gone', () => {
  for (const p of ['site/play', 'scripts/table-test', 'firebase.json', 'firestore.rules', '.firebaserc', 'e2e/play-front-door.spec.mjs'])
    assert.ok(!existsSync(root(p)), p + ' is still there');
});

test('old /play/ and /table and /tools links go to the home page, but the stone picture saved tables use goes to its new place', () => {
  for (const p of ['/play', '/play/', '/play/local/', '/play/anything', '/table', '/table/x', '/tools', '/tools/x']) assert.deepEqual(resolve(p), { status: 301, to: '/' }, p);
  assert.deepEqual(resolve('/play/tiles/stone.webp'), { status: 301, to: '/vtt/stone.webp' });
  assert.ok(existsSync(root('site/vtt/stone.webp')), 'the picture is missing');
});

test('the sample table uses the picture at its new address', () => {
  const sample = readFileSync(root('netlify/functions/_shared/vtt-sample.mjs'), 'utf8');
  assert.match(sample, /\/vtt\/stone\.webp/);
  assert.ok(!/\/play\//.test(sample));
});

test('nothing the site publishes (or builds it from) links to /play/ or uses Firebase', () => {
  const hits = [];
  for (const dir of ['site', 'content', 'scripts/build-landing.mjs', 'netlify/functions', 'private']) {
    const p = root(dir); const files = statSync(p).isDirectory() ? walk(p) : [p];
    for (const f of files) {
      if (/\.(png|webp|jpg|ico|woff2?|ttf|mp4)$/i.test(f) || f.includes('/site/inventory/')) continue;
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (/["'(\s]\.{0,2}\/play\/|\/play["')]|firebase|firestore/i.test(l)) hits.push(f.replace(root(''), '') + ':' + (i + 1) + '  ' + l.trim().slice(0, 90)); });
    }
  }
  assert.deepEqual(hits, []);
});
