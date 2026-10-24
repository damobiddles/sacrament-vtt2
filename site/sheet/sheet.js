/* Sacrament RPG character sheet: the screen. ONE sheet, used over the table and on the My heroes page, so there is a single way to look after a hero.
   It draws a hero and sends changes to whoever hosts it; it decides nothing itself: every change is first tried with sheet-core.js (so a refusal is explained on the sheet in
   plain words) and then handed to the host, and at a table the server checks it again.
   Usage:  var view = SacramentSheet.mount(element, host);  view.draw();
   host = { get(): { hero, hp: { cur, max } | null, canEdit, canHp, gm, live } | null,   what to show now
            act(op, done(ok, why)),   make a change (an op for SacramentSheetCore.edit)
            hp(d),                    move hit points by d (only if canHp)
            close()                   optional: a Close button is shown if given } */
(function (root) {
  'use strict';
  var C = root.SacramentSheetCore, R = root.SacramentRules;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sgn = function (n) { return n < 0 ? '−' + Math.abs(n) : '+' + n; };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : b); };
  var KINDS = [['weapon', 'Weapons'], ['armour', 'Armour and shields'], ['supply', 'Supplies and tools']];
  var HEART_PATH = 'M12 21.2C12 21.2 2 14.6 2 8.2 2 4.9 4.5 2.6 7.4 2.6c1.9 0 3.6 1 4.6 2.7 1-1.7 2.7-2.7 4.6-2.7C19.5 2.6 22 4.9 22 8.2 22 14.6 12 21.2 12 21.2Z';

  function hearts(cur, max) {
    max = Math.floor(+max); if (!(max > 0)) return ''; cur = Math.max(0, Math.min(max, Math.floor(+cur) || 0));
    var out = '', n = Math.ceil(max / 10);
    for (var i = 0; i < n; i++) {
      var cap = Math.min(10, max - 10 * i), f = Math.max(0, Math.min(cap, cur - 10 * i)) / cap;
      out += '<span class="sh-ht" style="--k:' + Math.max(0.5, cap / 10) + '"><svg viewBox="0 0 24 22" class="bg"><path d="' + HEART_PATH + '"/></svg>' +
        (f > 0 ? '<svg viewBox="0 0 24 22" class="fg" style="clip-path:inset(' + (100 - Math.round(f * 1000) / 10) + '% 0 0 0)"><path d="' + HEART_PATH + '"/></svg>' : '') + '</span>';
    }
    return '<span class="sh-hearts" role="img" aria-label="' + cur + ' of ' + max + ' hit points">' + out + '</span>';
  }

  function pills(it) {
    var b = [plural(it.slots, 'slot', 'slots')];
    if (it.once === 'scene') b.push('Once per scene');
    if (C.rangeText(it)) b.push(C.rangeText(it));
    if (it.defence) b.push('Defence ' + sgn(it.defence));
    if (it.weaponStyle) b.push(C.weaponHands(it) === 2 ? 'Two hands' : 'One hand');
    if (C.attackBonus(it)) b.push('+2 crossbow accuracy');
    if (C.damageBonus(it)) b.push('+2 heavy damage');
    if (it.armourPart) b.push(it.armourPart === 'body' ? 'Body armour' : it.armourPart === 'head' ? 'Helmet' : 'Shield');
    if (it.hearts) b.push('+' + plural(it.hearts, 'Heart', 'Hearts'));
    if (it.effort && it.kind !== 'grimoire') b.push('Effort d' + it.effort);   /* a grimoire is used through its spells, which say their own */
    if (it.roll && it.kind !== 'grimoire') b.push(it.roll);
    return b.map(function (x) { return '<span class="sh-pill">' + esc(x) + '</span>'; }).join(' ') + (C.horrorText(it) ? ' <span class="sh-pill tempt">' + esc(C.horrorText(it)) + '</span>' : '');
  }
  function optionText(it) { return it.name + ' (' + plural(it.slots, 'slot', 'slots') + (it.defence ? ', Defence ' + sgn(it.defence) : '') + (it.hearts ? ', +' + plural(it.hearts, 'Heart', 'Hearts') : '') + ')'; }

  function stepper(kind, key, v, label) {
    return '<span class="sh-cell"><span class="sh-stat"><b>' + sgn(v) + '</b><small>' + esc(label) + '</small></span>' +
      '<span class="sh-step"><button type="button" data-sh="' + kind + '" data-k="' + key + '" data-d="-1" aria-label="Less ' + esc(label) + '">−</button><button type="button" data-sh="' + kind + '" data-k="' + key + '" data-d="1" aria-label="More ' + esc(label) + '">+</button></span></span>';
  }
  function field(label, name, v, edit, big, max) {
    if (!edit) return v ? '<div class="sh-ro"><span class="sh-lab">' + esc(label) + '</span><p>' + esc(v) + '</p></div>' : '';
    return '<label class="sh-f">' + esc(label) + (big ? '<textarea rows="' + (big === true ? 3 : big) + '" data-text="' + name + '" maxlength="' + max + '">' + esc(v) + '</textarea>' : '<input data-text="' + name + '" value="' + esc(v) + '" maxlength="' + max + '">') + '</label>';
  }

  /* the line saying what happens when it is used: only an item with an Effort kind rolls */
  function effortLine(src, dice) { return src.cat ? '<p class="sh-eff">Used, it makes a ' + esc(src.roll || '') + ' check; on a success you roll <b>' + esc(R.CAT_NAMES[src.cat]) + ' Effort (d' + ((dice && dice[src.cat]) || R.DEFAULT_DICE[src.cat]) + ')' + (C.damageBonus(src) ? ' +2 heavy weapon' : '') + '</b> for damage.</p>' : ''; }
  function useBtn(a, spellId, word, quick) { return a ? '<button type="button" class="sh-b use' + (a.ok ? '' : ' dim') + '" data-sh="' + (quick ? 'quickUse' : 'use') + '" data-i="' + a.index + '" data-gear="' + esc(a.gearKey || '') + '"' + (a.mode ? ' data-mode="' + esc(a.mode) + '"' : '') + (spellId ? ' data-spell="' + esc(spellId) + '"' : '') + '>' + (word || 'Use') + '</button>' : ''; }
  /* What a spell or item with no Effort die does when used: a check with its stat, or nothing to roll at all. */
  function plainLine(src) { var heal = C.healingOf(src); if (heal) return '<p class="sh-eff">Used, it ' + (src.roll ? 'checks ' + esc(src.roll) + ' and, on success, ' : '') + 'applies healing d' + heal.die + ' automatically. ' + (heal.tend ? 'On a dying hero, bandages Tend instead; a natural 20 also heals d4. ' : '') + (heal.kind ? 'Once per target per rest; downed targets may be healed again.' : 'Uses its remaining charges.') + '</p>'; return src.cat || !(src.temptsHorror || src.heal) ? '' : '<p class="sh-eff">' + (src.roll ? 'Used, it makes a ' + esc(src.roll) + ' check (no Effort).' : 'Used, it rolls nothing.') + '</p>'; }
  function gearItem(g, i, edit, acts, dice) {
    var it = C.itemOf(g); if (!it) return '';
    var spells = it.kind === 'grimoire' ? C.spellsOf(it) : [];
    var act = function (spellId) { return acts.filter(function (a) { return a.index === i && (a.spellId || '') === (spellId || ''); })[0]; };
    return '<div class="sh-item"><div><b>' + esc(it.name) + '</b> ' + (it.category ? '<span class="sh-pill cat">' + esc(it.category) + '</span> ' : '') + pills(it) + (g.uses != null ? ' <span class="sh-pill">' + plural(g.uses, 'use', 'uses') + ' left</span>' : '') +
      (it.rangeNote ? '<p class="sh-note">' + esc(it.rangeNote) + '</p>' : '') + (it.flavour ? '<p class="sh-flav">' + esc(it.flavour) + '</p>' : '') + (it.does ? '<p class="sh-does">' + esc(it.does) + '</p>' : '') + (it.kind === 'grimoire' ? (it.pick ? '<p class="sh-eff">Read, it rolls d' + (it.pickDie || it.pick) + ': the die chooses one of its ' + it.pick + ' spells.</p>' : '') : effortLine(it, dice) + plainLine(it)) +
      (it.kind === 'grimoire' && !spells.length ? '<p class="sh-note">No spells are written in it yet.</p>' : '') +
      (spells.length ? '<ul class="sh-spells">' + spells.map(function (s) { return '<li><b>' + esc(s.name) + '</b> <span class="sh-pill">' + esc(C.effectLabel(s)) + '</span> <span class="sh-pill">' + esc(C.rangeText(s)) + '</span>: ' + esc(s.does) + ' <span class="sh-pill tempt">' + esc(C.horrorText(s)) + '</span>' + effortLine(s, dice) + (it.pick ? '' : plainLine(s)) + useBtn(act(s.id), s.id) + '</li>'; }).join('') + '</ul>' : '') + '</div>' +
      '<div class="sh-btns">' + (it.kind === 'grimoire' && !it.pick ? '' : useBtn(act(''), '', it.pick ? 'Read' : '')) + (edit ? (C.canEquip(it) ? '<button type="button" class="sh-b" data-sh="move" data-i="' + i + '" data-gear="' + esc(g.key || '') + '" data-eq="' + (g.eq ? '0' : '1') + '">' + (g.eq ? 'To the pack' : 'Equip') + '</button>' : '<span class="sh-supply" title="' + (it.kind === 'supply' ? 'A supply works from the pack, so it is never equipped.' : 'This works from the pack, so it is never equipped.') + '">' + (it.kind === 'supply' ? 'Supply' : 'Pack only') + '</span>') + '<button type="button" class="sh-b" data-sh="remove" data-i="' + i + '" data-gear="' + esc(g.key || '') + '">Drop</button>' : '') + '</div></div>';
  }

  function render(d, msg, host, pick) {
    var h = d.hero, edit = !!d.canEdit, gm = !!d.gm, B = R.BUILD, hp = d.hp, left = C.pointsLeft(h), eleft = C.effortLeft(h), acts = host.use && edit ? C.actions(h) : [];
    var out = '<div class="sh-head"><h2>' + esc(h.name) + ' <span class="sh-sub">' + (d.title || '') + '</span></h2>' + (d.live ? '<span class="sh-live" role="status">At the table · changes show for everyone</span>' : '') + (host.close ? '<button type="button" class="sh-b close" data-sh="close">Close sheet</button>' : '') + '</div>';
    out += C.equipmentProblems(h).map(function (warning) { return '<p class="sh-note" role="status"><b>' + esc(warning) + '</b></p>'; }).join('');
    out += '<div class="sh-msg" role="status" aria-live="polite">' + (msg ? '<b>' + esc(msg) + '</b>' : '') + '</div>';
    if (d.live && host.use && edit) {
      var ready = acts.filter(function (a) { return a.ok; });
      out += '<section class="sh-sec sh-actions" aria-label="Quick actions"><h3>Ready to use</h3><div class="sh-quick">' + (ready.map(function (a) { return useBtn(a, a.spellId, a.name, true); }).join('') || '<p class="sh-note">No equipped actions are ready. Manage your equipment below.</p>') + '</div></section>';
    }
    if (d.live && gm && host.roll) {
      out += '<section class="sh-sec sh-gm-rolls" aria-label="GM hero checks"><h3>Roll for ' + esc(h.name) + '</h3><p class="sh-note">Use these checks when helping a player. Use Ready to use for weapons, spells and items.</p><div class="sh-row">' + R.STATS.map(function (k) { return '<button type="button" class="sh-b" data-sh="gmRoll" data-stat="' + k + '">Roll ' + k + ' ' + sgn(h.stats[k]) + '</button>'; }).join('') + '</div><div class="sh-row"><label class="sh-f">Difficulty<select id="shGmAdj"><option value="normal">Normal</option><option value="easy">Easy −3</option><option value="hard">Hard +3</option></select></label><label class="sh-f">Own d20 (optional)<input id="shGmD20" type="number" min="1" max="20" inputmode="numeric" placeholder="Roll digitally"></label></div></section>';
    }
    var left1 = '<section class="sh-sec"><h3>Who</h3><div class="sh-row">' + field('Name', 'name', h.name, edit, false, C.TEXT_LIMITS.name) + field('Calling', 'calling', h.calling, edit, false, C.TEXT_LIMITS.calling) + '</div>' + field('Vow', 'vow', h.vow, edit, false, C.TEXT_LIMITS.vow) + '</section>';
    left1 += '<section class="sh-sec"><h3>Health and Defence</h3><div class="sh-row sh-hpline">' + (hp ? hearts(hp.cur, hp.max) + '<b class="sh-hpn">' + hp.cur + ' / ' + hp.max + '</b>' + (d.canHp ? '<span class="sh-step"><button type="button" data-sh="hp" data-d="-1" aria-label="Lose 1 hit point">−</button><button type="button" data-sh="hp" data-d="1" aria-label="Gain 1 hit point">+</button></span>' : '') + (hp.cur === 0 ? '<b class="sh-zero">AT 0</b>' : '') : '<span class="sh-note">No hit points yet.</span>') +
      '<span class="sh-def">Defence <b>' + C.defence(h) + '</b></span></div><p class="sh-note">Defence is 10 + CON + armour (armour counts for at most +5). A monster must roll it or more to hit you.</p></section>';
    left1 += '<section class="sh-sec"><h3>Scores <span class="sh-note">(' + left + ' of ' + B.points + ' points left)</span></h3><div class="sh-row">' + R.STATS.map(function (k) { return edit ? stepper('score', k, h.stats[k], k) : '<span class="sh-stat"><b>' + sgn(h.stats[k]) + '</b><small>' + k + '</small></span>'; }).join('') + '</div>' +
      (edit ? '<p class="sh-note">' + B.points + ' points to share, no more than ' + B.scoreMax + ' in one score.</p>' : '') + '</section>';
    left1 += '<section class="sh-sec"><h3>Effort <span class="sh-note">(' + eleft + ' of ' + B.effortPoints + ' points left)</span></h3><div class="sh-row">' + R.CATS.map(function (k) { var lab = R.CAT_NAMES[k] + ' d' + ((d.dice && d.dice[k]) || R.DEFAULT_DICE[k]); return edit ? stepper('effort', k, h.effort[k], lab) : '<span class="sh-stat"><b>' + sgn(h.effort[k]) + '</b><small>' + esc(lab) + '</small></span>'; }).join('') + '</div></section>';
    if (C.weaponEffortNote(h)) left1 += '<p class="sh-note" role="note">' + esc(C.weaponEffortNote(h)) + '</p>';
    var eq = [], pk = []; h.gear.forEach(function (g, i) { (g.eq && C.canEquip(C.itemOf(g)) ? eq : pk).push(gearItem(g, i, edit, acts, d.dice)); });
    var option = function (it) { return '<option value="' + it.id + '"' + (pick === it.id ? ' selected' : '') + '>' + esc(optionText(it)) + '</option>'; };
    var group = function (label, list) { return list.length ? '<optgroup label="' + label + '">' + list.map(option).join('') + '</optgroup>' : ''; };
    /* a player is offered the starter list and one grimoire; finds (the loot table and relics) are the GM's to give, so only the GM sees them here */
    var starter = function (k) { return C.items.filter(function (it) { return it.kind === k && !C.isFind(it); }); };
    var opts = KINDS.map(function (k) { return group(k[1], starter(k[0])); }).join('') +
      group('Grimoires (' + (gm ? 'any' : 'one of your own') + ')', C.items.filter(function (it) { return it.kind === 'grimoire' && (gm || !it.found); })) +
      (gm ? group('Relics (the GM gives these)', C.items.filter(function (it) { return it.kind === 'relic'; })) + group('Found items (the loot table)', C.items.filter(function (it) { return it.found && it.kind !== 'relic' && it.kind !== 'grimoire'; })) : '');
    var right = '<section class="sh-sec"><h3>Gear</h3><h4>Equipped <span class="sh-note">' + C.slotsUsed(h, 'eq') + ' of ' + B.slots + ' slots</span></h4>' + (eq.join('') || '<p class="sh-note">Nothing equipped.</p>') +
      '<h4>In the pack <span class="sh-note">' + C.slotsUsed(h, 'pack') + ' of ' + B.slots + ' slots</span></h4>' + (pk.join('') || '<p class="sh-note">Nothing in the pack.</p>') +
      (edit ? '<div class="sh-row sh-add"><label class="sh-f">Add an item<select id="shAdd">' + opts + '</select></label><button type="button" class="sh-b go" data-sh="add">Add</button></div>' : '') + '<p class="sh-note">Only equipped weapons, armour, relics and grimoires work; supplies work from the pack. Grimoires take three slots. Equip one body armour, one helmet and one shield. Two-handed weapons require the shield to be in the pack. Relics, grimoires and magic items can tempt the Horror.</p></section>';
    right += '<section class="sh-sec"><h3>About ' + esc(h.name) + '</h3>' + field('Appearance', 'appearance', h.appearance, edit, 2, C.TEXT_LIMITS.appearance) + field('Background', 'background', h.background, edit, 3, C.TEXT_LIMITS.background) + field('Notes', 'notes', h.notes, edit, 3, C.TEXT_LIMITS.notes) + (edit ? '<p class="sh-note">Only you and the GM can read your background and notes at a table.</p>' : '') + '</section>';
    return out + '<div class="sh-cols"><div>' + left1 + '</div><div>' + right + '</div></div>';
  }

  function mount(el, host) {
    var msg = '', late = false, pressing = false, pick = '', last = '', pend = [];   /* pend: changes sent and not yet answered; they are counted as done so the next click is judged against them */
    var typing = function () { var a = document.activeElement; return !!a && el.contains(a) && (a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || (a.tagName === 'INPUT' && !/^(checkbox|radio|button|submit)$/i.test(a.type))); };
    /* What to show and to judge against: the table's last answer with every change still on its way applied on top of it (on a slow connection a second click would otherwise be refused for want of a point the first has not yet freed). */
    function effective(d) {
      var hero = JSON.parse(JSON.stringify(d.hero)), hp = d.hp ? { cur: d.hp.cur, max: d.hp.max } : null;
      pend.forEach(function (p) { C.edit(hero, p.op, { gm: !!d.gm }, hp); });
      return Object.assign({}, d, { hero: hero, hp: hp });
    }
    function draw(force) {
      var d = host.get(); if (d) d = effective(d);
      if (!force && (typing() || pressing)) { late = true; return; }
      late = false;
      if (!d) { el.innerHTML = '<div class="sheet-body"><p class="sh-note">That hero is not here any more.</p>' + (host.close ? '<button type="button" class="sh-b close" data-sh="close">Close sheet</button>' : '') + '</div>'; return; }
      var html = '<div class="sheet-body">' + render(d, msg, host, pick) + '</div>'; if (html === last && el.firstChild) return;   /* nothing changed: leave the page exactly as it is */
      var keep = el.scrollTop; last = html; el.innerHTML = html; el.scrollTop = keep;
    }
    /* Try a change on a copy first: if the sheet's own rules refuse it, say why here and send nothing; otherwise send it. */
    function attempt(op) {
      var d = host.get(); if (!d || !d.canEdit) return; d = effective(d);
      var copy = JSON.parse(JSON.stringify(d.hero)), hp = d.hp ? { cur: d.hp.cur, max: d.hp.max } : null, r = C.edit(copy, op, { gm: !!d.gm }, hp);
      if (!r.ok) { msg = r.why; draw(true); return; }
      msg = ''; var item = { op: op }; pend.push(item);
      host.act(op, function (ok, why) { var i = pend.indexOf(item); if (i >= 0) pend.splice(i, 1); if (!ok) msg = why || 'That could not be saved. Try again.'; draw(true); });
      draw(true);
    }
    el.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('button')) pressing = true; }, true);
    var release = function () { if (!pressing) return; setTimeout(function () { pressing = false; if (late) draw(); }, 0); };
    el.addEventListener('pointerup', release, true); el.addEventListener('pointercancel', release, true);
    el.addEventListener('focusout', function (e) { var rt = e.relatedTarget; if (rt && el.contains(rt) && /^(INPUT|TEXTAREA|SELECT)$/.test(rt.tagName)) return; setTimeout(function () { if (late && !pressing) draw(); }, 0); });
    el.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('[data-sh]'); if (!b) return;
      var d = host.get(), k = b.dataset.sh;
      if (k === 'close') { if (host.close) host.close(); return; }
      if (!d) return; d = effective(d);
      if (k === 'gmRoll' && d.live && d.gm && host.roll && R.STATS.indexOf(b.dataset.stat) >= 0) { host.roll(b.dataset.stat, el.querySelector('#shGmAdj').value, el.querySelector('#shGmD20').value); }
      else if (k === 'score') attempt({ op: 'score', stat: b.dataset.k, delta: +b.dataset.d });
      else if (k === 'effort') attempt({ op: 'effort', cat: b.dataset.k, delta: +b.dataset.d });
      else if (k === 'add') { var sel = el.querySelector('#shAdd'); if (sel) attempt({ op: 'add', id: sel.value }); }
      else if (k === 'remove') attempt({ op: 'remove', index: +b.dataset.i, gearKey: b.dataset.gear || undefined });
      else if (k === 'move') attempt({ op: 'move', index: +b.dataset.i, gearKey: b.dataset.gear || undefined, eq: b.dataset.eq === '1' });
      else if (k === 'hp' && d.canHp && host.hp) { host.hp(+b.dataset.d); }
      else if ((k === 'use' || k === 'quickUse') && host.use && d.canEdit) {
        var useIndex = b.dataset.gear ? d.hero.gear.findIndex(function (g) { return g.key === b.dataset.gear; }) : +b.dataset.i;
        var u = C.useOf(d.hero, useIndex, b.dataset.spell || '', b.dataset.mode || '');
        if (!u.ok) { msg = u.why; draw(true); return; }
        msg = ''; host.use(useIndex, b.dataset.spell || '', function (ok, why) { if (!ok) { msg = why || 'That could not be done. Try again.'; draw(true); } }, b.dataset.gear || undefined, b.dataset.mode || '');
      }
    });
    el.addEventListener('change', function (e) {
      if (e.target.id === 'shAdd') { pick = e.target.value; return; }
      var t = e.target.closest && e.target.closest('[data-text]'); if (!t) return;
      var d = host.get(); if (!d) return; d = effective(d);
      if (d.hero[t.dataset.text] === t.value) return;
      attempt({ op: 'text', field: t.dataset.text, value: t.value });
    });
    return { draw: draw, say: function (m) { msg = m; draw(true); } };
  }

  root.SacramentSheet = { mount: mount, render: render, hearts: hearts };
})(typeof window !== 'undefined' ? window : globalThis);
