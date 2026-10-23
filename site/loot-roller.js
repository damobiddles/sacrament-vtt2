/* A public, stateless preview of the same loot rolls used by the table. */
(function () {
  'use strict';
  var box = document.getElementById('loot-roller');
  var core = window.SacramentSheetCore;
  if (!box || !core) return;
  var button = box.querySelector('button');
  var result = document.getElementById('loot-result');
  box.hidden = false;
  button.addEventListener('click', function () {
    var roll = core.rollLoot(function (sides) { return Math.floor(Math.random() * sides) + 1; });
    result.replaceChildren();
    if (!roll.ok) { result.textContent = 'Could not roll loot. Please reload the page and try again.'; return; }
    var source = document.getElementById('item-' + roll.item.id);
    if (!source) { result.textContent = 'Could not find this item. Please reload the page and try again.'; return; }
    var numbers = document.createElement('p');
    numbers.className = 'small';
    numbers.textContent = 'You rolled ' + core.sayLoot(roll.steps) + '.';
    var item = source.cloneNode(true);
    item.removeAttribute('id');
    item.className = 'loot-result-item';
    var link = document.createElement('a');
    link.href = '#item-' + roll.item.id;
    link.textContent = 'View in the catalogue';
    result.append(numbers, item, link);
  });
})();
