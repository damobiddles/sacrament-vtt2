/* Sacrament, Hearts prototype: the rules as code. Pure functions over plain objects, so the rules page, the character builder, the table tool and the tests all play by the same rules.
   Usage:  var E = HeartsEngine(HEARTS_DATA, rng);   rng() returns a number in [0, 1), Math.random by default. */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;

  root.HeartsEngine = function (D, rng) {
    rng = rng || Math.random;
    var E = { D: D };
    var SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'], CATS = ['basic', 'weapons', 'ranged', 'magic', 'ultimate'];
    var CAT_DIE = { basic: 4, weapons: 6, ranged: 8, magic: 10, ultimate: 12 }, POINTS = 6, EFFORT_POINTS = 4;
    var HEART = 10, START_HEARTS = 1, SLOTS = 10, CAP = 10, MIN_TN = 5, MAX_TN = 19, DEFENCE_CAP = 5, DEFENCE_TOTAL = 10;
    E.HEART = HEART; E.SLOTS = SLOTS; E.CAP = CAP; E.SCORES = SCORES; E.CATS = CATS; E.CAT_DIE = CAT_DIE; E.POINTS = POINTS; E.EFFORT_POINTS = EFFORT_POINTS;
    var by = function (list) { var m = Object.create(null); list.forEach(function (x) { m[x.id] = x; }); return m; };
    var ITEM = by(D.ITEMS), SPELL = by(D.SPELLS), ENEMY = by(D.ENEMIES);
    E.item = function (id) { return ITEM[id] || null; }; E.spell = function (id) { return SPELL[id] || null; }; E.enemy = function (id) { return ENEMY[id] || null; };

    /* ---------- dice ---------- */
    var d = function (n) { return 1 + Math.floor(rng() * n); };
    E.d = d;
    E.stepUp = function (die) { var i = D.DICE.indexOf(die); return D.DICE[Math.min(D.DICE.length - 1, i + 1)]; };
    E.stepDown = function (die) { var i = D.DICE.indexOf(die); return D.DICE[Math.max(0, i - 1)]; };

    /* ---------- checks ---------- */
    /* A check: d20 plus a modifier (never more than +5), against the scene's Target Number. adj: 'easy' (−3) or 'hard' (+3), stated before the roll and never both.
       A natural 20 always succeeds and is a critical; a natural 1 always fails. */
    E.tn = function (scene, adj) { return Math.max(MIN_TN, Math.min(MAX_TN, scene + (adj === 'easy' ? -3 : adj === 'hard' ? 3 : 0))); };
    E.modifier = function (score, bonus) { return Math.min(CAP, score + (bonus || 0)); };
    E.check = function (mod, tn, forced) {
      var r = forced || d(20), total = r + mod, crit = r === 20, fumble = r === 1;
      return { d: r, mod: mod, total: total, tn: tn, crit: crit, fumble: fumble, success: crit || (!fumble && total >= tn) };
    };
    E.chance = function (mod, tn) { var need = tn - mod; return Math.max(0.05, Math.min(0.95, (21 - need) / 20)); };
    /* The Effort die: rolled when a success means an amount. A critical adds one ultimate d12 on top (the Effort die is still rolled once). */
    E.effort = function (size, crit, bonus, ultBonus) {
      var a = d(size), r = [a]; if (crit) r.push(d(12));
      bonus = bonus | 0; ultBonus = crit ? (ultBonus | 0) : 0;
      return { die: size, rolls: r, bonus: bonus, ultBonus: ultBonus, total: r.reduce(function (x, y) { return x + y; }, 0) + bonus + ultBonus };
    };
    /* The kind of Effort an item or spell is: its own `cat`, or from what it is. */
    E.catOf = function (it, src) { src = src || it; if (src.cat) return src.cat; if (it.cat) return it.cat; if (it.kind === 'relic' || it.kind === 'grimoire') return 'magic'; return it.band === 'far' ? 'ranged' : 'weapons'; };

    /* ---------- characters ---------- */
    /* Two sets of ten slots: what you have EQUIPPED (worn, wielded, ready: weapons, armour, relics, grimoires) and what you CARRY (supplies and spares). Only equipped
       gear works as armour, weapon, relic or grimoire; supplies work from either set. An item with no setting is equipped unless it is a supply. */
    E.isEq = function (p) { if (p.eq === true || p.eq === false) return p.eq; var it = ITEM[p.id]; return !(it && it.kind === 'supply'); };
    E.slotsUsed = function (c, set) { return c.pack.reduce(function (a, p) { if (set && (set === 'eq') !== E.isEq(p)) return a; var it = ITEM[p.id]; return a + (it ? it.slots : 1); }, 0); };
    /* Where a new item would go: its usual set if there is room, else the other. null when neither has room. */
    E.placeFor = function (c, id) { var it = ITEM[id]; if (!it) return null; var first = it.kind === 'supply' ? 'carry' : 'eq', second = first === 'eq' ? 'carry' : 'eq'; return E.slotsUsed(c, first) + it.slots <= SLOTS ? first : E.slotsUsed(c, second) + it.slots <= SLOTS ? second : null; };
    E.canAdd = function (c, id) { return !!E.placeFor(c, id); };
    /* Move the item at index i between the sets. Needs room in the set it goes to; a supply cannot be equipped, as it has no use there. */
    E.setEq = function (c, i, eq) { var p = c.pack[i], it = p && ITEM[p.id]; if (!it) return false; if (E.isEq(p) === eq) return true; if (E.slotsUsed(c, eq ? 'eq' : 'carry') + it.slots > SLOTS) return false; p.eq = eq; return true; };
    E.addItem = function (c, id) { var where = E.placeFor(c, id); if (!where) return false; var it = ITEM[id], p = { id: id, eq: where === 'eq' }; if (it.uses) p.uses = it.uses; c.pack.push(p); if (it.hearts) { c.max += it.hearts * HEART; c.hp += it.hearts * HEART; } return true; };
    E.newCharacter = function (def) {
      var c = { id: def.id, name: def.name, calling: def.calling || '', vow: def.vow || '', scores: {}, effort: {},
        max: START_HEARTS * HEART, hp: START_HEARTS * HEART, notes: def.notes || '', pack: [], dying: null, stable: false, dead: false, healed: {}, scene: {}, guard: 0, tags: [] };
      SCORES.forEach(function (k) { c.scores[k] = (def.scores || {})[k] | 0; }); CATS.forEach(function (k) { c.effort[k] = ((def.effort || {})[k] | 0); });
      (def.kit || []).forEach(function (id) { E.addItem(c, id); });
      if (def.scores && def.scores.Body !== undefined) E.upgrade(c, def.scores);
      return c;
    };
    /* A hero made when there were three scores (Body, Mind, Spirit) becomes a six-score hero: each old score is given to the two new ones it covers (Body to STR and
       CON, Mind to INT and DEX, Spirit to WIS and CHA), which keeps the total at 6, and four points of Effort go to what the hero carries. Old files are not touched:
       this changes the object it is given. A hero already in six scores is only tidied. */
    E.upgrade = function (c, old) {
      old = old || c.scores || {};
      if (old.Body !== undefined || old.Mind !== undefined || old.Spirit !== undefined) {
        var b = old.Body | 0, m = old.Mind | 0, sp = old.Spirit | 0;
        c.scores = { STR: b, DEX: m, CON: b, INT: m, WIS: sp, CHA: sp }; c.from = c.from || '';
        if (!c.effort || !CATS.some(function (k) { return c.effort[k]; })) {
          var magic = (c.pack || []).some(function (p) { var it = ITEM[p.id]; return it && (it.kind === 'grimoire' || it.kind === 'relic'); });
          c.effort = magic ? { basic: 1, weapons: 0, ranged: 0, magic: 3, ultimate: 0 } : { basic: 1, weapons: 3, ranged: 0, magic: 0, ultimate: 0 };
        }
      }
      c.scores = c.scores || {}; SCORES.forEach(function (k) { c.scores[k] = Math.max(0, Math.min(CAP, c.scores[k] | 0)); });
      c.effort = c.effort || {}; CATS.forEach(function (k) { c.effort[k] = Math.max(0, Math.min(CAP, c.effort[k] | 0)); });
      return c;
    };
    /* A hero is made with six points to put in the six scores (no more than 6 in one), and four points to put in the five kinds of Effort. */
    E.validSpread = function (s) { var t = 0, ok = true; SCORES.forEach(function (k) { var v = s[k]; if (!(v >= 0 && v <= POINTS && v === (v | 0))) ok = false; t += v | 0; }); return ok && t === POINTS; };
    E.validEffort = function (e) { var t = 0, ok = true; CATS.forEach(function (k) { var v = e[k]; if (!(v >= 0 && v <= EFFORT_POINTS && v === (v | 0))) ok = false; t += v | 0; }); return ok && t === EFFORT_POINTS; };
    /* Defence against a blow: the score the foe attacks, plus armour and shield when it is CON (armour and shield never add more than +5). */
    E.armour = function (c) { var a = 0; c.pack.forEach(function (p) { var it = ITEM[p.id]; if (it && it.kind === 'armour' && E.isEq(p)) a += it.defence || 0; }); return Math.min(DEFENCE_CAP, a) + (c.guard || 0); };
    /* Defence is a score plus armour (CON) or a Guard bonus, never more than +10 in all. */
    E.defence = function (c, score) { return Math.min(DEFENCE_TOTAL, (c.scores[score] || 0) + (score === 'CON' ? E.armour(c) : (c.guard || 0))); };
    /* A foe's attack, rolled by the GM: d20 against 10 plus the hero's Defence. The danger of the scene adds to the foe's roll (+1 at Dangerous, 12; +3 Deadly, 14;
       +5 Doomed, 16; nothing at Wary), and a Dazed foe rolls 3 less. A natural 20 always hits and a natural 1 always misses. */
    E.foeBonus = function (scene, dazed) { return Math.max(0, scene - 11) - (dazed ? 3 : 0); };
    E.foeAttack = function (hero, defend, scene, o) {
      o = o || {}; var r = o.d20 || d(20), bonus = E.foeBonus(scene, o.dazed), need = 10 + E.defence(hero, defend), total = r + bonus;
      return { d: r, bonus: bonus, total: total, need: need, nat20: r === 20, nat1: r === 1, hit: r === 20 || (r !== 1 && total >= need) };
    };
    /* A starting kit holds no more than three relics and grimoires between them. */
    E.startingKitOk = function (c) { return E.slotsUsed(c, 'eq') <= SLOTS && E.slotsUsed(c, 'carry') <= SLOTS && c.pack.filter(function (p) { var it = ITEM[p.id]; return it && (it.kind === 'relic' || it.kind === 'grimoire'); }).length <= 3; };
    /* The Defence bonus of the Guard Action: +2, or +3 holding an arming sword. */
    E.guardBonus = function (c) { var n = 2; c.pack.forEach(function (p) { if (!E.isEq(p)) return; fxOf(ITEM[p.id]).forEach(function (e) { if (e.on === 'always' && e.do === 'buff' && e.to === 'guard') n += e.n || 0; }); }); return n; };
    /* Has it to hand: a supply in either set, anything else only if equipped. */
    E.has = function (c, id) { return c.pack.some(function (p) { var it = ITEM[id]; return p.id === id && (!it || it.kind === 'supply' || E.isEq(p)); }); };

    /* ---------- harm, dying and healing ---------- */
    /* Damage lands. At 0 the character falls and rolls the d4 countdown. A dying character that is hit loses a round off the countdown instead. */
    E.hurt = function (c, n) {
      if (c.dead) return { dead: true };
      if (c.dying) { c.dying.count -= 1; if (c.dying.count <= 0) { c.dead = true; c.dying = null; return { dead: true, countdown: 0 }; } return { countdown: c.dying.count, hitWhileDying: true }; }
      if (c.stable) { c.stable = false; c.dying = { count: d(4) }; return { fell: true, countdown: c.dying.count, hurtWhileStable: true }; }
      c.hp = Math.max(0, c.hp - Math.max(0, n));
      if (c.hp === 0) { c.dying = { count: d(4) }; return { fell: true, countdown: c.dying.count }; }
      return { hp: c.hp };
    };
    /* The end of every round, after the foes: each dying character's countdown drops by one. At 0 they are dead. */
    /* ---------- timers ---------- */
    /* A GM's countdown: a named count that falls by one each time it is ticked (by hand, or at the end of every round if auto). At 0 its time has come; a repeating timer then starts again from its first count. */
    E.timerClean = function (list) {
      if (!Array.isArray(list)) return [];
      return list.filter(function (t) { return t && typeof t === 'object'; }).slice(0, 8).map(function (t, i) {
        return { id: String(t.id || 't' + i).slice(0, 12), name: String(t.name == null ? 'Timer' : t.name).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 40) || 'Timer', n: Math.max(0, Math.min(99, parseInt(t.n, 10) || 0)), auto: t.auto === true, max: Math.max(1, Math.min(99, parseInt(t.max, 10) || parseInt(t.n, 10) || 1)), repeat: t.repeat === true };
      });
    };
    /* Tick: every timer for which pick(t) is true falls by one. Returns the names of the ones that just reached 0. */
    E.timerTick = function (list, pick) {
      var fired = [];
      list.forEach(function (t) { if ((!pick || pick(t)) && t.n > 0) { t.n -= 1; if (t.n === 0) { fired.push(t.name); if (t.repeat) t.n = t.max; } } });
      return fired;
    };
    E.endRound = function (party) {
      var died = [];
      party.forEach(function (c) { if (c.dying && !c.dead) { c.dying.count -= 1; if (c.dying.count <= 0) { c.dead = true; c.dying = null; died.push(c.name); } } });
      return died;
    };
    /* Tending a dying ally is an Action: a WIS check. Success makes them stable (the countdown stops; they stay at 0 until healed or the scene ends); a critical also heals 1d4. */
    E.tend = function (c, chk) {
      if (!c.dying) return { ok: false, why: 'Not dying.' };
      if (!chk.success) return { ok: false };
      c.dying = null; c.stable = true; c.hp = 0;
      if (chk.crit) { var h = d(4); E.heal(c, h, true); return { ok: true, stable: true, healed: h }; }
      return { ok: true, stable: true };
    };
    /* Healing of 1 or more raises a dying or stable character to that many points and ends the danger. Each person can take each kind of healing once per rest, unless they are dying. */
    E.heal = function (c, n, force, kind) {
      if (c.dead) return 0;
      var down = !!(c.dying || c.stable || c.hp === 0);
      if (kind && !down && !force) { if (c.healed[kind]) return 0; }
      if (kind) c.healed[kind] = true;
      var before = c.hp; c.hp = Math.min(c.max, c.hp + Math.max(0, n)); if (c.hp > 0) { c.dying = null; c.stable = false; }
      return c.hp - before;
    };
    /* When the scene ends and nothing hostile is awake, a stable character comes round with 1 point. */
    E.endScene = function (party) { party.forEach(function (c) { if (c.stable && !c.dead) { c.stable = false; c.hp = Math.max(1, c.hp); } c.scene = {}; c.guard = 0; c.tags = []; }); };

    /* ---------- the turn ---------- */
    /* A turn: one Move and one Action. A push is a second Action, once a turn, for 1 Horror. */
    E.newTurn = function () { return { moved: false, actions: 0, pushed: false }; };
    E.canMove = function (t) { return !t.moved; };
    E.canAct = function (t) { return t.actions < (t.pushed ? 2 : 1); };
    E.canPush = function (t) { return !t.pushed && t.actions >= 1; };

    /* ---------- the Looming Horror ---------- */
    E.horror = function () { return { pos: 0, armed: { 9: true, 15: true, 21: true }, feeds: false, noRest: false, noMagic: false, hearths: {} }; };
    /* What using a spell, relic or item costs, before it is paid: its own Horror, and 1 more while the Horror feeds (the Turning, result 6). */
    E.cost = function (h, base) { return base > 0 ? base + (h.feeds && h.pos >= 15 ? 1 : 0) : 0; };
    E.canUseMagic = function (h) { return !h.noMagic || h.pos < 21; };
    /* Raise the track. Thresholds are reached in order, each once; one that is reached disarms until the track falls below it. At 21 the track does not rise further:
       each point that would is paid by whoever caused it as Strain, 2 damage that nothing reduces, so magic and pushing are never free. */
    E.raise = function (h, n) {
      var before = h.pos, room = Math.max(0, D.HORROR.top - h.pos), applied = Math.min(room, n), over = n - applied, crossed = [];
      h.pos += applied;
      D.HORROR.thresholds.forEach(function (t) { if (before < t && h.pos >= t && h.armed[t]) { h.armed[t] = false; crossed.push(t); } });
      return { before: before, after: h.pos, applied: applied, overflow: over, strain: over * 2, crossed: crossed };
    };
    /* Lowering re-arms any threshold the track has fallen below. */
    E.lower = function (h, n) {
      h.pos = Math.max(0, h.pos - n);
      D.HORROR.thresholds.forEach(function (t) { if (h.pos < t) h.armed[t] = true; });
      if (h.pos < 15) h.feeds = false;
      if (h.pos < 21) h.noMagic = false;
      return h.pos;
    };
    /* The result of an aftershock roll sets its lasting condition, where it has one. */
    E.aftershock = function (h, threshold, roll) {
      var tbl = D.AFTERSHOCKS[threshold]; if (!tbl) return null;
      var row = tbl.rows[Math.max(0, Math.min(5, roll - 1))];
      if (threshold === 15 && roll === 6) h.feeds = true;
      if (threshold === 15 && roll === 3) h.noRest = 'next';
      if (threshold === 21 && roll === 3) h.noMagic = true;
      if (threshold === 21 && roll === 6) h.noRest = 'here';
      return row;
    };
    /* A rest in a safe place. The party needs a hearth the GM marks as safe (barred, hallowed, or far from anything awake) and one uninterrupted watch.
       Each hearth restores once. A restoring rest heals 1 Heart for everyone, resets the once-per-rest healing and lowers the track by a d6.
       opts: { hearth, safe, interrupted }. */
    E.rest = function (h, party, opts) {
      opts = opts || {};
      if (!opts.safe) return { ok: false, why: 'Not a safe place.' };
      if (opts.interrupted) return { ok: false, why: 'Interrupted: nothing is restored, and the hearth is still there.' };
      if (opts.hearth != null && h.hearths[opts.hearth]) return { ok: false, why: 'This hearth has already been used.' };
      if (h.noRest === 'here') return { ok: false, why: 'Dawn does not come: the party cannot rest here.' };
      if (opts.hearth != null) h.hearths[opts.hearth] = true;
      var healed = [];
      party.forEach(function (c) { if (c.dead) return; var was = c.hp; c.dying = null; c.stable = false; c.hp = Math.min(c.max, c.hp + HEART); c.healed = {}; c.scene = {}; c.guard = 0; c.tags = []; healed.push([c.name, c.hp - was]); c.pack.forEach(function (p) { var it = ITEM[p.id]; if (it && it.uses && p.uses === 0 && it.kind !== 'supply') p.uses = it.uses; }); });
      var lowered = 0, roll = 0, rest_rolls = [];
      if (h.noRest === 'next') { h.noRest = false; }
      else { var living = party.filter(function (c) { return !c.dead; }).length, dice = Math.max(1, Math.ceil(living / 2)), rolls = []; for (var i = 0; i < dice; i++) rolls.push(d(6)); roll = rolls.reduce(function (a, b) { return a + b; }, 0); var before = h.pos; E.lower(h, roll); lowered = before - h.pos; rest_rolls = rolls; }
      return { ok: true, healed: healed, roll: roll, rolls: rest_rolls, lowered: lowered };
    };

    /* ---------- using an item or a spell ---------- */
    /* What does this cost and roll? Returns the facts the table needs; the table (or a test) then makes the check. */
    E.describeUse = function (itemId, spellId) {
      var it = ITEM[itemId], sp = spellId && SPELL[spellId];
      if (!it) return null;
      var src = sp || it;
      return { name: sp ? sp.name : it.name, item: it.id, spell: sp ? sp.id : '', roll: src.roll || '', effort: src.effort || 0, horror: src.horror || 0, use: src.use || it.use, band: src.band || it.band || '', heal: fxOf(src).some(function (e) { return e.do === 'heal'; }) };
    };
    /* ---------- effects written as data (see fx.js) ---------- */
    var FX = function () { return root.HeartsFx || null; };
    var fxOf = function (x) { var F = FX(), l = x && x.fx; return F ? F.clean(l) : (Array.isArray(l) ? l : []); };
    E.fxOf = fxOf;
    var dieOf = function (dice) { var m = /d(\d+)$/.exec(dice || ''); return m ? +m[1] : 0; };
    var rollDice = function (dice, crit) { var size = dieOf(dice), n = /^2/.test(dice) ? 2 : 1, rolls = []; for (var i = 0; i < n; i++) rolls.push(d(size)); if (crit) rolls.push(d(12)); return { die: size, rolls: rolls, total: rolls.reduce(function (a, b) { return a + b; }, 0) }; };

    /* A relic used before a check, as a Free thing (the Penitent's chain): the harm it costs, the Horror, and the bonus it gives the roll. Read from the item's effects. */
    E.preRoll = function (actor, h, itemId) {
      var it = ITEM[itemId], fx = fxOf(it), harm = fx.filter(function (e) { return e.do === 'harm'; })[0], buff = fx.filter(function (e) { return e.do === 'buff' && e.to === 'check'; })[0];
      if (!it || !buff) return null;
      var cost = E.cost(h, it.horror || 0), r = E.raise(h, cost), dmg = harm ? rollDice(harm.dice).total : 0, hurt = E.hurt(actor, dmg + r.strain);
      return { bonus: buff.n || 0, damage: dmg, cost: cost, horror: r, hurt: hurt };
    };
    E.chain = function (actor, h) { return E.preRoll(actor, h, 'chain'); };

    /* Using an item or a spell, start to finish. ctx: { horror, scene (the Target Number), turn }.
       o: { target (a foe or an ally object), adj ('easy'|'hard'), mode ('ultimate'), bonus (a bonus on the roll), d20 and effortDie for tests }.
       The Horror is paid when the roll is made, whatever the result, and only once. Nothing is paid if the use is refused before the roll.
       Returns { ok, why, name, cost, horror, check, effort, damage, healed, notes, intents }. `intents` are what the use does to other people (a tag on foes,
       a bonus for an ally, a heal for an ally): the table delivers them, since only the table knows who is where. Everything that lands on the user is applied here. */
    E.use = function (ctx, actor, itemId, spellId, o) {
      o = o || {};
      var it = ITEM[itemId], sp = spellId && SPELL[spellId];
      if (!it) return { ok: false, why: 'Unknown item.' };
      var magic = it.kind === 'relic' || it.kind === 'grimoire';
      var src = sp || (it.kind === 'grimoire' ? D.SPELLS.filter(function (x) { return x.from === it.id; })[0] : it);
      if (!src) return { ok: false, why: 'Choose a spell.' };
      var u = E.describeUse(itemId, src === it ? '' : src.id), ult = o.mode === 'ultimate' && it.ultimate ? it.ultimate : null;
      var out = { ok: true, name: u.name, notes: [], cost: 0, damage: 0, healed: 0, intents: [] };
      var held = actor.pack.filter(function (p) { return p.id === itemId; })[0];
      if (held && it.kind !== 'supply' && !E.isEq(held)) return { ok: false, why: it.name + ' is in your pack, not equipped. Equip it first.' };
      if (magic && !E.canUseMagic(ctx.horror)) return { ok: false, why: 'No magic can be cast and no relic used while the Arrival holds.' };
      if (actor.dead || actor.dying || actor.stable) return { ok: false, why: 'Down.' };
      if (src.once === 'scene' && actor.scene[src.id]) return { ok: false, why: src.name + ' has already been used this scene.' };
      if (ult && actor.scene['ult:' + it.id]) return { ok: false, why: 'The ultimate blow has already been struck this scene.' };
      if (it.uses != null) { var pk = actor.pack.filter(function (p) { return p.id === itemId; })[0]; if (pk && pk.uses === 0) return { ok: false, why: 'Used up.' }; }
      /* the cost, paid now */
      var base = ult ? ult.horror : (u.horror || 0);
      if (base > 0) {
        out.cost = E.cost(ctx.horror, base); out.horror = E.raise(ctx.horror, out.cost);
        if (out.horror.strain) out.hurt = E.hurt(actor, out.horror.strain);
        if (actor.dead || actor.dying) out.notes.push('The strain brings you down.');
      }
      if (src.once === 'scene') actor.scene[src.id] = true;
      if (ult) actor.scene['ult:' + it.id] = true;
      if (u.use === 'Action' && ctx.turn) ctx.turn.actions += 1; /* the Action is spent by trying, hit or miss; a refusal above spent nothing */
      if (it.uses != null) { var pk2 = actor.pack.filter(function (p) { return p.id === itemId; })[0]; if (pk2) pk2.uses -= 1; }
      /* the roll */
      var chk = null;
      if (u.roll) {
        chk = E.check(E.modifier(actor.scores[u.roll] || 0, o.bonus || 0), E.tn(ctx.scene, o.adj), o.d20); out.check = chk;
        if (!chk.success) { out.ok = false; out.failed = true; return out; }
      }
      /* the effects, in the order they are written */
      var fx = fxOf(src === it ? it : (src.fx ? src : it)).filter(function (e) { return e.on === 'use'; }), healing = fx.some(function (e) { return e.do === 'heal'; });
      var size = ult ? ult.die : (src.effort || 0), tgt = o.target || null, handled = false;
      if (size && !healing) {
        var kind = it.kind === 'relic' ? 'relic' : (sp || it.kind === 'grimoire') ? 'spell' : 'weapon';
        if (tgt && tgt.def) size = E.effortAgainst(size, tgt.def, kind, actor);
        if (o.effortDie) size = o.effortDie;
        var cat = ult ? 'ultimate' : E.catOf(it, src), mods = actor.effort || {};
        var ef = E.effort(size, chk && chk.crit, mods[cat], mods.ultimate); out.effort = ef; out.damage = ef.total;
        if (tgt && typeof tgt.hp === 'number' && tgt.def) tgt.hp = Math.max(0, tgt.hp - ef.total);
      }
      fx.forEach(function (e) {
        var to = e.target || 'self';
        if (e.do === 'tend') { if (tgt && tgt.dying && to === 'ally') { out.tended = E.tend(tgt, chk || E.check(E.modifier(actor.scores.WIS, o.bonus || 0), E.tn(ctx.scene, o.adj), o.d20)); handled = true; } else if (to === 'ally' && !tgt) out.intents.push({ k: 'tend', who: 'ally' }); }
        else if (e.do === 'heal') {
          if (handled) return;
          var r = rollDice(e.dice, chk && chk.crit); out.effort = { die: r.die, rolls: r.rolls, total: r.total };
          var who = to === 'self' ? actor : tgt;
          if (who && typeof who.hp === 'number' && !who.def) { out.healed = E.heal(who, r.total, !!e.force, e.kind); if (!out.healed && !(who.dying || who.stable) && !e.force) out.notes.push('Already mended since the last rest.'); }
          if (to === 'ally') out.intents.push({ k: 'heal', who: 'ally', n: r.total, kind: e.kind || '' });
        }
        else if (e.do === 'status') out.intents.push({ k: 'status', who: to === 'self' ? 'foe' : to, tag: e.tag, until: e.until || '' });
        else if (e.do === 'buff') {
          if (to === 'self') { if (e.to === 'effort') actor.scene.effortBuff = { step: e.step || 0, vs: e.vs || '' }; else if (e.to === 'defence') actor.guard = (actor.guard || 0) + (e.n || 0); }
          else out.intents.push({ k: 'buff', who: to, to: e.to, n: e.n || 0, step: e.step || 0, until: e.until || '' });
        }
        else if (e.do === 'harm') { var hr = rollDice(e.dice); out.harmed = hr.total; out.hurt = E.hurt(actor, hr.total); }
        else if (e.do === 'note') out.notes.push(e.text);
      });
      return out;
    };
    /* Reach: which bands a weapon or spell reaches from Engaged. */
    E.reaches = function (band, to) { var o = ['engaged', 'close', 'far', 'distant']; return o.indexOf(to) <= o.indexOf(band); };
    /* The Effort die against a foe: armoured foes slow a plain weapon (anything under d8 that is not a relic or a spell) by one size, and an anointed weapon (holy oil)
       steps up one size against what the oil is for. */
    E.effortAgainst = function (size, foe, source, actor) {
      if (foe && foe.armoured && size < 8 && source !== 'relic' && source !== 'spell') size = E.stepDown(size);
      var b = actor && actor.scene && actor.scene.effortBuff;
      if (b && foe && (!b.vs || foe[b.vs]) && source === 'weapon') size = b.step > 0 ? E.stepUp(size) : E.stepDown(size);
      return size;
    };
    return E;
  };
})();
