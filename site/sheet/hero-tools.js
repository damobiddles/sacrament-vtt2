/* Local hero generation and reviewed backup restoration. No network requests. */
(function (root) {
  'use strict';
  var H = root.SacramentHeroes, C = root.SacramentSheetCore, R = root.SacramentRules;
  var MAX_BACKUP = 2 * 1024 * 1024;
  var own = function (o, k) { return Object.prototype.hasOwnProperty.call(o, k); };
  var fail = function (message) { return { ok: false, message: message }; };
  function fingerprint(hero) { var h = H.tidy(hero); delete h.id; delete h.restoredFrom; return JSON.stringify(h); }
  function validHero(h) {
    if (!h || typeof h !== 'object' || typeof h.id !== 'string' || !h.id || h.id.length > 40 || !h.stats || typeof h.stats !== 'object' || Array.isArray(h.stats) || !h.effort || typeof h.effort !== 'object' || Array.isArray(h.effort) || !Array.isArray(h.gear) || h.gear.length > 60) return false;
    if (typeof h.name !== 'string' || !h.name.trim()) return false;
    if (h.from != null && (typeof h.from !== 'string' || h.from.length > 60)) return false;
    if (h.restoredFrom != null && (typeof h.restoredFrom !== 'string' || h.restoredFrom.length > 40)) return false;
    if (Object.keys(C.TEXT_LIMITS).some(function (k) { return h[k] != null && (typeof h[k] !== 'string' || h[k].length > C.TEXT_LIMITS[k]); })) return false;
    if (R.STATS.some(function (k) { return h.stats[k] != null && (!Number.isInteger(h.stats[k]) || h.stats[k] < -10 || h.stats[k] > 10); })) return false;
    if (R.CATS.some(function (k) { return h.effort[k] != null && (!Number.isInteger(h.effort[k]) || h.effort[k] < 0 || h.effort[k] > 10); })) return false;
    if (!h.hp || !Number.isInteger(h.hp.max) || h.hp.max < 1 || h.hp.max > 999 || !Number.isInteger(h.hp.cur) || h.hp.cur < 0 || h.hp.cur > h.hp.max) return false;
    if (h.armour != null && (!Number.isInteger(h.armour) || h.armour < 0 || h.armour > 10)) return false;
    return h.gear.every(function (g) { var it = g && typeof g.id === 'string' && C.items.some(function (entry) { return entry.id === g.id; }) ? C.item(g.id) : null; return !!it && !g.def && typeof g.eq === 'boolean' && (g.uses == null || (Number.isInteger(g.uses) && g.uses >= 0 && it.uses != null && g.uses <= it.uses)); });
  }
  function planRestore(st, text) {
    if (st.readOnly) return fail('Existing saved heroes could not be read. Their data is protected; download their backup before attempting recovery.');
    if (st.saveError || st.unsaved) return fail('Save your current changes or download a backup of them before restoring another file.');
    if (typeof text !== 'string' || text.length > MAX_BACKUP) return fail('Choose a heroes backup smaller than 2 MB.');
    var data;
    try { data = JSON.parse(text); } catch { return fail('This file is not readable JSON. Choose a downloaded Sacrament heroes backup.'); }
    if (!data || data.format !== 'sacrament-heroes-backup' || data.version !== 1 || !Array.isArray(data.heroes) || !data.heroes.length) return fail('Choose a Sacrament heroes backup containing saved heroes (version 1).');
    var ids = Object.create(null), remap = Object.create(null), added = [], rows = [], skipped = 0;
    st.heroes.forEach(function (h) { ids[h.id] = true; });
    var sourceIds = Object.create(null);
    for (var i = 0; i < data.heroes.length; i++) {
      var raw = data.heroes[i];
      if (!validHero(raw) || own(sourceIds, raw.id)) return fail('The backup contains an invalid or unsupported hero. Nothing has been changed.');
      sourceIds[raw.id] = true;
      var hero = H.tidy(raw), match = st.heroes.filter(function (h) { return (h.id === raw.id || h.restoredFrom === raw.id) && fingerprint(h) === fingerprint(hero); })[0];
      if (match) { skipped++; remap[raw.id] = match.id; rows.push({ name: hero.name, status: 'Already here — skipped' }); continue; }
      var copy = own(ids, hero.id);
      if (copy) { do { hero.id = H.uid(); } while (own(ids, hero.id)); hero.restoredFrom = raw.id; }
      ids[hero.id] = true; remap[raw.id] = hero.id; added.push(hero);
      rows.push({ name: hero.name, status: copy ? 'Add as a separate restored copy' : 'Add hero' });
    }
    if (st.heroes.length + added.length > H.LIMIT) return fail('This would exceed the ' + H.LIMIT + '-hero limit. Nothing has been imported. Download a backup before removing heroes to make room.');
    var converted = Object.create(null);
    if (data.converted && typeof data.converted === 'object' && !Array.isArray(data.converted)) Object.keys(data.converted).forEach(function (key) { if (!['__proto__', 'constructor', 'prototype'].includes(key) && own(remap, data.converted[key])) converted[key] = remap[data.converted[key]]; });
    var stored;
    try { stored = root.localStorage.getItem(H.KEY); if (stored !== st.storageVersion) return fail('Saved heroes changed in another tab. Reload this page before restoring a backup.'); } catch { return fail('This browser cannot read saved heroes. Your current heroes have not been changed.'); }
    return { ok: true, heroes: added, rows: rows, skipped: skipped, current: own(remap, data.current) ? remap[data.current] : added.length ? added[0].id : st.current, converted: converted, stored: stored, signature: JSON.stringify(st.heroes) };
  }
  function restore(st, plan) {
    if (!plan || !plan.ok || st.readOnly || st.saveError || st.unsaved) return fail('The backup cannot be restored while current heroes are not safely saved.');
    try { if (root.localStorage.getItem(H.KEY) !== plan.stored || JSON.stringify(st.heroes) !== plan.signature) return fail('Your saved heroes changed after the preview. Choose the backup again to review it against the latest heroes.'); } catch { return fail('This browser cannot read saved heroes. Nothing has been imported.'); }
    var converted = Object.create(null);
    Object.keys(st.converted || {}).forEach(function (k) { converted[k] = st.converted[k]; });
    Object.keys(plan.converted).forEach(function (k) { if (!own(converted, k)) converted[k] = plan.converted[k]; });
    var next = { heroes: st.heroes.concat(plan.heroes), current: plan.current || st.current, converted: converted };
    if (!H.save(next)) return fail('The restored heroes could not be saved. Your current heroes have not been replaced. Keep the backup file and try again after making browser storage available.');
    st.heroes = next.heroes; st.current = next.current; st.converted = next.converted; st.storageVersion = next.storageVersion; st.saveError = ''; st.unsaved = false;
    return { ok: true, count: plan.heroes.length, skipped: plan.skipped };
  }

  var names = ['Agathe', 'Benedikt', 'Cordula', 'Dunstan', 'Eulalia', 'Faustin', 'Gisela', 'Hildreth', 'Ignatia', 'Konrad', 'Lucan', 'Mathilde', 'Odo', 'Perpetua', 'Rainald', 'Ursel'];
  var surnames = ['Vey', 'Marrow', 'Ashby', 'Greave', 'Holloway', 'Sallow', 'Tarn', 'Vesper', 'Wick', 'Crane', 'Dray', 'Pell'];
  var vows = ['I will bring the missing home.', 'I will keep the road open until the last pilgrim passes.', 'I will pay the debt my family left behind.', 'I will see my companion buried on consecrated ground.', 'I will carry the truth back to Hollowmere.', 'I will not leave another soul at the gate.'];
  function generate(focus, random) {
    random = random || Math.random;
    var pick = function (a) { return a[Math.min(a.length - 1, Math.floor(random() * a.length))]; };
    if (!['fighter', 'scout', 'scholar', 'healer'].includes(focus)) focus = pick(['fighter', 'scout', 'scholar', 'healer']);
    var h = H.blank(pick(names) + ' ' + pick(surnames)), weapon, book, primary, secondary, third, effort, kit;
    h.vow = pick(vows);
    if (focus === 'fighter') {
      h.calling = pick(['Road warden', 'Mercenary', 'Pilgrim guard']); primary = 'STR'; secondary = 'CON'; third = pick(['WIS', 'DEX', 'CHA']); effort = 'weapons';
      weapon = pick(['sword', 'hatchet', 'spear', 'billhook', 'cudgel']);
      kit = [weapon, pick(['gambeson', 'brigandine'])]; if (C.weaponHands(C.item(weapon)) === 1) kit.push('shield');
      kit = kit.concat(['bandages', 'rope', 'tinder', 'rations']);
    } else if (focus === 'scout') {
      h.calling = pick(['Boundary scout', 'Road guide', 'Hunter']); primary = 'DEX'; secondary = 'WIS'; third = pick(['CON', 'INT', 'STR']); effort = 'weapons';
      kit = [pick(['bow', 'crossbow']), 'gambeson', 'knife', 'rope', 'lantern', 'picks', 'rations', 'tinder'];
    } else {
      book = focus === 'healer' ? 'litany' : pick(['embers', 'dust']);
      h.calling = focus === 'healer' ? pick(['Hospice keeper', 'Pilgrim physician']) : pick(['Forbidden scholar', 'Relic researcher', 'Exiled scribe']);
      primary = focus === 'healer' ? 'WIS' : 'INT'; secondary = 'CON'; third = pick(['DEX', 'CHA', focus === 'healer' ? 'INT' : 'WIS']);
      effort = C.spellsOf(C.item(book)).some(function (sp) { return sp.effect === 'damage'; }) ? 'magic' : 'weapons';
      kit = [book, pick(['cudgel', 'knife']), pick(['cloak', 'gambeson']), 'bandages', 'lantern', 'scrivener', 'rations', 'tinder'];
    }
    h.stats[primary] = 3; h.stats[secondary] = 2; h.stats[third] = 1;
    h.effort[effort] = 3; h.effort.basic = 1;
    kit.forEach(function (id) { var result = C.edit(h, { op: 'add', id: id }, { gm: false }, h.hp); if (!result.ok) throw new Error('Generated kit does not fit: ' + result.why); });
    var problems = C.problems(h, { gm: false }); if (problems.length) throw new Error('Generated hero is not valid: ' + problems.join(' '));
    return h;
  }
  root.SacramentHeroTools = { MAX_BACKUP: MAX_BACKUP, planRestore: planRestore, restore: restore, generate: generate };
})(typeof window !== 'undefined' ? window : globalThis);
