/* Sacrament RPG solo: the pixel pictures. Every picture is drawn here in code on a 160 × 96 canvas and scaled up with hard edges, so there are no image files.
   Sprites are strings: one letter per pixel, "." is clear. The letters name colours from the site's own dark palette (theme.css) plus a few for flame and wax.
   draw(ctx, sceneName, state, tick) paints one frame; tick moves the flames. */
(function (root) {
  'use strict';
  var W = 160, H = 96;
  var P = {
    k: '#0b0a08', d: '#17140f', s: '#262119', S: '#3a3226', m: '#5a4f3d', L: '#7a6f5a', p: '#cfc4ab', w: '#efe5cc',
    r: '#6d2420', R: '#c4786a', c: '#b8955a', y: '#ffd97a', o: '#e8913a', b: '#1c2340', B: '#2b3560', i: '#9aa8d0',
    g: '#2f5a4d', G: '#86b3a1', t: '#e9dfc4', T: '#c9bb98', n: '#3d2a1c', N: '#6b4a2e'
  };

  /* ---------- sprites ---------- */
  var HERO = [
    '....kkkk....',
    '...kmmmmk...',
    '..kmLLLLmk..',
    '..kmkkkkmk..',
    '..kmkpkpkm..',
    '..kmkkkkmk..',
    '...kmmmmk...',
    '..krrrrrrk..',
    '.kmmmmmmmmk.',
    '.kmmmmmmmmkk',
    '.kmmmmmmmmkc',
    '.kmmmmmmmmkc',
    '..kmmmmmmk..',
    '..kmmmmmmk..',
    '..kmmkkmmk..',
    '..kkk..kkk..'
  ];
  var LAMP = ['.c.', 'cyc', 'cyc', '.c.'];
  var EATER = [
    '.......k........',
    '.......k........',
    '....TtttttT.....',
    '...TttttttttT...',
    '..Ttttttttttt...',
    '..ttkkttttkktT..',
    '..ttkwttttkwtT..',
    '..ttkkttttkktT..',
    '..ttttttttttttT.',
    '..tttttkkkttttT.',
    '.Tttttttttttttt.',
    '.tTtttttttttTtt.',
    '.tt.Tttttttt.tt.',
    'tT...tT..tT...tT'
  ];
  var FLAME = [['..y..', '.yoy.', '.yoy.', '..o..'], ['.y...', '.yy..', '.yoy.', '..o..'], ['...y.', '..yy.', '.yoy.', '..o..']];
  var SKULL = ['.ppp.', 'pkpkp', 'ppppp', '.pkp.'];
  var ICONS = {
    weapon: ['......Lp', '.....Lp.', '....Lp..', '...Lp...', '.cLp....', '..c.....', '.c.c....', 'c.......'],
    armour: ['.LL..LL.', 'LmmmmmmL', 'LmmLLmmL', 'LmmmmmmL', '.LmmmmL.', '.LmmmmL.', '..LmmL..', '...LL...'],
    supply: ['..NN....', '.NnnN...', '.NnnN...', 'NnnnnN..', 'NnnnnN..', 'NnnnnN..', '.NNNN...', '........'],
    relic: ['...c....', '..cyc...', '...c....', '.ccccc..', '...c....', '...c....', '...c....', '..ccc...'],
    grimoire: ['.rrrrrr.', 'rRrrrrrp', 'rrrcrrrp', 'rrcccrrp', 'rrrcrrrp', 'rrrcrrrp', 'rrrrrrrp', '.rrrrrr.']
  };

  function sprite(ctx, rows, x, y, flip) {
    for (var j = 0; j < rows.length; j++) for (var i = 0; i < rows[j].length; i++) {
      var ch = rows[j].charAt(flip ? rows[j].length - 1 - i : i); if (ch === '.') continue;
      ctx.fillStyle = P[ch]; ctx.fillRect(x + i, y + j, 1, 1);
    }
  }
  var rect = function (ctx, x, y, w, h, c) { ctx.fillStyle = P[c] || c; ctx.fillRect(x, y, w, h); };
  /* a checkerboard of two colours: the old way of shading with few colours */
  function dither(ctx, x, y, w, h, a, b) { rect(ctx, x, y, w, h, a); ctx.fillStyle = P[b]; for (var j = 0; j < h; j++) for (var i = (j % 2); i < w; i += 2) ctx.fillRect(x + i, y + j, 1, 1); }
  function flame(ctx, x, y, tick) { sprite(ctx, FLAME[tick % 3], x - 2, y - 4); }
  function stars(ctx, seed) { ctx.fillStyle = P.i; for (var n = 0; n < 26; n++) { seed = (seed * 9301 + 49297) % 233280; var x = seed % W; seed = (seed * 9301 + 49297) % 233280; var y = seed % 30; ctx.fillRect(x, y, 1, 1); } }
  function sky(ctx) { rect(ctx, 0, 0, W, 20, 'k'); dither(ctx, 0, 20, W, 10, 'k', 'b'); rect(ctx, 0, 30, W, 20, 'b'); dither(ctx, 0, 46, W, 6, 'b', 'B'); }
  function bricks(ctx, x, y, w, h, base, line) {
    rect(ctx, x, y, w, h, base); ctx.fillStyle = P[line];
    for (var j = 0; j < h; j += 5) { ctx.fillRect(x, y + j, w, 1); for (var i = (j / 5 % 2) * 6; i < w; i += 12) ctx.fillRect(x + i, y + j, 1, 5); }
  }

  /* ---------- the places ---------- */
  var SCENES = {
    title: function (ctx, s, t) {
      sky(ctx); stars(ctx, 7);
      rect(ctx, 0, 70, W, 26, 'd'); dither(ctx, 0, 68, W, 3, 'b', 'd');
      /* the tower */
      rect(ctx, 68, 20, 24, 52, 'S'); rect(ctx, 64, 16, 32, 5, 'm'); rect(ctx, 72, 8, 16, 9, 'S'); rect(ctx, 78, 2, 4, 7, 'm');
      rect(ctx, 74, 26, 12, 14, 'k'); sprite(ctx, ['..GGGG..', '.GggggG.', '.GggggG.', 'GggggggG', 'GGGGGGGG', '...cc...'], 76, 30);
      rect(ctx, 76, 50, 8, 22, 'k'); rect(ctx, 79, 54, 2, 3, 'o');
      for (var h = 0; h < 4; h++) { var hx = 8 + h * 14 + (h > 1 ? 88 : 0); rect(ctx, hx, 60, 12, 10, 's'); rect(ctx, hx - 1, 56, 14, 4, 'S'); rect(ctx, hx + 4, 63, 3, 3, h === 2 ? 'o' : 'k'); }
      sprite(ctx, HERO, 54, 72); sprite(ctx, LAMP, 65, 81); flame(ctx, 66, 83, t);
    },
    gate: function (ctx, s, t) {
      sky(ctx); stars(ctx, 3);
      sprite(ctx, ['..pp.', '.p...', 'p....', 'p....', 'p....', '.p...', '..pp.'], 134, 5);   /* a thin moon */
      /* the chapel behind */
      rect(ctx, 40, 30, 70, 36, 's'); rect(ctx, 88, 10, 18, 56, 'S'); rect(ctx, 85, 6, 24, 5, 'm'); rect(ctx, 93, 16, 8, 10, 'k');
      for (var x = 40; x < 88; x += 6) rect(ctx, x, 28, 4, 3, 's');
      rect(ctx, 0, 62, W, 34, 'd'); dither(ctx, 0, 62, W, 4, 's', 'd');
      /* gravestones */
      [[22, 56], [34, 58], [116, 57], [128, 55], [142, 58]].forEach(function (g) { rect(ctx, g[0], g[1], 6, 8, 'L'); rect(ctx, g[0] + 1, g[1] - 1, 4, 1, 'L'); rect(ctx, g[0] + 2, g[1] + 2, 2, 1, 'm'); });
      /* the path and the broken salt line */
      rect(ctx, 66, 66, 28, 30, 's'); dither(ctx, 66, 66, 28, 30, 's', 'S');
      for (var sx = 40; sx < 120; sx += 2) if (sx < 76 || sx > 82) rect(ctx, sx, 84 + ((sx / 2) % 2), 1, 1, 'w');
      /* the lychgate */
      /* a steep pitched roof of shingles on two posts: a gable, stepped one pixel at a time */
      for (var ry = 0; ry < 20; ry++) { var half = 4 + Math.round(ry * 1.25); rect(ctx, 80 - half, 22 + ry, half * 2, 1, ry % 3 === 0 ? 'n' : 'N'); }
      rect(ctx, 54, 42, 52, 2, 'n'); rect(ctx, 78, 20, 4, 3, 'L'); rect(ctx, 79, 16, 2, 6, 'L'); rect(ctx, 77, 18, 6, 1, 'L');
      rect(ctx, 60, 44, 4, 30, 'n'); rect(ctx, 96, 44, 4, 30, 'n'); rect(ctx, 64, 46, 32, 1, 'n');
      /* the wayshrine and its box */
      rect(ctx, 16, 66, 10, 14, 'L'); rect(ctx, 14, 63, 14, 4, 'm'); rect(ctx, 18, 69, 6, 6, 'k'); flame(ctx, 21, 75, t);
      rect(ctx, 17, 82, 8, 5, s && s.flags.box ? 'S' : 'T'); rect(ctx, 17, 82, 8, 1, 'L');
      /* the house with the watcher */
      rect(ctx, 122, 64, 30, 22, 's'); rect(ctx, 118, 58, 38, 7, 'n'); rect(ctx, 130, 70, 10, 8, 'N'); rect(ctx, 134, 70, s && s.flags.talked ? 0 : 2, 8, 'o');
      sprite(ctx, HERO, 74, 70); sprite(ctx, LAMP, 85, 79); flame(ctx, 86, 81, t);
    },
    nave: function (ctx, s, t) {
      bricks(ctx, 0, 0, W, 70, 's', 'd');
      /* the high window */
      rect(ctx, 72, 6, 16, 30, 'k'); rect(ctx, 74, 8, 12, 26, 'B'); dither(ctx, 74, 8, 12, 10, 'b', 'B'); rect(ctx, 79, 8, 2, 26, 'k'); rect(ctx, 74, 20, 12, 1, 'k'); rect(ctx, 76, 6, 8, 2, 'k');
      dither(ctx, 66, 36, 28, 34, 's', 'b');
      rect(ctx, 0, 70, W, 26, 'S'); dither(ctx, 0, 70, W, 26, 'S', 'm');
      /* pews */
      for (var row = 0; row < 3; row++) { var y = 74 + row * 7; rect(ctx, 6, y, 46, 4, 'n'); rect(ctx, 108, y, 46, 4, 'n'); rect(ctx, 6, y - 3, 46, 1, 'N'); rect(ctx, 108, y - 3, 46, 1, 'N'); }
      /* the lectern and the ledger */
      rect(ctx, 76, 54, 8, 16, 'n'); rect(ctx, 70, 50, 20, 5, 'N'); rect(ctx, 72, 47, 16, 4, s && s.flags.ledger ? 'T' : 'p'); rect(ctx, 79, 47, 1, 4, 'm');
      /* candle holders, eaten to the wick */
      [20, 40, 120, 140].forEach(function (x) { rect(ctx, x, 40, 1, 24, 'L'); rect(ctx, x - 3, 40, 7, 2, 'L'); rect(ctx, x - 2, 37, 1, 3, 'k'); rect(ctx, x + 2, 37, 1, 3, 'k'); rect(ctx, x, 36, 1, 4, 'k'); });
      /* the tower door, east */
      rect(ctx, 146, 42, 14, 28, s && s.flags.door ? 'k' : 'n'); rect(ctx, 146, 42, 14, 1, 'L'); if (!(s && s.flags.door)) rect(ctx, 148, 56, 2, 2, 'c');
      /* the crypt stair, down */
      rect(ctx, 0, 48, 14, 22, 'k'); for (var st = 0; st < 4; st++) rect(ctx, 0, 52 + st * 5, 12 - st * 3, 1, 'S');
      sprite(ctx, HERO, 56, 72); sprite(ctx, LAMP, 67, 81); flame(ctx, 68, 83, t);
    },
    crypt: function (ctx, s, t) {
      rect(ctx, 0, 0, W, H, 'd');
      for (var a = 0; a < 4; a++) { var ax = a * 40; rect(ctx, ax, 0, 6, 70, 's'); for (var k = 0; k < 14; k++) rect(ctx, ax + 6 + k, 14 - Math.round(Math.sqrt(196 - (k - 14) * (k - 14)) * 0.7), 1, 3, 's'); for (var k2 = 0; k2 < 20; k2++) rect(ctx, ax + 20 + k2, 4 + Math.round(Math.sqrt(400 - k2 * k2) * 0.5) - 10 + 6, 1, 3, 's'); }
      /* niches with skulls */
      [[10, 30], [26, 30], [50, 34], [66, 34], [92, 30], [108, 30], [130, 34], [146, 34]].forEach(function (n, j) { rect(ctx, n[0], n[1], 9, 8, 'k'); if (j % 3 !== 1) sprite(ctx, SKULL, n[0] + 2, n[1] + 3); });
      rect(ctx, 0, 70, W, 26, 's'); dither(ctx, 0, 70, W, 26, 's', 'S');
      /* Brother Odo, curled on the floor */
      rect(ctx, 96, 80, 22, 6, 'k'); rect(ctx, 114, 78, 6, 6, 'T'); rect(ctx, 98, 79, 14, 2, 'S');
      sprite(ctx, HERO, 40, 72);
      var lit = s && (s.flags.lit || hasLight(s));
      if (lit) { sprite(ctx, LAMP, 51, 81); flame(ctx, 52, 83, t); }
      return { dark: !lit, light: lit ? [52, 82] : null };
    },
    tower: function (ctx, s, t) {
      bricks(ctx, 0, 0, W, H, 's', 'd');
      rect(ctx, 20, 8, 16, 22, 'k'); rect(ctx, 22, 10, 12, 18, 'b'); stars(ctx, 11); rect(ctx, 0, 30, 20, 0, 'k');
      /* the frame and the bell */
      rect(ctx, 54, 4, 60, 4, 'n'); rect(ctx, 56, 8, 4, 60, 'n'); rect(ctx, 108, 8, 4, 60, 'n');
      sprite(ctx, ['......GGGGGGGGGG......', '....GGggggggggggGG....', '...GggggggggggggggG...', '...GgggggggggggggggG..', '..GggggggggggggggggG..', '..GggggggggggggggggG..', '..GgggggggggggggggggG.', '.GgggggggggggggggggggG', '.GgggggggggggggggggggG', 'GGGGGGGGGGGGGGGGGGGGGG', 'GgggggggggggggggggggGG', '.GGGGGGGGGGGGGGGGGGGG.'], 73, 10);
      rect(ctx, 83, 22, 2, 18, 'T'); /* the rope, gnawed short */ rect(ctx, 83, 40, 2, 1, 'N'); rect(ctx, 82, 41, 1, 1, 'T'); rect(ctx, 85, 41, 1, 1, 'T');
      /* the ladder */
      rect(ctx, 130, 20, 2, 70, 'N'); rect(ctx, 142, 20, 2, 70, 'N'); for (var r = 24; r < 90; r += 8) rect(ctx, 130, r, 14, 2, 'n');
      rect(ctx, 0, 86, W, 10, 'S'); dither(ctx, 0, 86, W, 10, 'S', 'm');
      if (s && s.over === 'won') { ctx.fillStyle = P.y; [[60, 18], [62, 26], [104, 18], [102, 26], [58, 34], [106, 34]].forEach(function (q) { ctx.fillRect(q[0] - (t % 2), q[1], 3, 1); }); }
      sprite(ctx, HERO, 90, 70); sprite(ctx, LAMP, 101, 79); flame(ctx, 102, 81, t);
    }
  };
  function hasLight(s) { var C = root.SacramentSheetCore, L = root.SacramentSolo && root.SacramentSolo.LIGHTS; return !!(C && L && (s.hero.gear || []).some(function (g) { var it = C.itemOf(g); return it && L.indexOf(it.id) >= 0; })); }

  /* the dark: everything beyond the light goes to black, with a dithered edge */
  function darkness(ctx, light) {
    var img = ctx.getImageData(0, 0, W, H), d = img.data;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var o = (y * W + x) * 4, f;
      if (!light) f = (x + y) % 2 ? 0.12 : 0.22;
      else { var dist = Math.sqrt((x - light[0]) * (x - light[0]) + (y - light[1]) * (y - light[1]) * 2.2); f = dist < 34 ? 1 : dist < 46 ? ((x + y) % 2 ? 0.75 : 0.45) : dist < 60 ? ((x + y) % 2 ? 0.35 : 0.18) : 0.1; }
      d[o] *= f; d[o + 1] *= f; d[o + 2] *= f;
    }
    ctx.putImageData(img, 0, 0);
  }

  function draw(ctx, name, s, tick) {
    ctx.imageSmoothingEnabled = false;
    var fn = SCENES[name] || SCENES.title, r = fn(ctx, s, tick || 0) || {};
    if (r.dark || r.light) darkness(ctx, r.light);
    /* the foe is drawn over the dark: its own wick lights it */
    if (s && s.fight) { var bob = (tick || 0) % 4 < 2 ? 0 : 1, fx = name === 'crypt' ? 92 : 100, fy = 68 + bob; sprite(ctx, EATER, fx, fy); flame(ctx, fx + 7, fy + 1, (tick || 0) + 1); }
  }
  /* a small icon for a gear item, as a data address an <img> can show */
  var iconCache = {};
  function icon(kind) {
    var rows = ICONS[kind] || ICONS.supply; if (iconCache[kind]) return iconCache[kind];
    var cv = root.document.createElement('canvas'); cv.width = 8; cv.height = 8; sprite(cv.getContext('2d'), rows, 0, 0);
    return (iconCache[kind] = cv.toDataURL());
  }
  root.SacramentSoloPixels = { W: W, H: H, draw: draw, icon: icon, scenes: Object.keys(SCENES) };
})(typeof window !== 'undefined' ? window : globalThis);
