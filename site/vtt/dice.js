/* Sacrament RPG Table: dice that tumble on screen. The server has already rolled every number; this only shows it landing, on every screen that is told about the roll.
   It decides nothing and holds nothing: the numbers it flickers through on the way are for show, and the last one is always the server's.
   Each viewer can switch it off (kept in this browser), and it stays still for anyone whose device asks for less motion. */
(function () {
  'use strict';
  var KEY = 'sacrament-dice-off', SPIN = 900, HOLD = 1100, FADE = 300, MAX = 4;
  /* flat outlines for each die, drawn in a 100 × 100 box */
  var SHAPES = {
    4: '<polygon points="50,8 95,88 5,88"/>',
    6: '<rect x="12" y="12" width="76" height="76" rx="12"/>',
    8: '<polygon points="50,4 95,50 50,96 5,50"/><path d="M5,50 H95"/>',
    10: '<polygon points="50,4 95,42 50,96 5,42"/><path d="M5,42 L50,58 L95,42 M50,58 V96"/>',
    12: '<polygon points="50,4 96,37 78,93 22,93 4,37"/><polygon points="50,24 72,40 64,68 36,68 28,40"/>',
    20: '<polygon points="50,3 93,27 93,73 50,97 7,73 7,27"/><polygon points="50,24 76,68 24,68"/><path d="M50,3 V24 M93,73 L76,68 M7,73 L24,68"/>',
    100: '<polygon points="50,4 95,42 50,96 5,42"/><path d="M5,42 L50,58 L95,42 M50,58 V96"/>'
  };
  var box = null, mine = 0, air = 0, api;
  var timers = new Set(), intervals = new Set();
  function later(fn, ms) { var id = setTimeout(function () { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function off() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setOff(v) { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {} if (v) { clear(); if (api.onLand) api.onLand(); } }
  function still() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enabled() { return !off() && !still() && !document.hidden; }
  function holder() { if (!box) box = document.getElementById('dice'); return box; }
  function clear() {
    timers.forEach(clearTimeout); intervals.forEach(clearInterval); timers.clear(); intervals.clear(); mine = 0; air = 0;
    if (box) { box.replaceChildren(); box.setAttribute('aria-hidden', 'true'); }
  }
  function land(own) { if (air > 0) air--; if (own && mine > 0) mine--; if (api.onLand) api.onLand(); }
  function show(dice, who, own) {
    if (!enabled() || !dice || !dice.length) return;
    var h = holder(); if (!h) return;
    while (h.children.length >= MAX) h.removeChild(h.firstChild);
    var g = document.createElement('div'); g.className = 'dice-roll';
    dice.slice(0, 2).forEach(function (d) {
      var size = +d.die, n = +d.n, el = document.createElement('div'), face = document.createElement('b');
      el.className = 'die d' + size; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<svg viewBox="0 0 100 100">' + (SHAPES[size] || SHAPES[20]) + '</svg>';
      face.textContent = String(1 + Math.floor(Math.random() * size)); el.appendChild(face); g.appendChild(el);
      var t = setInterval(function () { face.textContent = String(1 + Math.floor(Math.random() * size)); }, 70); intervals.add(t);
      later(function () { clearInterval(t); intervals.delete(t); face.textContent = String(n); el.classList.add('landed'); if (size === 20 && n === 20) el.classList.add('top'); if (size === 20 && n === 1) el.classList.add('low'); }, SPIN);
    });
    h.appendChild(g); air++; if (own) mine++;
    later(function () { land(own); later(function () { g.classList.add('gone'); later(function () { g.remove(); }, FADE); }, HOLD); }, SPIN + 150);
  }

  api = window.SacramentDice = {
    show: show, clear: clear,
    busy: function () { return mine > 0; },
    rolling: function () { return air > 0; },
    onLand: null,
    off: off, setOff: setOff
  };
})();
