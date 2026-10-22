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
  var LIMIT = 30;
  function read(upgrade) {
    var st = { heroes: [], current: '', converted: {}, moved: [], saveError: '', readOnly: false }, raw = null, text;
    try {
      text = localStorage.getItem(KEY);
      if (text) { raw = JSON.parse(text); if (!raw || !Array.isArray(raw.heroes)) throw new Error('Invalid heroes'); }
    } catch (e) {
      st.readOnly = true; st.unreadableOriginal = text || '';
      st.saveError = 'Saved heroes could not be read. Their existing data has not been replaced. Download a backup before closing this page.';
      return st;
    }
    if (raw) {
      st.heroes = raw.heroes.filter(function (h) { return h && h.stats; }).map(function (h) { var m = equippedSupplies(h); if (m.length) st.moved.push((String(h.name || 'A hero').slice(0, 60)) + ': ' + m.join(', ')); return tidy(h); });
      st.current = String(raw.current || ''); st.converted = raw.converted && typeof raw.converted === 'object' ? raw.converted : {};
      if (st.moved.length) save(st);
      return st;
    }
    try {
      var oldText = localStorage.getItem(OLD), old = oldText && JSON.parse(oldText);
      if (old && Array.isArray(old.heroes)) {
        st.heroes = old.heroes.filter(function (h) { return h && h.id && h.scores && Array.isArray(h.pack); }).map(function (h) { var m = equippedSupplies(h); if (m.length) st.moved.push((String(h.name || 'A hero').slice(0, 60)) + ': ' + m.join(', ')); return fromEngine(upgrade ? upgrade(h) : h); });
        st.current = String(old.current || ''); st.converted = old.converted && typeof old.converted === 'object' ? old.converted : {};
        if (st.heroes.length) save(st);
      }
    } catch (e) { st.readOnly = true; st.unreadableOriginal = oldText || ''; st.saveError = 'Earlier heroes could not be read. Download a backup; their existing data has not been replaced.'; }
    return st;
  }
  function backup(st) {
    var out = { format: 'sacrament-heroes-backup', version: 1, heroes: st.heroes, current: st.current, converted: st.converted };
    if (st.unreadableOriginal) out.unreadableOriginal = st.unreadableOriginal;
    return out;
  }
  function save(st) {
    if (st.readOnly) return false;
    try {
      var data = JSON.stringify({ heroes: st.heroes, current: st.current, converted: st.converted });
      localStorage.setItem(KEY, data);
      if (localStorage.getItem(KEY) !== data) throw new Error('Not saved');
      st.saveError = ''; return true;
    } catch (e) { st.saveError = 'Your latest changes could not be saved in this browser. Keep this page open and download a backup, or try saving again.'; return false; }
  }
  root.SacramentHeroes = { read: read, save: save, blank: blank, fromEngine: fromEngine, uid: uid, KEY: KEY, LIMIT: LIMIT, canAdd: function (st) { return st.heroes.length < LIMIT; }, backup: backup };
})(typeof window !== 'undefined' ? window : globalThis);
