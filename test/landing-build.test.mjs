// The Sacrament RPG home page and its pages are built from text files. These checks build into a scratch folder with their own little set of files.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const real = new URL('../content/landing/', import.meta.url).pathname;
function build(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'landing-')), content = join(dir, 'content'), out = join(dir, 'out');
  cpSync(real, content, { recursive: true });
  if (mutate) mutate(content);
  const r = spawnSync('node', ['scripts/build-landing.mjs'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, LANDING_CONTENT: content, LANDING_OUT: out }, encoding: 'utf8' });
  return { r, out, content, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}
const post = (title, date, body = 'Hello.') => `---\ntitle: ${title}\ndate: ${date}\nsummary: About ${title}.\n---\n${body}\n`;

test('every page is built, and a new blog post is just one new file', () => {
  const b = build((c) => { for (const f of readdirSync(join(c, 'blog'))) if (f.endsWith('.md')) rmSync(join(c, 'blog', f)); writeFileSync(join(c, 'blog', '2020-01-01-an-older-post.md'), post('An older post', '2020-01-01')); writeFileSync(join(c, 'blog', '2030-01-02-a-brand-new-post.md'), post('A brand new post', '2030-01-02', '## Hello\nSome **bold** words and a [link](/how-to-play/).')); });
  try {
    assert.equal(b.r.status, 0, b.r.stderr);
    for (const p of ['index.html', 'the-game/index.html', 'setting/index.html', 'how-to-play/index.html', 'newsletter/index.html', 'support/index.html', 'privacy/index.html', 'terms/index.html', 'news/index.html', 'news/a-brand-new-post/index.html'])
      assert.ok(existsSync(join(b.out, p)), p + ' was not built');
    const list = readFileSync(join(b.out, 'news/index.html'), 'utf8');
    assert.match(list, /href="\/news\/a-brand-new-post\/"/);
    assert.ok(list.indexOf('a-brand-new-post') < list.indexOf('an-older-post'), 'newest first');
    const one = readFileSync(join(b.out, 'news/a-brand-new-post/index.html'), 'utf8');
    assert.match(one, /<h3>Hello<\/h3>/); assert.match(one, /<b>bold<\/b>/); assert.match(one, /2 January 2030/);
    assert.match(one, /href="\/news\/an-older-post\/"/, 'links to the older post');
  } finally { b.cleanup(); }
});

test('a blog with no posts still builds, and says so', () => {
  const b = build((c) => { for (const f of readdirSync(join(c, 'blog'))) if (f.endsWith('.md')) rmSync(join(c, 'blog', f)); });
  try {
    assert.equal(b.r.status, 0, b.r.stderr);
    assert.match(readFileSync(join(b.out, 'news/index.html'), 'utf8'), /Nothing here yet/);
  } finally { b.cleanup(); }
});

test('a post with no date is refused with a message that names the file', () => {
  const b = build((c) => writeFileSync(join(c, 'blog', 'oops.md'), '---\ntitle: No date\n---\nText\n'));
  try { assert.notEqual(b.r.status, 0); assert.match(b.r.stderr, /oops\.md/); } finally { b.cleanup(); }
});

test('"YOUR TEXT HERE" marks become bright boxes, and nothing typed in the text can inject a script', () => {
  const b = build((c) => writeFileSync(join(c, 'setting.md'), '---\ntitle: The setting\nsummary: s\n---\n> YOUR TEXT HERE: write the world.\n\nA sentence with [[YOUR TEXT HERE: a gap]] in it and <script>alert(1)</script>.\n'));
  try {
    const html = readFileSync(join(b.out, 'setting/index.html'), 'utf8');
    assert.match(html, /<blockquote class="todo">YOUR TEXT HERE: write the world\./);
    assert.match(html, /<mark class="todo-inline">YOUR TEXT HERE: a gap<\/mark>/);
    assert.ok(!/<script>alert/.test(html), 'raw script text is escaped');
  } finally { b.cleanup(); }
});

test('the donate link: a placeholder while empty, a real button once set, and only https addresses are accepted', () => {
  const real = build();
  try {
    assert.match(readFileSync(join(real.out, 'support/index.html'), 'utf8'), /<a class="btn" href="https:\/\/ko-fi\.com\/sacramentrpg" rel="noopener">Donate<\/a>/, 'the real donate address is a working button');
  } finally { real.cleanup(); }
  const empty = build((c) => writeFileSync(join(c, 'site.json'), JSON.stringify({ name: 'Sacrament RPG Table', donateUrl: '' })));
  try {
    assert.ok(!/Get the book|link not set yet/.test(readFileSync(join(empty.out, 'the-game/index.html'), 'utf8')), 'no link to buy anything is offered');
    assert.match(readFileSync(join(empty.out, 'support/index.html'), 'utf8'), /Donate \(coming soon\)/);
  } finally { empty.cleanup(); }
  const set = build((c) => writeFileSync(join(c, 'site.json'), JSON.stringify({ name: 'Sacrament RPG Table', buyUrl: 'https://example.com/buy', donateUrl: 'javascript:alert(1)' })));
  try {
    const game = readFileSync(join(set.out, 'the-game/index.html'), 'utf8'), sup = readFileSync(join(set.out, 'support/index.html'), 'utf8');
    assert.ok(!/example\.com\/buy/.test(game), 'a configured buy address is ignored: the page links to no one\'s products');
    assert.match(sup, /coming soon/, 'an address that is not https is ignored');
    assert.ok(!/javascript:/.test(sup));
  } finally { set.cleanup(); }
});

test('the home page has the two buttons and they point at the existing join and create flows', () => {
  const b = build();
  try {
    const html = readFileSync(join(b.out, 'index.html'), 'utf8');
    assert.match(html, /<a class="btn" href="\/vtt\/\?join">Join a game<\/a>/);
    assert.match(html, /<a class="btn" href="\/vtt\/\?run">Run a game<\/a>/);
    assert.match(html, /<a class="btn" href="\/vtt\/\?try">Try it now<\/a>/, 'Try it now opens a sample table with the visitor as the GM');
  } finally { b.cleanup(); }
});
