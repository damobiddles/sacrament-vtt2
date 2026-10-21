/* Sacrament RPG: the heroes kept in this browser (the My heroes page), under one storage name. A hero here is the sheet's hero (see sheet-core.js) plus an id and hit points.
   The page edits them; the table reads this list to offer "Bring a hero". Heroes saved by the earlier version of the page (storage name sacrament-hearts-v1) are copied in
   the first time, and the old copy is left exactly as it was. Needs sheet-core.js. */
(function (root) {
  'use strict';
  var C = root.SacramentSheetCore, R = root.SacramentRules;
  var KEY = 'sacrament-heroes-v2', OLD = 'sacrament-hearts-v1';
  var clamp = function (n, lo, hi) { return Math.max(lo, Math.min(hi, n)); };
  var n = 0; function uid() { return 'h' + Date.now().toString(36) + (++n).toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  function baseHp(hero) { var hearts = hero.gear.reduce(function (a, g) { var it = C.item(g.id); return a + (g.eq && it && it.hearts ? it.hearts : 0); }, 0); return R.HEART * (1 + hearts); }
  function blank(name) { var h = C.blankHero(name || 'New hero'); h.id = uid(); h.hp = { cur: R.HEART, max: R.HEART }; return h; }
  /* a hero from the earlier version of the page (or the ready-made ones): scores become stats, "ranged" Effort is called guns, the pack becomes gear */
  function fromEngine(c) {
    var eff = Object.assign({}, c.effort || {}); if (eff.ranged != null) { eff.guns = eff.ranged; delete eff.ranged; }
    var h = C.cleanHero({ name: c.name, calling: c.calling, vow: c.vow, notes: c.notes, stats: c.scores, effort: eff,
      gear: (c.pack || []).map(function (p) { var it = C.item(p.id); return { id: p.id, eq: p.eq === true || (p.eq !== false && !!it && it.kind !== 'supply'), uses: p.uses }; }) });
    h.id = c.id || uid(); var max = clamp(parseInt(c.max, 10) || baseHp(h), 1, 999); h.hp = { cur: clamp(parseInt(c.hp, 10) || 0, 0, max), max: max };
    if (c.from) h.from = String(c.from).slice(0, 60);
    return h;
  }
  function tidy(raw) {
    var h = C.cleanHero(raw); h.id = String(raw.id || uid()).slice(0, 40); if (raw.from) h.from = String(raw.from).slice(0, 60);
    var max = clamp(parseInt(raw.hp && raw.hp.max, 10) || baseHp(h), 1, 999); h.hp = { cur: clamp(raw.hp && raw.hp.cur != null ? parseInt(raw.hp.cur, 10) || 0 : max, 0, max), max: max };
    return h;
  }
  /* the supply items a saved hero has marked as equipped (they cannot be: a supply stays in the pack), named for the notice on the page */
  function equippedSupplies(raw) {
    var list = Array.isArray(raw.gear) ? raw.gear : Array.isArray(raw.pack) ? raw.pack : [];
    return list.filter(function (g) { var it = g && C.item(g.id); return g && g.eq === true && it && !C.canEquip(it); }).map(function (g) { return C.item(g.id).name; });
  }
  function read(upgrade) {
    var st = { heroes: [], current: '', converted: {}, moved: [] }, raw = null;
    try { raw = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (raw && Array.isArray(raw.heroes)) { st.heroes = raw.heroes.filter(function (h) { return h && h.stats; }).slice(0, 30).map(function (h) { var m = equippedSupplies(h); if (m.length) st.moved.push((String(h.name || 'A hero').slice(0, 60)) + ': ' + m.join(', ')); return tidy(h); }); if (st.moved.length) save(st); st.current = String(raw.current || ''); st.converted = raw.converted && typeof raw.converted === 'object' ? raw.converted : {}; return st; }
    try {
      var old = JSON.parse(localStorage.getItem(OLD) || 'null');
      if (old && Array.isArray(old.heroes)) {
        st.heroes = old.heroes.filter(function (h) { return h && h.id && h.scores && Array.isArray(h.pack); }).slice(0, 30).map(function (h) { var m = equippedSupplies(h); if (m.length) st.moved.push((String(h.name || 'A hero').slice(0, 60)) + ': ' + m.join(', ')); return fromEngine(upgrade ? upgrade(h) : h); });
        st.current = String(old.current || ''); st.converted = old.converted && typeof old.converted === 'object' ? old.converted : {};
        if (st.heroes.length) save(st);
      }
    } catch (e) {}
    return st;
  }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify({ heroes: st.heroes, current: st.current, converted: st.converted })); } catch (e) {} }
  root.SacramentHeroes = { read: read, save: save, blank: blank, fromEngine: fromEngine, uid: uid, KEY: KEY };
})(typeof window !== 'undefined' ? window : globalThis);
