/* Sacrament RPG solo: the page. It shows the engine's story, buttons and pictures, keeps the game in this browser, and never changes a saved hero.
   Needs rules.js, gear.js, sheet-core.js, heroes.js, hero-tools.js, engine.js, an adventure file and pixels.js. */
(function () {
  'use strict';
  var S = window.SacramentSolo, PX = window.SacramentSoloPixels, R = window.SacramentRules, C = window.SacramentSheetCore;
  var ADV = window.SacramentSoloAdventures['silent-bell'];
  var SAVE = 'sacrament-solo-v1';
  var $ = function (id) { return document.getElementById(id); };
  var state = null, tick = 0, timer = null, still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Dice: the browser's own random source. (At the table the server rolls; alone, this page is the table.) */
  function die(sides) { var a = new Uint32Array(1); window.crypto.getRandomValues(a); return 1 + (a[0] % sides); }

  /* ---------- saving in this browser ---------- */
  function load() { try { var raw = JSON.parse(localStorage.getItem(SAVE) || 'null'); return raw && S.valid(raw.game, ADV) ? raw : null; } catch { return null; } }
  function save() { try { localStorage.setItem(SAVE, JSON.stringify({ game: state, hero: state && state.origin })); } catch { /* private window: the game still plays, it just will not be there next time */ } }
  function forget() { try { localStorage.removeItem(SAVE); } catch { /* nothing to forget */ } }

  /* ---------- the first screen ---------- */
  function showStart() {
    stopAnim(); state = null; document.body.classList.remove('playing');
    $('start').hidden = false; $('game').hidden = true; $('heroBtn').hidden = true; $('menuBtn').hidden = true;
    $('blurb').textContent = ADV.blurb;
    var saved = load(), resume = $('resume'); resume.textContent = '';
    if (saved && !saved.game.over) {
      var b = pickButton('Continue as ' + saved.game.hero.name, 'In ' + ADV.rooms[saved.game.room].short + ' · HP ' + saved.game.hp.cur + ' of ' + saved.game.hp.max, 'resume');
      b.addEventListener('click', function () { state = saved.game; state.origin = saved.hero; showGame(false); });
      resume.appendChild(b);
    }
    var mine = $('mine'); mine.textContent = '';
    var list; try { list = window.SacramentHeroes.read().heroes || []; } catch { list = []; }
    if (!list.length) { var p = document.createElement('p'); p.className = 'empty'; p.innerHTML = 'You have no heroes saved in this browser yet. Make one in <a href="/character/">My heroes</a>, or take a ready-made hero below.'; mine.appendChild(p); }
    list.forEach(function (h) {
      var b = pickButton(h.name, [h.calling, 'Defence ' + C.defence(h)].filter(Boolean).join(' · '));
      b.addEventListener('click', function () { begin(h); }); mine.appendChild(b);
    });
    PX.draw($('titleArt').getContext('2d'), 'title', null, 0);
    startAnim(function () { PX.draw($('titleArt').getContext('2d'), 'title', null, tick); });
  }
  function pickButton(title, sub, cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pick' + (cls ? ' ' + cls : '');
    var t = document.createElement('b'); t.textContent = title; var s = document.createElement('span'); s.textContent = sub || ''; b.append(t, s); return b;
  }
  document.querySelectorAll('[data-focus]').forEach(function (b) {
    b.addEventListener('click', function () { begin(window.SacramentHeroTools.generate(b.getAttribute('data-focus'))); });
  });

  function begin(hero) {
    state = S.start(hero, ADV, die); state.origin = JSON.parse(JSON.stringify(hero)); save(); showGame(true);
  }

  /* ---------- the game screen ---------- */
  function showGame(fresh) {
    document.body.classList.add('playing'); $('start').hidden = true; $('game').hidden = false; $('heroBtn').hidden = false; $('menuBtn').hidden = false;
    var log = $('log'); log.textContent = ''; shown = 0;
    renderLog(!fresh); render();
    startAnim(paint);
    window.scrollTo(0, 0);
  }
  var shown = 0;
  function renderLog(quiet) {
    var log = $('log');
    for (; shown < state.log.length; shown++) {
      var line = state.log[shown], p = document.createElement('p'); p.className = 'k-' + line.k + (quiet ? '' : ' new'); p.textContent = line.t; log.appendChild(p);
    }
    log.scrollTop = log.scrollHeight;
  }
  function render() {
    renderHud(); renderChoices(); paint();
    var r = ADV.rooms[state.room]; $('art').setAttribute('aria-label', 'A pixel picture of ' + r.short + (state.fight ? ', with ' + state.fight.name : '') + '.');
  }
  function renderHud() {
    var hearts = $('hearts'); hearts.textContent = '';
    var n = Math.max(1, Math.ceil(state.hp.max / R.HEART));
    for (var i = 0; i < n; i++) {
      var fill = Math.max(0, Math.min(R.HEART, state.hp.cur - i * R.HEART)) / R.HEART, img = document.createElement('img');
      img.className = 'heart'; img.alt = ''; img.src = heartIcon(fill); hearts.appendChild(img);
    }
    $('hpText').textContent = state.hp.cur + '/' + state.hp.max;
    var pips = $('pips'); pips.textContent = '';
    for (var j = 1; j <= R.HORROR.max; j++) { var d = document.createElement('span'); d.className = 'pip' + (j <= state.horror ? ' on' : '') + (R.HORROR.thresholds.indexOf(j) >= 0 && j < R.HORROR.max ? ' mark' : ''); pips.appendChild(d); }
    pips.setAttribute('aria-hidden', 'true');
    $('horrorText').textContent = state.horror + '/' + R.HORROR.max;
  }
  /* a pixel heart, filled from the bottom by how much of its ten points is left */
  var heartCache = {};
  function heartIcon(fill) {
    var key = Math.round(fill * 10); if (heartCache[key]) return heartCache[key];
    var rows = ['.kk..kk.', 'krrkkrrk', 'krrrrrrk', 'krrrrrrk', '.krrrrk.', '..krrk..', '...kk...'];
    var cv = document.createElement('canvas'); cv.width = 8; cv.height = 7; var ctx = cv.getContext('2d'), top = 7 - Math.round(fill * 6);
    rows.forEach(function (row, y) { for (var x = 0; x < 8; x++) { var ch = row[x]; if (ch === '.') continue; ctx.fillStyle = ch === 'k' ? '#0b0a08' : y >= top && fill > 0 ? (y === 1 && x === 2 ? '#e8a090' : '#c0392b') : '#3a2622'; ctx.fillRect(x, y, 1, 1); } });
    return (heartCache[key] = cv.toDataURL());
  }
  function renderChoices() {
    var box = $('choices'); box.textContent = '';
    $('cmd').hidden = !!state.over;
    if (state.over) {
      var again = choiceButton({ label: state.over === 'won' ? 'Play it again' : 'Try again', cmd: '' }, 'ch');
      again.addEventListener('click', function () { begin(state.origin); });
      var other = choiceButton({ label: 'Choose another hero', cmd: '' }, 'ch go'); other.addEventListener('click', function () { forget(); showStart(); });
      box.append(again, other); return;
    }
    var list = S.choices(state, ADV), main = [], extra = [];
    list.forEach(function (c) { (!state.fight && (c.kind === 'spell' || c.kind === 'use') ? extra : main).push(c); });
    main.forEach(function (c) { box.appendChild(choiceButton(c)); });
    if (extra.length) {
      var h = document.createElement('p'); h.className = 'more'; h.textContent = 'Spells and items'; box.appendChild(h);
      extra.forEach(function (c) { box.appendChild(choiceButton(c)); });
    }
    if (main.length % 2 && !extra.length) box.lastChild.classList.add('wide');
  }
  function choiceButton(c, cls) {
    var b = document.createElement('button'); b.type = 'button'; b.className = cls || 'ch ' + (c.kind === 'do' || c.kind === 'attack' ? '' : c.kind);
    b.textContent = c.label;
    if (c.horror) { var sm = document.createElement('small'); sm.textContent = '+' + R.sayHorrorAmount(c.horror) + ' Horror'; b.appendChild(sm); }
    if (c.cmd) b.addEventListener('click', function () { run(c.cmd); });
    return b;
  }

  function run(cmd) {
    if (!state || state.over || !cmd) return;
    var hpBefore = state.hp.cur, foeBefore = state.fight ? state.fight.hp.cur : null;
    S.act(state, ADV, cmd, die);
    save(); renderLog(false); render();
    var stage = document.querySelector('.stage'); stage.classList.remove('hit', 'good');
    if (state.hp.cur < hpBefore) stage.classList.add('hit'); else if (foeBefore != null && (!state.fight || state.fight.hp.cur < foeBefore)) stage.classList.add('good');
    setTimeout(function () { stage.classList.remove('hit', 'good'); }, 450);
  }
  $('cmd').addEventListener('submit', function (e) {
    e.preventDefault(); var inp = $('cmdIn'), t = inp.value; inp.value = ''; if (!t.trim() || !state) return;
    run(S.parse(state, ADV, t));
  });

  /* ---------- pictures ---------- */
  function paint() { if (state) PX.draw($('art').getContext('2d'), ADV.rooms[state.room].art, state, tick); }
  function startAnim(fn) { stopAnim(); if (still) return; timer = setInterval(function () { if (document.hidden) return; tick++; fn(); }, 220); }
  function stopAnim() { if (timer) clearInterval(timer); timer = null; }

  /* ---------- the hero sheet ---------- */
  $('heroBtn').addEventListener('click', function () {
    var h = state.hero;
    $('sheetName').textContent = h.name; $('sheetCalling').textContent = [h.calling, h.vow].filter(Boolean).join(' · ');
    var nums = $('sheetNums'); nums.textContent = '';
    [['HP', state.hp.cur + ' of ' + state.hp.max], ['Defence', C.defence(h)], ['Horror', state.horror + ' of ' + R.HORROR.max], ['Target here', ADV.target]].forEach(function (x) { nums.appendChild(stat(x[0], x[1])); });
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
      img.src = PX.icon(it.kind); img.alt = '';
      div.textContent = it.name + (it.uses != null && g.uses != null ? ' (' + g.uses + ' left)' : '');
      sm.textContent = it.does || it.flavour || ''; div.appendChild(sm); li.append(img, div); ul.appendChild(li);
    });
    if (!any) { var li = document.createElement('li'); li.className = 'none'; li.textContent = 'Nothing.'; ul.appendChild(li); }
  }

  /* ---------- the menu ---------- */
  $('menuBtn').addEventListener('click', function () { $('menu').showModal(); });
  $('restartBtn').addEventListener('click', function () { $('menu').close(); begin(state.origin); });
  $('newHeroBtn').addEventListener('click', function () { $('menu').close(); forget(); showStart(); });

  window.__solo = { state: function () { return state; }, run: run };
  showStart();
})();
