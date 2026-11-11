/* Sacrament RPG: a hero's printable character sheet (/character/print/).
   The layout follows the print-and-play kit's Hero sheet, filled in from a hero made on My heroes. The hero arrives in the address
   after the "#" (that part is never sent to the server), so a hero that has not been kept yet can be printed too.
   It decides nothing: every number comes from sheet-core.js and rules.js, the same as the sheet on screen.
   The address "#blank" prints an empty sheet to fill in by hand (the blank hero sheet offered on Play in person is made from it).
   SacramentPrint.read(hash) -> a tidied hero or null; SacramentPrint.html(hero) -> the sheet's markup; SacramentPrint.blank() -> an empty sheet's markup. */
(function (root) {
  'use strict';
  var C = root.SacramentSheetCore, R = root.SacramentRules, B = R.BUILD;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sgn = function (n) { return n < 0 ? '−' + Math.abs(n) : '+' + n; };
  var int = function (v, d) { v = parseInt(v, 10); return isFinite(v) ? v : d; };
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  var STAT_HELP = { STR: 'force, climbing, melee', DEX: 'shooting, stealth, balance', CON: 'endurance, Defence', INT: 'knowledge, most spells', WIS: 'awareness, healing', CHA: 'persuasion, presence' };
  var EFFORT_HELP = { basic: 'bare hands, basic work', weapons: 'blades, bows, slings', guns: 'guns (misfire on 1–3)', magic: 'magical damage' };

  /* The address can be typed or edited by anyone, so only the shape of a hero is kept: known items, whole numbers, text within the sheet's limits. */
  function read(hash) {
    var raw;
    try { raw = JSON.parse(decodeURIComponent(String(hash || '').replace(/^#/, ''))); } catch (e) { return null; }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var h = C.cleanHero(raw);
    /* cleanHero keeps only items from the gear list; a GM-designed item travels with its own description, which itemOf rebuilds safely */
    h.gear = (Array.isArray(raw.gear) ? raw.gear : []).slice(0, 60).map(function (g) {
      if (!g || typeof g !== 'object') return null;
      var o = g.def && typeof g.def === 'object' ? { id: String(g.id || 'custom').slice(0, 40), eq: false, def: g.def } : { id: String(g.id || ''), eq: false };
      var it; try { it = C.itemOf(o); } catch (e) { it = null; }
      if (!it) return null;
      o.eq = g.eq === true && C.canEquip(it);
      if (it.uses) o.uses = clamp(int(g.uses, it.uses), 0, it.uses);
      return o;
    }).filter(Boolean);
    var hp = raw.hp && typeof raw.hp === 'object' ? raw.hp : {};
    var max = clamp(int(hp.max, R.HEART), 1, 999);
    h.hp = { max: max, cur: clamp(int(hp.cur, max), 0, max) };
    return h;
  }

  function line(label, value, cls) { return '<div class="ps-field' + (cls ? ' ' + cls : '') + '"><span class="ps-cap">' + label + '</span><span class="ps-val">' + esc(value) + '</span></div>'; }
  function range(src) { return String(C.rangeText(src) || '').replace(/^Range: /, ''); }
  function dieOf(src) { var heal = C.healingOf(src); return heal ? 'd' + heal.die : src.cat ? 'd' + (R.DEFAULT_DICE[src.cat] || '') : '—'; }
  function horrorOf(src) { return src.temptsHorror ? '+' + R.sayHorrorAmount(src.horror) : '0'; }
  function power(src) { return '<li><b>' + esc(src.name) + '</b> · ' + esc(src.roll || 'no roll') + ' · ' + dieOf(src) + ' · ' + esc(range(src) || '—') + ' · Horror ' + esc(horrorOf(src)) + '</li>'; }
  function detail(it) {
    var b = [];
    if (it.kind === 'weapon' && it.cat) b.push(R.CAT_NAMES[it.cat] + ' d' + R.DEFAULT_DICE[it.cat]);
    if (it.kind === 'weapon' && range(it)) b.push(range(it));
    if (it.defence) b.push('Defence ' + sgn(it.defence));
    if (it.hearts) b.push('+' + it.hearts + (it.hearts === 1 ? ' Heart' : ' Hearts'));
    return b.length ? ' <span class="ps-sub">' + esc(b.join(' · ')) + '</span>' : '';
  }
  function rows(list, cols, min) {
    var out = list.map(function (r, i) { return '<tr><td class="ps-n">' + (i + 1) + '</td>' + r + '</tr>'; });
    for (var i = list.length; i < min; i++) out.push('<tr><td class="ps-n">' + (i + 1) + '</td>' + new Array(cols + 1).join('<td></td>') + '</tr>');
    return out.join('');
  }

  function html(h, blank) {
    var num = function (n) { return blank ? '\u00a0' : sgn(n || 0); }, rowsMin = blank ? 8 : 6;
    var gear = h.gear.map(function (g) { return { g: g, it: C.itemOf(g) }; }).filter(function (x) { return x.it; });
    var eq = gear.filter(function (x) { return x.g.eq; }), pack = gear.filter(function (x) { return !x.g.eq; });
    var magic = gear.filter(function (x) { return x.it.temptsHorror || x.it.kind === 'grimoire' || x.it.kind === 'relic'; });
    var max = blank ? 0 : h.hp.max, heartRows = blank ? 5 : Math.max(5, Math.ceil(max / R.HEART));
    var armour = Math.min(R.ARMOUR_CAP, int(h.armour, 0) + C.armourBonus(h));

    var s = '<article class="ps-page" aria-label="Character sheet for ' + esc(h.name || 'a new hero') + '">';
    s += '<header class="ps-head"><h1 class="ps-black">Hero</h1><p class="ps-mark ps-black">Sacrament</p></header>';
    s += '<div class="ps-fields">' + line('Name', h.name, 'ps-w2') + line('Calling', h.calling) + line('Player', '') + '</div>';
    s += '<div class="ps-fields">' + line('Path', C.pathOf(h) || (blank ? '' : 'none'), 'ps-w2') + line('Vow', h.vow, 'ps-w3') + '</div>';

    var adv = C.advancesOf(h), marks = blank ? 0 : C.marksOf(h), share = function (base, extra) { return base + (blank || !extra ? '' : ' (+' + extra + ' from advances)'); };
    s += '<h2 class="ps-black">Scores · ' + share(B.points, adv.stats) + ' points to share, none above ' + B.scoreMax + '</h2><div class="ps-boxes ps-six">' + R.STATS.map(function (k) {
      return '<div class="ps-box"><b class="ps-name">' + k + '</b><small>' + STAT_HELP[k] + '</small><span class="ps-num">' + num(h.stats[k]) + '</span></div>';
    }).join('') + '</div>';
    s += '<h2 class="ps-black">Effort bonuses · ' + share(B.effortPoints, adv.effort) + ' points to share, none above +' + R.ADVANCE.effortMax + '</h2><div class="ps-boxes ps-four">' + R.BONUS_CATS.map(function (k) {
      return '<div class="ps-box"><b class="ps-name">' + R.CAT_NAMES[k] + '</b><small>d' + R.DEFAULT_DICE[k] + ' · ' + EFFORT_HELP[k] + '</small><span class="ps-num">' + num(h.effort[k]) + '</span></div>';
    }).join('') + '</div><p class="ps-small">A successful natural 20 adds a plain d' + R.DEFAULT_DICE.ultimate + '. Two-handed weapons deal 2 more damage.</p>';

    /* Advancement (rules.js ADVANCE): a mark for each adventure lived through; at 3 marks, one advance, and the marks start again. */
    var taken = adv.stats + adv.effort, tallies = Math.max(10, taken);
    s += '<section class="ps-frame ps-marks"><div class="ps-mark-box"><h2 class="ps-black">Marks</h2><p class="ps-ticks ps-big">';
    for (var m = 0; m < R.ADVANCE.marks; m++) s += '<i class="' + (m < marks ? 'ps-on' : '') + '"></i>';
    s += '</p></div><p class="ps-small ps-mark-rule">Tick <b>1 mark</b> for each adventure your hero lives through to its end. At <b>' + R.ADVANCE.marks + ' marks</b>, take one advance: <b>+1 to one score</b> (up to ' + R.ADVANCE.scoreMax + ') or <b>+1 to one Effort bonus</b> (up to +' + R.ADVANCE.effortMax + '). Then rub out the marks and start again.</p>';
    s += '<div class="ps-adv"><span class="ps-cap">Advances taken</span><p class="ps-ticks">';
    for (var t = 0; t < tallies; t++) s += '<i class="' + (t < taken ? 'ps-on' : '') + (t === 4 ? ' ps-gap' : '') + '"></i>';
    s += '</p><span class="ps-small">' + (blank ? 'Scores ____ · Effort ____' : 'Scores ' + adv.stats + ' · Effort ' + adv.effort) + '</span></div></section>';

    s += '<div class="ps-split"><section class="ps-frame ps-hp"><h2 class="ps-black">HP · 10 to a Heart · fill from the left, erase when hurt</h2>';
    for (var r = 0; r < heartRows; r++) {
      s += '<div class="ps-heart"><span>Heart ' + (r + 1) + '</span><span class="ps-ticks">';
      for (var b = 0; b < R.HEART; b++) s += '<i class="' + (!blank && r * R.HEART + b >= max ? 'ps-x' : '') + (b === 4 ? ' ps-gap' : '') + '"></i>';
      s += '</span></div>';
    }
    s += '<p class="ps-small">Maximum: <b>' + (blank ? '____' : max) + '</b> (10, plus 10 for each Heart your worn gear grants).' + (blank ? ' Cross out the boxes beyond it.' : ' Boxes beyond it are crossed out.') + '</p></section>';
    s += '<section class="ps-frame ps-def"><h2 class="ps-black">Defence</h2><div class="ps-sum"><span>10 +</span><span class="ps-cell"><b>' + num(h.stats.CON) + '</b><small>CON</small></span><span>+</span><span class="ps-cell"><b>' + num(armour) + '</b><small>armour (max +' + R.ARMOUR_CAP + ')</small></span><span>=</span><span class="ps-cell ps-total"><b>' + (blank ? '\u00a0' : C.defence(h)) + '</b><small>Defence</small></span></div>';
    s += '<h2 class="ps-black">When down</h2><p class="ps-tick-line"><i></i> Dying · rounds left <i></i><i></i><i></i></p><p class="ps-tick-line"><i></i> Stable <i></i> Dead</p><p class="ps-small">On your turn: crawl away (CON, free) or pay ' + R.DYING.actHorror + ' Horror to act.</p></section></div>';

    s += '<div class="ps-split ps-even"><section><h2 class="ps-black">Equipped · ' + B.slots + ' slots</h2><table class="ps-table"><thead><tr><th></th><th>Item</th><th>Slots</th></tr></thead><tbody>' +
      rows(eq.map(function (x) { return '<td>' + esc(x.it.name) + detail(x.it) + '</td><td class="ps-r">' + x.it.slots + '</td>'; }), 2, rowsMin) +
      '</tbody></table><p class="ps-small">' + (blank ? '____' : C.slotsUsed(h, 'eq')) + ' of ' + B.slots + ' slots used. One body armour, one helmet, one shield. Two-handed weapon: shield in the pack.</p></section>';
    s += '<section><h2 class="ps-black">Pack · ' + B.slots + ' slots</h2><table class="ps-table"><thead><tr><th></th><th>Item</th><th>Slots</th><th>Uses</th></tr></thead><tbody>' +
      rows(pack.map(function (x) { return '<td>' + esc(x.it.name) + detail(x.it) + '</td><td class="ps-r">' + x.it.slots + '</td><td class="ps-r">' + (x.it.uses ? x.g.uses + ' of ' + x.it.uses : '') + '</td>'; }), 3, rowsMin) +
      '</tbody></table><p class="ps-small">' + (blank ? '____' : C.slotsUsed(h, 'pack')) + ' of ' + B.slots + ' slots used. Supplies work from the pack. Spare weapons and armour wait here.</p></section></div>';

    var cols = magic.slice(0, Math.max(3, magic.length));
    while (cols.length < 3) cols.push(null);
    s += '<section class="ps-frame ps-magic"><h2 class="ps-black">Relics and grimoires · at most ' + B.magicItems + ' that tempt the Horror, packed ones too</h2><div class="ps-cols">' + cols.map(function (x) {
      if (!x) return '<div class="ps-col">' + line('Item', '') + '<p class="ps-cap">Spell or power · roll · die · range · Horror</p><div class="ps-blank"></div><div class="ps-blank"></div></div>';
      var list = x.it.kind === 'grimoire' ? C.spellsOf(x.it) : [x.it];
      return '<div class="ps-col">' + line('Item', x.it.name) + '<p class="ps-cap">Spell or power · roll · die · range · Horror</p><ul>' + list.map(power).join('') + '</ul></div>';
    }).join('') + '</div><p class="ps-small">A grimoire takes 3 slots and holds 3 spells. You may choose one starting grimoire; the GM gives the rest. Path (optional): a relic of your own path costs 1 less Horror to use, and once a scene a check that fits your path is Easy.</p></section>';
    s += '<footer class="ps-foot"><span class="ps-tick-line">Once per scene used: <i></i><i></i><i></i> · Notes on the back</span><span>Sacrament RPG</span></footer></article>';

    /* the back: what the hero's sheet holds in words, with room to write */
    s += '<article class="ps-page ps-back" aria-label="Notes for ' + esc(h.name || 'a new hero') + '"><header class="ps-head"><h1 class="ps-black">Notes</h1><p class="ps-mark ps-black">Sacrament</p></header>';
    [['Appearance', h.appearance, 3], ['Background', h.background, 5], ['Notes', h.notes, 18]].forEach(function (f) {
      s += '<h2 class="ps-black">' + f[0] + '</h2>' + (f[1] ? '<p class="ps-text">' + esc(f[1]) + '</p>' : '') + new Array(f[2] + 1).join('<div class="ps-blank"></div>');
    });
    s += '<footer class="ps-foot"><span>' + esc(h.name) + '</span><span>Sacrament RPG</span></footer></article>';
    return s;
  }
  /* an empty sheet: no name, no numbers, no gear, every box open */
  function blank() { var h = C.blankHero(' '); h.name = ''; h.hp = { max: R.HEART, cur: R.HEART }; return html(h, true); }

  /* the link My heroes opens; the hero rides after the "#" */
  function link(hero) { return '/character/print/#' + encodeURIComponent(JSON.stringify(hero)); }

  root.SacramentPrint = { read: read, html: function (h) { return html(h, false); }, blank: blank, link: link };

  if (typeof document === 'undefined' || !document.getElementById('printSheet')) return;
  var box = document.getElementById('printSheet'), hero = read(location.hash);
  if (/^#blank$/.test(location.hash)) {
    document.title = 'Blank character sheet | Sacrament RPG';
    box.innerHTML = blank();
    document.getElementById('printNow').onclick = function () { root.print(); };
    return;
  }
  if (!hero) {
    box.innerHTML = '<div class="ps-missing"><h1>No hero to print</h1><p>Open this page from <a href="/character/">My heroes</a>: generate or choose a hero, then press <b>Print or save as PDF</b>.</p></div>';
    document.getElementById('printNow').disabled = true;
    return;
  }
  document.title = hero.name + ' | Character sheet | Sacrament RPG';
  box.innerHTML = html(hero);
  document.getElementById('printNow').onclick = function () { root.print(); };
})(typeof window !== 'undefined' ? window : globalThis);
