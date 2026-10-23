/* What an item or a spell does beyond its roll and its Effort die, written as data. This is the same idea as the effects layer of the earlier rules
   (hooks, effects, a sanitiser that keeps only what it knows), with a vocabulary that fits Hearts. An item's numbers (slots, roll, Effort, Horror,
   Defence, uses) stay plain fields; `fx` holds the rest, so a new relic or spell is a new row of data and no new code.
   An effect is { on: 'use' | 'always', do: effect, ...parameters, target? }.  Usage:  HeartsFx.clean(list), HeartsFx.say(effect), HeartsFx.one(effect) */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;

  var HOOKS = { use: 'when it is used (and its roll succeeds)', always: 'all the time it is carried' };
  /* Who it lands on. self: the user; ally: one hero the user chooses; foe: one foe; foes: every foe in the scene. */
  var TARGETS = { self: 'yourself', target: 'yourself or any target', ally: 'an ally', foe: 'a foe', foes: 'every foe' };
  var UNTIL = { turn: 'until their next turn', round: 'until the end of the next round', scene: 'until the end of the scene' };
  var TO = { defence: 'Defence', check: 'the next check', effort: 'Effort', guard: 'the Guard action' };
  var EFFECTS = {
    heal: { label: 'Heal', p: { dice: 'dice', kind: ['mend', 'bone', 'bandage'], force: 'bool' } },
    status: { label: 'Tag a foe', p: { tag: 'text', until: ['turn', 'round', 'scene'] } },
    buff: { label: 'Bonus', p: { to: ['defence', 'check', 'effort', 'guard'], n: 'int', step: 'int', until: ['turn', 'round', 'scene'], vs: ['unholy'] } },
    harm: { label: 'Cost: harm', p: { dice: 'dice' } },
    tend: { label: 'Tend', p: {} },
    note: { label: 'Note', p: { text: 'text' } }
  };
  var COMMON = { target: Object.keys(TARGETS) };
  var MAXFX = 6, DICE = /^[1-2]?d(4|6|8|10|12)$/;

  function val(type, v) {
    if (type === 'bool') return v === true ? true : undefined;
    if (type === 'int') { v = parseInt(v, 10); return isFinite(v) ? Math.max(-9, Math.min(9, v)) : undefined; }
    if (type === 'dice') { v = String(v == null ? '' : v).replace(/\s+/g, ''); return DICE.test(v) ? v : undefined; }
    if (type === 'text') { v = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 120); return v || undefined; }
    if (Array.isArray(type)) return type.indexOf(v) >= 0 ? v : undefined;
    return undefined;
  }
  var NEEDS = { heal: ['dice'], status: ['tag'], buff: ['to'], harm: ['dice'], note: ['text'] };
  function complete(e) {
    var n = NEEDS[e.do] || [];
    if (!n.every(function (k) { return e[k] !== undefined; })) return false;
    return !(e.do === 'buff' && e.n === undefined && e.step === undefined);
  }
  function one(x) {
    if (!x || typeof x !== 'object' || !Object.prototype.hasOwnProperty.call(HOOKS, x.on) || !Object.prototype.hasOwnProperty.call(EFFECTS, x.do)) return null;
    var out = { on: x.on, do: x.do }, spec = EFFECTS[x.do].p;
    Object.keys(spec).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(x, k)) { var v = val(spec[k], x[k]); if (v !== undefined) out[k] = v; } });
    Object.keys(COMMON).forEach(function (k) { if (Object.prototype.hasOwnProperty.call(x, k)) { var v = val(COMMON[k], x[k]); if (v !== undefined) out[k] = v; } });
    return complete(out) ? out : null;
  }
  function clean(list) {
    if (!Array.isArray(list)) return [];
    var out = [];
    for (var i = 0; i < list.length && out.length < MAXFX; i++) { var e = one(list[i]); if (e) out.push(e); }
    return out;
  }
  function say(e) {
    var s;
    switch (e.do) {
      case 'heal': s = 'heals ' + e.dice + (e.kind ? ' (once per person per rest)' : ''); break;
      case 'status': s = 'leaves ' + (TARGETS[e.target || 'foe']) + ' ' + e.tag + (e.until ? ', ' + UNTIL[e.until] : ''); break;
      case 'buff': s = (e.n ? (e.n > 0 ? '+' : '') + e.n : e.step > 0 ? 'Effort up ' + e.step + ' size' : 'Effort down ' + -e.step + ' size') + ' to ' + TO[e.to] + (e.vs ? ' against the ' + e.vs : '') + (e.until ? ', ' + UNTIL[e.until] : ''); break;
      case 'harm': s = 'costs ' + e.dice + ' harm that nothing reduces'; break;
      case 'tend': s = 'tends a dying hero'; break;
      default: s = e.text || '';
    }
    return (e.on === 'always' ? 'Carried: ' : 'On use: ') + s + (e.target && e.do !== 'status' ? ' (' + TARGETS[e.target] + ')' : '');
  }
  root.HeartsFx = { HOOKS: HOOKS, EFFECTS: EFFECTS, TARGETS: TARGETS, UNTIL: UNTIL, MAXFX: MAXFX, clean: clean, one: one, say: say };
})();
