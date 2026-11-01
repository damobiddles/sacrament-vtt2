/* Filters the public loot page as you type: catalogue entries and roll-table rows. */
(function () {
  'use strict';
  var box = document.getElementById('loot-search');
  var input = document.getElementById('loot-search-box');
  var count = document.getElementById('loot-search-count');
  if (!box || !input || !count) return;
  var fold = function (s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); };
  var entries = Array.prototype.slice.call(document.querySelectorAll('section[id^="loot-"] .loot-entry'));
  var rows = Array.prototype.slice.call(document.querySelectorAll('.loot-rolls tbody tr'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('section[id^="table-"], section[id^="loot-"]:not(#loot-roller)'));
  var text = new Map();
  entries.forEach(function (el) { text.set(el, fold(el.textContent)); });
  rows.forEach(function (row) {
    var link = row.querySelector('a[href^="#item-"]');
    var item = link && document.getElementById(link.getAttribute('href').slice(1));
    // A row matches on its own words or on everything its item says (theme, spells, effects).
    text.set(row, fold(row.textContent + ' ' + (item ? item.textContent : '')));
  });
  var timer = 0;
  function apply() {
    var words = fold(input.value).trim().split(/\s+/).filter(Boolean);
    var shown = 0;
    var match = function (el) {
      var t = text.get(el);
      var ok = words.every(function (w) { return t.indexOf(w) !== -1; });
      el.hidden = !ok;
      return ok;
    };
    entries.forEach(function (el) { if (match(el)) shown++; });
    rows.forEach(match);
    sections.forEach(function (s) { s.hidden = !s.querySelector('.loot-entry:not([hidden]), tbody tr:not([hidden])'); });
    if (!words.length) count.textContent = '';
    else if (!shown && !rows.some(function (r) { return !r.hidden; })) count.textContent = 'No loot matches “' + input.value.trim() + '”.';
    else count.textContent = shown + ' of ' + entries.length + ' items match.';
  }
  box.hidden = false;
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(apply, 120); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape' && input.value) { input.value = ''; apply(); } });
  // Following a link to something the search has hidden clears the search, so the link always lands.
  window.addEventListener('hashchange', function () {
    var target = location.hash && document.getElementById(location.hash.slice(1));
    if (target && (target.closest('[hidden]') || target.hidden) && input.value) { input.value = ''; apply(); target.scrollIntoView(); }
  });
  if (input.value) apply();
})();
