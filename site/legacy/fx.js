/* The effects vocabulary: what an ability, spell or item does, written as data.
   An effect is { on: hook, do: effect, ...parameters, target?, limit?, cond? } and a card carries a list of them in `fx`.
   The card's rules text stays as it is; fx is what the game can act on, and a card with no fx works exactly as before.
   This one file is used by the character builder, the VTT, the node builder and the publish function, so what is allowed is defined once.
   Usage:  SacFx.clean(list) -> the valid effects only;  SacFx.say(effect) -> a plain sentence;  SacFx.tier(list) -> 'A', 'B' or 'C'. */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;

  /* The moments an effect can attach to. */
  var HOOKS = {
    use: 'when it is used (its own Action or reaction)',
    attack: 'when the holder makes an attack',
    hit: 'when an attack of the holder hits',
    damage: 'when damage dice are rolled',
    incoming: 'when a hit is about to land on the holder or an ally (armour is rolled here)',
    harm: 'when harm is about to be applied',
    check: 'when someone rolls a check',
    cast: 'when a spell is cast',
    durability: 'when armour would lose durability',
    enemyMove: 'when an enemy moves into reach',
    always: 'all the time (a standing bonus)'
  };

  /* Who is affected. The first group needs no choice; the rest need the table to pick who. */
  var TARGETS = {
    self: 'yourself', caster: 'its caster',
    ally: 'one ally in sight', allyAdj: 'you or an adjacent ally', selfAlly: 'you and one ally in sight', enemy: 'one adversary',
    alliesNear: 'allies Near', alliesEarshot: 'allies in earshot', alliesSight: 'allies in sight', everyone: 'everyone in sight',
    enemiesMelee: 'every enemy in Melee', enemiesEarshot: 'every enemy in earshot', enemiesSight: 'every enemy in sight', line: 'creatures in a line', burst: 'creatures in a burst'
  };
  var PICK = { self: 0, caster: 0, ally: 0, allyAdj: 0, selfAlly: 0, enemy: 0 }; // these need one pick at most, not a group
  /* How often, or how long. */
  var LIMITS = {
    reaction: 'as your reaction', round: 'once a round', fight: 'once a fight', longRest: 'once a long rest',
    nextHit: 'for the next hit', nextAttack: 'for the next attack', nextCheck: 'for the next check', nextTurn: 'until your next turn', oneRound: 'for a round', minute: 'for a minute'
  };
  var SCORES = ['Body', 'Mind', 'Spirit'];

  /* Parameter types: 'dice' (1d6, +2d6, weapon), 'int', 'bool', 'text', or a list of allowed words. */
  var TO = ['attack', 'check', 'damage', 'armour', 'any'];
  var EFFECTS = {
    attack: { label: 'Attack', say: 'make an attack', p: { kind: ['weapon', 'spell'], repeat: 'int', free: 'bool', auto: 'bool' } },
    damage: { label: 'Damage', say: 'deal damage', p: { dice: 'dice', ignoresArmour: 'bool', double: 'bool', allies: ['half', 'full'] } },
    bonus: { label: 'Bonus', say: 'add a bonus', p: { to: TO, dice: 'dice', n: 'int', stat: SCORES, per: ['step', 'Strike'] } },
    armour: { label: 'Armour', say: 'change armour dice', p: { change: ['more', 'halve', 'strip'], dice: 'dice' } },
    mitigate: { label: 'Reduce harm', say: 'reduce harm', p: { absorb: 'dice', reduce: 'dice', halve: 'bool', ignore: 'bool', cap: 'int' } },
    redirect: { label: 'Redirect', say: 'send it elsewhere', p: { from: ['ally', 'self'], to: ['self', 'caster'], what: ['hit', 'spell'] } },
    selfHarm: { label: 'Cost: harm', say: 'take harm as the cost', p: { n: 'int', per: ['Strike'] } },
    heal: { label: 'Heal', say: 'heal Wounds', p: { wounds: 'int', byLevel: 'bool', clears: 'bool' } },
    status: { label: 'Status', say: 'put a tag on a creature', p: { tag: 'text' } },
    reroll: { label: 'Reroll', say: 'allow a roll to be rolled again', p: {} },
    looming: { label: 'Looming', say: 'change what the Looming Horror costs', p: { freePush: 'bool', discount: 'int', extra: 'int' } },
    durability: { label: 'Durability', say: 'change armour durability', p: { save: 'int', noLoss: 'bool', repair: 'bool', extra: 'int' } },
    revive: { label: 'Revive', say: 'bring back a fallen ally', p: { harm: 'int' } },
    score: { label: 'Score', say: 'a standing bonus', p: { stat: SCORES, n: 'int', cap: 'int' } },
    check: { label: 'Check', say: 'roll against their difficulties', p: { score: SCORES } },
    note: { label: 'Note', say: 'story only', p: { text: 'text' } }
  };
  var COMMON = { target: Object.keys(TARGETS), limit: Object.keys(LIMITS), cond: 'text', note: 'text' };
  var MAXFX = 8;

  var DICE = /^\+?(\d{1,2}d6|weapon)$/;
  function val(type, v) {
    if (type === 'bool') return v === true ? true : undefined;
    if (type === 'int') { v = parseInt(v, 10); return isFinite(v) ? Math.max(-99, Math.min(99, v)) : undefined; }
    if (type === 'dice') { v = String(v == null ? '' : v).replace(/\s+/g, ''); return DICE.test(v) ? v : undefined; }
    if (type === 'text') { v = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 80); return v || undefined; }
    if (Array.isArray(type)) return type.indexOf(v) >= 0 ? v : undefined;
    return undefined;
  }

  /* An effect that names nothing to do is dropped: damage needs dice, a status needs a tag, and so on. */
  var NEEDS = {
    damage: ['dice|double'], bonus: ['to'], armour: ['change'], selfHarm: ['n'], status: ['tag'], revive: ['harm'], check: ['score'], note: ['text'],
    mitigate: ['absorb|reduce|halve|ignore|cap'], heal: ['wounds|byLevel|clears'], looming: ['freePush|discount|extra'], durability: ['save|noLoss|repair|extra'], score: ['stat|cap']
  };
  function complete(e) {
    var n = NEEDS[e.do] || [];
    if (!n.every(function (any) { return any.split('|').some(function (k) { return e[k] !== undefined; }); })) return false;
    return !(e.do === 'bonus' && e.dice === undefined && e.n === undefined);
  }

  /* One effect, cleaned: unknown words are dropped, a bad hook or effect drops the whole line. Returns null if nothing usable is left. */
  function one(x) {
    if (!x || typeof x !== 'object' || !HOOKS.hasOwnProperty(x.on) || !EFFECTS.hasOwnProperty(x.do)) return null;
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

  /* A plain sentence for an effect, for the node builder and for tooltips. */
  function say(e) {
    var s = [], p = function (k) { return e[k]; };
    switch (e.do) {
      case 'attack': s.push((e.free ? 'a free ' : '') + (e.auto ? 'automatic ' : '') + (e.kind === 'spell' ? 'spell' : 'weapon') + ' attack' + (e.repeat > 1 ? ' ×' + e.repeat : '')); break;
      case 'damage': s.push((e.dice === 'weapon' ? 'weapon damage' : (e.dice || '?') + ' damage') + (e.ignoresArmour ? ', ignoring armour' : '') + (e.double ? ', doubled' : '') + (e.allies ? ', ' + e.allies + ' to allies' : '')); break;
      case 'bonus': s.push('add ' + (e.dice || (e.n > 0 ? '+' + e.n : e.n) || '?') + (e.per ? ' per ' + e.per : '') + ' to ' + (e.to || 'a roll') + (e.stat ? ' (' + e.stat + ')' : '')); break;
      case 'armour': s.push({ more: 'more armour dice', halve: 'halve armour', strip: 'strip armour' }[e.change] || 'change armour'); if (e.dice) s.push(e.dice); break;
      case 'mitigate': s.push(e.absorb ? 'absorb ' + e.absorb : e.reduce ? 'reduce by ' + e.reduce : e.halve ? 'halve it' : e.ignore ? 'ignore it' : e.cap ? 'cap harm at ' + e.cap : 'reduce harm'); break;
      case 'redirect': s.push('send ' + (e.what === 'spell' ? 'a spell' : 'the hit') + (e.from === 'ally' ? ' from an ally' : '') + ' to ' + (e.to === 'caster' ? 'its caster' : 'you')); break;
      case 'selfHarm': s.push('take ' + (e.n || 1) + ' Wound' + ((e.n || 1) > 1 ? 's' : '') + (e.per ? ' per ' + e.per : '')); break;
      case 'heal': s.push('heal ' + (e.byLevel ? 'Wounds equal to level' : (e.wounds || 0) + ' Wound' + (e.wounds === 1 ? '' : 's')) + (e.clears ? ' and clear a condition' : '')); break;
      case 'status': s.push('tag: ' + (e.tag || '?')); break;
      case 'reroll': s.push('reroll'); break;
      case 'looming': s.push(e.freePush ? 'push for free' : e.discount ? 'Looming −' + e.discount : e.extra ? 'up to +' + e.extra + ' Looming' : 'changes the Looming cost'); break;
      case 'durability': s.push(e.save ? 'keeps its durability on a ' + e.save + '+' : e.noLoss ? 'no durability loss' : e.repair ? 'repair' : e.extra ? '+' + e.extra + ' durability' : 'durability'); break;
      case 'revive': s.push('revive with ' + (e.harm || 0) + ' harm'); break;
      case 'score': s.push(e.cap ? '+' + e.cap + ' pack space' : (e.n > 0 ? '+' : '') + (e.n || 0) + ' ' + (e.stat || 'score')); break;
      case 'check': s.push('roll ' + (e.score || 'a score') + ' against each'); break;
      default: s.push(e.text || '');
    }
    if (e.target) s.push('on ' + TARGETS[e.target]);
    if (e.limit) s.push(LIMITS[e.limit]);
    if (e.cond) s.push('if ' + e.cond);
    return HOOKS[e.on].replace(/^when /, 'When ').replace(/^all the time.*/, 'Always') + ': ' + s.join(', ');
  }

  /* How much of a card the table can act on by itself.
     A: nothing to choose, so it can be applied automatically.
     B: someone at the table has to choose or judge first: a group to pick (allies in earshot, a burst), an ally to protect, a roll to allow again, an enemy's move, or a written condition.
     C: only story, so it stays text and the GM judges it. */
  function tier(list) {
    var fx = clean(list).filter(function (e) { return e.do !== 'note'; });
    if (!fx.length) return 'C';
    return fx.some(function (e) { return (e.target && !(e.target in PICK)) || e.cond || e.do === 'reroll' || e.on === 'enemyMove' || (e.do === 'redirect' && e.from === 'ally'); }) ? 'B' : 'A';
  }

  root.SacFx = { HOOKS: HOOKS, EFFECTS: EFFECTS, TARGETS: TARGETS, LIMITS: LIMITS, COMMON: COMMON, MAXFX: MAXFX, clean: clean, one: one, say: say, tier: tier };
})();
