/* Sacrament RPG solo: the engine. It plays a written adventure (see adventure-silent-bell.js) with the table's own rules and the one gear list:
   checks are R.check (d20 + stat against the Target), damage is R.effort, a foe's attack is R.attack against the hero's Defence (C.defence), Horror is
   R.horrorMove with the natural-1 rule (R.nat1Tempts) and paying in blood past the top, finds come from the real d100 (C.rollLoot), and rests are R.REST.
   In solo play the game is the GM: where the rules say "the GM decides" (how dark a room is, what a failed check costs) the adventure decides.
   Nothing here touches the page, a clock or a random source: `die(sides)` is passed in, so a test can play the whole scene with fixed dice.
   Needs rules.js, gear.js and sheet-core.js loaded first. */
(function (root) {
  'use strict';
  var R = root.SacramentRules, C = root.SacramentSheetCore;
  var VERSION = 2, LOG_LIMIT = 400;
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var int = function (v, d) { v = parseInt(v, 10); return isFinite(v) ? v : (d || 0); };
  var DIRS = { n: 'north', s: 'south', e: 'east', w: 'west', u: 'up', d: 'down', north: 'north', south: 'south', east: 'east', west: 'west', up: 'up', down: 'down' };
  /* What gives light in a dark place. Decided by id, from the gear list. */
  var LIGHTS = ['lantern', 'candles', 'stubs', 'candle', 'lastrites', 'drownedlantern'];

  /* ---------- a new game ---------- */
  /* hero: a hero from My heroes (or the generator). The game plays a copy: the saved hero is never changed. */
  function start(hero, adv, die, run) {
    var h = C.cleanHero(clone(hero)), hp = { cur: R.HEART, max: R.HEART };
    (h.gear || []).forEach(function (g) { var it = C.itemOf(g); if (g.eq && it && it.hearts) hp.max += it.hearts * R.HEART; });
    if (hero.hp && int(hero.hp.max, 0) > 0) hp.max = Math.max(hp.max, int(hero.hp.max, hp.max));
    hp.cur = hp.max;   /* every attempt starts rested and whole */
    var s = { v: VERSION, adventure: adv.id, hero: h, hp: hp, horror: 0, room: adv.start, flags: {}, fight: null, rested: false, healed: {}, used: {}, over: '', done: false, moves: 0, log: [], seen: {}, bars: {}, timers: {}, run: run || null };
    var api = apiFor(s, adv, die);
    if (run && run.intro) { api.say(run.title, 'run'); api.say(run.intro); }
    api.say((run ? 'Scene 1 of ' + run.order.length + ': ' : '') + adv.title, 'title');
    if (adv.intro) adv.intro(api);
    enter(api, adv.start);
    return s;
  }

  /* ---------- what the handlers in an adventure can do ---------- */
  function apiFor(s, adv, die) {
    var api = {
      s: s, die: die, R: R, C: C, _adv: adv,
      say: function (t, k, extra) { if (!t) return; s.log.push(Object.assign({ k: k || 'say', t: String(t) }, extra || null)); if (s.log.length > LOG_LIMIT) s.log.splice(0, s.log.length - LOG_LIMIT); },
      flag: function (k, v) { if (arguments.length > 1) s.flags[k] = v; return s.flags[k]; },
      room: function () { return adv.rooms[s.room]; },
      target: function () { return int(adv.target, 12); },
      dark: function () { return isDark(s, adv); },
      lit: function () { return lit(s); },
      has: function (test) { return carried(s, test); },
      go: function (to) { enter(api, to); },
      /* A check: d20 + the stat against the scene's Target, made Hard in the dark. A plain check's natural 1 costs nothing (the owner's rule, 2026-11-01). */
      check: function (stat, o) {
        o = o || {}; var adj = o.adj || 'normal';
        if (api.dark() && !o.ignoreDark) adj = adj === 'easy' ? 'normal' : 'hard';
        var c = R.check({ d20: die(20), stat: s.hero.stats[stat] || 0, bonus: o.bonus || 0, target: api.target(), adj: adj });
        api.say((o.what ? o.what + ': ' : '') + R.sayCheck(c, stat), c.success ? 'win' : 'miss', { dice: [{ die: 20, n: c.d20 }], outcome: heroOutcome(s, c, o) });
        return c;
      },
      horror: function (n, why) { raiseHorror(api, n, why); },
      hurt: function (n, why) { hurt(api, n, why); },
      heal: function (n, why) { var ch = R.change(s.hp.cur, s.hp.max, n); s.hp.cur = ch.cur; if (ch.applied) api.say((why || 'You recover') + ': +' + ch.applied + ' HP (' + s.hp.cur + ' of ' + s.hp.max + ').', 'heal'); return ch.applied; },
      give: function (id, why) { return give(api, id, why); },
      loot: function (why) { return loot(api, why); },
      fight: function (foeId) { startFight(api, foeId); },
      /* An obstacle, as at the table: a card with an Effort bar. A try is a check; a success rolls Effort into the bar; a full bar clears it. */
      work: function (id, o) { return work(api, id, o || {}); },
      clear: function (id, why) { clearObstacle(api, id, why); },
      bar: function (id) { return int((s.bars || {})[id], 0); },
      /* A timer, as at the table: it loses 1 at the start of each new round while it runs, and at 0 the adventure says what happens. */
      timer: function (id, what) { timer(api, id, what); },
      timerLeft: function (id) { var t = (s.timers || {})[id]; return t ? t.cur : null; },
      foeHeal: function (n, why) { var f = s.fight; if (!f) return; var ch = R.change(f.hp.cur, f.hp.max, int(n, 0)); f.hp.cur = ch.cur; if (ch.applied) api.say((why || f.name + ' recovers') + ': +' + ch.applied + ' HP.', 'foe'); },
      rest: function () { rest(api); },
      /* The end of a scene. In a run of scenes, winning one leads on to the next; falling, or winning the last, ends the run. */
      end: function (kind, text) {
        s.fight = null; if (text) api.say(text, kind === 'won' ? 'end' : 'hurt');
        if (kind === 'won' && s.run && s.run.at < s.run.order.length - 1) { s.done = true; api.say('Scene ' + (s.run.at + 1) + ' of ' + s.run.order.length + ' is done.', 'note'); return; }
        s.over = kind;
      },
      /* The thread that runs through a run of scenes: why the hero is on the road (set by the opening), and what they carry from scene to scene. */
      charge: function () { return s.run ? s.run.charge : ''; },
      story: function (k, v) { var st = s.run ? (s.run.story = s.run.story || {}) : s.flags; if (arguments.length > 1) st[k] = v; return st[k]; }
    };
    return api;
  }
  /* What the dice reveal shows for a check, in the table's own words (vtt-core.mjs rollOutcome): CRITICAL HIT, SUCCESS, MISS, FAILED CHECK. */
  function heroOutcome(s, c, o) {
    var attack = !!o.attack, critical = c.success && c.offerUltimate && !o.nonDamage;
    return { who: s.hero.name, targetName: o.targetName || '', item: o.item || '', success: c.success, critical: critical,
      label: c.success ? (critical ? (attack ? 'CRITICAL HIT' : 'CRITICAL SUCCESS') : 'SUCCESS') : (attack ? 'MISS' : 'FAILED CHECK'),
      pendingDamage: !!(attack && c.success), d20: c.d20, mod: c.mod, total: c.total, target: c.target, versus: 'Target',
      note: c.adj === 'hard' ? 'Hard' : c.adj === 'easy' ? 'Easy' : '' };
  }
  function itemsCarried(s) { return (s.hero.gear || []).map(function (g) { return C.itemOf(g); }).filter(Boolean); }
  function carried(s, test) { return itemsCarried(s).filter(function (it) { return typeof test === 'function' ? test(it) : (Array.isArray(test) ? test.indexOf(it.id) >= 0 : it.id === test); })[0] || null; }
  function lit(s) { return !!s.flags.lit || !!carried(s, LIGHTS); }
  /* Dark: a dark place with no light. A place whose shape the hero has learned (Echo Bell) no longer makes checks Hard, though it stays dark. */
  function isDark(s, adv) { var r = adv.rooms[s.room]; return !!(r && r.dark) && !lit(s) && !s.flags['mapped_' + s.room]; }

  /* ---------- obstacles and timers ---------- */
  function work(api, id, o) {
    var s = api.s, ob = api._adv.obstacles[id]; s.bars = s.bars || {};
    var c = api.check(ob.stat, { adj: o.adj, what: o.what || ob.name });
    if (!c.success) return c;
    var cat = ob.cat || 'basic', e = R.effort({ cat: cat, bonus: s.hero.effort[cat] || 0, rolled: api.die(R.DEFAULT_DICE[cat]) });
    s.bars[id] = Math.min(ob.max, int(s.bars[id], 0) + e.total);
    api.say(ob.name + ': ' + R.sayEffort(e, 'Effort') + ' Now ' + s.bars[id] + ' of ' + ob.max + '.', 'roll', { dice: [{ die: e.die, n: e.rolled }], by: 'hero' });
    if (s.bars[id] >= ob.max) clearObstacle(api, id);
    return c;
  }
  function clearObstacle(api, id, why) {
    var s = api.s, ob = api._adv.obstacles[id]; s.bars = s.bars || {}; s.bars[id] = ob.max;
    if (why) api.say(why, 'win');
    if (ob.done) ob.done(api);
  }
  function obstacleOpen(api, id) { var ob = api._adv.obstacles[id]; return !(ob.isDone ? ob.isDone(api) : int((api.s.bars || {})[id], 0) >= ob.max); }
  function timer(api, id, what) {
    var s = api.s, def = api._adv.timers[id]; s.timers = s.timers || {};
    if (what === 'start') { if (!s.timers[id]) s.timers[id] = { cur: def.max, max: def.max, on: true }; }
    else if (what === 'stop' && s.timers[id]) s.timers[id].on = false;
  }
  /* kind: 'round' (a fight's new round, as at the table) or 'action' (each thing the hero does outside a fight, for a timer that runs on the clock of the scene) */
  function tickTimers(api, kind) {
    var s = api.s; Object.keys(s.timers || {}).forEach(function (id) {
      var t = s.timers[id], def = (api._adv.timers || {})[id]; if (!t.on || !def || (def.tick || 'round') !== (kind || 'round')) return;
      t.cur = Math.max(0, t.cur - 1);
      if (t.cur > 0) api.say(def.name + ': ' + t.cur + ' left.', 'horror');
      else { t.on = false; api.say(def.name + ': time is up.', 'horror'); if (def.out) def.out(api); }
    });
  }

  /* ---------- story spells: what the game, as GM, makes of them (spells.js) ---------- */
  /* What a spell with no Effort die does here, or null when nothing in this scene answers it. Nothing here changes the game: it returns { run }. */
  function spellUse(api, src) {
    var s = api.s, adv = api._adv, f = s.fight, room = adv.rooms[s.room], foe = f && adv.foes[f.foe];
    var own = adv.spells && adv.spells[src.id], mine = own && own(api); if (mine) return mine;
    var r = (root.SacramentSoloSpells || {})[src.id]; if (!r) return null;
    var kinds = [r.kind].concat(r.also ? [r.also] : []);
    if (f) kinds.sort(function (a, b) { return (FIGHT_KINDS.indexOf(a) < 0) - (FIGHT_KINDS.indexOf(b) < 0); });
    for (var i = 0; i < kinds.length; i++) { var u = ruling(api, kinds[i], r, f, room, foe); if (u) return u; }
    return null;
  }
  var FIGHT_KINDS = ['daze', 'guard', 'cover', 'snuff', 'learn'];
  function ruling(api, k, r, f, room, foe) {
    var s = api.s, dark = isDark(s, api._adv), dead = typeof room.dead === 'function' ? room.dead(api) : room.dead;
    if (k === 'light' && dark) return { run: function () { s.flags.lit = true; api.say('Light gathers where you need it. The dark steps back from you.', 'note'); } };
    if (k === 'map' && room.dark && !lit(s) && !s.flags['mapped_' + s.room]) return { run: function () { s.flags['mapped_' + s.room] = true; api.say('The note comes back to you off every wall. You know the shape of this place now: the dark no longer makes your checks Hard here.', 'note'); } };
    if (!f) {
      if (k === 'open') { var ob = obstacleHere(api); if (ob && ob.def.open) return { run: function () { clearObstacle(api, ob.id, ob.def.opened || ob.def.name + ' gives way.'); } }; }
      if (k === 'learn' && room.secret && !s.flags['secret_' + s.room] && (!r.corpse || dead)) return { run: function () { s.flags['secret_' + s.room] = true; api.say(typeof room.secret === 'function' ? room.secret(api) : room.secret, 'npc'); } };
      return null;
    }
    if ((k === 'daze' || k === 'cover') && !f.dim && (!r.undead || foe.undead)) return { run: function () { f.dim = 3; api.say(k === 'cover' ? f.name + ' cannot see you: its next attack rolls 3 less.' : f.name + ' is Dazed: its next attack rolls 3 less.', 'win'); } };
    if (k === 'guard' && !f.guard) return { run: function () { f.guard = 2; api.say('You have +2 Defence until your next turn.', 'win'); } };
    if (k === 'snuff' && foe.flame && !f.skip) return { run: function () { f.skip = 1; api.say(foe.snuffed || f.name + '\'s flame goes out. It does not attack this turn.', 'win'); } };
    if (k === 'learn' && foe.weakness && !f.learned && (!r.corpse || dead)) return { run: function () { f.learned = true; f.easy = (f.easy || 0) + 1; api.say(typeof foe.weakness === 'function' ? foe.weakness(api) : foe.weakness, 'npc'); api.say('Your next attack against it is Easy.', 'note'); } };
    return null;
  }
  function obstacleHere(api) {
    var obs = api._adv.obstacles || {}, ids = Object.keys(obs).filter(function (id) { return obs[id].room === api.s.room && obstacleOpen(api, id); });
    return ids.length ? { id: ids[0], def: obs[ids[0]] } : null;
  }
  /* A story spell is one with no Effort die and no healing. */
  function isStorySpell(u) { var src = u && (u.source || u.item); return !!(u && u.spell && !u.healing && (!u.cat || (src && src.effect === 'esoteric'))); }

  /* ---------- moving ---------- */
  function enter(api, to) {
    var s = api.s, r = roomOf(api, to); if (!r) return;
    s.room = to; s.moves++;
    api.say(r.name, 'room');
    var first = !s.seen[to]; s.seen[to] = true;
    api.say(typeof r.text === 'function' ? r.text(api, first) : r.text);
    if (r.dark) api.say(lit(s) ? lightLine(s) : 'It is dark here. Without a light, every check and attack is Hard.', 'note');
    if (r.enter) r.enter(api, first);
    var who = first && !s.fight && cameoNow(s); if (who) api.say(who.meet, 'npc');
  }
  function lightLine(s) { var it = carried(s, LIGHTS); return s.flags.lit && !it ? 'Your small flame holds the dark back.' : 'You raise ' + yours(it.name) + '. The dark steps back, a little.'; }
  function yours(t) { return /^The /.test(t) ? 'the ' + t.slice(4) : 'your ' + t; }
  function roomOf(api, id) { return api._adv.rooms[id] || null; }

  /* ---------- Horror ---------- */
  /* Raise the meter. A cost that cannot go on a full meter is paid in blood: one d4 of HP for each point (the owner's rule, 2026-11-01). */
  function raiseHorror(api, n, why) {
    var s = api.s; n = int(n, 0); if (n <= 0) return;
    var mv = R.horrorMove(s.horror, n); s.horror = mv.to;
    if (mv.applied) api.say((why ? why + ' ' : '') + 'The Horror rises ' + mv.applied + ' (now ' + s.horror + ' of ' + R.HORROR.max + ').', 'horror');
    mv.crossed.forEach(function (t) { api.say(R.HORROR.lines[t], 'horror'); var h = api._adv.horror && api._adv.horror[t]; if (h) api.say(typeof h === 'function' ? h(api) : h, 'horror'); });
    var left = n - mv.applied;
    if (left > 0) {
      var rolls = []; for (var i = 0; i < left; i++) rolls.push(api.die(R.HORROR.bloodDie));
      var total = rolls.reduce(function (a, b) { return a + b; }, 0);
      if (!mv.applied && why) api.say(why, 'horror');
      api.say('The Horror can rise no further. You pay in blood: ' + rolls.map(function (x) { return 'd' + R.HORROR.bloodDie + ' ' + x; }).join(' + ') + '.', 'horror', { dice: rolls.slice(0, 2).map(function (x) { return { die: R.HORROR.bloodDie, n: x }; }) });
      hurt(api, total, 'The price');
    }
  }

  /* ---------- harm ---------- */
  function hurt(api, n, why) {
    var s = api.s, ch = R.change(s.hp.cur, s.hp.max, -int(n, 0)); s.hp.cur = ch.cur;
    api.say((why || 'You are hurt') + ': ' + ch.applied + ' HP (' + s.hp.cur + ' of ' + s.hp.max + ' left).', 'hurt');
    if (s.hp.cur === 0 && !s.over) {
      /* Alone, a hero who falls has no one to tend them: the attempt ends here. (At the table they would be dying, with a d4 of rounds.) */
      var fell = api._adv.fall; api.end('dead', typeof fell === 'function' ? fell(api) : fell || 'You fall, and no one comes.');
    }
  }

  /* ---------- finds ---------- */
  function give(api, id, why) {
    var s = api.s, it = C.item(id); if (!it) return null;
    var r = C.edit(s.hero, { op: 'add', id: id }, { gm: true }, s.hp);
    if (!r.ok) { api.say('You find ' + it.name + ', but you have to leave it: ' + r.why, 'note'); return null; }
    api.say((why || 'You take') + ': ' + it.name + '.' + (it.flavour ? ' ' + it.flavour : ''), 'loot');
    return it;
  }
  function loot(api, why) {
    var r = C.rollLoot(api.die); if (!r.ok) { api.say(r.why, 'note'); return null; }
    api.say((why || 'Loot') + ': d100 ' + C.sayLoot(r.steps) + '.', 'roll', { dice: r.steps.slice(0, 2).map(function (st) { return { die: st.die, n: st.n }; }) });
    return give(api, r.item.id, 'You find');
  }

  /* ---------- fights ---------- */
  function startFight(api, foeId) {
    var f = api._adv.foes[foeId]; if (!f) return;
    /* Turn order, as at the table: the hero, then the foe. phase: hero (choose an action), damage (a hit waits for Roll damage), push (a miss: push or end the turn), foe (the foe's turn is next). */
    api.s.fight = { foe: foeId, art: f.art || foeId, undead: !!f.undead, name: f.name, hp: { cur: f.hp, max: f.hp }, attack: f.attack, damage: f.damage || 6, round: 1, phase: 'hero', pending: null, easy: 0, dim: 0, guard: 0, skip: 0, learned: false };
    api.say(typeof f.appears === 'function' ? f.appears(api) : f.appears, 'foe');
  }
  /* Everything the hero can attack, cast or use, from the sheet's own list. */
  function heroActions(s) {
    var list = C.actions(s.hero).map(function (a) { var u = C.useOf(s.hero, a.index, a.spellId, a.mode); return Object.assign({}, a, { u: u }); });
    return list;
  }
  function actionKey(a) { return 'use ' + a.index + (a.spellId ? ' ' + a.spellId : '') + (a.mode ? ' ' + a.mode : ''); }
  function findAction(s, parts) {
    var idx = int(parts[1], -1), spell = parts[2] && parts[2] !== 'ultimate' ? parts[2] : '', mode = parts[parts.length - 1] === 'ultimate' ? 'ultimate' : '';
    return heroActions(s).filter(function (a) { return a.index === idx && (a.spellId || '') === spell && (a.mode || '') === mode; })[0] || null;
  }
  /* The hero acts with an item or spell, in a fight or out of one. */
  function useAction(api, a, pushed) {
    var s = api.s, u = a.u, fight = s.fight;
    if (!u || !u.ok) { api.say((u && u.why) || 'You cannot use that now.', 'note'); return; }
    var src = u.source || u.item, isDamage = !!u.cat && !u.healing && src.effect !== 'esoteric';
    if (u.pick) { /* a grimoire read by the die */
      var n = api.die(u.pickDie), sp = u.spells[(n - 1) % u.spells.length]; api.say('You open ' + yours(u.item.name) + ' and read where it falls: d' + u.pickDie + ' ' + n + ', ' + sp.name + '.', 'roll');
      return useAction(api, Object.assign({}, a, { u: C.useSpell(u, sp) }), pushed);
    }
    if (u.healing) return useHealing(api, a, u);
    var story = isStorySpell(u) ? spellUse(api, src) : null;
    if (isStorySpell(u) && !story) { api.say('Nothing here answers ' + u.spell.name + '. You do not cast it, and it costs you nothing.', 'note'); return; }
    if (isDamage && !fight) { api.say('There is nothing here to strike.', 'note'); return; }
    if (src.once === 'scene') { if (s.used[C.powerKey(src)]) { api.say('You have already used that in this scene.', 'note'); return; } s.used[C.powerKey(src)] = true; }
    api.say((pushed ? 'You push, and ' : 'You ') + (u.spell ? 'cast ' + u.spell.name + '.' : isDamage ? 'attack with ' + yours(u.item.name) + '.' : 'use ' + yours(u.item.name) + '.'), 'act');
    var chk = null;
    if (u.stat) {
      var adj = fight && fight.easy > 0 ? 'easy' : 'normal'; if (fight && fight.easy > 0 && isDamage) fight.easy--;
      chk = api.check(u.stat, { adj: adj, bonus: isDamage ? u.attackBonus || 0 : 0, attack: isDamage, nonDamage: !isDamage, item: u.spell ? u.spell.name : u.item.name, targetName: fight && isDamage ? fight.name : '' });   /* a crossbow's +2 to hit is in the total */
      if (chk.nat1 && R.nat1Tempts({ attack: isDamage, spell: !!u.spell, pushed: !!pushed })) raiseHorror(api, R.HORROR.nat1, 'A natural 1.');
    }
    if (u.horror) { var hr = R.rollHorror(u.horror, api.die); if (hr) raiseHorror(api, hr.amount, u.spell ? 'Casting tempts the Horror.' : 'Using it tempts the Horror.'); }
    if (u.item.uses != null && u.gear) u.gear.uses = Math.max(0, (u.gear.uses == null ? u.item.uses : u.gear.uses) - 1);
    if (s.over) return;
    var ok = !chk || chk.success;
    if (!isDamage) {
      if (ok) { if (story) story.run(api); else { var hook = api._adv.onUse && api._adv.onUse(api, src, u); if (!hook) api.say(src.does ? firstSentence(src.does) : 'It is done.', 'note'); } }
      else if (story) api.say('It does not take.', 'miss');
      if (fight) fight.phase = 'foe';
      return;
    }
    if (!ok) {
      if (!pushed) { fight.phase = 'push'; api.say('You miss. You may push for a second action (costs ' + R.HORROR.push + ' Horror), or end your turn.', 'note'); }
      else fight.phase = 'foe';
      return;
    }
    fight.phase = 'damage';
    fight.pending = { cat: u.cat, damageBonus: u.damageBonus || 0, critical: !!(chk && chk.offerUltimate), nat20: !!(chk && chk.nat20), item: u.spell ? u.spell.name : u.item.name };
  }
  /* Roll damage for a hit: the Effort die for its kind plus the hero's bonus, a heavy weapon's +2, and on a natural 20 one Ultimate die. */
  function rollDamage(api) {
    var s = api.s, f = s.fight, p = f && f.pending; if (!p) return;
    var e = R.effort({ cat: p.cat, bonus: s.hero.effort[p.cat] || 0, rolled: api.die(R.DEFAULT_DICE[p.cat]) }), dice = [{ die: e.die, n: e.rolled }];
    if (p.damageBonus) e = Object.assign({}, e, { total: e.total + p.damageBonus, weaponBonus: p.damageBonus });
    if (p.critical) { e = R.criticalEffort({ base: e, rolled: api.die(R.DEFAULT_DICE.ultimate), bonus: s.hero.effort.ultimate || 0 }); dice.push({ die: e.critical.die, n: e.critical.rolled }); }
    f.pending = null;
    api.say((p.nat20 ? 'A natural 20. ' : '') + p.item + ': ' + R.sayEffort(e, 'damage'), 'win', { dice: dice, damage: e.total, by: 'hero' });
    damageFoe(api, e.total);
    if (s.fight) s.fight.phase = 'foe';
  }
  function firstSentence(t) { var m = /^[^.!?]*[.!?]/.exec(t); return m ? m[0] : t; }
  function useHealing(api, a, u) {
    var s = api.s, h = u.healing; void a;
    if (s.hp.cur >= s.hp.max) { api.say('You are already whole.', 'note'); return; }
    if (h.kind && !h.force && s.healed[h.kind]) { api.say('That has already helped you since your last rest.', 'note'); return; }
    api.say('You use ' + (u.spell ? u.spell.name : yours(u.item.name)) + '.', 'act');
    var chk = null; if (u.stat) { chk = api.check(u.stat, { nonDamage: true, item: u.spell ? u.spell.name : u.item.name }); if (chk.nat1 && R.nat1Tempts({ spell: !!u.spell })) raiseHorror(api, R.HORROR.nat1, 'A natural 1.'); }
    if (u.horror) { var hr = R.rollHorror(u.horror, api.die); if (hr) raiseHorror(api, hr.amount, 'It tempts the Horror.'); }
    if (u.item.uses != null && u.gear) u.gear.uses = Math.max(0, (u.gear.uses == null ? u.item.uses : u.gear.uses) - 1);
    if (s.over) return;
    if (!chk || chk.success) {
      var n = api.die(h.die), amount = n, words = 'd' + h.die + ' ' + n;
      if (chk && chk.offerUltimate) { var c = api.die(R.DEFAULT_DICE.ultimate); amount += c; words += ' + d' + R.DEFAULT_DICE.ultimate + ' ' + c; }
      api.say('Healing: ' + words + '.', 'roll', chk ? null : { dice: [{ die: h.die, n: n }] }); api.heal(amount, 'You are mended');
      if (h.kind) s.healed[h.kind] = true;
    } else api.say('It does not take.', 'miss');
    if (s.fight) s.fight.phase = 'foe';
  }
  function damageFoe(api, n) {
    var s = api.s, f = s.fight, ch = R.change(f.hp.cur, f.hp.max, -n); f.hp.cur = ch.cur;
    var def = api._adv.foes[f.foe];
    if (f.hp.cur === 0) { s.fight = null; s.flags['beat_' + f.foe] = true; api.say(typeof def.defeated === 'function' ? def.defeated(api) : def.defeated, 'end'); if (def.after) def.after(api); }
    else api.say(f.name + ' is hurt (' + hurtWord(f.hp) + ').', 'foe');
  }
  function hurtWord(hp) { var r = hp.cur / hp.max; return r > 0.66 ? 'barely' : r > 0.33 ? 'badly' : 'nearly finished'; }
  /* The foe's turn: d20 + its attack bonus against the hero's Defence; a natural 1 always misses and a natural 20 always hits (owner's decision). Damage is its Effort die. */
  function foeTurn(api) {
    var s = api.s, f = s.fight; if (!f || s.over) return;
    var def = api._adv.foes[f.foe];
    if (f.skip) { f.skip = 0; f.guard = 0; api.say(f.name + ' does not attack this turn.', 'win'); f.round++; f.phase = 'hero'; tickTimers(api, 'round'); return; }
    var dim = int(f.dim, 0), guard = int(f.guard, 0); f.dim = 0; f.guard = 0;
    var a = R.attack({ d20: api.die(20), bonus: f.attack - dim, defence: C.defence(s.hero) + guard });
    var n = a.hit ? api.die(f.damage) : 0, dice = [{ die: 20, n: a.d20 }]; if (a.hit) dice.push({ die: f.damage, n: n });
    var outcome = { who: f.name, targetName: s.hero.name, success: a.hit, critical: false, label: a.hit ? 'HIT' : 'MISS', pendingDamage: false,
      d20: a.d20, mod: a.mod, total: a.total, target: a.defence, versus: 'Defence', note: (dim ? 'Rolls 3 less. ' : '') + (guard ? 'Your Defence +' + guard + '. ' : '') + (a.nat20 ? 'Natural 20: always hits. ' : a.nat1 ? 'Natural 1: always misses. ' : '') + (a.hit ? n + ' damage.' : '') };
    api.say(f.name + ' attacks: ' + R.sayAttack(a), a.hit ? 'hurt' : 'win', { dice: dice, outcome: outcome, foeAttack: true });
    if (a.hit) hurt(api, n, (def.hits || 'It hurts you') + ' (d' + f.damage + ' ' + n + ')');
    if (s.fight) { f.round++; f.phase = 'hero'; tickTimers(api, 'round'); }
  }

  /* ---------- the hero's own rest ---------- */
  function rest(api) {
    var s = api.s; s.rested = true; s.healed = {};
    var dice = []; for (var i = 0; i < R.restDice(1); i++) dice.push(api.die(R.REST.horrorDie));
    var down = dice.reduce(function (a, b) { return a + b; }, 0), before = s.horror; s.horror = Math.max(0, s.horror - down);
    api.heal(R.REST.heal, 'Rest');
    api.say('The Horror falls ' + (before - s.horror) + ' (d' + R.REST.horrorDie + ' ' + dice.join(' + ') + '; now ' + s.horror + ').', 'horror', { dice: dice.slice(0, 2).map(function (x) { return { die: R.REST.horrorDie, n: x }; }) });
  }

  /* ---------- what can be done now: the buttons ---------- */
  function choices(s, adv) { adv = sceneOf(s) || adv;
    var api = apiFor(s, adv, function () { return 1; });
    if (s.over) return [];
    var out = [];
    if (s.done) {
      var nx = sceneAt(s, s.run.at + 1);
      if (!s.rested && (s.hp.cur < s.hp.max || s.horror > 0)) out.push({ label: 'Rest before you go on', cmd: 'rest', kind: 'do' });
      out.push({ label: 'Go on: ' + (nx ? nx.title : 'the road'), cmd: 'next', kind: 'go' });
      return out;
    }
    if (s.fight) {
      var f = s.fight;
      if (f.phase === 'damage') { var p = f.pending; return [{ label: 'Roll damage: d' + R.DEFAULT_DICE[p.cat] + (s.hero.effort[p.cat] ? ' + ' + s.hero.effort[p.cat] : '') + (p.damageBonus ? ' + ' + p.damageBonus : '') + (p.critical ? ' + d' + R.DEFAULT_DICE.ultimate : ''), cmd: 'damage', kind: 'attack' }]; }
      if (f.phase === 'foe') return [{ label: 'End your turn', cmd: 'foe', kind: 'plain' }];
      if (f.phase === 'push') { heroActions(s).filter(function (a) { return a.ok && a.cat && !a.healing && !isStorySpell(a.u); }).forEach(function (a) { out.push({ label: 'Push: ' + shortName(a), cmd: 'push ' + actionKey(a).slice(4), kind: 'push', horror: R.HORROR.push, about: aboutOf(a) }); }); if (!out.length) out.push({ label: 'Push: bare hands', cmd: 'push punch', kind: 'push', horror: R.HORROR.push }); out.push({ label: 'End your turn', cmd: 'foe', kind: 'plain' }); return out; }
      var attacks = heroActions(s).filter(function (a) { return a.ok && a.cat && !a.healing && !isStorySpell(a.u); });
      attacks.forEach(function (a) { out.push({ label: (a.spellId ? 'Cast ' : 'Attack: ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'attack', horror: a.horror || 0, about: aboutOf(a) }); });
      if (!attacks.some(function (a) { return !a.spellId; })) out.push({ label: 'Attack: bare hands', cmd: 'punch', kind: 'attack' });
      heroActions(s).filter(function (a) { return a.ok && (a.healing || isStorySpell(a.u)); }).forEach(function (a) { out.push(markIdle(api, a, { label: (a.spellId ? 'Cast ' : 'Use ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'use', horror: a.horror || 0, about: aboutOf(a) })); });
      return out;
    }
    var r = adv.rooms[s.room], who = cameoNow(s);
    if (who && (!who.when || who.when(api))) out.push({ label: who.label, cmd: 'meet ' + who.id, kind: 'do' });
    (r.actions || []).forEach(function (x) { if (!x.when || x.when(api)) out.push({ label: typeof x.label === 'function' ? x.label(api) : x.label, cmd: 'do ' + x.id, kind: 'do' }); });
    Object.keys(r.exits || {}).forEach(function (d) { var e = exitOf(api, r, d); if (e && !e.hidden) out.push({ label: 'Go ' + d + ': ' + adv.rooms[e.to].short, cmd: 'go ' + d, kind: 'go' }); });
    heroActions(s).filter(function (a) { return a.ok && (a.healing ? s.hp.cur < s.hp.max : isStorySpell(a.u)); }).forEach(function (a) { out.push(markIdle(api, a, { label: (a.spellId ? 'Cast ' : 'Use ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'use', horror: a.horror || 0, about: aboutOf(a) })); });
    return out;
  }
  function shortName(a) { return a.name.replace(/ \([^)]*\)$/, ''); }
  /* Mark a story spell that nothing in this scene answers: it shows as "No use here" and costs nothing. */
  function markIdle(api, a, c) {
    var h = a.u && a.u.healing;
    if (isStorySpell(a.u) && !spellUse(api, a.u.source || a.u.item)) { c.idle = true; c.why = 'No use here'; }
    else if (h && h.kind && !h.force && api.s.healed[h.kind]) { c.idle = true; c.why = 'Used since your last rest'; }
    return c;
  }
  /* What a spell or item does, in the gear list's own words: for the "What it does" card. */
  function aboutOf(a) {
    var u = a.u || {}, src = u.spell || u.item || {};
    return { name: src.name || shortName(a), roll: src.roll || '', does: src.does || src.flavour || '', from: u.spell && u.item ? u.item.name : '' };
  }
  /* The scene's numbers, always on show: its Target, and whether the dark makes every check Hard. */
  function sceneInfo(s, adv) { adv = sceneOf(s) || adv; return { target: int(adv.target, 12), dark: isDark(s, adv) }; }
  /* The cards on the table for this place, as at the table: the foe with its HP, an obstacle with its Effort bar, a timer with its countdown. */
  function cards(s, adv) { adv = sceneOf(s) || adv;
    var out = [], api = apiFor(s, adv, function () { return 1; });
    if (s.fight) { var f = s.fight, fd = adv.foes[f.foe]; out.push({ kind: 'foe', id: f.foe, name: f.name, cur: f.hp.cur, max: f.hp.max, unit: 'HP', text: fd.card || '', stats: 'Attack +' + f.attack + ' · d' + f.damage + ' damage' + (f.dim ? ' · next attack rolls 3 less' : '') + (f.skip ? ' · loses its next attack' : '') }); }
    Object.keys(adv.obstacles || {}).forEach(function (id) { var o = adv.obstacles[id]; if (o.room === s.room && obstacleOpen(api, id)) out.push({ kind: 'obstacle', id: id, name: o.name, cur: int((s.bars || {})[id], 0), max: o.max, unit: 'Effort', text: o.text || '', stats: o.stat + ' check, then ' + (R.CAT_NAMES ? R.CAT_NAMES[o.cat || 'basic'] : 'Basic') + ' Effort' }); });
    Object.keys(s.timers || {}).forEach(function (id) { var t = s.timers[id], d = adv.timers[id]; if (d && (t.on || t.cur === 0) && (!d.room || d.room === s.room)) out.push({ kind: 'timer', id: id, name: d.name, cur: t.cur, max: t.max, unit: t.on ? 'left' : 'ended', text: d.text || '', stats: t.on ? 'Loses 1 each round' : 'Time ran out' }); });
    return out;
  }
  function exitOf(api, r, d) { var e = r.exits[d]; if (!e) return null; if (typeof e === 'string') e = { to: e }; if (e.when && !e.when(api)) return e.closed ? { to: e.to, closed: e.closed, hidden: true } : null; return e; }

  /* ---------- typed words become commands ---------- */
  var HELP = 'Tap a choice, or type a command: LOOK, GO NORTH (or N, S, E, W, UP, DOWN), INVENTORY, a thing to do ("read ledger", "talk"), ATTACK, CAST and a spell, USE and an item, PUSH, HELP.';
  function parse(s, adv, text) { adv = sceneOf(s) || adv;
    var t = String(text || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    /* a button's own command passes straight through */
    if (/^(use \d+( [a-z0-9]+)*|push \d+( [a-z0-9]+)*|do [a-z0-9_]+|go (north|south|east|west|up|down)|punch|push punch|damage|foe)$/.test(t)) return t;
    var w = t.split(' '), verb = w[0], rest = w.slice(1).join(' ');
    if (DIRS[t]) return 'go ' + DIRS[t];
    if ((verb === 'go' || verb === 'walk' || verb === 'climb' || verb === 'enter') && DIRS[rest]) return 'go ' + DIRS[rest];
    if (/^(l|look|look around)$/.test(t)) return 'look';
    if (/^(i|inv|inventory|gear|pack|sheet|hero)$/.test(t)) return 'inventory';
    if (/^(h|help|\?)$/.test(t)) return 'help';
    if (/^(wait|end turn|end my turn|end your turn|let it come)$/.test(t)) return 'foe';
    if (/^(damage|roll damage)$/.test(t)) return 'damage';
    var list = choices(s, adv), api = apiFor(s, adv, function () { return 1; });
    /* the room's own things to do, by their words */
    var r = adv.rooms[s.room];
    if (!s.fight && r) {
      var hit = (r.actions || []).filter(function (x) { return (!x.when || x.when(api)) && (x.words || []).some(function (k) { return t.indexOf(k) >= 0; }); })[0];
      if (hit) return 'do ' + hit.id;
    }
    /* attacks, spells and items by name */
    var wants = /^(attack|fight|hit|strike|kill|shoot)\b/.test(t) ? 'attack' : /^cast\b/.test(t) ? 'spell' : /^(use|drink|apply|read)\b/.test(t) ? 'use' : /^push\b/.test(t) ? 'push' : '';
    if (wants) {
      var named = list.filter(function (c) { return (c.kind === wants || (wants === 'use' && c.kind === 'spell')) && rest && c.label.toLowerCase().indexOf(rest) >= 0; })[0] || (rest ? null : list.filter(function (c) { return c.kind === wants; })[0]);
      if (named) return named.cmd;
      if (wants === 'attack' && s.fight) return list.filter(function (c) { return c.kind === 'attack'; })[0].cmd;
    }
    var any = list.filter(function (c) { return c.label.toLowerCase().indexOf(t) >= 0; })[0];
    return any ? any.cmd : '?' + t;
  }

  /* ---------- one command ---------- */
  function act(s, adv, cmd, die) { adv = sceneOf(s) || adv;
    var api = apiFor(s, adv, die);
    var before = s.log.length;
    if (s.over) return [];
    var c = String(cmd || '').trim(); if (!c) return [];
    if (c.charAt(0) === '?') { api.say('> ' + c.slice(1), 'cmd'); api.say('That does nothing here. ' + HELP, 'note'); return s.log.slice(before); }
    var p = c.split(' '), wasFight = !!s.fight;
    var label = (choices(s, adv).filter(function (x) { return x.cmd === c; })[0] || {}).label;
    api.say('> ' + (label || c), 'cmd');
    if (c === 'look') { var r0 = adv.rooms[s.room]; api.say(r0.name, 'room'); api.say(typeof r0.text === 'function' ? r0.text(api, false) : r0.text); if (r0.dark) api.say(lit(s) ? lightLine(s) : 'It is dark here. Without a light, every check and attack is Hard.', 'note'); if (s.fight) api.say(s.fight.name + ' is here (' + hurtWord(s.fight.hp) + ' hurt).', 'foe'); }
    else if (c === 'help') api.say(HELP, 'note');
    else if (c === 'inventory') api.say(inventoryText(s), 'note');
    else if (s.done) {
      if (c === 'next') nextScene(api);
      else if (c === 'rest' && !s.rested) { api.say('You find a dry corner and keep watch over yourself until the worst of it passes.'); rest(api); }
      else api.say('This scene is done. Rest, or go on.', 'note');
    }
    else if (s.fight) {
      var f = s.fight;
      if (f.phase === 'damage') { if (c === 'damage') rollDamage(api); else api.say('You hit: roll damage.', 'note'); }
      else if (f.phase === 'foe') { if (c === 'foe' || c === 'wait') foeTurn(api); else api.say('Your turn is spent. End your turn.', 'note'); }
      else if (f.phase === 'push') {
        if (c === 'foe' || c === 'wait') f.phase = 'foe', foeTurn(api);
        else if (p[0] === 'push') {
          var pa = p[1] === 'punch' ? bareHands() : findAction(s, ['use'].concat(p.slice(1))); if (!pa) { api.say('You cannot push with that.', 'note'); return s.log.slice(before); }
          f.phase = 'hero'; raiseHorror(api, R.HORROR.push, 'You push for a second action.'); if (!s.over) useAction(api, pa, true);
        } else api.say('You missed: push, or end your turn.', 'note');
      }
      else if (p[0] === 'use') { var a = findAction(s, p); if (a) useAction(api, a, false); else api.say('You cannot use that now.', 'note'); }
      else if (c === 'punch') useAction(api, bareHands(), false);
      else if (p[0] === 'go') api.say('It is between you and the way out. Fight.', 'note');
      else api.say('Not now: it is coming for you.', 'note');
    }
    else if (p[0] === 'go') {
      var r = adv.rooms[s.room], e = exitOf(api, r, p[1]);
      if (!e) api.say('You cannot go that way.', 'note');
      else if (e.closed && e.hidden) api.say(typeof e.closed === 'function' ? e.closed(api) : e.closed, 'note');
      else enter(api, e.to);
    }
    else if (p[0] === 'meet') {
      var w = cameoNow(s);
      if (!w || w.id !== p[1] || (w.when && !w.when(api))) api.say('There is no one here by that name.', 'note');
      else { s.flags['cameo_' + w.id] = true; s.run.met.push(w.id); w.run(api); }
    }
    else if (p[0] === 'do') {
      var x = (adv.rooms[s.room].actions || []).filter(function (y) { return y.id === p[1]; })[0];
      if (!x || (x.when && !x.when(api))) api.say('That does nothing now.', 'note'); else x.run(api);
    }
    else if (p[0] === 'use') { var b = findAction(s, p); if (b) useAction(api, b, false); else api.say('You cannot use that now.', 'note'); }
    else api.say('That does nothing here. ' + HELP, 'note');
    /* a timer on the scene's own clock moves each time the hero does something outside a fight */
    if (!s.over && !s.done && !s.fight && s.adventure === adv.id && /^(go|do|use)$/.test(p[0]) && !wasFight) tickTimers(apiFor(s, adv, die), 'action');
    return s.log.slice(before);
  }
  /* No weapon: STR and Basic Effort. */
  function bareHands() { return { u: { ok: true, item: { name: 'bare hands' }, source: {}, stat: 'STR', cat: 'basic', attackBonus: 0, damageBonus: 0, horror: 0 } }; }
  function inventoryText(s) {
    var h = s.hero, eq = [], pack = [];
    (h.gear || []).forEach(function (g) { var it = C.itemOf(g); if (!it) return; var t = it.name + (it.uses != null && g.uses != null ? ' (' + g.uses + ' left)' : ''); (g.eq ? eq : pack).push(t); });
    return h.name + '. HP ' + s.hp.cur + ' of ' + s.hp.max + ', Defence ' + C.defence(h) + ', Horror ' + s.horror + '. Equipped: ' + (eq.join(', ') || 'nothing') + '. Pack: ' + (pack.join(', ') || 'nothing') + '.';
  }

  /* ---------- saving ---------- */
  function valid(s, adv) { var a = sceneOf(s) || adv; return !!s && !!a && s.v === VERSION && s.adventure === a.id && !!a.rooms[s.room] && !!s.hero && !!s.hp; }

  /* ---------- a run: five scenes on one road ---------- */
  /* The scenes are registered in SacramentSoloAdventures; a campaign (SacramentSoloCampaigns) lists them. A run is an opening, three middle scenes and
     a finale. The opening sets the charge (why the hero is on the road); the middle scenes are drawn at random from those that fit it and set in a sensible
     order (a scene that leans early comes before one that leans late); the finale is the one that answers the charge. */
  function scenes() { return root.SacramentSoloAdventures || {}; }
  function sceneOf(s) { return s && scenes()[s.adventure]; }
  function sceneAt(s, i) { return s.run && s.run.order[i] ? scenes()[s.run.order[i]] : null; }
  function pickOrder(camp, die) {
    var all = camp.scenes.map(function (id) { return scenes()[id]; }).filter(Boolean);
    var pick = function (list) { return list[die(list.length) - 1]; };
    var opening = pick(all.filter(function (x) { return x.act === 'opening'; })), charge = opening.gives;
    var fits = function (x) { return !x.fits || x.fits.indexOf(charge) >= 0; };
    var middle = all.filter(function (x) { return x.act === 'middle' && fits(x); });
    for (var i = middle.length - 1; i > 0; i--) { var j = die(i + 1) - 1, t = middle[i]; middle[i] = middle[j]; middle[j] = t; }
    var LEAN = { early: 0, any: 1, late: 2 };
    middle = middle.slice(0, camp.middle || 3).map(function (x, k) { return { x: x, k: k }; })
      .sort(function (a, b) { return (LEAN[a.x.lean || 'any'] - LEAN[b.x.lean || 'any']) || a.k - b.k; }).map(function (o) { return o.x; });
    var finale = pick(all.filter(function (x) { return x.act === 'finale' && fits(x); }));
    return { charge: charge, order: [opening].concat(middle, [finale]).map(function (x) { return x.id; }) };
  }
  function startRun(hero, campId, die) {
    var camp = (root.SacramentSoloCampaigns || {})[campId], o = pickOrder(camp, die);
    var run = { campaign: camp.id, title: camp.title, intro: camp.intro, order: o.order, at: 0, charge: o.charge, story: {}, met: [] };
    run.cameos = pickCameos(o.order.length, die);
    return start(hero, scenes()[o.order[0]], die, run);
  }
  /* People met on the road (SacramentSoloCameos): a run meets up to three of them, in different scenes, never the last one. */
  function pickCameos(n, die) {
    var people = (root.SacramentSoloCameos || []).map(function (c) { return c.id; }), out = [];
    for (var i = 0; i < n; i++) out.push('');
    var slots = []; for (var k = 0; k < n - 1; k++) slots.push(k);
    for (var m = 0; m < 3 && people.length && slots.length; m++) {
      var who = people.splice(die(people.length) - 1, 1)[0], at = slots.splice(die(slots.length) - 1, 1)[0]; out[at] = who;
    }
    return out;
  }
  function cameoNow(s) {
    var id = s.run && s.run.cameos && s.run.cameos[s.run.at]; if (!id || s.flags['cameo_' + id]) return null;
    var adv = sceneOf(s); if (!adv || s.room !== adv.start) return null;
    return (root.SacramentSoloCameos || []).filter(function (c) { return c.id === id; })[0] || null;
  }
  /* On to the next scene: the hero, their HP, Horror and gear go on; the place, its flags, fights, obstacles and timers are new. Once-per-scene powers come back. */
  function nextScene(api) {
    var s = api.s; if (!s.run || s.run.at >= s.run.order.length - 1) return;
    s.run.at++; var adv = sceneAt(s, s.run.at);
    s.adventure = adv.id; s.room = adv.start; s.flags = {}; s.fight = null; s.rested = false; s.used = {}; s.bars = {}; s.timers = {}; s.seen = {}; s.done = false;
    var a2 = apiFor(s, adv, api.die);
    a2.say('Scene ' + (s.run.at + 1) + ' of ' + s.run.order.length + ': ' + adv.title, 'title');
    if (adv.intro) adv.intro(a2);
    enter(a2, adv.start);
  }

  root.SacramentSolo = { VERSION: VERSION, start: start, act: act, choices: choices, parse: parse, valid: valid, inventoryText: inventoryText, HELP: HELP, LIGHTS: LIGHTS, heroActions: heroActions, sceneInfo: sceneInfo, cards: cards, startRun: startRun, cameoNow: cameoNow, sceneOf: sceneOf, sceneAt: sceneAt, pickOrder: pickOrder };
})(typeof window !== 'undefined' ? window : globalThis);
