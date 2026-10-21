/* The Sacrament character rules, in one place. The character builder and the VTT both use this, so a character
   works the same everywhere. Usage:  var R = SacRules(library);  R.score(character, 'Body')
   A library is { nodes, edges, items } (see library.js). A character is a plain object:
   { id, name, vow, level, notes, learned:[ids],
     pack:{ gold, weapon:uid, armour:uid, items:[{u, k, id, dur?}|{u, k:'custom', n, s}] } } */
(function () {
  'use strict';
  /* Three scores, no attributes. A score is a bonus: it starts at +0 and passive abilities and gear add to it. A check rolls a d20, adds the
     score and any weapon or spell bonus (never more than +10 together), and meets or beats the difficulty. */
  var STATS = ['Body', 'Mind', 'Spirit'], BASE = 0, CAP = 10;
  var ALIAS = { Strength: 'Body', Agility: 'Body', Wits: 'Mind', Will: 'Spirit', Body: 'Body', Mind: 'Mind', Spirit: 'Spirit' }; // libraries published before the scores still say Strength and so on
  var TYPES = { action: ['Action', 'var(--action)'], spell: ['Spell', 'var(--spell)'], passive: ['Passive', 'var(--passive)'] };
  /* Armour: heavier armour takes more slots and costs the Mind more, and absorbs more dice: a medium armour of level n absorbs n + 1 d6, a heavy one n + 2. */
  var ARM = { light: { s: 1, dur: 3, b: 0 }, medium: { s: 2, dur: 4, b: 1 }, heavy: { s: 3, dur: 5, b: 2 } };
  var KINDS = { weapon: 'weapons', armour: 'armour', trinket: 'trinkets', misc: 'supplies' };
  var KIND_LABEL = { weapon: 'Weapons', armour: 'Armour', trinket: 'Trinkets', misc: 'Supplies' };
  var MAXLEVEL = 5, HARM = 12;
  /* How an ability or item is used in a turn. Move is free; each turn gives one Action, and a reaction comes once a round. Anything else a character does is part of the story and is not tied to an ability.
     'none' is for something carried or lit, with no action of its own. */
  var USES = { free: 'Free', action: 'Action', reaction: 'Reaction', none: 'No action' };

  var sgn = function (n) { return n === 0 ? '0' : (n > 0 ? '+' : '−') + Math.abs(n); };
  var clampInt = function (v, a, b, d) { v = parseInt(v, 10); return isFinite(v) ? Math.min(b, Math.max(a, v)) : d; };
  var uidN = 0; // a counter as well as the clock and a random part, so two ids made in the same millisecond never match
  var uid = function () { return 'i' + Date.now().toString(36) + (++uidN).toString(36) + Math.floor(Math.random() * 46656).toString(36); };

  window.SacRules = function (lib) {
    var NODES = Object.create(null), PARENTS = Object.create(null), CHILDREN = Object.create(null); // no inherited keys, so an id such as 'constructor' is never an ability
    lib.nodes.forEach(function (n) { NODES[n.id] = n; });
    lib.edges.forEach(function (e) { (PARENTS[e[1]] = PARENTS[e[1]] || []).push(e[0]); (CHILDREN[e[0]] = CHILDREN[e[0]] || []).push(e[1]); });
    var R = { BASE: BASE, CAP: CAP, ALIAS: ALIAS, lib: lib, NODES: NODES, PARENTS: PARENTS, CHILDREN: CHILDREN, STATS: STATS, TYPES: TYPES, ARM: ARM, KINDS: KINDS,
      KIND_LABEL: KIND_LABEL, MAXLEVEL: MAXLEVEL, HARM: HARM, USES: USES, sgn: sgn, clampInt: clampInt, uid: uid };

    /* ---------- abilities, picks, attributes ---------- */
    R.known = function (c, n) { return !!n.innate || c.learned.indexOf(n.id) >= 0; };
    R.avail = function (c, n) { var p = PARENTS[n.id] || []; return !p.length || p.some(function (id) { return NODES[id] && R.known(c, NODES[id]); }); };
    R.picksTotal = function (level) { return 3 + 2 * ((level || 1) - 1); };
    R.picksUsed = function (c) { return c.learned.filter(function (id) { return NODES[id] && !NODES[id].innate; }).length; };
    R.picksLeft = function (c) { return R.picksTotal(c.level) - R.picksUsed(c); };
    /* What passive abilities add to a score. */
    R.statBonus = function (c, k) { return lib.nodes.reduce(function (a, n) { return a + (R.known(c, n) && ALIAS[n.stat] === k ? (n.bonus || 0) : 0); }, 0); };
    /* What gear adds: worn armour weighs on the Mind (medium −1, heavy −2), and any carried item can carry a bonus of its own: sc:{Spirit:1}. */
    R.gearBonus = function (c, k) {
      var a = 0, arm = c.pack.armour && R.pitem(c, c.pack.armour);
      if (k === 'Mind' && arm) { var w = R.item(arm).w; a -= w === 'heavy' ? 2 : w === 'medium' ? 1 : 0; }
      var seen = {}; // a bonus counts once for each kind of item, so two of the same trinket do not stack
      c.pack.items.forEach(function (it) { var d = it.k === 'custom' ? null : R.item(it); if (d && d.sc && d.sc[k] && !seen[it.k + it.id]) { seen[it.k + it.id] = 1; a += d.sc[k]; } });
      return a;
    };
    R.score = function (c, k) { return BASE + R.statBonus(c, k) + R.gearBonus(c, k); };
    /* What a roll adds: the score plus any weapon, spell or other bonus, never more than +10. */
    R.modifier = function (c, k, bonus) { return Math.min(CAP, R.score(c, k) + (bonus || 0)); };
    /* A weapon adds its level to an attack, and a damage spell adds its level. */
    R.weaponBonus = function (c) { var w = c.pack.weapon && R.pitem(c, c.pack.weapon); return w ? (R.item(w).t || 0) : 0; };
    /* A damage spell aimed at one target (a Ranged spell with Nd6 damage) is attacked like a Strike. Arcane spells roll with Mind and
       every other path with Spirit (Cantor, for one), unless the spell names its own score. Returns null for anything that needs no attack roll. */
    R.spellStat = function (n) { return ALIAS[n.score] || (n.path === 'Arcane' ? 'Mind' : 'Spirit'); };
    R.spellAttack = function (n) {
      if (!n || n.type !== 'spell' || !/^Ranged\./i.test(n.desc || '')) return null;
      var m = /(\d+)d6[^.]*damage/i.exec(n.desc); if (!m) return null;
      return { stat: R.spellStat(n), dice: +m[1], ignoresArmour: /ignores armou?r/i.test(n.desc), bonus: R.spellBonus(n) };
    };
    R.spellBonus = function (n) { return n ? Math.max(0, n.level || 1) : 0; };
    /* A check: d20 plus the modifier, meeting or beating the difficulty. A natural 20 always succeeds and a natural 1 always fails. */
    R.passes = function (roll, mod, diff) { return roll === 20 || (roll !== 1 && roll + mod >= diff); };
    R.chance = function (mod, diff) { var need = diff - mod; return 5 * Math.max(1, Math.min(19, 21 - need)); }; // percent
    R.capBonus = function (c) { return lib.nodes.reduce(function (a, n) { return a + (R.known(c, n) ? (n.cap || 0) : 0); }, 0); };
    R.capacity = function (c) { return 10 + Math.max(0, R.score(c, 'Body')) + R.capBonus(c); };
    /* What a node or item takes to use: its own `use`, or an Action (a Reaction if it says so). */
    R.useOf = function (n) {
      if (n.use === 'quick' || n.use === 'full') return 'action'; // a library made when there was a quick action or a full turn: it now costs the Action
      if (n.use && USES[n.use]) return n.use;
      if (n.type === 'passive') return '';
      return /^Reaction/i.test(n.desc || n.d || '') ? 'reaction' : 'action';
    };
    R.isMagic = function (n) { return n.type === 'spell' || (n.type === 'action' && !!n.magic); };
    /* How far the Looming Horror rises when this is used: its risk, and never less than 1. No dice. */
    R.rise = function (n) { return R.isMagic(n) ? Math.max(1, n.risk || 0) : 0; };
    R.learnedNodes = function (c) { return lib.nodes.filter(function (n) { return !n.innate && R.known(c, n); }); };
    /* Why an ability cannot be learned right now, or '' if it can. */
    R.reasonLocked = function (c, n) {
      if (n.level > c.level) return 'Needs level ' + n.level;
      if (!R.avail(c, n)) return 'Learn ' + (PARENTS[n.id] || []).map(function (id) { return NODES[id].name; }).join(' or ') + ' first';
      if (R.picksUsed(c) >= R.picksTotal(c.level)) return 'No picks left';
      return '';
    };
    /* learn and unlearn return '' on success, or the reason they were refused. */
    R.learn = function (c, id) {
      var n = NODES[id]; if (!n || n.innate || R.known(c, n)) return '';
      var why = R.reasonLocked(c, n); if (why) return why;
      c.learned.push(id); return '';
    };
    R.unlearn = function (c, id) {
      var n = NODES[id]; if (!n || !R.known(c, n) || n.innate) return '';
      var dep = (CHILDREN[id] || []).filter(function (k) { var kn = NODES[k]; return R.known(c, kn) && !kn.innate && !(PARENTS[k] || []).some(function (p) { return p !== id && R.known(c, NODES[p]); }); });
      if (dep.length) return 'Unlearn ' + NODES[dep[0]].name + ' first. It depends on ' + n.name + '.';
      c.learned = c.learned.filter(function (x) { return x !== id; }); return '';
    };
    /* What is wrong with a character that the game cannot allow at the table. Empty means it is fine. */
    R.problems = function (c) {
      var p = [];
      if (R.picksUsed(c) > R.picksTotal(c.level)) p.push('You have spent ' + R.picksUsed(c) + ' picks, but level ' + c.level + ' allows ' + R.picksTotal(c.level) + '.');
      if (R.slotsUsed(c) > R.capacity(c)) p.push('Your pack is over capacity.');
      R.learnedNodes(c).forEach(function (n) {
        if ((n.level || 1) > c.level) p.push(n.name + ' is above level ' + c.level + '.');
        else if ((PARENTS[n.id] || []).some(function (id) { return NODES[id]; }) && !R.avail(c, n)) p.push(n.name + ' needs an ability you have not learned.');
      });
      (c.pack && c.pack.items || []).forEach(function (it) { var x = it.k === 'custom' ? null : R.item(it); if (x && !x.unknown && x.t > c.level) p.push(x.n + ' is a level ' + x.t + ' item, above level ' + c.level + '.'); });
      return p;
    };
    /* '' if the character can move to this level, else why not. */
    R.levelBlocked = function (c, l) {
      if (R.picksUsed(c) > R.picksTotal(l)) return 'You have spent ' + R.picksUsed(c) + ' picks. Unlearn or lower something before dropping to level ' + l + '.';
      if (R.learnedNodes(c).some(function (n) { return n.level > l; })) return 'You know an ability above level ' + l + '. Unlearn it first.';
      return '';
    };

    /* ---------- gear ---------- */
    R.catalog = function (k) { return lib.items[KINDS[k]] || []; };
    R.item = function (it) {
      if (it.k === 'custom') return { n: it.n || 'Item', s: it.s == null ? 1 : it.s };
      var c = R.catalog(it.k).filter(function (x) { return x.id === it.id; })[0];
      if (!c) return { n: 'Unknown item', s: 1, unknown: true }; // no longer in the library: kept, never lost
      if (it.k === 'armour') return Object.assign({}, c, { s: ARM[c.w].s, dur: ARM[c.w].dur, dice: (c.t || 1) + ARM[c.w].b });
      if (it.k === 'weapon') return Object.assign({}, c, { dice: (c.t || 1) + ((c.s || 1) >= 2 ? 1 : 0) }); // a two-slot weapon is heavy and deals one more die
      return c;
    };
    /* The d6 a library weapon deals, or a library armour absorbs: its level, plus one for a two-slot weapon, plus 1 or 2 for medium or heavy armour. */
    R.diceOf = function (kind, c) { return kind === 'armour' ? (c.t || 1) + (ARM[c.w] ? ARM[c.w].b : 0) : (c.t || 1) + ((c.s || 1) >= 2 ? 1 : 0); };
    R.pitem = function (c, u) { return c.pack.items.filter(function (i) { return i.u === u; })[0] || null; };
    /* ---------- effects ---------- */
    /* What a card does as data (see fx.js): the valid effects only, or none for a card that has no fx. The rules text on the card is unchanged either way. */
    R.fxOf = function (x) { var F = window.SacFx; return F && x && x.fx ? F.clean(x.fx) : []; };
    /* Every effect in force for a character on a hook: from the abilities they know, the weapon and armour they have equipped and the trinkets and supplies they carry. */
    R.effects = function (c, hook) {
      var out = [], add = function (src, x) { R.fxOf(x).forEach(function (e) { if (!hook || e.on === hook) out.push({ src: src, fx: e }); }); };
      lib.nodes.forEach(function (n) { if (R.known(c, n)) add({ kind: 'ability', id: n.id, name: n.name }, n); });
      c.pack.items.forEach(function (it) {
        if (it.k === 'custom' || ((it.k === 'weapon' || it.k === 'armour') && it.u !== c.pack[it.k])) return;
        var d = R.item(it); if (!d.unknown) add({ kind: it.k, id: it.id, name: d.n, u: it.u }, d);
      });
      return out;
    };
    R.slotsUsed = function (c) { return c.pack.items.reduce(function (a, i) { return a + R.item(i).s; }, 0) + Math.ceil((c.pack.gold || 0) / 100); };
    /* Current armour durability for a worn item (defaults to full). */
    R.durability = function (it) { var d = R.item(it); if (!d.dur) return 0; return it.dur == null ? d.dur : Math.max(0, Math.min(d.dur, it.dur)); };
    /* Adding a weapon or armour of a higher level than the one in use equips it. */
    R.addItem = function (c, k, id) {
      var it = { u: uid(), k: k, id: id }; c.pack.items.push(it);
      var slot = k === 'weapon' ? 'weapon' : k === 'armour' ? 'armour' : '';
      if (slot) {
        var cur = c.pack[slot] && R.pitem(c, c.pack[slot]);
        if (!cur || (R.item(it).t || 0) > (R.item(cur).t || 0)) c.pack[slot] = it.u;
      }
      return it;
    };
    R.removeItem = function (c, u) {
      c.pack.items = c.pack.items.filter(function (i) { return i.u !== u; });
      if (c.pack.weapon === u) c.pack.weapon = null; if (c.pack.armour === u) c.pack.armour = null;
    };
    R.kit = function () {
      return { gold: 35, weapon: 'iw', armour: 'ia', items: [
        { u: 'iw', k: 'weapon', id: 'w1' }, { u: 'ia', k: 'armour', id: 'a1' },
        { u: 'it1', k: 'trinket', id: 't1' }, { u: 'it2', k: 'trinket', id: 't2' }, { u: 'is1', k: 'misc', id: 's1' }] };
    };

    /* ---------- harm ---------- */
    R.wounds = function (harm) { return Math.min(3, Math.floor(harm / 4)); };
    /* Healing. A Wound is four harm boxes. Anything that cures Wounds heals 1 per use; a healing spell heals 1 per level
       (its level). healed(node) is how many Wounds one use of an ability heals, and healItem(item) the same for gear. */
    R.heal = function (harm, wounds) { return Math.max(0, harm - 4 * Math.max(0, wounds)); };
    R.healed = function (n) { return n && n.heal ? Math.min(3, Math.max(1, n.heals || n.level || 1)) : 0; };
    R.healItem = function (it) { return it && it.heal ? 1 : 0; };

    /* ---------- characters ---------- */
    R.blank = function () {
      return { id: uid(), name: 'New character', vow: '', level: 1, notes: '',
        learned: [], pack: R.kit(), at: Date.now() };
    };
    /* Accept only what we know, so a loaded file cannot break the page. */
    R.clean = function (c) {
      var o = R.blank();
      if (!c || typeof c !== 'object') return o;
      o.id = typeof c.id === 'string' && /^[\w-]{1,40}$/.test(c.id) ? c.id : o.id;
      var tx = function (v) { return typeof v === 'string' ? v : ''; };
      o.name = tx(c.name).slice(0, 40) || 'Unnamed'; o.vow = tx(c.vow).slice(0, 90); o.notes = tx(c.notes).slice(0, 1500);
      o.level = clampInt(c.level, 1, MAXLEVEL, 1);
      // Abilities and items that the library no longer has are kept (they simply do nothing), so a library that is
      // briefly unavailable, or an ability that is retired, never costs anyone their character.
      o.learned = (Array.isArray(c.learned) ? c.learned.slice(0, 400) : []).filter(function (id, i, a) { return typeof id === 'string' && /^[\w-]{1,20}$/.test(id) && !(NODES[id] && NODES[id].innate) && a.indexOf(id) === i; }).slice(0, 120);
      var pk = c.pack && typeof c.pack === 'object' ? c.pack : null;
      if (pk && Array.isArray(pk.items)) {
        o.pack = { gold: clampInt(pk.gold, 0, 99999, 0), weapon: null, armour: null, items: [] };
        var seenU = Object.create(null);
        pk.items.slice(0, 60).forEach(function (it) {
          if (!it || typeof it !== 'object') return;
          var u = typeof it.u === 'string' && /^[\w-]{1,40}$/.test(it.u) ? it.u : uid(), out;
          while (seenU[u]) u = uid(); seenU[u] = 1;
          if (it.k === 'custom') out = { u: u, k: 'custom', n: (typeof it.n === 'string' && it.n.trim() ? it.n : 'Item').slice(0, 30), s: clampInt(it.s, 0, 9, 1) };
          else {
            if (!Object.prototype.hasOwnProperty.call(KINDS, it.k) || typeof it.id !== 'string' || !/^[\w-]{1,20}$/.test(it.id)) return;
            out = { u: u, k: it.k, id: it.id };
            if (it.k === 'armour' && it.dur != null) out.dur = clampInt(it.dur, 0, 9, 9);
          }
          o.pack.items.push(out);
          if (pk.weapon === it.u && it.k === 'weapon' && !o.pack.weapon) o.pack.weapon = u;
          if (pk.armour === it.u && it.k === 'armour' && !o.pack.armour) o.pack.armour = u;
        });
      }
      o.at = clampInt(c.at, 0, 4102444800000, Date.now());
      return o;
    };
    return R;
  };
})();
