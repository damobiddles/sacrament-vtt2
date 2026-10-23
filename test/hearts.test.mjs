import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from '../scripts/hearts/sim.mjs';

// The Hearts prototype (site/hearts): the rules engine and the data it plays. These test that the code does what the draft rules say;
// they say nothing about whether the rules are balanced or fun.
const mk = (seed = 7) => load(seed);
const hero = (env, id) => env.E.newCharacter(env.D.CHARACTERS.find((c) => c.id === id));
const J = (x) => JSON.parse(JSON.stringify(x));

test('a check: natural 1 always fails, natural 20 always succeeds and is a critical, the modifier is capped at +10', () => {
  const { E } = mk();
  assert.equal(E.check(5, 5, 1).success, false); assert.equal(E.check(5, 5, 1).fumble, true);
  const c = E.check(-5, 19, 20); assert.equal(c.success, true); assert.equal(c.crit, true);
  assert.equal(E.modifier(4, 3), 7); assert.equal(E.modifier(8, 5), 10); assert.equal(E.modifier(0, 0), 0); assert.equal(E.modifier(-1, 1), 0);
  assert.equal(E.check(2, 12, 10).success, true); assert.equal(E.check(2, 12, 9).success, false);
});
test('the Target Number moves by exactly 3 for easy or hard and stays between 5 and 19', () => {
  const { E } = mk();
  assert.equal(E.tn(12), 12); assert.equal(E.tn(12, 'easy'), 9); assert.equal(E.tn(12, 'hard'), 15);
  assert.equal(E.tn(5, 'easy'), 5); assert.equal(E.tn(19, 'hard'), 19); assert.equal(E.tn(16, 'hard'), 19);
});
test('success chances are never certain and never hopeless', () => {
  const { E } = mk();
  assert.equal(E.chance(5, 5), 0.95); assert.equal(E.chance(-3, 19), 0.05);
  for (const mod of [0, 1, 2, 3, 4, 5]) for (const tn of [9, 10, 12, 14, 16, 19]) { const p = E.chance(mod, tn); assert.ok(p >= 0.05 && p <= 0.95); }
});
test('the Effort dice run d4 to d12; a critical adds an ultimate d12', () => {
  const { E, D } = mk();
  assert.deepEqual(J(D.DICE), [4, 6, 8, 10, 12]);
  assert.equal(E.stepUp(12), 12); assert.equal(E.stepUp(6), 8); assert.equal(E.stepDown(4), 4); assert.equal(E.stepDown(8), 6);
  for (let i = 0; i < 200; i++) { const a = E.effort(8, false), b = E.effort(8, true); assert.equal(a.rolls.length, 1); assert.equal(b.rolls.length, 2); assert.ok(a.total >= 1 && a.total <= 8 && b.total >= 2 && b.total <= 20); }
});
test('armoured foes slow plain weapons, but not heavy ones, relics or spells', () => {
  const { E } = mk(), sexton = E.enemy('sexton');
  assert.equal(E.effortAgainst(6, sexton, 'weapon'), 4); assert.equal(E.effortAgainst(8, sexton, 'weapon'), 8);
  assert.equal(E.effortAgainst(6, sexton, 'spell'), 6); assert.equal(E.effortAgainst(6, E.enemy('rats'), 'weapon'), 6);
});

test('ten slots: every item has a slot size, the four ready characters fit, and nothing past ten can be added', () => {
  const env = mk(), { E, D } = env;
  for (const it of D.ITEMS) assert.ok(it.slots >= 1 && it.slots <= 3, it.id);
  for (const def of D.CHARACTERS) {
    const c = hero(env, def.id); assert.ok(E.slotsUsed(c) <= 10, def.name); assert.ok(E.startingKitOk(c), def.name + ' keeps to three relics and grimoires'); assert.equal(c.pack.length, def.kit.length, def.name + ' kit fits'); assert.ok(E.validSpread(def.scores), def.name + ' spread');
  }
  const c = hero(env, 'aldric'); assert.equal(E.slotsUsed(c), 7); assert.equal(E.slotsUsed(c, 'eq') + E.slotsUsed(c, 'carry'), 7);
  assert.equal(E.addItem(c, 'harness'), true); assert.equal(E.slotsUsed(c, 'eq'), 8, 'armour is equipped');
  assert.equal(E.addItem(c, 'crossbow'), true); assert.equal(E.slotsUsed(c, 'eq'), 10); assert.equal(E.addItem(c, 'sword'), true, 'a spare goes to the pack when the equipped slots are full'); assert.equal(c.pack[c.pack.length - 1].eq, false);
  while (E.addItem(c, 'bandages')); assert.ok(E.slotsUsed(c, 'eq') <= 10 && E.slotsUsed(c, 'carry') <= 10 && E.slotsUsed(c, 'carry') >= 9, 'ten and ten at most'); assert.equal(E.addItem(c, 'lantern'), false, 'no room anywhere');
  const d = hero(env, 'wren'); assert.equal(E.slotsUsed(d), 8); assert.equal(E.slotsUsed(d, 'eq'), 3); assert.equal(E.slotsUsed(d, 'carry'), 5);
});
test('only equipped gear works: armour, Guard bonuses and weapons are ignored in the pack; supplies work from either set; moving needs room', () => {
  const env = mk(), { E } = env, c = hero(env, 'aldric'), i = c.pack.findIndex((p) => p.id === 'brigandine');
  const before = E.armour(c); assert.ok(before >= 3); assert.equal(E.setEq(c, i, false), true); assert.equal(E.armour(c), before - 3, 'armour in the pack does nothing');
  E.addItem(c, 'bandages'); assert.equal(E.has(c, 'bandages'), true, 'a supply in the pack is to hand');
  const r = E.use({ horror: E.horror(), scene: 12 }, c, 'billhook', '', { d20: 20 }); assert.equal(r.ok, true);
  const k = c.pack.findIndex((p) => p.id === 'billhook'); E.setEq(c, k, false); const r2 = E.use({ horror: E.horror(), scene: 12 }, c, 'billhook', '', { d20: 20 }); assert.equal(r2.ok, false); assert.match(r2.why, /Equip it first/);
  assert.equal(E.setEq(c, i, true), true); assert.equal(E.armour(c), before);
  const full = hero(env, 'ottoline'); while (E.addItem(full, 'sword')); const spare = full.pack.findIndex((p) => !E.isEq(p)); assert.ok(spare >= 0); assert.equal(E.setEq(full, spare, true), false, 'the equipped set is full');
});
test('every item and spell says what it costs, rolls and does', () => {
  const { D, E } = mk();
  for (const it of D.ITEMS) {
    assert.ok(it.does && it.does.length > 20, it.id + ' has a description'); assert.ok(['Action', 'Move', 'Free', 'Always'].includes(it.use), it.id + ' use');
    if (it.kind === 'relic' || it.kind === 'grimoire') assert.ok(it.horror >= 1, it.id + ' costs Horror');
    if (it.kind === 'weapon') assert.ok(D.DICE.includes(it.effort), it.id + ' Effort');
    if (it.effort) assert.ok(D.DICE.includes(it.effort), it.id + ' die');
    if (it.roll) assert.ok(E.SCORES.includes(it.roll), it.id + ' roll');
  }
  for (const sp of D.SPELLS) { assert.ok(E.item(sp.from), sp.id + ' book'); assert.ok(E.item(sp.from).spells.includes(sp.id)); assert.equal(sp.horror, sp.heal ? 0 : 1); }
});
test('the armour bonus is CON only and never more than +5', () => {
  const env = mk(), { E } = env, c = hero(env, 'aldric');
  assert.equal(E.armour(c), 4); assert.equal(E.defence(c, 'CON'), 2 + 4); assert.equal(E.defence(c, 'WIS'), 1);
  c.pack.push({ id: 'harness' }); assert.equal(E.armour(c), 5, 'armour and shield cap at +5'); assert.equal(E.defence(c, 'CON'), 7, 'Defence is not held to the +5 of a check');
  c.guard = 9; assert.equal(E.defence(c, 'CON'), 10, 'and never passes +10 in all');
});
test('a foe attacks with a d20 against 10 + Defence; the scene adds to its roll, Dazed takes 3 off; 20 always hits, 1 always misses', () => {
  const env = mk(), { E } = env, c = hero(env, 'aldric'); const def = E.defence(c, 'CON');
  assert.equal(E.foeBonus(10), 0); assert.equal(E.foeBonus(12), 1); assert.equal(E.foeBonus(14), 3); assert.equal(E.foeBonus(16), 5); assert.equal(E.foeBonus(12, true), -2);
  const need = 10 + def; const hit = (d, scene, dz) => E.foeAttack(c, 'CON', scene, { d20: d, dazed: dz }).hit;
  assert.equal(E.foeAttack(c, 'CON', 12, { d20: 10 }).need, need);
  assert.equal(hit(need - 1, 12), true, 'the scene bonus of +1 makes up one point'); assert.equal(hit(need - 2, 12), false);
  assert.equal(hit(need - 1, 12, true), false, 'Dazed: 3 less'); assert.equal(hit(20, 10, true), true, 'a 20 always hits'); assert.equal(hit(1, 16), false, 'a 1 always misses');
  const rolls = new Set(); for (let i = 0; i < 100; i++) rolls.add(E.foeAttack(c, 'CON', 12).d); assert.ok(rolls.size > 5, 'it rolls a real d20');
});

test('falling: 0 points is dying with a d4 countdown; the end of each round takes one off; 0 is dead', () => {
  const env = mk(), { E } = env, c = hero(env, 'wren'); const r = E.hurt(c, 99);
  assert.equal(r.fell, true); assert.ok(c.dying.count >= 1 && c.dying.count <= 4); assert.equal(c.hp, 0);
  const start = c.dying.count; for (let i = 1; i < start; i++) { assert.deepEqual(J(E.endRound([c])), []); assert.equal(c.dying.count, start - i); }
  assert.deepEqual(J(E.endRound([c])), [c.name]); assert.equal(c.dead, true);
});
test('a blow on a dying character takes a round off the countdown instead of rolling damage', () => {
  const env = mk(), { E } = env, c = hero(env, 'wren'); E.hurt(c, 99); c.dying.count = 3;
  assert.equal(E.hurt(c, 12).hitWhileDying, true); assert.equal(c.dying.count, 2);
  E.hurt(c, 1); E.hurt(c, 1); assert.equal(c.dead, true);
});
test('tending is a Mind check: success makes them stable and stops the countdown; a critical heals a little', () => {
  const env = mk(), { E } = env, c = hero(env, 'wren'); E.hurt(c, 99);
  assert.equal(E.tend(c, E.check(0, 12, 3)).ok, false); assert.ok(c.dying);
  const t = E.tend(c, E.check(0, 12, 15)); assert.equal(t.stable, true); assert.equal(c.dying, null); assert.equal(c.stable, true); assert.equal(c.hp, 0);
  assert.deepEqual(J(E.endRound([c])), [], 'a stable character does not count down');
  const d = hero(env, 'wren'); E.hurt(d, 99); const t2 = E.tend(d, E.check(0, 12, 20)); assert.ok(t2.healed >= 1 && d.hp >= 1 && !d.stable);
});
test('healing of 1 or more stands a downed character up; hurting a stable one makes them dying again; the scene wakes them with 1', () => {
  const env = mk(), { E } = env, c = hero(env, 'maren'); E.hurt(c, 99); E.heal(c, 4, true); assert.equal(c.hp, 4); assert.equal(c.dying, null);
  const s = hero(env, 'maren'); E.hurt(s, 99); E.tend(s, E.check(0, 12, 15)); const h = E.hurt(s, 3); assert.equal(h.hurtWhileStable, true); assert.ok(s.dying);
  const w = hero(env, 'maren'); E.hurt(w, 99); E.tend(w, E.check(0, 12, 15)); E.endScene([w]); assert.equal(w.hp, 1); assert.equal(w.stable, false);
});
test('each kind of healing works once per person per rest, except on someone who is down', () => {
  const env = mk(), { E } = env, c = hero(env, 'maren'); c.hp = 2;
  assert.equal(E.heal(c, 4, false, 'mend'), 4); assert.equal(E.heal(c, 4, false, 'mend'), 0, 'again: nothing'); assert.equal(E.heal(c, 3, false, 'bandage'), 3, 'a different kind still works');
  const d = hero(env, 'maren'); E.hurt(d, 99); assert.ok(E.heal(d, 3, false, 'mend') > 0); assert.equal(d.dying, null);
});

test('crossing one threshold fires it once, in order; nothing fires twice without falling below', () => {
  const { E } = mk(), h = E.horror();
  assert.deepEqual(J(E.raise(h, 8).crossed), []); assert.deepEqual(J(E.raise(h, 1).crossed), [9]); assert.deepEqual(J(E.raise(h, 1).crossed), []);
});
test('one increase that crosses several thresholds fires each in ascending order', () => {
  const { E } = mk(), h = E.horror(); E.raise(h, 8); assert.deepEqual(J(E.raise(h, 8).crossed), [9, 15]);
  const g = E.horror(); E.raise(g, 14); assert.deepEqual(J(E.raise(g, 7).crossed), [15, 21]);
});
test('a threshold re-arms when the track falls below it, and fires again when it is crossed again', () => {
  const { E } = mk(), h = E.horror(); E.raise(h, 10); E.lower(h, 2); assert.equal(h.pos, 8); assert.equal(h.armed[9], true);
  assert.deepEqual(J(E.raise(h, 1).crossed), [9]);
  const g = E.horror(); E.raise(g, 10); E.lower(g, 1); assert.equal(g.armed[9], false, 'still at or above 9: not re-armed'); assert.deepEqual(J(E.raise(g, 1).crossed), []);
});
test('at 21 the track stops, and every further point is paid as Strain: never free', () => {
  const { E } = mk(), h = E.horror(); E.raise(h, 19);
  const a = E.raise(h, 3); assert.equal(a.applied, 2); assert.equal(a.overflow, 1); assert.equal(a.strain, 2); assert.equal(h.pos, 21);
  const b = E.raise(h, 2); assert.equal(b.applied, 0); assert.equal(b.strain, 4); assert.deepEqual(J(b.crossed), []);
});
test('the track is only ever raised by what is paid: simultaneous sources add up in the order they happen', () => {
  const env = mk(), { E } = env, h = E.horror(); let total = 0, strain = 0, over = 0;
  for (let i = 0; i < 300; i++) { const n = 1 + (i * 7) % 3, r = E.raise(h, n); total += r.applied; over += r.overflow; strain += r.strain; if (i % 40 === 39) E.lower(h, 6); }
  assert.ok(h.pos >= 0 && h.pos <= 21); assert.equal(strain, over * 2);
  const a = E.horror(), b = E.horror(); [3, 1, 2, 3, 1].forEach((n) => E.raise(a, n)); [1, 3, 3, 2, 1].forEach((n) => E.raise(b, n)); assert.equal(a.pos, b.pos);
});
test('the Horror feeds: costs 1 more while it is on and the track is at 15 or higher, and stops when it falls below 15', () => {
  const { E } = mk(), h = E.horror(); E.raise(h, 15); E.aftershock(h, 15, 6); assert.equal(h.feeds, true);
  assert.equal(E.cost(h, 1), 2); assert.equal(E.cost(h, 0), 0, 'a free thing stays free'); E.lower(h, 2); assert.equal(h.feeds, false); assert.equal(E.cost(h, 1), 1);
});

test('using a spell: the cost is paid once, when the roll is made, whatever the result', () => {
  const env = mk(), { E } = env, h = E.horror(), c = hero(env, 'ottoline'), foe = { def: E.enemy('penitent'), hp: 10 };
  const miss = E.use({ horror: h, scene: 12 }, c, 'embers', 'ember', { target: foe, d20: 2 });
  assert.equal(miss.failed, true); assert.equal(h.pos, 1); assert.equal(foe.hp, 10);
  const hit = E.use({ horror: h, scene: 12 }, c, 'embers', 'ember', { target: foe, d20: 19 });
  assert.equal(hit.ok, true); assert.equal(h.pos, 2); assert.ok(foe.hp < 10);
});
test('a refused use costs nothing: no magic while the Arrival holds, a spell already used this scene', () => {
  const env = mk(), { E } = env, h = E.horror(), c = hero(env, 'ottoline'); E.raise(h, 21); E.aftershock(h, 21, 3);
  const no = E.use({ horror: h, scene: 12 }, c, 'embers', 'ember', { d20: 20 }); assert.equal(no.ok, false); assert.equal(h.pos, 21); assert.equal(c.hp, c.max);
  E.lower(h, 2); const g = E.horror();
  const first = E.use({ horror: g, scene: 12 }, c, 'dust', 'rend', { d20: 20 }); assert.equal(first.ok, true); assert.equal(g.pos, 1);
  const second = E.use({ horror: g, scene: 12 }, c, 'dust', 'rend', { d20: 20 }); assert.equal(second.ok, false); assert.equal(g.pos, 1, 'not charged for a refusal');
});
test('casting at 21 is paid in Strain, which nothing reduces, and can bring the caster down', () => {
  const env = mk(), { E } = env, h = E.horror(), c = hero(env, 'ottoline'); E.raise(h, 21); c.hp = 1;
  const r = E.use({ horror: h, scene: 12 }, c, 'dust', 'unmake', { d20: 20, target: { def: E.enemy('rats'), hp: 10 } });
  assert.equal(r.horror.strain, 2); assert.equal(c.hp, 0); assert.ok(c.dying);
});
test('Mend heals once per person per rest with no Horror; a dying ally can always be mended', () => {
  const env = mk(), { E } = env, h = E.horror(), m = hero(env, 'maren'), a = hero(env, 'aldric'); a.hp = 6;
  const first = E.use({ horror: h, scene: 12 }, m, 'litany', 'mend', { target: a, d20: 18 }); assert.ok(first.healed > 0);
  const again = E.use({ horror: h, scene: 12 }, m, 'litany', 'mend', { target: a, d20: 18 }); assert.equal(again.healed, 0); assert.equal(h.pos, 0, 'neither healing casting costs Horror');
  E.hurt(a, 99); assert.ok(E.use({ horror: h, scene: 12 }, m, 'litany', 'mend', { target: a, d20: 18 }).healed > 0);
});
test('the Penitent’s chain: 1 Horror, 1d4 that nothing reduces, +3 to the roll', () => {
  const env = mk(), { E } = env, h = E.horror(), c = hero(env, 'ottoline'); const r = E.chain(c, h);
  assert.equal(r.bonus, 3); assert.equal(h.pos, 1); assert.equal(c.hp, c.max - r.damage); assert.ok(r.damage >= 1 && r.damage <= 4);
});
test('bandages: a dying ally is tended on an Easy check; a hurt one heals once per rest; three uses', () => {
  const env = mk(), { E } = env, h = E.horror(), w = hero(env, 'wren'), a = hero(env, 'aldric'); E.hurt(a, 99);
  const r = E.use({ horror: h, scene: 12 }, w, 'bandages', '', { target: a, adj: 'easy', d20: 12 }); assert.equal(r.tended.stable, true);
  assert.equal(w.pack.find((p) => p.id === 'bandages').uses, 2);
});
test('pushing: a second Action once a turn, only after the first', () => {
  const { E } = mk(), t = E.newTurn();
  assert.equal(E.canPush(t), false); t.actions = 1; assert.equal(E.canPush(t), true); t.pushed = true; assert.equal(E.canPush(t), false);
  assert.equal(E.canAct(t), true); t.actions = 2; assert.equal(E.canAct(t), false);
});

test('a rest needs a safe place and a whole watch; each hearth restores once; an interrupted rest changes nothing', () => {
  const env = mk(), { E } = env, h = E.horror(), party = ['maren', 'aldric'].map((i) => hero(env, i)); E.raise(h, 12); party[0].hp = 5; party[1].hp = 0;
  assert.equal(E.rest(h, party, { safe: false, hearth: 'a' }).ok, false);
  const cut = E.rest(h, party, { safe: true, interrupted: true, hearth: 'a' }); assert.equal(cut.ok, false); assert.equal(h.pos, 12); assert.equal(party[0].hp, 5);
  const ok = E.rest(h, party, { safe: true, hearth: 'a' }); assert.equal(ok.ok, true); assert.ok(ok.roll >= 1 && ok.roll <= 6); assert.equal(h.pos, 12 - ok.roll); assert.equal(party[0].hp, 10); assert.equal(party[1].hp, 10);
  const pos = h.pos; assert.equal(E.rest(h, party, { safe: true, hearth: 'a' }).ok, false); assert.equal(h.pos, pos, 'the same hearth twice does nothing');
  assert.equal(E.rest(h, party, { safe: true, hearth: 'b' }).ok, true);
});
test('a rest never takes the track below 0, never takes anyone above full, and re-arms the thresholds it falls under', () => {
  const env = mk(), { E } = env, h = E.horror(), party = [hero(env, 'maren')]; E.raise(h, 10);
  for (let i = 0; i < 6; i++) E.rest(h, party, { safe: true, hearth: i });
  assert.equal(h.pos, 0); assert.equal(party[0].hp, party[0].max); assert.equal(h.armed[9], true);
});
test('a troubled night skips the Horror reduction once but still heals; "dawn does not come" forbids the rest', () => {
  const env = mk(), { E } = env, h = E.horror(), p = [hero(env, 'maren')]; E.raise(h, 16); E.aftershock(h, 15, 3); p[0].hp = 4;
  const r = E.rest(h, p, { safe: true, hearth: 1 }); assert.equal(r.ok, true); assert.equal(r.lowered, 0); assert.equal(p[0].hp, 10);
  const r2 = E.rest(h, p, { safe: true, hearth: 2 }); assert.ok(r2.lowered > 0, 'the next rest lowers it again');
  E.raise(h, 21); E.aftershock(h, 21, 6); assert.equal(E.rest(h, p, { safe: true, hearth: 3 }).ok, false);
});
test('every aftershock row exists, and the old tables are labelled kept or adapted', () => {
  const { D } = mk();
  for (const t of [9, 15, 21]) { assert.equal(D.AFTERSHOCKS[t].rows.length, 6); D.AFTERSHOCKS[t].rows.forEach((r) => { assert.ok(r.t.length > 10); assert.match(r.from, /^(kept|adapted)/); }); }
});
test('enemies and dice are all defined', () => {
  const { D, E } = mk();
  for (const e of D.ENEMIES) { assert.ok(e.hearts >= 1); assert.ok(D.DICE.includes(e.effort)); assert.ok(E.SCORES.includes(e.defend)); }
  assert.equal(E.HEART, 10);
});

test('trying uses the Action, hit or miss; a refusal uses nothing', () => {
  const env = mk(), { E } = env, h = E.horror(), c = hero(env, 'ottoline'), t = E.newTurn();
  E.use({ horror: h, scene: 12, turn: t }, c, 'embers', 'ember', { d20: 2, target: { def: E.enemy('rats'), hp: 10 } });
  assert.equal(t.actions, 1, 'a miss still spends the Action');
  const u = E.newTurn(); E.raise(h, 21); E.aftershock(h, 21, 3);
  const r = E.use({ horror: h, scene: 12, turn: u }, c, 'embers', 'ember', { d20: 20 }); assert.equal(r.ok, false); assert.equal(u.actions, 0, 'a refusal spends nothing');
});

test('the arming sword makes Guard worth +3, and every hero has a notes field', () => {
  const env = mk(), { E } = env, c = hero(env, 'maren');
  assert.equal(E.guardBonus(c), 2); E.addItem(c, 'sword'); assert.equal(E.guardBonus(c), 3);
  assert.equal(typeof c.notes, 'string');
});

test('timers: kept tidy, tick down by hand or each round, fire once at 0, and never go below it', () => {
  const { E } = mk();
  const list = E.timerClean([{ id: 'a', name: '  The bell tolls ', n: 2, auto: true }, { name: 'x'.repeat(90), n: '7' }, null, { n: -5 }, 'junk']);
  assert.equal(list.length, 3); assert.equal(list[0].name, 'The bell tolls'); assert.equal(list[1].name.length, 40); assert.equal(list[1].auto, false); assert.equal(list[2].n, 0);
  assert.equal(E.timerClean('nope').length, 0); assert.equal(E.timerClean(Array(20).fill({ n: 1 })).length, 8);
  const t = E.timerClean([{ id: 'a', name: 'Bell', n: 2, auto: true }, { id: 'b', name: 'Hand', n: 1, auto: false }]);
  assert.deepEqual(J(E.timerTick(t, (x) => x.auto)), []); assert.equal(t[0].n, 1); assert.equal(t[1].n, 1, 'by hand stays put');
  assert.deepEqual(J(E.timerTick(t, (x) => x.auto)), ['Bell']); assert.equal(t[0].n, 0);
  assert.deepEqual(J(E.timerTick(t, (x) => x.auto)), [], 'it fires once'); assert.equal(t[0].n, 0);
  assert.deepEqual(J(E.timerTick(t, (x) => x.id === 'b')), ['Hand']);
});

test('a repeating timer starts again from its first count each time it fires', () => {
  const { E } = mk(); const t = E.timerClean([{ id: 'b', name: 'Bell', n: 3, max: 3, auto: true, repeat: true }]);
  const fires = []; for (let r = 1; r <= 7; r++) { if (J(E.timerTick(t, (x) => x.auto)).length) fires.push(r); }
  assert.deepEqual(fires, [3, 6]); assert.equal(t[0].n, 2);
  assert.equal(E.timerClean([{ n: 5 }])[0].max, 5, 'the first count is remembered');
});

test('magic rolls d10; Unmake pays 2 Horror and leaves its target Dazed', () => {
  const env = mk(), { E, D } = env, c = hero(env, 'ottoline');
  D.SPELLS.filter((s) => s.cat === 'magic').forEach((s) => assert.equal(s.effort, 10, s.id + ' rolls d10'));
  const r = E.use({ horror: E.horror(), scene: 12 }, c, 'dust', 'unmake', { d20: 20, target: { id: 'f1', def: E.enemy('rats'), hp: 20, tags: [] } });
  assert.equal(r.ok, true); assert.equal(r.effort.die, 10); assert.ok(J(r.intents).some((i) => i.k === 'status' && i.tag === 'dazed'), JSON.stringify(r.intents));
});

test('six scores with six points, and four points of Effort: the ready heroes keep to both, and a hero\u2019s Effort modifier adds to what they roll', () => {
  const env = mk(), { E, D } = env;
  assert.deepEqual(J(E.SCORES), ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']); assert.deepEqual(J(E.CATS), ['basic', 'weapons', 'ranged', 'magic', 'ultimate']);
  for (const def of D.CHARACTERS) { assert.ok(E.validSpread(def.scores), def.name + ' scores'); assert.ok(E.validEffort(def.effort), def.name + ' effort'); }
  assert.equal(E.validSpread({ STR: 7, DEX: 0, CON: 0, INT: 0, WIS: 0, CHA: 0 }), false, 'no more than 6 in one'); assert.equal(E.validSpread({ STR: 3, DEX: 3, CON: 1, INT: 0, WIS: 0, CHA: 0 }), false, 'seven is too many');
  assert.equal(E.validEffort({ basic: 0, weapons: 5, ranged: 0, magic: 0, ultimate: 0 }), false);
  const a = hero(env, 'aldric'); a.effort.weapons = 3;
  for (let i = 0; i < 60; i++) { const r = E.use({ horror: E.horror(), scene: 12 }, a, 'billhook', '', { d20: 12, target: { def: E.enemy('rats'), hp: 99 } }); assert.ok(r.effort.bonus === 3 && r.effort.total >= 4 && r.effort.total <= 9, 'd6+3'); }
  const crit = E.use({ horror: E.horror(), scene: 12 }, a, 'billhook', '', { d20: 20, target: { def: E.enemy('rats'), hp: 99 } }); a.effort.ultimate = 2;
  const crit2 = E.use({ horror: E.horror(), scene: 12 }, a, 'billhook', '', { d20: 20, target: { def: E.enemy('rats'), hp: 99 } }); assert.equal(crit2.effort.ultBonus, 2); assert.equal(crit2.effort.rolls.length, 2);
  assert.equal(E.catOf(D.ITEMS.find((i) => i.id === 'crossbow')), 'weapons'); assert.equal(E.catOf(D.ITEMS.find((i) => i.id === 'cudgel')), 'weapons');
});
test('a hero from the three-score days is carried over: each old score covers two new ones, and the total stays six', () => {
  const env = mk(), { E } = env, old = { id: 'o', name: 'Old', scores: { Body: 2, Mind: 1, Spirit: 0 }, pack: [{ id: 'embers' }], max: 20, hp: 20 };
  const h = E.upgrade(J(old)); assert.deepEqual(J(h.scores), { STR: 2, DEX: 1, CON: 2, INT: 1, WIS: 0, CHA: 0 }); assert.ok(E.validSpread(h.scores)); assert.ok(E.validEffort(h.effort)); assert.equal(h.effort.magic, 3, 'a hero with a grimoire gets magic Effort');
  assert.equal(h.max, 20, 'health is not touched'); assert.equal(E.upgrade(J(h)).scores.STR, 2, 'doing it twice changes nothing');
  const w = E.upgrade({ scores: { Body: 0, Mind: 0, Spirit: 2 }, pack: [{ id: 'cudgel' }] }); assert.equal(w.effort.weapons, 3);
});
