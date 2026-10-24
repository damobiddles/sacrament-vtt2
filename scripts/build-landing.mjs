// Builds the Sacrament RPG home page and its pages from content/landing/ into site/: the home page (/), the game, the setting, how to play,
// feedback, privacy, terms of use, and the news (/news/).
// The text lives in content/landing/*.md (see content/landing/README.md); news posts are one file each in content/landing/blog/.
// The output is not committed; Netlify runs this before publishing (see netlify.toml).
// For tests, LANDING_CONTENT and LANDING_OUT can point somewhere else.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { esc, parse, fmt } from './lib/markdown.mjs';
import { lootCatalogue } from './lib/loot-catalogue.mjs';
import '../site/sheet/gear.js';

const dirUrl = (p, fallback) => (p ? pathToFileURL(p.replace(/\/?$/, '/')) : new URL(fallback, import.meta.url));
const SRC = dirUrl(process.env.LANDING_CONTENT, '../content/landing/');
const OUT = dirUrl(process.env.LANDING_OUT, '../site/');
const SITE = 'https://playsacrament.com';
const cfg = existsSync(new URL('site.json', SRC)) ? JSON.parse(readFileSync(new URL('site.json', SRC), 'utf8')) : {};
const NAME = cfg.name || 'Sacrament RPG Table';

/* the pages, in the order of the bar across the top (Privacy and Terms are in the footer) */
const PAGES = [
  { slug: 'home', path: '/', label: 'Home' },
  { slug: 'the-game', path: '/the-game/', label: 'The game' },
  { slug: 'setting', path: '/setting/', label: 'The setting' },
  { slug: 'how-to-play', path: '/how-to-play/', label: 'How to play' },
  { slug: 'player-guide', path: '/player-guide/', label: 'Player guide', guide: true },
  { slug: 'gm-guide', path: '/gm-guide/', label: 'GM guide', guide: true },
  { slug: 'blog', path: '/news/', label: 'News' },
  { slug: 'loot', path: '/loot/', label: 'Loot' },
  { slug: 'feedback', path: '/feedback/', label: 'Feedback' },
  { slug: 'privacy', path: '/privacy/', label: 'Privacy', footerOnly: true },
  { slug: 'terms', path: '/terms/', label: 'Terms of Use', footerOnly: true },
];

/* a "write this" marker in the text becomes a bright box (whole paragraph) or a bright highlight (inside a sentence) */
const todo = (html) => html
  .replace(/<blockquote>(YOUR TEXT HERE)/g, '<blockquote class="todo">$1')
  .replace(/\[\[(.*?)\]\]/g, '<mark class="todo-inline">$1</mark>');

const nav = (current) => `<nav class="ic-nav" aria-label="Sacrament RPG"><div class="ic-nav-inner"><ul>${PAGES.filter((p) => !p.footerOnly && !p.guide).map((p) => `<li><a href="${p.path}"${p.path === current ? ' aria-current="page"' : ''}>${p.label}</a></li>`).join('')}</ul><div class="ic-kofi" aria-label="Support Sacrament on Ko-fi"><script src="https://storage.ko-fi.com/cdn/widget/Widget_2.js"></script><script>if (window.kofiwidget2) { kofiwidget2.init('Support me on Ko-fi', '#72a4f2', 'J4M02969C2'); kofiwidget2.draw(); }</script><noscript><a href="https://ko-fi.com/J4M02969C2" rel="noopener noreferrer">Support me on Ko-fi</a></noscript></div></div></nav>`;
const footer = () => `<footer class="ic-foot"><div class="wrap"><p><b>${esc(NAME)}</b>. Keep to the consecrated roads.</p><p><a href="/privacy/">Privacy Policy</a> &middot; <a href="/terms/">Terms of Use</a></p><p>&copy; ${new Date().getFullYear()} Dungeon Jukebox, also known as Damien Bidmead. All rights reserved.</p></div></footer>`;

const postImage = (p) => ({
  src: /^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:png|webp|jpe?g)$/.test(p.image || '') ? p.image : '/og-image.png',
  alt: p.image_alt || p.title || NAME,
});
const page = (title, desc, path, inner, extraHead = '', social = { src: '/og-image.png', alt: NAME }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:type" content="website">
<meta property="og:image" content="${SITE}${esc(social.src)}">
<meta property="og:image:alt" content="${esc(social.alt)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${SITE}${esc(social.src)}">
<meta name="twitter:image:alt" content="${esc(social.alt)}">
<meta name="theme-color" content="#12100d">
<link rel="manifest" href="/site.webmanifest">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="stylesheet" href="/theme.css">
<link rel="stylesheet" href="/blog.css">
<link rel="stylesheet" href="/landing.css">
<script src="/nav.js"></script>
${extraHead}</head>
<body data-focus>
${nav(path.startsWith('/news/') ? '/news/' : path)}
${inner}
${footer()}
</body>
</html>
`;

const head = (label, h1, lede) => `<header class="bhead"><div class="wrap"><div class="label">${esc(label)}</div><h1>${esc(h1)}</h1>${lede ? '<p class="lede">' + esc(lede) + '</p>' : ''}</div></header>`;
const read = (slug) => parse(slug + '.md', SRC, { needDate: false });
const notes = (kind, text) => `<div class="ic-note ${kind}">${text}</div>`;

const feedbackForm = `<form class="ic-form feedback-form" name="vtt-feedback" method="POST" action="/feedback/thanks/" data-netlify="true" netlify-honeypot="website">
<input type="hidden" name="form-name" value="vtt-feedback">
<p hidden><label>Leave this blank <input name="website" tabindex="-1" autocomplete="off"></label></p>
<label for="feedback-topic">What would you like to share?</label>
<select id="feedback-topic" name="topic"><option value="bug">Report a bug</option><option value="suggestion">Suggest an improvement</option><option value="liked">Something I liked</option><option value="other">Other feedback</option></select>
<label for="feedback-message">Your feedback <span class="small">(required)</span></label>
<p id="feedback-message-hint" class="small">For a bug, tell us what you tried, what you expected and what happened instead.</p>
<textarea id="feedback-message" name="message" rows="6" required maxlength="6000" aria-describedby="feedback-message-hint"></textarea>
<label for="feedback-device">Device and browser <span class="small">(optional)</span></label>
<input id="feedback-device" name="device" type="text" maxlength="150" placeholder="For example: iPhone, Safari">
<p class="small">Sent privately to the Sacrament team. Please leave out private GM links, access keys and other players' personal information. <a href="/privacy/">Privacy policy</a>.</p>
<button class="btn" type="submit">Send feedback</button>
</form>`;


function build() {
  /* The output folder is the whole site, so clear only the folders this script makes (never anything else). */
  mkdirSync(OUT, { recursive: true });
  for (const p of PAGES) if (p.path !== '/') rmSync(new URL('.' + p.path, OUT), { recursive: true, force: true });
  rmSync(new URL('./news/', OUT), { recursive: true, force: true });
  rmSync(new URL('./support/', OUT), { recursive: true, force: true });
  rmSync(new URL('./newsletter/', OUT), { recursive: true, force: true });
  const write = (path, html) => { const dir = new URL('.' + path, OUT); mkdirSync(dir, { recursive: true }); writeFileSync(new URL('index.html', dir), html); };
  const BSRC = new URL('blog/', SRC);
  const posts = existsSync(BSRC) ? readdirSync(BSRC).filter((f) => f.endsWith('.md')).map((f) => parse(f, BSRC)).sort((a, b) => b.date.localeCompare(a.date)) : [];
  const latest = posts[0];
  const latestPost = latest ? `<section class="ic-latest" aria-labelledby="latest-post-heading"><h2 id="latest-post-heading">Latest from the blog</h2><article><img class="ic-latest-image" src="${esc(postImage(latest).src)}" alt="${esc(postImage(latest).alt)}" loading="lazy" decoding="async"><div><time datetime="${latest.date}">${fmt(latest.date)}</time><h3><a href="/news/${latest.slug}/">${esc(latest.title)}</a></h3>${latest.summary ? '<p>' + esc(latest.summary) + '</p>' : ''}<a class="more" href="/news/${latest.slug}/" aria-label="${esc('Read more: ' + latest.title)}">Read more</a></div></article></section>` : '';

  /* home */
  const h = read('home');
  const homeArt = [
    { file: 'sacrament-home-1', alt: 'A cloaked traveller crosses a stone bridge towards a lantern-lit church' },
    { file: 'sacrament-home-2', alt: 'A necromancer performs a ritual amid standing stones and skulls' },
    { file: 'sacrament-home-3', alt: 'A ruined chapel with a fallen bell and candles around a carved altar' },
  ];
  const cards = h.body.split(/^## /m).slice(1).map((c, i) => { const [t, ...rest] = c.split('\n'); const art = homeArt[i]; const picture = art ? `<picture class="ic-card-art"><img src="/art/${art.file}.webp" alt="${esc(art.alt)}" loading="lazy" decoding="async" width="800" height="800"></picture>` : ''; return `<article class="card ic-illustrated-card">${picture}<h2>${esc(t.trim())}</h2><p>${esc(rest.join(' ').trim())}</p></article>`; }).join('');
  write('/', page(h.title + ' | A shared table in your browser', h.summary, '/',
    `<header class="bhead ic-hero"><div class="wrap"><div class="label">A tabletop roleplaying game</div><div class="ic-hero-title"><h1>${esc(h.title)}</h1><img class="ic-hero-symbol" src="/favicon.svg" width="108" height="108" alt="" aria-hidden="true"></div><p class="lede">${esc(h.lede || h.summary)}</p>
<p class="ic-cta"><a class="btn" href="/vtt/?join">Join a game</a> <a class="btn" href="/vtt/?run">Run a game</a> <a class="btn" href="/character/">Build and manage characters</a></p>
<p class="small">Joining a game? You need a six-letter code or an invitation link from your GM. Running one? You get a code to share.</p>
<p class="small ic-flavour"><em>The Church keeps the world. Someone has to go where it won't.</em></p></div></header>
<main class="wrap blist ic-cards">${cards}${latestPost}<p class="ic-more"><a href="/how-to-play/">How to play here</a> &middot; <a href="/the-game/">About the game</a></p>
${notes('early', 'This is an early version, built in the open. The rules it follows are still being worked out, so some details may change.')}
</main>`));

  /* the text pages */
  const text = (slug, label, extraAfter = '') => {
    const p = read(slug), meta = PAGES.find((x) => x.slug === slug);
    let html = todo(p.html);
    if (meta.guide) {
      const sections = [];
      html = html.replace(/<h3>(.*?)<\/h3>/g, (_, title) => {
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        sections.push({ id, title });
        return '<h2 id="' + id + '">' + title + '</h2>';
      });
      html = '<nav class="guide-contents" aria-label="On this page"><h2>On this page</h2><ul>' + sections.map(s => '<li><a href="#' + s.id + '">' + s.title + '</a></li>').join('') + '</ul></nav>' + html;
    }
    write(meta.path, page(p.title + ' | ' + NAME, p.summary, meta.path,
      `${head(label, p.title, p.summary)}<main class="wrap post ic-body"><div class="body">${html}${extraAfter}</div></main>`));
  };
  text('the-game', NAME);
  text('setting', NAME);
  text('how-to-play', NAME);
  text('player-guide', NAME);
  text('gm-guide', NAME);
  text('loot', NAME, lootCatalogue(globalThis.SACRAMENT_GEAR));
  text('feedback', NAME, feedbackForm);
  write('/feedback/thanks/', page('Thank you | ' + NAME, 'Thank you for helping improve the table.', '/feedback/thanks/', `${head(NAME, 'Thank you for your feedback', 'Your feedback has been sent.')}<main class="wrap post"><p>Thank you for helping improve the table.</p><p><a class="btn" href="/vtt/">Back to the table</a> <a href="/feedback/">Send more feedback</a></p></main>`, '<meta name="robots" content="noindex">'));
  text('privacy', NAME);
  text('terms', NAME);

  /* the blog */
  const list = posts.map((p) => `<article class="card"><time datetime="${p.date}">${fmt(p.date)}</time><h2><a href="/news/${p.slug}/">${esc(p.title)}</a></h2>${p.summary ? '<p>' + esc(p.summary) + '</p>' : ''}<a class="more" href="/news/${p.slug}/">Read the post</a></article>`).join('\n');
  write('/news/', page('Blog | ' + NAME, 'News and notes about the ' + NAME + '.', '/news/',
    `${head(NAME, 'Blog', 'News and notes about the table.')}<main class="wrap blist">${list || '<p>Nothing here yet.</p>'}</main>`));
  posts.forEach((p, n) => {
    const newer = posts[n - 1], older = posts[n + 1];
    write('/news/' + p.slug + '/', page(p.title + ' | ' + NAME, p.summary || p.title, '/news/' + p.slug + '/',
      `<main class="wrap post"><a class="back" href="/news/">All posts</a><article><time datetime="${p.date}">${fmt(p.date)}</time><h1>${esc(p.title)}</h1><div class="body">${todo(p.html)}</div></article>
<nav class="pager" aria-label="More posts">${older ? '<a href="/news/' + older.slug + '/">&larr; ' + esc(older.title) + '</a>' : '<span></span>'}${newer ? '<a href="/news/' + newer.slug + '/">' + esc(newer.title) + ' &rarr;</a>' : ''}</nav></main>`, '', postImage(p)));
  });
  console.log('Built the Sacrament RPG pages: ' + PAGES.length + ' pages and ' + posts.length + ' post(s).');
}
build();
