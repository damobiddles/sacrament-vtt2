/* Sacrament RPG character sheet: the rules for a hero's numbers and gear, kept apart from the screen and from the server so both play by exactly the same code.
   Loaded as a plain script in the browser and imported (for its effect) in Node: either way it puts SacramentSheetCore on the global object.
   Needs SacramentRules (site/vtt/rules.js) and SACRAMENT_GEAR (site/sheet/gear.js) loaded first.
   A hero here is { name, calling, vow, appearance, background, notes, stats, effort, armour, gear: [{ id, eq, uses? }] }; its hit points are kept by whoever holds the hero
   and are passed in as { cur, max } where a rule moves them. `edit` changes the hero only when the whole change is allowed, and otherwise says why in plain words. */
(function (root, factory) { root.SacramentSheetCore = factory(root.SacramentRules, root.SACRAMENT_GEAR); })(typeof window !== 'undefined' ? window : globalThis, function (R, G) {
  'use strict';
  if (!R || !G) throw new Error('Load rules.js and gear.js before sheet-core.js.');
  var B = R.BUILD, STATS = R.STATS, CATS = R.CATS;
  var TEXT_LIMITS = { name: 60, calling: 30, vow: 120, appearance: 600, background: 1500, notes: 1500 };
  var ALL = G.items.concat(G.relics, G.grimoires, G.found || []), BY = {}; ALL.forEach(function (i) { BY[i.id] = i; });
  /* a thing only the GM gives out: a relic, or anything from the loot table that is not one of the starter items */
  var isFind = function (it) { return !!it && (it.kind === 'relic' || it.found === true); };
  var SPELL = {}; G.spells.forEach(function (s) { SPELL[s.id] = s; });

  var int = function (v, d) { v = parseInt(v, 10); return isFinite(v) ? v : d; };
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  var text = function (v, max) { return v == null ? '' : String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max); };
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  var sum = function (o, keys) { return keys.reduce(function (a, k) { return a + (o[k] || 0); }, 0); };

  function item(id) { return BY[id] || null; }
  /* ---------- items the GM designs ---------- */
  /* A designed item travels with the hero as a copy of its details ("def") on the gear entry, so a later change to the GM's library never changes what a hero holds. Whatever
     arrives is tidied here, by the same code in the browser and on the server. The GM's private notes are never part of it. */
  var CUSTOM_CATS = ['Weapon', 'Armour', 'Curio', 'Mundane', 'Valuable', 'Relic', 'Grimoire'];
  /* A Horror amount as a designed item keeps it: a whole number, or dice such as "d4+2" (see R.horrorSpec). Anything else is 0. */
  function horrorOf(v) { var h = R.horrorSpec(v); return !h ? 0 : h.fixed != null ? h.fixed : R.sayHorrorAmount(v); }
  function makeCustom(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var category = CUSTOM_CATS.indexOf(raw.category) >= 0 ? raw.category : 'Curio';
    var kind = category === 'Weapon' ? 'weapon' : category === 'Armour' ? 'armour' : category === 'Relic' ? 'relic' : category === 'Grimoire' ? 'grimoire' : 'supply';
    var o = { id: /^x[a-z0-9]{1,14}$/.test(raw.id) ? raw.id : 'xcustom', custom: true, found: true, kind: kind, category: category,
      name: text(raw.name, 60).trim() || 'Unnamed find', slots: clamp(int(raw.slots, 1), 1, 4),
      flavour: text(raw.flavour, 400), does: text(raw.does, 600), equippable: kind === 'supply' ? raw.equippable === true : true,
      horrorReason: text(raw.horrorReason, 240), temptsHorror: raw.temptsHorror === true, horror: raw.temptsHorror === true ? horrorOf(raw.horror) : 0 };
    o.cat = CATS.indexOf(raw.cat) >= 0 ? raw.cat : ''; o.roll = o.cat ? (STATS.indexOf(raw.roll) >= 0 ? raw.roll : 'STR') : o.temptsHorror && STATS.indexOf(raw.roll) >= 0 ? raw.roll : '';
    if (kind === 'weapon') o.weaponStyle = ['single', 'heavy', 'reach', 'ranged', 'firearm'].indexOf(raw.weaponStyle) >= 0 ? raw.weaponStyle : 'single';
    if (kind === 'weapon' && o.weaponStyle !== 'single') o.slots = Math.max(2, o.slots);
    if (kind === 'armour') o.armourPart = ['body', 'head', 'shield'].indexOf(raw.armourPart) >= 0 ? raw.armourPart : 'body';
    if (kind === 'weapon' && o.weaponStyle === 'ranged') o.cat = 'weapons';
    if (kind === 'weapon' && o.weaponStyle === 'firearm') o.cat = 'guns';
    if (kind === 'weapon' && (!o.cat || o.cat === 'basic')) o.cat = 'weapons';
    if (kind === 'weapon' && !o.roll) o.roll = o.weaponStyle === 'ranged' || o.weaponStyle === 'firearm' ? 'DEX' : 'STR';
    if (kind === 'weapon' && o.weaponStyle === 'heavy') { o.cat = 'weapons'; if (STATS.indexOf(o.roll) < 0) o.roll = 'STR'; }
    if (kind === 'grimoire') {
      o.slots = 3;
      o.temptsHorror = true; o.cat = ''; o.roll = ''; o.horror = horrorOf(raw.horror) || 1;
      o.spells = (Array.isArray(raw.spells) ? raw.spells : []).filter(function (id, n, ids) { return Object.prototype.hasOwnProperty.call(SPELL, id) && ids.indexOf(id) === n; }).slice(0, 3);
      if (raw.pick) { o.pick = 3; o.pickDie = 6; }
    }
    var healingSource = BY[raw.healingSource];
    if (healingSource && healingOf(healingSource)) {
      o.healingSource = healingSource.id; o.effect = 'healing'; o.cat = ''; o.roll = healingSource.roll || '';
      if (healingSource.uses != null) o.uses = healingSource.uses;
    }
    if (kind === 'armour') o.defence = clamp(int(raw.defence, 0), 0, 5);
    var uses = clamp(int(raw.uses, 0), 0, 20); if (uses > 0 && o.cat) o.uses = uses;
    return o;
  }
  /* The item a gear entry stands for: a designed one carries its own details, anything else is looked up on the gear list. */
  function itemOf(g) { return g ? (g.def ? makeCustom(g.def) : BY[g.id] || null) : null; }
  function spellsOf(it) { return ((it && it.spells) || []).map(function (id) { return SPELL[id]; }).filter(Boolean); }
  function effectLabel(src) { return src.effect === 'healing' || src.heal ? 'Healing' : src.effect === 'esoteric' || !src.cat ? 'Esoteric effect' : 'Damage'; }
  /* Public explanations only: private GM loot notes never enter an item description. */
  function horrorText(src) {
    if (src.kind === 'grimoire' || src.category === 'Grimoire') return 'Horror: healing spells 0; other spells +1. Casting forbidden magic tempts the Horror.';
    if (!src.temptsHorror) return src.effect === 'healing' ? 'No Horror cost: healing spells do not tempt the Horror.' : '';
    return 'Tempts the Horror · +' + R.sayHorrorAmount(src.horror) + '. ' + (src.horrorReason || "Using this item's supernatural power tempts the Horror.");
  }
  function blankHero(name) {
    var h = { name: name || 'New hero', calling: '', vow: '', appearance: '', background: '', notes: '', stats: {}, effort: {}, armour: 0, gear: [] };
    STATS.forEach(function (k) { h.stats[k] = 0; }); CATS.forEach(function (k) { h.effort[k] = 0; });
    return h;
  }

  /* ---------- numbers ---------- */
  function pointsLeft(h) { return B.points - sum(h.stats, STATS); }
  function effortLeft(h) { return B.effortPoints - sum(h.effort, CATS); }

  /* ---------- gear ---------- */
  /* Whether an item can be equipped at all: its own "equippable" flag in gear.js if it has one, otherwise by its type (everything but a supply). Decided from the data, never from a name. */
  function canEquip(it) { return !!it && (typeof it.equippable === 'boolean' ? it.equippable : it.kind !== 'supply'); }
  /* Equipped means marked equipped AND able to be: whatever an old save says, a supply is in the pack. */
  var isEq = function (g) { return g.eq === true && canEquip(itemOf(g)); };
  function slotsUsed(h, set) { return (h.gear || []).reduce(function (a, g) { var it = itemOf(g); return a + ((set === 'eq') === isEq(g) && it ? it.slots : 0); }, 0); }
  function armourPart(it) { return it && it.kind === 'armour' ? it.armourPart || 'body' : ''; }
  function activeArmour(h) {
    var parts = {};
    (h.gear || []).forEach(function (g) {
      var it = itemOf(g), part = armourPart(it); if (!isEq(g) || !part) return;
      var old = parts[part] && itemOf(parts[part]);
      if (!old || (it.defence || 0) > (old.defence || 0) || ((it.defence || 0) === (old.defence || 0) && (it.hearts || 0) > (old.hearts || 0))) parts[part] = g;
    });
    return Object.keys(parts).map(function (k) { return parts[k]; });
  }
  function armourBonus(h) { return activeArmour(h).reduce(function (n, g) { return n + (itemOf(g).defence || 0); }, 0); }
  function equipmentProblems(h) {
    var out = [], active = activeArmour(h);
    ['eq', 'pack'].forEach(function (set) { var used = slotsUsed(h, set); if (used > B.slots) out.push('Your ' + (set === 'eq' ? 'equipped gear uses ' : 'pack uses ') + used + ' of ' + B.slots + ' slots. Move spare items to the pack or put them aside with your GM.'); });
    if ((h.gear || []).some(function (g) { return isEq(g) && armourPart(itemOf(g)) && active.indexOf(g) < 0; })) out.push('Only one body armour, one helmet and one shield can contribute. Move spare armour to the pack.');
    return out;
  }
  function armourConflict(h, it, except) { return armourPart(it) && (h.gear || []).some(function (g) { return g !== except && isEq(g) && armourPart(itemOf(g)) === armourPart(it); }); }
  function weaponHands(it) { return it && ['heavy', 'reach', 'ranged', 'firearm'].indexOf(it.weaponStyle) >= 0 ? 2 : 1; }
  /* Explain the changed category without moving anyone's invested points. */
  function weaponEffortNote(h) {
    return h.effort && h.effort.guns > 0 && (h.gear || []).some(function (g) { var it = itemOf(g); return it && it.kind === 'weapon' && it.cat === 'weapons' && (it.weaponStyle === 'ranged' || it.band === 'far'); }) ? 'Your Guns bonus does not apply to bows, crossbows or slings. These use Weapons d6. If your Guns points were for a bow, lower Guns and add those points to Weapons. Your saved points have been kept.' : '';
  }
  function damageBonus(it) { return it && it.kind === 'weapon' && it.weaponStyle === 'heavy' && it.cat === 'weapons' ? 2 : 0; }
  /* Preserve every saved item. Extra suits/helmets/shields move to the pack, even
     if an old loadout needs manual rearranging afterwards. Preserve wounds. */
  function reconcileArmour(h, hp) {
    var alive = hp && hp.cur > 0;
    var active = activeArmour(h), moved = [];
    (h.gear || []).forEach(function (g) {
      var it = itemOf(g);
      if (isEq(g) && armourPart(it) && active.indexOf(g) < 0) { g.eq = false; hpDelta(hp, it, -1); moved.push(it.name); }
    });
    if (alive && hp.cur === 0) hp.cur = 1;
    return moved;
  }
  /* Defence: 10 + CON + armour. The armour is what is worn plus the GM's own armour number; R.defence applies the caps. */
  function defence(h) { return R.defence(h.stats.CON, int(h.armour, 0) + armourBonus(h)); }
  /* Put right a hero who has a supply marked as equipped (a save from before supplies were kept to the pack): each goes to the pack. Returns the names of the items moved. */
  function unequipSupplies(h, hp) {
    var moved = [];
    (h.gear || []).forEach(function (g) { var it = itemOf(g); if (g.eq === true && it && !canEquip(it)) { g.eq = false; hpDelta(hp, it, -1); moved.push(it.name); } });
    return moved;
  }

  /* ---------- using an item ---------- */
  /* What it means for a hero to use the item at index i of their gear (for a grimoire, one of its spells). If it has an Effort kind ("cat") the table makes a check with the
     stat in "roll" and, on a success, rolls that Effort's die for them. An item with no Effort kind never rolls. */
  function healingOf(src) {
    if (!src) return null;
    if (src.healingSource && BY[src.healingSource]) return healingOf(BY[src.healingSource]);
    var fx = (src.fx || []).filter(function (f) { return f.do === 'heal'; })[0];
    if (!fx && src.effect !== 'healing') return null;
    return { die: fx ? +fx.dice.replace('1d', '') : src.effort || 8, kind: fx ? fx.kind || '' : src.id,
      self: !!(fx && fx.target === 'self'), force: !!(fx && fx.force), tend: (src.fx || []).some(function (f) { return f.do === 'tend'; }) };
  }
  function useOf(h, index, spellId) {
    var g = (h.gear || [])[int(index, -1)]; if (!g) return no('There is nothing there to use.');
    var it = itemOf(g); if (!it) return no('That is not on the gear list.');
    if (slotsUsed(h, 'eq') > B.slots) return no('Your equipped gear uses more than ten slots. Move spare items to the pack before using it.');
    if (weaponHands(it) === 2 && activeArmour(h).some(function (a) { return armourPart(itemOf(a)) === 'shield'; })) return no('The ' + it.name + ' needs both hands. Move your shield to the pack first.');
    var src = it, sp = null, pick = it.kind === 'grimoire' && it.pick ? int(it.pick, 0) : 0;
    if (it.kind === 'grimoire' && !pick) {
      sp = spellId && SPELL[spellId]; if (!sp || (it.spells || []).indexOf(sp.id) < 0) return no('Choose one of the spells in ' + it.name + '.');
      src = sp;
    }
    var label = sp ? sp.name + ' (' + it.name + ')' : it.name;
    /* Something with no Effort die is used only when it tempts the Horror (the table then raises the meter); anything else plain at the table rolls nothing. */
    if (!src.cat && !pick && !src.temptsHorror && !sp && !healingOf(src)) return no((sp ? sp.name : 'The ' + it.name) + ' has no Effort die, so the table rolls nothing for it.');
    if ((it.kind === 'weapon' || it.kind === 'relic' || it.kind === 'grimoire') && !isEq(g)) return no('Equip the ' + it.name + ' first: only equipped weapons, relics and grimoires work.');
    if (it.uses != null && g.uses != null && g.uses <= 0) return no('The ' + it.name + ' has no uses left.');
    /* A grimoire read by the die: the spell is chosen when it is read, so what it rolls is not known yet. */
    if (pick) { var list = spellsOf(it); if (list.length < pick) return no(it.name + ' has fewer than ' + pick + ' spells written in it.'); return { ok: true, item: it, spell: null, gear: g, name: it.name, stat: '', cat: '', pick: pick, pickDie: it.pickDie || pick, spells: list.slice(0, pick) }; }
    if (src.cat && STATS.indexOf(src.roll) < 0) return no(label + ' has no stat to roll.');
    /* With no Effort die, a stat in "roll" still means a check; with no stat it is used without one. */
    return { ok: true, item: it, spell: sp, gear: g, name: label, stat: STATS.indexOf(src.roll) >= 0 ? src.roll : '', cat: src.cat || '', healing: healingOf(src), damageBonus: sp ? 0 : damageBonus(it), horror: src.temptsHorror ? src.horror : 0 };
  }
  /* A spell of a grimoire read by the die, as if the reader had chosen it: the same checks have already been made for the book. */
  function useSpell(u, sp) { return { ok: true, item: u.item, spell: sp, gear: u.gear, name: sp.name + ' (' + u.item.name + ')', stat: STATS.indexOf(sp.roll) >= 0 ? sp.roll : '', cat: sp.cat || '', healing: healingOf(sp), horror: sp.temptsHorror ? sp.horror : 0 }; }
  /* Every way this hero could use what they carry, with a reason where it cannot be done now: for the Use buttons. */
  function actions(h) {
    var out = [];
    (h.gear || []).forEach(function (g, i) {
      var it = itemOf(g); if (!it) return;
      if (it.kind === 'grimoire' && it.pick) { var r = useOf(h, i); out.push({ index: i, spellId: '', ok: r.ok, why: r.why || '', name: 'Read ' + it.name, stat: '', cat: '', pick: it.pick }); }
      else if (it.kind === 'grimoire') { spellsOf(it).forEach(function (s) { if (s.cat || s.temptsHorror || s.heal) { var u = useOf(h, i, s.id); out.push({ index: i, spellId: s.id, ok: u.ok, why: u.why || '', name: s.name + ' (' + it.name + ')', stat: s.roll || '', cat: s.cat || '', horror: s.horror || 0 }); } }); }
      else if (it.cat || it.temptsHorror || healingOf(it)) { var u2 = useOf(h, i); out.push({ index: i, spellId: '', ok: u2.ok, why: u2.why || '', name: it.name, stat: it.roll || '', cat: it.cat || '', horror: it.temptsHorror ? it.horror || 0 : 0 }); }
    });
    out.forEach(function (a) { a.gearKey = h.gear[a.index].key; a.healing = useOf(h, a.index, a.spellId).healing || null; });
    return out;
  }
  /* The details of a designed item as they are kept on a sheet: the item without its marks. */
  function defOf(it) { var o = {}; Object.keys(it).forEach(function (k) { if (k !== 'custom' && k !== 'found') o[k] = it[k]; }); return o; }
  /* An item of the gear list written in the form the GM's designer edits, so a rolled find can be changed before it is handed out. */
  function designOf(it) {
    if (!it) return null;
    var cat = it.kind === 'relic' ? 'Relic' : CUSTOM_CATS.indexOf(it.category) >= 0 ? it.category : it.kind === 'weapon' ? 'Weapon' : it.kind === 'armour' ? 'Armour' : 'Curio';
    var out = { name: it.name, category: cat, cat: it.cat || '', roll: it.roll || '', slots: it.slots || 1, horrorReason: it.horrorReason || '', flavour: it.flavour || '', does: it.does || '', equippable: canEquip(it), temptsHorror: !!it.temptsHorror, horror: it.horror || 0, defence: it.defence || 0, uses: it.uses || 0 };
    var source = BY[it.healingSource || it.id]; if (source && healingOf(source)) out.healingSource = source.id;
    if (it.kind === 'weapon') out.weaponStyle = it.weaponStyle || 'single';
    if (it.kind === 'armour') out.armourPart = armourPart(it);
    if (it.kind === 'grimoire') { out.category = 'Grimoire'; out.spells = (it.spells || []).slice(); if (it.pick) { out.pick = it.pick; out.pickDie = it.pickDie || it.pick; } }
    return out;
  }
  /* The d100 loot table: the item a roll of n gives (1 to 100), or null. */
  /* ---------- the loot tables ---------- */
  /* The d100, and the sub-tables a d100 range can lead into (gear.js "tables"). A sub-table rolls its own die; it may lead into another, no more than three deep. */
  var D100 = { id: 'd100', name: 'Loot', die: 100 }, TABLES = {}; (G.tables || []).forEach(function (t) { TABLES[t.id] = t; });
  var MAX_DEPTH = 3;
  function lootTable(id) { return !id || id === 'd100' ? D100 : TABLES[id] || null; }
  var covers = function (r, n) { return r && n >= r[0] && n <= r[1]; };
  /* What a number gives on a table: { item } or { table } (a sub-table to roll on next), or null. */
  function lootEntry(n, tableId) {
    n = int(n, 0); tableId = tableId || 'd100'; var k;
    for (k = 0; k < ALL.length; k++) if ((ALL[k].table || 'd100') === tableId && covers(ALL[k].loot, n)) return { item: ALL[k] };
    for (k in TABLES) if ((TABLES[k].on || 'd100') === tableId && covers(TABLES[k].loot, n)) return { table: TABLES[k] };
    return null;
  }
  /* The item a d100 number gives directly (null for a number that leads into a sub-table). */
  function lootItem(n) { var e = lootEntry(n, 'd100'); return e && e.item ? e.item : null; }
  /* A whole loot roll: the d100, then each sub-table it leads into. `die(sides)` rolls a die; `typed` is the numbers a GM read off their own dice, in order
     (any not typed are rolled). Returns { ok, steps: [{ table, name, die, n, typed }], item } or { ok: false, why }. */
  function rollLoot(die, typed) {
    var steps = [], tab = D100, q = (typed || []).slice();
    for (var depth = 0; depth <= MAX_DEPTH; depth++) {
      var t = q.length ? q.shift() : null, n = t != null && t !== '' ? int(t, 0) : die(tab.die);
      if (n < 1 || n > tab.die) return no('A d' + tab.die + ' shows 1 to ' + tab.die + '.');
      steps.push({ table: tab.id, name: tab.name, die: tab.die, n: n, typed: t != null && t !== '' });
      var e = lootEntry(n, tab.id); if (!e) return no('Nothing is listed for ' + n + ' on ' + (tab === D100 ? 'the loot table' : 'the ' + tab.name + ' table') + '.');
      if (e.item) return { ok: true, steps: steps, item: e.item };
      tab = e.table;
    }
    return no('The loot tables lead into each other more than ' + MAX_DEPTH + ' deep.');
  }
  /* The words for a roll's steps: "87 → Relics d8: 4". */
  function sayLoot(steps) { return steps.map(function (st, i) { return i ? st.name + ' d' + st.die + ': ' + st.n : String(st.n); }).join(' → '); }

  var magicCount = function (h) { return (h.gear || []).filter(function (g) { var it = itemOf(g); return it && it.temptsHorror; }).length; };
  var grimoireCount = function (h) { return (h.gear || []).filter(function (g) { var it = itemOf(g); return it && it.kind === 'grimoire'; }).length; };

  var setName = function (set) { return set === 'eq' ? 'equipped slots are' : 'pack is'; };
  var full = function (h, set) { return 'Your ' + setName(set) + ' full (' + slotsUsed(h, set) + ' of ' + B.slots + ' used)'; };
  var room = function (h, set, it) { return slotsUsed(h, set) + it.slots <= B.slots; };

  function hpDelta(hp, it, sign) { /* Changing capacity preserves wounds. Equipment never stands up a hero at zero HP. */
    if (!hp || !it || !it.hearts) return;
    var d = it.hearts * R.HEART * sign;
    var before = hp.max; hp.max = Math.max(R.HEART, hp.max + d);
    if (hp.cur > 0) hp.cur = clamp(hp.cur + hp.max - before, 0, hp.max);
  }

  /* ---------- the one entry point ---------- */
  var no = function (why) { return { ok: false, why: why }; };
  /* op: { op: 'text', field, value } | { op: 'score', stat, value } | { op: 'effort', cat, value } | { op: 'add', id } | { op: 'remove', index } | { op: 'move', index, eq }
     who: { gm: boolean }.  hp: { cur, max } or null. */
  function edit(hero, op, who, hp) {
    if (!op || typeof op !== 'object') return no('That is not something the sheet can do.');
    var gm = !!(who && who.gm), h = hero;
    if (op.op === 'text') {
      if (!Object.prototype.hasOwnProperty.call(TEXT_LIMITS, op.field)) return no('That is not a part of the sheet.');
      var v = text(op.value, TEXT_LIMITS[op.field]);
      if (op.field === 'name' && !v.trim()) return no('A hero needs a name.');
      h[op.field] = v; return { ok: true };
    }
    if (op.op === 'score') {
      if (STATS.indexOf(op.stat) < 0) return no('That is not one of the six scores.');
      var old = h.stats[op.stat] || 0, val = op.delta != null ? old + int(op.delta, NaN) : int(op.value, NaN); if (!isFinite(val)) return no('A score is a whole number.');
      var lowering = val < old;
      if (val < 0 && !(val > old)) return no('A score cannot go below 0.');
      if (val > B.scoreMax && !lowering) return no('A score can be at most ' + B.scoreMax + '.');
      var after = sum(h.stats, STATS) - old + val;
      if (after > B.points && !lowering) { var left = pointsLeft(h); return no(left <= 0 ? 'You have no points left: all ' + B.points + ' are spent. Take a point off another score first.' : 'You have only ' + plural(left, 'point', 'points') + ' left for this score.'); }
      h.stats[op.stat] = val; return { ok: true };
    }
    if (op.op === 'effort') {
      if (CATS.indexOf(op.cat) < 0) return no('That is not a kind of Effort.');
      var eo = h.effort[op.cat] || 0, ev = op.delta != null ? eo + int(op.delta, NaN) : int(op.value, NaN); if (!isFinite(ev)) return no('Effort is a whole number.');
      if (ev < 0) return no('Effort cannot go below 0.');
      var eafter = sum(h.effort, CATS) - eo + ev;
      if (eafter > B.effortPoints && ev > eo) { var el = effortLeft(h); return no(el <= 0 ? 'You have no Effort points left: all ' + B.effortPoints + ' are spent. Take a point off another kind first.' : 'You have only ' + plural(el, 'Effort point', 'Effort points') + ' left for this.'); }
      h.effort[op.cat] = ev; return { ok: true };
    }
    h.gear = Array.isArray(h.gear) ? h.gear : [];
    if (op.op === 'add') {
      var it = op.def && gm ? makeCustom(op.def) : item(op.id); if (!it) return no('That is not on the gear list.');
      if (it.kind === 'relic' && !gm) return no('The ' + it.name + ' is a relic. Relics are finds: ask your GM to give you one.');
      if (isFind(it) && !gm) return no('The ' + it.name + ' is a find. Finds are given out by the GM: ask your GM for it.');
      if (it.kind === 'grimoire' && !gm && grimoireCount(h) >= B.playerGrimoires) return no('You can pick one grimoire yourself. Ask your GM for another.');
      if (it.temptsHorror && magicCount(h) >= B.magicItems) return no('A hero carries no more than three relics and grimoires.');
      if (!canEquip(it)) { /* a supply goes to the pack, and only the pack: never into the equipped set to make room */
        if (!room(h, 'pack', it)) return no(full(h, 'pack') + ' and the ' + it.name + ' needs ' + plural(it.slots, 'slot', 'slots') + '. Drop something first.');
        var gp = { id: it.id, eq: false }; if (it.uses) gp.uses = it.uses; if (it.custom) gp.def = defOf(it); h.gear.push(gp); return { ok: true };
      }
      if (armourConflict(h, it) && !room(h, 'pack', it)) return no('You already have ' + armourPart(it) + ' armour equipped and your pack is full. Make room in the pack first.');
      var first = it.kind === 'supply' ? 'pack' : 'eq', second = first === 'eq' ? 'pack' : 'eq', where = !armourConflict(h, it) && room(h, first, it) ? first : room(h, second, it) ? second : null;
      if (!where) return no(full(h, first) + ' and the ' + it.name + ' needs ' + plural(it.slots, 'slot', 'slots') + '. The ' + (second === 'pack' ? 'pack' : 'equipped set') + ' is full too (' + slotsUsed(h, second) + ' of ' + B.slots + '). Drop something first.');
      var g = { id: it.id, eq: where === 'eq' }; if (it.uses) g.uses = it.uses; if (it.custom) g.def = defOf(it); h.gear.push(g);
      if (g.eq) hpDelta(hp, it, 1);
      return { ok: true };
    }
    var i = op.gearKey ? h.gear.findIndex(function (g) { return g.key === op.gearKey; }) : int(op.index, -1), cur = h.gear[i];
    if (op.op === 'remove') {
      if (!cur) return no('There is nothing there to drop.');
      var ri = itemOf(cur); h.gear.splice(i, 1); if (isEq(cur)) hpDelta(hp, ri, -1);
      return { ok: true };
    }
    if (op.op === 'move') {
      if (!cur) return no('There is nothing there to move.');
      var mi = itemOf(cur), toEq = op.eq === true; if (!mi) return no('That is not on the gear list.');
      if (isEq(cur) === toEq) return { ok: true };
      if (toEq && !canEquip(mi)) return no(mi.kind === 'supply' ? 'A supply works from the pack, so it cannot be equipped.' : 'The ' + mi.name + ' cannot be equipped: it works from the pack.');
      if (toEq && armourConflict(h, mi, cur)) return no('Only one ' + armourPart(mi) + ' armour item can be equipped. Move the other one to the pack first.');
      var dest = toEq ? 'eq' : 'pack';
      if (!room(h, dest, mi)) return no(full(h, dest) + ' and the ' + mi.name + ' needs ' + plural(mi.slots, 'slot', 'slots') + '. ' + (toEq ? 'Move something to the pack, or drop it, first.' : 'Drop something first.'));
      cur.eq = toEq; hpDelta(hp, mi, toEq ? 1 : -1);
      return { ok: true };
    }
    return no('That is not something the sheet can do.');
  }

  /* ---------- checking a whole hero (bringing one to a table) ----------
     who.arriving: a hero brought from My heroes may arrive with the relics and grimoires of a ready-made kit (up to three in all); the sheet still will not let a player add them. */
  function problems(h, who) {
    var gm = !!(who && who.gm), keep = gm || !!(who && who.arriving), out = [], spent = sum(h.stats, STATS), espent = sum(h.effort, CATS);
    if (spent > B.points) out.push('The scores add up to ' + spent + ' points; a hero has ' + B.points + '.');
    STATS.forEach(function (k) { var v = h.stats[k] || 0; if (v > B.scoreMax) out.push(k + ' is ' + v + '; a score can be at most ' + B.scoreMax + '.'); if (v < 0) out.push(k + ' is below 0.'); });
    if (espent > B.effortPoints) out.push('The Effort adds up to ' + espent + ' points; a hero has ' + B.effortPoints + '.');
    CATS.forEach(function (k) { if ((h.effort[k] || 0) < 0) out.push(R.CAT_NAMES[k] + ' Effort is below 0.'); });
    var gear = h.gear || [];
    gear.forEach(function (g) {
      var it = itemOf(g); if (!it) { out.push('"' + g.id + '" is not on the gear list.'); return; }
      if (it.kind === 'relic' && !keep) out.push('The ' + it.name + ' is a relic; relics are finds from the GM.');
      else if (isFind(it) && !keep) out.push('The ' + it.name + ' is a find; finds are given out by the GM.');
    });
    if (!keep && grimoireCount(h) > B.playerGrimoires) out.push('A player may pick only ' + B.playerGrimoires + ' grimoire themselves.');
    if (magicCount(h) > B.magicItems) out.push('A hero carries no more than three relics and grimoires.');
    ['eq', 'pack'].forEach(function (set) { if (slotsUsed(h, set) > B.slots) out.push('The ' + (set === 'eq' ? 'equipped set' : 'pack') + ' uses ' + slotsUsed(h, set) + ' of ' + B.slots + ' slots.'); });
    return out.concat(equipmentProblems(h).filter(function (msg) { return /Only one/.test(msg); }));
  }
  /* Whatever arrives is made into a hero of the right shape: unknown things dropped, numbers made whole and kept within what the table allows (the build limits are checked by `problems`). */
  function cleanHero(raw) {
    raw = raw && typeof raw === 'object' ? raw : {};
    var h = blankHero(text(raw.name, TEXT_LIMITS.name).trim() || 'New hero');
    ['calling', 'vow', 'appearance', 'background', 'notes'].forEach(function (f) { h[f] = text(raw[f], TEXT_LIMITS[f]); });
    STATS.forEach(function (k) { h.stats[k] = clamp(int(raw.stats && raw.stats[k], 0), -R.MAX_BONUS, R.MAX_BONUS); });
    CATS.forEach(function (k) { h.effort[k] = clamp(int(raw.effort && raw.effort[k], 0), 0, R.MAX_BONUS); });
    h.armour = clamp(int(raw.armour, 0), 0, R.MAX_BONUS);
    h.gear = (Array.isArray(raw.gear) ? raw.gear : []).filter(function (g) { return g && item(g.id); }).slice(0, 60).map(function (g) { var it = item(g.id), o = { id: it.id, eq: g.eq === true && canEquip(it) }; if (it.uses) o.uses = clamp(int(g.uses, it.uses), 0, it.uses); return o; });
    return h;
  }

  return { weaponEffortNote: weaponEffortNote, armourPart: armourPart, weaponHands: weaponHands, damageBonus: damageBonus, activeArmour: activeArmour, equipmentProblems: equipmentProblems, reconcileArmour: reconcileArmour, TEXT_LIMITS: TEXT_LIMITS, item: item, spellsOf: spellsOf, blankHero: blankHero, pointsLeft: pointsLeft, effortLeft: effortLeft, slotsUsed: slotsUsed, armourBonus: armourBonus, defence: defence,
    edit: edit, problems: problems, cleanHero: cleanHero, items: ALL, itemOf: itemOf, makeCustom: makeCustom, designOf: designOf, healingOf: healingOf, effectLabel: effectLabel, horrorText: horrorText, CUSTOM_CATS: CUSTOM_CATS, isFind: isFind, canEquip: canEquip, unequipSupplies: unequipSupplies, useOf: useOf, useSpell: useSpell, horrorOf: horrorOf, actions: actions, lootItem: lootItem, lootEntry: lootEntry, lootTable: lootTable, rollLoot: rollLoot, sayLoot: sayLoot, LOOT_TABLES: TABLES, LOOT_DEPTH: MAX_DEPTH };
});
