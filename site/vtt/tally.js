/* Sacrament RPG: the numbers that rise off the dice, as in a video game (the owner's ask, 2026-11-10 for solo, 2026-11-11 for the table).
   Once a die lands, each modifier floats up beside it in turn ("+3 STR", "+2 two hands"), then the total pops over the die ("15 against Target 13",
   "8 damage") and fades. A blow on a token floats up from it ("−8").
   One file for the solo game and the table, so the two always look the same. Display only: every number is one the rules already worked out,
   and the same words are in the story or the Activity feed.
   The first half (sum, effort) only builds the list and runs anywhere, the table's server included; the second half (show, float) draws it. */
(function (root) {
  'use strict';

  /* What a check adds up to. A part is [amount, what it is]; parts of 0 are left out, and if the parts do not add up to the rules' modifier
     (it is capped) the modifier is shown whole as "bonus". */
  function sum(mod, parts, total, word, good) {
    parts = parts.filter(function (x) { return x[0]; }).map(function (x) { return { n: x[0], t: String(x[1] || 'bonus') }; });
    if (parts.reduce(function (a, x) { return a + x.n; }, 0) !== mod) parts = mod ? [{ n: mod, t: 'bonus' }] : [];
    return { parts: parts, total: total, word: word, good: !!good };
  }
  /* What an Effort roll adds up to: the hero's bonus for its kind, a weapon held in two hands, and the critical die. `at` is which die it rises from. */
  function effort(e, word, o) {
    o = o || {};
    var R = root.SacramentRules, names = (R && R.CAT_NAMES) || {};
    var parts = [{ n: e.bonus || 0, t: names[e.cat] || 'Effort' }, { n: e.weaponBonus || 0, t: o.weapon || 'two hands' }];
    if (e.critical) parts.push({ n: e.critical.rolled, t: 'critical d' + e.critical.die }, { n: e.critical.bonus || 0, t: 'Ultimate' });
    var out = { parts: parts.filter(function (x) { return x.n; }), total: e.total, word: word, good: o.good !== false };
    if (o.at) out.at = o.at;
    return out;
  }
  /* Only a total ("3 HP back"). */
  function total(n, word, good, at) { var out = { parts: [], total: n, word: word, good: !!good }; if (at) out.at = at; return out; }

  /* ---------- drawing ---------- */
  var STEP = 420, HOLD = 1500, LAND = 950, timers = [], ends = 0, frameOf = null;
  function still() { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function later(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clear() {
    timers.forEach(clearTimeout); timers = []; ends = 0;
    if (frameOf) frameOf.querySelectorAll('.tally').forEach(function (t) { t.remove(); });
  }
  /* list: the tally a line carries. frame: the box the numbers are drawn in (it must be positioned). holder: where the dice are.
     moving: false when the dice do not tumble (switched off, or less motion asked for): the numbers then appear at once. */
  function show(list, frame, holder, moving) {
    clear();
    if (!list || !list.length || !frame || typeof document === 'undefined' || document.hidden) return;
    frameOf = frame;
    var t = moving ? LAND : 0;
    list.forEach(function (one) {
      if (!one || one.total == null) return;
      var parts = Array.isArray(one.parts) ? one.parts : [];
      later(function () {
        var box = frame.getBoundingClientRect(), dice = holder ? holder.querySelectorAll('.die') : [], die = dice[Math.min(one.at || 0, dice.length - 1)];
        var seen = die && die.offsetParent, r = seen ? die.getBoundingClientRect() : ((holder && holder.querySelector('.reveal-result, .dice-roll')) || frame).getBoundingClientRect();
        var x = r.left + r.width / 2 - box.left, y = seen ? r.top + r.height / 2 - box.top : Math.min(r.top - box.top + 40, box.height / 2);
        var el = document.createElement('div'); el.className = 'tally'; el.setAttribute('aria-hidden', 'true');
        el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.setProperty('--half', (seen ? r.width / 2 : 0) + 'px'); frame.appendChild(el);
        parts.forEach(function (p, k) {
          later(function () { var c = document.createElement('span'); c.className = 'tally-part ' + (p.n < 0 ? 'minus' : 'plus'); c.textContent = (p.n < 0 ? '−' + Math.abs(p.n) : '+' + p.n) + ' ' + p.t; c.style.setProperty('--k', String(k)); el.appendChild(c); }, k * STEP);
        });
        later(function () {
          var c = document.createElement('span'); c.className = 'tally-total ' + (one.good ? 'good' : 'bad');
          var b = document.createElement('b'); b.textContent = String(one.total); c.appendChild(b);
          if (one.word) { var w = document.createElement('small'); w.textContent = one.word; c.appendChild(w); }
          el.appendChild(c);
        }, parts.length * STEP);
        later(function () { el.classList.add('gone'); later(function () { el.remove(); }, 400); }, parts.length * STEP + HOLD);
      }, t);
      t += parts.length * STEP + (list.length > 1 ? HOLD : 0);
    });
    ends = Date.now() + t + 200;
  }
  /* how long until the totals have shown, so a number over a foe, hero or token waits for them */
  function after() { return Math.max(0, ends - Date.now()); }
  /* A number that rises from a point and fades: x and y in pixels inside `frame`, or in percent when `pct` is set. kind: 'dmg' (a blow landed), 'hurt' (you are hurt), 'heal'. */
  function float(text, x, y, kind, frame, pct) {
    if (!frame || typeof document === 'undefined') return null;
    var f = document.createElement('span'); f.className = 'float ' + (kind || 'dmg'); f.setAttribute('aria-hidden', 'true'); f.textContent = text;
    f.style.left = x + (pct ? '%' : 'px'); f.style.top = y + (pct ? '%' : 'px'); frame.appendChild(f);
    setTimeout(function () { f.remove(); }, 1300);
    return f;
  }

  var api = { sum: sum, effort: effort, total: total, show: show, clear: clear, after: after, float: float, still: still };
  root.SacramentTally = api;
})(typeof window !== 'undefined' ? window : globalThis);
