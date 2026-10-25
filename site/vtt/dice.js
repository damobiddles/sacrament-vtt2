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
  var box = null, mine = 0, air = 0, api, active = null;
  var timers = new Set(), intervals = new Set();
  function later(fn, ms) { var id = setTimeout(function () { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function off() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function setOff(v) { try { if (v) localStorage.setItem(KEY, '1'); else localStorage.removeItem(KEY); } catch (e) {} if (v && active) { show([], active.who, active.own, active); if (api.onLand) api.onLand(); } }
  function still() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function enabled() { return !off() && !still() && !document.hidden; }
  function holder() {
    if (!box) { box = document.createElement('div'); box.id = 'dice'; box.setAttribute('aria-hidden', 'true'); document.body.appendChild(box); }
    return box;
  }
  function clear() {
    timers.forEach(clearTimeout); intervals.forEach(clearInterval); timers.clear(); intervals.clear(); mine = 0; air = 0; active = null;
    if (box) { box.replaceChildren(); box.classList.remove('focused'); box.setAttribute('aria-hidden', 'true'); }
  }
  function land(own) { if (air > 0) air--; if (own && mine > 0) mine--; if (api.onLand) api.onLand(); }
  function textNode(parent, tag, cls, value) { var el = document.createElement(tag); el.className = cls; el.textContent = value; parent.appendChild(el); return el; }
  /* Presentation only. Checks use the server's authorised outcome, including
     typed physical dice; ordinary GM dice never invent a success/failure. */
  function show(dice, who, own, outcome) {
    if (document.hidden) return;
    var animated = enabled() && dice && dice.length;
    if (!animated && !outcome) return;
    if (outcome || active) clear();
    var h = holder(); while (h.children.length >= MAX) h.removeChild(h.firstChild);
    var g = document.createElement('div'); g.className = 'dice-roll';
    if (outcome) { active = outcome; h.classList.add('focused'); h.setAttribute('aria-hidden', 'false'); g.classList.add('result-roll'); g.classList.add(outcome.success ? 'success' : 'failure'); if (outcome.critical) g.classList.add('critical'); }
    (animated ? dice : []).slice(0, 2).forEach(function (d) {
      var size = +d.die, n = +d.n, el = document.createElement('div'), face = document.createElement('b');
      el.className = 'die d' + size; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<svg viewBox="0 0 100 100">' + (SHAPES[size] || SHAPES[20]) + '</svg>';
      face.textContent = String(1 + Math.floor(Math.random() * size)); el.appendChild(face); g.appendChild(el);
      var t = setInterval(function () { face.textContent = String(1 + Math.floor(Math.random() * size)); }, 70); intervals.add(t);
      later(function () { clearInterval(t); intervals.delete(t); face.textContent = String(n); el.classList.add('landed'); if (size === 20 && n === 20) el.classList.add('top'); if (size === 20 && n === 1) el.classList.add('low'); }, SPIN);
    });
    if (who || outcome) textNode(g, 'span', 'who', outcome ? outcome.who : who);
    h.appendChild(g);
    var closeTimer;
    function dismiss() { if (g.contains(document.activeElement)) return; g.classList.add('gone'); later(function () { if (outcome && active === outcome) clear(); else if (g.parentNode) g.remove(); }, FADE); }
    function hold() { closeTimer = later(dismiss, outcome ? 2600 : HOLD); }
    function reveal() {
      if (outcome) {
        var body = document.createElement('div'); body.className = 'reveal-result'; body.setAttribute('role', 'status'); body.setAttribute('aria-live', 'polite'); body.setAttribute('aria-atomic', 'true');
        var mark = textNode(body, 'span', 'reveal-mark', outcome.success ? '✓' : '×'); mark.setAttribute('aria-hidden', 'true');
        textNode(body, 'strong', 'reveal-label', outcome.label);
        textNode(body, 'p', 'reveal-summary', outcome.hiddenNumbers ? 'The GM has resolved this attack. Numbers are hidden.' : outcome.total + ' total against ' + outcome.versus + ' ' + outcome.target + '.');
        if (outcome.item || outcome.targetName) textNode(body, 'p', 'reveal-context', (outcome.item || '') + (outcome.targetName ? (outcome.item ? ' → ' : 'Target: ') + outcome.targetName : ''));
        if (outcome.note) textNode(body, 'p', 'reveal-note', outcome.note);
        if (outcome.manual) textNode(body, 'p', 'reveal-note', 'Physical die');
        g.appendChild(body); g.classList.add('revealed');
        if (own && api.canDamage && api.canDamage(outcome.rollId)) { var btn = textNode(g, 'button', 'btn main reveal-damage', 'Roll damage'); btn.type = 'button'; btn.dataset.do = 'revealDamage'; btn.dataset.roll = outcome.rollId; }
      }
      hold();
    }
    g.addEventListener('focusin', function () { clearTimeout(closeTimer); timers.delete(closeTimer); });
    g.addEventListener('focusout', function (e) { if (!g.contains(e.relatedTarget)) hold(); });
    if (animated) { air++; if (own) mine++; later(function () { land(own); reveal(); }, SPIN + 150); } else reveal();
  }
  api = window.SacramentDice = {
    show: show, clear: clear,
    busy: function () { return mine > 0; },
    rolling: function () { return air > 0; },
    onLand: null, canDamage: null,
    off: off, setOff: setOff
  };
})();
