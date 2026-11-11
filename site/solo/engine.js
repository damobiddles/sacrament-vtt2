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
  /* What gives light in a dark place just by being carried (the solo game's GM call: an ordinary flame is lit as you go). Decided by id, from the gear list.
     The Black Candle and the Drowned Saint's Lantern are not here: their own words say they must be lit, and lighting them costs Horror. The Drowned Lantern
     lights through its "light" tag; the Black Candle ("Light it for the rest of the scene. You see in the dark") is LIT_BY_USE. */
  var LIGHTS = ['lantern', 'lastrites'], LIT_BY_USE = ['candle'];
  /* Tallow Candles: "Light a candle (3 uses): it gives light to Near for the rest of the scene." In a dark place with no other light one is lit, and a use spent,
     once per scene (the owner's call, 2026-11-07). Candle stubs have the same words (owner decision 2026-11-08: look-alike finds match their twins). */
  var CANDLES = ['candles', 'stubs'];

  /* ---------- a new game ---------- */
  /* hero: a hero from My heroes (or the generator). The game plays a copy: the saved hero is never changed. */
  function start(hero, adv, die, run) {
    var h = C.cleanHero(clone(hero)), hp = { cur: R.HEART, max: R.HEART };
    (h.gear || []).forEach(function (g) { var it = C.itemOf(g); if (g.eq && it && it.hearts) hp.max += it.hearts * R.HEART; });
    if (hero.hp && int(hero.hp.max, 0) > 0) hp.max = Math.max(hp.max, int(hero.hp.max, hp.max));
    hp.cur = hp.max;   /* every attempt starts rested and whole */
    var s = { v: VERSION, adventure: adv.id, hero: h, hp: hp, horror: 0, found: [], dying: null, shaken: false, hunted: false, arrived: false, room: adv.start, flags: {}, fight: null, rested: false, healed: {}, used: {}, over: '', done: false, moves: 0, log: [], seen: {}, bars: {}, timers: {}, run: run || null };
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
      target: function () { return int(adv.target, 12) + hardTarget(s); },
      dark: function () { return isDark(s, adv); },
      lit: function () { return lit(s); },
      has: function (test) { return carried(s, test); },
      go: function (to) { enter(api, to); },
      /* A check: d20 + the stat against the scene's Target. In the dark, without a light, a WIS check to search or notice is Hard (the Hooded Lantern's words,
         and the Rules page; the owner's call, 2026-11-07): that is a WIS check the scene asks for, not a spell, an item or an obstacle. A plain check's natural 1 costs nothing (2026-11-01). */
      check: function (stat, o) {
        o = o || {}; var adj = o.adj || 'normal';
        if (api.dark() && !o.ignoreDark && stat === 'WIS' && !o.item) adj = adj === 'easy' ? 'normal' : 'hard';
        /* the hero's path: once a scene, a check on its score is Easy (not an attack, a spell, an item, a crawl or a break away; the Rules page, 2026-11-11) */
        var onPath = !o.attack && !o.item && !o.noPush && !o.pushed && C.pathScore(s.hero) === stat && s.pathRoom !== s.room;
        if (onPath) { s.pathRoom = s.room; adj = R.easier(adj); }
        var shaken = !!s.shaken; if (shaken) { s.shaken = false; adj = adj === 'easy' ? 'normal' : 'hard'; }
        var boost = int(s.boost, 0), from = s.boostFrom || ''; if (boost) { s.boost = 0; s.boostFrom = ''; }   /* the Penitent's Chain: +3 on the next check, whatever it is */
        var c = R.check({ d20: die(20), stat: s.hero.stats[stat] || 0, bonus: (o.bonus || 0) + boost, target: api.target(), adj: adj, misfire: o.misfire || 0 });
        api.say((o.what ? o.what + ': ' : '') + R.sayCheck(c, stat), c.success ? 'win' : 'miss', { dice: [{ die: 20, n: c.d20 }], outcome: heroOutcome(s, c, o),
          tally: [sum(c.mod, [[s.hero.stats[stat] || 0, stat], [o.bonus || 0, o.item || 'bonus'], [boost, from]], c.total, 'against Target ' + c.target, c.success)] });
        if (boost) api.say('+' + boost + ' from ' + yours(from) + ' is in that roll.', 'note');
        if (onPath) api.say('Your path (' + C.pathOf(s.hero) + ') fits that check: it was Easy, once this scene.', 'note');
        if (shaken) api.say('You were shaken: that roll was Hard.', 'note');
        if (!c.success && !o.noPush && !o.pushed && !s.pushing) s.failed = true;   /* a failed roll can be pushed (the rules: any failed roll, once); see act */
        if (s.pushing && !o.pushed && c.nat1) raiseHorror(api, R.HORROR.nat1, 'A natural 1 on a pushed roll.');   /* useAction counts its own */
        return c;
      },
      horror: function (n, why) { raiseHorror(api, n, why); },
      hurt: function (n, why) { hurt(api, n, why); },
      heal: function (n, why) { var ch = R.change(s.hp.cur, s.hp.max, n); s.hp.cur = ch.cur; if (ch.applied) api.say((why || 'You recover') + ': +' + ch.applied + ' HP (' + s.hp.cur + ' of ' + s.hp.max + ').', 'heal'); return ch.applied; },
      give: function (id, why) { return give(api, id, why); },
      /* Hand over or use up one carried thing (an item id or a list of them): it leaves the pack, and the end card counts it as put to use. */
      spend: function (test, why) { return spend(api, test, why); },
      used: function (name) { putToUse(s, name); },
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
      /* ending: on the last scene, which of its endings this was (the finale's "endings" names them, for the end card and the Chronicle) */
      end: function (kind, text, ending) {
        s.fight = null; if (text) api.say(text, kind === 'won' ? 'end' : 'hurt');
        if (ending && s.run && s.run.at >= s.run.order.length - 1) s.run.ending = ending;
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
      note: [c.adj === 'hard' ? 'Hard' : c.adj === 'easy' ? 'Easy' : '', c.nat1 ? nat1Note(o) : ''].filter(Boolean).join('. ') };
  }
  /* What a roll adds up to, for the numbers that rise off the die on screen (display only: every number here is one the rules already worked out).
     A part is [amount, what it is]; parts of 0 are left out, and if the parts do not add up to the rules' modifier (it is capped) the modifier is shown whole. */
  function sum(mod, parts, total, word, good) {
    parts = parts.filter(function (x) { return x[0]; }).map(function (x) { return { n: x[0], t: x[1] }; });
    if (parts.reduce(function (a, x) { return a + x.n; }, 0) !== mod) parts = mod ? [{ n: mod, t: 'bonus' }] : [];
    return { parts: parts, total: total, word: word, good: !!good };
  }
  function effortTally(e, word) {
    var parts = [{ n: e.bonus, t: R.CAT_NAMES[e.cat] }, { n: e.weaponBonus || 0, t: 'two hands' }];
    if (e.critical) parts.push({ n: e.critical.rolled, t: 'critical d' + e.critical.die }, { n: e.critical.bonus, t: 'Ultimate' });
    return { parts: parts.filter(function (x) { return x.n; }), total: e.total, word: word, good: true };
  }
  /* Magic, for a natural 1 (as at the table, vtt-core isMagic): a spell, or an item that tempts the Horror. */
  function magicOf(u) { return !!(u && (u.spell || (u.source || u.item || {}).temptsHorror || (u.item && u.item.temptsHorror))); }
  /* Why a natural 1 did or did not raise the Horror, in the Rules page's terms, so the player learns the rule by seeing it (the owner's ask, 2026-11-07). */
  function nat1Note(o) {
    return R.nat1Tempts({ magic: !!o.magic, pushed: !!o.pushed }) ? 'Natural 1 on ' + (o.pushed ? 'a pushed action' : o.spell ? 'a spell' : 'magic') + ': +' + R.HORROR.nat1 + ' Horror'
      : 'Natural 1 ' + (o.attack ? 'on an ordinary attack' : 'on a plain check') + ': no Horror';
  }
  function itemsCarried(s) { return (s.hero.gear || []).map(function (g) { return C.itemOf(g); }).filter(Boolean); }
  function carried(s, test) { return itemsCarried(s).filter(function (it) { return typeof test === 'function' ? test(it) : (Array.isArray(test) ? test.indexOf(it.id) >= 0 : it.id === test); })[0] || null; }
  function lit(s) { return !!s.flags.lit || !!s.flags.candle || !!carried(s, LIGHTS); }
  function candleGear(s) { return (s.hero.gear || []).filter(function (g) { var it = C.itemOf(g); return it && CANDLES.indexOf(it.id) >= 0 && (g.uses == null ? it.uses : g.uses) > 0; })[0] || null; }
  function lightCandle(api) {
    var s = api.s, g = candleGear(s); if (!g || lit(s)) return false;
    var it = C.itemOf(g); g.uses = Math.max(0, (g.uses == null ? it.uses : g.uses) - 1); s.flags.candle = true;
    api.say('You light ' + (it.id === 'stubs' ? 'a candle stub' : 'a candle from your ' + it.name.toLowerCase()) + ' (' + g.uses + ' left). It will burn for the rest of the scene.', 'note'); return true;
  }
  var DARK_LINE = 'It is dark here. Without a light, a WIS check to search or notice is Hard.';
  /* Dark: a dark place with no light. A place whose shape the hero has learned (Echo Bell) no longer makes those checks Hard, though it stays dark. */
  function darkRoom(s, r) { return !!(r && (r.dark || nightfall(s) === 'night')); }
  function isDark(s, adv) { var r = adv.rooms[s.room]; return darkRoom(s, r) && !lit(s) && !s.flags['mapped_' + s.room]; }
  /* Night falls along the road (the owner's choice, 2026-11-07): the first scenes are at evening, the light goes earlier through the middle of the road, and the
     finale is at night, where every place counts as dark. Darkness is the GM's call about a place; the rule for it is the Rules page's own (a WIS check to search
     or notice is Hard without a light), so nothing about the rules changes. */
  function nightfall(s) {
    var run = s && s.run; if (!run) return '';
    return run.at >= run.order.length - 1 ? 'night' : run.at >= 2 ? 'dusk' : 'evening';
  }

  /* ---------- obstacles and timers ---------- */
  /* One try at an obstacle: a check, and on a success Effort into its bar. A failed try moves the obstacle's clock, if it has one: dawdling costs.
     o.stat and o.cat change the check and the Effort die (a bold way); o.half puts half of what is left into the bar at once (a trick). */
  function work(api, id, o) {
    var s = api.s, ob = api._adv.obstacles[id]; s.bars = s.bars || {};
    var adj = o.adj || 'normal'; if (ob.hard && ob.hard(api)) adj = adj === 'easy' ? 'normal' : 'hard';
    var c = api.check(o.stat || ob.stat, { adj: adj, what: o.what || ob.name, ignoreDark: true });   /* an obstacle's own hard() says what the dark does to it */
    if (!c.success) { if (ob.clock) clockTick(api, ob.clock); return c; }
    var have = int(s.bars[id], 0), add, dice = null, words;
    if (o.half) { add = Math.ceil((ob.max - have) / 2); words = 'you find the way of it: half of what is left, ' + add + '.'; }
    else { var cat = o.cat || ob.cat || 'basic', e = R.effort({ cat: cat, bonus: s.hero.effort[cat] || 0, rolled: api.die(R.DEFAULT_DICE[cat]) }); add = e.total; dice = [{ die: e.die, n: e.rolled }]; words = R.sayEffort(e, 'Effort'); }
    s.bars[id] = Math.min(ob.max, have + add);
    api.say(ob.name + ': ' + words + ' Now ' + s.bars[id] + ' of ' + ob.max + '.', 'roll', dice ? { dice: dice, by: 'hero', tally: [effortTally(e, 'Effort')] } : null);
    if (s.bars[id] >= ob.max) clearObstacle(api, id);
    else if (ob.progress) ob.progress(api);
    return c;
  }
  /* The other ways through an obstacle, beside the scene's own steady one: bold (a harder Effort die, and a failure costs), and a trick (once only: a
     success puts half of what is left into the bar). The solo game's GM calls (the owner's, 2026-11-06), not rules. */
  function wayOf(api, id, wid) { var ob = api._adv.obstacles[id]; return ob && (ob.ways || []).filter(function (w) { return w.id === wid; })[0] || null; }
  function wayOpen(api, id, w) { return obstacleOpen(api, id) && !(w.kind === 'trick' && api.s.flags['trick_' + id]) && (!w.when || w.when(api)); }
  function useWay(api, id, w) {
    var s = api.s; if (w.say) api.say(w.say);
    if (w.kind === 'trick') s.flags['trick_' + id] = true;
    var c = work(api, id, { stat: w.stat, cat: w.kind === 'bold' ? 'weapons' : null, half: w.kind === 'trick', adj: w.adj ? w.adj(api) : 'normal', what: w.what || w.label });
    if (c.success || s.over) return;
    if (w.kind === 'bold') {
      if (w.failHorror) raiseHorror(api, w.failHorror, w.failSay || 'It goes wrong.');
      else { var n = api.die(4); hurt(api, n, (w.failSay || 'It goes wrong and you are hurt') + ' (d4 ' + n + ')'); }
    } else if (w.failSay) api.say(w.failSay);
  }
  function clockTick(api, tid) {
    var s = api.s, t = (s.timers || {})[tid], def = (api._adv.timers || {})[tid]; if (!t || !t.on || !def) return;
    t.cur = Math.max(0, t.cur - 1);
    if (t.cur > 0) api.say(def.name + ': ' + t.cur + ' left.', 'horror');
    else { t.on = false; api.say(def.name + ': time is up.', 'horror'); if (def.out) def.out(api); }
  }
  function clearObstacle(api, id, why) {
    var s = api.s, ob = api._adv.obstacles[id]; s.bars = s.bars || {}; s.bars[id] = ob.max;
    if (why) api.say(why, 'win');
    if (ob.clock && s.timers && s.timers[ob.clock] && s.timers[ob.clock].cur > 0) s.timers[ob.clock].on = false;   /* done in time: the clock stops and its card goes */
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

  /* ---------- story spells and items: their tags in the gear list (site/sheet/gear.js, "When in doubt" on the Rules page) ---------- */
  /* What a spell or item with no damage die does here, or null when nothing in this scene answers it. Nothing here changes the game: it returns { run }.
     The tag's default is the shared rule; the scene says where it applies: a dark room (light), a secret (learn), a foe that burns, casts, is undead or an animal,
     and each obstacle's "answers" (tag: words), which take half of what is left off its bar, once per tag (an "open" obstacle simply opens). */
  function spellUse(api, src) {
    var s = api.s, adv = api._adv, f = s.fight, room = adv.rooms[s.room], foe = f && adv.foes[f.foe];
    var own = adv.spells && adv.spells[src.id], mine = own && own(api); if (mine) return mine;
    var tags = (src.tags || []).slice(); if (!tags.length) return null;
    if (f) tags.sort(function (a, b) { return (FIGHT_TAGS.indexOf(a) < 0) - (FIGHT_TAGS.indexOf(b) < 0); });
    if (f && lasting(src) && f.lasting && f.lasting[src.id]) return null;   /* already done to this foe, and by its own words it lasts the scene: again changes nothing */
    for (var i = 0; i < tags.length; i++) { var u = ruling(api, tags[i], src, f, room, foe); if (u) return f && lasting(src) ? once(f, src, u) : u; }
    return null;
  }
  function lasting(src) { return /until the end of the scene|until dawn|until the wax is cut away|until it settles|the GM decides when it settles/i.test(src.does || ''); }
  function once(f, src, u) { return { run: function (api) { (f.lasting = f.lasting || {})[src.id] = true; u.run(api); } }; }
  var FIGHT_TAGS = ['daze', 'guard', 'hide', 'snuff', 'learn', 'silence', 'bind', 'beast'];
  function ruling(api, k, src, f, room, foe) {
    var s = api.s, dark = isDark(s, api._adv), dead = typeof room.dead === 'function' ? room.dead(api) : room.dead;
    if (!needsMet(api, src.needs, f, room, foe, dead)) return null;
    if (k === 'light' && dark) return { run: function () { s.flags.lit = true; api.say('Light gathers where you need it. The dark steps back from you.', 'note'); } };
    if (!f) {
      var ob = obstacleHere(api);
      if (k === 'open' && ob && ob.def.open) return { run: function () { clearObstacle(api, ob.id, ob.def.opened || ob.def.name + ' gives way.'); } };
      if (k === 'learn' && src.needs !== 'obstacle' && room.secret && !s.flags['secret_' + s.room]) return { run: function () { s.flags['secret_' + s.room] = true; api.say(typeof room.secret === 'function' ? room.secret(api) : room.secret, 'npc'); } };
      var ans = ob && ob.def.answers && !(ob.def.blocked && ob.def.blocked(api)) && ob.def.answers[k];
      if (ans && !s.flags['tag_' + ob.id + '_' + k]) return { run: function () { s.flags['tag_' + ob.id + '_' + k] = true; api.say(typeof ans === 'function' ? ans(api) : ans); halfBar(api, ob.id); } };
      if (k === 'learn' && src.needs !== 'obstacle' && darkRoom(s, room) && !lit(s) && !s.flags['mapped_' + s.room]) return { run: function () { s.flags['mapped_' + s.room] = true; api.say('You learn the shape of this place in the dark: searching it is no longer Hard.', 'note'); } };
      return null;
    }
    var checked = !!src.roll;
    if ((k === 'daze' || k === 'hide' || (k === 'beast' && foe.beast)) && !f.dim) return { run: function () { f.dim = 3; api.say(k === 'hide' ? f.name + ' cannot see you well: its next attack rolls 3 less.' : k === 'beast' ? f.name + ' shies from you: its next attack rolls 3 less.' : f.name + ' is Dazed: its next attack rolls 3 less.', 'win'); } };
    if (k === 'guard' && /\ban ally\b|\bone ally\b/i.test(src.does || '')) return null;   /* Ward and the Ward Medal protect an ally: alone there is none (their own words; owner, 2026-11-07) */
    if (k === 'guard' && !f.guard) return { run: function () { f.guard = 2; api.say('You have +2 Defence until your next turn.', 'win'); } };
    if (!f.skip && ((k === 'snuff' && foe.flame) || (k === 'silence' && foe.caster) || (k === 'bind' && checked))) return { run: function () { f.skip = 1; api.say(k === 'snuff' ? foe.snuffed || f.name + '\'s flame goes out. It does not attack this turn.' : k === 'silence' ? f.name + ' cannot get the words out. It does not attack this turn.' : f.name + ' is held fast. It does not attack this turn.', 'win'); } };
    if (k === 'learn' && foe.weakness && !f.learned && (src.needs || /\bin a fight\b|\bcreature\b|\bfoe\b/i.test(src.does || ''))) return { run: function () { f.learned = true; f.easy = (f.easy || 0) + 1; api.say(typeof foe.weakness === 'function' ? foe.weakness(api) : foe.weakness, 'npc'); api.say('Your next attack against it is Easy.', 'note'); } };
    return null;
  }
  /* What a spell or item needs before it can do anything (gear.js "needs", from its own words). A place says what is there:
     dead (corpses), animals, people (someone to speak to or watch), writing, wild (outdoors among growing things). In a fight the foe counts too. */
  function needsMet(api, need, f, room, foe, dead) {
    if (!need) return true;
    function has(k) { var v = room[k]; return !!(typeof v === 'function' ? v(api) : v); }
    switch (need) {
      case 'corpse': return !!dead;
      case 'undead': return !f || !!foe.undead;
      case 'animal': return f ? !!foe.beast : has('animals');
      case 'person': return f ? !!foe.person : has('people');
      case 'body': return f ? true : !!dead || has('people');
      case 'writing': return !f && has('writing');
      case 'wild': return has('wild');
      case 'obstacle': return !f && !!obstacleHere(api);
      case 'ally': return false;   /* playing alone there is no willing companion, as with Ward (owner, 2026-11-07) */
      default: return true;
    }
  }
  /* Half of what is left on an obstacle's bar, as a trick gives. */
  function halfBar(api, id) {
    var s = api.s, ob = api._adv.obstacles[id]; s.bars = s.bars || {};
    var have = int(s.bars[id], 0), add = Math.ceil((ob.max - have) / 2); s.bars[id] = Math.min(ob.max, have + add);
    api.say(ob.name + ': half of what is left, ' + add + '. Now ' + s.bars[id] + ' of ' + ob.max + '.', 'roll');
    if (s.bars[id] >= ob.max) clearObstacle(api, id); else if (ob.progress) ob.progress(api);
  }
  function obstacleHere(api) {
    var obs = api._adv.obstacles || {}, ids = Object.keys(obs).filter(function (id) { return obs[id].room === api.s.room && obstacleOpen(api, id); });
    return ids.length ? { id: ids[0], def: obs[ids[0]] } : null;
  }
  /* A story spell or item is one with no Effort die and no healing: a spell, or an item whose effect is left to the GM (its tags say what it is good for). */
  function isStorySpell(u) { var src = u && (u.source || u.item); return !!(u && !u.healing && src && (u.spell ? !u.cat || src.effect === 'esoteric' : src.effect === 'esoteric' || (!u.cat && src.tags))); }

  /* ---------- moving ---------- */
  function enter(api, to) {
    var s = api.s, r = roomOf(api, to); if (!r) return;
    s.room = to; s.moves++;
    api.say(r.name, 'room');
    var first = !s.seen[to]; s.seen[to] = true;
    api.say(typeof r.text === 'function' ? r.text(api, first) : r.text);
    if (darkRoom(s, r)) { lightCandle(api); api.say(lit(s) ? lightLine(s) : DARK_LINE, 'note'); }
    Object.keys(api._adv.obstacles || {}).forEach(function (id) { var ob = api._adv.obstacles[id]; if (ob.room === to && ob.clock && obstacleOpen(api, id)) timer(api, ob.clock, 'start'); });
    if (r.enter) r.enter(api, first);
    var who = first && !s.fight && cameoNow(s); if (who) api.say(who.meet, 'npc');
  }
  function lightLine(s) { var it = carried(s, LIGHTS); if (!it && s.flags.candle && !s.flags.lit) return 'Your candle holds the dark back, a little.'; return s.flags.lit && !it ? 'Your small flame holds the dark back.' : 'You raise ' + yours(it.name) + '. The dark steps back, a little.'; }
  function yours(t) { return /^The /.test(t) ? 'the ' + t.slice(4) : 'your ' + t; }
  function roomOf(api, id) { return api._adv.rooms[id] || null; }

  /* ---------- Horror ---------- */
  /* Raise the meter. A cost that cannot go on a full meter is paid in blood: R.HORROR.blood HP for each point (the owner's rule, 2026-11-01; 1 HP since 2026-11-09).
     Each threshold fires once a road, as once an adventure at the table: s.fired lists those already fired. */
  function raiseHorror(api, n, why, o) {
    var s = api.s; n = int(n, 0); if (n <= 0) return;
    s.fired = s.fired || []; var mv = R.horrorMove(s.horror, n, s.fired); s.horror = mv.to; if (s.run) s.run.peak = Math.max(s.run.peak || 0, s.horror);
    if (mv.applied) api.say((why ? why + ' ' : '') + 'The Horror rises ' + mv.applied + ' (now ' + s.horror + ' of ' + R.HORROR.max + ').', 'horror');
    mv.crossed.forEach(function (t) { s.fired.push(t); api.say(R.HORROR.lines[t], 'horror'); var h = api._adv.horror && api._adv.horror[t]; if (h) api.say(typeof h === 'function' ? h(api) : h, 'horror'); dread(api, t); });
    var left = n - mv.applied;
    if (left > 0 && s.hp.cur > 0 && !(o && o.gm)) {   /* as at the table (vtt-core bleed): a hero already at 0 HP pays no blood, nor does the GM's own raise */
      var total = left * R.HORROR.blood;
      if (!mv.applied && why) api.say(why, 'horror');
      api.say('The Horror can rise no further. You pay in blood: ' + total + ' HP.', 'horror');
      hurt(api, total, 'The price');
    }
  }

  /* What each threshold does: the shared rules (R.HORROR.dread, the owner's decision 2026-11-11: what solo did first is now every table's default).
     7: shaken, the next check or attack is Hard. 14: hunted, every foe met from then on has 2 more HP. 21: pay in blood, and no more rest. A road's own lines come first. */
  var DREAD = R.HORROR.dread;
  function dread(api, t) {
    var s = api.s;
    if (t === DREAD.shaken) { s.shaken = true; api.say('You are shaken. Your next check or attack is Hard.', 'note'); }
    if (t === DREAD.hunted && !s.hunted) { s.hunted = true; api.say('You are hunted. Every foe you meet from now on has ' + DREAD.huntedHp + ' more HP.', 'note'); }
    if (t === DREAD.arrived && !s.arrived) { s.arrived = true; api.say('There is no more rest for you on this road.', 'note'); }
  }

  /* a scene's own action, offered now? A scene's rest (the barn's sheaves, the guest cell) is still a rest: once the Horror has arrived there is none. */
  function actionOpen(api, x) { return (!x.when || x.when(api)) && !(x.id === 'rest' && api.s.arrived); }

  /* ---------- harm ---------- */
  /* Dice in the table's own words (vtt-core.mjs Activity): "d6 shows 4", "2d4 shows 3 + 2". */
  function diceSay(count, die, ns) { return (count > 1 ? count : '') + 'd' + die + ' shows ' + ns.join(' + '); }
  function hurt(api, n, why) {
    var s = api.s;
    if (s.dying) { api.say((why || 'You are hurt') + '.', 'hurt'); dyingTick(api, 'The blow costs you a round.'); return; }
    var ch = R.change(s.hp.cur, s.hp.max, -int(n, 0)); s.hp.cur = ch.cur;
    api.say((why || 'You are hurt') + ': ' + ch.applied + ' HP (' + s.hp.cur + ' of ' + s.hp.max + ' left).', 'hurt');
    if (s.hp.cur === 0 && !s.over) fall(api);
  }
  /* Falling, as the rules have it: at 0 HP the hero is dying, with R.DYING.start rounds left. Each new round takes one off, and so does a blow that gets
     through; at none left the hero is dead. Any healing stands them up. As at the table, a dying hero may crawl away (a CON check, free) or pay
     R.DYING.actHorror Horror to act anyway. Where a crawl leads (out of the scene with 1 HP, leaving behind what was found in it) is the solo game's GM call (2026-11-06). */
  function fall(api) {
    var s = api.s; s.dying = R.dyingFall();
    api.say('You fall. You are dying: ' + plural(s.dying.left, 'round') + ' left. Crawl away, or pay ' + R.DYING.actHorror + ' Horror to act anyway.', 'hurt');
    if (s.fight) { s.fight.pending = null; if (s.fight.phase !== 'hero') s.fight.phase = 'foe'; }
  }
  function dyingTick(api, why) {
    var s = api.s; if (!s.dying) return;
    s.dying = R.dyingTick(s.dying);
    if (s.dying.dead) { s.dying = null; var fell = api._adv.fall; api.say(why, 'hurt'); api.end('dead', typeof fell === 'function' ? fell(api) : fell || 'You fall, and no one comes.'); return; }
    api.say(why + ' ' + plural(s.dying.left, 'round') + ' left.', 'hurt');
  }
  /* a healing a dying hero can really use now: it works, and it is not a tending (bandages: "a dying hero cannot tend themselves"). A hero at 0 HP may take
     a healing again even if it has already helped since the last rest (the Rules page: "a recipient at 0 HP may receive that source again"). */
  function canHeal(s, a) { var h = a.ok && a.healing && a.u && a.u.healing; return !!h && !h.tend && !(h.kind && !h.force && s.hp.cur > 0 && s.healed[h.kind]); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function crawl(api) {
    var s = api.s, c = api.check(R.DYING.crawl, { what: 'You crawl away', nonDamage: true, noPush: true });
    if (s.over) return;
    if (!c.success) { if (s.fight) s.fight.phase = 'foe'; else dyingTick(api, 'You do not get far.'); return; }
    s.dying = null; s.hp.cur = 1; s.fight = null;
    var lost = leaveFinds(s);
    api.say('You drag yourself out and away, and live. ' + (lost.length ? 'You leave behind what you found here: ' + lost.join(', ') + '.' : 'You leave nothing behind but blood.') + ' (1 HP)', 'hurt');
    if (s.run && s.run.at < s.run.order.length - 1) { s.done = true; api.say('Scene ' + (s.run.at + 1) + ' of ' + s.run.order.length + ' is over. You got away.', 'note'); }
    else s.over = 'fled';
  }
  /* Getting out of a scene early (crawling away, breaking away) leaves behind what was found in it. Returns the names left behind. */
  function leaveFinds(s) {
    var lost = (s.found || []).map(function (id) { var at = -1; (s.hero.gear || []).forEach(function (g, k) { if (g.id === id) at = k; }); if (at < 0) return ''; var g = s.hero.gear.splice(at, 1)[0], it = C.itemOf(g); return it ? it.name : ''; }).filter(Boolean);
    (s.found || []).forEach(function (id) { var rf = (s.run && s.run.found) || [], k = rf.lastIndexOf(id); if (k >= 0) rf.splice(k, 1); });
    s.found = []; s.escaped = true; if (s.run) s.run.escapes = int(s.run.escapes, 0) + 1;
    return lost;
  }
  /* Break away (the Rules page): on your turn, instead of acting, a DEX check against the Target. Success: you get clear and the foe does not attack you as you
     go. Failure: you stay put and the foe attacks as usual. Where you can run to is the GM's call, and in the solo game (the owner's calls, 2026-11-07) there is
     somewhere to run only before the finale; getting away ends the scene, leaves its find behind, and the Horror rises 1 (a GM's raise: no blood). */
  var FLEE = { horror: 1 };
  function canFlee(s) { return !!(s.run && s.run.at < s.run.order.length - 1 && s.fight && !s.dying); }
  function breakAway(api) {
    var s = api.s, f = s.fight; if (!canFlee(s)) return false;
    var c = api.check(R.BREAK_AWAY.stat, { what: 'You break away', nonDamage: true, noPush: true });   /* breaking away cannot be pushed */
    if (s.over) return true;
    if (!c.success) { api.say(f.name + ' is on you before you can get clear.', 'miss'); f.phase = 'foe'; return true; }
    s.fight = null;
    var lost = leaveFinds(s);
    api.say('You turn and run, and ' + f.name.replace(/^The /, 'the ') + ' does not catch you. ' + (lost.length ? 'You leave behind what you found here: ' + lost.join(', ') + '.' : ''), 'act');
    raiseHorror(api, FLEE.horror, 'Running stays with you.', { gm: true });
    if (!s.over) { s.done = true; api.say('Scene ' + (s.run.at + 1) + ' of ' + s.run.order.length + ' is over. You got away.', 'note'); }
    return true;
  }

  /* ---------- finds ---------- */
  function give(api, id, why) {
    var s = api.s, it = C.item(id); if (!it) return null;
    var r = C.edit(s.hero, { op: 'add', id: id }, { gm: true }, s.hp);
    if (!r.ok) { api.say('You find ' + it.name + ', but you have to leave it: ' + r.why, 'note'); return null; }
    api.say((why || 'You take') + ': ' + it.name + '.' + (it.flavour ? ' ' + it.flavour : ''), 'loot');
    (s.found = s.found || []).push(it.id); if (s.run) (s.run.found = s.run.found || []).push(it.id);
    return it;
  }
  function spend(api, test, why) {
    var s = api.s, i = (s.hero.gear || []).findIndex(function (g) { var it = C.itemOf(g); return it && (Array.isArray(test) ? test.indexOf(it.id) >= 0 : it.id === test); });
    if (i < 0) return null;
    var it = C.itemOf(s.hero.gear[i]), r = C.edit(s.hero, { op: 'remove', index: i }, { gm: true }, s.hp); if (!r.ok) return null;
    api.say((why || 'You give up') + ': ' + it.name + '.', 'note'); putToUse(s, it.name);
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
    /* forewarned (Simon the Scholar): the hero has read about this foe, so their first attack against it is Easy, as when learning a foe's ways */
    if (api.story('forewarned')) { api.story('forewarned', false); api.s.fight.easy = 1; api.s.fight.learned = true; api.say('You have read about this one. Your first attack against it is Easy.', 'note'); }
    if (api.s.run && api.s.run.hard) { var hh = api.s.fight.hp; hh.cur += HARD.hp; hh.max += HARD.hp; }
    if (api.s.hunted) { var hp = api.s.fight.hp; hp.cur += DREAD.huntedHp; hp.max += DREAD.huntedHp; api.say('You are hunted: it has ' + DREAD.huntedHp + ' more HP (' + hp.max + ').', 'note'); }
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
    var s = api.s, u = a.u, fight = s.fight; pushed = pushed || !!s.pushing;
    if (!u || !u.ok) { api.say((u && u.why) || 'You cannot use that now.', 'note'); return; }
    var src = u.source || u.item, isDamage = !!u.cat && !u.healing && src.effect !== 'esoteric';
    if (u.pick) { /* a grimoire read by the die */
      var n = api.die(u.pickDie), sp = C.pickSpell(u, n); api.say('You open ' + yours(u.item.name) + ' and read where it falls: d' + u.pickDie + ' ' + n + ', ' + sp.name + '.', 'roll');
      return useAction(api, Object.assign({}, a, { u: C.useSpell(u, sp) }), pushed);
    }
    if (u.healing) return useHealing(api, a, u, pushed);
    var story = isStorySpell(u) ? spellUse(api, src) : null;
    if (isStorySpell(u) && !story) { api.say('Nothing here answers ' + (u.spell ? u.spell.name + '. You do not cast it' : yours(u.item.name) + '. You do not use it') + ', and it costs you nothing.', 'note'); return; }
    if (isDamage && !fight) { api.say('There is nothing here to strike.', 'note'); return; }
    /* an item's listed effects (sheet-core effectsOf, the same for the table): the Penitent's Chain, the Bone Bell, the Censer of Ash */
    var fx = C.effectsOf(src), busy = fx.any ? fxBusy(s, src, fx) : '';
    if (busy) { api.say(busy + '.', 'note'); return; }
    if (src.once === 'scene') { if (s.used[C.powerKey(src)]) { api.say('You have already used that in this scene.', 'note'); return; } s.used[C.powerKey(src)] = true; }
    api.say((pushed ? 'You push, and ' : 'You ') + (u.spell ? 'cast ' + u.spell.name + '.' : isDamage ? 'attack with ' + yours(u.item.name) + '.' : 'use ' + yours(u.item.name) + '.'), 'act');
    if (fx.any && fx.oncePerTurn && fight) (fight.once = fight.once || {})[src.id] = fight.round;
    if (fx.selfHarm) { var bite = api.die(fx.selfHarm); hurt(api, bite, yours(u.item.name).replace(/^./, function (x) { return x.toUpperCase(); }) + ' bites (' + diceSay(1, fx.selfHarm, [bite]) + ', nothing reduces it)'); if (s.over) return; }
    var chk = null;
    if (u.stat) {
      var adj = fight && fight.easy > 0 ? 'easy' : 'normal'; if (fight && fight.easy > 0 && isDamage) fight.easy--;
      chk = api.check(u.stat, { adj: adj, bonus: isDamage ? u.attackBonus || 0 : 0, misfire: isDamage && !u.spell ? R.misfireOf(u.item) : 0, attack: isDamage, nonDamage: !isDamage, item: u.spell ? u.spell.name : u.item.name, spell: !!u.spell, magic: magicOf(u), pushed: !!pushed, targetName: fight && isDamage ? fight.name : '' });   /* a crossbow's +2 to hit is in the total */
      if (chk.nat1 && R.nat1Tempts({ magic: magicOf(u), pushed: !!pushed })) raiseHorror(api, R.HORROR.nat1, 'A natural 1.');
    }
    if (u.horror) { var hr = R.rollHorror(u.horror, api.die); if (hr) raiseHorror(api, hr.amount, u.spell ? 'Casting tempts the Horror.' : 'Using it tempts the Horror' + (u.onPath ? ' (your own path: 1 less).' : '.')); }
    if (u.item.uses != null && u.gear) u.gear.uses = Math.max(0, (u.gear.uses == null ? u.item.uses : u.gear.uses) - 1);
    if (s.over) return;
    var ok = !chk || chk.success;
    if (!isDamage) {
      if (ok) { if (story) { story.run(api); putToUse(s, u.spell ? u.spell.name : u.item.name); } else if (fx.any) applyFx(api, fx, u.item.name); else { var hook = api._adv.onUse && api._adv.onUse(api, src, u); if (!hook) api.say(src.does ? firstSentence(src.does) : 'It is done.', 'note'); } if (LIT_BY_USE.indexOf(src.id) >= 0) s.flags.lit = true; }
      else if (story || fx.foe) api.say('It does not take.', 'miss');
      if (fight && chk && !ok && !pushed) { fight.phase = 'push'; api.say('It fails. You may push for a second action (costs ' + R.HORROR.push + ' Horror), or end your turn.', 'note'); s.failed = false; return; }
      if (fight && !(fx.any && fx.free)) fight.phase = 'foe';   /* a Free use does not take the turn */
      return;
    }
    if (!ok) {
      if (!pushed) { fight.phase = 'push'; s.failed = false; api.say('You miss. You may push for a second action (costs ' + R.HORROR.push + ' Horror), or end your turn.', 'note'); }
      else fight.phase = 'foe';
      return;
    }
    fight.phase = 'damage';
    fight.pending = { cat: u.cat, damageBonus: u.damageBonus || 0, critical: !!(chk && chk.offerUltimate), nat20: !!(chk && chk.nat20), item: u.spell ? u.spell.name : u.item.name };
  }
  /* Roll damage for a hit: the Effort die for its kind plus the hero's bonus, a heavy weapon's +2, and on a natural 20 one Ultimate die. */
  function rollDamage(api) {
    var s = api.s, f = s.fight, p = f && f.pending; if (!p) return;
    var size = stepped(s, f, p.cat), dice0 = {}; dice0[p.cat] = size;
    var e = R.effort({ cat: p.cat, bonus: s.hero.effort[p.cat] || 0, rolled: api.die(size), settings: { dice: dice0 } }), dice = [{ die: e.die, n: e.rolled }];
    if (p.damageBonus) e = Object.assign({}, e, { total: e.total + p.damageBonus, weaponBonus: p.damageBonus });
    if (p.critical) { e = R.criticalEffort({ base: e, rolled: api.die(R.DEFAULT_DICE.ultimate), bonus: 0 }); dice.push({ die: e.critical.die, n: e.critical.rolled }); }
    f.pending = null;
    api.say((p.nat20 ? 'A natural 20. ' : '') + p.item + ': ' + R.sayEffort(e, 'damage'), 'win', { dice: dice, damage: e.total, by: 'hero', tally: [effortTally(e, 'damage')] });
    damageFoe(api, e.total);
    if (s.fight) s.fight.phase = 'foe';
  }
  /* Why an item with listed effects cannot be used just now, or '' when it can: once per turn means once per round in a fight, and a bonus waiting for the next roll is not doubled. */
  function fxBusy(s, src, fx) {
    var f = s.fight;
    if (fx.foe && !f) return 'There is no foe here';
    if (fx.oncePerTurn && f && f.once && f.once[src.id] === f.round) return 'Once per turn: you have used it this round';
    if (fx.nextCheck && int(s.boost, 0)) return 'Your +' + s.boost + ' is still waiting for your next roll';
    return '';
  }
  function applyFx(api, fx, name) {
    var s = api.s, f = s.fight;
    if (fx.nextCheck) { s.boost = int(s.boost, 0) + fx.nextCheck; s.boostFrom = name; api.say('Your next roll gets +' + fx.nextCheck + '.', 'win'); }
    if (fx.foe && f) {
      var st = C.FOE_STATUS[fx.foe];
      if (st.attack) f.dim = -st.attack;
      if (st.effortStep) f.ash = 2;   /* until the end of the next round: its attack this round and the next */
      api.say(f.name + ': ' + st.name + ', ' + st.text + '.', 'win');
    }
  }
  function firstSentence(t) { var m = /^[^.!?]*[.!?]/.exec(t); return m ? m[0] : t; }
  function useHealing(api, a, u, pushed) {
    var s = api.s, h = u.healing; void a;
    if (s.hp.cur >= s.hp.max) { api.say('You are already whole.', 'note'); return; }
    if (h.kind && !h.force && s.hp.cur > 0 && s.healed[h.kind]) { api.say('That has already helped you since your last rest.', 'note'); return; }
    if (h.tend && s.dying) { api.say('A dying hero cannot tend themselves.', 'note'); return; }
    api.say('You use ' + (u.spell ? u.spell.name : yours(u.item.name)) + '.', 'act');
    var chk = null; if (u.stat) { chk = api.check(u.stat, { nonDamage: true, item: u.spell ? u.spell.name : u.item.name, spell: !!u.spell, magic: magicOf(u), pushed: !!pushed }); if (chk.nat1 && R.nat1Tempts({ magic: magicOf(u), pushed: !!pushed })) raiseHorror(api, R.HORROR.nat1, 'A natural 1.'); }
    if (u.horror) { var hr = R.rollHorror(u.horror, api.die); if (hr) raiseHorror(api, hr.amount, 'It tempts the Horror' + (u.onPath ? ' (your own path: 1 less).' : '.')); }
    if (u.item.uses != null && u.gear) u.gear.uses = Math.max(0, (u.gear.uses == null ? u.item.uses : u.gear.uses) - 1);
    if (s.over) return;
    if (!chk || chk.success) {
      var n = api.die(h.die), amount = n, words = diceSay(1, h.die, [n]);
      if (chk && chk.offerUltimate) { var c = api.die(R.DEFAULT_DICE.ultimate); amount += c; words += '; ' + diceSay(1, R.DEFAULT_DICE.ultimate, [c]); }
      api.say('Healing: ' + words + '.', 'roll', chk ? null : { dice: [{ die: h.die, n: n }], tally: [{ parts: [], total: amount, word: 'HP back', good: true }] }); api.heal(amount, 'You are mended');
      if (s.dying && s.hp.cur > 0) { s.dying = null; api.say('You are on your feet again.', 'win'); }
      if (h.kind) s.healed[h.kind] = true;
    } else api.say('It does not take.', 'miss');
    if (s.fight) s.fight.phase = 'foe';
  }
  function damageFoe(api, n) {
    var s = api.s, f = s.fight, ch = R.change(f.hp.cur, f.hp.max, -n); f.hp.cur = ch.cur;
    var def = api._adv.foes[f.foe];
    if (f.hp.cur === 0) { s.fight = null; s.flags['beat_' + f.foe] = true; if (s.run) (s.run.beaten = s.run.beaten || []).push(f.name); api.say(typeof def.defeated === 'function' ? def.defeated(api) : def.defeated, 'end'); if (def.after) def.after(api); }
    else api.say(f.name + ' is hurt (' + hurtWord(f.hp) + ').', 'foe');
  }
  function hurtWord(hp) { var r = hp.cur / hp.max; return r > 0.66 ? 'barely' : r > 0.33 ? 'badly' : 'nearly finished'; }
  /* The foe's turn: d20 + its attack bonus against the hero's Defence; a natural 1 always misses and a natural 20 always hits (owner's decision). Damage is its Effort die. */
  function foeTurn(api) {
    var s = api.s, f = s.fight; if (!f || s.over) return;
    var def = api._adv.foes[f.foe];
    if (f.skip) { f.skip = 0; f.guard = 0; if (f.ash) f.ash--; api.say(f.name + ' does not attack this turn.', 'win'); f.round++; f.phase = 'hero'; tickTimers(api, 'round'); if (s.dying) dyingTick(api, 'A round passes.'); return; }
    var dim = int(f.dim, 0), guard = int(f.guard, 0); f.dim = 0; f.guard = 0;
    var a = R.attack({ d20: api.die(20), bonus: f.attack - dim, defence: C.defence(s.hero) + guard });
    var size = foeDie(f); if (f.ash) f.ash--;
    var n = a.hit ? api.die(size) : 0, dice = [{ die: 20, n: a.d20 }]; if (a.hit) dice.push({ die: size, n: n });
    var outcome = { who: f.name, targetName: s.hero.name, success: a.hit, critical: false, label: a.hit ? 'HIT' : 'MISS', pendingDamage: false,
      d20: a.d20, mod: a.mod, total: a.total, target: a.defence, versus: 'Defence', note: (dim ? 'Rolls ' + dim + ' less. ' : '') + (size < f.damage ? 'Effort d' + size + ', not d' + f.damage + '. ' : '') + (guard ? 'Your Defence +' + guard + '. ' : '') + (a.nat20 ? 'Natural 20: always hits. ' : a.nat1 ? 'Natural 1: always misses. ' : '') + (a.hit ? n + ' damage.' : '') };
    var tally = [sum(a.mod, [[f.attack, 'attack'], [-dim, 'dazed']], a.total, 'against Defence ' + a.defence, !a.hit)]; if (a.hit) tally.push({ parts: [], total: n, word: 'damage', good: false, at: 1 });
    api.say(f.name + ' attacks: ' + R.sayAttack(a), a.hit ? 'hurt' : 'win', { dice: dice, outcome: outcome, foeAttack: true, tally: tally });
    if (a.hit) hurt(api, n, (def.hits || 'It hurts you') + ' (' + diceSay(1, size, [n]) + ')');
    if (s.fight && !s.over) { f.round++; f.phase = 'hero'; tickTimers(api, 'round'); if (s.dying) dyingTick(api, 'A round passes.'); }
  }

  /* The foe's Effort die: one size smaller while the Censer's ash hangs on it. */
  function foeDie(f) { return f.ash ? C.stepDie(f.damage, C.FOE_STATUS.censer.effortStep) : f.damage; }
  /* What the foe will do on its turn, from the real numbers: the d20 roll it needs to hit you, its chance, and its damage die. */
  function foeIntent(s) {
    var f = s.fight; if (!f || f.skip) return f ? { text: 'Loses its next attack' } : null;
    var need = C.defence(s.hero) + int(f.guard, 0) - (f.attack - int(f.dim, 0)), roll = Math.max(2, Math.min(20, need));
    return { need: roll, chance: (21 - roll) * 5, damage: foeDie(f), text: 'Next: attacks. Hits you on ' + roll + '+ (' + (21 - roll) * 5 + '%), d' + foeDie(f) + ' damage' };
  }
  /* Everything found on the road and still carried: what can come home. */
  function runFinds(s) {
    var have = {}; (s.hero.gear || []).forEach(function (g) { have[g.id] = (have[g.id] || 0) + 1; });
    return ((s.run && s.run.found) || []).filter(function (id) { return have[id]-- > 0; });
  }

  /* ---------- the hero's own rest: one d6 off the Horror (R.REST) ---------- */
  function rest(api) {
    var s = api.s; s.rested = true; s.healed = {};
    var dice = []; for (var i = 0; i < R.restDice(1); i++) dice.push(api.die(R.REST.horrorDie));
    var down = dice.reduce(function (a, b) { return a + b; }, 0), before = s.horror; s.horror = Math.max(0, s.horror - down);
    api.heal(R.REST.heal, 'Rest');
    api.say('The Horror falls ' + (before - s.horror) + ' (' + diceSay(dice.length, R.REST.horrorDie, dice) + '; now ' + s.horror + ' of ' + R.HORROR.max + ').', 'horror', { dice: dice.slice(0, 2).map(function (x) { return { die: R.REST.horrorDie, n: x }; }) });
  }

  /* ---------- what can be done now: the buttons ---------- */
  /* two of the same thing in the pack (two rolls of bandages) make one button, not two the same */
  function choices(s, adv) { var seen = {}; return choicesAll(s, adv).filter(function (c) { var k = c.kind + '|' + c.label; if (seen[k]) return false; seen[k] = true; return true; }); }
  function choicesAll(s, adv) { adv = sceneOf(s) || adv;
    var api = apiFor(s, adv, function () { return 1; });
    if (s.over) return [];
    var out = [];
    if (s.dying && !(s.fight && s.fight.phase === 'foe')) {   /* dying: crawl away for nothing, or act anyway for R.DYING.actHorror (the rules, 2026-11-11) */
      out.push({ label: 'Crawl away (' + R.DYING.crawl + ')', cmd: 'crawl', kind: 'do' });
      var acts = s.fight && s.fight.phase === 'hero' ? fightOptions(api, s, s.fight).filter(function (c) { return !c.idle && !c.flee && !c.free && !(c.heal && !canHeal(s, findAction(s, c.cmd.split(' ')) || {})); })
        : heroActions(s).filter(function (a) { return canHeal(s, a); }).map(function (a) { return { label: (a.spellId ? 'Cast ' : 'Use ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'use', horror: a.horror || 0, about: aboutOf(a), heal: true }; });
      acts.forEach(function (c) { var o = Object.assign({}, c); out.push(Object.assign(o, { label: c.label + ' (dying: +' + R.DYING.actHorror + ' Horror)', cmd: 'dying ' + c.cmd, horror: (c.horror || 0) + R.DYING.actHorror })); });
      return out;
    }
    if (s.done) {
      var nx = sceneAt(s, s.run.at + 1);
      if (!s.rested && !s.arrived && (s.hp.cur < s.hp.max || s.horror > 0)) out.push({ label: 'Rest before you go on', cmd: 'rest', kind: 'do' });
      var fork = forkAt(s);
      if (fork) fork.forEach(function (id) { var sc = scenes()[id]; out.push({ label: 'Take the road to ' + sc.title, cmd: 'next ' + id, kind: 'go', hint: sc.tease || '' }); });
      else out.push({ label: 'Go on: ' + (nx ? nx.title : 'the road'), cmd: 'next', kind: 'go' });
      return out;
    }
    if (s.fight) {
      var f = s.fight;
      if (f.phase === 'damage') { var p = f.pending; return [{ label: 'Roll damage: d' + R.DEFAULT_DICE[p.cat] + (s.hero.effort[p.cat] ? ' + ' + s.hero.effort[p.cat] : '') + (p.damageBonus ? ' + ' + p.damageBonus : '') + (p.critical ? ' + d' + R.DEFAULT_DICE.ultimate : ''), cmd: 'damage', kind: 'attack' }]; }
      if (f.phase === 'foe') return [{ label: 'End your turn', cmd: 'foe', kind: 'plain' }];
      /* A push gives a second action of any kind, as at the table (the Rules page: "Push ... makes the next action the second action"): the same list, each one pushed. */
      if (f.phase === 'push') { fightOptions(api, s, f).filter(function (c) { return !c.idle && !c.flee && !(c.heal && s.hp.cur >= s.hp.max); }).forEach(function (c) { if (c.free) { out.push(c); return; } var o = Object.assign({}, c); delete o.heal; out.push(Object.assign(o, { label: 'Push: ' + (c.cmd === 'brace' ? 'brace (+2 Defence)' : c.label.replace(/^Attack: /, '').replace(/^(Cast|Use) /, '')), cmd: 'push ' + c.cmd.replace(/^use /, ''), kind: 'push', horror: R.HORROR.push })); }); out.push({ label: 'End your turn', cmd: 'foe', kind: 'plain' }); return out; }
      out = fightOptions(api, s, f);
      return out;
    }
    var r = adv.rooms[s.room], who = cameoNow(s);
    var asked = who && s.flags['riddle_' + who.id];
    if (asked) asked.order.forEach(function (n, k) { out.push({ label: who.riddles[asked.i].a[n], cmd: 'meet ' + who.id + ' ' + (k + 1), kind: 'do', riddle: who.riddles[asked.i].q, by: who.name }); });
    else if (who && (!who.when || who.when(api))) out.push({ label: who.label, cmd: 'meet ' + who.id, kind: 'do' });
    (r.actions || []).forEach(function (x) { if (actionOpen(api, x)) out.push(Object.assign({ label: typeof x.label === 'function' ? x.label(api) : x.label, cmd: 'do ' + x.id, kind: 'do' }, x.item ? { useful: true, item: (api.has(x.item) || {}).name || '' } : null)); });
    Object.keys(adv.obstacles || {}).forEach(function (id) { var ob = adv.obstacles[id]; if (ob.room !== s.room) return; (ob.ways || []).forEach(function (w) { if (wayOpen(api, id, w)) out.push({ label: w.label, cmd: 'way ' + id + ' ' + w.id, kind: 'do', way: w.kind, hint: w.kind === 'trick' ? 'Once: half the bar' : 'Weapons Effort' }); }); });
    Object.keys(r.exits || {}).forEach(function (d) { var e = exitOf(api, r, d); if (e && !e.hidden) out.push({ label: 'Go ' + d + ': ' + adv.rooms[e.to].short, cmd: 'go ' + d, kind: 'go' }); });
    heroActions(s).filter(function (a) { return a.ok && (a.healing ? s.hp.cur < s.hp.max : isStorySpell(a.u) || litByUse(a) || hasFx(a, false)); }).forEach(function (a) { out.push(markIdle(api, a, { label: (a.spellId ? 'Cast ' : 'Use ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'use', horror: a.horror || 0, about: aboutOf(a) })); });
    /* the last roll failed: push it (the rules: any failed roll, once) while the same thing can still be tried */
    var again = s.pushable && out.filter(function (x) { return x.cmd === s.pushable; })[0];
    if (again) out.unshift({ label: 'Push: try again (' + again.label + ')', cmd: 'repush', kind: 'push', horror: R.HORROR.push, hint: 'A second try, pushed: +' + R.HORROR.push + ' Horror' });
    return out;
  }
  /* Anointing (Flask of Holy Oil, from its fx in the gear list): "Until the end of the scene its Effort steps up one size against the unquiet dead and
     anything marked Unholy." An item whose fx is a buff to Effort against the unholy is offered in a fight with an undead foe while it has uses left; it takes
     the hero's action, and from then the hero's weapon Effort die is one size bigger against the undead until the scene ends. */
  var DIE_SIZES = [4, 6, 8, 10, 12];
  function anointer(s) {
    var out = null;
    (s.hero.gear || []).forEach(function (g, i) {
      var it = C.itemOf(g), fx = it && (it.fx || []).filter(function (x) { return x.do === 'buff' && x.to === 'effort' && x.vs === 'unholy'; })[0];
      if (fx && !out && (g.uses == null ? it.uses : g.uses) > 0) out = { index: i, gear: g, item: it, fx: fx };
    });
    return out;
  }
  function anoint(api) {
    var s = api.s, f = s.fight, o = anointer(s); if (!f || !o || s.flags.anointed) return false;
    o.gear.uses = Math.max(0, (o.gear.uses == null ? o.item.uses : o.gear.uses) - 1);
    s.flags.anointed = o.fx.step || 1; putToUse(s, o.item.name);
    api.say('You use ' + yours(o.item.name) + ' and anoint your weapon (' + o.gear.uses + ' left). Until the end of the scene its Effort is one size bigger against the unquiet dead.', 'act');
    f.phase = 'foe'; return true;
  }
  function stepped(s, f, cat) {
    var base = R.DEFAULT_DICE[cat], k = DIE_SIZES.indexOf(base);
    if (!s.flags.anointed || !f || !f.undead || cat !== 'weapons' || k < 0) return base;
    return DIE_SIZES[Math.min(DIE_SIZES.length - 1, k + s.flags.anointed)];
  }
  /* Everything the hero can do on their turn in a fight: attack (a weapon, a damage spell, a grimoire read by the die), bare hands if they carry no weapon, brace, heal, or a story spell. */
  function fightOptions(api, s, f) {
    var out = [], attacks = heroActions(s).filter(function (a) { return a.ok && (a.pick || (a.cat && !a.healing && !isStorySpell(a.u))); });
    attacks.forEach(function (a) { out.push({ label: a.pick ? a.name : (a.spellId ? 'Cast ' : 'Attack: ') + shortName(a), cmd: actionKey(a), kind: a.spellId || a.pick ? 'spell' : 'attack', strike: true, horror: a.horror || 0, about: aboutOf(a) }); });
    if (!attacks.some(function (a) { return !a.spellId && !a.pick; })) out.push({ label: 'Attack: bare hands', cmd: 'punch', kind: 'attack' });
    if (!f.guard) out.push({ label: 'Brace: +2 Defence until your next turn', cmd: 'brace', kind: 'plain' });
    if (canFlee(s)) out.push({ label: 'Break away: run (DEX)', cmd: 'flee', kind: 'do', flee: true, hint: 'Get away: lose this scene\'s find, Horror +1' });
    var oil = f.undead && !s.flags.anointed && anointer(s);
    if (oil) out.push({ label: 'Use ' + oil.item.name, cmd: 'anoint', kind: 'use', hint: 'Your weapon\'s Effort steps up against the dead', about: { name: oil.item.name, roll: '', does: oil.item.does || '' } });
    heroActions(s).filter(function (a) { return a.ok && (a.healing || isStorySpell(a.u) || litByUse(a) || hasFx(a, true)); }).forEach(function (a) { out.push(markIdle(api, a, { label: (a.spellId ? 'Cast ' : 'Use ') + shortName(a), cmd: actionKey(a), kind: a.spellId ? 'spell' : 'use', horror: a.horror || 0, about: aboutOf(a), heal: !!a.healing })); });
    return out;
  }
  /* An item with listed effects is offered where they can work: one that acts on foes only in a fight. */
  function hasFx(a, inFight) { var src = a.u && (a.u.source || a.u.item), fx = src && C.effectsOf(src); return !!(fx && fx.any && (inFight || !fx.foe)); }
  function freeFx(a) { var src = a.u && (a.u.source || a.u.item), fx = src && C.effectsOf(src); return !!(fx && fx.any && fx.free); }
  function litByUse(a) { var src = a.u && (a.u.source || a.u.item); return !!src && LIT_BY_USE.indexOf(src.id) >= 0; }
  function shortName(a) { return a.name.replace(/ \([^)]*\)$/, ''); }
  /* Mark a story spell that nothing in this scene answers: it shows as "No use here" and costs nothing. */
  function markIdle(api, a, c) {
    var h = a.u && a.u.healing;
    if (isStorySpell(a.u)) { var src = a.u.source || a.u.item, f = api.s.fight; if (!spellUse(api, src)) { c.idle = true; c.why = f && f.lasting && f.lasting[src.id] ? 'Already done: it lasts the scene' : 'No use here'; } else c.useful = true; }
    else if (h && h.kind && !h.force && api.s.healed[h.kind] && api.s.hp.cur > 0) { c.idle = true; c.why = 'Used since your last rest'; }
    else if (hasFx(a, true)) { var src2 = a.u.source || a.u.item, fx = C.effectsOf(src2), busy = fxBusy(api.s, src2, fx); if (busy) { c.idle = true; c.why = busy; } else if (fx.free) { c.hint = 'Free: it does not take your turn'; c.free = true; } }
    return c;
  }
  /* What a spell or item does, in the gear list's own words: for the "What it does" card. */
  function aboutOf(a) {
    var u = a.u || {}, src = u.spell || u.item || {};
    return { name: src.name || shortName(a), roll: src.roll || '', does: src.does || src.flavour || '', from: u.spell && u.item ? u.item.name : '' };
  }
  /* What a choice risks, shown on its button before you pick it: the number the die must show, the chance of that, and what a failure costs here.
     Found by trying the choice on a copy of the game with a low die (2: a failure, but not a natural 1). Nothing in the real game changes. */
  function odds(s, adv, cmd) { adv = sceneOf(s) || adv;
    if (!cmd || s.over) return null;
    var copy = JSON.parse(JSON.stringify(s)), from = s.log.length;
    try { act(copy, adv, cmd, function (n) { return n === 20 ? 2 : 1; }); } catch (e) { return null; }
    var first = copy.log.slice(from).filter(function (l) { return l.outcome; })[0];
    if (!first) return null;
    var o = first.outcome, need = Math.max(1, o.target - o.mod), chance = Math.max(0, Math.min(20, 21 - need)) * 5;
    var cost = [];
    if (copy.hp.cur < s.hp.cur) cost.push('you are hurt');
    if (copy.horror > s.horror) cost.push('Horror');
    if (copy.fight && !s.fight) cost.push('a fight');
    Object.keys(copy.timers || {}).forEach(function (id) { var a0 = (s.timers || {})[id], d = (adv.timers || {})[id]; if (d && d.tick === 'fail' && a0 && copy.timers[id].cur < a0.cur) cost.push(d.name.toLowerCase() + ' draws closer'); });
    if (copy.over === 'dead') cost = ['it may kill you'];
    return { need: Math.min(need, 21), chance: chance, note: o.note, cost: cost, attack: !!o.pendingDamage || /MISS/.test(o.label) };
  }
  /* The scene's numbers, always on show: its Target, and whether the dark makes every check Hard. */
  function sceneInfo(s, adv) { adv = sceneOf(s) || adv; return { target: int(adv.target, 12) + hardTarget(s), dark: isDark(s, adv), time: nightfall(s) }; }
  /* The Hard Road (the owner's tick, 2026-11-07): the same road with every Target 1 higher, every foe 2 more HP and one more scene in the middle.
     Targets and foes are the GM's numbers, so no rule changes. It opens after HARD.wins roads come home (solo.js reads the Chronicle). */
  var HARD = { target: 1, hp: 2, scenes: 1, wins: 3 };
  function hardTarget(s) { return s.run && s.run.hard ? HARD.target : 0; }
  /* The cards on the table for this place, as at the table: the foe with its HP, an obstacle with its Effort bar, a timer with its countdown. */
  function cards(s, adv) { adv = sceneOf(s) || adv;
    var out = [], api = apiFor(s, adv, function () { return 1; });
    if (s.fight) { var f = s.fight, fd = adv.foes[f.foe]; out.push({ kind: 'foe', id: f.foe, name: f.name, cur: f.hp.cur, max: f.hp.max, unit: 'HP', next: foeIntent(s).text, text: fd.card || '', traits: foeTraits(fd, f), stats: 'Attack +' + f.attack + ' · d' + foeDie(f) + ' damage' + (f.ash ? ' (choked by ash)' : '') + (f.dim ? ' · next attack rolls ' + f.dim + ' less' : '') + (f.skip ? ' · loses its next attack' : '') }); }
    Object.keys(adv.obstacles || {}).forEach(function (id) { var o = adv.obstacles[id]; if (o.room === s.room && obstacleOpen(api, id)) out.push({ kind: 'obstacle', id: id, name: o.name, cur: int((s.bars || {})[id], 0), max: o.max, unit: 'Effort', text: o.text || '', stats: o.stat + ' check, then ' + (R.CAT_NAMES ? R.CAT_NAMES[o.cat || 'basic'] : 'Basic') + ' Effort' }); });
    Object.keys(s.timers || {}).forEach(function (id) { var t = s.timers[id], d = adv.timers[id]; if (d && (t.on || t.cur === 0) && (!d.room || d.room === s.room)) out.push({ kind: 'timer', id: id, name: d.name, cur: t.cur, max: t.max, unit: t.on ? 'left' : 'ended', text: d.text || '', stats: t.on ? (d.tick === 'fail' ? 'Loses 1 each failed try' : d.tick === 'action' ? 'Loses 1 each thing you do here' : 'Loses 1 each round') : 'Time ran out' }); });
    return out;
  }
  /* What a foe is, as the spell tags read it (the Rules page's tag table): what a spell or item from the gear list can do about it. */
  function foeTraits(fd, f) {
    var out = [];
    if (fd.undead) out.push('Unquiet dead');
    if (fd.flame) out.push('Burns');
    if (fd.caster) out.push('Casts');
    if (fd.beast) out.push('Animal');
    if (fd.weakness && !f.learned) out.push('Has a weakness to learn');
    return out;
  }
  function exitOf(api, r, d) { var e = r.exits[d]; if (!e) return null; if (typeof e === 'string') e = { to: e }; if (e.when && !e.when(api)) return e.closed ? { to: e.to, closed: e.closed, hidden: true } : null; return e; }

  /* ---------- typed words become commands ---------- */
  var HELP = 'Tap a choice, or type a command: LOOK, GO NORTH (or N, S, E, W, UP, DOWN), INVENTORY, a thing to do ("read ledger", "talk"), ATTACK, CAST and a spell, USE and an item, PUSH, RUN, HELP.';
  function parse(s, adv, text) { adv = sceneOf(s) || adv;
    var t = String(text || '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!t) return '';
    /* a button's own command passes straight through */
    if (/^(use \d+( [a-z0-9]+)*|push \d+( [a-z0-9]+)*|do [a-z0-9_]+|go (north|south|east|west|up|down)|punch|push punch|push brace|damage|foe)$/.test(t)) return t;
    var w = t.split(' '), verb = w[0], rest = w.slice(1).join(' ');
    if (DIRS[t]) return 'go ' + DIRS[t];
    if ((verb === 'go' || verb === 'walk' || verb === 'climb' || verb === 'enter') && DIRS[rest]) return 'go ' + DIRS[rest];
    if (/^(l|look|look around)$/.test(t)) return 'look';
    if (/^(i|inv|inventory|gear|pack|sheet|hero)$/.test(t)) return 'inventory';
    if (/^(h|help|\?)$/.test(t)) return 'help';
    if (/^(wait|end turn|end my turn|end your turn|let it come)$/.test(t)) return 'foe';
    if (/^(damage|roll damage)$/.test(t)) return 'damage';
    if (s.fight && /^(run|run away|flee|break away|escape|retreat)$/.test(t)) return 'flee';
    var list = choices(s, adv), api = apiFor(s, adv, function () { return 1; });
    /* the room's own things to do, by their words */
    var r = adv.rooms[s.room];
    if (!s.fight && r) {
      var hit = (r.actions || []).filter(function (x) { return actionOpen(api, x) && (x.words || []).some(function (k) { return t.indexOf(k) >= 0; }); })[0];
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

  /* A hero's own action, by its words (use ..., punch, brace, anoint), for a dying hero who acts anyway. */
  function heroDo(api, p) {
    var s = api.s, f = s.fight, c = p.join(' ');
    if (p[0] === 'use') { var a = findAction(s, p); if (a) useAction(api, a, false); }
    else if (c === 'punch') useAction(api, bareHands(), false);
    else if (c === 'brace' && f && !f.guard) { f.guard = 2; f.phase = 'foe'; api.say('You brace yourself: +2 Defence until your next turn.', 'act'); }
    else if (c === 'anoint') anoint(api);
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
    if (c !== 'repush') s.failed = false;
    api.say('> ' + (label || c), 'cmd');
    if (c === 'look') { var r0 = adv.rooms[s.room]; api.say(r0.name, 'room'); api.say(typeof r0.text === 'function' ? r0.text(api, false) : r0.text); if (darkRoom(s, r0)) api.say(lit(s) ? lightLine(s) : DARK_LINE, 'note'); if (s.fight) api.say(s.fight.name + ' is here (' + hurtWord(s.fight.hp) + ' hurt).', 'foe'); }
    else if (c === 'help') api.say(HELP, 'note');
    else if (c === 'inventory') api.say(inventoryText(s), 'note');
    else if (c === 'repush' && s.pushable && !s.fight && !s.dying && !s.done) {   /* push the failed roll: the Horror rises, and the same thing is tried again, pushed */
      var pc = s.pushable; s.pushable = null; raiseHorror(api, R.HORROR.push, 'You push for a second try.');
      if (!s.over) { s.pushing = true; act(s, adv, pc, die); s.pushing = false; }
      return s.log.slice(before);
    }
    else if (s.dying && !(s.fight && s.fight.phase === 'foe')) {
      if (c === 'crawl') crawl(api);
      else if (p[0] === 'dying' && choices(s, adv).some(function (x) { return x.cmd === c; })) {
        raiseHorror(api, R.DYING.actHorror, 'You are dying, and act anyway.');
        if (!s.over) heroDo(api, p.slice(1));
        if (s.dying && !s.fight && !s.over) dyingTick(api, 'Time passes.');
      }
      else api.say('You are dying: crawl away, or pay ' + R.DYING.actHorror + ' Horror to act anyway.', 'note');
    }
    else if (s.done) {
      if (c === 'next') nextScene(api);   /* typed "next" at a fork takes the first road */
      else if (p[0] === 'next' && p[1] && forkAt(s) && forkAt(s).indexOf(p[1]) >= 0) { takeRoad(s, p[1]); nextScene(api); }
      else if (c === 'rest' && s.arrived) api.say('There is no more rest for you on this road.', 'note');
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
          var pa = p[1] === 'punch' ? bareHands() : p[1] === 'brace' ? 'brace' : p[1] === 'anoint' ? 'anoint' : findAction(s, ['use'].concat(p.slice(1))); if (!pa) { api.say('You cannot push with that.', 'note'); return s.log.slice(before); }
          f.phase = 'hero'; raiseHorror(api, R.HORROR.push, 'You push for a second action.');
          if (!s.over && pa === 'brace') { f.guard = 2; f.phase = 'foe'; api.say('You brace yourself: +2 Defence until your next turn.', 'act'); }
          else if (!s.over && pa === 'anoint') { if (!anoint(api)) f.phase = 'foe'; }
          else if (!s.over) { useAction(api, pa, true); if (s.fight && f.phase === 'hero') f.phase = 'foe'; }   /* the second action cannot itself be pushed */
        } else if (p[0] === 'use' && findAction(s, p) && freeFx(findAction(s, p))) useAction(api, findAction(s, p), false);   /* a Free use (the Chain) before the pushed roll costs no push */
        else api.say('You missed: push, or end your turn.', 'note');
      }
      else if (p[0] === 'use') { var a = findAction(s, p); if (a) useAction(api, a, false); else api.say('You cannot use that now.', 'note'); }
      else if (c === 'punch') useAction(api, bareHands(), false);
      else if (c === 'brace' && !f.guard) { f.guard = 2; f.phase = 'foe'; api.say('You brace yourself: +2 Defence until your next turn.', 'act'); }
      else if (c === 'anoint') { if (!anoint(api)) api.say('You cannot use that now.', 'note'); }
      else if (c === 'flee') { if (!breakAway(api)) api.say('There is nowhere to run to. This ends here.', 'note'); }
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
      else if (w.riddles) riddle(api, w, p[2]);
      else { s.flags['cameo_' + w.id] = true; s.run.met.push(w.id); w.run(api); }
    }
    else if (p[0] === 'do') {
      var x = (adv.rooms[s.room].actions || []).filter(function (y) { return y.id === p[1]; })[0];
      if (x && x.id === 'rest' && s.arrived) api.say('There is no more rest for you on this road.', 'note');
      else if (!x || !actionOpen(api, x)) api.say('That does nothing now.', 'note'); else { var held = x.item && api.has(x.item); x.run(api); if (held) putToUse(s, held.name); }
    }
    else if (p[0] === 'way') { var ow = wayOf(api, p[1], p[2]); if (!ow || adv.obstacles[p[1]].room !== s.room || !wayOpen(api, p[1], ow)) api.say('That does nothing now.', 'note'); else useWay(api, p[1], ow); }
    else if (p[0] === 'use') { var b = findAction(s, p); if (b) useAction(api, b, false); else api.say('You cannot use that now.', 'note'); }
    else api.say('That does nothing here. ' + HELP, 'note');
    /* a failed roll outside a fight may be pushed next (a fight has its own push step); a pushed roll may not */
    if (c !== 'repush' && c !== 'look' && c !== 'help' && c !== 'inventory') s.pushable = !s.pushing && s.failed && !s.fight && !s.over && !s.dying && !s.done && !wasFight && /^(do|way|use|meet)$/.test(p[0]) ? c : null;
    s.failed = false;
    /* a timer on the scene's own clock moves each time the hero does something outside a fight */
    if (!s.over && !s.done && !s.fight && s.adventure === adv.id && /^(go|do|use|way)$/.test(p[0]) && !wasFight) tickTimers(apiFor(s, adv, die), 'action');
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
  function pickOrder(camp, die, extra) {
    var all = camp.scenes.map(function (id) { return scenes()[id]; }).filter(Boolean);
    var pick = function (list) { return list[die(list.length) - 1]; };
    var opening = pick(all.filter(function (x) { return x.act === 'opening'; })), charge = opening.gives;
    var fits = function (x) { return !x.fits || x.fits.indexOf(charge) >= 0; };
    var middle = all.filter(function (x) { return x.act === 'middle' && fits(x); });
    for (var i = middle.length - 1; i > 0; i--) { var j = die(i + 1) - 1, t = middle[i]; middle[i] = middle[j]; middle[j] = t; }
    var LEAN = { early: 0, any: 1, late: 2 };
    middle = middle.slice(0, (camp.middle || 3) + (extra || 0)).map(function (x, k) { return { x: x, k: k }; })
      .sort(function (a, b) { return (LEAN[a.x.lean || 'any'] - LEAN[b.x.lean || 'any']) || a.k - b.k; }).map(function (o) { return o.x; });
    var finale = pick(all.filter(function (x) { return x.act === 'finale' && fits(x); }));
    var order = [opening].concat(middle, [finale]).map(function (x) { return x.id; });
    /* the roads not taken: every other middle scene that fits, in the shuffled order, for the forks (see forkAt) */
    var spare = all.filter(function (x) { return x.act === 'middle' && fits(x) && order.indexOf(x.id) < 0; }).map(function (x) { return x.id; });
    for (var k = spare.length - 1; k > 0; k--) { var m = die(k + 1) - 1, sw = spare[k]; spare[k] = spare[m]; spare[m] = sw; }
    return { charge: charge, order: order, spare: spare };
  }
  function startRun(hero, campId, die, opts) {
    var hard = !!(opts && opts.hard), camp = (root.SacramentSoloCampaigns || {})[campId], o = pickOrder(camp, die, hard ? HARD.scenes : 0);
    var run = { campaign: camp.id, title: camp.title, intro: camp.intro, order: o.order, spare: o.spare, at: 0, charge: o.charge, story: {}, met: [], hard: hard };
    run.cameos = pickCameos(o.order.length, die);
    return start(hero, scenes()[o.order[0]], die, run);
  }
  /* A fork in the road: after a scene, when the next one is in the middle of the road, the hero chooses between it and one road not taken.
     The other road is the first spare scene that keeps the order sensible (early scenes before late ones), so a fork never breaks it. */
  var LEANS = { early: 0, any: 1, late: 2 };
  function forkAt(s) {
    var run = s.run; if (!run || !run.spare || run.at >= run.order.length - 2) return null;
    var k = run.at + 1, here = scenes()[run.order[k]]; if (!here || here.act !== 'middle') return null;
    var lean = function (id) { var x = scenes()[id]; return LEANS[(x && x.lean) || 'any']; };
    var before = scenes()[run.order[k - 1]], after = scenes()[run.order[k + 1]];
    var lo = before && before.act === 'middle' ? lean(before.id) : 0, hi = after && after.act === 'middle' ? lean(after.id) : 2;
    var other = run.spare.filter(function (id) { return scenes()[id] && lean(id) >= lo && lean(id) <= hi; })[0];
    return other ? [run.order[k], other] : null;
  }
  function takeRoad(s, id) {
    var run = s.run, fork = forkAt(s); if (!fork || fork.indexOf(id) < 0) return;
    var k = run.at + 1, was = run.order[k]; if (id === was) return;
    run.order[k] = id; run.spare = run.spare.filter(function (x) { return x !== id; }); run.spare.push(was);
  }
  /* People met on the road (SacramentSoloCameos): a run meets up to two of them, in different scenes, never the last one. */
  var FRIENDS_PER_ROAD = 2;   /* rare, so meeting one is luck (the owner's tick, 2026-11-07) */
  function pickCameos(n, die) {
    var people = (root.SacramentSoloCameos || []).map(function (c) { return c.id; }), out = [];
    for (var i = 0; i < n; i++) out.push('');
    var slots = []; for (var k = 0; k < n - 1; k++) slots.push(k);
    for (var m = 0; m < FRIENDS_PER_ROAD && people.length && slots.length; m++) {
      var who = people.splice(die(people.length) - 1, 1)[0], at = slots.splice(die(slots.length) - 1, 1)[0]; out[at] = who;
    }
    return out;
  }
  /* A friend who asks a riddle first (Simon the Scholar): three answers to tap. The right one gets his help; a wrong one gets nothing. Wits, not a roll. */
  function riddle(api, w, pick) {
    var s = api.s, key = 'riddle_' + w.id, asked = s.flags[key];
    if (!asked) {
      var i = api.die(w.riddles.length) - 1, order = [0, 1, 2];
      for (var k = 2; k > 0; k--) { var j = api.die(k + 1) - 1, t = order[k]; order[k] = order[j]; order[j] = t; }
      s.flags[key] = { i: i, order: order }; if (s.run && s.run.met.indexOf(w.id) < 0) s.run.met.push(w.id);
      api.say(w.ask(w.riddles[i].q), 'npc'); return;
    }
    var n = asked.order[int(pick, 0) - 1]; if (n == null) { api.say('Choose one of the three answers.', 'note'); return; }
    s.flags['cameo_' + w.id] = true; delete s.flags[key];
    api.say('"' + w.riddles[asked.i].a[n] + '," you say.', 'act');
    if (n === 0) w.run(api); else api.say(w.wrong(w.riddles[asked.i].a[0]), 'npc');
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
    s.adventure = adv.id; s.room = adv.start; s.flags = {}; s.fight = null; s.rested = false; s.used = {}; s.bars = {}; s.timers = {}; s.seen = {}; s.done = false; s.found = []; s.escaped = false;
    var a2 = apiFor(s, adv, api.die);
    a2.say('Scene ' + (s.run.at + 1) + ' of ' + s.run.order.length + ': ' + adv.title, 'title');
    if (adv.intro) adv.intro(a2);
    var when = nightfall(s);
    if (when === 'dusk' && s.run.at === 2) a2.say('Out here the light goes earlier every evening. You will walk the last of the road in the dark.', 'note');
    if (when === 'night') a2.say('By the time you reach it the light is gone. It is full night, and every place here is dark: without a light, a WIS check to search or notice is Hard.', 'note');
    enter(a2, adv.start);
  }

  /* The end of a run, for the end card and the Chronicle: the places walked, the foes beaten, what came home, the highest Horror, and a closing line
     from the campaign's endings (chosen by the run itself, so the same run always shows the same line). */
  /* The spells and items that answered something on the road, for the end card. */
  function putToUse(s, name) { if (!s.run || !name) return; var l = s.run.used = s.run.used || []; if (l.indexOf(name) < 0) l.push(name); }
  function summary(s) {
    var run = s.run || { order: [s.adventure], at: 0 }, camp = (root.SacramentSoloCampaigns || {})[run.campaign] || {};
    var walked = run.order.slice(0, run.at + 1), end = s.over || '';
    var lines = (camp.endings || {})[end] || [], pick = 0; walked.concat(s.hero.name).join('|').split('').forEach(function (ch) { pick = (pick * 31 + ch.charCodeAt(0)) >>> 0; });
    var last = scenes()[run.order[run.order.length - 1]];
    return {
      hero: s.hero.name, calling: s.hero.calling || '', road: (run.title || '') + (run.hard ? ': the Hard Road' : ''), hard: !!run.hard, to: last ? last.title : '', end: end, total: run.order.length,
      places: walked.map(function (id) { var x = scenes()[id]; return x ? x.title : id; }), placeIds: walked.slice(), met: (run.met || []).slice(), escapes: int(run.escapes, 0),
      beaten: (run.beaten || []).slice(), finds: runFinds(s).map(function (id) { var it = C.item(id); return it ? it.name : id; }), used: (run.used || []).slice(),
      peak: Math.max(int(run.peak, 0), s.horror), horrorMax: R.HORROR.max, line: lines.length ? lines[pick % lines.length] : '',
      ending: end === 'won' && run.ending && last && last.endings && last.endings[run.ending] ? last.endings[run.ending] : '', endingId: end === 'won' && run.ending ? run.ending : ''
    };
  }

  root.SacramentSolo = { HARD: HARD, nightfall: nightfall, summary: summary, DREAD: DREAD, foeIntent: foeIntent, runFinds: runFinds, VERSION: VERSION, start: start, act: act, choices: choices, parse: parse, valid: valid, inventoryText: inventoryText, HELP: HELP, LIGHTS: LIGHTS, heroActions: heroActions, sceneInfo: sceneInfo, odds: odds, cards: cards, startRun: startRun, forkAt: forkAt, cameoNow: cameoNow, sceneOf: sceneOf, sceneAt: sceneAt, pickOrder: pickOrder };
})(typeof window !== 'undefined' ? window : globalThis);
