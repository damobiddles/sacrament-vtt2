/* Keyboard behaviour shared by the table's two dialogs. */
(function (root) {
  'use strict';
  var active = null, previous = null;
  function controls(el) {
    return Array.from(el.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')).filter(function (x) { return x.getClientRects().length; });
  }
  function recoveryOpen() { var el = document.getElementById('recoveryWarning'); return el && !el.hidden; }
  function open(el, from) {
    active = el;
    previous = from ? { node: from, id: from.id, tag: from.tagName, data: Object.assign({}, from.dataset) } : null;
    document.getElementById('app').inert = true;
  }
  function close(el) {
    if (active !== el) return;
    var old = previous; active = null; previous = null; document.getElementById('app').inert = false;
    setTimeout(function () {
      if (active || !old) return;
      var target = document.contains(old.node) ? old.node : old.id ? document.getElementById(old.id) : null;
      if (!target && old.data.do) target = Array.from(document.querySelectorAll('[data-do]')).find(function (x) {
        return x instanceof HTMLElement && x.tagName === old.tag && x.getClientRects().length && Object.keys(old.data).every(function (k) { return x.dataset[k] === old.data[k]; });
      });
      if (target) target.focus({ preventScroll: true });
    }, 0);
  }
  document.addEventListener('keydown', function (e) {
    if (!active || active.hidden || e.key !== 'Tab' || recoveryOpen()) return;
    var list = controls(active), first = list[0], last = list[list.length - 1], focused = document.activeElement;
    if (!first) { e.preventDefault(); active.tabIndex = -1; active.focus(); return; }
    if (!active.contains(focused) || (e.shiftKey ? focused === first : focused === last)) {
      e.preventDefault(); (e.shiftKey ? last : first).focus();
    }
  }, true);
  document.addEventListener('focusin', function (e) {
    if (active && !active.hidden && !active.contains(e.target) && !recoveryOpen()) { var first = controls(active)[0]; if (first) first.focus(); }
  });
  root.SacramentDialogs = { open: open, close: close, reset: function () { active = null; previous = null; document.getElementById('app').inert = false; } };
})(window);
