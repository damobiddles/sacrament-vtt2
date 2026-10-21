/* Sacrament RPG table rules arithmetic, kept apart from the interface and from the session service. Nothing here touches the DOM, a clock or a random source
   unless one is passed in. Baseline: the rules as described in the project's own notes (docs/vtt/README.md).
   Nothing is invented: what is not established is left out (no critical-failure rule; a monster's attack is a plain d20 + bonus against 10 + CON + armour, as the Rules page says, with no special result on a 1 or a 20). The rules are provisional: see docs/vtt/README.md. */
/* Loaded as a plain script in the browser and imported (for its effect) in Node: either way it puts SacramentRules on the global object, as site/legacy/fx.js does. */
(function (root, factory) { root.SacramentRules = factory(); })(typeof globalThis !== 'undefined' ? globalThis : window, function () {
  'use strict';

  var STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  /* The five kinds of Effort. The die sizes are the project's own choice and are editable per table (settings.dice). */
  var CATS = ['basic', 'weapons', 'guns', 'magic', 'ultimate'];
  var CAT_NAMES = { basic: 'Basic', weapons: 'Weapons', guns: 'Guns', magic: 'Magic', ultimate: 'Ultimate' };
  var DEFAULT_DICE = { basic: 4, weapons: 6, guns: 8, magic: 10, ultimate: 12 };
  var HEART = 10; /* 1 Heart is 10 hit points, or 10 points of Effort on a task */
  var ADJ = { easy: -3, normal: 0, hard: 3 }; /* applied to the Target, so Easy makes it lower */
  var MAX_BONUS = 10; /* a single stat or Effort bonus never passes +10 */
  /* Building a hero: what the character sheet enforces. Six points among the six scores (none above 6), four Effort points, ten slots for what is equipped and ten for the pack,
     no more than three relics and grimoires in all, and a player may pick one grimoire themselves (relics and further books are finds the GM gives). */
  var BUILD = { points: 6, scoreMax: 6, effortPoints: 4, slots: 10, magicItems: 3, playerGrimoires: 1 };

  /* Monster attacks (the GM's): a monster rolls d20 + its attack bonus and hits a hero when the total reaches the hero's Defence. These follow the Rules page. */
  var DEFENCE_BASE = 10; /* a foe must roll 10 + the hero's Defence bonus */
  var ARMOUR_CAP = 5; /* armour never adds more than +5 to Defence */
  var DEFENCE_MAX = 10; /* the Defence bonus never passes +10 */

  /* The Rising Horror: one meter for the whole table, from 0 to its maximum. Casting a spell, or using an item, that tempts the Horror raises it by that thing's Horror amount,
     whether or not the check succeeds (using it is what tempts the Horror). An amount is a whole number ("horror": 2) or dice rolled at the moment of use ("horror": "d4+2").
     An amount of 0 does nothing. Passing a threshold announces it in the feed and alerts the GM; the GM decides what it means, and the table applies no effect itself.
     At the maximum the Horror has arrived: everyone is told, and the meter stays there. It never falls by itself: only the GM lowers it, by hand or by undoing a rise.
     A push (a second action taken after a failed check) costs `push`; a hero's d20 showing a natural 1 costs `nat1`, by itself (the owner's rule, 2026-10-20). */
  var HORROR = { max: 21, thresholds: [7, 14, 21], push: 1, nat1: 1, lowerDie: 6, lines: { 7: 'The Horror stirs.', 14: 'The Horror draws near.', 21: 'The Horror has arrived.' } };
  var HORROR_DICE = /^([1-9]?)d(4|6|8|10|12|20)(?:\+([0-9]{1,2}))?$/;   /* "d6", "2d4", "d4+2" */

  /* What a Horror amount is: { fixed } for a number, { count, sides, plus } for dice, or null when there is none (missing, 0, or not readable). */
  function horrorSpec(v) {
    if (typeof v === 'number') return v > 0 && Math.floor(v) === v ? { fixed: Math.min(v, HORROR.max) } : null;
    var t = String(v == null ? '' : v).trim().toLowerCase(); if (/^[0-9]+$/.test(t)) return horrorSpec(int(t, 0));
    var m = HORROR_DICE.exec(t); return m ? { count: int(m[1], 1), sides: int(m[2], 0), plus: int(m[3], 0) } : null;
  }
  function horrorValid(v) { return horrorSpec(v) !== null; }
  /* The words for an amount: "3", "d4+2". */
  function sayHorrorAmount(v) { var h = horrorSpec(v); if (!h) return '0'; return h.fixed != null ? String(h.fixed) : (h.count > 1 ? h.count : '') + 'd' + h.sides + (h.plus ? '+' + h.plus : ''); }
  /* Work out a Horror amount. `die(sides)` rolls one die (the caller's dice: the server's, or a test's). Returns { amount, rolled: [..] | null, text } or null for no amount. */
  function rollHorror(v, die) {
    var h = horrorSpec(v); if (!h) return null;
    if (h.fixed != null) return { amount: h.fixed, rolled: null, text: String(h.fixed) };
    var rolled = []; for (var i = 0; i < h.count; i++) rolled.push(clamp(int(die(h.sides), 1), 1, h.sides));
    var amount = rolled.reduce(function (a, b) { return a + b; }, 0) + h.plus;
    return { amount: amount, rolled: rolled, text: amount + ' (' + sayHorrorAmount(v) + ': ' + rolled.join(' + ') + (h.plus ? ' + ' + h.plus : '') + ')' };
  }
  /* Move the meter by `d` (up or down), kept from 0 to the maximum. `crossed` is every threshold passed on the way up, lowest first; going down crosses none. */
  function horrorMove(cur, d) {
    cur = clamp(int(cur, 0), 0, HORROR.max); var to = clamp(cur + int(d, 0), 0, HORROR.max);
    return { from: cur, to: to, applied: to - cur, crossed: HORROR.thresholds.filter(function (t) { return cur < t && to >= t; }), arrived: to >= HORROR.max };
  }

  /* Dying, as the Rules page has it (the owner asked for it on the table, 2026-10-21). A hero who falls to 0 is dying and rolls a d4: the rounds left. Each new round takes one off;
     at 0 the hero is dead. A blow that gets through on a dying hero takes a round off instead of damage. A stable hero's countdown stops; hurt again, they are dying again
     with a new d4. Any healing stands a dying or stable hero up. The state is { left, stable, dead }, or null for a hero who is not down. */
  var DYING = { die: 4, maxLeft: 9 };
  function dyingFall(rolled) { return { left: clamp(int(rolled, 1), 1, DYING.die), stable: false, dead: false }; }
  /* A round (or a blow) takes one off a dying hero's countdown. A stable or dead hero does not move. Returns the new state (a copy). */
  function dyingTick(st) {
    if (!st || st.stable || st.dead) return st;
    var left = Math.max(0, int(st.left, 0) - 1); return { left: left, stable: false, dead: left === 0 };
  }
  /* The GM's correction: rounds added or taken off by hand. Giving a dead hero a round brings them back to dying. */
  function dyingAdjust(st, d) {
    if (!st) return st;
    var left = clamp(int(st.left, 0) + int(d, 0), 0, DYING.maxLeft); return { left: left, stable: left > 0 && !!st.stable, dead: left === 0 };
  }

  /* The party's rest: every living hero recovers a Heart, and the Horror falls by a d6 for every two living heroes (1 or 2: 1d6; 3 or 4: 2d6; 5 or 6: 3d6). */
  var REST = { heal: HEART, horrorDie: 6, perDie: 2 };
  function restDice(living) { return Math.ceil(Math.max(0, int(living, 0)) / REST.perDie); }

  /* The two table settings. Everything else is a fixed rule. */
  var DEFAULT_SETTINGS = { nat20Ultimate: true, dice: DEFAULT_DICE };

  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  var int = function (v, d) { v = parseInt(v, 10); return isFinite(v) ? v : (d || 0); };

  function settingsOf(s) {
    s = s || {}; var dice = {}, cfg = {};
    CATS.forEach(function (k) { var v = int(s.dice && s.dice[k], DEFAULT_DICE[k]); dice[k] = [4, 6, 8, 10, 12, 20].indexOf(v) >= 0 ? v : DEFAULT_DICE[k]; });
    cfg.nat20Ultimate = s.nat20Ultimate !== false; cfg.dice = dice;
    return cfg;
  }

  /* The Target a roll is made against: the scene's Target moved by EASY or HARD, never below 1. */
  function targetFor(scene, adj) { return Math.max(1, int(scene) + (ADJ[adj] || 0)); }

  /* A stat check: d20 plus the stat. `d20` is the die (rolled by the caller, or typed in from a physical die). */
  function check(o) {
    var cfg = settingsOf(o.settings), mod = clamp(int(o.stat) + int(o.bonus), -MAX_BONUS, MAX_BONUS), target = targetFor(o.target, o.adj), d = int(o.d20);
    if (d < 1 || d > 20) throw new Error('A d20 shows 1 to 20.');
    var total = d + mod, nat20 = d === 20, nat1 = d === 1;
    var success = total >= target;
    return { d20: d, mod: mod, total: total, target: target, baseTarget: int(o.target), adj: ADJ[o.adj] === undefined ? 'normal' : o.adj, success: success, nat20: nat20, nat1: nat1, offerUltimate: nat20 && cfg.nat20Ultimate };
  }

  /* An Effort roll: the die for its kind plus the hero's bonus in that kind. `rolled` is the die (typed in or random). */
  function effort(o) {
    var cfg = settingsOf(o.settings), cat = CATS.indexOf(o.cat) >= 0 ? o.cat : 'basic', size = cfg.dice[cat], r = int(o.rolled);
    if (r < 1 || r > size) throw new Error('A d' + size + ' shows 1 to ' + size + '.');
    var bonus = clamp(int(o.bonus), 0, MAX_BONUS);
    return { cat: cat, die: size, rolled: r, bonus: bonus, total: r + bonus };
  }

  /* A hero's Defence: the number a monster must reach. 10 + CON + armour, armour counting for at most +5, the bonus never above +10. */
  function defence(con, armour) { return DEFENCE_BASE + clamp(clamp(int(con), -MAX_BONUS, MAX_BONUS) + Math.min(Math.max(int(armour), 0), ARMOUR_CAP), -DEFENCE_MAX, DEFENCE_MAX); }

  /* A monster's attack: d20 plus its attack bonus against a hero's Defence. `d20` is rolled by the caller or typed in from a physical die. */
  function attack(o) {
    var d = int(o.d20); if (d < 1 || d > 20) throw new Error('A d20 shows 1 to 20.');
    var mod = clamp(int(o.bonus), -MAX_BONUS, MAX_BONUS), total = d + mod, def = int(o.defence);
    return { d20: d, mod: mod, total: total, defence: def, hit: total >= def, success: total >= def };
  }
  function sayAttack(a) { return a.d20 + (a.mod < 0 ? ' - ' + Math.abs(a.mod) : ' + ' + a.mod) + ' = ' + a.total + ' against Defence ' + a.defence + (a.hit ? '. Hit.' : '. Miss.'); }

  /* The sentence a person reads: "12 + 2 STR = 14 against Target 13." */
  function sayCheck(c, statName) {
    var sign = c.mod < 0 ? ' - ' + Math.abs(c.mod) : ' + ' + c.mod;
    var t = c.adj !== 'normal' ? 'Target ' + c.target + ' (' + c.adj.toUpperCase() + ', from ' + c.baseTarget + ')' : 'Target ' + c.target;
    return c.d20 + sign + ' ' + (statName || '') + ' = ' + c.total + ' against ' + t + (c.success ? '. Success.' : '. Miss.');
  }
  function sayEffort(e, word) { return 'd' + e.die + ' ' + e.rolled + (e.bonus ? ' + ' + e.bonus + ' ' + CAT_NAMES[e.cat] : '') + ' = ' + e.total + ' ' + (word || 'Effort') + '.'; }   /* word: "damage" when it comes off HP */

  /* Hit points and task progress. Both count in points, ten to a Heart. A change is clamped to the tracker, and the amount that really changed is returned. */
  function hearts(points) { return Math.ceil(Math.max(0, int(points)) / HEART); }
  function change(cur, max, delta) {
    cur = int(cur); max = int(max); var to = clamp(cur + int(delta), 0, max);
    return { cur: to, applied: to - cur };
  }

  /* Turn order is a list; the current turn is an index. Passing the last place begins a new round. */
  function nextTurn(len, idx, round) {
    if (len <= 0) return { idx: 0, round: round, newRound: false };
    var n = idx + 1; if (n >= len) return { idx: 0, round: round + 1, newRound: true };
    return { idx: n, round: round, newRound: false };
  }
  function previousTurn(len, idx, round) {
    if (len <= 0) return { idx: 0, round: round, newRound: false };
    if (idx > 0) return { idx: idx - 1, round: round, newRound: false };
    return { idx: len - 1, round: Math.max(1, round - 1), newRound: false };
  }

  /* Round timers. A timer set to run automatically loses 1 at the START of each new round (the moment the last place in the turn order ends, or the GM presses
     Next round). A paused timer does not move. A timer never goes below 0. The tick that takes it to 0 reports it, once, so the GM can be told; the GM decides
     what that means in the fiction. `timers` are { cur, max, auto, paused, fired } and are changed in place. */
  function tickTimers(timers) {
    var out = [];
    timers.forEach(function (t, i) {
      if (!t || !t.auto || t.paused || t.cur <= 0) return;
      t.cur -= 1; out.push({ i: i, before: t.cur + 1, after: t.cur, fired: t.cur === 0 });
      if (t.cur === 0) t.fired = true;
    });
    return out;
  }

  return { STATS: STATS, CATS: CATS, CAT_NAMES: CAT_NAMES, DEFAULT_DICE: DEFAULT_DICE, HEART: HEART, BUILD: BUILD, ADJ: ADJ, MAX_BONUS: MAX_BONUS, DEFENCE_BASE: DEFENCE_BASE, ARMOUR_CAP: ARMOUR_CAP, DEFENCE_MAX: DEFENCE_MAX, DEFAULT_SETTINGS: DEFAULT_SETTINGS,
    HORROR: HORROR, DYING: DYING, dyingFall: dyingFall, dyingTick: dyingTick, dyingAdjust: dyingAdjust, REST: REST, restDice: restDice, horrorSpec: horrorSpec, horrorValid: horrorValid, sayHorrorAmount: sayHorrorAmount, rollHorror: rollHorror, horrorMove: horrorMove,
    settingsOf: settingsOf, targetFor: targetFor, check: check, defence: defence, attack: attack, sayAttack: sayAttack, effort: effort, sayCheck: sayCheck, sayEffort: sayEffort, hearts: hearts, change: change, nextTurn: nextTurn, previousTurn: previousTurn, tickTimers: tickTimers };
});
