/* Sacrament RPG solo: the page. It shows the engine's story, buttons and pictures, keeps the game in this browser, and never changes a saved hero.
   Dice land on the picture through the table's own dice (site/vtt/dice.js), with the same result card: CRITICAL HIT, SUCCESS, MISS, FAILED CHECK, HIT.
   Needs rules.js, gear.js, sheet-core.js, heroes.js, hero-tools.js, engine.js, an adventure file, dice.js and art.js. */
(function () {
  'use strict';
  var S = window.SacramentSolo, ART = window.SacramentSoloArt, R = window.SacramentRules, C = window.SacramentSheetCore, D = window.SacramentDice;
  /* The game is a run of five scenes on the pilgrim road (road.js); ADV() is the scene being played. */
  var CAMP = window.SacramentSoloCampaigns['pilgrim-road'];
  function ADV() { return (state && S.sceneOf(state)) || window.SacramentSoloAdventures[CAMP.scenes[0]]; }
  var NPC_NAMES = (window.SacramentSoloCameos || []).map(function (c) { return c.name; });
  var SAVE = 'sacrament-solo-v1';
  var $ = function (id) { return document.getElementById(id); };
  var state = null, shown = 0, lastArt = '', dying = false, moreOpen = false, cardDamage = false, foeTimer = 0, cardTimer = 0, whole = false;

  /* Dice: the browser's own random source. (At the table the server rolls; alone, this page is the table.) */
  function die(sides) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return 1 + (a[0] % sides); }

  /* ---------- saving in this browser ---------- */
  function load() { try { var raw = JSON.parse(localStorage.getItem(SAVE) || 'null'); return raw && raw.game && raw.game.run && S.valid(raw.game, S.sceneOf(raw.game)) ? raw : null; } catch { return null; } }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify({ game: state, hero: state && state.origin })); } catch { /* private window: the game still plays, it just will not be there next time */ } }
  function forget() { try { localStorage.removeItem(SAVE); } catch { /* nothing to forget */ } }
  /* The Chronicle: one line for each finished road, newest first, kept in this browser (like My heroes). */
  var CHRONICLE = 'sacrament-solo-chronicle-v1', CHRONICLE_MAX = 50;
  function chronicle() { try { var l = JSON.parse(localStorage.getItem(CHRONICLE) || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } }
  function today() { try { return new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return ''; } }
  /* a run that has just ended goes into the Chronicle, once */
  function remember() {
    if (!state || !state.over || !state.run || state.run.logged) return;
    var sum = S.summary(state); state.run.logged = today() || true;
    var l = chronicle(); l.unshift({ hero: sum.hero, to: sum.to, end: sum.end, at: sum.places.length, of: sum.total, peak: sum.peak, date: state.run.logged === true ? '' : state.run.logged,
      places: sum.placeIds, beaten: sum.beaten, met: sum.met, used: sum.used, escapes: sum.escapes });
    state.run.deeds = DEEDS ? DEEDS.fresh(l, world()) : [];
    try { localStorage.setItem(CHRONICLE, JSON.stringify(l.slice(0, CHRONICLE_MAX))); } catch { /* private window: the run is not kept */ }
  }
  /* Deeds (deeds.js): measured against every friend, every last place and every place on this road. */
  var DEEDS = window.SacramentSoloDeeds;
  function world() {
    var A = window.SacramentSoloAdventures;
    return { friends: (window.SacramentSoloCameos || []).map(function (c) { return c.id; }), places: CAMP.scenes.slice(),
      finales: CAMP.scenes.filter(function (id) { return A[id] && A[id].act === 'finale'; }) };
  }
  function showDeeds(l) {
    var box = $('deeds'), got = DEEDS.earned(l, world()); box.textContent = '';
    $('deedCount').textContent = got.length + ' of ' + DEEDS.DEEDS.length;
    DEEDS.DEEDS.forEach(function (d) {
      var li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span'), have = got.indexOf(d.id) >= 0;
      li.className = have ? 'got' : 'not'; b.textContent = d.name; s.textContent = (have ? '' : 'Not yet. ') + d.hint;
      li.append(b, s); box.appendChild(li);
    });
    var rec = $('record'); rec.textContent = '';
    DEEDS.record(l).slice(0, 6).forEach(function (r) {
      var p = document.createElement('p'), b = document.createElement('b'); b.textContent = r.hero;
      p.append(b, document.createTextNode(': ' + r.roads + (r.roads === 1 ? ' road' : ' roads') + ', home ' + r.home + ', ' + r.beaten + ' foes beaten, highest Horror ' + r.peak));
      rec.appendChild(p);
    });
  }
  var HOW = { won: 'came home', dead: 'fell', fled: 'got away' };
  function showChronicle() {
    var l = chronicle(), box = $('chronicleList'); box.textContent = ''; $('chronicle').hidden = !l.length;
    if (l.length) showDeeds(l);
    l.slice(0, 12).forEach(function (e) {
      var li = document.createElement('li'), b = document.createElement('b'), w = document.createElement('span'), d = document.createElement('span');
      li.className = e.end || ''; b.textContent = e.hero;
      w.textContent = (e.to ? ' · to ' + e.to : '') + ' · ' + (HOW[e.end] || e.end) + (e.end === 'dead' ? ' in scene ' + e.at + ' of ' + e.of : '');
      w.style.whiteSpace = 'normal'; d.textContent = e.date || '';
      var left = document.createElement('div'); left.append(b, w); li.append(left, d); box.appendChild(li);
    });
  }

  /* ---------- the first screen ---------- */
  function showStart() {
    state = null; D.clear(); document.body.classList.remove('playing');
    $('start').hidden = false; $('game').hidden = true; $('heroBtn').hidden = true; $('menuBtn').hidden = true;
    $('blurb').textContent = CAMP.blurb;
    var saved = load(), resume = $('resume'); resume.textContent = '';
    if (saved && !saved.game.over) {
      var b = pickButton('Continue as ' + saved.game.hero.name, 'Scene ' + (saved.game.run.at + 1) + ' of ' + saved.game.run.order.length + ', ' + S.sceneOf(saved.game).rooms[saved.game.room].short + ' · HP ' + saved.game.hp.cur + ' of ' + saved.game.hp.max, 'resume');
      b.addEventListener('click', function () { state = saved.game; state.origin = saved.hero; showGame(false); });
      resume.appendChild(b);
    }
    showChronicle();
    var mine = $('mine'); mine.textContent = '';
    var list; try { list = window.SacramentHeroes.read().heroes || []; } catch { list = []; }
    if (!list.length) { var p = document.createElement('p'); p.className = 'empty'; p.innerHTML = 'You have no heroes saved in this browser yet. Make one in <a href="/character/">My heroes</a>, or take a ready-made hero below.'; mine.appendChild(p); }
    list.forEach(function (h) {
      var b = pickButton(h.name, [h.calling, 'Defence ' + C.defence(h)].filter(Boolean).join(' · '));
      b.addEventListener('click', function () { begin(h); }); mine.appendChild(b);
    });
    $('titleArt').innerHTML = ART.scene('title', null, 't');
    tune('title');
  }
  function pickButton(title, sub, cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pick' + (cls ? ' ' + cls : '');
    var t = document.createElement('b'); t.textContent = title; var s = document.createElement('span'); s.textContent = sub || ''; b.append(t, s); return b;
  }
  document.querySelectorAll('[data-focus]').forEach(function (b) {
    b.addEventListener('click', function () { begin(window.SacramentHeroTools.generate(b.getAttribute('data-focus'))); });
  });

  function begin(hero) {
    D.clear(); state = S.startRun(hero, CAMP.id, die); state.origin = JSON.parse(JSON.stringify(hero)); save(); showGame(true);
  }

  /* ---------- the game screen ---------- */
  function showGame(fresh) {
    document.body.classList.add('playing'); $('start').hidden = true; $('game').hidden = false; $('heroBtn').hidden = false; $('menuBtn').hidden = false;
    $('log').textContent = ''; shown = 0; lastArt = ''; dying = false; whole = false; cardDamage = false; clearTimeout(foeTimer); foeTimer = 0;
    renderLog(!fresh); render();
    window.scrollTo(0, 0);
  }
  /* The story so far. On a phone only the latest beat (what the last thing you did brought) shows; the rest folds behind "The story so far", so play stays
     on the picture and nothing is lost (the owner's ask, 2026-11-07). On a laptop the whole log stays in its column. */
  function renderLog(quiet) {
    var log = $('log');
    if (!log.querySelector('.whole')) {
      var w = document.createElement('button'); w.type = 'button'; w.className = 'whole'; w.addEventListener('click', function () { whole = !whole; foldLog(); });
      log.appendChild(w);
    }
    for (; shown < state.log.length; shown++) {
      var line = state.log[shown], p = document.createElement('p'); p.className = 'k-' + line.k + (quiet ? '' : ' new'); withNames(p, line.t);
      if (line.k === 'npc' && p.querySelector('.npc-name')) p.classList.add('friend');
      if (line.k === 'cmd') log.querySelectorAll('p:not(.old)').forEach(function (o) { o.classList.add('old'); });
      log.appendChild(p);
    }
    foldLog();
    log.scrollTop = log.scrollHeight;
  }
  function foldLog() {
    var log = $('log'), b = log.querySelector('.whole'), n = log.querySelectorAll('p.old').length;
    log.classList.toggle('whole-open', whole); b.hidden = !n;
    b.textContent = whole ? 'Show only the latest' : 'The story so far (' + n + ' lines)'; b.setAttribute('aria-expanded', whole ? 'true' : 'false');
    log.insertBefore(b, whole ? log.firstChild : log.querySelector('p:not(.old)'));
  }
  /* The people met on the road have their names in green, wherever they appear. */
  function withNames(el, text) {
    var at = 0, re = NPC_NAMES.length ? new RegExp(NPC_NAMES.map(function (n) { return n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|'), 'g') : null, m;
    if (!re) { el.textContent = text; return; }
    while ((m = re.exec(text))) { el.appendChild(document.createTextNode(text.slice(at, m.index))); var b = document.createElement('span'); b.className = 'npc-name'; b.textContent = m[0]; el.appendChild(b); at = m.index + m[0].length; }
    el.appendChild(document.createTextNode(text.slice(at)));
  }
  /* each place has the tune of its mood */
  var MOOD = { gate: 'gate', crossroads: 'gate', lane: 'gate', ford: 'gate', gibbet: 'gate', stones: 'gate', nave: 'nave', cloister: 'nave', barn: 'nave', crypt: 'crypt', undercroft: 'crypt', ossuary: 'crypt', mere: 'crypt', tower: 'tower', shrine: 'tower', hospice: 'nave', wood: 'gate', bridge: 'gate', chapter: 'nave', barrow: 'tower', pit: 'crypt', inn: 'gate', field: 'gate' };
  function render() {
    tune(state.over === 'won' || state.done ? 'won' : state.over ? 'dead' : state.fight ? 'fight' : MOOD[ADV().rooms[state.room].art] || 'gate');
    renderHud(); renderTurns(); renderCards(); renderChoices(); paint();
    /* the Horror darkens the picture a little at each threshold passed */
    document.querySelector('.frame').dataset.dread = String(R.HORROR.thresholds.filter(function (n) { return state.horror >= n; }).length);
    var r = ADV().rooms[state.room]; $('art').setAttribute('aria-label', 'A picture of ' + r.short + (state.fight ? ', with ' + state.fight.name : '') + '.');
  }
  function heartRow(box, cur, max) {
    for (var i = 0, n = Math.max(1, Math.ceil(max / R.HEART)); i < n; i++) { var sp = document.createElement('span'); sp.className = 'heart'; sp.style.setProperty('--fill', String(Math.max(0, Math.min(R.HEART, cur - i * R.HEART)) / R.HEART)); box.appendChild(sp); }
  }
  function renderHud() {
    var hearts = $('hearts'); hearts.textContent = '';
    var n = Math.max(1, Math.ceil(state.hp.max / R.HEART));
    for (var i = 0; i < n; i++) {
      var fill = Math.max(0, Math.min(R.HEART, state.hp.cur - i * R.HEART)) / R.HEART, sp = document.createElement('span');
      sp.className = 'heart'; sp.style.setProperty('--fill', String(fill)); hearts.appendChild(sp);
    }
    $('hpText').textContent = state.dying ? 'Dying: ' + state.dying.left + (state.dying.left === 1 ? ' round' : ' rounds') : state.hp.cur + '/' + state.hp.max;
    $('hpText').classList.toggle('dying', !!state.dying);
    var pips = $('pips'); pips.textContent = '';
    for (var j = 1; j <= R.HORROR.max; j++) { var d = document.createElement('span'); d.className = 'pip' + (j <= state.horror ? ' on' : '') + (R.HORROR.thresholds.indexOf(j) >= 0 && j < R.HORROR.max ? ' mark' : ''); pips.appendChild(d); }
    pips.setAttribute('aria-hidden', 'true');
    $('horrorText').textContent = state.horror + '/' + R.HORROR.max;
    var info = S.sceneInfo(state, ADV());
    $('targetText').textContent = String(info.target);
    $('darkText').hidden = !info.dark;
  }
  /* The cards in this place, as on the table: the foe, an obstacle with its Effort bar, a timer counting down. Tap one to read it. */
  function renderCards() {
    var box = $('cards'), list = S.cards(state, ADV()); box.textContent = ''; box.hidden = !list.length;
    list.forEach(function (c) {
      var b = document.createElement('button'), t = document.createElement('b'), bar = document.createElement('span'), n = document.createElement('small');
      b.type = 'button'; b.className = 'card ' + c.kind; t.textContent = c.name;
      bar.className = 'fill'; bar.style.setProperty('--v', String(c.max ? c.cur / c.max : 0));
      if (c.kind === 'foe') { bar = document.createElement('span'); bar.className = 'hearts'; heartRow(bar, c.cur, c.max); }
      n.textContent = c.kind === 'timer' ? (c.unit === 'ended' ? 'Time is up' : c.cur + ' of ' + c.max + ' left') : c.cur + ' of ' + c.max + ' ' + c.unit;
      b.setAttribute('aria-label', c.name + ': ' + n.textContent + (c.next ? '. ' + c.next : '') + '. Read the card.');
      b.append(t, bar, n);
      if (c.next) { var nx = document.createElement('small'); nx.className = 'next'; nx.textContent = c.next; b.appendChild(nx); }
      /* what the foe is, so a player can see which spell or item answers it */
      if (c.traits && c.traits.length) { var tr = document.createElement('span'); tr.className = 'traits'; c.traits.forEach(function (x) { var i = document.createElement('i'); i.textContent = x; tr.appendChild(i); }); b.appendChild(tr); b.setAttribute('aria-label', b.getAttribute('aria-label').replace(/\. Read the card\.$/, '. ' + c.traits.join(', ') + '. Read the card.')); }
      b.addEventListener('click', function () { showAbout({ name: c.name, line: c.stats + (c.traits && c.traits.length ? ' · ' + c.traits.join(' · ') : ''), does: c.text }); }); box.appendChild(b);
    });
  }
  /* The turn order, as on the table's strip: whose turn it is, and the round. */
  function renderTurns() {
    var box = $('turns'), f = state.fight; box.hidden = !f; if (!f) return;
    box.textContent = '';
    var round = document.createElement('span'); round.className = 'round'; round.textContent = 'Round ' + f.round; box.appendChild(round);
    [[state.hero.name, f.phase !== 'foe', 'hero'], [f.name, f.phase === 'foe', 'foe']].forEach(function (x) {
      var chip = document.createElement('span'); chip.className = 'chip ' + x[2] + (x[1] ? ' now' : ''); chip.textContent = x[0]; box.appendChild(chip);
    });
    var whose = document.createElement('span'); whose.className = 'whose';
    whose.textContent = state.dying ? 'You are dying' : f.phase === 'foe' ? 'Its turn next' : f.phase === 'damage' ? 'Your turn: roll damage' : f.phase === 'push' ? 'Your turn: push or end it' : 'Your turn';
    box.appendChild(whose);
  }
  function renderChoices() {
    var box = $('choices'); box.textContent = '';
    if (state.over) {
      var again = choiceButton({ label: state.over === 'won' ? 'Play it again' : 'Try again', cmd: '' }, 'ch');
      again.addEventListener('click', function () { begin(state.origin); });
      var other = choiceButton({ label: 'Choose another hero', cmd: '' }, 'ch go'); other.addEventListener('click', function () { forget(); showStart(); });
      var home = homeButton(); if (home) box.appendChild(home);
      var card = choiceButton({ label: 'See the end card', cmd: '' }, 'ch go wide'); card.addEventListener('click', showEnd); box.appendChild(card);
      box.append(again, other); return;
    }
    var f = state.fight;
    /* one Roll damage button: the dice card's, when the card is showing it */
    if (f && f.phase === 'damage' && cardDamage) { box.appendChild(waiting('Roll damage on the dice')); return; }
    /* the foe's turn plays out by itself, a moment after yours */
    if (f && f.phase === 'foe') { box.appendChild(waiting(f.name + ' moves…')); foeSoon(); return; }
    var list = S.choices(state, ADV()), main = [], extra = [];
    var rid = list.filter(function (c) { return c.riddle; })[0];   /* a friend's riddle: the question stays above the three answers while you think */
    if (rid) { var q = document.createElement('p'); q.className = 'riddle'; var who = document.createElement('b'); who.textContent = rid.by + ' asks'; q.append(who, document.createTextNode(rid.riddle)); box.appendChild(q); }
    list.forEach(function (c) { ((c.kind === 'use' || (c.kind === 'spell' && !c.strike)) ? extra : main).push(c); });
    main.forEach(function (c) { box.appendChild(choiceButton(c)); });
    if (main.length % 2) box.lastChild.classList.add('wide');
    /* Spells and items sit under their own heading; on a phone the heading is a button that folds them away, so the main choices stay big. */
    box.classList.toggle('open', moreOpen);
    if (extra.length) {
      var h = document.createElement('button'); h.type = 'button'; h.className = 'more'; h.setAttribute('aria-expanded', moreOpen ? 'true' : 'false');
      var good = extra.filter(function (c) { return c.useful; }).length;
      h.textContent = 'Spells and items (' + extra.length + (good ? ', ' + good + ' useful here' : '') + ')'; if (good) h.classList.add('useful');
      h.addEventListener('click', function () { moreOpen = !moreOpen; renderChoices(); });
      box.appendChild(h);
      extra.forEach(function (c) { var el = choiceButton(c); el.classList.add('extra'); box.appendChild(el); });
    }
  }
  function waiting(text) { var p = document.createElement('p'); p.className = 'waiting'; p.setAttribute('role', 'status'); p.textContent = text; return p; }
  function foeSoon() {
    if (foeTimer) return;
    var wait = D.off() || reduceMotion() ? 700 : 1700;
    foeTimer = setTimeout(function go() {
      if (document.querySelector('dialog[open]') || document.hidden) { foeTimer = setTimeout(go, 500); return; }   /* wait while the sheet or a card is open */
      foeTimer = 0; if (state && state.fight && state.fight.phase === 'foe' && !state.over) run('foe');
    }, wait);
  }
  /* A hero from My heroes who finishes the road alive may bring their finds home (the owner's call, 2026-11-06): each find goes into the saved hero if
     there is room for it, through the sheet's own rules; what does not fit stays behind. It can be done once. */
  function savedHero() {
    var st; try { st = window.SacramentHeroes.read(); } catch { return null; }
    var id = state.origin && state.origin.id; if (!id || !st || st.readOnly) return null;
    var h = (st.heroes || []).filter(function (x) { return x.id === id; })[0]; return h ? { st: st, h: h } : null;
  }
  function homeButton() {
    if (state.over !== 'won' || !state.run) return null;
    var finds = S.runFinds(state), saved = savedHero();
    if (!finds.length || !saved) return null;
    if (state.run.home) { var done = document.createElement('p'); done.className = 'more'; done.textContent = state.run.home; return done; }
    var b = choiceButton({ label: 'Bring your finds home', cmd: '' }, 'ch wide');
    b.addEventListener('click', function () { bringHome(); });
    return b;
  }
  function bringHome() {
    var saved = savedHero(); if (!saved || state.run.home) return;
    var h = saved.h, came = [], left = [];
    S.runFinds(state).forEach(function (id) { var it = C.item(id), r = C.edit(h, { op: 'add', id: id }, { gm: true }, h.hp); ((r && r.ok) ? came : left).push(it ? it.name : id); });
    var ok = window.SacramentHeroes.save(saved.st);
    state.run.home = !ok ? 'Your finds could not be saved in this browser.' : (came.length ? came.join(', ') + ' went home with ' + h.name + '.' : 'Nothing fitted.') + (left.length ? ' No room for: ' + left.join(', ') + '.' : '');
    if (!ok) state.run.home = ''; save(); render();
    toast(ok ? 'Home: ' + (came.join(', ') || 'nothing') + '.' : 'Not saved: try again.', ok ? 'Brought home' : 'Not saved');
  }
  function choiceButton(c, cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = cls || 'ch ' + (/^meet /.test(c.cmd || '') ? 'friend' : c.kind === 'do' || c.kind === 'attack' ? '' : c.kind);
    b.textContent = c.label;
    if (c.useful) b.className += ' useful';
    if (c.idle) { b.className += ' idle'; var no = document.createElement('small'); no.textContent = c.why || 'No use here'; b.appendChild(no); }
    else {
      /* every choice that rolls shows its bet: the number needed, the chance, and what failing costs here */
      var od = c.cmd && c.kind !== 'go' && c.kind !== 'plain' ? S.odds(state, ADV(), c.cmd) : null, bits = [];
      if (od) bits.push(od.need > 20 ? 'Cannot succeed' : 'Need ' + od.need + '+ (' + od.chance + '%)' + (od.note ? ', ' + od.note : ''));
      if (c.horror) bits.push('+' + R.sayHorrorAmount(c.horror) + ' Horror');
      if (od && od.cost.length) bits.push('Fail: ' + od.cost.join(', '));
      if (c.hint) { if (c.flee) bits.push(c.hint); else bits.unshift(c.hint); }
      if (c.useful) bits.unshift('Useful here');
      if (bits.length) { var sm = document.createElement('small'); sm.className = 'odds' + (od && od.chance <= 35 ? ' long' : ''); sm.textContent = bits.join(' · '); b.appendChild(sm); }
    }
    if (c.cmd) b.addEventListener('click', function () { run(c.cmd); });
    if (!c.about || !c.about.does) return b;
    /* spells and items carry a small "?" that opens what they do, in the gear list's own words */
    var w = document.createElement('div'), q = document.createElement('button');
    w.className = 'chw'; q.type = 'button'; q.className = 'why'; q.textContent = '?'; q.setAttribute('aria-label', 'What ' + c.about.name + ' does');
    q.addEventListener('click', function () { showAbout(c.about); });
    w.append(b, q); return w;
  }
  function showAbout(a) {
    $('aboutName').textContent = a.name;
    $('aboutRoll').textContent = a.line != null ? a.line : [a.from ? 'From ' + a.from : '', a.roll ? 'Roll ' + a.roll + ' against Target ' + S.sceneInfo(state, ADV()).target : 'No roll'].filter(Boolean).join(' · ');
    $('aboutDoes').textContent = a.does;
    $('about').showModal();
  }

  function run(cmd) {
    if (!state || state.over || !cmd) return;
    clearTimeout(foeTimer); foeTimer = 0; cardDamage = false; clearTimeout(cardTimer); cardTimer = 0;
    var cap = document.querySelector('.frame .caption'); if (cap) cap.remove();
    var overBefore = state.over, before = state.log.length, hpBefore = state.hp.cur, foeBefore = state.fight ? state.fight.hp.cur : null, horrorBefore = state.horror, doneBefore = !!state.done, place = ADV().rooms[state.room].art;
    S.act(state, ADV(), cmd, die);
    var slain = foeBefore != null && !state.fight && state.hp.cur > 0 && !state.escaped && !reduceMotion();
    if (slain) dying = true;   /* the picture keeps the foe a moment longer, to watch it go */
    remember(); save(); renderLog(false); roll(state.log.slice(before)); render(); caption(state.log.slice(before), before);
    if (slain) {
      var foe = document.querySelector('#art .who.foe'); if (foe) foe.classList.add('dying'); document.querySelectorAll('#art .foeflame').forEach(function (f) { f.classList.add('out'); });
      setTimeout(function () { dying = false; paint(); }, 1900);
    }
    feel({ over: overBefore, fresh: state.log.slice(before), hp: hpBefore, foe: foeBefore, horror: horrorBefore, done: doneBefore, place: place, slain: slain });
  }
  /* ---------- feeling it: what each action does to the picture, the sound and the phone ---------- */
  function sfx(name) { if (M && M.sfx) M.sfx(name); }
  function buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { /* not on this device */ } }
  /* a number that rises from where the blow landed and fades: x and y in hundredths of the picture */
  function float(text, x, y, cls) {
    var f = document.createElement('span'); f.className = 'float ' + cls; f.textContent = text; f.style.left = x + '%'; f.style.top = y + '%';
    document.querySelector('.frame').appendChild(f); setTimeout(function () { f.remove(); }, 1300);
  }
  function feel(o) {
    var frame = document.querySelector('.frame'), checks = o.fresh.filter(function (l) { return l.outcome; }), last = checks[checks.length - 1];
    frame.classList.remove('hit', 'good'); void frame.offsetWidth;
    var spot = ART.spot(o.place), foeLoss = o.foe != null ? o.foe - (state.fight ? state.fight.hp.cur : 0) : 0, hpLoss = o.hp - state.hp.cur;
    if (foeLoss > 0) {
      frame.classList.add('good'); float('-' + foeLoss, (spot[0] + 40 * spot[2]) / 3.2, Math.max(8, spot[1] - 6) / 1.92, 'dmg');
      var foe = document.querySelector('#art .who.foe'); if (foe && !o.slain) { foe.classList.remove('flinch'); void foe.getBoundingClientRect(); foe.classList.add('flinch'); }
      sfx(o.fresh.some(function (l) { return l.outcome && l.outcome.critical; }) || /natural 20/i.test(o.fresh.map(function (l) { return l.t; }).join(' ')) ? 'crit' : 'hit');
    } else if (last && !last.outcome.success && !last.foeAttack) sfx('miss');
    if (hpLoss > 0) { frame.classList.add('hit'); float('-' + hpLoss, 26, 48, 'hurt'); buzz(70); setTimeout(function () { sfx('hurt'); }, foeLoss > 0 ? 160 : 0); }
    else if (last && last.foeAttack && !last.outcome.success) sfx('miss');
    if (state.horror > o.horror) {
      setTimeout(function () { sfx('horror'); }, 250);
      var pips = $('pips'); pips.classList.remove('pulse'); void pips.offsetWidth; pips.classList.add('pulse');
      if (R.HORROR.thresholds.some(function (n) { return o.horror < n && state.horror >= n; })) buzz([40, 60, 40]);
    } else if (state.horror >= 14 && !state.over) setTimeout(function () { sfx('heart'); }, 400);
    if (o.fresh.some(function (l) { return l.k === 'npc' && NPC_NAMES.some(function (n) { return l.t.indexOf(n) >= 0; }); })) setTimeout(function () { sfx('friend'); }, 150);
    var finds = o.fresh.filter(function (l) { return l.k === 'loot'; });
    if (finds.length) { setTimeout(function () { sfx('find'); }, 300); finds.forEach(function (l, n) { setTimeout(function () { toast(l.t); }, 350 + n * 900); }); }
    if (state.done && !o.done) { setTimeout(victory, 900); }
    if (state.over && state.run && state.run.logged && !o.over) {
      (state.run.deeds || []).forEach(function (id, k) { var d = DEEDS.byId(id); if (d) setTimeout(function () { sfx('find'); toast(d.name, 'Deed earned'); }, 300 + k * 1200); });
      setTimeout(showEnd, 1400 + (state.run.deeds || []).length * 1200);
    }
  }
  /* A caption across the top of the picture for the moments that matter: a new place, one of the owner's friends, the end of a scene, a Horror threshold.
     The full words stay in the story; a tap on the caption opens it. */
  var capTimer = 0;
  function caption(fresh, from) {
    var pick = null, scene = 0; state.log.forEach(function (l, n) { if (l.k === 'title' && n < from) scene = n; });
    var been = function (name) { return state.log.slice(scene, from).some(function (l) { return l.k === 'room' && l.t === name; }); };   /* a place you come back to needs no caption */
    fresh.forEach(function (l, i) {
      if (l.k === 'room' && been(l.t)) return;
      if ((l.k === 'npc' && NPC_NAMES.some(function (n) { return l.t.indexOf(n) >= 0; })) || l.k === 'end') pick = { t: l.t, k: l.k };
      else if (l.k === 'room' && (!pick || pick.k === 'room')) { var next = fresh[i + 1], first = next && next.k === 'say' ? (/^.*?[.!?](\s|$)/.exec(next.t) || [next.t])[0] : ''; pick = { title: l.t, t: first.trim(), k: 'room' }; }
      else if (l.k === 'horror' && /^The Horror (stirs|draws near|has arrived)/.test(l.t) && (!pick || pick.k === 'room')) pick = { t: l.t, k: 'horror' };
    });
    /* a spell or item you used: what it did goes on the picture, so a use never looks like it did nothing (a Horror threshold it crossed rides along) */
    var at = -1; fresh.forEach(function (l, i) { if (at < 0 && l.k === 'act' && /^You (push, and )?(use|cast) /.test(l.t)) at = i; });
    var did = at < 0 ? null : fresh.slice(at + 1).filter(function (l) { return ['roll', 'horror', 'act', 'cmd', 'loot'].indexOf(l.k) < 0 && !/ against (Target|Defence) /.test(l.t) && !/^(You are shaken|You are hunted|There is no more rest)/.test(l.t); })[0];
    if (did && (!pick || pick.k === 'room' || pick.k === 'horror')) pick = { t: did.t, k: 'use', sub: pick && pick.k === 'horror' ? pick.t : '' };
    if (!pick) return;
    var old = document.querySelector('.frame .caption'); if (old) old.remove();
    var held = Array.prototype.slice.call(document.querySelectorAll('.stage .toast'));   /* a find still showing joins the caption, so the two never sit on each other */
    var c = document.createElement('button'); c.type = 'button'; c.className = 'caption k-' + pick.k;
    if (pick.title) { var b = document.createElement('b'); b.textContent = pick.title; c.appendChild(b); }
    if (pick.t) { var s = document.createElement('span'); withNames(s, pick.t); c.appendChild(s); }
    if (pick.sub) { var d = document.createElement('small'); d.className = 'dread'; d.textContent = pick.sub; c.appendChild(d); }
    c.addEventListener('click', function () { c.remove(); whole = false; foldLog(); var l = $('log'); l.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' }); });
    document.querySelector('.frame').appendChild(c);
    held.forEach(function (t) { var k = t.querySelector('small'), b = t.querySelector('b'); t.remove(); if (b) addFound(c, k ? k.textContent : '', b.textContent); });
    fadeCaption(c, pick.k === 'npc' ? 6500 : 4500, true);
  }
  function addFound(cap, label, what) {
    var line = document.createElement('small'); line.className = 'found'; line.append((label || 'You found') + ': ');
    var w = document.createElement('b'); w.textContent = what; line.appendChild(w); cap.appendChild(line);
  }
  /* a dialog over the picture (a scene won) says it all: what was on the picture goes */
  function clearOverlays() {
    clearTimeout(cardTimer); cardTimer = 0; D.clear();
    document.querySelectorAll('.frame .caption, .stage .toast').forEach(function (e) { e.remove(); });
  }
  var capEnd = 0;   /* when the caption on screen fades: a find joining it can only make it stay longer */
  function fadeCaption(c, ms, fresh) {
    var end = Date.now() + ms; if (!fresh && end < capEnd) return; capEnd = end;
    clearTimeout(capTimer); capTimer = setTimeout(function () { c.classList.add('gone'); setTimeout(function () { c.remove(); }, 400); }, ms);
  }
  /* a find: its card slides in over the picture for a moment */
  function toast(text, label) {
    var m = /^[^:]*:\s*([^.]+)\.\s*(.*)$/.exec(text), cap = document.querySelector('.frame .caption:not(.gone)');
    if (cap) {   /* a caption is up (a friend speaking, the end of the road): the find joins it as one line, and the caption stays long enough to read both */
      addFound(cap, label, m ? m[1] : text); fadeCaption(cap, 5000); return;
    }
    var t = document.createElement('div');
    t.className = 'toast'; t.setAttribute('role', 'status');
    var k = document.createElement('small'); k.textContent = label || 'You found'; var b = document.createElement('b'); b.textContent = m ? m[1] : text;
    t.append(k, b); document.querySelector('.stage').appendChild(t); setTimeout(function () { t.classList.add('gone'); }, 2600); setTimeout(function () { t.remove(); }, 3200);
  }
  /* a scene won: what it gave you, where you stand, and what lies ahead */
  function victory() {
    var run = state.run; if (!run) return;
    var from = 0; state.log.forEach(function (l, n) { if (l.k === 'title') from = n; });
    var finds = state.log.slice(from).filter(function (l) { return l.k === 'loot'; }).map(function (l) { var m = /:\s*([^.]+)\./.exec(l.t); return m ? m[1] : l.t; });
    var next = S.sceneAt(state, run.at + 1), d = $('won');
    $('wonTitle').textContent = 'Scene ' + (run.at + 1) + ' of ' + run.order.length + (state.escaped ? ': you got away' : ' cleared');
    $('wonFinds').textContent = finds.length ? 'Found: ' + finds.join(', ') + '.' : 'Nothing found this time.';
    $('wonState').textContent = 'HP ' + state.hp.cur + ' of ' + state.hp.max + ' · Horror ' + state.horror + ' of ' + R.HORROR.max;
    var fork = S.forkAt(state);
    $('wonNext').textContent = fork ? 'The road forks: ' + fork.map(function (id) { return S.sceneOf({ adventure: id }).title; }).join(', or ') + '.' : next ? 'Next: ' + next.title + (next.tease ? '. ' + next.tease : '') : '';
    clearOverlays(); if (!d.open) d.showModal();
  }
  /* The end card: the whole road on one page from the book. It can be saved as a picture (or shared, where the device can). */
  function showEnd() {
    if (!state || !state.over || !state.run) return;
    var sum = S.summary(state); sum.deeds = (state.run.deeds || []).map(function (id) { var d = DEEDS.byId(id); return d ? d.name : ''; }).filter(Boolean);
    var svg = ART.endCard(sum, state, state.run.logged === true ? '' : state.run.logged);
    $('endCard').innerHTML = svg;
    $('endCard').setAttribute('aria-label', sum.hero + ': ' + (HOW[sum.end] || sum.end) + '. ' + sum.places.join(', ') + '. ' + sum.line);
    $('endSaved').hidden = true;
    var d = $('end'); clearOverlays(); if (!d.open) d.showModal();
    squeeze($('endCard').querySelector('svg'));
  }
  /* the card's lines are wrapped for Georgia; a device with a wider font could still push a line past the border, so any line that would is drawn a little narrower */
  function squeeze(svg) {
    if (!svg) return; var W = +svg.getAttribute('width') || 360, edge = 24;
    svg.querySelectorAll('text').forEach(function (t) {
      var bb; try { bb = t.getBBox(); } catch { return; }
      var mid = t.getAttribute('text-anchor') === 'middle', room = mid ? W - 2 * edge : W - edge - bb.x;
      if (bb.width > room) { t.setAttribute('textLength', String(Math.floor(room))); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
    });
  }
  function saveCard() {
    var el = $('endCard').querySelector('svg'); if (!el) return;
    var w = el.viewBox.baseVal.width, h = el.viewBox.baseVal.height, k = 3, img = new Image(), name = 'sacrament-solo-' + (state ? state.hero.name : 'road').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
    var said = function (t) { $('endSaved').textContent = t; $('endSaved').hidden = false; };
    img.onload = function () {
      var c = document.createElement('canvas'); c.width = w * k; c.height = h * k;
      var g = c.getContext('2d'); g.scale(k, k); g.drawImage(img, 0, 0, w, h);
      c.toBlob(function (blob) {
        if (!blob) { said('The picture could not be made on this device.'); return; }
        var file; try { file = new File([blob], name, { type: 'image/png' }); } catch { file = null; }
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: 'Sacrament RPG: the end of the road' }).catch(function () { /* the player closed the share sheet */ });
          return;
        }
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); said('Saved as ' + name + '.');
      }, 'image/png');
    };
    img.onerror = function () { said('The picture could not be made on this device.'); };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(el));
  }
  $('endSave').addEventListener('click', saveCard);

  /* The dice, as at the table: the latest check or attack gets the result card; otherwise the latest dice just tumble and land. A hit waits for Roll damage on the card. */
  function roll(fresh) {
    var checks = fresh.filter(function (l) { return l.outcome; });
    if (checks.length) {
      var last = checks[checks.length - 1], o = last.outcome;
      D.show(last.dice || [], o.who, !last.foeAttack, o);
      if (o.pendingDamage && state.fight && state.fight.phase === 'damage' && !D.off() && !reduceMotion()) { cardDamage = true; D.action({ label: 'Roll damage', run: function () { run('damage'); } }); }
      else settle();
      return;
    }
    var plain = fresh.filter(function (l) { return l.dice; });
    if (plain.length) { var p = plain[plain.length - 1]; D.show(p.dice, p.by === 'hero' ? state.hero.name : '', true); }
  }

  /* In solo the result card blocks nothing (the buttons below still work and the foe moves by itself), so its button only closes it, and it fades
     by itself once it has been read. It waits while the pointer is on it or its button has focus. */
  var CARD_READ = 4200;
  function settle() {
    var b = document.querySelector('#dice .reveal-action'); if (b) b.textContent = 'Close';
    clearTimeout(cardTimer);
    cardTimer = setTimeout(function fade() {
      var card = document.querySelector('#dice .reveal-result'); if (!card) { cardTimer = 0; return; }
      if (card.matches(':hover') || card.contains(document.activeElement)) { cardTimer = setTimeout(fade, 1000); return; }
      card.classList.add('fading'); cardTimer = setTimeout(function () { cardTimer = 0; if (document.querySelector('#dice .reveal-result.fading')) D.clear(); }, 400);
    }, CARD_READ);
  }

  /* ---------- pictures ---------- */
  function reduceMotion() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch { return false; } }
  function paint() {
    if (!state || dying) return;
    var html = ART.scene(ADV().rooms[state.room].art, state, 'g');
    if (html !== lastArt) { $('art').innerHTML = html; lastArt = html; }
  }

  /* ---------- the hero sheet ---------- */
  $('heroBtn').addEventListener('click', function () {
    var h = state.hero;
    $('sheetName').textContent = h.name; $('sheetCalling').textContent = [h.calling, h.vow].filter(Boolean).join(' · ');
    var nums = $('sheetNums'); nums.textContent = '';
    [['HP', state.hp.cur + ' of ' + state.hp.max], ['Defence', C.defence(h)], ['Horror', state.horror + ' of ' + R.HORROR.max], ['Target here', ADV().target]].forEach(function (x) { nums.appendChild(stat(x[0], x[1])); });
    var st = $('sheetStats'); st.textContent = ''; R.STATS.forEach(function (k) { st.appendChild(stat(k, '+' + (h.stats[k] || 0))); });
    var ef = $('sheetEffort'); ef.textContent = ''; R.CATS.forEach(function (k) { ef.appendChild(stat(R.CAT_NAMES[k], 'd' + R.DEFAULT_DICE[k] + ' +' + (h.effort[k] || 0))); });
    gearList($('sheetEq'), true); gearList($('sheetPack'), false);
    $('sheet').showModal();
  });
  function stat(k, v) { var s = document.createElement('span'), b = document.createElement('b'); b.textContent = k; s.append(b, String(v)); return s; }
  function gearList(ul, eq) {
    ul.textContent = '';
    var any = false;
    (state.hero.gear || []).forEach(function (g) {
      var it = C.itemOf(g); if (!it || !!g.eq !== eq) return; any = true;
      var li = document.createElement('li'), img = document.createElement('img'), div = document.createElement('div'), sm = document.createElement('small');
      img.src = ART.icon(it.kind); img.alt = '';
      div.textContent = it.name + (it.uses != null && g.uses != null ? ' (' + g.uses + ' left)' : '');
      sm.textContent = it.does || it.flavour || ''; div.appendChild(sm);
      if (it.kind === 'grimoire') C.spellsOf(it).forEach(function (sp) {
        var p = document.createElement('p'), b = document.createElement('b'); p.className = 'spell'; b.textContent = sp.name + (sp.roll ? ' (' + sp.roll + ')' : '') + ': ';
        p.append(b, document.createTextNode(sp.does || '')); div.appendChild(p);
      });
      li.append(img, div); ul.appendChild(li);
    });
    if (!any) { var li = document.createElement('li'); li.className = 'none'; li.textContent = 'Nothing.'; ul.appendChild(li); }
  }

  /* ---------- the music (off until the player turns it on) ---------- */
  var M = window.SacramentSoloMusic;
  function tune(name) { if (M) M.play(name); }
  function musicLabel() { var b = $('musicBtn'), on = !!(M && M.isOn()); b.textContent = '♪ ' + (on ? 'On' : 'Off'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
  if (M) {
    $('musicBtn').addEventListener('click', function () { M.setOn(!M.isOn()); musicLabel(); });
    /* Safari starts sound only from a finished tap (a click), not from the moment the finger goes down. Every tap also wakes sound that an
       iPhone paused, after a call or a locked screen. */
    document.addEventListener('click', function (e) { if (e.target && e.target.id === 'musicBtn') return; M.wake(); musicLabel(); }, true);
  } else $('musicBtn').hidden = true;

  /* ---------- the menu ---------- */
  $('menuBtn').addEventListener('click', function () { $('menu').showModal(); });
  $('restartBtn').addEventListener('click', function () { $('menu').close(); begin(state.origin); });
  $('newHeroBtn').addEventListener('click', function () { $('menu').close(); forget(); showStart(); });

  window.__solo = { state: function () { return state; }, run: run, render: function () { render(); }, victory: function () { victory(); }, end: function () { showEnd(); } };
  showStart();
})();
