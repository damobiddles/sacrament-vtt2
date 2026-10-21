/* Sacrament, Hearts prototype: what the three pages share. Heroes and the table are kept in this browser only, under their own key,
   so nothing here can touch a saved character or a live table from the existing site. */
(function () {
  'use strict';
  var D = window.HEARTS_DATA, E = window.HeartsEngine(D);
  var KEY = 'sacrament-hearts-v1';
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sgn = function (n) { return n < 0 ? '−' + Math.abs(n) : '+' + n; };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };

  /* ---------- storage ---------- */
  function blankTable() { return { scene: 12, round: 1, turn: 0, phase: 'players', horror: E.horror(), party: [], foes: [], log: [], pending: [], hearth: 1, foeSeq: 1 }; }
  var S = { heroes: [], current: '', table: blankTable(), converted: {} };
  function read() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        S.heroes = Array.isArray(raw.heroes) ? raw.heroes.filter(function (h) { return h && h.id && h.scores && Array.isArray(h.pack); }).slice(0, 30).map(function (h) { return E.upgrade(h); }) : [];
        S.current = String(raw.current || '');
        S.converted = raw.converted && typeof raw.converted === 'object' ? raw.converted : {};
        if (raw.table && raw.table.horror) S.table = Object.assign(blankTable(), raw.table);
      }
    } catch (e) {}
    S.table.horror = Object.assign(E.horror(), S.table.horror);
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  read();
  var uidN = 0; var uid = function (p) { return p + Date.now().toString(36) + (++uidN).toString(36) + Math.floor(Math.random() * 1296).toString(36); };

  /* a hero from a ready-made definition, or a blank one */
  function ready(def) { var c = E.newCharacter(def); c.id = uid('h'); c.from = def.id; return c; }
  function blank() { var c = E.newCharacter({ id: 'x', name: 'New hero', calling: '', vow: '', scores: { STR: 2, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 2, ranged: 1, magic: 0, ultimate: 0 }, kit: [] }); c.id = uid('h'); return c; }

  /* ---------- small renderers ---------- */
  function hearts(c) {
    var n = Math.ceil(c.max / E.HEART), out = '';
    for (var i = 0; i < n; i++) {
      var inHeart = Math.max(0, Math.min(E.HEART, c.hp - i * E.HEART));
      out += '<span class="heart" title="' + inHeart + ' of ' + E.HEART + '"><i style="height:' + Math.round(inHeart * 10) + '%"></i></span>';
    }
    return '<span class="hearts" role="img" aria-label="' + c.hp + ' of ' + c.max + ' points">' + out + '</span>';
  }
  function chip(n, v, cls) { return '<span class="die d' + n + (cls ? ' ' + cls : '') + '">' + v + '</span>'; }
  function dieRow(r) {
    var h = '';
    if (r.check) h += chip(20, r.check.d, r.check.crit ? 'max' : r.check.fumble ? 'min' : '') + '<span class="eq"> ' + sgn(r.check.mod) + ' = <b>' + r.check.total + '</b> vs TN ' + r.check.tn + '</span> ';
    if (r.effort) h += r.effort.rolls.map(function (v) { return chip(r.effort.die, v); }).join('') + '<span class="eq"> = <b>' + r.effort.total + '</b></span>';
    return h;
  }
  function track(h, opts) {
    opts = opts || {};
    var cells = '';
    for (var i = 1; i <= D.HORROR.top; i++) {
      var thr = D.HORROR.thresholds.indexOf(i) >= 0;
      cells += '<li class="' + (i <= h.pos ? 'on' : '') + (thr ? ' thr' : '') + '"' + (thr ? ' title="' + esc(D.AFTERSHOCKS[i].title) + '"' : '') + '><span>' + i + '</span></li>';
    }
    return '<div class="track" role="img" aria-label="The Looming Horror: ' + h.pos + ' of 21"><ol>' + cells + '</ol><p class="trackname"><b>Looming Horror ' + h.pos + ' / 21</b>' +
      (h.pos >= 21 ? ' · <em>at the Arrival: every further point is Strain</em>' : h.pos >= 15 ? ' · <em>the Turning</em>' : h.pos >= 9 ? ' · <em>the Stirring</em>' : '') + (h.feeds ? ' · <em>the Horror feeds (+1)</em>' : '') + (h.noMagic ? ' · <em>no magic</em>' : '') + '</p></div>';
  }
  function itemCard(it, extra) {
    var bits = [it.slots + ' slot' + (it.slots > 1 ? 's' : ''), it.use === 'Always' ? 'carried' : it.use];
    if (it.roll) bits.push(it.roll + ' check');
    if (it.effort) bits.push('Effort d' + it.effort);
    if (it.defence) bits.push('Defence ' + sgn(it.defence));
    if (it.horror) bits.push('<b class="hz">+' + it.horror + ' Horror</b>');
    return '<div class="icard k-' + it.kind + '"><h4>' + esc(it.name) + '</h4><p class="meta">' + bits.join(' · ') + '</p><p>' + esc(it.does) + '</p>' + (extra || '') + '</div>';
  }
  /* A Horror gain just made: queue the aftershocks that were crossed, and say so. */
  function afterRaise(T, r, who) {
    var said = [];
    if (r && r.applied) said.push('Horror +' + r.applied + ' (' + r.before + ' → ' + r.after + ')');
    if (r && r.strain) said.push('Strain: ' + r.strain + ' damage to ' + (who || 'the one who paid'));
    (r && r.crossed || []).forEach(function (t) { T.pending.push(t); said.push('The ladder reaches ' + t + ': ' + D.AFTERSHOCKS[t].title); });
    return said;
  }
  function logLine(T, text, cls) { T.log.unshift({ t: text, c: cls || '' }); T.log = T.log.slice(0, 60); }

  window.HeartsUI = { D: D, E: E, S: S, save: save, read: read, uid: uid, ready: ready, blank: blank, esc: esc, sgn: sgn, clone: clone, hearts: hearts, chip: chip, dieRow: dieRow, track: track, itemCard: itemCard, afterRaise: afterRaise, logLine: logLine, blankTable: blankTable, KEY: KEY };
})();
