/* Sacrament RPG solo: the pictures, in a dark fantasy style. Every picture is drawn here as SVG (no image files): cold, low light, heavy shadow,
   figures shown mostly as silhouettes caught by a rim of lamplight, a painted grain over everything.
   The movement is small and slow: fog drifting, embers and dust rising, a flame breathing, a cloak's hem stirring. It all stops for anyone who asks
   their device for less motion (solo.css). scene(name, state, id) returns one picture; id keeps gradient names apart when two pictures are on the page. */
(function (root) {
  'use strict';
  var W = 320, H = 192;
  function hash(t) { var h = 7; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }
  function rnd(seed) { return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; }

  /* ---------- the hero: a hooded traveller, face lost in the hood ---------- */
  /* Drawn in a 60 × 140 box, feet at the bottom. The cloak follows what they carry; the hood hides the face, all but a glint of eye. */
  function hero(s, id, x, y, scale, lamp) {
    var h = (s && s.hero) || { name: 'Pilgrim', gear: [] }, C = root.SacramentSheetCore;
    var kinds = (h.gear || []).map(function (g) { var it = C && C.itemOf(g); return it ? it.kind + ':' + (g.eq ? 1 : 0) + ':' + (it.weaponStyle || '') : ''; }).join(' ');
    var cloak = /grimoire:1/.test(kinds) ? '#1d2133' : /armour:1/.test(kinds) ? '#2a1c1a' : '#211d18';
    var weapon = /weapon:1:ranged|weapon:1:crossbow/.test(kinds) ? 'bow' : /weapon:1/.test(kinds) ? 'blade' : '';
    var glint = ['#d8c08a', '#9fb4d8', '#a9c9b6'][hash(h.name) % 3];
    return '<g class="who hero" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">'
      + '<ellipse cx="30" cy="139" rx="26" ry="4" fill="#000" opacity=".6"/>'
      + (weapon === 'bow' ? '<path d="M8 40 Q-8 80 10 122" stroke="#120f0c" stroke-width="2.4" fill="none"/><path d="M8 40 L10 122" stroke="#5a5040" stroke-width=".6"/>' : '')
      + (weapon === 'blade' ? '<path d="M10 92 L2 136" stroke="#3a3c44" stroke-width="2.6"/><path d="M12 82 L8 96" stroke="#120f0c" stroke-width="3.4"/><path d="M7 88 L15 90" stroke="#120f0c" stroke-width="2"/>' : '')
      /* the cloak: long, heavy, ragged at the hem; the hem stirs */
      + '<path d="M18 30 C10 50 8 80 6 108 C5 120 4 130 3 136 L57 136 C56 128 55 118 53 106 C51 80 48 52 42 30 Z" fill="' + cloak + '"/>'
      + '<path class="hem" d="M3 136 L8 131 L12 137 L17 132 L22 138 L28 132 L33 137 L39 131 L45 138 L50 132 L57 136 L56 128 L4 128 Z" fill="' + cloak + '"/>'
      + '<path d="M24 40 C22 70 20 100 18 134 M34 42 C36 72 38 104 40 134" stroke="#000" stroke-width="1.6" fill="none" opacity=".45"/>'
      /* the hood, the face in shadow, one glint of eye */
      + '<path d="M16 34 C12 10 48 6 44 34 C46 42 40 46 30 46 C20 46 14 42 16 34 Z" fill="' + cloak + '"/>'
      + '<path d="M21 32 C20 18 40 16 39 32 C39 38 34 41 30 41 C26 41 21 38 21 32 Z" fill="#050405"/>'
      + '<rect x="26" y="29" width="2.2" height="1.2" fill="' + glint + '" opacity=".85" class="blink"/><rect x="32" y="29" width="2.2" height="1.2" fill="' + glint + '" opacity=".85" class="blink"/>'
      /* rim light down the lamp side */
      + (lamp ? '<path d="M44 34 C48 52 51 80 53 106 C54 118 55 128 56 134" stroke="#e8a85a" stroke-width="1.2" fill="none" opacity=".55"/><path d="M43 32 C45 22 40 12 30 10" stroke="#e8a85a" stroke-width="1" fill="none" opacity=".5"/>' : '')
      /* hand and lamp */
      + (lamp ? '<path d="M50 70 L58 86" stroke="' + cloak + '" stroke-width="7" stroke-linecap="round"/><path d="M60 86 V92" stroke="#120f0c" stroke-width="1.2"/>'
        + '<circle cx="60" cy="100" r="30" fill="url(#' + id + 'glow)" class="glow"/>'
        + '<path d="M55 92 H65 L64 106 H56 Z" fill="#1a130c" stroke="#7a5a30" stroke-width="1"/><ellipse class="flame" cx="60" cy="99" rx="2.2" ry="3.6" fill="#ffcf7a"/>' : '')
      + '</g>';
  }

  /* ---------- the Candle-Eater: tall, starved, made of old tallow ---------- */
  function eater(id, x, y, scale, hurtRatio) {
    var melt = hurtRatio < 0.66 ? '<path d="M30 58 C28 66 31 70 29 78" stroke="#8c7a58" stroke-width="2" fill="none"/>' : '';
    melt += hurtRatio < 0.33 ? '<path d="M50 70 C52 80 49 86 51 96 M24 90 C22 98 25 104 23 112" stroke="#8c7a58" stroke-width="2" fill="none"/>' : '';
    return '<g class="who foe" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><g class="sway">'
      + '<ellipse cx="40" cy="140" rx="34" ry="5" fill="#000" opacity=".65"/>'
      + '<circle cx="44" cy="10" r="28" fill="url(#' + id + 'glow)" class="glow"/>'
      /* a hunched body, long arms hanging past the knees, a puddle of wax at its feet */
      + '<path d="M44 26 C58 28 64 44 62 60 C66 80 64 104 60 136 L48 136 C48 118 46 104 42 96 C38 106 36 120 34 136 L22 136 C20 112 18 90 22 70 C18 56 26 30 44 26 Z" fill="url(#' + id + 'wax)"/>'
      + '<path d="M24 62 C14 78 10 100 8 122 C7 128 4 132 6 134 C10 130 12 126 13 120 C16 104 20 88 28 74 Z" fill="url(#' + id + 'wax)"/>'
      + '<path d="M60 58 C70 72 74 96 74 116 C75 122 78 126 76 128 C72 126 70 122 70 116 C68 98 64 82 56 70 Z" fill="url(#' + id + 'wax)"/>'
      + '<ellipse cx="40" cy="137" rx="30" ry="3.5" fill="#bfae86" opacity=".55"/>'
      + '<path d="M58 40 C62 54 62 66 60 80" stroke="#fff6dc" stroke-width="1.6" fill="none" opacity=".35"/>'
      + melt
      /* the face: no face, two soft hollows and a mouth sagging open */
      + '<path d="M34 41 C35 37 41 37 42 41 C42 48 40 54 38 60 C36 54 34 48 34 41 Z" fill="#1a120a"/><path d="M47 41 C48 37 54 37 55 41 C55 47 53 52 51 57 C49 52 47 47 47 41 Z" fill="#1a120a"/>'
      + '<circle cx="38" cy="45" r="1.1" fill="#ffb347" class="blink"/><circle cx="51" cy="45" r="1.1" fill="#ffb347" class="blink"/>'
      + '<path d="M41 62 C42 60 47 60 48 62 C49 70 47 78 44.5 82 C42 78 40 70 41 62 Z" fill="#1a120a"/>'
      /* wax running from the crown, and a drop that falls */
      + '<path d="M34 30 C33 36 35 40 33 46 M54 30 C55 36 53 40 55 44" stroke="#fff6dc" stroke-width="1.6" fill="none" opacity=".55"/>'
      + '<circle class="drip" cx="10" cy="128" r="1.6" fill="#e8dcbc"/>'
      /* the wick and its flame */
      + '<path d="M44 26 Q42 18 45 12" stroke="#0d0a08" stroke-width="2" fill="none"/>'
      + '<path class="flame" d="M45 -4 C51 4 51 10 45 14 C39 10 40 4 45 -4 Z" fill="#ffa040"/><path class="flame" d="M45 3 C47 6 47 10 45 12 C43 10 43 6 45 3 Z" fill="#fff0c0"/>'
      + '</g></g>';
  }

  /* ---------- the other foes, each in the same 80 × 140 box, feet at the bottom ---------- */
  var FOES = {
    rats: function () {
      var out = '<ellipse cx="40" cy="138" rx="40" ry="5" fill="#000" opacity=".6"/>', r = rnd(5);
      for (var i = 0; i < 9; i++) { var x = 4 + r() * 66, y = 112 + r() * 22, sc = 0.7 + r() * 0.5, flip = r() > 0.5 ? -1 : 1;
        out += '<g transform="translate(' + x.toFixed(0) + ' ' + y.toFixed(0) + ') scale(' + (flip * sc).toFixed(2) + ' ' + sc.toFixed(2) + ')"><path d="M-10 4 C-12 -6 2 -9 9 -3 L14 -1 L9 2 C6 6 -6 8 -10 4 Z" fill="#2a2420"/><path d="M-10 3 C-18 4 -22 10 -28 8" stroke="#3a302a" stroke-width="1.2" fill="none"/><circle cx="9" cy="-2" r=".9" fill="#e8a060" class="blink"/></g>'; }
      return out;
    },
    hound: function () {
      return '<ellipse cx="40" cy="139" rx="36" ry="4" fill="#000" opacity=".6"/>'
        + '<path d="M8 96 C14 84 34 82 52 86 C60 76 70 74 76 80 C80 84 78 90 72 92 C70 98 66 100 62 100 L60 136 L55 136 L54 106 C44 108 30 108 22 104 L20 136 L15 136 L14 104 C8 108 4 104 8 96 Z" fill="#141214"/>'
        + '<path d="M8 96 C2 92 0 84 4 78" stroke="#141214" stroke-width="3" fill="none"/><path d="M70 76 L72 66 L76 76 Z" fill="#141214"/>'
        + '<circle cx="72" cy="82" r="1.4" fill="#e8c070" class="blink"/><path d="M70 90 L78 88" stroke="#d8d0c0" stroke-width=".8" opacity=".6"/>';
    },
    acolyte: function () {
      return '<ellipse cx="40" cy="139" rx="30" ry="4" fill="#0a1418" opacity=".7"/>'
        + '<path d="M26 40 C18 70 14 110 10 138 L70 138 C66 110 62 70 54 40 Z" fill="#8a9088"/><path d="M26 40 C18 70 14 110 10 138 L70 138 C66 110 62 70 54 40 Z" fill="#2c3a38" opacity=".55"/>'
        + '<path d="M20 90 C30 96 50 96 60 90 M16 116 C30 122 50 122 64 116" stroke="#4a5650" stroke-width="2" fill="none" opacity=".7"/>'
        + '<circle cx="40" cy="30" r="12" fill="#6e7a72"/><path d="M30 26 C34 18 46 18 50 26 L50 22 C46 12 34 12 30 22 Z" fill="#1e2422"/>'
        + '<rect x="34" y="29" width="3" height="2" fill="#0a0c0c"/><rect x="43" y="29" width="3" height="2" fill="#0a0c0c"/>'
        + '<path d="M54 56 L66 88" stroke="#8a8270" stroke-width="1"/><path d="M62 88 H70 L68 98 H64 Z" fill="#4a4436"/>'
        + '<circle class="drip" cx="30" cy="132" r="1.2" fill="#9ab0b0"/>';
    },
    penitent: function () {
      return '<ellipse cx="40" cy="139" rx="26" ry="4" fill="#000" opacity=".6"/>'
        + '<path d="M28 44 C22 64 24 84 26 100 L22 138 L30 138 L36 104 L44 104 L50 138 L58 138 L54 100 C56 84 58 64 52 44 Z" fill="#3a3024"/>'
        + '<path d="M28 50 C20 64 14 76 12 86 M52 50 C60 60 66 66 70 64" stroke="#8a7a62" stroke-width="3" fill="none" stroke-linecap="round"/>'
        + '<path d="M70 64 L76 50 M70 64 L80 56 M70 64 L82 64" stroke="#5a4a38" stroke-width="1" fill="none"/>'
        + '<ellipse cx="40" cy="34" rx="9" ry="11" fill="#8a7a62"/><path d="M33 33 h4 M43 33 h4" stroke="#1a120a" stroke-width="2"/><path d="M36 41 Q40 43 44 41" stroke="#1a120a" stroke-width="1" fill="none"/>'
        + '<path d="M34 58 V96 M40 58 V96 M46 58 V96" stroke="#2a2018" stroke-width=".8" opacity=".8"/>';
    },
    wraith: function () {
      return '<ellipse cx="40" cy="139" rx="20" ry="3" fill="#000" opacity=".4"/>'
        + '<path class="hem" d="M20 36 C12 64 10 96 8 124 L14 118 L20 128 L26 116 L32 130 L38 118 L44 128 L50 116 L56 130 L62 118 L68 126 L70 124 C68 96 66 64 58 36 C54 20 26 20 20 36 Z" fill="#b8c0c8" opacity=".55"/>'
        + '<path d="M24 34 C22 18 56 18 54 34 C54 42 48 46 39 46 C30 46 24 42 24 34 Z" fill="#c8d0d8" opacity=".5"/><path d="M30 32 C30 24 48 24 48 32 C48 38 44 41 39 41 C34 41 30 38 30 32 Z" fill="#06070a"/>'
        + '<circle cx="35" cy="32" r="1.2" fill="#dfe8f0" class="blink"/><circle cx="43" cy="32" r="1.2" fill="#dfe8f0" class="blink"/>'
        + '<path d="M18 60 C8 74 6 86 4 96 M60 60 C70 74 72 86 74 96" stroke="#b8c0c8" stroke-width="3" fill="none" opacity=".45" stroke-linecap="round"/>';
    },
    hag: function () {
      return '<ellipse cx="40" cy="139" rx="30" ry="4" fill="#000" opacity=".6"/>'
        + '<path d="M20 60 C10 80 8 110 6 138 L66 138 C66 110 62 82 54 62 C50 50 26 46 20 60 Z" fill="#26201a"/>'
        + '<path d="M22 58 C26 40 46 38 52 52 C56 60 52 66 46 66 L28 66 C22 66 20 62 22 58 Z" fill="#3a3028"/>'
        + '<path d="M34 50 C36 46 44 46 46 52 C46 58 42 62 38 62 C34 60 32 56 34 50 Z" fill="#9a8e7a"/><path d="M36 52 h3 M42 52 h3" stroke="#0e0a08" stroke-width="1.6"/><path d="M40 56 L37 61" stroke="#6a5e4a" stroke-width="1.4"/>'
        + '<path d="M54 70 C62 78 66 84 70 84" stroke="#9a8e7a" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M70 84 C74 80 78 82 76 86 C74 88 72 88 70 86 Z" fill="#c8b890"/>'
        + '<path d="M6 138 L66 138 L62 132 C50 128 20 128 10 132 Z" fill="#d8d8d0" opacity=".8"/>';
    },
    widow: function () {
      return '<ellipse cx="40" cy="138" rx="34" ry="5" fill="#0a1418" opacity=".7"/>'
        + '<path d="M22 40 C14 70 10 104 6 138 L74 138 C70 104 66 70 58 40 C54 22 26 22 22 40 Z" fill="#0c1216"/>'
        + '<path d="M22 40 C14 70 10 104 6 138 M58 40 C66 70 70 104 74 138" stroke="#7a9aa8" stroke-width="1" fill="none" opacity=".5"/>'
        + '<path d="M26 36 C24 20 56 20 54 36 L58 70 C50 64 30 64 22 70 Z" fill="#1c2830" opacity=".9"/>'
        + '<ellipse cx="40" cy="38" rx="8" ry="10" fill="#7a8a90" opacity=".7"/><path d="M36 36 h3 M41 36 h3" stroke="#05080a" stroke-width="1.8"/>'
        + '<path d="M22 66 C10 62 2 56 -4 50 M58 66 C70 62 78 56 84 50" stroke="#0c1216" stroke-width="5" fill="none" stroke-linecap="round"/>'
        + '<circle class="drip" cx="60" cy="120" r="1.4" fill="#9ab8c4"/><circle class="drip" cx="18" cy="110" r="1.2" fill="#9ab8c4" style="animation-delay:-1.6s"/>';
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
        + '<path d="' + path + '" fill="#3a2622" stroke="#0a0606" stroke-width=".8"/><path d="' + path + '" fill="#d2443a" clip-path="url(#' + cid + ')"/>';
    }
    return '<g class="foehearts">' + out + '</g>';
  }

  /* ---------- shared pieces ---------- */
  function defs(id) {
    return '<defs>'
      + '<radialGradient id="' + id + 'glow"><stop offset="0" stop-color="#ffbf6a" stop-opacity=".6"/><stop offset=".4" stop-color="#d87a32" stop-opacity=".22"/><stop offset="1" stop-color="#d87a32" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="' + id + 'wax" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8dcbc"/><stop offset=".55" stop-color="#b8a47a"/><stop offset="1" stop-color="#5e5038"/></linearGradient>'
      + '<linearGradient id="' + id + 'sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07080d"/><stop offset=".5" stop-color="#151a24"/><stop offset=".85" stop-color="#2b2a2e"/><stop offset="1" stop-color="#4a3a32"/></linearGradient>'
      + '<linearGradient id="' + id + 'stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c0d11"/><stop offset=".6" stop-color="#191a1f"/><stop offset="1" stop-color="#0e0e11"/></linearGradient>'
      + '<linearGradient id="' + id + 'ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb2cc" stop-opacity=".32"/><stop offset="1" stop-color="#9fb2cc" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="' + id + 'bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0f1a17"/><stop offset=".4" stop-color="#3e5a50"/><stop offset=".55" stop-color="#7d7a58"/><stop offset="1" stop-color="#0f1a17"/></linearGradient>'
      + '<radialGradient id="' + id + 'vig" cx=".5" cy=".55" r=".72"><stop offset=".5" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".8"/></radialGradient>'
      + '<filter id="' + id + 'blur"><feGaussianBlur stdDeviation="6"/></filter>'
      + '<filter id="' + id + 'soft"><feGaussianBlur stdDeviation="1.4"/></filter>'
      /* the painted grain laid over every picture */
      + '<filter id="' + id + 'grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .45  0 0 0 0 .38  0 0 0 .5 0"/></filter>'
      + '</defs>';
  }
  /* slow fog: wide blurred banks drifting across, each at its own pace */
  function fog(id, y, tone, n) {
    var out = '', r = rnd(y * 7 + 3);
    for (var i = 0; i < (n || 3); i++) out += '<ellipse class="fog f' + (i % 3) + '" cx="' + Math.round(r() * 320) + '" cy="' + (y + Math.round(r() * 14)) + '" rx="' + (70 + Math.round(r() * 60)) + '" ry="' + (8 + Math.round(r() * 8)) + '" fill="' + tone + '" opacity=".22" filter="url(#' + id + 'blur)"/>';
    return out;
  }
  /* embers or dust, drifting up very slowly */
  function motes(x0, x1, y0, y1, color, n, seed) {
    var out = '', r = rnd(seed);
    for (var i = 0; i < n; i++) out += '<circle class="mote" style="animation-delay:-' + (r() * 9).toFixed(1) + 's;animation-duration:' + (7 + r() * 6).toFixed(1) + 's" cx="' + Math.round(x0 + r() * (x1 - x0)) + '" cy="' + Math.round(y0 + r() * (y1 - y0)) + '" r="' + (0.5 + r() * 0.7).toFixed(1) + '" fill="' + color + '"/>';
    return out;
  }
  function grain(id) { return '<rect width="320" height="192" filter="url(#' + id + 'grain)" opacity=".18" style="mix-blend-mode:overlay"/>'; }
  function night(id) {
    return '<rect width="320" height="192" fill="url(#' + id + 'sky)"/>'
      /* a moon behind torn cloud */
      + '<circle cx="250" cy="34" r="26" fill="#c9d2dc" opacity=".08" filter="url(#' + id + 'blur)"/><circle cx="250" cy="34" r="10" fill="#c3c9cf" opacity=".75"/>'
      + '<g class="cloud"><path d="M180 36 C200 26 230 30 250 38 C270 30 300 34 330 42 L330 52 L180 52 Z" fill="#0d1017" opacity=".9"/><path d="M-10 22 C30 14 70 20 100 26 C120 20 150 24 170 30 L170 38 L-10 38 Z" fill="#0d1017" opacity=".7"/></g>'
      + '<path d="M0 128 C30 120 60 124 90 118 C130 110 170 122 210 116 C250 110 290 118 320 114 L320 192 L0 192 Z" fill="#0f1014"/>';
  }
  /* a gnarled dead tree, as a silhouette */
  function tree(x, y, sc) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + sc + ')"><path d="M0 0 C2 -20 -2 -40 4 -60 C8 -72 2 -80 6 -90 M4 -60 C14 -66 22 -64 30 -74 M2 -40 C-10 -46 -18 -44 -26 -54 M6 -84 C12 -90 18 -88 22 -96 M-22 -50 C-26 -58 -24 -62 -30 -66 M26 -70 C30 -76 28 -80 34 -84" stroke="#07070a" stroke-width="3.2" fill="none" stroke-linecap="round"/></g>';
  }

  /* ---------- the places ---------- */
  var SCENES = {
    title: function (s, id) {
      return night(id) + chapel(150, 0.95) + tree(40, 160, 1.2) + fog(id, 140, '#8090a0', 4)
        + '<path d="M0 158 C80 150 240 150 320 158 L320 192 L0 192 Z" fill="#08080a"/>'
        + hero(s, id, 130, 50, 0.95, true) + motes(100, 220, 90, 170, '#ffb060', 8, 3) + fog(id, 168, '#6a7280', 3);
    },
    gate: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + chapel(160, 0.75) + tree(292, 150, 0.9) + fog(id, 122, '#7a8696', 4)
        + '<path d="M0 146 C80 138 240 140 320 148 L320 192 L0 192 Z" fill="#0a0a0d"/>'
        /* leaning gravestones */
        + [[34, 132, -6], [58, 136, 4], [236, 134, 7], [258, 130, -3]].map(function (g) { return '<path transform="rotate(' + g[2] + ' ' + (g[0] + 6) + ' ' + (g[1] + 16) + ')" d="M' + g[0] + ' ' + (g[1] + 16) + ' V' + (g[1] + 4) + ' Q' + (g[0] + 6) + ' ' + (g[1] - 4) + ' ' + (g[0] + 12) + ' ' + (g[1] + 4) + ' V' + (g[1] + 16) + ' Z" fill="#1b1c22"/>'; }).join('')
        /* the path, and the salt line broken in one place */
        + '<path d="M138 192 L150 148 L170 148 L182 192 Z" fill="#141418"/>'
        + '<path d="M84 176 Q130 170 150 172 M170 172 Q200 170 240 176" stroke="#cfd2cc" stroke-width="1.2" stroke-dasharray="1 3" fill="none" opacity=".7"/>'
        /* the lychgate: a steep roof of old shingles on two black posts */
        + '<path d="M106 92 L160 50 L214 92 L204 92 L160 60 L116 92 Z" fill="#100c0a"/><path d="M116 92 L160 60 L204 92 Z" fill="#0b0908"/>'
        + '<path d="M108 92 L160 52 L212 92" stroke="#6a6e78" stroke-width=".8" fill="none" opacity=".5"/>'
        + '<rect x="122" y="92" width="6" height="60" fill="#0b0908"/><rect x="192" y="92" width="6" height="60" fill="#0b0908"/><rect x="126" y="98" width="68" height="3" fill="#100c0a"/>'
        /* the wayshrine and its one candle */
        + '<circle cx="34" cy="140" r="28" fill="url(#' + id + 'glow)" class="glow"/><path d="M25 160 V132 L34 124 L43 132 V160 Z" fill="#26262c"/><rect x="30" y="134" width="8" height="10" fill="#060607"/><ellipse class="flame" cx="34" cy="140" rx="1.6" ry="2.6" fill="#ffcf7a"/>'
        + '<rect x="27" y="162" width="14" height="8" rx="1" fill="' + (f.box ? '#1c1c20' : '#4a4436') + '"/>'
        /* the house; a finger of light at the shutter */
        + '<path d="M232 160 V128 L258 108 L284 128 V160 Z" fill="#0e0e12"/><path d="M228 130 L258 104 L288 130" stroke="#08080a" stroke-width="5" fill="none"/>'
        + '<rect x="250" y="134" width="16" height="14" fill="#060607"/>' + (f.talked ? '' : '<rect x="257" y="134" width="1.6" height="14" fill="#ffb347" class="glow"/><circle cx="258" cy="141" r="16" fill="url(#' + id + 'glow)" class="glow"/>')
        + hero(s, id, 140, 76, 0.62, true) + motes(20, 300, 100, 180, '#c9ccd2', 10, 11) + fog(id, 170, '#5a6270', 3);
    },
    nave: function (s, id) {
      var f = (s && s.flags) || {};
      return '<rect width="320" height="192" fill="url(#' + id + 'stone)"/>'
        /* tall pointed arches, receding */
        + [[20, 0.9], [80, 1], [240, 1], [300, 0.9]].map(function (a) { return '<path d="M' + (a[0] - 18) + ' 150 V60 Q' + a[0] + ' ' + (10 / a[1]) + ' ' + (a[0] + 18) + ' 60 V150" stroke="#08090c" stroke-width="9" fill="none"/>'; }).join('')
        /* the high window and its cold shaft of light, with dust in it */
        + '<path d="M146 90 V38 Q160 10 174 38 V90 Z" fill="#3a4658"/><path d="M148 88 V40 Q160 16 172 40 V88 Z" fill="#6c7d96" opacity=".7"/><path d="M160 18 V90 M148 58 H172" stroke="#08090c" stroke-width="2"/>'
        + '<path class="rays" d="M146 90 L174 90 L238 192 L82 192 Z" fill="url(#' + id + 'ray)"/>'
        + motes(110, 210, 90, 180, '#c8d2e0', 14, 5)
        + '<path d="M0 150 H320 V192 H0 Z" fill="#0d0d10"/>'
        /* pews */
        + [0, 1, 2].map(function (r) { var y = 152 + r * 13; return '<rect x="' + (18 - r * 8) + '" y="' + y + '" width="' + (98 + r * 8) + '" height="6" fill="#16110d"/><rect x="204" y="' + y + '" width="' + (98 + r * 8) + '" height="6" fill="#16110d"/>'; }).join('')
        /* the lectern and the open ledger, the only pale thing here */
        + '<rect x="155" y="118" width="10" height="34" fill="#120d0a"/><path d="M142 112 L178 112 L174 119 L146 119 Z" fill="#1a130e"/>'
        + '<path d="M147 112 Q153 107 160 110 Q167 107 173 112 Z" fill="' + (f.ledger ? '#7d7563' : '#b9b09a') + '"/>'
        /* candle stands, every candle eaten to the wick */
        + [62, 98, 222, 258].map(function (x) { return '<path d="M' + x + ' 140 V98 M' + (x - 7) + ' 98 H' + (x + 7) + '" stroke="#34302a" stroke-width="1.6"/><path d="M' + (x - 5) + ' 98 v-4 M' + x + ' 98 v-6 M' + (x + 5) + ' 98 v-4" stroke="#000" stroke-width="1"/>'; }).join('')
        + '<path d="M298 150 V108 Q306 98 314 108 V150 Z" fill="' + (f.door ? '#030304' : '#15100c') + '"/>'
        + '<path d="M0 150 V112 H20 V150 Z" fill="#030304"/>'
        + hero(s, id, 104, 76, 0.58, hasLight(s))
        + fog(id, 176, '#4a5260', 3)
        + '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>';
    },
    crypt: function (s, id) {
      var f = (s && s.flags) || {};
      return '<rect width="320" height="192" fill="#09090b"/>'
        + [0, 80, 160, 240].map(function (x) { return '<path d="M' + x + ' 150 V64 Q' + (x + 40) + ' 14 ' + (x + 80) + ' 64 V150" stroke="#16161b" stroke-width="10" fill="none"/>'; }).join('')
        + [[20, 76], [50, 82], [100, 72], [130, 84], [190, 76], [220, 82], [262, 74], [292, 82]].map(function (n, j) { return '<rect x="' + n[0] + '" y="' + n[1] + '" width="20" height="14" rx="2" fill="#030304"/>' + (j % 3 === 1 ? '' : '<circle cx="' + (n[0] + 10) + '" cy="' + (n[1] + 8) + '" r="4.5" fill="#8a8272"/><rect x="' + (n[0] + 7) + '" y="' + (n[1] + 7) + '" width="2" height="2" fill="#030304"/><rect x="' + (n[0] + 11) + '" y="' + (n[1] + 7) + '" width="2" height="2" fill="#030304"/>'); }).join('')
        + '<path d="M0 150 H320 V192 H0 Z" fill="#0e0e11"/>'
        /* Brother Odo, curled on the floor */
        + '<path d="M196 168 Q210 156 236 160 Q248 164 244 172 Q220 176 196 172 Z" fill="#050506"/><circle cx="246" cy="164" r="6" fill="' + (f.key ? '#b8a890' : '#8f897c') + '"/>'
        + hero(s, id, 84, 76, 0.58, s && (s.flags.lit || hasLight(s)))
        + motes(60, 200, 110, 180, '#d8b080', 6, 17);
    },
    tower: function (s, id) {
      var won = s && s.over === 'won';
      return '<rect width="320" height="192" fill="url(#' + id + 'stone)"/>'
        + '<path d="M30 20 V72 Q46 52 62 72 V20 Q46 6 30 20 Z" fill="#151a24"/><circle cx="46" cy="40" r="5" fill="#c3c9cf" opacity=".5"/>'
        + motes(30, 62, 24, 70, '#c8d2e0', 5, 23)
        + '<rect x="100" y="16" width="130" height="7" fill="#0c0907"/><rect x="106" y="23" width="7" height="140" fill="#0a0806"/><rect x="217" y="23" width="7" height="140" fill="#0a0806"/>'
        + '<g class="' + (won ? 'swing' : 'still') + '" style="transform-origin:165px 24px"><path d="M165 22 C140 24 132 52 130 80 C128 88 122 92 120 96 H210 C208 92 202 88 200 80 C198 52 190 24 165 22 Z" fill="url(#' + id + 'bronze)"/><path d="M120 96 H210" stroke="#7d7a58" stroke-width="1.6"/><circle cx="165" cy="100" r="4.5" fill="#0f1a17"/></g>'
        + '<path d="M165 98 V130" stroke="#6a6250" stroke-width="2"/><path d="M162 132 l3 -3 l3 3" stroke="#6a6250" stroke-width="1.2" fill="none"/>'
        + '<path d="M262 40 V192 M290 40 V192" stroke="#14100c" stroke-width="4"/>' + [56, 76, 96, 116, 136, 156, 176].map(function (y) { return '<path d="M262 ' + y + ' H290" stroke="#0e0b08" stroke-width="3"/>'; }).join('')
        + '<path d="M0 170 H320 V192 H0 Z" fill="#0b0b0d"/>'
        + (won ? '<g class="ring"><path d="M110 50 q-14 10 0 22 M100 44 q-22 16 0 34 M220 50 q14 10 0 22 M230 44 q22 16 0 34" stroke="#d8c08a" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>' : '')
        + hero(s, id, 150, 88, 0.58, hasLight(s))
        + '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>';
    }
  };
  /* where the foe stands in each place [x, y, scale], and where the light falls in a dark place */
  var SPOT = { crypt: [170, 60, 0.78], gate: [196, 64, 0.78], nave: [196, 64, 0.78], tower: [196, 64, 0.78], cloister: [190, 62, 0.72], undercroft: [180, 66, 0.7],
    crossroads: [200, 66, 0.7], ford: [190, 70, 0.62], barn: [200, 58, 0.72], gibbet: [196, 70, 0.66], ossuary: [186, 60, 0.74], shrine: [196, 66, 0.7], stones: [200, 70, 0.66], mere: [200, 64, 0.72], lane: [200, 70, 0.66] };
  var DARK = { crypt: [120, 140], undercroft: [110, 140], ossuary: [110, 140] };

  /* ---------- the places of the pilgrim road ---------- */
  function stoneRoom(id) { return '<rect width="320" height="192" fill="url(#' + id + 'stone)"/>'; }
  function vign(id) { return '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>'; }
  function wayshrine(id, x, y, lit) {
    return (lit ? '<circle cx="' + x + '" cy="' + (y - 6) + '" r="22" fill="url(#' + id + 'glow)" class="glow"/>' : '')
      + '<path d="M' + (x - 8) + ' ' + (y + 14) + ' V' + (y - 10) + ' L' + x + ' ' + (y - 17) + ' L' + (x + 8) + ' ' + (y - 10) + ' V' + (y + 14) + ' Z" fill="#26262c"/><rect x="' + (x - 3) + '" y="' + (y - 8) + '" width="6" height="8" fill="#060607"/>'
      + (lit ? '<ellipse class="flame" cx="' + x + '" cy="' + (y - 5) + '" rx="1.4" ry="2.4" fill="#ffcf7a"/>' : '');
  }
  function stone(x, y, h, lean) { return '<path transform="rotate(' + (lean || 0) + ' ' + x + ' ' + (y + h) + ')" d="M' + (x - 5) + ' ' + (y + h) + ' L' + (x - 4) + ' ' + (y + 3) + ' Q' + x + ' ' + (y - 2) + ' ' + (x + 4) + ' ' + (y + 3) + ' L' + (x + 5) + ' ' + (y + h) + ' Z" fill="#1d1e24"/>'; }
  Object.assign(SCENES, {
    cloister: function (s, id) {
      return stoneRoom(id) + '<rect width="320" height="70" fill="url(#' + id + 'sky)"/>' + '<circle cx="250" cy="24" r="7" fill="#c3c9cf" opacity=".6"/>'
        + [0, 1, 2, 3, 4, 5, 6].map(function (i) { var x = 10 + i * 50; return '<path d="M' + x + ' 150 V84 Q' + (x + 25) + ' 56 ' + (x + 50) + ' 84" stroke="#0a0a0d" stroke-width="7" fill="none"/>'; }).join('')
        + '<rect y="60" width="320" height="12" fill="#0c0c10"/><path d="M0 150 H320 V192 H0 Z" fill="#101410"/><path d="M40 170 H280" stroke="#1a2418" stroke-width="18"/>'
        + '<ellipse cx="160" cy="166" rx="18" ry="5" fill="#1d1e24"/><path d="M142 166 V152 H178 V166" fill="#1d1e24"/><path d="M146 152 V126 M174 152 V126 M142 126 H178" stroke="#141418" stroke-width="3"/>'
        + hero(s, id, 70, 74, 0.58, hasLight(s)) + motes(20, 300, 80, 170, '#c8d2e0', 8, 31) + fog(id, 168, '#5a6270', 2) + vign(id);
    },
    undercroft: function (s, id) {
      return '<rect width="320" height="192" fill="#0b0a09"/>'
        + [0, 64, 128, 192, 256].map(function (x) { return '<path d="M' + x + ' 140 V70 Q' + (x + 32) + ' 40 ' + (x + 64) + ' 70" stroke="#17140f" stroke-width="8" fill="none"/>'; }).join('')
        + '<path d="M0 140 H320 V192 H0 Z" fill="#100e0b"/>'
        + [[30, 120], [56, 124], [250, 118], [278, 124]].map(function (b) { return '<ellipse cx="' + b[0] + '" cy="' + b[1] + '" rx="12" ry="17" fill="#2a1e14"/><path d="M' + (b[0] - 12) + ' ' + b[1] + ' H' + (b[0] + 12) + '" stroke="#3a2c1e" stroke-width="2"/>'; }).join('')
        + '<path d="M100 150 C104 136 124 134 128 150 Z M126 152 C130 140 146 138 150 152 Z" fill="#3a3226"/><rect x="214" y="138" width="26" height="14" fill="#2a2018"/><rect x="220" y="126" width="26" height="14" fill="#2e241a"/>'
        + hero(s, id, 84, 76, 0.56, s && (s.flags.lit || hasLight(s))) + motes(60, 220, 110, 170, '#d8b080', 5, 41);
    },
    crossroads: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + tree(40, 140, 0.8) + fog(id, 124, '#7a8696', 3)
        + '<path d="M0 150 C80 142 240 144 320 150 L320 192 L0 192 Z" fill="#0a0a0d"/><path d="M120 192 L150 148 L170 148 L200 192 Z M0 168 L320 160 L320 170 L0 178 Z" fill="#141418"/>'
        + '<path d="M262 160 V86 M246 96 H284 M250 108 H278" stroke="#16120e" stroke-width="3.4"/>'
        + wayshrine(id, 286, 146, true)
        /* the cart: in the ditch, or back on the road */
        + '<g transform="translate(206 ' + (f.freed ? 116 : 124) + ') rotate(' + (f.freed ? 0 : 9) + ')"><rect x="0" y="0" width="58" height="18" fill="#1e1610"/><path d="M0 0 L-6 -10 M58 0 L64 -10" stroke="#1e1610" stroke-width="3"/><path d="M-18 12 H0" stroke="#16100c" stroke-width="3"/><circle cx="14" cy="24" r="11" fill="none" stroke="#120d0a" stroke-width="3"/><circle cx="46" cy="24" r="11" fill="none" stroke="#120d0a" stroke-width="3"/></g>'
        + '<path d="M186 140 C186 128 196 126 198 136 L200 146 L186 146 Z" fill="#0d0c0e"/><circle cx="192" cy="124" r="5" fill="#0d0c0e"/>'
        + hero(s, id, 110, 74, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '#c9ccd2', 8, 51) + fog(id, 172, '#5a6270', 3);
    },
    lane: function (s, id) {
      return night(id) + '<path d="M0 60 C40 40 80 70 120 96 L130 192 L0 192 Z M320 60 C280 40 240 70 200 96 L190 192 L320 192 Z" fill="#07080a"/>'
        + '<path d="M120 96 L200 96 L230 192 L90 192 Z" fill="#17161a"/>' + [0, 1, 2, 3, 4, 5].map(function (i) { var y = 110 + i * 14, x = 156 + (i % 2 ? 6 : -6); return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + (1.4 + i * 0.3) + '" ry="' + (2.4 + i * 0.4) + '" fill="#2a2a30"/>'; }).join('')
        + fog(id, 100, '#7a8696', 3) + hero(s, id, 96, 70, 0.62, hasLight(s)) + motes(60, 260, 80, 170, '#c9ccd2', 6, 61) + vign(id);
    },
    ford: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + '<path d="M0 118 C80 112 240 114 320 118 L320 160 L0 160 Z" fill="#141c24"/>'
        + [0, 1, 2, 3].map(function (i) { return '<path class="fog f' + (i % 3) + '" d="M' + (i * 80) + ' ' + (126 + i * 7) + ' q20 -3 40 0 t40 0" stroke="#9fb2c4" stroke-width="1" fill="none" opacity=".35"/>'; }).join('')
        + (f.flood ? '' : [70, 110, 150, 190, 230, 270].map(function (x, i) { return '<ellipse cx="' + x + '" cy="' + (142 - i * 3) + '" rx="7" ry="2.4" fill="#5a6470" opacity=".8"/>'; }).join(''))
        + '<path d="M0 160 H320 V192 H0 Z" fill="#0a0b0d"/>' + [12, 18, 26, 290, 300, 308].map(function (x) { return '<path d="M' + x + ' 162 Q' + (x + 2) + ' 140 ' + (x - 2) + ' 124" stroke="#0e110c" stroke-width="1.6" fill="none"/>'; }).join('')
        + '<path d="M18 130 V104 L36 92 L54 104 V130 Z" fill="#0d0c0e"/><rect x="30" y="112" width="8" height="18" fill="#030304"/>'
        + hero(s, id, s && s.fight ? 120 : 70, 82, 0.56, hasLight(s)) + fog(id, 150, '#6a7a88', 3);
    },
    barn: function (s, id) {
      return '<rect width="320" height="192" fill="#0e0b08"/>'
        + '<path d="M0 40 L160 0 L320 40" stroke="#1c140d" stroke-width="8" fill="none"/>' + [40, 120, 200, 280].map(function (x) { return '<rect x="' + (x - 4) + '" y="20" width="8" height="140" fill="#1a120c"/><path d="M' + (x - 30) + ' 60 L' + x + ' 30 L' + (x + 30) + ' 60" stroke="#1a120c" stroke-width="4" fill="none"/>'; }).join('')
        + '<path d="M0 150 H320 V192 H0 Z" fill="#14100a"/>'
        + [[230, 110], [262, 100], [290, 112], [250, 128], [282, 132]].map(function (b) { return '<path d="M' + (b[0] - 14) + ' ' + (b[1] + 24) + ' L' + (b[0] - 8) + ' ' + b[1] + ' L' + (b[0] + 8) + ' ' + b[1] + ' L' + (b[0] + 14) + ' ' + (b[1] + 24) + ' Z" fill="#4a3a1e"/><path d="M' + (b[0] - 10) + ' ' + (b[1] + 12) + ' H' + (b[0] + 10) + '" stroke="#2a200e" stroke-width="2"/>'; }).join('')
        + motes(40, 300, 60, 150, '#d8c08a', 14, 71) + hero(s, id, 80, 74, 0.58, hasLight(s)) + vign(id);
    },
    gibbet: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + fog(id, 120, '#7a8696', 3) + '<path d="M0 152 C80 144 240 146 320 152 L320 192 L0 192 Z" fill="#0a0a0d"/>'
        + '<path d="M150 152 V30 H200" stroke="#120e0b" stroke-width="5" fill="none"/><path d="M196 30 V40" stroke="#2a2420" stroke-width="1.4"/>'
        + '<g class="sway" style="transform-origin:196px 40px"><path d="M184 40 H208 V82 Q196 90 184 82 Z" fill="none" stroke="#2a2420" stroke-width="1.6"/><path d="M190 40 V84 M196 40 V88 M202 40 V84" stroke="#2a2420" stroke-width="1"/>'
        + (f.cage ? '' : '<path d="M192 50 C188 60 190 72 194 82 L200 82 C202 72 204 60 200 50 Z" fill="#0d0c0e"/><circle cx="196" cy="47" r="4" fill="#0d0c0e"/>') + '</g>'
        + '<path d="M150 50 l-6 -3 l6 0 Z M200 30 l5 -4 l2 4 Z" fill="#050506"/>' + wayshrine(id, 270, 140, !!f.candle)
        + hero(s, id, 84, 78, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '#c9ccd2', 6, 81) + fog(id, 172, '#5a6270', 3);
    },
    ossuary: function (s, id) {
      var f = (s && s.flags) || {}, rows = '';
      for (var r = 0; r < 5; r++) for (var c = 0; c < 18; c++) { var x = 8 + c * 17 + (r % 2) * 8, y = 30 + r * 18; rows += '<circle cx="' + x + '" cy="' + y + '" r="6" fill="#7a7262" opacity="' + (0.55 + (c * 7 % 5) / 12).toFixed(2) + '"/><rect x="' + (x - 3) + '" y="' + (y - 1) + '" width="2" height="2" fill="#0a0908"/><rect x="' + (x + 1) + '" y="' + (y - 1) + '" width="2" height="2" fill="#0a0908"/>'; }
      return '<rect width="320" height="192" fill="#0a0a0b"/>' + rows + '<path d="M0 118 H320 V140 H0 Z" fill="#3a352c" opacity=".6"/>'
        + '<path d="M0 140 H320 V192 H0 Z" fill="#0e0e11"/>'
        + '<g transform="translate(262 92)">' + (f.grille ? '<rect x="0" y="0" width="44" height="58" fill="#030304"/>' : '<rect x="0" y="0" width="44" height="58" fill="#060607"/>' + [6, 14, 22, 30, 38].map(function (x) { return '<path d="M' + x + ' 0 V58" stroke="#3a3836" stroke-width="2"/>'; }).join('')) + '</g>'
        + '<path d="M0 60 L30 140 L0 140 Z" fill="#050506"/>'
        + hero(s, id, 84, 76, 0.56, s && (s.flags.lit || hasLight(s))) + motes(60, 220, 110, 170, '#c8c0a8', 5, 91);
    },
    stones: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + '<path d="M0 140 C60 110 120 100 200 104 C250 106 290 116 320 124 L320 192 L0 192 Z" fill="#0c0d10"/>'
        + [[30, 132, 16, -4], [80, 118, 18, 3], [130, 108, 20, -2], [180, 104, 20, 2], [230, 108, 18, -3], [280, 118, 16, 4]].map(function (b) { return stone(b[0], b[1] - b[2], b[2], b[3]); }).join('')
        + '<path d="M30 134 Q80 120 130 110 T230 110 T290 120" stroke="#e8e8e0" stroke-width="1.2" stroke-dasharray="' + (f.mended ? '0' : '6 10') + '" fill="none" opacity=".7"/>'
        + '<path d="M190 70 L200 62 L210 70 V84 H190 Z" fill="#141418"/>' + fog(id, 130, '#7a8696', 3)
        + hero(s, id, 70, 84, 0.58, hasLight(s)) + motes(20, 300, 100, 180, '#c9ccd2', 8, 101) + fog(id, 176, '#5a6270', 3);
    },
    shrine: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + '<path d="M0 150 C80 144 240 144 320 150 L320 192 L0 192 Z" fill="#0b0b0e"/>'
        + stone(40, 120, 30, -5) + stone(290, 118, 32, 4)
        + '<path d="M120 152 V82 L160 54 L200 82 V152 Z" fill="#1a1a20"/><path d="M134 152 V96 Q160 74 186 96 V152 Z" fill="#050506"/>'
        + (f.beat_hag ? '' : '<path d="M128 156 Q160 140 196 156 Z" fill="#9a9a92" opacity=".7"/>')
        + (s && s.over === 'won' ? '<circle cx="160" cy="118" r="34" fill="url(#' + id + 'glow)" class="glow"/><path d="M156 128 Q160 108 164 128" stroke="#d8c8a8" stroke-width="3" fill="none"/>' : '')
        + hero(s, id, 66, 80, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '#c9ccd2', 8, 111) + fog(id, 170, '#5a6270', 3);
    },
    mere: function (s, id) {
      var f = (s && s.flags) || {};
      return night(id) + '<path d="M0 130 C80 124 240 124 320 130 L320 192 L0 192 Z" fill="#0b0c0f"/>'
        + '<ellipse cx="200" cy="150" rx="130" ry="22" fill="#05070a"/><ellipse cx="250" cy="146" rx="30" ry="2" fill="#c3c9cf" opacity=".12"/>'
        + [[60, 112, 26, -6], [100, 106, 30, 2], [300, 108, 28, 5], [262, 102, 30, -3], [150, 104, 26, 4]].map(function (b) { return stone(b[0], b[1], b[2], b[3]); }).join('')
        + (f.lost ? '' : '<path d="M150 152 C148 138 150 128 154 122 C158 128 160 138 158 152 Z" fill="#6a6a70" opacity=".85"/><circle cx="154" cy="118" r="4" fill="#6a6a70" opacity=".85"/>')
        + fog(id, 140, '#7a8696', 4) + hero(s, id, 50, 78, 0.6, hasLight(s)) + motes(20, 300, 100, 180, '#9fb2c4', 6, 121);
    }
  });
  /* the chapel and its squat tower, black against the sky, one window lit low */
  function chapel(x, sc) {
    return '<g transform="translate(' + x + ' 150) scale(' + sc + ') translate(0 -150)">'
      + '<path d="M-64 150 V98 L-2 66 L60 98 V150 Z" fill="#0b0b0f"/><rect x="18" y="40" width="36" height="110" fill="#0d0d12"/><path d="M14 42 L36 12 L58 42 Z" fill="#0b0b0f"/>'
      + '<path d="M30 66 V56 Q36 48 42 56 V66 Z" fill="#020203"/><rect x="-34" y="112" width="6" height="12" rx="3" fill="#d88a3a" opacity=".7" class="glow"/>'
      + '<path d="M54 42 V150" stroke="#5a6070" stroke-width=".8" opacity=".5"/></g>';
  }
  function hasLight(s) { var C = root.SacramentSheetCore, L = root.SacramentSolo && root.SacramentSolo.LIGHTS; return !!(s && C && L && (s.hero.gear || []).some(function (g) { var it = C.itemOf(g); return it && L.indexOf(it.id) >= 0; })); }

  /* the dark: everything beyond the light falls away; without a light, the room is nearly black */
  function dark(id, light) {
    if (!light) return '<rect width="320" height="192" fill="#000" opacity=".86"/>';
    return '<defs><radialGradient id="' + id + 'dark" gradientUnits="userSpaceOnUse" cx="' + light[0] + '" cy="' + light[1] + '" r="160"><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".65" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity=".95"/></radialGradient></defs><rect width="320" height="192" fill="url(#' + id + 'dark)"/>';
  }

  /* One picture: the place, the foe if there is one, the dark if the place is dark, and the grain over all. */
  function scene(name, s, id) {
    id = id || 'a';
    var fn = SCENES[name] || SCENES.title, body = fn(s, id);
    var spot = SPOT[name] || [196, 64, 0.78], f = s && s.fight;
    if (f) body += foe(f.art || 'eater', id, spot[0], spot[1], spot[2], f.hp.cur / f.hp.max);
    if (DARK[name]) { var lit = s && (s.flags.lit || hasLight(s)); body += dark(id, lit ? DARK[name] : null); if (f && (f.art || 'eater') === 'eater') body += '<ellipse class="flame foeflame" cx="' + (spot[0] + 35) + '" cy="' + spot[1] + '" rx="2.4" ry="4" fill="#ffa040" opacity=".9"/>'; }
    if (f) body += hearts(id + 'f', spot[0] + 40 * spot[2], Math.max(4, spot[1] - 14), f.hp);
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' + defs(id) + body + grain(id) + '</svg>';
  }
  /* a small picture for a kind of gear, for the hero sheet */
  var ICONS = {
    weapon: '<path d="M6 26 L22 10 L26 6 L24 12 L10 26 Z" fill="#9a9ca6"/><path d="M5 21 L11 27 M4 28 l4 -4" stroke="#7a5a30" stroke-width="2.4" stroke-linecap="round"/>',
    armour: '<path d="M16 4 L27 8 V16 C27 22 22 27 16 29 C10 27 5 22 5 16 V8 Z" fill="#4a4e58"/><path d="M16 4 V29" stroke="#9a9ca6" stroke-width="1.2" opacity=".6"/>',
    supply: '<path d="M10 8 H22 L24 28 H8 Z" fill="#5e4a32"/><path d="M12 8 Q16 2 20 8" stroke="#9a8f78" stroke-width="1.6" fill="none"/>',
    relic: '<circle cx="16" cy="16" r="10" fill="#d8a85a" opacity=".2"/><path d="M16 5 V27 M9 12 H23" stroke="#c9a868" stroke-width="2.6" stroke-linecap="round"/>',
    grimoire: '<rect x="7" y="5" width="18" height="23" rx="2" fill="#4a1a18"/><path d="M10 5 V28" stroke="#2a0e0c" stroke-width="2"/><path d="M16 11 V21 M12 15 H20" stroke="#c9a868" stroke-width="1.6"/>'
  };
  function icon(kind) { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + (ICONS[kind] || ICONS.supply) + '</svg>'); }
  root.SacramentSoloArt = { W: W, H: H, scene: scene, icon: icon, scenes: Object.keys(SCENES) };
})(typeof window !== 'undefined' ? window : globalThis);
