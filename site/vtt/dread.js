/* Sacrament RPG: the Horror you can feel (the owner's go-ahead, 2026-11-11). As the meter climbs, the picture darkens at its edges, like candles guttering,
   and once the Horror has arrived the light dies now and then. Shared by the solo game and the table. Pure presentation: it reads the meter, never changes a rule. */
(function (root) {
  'use strict';
  var STEPS = [7, 14, 21];
  function veil(frame) {
    var v = frame.querySelector(':scope > .dread-veil');
    if (!v) { v = document.createElement('div'); v.className = 'dread-veil'; v.setAttribute('aria-hidden', 'true'); frame.appendChild(v); }
    return v;
  }
  /* How deep the dark is, from 0 to 1, and how many thresholds the meter has reached (0 to 3). */
  function level(horror, max) { max = max || 21; var h = Math.max(0, Math.min(max, Number(horror) || 0)); return { depth: h / max, step: STEPS.filter(function (n) { return h >= n * max / 21; }).length }; }
  function set(frame, horror, max) {
    if (!frame) return null; veil(frame);
    var l = level(horror, max);
    frame.style.setProperty('--dread', l.depth.toFixed(3)); frame.dataset.dreadStep = String(l.step);
    return l;
  }
  /* A threshold passed: the candles gutter once. */
  function gutter(frame) {
    if (!frame) return; var v = veil(frame);
    v.classList.remove('gutter'); void v.offsetWidth; v.classList.add('gutter');
    setTimeout(function () { v.classList.remove('gutter'); }, 1600);
  }
  root.SacramentDread = { set: set, gutter: gutter, level: level };
})(typeof window !== 'undefined' ? window : globalThis);
