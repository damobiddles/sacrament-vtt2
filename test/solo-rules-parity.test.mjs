// One set of rules everywhere (owner, 2026-11-07): the solo game at /solo/ must play every rule exactly as the table does, so that a player who learns the
// game alone has learned the real game. These tests play the same moment, with the same dice, through the table's server (vtt-core) and through the solo
// engine, and fail if the two disagree. Where only the solo game can do something (a dying hero acting alone), it is checked against the shared words instead.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { table, charNamed, find, d20 as d20f, die as dief } from './vtt-helpers.mjs';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'solo/engine.js']) require('../site/' + f);
const S = globalThis.SacramentSolo, R = globalThis.SacramentRules, C = globalThis.SacramentSheetCore;
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };
const ENGINE = fs.readFileSync(new URL('../site/solo/engine.js', import.meta.url), 'utf8');

/* A bare scene for these tests: one room (dark when asked), one foe that cannot hit (attack -20), Target 12 as at a new table. */
function scene(o = {}) {
  return { id: 'parity', title: 'Parity', target: 12, start: 'room',
    rooms: { room: { name: 'A room', short: 'room', text: 'A room.', dark: !!o.dark, actions: [{ id: 'fight', label: 'Fight', run: (api) => api.fight('foe') }] } },
    foes: { foe: { name: 'The Foe', hp: 60, attack: -20, damage: 4, appears: 'It comes.', defeated: 'It falls.' } } };
}
/* The table's sample hero Thorne, with only the gear given, as a solo hero. */
const THORNE = { name: 'Thorne', stats: { STR: 3, DEX: 0, CON: 2, INT: 0, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 3, guns: 0, magic: 0, ultimate: 0 } };
function soloHero(gear) { return C.cleanHero(Object.assign(JSON.parse(JSON.stringify(THORNE)), { gear: gear.map((id) => ({ id, eq: true })) })); }
function soloGame(gear, o = {}) { const adv = scene(o), s = S.start(soloHero(gear), adv, fixed([10])); return { s, adv }; }
const choice = (s, adv, re) => S.choices(s, adv).find((c) => re.test(c.label));
/* The same hero at the table, with the same gear, and a player holding them. */
async function tableHero(gear) {
  const t = await table({ dice: [] }), st = await t.state(), h = charNamed(st, 'Thorne'), foe = find(st, 'Pit Ghoul');
  for (const id of gear) assert.equal((await t.gm.cmd({ type: 'sheet', charId: h.id, op: { op: 'add', id } })).status, 200, id);
  const p = await t.join('Parity'); await p.cmd({ type: 'claim', charId: h.id });
  return { t, h, foe, p };
}

test('a grimoire read by the die casts the same spell at the table and in the solo game, for every face', async () => {
  const book = C.item('unnamedbook');
  for (let face = 1; face <= book.pickDie; face++) {
    const { t, h } = await tableHero([book.id]); t.queue(dief(face, book.pickDie));
    const atTable = (await t.gm.cmd({ type: 'useItem', charId: h.id, index: 0, d20: 10 })).body.result.picked.spellId;
    const { s, adv } = soloGame([book.id]);
    S.act(s, adv, 'do fight', fixed([10]));
    const read = choice(s, adv, /Read The Book Without a Name/); assert.ok(read, 'solo offers the book');
    S.act(s, adv, read.cmd, fixed([face, 10, 10, 10]));
    const solo = book.spells.find((id) => s.log.some((l) => l.t.includes(', ' + C.spellsOf(book).find((x) => x.id === id).name + '.')));
    assert.equal(solo, atTable, 'face ' + face);
    assert.equal(C.pickSpell({ spells: C.spellsOf(book), pick: book.pick, pickDie: book.pickDie }, face).id, atTable, 'the shared rule, face ' + face);
  }
});

test('a natural 1 costs the same Horror at the table and in the solo game: attack, damage spell, healing spell, item check', async () => {
  const cases = [
    { gear: ['hatchet'], solo: /^Attack: Gravedigger's Hatchet/, table: { index: 0 }, foe: true, expect: R.HORROR.nat1 },
    { gear: ['brokenbell'], solo: /^Cast Unmake/, table: { index: 0, spellId: 'unmake' }, foe: true, expect: 1 + R.HORROR.nat1 },
    { gear: ['seventhpenance'], solo: /^Cast Mend/, table: { index: 0, spellId: 'mend' }, hurt: true, expect: R.HORROR.nat1 },
    { gear: ['bandages'], solo: /^Use Linen Bandages/, table: { index: 0 }, hurt: true, expect: 0 }
  ];
  for (const k of cases) {
    const { t, h, foe, p } = await tableHero(k.gear);
    if (k.hurt) await t.gm.cmd({ type: 'adjust', cardId: h.cardId, field: 'hp', delta: -5 });
    const r = await p.cmd(Object.assign({ type: 'useItem', charId: h.id, d20: 1 }, k.table, k.foe ? { targetCardId: foe.id } : { targetCardId: h.cardId }));
    assert.equal(r.status, 200, k.gear[0] + ': ' + JSON.stringify(r.body.error || ''));
    const atTable = r.body.state.horror.cur;
    const { s, adv } = soloGame(k.gear);
    if (k.hurt) s.hp.cur -= 5; if (k.foe) S.act(s, adv, 'do fight', fixed([10]));
    const c = choice(s, adv, k.solo); assert.ok(c, k.gear[0] + ' is offered');
    S.act(s, adv, c.cmd, fixed([1, 1, 1, 1]));
    assert.equal(atTable, k.expect, 'table, ' + k.gear[0]); assert.equal(s.horror, atTable, 'solo, ' + k.gear[0]);
  }
});

test('healing rolls the same dice in both, natural 20 adding the d12', async () => {
  const { t, h, p } = await tableHero(['seventhpenance']);
  await t.gm.cmd({ type: 'adjust', cardId: h.cardId, field: 'hp', delta: -9 }); t.queue(dief(3, 8), dief(5, 12));
  const r = await p.cmd({ type: 'useItem', charId: h.id, index: 0, spellId: 'mend', d20: 20, targetCardId: h.cardId });
  const atTable = r.body.state.cards[h.cardId].hp.cur;
  const { s, adv } = soloGame(['seventhpenance']); s.hp.cur -= 9;
  S.act(s, adv, choice(s, adv, /^Cast Mend/).cmd, fixed([20, 3, 5]));
  assert.equal(atTable, 1 + 8); assert.equal(s.hp.cur, atTable);
});

test('a push gives a second action of any kind, as at the table: not only another attack', async () => {
  const { s, adv } = soloGame(['hatchet', 'seventhpenance']); s.hp.cur -= 5;
  S.act(s, adv, 'do fight', fixed([10]));
  S.act(s, adv, choice(s, adv, /^Attack: Gravedigger's Hatchet/).cmd, fixed([2]));
  assert.equal(s.fight.phase, 'push');
  const heal = S.choices(s, adv).find((c) => c.kind === 'push' && /Mend/.test(c.label));
  assert.ok(heal, 'Mend can be the pushed second action');
  S.act(s, adv, heal.cmd, fixed([1, 1, 1]));   // push +1, and a natural 1 on a pushed action +1 (the spell itself costs nothing)
  assert.equal(s.horror, R.HORROR.push + R.HORROR.nat1);
});

/* A dying hero alone: whatever the solo game lets them do, the shared words still hold. */
function dyingGame(gear) { const g = soloGame(gear); S.act(g.s, g.adv, 'do fight', fixed([10])); g.s.hp.cur = 1; S.act(g.s, g.adv, 'brace', fixed([10])); S.act(g.s, g.adv, 'foe', fixed([10])); g.s.hp.cur = 0; g.s.dying = R.dyingFall(3); g.s.fight.phase = 'hero'; return g; }

test('a hero at 0 HP may take the same healing again, as the rules say', () => {
  const { s, adv } = dyingGame(['seventhpenance']); s.healed.mend = true;
  const mend = choice(s, adv, /^Cast Mend/); assert.ok(mend, 'Mend is offered to a dying hero who was mended before');
  S.act(s, adv, mend.cmd, fixed([15, 4]));
  assert.equal(s.hp.cur, 4); assert.equal(s.dying, null);
});

test('bandages: a dying hero cannot tend themselves (the gear list\'s own words)', () => {
  assert.match(C.item('bandages').does, /a dying hero cannot tend themselves/);
  const { s, adv } = dyingGame(['bandages']);
  assert.ok(!choice(s, adv, /Bandages/), 'bandages are not offered to a dying hero alone');
});

test('a hero at 0 HP pays no blood: as at the table, a cost past 21 takes nothing from a hero who is down', () => {
  const { s, adv } = dyingGame(['seventhpenance']); s.horror = R.HORROR.max;
  const left = s.dying.left;
  S.act(s, adv, choice(s, adv, /^Cast Mend/).cmd, fixed([1, 4, 4]));   // a natural 1: one point that cannot go on the meter
  assert.equal(s.horror, R.HORROR.max); assert.equal(s.dying.left, left, 'no round taken for the blood');
});

test('the Black Candle gives light only when it is lit, and lighting it costs its Horror, as its words say', () => {
  const { s, adv } = soloGame(['candle'], { dark: true });
  assert.equal(S.sceneInfo(s, adv).dark, true, 'carrying an unlit Black Candle does not light the place');
  S.act(s, adv, choice(s, adv, /Black Candle/).cmd, fixed([10]));
  assert.equal(S.sceneInfo(s, adv).dark, false); assert.equal(s.horror, C.item('candle').horror);
});

test('the solo engine keeps no rules of its own: every number and roll comes from the shared rules', () => {
  for (const name of ['HORROR', 'DYING', 'BREAK_AWAY', 'REST', 'HEART', 'ADJ', 'BUILD', 'DEFENCE_BASE', 'ARMOUR_CAP']) assert.doesNotMatch(ENGINE, new RegExp('\\b' + name + '\\s*=\\s*[{0-9]'), name + ' is defined in the rules, not here');
  for (const use of ['R.check(', 'R.effort(', 'R.criticalEffort(', 'R.attack(', 'C.defence(', 'R.horrorMove(', 'R.nat1Tempts(', 'R.rollHorror(', 'R.HORROR.push', 'R.HORROR.nat1', 'R.HORROR.bloodDie', 'R.dyingFall(', 'R.BREAK_AWAY.stat', 'R.dyingTick(', 'R.REST.heal', 'R.restDice(', 'C.useOf(', 'C.actions(', 'C.pickSpell(', 'C.rollLoot(']) assert.ok(ENGINE.includes(use), 'the engine uses ' + use);
  assert.doesNotMatch(ENGINE, /% *u\.spells\.length|Math\.floor\(\(n - 1\)/, 'a grimoire read by the die uses the shared C.pickSpell');
});

/* ---------- the owner's calls of 2026-11-07: solo's own rules are written in the shared rules, and solo follows them ---------- */
const G = globalThis.SACRAMENT_GEAR, RULES = fs.readFileSync(new URL('../content/landing/rules.md', import.meta.url), 'utf8');

test('darkness: one rule in the lantern, the Light tag, the Rules page and the solo game (WIS checks to search or notice are Hard)', () => {
  assert.match(C.item('lantern').does, /every WIS check to search or notice is Hard/);
  assert.match(G.tags.find((t) => t.id === 'light').out, /WIS check to search or notice/);
  assert.match(RULES, /Without a light, a WIS check to search or notice in a dark place is Hard/);
  const adv = scene({ dark: true });
  adv.rooms.room.actions.push({ id: 'search', label: 'Search', run: (api) => api.check('WIS', { what: 'Searching' }) }, { id: 'lift', label: 'Lift', run: (api) => api.check('STR', { what: 'Lifting' }) });
  const s = S.start(soloHero([]), adv, fixed([10]));
  S.act(s, adv, 'do search', fixed([10])); assert.match(s.log.at(-1).t, /HARD/, 'a WIS search in the dark is Hard');
  S.act(s, adv, 'do lift', fixed([10])); assert.doesNotMatch(s.log.at(-1).t, /HARD/, 'other checks are not');
  const from = s.log.length; S.act(s, adv, 'do fight', fixed([10])); S.act(s, adv, choice(s, adv, /bare hands/).cmd, fixed([10]));
  assert.ok(!s.log.slice(from).some((l) => l.outcome && l.outcome.note === 'Hard'), 'an attack in the dark is not Hard');
});

test('tallow candles: lighting one in a dark scene spends one of its three uses, as its words say', () => {
  assert.match(C.item('candles').does, /Light a candle \(3 uses\)/);
  const { s, adv } = soloGame(['candles'], { dark: true });
  assert.equal(S.sceneInfo(s, adv).dark, false); assert.equal(s.hero.gear[0].uses, 2);
});

test('Ward protects an ally: alone it has no use, in its own words and on the Rules page', () => {
  for (const id of ['ward']) assert.match(G.spells.find((x) => x.id === id).does, /One ally/);
  assert.match(C.item('wardmedal').does, /An ally/);
  assert.match(RULES, /protect \*\*an ally\*\*, such as Ward, have no use alone/);
  const { s, adv } = soloGame(['seventhpenance']); S.act(s, adv, 'do fight', fixed([10]));
  const ward = choice(s, adv, /^Cast Ward/); assert.ok(ward && ward.idle, 'Ward shows "No use here"');
});

test('falling alone is written on the Rules page, and the solo game does exactly that', () => {
  assert.match(RULES, /## Playing alone/);
  assert.match(RULES, /\*\*Falling alone\.\*\*[^\n]*d4 rounds[^\n]*use healing on themselves[^\n]*bandages cannot tend yourself[^\n]*crawl away with a CON check[^\n]*1 HP/);
  const { s, adv } = dyingGame(['seventhpenance']);
  const labels = S.choices(s, adv).map((c) => c.label);
  assert.ok(labels.includes('Crawl away') && labels.some((l) => /Mend/.test(l)));
  S.act(s, adv, 'crawl', fixed([20])); assert.equal(s.hp.cur, 1); assert.equal(s.dying, null);
});
