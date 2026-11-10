// The solo adventure (site/solo/): the engine plays the written scene with the table's own rules, and never changes the hero it was given.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
globalThis.window = globalThis;
for (const f of ['vtt/rules.js', 'sheet/gear.js', 'sheet/sheet-core.js', 'sheet/heroes.js', 'sheet/hero-tools.js', 'solo/engine.js', 'solo/adventure-silent-bell.js', 'solo/road.js', 'solo/road-wilds.js', 'solo/road-far.js']) require('../site/' + f);
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
    assert.ok(['won', 'dead', 'fled'].includes(s.over), focus + ' seed ' + seed + ' did not finish');   // fled: crawled away while dying (owner, 2026-11-06)
    assert.ok(unchanged, 'the saved hero was changed');
    assert.ok(s.horror >= 0 && s.horror <= R.HORROR.max && s.hp.cur >= 0 && s.hp.cur <= s.hp.max);
  }
});

test('a ready-made hero can start from every path (as on My heroes), keeps that path, and can play the scene to an end', () => {
  const C = globalThis.SacramentSheetCore;
  assert.ok(C.PATHS.length >= 20);
  for (const path of C.PATHS) {
    const hero = T.generate(path, seeded(7));
    assert.equal(hero.path, path, path + ' did not keep its path');
    assert.ok(T.KIT_HELP[T.KIT[path]] && C.PATH_ABOUT[path], path + ' has no words to explain it on the solo start screen');
    const { s } = playThrough(path, 3);
    assert.ok(['won', 'dead', 'fled'].includes(s.over), path + ' did not finish');
  }
  assert.ok(C.PATHS.includes(T.generate('random', seeded(4)).path), 'Surprise me gives a real path');
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
  assert.deepEqual(S.sceneInfo(s, A), { target: 12, dark: false, time: '' });
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
    assert.ok(['won', 'dead', 'fled'].includes(s.over), focus + ' ' + seed + ' did not finish');
    assert.ok(unchanged, 'the saved hero was changed');
    if (s.over === 'won') { won++; assert.equal(s.run.at, 4); assert.deepEqual(seen, s.run.order, 'the scenes were played in the order chosen'); }
  }
  assert.ok(won > 0, 'some runs are won');
});

test('between scenes the hero may rest once, then goes on; the next scene starts fresh but the hero does not', () => {
  const rnd = seeded(7), die = (n) => 1 + Math.floor(rnd() * n), s = S.startRun(T.generate('fighter', rnd), 'pilgrim-road', die);
  const api = { end: null }; void api;
  s.hp.cur = 3; s.horror = 4; s.done = true;
  /* going on is a fork in the road when the next scene is in the middle (see the forks test): the two roads, or one Go on */
  const onward = () => { const f = S.forkAt(s); return f ? f.map((id) => 'next ' + id) : ['next']; };
  let ch = S.choices(s, null); assert.deepEqual(ch.map((c) => c.cmd), ['rest'].concat(onward()));
  S.act(s, null, 'rest', die); assert.ok(s.hp.cur > 3); ch = S.choices(s, null); assert.deepEqual(ch.map((c) => c.cmd), onward());
  const hp = s.hp.cur, horror = s.horror, gear = JSON.stringify(s.hero.gear), first = s.adventure;
  S.act(s, null, 'next', die);
  assert.notEqual(s.adventure, first); assert.equal(s.run.at, 1); assert.equal(s.hp.cur, hp); assert.equal(s.horror, horror); assert.equal(JSON.stringify(s.hero.gear), gear);
  assert.equal(s.done, false); assert.equal(s.rested, false); assert.deepEqual(s.flags, Object.assign({}, s.flags));
});

test("the owner's people of the road: a run meets up to two, never in the last scene, and their names are the owner's", () => {
  const names = globalThis.SacramentSoloCameos.map((c) => c.name);
  assert.deepEqual(names, ['Xian of Wycbold', 'Ser Dom of Cookham', 'Rupert the Druid', 'Matthew of the Brown Order of Farts', 'Lord Biddles of Wooburn', 'Rachel, Witch-finder General', 'Simon the Scholar', 'Gussetweasel, the Necromancer']);
  for (let seed = 1; seed <= 50; seed++) {
    const rnd = seeded(seed), s = S.startRun(T.generate('scout', rnd), 'pilgrim-road', (n) => 1 + Math.floor(rnd() * n)), c = s.run.cameos;
    assert.equal(c.length, 5); assert.equal(c[4], ''); const met = c.filter(Boolean); assert.ok(met.length <= 2 && met.length >= 1); assert.equal(new Set(met).size, met.length);
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

test('the sound effects: every one has a real note or a noise, and the art knows where each foe stands, and every place is drawn', async () => {
  require('../site/solo/music.js'); require('../site/solo/art.js');
  const M = globalThis.SacramentSoloMusic, ART = globalThis.SacramentSoloArt;
  for (const name of ['hit', 'crit', 'miss', 'hurt', 'horror', 'heart', 'find', 'win']) {
    const fx = M.SFX[name];
    assert.ok(fx && ((fx.n || []).length + (fx.x || []).length) > 0, name + ' makes a sound');
    for (const n of fx.n || []) assert.ok(M.freq(n[1]) > 0, name + ': ' + n[1] + ' is a real note');
  }
  for (const place of ['crypt', 'cloister', 'nowhere']) { const p = ART.spot(place); assert.equal(p.length, 3); }
  for (const place of ['crossroads', 'cloister', 'shrine']) assert.ok(ART.scene(place, null, 'd').includes('<path'), place + ' is drawn');
  for (const [place, p] of Object.entries(ART.paintings)) {
    const fs = await import('node:fs');
    assert.ok(fs.existsSync(new URL('../site' + p.src, import.meta.url)), place + ' painting exists');
    assert.ok(ART.scene(place, null, 'p').includes(p.src), place + ' shows its painting');
  }
});

// Step 3: the solo game's own GM calls for Horror and falling (the owner's, 2026-11-06). The rules leave these to the GM; nothing in rules.js changes.
function cryptFight(seed) {
  const hero = T.generate('fighter', seeded(seed || 3));
  const s = S.start(hero, A, fixed([1]));
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  assert.ok(s.fight, 'the Candle-Eater attacks in the crypt');
  return s;
}

test('Horror 7 shakes the hero: the next check or attack is Hard, once', () => {
  const s = cryptFight();
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([5, 1]));                 // a miss
  s.horror = 6;
  const push = S.choices(s, A).find((c) => c.kind === 'push');
  S.act(s, A, push.cmd, fixed([5, 5]));                  // the push takes Horror to 7
  assert.equal(s.horror, 7);
  const rolls = s.log.filter((l) => l.outcome);
  assert.equal(rolls[rolls.length - 1].outcome.note, 'Hard', 'the pushed attack was Hard');
  assert.equal(s.shaken, false, 'shaken is used up');
});

test('Horror 14 hunts the hero: every foe met from then on has 2 more HP; Horror 21 stops resting', () => {
  const hero = T.generate('fighter', seeded(3));
  const s = S.start(hero, A, fixed([1]));
  s.hunted = true;
  S.act(s, A, 'go north', fixed([1])); S.act(s, A, 'go down', fixed([1]));
  assert.equal(s.fight.hp.max, A.foes[s.fight.foe].hp + S.DREAD.huntedHp);
  const run = S.startRun(T.generate('scout', seeded(4)), 'pilgrim-road', fixed([1]));
  run.done = true; run.hp.cur = 1; run.arrived = true;
  assert.ok(!S.choices(run).some((c) => c.cmd === 'rest'), 'no rest once the Horror has arrived');
  run.arrived = false;
  assert.ok(S.choices(run).some((c) => c.cmd === 'rest'));
});

test('once the Horror has arrived, no scene offers its own rest either (the barn\'s "Sleep in the sheaves" did)', () => {
  const ADV = globalThis.SacramentSoloAdventures, found = [];
  for (const [id, adv] of Object.entries(ADV)) for (const [room, r] of Object.entries(adv.rooms || {})) for (const x of r.actions || []) if (x.id === 'rest') found.push([id, adv, room]);
  assert.ok(found.length >= 6, 'the scenes with a rest of their own were found');
  for (const [id, adv, room] of found) {
    const s = S.start(T.generate('fighter', seeded(3)), adv, fixed([1]));
    s.room = room; s.fight = null; s.hp.cur = 1; s.horror = R.HORROR.max;   // the ossuary opens with a fight: as if it were won
    for (const f of ['talked', 'calm', 'beat_penitent', 'beat_wraith']) s.flags[f] = true;   // whatever each scene asks before its rest is offered
    assert.ok(S.choices(s, adv).some((c) => c.cmd === 'do rest'), id + ': the rest is offered before the Horror arrives');
    s.arrived = true;
    assert.ok(!S.choices(s, adv).some((c) => c.cmd === 'do rest'), id + ': no rest button once the Horror has arrived');
    const said = S.act(s, adv, 'do rest', fixed([1])).map((l) => l.t).join(' ');
    assert.equal(s.hp.cur, 1, id + ': typing it does not heal'); assert.equal(s.horror, R.HORROR.max, id + ': nor lower the Horror'); assert.equal(s.rested, false);
    assert.match(said, /no more rest/, id);
    assert.ok(!S.act(s, adv, 'sleep', fixed([1])).some((l) => /Rest:|The Horror falls/.test(l.t)), id + ': nor does the typed word "sleep"');
  }
});

test('falling: a hero at 0 HP is dying with a d4 of rounds, a round passing takes one off, and crawling away gets them out with 1 HP', () => {
  const s = cryptFight();
  s.hp.cur = 1;
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([5, 1]));                 // miss
  S.act(s, A, 'foe', fixed([20, 6, 3]));                 // the foe hits (natural 20), 6 damage, the fall rolls d4 3; the round passing takes one off
  assert.ok(!s.over, 'falling is not the end');
  assert.deepEqual([s.hp.cur, s.dying.left], [0, 2]);
  const ch = S.choices(s, A).map((c) => c.cmd);
  assert.ok(ch.includes('crawl'), 'crawl away is offered');
  assert.ok(!ch.some((c) => c.startsWith('use') && !S.heroActions(s).find((a) => 'use ' + a.index === c.split(' ').slice(0, 2).join(' ') && a.healing)), 'only healing besides crawling');
  s.found = ['candle']; s.hero.gear.push({ id: 'candle', eq: false });
  const gear = s.hero.gear.length;
  S.act(s, A, 'crawl', fixed([20]));                      // a CON check, natural 20
  assert.equal(s.dying, null); assert.equal(s.hp.cur, 1); assert.equal(s.fight, null);
  assert.equal(s.hero.gear.length, gear - 1, 'what was found in the scene is left behind');
  assert.equal(s.over, 'fled', 'a single scene ends with the hero alive but gone');
});

test('a dying hero whose rounds run out is dead; a blow on a dying hero takes a round instead of HP', () => {
  const s = cryptFight();
  s.hp.cur = 1;
  S.act(s, A, S.choices(s, A).find((c) => c.kind === 'attack').cmd, fixed([5, 1]));
  S.act(s, A, 'foe', fixed([20, 6, 2]));                 // falls with 2 rounds, one passes: 1 left
  assert.equal(s.dying.left, 1);
  S.act(s, A, 'crawl', fixed([2]));                       // the crawl fails: the turn passes to the foe
  S.act(s, A, 'foe', fixed([20, 6]));                    // a blow gets through: the last round
  assert.equal(s.over, 'dead');
});

test('the foe card says what the foe will do next, from the real numbers, and bracing makes it harder', () => {
  const s = cryptFight();
  const card = S.cards(s, A).find((c) => c.kind === 'foe');
  const i = S.foeIntent(s);
  assert.match(card.next, /^Next: attacks\. Hits you on \d+\+ \(\d+%\), d\d+ damage$/);
  S.act(s, A, 'brace', fixed([1]));
  assert.equal(s.fight.guard, 2); assert.equal(s.fight.phase, 'foe');
  assert.equal(S.foeIntent(s).need, Math.min(20, i.need + 2));
});

test('finds from the road: only what was found and is still carried can come home', () => {
  const s = S.startRun(T.generate('fighter', seeded(3)), 'pilgrim-road', fixed([1]));
  s.run.found = ['candle', 'candle'];
  s.hero.gear.push({ id: 'candle', eq: false });
  const carried = s.hero.gear.filter((g) => g.id === 'candle').length;
  assert.equal(S.runFinds(s).length, Math.min(2, carried), 'two found, as many carried as can come home');
  s.hero.gear = s.hero.gear.filter((g) => g.id !== 'candle');
  assert.deepEqual(S.runFinds(s), [], 'nothing carried, nothing comes home');
});

// Obstacles (the owner's ask, 2026-11-06): several ways through, each with a trade-off, and a clock that makes dawdling cost.
const ADVS = globalThis.SacramentSoloAdventures;
test('every obstacle offers a bold way and a trick besides the steady one, with real scores', () => {
  for (const adv of Object.values(ADVS)) for (const [id, ob] of Object.entries(adv.obstacles || {})) {
    const kinds = (ob.ways || []).map((w) => w.kind).sort();
    assert.deepEqual(kinds, ['bold', 'trick'], adv.id + ' ' + id + ' has a bold way and a trick');
    for (const w of ob.ways) assert.ok(R.STATS.includes(w.stat), adv.id + ' ' + id + ' ' + w.id + ' rolls a real score');
    if (ob.clock) assert.ok(adv.timers[ob.clock] && adv.timers[ob.clock].tick === 'fail', adv.id + ' ' + id + ' has a clock that runs on failed tries');
  }
});

test('the bold way rolls Weapons Effort and a failure hurts; the trick works once and fills half of what is left', () => {
  const cart = ADVS.cart, hero = T.generate('fighter', seeded(3));
  let s = S.start(hero, cart, fixed([1]));
  assert.ok(S.choices(s, cart).some((c) => c.cmd === 'way wheel lift'));
  S.act(s, cart, 'way wheel lift', fixed([20, 6]));                 // natural 20 succeeds; Weapons Effort d6 shows 6
  assert.ok(s.bars.wheel >= 6, 'a d6 went in: ' + s.bars.wheel);
  s = S.start(hero, cart, fixed([1]));
  const hp = s.hp.cur;
  S.act(s, cart, 'way wheel lift', fixed([2, 3]));                  // a miss; the strain costs d4 3
  assert.equal(s.hp.cur, hp - 3);
  s = S.start(hero, cart, fixed([1]));
  S.act(s, cart, 'way wheel pack', fixed([20]));
  assert.equal(s.bars.wheel, 3, 'half of 6');
  assert.ok(!S.choices(s, cart).some((c) => c.cmd === 'way wheel pack'), 'the trick is used up');
});

test('a clock: each failed try at the wheel brings the rain, and once it comes every try is Hard', () => {
  const cart = ADVS.cart, s = S.start(T.generate('fighter', seeded(3)), cart, fixed([1]));
  assert.equal(s.timers.rain.cur, 4, 'the clock starts when you arrive');
  for (let i = 0; i < 4; i++) S.act(s, cart, 'do wheel', fixed([2]));
  assert.equal(s.flags.rain, true);
  S.act(s, cart, 'do wheel', fixed([15, 1]));
  const last = s.log.filter((l) => l.outcome).at(-1);
  assert.equal(last.outcome.note, 'Hard');
});

test('the salt line: when its clock runs out, the Salt Hag comes with the line still broken; the tower door\'s first loud failure rouses the Candle-Eater', () => {
  const shrine = ADVS.shrine, s = S.start(T.generate('scholar', seeded(5)), shrine, fixed([1]));
  for (let i = 0; i < 4 && !s.fight; i++) S.act(s, shrine, 'do salt', fixed([2]));
  assert.ok(s.fight && s.fight.foe === 'hag' && !s.flags.mended);
  const b = S.start(T.generate('fighter', seeded(3)), A, fixed([1]));
  S.act(b, A, 'go north', fixed([1])); S.act(b, A, 'way door kick', fixed([2, 2]));
  assert.ok(b.fight && b.fight.foe === 'eater', 'the noise brings it up the stair');
});

/* ---------- story spells and items: their tags come from the shared gear list (owner, 2026-11-06) ---------- */
const G = globalThis.SACRAMENT_GEAR, CORE = globalThis.SacramentSheetCore;
test('every story spell and story item carries tags from the shared list, except the two that stay the GM\'s call', () => {
  const ids = new Set(G.tags.map((t) => t.id)), untagged = ['lastverse', 'realname'];
  for (const t of G.tags) { assert.ok(t.name && (t.fight || t.out), t.id); }
  const story = [...G.spells.filter((x) => !x.effort || x.effect === 'esoteric'), ...[...G.items, ...G.relics, ...G.found].filter((x) => x.effect === 'esoteric' && !x.legacyEdition)];
  for (const x of story) {
    if (untagged.includes(x.id)) { assert.ok(!x.tags, x.id); continue; }
    assert.ok(x.tags && x.tags.length, x.id + ' has tags'); for (const t of x.tags) assert.ok(ids.has(t), x.id + ': ' + t);
    assert.ok(!x.needs || ['corpse', 'undead'].includes(x.needs), x.id);
  }
  assert.match(CORE.tagText(G.spells.find((x) => x.id === 'pillarash')), /Hide\. In a fight: .*rolls 3 less\. Out of a fight: /);
});

test('Pillar of Ash (hide): in a fight the foe\'s next attack rolls 3 less; at the ford it hides the crossing, half of what is left, once', () => {
  let { s, die } = withBook('embers'); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  const ash = cast(s, 'Pillar of Ash'); assert.ok(ash && !ash.idle); S.act(s, A, ash.cmd, die); assert.equal(s.fight.dim, 3);
  const ford = ADVS.ford, hero = T.generate('scholar', seeded(4)); hero.gear = [{ id: 'embers', eq: true }];
  const f = S.start(hero, ford, fixed([10])); assert.equal(f.room, 'bank');
  const c = S.choices(f, ford).find((x) => x.label.includes('Pillar of Ash')); assert.ok(c && !c.idle, 'it has a use at the ford');
  S.act(f, ford, c.cmd, fixed([10])); assert.equal(f.bars.ford, 3, 'half of 6');
  assert.equal(f.flags.tag_ford_hide, true, 'once per obstacle');
  assert.ok(f.fight && f.fight.foe === 'acolyte', 'halfway over, the thing in the water comes, as the ford says');
});

test('bind holds a foe only after a successful check; a story item is offered and used like a spell', () => {
  let { s } = withBook('mourningfrost'); const die = fixed([20, 10]); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  const ice = cast(s, 'Black Ice'); assert.ok(ice && !ice.idle); S.act(s, A, ice.cmd, die); assert.equal(s.fight.skip, 1, 'held: it loses its next attack');
  const hero = T.generate('fighter', seeded(3)); hero.gear = [{ id: 'boneflute', eq: false }];
  const b = S.start(hero, A, fixed([10])); S.act(b, A, 'go north', fixed([10])); S.act(b, A, 'go down', fixed([10]));
  const flute = S.choices(b, A).find((x) => x.label.startsWith('Use ') && /flute/i.test(x.label)); assert.ok(flute && !flute.idle, 'the flute is offered in a fight');
  S.act(b, A, flute.cmd, fixed([20])); assert.equal(b.fight.dim, 3, 'Dazed, as its words say');
});

/* ---------- more scenes on the road (owner, 2026-11-06): the hospice, the charcoal wood, the toll bridge ---------- */
test('three new middle scenes join the road, and each gives the spell tags something to answer', () => {
  for (const id of ['hospice', 'wood', 'bridge']) { assert.ok(ROAD.scenes.includes(id), id); assert.equal(ADVS[id].act, 'middle'); }
  /* the hospice: salt at the door burns the Lullaby Sister, knowing her name makes the first blow Easy, and Hush silences her song */
  const hospice = ADVS.hospice, hero = T.generate('scholar', seeded(4)); hero.gear = [{ id: 'quietmouths', eq: true }, { id: 'saltpouch', eq: false }];
  let s = S.start(hero, hospice, fixed([20]));
  S.act(s, hospice, 'do salt', fixed([20])); S.act(s, hospice, 'do register', fixed([20])); S.act(s, hospice, 'do wait', fixed([20]));
  assert.equal(s.fight.foe, 'sister'); assert.equal(s.fight.hp.cur, 8, 'the salt burned her'); assert.ok(s.fight.easy >= 1);
  S.act(s, hospice, cast(s, 'Hush').cmd, fixed([10])); assert.equal(s.fight.skip, 1, 'she cannot sing: she loses her next attack');
  /* the wood: three failed tries bring the Cinder Boar out of the smoke; snuffing its fire costs it an attack */
  const wood = ADVS.wood, h2 = T.generate('scholar', seeded(4)); h2.gear = [{ id: 'processional', eq: true }];
  s = S.start(h2, wood, fixed([2]));
  for (let i = 0; i < 3; i++) S.act(s, wood, 'do cut', fixed([2]));
  assert.equal(s.fight && s.fight.foe, 'boar');
  S.act(s, wood, cast(s, 'Snuffed Candle').cmd, fixed([10])); assert.equal(s.fight.skip, 1);
  /* the bridge: nobody crosses until the toll-keeper is answered or beaten, not even by a spell */
  const bridge = ADVS.bridge, h3 = T.generate('scholar', seeded(4)); h3.gear = [{ id: 'lodestone', eq: true }];
  s = S.start(h3, bridge, fixed([10]));
  assert.ok(!S.choices(s, bridge).some((c) => /way span|do cross/.test(c.cmd)), 'the toll-keeper stands in the road');
  const beam = cast(s, 'Held Beam'); assert.ok(beam && beam.idle, 'no spell gets you past him either');
  S.act(s, bridge, 'do answer', fixed([20])); assert.equal(s.flags.passed, true);
  assert.ok(S.choices(s, bridge).some((c) => c.cmd === 'way span sound'));
  S.act(s, bridge, cast(s, 'Held Beam').cmd, fixed([20])); assert.equal(s.bars.span, 3, 'the bridge holds still: half of what is left');
});

test('a third reason to be on the road: the Inquisitor\'s warrant opens it, the barrow ends it, and the road talks about the deacon', () => {
  assert.equal(ADVS.warrant.gives, 'warrant'); assert.deepEqual(ADVS.barrow.fits, ['warrant']);
  let warrantRuns = 0;
  for (let seed = 1; seed <= 120; seed++) {
    const rnd = seeded(seed * 7919 + 3), o = S.pickOrder(ROAD, (n) => 1 + Math.floor(rnd() * n));
    if (o.charge === 'warrant') { warrantRuns++; assert.equal(o.order[0], 'warrant'); assert.equal(o.order[4], 'barrow'); }
  }
  assert.ok(warrantRuns > 10, 'about a third of runs hunt the deacon: ' + warrantRuns);
  /* the opening: the warrant, then the pardoner talks (or is beaten) and tells you how the deacon moves */
  const W = ADVS.warrant, hero = T.generate('fighter', seeded(3));
  let s = S.start(hero, W, fixed([20]));
  assert.ok(!S.choices(s, W).some((c) => c.cmd === 'do go'), 'not before the Inquisitor has spoken');
  S.act(s, W, 'do inquisitor', fixed([20])); assert.equal(s.flags.warrant, true);
  S.act(s, W, 'do pardoner', fixed([20])); assert.equal(s.flags.notes, true, 'he talks');
  s = S.start(hero, W, fixed([2])); S.act(s, W, 'do inquisitor', fixed([2])); S.act(s, W, 'do pardoner', fixed([2]));
  assert.equal(s.fight && s.fight.foe, 'pardoner', 'he had a knife up his sleeve');
  /* the finale: the deacon casts, so Hush stops him; knowing his ways makes the first blow Easy; or he can be talked down */
  const B = ADVS.barrow, scholar = T.generate('scholar', seeded(4)); scholar.gear = [{ id: 'quietmouths', eq: true }];
  s = S.start(scholar, B, fixed([10])); s.flags.notes = true;
  S.act(s, B, 'do rush', fixed([10])); assert.equal(s.fight.foe, 'deacon'); assert.ok(s.fight.easy >= 1);
  S.act(s, B, cast(s, 'Hush').cmd, fixed([10])); assert.equal(s.fight.skip, 1, 'he cannot read aloud: he loses his next attack');
  s = S.start(scholar, B, fixed([20])); S.act(s, B, 'do call', fixed([20])); assert.equal(s.flags.yielded, true); assert.ok(!s.fight);
  S.act(s, B, 'do lead', fixed([20])); assert.equal(s.over, 'won');
  /* the road knows which charge the hero carries */
  const pit = ADVS.pit, api = { charge: () => 'warrant', flag: () => false };
  assert.match(pit.rooms.pit.secret(api), /deacon/); assert.match(ADVS.hospice.rooms.ward.secret(api), /deacon/); assert.match(ADVS.wood.rooms.wood.secret(api), /deacon/);
  assert.match(ADVS.bridge.rooms.bridge.secret(api), /deacon/); assert.match(ADVS.gibbet.rooms.gibbet.secret(api), /deacon/); assert.match(ADVS.field.rooms.field.secret(api), /deacon/);
});

test('three more middle scenes: the plague pit, the players at the inn, and the old battlefield, each with more than one way through', () => {
  for (const id of ['pit', 'inn', 'field']) { assert.ok(ROAD.scenes.includes(id), id); assert.equal(ADVS[id].act, 'middle'); assert.ok(!ADVS[id].fits, id + ' fits every charge'); }
  const hero = T.generate('fighter', seeded(5));
  /* the pit: three failed tries and the Pit Ghoul climbs out; a full pit buries it, and the sexton pays you */
  const P = ADVS.pit;
  let s = S.start(hero, P, fixed([2])); for (let i = 0; i < 3; i++) S.act(s, P, 'do shovel', fixed([2]));
  assert.equal(s.fight && s.fight.foe, 'ghoul');
  s = S.start(hero, P, fixed([20])); for (let i = 0; i < 6 && !s.flags.filled; i++) S.act(s, P, 'do shovel', fixed([20]));
  assert.equal(s.flags.filled, true); assert.ok(!s.fight); assert.equal(s.flags.thanked, true);
  /* the inn: one player is a stranger; name the right one and your first blow is Easy, name the wrong one and the Horror rises */
  const I = ADVS.inn;
  s = S.start(hero, I, fixed([2])); assert.equal(s.flags.false, 'demon');
  S.act(s, I, 'do watch', fixed([20])); assert.equal(s.flags.clued, true);
  S.act(s, I, 'do accuse_demon', fixed([20])); assert.equal(s.fight.foe, 'mummer'); assert.ok(s.fight.easy >= 1); assert.equal(s.horror, 0);
  s = S.start(hero, I, fixed([2])); S.act(s, I, 'do accuse_saint', fixed([10])); assert.equal(s.fight.foe, 'mummer'); assert.equal(s.fight.easy, 0); assert.equal(s.horror, 1);
  assert.match(I.rooms.yard.secret({ flag: () => 'fool' }), /the Fool/, 'learning the yard\'s secret names the stranger');
  /* the field: give the knight his rites and he lies down; fail them, or take his challenge, and he fights */
  const F = ADVS.field;
  s = S.start(hero, F, fixed([20])); S.act(s, F, 'do rites', fixed([20])); assert.equal(s.flags.rites, true); assert.ok(!s.fight);
  S.act(s, F, 'do go', fixed([20])); assert.equal(s.over, 'won');
  s = S.start(hero, F, fixed([2])); S.act(s, F, 'do rites', fixed([2])); assert.equal(s.fight.foe, 'knight');
  s = S.start(hero, F, fixed([2])); for (let i = 0; i < 3; i++) S.act(s, F, 'do cross', fixed([2])); assert.equal(s.fight && s.fight.foe, 'knight', 'three failed tries and he sees you');
});

test('iPhone: turning the sound on asks to play as media, so the silent switch does not mute it; turning it off lets go', () => {
  require('../site/solo/music.js');
  const M = globalThis.SacramentSoloMusic, played = [], node = () => ({ connect() {}, gain: { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, frequency: { value: 0 } });
  const saved = { AudioContext: globalThis.AudioContext, Audio: globalThis.Audio, nav: Object.getOwnPropertyDescriptor(globalThis, 'navigator'), ls: globalThis.localStorage };
  globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
  globalThis.AudioContext = class { constructor() { this.state = 'suspended'; this.sampleRate = 8000; this.currentTime = 0; this.destination = {}; }
    createGain() { return node(); } createPeriodicWave() { return {}; } createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    resume() { this.state = 'running'; } suspend() { this.state = 'suspended'; } };
  globalThis.Audio = class { constructor(src) { this.src = src; this.attrs = {}; } setAttribute(k, v) { this.attrs[k] = v; } play() { played.push(this); this.paused = false; return Promise.resolve(); } pause() { this.paused = true; } };
  const session = {}; Object.defineProperty(globalThis, 'navigator', { value: { audioSession: session }, configurable: true });
  try {
    assert.equal(M.setOn(true), true);
    assert.equal(session.type, 'playback', 'newer Safari: the page plays as media');
    assert.equal(played.length, 1, 'older Safari: a silent sound plays alongside');
    assert.match(played[0].src, /^data:audio\/wav;base64,UklGR/); assert.equal(played[0].loop, true); assert.ok('playsinline' in played[0].attrs);
    M.setOn(false); assert.equal(played[0].paused, true, 'off means nothing keeps playing');
  } finally {
    M.setOn(false);
    globalThis.AudioContext = saved.AudioContext; globalThis.Audio = saved.Audio; globalThis.localStorage = saved.ls;
    if (saved.nav) Object.defineProperty(globalThis, 'navigator', saved.nav); else delete globalThis.navigator;
  }
});

test('forks in the road: after a scene the hero chooses between two next places, and the order stays sensible', () => {
  const LEAN = { early: 0, any: 1, late: 2 }, hero = T.generate('fighter', seeded(9));
  for (const id of ROAD.scenes.filter((x) => SCENES[x].act === 'middle')) assert.ok(SCENES[id].tease, id + ' has a line for the fork');
  let forks = 0, swaps = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const rnd = seeded(seed * 31 + 5), die = (n) => 1 + Math.floor(rnd() * n), s = S.startRun(hero, 'pilgrim-road', die);
    assert.ok(Array.isArray(s.run.spare) && s.run.spare.length > 0, 'the roads not taken are kept');
    for (let at = 0; at < 4; at++) {
      s.done = true; s.fight = null; s.dying = null; s.over = '';
      const fork = S.forkAt(s), ch = S.choices(s, SCENES[s.adventure]);
      if (at === 3) { assert.equal(fork, null, 'no fork before the finale'); break; }
      if (!fork) { assert.ok(ch.some((c) => c.cmd === 'next')); S.act(s, SCENES[s.adventure], 'next', die); continue; }
      forks++;
      assert.equal(fork.length, 2); assert.notEqual(fork[0], fork[1]);
      const roads = ch.filter((c) => c.cmd.startsWith('next '));
      assert.equal(roads.length, 2); assert.ok(roads.every((c) => c.label.startsWith('Take the road to ') && c.hint));
      assert.ok(!ch.some((c) => c.cmd === 'next'), 'no plain Go on button at a fork');
      const pickId = fork[die(2) - 1]; if (pickId !== fork[0]) swaps++;
      S.act(s, SCENES[s.adventure], 'next ' + pickId, die);
      assert.equal(s.adventure, pickId, 'the hero goes where they chose');
    }
    const o = s.run.order, sc = o.map((id) => SCENES[id]);
    assert.equal(new Set(o).size, 5, 'no scene twice'); assert.equal(sc[4].act, 'finale');
    for (let i = 1; i < 3; i++) assert.ok(LEAN[sc[i].lean || 'any'] <= LEAN[sc[i + 1].lean || 'any'], 'early scenes still come before late ones: ' + o.join(' '));
  }
  assert.ok(forks > 100, 'most steps of the road fork: ' + forks); assert.ok(swaps > 20, 'and the other road is taken sometimes: ' + swaps);
});

test('the end of a run: the end card says where the hero went, what they beat, what they carried, the highest Horror and a closing line', () => {
  require('../site/solo/art.js');
  const ART = globalThis.SacramentSoloArt, ends = new Set();
  for (const focus of ['fighter', 'scout', 'scholar', 'healer']) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const { s } = playRun(focus, seed);
    if (!s.over) continue;
    const sum = S.summary(s); ends.add(sum.end);
    assert.equal(sum.hero, s.hero.name); assert.equal(sum.end, s.over); assert.equal(sum.total, 5);
    assert.deepEqual(sum.places, s.run.order.slice(0, s.run.at + 1).map((id) => SCENES[id].title), 'the places walked, in order');
    if (s.over === 'won') { assert.equal(sum.places.length, 5); assert.ok(sum.beaten.length >= 1, 'a won road beat at least one foe'); }
    assert.ok(sum.peak >= s.horror && sum.peak <= R.HORROR.max, 'the highest Horror is at least where it ended');
    assert.ok(ROAD.endings[s.over].includes(sum.line), 'the closing line fits how the road ended');
    assert.deepEqual(S.summary(s).line, sum.line, 'the same run always shows the same line');
    const svg = ART.endCard(sum, s, '7 Nov 2026');
    assert.ok(svg.startsWith('<svg') && svg.includes(sum.places[0]) && svg.includes('7 Nov 2026') && !/<script|<image/.test(svg));
  }
  assert.ok(ends.size >= 2, 'runs end in more than one way: ' + [...ends].join(', '));
  const odd = ART.endCard({ hero: 'A <b>&"', places: ['X'], beaten: [], finds: [], peak: 0, horrorMax: 21, end: 'dead', total: 5, line: '' }, null, '');
  assert.ok(odd.includes('A &lt;b&gt;&amp;&quot;') && !odd.includes('<b>'), 'names are written safely into the picture');
});

test('the new people of the road: Rachel, Witch-finder General gives Holy Oil; Simon the Scholar makes the first attack on the next foe Easy', () => {
  const priory = (who) => {
    for (let seed = 1; seed < 200; seed++) {
      const rnd = seeded(seed), die = (n) => 1 + Math.floor(rnd() * n), s = S.startRun(T.generate('fighter', seeded(4)), 'pilgrim-road', die);
      if (s.adventure === 'priory') { s.run.cameos[0] = who; return { s, die }; }
    }
    throw new Error('no run opened at the priory');
  };
  { const { s, die } = priory('rachel'), had = s.hero.gear.filter((g) => g.id === 'oil').length;
    assert.ok(S.choices(s, null).some((c) => c.cmd === 'meet rachel'), 'Rachel is met where the scene begins');
    S.act(s, null, 'meet rachel', die);
    assert.equal(s.hero.gear.filter((g) => g.id === 'oil').length, had + 1, 'a Flask of Holy Oil, from the gear list');
    assert.ok(s.log.some((l) => l.t.includes('Rachel, Witch-finder General'))); }
  { const { s, die } = priory('simon');
    S.act(s, null, 'meet simon', die);
    const q = globalThis.SacramentSoloCameos.find((c) => c.id === 'simon').riddles[s.flags.riddle_simon.i];
    S.act(s, null, S.choices(s, null).find((c) => c.label === q.a[0]).cmd, die);   /* the right answer to his riddle */
    assert.equal(s.run.story.forewarned, true);
    S.act(s, null, 'go down', die);
    assert.ok(s.fight, 'the rats in the undercroft'); assert.equal(s.fight.easy, 1, 'the first attack is Easy'); assert.ok(!s.run.story.forewarned, 'used up on that foe'); }
});

test('Flask of Holy Oil works as the gear list says: against the unquiet dead the anointed weapon rolls one Effort die bigger, until the scene ends', () => {
  assert.match(globalThis.SacramentSheetCore.item('oil').does, /Effort steps up one size against the unquiet dead/);
  const hero = T.generate('fighter', seeded(4)); hero.gear.push({ id: 'oil' });
  const sceneId = Object.keys(SCENES).find((id) => Object.values(SCENES[id].foes || {}).some((f) => f.undead));
  const adv = SCENES[sceneId], [foeId, def] = Object.entries(adv.foes).find(([, f]) => f.undead);
  const s = S.start(hero, adv, fixed([1]));
  const fight = (undead) => ({ foe: foeId, art: def.art, undead, name: def.name, hp: { cur: 40, max: 40 }, attack: 0, damage: 4, round: 1, phase: 'hero', pending: null, easy: 0, dim: 0, guard: 0, skip: 0, learned: false });
  s.fight = fight(false);
  assert.ok(!S.choices(s, adv).some((c) => c.cmd === 'anoint'), 'no use against the living');
  s.fight = fight(true);
  assert.ok(S.choices(s, adv).some((c) => c.cmd === 'anoint' && c.label === 'Use Flask of Holy Oil'), 'offered against the dead');
  S.act(s, adv, 'anoint', fixed([1]));
  assert.equal(s.fight.phase, 'foe', 'it takes your action'); assert.equal(s.hero.gear.find((g) => g.id === 'oil').uses, 1, 'one of 2 uses spent');
  assert.ok(!S.choices(s, adv).some((c) => c.cmd === 'anoint'), 'once is enough for the scene');
  S.act(s, adv, 'foe', fixed([1]));   // a natural 1: the foe misses
  const attack = S.choices(s, adv).find((c) => c.kind === 'attack' && c.cmd.startsWith('use '));
  S.act(s, adv, attack.cmd, fixed([18])); assert.equal(s.fight.phase, 'damage');
  S.act(s, adv, 'damage', fixed([8]));
  assert.ok(s.log.some((l) => /\bd8 8\b/.test(l.t)), 'the weapon Effort die is a d8, not a d6: ' + s.log.at(-3).t);
  s.fight.undead = false; s.fight.phase = 'hero';
  S.act(s, adv, attack.cmd, fixed([18])); S.act(s, adv, 'damage', fixed([8]));
  assert.ok(/\bd6 6\b/.test(s.log.filter((l) => l.k === 'win').at(-1).t), 'against the living it stays a d6');
});

test('night falls along the road: evening, then dusk from scene 3, and the finale at night, where every place is dark under the Rules page\'s own darkness rule', () => {
  require('../site/solo/art.js');
  const ART = globalThis.SacramentSoloArt, rnd = seeded(12), die = (n) => 1 + Math.floor(rnd() * n);
  const hero = T.generate('scholar', seeded(5)); hero.gear = hero.gear.filter((g) => !S.LIGHTS.includes(g.id) && g.id !== 'candles');
  const s = S.startRun(hero, 'pilgrim-road', die), skies = [];
  for (let at = 0; at < 5; at++) {
    const adv = SCENES[s.adventure], time = S.nightfall(s);
    assert.equal(time, at < 2 ? 'evening' : at < 4 ? 'dusk' : 'night', 'scene ' + (at + 1));
    skies.push(/id="tsky"[^>]*><stop offset="0" stop-color="(#[0-9a-f]+)"/.exec(ART.scene(adv.rooms[s.room].art, s, 't'))[1]);
    if (at === 4) {
      assert.equal(adv.act, 'finale');
      for (const room of Object.keys(adv.rooms)) { s.room = room; s.flags = {}; assert.ok(S.sceneInfo(s, adv).dark, 'without a light every place in the finale is dark: ' + room); }
      assert.ok(s.log.some((l) => /full night/.test(l.t)), 'the story says night has fallen');
      s.room = adv.start; s.hero.gear.push({ id: 'lantern', eq: true });
      assert.ok(!S.sceneInfo(s, adv).dark, 'a lantern answers it, as the Rules page says');
      break;
    }
    if (at < 2) assert.ok(Object.keys(adv.rooms).some((r) => { s.room = r; return !S.sceneInfo(s, adv).dark; }), 'places without their own dark are not dark before nightfall');
    s.done = true; s.fight = null; s.dying = null; s.over = ''; s.hp.cur = s.hp.max;
    S.act(s, adv, S.choices(s, adv).find((c) => c.cmd.startsWith('next')).cmd, die);
  }
  assert.equal(new Set(skies).size, 3, 'the sky darkens in three steps: ' + skies.join(' '));
});

test('break away, as the Rules page has it: a DEX check against the Target; a success gets clear with no attack, a failure lets the foe attack as usual', () => {
  assert.equal(R.BREAK_AWAY.stat, 'DEX');
  let s, adv;
  for (let seed = 1; seed < 200 && !adv; seed++) { s = S.startRun(T.generate('fighter', seeded(seed)), 'pilgrim-road', fixed([1])); if (Object.keys(SCENES[s.adventure].foes || {}).length) adv = SCENES[s.adventure]; }
  const [foeId, def] = Object.entries(adv.foes)[0];
  const fight = () => ({ foe: foeId, art: def.art, undead: !!def.undead, name: def.name, hp: { cur: 40, max: 40 }, attack: 0, damage: 4, round: 1, phase: 'hero', pending: null, easy: 0, dim: 0, guard: 0, skip: 0, learned: false });
  s.fight = fight(); s.horror = 0; s.shaken = false;
  const run = S.choices(s, adv).find((c) => c.cmd === 'flee');
  assert.ok(run && /Break away/.test(run.label), 'a Break away choice in a fight before the finale');
  assert.equal(S.parse(s, adv, 'run away'), 'flee', 'typing "run away" means the same');
  // a failure: you stay put and the foe attacks as usual
  S.act(s, adv, 'flee', fixed([1]));
  assert.ok(s.fight, 'still in the fight'); assert.equal(s.fight.phase, 'foe');
  assert.equal(s.horror, 0, 'a failed break away is a plain check: its natural 1 costs nothing');
  const hp = s.hp.cur; S.act(s, adv, 'foe', fixed([20, 3]));
  assert.equal(s.hp.cur, hp - 3, 'the foe attacks as usual');
  assert.ok(!S.choices(s, adv).filter((c) => c.kind === 'push').length, 'breaking away is not an attack, so it cannot be pushed');
  // a success: clear, no attack, the find left behind, the Horror +1, and on to the next scene
  s.hero.gear.push({ id: 'candle', eq: false }); s.found = ['candle']; s.run.found = ['candle'];
  const gear = s.hero.gear.length, hp2 = s.hp.cur;
  S.act(s, adv, 'flee', fixed([20]));
  assert.equal(s.fight, null); assert.equal(s.hp.cur, hp2, 'the foe does not attack as you go');
  assert.equal(s.hero.gear.length, gear - 1, 'the scene\'s find is left behind'); assert.deepEqual(s.run.found, []);
  assert.equal(s.horror, 1, 'the Horror rises 1 for running');
  assert.ok(s.done && !s.over, 'the scene is over and the road goes on');
  assert.ok(S.choices(s, adv).some((c) => c.kind === 'go'));
});

test('break away: no running from a finale, and running at a full Horror meter costs no blood (it is the GM\'s raise)', () => {
  let s, adv;
  for (let seed = 1; seed < 200 && !adv; seed++) { s = S.startRun(T.generate('fighter', seeded(seed)), 'pilgrim-road', fixed([1])); if (Object.keys(SCENES[s.adventure].foes || {}).length) adv = SCENES[s.adventure]; }
  const [foeId, def] = Object.entries(adv.foes)[0];
  const fight = () => ({ foe: foeId, art: def.art, undead: !!def.undead, name: def.name, hp: { cur: 40, max: 40 }, attack: 0, damage: 4, round: 1, phase: 'hero', pending: null, easy: 0, dim: 0, guard: 0, skip: 0, learned: false });
  s.fight = fight(); s.horror = R.HORROR.max; s.shaken = false;
  const hp = s.hp.cur; S.act(s, adv, 'flee', fixed([20]));
  assert.equal(s.hp.cur, hp, 'no blood paid for running'); assert.equal(s.horror, R.HORROR.max);
  s.done = false; s.fight = fight(); s.run.at = s.run.order.length - 1;
  assert.ok(!S.choices(s, adv).some((c) => c.cmd === 'flee'), 'no Break away in the finale');
  S.act(s, adv, 'flee', fixed([20]));
  assert.ok(s.fight, 'there is nowhere to run at the end of the road');
});

test('a natural 1 says on the dice card whether it raised the Horror, in the Rules page\'s terms', () => {
  const s = cryptFight();
  S.act(s, A, S.choices(s, A).find((c) => c.kind === 'attack').cmd, fixed([1]));
  const atk = s.log.filter((l) => l.outcome).at(-1).outcome;
  assert.match(atk.note, new RegExp('Natural 1 on an attack: \\+' + R.HORROR.nat1 + ' Horror'));
  const cart = ADVS.cart, c = S.start(T.generate('fighter', seeded(3)), cart, fixed([1]));
  S.act(c, cart, 'way wheel lift', fixed([1]));
  const plain = c.log.filter((l) => l.outcome).at(-1).outcome;
  assert.match(plain.note, /Natural 1 on a plain check: no Horror/);
  assert.equal(c.horror, 0);
});

test('spells and items that matter: a useful one is marked, the foe card says what the foe is, and the end card lists what was put to use', () => {
  const { s, die } = withBook('quietmouths');
  assert.ok(!cast(s, 'Hush').useful, 'no use here, so not marked');
  S.act(s, A, 'go north', die); S.act(s, A, 'go down', die);
  const wax = cast(s, 'Mouth of Wax'); assert.ok(wax.useful && !wax.idle, 'Wax Mouth answers the feeding: marked useful');
  const foe = S.cards(s, A).find((c) => c.kind === 'foe');
  assert.ok(foe.traits.includes('Burns') && foe.traits.includes('Has a weakness to learn'), foe.traits.join(', '));
  const r = S.startRun(T.generate('scholar', seeded(4)), 'pilgrim-road', fixed([10]));
  r.run.used = ['Mouth of Wax']; assert.deepEqual(S.summary(r).used, ['Mouth of Wax']);
  require('../site/solo/art.js'); assert.match(globalThis.SacramentSoloArt.endCard(S.summary(r), r, ''), /PUT TO USE/);
});

test('deeds and the hero record come from the Chronicle, and a road earns only what is new', () => {
  require('../site/solo/deeds.js');
  const DD = globalThis.SacramentSoloDeeds, w = { friends: ['a', 'b'], finales: ['shrine', 'mere', 'barrow'], places: ['priory', 'shrine', 'mere', 'barrow'] };
  const e = (o) => Object.assign({ hero: 'Ada', end: 'won', peak: 3, places: [], beaten: [], met: [], used: [], escapes: 0 }, o);
  assert.deepEqual(DD.earned([], w), []);
  let l = [e({ end: 'dead', peak: 9, places: ['priory'] })];
  assert.deepEqual(DD.earned(l, w), ['fell']);
  l = [e({ places: ['priory', 'shrine'], met: ['a'], beaten: ['x', 'y', 'z', 'p', 'q'], used: ['A', 'B', 'C'] })].concat(l);
  assert.deepEqual(DD.fresh(l, w).sort(), ['home', 'slayer', 'steady', 'tools'].sort(), 'the new road brings what it earned, not the old deed');
  l = [e({ places: ['mere'], met: ['b'], peak: 21, escapes: 1 }), e({ places: ['barrow'] })].concat(l);
  const got = DD.earned(l, w);
  for (const id of ['friends', 'ends', 'walked', 'arrived', 'runner']) assert.ok(got.includes(id), id);
  assert.ok(!got.includes('ten'));
  const r = DD.record(l); assert.equal(r[0].hero, 'Ada'); assert.equal(r[0].roads, 4); assert.equal(r[0].home, 3); assert.equal(r[0].peak, 21); assert.equal(r[0].beaten, 5);
  for (const d of DD.DEEDS) assert.ok(d.name && d.hint && /\.$/.test(d.hint), d.id + ' has a name and a hint');
});

test('a road remembers the places, the friends met, and each getaway, for the deeds', () => {
  const s = S.startRun(T.generate('fighter', seeded(3)), 'pilgrim-road', fixed([1]));
  s.run.met.push('simon'); s.run.escapes = 2;
  const sum = S.summary(s);
  assert.deepEqual(sum.placeIds, [s.run.order[0]]); assert.deepEqual(sum.met, ['simon']); assert.equal(sum.escapes, 2);
});

test('two of the same item in the pack make one button, not two the same', () => {
  const C = globalThis.SacramentSheetCore, hero = T.generate('healer', seeded(5)), s = S.start(hero, A, fixed([10]));
  s.hp.cur = 1;
  for (let i = 0; i < 2; i++) C.edit(s.hero, { op: 'add', id: 'bandages' }, { gm: true }, s.hp);
  const labels = S.choices(s, A).map((c) => c.kind + '|' + c.label);
  assert.ok(labels.some((l) => /Bandages/.test(l)), 'the bandages are offered');
  assert.equal(new Set(labels).size, labels.length, 'no two buttons say the same thing: ' + labels.join(', '));
});

test('Gussetweasel, the Necromancer gives a light to a hero with none; a hero with a light hears what his bats have seen', () => {
  const C = globalThis.SacramentSheetCore, LIGHTS = ['lantern', 'candles', 'stubs', 'candle', 'lastrites', 'drownedlantern'];
  for (const withLight of [false, true]) {
    const rnd = seeded(3), s = S.startRun(T.generate('fighter', rnd), 'pilgrim-road', (n) => 1 + Math.floor(rnd() * n));
    s.hero.gear = (s.hero.gear || []).filter((g) => !LIGHTS.includes((C.itemOf(g) || {}).id));
    if (withLight) C.edit(s.hero, { op: 'add', id: 'lantern' }, { gm: true }, s.hp);
    s.run.cameos[s.run.at] = 'gussetweasel';
    S.act(s, null, 'meet gussetweasel', fixed([10]));
    const words = s.log.map((l) => l.t).join(' ');
    assert.match(words, /My amazing invisible bats/);
    if (withLight) { assert.match(words, /next foe's ways/); assert.doesNotMatch(words, /gives you: Hooded Lantern/); }
    else assert.match(words, /Gussetweasel, the Necromancer gives you: Hooded Lantern/);
  }
});

test('a lasting effect (the Cord of Quiet Hours: silenced until the end of the scene) works once on a foe; again it shows "Already done" and costs nothing', () => {
  const C = globalThis.SacramentSheetCore;
  let checked = 0;
  for (let seed = 1; seed <= 120 && checked < 2; seed++) {
    const rnd = seeded(seed), die = (n) => 1 + Math.floor(rnd() * n), s = S.startRun(T.generate('fighter', rnd), 'pilgrim-road', die);
    for (let i = 0; i < 300 && !s.over; i++) {
      const f = s.fight, foe = f && S.sceneOf(s).foes[f.foe];
      if (f && foe.caster && f.phase === 'hero' && !f.skip) {
        C.edit(s.hero, { op: 'add', id: 'quietcord' }, { gm: true }, s.hp);
        const cord = () => S.choices(s).find((c) => /Cord of Quiet Hours/.test(c.label));
        if (!cord() || cord().idle) break;
        S.act(s, null, cord().cmd, () => 10);
        assert.match(s.log.map((l) => l.t).join(' '), /cannot get the words out/);
        while (s.fight && s.fight.phase !== 'hero' && !s.over) S.act(s, null, S.choices(s).find((c) => c.cmd === 'foe' || c.cmd === 'damage').cmd, () => 10);
        if (!s.fight || s.over) break;
        const again = cord(), h = s.horror;
        assert.ok(again && again.idle, 'the second time it is not offered as useful');
        assert.match(again.why, /Already done/);
        S.act(s, null, again.cmd, () => 10);
        assert.equal(s.horror, h, 'using it again costs no Horror');
        checked++; break;
      }
      const ch = S.choices(s), pick = ch.find((c) => c.kind === 'attack') || ch.find((c) => c.cmd === 'damage') || ch.find((c) => c.cmd === 'foe') || ch.find((c) => c.kind === 'do') || ch[Math.floor(rnd() * ch.length)];
      if (!pick) break; S.act(s, null, pick.cmd, die);
    }
  }
  assert.ok(checked > 0, 'a fight with a foe that casts was found');
});

test('Simon the Scholar asks a riddle with three answers: the right one gets his help, a wrong one gets nothing and costs nothing', () => {
  for (const right of [true, false]) {
    const rnd = seeded(7), s = S.startRun(T.generate('scout', rnd), 'pilgrim-road', (n) => 1 + Math.floor(rnd() * n));
    s.run.cameos[s.run.at] = 'simon';
    S.act(s, null, 'meet simon', fixed([3, 1, 2]));
    const answers = S.choices(s).filter((c) => /^meet simon \d$/.test(c.cmd));
    assert.equal(answers.length, 3, 'three answers to tap');
    assert.ok(s.run.met.includes('simon'), 'meeting him counts');
    const simon = globalThis.SacramentSoloCameos.find((c) => c.id === 'simon'), q = simon.riddles[s.flags.riddle_simon.i];
    const pick = answers.find((c) => (c.label === q.a[0]) === right), h = s.horror, hp = s.hp.cur;
    S.act(s, null, pick.cmd, fixed([10]));
    assert.equal(!!(s.run.story && s.run.story.forewarned), right);
    assert.equal(s.horror, h); assert.equal(s.hp.cur, hp);
    assert.ok(!S.choices(s).some((c) => /^meet simon/.test(c.cmd)), 'he helps once, either way');
  }
});

test('the Hard Road: one more scene, every Target 1 higher, every foe 2 more HP; the summary and the deed know it', () => {
  const D = globalThis.SacramentSoloDeeds;
  const rnd = seeded(11), plain = S.startRun(T.generate('fighter', seeded(2)), 'pilgrim-road', (n) => 1 + Math.floor(rnd() * n));
  const rnd2 = seeded(11), hard = S.startRun(T.generate('fighter', seeded(2)), 'pilgrim-road', (n) => 1 + Math.floor(rnd2() * n), { hard: true });
  assert.equal(hard.run.order.length, plain.run.order.length + S.HARD.scenes);
  assert.equal(S.sceneInfo(hard).target, S.sceneInfo(plain).target + S.HARD.target);
  for (let i = 0; i < 200 && !hard.fight && !hard.over; i++) { const ch = S.choices(hard); const p = ch.find((c) => c.kind === 'do' && !/^meet/.test(c.cmd)) || ch.find((c) => c.kind === 'go') || ch[0]; S.act(hard, null, p.cmd, (n) => Math.min(n, 12)); }
  assert.ok(hard.fight, 'a fight on the Hard Road');
  const def = S.sceneOf(hard).foes[hard.fight.foe];
  assert.equal(hard.fight.hp.max, def.hp + S.HARD.hp + (hard.hunted ? 2 : 0));
  assert.match(S.summary(hard).road, /Hard Road/);
  assert.ok(D.earned([{ end: 'won', hard: true }]).includes('hard')); assert.ok(!D.earned([{ end: 'won' }]).includes('hard'));
});

/* ---------- path relics with listed effects (owner, 2026-11-08): the gear list's own "fx", read by sheet-core for the table and the solo game alike ---------- */
function withRelic(id, rolls) {
  const hero = T.generate('fighter', seeded(3)); hero.gear = [{ id: 'sword', eq: true }, { id, eq: true }]; hero.path = 'Penitent';
  const die = fixed(rolls), s = S.start(hero, A, die); S.act(s, A, 'go north', die); S.act(s, A, 'go down', die); return { s, die };
}
test("the Penitent's Chain: Free, once per turn; 1d4 that nothing reduces, its Horror, and +3 on the next roll", () => {
  const { s } = withRelic('chain', [3]); assert.ok(s.fight);
  const hp = s.hp.cur, horror = s.horror, use = S.choices(s, A).find((c) => /Penitent's Chain/.test(c.label));
  assert.ok(use && !use.idle, 'the chain is offered in a fight');
  S.act(s, A, use.cmd, fixed([3, 1]));                     // d4 shows 3; Horror (1 for a Penitent)
  assert.equal(s.hp.cur, hp - 3); assert.ok(s.horror > horror, 'it tempts the Horror'); assert.equal(s.boost, 3);
  assert.equal(s.fight.phase, 'hero', 'a Free use does not take the turn');
  const again = S.choices(s, A).find((c) => /Penitent's Chain/.test(c.label)); assert.ok(again.idle, 'once per turn');
  const before = s.hp.cur; S.act(s, A, again.cmd, fixed([3])); assert.equal(s.hp.cur, before, 'a second use this round does nothing');
  const attack = S.choices(s, A).find((c) => c.kind === 'attack'); S.act(s, A, attack.cmd, fixed([5, 5]));
  const roll = s.log.filter((l) => l.outcome && l.outcome.versus === 'Target').at(-1).outcome;
  assert.equal(roll.total, 5 + s.hero.stats.STR + 3, 'the +3 is in the attack roll'); assert.equal(s.boost, 0, 'used once');
  assert.match(s.log.map((l) => l.t).join('\n'), /\+3 from your Penitent's Chain is in that roll/);
  // after a miss, the Chain is still Free before the pushed roll: offered as itself, not as a push
  const m = withRelic('chain', [3]).s; S.act(m, A, S.choices(m, A).find((c) => c.kind === 'attack').cmd, fixed([2]));
  assert.equal(m.fight.phase, 'push'); const pc = S.choices(m, A);
  assert.ok(!pc.some((c) => c.kind === 'push' && /Chain/.test(c.label)), 'no push for a Free use');
  const free = pc.find((c) => /Penitent's Chain/.test(c.label)); assert.ok(free && free.cmd.startsWith('use '));
  S.act(m, A, free.cmd, fixed([1, 1])); assert.equal(m.fight.phase, 'push', 'still free to push after it'); assert.equal(m.boost, 3);
  // outside a fight it waits for the next check, and is not doubled
  const hero = T.generate('fighter', seeded(3)); hero.gear = [{ id: 'chain', eq: true }];
  const q = S.start(hero, A, fixed([2])), c = S.choices(q, A).find((x) => /Penitent's Chain/.test(x.label)); assert.ok(c && !c.idle);
  S.act(q, A, c.cmd, fixed([2, 1])); assert.equal(q.boost, 3); assert.ok(S.choices(q, A).find((x) => /Penitent's Chain/.test(x.label)).idle);
});
test('the Bone Bell dazes the foe on a CHA success; the Censer of Ash makes its Effort die one size smaller for two attacks', () => {
  let { s } = withRelic('bell', [10]); const bell = S.choices(s, A).find((c) => /Bone Bell/.test(c.label)); assert.ok(bell && !bell.idle);
  S.act(s, A, bell.cmd, fixed([20, 1])); assert.equal(s.fight.dim, 3); assert.equal(s.fight.phase, 'foe', 'an Action takes the turn');
  ({ s } = withRelic('bell', [10])); S.act(s, A, S.choices(s, A).find((c) => /Bone Bell/.test(c.label)).cmd, fixed([2, 1])); assert.equal(s.fight.dim, 0, 'a failed check: no daze');
  ({ s } = withRelic('censer', [10])); const d = s.fight.damage, smaller = CORE.stepDie(d, -1); assert.ok(smaller < d);
  S.act(s, A, S.choices(s, A).find((c) => /Censer of Ash/.test(c.label)).cmd, fixed([20, 1]));
  assert.equal(s.fight.ash, 2); assert.match(S.cards(s, A).find((c) => c.kind === 'foe').next, new RegExp('d' + smaller + ' damage'));
  S.act(s, A, 'foe', fixed([20, 1])); assert.match(s.log.find((l) => l.foeAttack).t + s.log.map((l) => l.t).join(' '), new RegExp('\\(d' + smaller + ' '));
  assert.equal(s.fight.ash, 1);
  S.act(s, A, S.choices(s, A).find((c) => c.kind === 'attack').cmd, fixed([2, 2])); S.act(s, A, 'foe', fixed([1]));
  S.act(s, A, 'foe', fixed([1])); assert.equal(s.fight.ash || 0, 0, 'gone after the next round');
  assert.equal(CORE.stepDie(4, -1), 4, 'never below d4');
});
test('every relic does something in solo: damage, healing, a tag, or effects from the gear list', () => {
  const relics = [...G.relics, ...G.items, ...G.found].filter((x) => x.kind === 'relic');
  for (const r of relics) {
    const fx = CORE.effectsOf(r);
    assert.ok(r.cat || CORE.healingOf(r) || (r.tags && r.tags.length) || fx.any || ['candle'].includes(r.id), r.name + ' has nothing the solo game can do with it');
  }
});

test('every roll carries the numbers that rise off the die: each modifier, and a total that matches the rules (display only)', () => {
  const s = S.start(T.generate('fighter', seeded(3)), A, fixed([10]));
  S.act(s, A, 'go north', fixed([10])); S.act(s, A, 'go down', fixed([10]));
  const attack = S.choices(s, A).find((c) => c.kind === 'attack');
  S.act(s, A, attack.cmd, fixed([18]));
  const hit = s.log.filter((l) => l.outcome).pop(), t = hit.tally[0];
  assert.equal(t.total, hit.outcome.total); assert.equal(t.total, 18 + t.parts.reduce((a, p) => a + p.n, 0));
  assert.ok(t.parts.every((p) => p.n !== 0 && p.t)); assert.match(t.word, /^against Target \d+$/); assert.equal(t.good, true);
  S.act(s, A, 'damage', fixed([2]));
  const dmg = s.log.filter((l) => l.damage != null).pop(), d = dmg.tally[0];
  assert.equal(d.total, dmg.damage); assert.equal(d.word, 'damage'); assert.equal(d.total, 2 + d.parts.reduce((a, p) => a + p.n, 0));
  S.act(s, A, 'foe', fixed([20, 3]));
  const foe = s.log.filter((l) => l.outcome).pop();
  assert.equal(foe.tally.length, 2, 'a foe hit shows its attack total, then its damage');
  assert.equal(foe.tally[0].total, foe.outcome.total); assert.equal(foe.tally[0].good, false);
  assert.deepEqual([foe.tally[1].total, foe.tally[1].word, foe.tally[1].at], [3, 'damage', 1]);
});
