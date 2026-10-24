/* The GM's loot designer (over the table): a library of the table's own items on the left, a form on the right, and a preview of what a player will read.
   It only draws and gathers what the GM types; every rule (what is sensible, what lands on a sheet) is the server's, using the same sheet-core.js the sheet runs.
   mount(el, host): host = { lib(): saved items, heroes(): [{ id, name }], send(cmd, done), say(text), close() }. */
(function (root) {
  'use strict';
  var C = root.SacramentSheetCore, R = root.SacramentRules;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var FIXED = { Weapon: 1, Armour: 1, Relic: 1, Grimoire: 1 };   /* these always can be equipped */
  var blank = function () { return { name: '', category: 'Curio', cat: '', roll: 'STR', slots: 1, weaponStyle: 'single', armourPart: 'body', flavour: '', does: '', equippable: false, temptsHorror: false, horror: 1, defence: 0, uses: 0, notes: '' }; };

  function mount(el, host) {
    var ld = { mode: 'lib', id: null, cardId: null, f: blank(), tab: 'design', hero: '', confirm: null, sig: '' };

    function opt(v, label, cur) { return '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label) + '</option>'; }
    function field(label, key, big, max) { var v = ld.f[key]; return '<label class="sh-f">' + esc(label) + (big ? '<textarea rows="2" data-lf="' + key + '" maxlength="' + max + '">' + esc(v) + '</textarea>' : '<input data-lf="' + key + '" value="' + esc(v) + '" maxlength="' + max + '">') + '</label>'; }
    function num(label, key, lo, hi) { return '<label class="sh-f">' + esc(label) + '<input type="number" inputmode="numeric" data-lf="' + key + '" min="' + lo + '" max="' + hi + '" value="' + esc(ld.f[key]) + '"' + (key === 'slots' && ld.f.category === 'Grimoire' ? ' disabled' : '') + '></label>'; }
    function seg(key, on, yes, no) {
      return '<div class="lt-seg" role="group">' + [[true, yes], [false, no]].map(function (x) { return '<button type="button" data-lseg="' + key + '" data-v="' + x[0] + '" aria-pressed="' + (on === x[0]) + '"' + (on === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>';
    }

    /* the library column */
    function tags(it) {
      var t = ['<span class="sh-pill cat">' + esc(it.category) + '</span>'];
      if (it.cat) t.push('<span class="sh-pill">' + esc(R.CAT_NAMES[it.cat]) + '</span>');
      t.push('<span class="sh-pill">' + (it.equippable ? 'Equippable' : 'Supply') + '</span>');
      if (it.temptsHorror) t.push('<span class="sh-pill tempt">' + esc(C.horrorText(it)) + '</span>');
      return t.join(' ');
    }
    function heroSelect() {
      var hs = host.heroes(); if (!hs.length) return '<p class="sh-note">No heroes at the table to give things to yet.</p>';
      if (!hs.some(function (x) { return x.id === ld.hero; })) ld.hero = hs[0].id;
      return '<label class="sh-f">Give to<select data-lhero>' + hs.map(function (x) { return opt(x.id, x.name, ld.hero); }).join('') + '</select></label>';
    }
    function library() {
      var lib = host.lib(), out = '<h3>Library (' + lib.length + ')</h3>' + heroSelect();
      out += lib.map(function (it) {
        return '<div class="lt-item' + (ld.id === it.id && ld.mode === 'lib' ? ' cur' : '') + '"><h4>' + esc(it.name) + '</h4><div>' + tags(it) + '</div><div class="lt-row">' +
          '<button type="button" class="sh-b" data-lb="edit" data-id="' + it.id + '">Edit</button><button type="button" class="sh-b" data-lb="place" data-id="' + it.id + '">Put on table</button><button type="button" class="sh-b" data-lb="give" data-id="' + it.id + '">Give</button>' +
          '<button type="button" class="sh-b danger" data-lb="del" data-id="' + it.id + '">' + (ld.confirm === it.id ? 'Really delete?' : 'Delete') + '</button></div></div>';
      }).join('') || '<p class="sh-note">Nothing designed yet. Fill in the form and save it here.</p>';
      return out + '<button type="button" class="sh-b wide" data-lb="new">+ New item</button><p class="sh-note">Only you see this library. Designed items stay with this table. Changing or deleting one here never changes what a hero already holds.</p>';
    }

    /* the form */
    function form() {
      var f = ld.f, fixed = !!FIXED[f.category], title = ld.mode === 'card' ? 'Edit this loot card' : ld.mode === 'copy' ? 'Edit a copy of the find' : ld.id ? 'Edit loot' : 'Design loot';
      if (f.category === 'Grimoire') f.slots = 3;
      if (f.category === 'Weapon' && ['heavy', 'ranged'].includes(f.weaponStyle)) { f.cat = 'weapons'; if (!f.roll) f.roll = 'STR'; }
      var out = '<h3>' + title + '</h3>' + field('Name', 'name', false, 60);
      if (f.category === 'Weapon' && f.weaponStyle === 'firearm') { f.cat = 'guns'; if (!f.roll) f.roll = 'DEX'; }
      if (f.category === 'Weapon' && (!f.cat || f.cat === 'basic')) f.cat = 'weapons';
      out += '<div class="sh-row"><label class="sh-f">Category<select data-lf="category" data-redraw>' + C.CUSTOM_CATS.map(function (c) { return opt(c, c, f.category); }).join('') + '</select></label>' +
        '<label class="sh-f">Effort type<select data-lf="cat" data-redraw' + (f.category === 'Grimoire' || (f.category === 'Weapon' && ['heavy', 'ranged', 'firearm'].includes(f.weaponStyle)) ? ' disabled' : '') + '>' + (f.category === 'Weapon' ? '' : opt('', 'None (no damage Effort)', f.cat)) + R.CATS.filter(function (k) { return f.category !== 'Weapon' || k !== 'basic'; }).map(function (k) { return opt(k, (k === 'weapons' ? 'Weapons: melee, bows, crossbows' : k === 'guns' ? 'Guns and gunpowder' : R.CAT_NAMES[k]) + ' (d' + ((host.dice && host.dice()[k]) || R.DEFAULT_DICE[k]) + ')', f.cat); }).join('') + '</select></label></div>';
      out += '<div class="sh-row">' + (f.cat ? '<label class="sh-f">Check stat (for its roll)<select data-lf="roll">' + R.STATS.map(function (k) { return opt(k, k, f.roll); }).join('') + '</select></label>' + num('Uses (0 for no limit)', 'uses', 0, 20) : '') + num('Slots', 'slots', 1, 4) + (f.category === 'Armour' ? num('Defence', 'defence', 0, 5) : '') + '</div>';
      if (f.category === 'Weapon') out += '<label class="sh-f">Weapon style<select data-lf="weaponStyle" data-redraw>' + [['single','One handed'],['heavy','Heavy melee (+2 Weapons damage, two hands)'],['reach','Reach or control (two hands)'],['ranged','Bow or crossbow (d6, two hands)'],['firearm','Gun or gunpowder weapon (d8, two hands)']].map(function (x) { return opt(x[0], x[1], f.weaponStyle || 'single'); }).join('') + '</select></label>';
      if (f.category === 'Armour') out += '<label class="sh-f">Armour part<select data-lf="armourPart">' + [['body','Body armour'],['head','Helmet'],['shield','Shield']].map(function (x) { return opt(x[0], x[1], f.armourPart || 'body'); }).join('') + '</select></label>';
      if (f.healingSource) out += '<p class="sh-note">Automated healing uses the rules of ' + esc(C.item(f.healingSource).name) + '. Changing the description does not change its die, target or rest limit.</p>';
      out += field('Description (players see this)', 'flavour', true, 400) + field('Ability text (what it does)', 'does', true, 600);
      if (f.category === 'Grimoire') {
        out += '<p class="sh-note">Every grimoire takes three slots. Choose three different spells. Each spell keeps its own effect and Horror cost.</p>';
        for (var si = 0; si < 3; si++) out += '<label class="sh-f">Spell ' + (si + 1) + '<select data-lspell="' + si + '">' + opt('', 'Choose a spell', '') + root.SACRAMENT_GEAR.spells.map(function (sp) { return opt(sp.id, sp.name + ' · ' + C.effectLabel(sp), (f.spells || [])[si]); }).join('') + '</select></label>';
      }
      out += '<div class="sh-f">Can it be equipped?' + (fixed ? '<p class="sh-note">A ' + esc(f.category.toLowerCase()) + ' is always equippable.</p>' : seg('equippable', f.equippable === true, 'Equippable', 'Supply (stays in the pack)')) + '</div>';
      out += f.category === 'Grimoire' ? '<p class="sh-note">Healing spells cost 0 Horror; every other spell costs 1.</p>' : '<div class="sh-f">Tempts the Horror?' + seg('temptsHorror', f.temptsHorror === true, 'Yes', 'No') + '</div>' + (f.temptsHorror ? field('Horror amount: a number, or dice such as d4+2', 'horror', false, 8) + field('Why it tempts Horror (players see this)', 'horrorReason', true, 240) : '');
      out += field('Rules notes (only you can read these)', 'notes', true, 1000);
      var heroes = host.heroes().length;
      out += '<div class="lt-row lt-actions">' + (ld.mode === 'card' ? '<button type="button" class="sh-b go" data-lb="savecard">Save changes</button>' :
        ld.mode === 'copy' ? '<button type="button" class="sh-b go" data-lb="placeform">Put on table (hidden)</button>' + (heroes ? '<button type="button" class="sh-b" data-lb="giveform">Give to the chosen hero</button>' : '') + '<button type="button" class="sh-b" data-lb="save">Save to library</button>' :
        '<button type="button" class="sh-b go" data-lb="save">Save to library</button><button type="button" class="sh-b" data-lb="saveplace">Save and put on table</button>') + '<button type="button" class="sh-b" data-lb="close">Close</button></div>';
      return out + '<div class="lt-prev" id="ltPrev"></div>';
    }
    function preview() {
      var it = C.makeCustom(ld.f), pills = [it.slots + (it.slots === 1 ? ' slot' : ' slots')];
      if (it.weaponStyle) pills.push(C.weaponHands(it) === 2 ? 'Two hands' : 'One hand'); if (C.damageBonus(it)) pills.push('+2 heavy damage'); if (it.armourPart) pills.push(it.armourPart === 'head' ? 'Helmet' : it.armourPart === 'shield' ? 'Shield' : 'Body armour');
      if (it.defence) pills.push('Defence +' + it.defence); if (it.cat) pills.push('Effort d' + ((host.dice && host.dice()[it.cat]) || R.DEFAULT_DICE[it.cat])); if (it.roll) pills.push(it.roll);
      return '<div class="sh-note">How a player will see it</div><div class="sh-item"><div><b>' + esc(it.name) + '</b> <span class="sh-pill cat">' + esc(it.category) + '</span> ' + pills.map(function (x) { return '<span class="sh-pill">' + esc(x) + '</span>'; }).join(' ') +
        (it.temptsHorror ? ' <span class="sh-pill tempt">' + esc(C.horrorText(it)) + '</span>' : '') + (it.flavour ? '<p class="sh-flav">' + esc(it.flavour) + '</p>' : '') + (it.does ? '<p class="sh-does">' + esc(it.does) + '</p>' : '') +
        (it.cat ? '<p class="sh-eff">Used, it rolls <b>' + esc(R.CAT_NAMES[it.cat]) + ' Effort (d' + ((host.dice && host.dice()[it.cat]) || R.DEFAULT_DICE[it.cat]) + ')</b> for you after a ' + esc(it.roll) + ' check.</p>' : '') + '</div>' + (it.equippable ? '' : '<span class="sh-supply">Supply</span>') + '</div>';
    }

    function draw() {
      ld.sig = sig();
      el.innerHTML = '<div class="sheet-body"><div class="sh-head"><h2>Loot designer <span class="sh-sub">only you see this</span></h2><button type="button" class="sh-b close" data-lb="close">Close</button></div>' +
        '<div class="sh-msg" role="status" aria-live="polite" id="ltMsg"></div>' +
        '<div class="lt-tabs"><button type="button" data-lb="tab" data-t="lib" aria-pressed="' + (ld.tab === 'lib') + '">Library (' + host.lib().length + ')</button><button type="button" data-lb="tab" data-t="design" aria-pressed="' + (ld.tab === 'design') + '">Design</button></div>' +
        '<div class="lt-cols lt-show-' + ld.tab + '"><div class="lt-lib" id="ltLib">' + library() + '</div><div class="lt-form" id="ltForm">' + form() + '</div></div></div>';
      drawPrev();
    }
    function drawPrev() { var p = el.querySelector('#ltPrev'); if (p) p.innerHTML = preview(); }
    function sig() { return JSON.stringify([host.lib(), host.heroes(), ld.confirm, ld.id, ld.mode]); }
    function say(t) { var m = el.querySelector('#ltMsg'); if (m) m.innerHTML = t ? '<b>' + esc(t) + '</b>' : ''; }
    /* a state update changes the library column only, so what is being typed is never disturbed */
    function refresh() { if (el.hidden || sig() === ld.sig) return; ld.sig = sig(); var l = el.querySelector('#ltLib'); if (l) l.innerHTML = library(); var t = el.querySelector('[data-t=lib]'); if (t) t.textContent = 'Library (' + host.lib().length + ')'; }

    function open(spec) {
      spec = spec || {}; ld.confirm = null;
      if (spec.item) { ld.f = Object.assign(blank(), spec.item); ld.mode = spec.mode || 'lib'; ld.id = spec.id || null; ld.cardId = spec.cardId || null; ld.tab = 'design'; }
      else if (!el.innerHTML || spec.fresh) { ld.f = blank(); ld.mode = 'lib'; ld.id = null; ld.cardId = null; ld.tab = 'design'; }
      draw();
    }
    function item() { var o = Object.assign({}, ld.f); o.slots = +o.slots; o.horror = /^[0-9]+$/.test(String(o.horror).trim()) ? +o.horror : String(o.horror).trim();   /* a number, or dice the table rolls when it is used */ o.defence = +o.defence; o.uses = +o.uses; return o; }
    /* one press, one command: a second press while the first is still on its way is ignored, so a double click cannot give or place twice */
    function once(cmd, done) { if (ld.busy) return; ld.busy = true; host.send(cmd, function (r) { ld.busy = false; if (done) done(r); }); }
    function saved(b, then) { if (!b) return; then(b.result); }
    var actions = {
      tab: function (b) { ld.tab = b.dataset.t; draw(); },
      new: function () { ld.f = blank(); ld.mode = 'lib'; ld.id = null; ld.tab = 'design'; draw(); },
      close: function () { host.close(); },
      edit: function (b) { var it = host.lib().filter(function (x) { return x.id === b.dataset.id; })[0]; if (it) { ld.f = Object.assign(blank(), it); ld.mode = 'lib'; ld.id = it.id; ld.tab = 'design'; draw(); } },
      place: function (b) { once({ type: 'lootPlace', libId: b.dataset.id }, function (r) { if (r) say('Put on the table, hidden. Reveal it from its card.'); }); },
      give: function (b) { if (!ld.hero) return; var n = hname(); once({ type: 'lootGive', libId: b.dataset.id, charId: ld.hero }, function (r) { if (r) say('Given to ' + n + '.'); }); },
      del: function (b) { if (ld.confirm !== b.dataset.id) { ld.confirm = b.dataset.id; refreshNow(); return; } ld.confirm = null; once({ type: 'lootDelete', id: b.dataset.id }, function () { if (ld.id === b.dataset.id) { ld.f = blank(); ld.id = null; ld.mode = 'lib'; } draw(); }); },
      save: function () { once({ type: 'lootSave', item: item(), id: ld.mode === 'lib' ? ld.id : undefined }, function (r) { saved(r, function (x) { ld.id = x.id; ld.mode = 'lib'; draw(); say('Saved to the library.'); }); }); },
      saveplace: function () { once({ type: 'lootSave', item: item(), id: ld.id || undefined }, function (r) { saved(r, function (x) { ld.id = x.id; draw(); say('Saved. Putting it on the table…'); once({ type: 'lootPlace', libId: x.id }, function (p) { if (p) say('Saved, and put on the table, hidden.'); }); }); }); },
      placeform: function () { once({ type: 'lootPlace', item: item() }, function (r) { if (r) say('Put on the table, hidden. Reveal it from its card.'); }); },
      giveform: function () { if (!ld.hero) return; var n = hname(); once({ type: 'lootGive', item: item(), charId: ld.hero }, function (r) { if (r) say('Given to ' + n + '.'); }); },
      savecard: function () { once({ type: 'lootCardEdit', cardId: ld.cardId, item: item() }, function (r) { if (r) say('The card now shows the changed item.'); }); }
    };
    function hname() { var h = host.heroes().filter(function (x) { return x.id === ld.hero; })[0]; return h ? h.name : 'the hero'; }
    function refreshNow() { ld.sig = ''; refresh(); }

    el.addEventListener('click', function (e) {
      var s = e.target.closest('[data-lseg]'); if (s) { ld.f[s.dataset.lseg] = s.dataset.v === 'true'; var f = el.querySelector('#ltForm'); if (f) { f.innerHTML = form(); drawPrev(); } return; }
      var b = e.target.closest('[data-lb]'); if (b && actions[b.dataset.lb]) { e.preventDefault(); actions[b.dataset.lb](b); }
    });
    el.addEventListener('input', function (e) { var t = e.target; if (t.dataset && t.dataset.lf && !t.hasAttribute('data-redraw') && t.tagName !== 'SELECT') { ld.f[t.dataset.lf] = t.value; drawPrev(); } });
    el.addEventListener('change', function (e) {
      var t = e.target; if (!t.dataset) return;
      if (t.dataset.lspell !== undefined) { ld.f.spells = ld.f.spells || []; ld.f.spells[+t.dataset.lspell] = t.value; drawPrev(); return; }
      if (t.dataset.lhero !== undefined) { ld.hero = t.value; return; }
      if (t.dataset.lf) { ld.f[t.dataset.lf] = t.value; if (t.dataset.lf === 'category' && t.value === 'Grimoire') { ld.f.cat = ''; ld.f.temptsHorror = true; ld.f.slots = 3; } if (t.dataset.lf === 'weaponStyle' && t.value !== 'single') ld.f.slots = Math.max(2, +ld.f.slots || 2); if (t.hasAttribute('data-redraw')) { var f = el.querySelector('#ltForm'); if (f) { f.innerHTML = form(); drawPrev(); } } else drawPrev(); }
    });
    return { open: open, refresh: refresh, draw: draw, say: say };
  }
  root.SacramentLoot = { mount: mount, blank: blank };
})(typeof window !== 'undefined' ? window : globalThis);
