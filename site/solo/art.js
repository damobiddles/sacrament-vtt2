/* Sacrament RPG solo: the pictures, as miniatures from an illuminated book (owner, 2026-11-06: "medieval / renaissance style").
   Every picture is drawn here as SVG (no image files) the way a limner painted a page: flat mineral colours (lapis, vermilion, verdigris, ochre,
   lead white) inside a dark ink outline, night skies of lapis sown with gold stars, walls hung with a chequered diaper, light shown as gold rays,
   the whole thing on vellum inside a gilded border. The movement is small and slow: stars glinting, a flame breathing, mist drifting, a hem stirring.
   It all stops for anyone who asks their device for less motion (solo.css). scene(name, state, id) returns one picture; id keeps pattern and
   gradient names apart when two pictures are on the page. */
(function (root) {
  'use strict';
  var W = 320, H = 192;
  function hash(t) { var h = 7; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
  function rnd(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  /* the limner's colours */
  var P = {
    ink: '#2a1a10', vellum: '#efe3c4', parch: '#dccb9e', gold: '#c99a2e', goldHi: '#ecc85e', verm: '#b0392a', rose: '#c27868', lapis: '#24407e',
    azure: '#5276b4', deep: '#16244a', verd: '#2f6a52', sap: '#62803a', moss: '#4a6630', ochre: '#c2903e', earth: '#8a6a3e', umber: '#5a3e26',
    stone: '#b3a78e', stoneDk: '#857a64', white: '#f4ecd8', flesh: '#e6c8a4', grey: '#8c8a86'
  };
  /* an ink outline; the thicker one is for figures, which are drawn small */
  var O = ' stroke="' + P.ink + '" stroke-width=".9" stroke-linejoin="round"', OF = ' stroke="' + P.ink + '" stroke-width="1.6" stroke-linejoin="round"';

  /* ---------- the hero: a pilgrim in a hooded mantle, face shown plainly, as the old painters did ---------- */
  /* Drawn in a 60 × 140 box, feet at the bottom. The mantle's colour follows what they carry: lapis for a book of spells, vermilion for armour, verdigris otherwise. */
  function hero(s, id, x, y, scale, lamp) {
    var h = (s && s.hero) || { name: 'Pilgrim', gear: [] }, C = root.SacramentSheetCore;
    var kinds = (h.gear || []).map(function (g) { var it = C && C.itemOf(g); return it ? it.kind + ':' + (g.eq ? 1 : 0) + ':' + (it.weaponStyle || '') : ''; }).join(' ');
    var cloak = /grimoire:1/.test(kinds) ? P.lapis : /armour:1/.test(kinds) ? P.verm : P.verd;
    var lining = /grimoire:1/.test(kinds) ? P.verm : P.ochre;
    var weapon = /weapon:1:ranged|weapon:1:crossbow/.test(kinds) ? 'bow' : /weapon:1/.test(kinds) ? 'blade' : '';
    var under = ['#8a6a3e', '#7a5a7a', '#6a6a52'][hash(h.name) % 3];
    return '<g class="who hero" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">'
      + '<ellipse cx="30" cy="139" rx="24" ry="3.4" fill="' + P.ink + '" opacity=".35"/>'
      + (weapon === 'bow' ? '<path d="M6 38 Q-10 80 8 124" stroke="' + P.umber + '" stroke-width="3" fill="none"/><path d="M6 38 Q-10 80 8 124" stroke="' + P.ink + '" stroke-width=".8" fill="none"/><path d="M6 38 L8 124" stroke="' + P.white + '" stroke-width=".7"/>' : '')
      + (weapon === 'blade' ? '<path d="M9 92 L1 136 L4 137 L12 93 Z" fill="' + P.white + '"' + OF + '/><path d="M3 88 L17 92" stroke="' + P.gold + '" stroke-width="3" stroke-linecap="round"/><path d="M10 82 L8 90" stroke="' + P.umber + '" stroke-width="3"/>' : '')
      /* the under-robe, seen at the hem */
      + '<path d="M12 120 L48 120 L50 136 L10 136 Z" fill="' + under + '"' + OF + '/>'
      /* the mantle: falling in long straight folds, its lining turned out at the edge; the hem stirs */
      + '<path d="M18 30 C10 50 8 80 7 104 C6 116 5 124 4 130 L56 130 C55 122 54 114 53 104 C51 80 48 52 42 30 Z" fill="' + cloak + '"' + OF + '/>'
      + '<path class="hem" d="M4 130 L56 130 L55 124 L5 124 Z" fill="' + lining + '"' + OF + '/>'
      + '<path d="M22 44 C20 70 18 98 16 124 M30 46 V124 M38 44 C40 70 42 98 44 124" stroke="' + P.ink + '" stroke-width="1.1" fill="none" opacity=".55"/>'
      + '<path d="M44 34 C48 60 50 90 52 122" stroke="' + lining + '" stroke-width="2.6" fill="none"/>'
      /* feet */
      + '<path d="M18 136 h8 v3 h-10 Z M34 136 h8 l2 3 h-10 Z" fill="' + P.umber + '"' + OF + '/>'
      /* the hood, and the face inside it */
      + '<path d="M15 34 C11 8 49 6 45 34 C47 42 40 47 30 47 C20 47 13 42 15 34 Z" fill="' + cloak + '"' + OF + '/>'
      + '<path d="M21 31 C21 20 39 20 39 31 C39 39 35 42 30 42 C25 42 21 39 21 31 Z" fill="' + P.flesh + '"' + OF + '/>'
      + '<path d="M24.5 29 q2 -1.4 4 0 M31.5 29 q2 -1.4 4 0" stroke="' + P.ink + '" stroke-width=".9" fill="none"/>'
      + '<circle class="blink" cx="26.5" cy="31" r=".95" fill="' + P.ink + '"/><circle class="blink" cx="33.5" cy="31" r=".95" fill="' + P.ink + '"/>'
      + '<path d="M30 31 L29 35 L30.6 35.4" stroke="' + P.ink + '" stroke-width=".7" fill="none"/><path d="M27.6 38 Q30 38.8 32.4 38" stroke="' + P.verm + '" stroke-width="1" fill="none"/>'
      /* the scallop shell of a pilgrim on the breast */
      + '<path d="M26 54 Q30 48 34 54 L30 59 Z" fill="' + P.white + '"' + OF + '/>'
      /* hand and lamp, the light shown as gold rays */
      + (lamp ? '<path d="M50 70 L58 86" stroke="' + cloak + '" stroke-width="7" stroke-linecap="round"/><path d="M50 70 L58 86" stroke="' + P.ink + '" stroke-width=".6"/><circle cx="58.5" cy="87" r="3" fill="' + P.flesh + '"' + OF + '/><path d="M60 88 V93" stroke="' + P.ink + '" stroke-width="1.2"/>'
        + '<g class="glow">' + rays(60, 100, 9, 26, 14) + '</g>'
        + '<path d="M55 93 H65 L64 107 H56 Z" fill="' + P.gold + '"' + OF + '/><path d="M57 96 H63 V104 H57 Z" fill="' + P.goldHi + '"/><ellipse class="flame" cx="60" cy="100" rx="1.8" ry="3" fill="' + P.verm + '"/>' : '')
      + '</g>';
  }
  /* light as the painters showed it: straight gold rays from a point */
  function rays(cx, cy, r0, r1, n) {
    var out = '';
    for (var i = 0; i < n; i++) { var a = (i / n) * Math.PI * 2 + 0.2, l = i % 2 ? r1 : r1 * 0.7;
      out += '<path d="M' + (cx + Math.cos(a) * r0).toFixed(1) + ' ' + (cy + Math.sin(a) * r0).toFixed(1) + ' L' + (cx + Math.cos(a) * l).toFixed(1) + ' ' + (cy + Math.sin(a) * l).toFixed(1) + '" stroke="' + P.goldHi + '" stroke-width="1.1" opacity=".85"/>'; }
    return out;
  }

  /* ---------- the Candle-Eater: tall, starved, made of old tallow ---------- */
  function eater(id, x, y, scale, hurtRatio) {
    var melt = hurtRatio < 0.66 ? '<path d="M30 58 C28 66 31 70 29 78" stroke="' + P.ink + '" stroke-width="1.2" fill="none"/>' : '';
    melt += hurtRatio < 0.33 ? '<path d="M50 70 C52 80 49 86 51 96 M24 90 C22 98 25 104 23 112" stroke="' + P.ink + '" stroke-width="1.2" fill="none"/>' : '';
    return '<g class="who foe" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><g class="sway">'
      + '<ellipse cx="40" cy="138" rx="32" ry="4" fill="' + P.ink + '" opacity=".35"/>'
      + '<g class="glow">' + rays(45, 6, 8, 24, 12) + '</g>'
      /* a hunched body, long arms hanging past the knees, a puddle of wax at its feet */
      + '<path d="M44 26 C58 28 64 44 62 60 C66 80 64 104 60 136 L48 136 C48 118 46 104 42 96 C38 106 36 120 34 136 L22 136 C20 112 18 90 22 70 C18 56 26 30 44 26 Z" fill="url(#' + id + 'wax)"' + OF + '/>'
      + '<path d="M24 62 C14 78 10 100 8 122 C7 128 4 132 6 134 C10 130 12 126 13 120 C16 104 20 88 28 74 Z" fill="url(#' + id + 'wax)"' + OF + '/>'
      + '<path d="M60 58 C70 72 74 96 74 116 C75 122 78 126 76 128 C72 126 70 122 70 116 C68 98 64 82 56 70 Z" fill="url(#' + id + 'wax)"' + OF + '/>'
      + '<ellipse cx="40" cy="137" rx="30" ry="3.5" fill="' + P.white + '"' + OF + '/>'
      + melt
      /* the face: no face, two soft hollows and a mouth sagging open */
      + '<path d="M34 41 C35 37 41 37 42 41 C42 48 40 54 38 60 C36 54 34 48 34 41 Z" fill="' + P.ink + '"/><path d="M47 41 C48 37 54 37 55 41 C55 47 53 52 51 57 C49 52 47 47 47 41 Z" fill="' + P.ink + '"/>'
      + '<circle cx="38" cy="45" r="1.2" fill="' + P.goldHi + '" class="blink"/><circle cx="51" cy="45" r="1.2" fill="' + P.goldHi + '" class="blink"/>'
      + '<path d="M41 62 C42 60 47 60 48 62 C49 70 47 78 44.5 82 C42 78 40 70 41 62 Z" fill="' + P.verm + '"' + OF + '/>'
      /* wax running from the crown, and a drop that falls */
      + '<path d="M34 30 C33 36 35 40 33 46 M54 30 C55 36 53 40 55 44" stroke="' + P.ink + '" stroke-width="1" fill="none" opacity=".6"/>'
      + '<circle class="drip" cx="10" cy="128" r="1.6" fill="' + P.white + '"' + O + '/>'
      /* the wick and its flame */
      + '<path d="M44 26 Q42 18 45 12" stroke="' + P.ink + '" stroke-width="2" fill="none"/>'
      + '<path class="flame" d="M45 -4 C51 4 51 10 45 14 C39 10 40 4 45 -4 Z" fill="' + P.verm + '"' + OF + '/><path class="flame" d="M45 3 C47 6 47 10 45 12 C43 10 43 6 45 3 Z" fill="' + P.goldHi + '"/>'
      + '</g></g>';
  }

  /* ---------- the other foes, as a bestiary paints them, each in the same 80 × 140 box, feet at the bottom ---------- */
  var FOES = {
    rats: function () {
      var out = '<ellipse cx="40" cy="138" rx="40" ry="4" fill="' + P.ink + '" opacity=".3"/>', r = rnd(5);
      for (var i = 0; i < 9; i++) { var x = 4 + r() * 66, y = 112 + r() * 22, sc = 0.7 + r() * 0.5, flip = r() > 0.5 ? -1 : 1;
        out += '<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') scale(' + (flip * sc).toFixed(2) + ' ' + sc.toFixed(2) + ')"><path d="M-10 3 C-18 4 -22 10 -30 6" stroke="' + P.rose + '" stroke-width="1.4" fill="none"/><path d="M-10 4 C-12 -6 2 -9 9 -3 L14 -1 L9 2 C6 6 -6 8 -10 4 Z" fill="' + P.umber + '"' + OF + '/><path d="M2 -6 q2 -4 4 0" fill="' + P.rose + '"' + O + '/><circle cx="9" cy="-2" r="1" fill="' + P.verm + '" class="blink"/></g>'; }
      return out;
    },
    hound: function () {
      return '<ellipse cx="40" cy="139" rx="36" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M8 96 C2 92 0 84 4 78" stroke="' + P.ink + '" stroke-width="3" fill="none"/>'
        + '<path d="M8 96 C14 84 34 82 52 86 C60 76 70 74 76 80 C80 84 78 90 72 92 C70 98 66 100 62 100 L60 136 L55 136 L54 106 C44 108 30 108 22 104 L20 136 L15 136 L14 104 C8 108 4 104 8 96 Z" fill="#3a3034"' + OF + '/>'
        + '<path d="M20 94 C30 90 44 92 50 96 M24 100 q4 -4 8 0 M36 100 q4 -4 8 0" stroke="' + P.grey + '" stroke-width=".9" fill="none"/>'
        + '<path d="M70 76 L72 64 L76 76 Z" fill="#3a3034"' + OF + '/>'
        + '<circle cx="72" cy="82" r="1.6" fill="' + P.goldHi + '" class="blink"/><path d="M72 92 C76 96 78 100 74 102" stroke="' + P.verm + '" stroke-width="2" fill="none"/><path d="M70 90 l2 3 l2 -3 l2 3" stroke="' + P.white + '" stroke-width=".8" fill="none"/>';
    },
    acolyte: function () {
      return '<ellipse cx="40" cy="139" rx="30" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M26 40 C18 70 14 110 10 138 L70 138 C66 110 62 70 54 40 Z" fill="#6f8a7a"' + OF + '/>'
        + '<path d="M20 90 C30 96 50 96 60 90 M16 116 C30 122 50 122 64 116 M32 50 C30 80 28 110 26 136 M48 50 C50 80 52 110 54 136" stroke="' + P.ink + '" stroke-width="1" fill="none" opacity=".6"/>'
        + '<path d="M22 60 q6 6 0 12 M58 70 q-6 6 0 12" stroke="' + P.verd + '" stroke-width="2" fill="none"/>'
        + '<circle cx="40" cy="30" r="12" fill="#c8cdbc"' + OF + '/><path d="M28 28 C32 14 48 14 52 28 C48 22 32 22 28 28 Z" fill="' + P.verd + '"' + OF + '/>'
        + '<path d="M34 30 h4 M42 30 h4" stroke="' + P.ink + '" stroke-width="1.4"/><path d="M37 37 q3 -2 6 0" stroke="' + P.ink + '" stroke-width="1" fill="none"/>'
        + '<path d="M54 56 L66 88" stroke="' + P.ink + '" stroke-width="1"/><path d="M62 88 H70 L68 98 H64 Z" fill="' + P.gold + '"' + OF + '/>'
        + '<circle class="drip" cx="30" cy="132" r="1.3" fill="' + P.azure + '"/>';
    },
    penitent: function () {
      return '<ellipse cx="40" cy="139" rx="26" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M28 44 C22 64 24 84 26 100 L22 138 L30 138 L36 104 L44 104 L50 138 L58 138 L54 100 C56 84 58 64 52 44 Z" fill="' + P.flesh + '"' + OF + '/>'
        + '<path d="M26 92 L54 92 L56 112 L24 112 Z" fill="' + P.parch + '"' + OF + '/>'
        + '<path d="M28 50 C20 64 14 76 12 86 M52 50 C60 60 66 66 70 64" stroke="' + P.flesh + '" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M28 50 C20 64 14 76 12 86 M52 50 C60 60 66 66 70 64" stroke="' + P.ink + '" stroke-width=".7" fill="none"/>'
        + '<path d="M70 64 L76 50 M70 64 L80 56 M70 64 L82 64" stroke="' + P.umber + '" stroke-width="1.2" fill="none"/>'
        + '<path d="M32 58 l10 14 M46 56 l-8 16 M30 70 l12 10" stroke="' + P.verm + '" stroke-width="1.4"/>'
        + '<ellipse cx="40" cy="34" rx="9" ry="11" fill="' + P.flesh + '"' + OF + '/><path d="M31 30 C32 20 48 20 49 30" stroke="' + P.umber + '" stroke-width="3" fill="none"/><path d="M34 34 h4 M42 34 h4" stroke="' + P.ink + '" stroke-width="1.4"/><path d="M36 41 Q40 39 44 41" stroke="' + P.ink + '" stroke-width="1" fill="none"/>';
    },
    sister: function () {
      return '<ellipse cx="40" cy="139" rx="28" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path class="hem" d="M24 44 C16 72 12 106 8 138 L72 138 C68 106 64 72 56 44 Z" fill="#9a968c"' + OF + '/>'
        + '<path d="M30 54 C28 80 26 110 24 136 M40 56 V136 M50 54 C52 80 54 110 56 136" stroke="' + P.ink + '" stroke-width="1" fill="none" opacity=".5"/>'
        + '<path d="M26 40 C22 22 58 22 54 40 L60 74 C52 66 28 66 20 74 Z" fill="' + P.white + '"' + OF + '/><path d="M28 30 C30 20 50 20 52 30" stroke="' + P.ink + '" stroke-width="1.6" fill="none"/>'
        + '<ellipse cx="40" cy="40" rx="8" ry="10" fill="#d8d6cc"' + OF + '/><path d="M35 39 q2 1.4 4 0 M41 39 q2 1.4 4 0" stroke="' + P.ink + '" stroke-width="1.1" fill="none"/><ellipse cx="40" cy="46" rx="2" ry="1.4" fill="' + P.ink + '"/>'
        + '<path d="M30 76 C34 84 46 84 50 76" stroke="#d8d6cc" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M30 76 C34 84 46 84 50 76" stroke="' + P.ink + '" stroke-width=".7" fill="none"/>'
        + '<g class="glow"><path d="M60 30 q4 -6 8 -2 M64 20 q4 -6 8 -2 M58 14 q4 -6 8 -2" stroke="' + P.goldHi + '" stroke-width="1.2" fill="none"/></g>';
    },
    boar: function () {
      return '<ellipse cx="40" cy="139" rx="40" ry="3.6" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M2 112 C0 96 12 84 30 82 C48 80 64 82 74 94 C80 98 84 104 82 110 C80 116 74 116 70 114 L68 136 L62 136 L60 120 C46 124 30 124 20 120 L18 136 L12 136 L10 120 C4 120 2 116 2 112 Z" fill="#2e2620"' + OF + '/>'
        + '<path d="M14 92 C20 86 30 84 40 86 M10 104 C20 100 34 100 46 104 M50 90 C56 96 58 104 56 112" stroke="' + P.verm + '" stroke-width="1.4" fill="none" class="glow"/>'
        + '<path d="M18 84 l4 -8 l4 7 l4 -8 l4 7 l4 -8 l4 8" stroke="#2e2620" stroke-width="2" fill="none"/>'
        + '<circle cx="70" cy="98" r="1.8" fill="' + P.goldHi + '" class="blink"/><path d="M78 108 C84 104 86 98 84 94" stroke="' + P.white + '" stroke-width="2" fill="none"/><path d="M58 88 L62 80 L66 90 Z" fill="#2e2620"' + OF + '/>'
        + '<path class="fog f1" d="M4 80 q6 -8 2 -16 q-4 -6 2 -12" stroke="' + P.grey + '" stroke-width="2" fill="none" opacity=".6"/><path class="fog f2" d="M30 78 q6 -8 2 -16 q-4 -6 2 -12" stroke="' + P.grey + '" stroke-width="2" fill="none" opacity=".5"/>';
    },
    tollman: function () {
      return '<ellipse cx="40" cy="139" rx="26" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M26 44 C20 74 18 106 16 136 L34 136 L36 104 L44 104 L46 136 L64 136 C62 106 60 74 54 44 Z" fill="' + P.umber + '"' + OF + '/>'
        + '<path d="M40 46 V100 M28 70 H52" stroke="' + P.gold + '" stroke-width="1" fill="none" opacity=".7"/><circle cx="36" cy="58" r="1.4" fill="' + P.gold + '"/><circle cx="36" cy="68" r="1.4" fill="' + P.gold + '"/><circle cx="36" cy="78" r="1.4" fill="' + P.gold + '"/>'
        + '<path d="M54 56 C62 62 70 66 76 64" stroke="' + P.umber + '" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M54 56 C62 62 70 66 76 64" stroke="' + P.ink + '" stroke-width=".8" fill="none"/><path d="M74 60 C80 58 82 64 78 68 C76 70 72 68 74 64 Z" fill="' + P.grey + '"' + OF + '/>'
        + '<ellipse cx="40" cy="32" rx="9" ry="12" fill="' + P.grey + '"' + OF + '/><path d="M28 24 H52 L48 14 H32 Z M24 24 H56" fill="' + P.ink + '" stroke="' + P.ink + '" stroke-width="1.6"/>'
        + '<path d="M35 32 h3 M42 32 h3" stroke="' + P.ink + '" stroke-width="1.6"/><path d="M36 40 h8" stroke="' + P.ink + '" stroke-width="1"/>';
    },
    pardoner: function () {
      return '<ellipse cx="40" cy="139" rx="26" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M26 46 C20 74 18 106 16 136 L34 136 L37 106 L43 106 L46 136 L64 136 C62 106 60 74 54 46 Z" fill="' + P.ochre + '"' + OF + '/>'
        + [[30, 60], [48, 64], [28, 84], [50, 90], [34, 110], [46, 118], [40, 76]].map(function (d) { return '<circle cx="' + d[0] + '" cy="' + d[1] + '" r="2.2" fill="' + P.grey + '"' + O + '/>'; }).join('')
        + '<path d="M54 58 C62 64 66 70 70 76" stroke="' + P.ochre + '" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M54 58 C62 64 66 70 70 76" stroke="' + P.ink + '" stroke-width=".8" fill="none"/>'
        + '<circle cx="71" cy="78" r="2.6" fill="' + P.flesh + '"' + O + '/><path d="M72 78 L80 70" stroke="' + P.white + '" stroke-width="1.6"/><path d="M72 78 L80 70" stroke="' + P.ink + '" stroke-width=".4"/>'
        + '<ellipse cx="40" cy="34" rx="9" ry="11" fill="' + P.flesh + '"' + OF + '/><path d="M26 26 H54 L50 18 C46 12 34 12 30 18 Z" fill="' + P.verm + '"' + OF + '/>'
        + '<path d="M35 33 q2 -1.4 4 0 M41 33 q2 -1.4 4 0" stroke="' + P.ink + '" stroke-width="1" fill="none"/><path d="M35 40 Q40 44 45 40" stroke="' + P.ink + '" stroke-width="1" fill="none"/>';
    },
    deacon: function () {
      return '<ellipse cx="40" cy="139" rx="28" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path class="hem" d="M24 44 C16 72 12 106 8 138 L72 138 C68 106 64 72 56 44 Z" fill="#2c2630"' + OF + '/>'
        + '<path d="M36 46 L30 136 M44 46 L50 136" stroke="' + P.verm + '" stroke-width="3" fill="none"/>'
        + '<path d="M30 54 C28 80 26 110 24 136 M50 54 C52 80 54 110 56 136" stroke="' + P.grey + '" stroke-width=".8" fill="none" opacity=".5"/>'
        + '<path d="M24 56 C16 64 14 72 18 78" stroke="#2c2630" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M24 56 C16 64 14 72 18 78" stroke="' + P.ink + '" stroke-width=".8" fill="none"/>'
        + '<path d="M6 70 L20 74 L34 70 L34 88 L20 92 L6 88 Z" fill="' + P.white + '"' + OF + '/><path d="M20 74 V92" stroke="' + P.ink + '" stroke-width=".8"/><path d="M9 76 h8 M9 80 h8 M9 84 h7 M23 76 h8 M23 80 h8 M23 84 h6" stroke="' + P.verm + '" stroke-width=".6"/>'
        + '<g class="glow">' + rays(20, 80, 12, 24, 8) + '</g>'
        + '<ellipse cx="40" cy="32" rx="9" ry="11" fill="#e0c8ac"' + OF + '/><path d="M31 28 C32 18 48 18 49 28" stroke="' + P.ink + '" stroke-width="2" fill="none"/><path d="M33 44 H47 V48 H33 Z" fill="' + P.white + '"' + O + '/>'
        + '<path d="M35 32 h4 M41 32 h4" stroke="' + P.ink + '" stroke-width="1.2"/><ellipse cx="40" cy="38" rx="2.2" ry="1.6" fill="' + P.ink + '"/>';
    },
    ghoul: function () {
      return '<ellipse cx="40" cy="139" rx="40" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M10 136 L16 110 L8 96 M70 136 L64 112 L76 98" stroke="#a8a49a" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 136 L16 110 L8 96 M70 136 L64 112 L76 98" stroke="' + P.ink + '" stroke-width=".8" fill="none"/>'
        + '<path d="M14 100 C18 84 34 78 50 82 C62 84 70 90 72 98 C70 106 60 112 46 112 C32 112 18 110 14 100 Z" fill="#a8a49a"' + OF + '/>'
        + '<path d="M24 90 q6 -4 12 0 M40 88 q6 -4 12 0 M30 100 q6 -4 12 0" stroke="' + P.ink + '" stroke-width=".7" fill="none" opacity=".6"/>'
        + '<ellipse cx="34" cy="96" rx="7" ry="4" fill="' + P.white + '"/><ellipse cx="56" cy="92" rx="5" ry="3" fill="' + P.white + '"/>'
        + '<path d="M22 112 L26 136 M54 112 L50 136" stroke="#a8a49a" stroke-width="4" fill="none" stroke-linecap="round"/>'
        + '<path d="M66 86 C70 74 82 74 84 84 C86 92 80 98 72 96 Z" fill="#a8a49a"' + OF + '/><circle cx="76" cy="84" r="1.6" fill="' + P.verm + '" class="blink"/><path d="M74 92 l2 2 l2 -2 l2 2" stroke="' + P.white + '" stroke-width=".8" fill="none"/>';
    },
    mummer: function () {
      return '<ellipse cx="40" cy="139" rx="26" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M26 44 C20 74 18 106 16 136 L40 136 L40 44 Z" fill="' + P.verm + '"' + OF + '/><path d="M40 44 L40 136 L64 136 C62 106 60 74 54 44 Z" fill="' + P.lapis + '"' + OF + '/>'
        + '<path d="M22 80 L58 80 M20 104 L60 104" stroke="' + P.goldHi + '" stroke-width="1.4"/>'
        + '<path d="M26 54 C16 60 10 50 6 42 M54 54 C64 60 70 50 74 42" stroke="' + P.ochre + '" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M26 54 C16 60 10 50 6 42 M54 54 C64 60 70 50 74 42" stroke="' + P.ink + '" stroke-width=".7" fill="none"/>'
        + '<path d="M28 18 L22 6 L34 16 L40 4 L46 16 L58 6 L52 18 Z" fill="' + P.gold + '"' + O + '/>'
        + '<ellipse cx="40" cy="32" rx="11" ry="14" fill="' + P.white + '"' + OF + '/><path d="M33 29 q3 -3 6 0 M41 29 q3 -3 6 0" stroke="' + P.ink + '" stroke-width="1.6" fill="none"/><path d="M33 38 Q40 46 47 38" stroke="' + P.verm + '" stroke-width="1.6" fill="none"/>'
        + '<path d="M31 32 q-2 4 0 6 M49 32 q2 4 0 6" stroke="' + P.rose + '" stroke-width="1.4" fill="none"/><circle cx="36" cy="30" r=".9" fill="' + P.goldHi + '" class="blink"/><circle cx="44" cy="30" r=".9" fill="' + P.goldHi + '" class="blink"/>';
    },
    knight: function () {
      var plate = '#9a988f';
      return '<ellipse cx="40" cy="139" rx="30" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M28 96 L24 136 L36 136 L38 104 L42 104 L44 136 L56 136 L52 96 Z" fill="' + plate + '"' + OF + '/>'
        + '<path d="M24 46 C20 60 22 80 26 98 L54 98 C58 80 60 60 56 46 C50 40 30 40 24 46 Z" fill="' + plate + '"' + OF + '/>'
        + '<path d="M30 56 q4 6 2 12 M48 60 q-3 8 0 14 M26 116 q4 4 2 8" stroke="' + P.earth + '" stroke-width="2.4" fill="none" opacity=".8"/>'
        + '<path d="M26 98 L54 98 L56 106 L24 106 Z" fill="' + P.verm + '"' + O + '/>'
        + '<path d="M24 50 C14 60 14 76 22 86 M56 50 C66 60 66 76 58 86" stroke="' + plate + '" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M24 50 C14 60 14 76 22 86 M56 50 C66 60 66 76 58 86" stroke="' + P.ink + '" stroke-width=".8" fill="none"/>'
        + '<path d="M38 88 L38 138 L42 138 L42 88 Z" fill="' + P.white + '"' + OF + '/><path d="M30 86 H50" stroke="' + P.gold + '" stroke-width="3" stroke-linecap="round"/><path d="M40 86 V76" stroke="' + P.umber + '" stroke-width="3"/>'
        + '<path d="M30 40 V22 C30 12 50 12 50 22 V40 Z" fill="' + plate + '"' + OF + '/><path d="M32 28 H48" stroke="' + P.ink + '" stroke-width="2.2"/><path d="M40 12 Q46 4 54 8" stroke="' + P.verm + '" stroke-width="2" fill="none"/>'
        + '<path d="M58 30 q3 -3 6 0 q3 -3 6 0" stroke="' + P.ink + '" stroke-width="1.6" fill="none"/>';
    },
    wraith: function () {
      return '<path class="hem" d="M20 36 C12 64 10 96 8 124 L14 118 L20 128 L26 116 L32 130 L38 118 L44 128 L50 116 L56 130 L62 118 L68 126 L70 124 C68 96 66 64 58 36 C54 20 26 20 20 36 Z" fill="' + P.white + '" opacity=".85"' + OF + '/>'
        + '<path d="M30 46 C28 70 26 96 24 118 M40 48 V122 M50 46 C52 70 54 96 56 118" stroke="' + P.azure + '" stroke-width="1" fill="none" opacity=".6"/>'
        + '<path d="M30 32 C30 24 48 24 48 32 C48 38 44 41 39 41 C34 41 30 38 30 32 Z" fill="' + P.deep + '"' + OF + '/>'
        + '<circle cx="35" cy="32" r="1.3" fill="' + P.white + '" class="blink"/><circle cx="43" cy="32" r="1.3" fill="' + P.white + '" class="blink"/>'
        + '<path d="M18 60 C8 74 6 86 4 96 M60 60 C70 74 72 86 74 96" stroke="' + P.white + '" stroke-width="3.4" fill="none" stroke-linecap="round" opacity=".85"/>';
    },
    hag: function () {
      return '<ellipse cx="40" cy="139" rx="30" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M20 60 C10 80 8 110 6 138 L66 138 C66 110 62 82 54 62 C50 50 26 46 20 60 Z" fill="' + P.moss + '"' + OF + '/>'
        + '<path d="M18 80 C26 84 36 84 44 80 M14 104 C26 110 46 110 60 104" stroke="' + P.ink + '" stroke-width="1" fill="none" opacity=".6"/>'
        + '<path d="M22 58 C26 40 46 38 52 52 C56 60 52 66 46 66 L28 66 C22 66 20 62 22 58 Z" fill="' + P.umber + '"' + OF + '/>'
        + '<path d="M34 50 C36 46 44 46 46 52 C46 58 42 62 38 62 C34 60 32 56 34 50 Z" fill="#c8b48e"' + OF + '/><path d="M36 52 h3 M42 52 h3" stroke="' + P.ink + '" stroke-width="1.4"/><path d="M40 54 L37 60 L40 60" stroke="' + P.ink + '" stroke-width="1" fill="none"/>'
        + '<path d="M54 70 C62 78 66 84 70 84" stroke="#c8b48e" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M70 84 C74 80 78 82 76 86 C74 88 72 88 70 86 Z" fill="' + P.white + '"' + OF + '/>'
        + '<path d="M6 138 L66 138 L62 132 C50 128 20 128 10 132 Z" fill="' + P.white + '"' + OF + '/>';
    },
    widow: function () {
      return '<ellipse cx="40" cy="138" rx="34" ry="3.4" fill="' + P.ink + '" opacity=".3"/>'
        + '<path d="M22 66 C10 62 2 56 -4 50 M58 66 C70 62 78 56 84 50" stroke="#5a6a78" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<path d="M22 40 C14 70 10 104 6 138 L74 138 C70 104 66 70 58 40 C54 22 26 22 22 40 Z" fill="#5a6a78"' + OF + '/>'
        + '<path d="M30 50 C28 80 26 110 24 136 M40 52 V136 M50 50 C52 80 54 110 56 136" stroke="' + P.ink + '" stroke-width="1" fill="none" opacity=".55"/>'
        + '<path d="M26 36 C24 20 56 20 54 36 L58 70 C50 64 30 64 22 70 Z" fill="#8a9aa6"' + OF + '/>'
        + '<ellipse cx="40" cy="38" rx="8" ry="10" fill="#d4d8d0"' + OF + '/><path d="M36 36 h3 M41 36 h3" stroke="' + P.ink + '" stroke-width="1.6"/><path d="M37 43 q3 1.4 6 0" stroke="' + P.ink + '" stroke-width=".9" fill="none"/>'
        + '<circle class="drip" cx="60" cy="120" r="1.4" fill="' + P.azure + '"/><circle class="drip" cx="18" cy="110" r="1.2" fill="' + P.azure + '" style="animation-delay:-1.6s"/>';
    }
  };
  function foe(kind, id, x, y, scale, ratio) {
    if (kind === 'eater') return eater(id, x, y, scale, ratio);
    var body = (FOES[kind] || FOES.penitent)(id);
    return '<g class="who foe" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><g class="sway">' + body + '</g></g>';
  }
  /* the foe's life in Hearts, as the table counts it: ten points to a Heart, the last one partly filled */
  function hearts(id, cx, y, hp) {
    var n = Math.max(1, Math.ceil(hp.max / 10)), w = 11, out = '', x0 = cx - (n * w) / 2;
    for (var i = 0; i < n; i++) {
      var fill = Math.max(0, Math.min(10, hp.cur - i * 10)) / 10, x = x0 + i * w, cid = id + 'h' + i;
      var path = 'M' + (x + 5) + ' ' + (y + 9) + ' L' + (x + 1) + ' ' + (y + 5) + ' C' + (x - 1) + ' ' + (y + 3) + ' ' + x + ' ' + y + ' ' + (x + 2.6) + ' ' + y + ' C' + (x + 3.8) + ' ' + y + ' ' + (x + 4.6) + ' ' + (y + 0.8) + ' ' + (x + 5) + ' ' + (y + 2) + ' C' + (x + 5.4) + ' ' + (y + 0.8) + ' ' + (x + 6.2) + ' ' + y + ' ' + (x + 7.4) + ' ' + y + ' C' + (x + 10) + ' ' + y + ' ' + (x + 11) + ' ' + (y + 3) + ' ' + (x + 9) + ' ' + (y + 5) + ' Z';
      out += '<clipPath id="' + cid + '"><rect x="' + x + '" y="' + (y + 9 - 9 * fill).toFixed(2) + '" width="11" height="10"/></clipPath>'
        + '<path d="' + path + '" fill="' + P.vellum + '" stroke="' + P.ink + '" stroke-width=".9"/><path d="' + path + '" fill="' + P.verm + '" clip-path="url(#' + cid + ')"/><path d="' + path + '" fill="none" stroke="' + P.gold + '" stroke-width=".5"/>';
    }
    return '<g class="foehearts">' + out + '</g>';
  }

  /* ---------- shared pieces ---------- */
  function defs(id) {
    return '<defs>'
      + '<linearGradient id="' + id + 'wax" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4ead0"/><stop offset=".6" stop-color="#dcc89a"/><stop offset="1" stop-color="#b09868"/></linearGradient>'
      + '<linearGradient id="' + id + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1e1630"/><stop offset=".45" stop-color="#4a2f52"/><stop offset=".78" stop-color="#9a5a4a"/><stop offset="1" stop-color="#d9894a"/></linearGradient>'
      /* the soft dark at the edges of every picture, like the home page's paintings */
      + '<radialGradient id="' + id + 'vig" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#0b0806" stop-opacity="0"/><stop offset="1" stop-color="#0b0806" stop-opacity=".7"/></radialGradient>'
      + '<linearGradient id="' + id + 'bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a2a"/><stop offset=".45" stop-color="' + P.goldHi + '"/><stop offset=".6" stop-color="' + P.gold + '"/><stop offset="1" stop-color="#7a5a20"/></linearGradient>'
      /* the diaper: a chequer of vermilion and lapis with a gold quatrefoil in each square, the classic wall of a painted room */
      + '<pattern id="' + id + 'dia" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="' + P.verm + '"/><rect width="6" height="6" fill="' + P.lapis + '"/><rect x="6" y="6" width="6" height="6" fill="' + P.lapis + '"/>'
      + '<circle cx="3" cy="3" r="1" fill="' + P.goldHi + '"/><circle cx="9" cy="9" r="1" fill="' + P.goldHi + '"/><circle cx="9" cy="3" r=".8" fill="' + P.goldHi + '"/><circle cx="3" cy="9" r=".8" fill="' + P.goldHi + '"/><path d="M0 0 H12 V12" stroke="' + P.ink + '" stroke-width=".4" fill="none"/></pattern>'
      /* dressed stone, in courses */
      + '<pattern id="' + id + 'ash" width="20" height="10" patternUnits="userSpaceOnUse"><rect width="20" height="10" fill="' + P.stone + '"/><path d="M0 10 H20 M10 0 V5 M0 5 H20 M0 5 V10 M20 5 V10" stroke="' + P.stoneDk + '" stroke-width=".7" fill="none"/></pattern>'
      /* a chequered floor */
      + '<pattern id="' + id + 'tile" width="16" height="8" patternUnits="userSpaceOnUse"><rect width="16" height="8" fill="' + P.ochre + '"/><rect width="8" height="4" fill="' + P.umber + '"/><rect x="8" y="4" width="8" height="4" fill="' + P.umber + '"/></pattern>'
      /* the vellum the page is painted on: a faint mottle */
      + '<filter id="' + id + 'grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .42  0 0 0 0 .25  0 0 0 .55 0"/></filter>'
      + '<filter id="' + id + 'blur"><feGaussianBlur stdDeviation="3"/></filter>'
      + '</defs>';
  }
  /* mist, painted as the limners did: pale wavy bands, drifting */
  function fog(id, y, tone, n) {
    var out = '', r = rnd(y * 7 + 3);
    for (var i = 0; i < (n || 3); i++) { var x = Math.round(r() * 260) - 20, yy = y + Math.round(r() * 12), w = 60 + Math.round(r() * 50);
      out += '<path class="fog f' + (i % 3) + '" d="M' + x + ' ' + yy + ' q' + (w / 4) + ' -4 ' + (w / 2) + ' 0 t' + (w / 2) + ' 0" stroke="' + P.white + '" stroke-width="2.2" stroke-linecap="round" fill="none" opacity=".45"/>'; }
    return out;
  }
  /* gold motes, drifting up very slowly */
  function motes(x0, x1, y0, y1, color, n, seed) {
    var out = '', r = rnd(seed);
    for (var i = 0; i < n; i++) out += '<circle class="mote" style="animation-delay:-' + (r() * 9).toFixed(1) + 's;animation-duration:' + (7 + r() * 6).toFixed(1) + 's" cx="' + Math.round(x0 + r() * (x1 - x0)) + '" cy="' + Math.round(y0 + r() * (y1 - y0)) + '" r="' + (0.6 + r() * 0.6).toFixed(1) + '" fill="' + P.goldHi + '"/>';
    return out;
  }
  /* a faint grain and a soft vignette over every picture (the gilded border went in favour of the home page's look) */
  function page(id) {
    return '<rect width="320" height="192" filter="url(#' + id + 'grain)" opacity=".12" style="mix-blend-mode:multiply"/>'
      + '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>';
  }
  /* a gold star of four points, glinting */
  function star(x, y, r, d) { return '<path class="twinkle" style="animation-delay:-' + d + 's" d="M' + x + ' ' + (y - r) + ' L' + (x + r * 0.3) + ' ' + (y - r * 0.3) + ' L' + (x + r) + ' ' + y + ' L' + (x + r * 0.3) + ' ' + (y + r * 0.3) + ' L' + x + ' ' + (y + r) + ' L' + (x - r * 0.3) + ' ' + (y + r * 0.3) + ' L' + (x - r) + ' ' + y + ' L' + (x - r * 0.3) + ' ' + (y - r * 0.3) + ' Z" fill="' + P.goldHi + '"/>'; }
  /* the night sky: lapis sown with gold stars, a pale crescent moon */
  function sky(id, h) {
    var out = '<rect width="320" height="' + (h || 192) + '" fill="url(#' + id + 'sky)"/>', r = rnd(17);
    for (var i = 0; i < 9; i++) out += star(Math.round(14 + r() * 292), Math.round(14 + r() * ((h || 120) - 40)), Math.round((0.9 + r() * 1.1) * 10) / 10, (r() * 3).toFixed(1));
    return out + '<g class="cloud"><path d="M262 18 A16 16 0 1 0 262 50 A22 22 0 0 1 262 18 Z" fill="' + P.white + '"' + O + '/><circle cx="252" cy="32" r=".9" fill="' + P.ink + '"/></g>';
  }
  /* rolling ground, with the furrow lines a limner scratched into it */
  function land(y, fill, seed) {
    var r = rnd(seed || 3), lines = '';
    for (var i = 0; i < 7; i++) { var x = Math.round(r() * 300), yy = y + 10 + Math.round(r() * (180 - y)); lines += '<path d="M' + x + ' ' + yy + ' q10 -3 20 0" stroke="' + P.ink + '" stroke-width=".6" fill="none" opacity=".5"/>'; }
    return '<path d="M0 ' + (y + 4) + ' C60 ' + (y - 6) + ' 120 ' + (y + 6) + ' 180 ' + y + ' C230 ' + (y - 5) + ' 280 ' + (y + 4) + ' 320 ' + y + ' L320 192 L0 192 Z" fill="' + fill + '"' + O + '/>' + lines;
  }
  /* a distant hill, paler */
  function hill(x, y, w, h, fill) { return '<path d="M' + (x - w / 2) + ' ' + (y + h) + ' C' + (x - w / 4) + ' ' + y + ' ' + (x + w / 4) + ' ' + y + ' ' + (x + w / 2) + ' ' + (y + h) + ' Z" fill="' + fill + '"' + O + '/>'; }
  /* a tree as the old painters drew one: a stiff trunk and a round crown of leaves, or bare and black */
  function tree(x, y, sc, bare) {
    if (bare) return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M0 0 C2 -20 -2 -40 4 -60 C8 -72 2 -80 6 -90 M4 -60 C14 -66 22 -64 30 -74 M2 -40 C-10 -46 -18 -44 -26 -54 M6 -84 C12 -90 18 -88 22 -96 M-22 -50 C-26 -58 -24 -62 -30 -66 M26 -70 C30 -76 28 -80 34 -84" stroke="' + P.umber + '" stroke-width="3.6" fill="none" stroke-linecap="round"/><path d="M0 0 C2 -20 -2 -40 4 -60 C8 -72 2 -80 6 -90" stroke="' + P.ink + '" stroke-width=".8" fill="none"/></g>';
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M-3 0 L-2 -40 L2 -40 L3 0 Z" fill="' + P.umber + '"' + O + '/>'
      + '<circle cx="0" cy="-52" r="18" fill="' + P.moss + '"' + O + '/><circle cx="-10" cy="-46" r="10" fill="' + P.sap + '"' + O + '/><circle cx="9" cy="-58" r="9" fill="' + P.sap + '"' + O + '/>'
      + '<path d="M-6 -60 q3 -3 6 0 M2 -48 q3 -3 6 0 M-12 -50 q3 -3 6 0" stroke="' + P.ink + '" stroke-width=".6" fill="none"/></g>';
  }
  /* a stone building seen as a limner shows it: a block of courses under a red roof */
  function chapel(id, x, sc) {
    return '<g transform="translate(' + x + ' 150) scale(' + sc + ') translate(0 -150)">'
      + '<path d="M-64 150 V98 L-2 66 L60 98 V150 Z" fill="url(#' + id + 'ash)"' + O + '/><path d="M-70 100 L-2 62 L66 100 L60 100 L-2 68 L-64 100 Z" fill="' + P.verm + '"' + O + '/>'
      + '<rect x="18" y="40" width="36" height="110" fill="' + P.stone + '"' + O + '/><path d="M14 42 L36 10 L58 42 Z" fill="' + P.verm + '"' + O + '/><path d="M36 10 V0 M32 4 H40" stroke="' + P.gold + '" stroke-width="1.6"/>'
      + '<path d="M30 66 V56 Q36 48 42 56 V66 Z" fill="' + P.ink + '"/><path d="M-36 124 V114 Q-31 106 -26 114 V124 Z" fill="' + P.goldHi + '"' + O + ' class="glow"/>'
      + '<path d="M-40 150 V130 Q-31 120 -22 130 V150 Z" fill="' + P.umber + '"' + O + '/></g>';
  }
  function wayshrine(id, x, y, lit) {
    return (lit ? '<g class="glow">' + rays(x, y - 5, 4, 16, 10) + '</g>' : '')
      + '<path d="M' + (x - 8) + ' ' + (y + 14) + ' V' + (y - 10) + ' L' + x + ' ' + (y - 18) + ' L' + (x + 8) + ' ' + (y - 10) + ' V' + (y + 14) + ' Z" fill="' + P.stone + '"' + O + '/><path d="M' + (x - 10) + ' ' + (y - 9) + ' L' + x + ' ' + (y - 20) + ' L' + (x + 10) + ' ' + (y - 9) + '" stroke="' + P.verm + '" stroke-width="2.4" fill="none"/>'
      + '<rect x="' + (x - 3) + '" y="' + (y - 8) + '" width="6" height="8" fill="' + P.lapis + '"' + O + '/>'
      + (lit ? '<ellipse class="flame" cx="' + x + '" cy="' + (y - 4.5) + '" rx="1.3" ry="2.3" fill="' + P.goldHi + '"/>' : '');
  }
  function stone(x, y, h, lean) { return '<path transform="rotate(' + (lean || 0) + ' ' + x + ' ' + (y + h) + ')" d="M' + (x - 5) + ' ' + (y + h) + ' L' + (x - 4) + ' ' + (y + 3) + ' Q' + x + ' ' + (y - 2) + ' ' + (x + 4) + ' ' + (y + 3) + ' L' + (x + 5) + ' ' + (y + h) + ' Z" fill="' + P.grey + '"' + O + '/>'; }
  function arch(x, w, top, base, fill) { return '<path d="M' + x + ' ' + base + ' V' + (top + w / 2) + ' Q' + x + ' ' + top + ' ' + (x + w / 2) + ' ' + top + ' Q' + (x + w) + ' ' + top + ' ' + (x + w) + ' ' + (top + w / 2) + ' V' + base + ' Z" fill="' + fill + '"' + O + '/>'; }
  function wall(id) { return '<rect width="320" height="192" fill="url(#' + id + 'dia)"/>'; }
  function vaults(id, n, top, base) {
    var w = 320 / n, out = '<rect width="320" height="192" fill="url(#' + id + 'ash)"/>';
    for (var i = 0; i < n; i++) out += arch(i * w + 8, w - 16, top, base, '#3a2e24');
    return out;
  }
  function floor(id, y) { return '<rect y="' + y + '" width="320" height="' + (192 - y) + '" fill="url(#' + id + 'tile)"/><path d="M0 ' + y + ' H320" stroke="' + P.ink + '" stroke-width="1"/>'; }
  function hasLight(s) { var C = root.SacramentSheetCore, L = root.SacramentSolo && root.SacramentSolo.LIGHTS; return !!(s && C && L && (s.hero.gear || []).some(function (g) { var it = C.itemOf(g); return it && L.indexOf(it.id) >= 0; })); }

  /* ---------- the places ---------- */
  var SCENES = {
    title: function (s, id) {
      return sky(id, 150) + hill(60, 112, 160, 40, P.sap) + hill(270, 108, 150, 44, P.moss) + chapel(id, 176, 0.8) + tree(40, 156, 1.1, true)
        + land(150, P.moss, 1) + hero(s, id, 120, 52, 0.95, true) + motes(100, 220, 90, 170, '', 8, 3) + fog(id, 160, '', 3);
    },
    gate: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + hill(80, 112, 200, 34, P.sap) + chapel(id, 170, 0.72) + tree(296, 150, 0.85, true) + land(142, P.moss, 2)
        /* leaning gravestones */
        + [[34, 132, -6], [58, 136, 4], [236, 134, 7], [258, 130, -3]].map(function (g) { return '<path transform="rotate(' + g[2] + ' ' + (g[0] + 6) + ' ' + (g[1] + 16) + ')" d="M' + g[0] + ' ' + (g[1] + 16) + ' V' + (g[1] + 4) + ' Q' + (g[0] + 6) + ' ' + (g[1] - 4) + ' ' + (g[0] + 12) + ' ' + (g[1] + 4) + ' V' + (g[1] + 16) + ' Z" fill="' + P.grey + '"' + O + '/><path d="M' + (g[0] + 6) + ' ' + (g[1] + 3) + ' v6 M' + (g[0] + 3.5) + ' ' + (g[1] + 5.5) + ' h5" transform="rotate(' + g[2] + ' ' + (g[0] + 6) + ' ' + (g[1] + 16) + ')" stroke="' + P.ink + '" stroke-width=".7"/>'; }).join('')
        /* the path, and the salt line broken in one place */
        + '<path d="M138 192 L150 148 L170 148 L182 192 Z" fill="' + P.parch + '"' + O + '/>'
        + '<path d="M84 176 Q130 170 150 172 M170 172 Q200 170 240 176" stroke="' + P.white + '" stroke-width="2" stroke-dasharray="2 3" fill="none"/>'
        /* the lychgate: a steep roof of red shingles on two posts */
        + '<rect x="122" y="92" width="6" height="60" fill="' + P.umber + '"' + O + '/><rect x="192" y="92" width="6" height="60" fill="' + P.umber + '"' + O + '/><rect x="126" y="98" width="68" height="4" fill="' + P.earth + '"' + O + '/>'
        + '<path d="M104 94 L160 48 L216 94 Z" fill="' + P.verm + '"' + O + '/><path d="M118 88 L160 54 L202 88 M130 80 H190 M142 70 H178" stroke="' + P.ink + '" stroke-width=".6" fill="none"/><path d="M160 48 V38 M156 42 H164" stroke="' + P.gold + '" stroke-width="1.6"/>'
        /* the wayshrine and its one candle, and the offering box */
        + wayshrine(id, 34, 144, true)
        + '<rect x="27" y="162" width="14" height="8" rx="1" fill="' + (f.box ? P.stoneDk : P.gold) + '"' + O + '/>'
        /* the house; a finger of light at the shutter */
        + '<path d="M232 160 V128 L258 108 L284 128 V160 Z" fill="' + P.parch + '"' + O + '/><path d="M226 130 L258 102 L290 130 L284 130 L258 108 L232 130 Z" fill="' + P.earth + '"' + O + '/>'
        + '<path d="M240 160 V128 M250 160 V122 M266 160 V122 M276 160 V128" stroke="' + P.umber + '" stroke-width="1.4"/>'
        + '<rect x="250" y="134" width="16" height="14" fill="' + P.ink + '"/>' + (f.talked ? '' : '<rect x="257" y="134" width="1.8" height="14" fill="' + P.goldHi + '" class="glow"/>')
        + hero(s, id, 140, 76, 0.62, true) + motes(20, 300, 100, 180, '', 6, 11) + fog(id, 166, '', 3);
    },
    nave: function (s, id) {
      var f = (s && s.flags) || {};
      return wall(id)
        /* stone piers and pointed arches */
        + [[2, 36], [64, 36], [222, 36], [284, 36]].map(function (a) { return '<path d="M' + a[0] + ' 150 V70 Q' + (a[0] + a[1] / 2) + ' 30 ' + (a[0] + a[1]) + ' 70 V150 H' + (a[0] + a[1] - 6) + ' V72 Q' + (a[0] + a[1] / 2) + ' 40 ' + (a[0] + 6) + ' 72 V150 Z" fill="' + P.stone + '"' + O + '/>'; }).join('')
        /* the high window of stained glass and its gold rays of light */
        + '<path d="M144 92 V38 Q160 8 176 38 V92 Z" fill="' + P.stone + '"' + O + '/><path d="M148 88 V40 Q160 16 172 40 V88 Z" fill="' + P.lapis + '"' + O + '/>'
        + '<path d="M152 50 h6 v10 h-6 Z M162 50 h6 v10 h-6 Z M152 66 h6 v10 h-6 Z M162 66 h6 v10 h-6 Z" fill="' + P.verm + '"/><circle cx="160" cy="34" r="4" fill="' + P.goldHi + '"' + O + '/><path d="M160 18 V88 M148 62 H172" stroke="' + P.ink + '" stroke-width="1.4"/>'
        + '<g class="rays">' + [0, 1, 2, 3, 4, 5].map(function (i) { return '<path d="M' + (150 + i * 4) + ' 92 L' + (110 + i * 22) + ' 192" stroke="' + P.goldHi + '" stroke-width="1" opacity=".55"/>'; }).join('') + '</g>'
        + motes(110, 210, 90, 180, '', 10, 5)
        + floor(id, 150)
        /* pews */
        + [0, 1, 2].map(function (r) { var y = 154 + r * 12; return '<rect x="' + (18 - r * 8) + '" y="' + y + '" width="' + (98 + r * 8) + '" height="6" fill="' + P.earth + '"' + O + '/><rect x="204" y="' + y + '" width="' + (98 + r * 8) + '" height="6" fill="' + P.earth + '"' + O + '/>'; }).join('')
        /* the lectern and the open ledger */
        + '<rect x="155" y="118" width="10" height="34" fill="' + P.umber + '"' + O + '/><path d="M142 112 L178 112 L174 119 L146 119 Z" fill="' + P.earth + '"' + O + '/>'
        + '<path d="M147 112 Q153 106 160 109 Q167 106 173 112 Z" fill="' + (f.ledger ? P.parch : P.white) + '"' + O + '/><path d="M150 110 h7 M163 110 h7" stroke="' + P.verm + '" stroke-width=".7"/>'
        /* candle stands, every candle eaten to the wick */
        + [62, 98, 222, 258].map(function (x) { return '<path d="M' + x + ' 150 V98 M' + (x - 7) + ' 98 H' + (x + 7) + '" stroke="' + P.gold + '" stroke-width="2"/><path d="M' + (x - 5) + ' 98 v-3 M' + x + ' 98 v-4 M' + (x + 5) + ' 98 v-3" stroke="' + P.white + '" stroke-width="1.6"/>'; }).join('')
        + '<path d="M298 150 V108 Q306 98 314 108 V150 Z" fill="' + (f.door ? P.ink : P.umber) + '"' + O + '/>'
        + '<path d="M6 150 V112 Q14 102 22 112 V150 Z" fill="' + P.ink + '"/>'
        + hero(s, id, 104, 76, 0.58, hasLight(s)) + fog(id, 174, '', 2);
    },
    crypt: function (s, id) {
      var f = (s && s.flags) || {};
      return vaults(id, 4, 30, 150)
        + [[20, 76], [50, 82], [100, 72], [130, 84], [190, 76], [220, 82], [262, 74], [292, 82]].map(function (n, j) { return '<rect x="' + n[0] + '" y="' + n[1] + '" width="20" height="14" rx="2" fill="' + P.ink + '"/>' + (j % 3 === 1 ? '' : '<circle cx="' + (n[0] + 10) + '" cy="' + (n[1] + 8) + '" r="4.5" fill="' + P.white + '"' + O + '/><rect x="' + (n[0] + 7) + '" y="' + (n[1] + 7) + '" width="2" height="2" fill="' + P.ink + '"/><rect x="' + (n[0] + 11) + '" y="' + (n[1] + 7) + '" width="2" height="2" fill="' + P.ink + '"/>'); }).join('')
        + floor(id, 150)
        /* Brother Odo, curled on the floor in his brown habit */
        + '<path d="M196 168 Q210 156 236 160 Q248 164 244 172 Q220 176 196 172 Z" fill="' + P.earth + '"' + O + '/><circle cx="246" cy="164" r="6" fill="' + (f.key ? P.white : P.flesh) + '"' + O + '/>'
        + hero(s, id, 84, 76, 0.58, s && (s.flags.lit || hasLight(s))) + motes(60, 200, 110, 180, '', 5, 17);
    },
    tower: function (s, id) {
      var won = s && s.over === 'won';
      return '<rect width="320" height="192" fill="url(#' + id + 'ash)"/>'
        + '<path d="M28 76 V24 Q46 4 64 24 V76 Z" fill="' + P.stone + '"' + O + '/><path d="M32 72 V26 Q46 10 60 26 V72 Z" fill="url(#' + id + 'sky)"' + O + '/>' + star(40, 40, 2.4, 0) + star(54, 56, 1.8, 1.2) + star(46, 26, 1.6, 2)
        + '<rect x="100" y="16" width="130" height="8" fill="' + P.umber + '"' + O + '/><rect x="106" y="24" width="8" height="146" fill="' + P.umber + '"' + O + '/><rect x="216" y="24" width="8" height="146" fill="' + P.umber + '"' + O + '/>'
        + '<g class="' + (won ? 'swing' : 'still') + '" style="transform-origin:165px 24px"><path d="M165 22 C140 24 132 52 130 80 C128 88 122 92 120 96 H210 C208 92 202 88 200 80 C198 52 190 24 165 22 Z" fill="url(#' + id + 'bronze)"' + O + '/><path d="M126 90 H204 M134 60 H196" stroke="' + P.ink + '" stroke-width=".7"/><circle cx="165" cy="100" r="4.5" fill="' + P.umber + '"' + O + '/></g>'
        + '<path d="M165 98 V136" stroke="' + P.earth + '" stroke-width="2.4"/><path d="M162 138 l3 -3 l3 3" stroke="' + P.earth + '" stroke-width="1.4" fill="none"/>'
        + '<path d="M262 40 V192 M290 40 V192" stroke="' + P.umber + '" stroke-width="4"/>' + [56, 76, 96, 116, 136, 156, 176].map(function (y) { return '<path d="M262 ' + y + ' H290" stroke="' + P.umber + '" stroke-width="3"/>'; }).join('')
        + floor(id, 170)
        + (won ? '<g class="ring">' + rays(165, 60, 50, 74, 16) + '</g>' : '')
        + hero(s, id, 150, 88, 0.58, hasLight(s));
    },
    cloister: function (s, id) {
      var arc = '';
      for (var i = 0; i < 7; i++) { var x = 10 + i * 50; arc += '<path d="M' + x + ' 150 V84 Q' + (x + 25) + ' 58 ' + (x + 50) + ' 84 V150" stroke="' + P.stone + '" stroke-width="7" fill="none"/><path d="M' + x + ' 150 V84 Q' + (x + 25) + ' 58 ' + (x + 50) + ' 84 V150" stroke="' + P.ink + '" stroke-width="7.8" fill="none" opacity=".0"/>'; }
      return '<rect width="320" height="192" fill="url(#' + id + 'ash)"/>' + sky(id, 80) + '<rect y="62" width="320" height="10" fill="' + P.verm + '"' + O + '/>'
        + '<path d="M0 80 H320 V150 H0 Z" fill="' + P.sap + '"/>' + arc
        + [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { var x = 10 + i * 50; return '<rect x="' + (x - 4) + '" y="80" width="8" height="70" fill="' + P.stone + '"' + O + '/>'; }).join('')
        + floor(id, 150)
        + '<ellipse cx="160" cy="166" rx="18" ry="5" fill="' + P.lapis + '"' + O + '/><path d="M142 166 V152 H178 V166" fill="' + P.stone + '"' + O + '/><path d="M146 152 V126 M174 152 V126 M140 126 H180" stroke="' + P.umber + '" stroke-width="3"/>'
        + hero(s, id, 70, 74, 0.58, hasLight(s)) + motes(20, 300, 80, 170, '', 6, 31);
    },
    undercroft: function (s, id) {
      return vaults(id, 5, 40, 140) + floor(id, 140)
        + [[30, 120], [56, 124], [250, 118], [278, 124]].map(function (b) { return '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="12" ry="17" fill="' + P.earth + '"' + O + '/><path d="M' + (b[0] - 12) + ' ' + b[1] + ' H' + (b[0] + 12) + ' M' + (b[0] - 11) + ' ' + (b[1] - 8) + ' H' + (b[0] + 11) + ' M' + (b[0] - 11) + ' ' + (b[1] + 8) + ' H' + (b[0] + 11) + '" stroke="' + P.ink + '" stroke-width="1"/>'; }).join('')
        + '<path d="M100 150 C104 136 124 134 128 150 Z M126 152 C130 140 146 138 150 152 Z" fill="' + P.parch + '"' + O + '/><rect x="214" y="138" width="26" height="14" fill="' + P.ochre + '"' + O + '/><rect x="220" y="126" width="26" height="14" fill="' + P.earth + '"' + O + '/>'
        + hero(s, id, 84, 76, 0.56, s && (s.flags.lit || hasLight(s))) + motes(60, 220, 110, 170, '', 4, 41);
    },
    crossroads: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + hill(260, 116, 180, 36, P.sap) + tree(40, 142, 0.8, true) + land(146, P.moss, 4)
        + '<path d="M120 192 L150 146 L170 146 L200 192 Z" fill="' + P.parch + '"' + O + '/><path d="M0 168 L320 160 L320 170 L0 178 Z" fill="' + P.parch + '"' + O + '/>'
        + '<path d="M262 160 V86" stroke="' + P.umber + '" stroke-width="3.4"/><path d="M244 92 H284 L290 96 L284 100 H244 Z M282 104 H250 L244 108 L250 112 H282 Z" fill="' + P.earth + '"' + O + '/>'
        + wayshrine(id, 296, 150, true)
        /* the cart: in the ditch, or back on the road */
        + '<g transform="translate(196 ' + (f.freed ? 116 : 124) + ') rotate(' + (f.freed ? 0 : 9) + ')"><rect x="0" y="0" width="58" height="18" fill="' + P.ochre + '"' + O + '/><path d="M10 0 V18 M24 0 V18 M38 0 V18" stroke="' + P.ink + '" stroke-width=".7"/><path d="M0 0 L-6 -10 M58 0 L64 -10 M-18 12 H0" stroke="' + P.umber + '" stroke-width="3"/>'
        + '<circle cx="14" cy="24" r="11" fill="none" stroke="' + P.umber + '" stroke-width="3"/><circle cx="46" cy="24" r="11" fill="none" stroke="' + P.umber + '" stroke-width="3"/><path d="M14 13 V35 M3 24 H25 M46 13 V35 M35 24 H57" stroke="' + P.umber + '" stroke-width="1.2"/></g>'
        /* Hob, sitting on the shaft */
        + '<path d="M176 140 C176 128 186 126 188 136 L190 146 L176 146 Z" fill="' + P.verm + '"' + O + '/><circle cx="182" cy="124" r="5" fill="' + P.flesh + '"' + O + '/><path d="M176 122 Q182 114 188 122 Z" fill="' + P.umber + '"' + O + '/>'
        + hero(s, id, 100, 74, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '', 4, 51) + fog(id, 170, '', 3);
    },
    hospice: function (s, id) {
      var f = (s && s.flags) || {}, beds = '';
      [[18, 0], [86, 1], [154, 0], [222, 1], [290, 0]].forEach(function (b, i) {
        var x = b[0], sheeted = !f.beat_sister && (i === 1 || i === 3);
        beds += '<rect x="' + (x - 22) + '" y="138" width="44" height="12" fill="' + P.umber + '"' + O + '/><rect x="' + (x - 22) + '" y="132" width="44" height="8" fill="' + (sheeted ? P.white : P.parch) + '"' + O + '/>'
          + (sheeted ? '<path d="M' + (x - 18) + ' 132 Q' + x + ' 120 ' + (x + 18) + ' 132 Z" fill="' + P.white + '"' + O + '/>' : '<circle cx="' + (x - 14) + '" cy="128" r="4" fill="' + P.flesh + '"' + O + '/><path d="M' + (x - 8) + ' 130 Q' + (x + 4) + ' 124 ' + (x + 18) + ' 130" fill="' + P.azure + '"' + O + '/>')
          + '<path d="M' + (x - 22) + ' 150 V158 M' + (x + 22) + ' 150 V158" stroke="' + P.umber + '" stroke-width="2"/>';
      });
      return '<rect width="320" height="192" fill="' + P.parch + '"/><rect width="320" height="10" fill="' + P.stoneDk + '"/>'
        + [40, 120, 200, 280].map(function (x) { return '<path d="M' + (x - 10) + ' 96 V54 Q' + x + ' 38 ' + (x + 10) + ' 54 V96 Z" fill="' + P.deep + '"' + O + '/>' + star(x, 62, 1.4, x % 3); }).join('')
        + '<path d="M156 24 H164 V60 H156 Z M146 34 H174 V42 H146 Z" fill="' + P.umber + '"' + O + '/>'
        + floor(id, 150) + beds
        + '<path d="M300 128 V102 M292 102 H308" stroke="' + P.gold + '" stroke-width="2"/><ellipse class="flame" cx="300" cy="98" rx="1.6" ry="3" fill="' + P.goldHi + '"/>'
        + (f.salted ? '<path d="M0 174 H40" stroke="' + P.white + '" stroke-width="3" stroke-dasharray="2 2"/>' : '')
        + hero(s, id, 70, 74, 0.58, true) + motes(40, 300, 70, 150, '', 5, 131);
    },
    wood: function (s, id) {
      var f = (s && s.flags) || {}, briars = '';
      for (var i = 0; i < 14; i++) { var x = 150 + (i % 7) * 24, y = 120 + Math.floor(i / 7) * 16; briars += '<path d="M' + x + ' ' + (y + 30) + ' C' + (x - 14) + ' ' + (y + 6) + ' ' + (x + 18) + ' ' + (y - 4) + ' ' + (x + 6) + ' ' + (y + 24) + ' M' + (x + 4) + ' ' + (y + 30) + ' C' + (x + 18) + ' ' + (y + 4) + ' ' + (x - 10) + ' ' + y + ' ' + (x - 2) + ' ' + (y + 22) + '" stroke="' + P.verd + '" stroke-width="2.4" fill="none"/><circle cx="' + (x + 6) + '" cy="' + (y + 10) + '" r="1.6" fill="' + P.verm + '"/>'; }
      return sky(id, 120) + '<rect y="60" width="320" height="132" fill="' + P.moss + '"/>'
        + [[20, 150, 1.4], [70, 140, 1.2], [270, 146, 1.4], [306, 150, 1.1], [120, 136, 0.9], [220, 134, 0.95]].map(function (t) { return tree(t[0], t[1], t[2]); }).join('')
        + land(140, P.sap, 13)
        + [[46, 150], [96, 158]].map(function (c) { return '<path d="M' + (c[0] - 22) + ' ' + c[1] + ' Q' + c[0] + ' ' + (c[1] - 26) + ' ' + (c[0] + 22) + ' ' + c[1] + ' Z" fill="' + P.earth + '"' + O + '/><path class="fog f' + (c[0] % 3) + '" d="M' + c[0] + ' ' + (c[1] - 18) + ' q6 -10 0 -20 q-6 -10 2 -22" stroke="' + P.grey + '" stroke-width="3" fill="none" opacity=".55"/>'; }).join('')
        + '<path d="M250 150 L276 120 L300 150 Z" fill="' + P.ochre + '"' + O + '/><path d="M270 150 V138 H282 V150" fill="' + P.ink + '"/>'
        + (f.through ? '<path d="M150 192 L178 132 L198 132 L214 192 Z" fill="' + P.parch + '"' + O + '/>' : briars)
        + hero(s, id, 104, 76, 0.58, false) + fog(id, 130, '', 4) + motes(20, 300, 80, 170, '', 4, 141);
    },
    bridge: function (s, id) {
      var f = (s && s.flags) || {}, planks = '', sag = f.sagging ? 18 : 6;
      for (var i = 0; i < 16; i++) { var x = 112 + i * 12, y = 112 + Math.round(Math.sin(Math.PI * i / 15) * sag) + (f.sagging ? i : 0); planks += (i === 5 || i === 11 ? '' : '<rect x="' + x + '" y="' + y + '" width="9" height="4" fill="' + (i % 3 ? P.stoneDk : P.earth) + '"' + O + '/>'); }
      return sky(id, 192) + '<path d="M0 120 L96 112 L104 192 L0 192 Z" fill="' + P.stoneDk + '"' + O + '/><path d="M320 108 L306 108 L296 192 L320 192 Z" fill="' + P.stoneDk + '"' + O + '/>'
        + '<path d="M104 192 L110 150 L130 192 Z M280 192 L292 140 L298 192 Z" fill="' + P.umber + '"' + O + '/><path d="M140 186 q40 -6 80 0 t60 0" stroke="' + P.azure + '" stroke-width="1.4" fill="none" class="fog f1"/>'
        + '<path d="M100 104 Q206 ' + (112 + sag * 2) + ' 306 100" stroke="' + P.umber + '" stroke-width="1.6" fill="none"/><path d="M100 94 Q206 ' + (100 + sag * 2) + ' 306 92" stroke="' + P.umber + '" stroke-width="1.4" fill="none"/>' + planks
        + '<rect x="96" y="88" width="6" height="32" fill="' + P.umber + '"' + O + '/><rect x="304" y="86" width="6" height="26" fill="' + P.umber + '"' + O + '/>'
        + '<path d="M14 122 V86 L40 70 L66 86 V122 Z" fill="#3a3436"' + O + '/><path d="M8 88 L40 64 L72 88" stroke="' + P.ink + '" stroke-width="4" fill="none"/><rect x="34" y="98" width="12" height="24" fill="' + P.ink + '"/>'
        + (f.passed || f.beat_tollman || (s && s.fight) ? '' : '<g class="who" transform="translate(116 58) scale(.56)"><g class="sway">' + FOES.tollman() + '</g></g>')
        + hero(s, id, 54, 66, 0.56, hasLight(s)) + fog(id, 150, '', 3) + motes(120, 300, 100, 180, '', 3, 151);
    },
    chapter: function (s, id) {
      var f = (s && s.flags) || {}, books = '', r = rnd(61), cols = [P.verm, P.lapis, P.umber, P.verd, P.ochre];
      for (var row = 0; row < 3; row++) for (var i = 0; i < 26; i++) books += '<rect x="' + (8 + i * 12) + '" y="' + (18 + row * 30 + Math.round(r() * 4)) + '" width="9" height="' + (22 - Math.round(r() * 4)) + '" fill="' + cols[(i + row) % 5] + '"' + O + '/>';
      var caged = !f.beat_pardoner && !f.questioned && !(s && s.fight);
      return '<rect width="320" height="192" fill="#3a2a1c"/>' + books
        + [42, 72, 102].map(function (y) { return '<rect x="0" y="' + y + '" width="320" height="4" fill="' + P.umber + '"' + O + '/>'; }).join('')
        + '<path d="M156 6 H164 V40 H156 Z M146 14 H174 V22 H146 Z" fill="' + P.gold + '"' + O + '/>'
        + floor(id, 150)
        /* the Inquisitor at her table, writing */
        + '<path d="M118 118 C116 100 136 98 134 118 Z" fill="' + P.verm + '"' + OF + '/><circle cx="126" cy="96" r="7" fill="' + P.flesh + '"' + OF + '/><path d="M118 94 C118 82 134 82 134 94" fill="' + P.ink + '"/>'
        + '<rect x="96" y="116" width="96" height="8" fill="' + P.earth + '"' + O + '/><path d="M104 124 V152 M184 124 V152" stroke="' + P.umber + '" stroke-width="4"/><rect x="140" y="110" width="22" height="6" fill="' + P.white + '"' + O + '/><path d="M150 110 L158 98" stroke="' + P.ink + '" stroke-width="1"/>'
        + '<path d="M168 108 V114" stroke="' + P.gold + '" stroke-width="2"/><ellipse class="flame" cx="168" cy="105" rx="1.4" ry="2.6" fill="' + P.goldHi + '"/>'
        /* the cell at the back, with the pardoner tied in it */
        + '<rect x="240" y="96" width="70" height="56" fill="#1c140e"' + O + '/>'
        + (caged ? '<g transform="translate(262 112) scale(.3)">' + FOES.pardoner() + '</g>' : '')
        + [248, 260, 272, 284, 296].map(function (x) { return '<path d="M' + x + ' 96 V152" stroke="' + P.grey + '" stroke-width="2"/>'; }).join('')
        + hero(s, id, 40, 74, 0.56, false) + motes(100, 220, 90, 140, '', 4, 161);
    },
    barrow: function (s, id) {
      var f = (s && s.flags) || {}, reading = !(s && s.fight) && !f.beat_deacon;
      return sky(id, 150) + hill(260, 120, 160, 30, P.sap)
        + '<path d="M40 150 C70 96 220 92 260 150 Z" fill="' + P.moss + '"' + O + '/><path d="M70 128 q20 -6 40 0 M150 118 q20 -6 40 0" stroke="' + P.ink + '" stroke-width=".6" fill="none" opacity=".5"/>'
        + '<rect x="72" y="116" width="10" height="36" fill="' + P.grey + '"' + O + '/><rect x="108" y="116" width="10" height="36" fill="' + P.grey + '"' + O + '/><rect x="66" y="108" width="58" height="10" fill="' + P.grey + '"' + O + '/><rect x="82" y="118" width="26" height="34" fill="' + P.ink + '"/>'
        + '<path d="M74 122 l4 4 M74 132 l4 -2 M110 124 l4 3 M110 136 l4 -4 M80 110 l3 4 M96 110 l3 4" stroke="' + P.stoneDk + '" stroke-width=".9"/>'
        + land(148, P.sap, 71)
        + '<g class="glow">' + rays(150, 152, 6, 22, 10) + '</g><path d="M142 158 L158 158 L154 154 L146 154 Z" fill="' + P.umber + '"' + O + '/><path class="flame" d="M150 140 C156 148 156 152 150 156 C144 152 144 148 150 140 Z" fill="' + P.verm + '"' + O + '/><path class="flame" d="M150 146 C152 149 152 152 150 154 C148 152 148 149 150 146 Z" fill="' + P.goldHi + '"/>'
        + (reading ? '<g class="who" transform="translate(162 96) scale(.44)"><g class="sway">' + FOES.deacon() + '</g></g>' : '')
        + hero(s, id, 236, 76, 0.56, hasLight(s)) + fog(id, 160, '', 3) + motes(120, 200, 110, 160, '', 5, 171);
    },
    pit: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + chapel(id, 250, 0.7) + '<path d="M232 124 l10 10 M242 124 l-10 10" stroke="' + P.verm + '" stroke-width="2"/>' + tree(30, 148, 1, true) + land(140, P.moss, 81)
        + [[64, 134, -4], [84, 138, 5]].map(function (g) { return '<path transform="rotate(' + g[2] + ' ' + (g[0] + 5) + ' ' + (g[1] + 14) + ')" d="M' + g[0] + ' ' + (g[1] + 14) + ' V' + (g[1] + 4) + ' Q' + (g[0] + 5) + ' ' + (g[1] - 3) + ' ' + (g[0] + 10) + ' ' + (g[1] + 4) + ' V' + (g[1] + 14) + ' Z" fill="' + P.grey + '"' + O + '/>'; }).join('')
        + (f.filled ? '<path d="M110 166 L230 166 L224 176 L116 176 Z" fill="' + P.earth + '"' + O + '/>'
          : '<path d="M108 160 L232 160 L222 186 L118 186 Z" fill="#1c140e"' + O + '/><path d="M112 162 L228 162 L226 168 L114 168 Z" fill="' + P.white + '" opacity=".85"/><path d="M130 172 q8 -4 16 0 M160 176 q8 -4 16 0 M190 172 q8 -4 16 0" stroke="' + P.white + '" stroke-width="3" fill="none" opacity=".6"/>'
            + '<path d="M236 162 C244 140 270 140 286 162 Z" fill="' + P.earth + '"' + O + '/>')
        /* the sexton and his spade */
        + '<path d="M96 118 C92 132 92 146 94 160 L110 160 C112 146 112 132 108 118 Z" fill="' + P.umber + '"' + OF + '/><circle cx="102" cy="112" r="6" fill="' + P.flesh + '"' + OF + '/><path d="M96 108 C98 102 106 102 108 108" stroke="' + P.white + '" stroke-width="2" fill="none"/>'
        + '<path d="M110 128 L126 168" stroke="' + P.umber + '" stroke-width="2.4"/><path d="M122 166 L132 166 L130 176 L124 176 Z" fill="' + P.grey + '"' + O + '/>'
        + hero(s, id, 34, 80, 0.54, false) + fog(id, 150, '', 3) + motes(100, 240, 120, 170, '', 3, 181);
    },
    inn: function (s, id) {
      var crowd = '', r = rnd(91);
      for (var i = 0; i < 16; i++) { var x = 6 + i * 20 + Math.round(r() * 8), y = 172 + Math.round(r() * 8); crowd += '<path d="M' + (x - 9) + ' 192 C' + (x - 9) + ' ' + (y + 4) + ' ' + (x + 9) + ' ' + (y + 4) + ' ' + (x + 9) + ' 192 Z" fill="' + ['#3a2e24', '#4a3a2a', '#2e2620'][i % 3] + '"' + O + '/><circle cx="' + x + '" cy="' + (y - 2) + '" r="5" fill="' + ['#3a2e24', '#4a3a2a', '#2e2620'][(i + 1) % 3] + '"' + O + '/>'; }
      var player = function (x, body, head) { return '<path d="M' + (x - 7) + ' 132 C' + (x - 8) + ' 120 ' + (x - 6) + ' 110 ' + (x - 4) + ' 104 L' + (x + 4) + ' 104 C' + (x + 6) + ' 110 ' + (x + 8) + ' 120 ' + (x + 7) + ' 132 Z" fill="' + body + '"' + O + '/><circle cx="' + x + '" cy="99" r="5" fill="' + P.flesh + '"' + O + '/>' + head; };
      return sky(id, 120)
        + '<rect x="0" y="40" width="320" height="110" fill="' + P.parch + '"' + O + '/><path d="M0 40 L60 14 L120 40 M200 40 L260 14 L320 40" fill="' + P.verm + '"' + O + '/>'
        + [0, 40, 80, 120, 160, 200, 240, 280, 320].map(function (x) { return '<path d="M' + x + ' 40 V150" stroke="' + P.umber + '" stroke-width="3"/>'; }).join('') + '<path d="M0 80 H320 M0 40 L40 80 M80 40 L120 80 M200 40 L240 80 M280 40 L320 80" stroke="' + P.umber + '" stroke-width="2.4"/>'
        + [52, 268].map(function (x) { return '<path d="M' + x + ' 96 V120" stroke="' + P.umber + '" stroke-width="2.6"/><g class="glow">' + rays(x, 92, 4, 16, 9) + '</g><path class="flame" d="M' + x + ' 84 C' + (x + 4) + ' 90 ' + (x + 4) + ' 93 ' + x + ' 96 C' + (x - 4) + ' 93 ' + (x - 4) + ' 90 ' + x + ' 84 Z" fill="' + P.verm + '"/>'; }).join('')
        + '<rect x="96" y="132" width="128" height="12" fill="' + P.earth + '"' + O + '/><circle cx="114" cy="150" r="9" fill="' + P.umber + '"' + O + '/><circle cx="206" cy="150" r="9" fill="' + P.umber + '"' + O + '/>'
        + player(126, P.gold, '<circle cx="126" cy="99" r="8" fill="none" stroke="' + P.goldHi + '" stroke-width="1.4"/>')
        + player(160, P.verm, '<path d="M155 95 l-3 -7 l5 4 M165 95 l3 -7 l-5 4" fill="' + P.verm + '"' + O + '/>')
        + player(194, P.lapis, '<path d="M188 96 L184 88 L194 93 L204 88 L200 96 Z" fill="' + P.ochre + '"' + O + '/>')
        + crowd + hero(s, id, 30, 86, 0.5, false) + motes(40, 290, 80, 150, '', 5, 191);
    },
    field: function (s, id) {
      var f = (s && s.flags) || {}, standing = !(s && s.fight) && !f.beat_knight && !f.rites, crows = '', r = rnd(101);
      for (var i = 0; i < 9; i++) { var x = 20 + Math.round(r() * 280), y = 20 + Math.round(r() * 70); crows += '<path class="cloud" d="M' + x + ' ' + y + ' q3 -3 6 0 q3 -3 6 0" stroke="' + P.ink + '" stroke-width="1.4" fill="none"/>'; }
      return sky(id, 140) + '<rect width="320" height="140" fill="#6a6a64" opacity=".55"/>' + crows + hill(70, 108, 180, 30, '#5e6a4a') + land(124, '#6a7452', 103)
        + [[40, 150], [96, 170], [210, 146], [262, 172], [150, 182]].map(function (h) { return '<path d="M' + (h[0] - 18) + ' ' + h[1] + ' Q' + h[0] + ' ' + (h[1] - 12) + ' ' + (h[0] + 18) + ' ' + h[1] + ' Z" fill="#5e6a4a"' + O + '/>'; }).join('')
        + '<path d="M70 176 l8 -10 M80 182 l12 -4 M232 160 l10 -6 M250 186 l-8 -10" stroke="' + P.earth + '" stroke-width="2"/><circle cx="118" cy="160" r="3" fill="' + P.white + '"' + O + '/><circle cx="238" cy="178" r="2.6" fill="' + P.white + '"' + O + '/>'
        + tree(290, 146, 0.9, true)
        + (standing ? '<g class="who" transform="translate(150 74) scale(.5)"><g class="sway">' + FOES.knight() + '</g></g>'
          : (s && s.fight) ? '' : '<path d="M140 150 L184 146 L186 152 L142 156 Z" fill="#9a988f"' + O + '/><path d="M184 144 C192 142 194 152 186 154" fill="#9a988f"' + O + '/><path d="M132 158 L176 158" stroke="' + P.white + '" stroke-width="1.6"/>')
        + hero(s, id, 40, 76, 0.54, false) + fog(id, 136, '', 4) + motes(60, 280, 100, 170, '', 3, 201);
    },
    lane: function (s, id) {
      var hedge = '';
      [[0, 100], [30, 86], [64, 92], [96, 104], [320, 100], [290, 86], [256, 92], [224, 104]].forEach(function (b, i) { hedge += '<circle cx="' + b[0] + '" cy="' + b[1] + '" r="' + (26 - (i % 4) * 2) + '" fill="' + (i % 2 ? P.moss : P.verd) + '"' + O + '/>'; });
      return sky(id, 150) + land(110, P.moss, 6) + hedge
        + '<path d="M0 110 H120 L100 192 H0 Z M320 110 H200 L220 192 H320 Z" fill="' + P.verd + '"' + O + '/>'
        + '<path d="M120 110 L200 110 L230 192 L90 192 Z" fill="' + P.parch + '"' + O + '/>' + [0, 1, 2, 3, 4, 5].map(function (i) { var y = 122 + i * 12, x = 156 + (i % 2 ? 6 : -6); return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (1.4 + i * 0.3) + '" ry="' + (2.4 + i * 0.4) + '" fill="' + P.umber + '"/>'; }).join('')
        + hero(s, id, 96, 70, 0.62, hasLight(s)) + fog(id, 112, '', 3) + motes(60, 260, 80, 170, '', 4, 61);
    },
    ford: function (s, id) {
      var f = (s && s.flags) || {}, waves = '';
      for (var r = 0; r < 4; r++) for (var c = 0; c < 9; c++) waves += '<path class="fog f' + ((r + c) % 3) + '" d="M' + (c * 40 - 10 + (r % 2) * 20) + ' ' + (126 + r * 9) + ' q5 -4 10 0 t10 0" stroke="' + P.white + '" stroke-width="1" fill="none" opacity=".7"/>';
      return sky(id, 140) + hill(250, 92, 180, 30, P.sap) + land(112, P.moss, 7) + '<path d="M0 118 C80 112 240 114 320 118 L320 160 L0 160 Z" fill="' + P.lapis + '"' + O + '/>' + waves
        + (f.flood ? '' : [70, 110, 150, 190, 230, 270].map(function (x, i) { return '<ellipse cx="' + x + '" cy="' + (142 - i * 3) + '" rx="8" ry="3" fill="' + P.grey + '"' + O + '/>'; }).join(''))
        + '<path d="M0 158 C80 156 240 156 320 158 V192 H0 Z" fill="' + P.sap + '"' + O + '/>' + [12, 18, 26, 290, 300, 308].map(function (x) { return '<path d="M' + x + ' 166 Q' + (x + 2) + ' 146 ' + (x - 2) + ' 128" stroke="' + P.verd + '" stroke-width="1.6" fill="none"/><ellipse cx="' + (x - 2) + '" cy="130" rx="1.6" ry="4" fill="' + P.umber + '"/>'; }).join('')
        + '<path d="M18 120 V100 L36 88 L54 100 V120 Z" fill="' + P.parch + '"' + O + '/><path d="M14 102 L36 84 L58 102" stroke="' + P.ochre + '" stroke-width="4" fill="none"/><rect x="30" y="106" width="8" height="14" fill="' + P.ink + '"/>'
        + hero(s, id, s && s.fight ? 120 : 70, 82, 0.56, hasLight(s));
    },
    barn: function (s, id) {
      var planks = '';
      for (var x = 0; x < 320; x += 14) planks += '<path d="M' + x + ' 0 V150" stroke="' + P.umber + '" stroke-width=".8"/>';
      return '<rect width="320" height="192" fill="' + P.earth + '"/>' + planks
        + '<path d="M0 40 L160 4 L320 40" stroke="' + P.umber + '" stroke-width="8" fill="none"/><path d="M0 40 L160 4 L320 40" stroke="' + P.ink + '" stroke-width=".8" fill="none"/>'
        + [40, 120, 200, 280].map(function (x) { return '<rect x="' + (x - 4) + '" y="20" width="8" height="140" fill="' + P.umber + '"' + O + '/><path d="M' + (x - 30) + ' 60 L' + x + ' 30 L' + (x + 30) + ' 60" stroke="' + P.umber + '" stroke-width="4" fill="none"/>'; }).join('')
        + '<path d="M0 150 H320 V192 H0 Z" fill="' + P.ochre + '"' + O + '/>' + [20, 60, 110, 170, 230, 280].map(function (x) { return '<path d="M' + x + ' 160 l8 -3 M' + (x + 12) + ' 176 l9 -2" stroke="' + P.umber + '" stroke-width=".8"/>'; }).join('')
        + [[230, 110], [262, 100], [290, 112], [250, 128], [282, 132]].map(function (b) { return '<path d="M' + (b[0] - 14) + ' ' + (b[1] + 24) + ' L' + (b[0] - 8) + ' ' + b[1] + ' L' + (b[0] + 8) + ' ' + b[1] + ' L' + (b[0] + 14) + ' ' + (b[1] + 24) + ' Z" fill="' + P.goldHi + '"' + O + '/><path d="M' + (b[0] - 10) + ' ' + (b[1] + 12) + ' H' + (b[0] + 10) + '" stroke="' + P.ochre + '" stroke-width="2"/>'; }).join('')
        + motes(40, 300, 60, 150, '', 12, 71) + hero(s, id, 80, 74, 0.58, hasLight(s));
    },
    gibbet: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + hill(80, 118, 200, 30, P.sap) + land(150, P.moss, 8)
        + '<path d="M150 152 V30 H200" stroke="' + P.umber + '" stroke-width="5" fill="none"/><path d="M150 152 V30 H200" stroke="' + P.ink + '" stroke-width=".8" fill="none"/><path d="M150 50 L170 30" stroke="' + P.umber + '" stroke-width="3"/><path d="M196 30 V40" stroke="' + P.ink + '" stroke-width="1.4"/>'
        + '<g class="sway" style="transform-origin:196px 40px">' + (f.cage ? '' : '<path d="M192 50 C188 60 190 72 194 82 L200 82 C202 72 204 60 200 50 Z" fill="' + P.grey + '"' + O + '/><circle cx="196" cy="47" r="4" fill="' + P.grey + '"' + O + '/>')
        + '<path d="M184 40 H208 V82 Q196 90 184 82 Z" fill="none" stroke="' + P.ink + '" stroke-width="1.6"/><path d="M190 40 V86 M196 40 V88 M202 40 V86" stroke="' + P.ink + '" stroke-width="1"/></g>'
        + '<path d="M146 32 q4 -6 10 -2 q-4 0 -6 4 Z M206 26 q4 -6 10 -2 q-4 0 -6 4 Z" fill="' + P.ink + '"/>' + wayshrine(id, 270, 144, !!f.candle)
        + hero(s, id, 84, 78, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '', 4, 81) + fog(id, 168, '', 3);
    },
    ossuary: function (s, id) {
      var f = (s && s.flags) || {}, rows = '';
      for (var r = 0; r < 5; r++) for (var c = 0; c < 18; c++) { var x = 8 + c * 17 + (r % 2) * 8, y = 30 + r * 18; rows += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="' + (c * 7 % 5 ? P.white : P.parch) + '"' + O + '/><rect x="' + (x - 3) + '" y="' + (y - 1) + '" width="2" height="2" fill="' + P.ink + '"/><rect x="' + (x + 1) + '" y="' + (y - 1) + '" width="2" height="2" fill="' + P.ink + '"/>'; }
      return '<rect width="320" height="192" fill="' + P.umber + '"/>' + rows + '<path d="M0 118 H320 V128 H0 Z" fill="' + P.stone + '"' + O + '/>'
        + '<path d="M0 128 H320 V140 H0 Z" fill="url(#' + id + 'ash)"/>' + floor(id, 140)
        + '<g transform="translate(262 92)"><rect x="0" y="0" width="44" height="58" fill="' + P.ink + '"/>' + (f.grille ? '' : [6, 14, 22, 30, 38].map(function (x) { return '<path d="M' + x + ' 0 V58" stroke="' + P.grey + '" stroke-width="2.4"/>'; }).join('') + '<path d="M0 16 H44 M0 40 H44" stroke="' + P.grey + '" stroke-width="2"/>') + '</g>'
        + '<path d="M0 60 L30 140 L0 140 Z" fill="' + P.ink + '"/>'
        + hero(s, id, 84, 76, 0.56, s && (s.flags.lit || hasLight(s))) + motes(60, 220, 110, 170, '', 4, 91);
    },
    stones: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + '<path d="M0 140 C60 110 120 100 200 104 C250 106 290 116 320 124 L320 192 L0 192 Z" fill="' + P.moss + '"' + O + '/>'
        + [[30, 132, 16, -4], [80, 118, 18, 3], [130, 108, 20, -2], [180, 104, 20, 2], [230, 108, 18, -3], [280, 118, 16, 4]].map(function (b) { return stone(b[0], b[1] - b[2], b[2], b[3]); }).join('')
        + '<path d="M30 134 Q80 120 130 110 T230 110 T290 120" stroke="' + P.white + '" stroke-width="2" stroke-dasharray="' + (f.mended ? '0' : '6 10') + '" fill="none"/>'
        + '<path d="M190 72 L200 62 L210 72 V86 H190 Z" fill="' + P.stone + '"' + O + '/><path d="M188 73 L200 60 L212 73" stroke="' + P.verm + '" stroke-width="2.4" fill="none"/>'
        + hero(s, id, 70, 84, 0.58, hasLight(s)) + motes(20, 300, 100, 180, '', 5, 101) + fog(id, 150, '', 3);
    },
    shrine: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + hill(60, 120, 160, 30, P.sap) + land(148, P.moss, 9)
        + stone(40, 120, 30, -5) + stone(290, 118, 32, 4)
        + '<path d="M120 152 V82 H200 V152 Z" fill="url(#' + id + 'ash)"' + O + '/><path d="M114 84 L160 50 L206 84 Z" fill="' + P.verm + '"' + O + '/><path d="M160 50 V38 M155 43 H165" stroke="' + P.gold + '" stroke-width="2"/>'
        + '<path d="M138 152 V104 Q160 84 182 104 V152 Z" fill="' + P.ink + '"/>'
        + (f.beat_hag ? '' : '<path d="M128 156 Q160 140 196 156 Z" fill="' + P.white + '"' + O + '/>')
        + (s && s.over === 'won' ? '<g class="glow">' + rays(160, 122, 8, 34, 16) + '</g><path d="M156 132 Q160 112 164 132" stroke="' + P.white + '" stroke-width="3" fill="none"/>' : '')
        + hero(s, id, 66, 80, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '', 5, 111) + fog(id, 166, '', 3);
    },
    mere: function (s, id) {
      var f = (s && s.flags) || {};
      return sky(id, 150) + '<path d="M0 130 C80 124 240 124 320 130 L320 192 L0 192 Z" fill="' + P.moss + '"' + O + '/>'
        + '<ellipse cx="200" cy="152" rx="130" ry="22" fill="' + P.deep + '"' + O + '/>' + [0, 1, 2, 3, 4].map(function (i) { return '<path class="fog f' + (i % 3) + '" d="M' + (110 + i * 34) + ' ' + (146 + (i % 2) * 8) + ' h18" stroke="' + P.white + '" stroke-width="1" opacity=".6"/>'; }).join('')
        + [[60, 112, 26, -6], [100, 106, 30, 2], [300, 108, 28, 5], [262, 102, 30, -3], [150, 104, 26, 4]].map(function (b) { return stone(b[0], b[1], b[2], b[3]); }).join('')
        + (f.lost ? '' : '<path d="M150 152 C148 138 150 128 154 122 C158 128 160 138 158 152 Z" fill="' + P.grey + '"' + O + '/><circle cx="154" cy="118" r="4" fill="' + P.flesh + '"' + O + '/>')
        + hero(s, id, 50, 78, 0.6, hasLight(s)) + fog(id, 138, '', 3) + motes(20, 300, 100, 180, '', 4, 121);
    }
  };
  /* where the foe stands in each place [x, y, scale], and where the light falls in a dark place */
  var SPOT = { crypt: [170, 60, 0.78], gate: [196, 64, 0.78], nave: [196, 64, 0.78], tower: [196, 64, 0.78], cloister: [190, 62, 0.72], undercroft: [180, 66, 0.7],
    crossroads: [200, 66, 0.7], ford: [190, 70, 0.62], barn: [200, 58, 0.72], gibbet: [196, 70, 0.66], ossuary: [186, 60, 0.74], shrine: [196, 66, 0.7], stones: [200, 70, 0.66], mere: [200, 64, 0.72], lane: [200, 70, 0.66],
    hospice: [210, 62, 0.7], wood: [196, 74, 0.62], bridge: [150, 56, 0.6],
    chapter: [196, 64, 0.66], barrow: [150, 62, 0.64], pit: [140, 82, 0.6], inn: [200, 52, 0.66], field: [196, 66, 0.66] };
  var DARK = { crypt: [120, 140], undercroft: [110, 140], ossuary: [110, 140] };

  /* the dark: an ink wash over everything beyond the light; without a light, the room is nearly lost */
  function dark(id, light) {
    if (!light) return '<rect width="320" height="192" fill="#120a04" opacity=".84"/>';
    return '<defs><radialGradient id="' + id + 'dark" gradientUnits="userSpaceOnUse" cx="' + light[0] + '" cy="' + light[1] + '" r="160"><stop offset=".3" stop-color="#120a04" stop-opacity="0"/><stop offset=".65" stop-color="#120a04" stop-opacity=".62"/><stop offset="1" stop-color="#120a04" stop-opacity=".9"/></radialGradient></defs><rect width="320" height="192" fill="url(#' + id + 'dark)"/>';
  }

  /* Paintings. A place with a painting shows it instead of its drawn picture; the foe, hearts and the dark still go on top.
     To add one: put the picture at site/art/solo/<place>.webp (about 1600 x 960) and add a line here. hero: false hides the drawn hero
     (paintings are seen through the hero's eyes). A foe painting goes at site/art/solo/foe-<id>.webp, on a transparent background, listed in FOE_PAINT. */
  var PAINT = {}; /* owner, 2026-11-06: keep the drawn pictures, so no place uses a painting for now */
  var FOE_PAINT = {};
  function painting(name, id) {
    var p = PAINT[name];
    return '<image href="' + p.src + '" x="0" y="0" width="320" height="192" preserveAspectRatio="xMid' + (p.y || 'YMid') + ' slice"/>'
      + '<rect width="320" height="192" fill="#2a1408" opacity=".12" style="mix-blend-mode:multiply"/>' + motes(40, 280, 90, 180, '', 5, hash(name) % 97);
  }
  function foePainted(art, x, y, sc) {
    return '<g class="who foe" transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><image href="' + FOE_PAINT[art] + '" x="0" y="0" width="80" height="140"/></g>';
  }
  function spot(name) { return SPOT[name] || [196, 64, 0.78]; }

  /* One picture: the place, the foe if there is one, the dark if the place is dark, then the grain and vignette over all. */
  function scene(name, s, id) {
    id = id || 'a';
    var fn = SCENES[name] || SCENES.title, body = PAINT[name] ? painting(name, id) : fn(s, id);
    var spot = SPOT[name] || [196, 64, 0.78], f = s && s.fight, art = f && (f.art || 'eater');
    if (f) body += FOE_PAINT[art] ? foePainted(art, spot[0], spot[1], spot[2]) : foe(art, id, spot[0], spot[1], spot[2], f.hp.cur / f.hp.max);
    if (DARK[name]) { var lit = s && (s.flags.lit || hasLight(s)); body += dark(id, lit ? DARK[name] : null); if (f && (f.art || 'eater') === 'eater') body += '<ellipse class="flame foeflame" cx="' + (spot[0] + 35) + '" cy="' + spot[1] + '" rx="2.4" ry="4" fill="' + P.goldHi + '" opacity=".9"/>'; }
    if (f) body += hearts(id + 'f', spot[0] + 40 * spot[2], Math.max(12, spot[1] - 14), f.hp);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' + defs(id) + body + page(id) + '</svg>';
  }
  /* a small picture for a kind of gear, for the hero sheet: drawn like the marginal pictures of a manuscript */
  var ICONS = {
    weapon: '<path d="M6 26 L22 10 L26 6 L24 12 L10 26 Z" fill="#f4ecd8" stroke="#2a1a10" stroke-width="1"/><path d="M5 21 L11 27" stroke="#c99a2e" stroke-width="2.6" stroke-linecap="round"/><path d="M4 28 l4 -4" stroke="#5a3e26" stroke-width="2.4" stroke-linecap="round"/>',
    armour: '<path d="M16 4 L27 8 V16 C27 22 22 27 16 29 C10 27 5 22 5 16 V8 Z" fill="#b0392a" stroke="#2a1a10" stroke-width="1"/><path d="M16 4 V29 M5 14 H27" stroke="#ecc85e" stroke-width="1.6"/>',
    supply: '<path d="M10 8 H22 L24 28 H8 Z" fill="#c2903e" stroke="#2a1a10" stroke-width="1"/><path d="M12 8 Q16 2 20 8" stroke="#5a3e26" stroke-width="1.6" fill="none"/>',
    relic: '<circle cx="16" cy="16" r="11" fill="#24407e" stroke="#2a1a10" stroke-width="1"/><path d="M16 6 V26 M9 13 H23" stroke="#ecc85e" stroke-width="2.6" stroke-linecap="round"/>',
    grimoire: '<rect x="7" y="5" width="18" height="23" rx="2" fill="#24407e" stroke="#2a1a10" stroke-width="1"/><path d="M10 5 V28" stroke="#16244a" stroke-width="2"/><path d="M16 11 V21 M12 15 H20" stroke="#ecc85e" stroke-width="1.6"/>'
  };
  function icon(kind) { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + (ICONS[kind] || ICONS.supply) + '</svg>'); }
  root.SacramentSoloArt = { W: W, H: H, scene: scene, icon: icon, spot: spot, scenes: Object.keys(SCENES), paintings: PAINT, foePaintings: FOE_PAINT };
})(typeof window !== 'undefined' ? window : globalThis);
