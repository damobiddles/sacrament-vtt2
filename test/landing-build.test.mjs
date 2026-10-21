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
    for (const p of ['index.html', 'the-game/index.html', 'setting/index.html', 'how-to-play/index.html', 'newsletter/index.html', 'privacy/index.html', 'terms/index.html', 'news/index.html', 'news/a-brand-new-post/index.html'])
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

test('support is retired and landing pages use the fixed donation widget without injecting settings', () => {
  const b = build((c) => writeFileSync(join(c, 'site.json'), JSON.stringify({ name: 'Sacrament RPG Table', donateUrl: 'javascript:alert(1)' })));
  try {
    assert.equal(b.r.status, 0, b.r.stderr);
    assert.equal(existsSync(join(b.out, 'support/index.html')), false);
    const html = readFileSync(join(b.out, 'index.html'), 'utf8');
    assert.match(html, /https:\/\/storage\.ko-fi\.com\/cdn\/widget\/Widget_2\.js/);
    assert.match(html, /https:\/\/ko-fi\.com\/J4M02969C2/);
    assert.ok(!html.includes('javascript:alert(1)'));
  } finally { b.cleanup(); }
});

test('the home page has the two buttons and they point at the existing join and create flows', () => {
  const b = build();
  try {
    const html = readFileSync(join(b.out, 'index.html'), 'utf8');
    assert.match(html, /<a class="btn" href="\/vtt\/\?join">Join a game<\/a>/);
    assert.match(html, /<a class="btn" href="\/vtt\/\?run">Run a game<\/a>/);
    assert.doesNotMatch(html, /Try it now|A sample fight opens|class="ic-try"/);
    assert.match(html, /The Church keeps the world/);
  } finally { b.cleanup(); }
});
