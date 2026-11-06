// The solo adventure (site/solo/): the engine plays the written scene with the table's own rules, and never changes the hero it was given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'solo/spells.js', 'solo/engine.js', 'solo/adventure-silent-bell.js', 'solo/road.js']) require('../site/' + f);
const S = globalThis.SacramentSolo, A = globalThis.SacramentSoloAdventures['silent-bell'], T = globalThis.SacramentHeroTools, R = globalThis.SacramentRules;
const seeded = (seed) => () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const fixed = (list) => { let i = 0; return (sides) => Math.min(sides, list[i++ % list.length]); };

function playThrough(focus, seed) {
  const rnd = seeded(seed), die = (n) => 1 + Math.floor(rnd() * n), hero = T.generate(focus, rnd), before = JSON.stringify(hero), s = S.start(hero, A, die);
  for (let i = 0; i < 80 && !s.over; i++) {
    const ch = S.choices(s, A);
    const pick = ch.find((c) => c.kind === 'do') || ch.find((c) => c.kind === 'attack' || c.kind === 'push') || ch.find((c) => c.cmd === 'foe') || ch.find((c) => c.cmd === 'go down' && !s.flags.beat_eater) || ch.find((c) => c.cmd === 'go east') || ch.find((c) => c.cmd === 'go up') || ch.find((c) => c.cmd === 'go north') || ch[0];
    S.act(s, A, pick.cmd, die);
  }
  return { s, unchanged: JSON.stringify(hero) === before };
}

test('every ready-made hero can play the scene to an end, and the hero given to it is not changed', () => {
  for (const focus of ['fighter', 'scout', 'scholar', 'healer']) for (const seed of [1, 2, 5, 9, 11]) {
    const { s, unchanged } = playThrough(focus, seed);
    assert.ok(['won', 'dead'].includes(s.over), focus + ' seed ' + seed + ' did not finish');
    assert.ok(unchanged, 'the saved hero was changed');
    assert.ok(s.horror >= 0 && s.horror <= R.HORROR.max && s.hp.cur >= 0 && s.hp.cur <= s.hp.max);
  }
});

test('a missed attack offers a push, which costs 1 Horror; a natural 1 on the pushed attack costs 1 more', () => {
  const hero = T.generate('fighter', seeded(3));
  const s = S.start(hero, A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  assert.ok(s.fight, 'the Candle-Eater attacks in the crypt');
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([5, 1]));          // a miss, no natural 1
  assert.equal(s.horror, 0); assert.equal(s.fight.phase, 'push');
  const push = S.choices(s, A).find((c) => c.kind === 'push');
  S.act(s, A, push.cmd, fixed([1, 1, 1]));         // push (+1), natural 1 on the pushed attack (+1)
  assert.equal(s.horror, 2);
});

test('a plain check\'s natural 1 costs no Horror', () => {
  const s = S.start(T.generate('scout', seeded(4)), A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'do ledger', fixed([1]));
  assert.equal(s.horror, 0);
  assert.match(s.log.map((l) => l.t).join('\n'), /Target 12\. Miss/);
});

test('past the top of the meter the Horror is paid in blood, a d4 of HP per point', () => {
  const s = S.start(T.generate('fighter', seeded(6)), A, fixed([1]));
  s.horror = R.HORROR.max; const hp = s.hp.cur;
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([1, 3, 1]));          // natural 1 on an attack: 1 Horror that cannot go on the meter, paid with d4 = 3
  assert.equal(s.horror, R.HORROR.max);
  assert.ok(s.hp.cur <= hp - 3);
});

test('the offering box rolls on the real d100 loot table and the find goes to this copy of the hero', () => {
  const s = S.start(T.generate('fighter', seeded(8)), A, fixed([3, 1, 1, 1]));
  const gear = s.hero.gear.length; S.act(s, A, 'do box', fixed([3, 1, 1, 1]));
  assert.match(s.log.map((l) => l.t).join('\n'), /d100 3/);
  assert.equal(s.hero.gear.length, gear + 1);
});

test('typed commands become the same commands as the buttons', () => {
  const s = S.start(T.generate('fighter', seeded(2)), A, fixed([10]));
  assert.equal(S.parse(s, A, 'N'), 'go north');
  assert.equal(S.parse(s, A, 'talk to the woman'), 'do talk');
  assert.equal(S.parse(s, A, 'look'), 'look');
  assert.match(S.parse(s, A, 'dance'), /^\?/);
});

test('combat takes turns as at the table: a hit waits for Roll damage, then the hero ends the turn and the foe attacks', () => {
  const s = S.start(T.generate('fighter', seeded(3)), A, fixed([10]));
  S.act(s, A, 'go north', fixed([10])); S.act(s, A, 'go down', fixed([10]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([18]));
  assert.equal(s.fight.phase, 'damage');
  const reveal = s.log.filter((l) => l.outcome).pop().outcome;
  assert.equal(reveal.label, 'SUCCESS'); assert.ok(reveal.pendingDamage);
  assert.deepEqual(S.choices(s, A).map((c) => c.cmd), ['damage']);
  S.act(s, A, 'damage', fixed([2]));
  assert.equal(s.fight.phase, 'foe'); assert.ok(s.fight.hp.cur < s.fight.hp.max);
  S.act(s, A, 'foe', fixed([20, 3]));
  const foe = s.log.filter((l) => l.outcome).pop().outcome;
  assert.equal(foe.label, 'HIT'); assert.equal(foe.versus, 'Defence');
  assert.equal(s.fight.phase, 'hero'); assert.equal(s.fight.round, 2);
});

test('the soundtrack: every room has a tune, every note is a real note, and every voice of a tune is the same length so it loops in step', () => {
  require('../site/solo/music.js');
  const M = globalThis.SacramentSoloMusic;
  for (const r of Object.values(A.rooms)) assert.ok(M.TUNES[r.art], 'no tune for ' + r.art);
  for (const name of ['title', 'fight', 'won', 'dead']) assert.ok(M.TUNES[name], 'no tune for ' + name);
  assert.equal(M.isOn(), false, 'music must start off');
  for (const [name, tune] of Object.entries(M.TUNES)) {
    const lengths = Object.entries(tune.voices).map(([v, text]) => {
      const notes = M.parse(text);
      for (const n of notes) {
        assert.ok(n.len > 0, name + ' ' + v + ': bad length');
        if (n.n === '-') continue;
        if (v === 'noise') assert.ok(['k', 'h', 'x'].includes(n.n), name + ': bad drum ' + n.n);
        else { const f = M.freq(n.n); assert.ok(f > 30 && f < 4200, name + ' ' + v + ': bad note ' + n.n); }
      }
      return notes.reduce((t, n) => t + n.len, 0);
    });
    assert.ok(lengths.every((l) => l === lengths[0]), name + ' voices differ in length: ' + lengths.join(', '));
  }
});

test('the scene Target is always known, the dark is flagged, and every spell button says what the spell does', () => {
  const rnd = seeded(3), die = (n) => 1 + Math.floor(rnd() * n), s = S.start(T.generate('scholar', rnd), A, die);
  assert.deepEqual(S.sceneInfo(s, A), { target: 12, dark: false });
  const spells = S.choices(s, A).filter((c) => c.kind === 'spell');
  assert.ok(spells.length > 0, 'the scholar has spells to cast');
  for (const c of spells) assert.ok(c.about && c.about.does.length > 20 && c.about.name, c.label + ' has no description');
  s.room = 'crypt'; s.hero.gear = []; s.flags.lit = false;
  assert.equal(S.sceneInfo(s, A).dark, true, 'an unlit crypt is dark');
});

// A hero carrying one grimoire, for the story-spell tests; the dice are fixed so each test reads plainly.
function withBook(book, rolls) {
  const hero = T.generate('scholar', seeded(4)); hero.gear = [{ id: book, eq: true }, { id: 'lantern', eq: false }];
  const s = S.start(hero, A, fixed([10])); return { s, die: fixed(rolls || [10]) };
}
const cast = (s, name) => S.choices(s, A).find((c) => c.label.startsWith('Cast ') && c.label.includes(name));

test('a story spell that nothing here answers says "No use here", and casting it costs nothing', () => {
  const { s, die } = withBook('quietmouths');
  const hush = cast(s, 'Hush'); assert.ok(hush && hush.idle, 'Hush has no use at the lychgate');
  const before = s.horror; S.act(s, A, hush.cmd, die);
  assert.equal(s.horror, before, 'no Horror for a spell that did nothing');
  assert.match(s.log.at(-1).t, /Nothing here answers Hush/);
});

test('the tower door is an obstacle: successes roll Effort into its bar until it opens, and Open Door opens it at once', () => {
  const { s, die } = withBook('embers', [15, 4]);   /* d20 15 succeeds; Basic Effort d4 shows 4 */
  S.act(s, A, 'go north', die);
  let card = S.cards(s, A).find((c) => c.kind === 'obstacle'); assert.equal(card.cur, 0); assert.equal(card.max, 6);
  S.act(s, A, 'do force', die); card = S.cards(s, A).find((c) => c.kind === 'obstacle');
  assert.ok(card.cur >= 4 && card.cur < 6 && !s.flags.door, 'one success fills part of the bar');
  S.act(s, A, 'do force', die);
  assert.equal(s.flags.door, true, 'a full bar opens the door'); assert.equal(S.cards(s, A).length, 0, 'an open door leaves no card');
  const b = withBook('lowdoors'); S.act(b.s, A, 'go north', b.die);
  const spell = cast(b.s, 'Open Door'); assert.ok(spell && !spell.idle); S.act(b.s, A, spell.cmd, b.die);
  assert.equal(b.s.flags.door, true);
});

test("Brother Odo's breath is a timer: it loses 1 each round of the fight, and at 0 he dies and the Candle-Eater heals", () => {
  const { s } = withBook('embers'); const miss = fixed([2, 1]);   /* every attack misses, the foe hits for 1 */
  S.act(s, A, 'go north', miss); S.act(s, A, 'go down', miss);
  assert.equal(S.cards(s, A).find((c) => c.kind === 'timer').cur, 5);
  s.fight.hp.cur = 6; s.hp.cur = s.hp.max = 99;
  for (let i = 0; i < 5; i++) { S.act(s, A, 'punch', miss); if (s.fight.phase === 'push') S.act(s, A, 'foe', miss); }
  assert.equal(s.flags.odo_dead, true); assert.equal(s.fight.hp.cur, 10, 'it fed: +4 HP');
});

test('story spells in a fight: Wax Mouth stops the feeding, Snuff Candle costs the foe its attack, Thunderclap dazes it', () => {
  let { s, die } = withBook('quietmouths'); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  S.act(s, A, cast(s, 'Mouth of Wax').cmd, die); assert.equal(s.timers.odo.on, false, 'the timer stops');
  ({ s, die } = withBook('processional')); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  const hp = s.hp.cur; S.act(s, A, cast(s, 'Snuffed Candle').cmd, die); S.act(s, A, 'foe', die);
  assert.equal(s.hp.cur, hp, 'no attack this turn'); assert.equal(s.fight.round, 2);
  ({ s, die } = withBook('rivensky', [20, 10])); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  const clap = S.choices(s, A).find((c) => /Judgement|Clap/i.test(c.label)); S.act(s, A, clap.cmd, die); assert.equal(s.fight.dim, 3);
  S.act(s, A, 'foe', die); assert.match(s.log.find((l) => l.foeAttack).t, / - 1 = /, 'its attack rolls 3 less (+2 becomes -1)');
});

/* ---------- a run of five scenes on the pilgrim road ---------- */
const ROAD = globalThis.SacramentSoloCampaigns['pilgrim-road'], SCENES = globalThis.SacramentSoloAdventures;
function exitTo(s, dir) { const e = S.sceneOf(s).rooms[s.room].exits[dir]; return typeof e === 'string' ? e : e && e.to; }
function playRun(focus, seed) {
  const rnd = seeded(seed), die = (n) => 1 + Math.floor(rnd() * n), hero = T.generate(focus, rnd), before = JSON.stringify(hero), s = S.startRun(hero, 'pilgrim-road', die);
  const seen = [s.adventure];
  for (let i = 0; i < 500 && !s.over; i++) {
    const ch = S.choices(s, null).filter((c) => !c.idle); assert.ok(ch.length, 'there is always something to do (' + s.adventure + ' ' + s.room + ')');
    const want = [(c) => c.cmd === 'rest', (c) => c.cmd.startsWith('meet'), (c) => c.kind === 'use' && s.hp.cur <= s.hp.max / 2, (c) => c.cmd === 'damage', (c) => c.kind === 'attack', (c) => c.cmd === 'foe',
      (c) => c.kind === 'do' && !/^do (go|follow|set|lead|turn)$/.test(c.cmd), (c) => c.kind === 'go' && c.cmd.startsWith('go ') && !s.seen[exitTo(s, c.cmd.slice(3))], (c) => c.kind === 'do', (c) => c.cmd === 'next', (c) => c.kind === 'go'];
    let pick = null; for (const f of want) { pick = ch.find(f); if (pick) break; }
    S.act(s, null, (pick || ch[0]).cmd, die);
    if (seen.at(-1) !== s.adventure) seen.push(s.adventure);
  }
  return { s, seen, unchanged: JSON.stringify(hero) === before };
}

test('a run is five scenes that make sense: an opening, three middle scenes in a sensible order, and the finale that answers the opening', () => {
  const LEAN = { early: 0, any: 1, late: 2 }, orders = new Set();
  for (let seed = 1; seed <= 200; seed++) {
    const rnd = seeded(seed * 104729 + 7), o = S.pickOrder(ROAD, (n) => 1 + Math.floor(rnd() * n)), sc = o.order.map((id) => SCENES[id]);
    orders.add(o.order.join(' '));
    assert.equal(sc.length, 5); assert.equal(new Set(o.order).size, 5, 'no scene twice');
    assert.equal(sc[0].act, 'opening'); assert.equal(sc[4].act, 'finale'); assert.ok(sc.slice(1, 4).every((x) => x.act === 'middle'));
    assert.equal(o.charge, sc[0].gives); assert.ok(sc[4].fits.includes(o.charge), 'the finale answers the opening');
    for (let i = 1; i < 3; i++) assert.ok(LEAN[sc[i].lean || 'any'] <= LEAN[sc[i + 1].lean || 'any'], 'early scenes come before late ones');
  }
  assert.ok(orders.size >= 20, 'runs differ: ' + orders.size + ' different orders');
});

test('every hero can play whole runs to an end; HP, Horror and gear carry from scene to scene; the saved hero is never changed', () => {
  let won = 0;
  for (const focus of ['fighter', 'scout', 'scholar', 'healer']) for (const seed of [1, 2, 3, 5, 8, 13, 21]) {
    const { s, seen, unchanged } = playRun(focus, seed);
    assert.ok(['won', 'dead'].includes(s.over), focus + ' ' + seed + ' did not finish');
    assert.ok(unchanged, 'the saved hero was changed');
    if (s.over === 'won') { won++; assert.equal(s.run.at, 4); assert.deepEqual(seen, s.run.order, 'the scenes were played in the order chosen'); }
  }
  assert.ok(won > 0, 'some runs are won');
});

test('between scenes the hero may rest once, then goes on; the next scene starts fresh but the hero does not', () => {
  const rnd = seeded(7), die = (n) => 1 + Math.floor(rnd() * n), s = S.startRun(T.generate('fighter', rnd), 'pilgrim-road', die);
  const api = { end: null }; void api;
  s.hp.cur = 3; s.horror = 4; s.done = true;
  let ch = S.choices(s, null); assert.deepEqual(ch.map((c) => c.cmd), ['rest', 'next']);
  S.act(s, null, 'rest', die); assert.ok(s.hp.cur > 3); ch = S.choices(s, null); assert.deepEqual(ch.map((c) => c.cmd), ['next']);
  const hp = s.hp.cur, horror = s.horror, gear = JSON.stringify(s.hero.gear), first = s.adventure;
  S.act(s, null, 'next', die);
  assert.notEqual(s.adventure, first); assert.equal(s.run.at, 1); assert.equal(s.hp.cur, hp); assert.equal(s.horror, horror); assert.equal(JSON.stringify(s.hero.gear), gear);
  assert.equal(s.done, false); assert.equal(s.rested, false); assert.deepEqual(s.flags, Object.assign({}, s.flags));
});

test("the owner's people of the road: a run meets up to three, never in the last scene, and their names are the owner's", () => {
  const names = globalThis.SacramentSoloCameos.map((c) => c.name);
  assert.deepEqual(names, ['Xian of Wycbold', 'Ser Dom of Cookham', 'Rupert the Druid', 'Matthew of the Brown Order of Farts', 'Lord Biddles of Wooburn']);
  for (let seed = 1; seed <= 50; seed++) {
    const rnd = seeded(seed), s = S.startRun(T.generate('scout', rnd), 'pilgrim-road', (n) => 1 + Math.floor(rnd() * n)), c = s.run.cameos;
    assert.equal(c.length, 5); assert.equal(c[4], ''); const met = c.filter(Boolean); assert.ok(met.length <= 3 && met.length >= 1); assert.equal(new Set(met).size, met.length);
  }
});

test('every scene has a picture for every place and every foe, and every foe shows its Hearts', () => {
  require('../site/solo/art.js');
  const ART = globalThis.SacramentSoloArt;
  for (const id of ROAD.scenes) {
    const sc = SCENES[id]; assert.ok(sc, id);
    for (const r of Object.values(sc.rooms)) assert.ok(ART.scenes.includes(r.art), id + ': no picture ' + r.art);
    for (const [fid, f] of Object.entries(sc.foes || {})) {
      const fake = { hero: T.generate('fighter', seeded(1)), flags: {}, fight: { foe: fid, art: f.art, hp: { cur: f.hp - 3, max: f.hp } } };
      const svg = ART.scene(Object.values(sc.rooms)[0].art, fake, 't');
      assert.ok(svg.includes('class="who foe"'), id + ' ' + fid); assert.equal((svg.match(/clip-path="url\(#tfh\d\)"/g) || []).length, Math.ceil(f.hp / 10), fid + ' Hearts');
    }
  }
});

test('every choice that rolls shows its odds from the real rules, and working out the odds changes nothing', () => {
  const hero = T.generate('fighter', seeded(3));
  const s = S.start(hero, A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  const before = JSON.stringify(s);
  const o = S.odds(s, A, attack.cmd);
  assert.equal(JSON.stringify(s), before, 'the odds changed the game');
  assert.ok(o && o.need >= 1 && o.need <= 21, 'a need between 1 and 21');
  assert.equal(o.chance, Math.max(0, Math.min(20, 21 - o.need)) * 5);
  assert.ok(o.attack, 'an attack is marked as one');
  assert.equal(S.odds(s, A, ''), null);
});

test('the sound effects: every one has a real note or a noise, and the art knows where each foe stands', async () => {
  require('../site/solo/music.js'); require('../site/solo/art.js');
  const M = globalThis.SacramentSoloMusic, ART = globalThis.SacramentSoloArt;
  for (const name of ['hit', 'crit', 'miss', 'hurt', 'horror', 'heart', 'find', 'win']) {
    const fx = M.SFX[name];
    assert.ok(fx && ((fx.n || []).length + (fx.x || []).length) > 0, name + ' makes a sound');
    for (const n of fx.n || []) assert.ok(M.freq(n[1]) > 0, name + ': ' + n[1] + ' is a real note');
  }
  for (const place of ['crypt', 'cloister', 'nowhere']) { const p = ART.spot(place); assert.equal(p.length, 3); }
  for (const [place, p] of Object.entries(ART.paintings)) {
    const fs = await import('node:fs');
    assert.ok(fs.existsSync(new URL('../site' + p.src, import.meta.url)), place + ' painting exists');
    assert.ok(ART.scene(place, null, 'p').includes(p.src), place + ' shows its painting');
  }
});
