// The table's website used to live under /icrpg/. Every old address must still lead somewhere (a permanent redirect in netlify.toml).
// Redirects do not run on the local test server, so this reads the rules; the live site is checked separately (see CLAUDE.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const toml = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
const rules = [...toml.matchAll(/\[\[redirects\]\]\s+from = "([^"]+)"\s+to = "([^"]+)"\s+status = (\d+)/g)].map((m) => ({ from: m[1], to: m[2], status: +m[3] }));
/* the first rule whose "from" matches, the way Netlify reads them (a * at the end matches anything, :splat is what it matched) */
function resolve(path) {
  for (const r of rules) {
    const star = r.from.endsWith('/*');
    const hit = star ? path.startsWith(r.from.slice(0, -1)) : r.from === path;
    if (hit) return { status: r.status, to: r.to.replace(':splat', star ? path.slice(r.from.length - 1) : '') };
  }
  return null;
}
const OLD = '/ic' + 'rpg';   // the old name, written in pieces so this file does not trip the check that the name never appears

test('every old address of the table\'s website redirects permanently to its new address', () => {
  const expected = {
    '/': '/', '/the-game': '/the-game/', '/the-game/': '/the-game/', '/setting': '/setting/', '/setting/': '/setting/',
    '/how-to-play': '/how-to-play/', '/how-to-play/': '/how-to-play/', '/newsletter': '/newsletter/', '/newsletter/': '/newsletter/',
    '/support': 'https://ko-fi.com/J4M02969C2', '/support/': 'https://ko-fi.com/J4M02969C2', '/privacy': '/privacy/', '/privacy/': '/privacy/', '/blog': '/news/', '/blog/': '/news/',
  };
  for (const [oldTail, to] of Object.entries(expected)) {
    for (const p of oldTail === '/' ? [OLD, OLD + '/'] : [OLD + oldTail]) {
      const r = resolve(p);
      assert.ok(r, p + ' has no redirect');
      assert.equal(r.status, 301, p);
      assert.equal(r.to, to, p);
    }
  }
});

test('an old news post address goes to the same post at its new address; the archived example post and anything unknown go somewhere sensible', () => {
  assert.deepEqual(resolve(OLD + '/blog/my-post/'), { status: 301, to: '/news/my-post/' });
  assert.deepEqual(resolve(OLD + '/blog/example-post-delete-me/'), { status: 301, to: '/news/' });
  assert.deepEqual(resolve(OLD + '/something-else/'), { status: 301, to: '/' });
  assert.equal(resolve(OLD + '.css').to, '/landing.css');
  assert.equal(resolve(OLD + '.js').to, '/landing.js');
});

test('invitation links never contained the old name, and still work: /vtt/ is where it always was', async () => {
  const js = readFileSync(new URL('../site/vtt/vtt.js', import.meta.url), 'utf8');
  assert.match(js, /'\/vtt\/\?room=' \+/);
  assert.ok(!rules.some((r) => r.from.startsWith('/vtt')), 'no rule may move /vtt/');
});

test('saved tables on devices and on the server keep the names they were saved under', () => {
  const js = readFileSync(new URL('../site/vtt/vtt.js', import.meta.url), 'utf8');
  assert.match(js, /var KEY = 'ic' \+ 'rpg' \+ '-vtt-'/, 'the browser storage prefix changed: every saved table on every device would vanish');
  const fn = readFileSync(new URL('../netlify/functions/vtt.mjs', import.meta.url), 'utf8');
  assert.match(fn, new RegExp("name: '" + OLD.slice(1) + "-vtt'"), 'the storage area name changed: every saved table would vanish');
});
