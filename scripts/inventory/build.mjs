// Builds the unlisted inventory page, /inventory/, from scripts/inventory/items.mjs. The output (site/inventory/index.html) IS committed.
// It is deliberately not linked from anywhere, not in the sitemap, not in robots.txt, and marked noindex (in the page and in the response headers, see netlify.toml).
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { items, groups, problems, decisions, CHECKED, REPO_TREE } from './items.mjs';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const STATUS = { works: ['Works', 'ok'], present: ['Present', 'ok'], broken: ['Broken', 'bad'], duplicate: ['Duplicate', 'warn'], unverified: ["Couldn't verify", 'warn'], redirect: ['Redirect', 'ok'], locked: ['Locked', 'warn'], none: ['Nothing there', 'dim'], archived: ['Archived', 'ok'] };
const REC = { keep: 'Keep', merge: 'Merge', archive: 'Archive', decide: 'Your call' };

const rows = items.map((it, i) => ({ ...it, id: 'i' + (i + 1), status: (it.g === 'repo' || it.g === 'leftovers') && it.status === 'works' ? 'present' : it.status }));
const count = (f) => rows.filter(f).length;

const link = (it) => {
  const shown = it.display || it.url || it.repo || it.name;
  if (it.url) return `<a class="u" href="${esc(it.url)}">${esc(it.display || 'playsacrament.com' + it.url)}</a>`;
  if (it.repo) return `<a class="u" href="${esc(REPO_TREE + it.repo)}">${esc(shown)}</a> <span class="small">(project files; opens on GitHub)</span>`;
  return `<span class="u plain">${esc(shown)}</span>`;
};

const card = (it) => {
  const [stText, stCls] = STATUS[it.status];
  return `<article class="it" id="${it.id}" data-id="${it.id}" data-name="${esc(it.name)}" data-rec="${it.rec}" data-where="${esc(it.display || it.url || it.repo || '')}">
<h3>${esc(it.name)}</h3>
<p class="addr">${link(it)}</p>
<div class="cols">
<div><h4>What it is</h4><p>${esc(it.what)}</p></div>
<div><h4>Does it work?</h4><p><span class="badge ${stCls}">${stText}</span> ${esc(it.note)}</p></div>
<div><h4>What links to it</h4><p>${esc(it.from)}</p></div>
<div><h4>My recommendation</h4><p><span class="badge rec-${it.rec}">${REC[it.rec]}</span> ${esc(it.why)}</p>
<label class="pick">Your decision <select class="decide" aria-label="Your decision for ${esc(it.name)}"><option value="keep">Keep</option><option value="merge">Merge</option><option value="archive">Archive</option><option value="later">Decide later</option></select></label></div>
</div>
</article>`;
};

const sections = groups.map((g) => {
  const list = rows.filter((r) => r.g === g.id);
  return `<section class="grp" id="${g.id}"><h2>${esc(g.title)} <span class="n">${list.length}</span></h2><p class="intro">${esc(g.intro)}</p>${list.map(card).join('\n')}</section>`;
}).join('\n');

const toc = groups.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join('');
const decs = decisions.map((x) => `<li><b>${esc(x.d)}</b> ${esc(x.t)}</li>`).join('');
const probs = problems.map((p) => `<li><b>${esc(p.t)}.</b> ${esc(p.d)}</li>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Inventory | Sacrament</title>
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="description" content="A private list of everything on the site, for the owner.">
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/theme.css">
<script src="/nav.js"></script>
<style>
.inv{max-width:1100px;margin:0 auto;padding:32px max(16px,env(safe-area-inset-left)) 80px}
.inv h1{font-size:clamp(2.2rem,7vw,3.6rem);margin:6px 0 10px}
.inv .lede{font-size:1.1rem;max-width:70ch;color:var(--fg)}
.inv .box{background:var(--bg2);border-left:3px solid var(--candle);padding:14px 18px;margin:18px 0;max-width:80ch}
.inv .box h2{font-size:1.25rem;margin:0 0 6px}
.inv .box ul{margin:6px 0 0;padding-left:1.2em}.inv .box li{margin:.35em 0}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 4px}
.toc a{font-family:var(--label);font-size:.78rem;letter-spacing:.06em;text-transform:uppercase;padding:8px 12px;border:1px solid var(--line);text-decoration:none;color:var(--dim)}
.toc a:hover{color:var(--fg)}
.sum{display:flex;flex-wrap:wrap;gap:10px;margin:14px 0}
.sum span{padding:6px 12px;background:var(--bg2);border:1px solid var(--line);font-size:.95rem}
.grp{margin-top:38px}.grp h2{font-size:1.8rem;border-bottom:1px solid var(--line);padding-bottom:6px}
.grp .n{font:600 .8rem var(--label);color:var(--dim);vertical-align:middle;margin-left:6px}
.intro{color:var(--dim);max-width:75ch}
.it{background:var(--bg2);border:1px solid var(--line);padding:14px 16px;margin:14px 0}
.it h3{font-size:1.25rem;margin:0}
.addr{margin:4px 0 10px;word-break:break-all;font-size:.95rem}
.addr .u{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.92rem}
.addr .plain{color:var(--dim)}
.small{font-size:.82rem;color:var(--dim)}
.cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.cols h4{margin:0 0 4px;font:600 .72rem var(--label);letter-spacing:.14em;text-transform:uppercase;color:var(--candle)}
.cols p{margin:0;font-size:.95rem;line-height:1.5}
.badge{display:inline-block;font:700 .72rem var(--label);letter-spacing:.08em;text-transform:uppercase;padding:2px 8px;margin-right:4px;border:1px solid var(--line)}
.badge.ok{color:var(--verdigris);border-color:var(--verdigris)}.badge.bad{color:#fff;background:var(--blood);border-color:var(--blood-hi)}.badge.warn{color:var(--candle);border-color:var(--candle)}.badge.dim{color:var(--dim)}
.badge.rec-keep{color:var(--verdigris);border-color:var(--verdigris)}.badge.rec-merge{color:var(--candle);border-color:var(--candle)}.badge.rec-archive{color:#fff;background:var(--blood);border-color:var(--blood-hi)}.badge.rec-decide{color:var(--fg);border-style:dashed}
.pick{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:.85rem;color:var(--dim)}
.pick select{font:inherit;padding:6px 8px;background:var(--bg);color:var(--fg);border:1px solid var(--edge);min-height:36px}
.it.changed{border-left:4px solid var(--candle)}
.bar{position:sticky;bottom:0;z-index:20;background:var(--bg2);border-top:2px solid var(--candle);padding:10px max(16px,env(safe-area-inset-left));display:flex;flex-wrap:wrap;gap:10px;align-items:center}
.bar .btn{cursor:pointer;border:0}
.out{width:100%;min-height:160px;font:13px/1.4 ui-monospace,Menlo,Consolas,monospace;background:var(--bg);color:var(--fg);border:1px solid var(--line);padding:10px}
@media(max-width:900px){.cols{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.cols{grid-template-columns:1fr}.it h3{font-size:1.15rem}}
</style>
</head>
<body>
<main class="inv">
<div class="label">Private. For the owner only.</div>
<h1>Inventory</h1>
<p class="lede">Everything a person can reach on playsacrament.com, plus what is left over in the project. Nothing has been deleted: anything archived is moved to the archive folder and its old address redirects. This page is for you to go through and tell me what to keep, merge or archive.</p>

<div class="box"><h2>How to read it</h2>
<ul>
<li><b>Archive</b> means moving something out of public reach, with its old address redirecting somewhere sensible. It does not mean deleting.</li>
<li><b>Merge</b> means folding it into something else that does the same job.</li>
<li>Each item has a "Your decision" box, already set to my recommendation. Change the ones you disagree with, then press <b>Copy my decisions</b> at the bottom and paste the result to me.</li>
<li>Your choices stay in this browser only. Nothing is sent anywhere.</li>
</ul></div>

<div class="box"><h2>How this was checked (${esc(CHECKED)})</h2>
<ul>
<li>Every address was opened in a real browser against the live site, and every link on every page was followed. I also read all the project files.</li>
<li>"Works" means it loaded without errors, and (where the project has tests for it) the tests pass. It does not mean I used every feature.</li>
<li><b>I could not verify:</b> the Sacrament table (it needs Google's servers, which my setup cannot reach), the designer sign-in (needs your passphrase), and the playtest signup (submitting would add a real entry).</li>
<li>I can see what links to a page from inside the site. I cannot see links in other people's messages, other websites or search results, and I cannot see what Google has indexed.</li>
</ul></div>

<div class="sum"><span><b>${rows.length}</b> items</span><span><b>${count((r) => r.status === 'broken')}</b> broken</span><span><b>${count((r) => r.status === 'unverified' || r.status === 'locked')}</b> I could not fully verify</span><span><b>${count((r) => r.rec === 'keep')}</b> keep</span><span><b>${count((r) => r.rec === 'merge')}</b> merge</span><span><b>${count((r) => r.rec === 'archive')}</b> archive</span><span><b>${count((r) => r.rec === 'decide')}</b> your call</span></div>

<div class="box"><h2>Decisions so far</h2><ul>${decs}</ul></div>

<div class="box"><h2>Problems I noticed (not fixed)</h2><ul>${probs}</ul></div>

<nav class="toc" aria-label="Sections">${toc}</nav>
${sections}
</main>
<div class="bar" id="bar"><button class="btn" id="copy" type="button">Copy my decisions</button><span class="small" id="copied" role="status"></span><span class="small" id="changes"></span></div>
<script>
(function () {
  var KEY = 'inventory-decisions-v1', saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
  var cards = [].slice.call(document.querySelectorAll('.it'));
  function note() { var n = cards.filter(function (c) { return c.classList.contains('changed'); }).length; document.getElementById('changes').textContent = n ? n + ' changed from my recommendation' : 'all set to my recommendations'; }
  cards.forEach(function (c) {
    var sel = c.querySelector('select'), rec = c.getAttribute('data-rec'), def = rec === 'decide' ? 'later' : rec;
    sel.value = saved[c.id] || def;
    function mark() { c.classList.toggle('changed', sel.value !== def); }
    mark();
    sel.addEventListener('change', function () { saved[c.id] = sel.value; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch (e) {} mark(); note(); });
  });
  note();
  function text() {
    var by = { keep: [], merge: [], archive: [], later: [] };
    cards.forEach(function (c) { by[c.querySelector('select').value].push('- ' + c.getAttribute('data-name') + (c.getAttribute('data-where') ? '  (' + c.getAttribute('data-where') + ')' : '')); });
    return ['KEEP', 'MERGE', 'ARCHIVE', 'DECIDE LATER'].map(function (h, i) { var k = ['keep', 'merge', 'archive', 'later'][i]; return h + ' (' + by[k].length + ')\\n' + by[k].join('\\n'); }).join('\\n\\n');
  }
  document.getElementById('copy').addEventListener('click', function () {
    var t = text(), msg = document.getElementById('copied');
    function fallback() { var ta = document.createElement('textarea'); ta.className = 'out'; ta.value = t; ta.setAttribute('aria-label', 'Your decisions'); document.querySelector('.inv').appendChild(ta); ta.select(); msg.textContent = 'Select all of the text in the box at the bottom of the page and copy it.'; }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { msg.textContent = 'Copied. Paste it into your reply.'; }, fallback); else fallback();
  });
})();
</script>
</body>
</html>
`;
const OUT = process.env.INVENTORY_OUT ? pathToFileURL(process.env.INVENTORY_OUT.replace(/\/?$/, '/')) : new URL('../../site/inventory/', import.meta.url);
mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('index.html', OUT), html);
console.log('Built the inventory: ' + rows.length + ' items.');
