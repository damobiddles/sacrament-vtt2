// Builds the Sacrament RPG home page and its pages from content/landing/ into site/: the home page (/), the game, the setting, how to play,
// feedback, privacy, terms of use, and the news (/news/).
// The text lives in content/landing/*.md (see content/landing/README.md); news posts are one file each in content/landing/blog/.
// The output is not committed; Netlify runs this before publishing (see netlify.toml).
// For tests, LANDING_CONTENT and LANDING_OUT can point somewhere else.
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { esc, parse, fmt } from './lib/markdown.mjs';
import { rangeTable, ruleValues, tagTable, pathTable } from './lib/current-rules.mjs';
import '../site/vtt/rules.js';
import { lootCatalogue } from './lib/loot-catalogue.mjs';
import '../site/sheet/gear.js';
import '../site/nav.js';

const dirUrl = (p, fallback) => (p ? pathToFileURL(p.replace(/\/?$/, '/')) : new URL(fallback, import.meta.url));
const SRC = dirUrl(process.env.LANDING_CONTENT, '../content/landing/');
const OUT = dirUrl(process.env.LANDING_OUT, '../site/');
const SITE = 'https://playsacrament.com';
const cfg = existsSync(new URL('site.json', SRC)) ? JSON.parse(readFileSync(new URL('site.json', SRC), 'utf8')) : {};
const NAME = cfg.name || 'Sacrament RPG';

/* Public routes owned by this builder. Shared navigation lives in site/nav.js. */
const PAGES = [
  { slug: 'home', path: '/', label: 'Home' },
  { slug: 'the-game', path: '/the-game/', label: 'The game' },
  { slug: 'setting', path: '/setting/', label: 'The setting' },
  { slug: 'how-to-play', path: '/how-to-play/', label: 'Start here' },
  { slug: 'rules', path: '/rules/', label: 'Rules', guide: true },
  { slug: 'paths', path: '/rules/paths/', label: 'Paths', guide: true },
  { slug: 'player-guide', path: '/player-guide/', label: 'Player guide', guide: true },
  { slug: 'gm-guide', path: '/gm-guide/', label: 'GM guide', guide: true },
  { slug: 'rules-updates', path: '/rules/updates/', label: 'Rules updates', guide: true },
  { slug: 'play-online', path: '/play-online/', label: 'Play online' },
  { slug: 'play-in-person', path: '/play-in-person/', label: 'Play in person' },
  { slug: 'blog', path: '/news/', label: 'News' },
  { slug: 'resources', path: '/resources/', label: 'Resources' },
  { slug: 'scenes', path: '/scenes/', label: 'Free Scenes' },
  { slug: 'loot', path: '/loot/', label: 'Loot' },
  { slug: 'feedback', path: '/feedback/', label: 'Feedback' },
  { slug: 'privacy', path: '/privacy/', label: 'Privacy', footerOnly: true },
  { slug: 'terms', path: '/terms/', label: 'Terms of Use', footerOnly: true },
];

/* a "write this" marker in the text becomes a bright box (whole paragraph) or a bright highlight (inside a sentence) */
const todo = (html) => html
  .replace(/<blockquote>(YOUR TEXT HERE)/g, '<blockquote class="todo">$1')
  .replace(/\[\[(.*?)\]\]/g, '<mark class="todo-inline">$1</mark>');

const nav = globalThis.SacramentSite.navigation;
const footer = globalThis.SacramentSite.footer;

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
${nav(path)}
${inner}
${footer()}
</body>
</html>
`;

const head = (label, h1, lede) => `<header class="bhead"><div class="wrap"><div class="label">${esc(label)}</div><h1>${esc(h1)}</h1>${lede ? '<p class="lede">' + esc(lede) + '</p>' : ''}</div></header>`;
const RULES_TABS = [['/rules/', 'Rules'], ['/rules/paths/', 'Paths'], ['/player-guide/', 'Player guide'], ['/gm-guide/', 'GM guide'], ['/rules/updates/', 'Updates and errata']];
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


/* /play-in-person/: the downloads for a real table. Files live in site/downloads/ (committed). */
const pdfPair = (base, size) => '<a href="' + base + '-A4.pdf" download>A4 PDF</a> · <a href="' + base + '-Letter.pdf" download>US Letter PDF</a>' + (size ? ' <span class="small">(' + size + ' each)</span>' : '');
const dlCard = (tag, title, desc, links, img) => '<article class="card">' + (img ? '<img class="resource-image" src="' + img[0] + '" alt="' + esc(img[1]) + '" loading="lazy" decoding="async">' : '') + '<span class="tag">' + tag + '</span><h3>' + title + '</h3><p>' + desc + '</p><p class="dl-links">' + links + '</p></article>';
function playInPerson(html) {
  const paths = '<nav class="role-paths" aria-label="On this page"><a href="#what-to-bring">What to bring</a><a href="#free-printables">Free printables</a><a href="#the-adventure-the-guest-at-greave">The adventure</a><a href="#a-shorter-adventure-the-rib-of-saint-hussey">A shorter adventure</a><a href="#the-rules-at-a-glance">The rules at a glance</a></nav>';
  const downloads = '<div class="resource-grid">' + [
    dlCard('For everyone', 'Print-and-play kit', 'Nine sheets: a quick reference, a blank character sheet with a notes page, the Horror track and a fold-up Target sign, foe and obstacle cards, turn slips and countdowns, a healing log, item and grimoire cards, and a what-to-bring checklist.', pdfPair('/downloads/print-kit/sacrament-print-kit', '0.5 MB')),
    dlCard('For everyone', 'Rules cheat sheet', 'Three pages with the current rules to hand: checks, Effort, Push, Break away, the Horror and paying in blood, gear, healing and dying, what story spells do, darkness, growing stronger, and the GM’s side. Updated 8 November 2026.', pdfPair('/downloads/players/sacrament-rules-cheat-sheet', '0.4 MB')),
    dlCard('For players', 'Blank hero sheet', 'A character sheet to fill in by hand, with the Marks box for growing stronger and a notes page on the back.', pdfPair('/downloads/players/sacrament-hero-sheet', '0.2 MB') + '</p><p class="dl-links"><a href="/character/">Or make a hero on My heroes</a> and press Print or save as PDF for a filled-in sheet.'),
    dlCard('For the GM', 'Current Loot Tables', 'Every item, grimoire and relic, with the d100 tables you roll when the heroes search. Print the page or keep it open on a phone.', '<a class="btn" href="/loot/">Open the loot tables</a>'),
  ].join('') + '</div>';
  const adventure = '<div class="resource-grid">' + [
    dlCard('For the GM', 'The Guest at Greave', 'The full adventure: the priory and its people, five scenes, the monster and how to run the suspicion. Read it online or print all 20 pages.', '<a class="btn" href="/adventures/the-guest-at-greave/">Read it online</a></p><p class="dl-links">' + pdfPair('/downloads/adventures/the-guest-at-greave', '0.8 MB')),
    dlCard('For the GM', 'The adventure, narrated', 'The whole adventure read aloud, for preparing on a walk or a commute. It gives away every secret.', '<a href="/downloads/adventures/the-guest-at-greave-audio.mp3" download>MP3, 37 minutes</a> <span class="small">(18 MB)</span>'),
    dlCard('For the players', 'Before the Snow', 'The opening reading: the world as the Church tells it, the village of Tarnwick, and the fire that did not burn. One player reads it aloud before the first scene. No spoilers.', pdfPair('/downloads/adventures/before-the-snow', '0.2 MB') + '</p><p class="dl-links"><a href="/downloads/adventures/before-the-snow.mp3" download>Narrated MP3, 4 minutes</a> <span class="small">(6 MB)</span>'),
    dlCard('For the players', 'The players’ map', 'A charcoal sketch of the priory, the glacier and the gorge, as the heroes first see them. Safe to put on the table.', pdfPair('/downloads/adventures/the-guest-at-greave-players-map', '4 MB'), ['/art/adventures/the-guest-at-greave-map.webp', 'A charcoal sketch map of a walled priory below a glacier, with a gorge and a rope bridge beneath it']),
  ].join('') + '</div>';
  const hussey = '<div class="resource-grid">' + [
    dlCard('For the GM', 'The Rib of Saint Hussey: GM pack', 'One zip with everything to run it offline, in A4 and US Letter: the adventure, the plot on one page, GM cards to cut out and cross off, a blank hero sheet and the rules cheat sheet.', '<a class="btn" href="/downloads/adventures/the-rib-of-saint-hussey-gm-pack.zip" download>Download the GM pack</a> <span class="small">(zip, 2.4 MB)</span></p><p class="dl-links"><a href="/adventures/the-rib-of-saint-hussey/">Or read it online</a>'),
    dlCard('For the GM', 'The adventure, one file at a time', 'The same printouts as the pack, if you only want one of them.', 'The adventure: ' + pdfPair('/downloads/adventures/the-rib-of-saint-hussey', '0.6 MB') + '</p><p class="dl-links">Plot on one page: ' + pdfPair('/downloads/adventures/the-rib-of-saint-hussey-plot') + '</p><p class="dl-links">GM cards: ' + pdfPair('/downloads/adventures/the-rib-of-saint-hussey-gm-cards')),
  ].join('') + '</div>';
  const jobs = [
    ['Adding up checks against the Target', 'The player says the total; the GM confirms it'],
    ['Taking damage off HP, or adding progress to an obstacle', 'The GM crosses boxes on the foe card; players erase their own HP'],
    ['Adding Horror for spells, items, natural 1s and Pushes', 'Whoever caused it moves the coin on the Horror track'],
    ['Paying in blood past 21', 'The hero who caused it rolls d4 for each point and loses that HP'],
    ['Remembering who has had which healing since the last rest', 'The healing log in the kit'],
    ['Ticking countdowns and dying heroes each round', 'The GM, each time the round coin moves'],
    ['Rolling loot', 'The GM, with the printed loot tables'],
    ['Keeping hidden foes and GM notes secret', 'Face-down cards and the GM screen'],
    ['Undo', 'An eraser, and an honest table'],
  ];
  const jobTable = '<div class="table-scroll"><table class="jobs"><thead><tr><th scope="col">The job</th><th scope="col">Who does it at a real table</th></tr></thead><tbody>' + jobs.map(([a, b]) => '<tr><td>' + a + '</td><td>' + b + '</td></tr>').join('') + '</tbody></table></div>';
  html = html.replace(/<h2>(.*?)<\/h2>/g, (_, t) => '<h2 id="' + t.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '">' + t + '</h2>');
  return html.replace('<p>{{PLAY_PATHS}}</p>', paths).replace('<p>{{DOWNLOADS}}</p>', downloads).replace('<p>{{ADVENTURE}}</p>', adventure).replace('<p>{{ADVENTURE_HUSSEY}}</p>', hussey).replace('<p>{{JOBS}}</p>', jobTable);
}

/* /play-online/: the ways into the Sacrament RPG Table. */
function playOnline(html) {
  const cards = [
    ['For players', 'Join a game', '/vtt/?join', 'Your GM gives you a six-letter code or an invitation link. Enter it with your name and you are at the table.', 'Join a game'],
    ['For the GM', 'Run a game', '/vtt/?run', 'Make a table and get a code to share. Start with the sample encounter to learn the controls, or begin empty.', 'Run a game'],
    ['For players', 'My heroes', '/character/', 'Generate a hero, change the sheet and bring it to any table. Heroes are kept in this browser; download a backup to keep them safe.', 'Open My heroes'],
    ['For everyone', 'Your tables', '/vtt/', 'Go back to a table you have played at on this device, as a player or as its GM.', 'Open the table'],
  ];
  return html.replace('<p>{{ONLINE_PATHS}}</p>', '<div class="resource-grid">' + cards.map(([tag, title, url, desc, label]) => '<article class="card"><span class="tag">' + tag + '</span><h2>' + title + '</h2><p>' + desc + '</p><a class="btn" href="' + url + '">' + label + '</a></article>').join('') + '</div>');
}

function resources() {
  const cards = [
    ['Heroes', 'My heroes', '/character/', 'Generate a character, customise the sheet, print it, or download and restore a private backup.', 'Build and manage heroes'],
    ['For the GM', 'Current Loot Tables', '/loot/', 'Browse the catalogue, roll a random find and learn about creating custom loot.', 'Browse and roll loot'],
    ['For the GM', 'Free Scenes', '/scenes/', 'Download a prepared encounter with pictures, enemies and obstacles, ready to import into your own table.', 'Find a scene'],
    ['For creators', 'Brand kit', '/brand/', 'Logos, colours, typefaces and sharing assets for writing about Sacrament.', 'Open the brand kit']
  ];
  return '<div class="resource-grid">' + cards.map(([tag,title,url,desc,label]) => '<article class="card"><span class="tag">' + tag + '</span><h2>' + title + '</h2><p>' + desc + '</p><a class="btn" href="' + url + '">' + label + '</a></article>').join('') + '</div><section class="resource-art" aria-labelledby="artwork-title"><h2 id="artwork-title">Scenes for your table</h2><p>Free artwork downloads from our news posts. Keep the original files for your table, or use the smaller WebP where available.</p><div class="resource-grid">' + [
    ['Cathedral ritual chamber','/art/vtt-gifts/cathedral-ritual-chamber.webp','A battle map of a ritual chamber beneath a cathedral','/art/vtt-gifts/cathedral-ritual-chamber.png'],
    ['Graveyard encounter','/art/ghoul_graveyard_1920x1280.webp','A ghoul in a graveyard'],
    ['Hollowmere road','/art/vtt-gifts/hollowmere-pilgrim-road.webp','A pilgrim road with a church and plague cart']
  ].map(([title,src,alt,original]) => '<article class="card"><img class="resource-image" src="' + src + '" alt="' + alt + '" loading="lazy" decoding="async"><h3>' + title + '</h3><p><a href="' + (title === 'Hollowmere road' ? '/art/vtt-gifts/hollowmere-pilgrim-road.png' : original || src) + '" download>Download ' + title.toLowerCase() + '</a>' + (title === 'Hollowmere road' ? ' · <a href="' + src + '" download>Smaller WebP</a>' : '') + '</p></article>').join('') + '</div><p><a href="/news/a-steadier-table/">Read about the artwork and VTT updates</a></p></section><section class="resource-history"><h2>Earlier development</h2><p><a href="/adventure/">The Sexton’s Ledger playtest</a> records an adventure using an earlier version of the rules. For current play, use the <a href="/rules/">player and GM guides</a>.</p></section>';
}

function build() {
  /* The output folder is the whole site, so clear only the folders this script makes (never anything else). */
  mkdirSync(OUT, { recursive: true });
  for (const p of PAGES) if (p.path !== '/') rmSync(new URL('.' + p.path, OUT), { recursive: true, force: true });
  rmSync(new URL('./news/', OUT), { recursive: true, force: true });
  rmSync(new URL('./support/', OUT), { recursive: true, force: true });
  rmSync(new URL('./newsletter/', OUT), { recursive: true, force: true });
  const write = (path, html) => { const dir = new URL('.' + path, OUT); mkdirSync(dir, { recursive: true }); writeFileSync(new URL('index.html', dir), html); };
  const BSRC = new URL('blog/', SRC);
  const posts = existsSync(BSRC) ? readdirSync(BSRC).filter((f) => f.endsWith('.md')).map((f) => parse(f, BSRC)).sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug)) : [];
  const latest = posts[0];
  const latestPost = latest ? `<section class="ic-latest" aria-labelledby="latest-post-heading"><h2 id="latest-post-heading">Latest news</h2><article><img class="ic-latest-image" src="${esc(postImage(latest).src)}" alt="${esc(postImage(latest).alt)}" loading="lazy" decoding="async"><div><time datetime="${latest.date}">${fmt(latest.date)}</time><h3><a href="/news/${latest.slug}/">${esc(latest.title)}</a></h3>${latest.summary ? '<p>' + esc(latest.summary) + '</p>' : ''}<a class="more" href="/news/${latest.slug}/" aria-label="${esc('Read more: ' + latest.title)}">Read more</a></div></article></section>` : '';

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
<p class="ic-cta"><a class="btn" href="/vtt/?join">Join a game</a> <a class="btn" href="/vtt/?run">Run a game</a> <a class="btn" href="/character/">My heroes</a> <a class="btn" href="/solo/">Play solo</a></p>
<p class="small">Joining a game? You need a six-letter code or an invitation link from your GM. Running one? You get a code to share. Playing around a real table? <a href="/play-in-person/">Get the printables</a>. On your own? <a href="/solo/">Walk the Pilgrim Road</a>, a solo adventure for one hero.</p>
<p class="small ic-flavour"><em>The Church keeps the world. Someone has to go where it won't.</em></p></div></header>
<main class="wrap blist ic-cards"><section class="site-start" aria-labelledby="start-heading"><h2 id="start-heading">Find your way into Sacrament</h2><div class="site-paths"><div><h3>Discover the game</h3><p>Learn what you play, how the dice work and the world your heroes inhabit.</p><a href="/the-game/">Meet Sacrament RPG</a></div><div><h3>Play your first session</h3><p>Follow a short checklist for players and GMs, with links to the current rules.</p><a href="/how-to-play/">Start here</a></div><div><h3>Play online</h3><p>Join a game with a code from your GM, or make a table and invite your players.</p><a href="/play-online/">Play online</a></div><div><h3>Play around a real table</h3><p>Print the sheets, bring dice and run a ready-made adventure, no screens needed.</p><a href="/play-in-person/">Play in person</a></div></div></section>${cards}${latestPost}<p class="ic-more"><a href="/news/">All the news</a> &middot; <a href="/feedback/">Share feedback</a></p>
${notes('early', 'This is an early version, built in the open. The rules it follows are still being worked out, so some details may change.')}
</main>`));

  /* the text pages */
  const text = (slug, label, extraAfter = '', extraBefore = '') => {
    const p = read(slug), meta = PAGES.find((x) => x.slug === slug);
    let html = todo(p.html).replace(/<(\/?)(h[34])>/g, (_, close, tag) => '<' + close + 'h' + (Number(tag[1]) - 1) + '>');
    if (slug === 'play-in-person') html = playInPerson(html);
    if (slug === 'play-online') html = playOnline(html);
    html = html.replace('<p>{{RANGES}}</p>', rangeTable(globalThis.SacramentRules)).replace('<p>{{RULE_VALUES}}</p>', ruleValues(globalThis.SacramentRules)).replace('<p>{{TAGS}}</p>', tagTable(globalThis.SACRAMENT_GEAR)).replace('<p>{{PATHS}}</p>', pathTable(globalThis.SACRAMENT_GEAR));
    if (meta.guide) {
      const sections = [];
      html = html.replace(/<h2>(.*?)<\/h2>/g, (_, title) => {
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        sections.push({ id, title });
        return '<h2 id="' + id + '">' + title + '</h2>';
      });
      html = '<nav class="guide-contents" aria-label="On this page"><h2>On this page</h2><ul>' + sections.map(s => '<li><a href="#' + s.id + '">' + s.title + '</a></li>').join('') + '</ul></nav>' + html;
    }
    /* The four rules pages share one row of tabs, so each is one click from the others. */
    if (RULES_TABS.some(([path]) => path === meta.path)) {
      html = '<nav class="role-paths rules-tabs" aria-label="Rules pages">' + RULES_TABS.map(([path, name]) => '<a href="' + path + '"' + (path === meta.path ? ' aria-current="page"' : '') + '>' + name + '</a>').join('') + '</nav>' + html;
    }
    if (slug === 'how-to-play') {
      html = html.replace('<h2>I am a player</h2>', '<h2 id="for-players">I am a player</h2>').replace('<h2>I am the GM</h2>', '<h2 id="for-gms">I am the GM</h2>');
      html = '<nav class="role-paths" aria-label="Choose your role"><a href="#for-players">I am a player</a><a href="#for-gms">I am the GM</a><a href="/rules/">Find a rules guide</a><a href="/play-in-person/">Playing with paper and dice?</a></nav>' + html;
    }
    write(meta.path, page(p.title + ' | ' + NAME, p.summary, meta.path,
      `${head(label, p.title, p.summary)}<main class="wrap post ic-body${slug === 'resources' ? ' site-resources' : ''}"><div class="body">${extraBefore}${extraBefore ? '<section id="about-loot" class="loot-about"><h2>About these tables</h2>' + html + '</section>' : html}${extraAfter}</div></main>`));
  };
  text('the-game', NAME, '<aside class="site-next"><h2>Ready to play?</h2><p><a class="btn" href="/how-to-play/">Start your first game</a> <a href="/setting/">Explore the setting</a></p></aside>');
  text('setting', NAME, '<aside class="site-next"><h2>Take a hero into this world</h2><p><a class="btn" href="/character/">Create a hero</a> <a href="/how-to-play/">Learn how to play</a></p></aside>');
  text('how-to-play', NAME);
  text('rules', NAME);
  text('paths', NAME);
  text('player-guide', NAME);
  text('gm-guide', NAME);
  text('rules-updates', NAME);
  text('play-online', NAME, '<aside class="site-next"><h2>Another way to play</h2><p><a class="btn" href="/solo/">Play solo</a> <a href="/play-in-person/">Play around a real table</a></p></aside>');
  text('play-in-person', NAME, '<aside class="site-next"><h2>Rather play online?</h2><p>The same rules run on the Sacrament RPG Table, which rolls, adds up and keeps the Horror for you. <a class="btn" href="/play-online/">Play online</a></p></aside>');
  text('resources', NAME, resources());
  text('scenes', NAME);
  text('loot', NAME, '', lootCatalogue(globalThis.SACRAMENT_GEAR));
  text('feedback', NAME, feedbackForm + '<aside class="site-next"><h2>Looking for help with a game?</h2><p>Use <a href="/how-to-play/">Start here</a>, <a href="/player-guide/">player guide</a> or <a href="/gm-guide/">GM guide</a>. Follow <a href="/news/">News</a> for published updates.</p></aside>');
  write('/feedback/thanks/', page('Thank you | ' + NAME, 'Thank you for helping improve the table.', '/feedback/thanks/', `${head(NAME, 'Thank you for your feedback', 'Your feedback has been sent.')}<main class="wrap post"><p>We review feedback privately to plan fixes and improvements. Follow <a href="/news/">News</a> for updates.</p><p><a class="btn" href="/vtt/">Back to the table</a> <a href="/feedback/">Send more feedback</a></p></main>`, '<meta name="robots" content="noindex">'));
  text('privacy', NAME);
  text('terms', NAME);

  /* the blog */
  const list = posts.map((p) => `<article class="card"><time datetime="${p.date}">${fmt(p.date)}</time><h2><a href="/news/${p.slug}/">${esc(p.title)}</a></h2>${p.summary ? '<p>' + esc(p.summary) + '</p>' : ''}<a class="more" href="/news/${p.slug}/">Read the post</a></article>`).join('\n');
  write('/news/', page('News | ' + NAME, 'News and notes about the ' + NAME + '.', '/news/',
    `${head(NAME, 'News', 'Updates, playtest notes and free artwork for your table.')}<main class="wrap blist">${list || '<p>Nothing here yet.</p>'}</main>`));
  posts.forEach((p, n) => {
    const newer = posts[n - 1], older = posts[n + 1];
    write('/news/' + p.slug + '/', page(p.title + ' | ' + NAME, p.summary || p.title, '/news/' + p.slug + '/',
      `<main class="wrap post"><a class="back" href="/news/">All news</a><article><time datetime="${p.date}">${fmt(p.date)}</time><h1>${esc(p.title)}</h1><div class="body">${todo(p.html).replace(/<(\/?)(h[34])>/g, (_, close, tag) => '<' + close + 'h' + (Number(tag[1]) - 1) + '>').replace(/<h2>(.*?)<\/h2>/g, (_, t) => '<h2 id="' + t.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '">' + t + '</h2>')}</div><aside class="site-next"><h2>Plan your next session</h2><p>This post records the game at its publication date. Use the <a href="/player-guide/">current player guide</a> or <a href="/gm-guide/">GM guide</a> for today’s VTT rules, and find <a href="/resources/">tools and artwork</a> for your table.</p></aside></article>
<nav class="pager" aria-label="More posts">${older ? '<a href="/news/' + older.slug + '/">&larr; ' + esc(older.title) + '</a>' : '<span></span>'}${newer ? '<a href="/news/' + newer.slug + '/">' + esc(newer.title) + ' &rarr;</a>' : ''}</nav></main>`, '', postImage(p)));
  });
  const urls = [...new Set([...PAGES.map(p => p.path), '/character/', '/vtt/', '/solo/', '/brand/', '/adventure/', '/adventures/the-guest-at-greave/', '/adventures/the-rib-of-saint-hussey/', ...posts.map(p => '/news/' + p.slug + '/')])];
  writeFileSync(new URL('sitemap.xml', OUT), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.map(path => '<url><loc>' + SITE + esc(path) + '</loc></url>').join('\n') + '\n</urlset>\n');
  console.log('Built the Sacrament RPG pages: ' + PAGES.length + ' pages and ' + posts.length + ' post(s).');
}
build();
