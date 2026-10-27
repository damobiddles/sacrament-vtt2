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
  var box = null, mine = 0, air = 0, api, result = null;
  var timers = new Set(), intervals = new Set();
  function later(fn, ms) { var id = setTimeout(function () { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function off() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }
  function setOff(v) { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch {} if (v) { clear(); if (api.onLand) api.onLand(); } }
  function still() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enabled() { return !off() && !still() && !document.hidden; }
  function holder() { if (!box) box = document.getElementById('dice'); return box; }
  function clear() {
    timers.forEach(clearTimeout); intervals.forEach(clearInterval); timers.clear(); intervals.clear(); mine = 0; air = 0; result = null;
    if (box) { box.replaceChildren(); box.setAttribute('aria-hidden', 'true'); }
  }
  function land(own) { if (air > 0) air--; if (own && mine > 0) mine--; if (api.onLand) api.onLand(); }
  function showDice(dice, who, own, target, persistent) {
    if (!enabled() || !dice || !dice.length) return;
    var h = target || holder(); if (!h) return;
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
    later(function () { land(own); if (!persistent) later(function () { g.classList.add('gone'); later(function () { g.remove(); }, FADE); }, HOLD); }, SPIN + 150);
  }

  function textEl(tag, cls, text, parent) {
    var el = document.createElement(tag); el.className = cls; el.textContent = text; parent.appendChild(el); return el;
  }
  function show(dice, who, own, outcome) {
    // Another person's roll cannot dismiss your pending hit. Damage from this
    // person replaces their own hit; all commands still use the existing UI.
    if (result && result.own && result.pendingDamage && !own) return;
    clear();
    if (!outcome) { showDice(dice, who, own); return; }
    var h = holder(); if (!h || document.hidden) return;
    h.setAttribute('aria-hidden', 'false');
    var card = document.createElement('section'); card.className = 'reveal-result ' + (outcome.success ? 'success' : 'failure');
    card.setAttribute('role', 'group'); card.setAttribute('aria-label', 'Dice result'); h.appendChild(card);
    result = {rollId: outcome.rollId, own: own, pendingDamage: outcome.pendingDamage, card: card, outcome: outcome};
    textEl('p', 'reveal-who', who + (outcome.targetName ? ' → ' + outcome.targetName : ''), card);
    var faces = textEl('div', 'reveal-dice', '', card);
    var shown = dice && dice.length ? dice : outcome.d20 != null && !outcome.hiddenNumbers ? [{die:20, n:outcome.d20}] : [];
    showDice(shown, who, own, faces, true);
    var label = textEl('strong', 'reveal-outcome', air ? 'Rolling…' : outcome.label, card); label.setAttribute('aria-live', 'polite');
    var detail = textEl('p', 'reveal-detail', '', card);
    var current = result;
    function landed() {
      if (result !== current) return;
      label.textContent = outcome.label;
      if (!outcome.hiddenNumbers && outcome.total != null) detail.textContent = outcome.total + ' against ' + outcome.versus + ' ' + outcome.target + (outcome.note ? '. ' + outcome.note : '');
    }
    if (air) later(landed, SPIN); else landed();
    result.button = textEl('button', 'btn main reveal-action', '', card); result.button.type = 'button';
    action(null);
  }
  function action(next) {
    if (!result) return;
    var r = result, button = r.button;
    if (r.own && r.pendingDamage) {
      button.textContent = next ? next.label : 'Waiting for damage controls…'; button.disabled = !next;
      button.onclick = next ? function () { if (button.disabled) return; button.disabled = true; next.run(); } : null;
    } else {
      button.textContent = 'Continue'; button.disabled = false;
      button.onclick = function () { clear(); if (api.onLand) api.onLand(); var nextControl = document.querySelector('#strip button:not([disabled])'); if (nextControl) nextControl.focus({preventScroll:true}); };
    }
  }
  function sync(outcome) {
    if (!result) return;
    if (!outcome || (result.pendingDamage && !outcome.pendingDamage)) { clear(); return; }
  }
  api = window.SacramentDice = {
    show: show, clear: clear, action: action, sync: sync, resultId: function () { return result && result.rollId; },
    busy: function () { return mine > 0; },
    rolling: function () { return air > 0; },
    onLand: null,
    off: off, setOff: setOff
  };
})();
