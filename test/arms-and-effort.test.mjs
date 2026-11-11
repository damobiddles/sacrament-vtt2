// Effort and arms (the owner's decision, 2026-11-11): Ultimate is a die, not a bonus (a successful natural 20 adds a plain d12, and points once put in Ultimate come back
// to spend); every two-handed weapon adds +2 damage and the crossbow lost its +2 to hit; three rare guns, which misfire on a natural 1 to 3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { table, charNamed, find } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'solo/engine.js']) require('../site/' + f);
const R = globalThis.SacramentRules, C = globalThis.SacramentSheetCore, S = globalThis.SacramentSolo;
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };

test('rules: Ultimate is no longer a kind to put points in, and the natural-20 d12 adds no bonus', () => {
  assert.deepEqual(R.BONUS_CATS, ['basic', 'weapons', 'guns', 'magic']);
  const base = R.effort({ cat: 'weapons', rolled: 4, bonus: 3 });
  const crit = R.criticalEffort({ base, rolled: 7, bonus: 5 }); assert.equal(crit.total, 4 + 3 + 7); assert.equal(crit.critical.bonus, 0);
});

test('sheet: Ultimate points come back to spend, and none can be put there again', () => {
  const h = C.cleanHero({ name: 'Old', stats: { STR: 2 }, effort: { basic: 1, weapons: 1, ultimate: 2 }, gear: [] });
  assert.equal(h.effort.ultimate, 0, 'the stored key stays, at 0'); assert.equal(C.effortLeft(h), C.effortPoints(h) - 2, 'the 2 points are free again');
  const r = C.edit(h, { op: 'effort', cat: 'ultimate', value: 1 }, { gm: false }); assert.equal(r.ok, false); assert.match(r.why, /die, not a bonus/);
});

test('TABLE: a hero saved with Ultimate points gets them back, and the GM is told once', async () => {
  const store = memoryStore(), t = await table({ store }), th = charNamed(await t.state(), 'Thorne');
  const room = await store.get(t.code); room.data.chars[th.id].effort.ultimate = 2; await store.put(t.code, room.data, room.etag);
  assert.equal((await t.gm.cmd({ type: 'setTarget', value: 12 })).status, 200);
  const st = await t.state(); assert.equal(st.chars[th.id].effort.ultimate, 0);
  assert.equal(st.log.filter((e) => /Ultimate Effort bonus is gone/.test(e.text) && /Thorne 2/.test(e.text)).length, 1);
  await t.gm.cmd({ type: 'setTarget', value: 12 }); assert.equal((await t.state()).log.filter((e) => /Ultimate Effort bonus is gone/.test(e.text)).length, 1, 'once');
  assert.equal((await t.gm.cmd({ type: 'charUpdate', id: th.id, patch: { effort: { ultimate: 3 } } })).status, 200); assert.equal((await t.state()).chars[th.id].effort.ultimate, 0, 'the GM cannot put points there either');
});

test('ARMS: three rare guns, 5 in 100 on the Arms table; two-handed weapons +2 damage, a pistol not', () => {
  const g = ['handcannon', 'arquebus', 'wheellock'].map((id) => C.item(id));
  assert.deepEqual(g.map((i) => [i.cat, i.effort, C.weaponHands(i), C.damageBonus(i), R.misfireOf(i)]), [['guns', 8, 2, 2, 3], ['guns', 8, 2, 2, 3], ['guns', 8, 1, 0, 3]]);
  assert.equal(g.reduce((n, i) => n + i.loot[1] - i.loot[0] + 1, 0), 5); assert.ok(g.every((i) => i.table === 'arms'));
  for (const id of ['bow', 'spear', 'crossbow', 'tithemaul']) { assert.equal(C.damageBonus(C.item(id)), 2, id); assert.equal(C.attackBonus(C.item(id)), 0, id); }
  assert.equal(C.damageBonus(C.item('sword')), 0); assert.equal(R.misfireOf(C.item('crossbow')), 0);
});

test('TABLE: a gun misfires on a natural 1 to 3 whatever the total, with no Horror; a 4 can hit', async () => {
  const t = await table(), th = charNamed(await t.state(), 'Thorne'), ghoul = find(await t.state(), 'Pit Ghoul').id;
  await t.gm.cmd({ type: 'charUpdate', id: th.id, patch: { stats: { DEX: 10 } } });
  await t.gm.cmd({ type: 'sheet', charId: th.id, op: { op: 'add', id: 'arquebus' } });
  const m = await t.gm.cmd({ type: 'useItem', charId: th.id, index: 0, d20: 3, targetCardId: ghoul }); assert.equal(m.status, 200);
  const roll = m.body.state.rolls.at(-1); assert.equal(roll.check.success, false); assert.equal(roll.check.misfire, true); assert.equal(m.body.state.horror.cur, 0);
  assert.match(m.body.state.log.map((e) => e.text).join(' | '), /Misfire: the powder fails\./);
  const h = await t.gm.cmd({ type: 'useItem', charId: th.id, index: 0, d20: 4, targetCardId: ghoul }); assert.equal(h.body.state.rolls.at(-1).check.success, true);
  const e = await t.gm.cmd({ type: 'effort', rollId: h.body.result.rollId, rolled: 5 }); const eff = e.body.state.rolls.at(-1).effort;
  assert.equal(eff.die, 8); assert.equal(eff.weaponBonus, 2); assert.equal(eff.total, 5 + th.effort.guns + 2);
});

test('SOLO: a gun misfires on a natural 1 to 3 the same way', () => {
  const adv = { id: 'g', title: 'Guns', target: 12, start: 'room', rooms: { room: { name: 'A room', short: 'room', text: 'A room.', actions: [{ id: 'fight', label: 'Fight', run: (api) => api.fight('foe') }] } },
    foes: { foe: { name: 'The Foe', hp: 60, attack: -20, damage: 4, appears: 'It comes.', defeated: 'It falls.' } } };
  const hero = C.cleanHero({ name: 'Gunner', stats: { DEX: 6 }, effort: { guns: 2 }, gear: [{ id: 'wheellock', eq: true }] });
  const s = S.start(hero, adv, fixed([10])); S.act(s, adv, 'do fight', fixed([10]));
  const shot = S.choices(s, adv).find((c) => /Wheellock/.test(c.label)); assert.ok(shot, 'the pistol is offered');
  S.act(s, adv, shot.cmd, fixed([3])); assert.match(s.log.map((l) => l.t).join('\n'), /Misfire: the powder fails\./); assert.equal(s.horror, 0);
});
