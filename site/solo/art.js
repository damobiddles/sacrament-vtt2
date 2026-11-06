/* Sacrament RPG solo: the pictures, in an anime style. Every picture is drawn here as SVG (no image files): soft painted skies, rim light,
   and characters with large eyes and clean line work. Flames, glows and breathing move with CSS (solo.css), and stay still for anyone who asks
   their device for less motion. scene(name, state, id) returns the markup for one picture; id keeps gradient names apart when two pictures are on the page. */
(function (root) {
  'use strict';
  var W = 320, H = 192;
  var HAIR = ['#2a1d17', '#1b1a22', '#6e2f22', '#b9b3c4', '#8a6a44', '#3b2a4a'], SKIN = ['#f3d9c4', '#e8c3a0', '#c99572', '#8f5f43'], IRIS = ['#c58a3b', '#6f8fc9', '#5e9c86', '#a4443b', '#8c6bb8'];
  function hash(t) { var h = 7; t = String(t || ''); for (var i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0; return h; }

  /* ---------- the hero ---------- */
  /* Drawn in a 100 × 140 box, feet at the bottom. The look follows the hero: hair, skin and eyes from the name, the cloak from what they carry. */
  function hero(s, id, x, y, scale, lamp) {
    var h = (s && s.hero) || { name: 'Pilgrim', gear: [] }, k = hash(h.name), C = root.SacramentSheetCore;
    var kinds = (h.gear || []).map(function (g) { var it = C && C.itemOf(g); return it ? it.kind + ':' + (g.eq ? 1 : 0) : ''; }).join(' ');
    var cloak = /grimoire:1/.test(kinds) ? ['#2b3560', '#1a2040'] : /armour:1/.test(kinds) ? ['#5a2a26', '#3a1a18'] : ['#4a3d2c', '#2e261b'];
    var hair = HAIR[k % HAIR.length], skin = SKIN[(k >>> 3) % SKIN.length], iris = IRIS[(k >>> 6) % IRIS.length];
    return '<g class="who hero" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><g class="breathe">'
      + '<ellipse cx="50" cy="138" rx="30" ry="5" fill="#000" opacity=".45"/>'
      /* cloak */
      + '<path d="M30 74 C22 96 16 118 14 136 L86 136 C84 118 78 96 70 74 Z" fill="' + cloak[0] + '"/>'
      + '<path d="M50 80 L44 136 M60 84 L66 136 M38 90 L28 136" stroke="' + cloak[1] + '" stroke-width="2" fill="none" opacity=".8"/>'
      + '<path d="M70 74 C78 96 84 118 86 136 L80 136 C76 112 72 94 64 78 Z" fill="#fff" opacity=".07"/>'
      + '<path d="M34 76 Q50 86 66 76 L64 84 Q50 92 36 84 Z" fill="#7a2a24"/>'
      /* hood behind */
      + '<path d="M22 54 C20 22 80 22 78 54 C80 74 70 84 50 84 C30 84 20 74 22 54 Z" fill="' + cloak[1] + '"/>'
      /* face */
      + '<path d="M31 50 C31 34 69 34 69 50 C69 64 60 76 50 77 C40 76 31 64 31 50 Z" fill="' + skin + '"/>'
      + '<path d="M60 70 C64 66 68 58 69 50 C69 62 64 72 56 76 Z" fill="#000" opacity=".08"/>'
      /* hair */
      + '<path d="M30 52 C26 30 44 24 52 26 C64 24 76 34 70 54 C68 44 64 40 60 38 C60 44 56 46 52 40 C50 46 44 48 40 42 C38 48 34 50 30 52 Z" fill="' + hair + '"/>'
      + '<path d="M44 30 C50 28 58 30 62 34" stroke="#fff" stroke-width="1.6" fill="none" opacity=".35" stroke-linecap="round"/>'
      + '<path d="M30 52 C30 62 32 70 34 74 C30 70 28 60 30 52 Z M70 54 C70 62 68 70 66 74 C70 70 72 62 70 54 Z" fill="' + hair + '"/>'
      /* eyes */
      + eye(42, 56, iris) + eye(58, 56, iris)
      + '<path d="M37 47 Q42 45 46 47 M54 47 Q58 45 63 47" stroke="' + hair + '" stroke-width="1.6" fill="none" stroke-linecap="round"/>'
      + '<ellipse cx="38" cy="64" rx="3.5" ry="1.8" fill="#e07a6a" opacity=".35"/><ellipse cx="62" cy="64" rx="3.5" ry="1.8" fill="#e07a6a" opacity=".35"/>'
      + '<path d="M47 68 Q50 69.5 53 68" stroke="#7a3b2e" stroke-width="1.3" fill="none" stroke-linecap="round"/>'
      /* hood front */
      + '<path d="M22 54 C20 22 80 22 78 54 C76 40 66 30 50 30 C34 30 24 40 22 54 Z" fill="' + cloak[0] + '"/>'
      + '<path d="M24 50 C26 34 40 28 50 28" stroke="#fff" stroke-width="1.5" fill="none" opacity=".18"/>'
      /* hand and lamp */
      + (lamp ? '<path d="M80 104 L82 92" stroke="#2e261b" stroke-width="2"/><circle cx="82" cy="112" r="22" fill="url(#' + id + 'glow)" class="glow"/>'
        + '<rect x="76" y="104" width="12" height="14" rx="2" fill="#3a2a18" stroke="#b8955a" stroke-width="1.4"/><ellipse class="flame" cx="82" cy="111" rx="3" ry="4.5" fill="#ffd97a"/>'
        + '<circle cx="76" cy="100" r="5" fill="' + skin + '"/>' : '<circle cx="74" cy="104" r="5" fill="' + skin + '"/>')
      + '</g></g>';
  }
  function eye(cx, cy, iris) {
    return '<ellipse cx="' + cx + '" cy="' + (cy + 0.5) + '" rx="5.6" ry="7" fill="#fbf6ec"/>'
      + '<ellipse cx="' + cx + '" cy="' + (cy + 1) + '" rx="4.6" ry="6.2" fill="' + iris + '"/>'
      + '<ellipse cx="' + cx + '" cy="' + (cy + 2.6) + '" rx="3.4" ry="3.6" fill="#000" opacity=".25"/>'
      + '<ellipse cx="' + cx + '" cy="' + (cy + 1.5) + '" rx="2.2" ry="3" fill="#120d0b"/>'
      + '<circle cx="' + (cx - 1.8) + '" cy="' + (cy - 1.6) + '" r="1.9" fill="#fff"/><circle cx="' + (cx + 2) + '" cy="' + (cy + 4) + '" r=".9" fill="#fff" opacity=".85"/>'
      + '<path d="M' + (cx - 6.4) + ' ' + (cy - 4) + ' Q' + cx + ' ' + (cy - 9) + ' ' + (cx + 6.4) + ' ' + (cy - 4.2) + '" stroke="#120d0b" stroke-width="2.2" fill="none" stroke-linecap="round"/>';
  }

  /* ---------- the Candle-Eater ---------- */
  function eater(id, x, y, scale, hurtRatio) {
    var cracks = hurtRatio < 0.66 ? '<path d="M38 70 l6 8 l-3 6 M64 64 l-5 9" stroke="#8a7350" stroke-width="1.4" fill="none"/>' : '';
    cracks += hurtRatio < 0.33 ? '<path d="M30 92 l8 -4 l4 6 M70 90 l-6 -6" stroke="#8a7350" stroke-width="1.4" fill="none"/>' : '';
    return '<g class="who foe" transform="translate(' + x + ' ' + y + ') scale(' + scale + ')"><g class="sway">'
      + '<ellipse cx="50" cy="136" rx="36" ry="6" fill="#000" opacity=".5"/>'
      + '<circle cx="50" cy="26" r="30" fill="url(#' + id + 'glow)" class="glow"/>'
      + '<path d="M50 34 C72 34 86 56 86 84 C86 102 92 118 90 132 C84 126 82 136 76 134 C72 124 68 136 62 132 C58 120 52 136 46 132 C40 124 36 136 30 132 C26 124 20 134 14 130 C14 112 16 100 14 84 C14 56 28 34 50 34 Z" fill="url(#' + id + 'wax)"/>'
      + '<path d="M66 44 C78 54 82 70 82 88" stroke="#fff" stroke-width="3" fill="none" opacity=".35" stroke-linecap="round"/>'
      /* wax runs down from the crown, where the wick burns */
      + '<path d="M40 38 C38 46 40 52 37 58 C35 62 39 64 40 60 C42 54 42 46 44 37 Z M58 37 C60 44 58 50 61 54 C63 57 60 60 58 56 C56 50 56 44 55 36 Z" fill="#fff9e8" opacity=".85"/>'
      + '<ellipse cx="50" cy="38" rx="14" ry="4" fill="#d9c7a0" opacity=".7"/>'
      + '<path d="M22 70 C20 86 22 104 20 120" stroke="#9c8660" stroke-width="2" fill="none" opacity=".5"/>'
      + cracks
      /* eyes: two wide, wet dark eyes */
      + '<ellipse cx="38" cy="72" rx="8" ry="10" fill="#120d0b"/><ellipse cx="62" cy="72" rx="8" ry="10" fill="#120d0b"/>'
      + '<circle cx="35" cy="68" r="2.6" fill="#fff"/><circle cx="59" cy="68" r="2.6" fill="#fff"/><circle cx="41" cy="77" r="1.1" fill="#ffd97a"/><circle cx="65" cy="77" r="1.1" fill="#ffd97a"/>'
      + '<path d="M44 92 Q50 96 56 92" stroke="#5a4630" stroke-width="2" fill="none" stroke-linecap="round"/>'
      /* the wick and its flame */
      + '<path d="M50 34 Q48 26 51 20" stroke="#120d0b" stroke-width="2.4" fill="none"/>'
      + '<path class="flame" d="M51 2 C58 10 58 18 51 22 C44 18 45 10 51 2 Z" fill="#ffb347"/><path class="flame" d="M51 9 C54 13 54 17 51 19 C48 17 48 13 51 9 Z" fill="#fff3c4"/>'
      + '</g></g>';
  }

  /* ---------- shared pieces ---------- */
  function defs(id) {
    return '<defs>'
      + '<radialGradient id="' + id + 'glow"><stop offset="0" stop-color="#ffd97a" stop-opacity=".75"/><stop offset=".45" stop-color="#e8913a" stop-opacity=".25"/><stop offset="1" stop-color="#e8913a" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="' + id + 'wax" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbf3dc"/><stop offset=".6" stop-color="#e6d6b0"/><stop offset="1" stop-color="#b59c6c"/></linearGradient>'
      + '<linearGradient id="' + id + 'dusk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0f1330"/><stop offset=".45" stop-color="#2c2a55"/><stop offset=".72" stop-color="#6b3d5c"/><stop offset=".9" stop-color="#c46a4c"/><stop offset="1" stop-color="#e59a5c"/></linearGradient>'
      + '<linearGradient id="' + id + 'stone" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2433"/><stop offset="1" stop-color="#16131c"/></linearGradient>'
      + '<linearGradient id="' + id + 'ray" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8c8ff" stop-opacity=".45"/><stop offset="1" stop-color="#b8c8ff" stop-opacity="0"/></linearGradient>'
      + '<linearGradient id="' + id + 'bronze" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f5a4d"/><stop offset=".35" stop-color="#86b3a1"/><stop offset=".55" stop-color="#d6c38a"/><stop offset="1" stop-color="#2f5a4d"/></linearGradient>'
      + '<radialGradient id="' + id + 'vig" cx=".5" cy=".55" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".65"/></radialGradient>'
      + '<filter id="' + id + 'soft"><feGaussianBlur stdDeviation="2.5"/></filter>'
      + '</defs>';
  }
  function stars(n, seed) { var out = ''; for (var i = 0; i < n; i++) { seed = (seed * 9301 + 49297) % 233280; var x = seed % W; seed = (seed * 9301 + 49297) % 233280; var y = seed % 70; out += '<circle class="twinkle" style="animation-delay:' + (i % 7) * 0.4 + 's" cx="' + x + '" cy="' + y + '" r="' + (i % 5 ? 0.7 : 1.2) + '" fill="#e8ecff"/>'; } return out; }
  function dusk(id) {
    return '<rect width="320" height="192" fill="url(#' + id + 'dusk)"/>' + stars(36, 5)
      + '<circle cx="262" cy="30" r="20" fill="#f6e9c8" opacity=".12" filter="url(#' + id + 'soft)"/><circle cx="262" cy="30" r="11" fill="#f6e9c8"/><circle cx="268" cy="26" r="10" fill="#1c1d40"/>'
      + '<path d="M0 132 C40 118 80 124 120 116 C170 108 220 122 260 114 C290 108 310 114 320 112 L320 192 L0 192 Z" fill="#241c2c"/>'
      + '<path d="M0 142 C60 132 120 140 180 132 C240 126 290 136 320 132 L320 192 L0 192 Z" fill="#1a1520"/>';
  }

  /* ---------- the places ---------- */
  var SCENES = {
    title: function (s, id) {
      return dusk(id) + chapel(id, 120, 1)
        + '<path d="M0 160 C80 150 240 150 320 160 L320 192 L0 192 Z" fill="#110e14"/>'
        + hero(s, id, 118, 52, 0.95, true);
    },
    gate: function (s, id) {
      var f = (s && s.flags) || {};
      return dusk(id) + chapel(id, 150, 0.8)
        + '<path d="M0 150 C80 140 240 142 320 150 L320 192 L0 192 Z" fill="#14101a"/>'
        /* gravestones */
        + [[40, 132], [62, 136], [236, 134], [258, 130]].map(function (g) { return '<path d="M' + g[0] + ' ' + (g[1] + 16) + ' V' + (g[1] + 4) + ' Q' + (g[0] + 6) + ' ' + (g[1] - 4) + ' ' + (g[0] + 12) + ' ' + (g[1] + 4) + ' V' + (g[1] + 16) + ' Z" fill="#3a3346"/><path d="M' + (g[0] + 9) + ' ' + (g[1] + 2) + ' Q' + (g[0] + 12) + ' ' + (g[1] + 6) + ' ' + (g[0] + 12) + ' ' + (g[1] + 14) + '" stroke="#c46a4c" stroke-width="1" fill="none" opacity=".6"/>'; }).join('')
        /* path and the broken salt line */
        + '<path d="M140 192 L150 150 L170 150 L180 192 Z" fill="#2a2230"/>'
        + '<path d="M86 176 Q130 170 152 172 M168 172 Q200 170 238 176" stroke="#f4f0e6" stroke-width="1.6" stroke-dasharray="1 3" fill="none"/>'
        /* the lychgate: a steep gable of shingles on two posts */
        + '<path d="M104 92 L160 52 L216 92 L204 92 L160 62 L116 92 Z" fill="#3a2414"/><path d="M110 92 L160 56 L210 92" stroke="#e59a5c" stroke-width="1.2" fill="none" opacity=".6"/>'
        + '<path d="M116 92 L160 62 L204 92 Z" fill="#2a1a10"/><path d="M128 84 L192 84 M138 76 L182 76 M148 68 L172 68" stroke="#4a3020" stroke-width="2"/>'
        + '<rect x="122" y="92" width="7" height="62" fill="#2a1a10"/><rect x="191" y="92" width="7" height="62" fill="#2a1a10"/><rect x="126" y="98" width="68" height="4" fill="#3a2414"/>'
        + '<path d="M160 52 V42 M155 46 H165" stroke="#c9bb98" stroke-width="2"/>'
        /* wayshrine and its box */
        + '<circle cx="36" cy="140" r="26" fill="url(#' + id + 'glow)" class="glow"/><path d="M26 160 V132 L36 124 L46 132 V160 Z" fill="#6b6278"/><rect x="31" y="134" width="10" height="11" fill="#1a1520"/><ellipse class="flame" cx="36" cy="140" rx="2" ry="3" fill="#ffd97a"/>'
        + '<rect x="28" y="162" width="16" height="9" rx="1" fill="' + (f.box ? '#4a4258' : '#c9bb98') + '"/>'
        /* the house with the watcher */
        + '<path d="M240 160 V128 L264 110 L288 128 V160 Z" fill="#241c2c"/><path d="M236 130 L264 106 L292 130" stroke="#3a2414" stroke-width="5" fill="none"/>'
        + '<rect x="256" y="134" width="16" height="14" fill="#1a1218"/>' + (f.talked ? '' : '<rect x="263" y="134" width="2.4" height="14" fill="#ffb347"/><circle cx="264" cy="141" r="14" fill="url(#' + id + 'glow)" class="glow"/>')
        + hero(s, id, 138, 82, 0.7, true);
    },
    nave: function (s, id) {
      var f = (s && s.flags) || {};
      return '<rect width="320" height="192" fill="url(#' + id + 'stone)"/>'
        + '<path d="M0 0 H320 V12 C260 30 60 30 0 12 Z" fill="#100d14"/>'
        /* pillars */
        + [30, 290].map(function (x) { return '<rect x="' + (x - 12) + '" y="0" width="24" height="150" fill="#1d1824"/><rect x="' + (x + 6) + '" y="0" width="3" height="150" fill="#fff" opacity=".05"/>'; }).join('')
        /* the lancet window and its moonlight */
        + '<path d="M144 92 V40 Q160 14 176 40 V92 Z" fill="#7d8fd6"/><path d="M146 90 V42 Q160 20 174 42 V90 Z" fill="#b8c8ff" opacity=".55"/><path d="M160 22 V92 M146 60 H174" stroke="#100d14" stroke-width="2.5"/>'
        + '<path class="rays" d="M144 92 L176 92 L236 192 L84 192 Z" fill="url(#' + id + 'ray)"/>'
        + '<path d="M0 150 L320 150 L320 192 L0 192 Z" fill="#221c26"/><path d="M0 150 H320" stroke="#3a3346" stroke-width="1"/>'
        /* pews */
        + [0, 1, 2].map(function (r) { var y = 152 + r * 13; return '<rect x="' + (20 - r * 8) + '" y="' + y + '" width="' + (96 + r * 8) + '" height="7" rx="1" fill="#3a2414"/><rect x="' + (204) + '" y="' + y + '" width="' + (96 + r * 8) + '" height="7" rx="1" fill="#3a2414"/>'; }).join('')
        /* the lectern and the ledger */
        + '<rect x="154" y="118" width="12" height="34" fill="#3a2414"/><path d="M140 112 L180 112 L176 120 L144 120 Z" fill="#4a3020"/>'
        + '<path d="M146 112 Q153 106 160 110 Q167 106 174 112 Z" fill="' + (f.ledger ? '#c9bb98' : '#efe5cc') + '"/>'
        /* candle holders, eaten to the wick */
        + [62, 98, 222, 258].map(function (x) { return '<path d="M' + x + ' 140 V96 M' + (x - 8) + ' 96 H' + (x + 8) + '" stroke="#8a7d64" stroke-width="2"/><path d="M' + (x - 6) + ' 96 v-5 M' + x + ' 96 v-7 M' + (x + 6) + ' 96 v-5" stroke="#120d0b" stroke-width="1.2"/>'; }).join('')
        /* the tower door and the crypt stair */
        + '<path d="M300 150 V108 Q308 98 316 108 V150 Z" fill="' + (f.door ? '#0a080c' : '#3a2414') + '"/>' + (f.door ? '' : '<circle cx="304" cy="132" r="1.6" fill="#b8955a"/>')
        + '<path d="M0 150 V112 H22 V150 Z" fill="#0a080c"/><path d="M0 120 H18 M0 130 H14 M0 140 H9" stroke="#2a2433" stroke-width="2"/>'
        + hero(s, id, 104, 92, 0.62, hasLight(s))
        + '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>';
    },
    crypt: function (s, id) {
      var lit = s && (s.flags.lit || hasLight(s)), f = (s && s.flags) || {};
      var out = '<rect width="320" height="192" fill="#15111a"/>'
        + [0, 80, 160, 240].map(function (x) { return '<path d="M' + x + ' 150 V60 Q' + (x + 40) + ' 10 ' + (x + 80) + ' 60 V150" stroke="#2a2433" stroke-width="10" fill="none"/>'; }).join('')
        + [[20, 74], [50, 80], [100, 70], [130, 82], [190, 74], [220, 80], [262, 72], [292, 80]].map(function (n, j) { return '<rect x="' + n[0] + '" y="' + n[1] + '" width="20" height="16" rx="3" fill="#0a080c"/>' + (j % 3 === 1 ? '' : '<circle cx="' + (n[0] + 10) + '" cy="' + (n[1] + 9) + '" r="5" fill="#c9bb98"/><circle cx="' + (n[0] + 8) + '" cy="' + (n[1] + 9) + '" r="1.3" fill="#0a080c"/><circle cx="' + (n[0] + 12) + '" cy="' + (n[1] + 9) + '" r="1.3" fill="#0a080c"/>'); }).join('')
        + '<path d="M0 150 H320 V192 H0 Z" fill="#1d1824"/>'
        /* Brother Odo */
        + '<path d="M196 168 Q210 156 236 160 Q248 164 244 172 Q220 176 196 172 Z" fill="#0d0b10"/><circle cx="246" cy="164" r="7" fill="' + (f.key ? '#e8c3a0' : '#d9d0bd') + '"/>'
        + hero(s, id, 70, 92, 0.62, lit);
      return out;
    },
    tower: function (s, id) {
      var won = s && s.over === 'won';
      return '<rect width="320" height="192" fill="url(#' + id + 'stone)"/>'
        + '<path d="M30 20 V70 Q46 50 62 70 V20 Q46 8 30 20 Z" fill="#2c2a55"/>' + '<g opacity=".9">' + stars(6, 9).replace(/cx="(\d+)"/g, function (m, x) { return 'cx="' + (34 + x % 26) + '"'; }).replace(/cy="(\d+)"/g, function (m, y) { return 'cy="' + (24 + y % 40) + '"'; }) + '</g>'
        + '<rect x="100" y="16" width="130" height="8" fill="#3a2414"/><rect x="106" y="24" width="8" height="140" fill="#2a1a10"/><rect x="216" y="24" width="8" height="140" fill="#2a1a10"/>'
        + '<g class="' + (won ? 'swing' : '') + '" style="transform-origin:165px 26px"><path d="M165 24 C140 26 132 54 130 82 C128 90 122 94 120 98 H210 C208 94 202 90 200 82 C198 54 190 26 165 24 Z" fill="url(#' + id + 'bronze)"/><path d="M120 98 H210" stroke="#d6c38a" stroke-width="2.5"/><circle cx="165" cy="102" r="5" fill="#2f5a4d"/></g>'
        + '<path d="M165 100 V132" stroke="#c9bb98" stroke-width="2.4"/><path d="M162 134 l3 -3 l3 3" stroke="#c9bb98" stroke-width="1.5" fill="none"/>'
        + '<path d="M262 40 V192 M290 40 V192" stroke="#4a3020" stroke-width="4"/>' + [56, 76, 96, 116, 136, 156, 176].map(function (y) { return '<path d="M262 ' + y + ' H290" stroke="#3a2414" stroke-width="3"/>'; }).join('')
        + '<path d="M0 170 H320 V192 H0 Z" fill="#221c26"/>'
        + (won ? '<g class="ring"><path d="M110 50 q-14 10 0 22 M100 44 q-22 16 0 34 M220 50 q14 10 0 22 M230 44 q22 16 0 34" stroke="#ffd97a" stroke-width="2" fill="none" stroke-linecap="round"/></g>' : '')
        + hero(s, id, 150, 104, 0.6, hasLight(s))
        + '<rect width="320" height="192" fill="url(#' + id + 'vig)"/>';
    }
  };
  function chapel(id, x, sc) {
    return '<g transform="translate(' + x + ' 0) scale(' + sc + ')" transform-origin="0 150">'
      + '<path d="M-60 150 V98 L0 70 L60 98 V150 Z" fill="#1e1826"/><rect x="20" y="44" width="34" height="106" fill="#221b2b"/><path d="M16 46 L37 18 L58 46 Z" fill="#1e1826"/>'
      + '<path d="M30 70 V60 Q37 50 44 60 V70 Z" fill="#0a080c"/><rect x="-30" y="110" width="8" height="14" rx="4" fill="#ffb347" opacity=".85"/>'
      + '<path d="M54 46 V150" stroke="#e59a5c" stroke-width="1.2" opacity=".5"/></g>';
  }
  function hasLight(s) { var C = root.SacramentSheetCore, L = root.SacramentSolo && root.SacramentSolo.LIGHTS; return !!(s && C && L && (s.hero.gear || []).some(function (g) { var it = C.itemOf(g); return it && L.indexOf(it.id) >= 0; })); }

  /* the dark: everything beyond the light falls away; without a light, the room is nearly black */
  function dark(id, light) {
    if (!light) return '<rect width="320" height="192" fill="#000" opacity=".82"/>';
    return '<defs><radialGradient id="' + id + 'dark" gradientUnits="userSpaceOnUse" cx="' + light[0] + '" cy="' + light[1] + '" r="170"><stop offset=".38" stop-color="#000" stop-opacity="0"/><stop offset=".7" stop-color="#000" stop-opacity=".6"/><stop offset="1" stop-color="#000" stop-opacity=".92"/></radialGradient></defs><rect width="320" height="192" fill="url(#' + id + 'dark)"/>';
  }

  /* One picture: the place, the foe if there is one, and the dark if the place is dark. */
  function scene(name, s, id) {
    id = id || 'a';
    var fn = SCENES[name] || SCENES.title, body = fn(s, id);
    if (name === 'crypt') { var lit = s && (s.flags.lit || hasLight(s)); body += dark(id, lit ? [120, 140] : null); }
    if (s && s.fight) { var f = s.fight; body += eater(id, name === 'crypt' ? 168 : 196, name === 'crypt' ? 72 : 76, 0.72, f.hp.cur / f.hp.max); }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">' + defs(id) + body + '</svg>';
  }
  /* a small picture for a kind of gear, for the hero sheet */
  var ICONS = {
    weapon: '<path d="M6 26 L22 10 L26 6 L24 12 L10 26 Z" fill="#c9cbd6"/><path d="M5 21 L11 27 M4 28 l4 -4" stroke="#b8955a" stroke-width="2.4" stroke-linecap="round"/>',
    armour: '<path d="M16 4 L27 8 V16 C27 22 22 27 16 29 C10 27 5 22 5 16 V8 Z" fill="#6b7280"/><path d="M16 4 V29" stroke="#c9cbd6" stroke-width="1.2" opacity=".6"/>',
    supply: '<path d="M10 8 H22 L24 28 H8 Z" fill="#8a6a44"/><path d="M12 8 Q16 2 20 8" stroke="#c9bb98" stroke-width="1.6" fill="none"/>',
    relic: '<circle cx="16" cy="16" r="10" fill="#ffd97a" opacity=".25"/><path d="M16 5 V27 M9 12 H23" stroke="#e0c27a" stroke-width="2.6" stroke-linecap="round"/>',
    grimoire: '<rect x="7" y="5" width="18" height="23" rx="2" fill="#6d2420"/><path d="M10 5 V28" stroke="#3a1210" stroke-width="2"/><path d="M16 11 V21 M12 15 H20" stroke="#e0c27a" stroke-width="1.6"/>'
  };
  function icon(kind) { return 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' + (ICONS[kind] || ICONS.supply) + '</svg>'); }
  root.SacramentSoloArt = { W: W, H: H, scene: scene, icon: icon, scenes: Object.keys(SCENES) };
})(typeof window !== 'undefined' ? window : globalThis);
