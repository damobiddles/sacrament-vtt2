/* Bringing a character made under the earlier rules over to Sacrament's current ones. Nothing here changes or deletes the old character:
   it reads it, proposes a new hero, and the person decides. The mapping is explicit so a human can read and correct it.
   Usage:  var M = HeartsMigrate(OLD_DATA, SacRules, HEARTS_DATA, HeartsEngine);  M.readOld(localStorage);  M.convert(oldChar, options) */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;

  /* Old item id to the nearest item in the current library, and a word on how near. An id missing here has no equivalent and is kept in the hero's notes. */
  var ITEMS = {
    /* weapons */ w1: ['sword'], w2: ['bow'], w3: ['cudgel', 'a pilgrim’s staff is a stout stick'], w4: ['sword'], w5: ['bow'], w6: ['billhook', 'a maul is a heavy two-hander'], w7: ['blade', 'a saint’s blade is a relic: it costs Horror to swing'],
    w8: ['crossbow'], w9: ['blade', 'a relic blade'], w10: ['spear', 'a glaive reaches'], w11: ['bow'], w12: ['sword'], w13: ['blade', 'a relic blade'], w14: ['bow'], w15: ['blade', 'a relic blade'], w16: ['crossbow'],
    /* armour */ a1: ['gambeson'], a2: ['gambeson'], a3: ['brigandine', 'mail is the nearest medium armour'], a4: ['brigandine'], a5: ['harness'], a6: ['harness'], a7: ['gambeson', 'its shadow-stitching has no equivalent'], a8: ['gambeson', 'its sanctity has no equivalent'],
    a9: ['brigandine'], a10: ['harness'], a11: ['gambeson'],
    /* trinkets */ t2: ['candle', 'the nearest light relic'], t3: ['knucklebone'], t5: ['knucklebone'], t8: ['bell'], t9: ['lantern'], t10: ['censer'], t14: ['knucklebone', 'it healed two; the knucklebone heals one at a time'],
    /* supplies */ s2: ['rope'], s3: ['lantern'], s4: ['bandages'], s5: ['oil', 'holy water becomes holy oil'], s7: ['oil'], s9: ['bandages']
  };
  var SPELL_BOOKS = { arcane: 'embers', heal: 'litany' };

  root.HeartsMigrate = function (OLD, SacRules, NEW, HeartsEngine) {
    var M = {}, R = SacRules(OLD), E = HeartsEngine(NEW);
    var SCORES = ['Body', 'Mind', 'Spirit'];
    M.ITEMS = ITEMS;

    /* Every old character this browser holds: the builder's saved list and the table sheet. Read only. */
    M.readOld = function (store) {
      var out = [], seen = Object.create(null);
      var get = function (k) { try { return JSON.parse(store.getItem(k) || 'null'); } catch (e) { return null; } };
      var b = get('sacrament-builder-v1');
      if (b && b.chars && typeof b.chars === 'object') Object.keys(b.chars).forEach(function (id) { var c = b.chars[id]; if (c && typeof c === 'object' && c.pack && typeof c.pack === 'object' && Array.isArray(c.pack.items)) { out.push({ source: 'the character builder', id: id, raw: c }); seen[id] = 1; } });
      var s = get('sacrament-sheet-v2');
      if (s && typeof s === 'object' && s.pack && typeof s.pack === 'object' && Array.isArray(s.pack.items) && Array.isArray(s.learned) && !(s.id && seen[s.id])) out.push({ source: 'the table sheet', id: String(s.id || 'sheet'), raw: s });
      return out;
    };

    /* What the old character was, in plain terms, read through the old rules. */
    M.describe = function (raw) {
      var c = R.clean(raw), sc = {};
      SCORES.forEach(function (k) { sc[k] = R.score(c, k); });
      var abilities = R.learnedNodes(c).map(function (n) { return n.name; });
      var gear = c.pack.items.map(function (it) {
        var d = it.k === 'custom' ? { n: it.n } : R.item(it);
        return { u: it.u, k: it.k, id: it.id || '', name: d.n || 'Item', equipped: it.u === c.pack.weapon || it.u === c.pack.armour };
      });
      var harm = Math.max(0, Math.min(12, parseInt(raw.harm, 10) || 0));
      return { id: c.id, name: c.name, vow: c.vow, practice: String(raw.practice || ''), level: c.level, scores: sc, abilities: abilities, gear: gear, harm: harm, notes: c.notes || '', c: c };
    };

    /* Scores by rank: the highest old score becomes +2, the next +1, the last +0. Ties keep Body, then Mind, then Spirit first. */
    M.spread = function (scores) {
      var order = SCORES.slice().sort(function (a, b) { return scores[b] - scores[a] || SCORES.indexOf(a) - SCORES.indexOf(b); }), out = {};
      order.forEach(function (k, i) { out[k] = 2 - i; });
      return out;
    };

    /* Propose a new hero. options.spread overrides the scores; options.skip lists old item uids the person unticked.
       Returns { hero, items: [{ from, name, to, toName, note, kept, why }], left: [...], notes }. The hero is a plain object, not yet saved anywhere. */
    M.convert = function (raw, options) {
      options = options || {};
      var d = M.describe(raw), skip = options.skip || [];
      var hero = E.newCharacter({ id: 'x', name: d.name, calling: d.practice, vow: d.vow, scores: options.spread || M.spread(d.scores), kit: [] });
      /* the order a kit is filled in: what was carried in hand and worn, then books a caster's spells call for, then the rest */
      var spells = d.c ? R.learnedNodes(d.c).filter(function (n) { return n.type === 'spell'; }) : [];
      var books = [];
      if (spells.some(function (n) { return n.path === 'Arcane'; })) books.push('embers');
      if (spells.some(function (n) { return n.heal || n.heals; })) books.push('litany');
      var order = d.gear.filter(function (g) { return g.equipped; }).concat(d.gear.filter(function (g) { return !g.equipped; }));
      var plan = [];
      order.slice(0, 2).forEach(function (g) { plan.push({ g: g }); });
      books.forEach(function (b) { plan.push({ book: b }); });
      order.slice(2).forEach(function (g) { plan.push({ g: g }); });
      var items = [], left = [], have = Object.create(null);
      plan.forEach(function (p) {
        if (p.book) { if (have[p.book]) return; var it = E.item(p.book); var ok = E.canAdd(hero, p.book) && magicRoom(hero); if (ok) { E.addItem(hero, p.book); have[p.book] = 1; items.push({ from: 'the spells you knew', name: 'Spells', to: p.book, toName: it.name, note: 'a grimoire in place of the spells you knew', kept: true }); } else left.push({ name: 'the spells you knew', why: 'no room for a grimoire' }); return; }
        var g = p.g, row = { from: g.u, name: g.name, kept: false };
        if (skip.indexOf(g.u) >= 0) { row.why = 'you chose to leave it'; left.push(row); items.push(row); return; }
        var m = g.k !== 'custom' && Object.prototype.hasOwnProperty.call(ITEMS, g.id) ? ITEMS[g.id] : null; // own keys only: an id such as __proto__ is not an item
        if (!m) { row.why = 'no equivalent'; left.push(row); items.push(row); return; }
        var to = m[0], it2 = E.item(to); row.to = to; row.toName = it2.name; row.note = m[1] || '';
        if (have[to]) { row.why = 'you already have one'; left.push(row); items.push(row); return; }
        if (!E.canAdd(hero, to)) { row.why = 'no room: ten slots'; left.push(row); items.push(row); return; }
        if ((it2.kind === 'relic' || it2.kind === 'grimoire') && !magicRoom(hero)) { row.why = 'no room for a fourth relic or grimoire'; left.push(row); items.push(row); return; }
        E.addItem(hero, to); have[to] = 1; row.kept = true; items.push(row);
      });
      var notes = 'Converted from ' + d.name + ' (level ' + d.level + (d.practice ? ', ' + d.practice : '') + '), which was made under the earlier rules and is untouched.' +
        (d.abilities.length ? '\nAbilities you had: ' + d.abilities.join(', ') + '.' : '') +
        (left.length ? '\nLeft behind: ' + left.map(function (l) { return l.name + ' (' + l.why + ')'; }).join('; ') + '.' : '') +
        (d.notes ? '\nYour old notes: ' + d.notes : '');
      hero.notes = notes.slice(0, 1500); hero.from = 'legacy:' + d.id;
      /* the old three scores are six now, and four points of Effort go to what the converted hero carries */
      hero.effort = {}; E.upgrade(hero, options.spread || M.spread(d.scores));
      return { hero: hero, items: items, left: left, notes: hero.notes, old: d };
    };
    function magicRoom(h) { return h.pack.filter(function (p) { var it = E.item(p.id); return it && (it.kind === 'relic' || it.kind === 'grimoire'); }).length < 3; }
    return M;
  };
})();
