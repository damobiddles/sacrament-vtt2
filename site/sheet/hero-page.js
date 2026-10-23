/* The character generator and backup review only work with this browser's heroes. */
(function () {
  'use strict';
  var U = window.HeroesPage, T = window.SacramentHeroTools, H = U.H, C = U.C, S = U.S;
  var $ = function (id) { return document.getElementById(id); }, esc = U.esc;
  var proposal = null, restorePlan = null, fileSeq = 0;
  function showProposal() {
    var h = proposal;
    $('keepGenerated').hidden = !h;
    $('keepGenerated').disabled = !H.canAdd(S) || S.readOnly;
    if (!h) { $('generatorPreview').replaceChildren(); return; }
    var eq = C.slotsUsed(h, 'eq'), pack = C.slotsUsed(h, 'pack');
    $('generatorPreview').innerHTML = '<article class="hero-preview"><h3>' + esc(h.name) + '</h3><p><b>' + esc(h.calling) + '</b></p><p><i>' + esc(h.vow) + '</i></p><p>' + Object.keys(h.stats).map(function (k) { return esc(k) + ' +' + h.stats[k]; }).join(' · ') + '</p><p>10 HP (1 Heart) · Defence ' + C.defence(h) + '</p><p>Effort: ' + Object.keys(h.effort).filter(function (k) { return h.effort[k]; }).map(function (k) { return esc(window.SacramentRules.CAT_NAMES[k]) + ' +' + h.effort[k]; }).join(' · ') + '</p><div class="hero-preview-grid"><div><h4>Equipped · ' + eq + '/10 slots</h4><ul>' + gear(h, true) + '</ul></div><div><h4>Pack · ' + pack + '/10 slots</h4><ul>' + gear(h, false) + '</ul></div></div></article>';
  }
  function gear(h, eq) { return h.gear.filter(function (g) { return g.eq === eq; }).map(function (g) { var it = C.itemOf(g); return '<li>' + esc(it.name) + ' · ' + it.slots + (it.slots === 1 ? ' slot' : ' slots') + '</li>'; }).join('') || '<li>Nothing yet.</li>'; }
  $('generateHero').onclick = function () {
    try { proposal = T.generate($('generatorFocus').value); showProposal(); $('generatorStatus').textContent = H.canAdd(S) ? 'A suggestion only. Keep this hero to save it, or generate another.' : 'Your hero library is full. You can preview suggestions; download a backup before removing a saved hero to make room.'; }
    catch { $('generatorStatus').textContent = 'The hero could not be generated. Your saved heroes have not changed.'; }
  };
  $('keepGenerated').onclick = function () {
    if (!proposal || !H.canAdd(S) || S.readOnly) return;
    var h = proposal; h.id = H.uid(); U.addHero(h); proposal = null; showProposal();
    $('generatorStatus').textContent = S.saveError ? S.saveError : h.name + ' is saved. Their sheet is below; you can change the name, vow, stats and equipment.';
  };
  $('restoreHeroesFile').onchange = async function () {
    var seq = ++fileSeq, file = this.files[0]; restorePlan = null;
    $('restoreHeroes').hidden = true; $('restorePreview').replaceChildren(); $('cancelRestore').hidden = !file;
    if (!file) { $('restoreStatus').textContent = ''; return; }
    if (file.size > T.MAX_BACKUP) { $('restoreStatus').textContent = 'Choose a heroes backup smaller than 2 MB. Nothing has been changed.'; return; }
    $('restoreStatus').textContent = 'Reading your backup…';
    try {
      var text = await file.text(); if (seq !== fileSeq) return;
      restorePlan = T.planRestore(S, text);
      if (!restorePlan.ok) { $('restoreStatus').textContent = restorePlan.message; return; }
      $('restorePreview').innerHTML = '<p><b>' + restorePlan.heroes.length + ' to add · ' + restorePlan.skipped + ' already here</b></p><ul>' + restorePlan.rows.map(function (row) { return '<li><b>' + esc(row.name) + '</b> · ' + esc(row.status) + '</li>'; }).join('') + '</ul>';
      $('restoreHeroes').hidden = false;
      $('restoreStatus').textContent = 'Review the heroes above, then press Restore backup. Your existing heroes will be kept.';
    } catch { if (seq === fileSeq) $('restoreStatus').textContent = 'This file could not be read. Nothing has been changed.'; }
  };
  $('restoreHeroes').onclick = function () {
    var result = T.restore(S, restorePlan);
    if (!result.ok) { $('restoreStatus').textContent = result.message; return; }
    restorePlan = null; $('restorePreview').replaceChildren(); $('restoreHeroes').hidden = true; $('cancelRestore').hidden = true; $('restoreHeroesFile').value = '';
    U.refresh(); showProposal();
    $('restoreStatus').textContent = 'Restored ' + result.count + (result.count === 1 ? ' hero' : ' heroes') + '. ' + result.skipped + ' already here. Your existing heroes were kept.';
  };
  $('cancelRestore').onclick = function () { ++fileSeq; restorePlan = null; $('restoreHeroesFile').value = ''; $('restorePreview').replaceChildren(); $('restoreHeroes').hidden = true; this.hidden = true; $('restoreStatus').textContent = 'Restore cancelled. Your heroes have not changed.'; };
})();
