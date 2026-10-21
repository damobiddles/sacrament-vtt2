// Builds the blog from content/blog/*.md into site/blog/ (index, one page per post, feed.xml).
// Each post starts with a front-matter block:  ---  title: ...  date: YYYY-MM-DD  summary: ...  ---
// The output is not committed; Netlify runs this before publishing (see netlify.toml).
import { readdirSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { esc, parse as parseFile, fmt } from './lib/markdown.mjs';

const SRC = new URL('../content/blog/', import.meta.url);
const OUT = new URL('../site/blog/', import.meta.url);
const SITE = 'https://playsacrament.com';

const page = (title, desc, path, inner) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="alternate" type="application/rss+xml" title="Sacrament updates" href="/blog/feed.xml">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#12100d">
<link rel="manifest" href="/site.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/theme.css">
<link rel="stylesheet" href="/blog.css">
<script src="/nav.js"></script>
</head>
<body>
${inner}
</body>
</html>
`;

const posts = readdirSync(SRC).filter((f) => f.endsWith('.md')).map((f) => parseFile(f, SRC)).sort((a, b) => b.date.localeCompare(a.date));
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const list = posts.map((p) => `<article class="card"><time datetime="${p.date}">${fmt(p.date)}</time><h2><a href="/blog/${p.slug}/">${esc(p.title)}</a></h2>${p.summary ? '<p>' + esc(p.summary) + '</p>' : ''}<a class="more" href="/blog/${p.slug}/">Read the update</a></article>`).join('\n');
writeFileSync(new URL('index.html', OUT), page('Updates | Sacrament', 'Progress updates on Sacrament, the tabletop roleplaying game: rules changes, the VTT and the character builder.', '/blog/',
  `<header class="bhead"><div class="wrap"><div class="label">Sacrament</div><h1>Updates</h1><p class="lede">How the game, the VTT and the character builder are coming along. <a href="/blog/feed.xml">Subscribe by RSS</a>.</p></div></header>
<main class="wrap blist">${list || '<p>Nothing here yet.</p>'}</main>`));

posts.forEach((p, n) => {
  const dir = new URL(p.slug + '/', OUT);
  mkdirSync(dir, { recursive: true });
  const newer = posts[n - 1], older = posts[n + 1];
  writeFileSync(new URL('index.html', dir), page(p.title + ' | Sacrament', p.summary || p.title, '/blog/' + p.slug + '/',
    `<main class="wrap post"><a class="back" href="/blog/">All updates</a><article><time datetime="${p.date}">${fmt(p.date)}</time><h1>${esc(p.title)}</h1><div class="body">${p.html}</div></article>
<nav class="pager" aria-label="More updates">${older ? '<a href="/blog/' + older.slug + '/">&larr; ' + esc(older.title) + '</a>' : '<span></span>'}${newer ? '<a href="/blog/' + newer.slug + '/">' + esc(newer.title) + ' &rarr;</a>' : ''}</nav></main>`));
});

const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>Sacrament updates</title><link>${SITE}/blog/</link><description>Progress on Sacrament, the tabletop roleplaying game.</description>
${posts.map((p) => `<item><title>${esc(p.title)}</title><link>${SITE}/blog/${p.slug}/</link><guid>${SITE}/blog/${p.slug}/</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.summary || '')}</description></item>`).join('\n')}
</channel></rss>
`;
writeFileSync(new URL('feed.xml', OUT), rss);
console.log('Built the blog: ' + posts.length + ' post(s).');
