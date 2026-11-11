// Choices that tempt the Horror (the owner's decision, 2026-11-11): a push follows any failed roll; a hero's natural 1 adds Horror only on magic (a spell or
// a relic) or a push; dying always lasts 3 rounds; a dying hero may crawl away (a CON check) or pay 1 Horror to act anyway, at the table and alone.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { table, d20, find, charNamed } from './vtt-helpers.mjs';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'solo/engine.js', 'solo/adventure-silent-bell.js', 'solo/road.js', 'solo/road-wilds.js', 'solo/road-far.js']) require('../site/' + f);
const R = globalThis.SacramentRules, S = globalThis.SacramentSolo, A = globalThis.SacramentSoloAdventures['silent-bell'], T = globalThis.SacramentHeroTools;
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };
const feed = (st) => st.log.map((e) => e.text).join(' | ');
async function setup(dice) {
  const t = await table({ dice }), ann = await t.join('Ann'), thorne = charNamed(await t.state(), 'Thorne');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  return { t, ann, thorne, ghoul: find(await t.state(), 'Pit Ghoul').id };
}
const down = async (t, name) => { const c = find(await t.state(), name); return t.gm.cmd({ type: 'adjust', cardId: c.id, field: 'hp', delta: -c.hp.cur }); };

test('rules: a natural 1 tempts the Horror on magic or a push, not on an ordinary attack; dying always starts at 3 rounds', () => {
  assert.equal(R.nat1Tempts({ magic: true }), true); assert.equal(R.nat1Tempts({ pushed: true }), true);
  assert.equal(R.nat1Tempts({ attack: true }), false, 'a sword missing on a 1 does not tempt it');
  assert.equal(R.nat1Tempts({}), false);
  assert.equal(R.DYING.start, 3); assert.deepEqual(R.dyingFall(), { left: 3, stable: false, dead: false }); assert.equal(R.DYING.die, undefined, 'no d4');
  assert.equal(R.DYING.actHorror, 1); assert.equal(R.DYING.crawl, 'CON');
});

test('TABLE: a natural 1 on a weapon attack adds no Horror; on a spell it adds 1 beside the casting cost', async () => {
  const { t, ann, thorne, ghoul } = await setup([d20(1), d20(1)]);
  const a = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul }); assert.equal(a.body.state.horror.cur, 0);
  await t.gm.cmd({ type: 'sheet', charId: thorne.id, op: { op: 'add', id: 'embers' } });
  const sp = await ann.cmd({ type: 'useItem', charId: thorne.id, index: 0, spellId: 'ember', targetCardId: ghoul }); assert.equal(sp.status, 200);
  assert.equal(sp.body.state.horror.cur, 2, '1 for the spell, 1 for its natural 1');
});

test('TABLE: any failed roll can be pushed, once, on your turn: a failed DEX check too', async () => {
  const { t, ann, thorne } = await setup([d20(2), d20(2)]);
  await t.gm.cmd({ type: 'orderSet', order: [thorne.cardId] });
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' }), roll = r.body.state.rolls.at(-1);
  assert.equal(roll.canPush, true, roll.pushReason);
  const p = await ann.cmd({ type: 'push', rollId: roll.id }); assert.equal(p.status, 200); assert.equal(p.body.state.horror.cur, 1);
  const again = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' }), r2 = again.body.state.rolls.at(-1);
  assert.equal(r2.canPush, false, 'the pushed roll cannot be pushed');
});

test('TABLE: a hero who falls is dying for 3 rounds, with no die rolled', async () => {
  const { t } = await setup([]); const r = await down(t, 'Thorne');
  assert.deepEqual(find(r.body.state, 'Thorne').dying, { left: 3, stable: false, dead: false });
  const line = r.body.state.log.filter((e) => /falls and is dying/.test(e.text)).at(-1); assert.equal(line.text, 'Thorne falls and is dying: 3 rounds left.'); assert.equal(line.dice, undefined);
});

test('TABLE: a dying hero may crawl away (a CON check) for nothing, or pay 1 Horror to act anyway; the dead cannot act', async () => {
  const { t, ann, thorne, ghoul } = await setup([d20(12), d20(12)]); await down(t, 'Thorne');
  const crawl = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'CON' }); assert.equal(crawl.status, 200); assert.equal(crawl.body.state.horror.cur, 0);
  const strike = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', attack: true, targetCardId: ghoul }); assert.equal(strike.status, 200);
  assert.equal(strike.body.state.horror.cur, 1); assert.match(feed(strike.body.state), /Thorne is dying and acts anyway\. The Horror rises 1/);
  const card = find(await t.state(), 'Thorne'); await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'round', d: -1 }); await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'round', d: -1 }); await t.gm.cmd({ type: 'dying', cardId: card.id, op: 'round', d: -1 });
  assert.equal(find(await t.state(), 'Thorne').dying.dead, true);
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'CON' })).status, 400, 'the dead do not act');
});

test('SOLO: falling is 3 rounds; a dying hero is offered a crawl, and other actions at 1 Horror each', () => {
  const s = S.start(T.generate('fighter', seeded(6)), A, fixed([10]));
  S.act(s, A, 'go north', fixed([10])); S.act(s, A, 'go down', fixed([10]));
  assert.ok(s.fight, 'a fight has begun');
  S.act(s, A, 'brace', fixed([10])); s.hp.cur = 1;
  S.act(s, A, 'foe', fixed([20, 6]));   /* the foe's natural 20 brings the hero down */
  assert.ok(s.dying, 'the hero is dying'); assert.equal(s.dying.left <= 3, true);
  assert.match(s.log.map((l) => l.t).join('\n'), /You are dying: 3 rounds left\./);
  const ch = S.choices(s, A);
  assert.ok(ch.some((c) => c.cmd === 'crawl'), 'a crawl is offered');
  const paid = ch.filter((c) => /^dying /.test(c.cmd)); assert.ok(paid.length, 'something to do for 1 Horror'); assert.ok(paid.every((c) => c.horror >= 1));
  const before = s.horror; S.act(s, A, paid[0].cmd, fixed([10, 3])); assert.ok(s.horror >= before + 1, 'acting while dying costs 1 Horror');
});

test('SOLO: a natural 1 on an ordinary attack adds no Horror', () => {
  const s = S.start(T.generate('fighter', seeded(6)), A, fixed([10]));
  S.act(s, A, 'go north', fixed([10])); S.act(s, A, 'go down', fixed([10]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack' && !/^Cast/.test(c.label)); const before = s.horror;
  S.act(s, A, attack.cmd, fixed([1])); assert.equal(s.horror, before);
  assert.ok(s.log.some((l) => l.outcome && /ordinary attack: no Horror/.test(l.outcome.note)), 'the roll says why');
});

test('SOLO: a failed roll outside a fight can be pushed once: +1 Horror and another try', () => {
  const F = globalThis.SacramentSoloAdventures.ford, s = S.start(T.generate('scout', seeded(4)), F, fixed([2]));
  S.act(s, F, 'way ford leap', fixed([2]));
  const pushable = S.choices(s, F).find((c) => c.cmd === 'repush');
  assert.ok(pushable, 'a failed check offers a push'); assert.equal(pushable.horror, R.HORROR.push);
  const before = s.horror; S.act(s, F, 'repush', fixed([2])); assert.equal(s.horror, before + R.HORROR.push);
  assert.equal((s.log.map((l) => l.t).join('\n').match(/Leaping the stones/g) || []).length, 2, 'tried again');
  assert.ok(!S.choices(s, F).some((c) => c.cmd === 'repush'), 'the pushed roll cannot be pushed');
});
