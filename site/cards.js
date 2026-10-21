/* Sacrament item cards. One renderer for every place a card appears: the character builder, the VTT sheet, the table feed and the GM's cards.
   A card is a plain object (a "model") so it can be saved, sent to other players and drawn again anywhere:
     { kind, title, type, level, icon, img, stats:[[label, value]], tags:[text], text, accent }
   Build one with SacCards.fromGear(R, group, item), SacCards.fromNode(R, node), SacCards.fromAdversary(b) or SacCards.handout(title, text),
   draw it with SacCards.html(model, { mini }) and show it full size with SacCards.open(model, { actions }).
   R is a SacRules(library). The art is a small line drawing chosen by the item's `icon` (or worked out from its id, weight and name), or an
   image the item names in `img` (a path on this site or an https address). */
(function () {
  'use strict';
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  /* ---------- the drawings: 64 by 64, outlines only; the card colours them ---------- */
  var G = {
    sword: '<path d="M32 5l4 8v27h-8V13z"/><path d="M20 42h24M32 42v11" fill="none"/><circle cx="32" cy="57" r="2.6"/>',
    longsword: '<path d="M32 3l3.5 7v32h-7V10z"/><path d="M19 44h26M32 44v10" fill="none"/><circle cx="32" cy="58" r="2.6"/>',
    greatsword: '<path d="M32 2l6 10v30H26V12z"/><path d="M32 12v26" fill="none"/><path d="M17 46h30M32 46v9" fill="none"/><circle cx="32" cy="59" r="2.6"/>',
    falchion: '<path d="M26 6c20 8 22 28 12 38h-7c6-12 4-26-5-38z"/><path d="M24 46h18M30 46v10" fill="none"/><circle cx="30" cy="59" r="2.6"/>',
    bow: '<path d="M20 6c26 10 26 42 0 52" fill="none"/><path d="M20 6v52" fill="none"/><path d="M12 32h32M38 27l6 5-6 5" fill="none"/>',
    crossbow: '<path d="M8 22c14 4 34 4 48 0" fill="none"/><path d="M32 20v38M26 54h12" fill="none"/><path d="M32 10v24M28 15l4-6 4 6" fill="none"/>',
    staff: '<path d="M18 58L42 14" fill="none"/><circle cx="45" cy="10" r="5.5"/><path d="M40 20l6 3" fill="none"/>',
    maul: '<path d="M32 26v32" fill="none"/><path d="M15 8h34v18H15z"/><path d="M15 17h34" fill="none"/>',
    glaive: '<path d="M20 60L38 16" fill="none"/><path d="M38 16c3-9 10-12 15-12-1 9-6 17-15 20z"/>',
    jerkin: '<path d="M16 16l9-5q7 7 14 0l9 5 8 12-9 4v20H17V32l-9-4z"/>',
    coat: '<path d="M16 16l9-5q7 7 14 0l9 5 8 12-9 4v20H17V32l-9-4z"/><path d="M23 38h18M23 44h18M23 50h18" fill="none"/>',
    helm: '<path d="M16 44C16 18 24 8 32 8s16 10 16 36v10H16z"/><path d="M16 34h32M32 34v20" fill="none"/><path d="M25 22h14" fill="none"/>',
    ward: '<circle cx="32" cy="32" r="22" fill="none"/><circle cx="32" cy="32" r="8"/><path d="M32 10v44M10 32h44" fill="none"/>',
    candle: '<path d="M24 28h16v28H24z"/><path d="M32 6c7 8 7 14 0 17-7-3-7-9 0-17z"/><path d="M32 23v5" fill="none"/>',
    focus: '<path d="M32 5l17 19-17 35L15 24z"/><path d="M15 24h34M32 5v54" fill="none"/>',
    ring: '<circle cx="32" cy="40" r="15" fill="none"/><circle cx="32" cy="40" r="9" fill="none"/><path d="M26 18l6-9 6 9-6 6z"/>',
    bone: '<path d="M21 43L43 21" fill="none" stroke-width="5"/><circle cx="17" cy="43" r="4.5"/><circle cx="22" cy="49" r="4.5"/><circle cx="42" cy="15" r="4.5"/><circle cx="48" cy="21" r="4.5"/>',
    crown: '<path d="M11 47V22l12 13 9-17 9 17 12-13v25z"/><path d="M11 53h42" fill="none"/>',
    heart: '<path d="M32 54C11 40 8 24 18 16c7-4 11 0 14 5 3-5 7-9 14-5 10 8 7 24-14 38z"/>',
    bell: '<path d="M32 7v7" fill="none"/><path d="M17 47c4-4 5-10 5-17 0-9 4-15 10-15s10 6 10 15c0 7 1 13 5 17z"/><path d="M26 51a6 4 0 0 0 12 0" fill="none"/>',
    lantern: '<path d="M26 9h12M32 9v6" fill="none"/><path d="M21 23l5-8h12l5 8v25l-5 7H26l-5-7z"/><path d="M32 26c5 5 5 9 0 12-5-3-5-7 0-12z"/>',
    censer: '<path d="M32 4v12" fill="none"/><path d="M17 22h30l-5 24a10 7 0 0 1-20 0z"/><path d="M24 31h16M23 39h18" fill="none"/><path d="M24 56h16" fill="none"/>',
    mirror: '<ellipse cx="32" cy="26" rx="15" ry="19"/><path d="M32 45v14M24 59h16" fill="none"/><path d="M25 17c2-4 7-6 11-5" fill="none"/>',
    seal: '<circle cx="32" cy="29" r="20"/><circle cx="32" cy="29" r="13" fill="none"/><path d="M32 19v20M24 27h16" fill="none"/><path d="M23 47l-4 13 13-5 13 5-4-13" fill="none"/>',
    vial: '<path d="M26 6h12M28 6v14L17 47a8 8 0 0 0 8 11h14a8 8 0 0 0 8-11L36 20V6" fill="none"/><path d="M21 40h22" fill="none"/>',
    rosary: '<circle cx="32" cy="26" r="16" fill="none" stroke-dasharray="1 7.4" stroke-width="5"/><path d="M32 42v16M26 47h12" fill="none"/>',
    rations: '<path d="M22 20h20l6 14q4 18-16 22Q12 52 16 34z"/><path d="M25 20c0-7 14-7 14 0" fill="none"/><path d="M26 35h12" fill="none"/>',
    rope: '<circle cx="32" cy="32" r="21" fill="none"/><circle cx="32" cy="32" r="14" fill="none"/><circle cx="32" cy="32" r="7"/><path d="M53 32c6 5 6 15 1 22" fill="none"/>',
    torch: '<path d="M28 27h8l-2 31h-4z"/><path d="M32 5c10 10 10 16 0 22-10-6-10-12 0-22z"/>',
    kit: '<path d="M10 22h44v32H10z"/><path d="M22 22v-7h20v7" fill="none"/><path d="M32 30v17M23.5 38.5h17" fill="none"/>',
    flask: '<path d="M26 8h12v11l9 16a11 11 0 0 1-9 19H26a11 11 0 0 1-9-19l9-16z"/><path d="M32 31c5 5 5 9 0 12-5-3-5-7 0-12z"/>',
    tools: '<path d="M32 24v34" fill="none"/><path d="M16 9h26l6 7-6 8H16z"/>',
    oil: '<path d="M28 6h8v11l7 9v26a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V26l7-9z"/><path d="M21 36h22" fill="none"/>',
    bandage: '<ellipse cx="32" cy="22" rx="19" ry="8"/><path d="M13 22v26c0 5 8 8 19 8s19-3 19-8V22" fill="none"/><path d="M13 36c0 4 8 8 19 8s19-4 19-8" fill="none"/>',
    action: '<path d="M32 5l6.5 18.5L58 25 43 37l5 19-16-11-16 11 5-19L6 25l19.500-1.500z"/>',
    spell: '<path d="M32 4c15 14 19 25 9 36 4 5 2 13-9 16-11-3-13-11-9-16-10-11-6-22 9-36z"/><path d="M32 30c5 5 5 10 0 15-5-5-5-10 0-15z" fill="none"/>',
    passive: '<path d="M3 32C14 17 24 13 32 13s18 4 29 19C50 47 40 51 32 51S14 47 3 32z"/><circle cx="32" cy="32" r="8"/>',
    reaction: '<path d="M32 5l21 7v18c0 14-10 24-21 29C21 54 11 44 11 30V12z"/>',
    skull: '<path d="M13 31c0-15 8-23 19-23s19 8 19 23c0 6-3 10-7 12v11H20V43c-4-2-7-6-7-12z"/><circle cx="24" cy="31" r="5"/><circle cx="40" cy="31" r="5"/><path d="M28 44v7M36 44v7" fill="none"/>',
    scroll: '<path d="M18 7h30v42a8 8 0 0 1-8 8H13a8 8 0 0 0 9-8V13a6 6 0 0 0-4-6z"/><path d="M27 20h14M27 29h14M27 38h9" fill="none"/>',
    note: '<path d="M24 46V12l24-6v34" fill="none"/><circle cx="18" cy="48" r="7"/><circle cx="42" cy="42" r="7"/>',
    snow: '<path d="M32 6v52M8 19l48 26M8 45l48-26" fill="none"/><path d="M26 10l6 6 6-6M26 54l6-6 6 6" fill="none"/>',
    bolt: '<path d="M38 4L16 36h14l-6 24 24-34H34z"/>',
    boot: '<path d="M22 8h16v22l14 8v12H12V36l10-4z"/>',
    gem: '<path d="M32 8l20 12v24L32 56 12 44V20z"/>'
  };
  var ICONS = Object.keys(G);

  /* which drawing an item gets when it does not say */
  var BY_ID = { w1: 'sword', w2: 'bow', w3: 'staff', w4: 'longsword', w5: 'bow', w6: 'maul', w7: 'longsword', w8: 'crossbow', w9: 'longsword', w10: 'glaive', w11: 'bow', w12: 'falchion', w13: 'greatsword', w14: 'bow', w15: 'greatsword', w16: 'bow',
    t1: 'ward', t2: 'candle', t3: 'focus', t4: 'ring', t5: 'bone', t6: 'crown', t7: 'heart', t8: 'bell', t9: 'lantern', t10: 'censer', t11: 'mirror', t12: 'seal', t13: 'vial', t14: 'rosary',
    s1: 'rations', s2: 'rope', s3: 'torch', s4: 'kit', s5: 'flask', s6: 'tools', s7: 'oil', s8: 'tools', s9: 'bandage' };
  var BY_NAME = [[/bow/i, 'bow'], [/crossbow/i, 'crossbow'], [/staff|rod|wand/i, 'staff'], [/maul|hammer|mace|club/i, 'maul'], [/glaive|spear|pike|halberd/i, 'glaive'], [/greatsword|claymore/i, 'greatsword'], [/falchion|sabre|scimitar/i, 'falchion'], [/sword|blade|edge|dagger|knife/i, 'sword'],
    [/ring/i, 'ring'], [/bell/i, 'bell'], [/lantern|lamp/i, 'lantern'], [/candle/i, 'candle'], [/crown/i, 'crown'], [/mirror/i, 'mirror'], [/seal/i, 'seal'], [/vial|potion|philter/i, 'vial'], [/rosary|beads/i, 'rosary'], [/censer/i, 'censer'],
    [/rope/i, 'rope'], [/torch/i, 'torch'], [/oil/i, 'oil'], [/water|flask/i, 'flask'], [/kit|satchel|pack/i, 'kit'], [/bandage/i, 'bandage'], [/ration|bread|food/i, 'rations'], [/bone|relic/i, 'bone']];
  /* abilities: a drawing by what the ability does, taken from its name */
  var NODE_NAME = [[/heal|mend|absolution|restoration|renewal|litany/i, 'heart'], [/strike|smite|cleave|judgement|sunder|bash|spellstrike|scourge/i, 'sword'], [/guard|ward|shield|aegis|interpose|bastion|bulwark|phalanx|hold the line|endure|unbroken|armour/i, 'reaction'],
    [/move|rush|step|blink/i, 'boot'], [/fire|flame|burn|\bash\b|cataclysm|overchannel/i, 'spell'], [/bolt|lightning|thunder|storm/i, 'bolt'], [/frost|lash|ice|cold/i, 'snow'], [/hymn|note|voice|song|symphony|requiem|chorus|canticle|benediction|response|harmony|pitch|resonan|counterpoint|choral|hush/i, 'note'],
    [/study|eye|focus|mind/i, 'passive']];
  function iconForNode(n) {
    if (G[n.icon]) return n.icon;
    for (var i = 0; i < NODE_NAME.length; i++) if (NODE_NAME[i][0].test(n.name || '')) return NODE_NAME[i][1];
    return n.type === 'spell' ? 'spell' : n.type === 'passive' ? 'passive' : 'action';
  }
  function iconFor(group, it) {
    if (it && G[it.icon]) return it.icon;
    if (it && BY_ID[it.id]) return BY_ID[it.id];
    if (group === 'armour') return it && it.w === 'heavy' ? 'helm' : it && it.w === 'medium' ? 'coat' : 'jerkin';
    var n = (it && (it.n || it.name)) || '';
    for (var i = 0; i < BY_NAME.length; i++) if (BY_NAME[i][0].test(n)) return BY_NAME[i][1];
    return group === 'weapon' ? 'sword' : group === 'armour' ? 'jerkin' : group === 'trinket' ? 'gem' : group === 'misc' ? 'kit' : 'gem';
  }

  /* ---------- colours ---------- */
  var ACCENT = { weapon: '#c9b27a', armour: '#9aa3ad', trinket: '#b49cf0', misc: '#a8bf68', custom: '#b8b0a0', action: '#7fb4de', spell: '#d17c9e', passive: '#82c79f', adversary: '#c4574a', handout: '#e6c25e' };
  var KIND_NAME = { weapon: 'Weapon', armour: 'Armour', trinket: 'Trinket', misc: 'Supplies', custom: 'Item', action: 'Action', spell: 'Spell', passive: 'Passive', adversary: 'Adversary', handout: 'Handout' };
  var FRAME = ['#77727d', '#77727d', '#86a35f', '#7fb4de', '#e6c25e', '#b78cf0']; // by level: stone, moss, steel, gold, violet foil
  var hex = function (c, d) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : d; };
  var safeImg = function (u) { u = String(u || ''); return /^(https:\/\/[\w.-]+\/?|\/(?!\/))[\w\-./%?=&#~:+]*$/.test(u) && u.length <= 300 && u.indexOf('//', 8) < 0 ? u : ''; };
  var sgn = function (n) { return (n < 0 ? '−' : '+') + Math.abs(n); };

  /* ---------- models ---------- */
  function clip(s, n) { s = String(s == null ? '' : s); return s.length > n ? s.slice(0, n) : s; }
  function clean(m) { // anything that arrives from another player is made safe here, so a card can never carry more than text, numbers and a colour
    m = m && typeof m === 'object' ? m : {};
    var k = KIND_NAME[m.kind] ? m.kind : 'custom';
    return { kind: k, title: clip(m.title || 'Card', 60), type: clip(m.type || '', 60), level: Math.max(0, Math.min(5, parseInt(m.level, 10) || 0)),
      icon: G[m.icon] ? m.icon : '', img: safeImg(m.img), accent: hex(m.accent, ACCENT[k] || '#b8b0a0'),
      stats: (Array.isArray(m.stats) ? m.stats : []).slice(0, 8).map(function (s) { return [clip(s && s[0], 20), clip(s && s[1], 24)]; }).filter(function (s) { return s[0] || s[1]; }),
      tags: (Array.isArray(m.tags) ? m.tags : []).slice(0, 8).map(function (t) { return clip(t, 40); }).filter(Boolean), text: clip(m.text, 1500) };
  }
  /* A piece of gear. group is weapon, armour, trinket, misc or custom, and it is a library item (or a character's own: { n, s }). */
  function fromGear(R, group, it) {
    var d = it || {}, stats = [], tags = [], sc = d.sc || {}, type = '', text = d.d || '';
    if (group === 'weapon') {
      stats.push([R.diceOf('weapon', d) + 'd6', 'Damage'], [sgn(d.t || 1), 'To hit'], [d.k === 'ranged' ? 'Near' : 'Melee', 'Reach'], [String(d.s == null ? 1 : d.s), (d.s === 1 ? 'Slot' : 'Slots')]);
      type = (d.k === 'ranged' ? 'Ranged' : 'Melee') + ' weapon';
      text = text || (d.k === 'ranged' ? 'Strike with it from Near. It adds its level to the hit and deals its level in d6.' : 'Strike with it in Melee. It adds its level to the hit and deals its level in d6.');
    } else if (group === 'armour') {
      var w = d.w || 'light', dur = ({ light: 3, medium: 4, heavy: 5 })[w] || 3, slots = ({ light: 1, medium: 2, heavy: 3 })[w] || 1;
      stats.push([R.diceOf('armour', d) + 'd6', 'Absorbs'], [String(dur), 'Durability'], [String(slots), (slots === 1 ? 'Slot' : 'Slots')]);
      if (w !== 'light') stats.push([w === 'heavy' ? '−2' : '−1', 'Mind']);
      type = w.charAt(0).toUpperCase() + w.slice(1) + ' armour';
      text = text || 'Roll its dice against each hit and take away what it absorbs. It loses durability when a critical hit lands.';
    } else if (group === 'trinket') {
      var u = R && R.useOf ? R.useOf(d) : '';
      if (u === 'none') stats.push([String(d.s == null ? 1 : d.s), (d.s === 1 ? 'Slot' : 'Slots')]); // carried or lit, no action of its own
      else stats.push([(R && R.USES && R.USES[u]) || 'Use', 'Used as'], ['+' + Math.max(1, d.r || 0), 'Looming'], [String(d.s == null ? 1 : d.s), (d.s === 1 ? 'Slot' : 'Slots')]);
      if (d.heal) tags.push('Heals 1 Wound');
      type = 'Trinket';
    } else if (group === 'misc') {
      stats.push([String(d.s == null ? 1 : d.s), (d.s === 1 ? 'Slot' : 'Slots')]);
      if (d.heal) { stats.push(['1 Wound', 'Heals']); tags.push('Heals 1 Wound'); }
      type = 'Supplies';
    } else { stats.push([String(d.s == null ? 1 : d.s), (d.s === 1 ? 'Slot' : 'Slots')]); type = 'Your own item'; }
    ['Body', 'Mind', 'Spirit'].forEach(function (k) { if (sc[k]) tags.push(sgn(sc[k]) + ' ' + k + ' while carried'); });
    var lvl = group === 'custom' ? 0 : (d.t || (group === 'misc' ? 0 : 1));
    return clean({ kind: group, title: d.n || d.name || 'Item', type: type, level: lvl, icon: iconFor(group, d), img: d.img, stats: stats, tags: tags, text: text });
  }
  /* An ability: an action, a spell or a passive. */
  function fromNode(R, n) {
    var stats = [], tags = [], u = R.useOf ? R.useOf(n) : '';
    if (n.type !== 'passive' && u) stats.push([R.USES[u] || u, 'Used as']);
    if (R.isMagic && R.isMagic(n)) stats.push(['+' + R.rise(n), 'Looming']);
    var sa = R.spellAttack ? R.spellAttack(n) : null;
    if (sa) stats.push([sa.dice + 'd6', 'Damage'], [sa.stat + ' ' + sgn(sa.bonus), 'To hit']);
    if (R.healed && R.healed(n)) stats.push([R.healed(n) + (R.healed(n) === 1 ? ' Wound' : ' Wounds'), 'Heals']);
    if (n.stat && n.bonus) stats.push([sgn(n.bonus) + ' ' + ((R.ALIAS && R.ALIAS[n.stat]) || n.stat), 'Score']);
    if (n.cap) stats.push(['+' + n.cap, 'Slots']);
    if (n.path) tags.push(n.path + ' path');
    if (n.innate) tags.push('Everyone has it');
    var icon = iconForNode(n);
    return clean({ kind: n.type === 'spell' || n.type === 'passive' ? n.type : 'action', title: n.name, type: ({ action: 'Action', spell: 'Spell', passive: 'Passive' }[n.type] || 'Ability') + (n.path ? ' · ' + n.path : ''), level: n.level || 1, icon: icon, img: n.img, stats: stats, tags: tags, text: n.desc });
  }
  function fromAdversary(b) {
    var stats = [[String(b.hp), 'HP'], [String(b.diff), 'Difficulty'], [(b.acts || 1) + ' × ' + (b.dmg || 1) + 'd6', 'Attacks']];
    if (b.arm) stats.push([b.arm + 'd6', 'Armour']);
    return clean({ kind: 'adversary', title: b.name, type: 'Adversary', level: 0, icon: 'skull', stats: stats, tags: [], text: b.note });
  }
  function handout(title, text) { return clean({ kind: 'handout', title: title, type: 'Handout', level: 0, icon: 'scroll', stats: [], tags: [], text: text }); }
  /* A reference such as "a:m4" (an ability) or "g:weapons:w1" (a library item), turned into a card. */
  var GROUPS = { weapons: 'weapon', armour: 'armour', trinkets: 'trinket', supplies: 'misc' };
  function resolve(R, ref) {
    var p = String(ref || '').split(':');
    if (p[0] === 'a' && R.NODES[p[1]]) return fromNode(R, R.NODES[p[1]]);
    if (p[0] === 'g' && GROUPS[p[1]]) { var f = (R.lib.items[p[1]] || []).filter(function (x) { return x.id === p[2]; })[0]; if (f) return fromGear(R, GROUPS[p[1]], f); }
    return null;
  }

  /* ---------- drawing ---------- */
  var css = [
    '.sc-card{--acc:#c9b27a;--frame:#77727d;position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;width:min(300px,100%);padding:12px 14px 12px;color:#e8e2d4;font:16px/1.4 "Libre Baskerville",Georgia,serif;text-align:left;',
    ' background:linear-gradient(160deg,#241f2c 0%,#17141c 55%,#1c1822 100%);border:2px solid var(--frame);border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,.55),inset 0 0 0 1px rgba(255,255,255,.05),inset 0 0 40px rgba(0,0,0,.35)}',
    '.sc-card:before{content:"";position:absolute;inset:5px;border:1px solid color-mix(in srgb,var(--frame) 45%,transparent);border-radius:10px;pointer-events:none}',
    '.sc-head{display:flex;justify-content:space-between;align-items:center;gap:8px;font:600 12px/1 "Roboto Slab",Georgia,serif;letter-spacing:.16em;text-transform:uppercase;color:var(--acc)}',
    '.sc-pips{letter-spacing:.2em;color:var(--frame);font-size:12px;white-space:nowrap}.sc-pips b{color:var(--acc);font-weight:400}',
    '.sc-art{position:relative;display:grid;place-items:center;height:132px;border-radius:10px;overflow:hidden;border:1px solid color-mix(in srgb,var(--frame) 55%,transparent);',
    ' background:radial-gradient(circle at 50% 38%,color-mix(in srgb,var(--acc) 26%,#241f2c) 0%,#141119 72%)}',
    '.sc-art:after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 2px,transparent 2px 6px);pointer-events:none}',
    '.sc-art svg{width:96px;height:96px;overflow:visible;filter:drop-shadow(0 4px 8px rgba(0,0,0,.6))}',
    '.sc-art svg *{fill:color-mix(in srgb,var(--acc) 22%,transparent);stroke:var(--acc);stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}',
    '.sc-art svg [fill=none]{fill:none}.sc-art img{width:100%;height:100%;object-fit:cover;filter:grayscale(.35) contrast(1.05)}',
    '.sc-title{margin:2px 0 0;font:700 1.4rem/1.1 "Roboto Slab",Georgia,serif;color:#f1ecdf;text-wrap:balance}',
    '.sc-type{margin:-4px 0 0;font:500 12px/1.2 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#a79fae}',
    '.sc-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(58px,1fr));gap:6px;margin:0;padding:0;list-style:none}',
    '.sc-stats li{display:flex;flex-direction:column;align-items:center;gap:1px;padding:6px 4px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);border-radius:8px}',
    '.sc-stats b{font:700 1.1rem/1 "Roboto Slab",Georgia,serif;color:var(--acc);text-align:center}.sc-stats span{font:500 10px/1.1 ui-monospace,Menlo,monospace;letter-spacing:.1em;text-transform:uppercase;color:#a79fae;text-align:center}',
    '.sc-tags{display:flex;flex-wrap:wrap;gap:5px;margin:0}.sc-tags span{padding:2px 9px;border-radius:99px;border:1px solid color-mix(in srgb,var(--acc) 55%,transparent);color:var(--acc);font:500 12px/1.4 ui-monospace,Menlo,monospace}',
    '.sc-text{margin:0;font-size:16px;line-height:1.45;color:#d6cfbf;font-style:italic;white-space:pre-wrap}',
    '.sc-foot{margin-top:auto;display:flex;justify-content:space-between;font:500 10px/1 ui-monospace,Menlo,monospace;letter-spacing:.18em;text-transform:uppercase;color:#6f677a}',
    '.sc-t4{box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 18px color-mix(in srgb,var(--frame) 35%,transparent),inset 0 0 40px rgba(0,0,0,.35)}',
    '.sc-t5{box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 26px color-mix(in srgb,var(--frame) 55%,transparent),inset 0 0 40px rgba(0,0,0,.35);background:linear-gradient(160deg,#2a2036 0%,#17141c 50%,#241b30 100%)}',
    '.sc-t5 .sc-art:before{content:"";position:absolute;inset:-40%;background:linear-gradient(110deg,transparent 40%,rgba(255,255,255,.14) 50%,transparent 60%);animation:sc-sheen 5s linear infinite;pointer-events:none}',
    '@keyframes sc-sheen{from{transform:translateX(-60%)}to{transform:translateX(60%)}}@media(prefers-reduced-motion:reduce){.sc-t5 .sc-art:before{animation:none}}',
    /* the small form: for lists and the table feed */
    '.sc-mini{flex-direction:row;align-items:center;gap:10px;width:100%;padding:8px 10px;border-radius:10px;cursor:pointer;background:linear-gradient(160deg,#241f2c,#17141c);text-align:left;font:inherit;color:inherit}',
    '.sc-mini:before{inset:3px;border-radius:7px}.sc-mini:hover,.sc-mini:focus-visible{border-color:var(--acc);outline:none}',
    '.sc-mini .sc-art{flex:0 0 46px;height:46px;width:46px;border-radius:8px}.sc-mini .sc-art svg{width:34px;height:34px}.sc-mini .sc-art:after{display:none}',
    '.sc-mini .sc-mb{display:flex;flex-direction:column;gap:2px;min-width:0}.sc-mini .sc-mt{font:700 1rem/1.1 "Roboto Slab",Georgia,serif;color:#f1ecdf}',
    '.sc-mini .sc-ms{font:500 11px/1.3 ui-monospace,Menlo,monospace;letter-spacing:.06em;text-transform:uppercase;color:#a79fae}',
    /* the pop-up */
    '.sc-overlay{position:fixed;inset:0;z-index:100000;display:grid;place-items:center;padding:16px;background:rgba(5,4,8,.78);overflow:auto}',
    '.sc-overlay .sc-wrap{display:flex;flex-direction:column;align-items:center;gap:12px;width:min(320px,100%)}.sc-overlay .sc-card{width:100%}',
    '.sc-overlay .sc-buttons{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}',
    '.sc-overlay .sc-buttons button{padding:9px 18px;font:600 14px/1 "Roboto Slab",Georgia,serif;letter-spacing:.14em;text-transform:uppercase;color:#efe5cc;background:#6d2420;border:0;cursor:pointer;border-radius:3px}',
    '.sc-overlay .sc-buttons button.ghost{background:transparent;box-shadow:inset 0 0 0 1px #6f677a;color:#d6cfbf}',
    '.sc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px}',
    '@media print{.sc-card{break-inside:avoid;box-shadow:none}}'
  ].join('\n');
  function ensureCss() {
    if (typeof document === 'undefined' || document.getElementById('sac-cards-css')) return;
    var s = document.createElement('style'); s.id = 'sac-cards-css'; s.textContent = css; (document.head || document.documentElement).appendChild(s);
  }
  function art(m) {
    if (m.img) return '<img src="' + esc(m.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer">';
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' + (G[m.icon] || G.gem) + '</svg>';
  }
  /* The card as markup. mini is the list form (a button); the full form is a card. Everything is escaped. */
  function html(model, opts) {
    ensureCss(); opts = opts || {};
    var m = clean(model), lvl = m.level, tier = Math.max(0, Math.min(5, lvl));
    var style = '--acc:' + m.accent + ';--frame:' + FRAME[tier];
    var pips = lvl ? '<span class="sc-pips" role="img" aria-label="Level ' + lvl + '"><b>' + new Array(lvl + 1).join('◆') + '</b>' + new Array(6 - lvl).join('◇') + '</span>' : '<span></span>';
    if (opts.mini) {
      var sub = [m.type, lvl ? 'Level ' + lvl : ''].filter(Boolean).join(' · ');
      return '<button type="button" class="sc-card sc-mini sc-t' + tier + '" style="' + style + '"' + (opts.attrs ? ' ' + opts.attrs : '') + ' aria-label="Show the card for ' + esc(m.title) + '"><span class="sc-art">' + art(m) + '</span><span class="sc-mb"><span class="sc-mt">' + esc(m.title) + '</span><span class="sc-ms">' + esc(sub) + '</span></span></button>';
    }
    return '<article class="sc-card sc-t' + tier + '" style="' + style + '" aria-label="' + esc(m.title) + '">' +
      '<div class="sc-head"><span>' + esc(KIND_NAME[m.kind] || 'Card') + '</span>' + pips + '</div>' +
      '<div class="sc-art">' + art(m) + '</div>' +
      '<h3 class="sc-title">' + esc(m.title) + '</h3>' + (m.type ? '<p class="sc-type">' + esc(m.type) + '</p>' : '') +
      (m.stats.length ? '<ul class="sc-stats">' + m.stats.map(function (s) { return '<li><b>' + esc(s[1] ? s[0] : '') + '</b><span>' + esc(s[1] || s[0]) + '</span></li>'; }).join('') + '</ul>' : '') +
      (m.tags.length ? '<p class="sc-tags">' + m.tags.map(function (t) { return '<span>' + esc(t) + '</span>'; }).join('') + '</p>' : '') +
      (m.text ? '<p class="sc-text">' + esc(m.text) + '</p>' : '') +
      '<div class="sc-foot"><span>Sacrament</span><span>' + (lvl ? 'Level ' + lvl : '') + '</span></div></article>';
  }
  /* The full card in a pop-up. actions: [{ label, fn, ghost }]. Closes on Escape, a click outside, or Close. Returns a function that closes it. */
  var openEl = null, openPrev = null, openDone = null;
  function close() { if (openEl) { openEl.remove(); openEl = null; var done = openDone; openDone = null; if (done) { try { done(); } catch (e) {} } document.removeEventListener('keydown', onKey, true); if (openPrev && openPrev.focus) { try { openPrev.focus(); } catch (e) {} } openPrev = null; } }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Tab' && openEl) { // keep focus inside the card
      var b = openEl.querySelectorAll('button'); if (!b.length) return;
      var first = b[0], last = b[b.length - 1];
      if (!openEl.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function open(model, opts) {
    ensureCss(); close(); opts = opts || {}; openPrev = document.activeElement; openDone = opts.onClose || null;
    var el = document.createElement('div'); el.className = 'sc-overlay'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Card: ' + clean(model).title);
    var acts = (opts.actions || []);
    el.innerHTML = '<div class="sc-wrap">' + html(model) + '<div class="sc-buttons">' + acts.map(function (a, i) { return '<button type="button" data-a="' + i + '"' + (a.ghost ? ' class="ghost"' : '') + '>' + esc(a.label) + '</button>'; }).join('') + '<button type="button" class="ghost" data-close>Close</button></div></div>';
    el.addEventListener('click', function (e) {
      if (e.target === el || e.target.hasAttribute('data-close')) { close(); return; }
      var b = e.target.closest('[data-a]'); if (b) { var a = acts[+b.getAttribute('data-a')]; if (a && a.fn) { var r = a.fn(); if (a.keep !== true) close(); return r; } }
    });
    document.body.appendChild(el); openEl = el; document.addEventListener('keydown', onKey, true);
    var f = el.querySelector('button'); if (f) f.focus();
    return close;
  }
  window.SacCards = { html: html, open: open, close: close, clean: clean, fromGear: fromGear, fromNode: fromNode, fromAdversary: fromAdversary, handout: handout, resolve: resolve, icons: ICONS, iconFor: iconFor, glyph: function (n) { return G[n] || G.gem; }, ACCENT: ACCENT };
})();
