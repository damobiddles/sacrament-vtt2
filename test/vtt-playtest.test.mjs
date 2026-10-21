// Tests for the playtest-preparation pass: arrival order, what a command response and an undo record may say about a hidden number, who chooses the dice, and the
// blank hero.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';
import { seededRng } from '../netlify/functions/_shared/vtt-core.mjs';

const claim = async (t, who, name) => { const ch = charNamed(await t.state(), name); await who.cmd({ type: 'claim', charId: ch.id }); return ch; };
const lastRoll = (r) => r.body.state.rolls.at(-1);
const hp = async (t, name) => find(await t.state(), name).hp.cur;

/* ---------- command ordering ---------- */

test('REVERSED ARRIVAL: two commands from one client that reach the server the wrong way round are both applied, once each', async () => {
  const t = await table(), ghoul = find(await t.state(), 'Pit Ghoul');
  const second = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -2 }, { client: 'ordclient01g', n: 2 });
  const first = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }, { client: 'ordclient01g', n: 1 });
  assert.equal(second.status, 200); assert.equal(first.status, 200, 'the earlier command arriving later is not refused'); assert.equal(await hp(t, 'Pit Ghoul'), 17);
  const repeatLate = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }, { client: 'ordclient01g', n: 1 }); assert.equal(repeatLate.body.result.duplicate, true); assert.equal(await hp(t, 'Pit Ghoul'), 17, 'and neither counts twice');
  const repeatEarly = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -2 }, { client: 'ordclient01g', n: 2 }); assert.equal(repeatEarly.body.result.duplicate, true); assert.equal(await hp(t, 'Pit Ghoul'), 17);
});

test('REVERSED ARRIVAL: a whole run of HP edits in reverse order, concurrently, comes to the same total as in order', async () => {
  const t = await table(), ghoul = find(await t.state(), 'Pit Ghoul');
  const sends = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => () => t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }, { client: 'revclient01g', n }));
  await Promise.all(sends.map((f) => f())); assert.equal(await hp(t, 'Pit Ghoul'), 10);
  const again = await Promise.all(sends.map((f) => f())); assert.ok(again.every((r) => r.body.result.duplicate), 'every one is a repeat the second time'); assert.equal(await hp(t, 'Pit Ghoul'), 10);
});

test('REVERSED ARRIVAL: a roll then its Effort then its Apply, reversed in the network, still resolve as one roll, one Effort, one hit', async () => {
  const t = await table({ dice: [d20(15), die(4, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), gate = find(await t.state(), 'The Sealed Gate');
  /* The page would not send the second until the first was answered; this is what happens if something between us and the server reorders them anyway. The later
     two cannot work without the first (they name its roll), so they fail cleanly and can be sent again once the roll exists. */
  const roll = { type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id };
  const early = await ann.cmd({ type: 'effort', rollId: 'rzz', cat: 'weapons' }, { client: 'annclient02g', n: 2 }); assert.equal(early.status, 404, 'an Effort for a roll that has not arrived is refused, not guessed');
  const r = await ann.cmd(roll, { client: 'annclient02g', n: 1 }); assert.equal(r.status, 200); const id = lastRoll(r).id;
  const e = await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' }, { client: 'annclient02g', n: 3 }); assert.equal(e.status, 200);
  const a = await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' }, { client: 'annclient02g', n: 4 }); assert.equal(a.status, 200);
  assert.equal(find(await t.state(), 'The Sealed Gate').progress.cur, 7);
  assert.equal((await ann.cmd(roll, { client: 'annclient02g', n: 1 })).body.result.duplicate, true, 'the roll sent again is the same roll'); assert.equal((await t.state()).rolls.length, 1, 'one roll exists');
});

test('a pointer or a drawing arriving before, after or never cannot invalidate a gameplay command: they are other clients, and a stale pointer is ignored', async () => {
  const t = await table(), ghoul = find(await t.state(), 'Pit Ghoul');
  await t.gm.cmd({ type: 'point', x: 5, y: 5 }, { client: 'pagexyz01t', n: 900 });
  await t.gm.cmd({ type: 'draw', pts: [[1, 1], [2, 2]] }, { client: 'pagexyz01d', n: 50 });
  const g = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -4 }, { client: 'pagexyz01g', n: 1 }); assert.equal(g.status, 200, 'gameplay n=1 after pointer n=900 and drawing n=50'); assert.equal(await hp(t, 'Pit Ghoul'), 16);
  const old = await t.gm.cmd({ type: 'point', x: 9, y: 9 }, { client: 'pagexyz01t', n: 3 }); assert.equal(old.status, 200); assert.equal(old.body.result.ignored, true, 'an old pointer is ignored, not an error'); assert.equal((await t.state()).pointers.gm.x, 5);
  /* even if the page used one client id for everything (an older page), an earlier command is still accepted after later pointers */
  for (let n = 10; n <= 40; n++) await t.gm.cmd({ type: 'point', x: n, y: 1 }, { client: 'oldpage0001', n });
  assert.equal((await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }, { client: 'oldpage0001', n: 5 })).status, 200, 'inside the window'); assert.equal(await hp(t, 'Pit Ghoul'), 15);
});

test('the window is bounded: a counter far below the highest, or one that has been accepted, is refused; the window slides', async () => {
  const t = await table(), ghoul = find(await t.state(), 'Pit Ghoul'); const c = (n, v = -1) => t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: v }, { client: 'winclient01g', n });
  await c(100); assert.equal((await c(37)).status, 200, 'the 63 below the highest are inside the window'); assert.equal((await c(36)).status, 409, '64 below is not'); assert.equal((await c(1)).status, 409);
  assert.equal((await c(100)).body.result.duplicate, true); assert.equal(await hp(t, 'Pit Ghoul'), 18);
});

/* ---------- who chooses the dice, and whose ids are whose ---------- */

test('the dice come only from the server’s secret and the action id: no field a client sends changes them, and nothing in a refusal shows them', async () => {
  const inner = memoryStore(), t = await table({ store: inner }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'); const secret = (await inner.get(t.code)).data.secret;
  const expect = (id) => 1 + Math.floor(seededRng(secret, id)() * 20);
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', seed: 20, rng: 20, d20x: 20, rolled: 20, ctx: { rng: 'x' }, random: 20, secret: 'x' }, { client: 'dicecl0001g', n: 1 });
  assert.equal(lastRoll(r).check.d20, expect('dicecl0001g.1'), 'extra fields are ignored');
  const e = await ann.cmd({ type: 'effort', rollId: lastRoll(r).id, cat: 'weapons', seed: 6, die: 6 }, { client: 'dicecl0001g', n: 2 });
  if (lastRoll(r).check.success) assert.equal(lastRoll(e).effort.rolled, 1 + Math.floor(seededRng(secret, 'dicecl0001g.2')() * 6)); 
  const bad = await ann.cmd({ type: 'roll', charId: 'nope', stat: 'STR' }, { client: 'dicecl0001g', n: 3 }); assert.equal(bad.status, 404); assert.ok(!/\d{2}/.test(JSON.stringify(bad.body.error)), 'a refusal carries no dice');
  assert.ok(!JSON.stringify((await ann.get()).body).includes(secret), 'the secret is never sent');
  const state = (await t.gm.get()).body; assert.ok(!JSON.stringify(state).includes(secret), 'not even to the GM');
});

test('a player cannot choose an outcome by choosing an id: every fresh id is a real roll in the feed, and an id belongs to whoever first used it', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob'), thorne = await claim(t, ann, 'Thorne'), wisp = await claim(t, bob, 'Wisp');
  const rolls = new Set(); for (let i = 1; i <= 12; i++) { const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }, { client: 'tryid' + String(i).padStart(5, '0') + 'g', n: 1 }); rolls.add(lastRoll(r).check.d20); }
  assert.ok(rolls.size > 3, 'different ids, different dice');
  assert.equal((await t.state()).log.filter((e) => /Thorne · \d+ \+ 3 STR/.test(e.text)).length, 12, 'and every one of them is in the feed: there is no quiet re-roll');
  /* Bob uses Ann's id: refused, and told nothing of hers */
  const steal = await bob.cmd({ type: 'roll', charId: wisp.id, stat: 'STR' }, { client: 'tryid00010g', n: 1 }); assert.equal(steal.status, 409); assert.ok(!JSON.stringify(steal.body).includes('rollId'));
  const sameClient = await bob.cmd({ type: 'roll', charId: wisp.id, stat: 'STR' }, { client: 'tryid00010g', n: 2 }); assert.equal(sameClient.status, 409, 'nor can he use her client id with a new counter to learn or disturb her numbering');
  const fresh = await bob.cmd({ type: 'roll', charId: wisp.id, stat: 'STR' }, { client: 'bobown00001g', n: 1 }); assert.equal(fresh.status, 200);
});

/* ---------- a card with hidden numbers: nothing concealed in any response ---------- */

test('HIDDEN NUMBERS: no command response, projected state, feed line or undo record sent to a player contains the card’s HP, progress, countdown or what remains', async () => {
  const t = await table({ dice: [d20(15), die(2, 6), d20(15), die(1, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const mk = await t.gm.cmd({ type: 'cardCreate', card: { name: 'Warded Brute', kind: 'token', hp: { cur: 113, max: 137 }, progress: { cur: 71, max: 89, label: 'Binding' }, timer: { cur: 53, max: 59, auto: true, label: 'It wakes' }, hideNumbers: true } });
  const brute = mk.body.result.id; const secretNumbers = ['113', '137', '71', '89', '53', '59'];
  const seen = []; const watch = (r) => { seen.push(JSON.stringify(r.body)); return r; };
  const clean = (note) => { const all = seen.join('\n'); for (const n of secretNumbers) assert.ok(!new RegExp('(?<![A-Za-z0-9])' + n + '(?![A-Za-z0-9])').test(all), note + ': ' + n + ' reached a player'); };
  watch(await ann.get()); clean('projected state');
  const r = watch(await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: brute })); const id = lastRoll(r).id;
  watch(await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' }));
  const ap = watch(await ann.cmd({ type: 'apply', rollId: id, cardId: brute, field: 'hp' })); assert.equal(ap.status, 200); assert.deepEqual(ap.body.result, {}, 'the result carries no amount applied');
  const remaining = find(await t.state(), 'Warded Brute').hp.cur; assert.ok(remaining < 113, 'it was applied'); secretNumbers.push(String(remaining));   /* what is left is hidden; what she rolled is hers */
  clean('apply'); const own = lastRoll(ap); assert.ok(own.effort.total >= 1, 'her own dice are hers to see'); assert.equal(own.applied.applied, undefined);
  /* the amount she rolled is her own number; it may equal the damage, which is why it is not on the list when it is the same figure */
  const id2 = lastRoll(watch(await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: brute }))).id; watch(await ann.cmd({ type: 'effort', rollId: id2, cat: 'weapons' })); const ap2 = watch(await ann.cmd({ type: 'apply', rollId: id2, cardId: brute, field: 'hp' }));
  /* undo records: both the answer and the line */
  const undone = watch(await ann.cmd({ type: 'undo', logId: ap2.body.state.log.at(-1).id })); assert.equal(undone.status, 200); assert.deepEqual(undone.body.result, {});
  await t.gm.cmd({ type: 'track', id: brute, field: 'hp', value: 137 });                   /* at its maximum: a partial restore would show it */
  const full = await ann.cmd({ type: 'apply', rollId: id2, cardId: brute, field: 'hp' }); void full;
  const ap3 = (await ann.get()).body.state.log; const undoEntry = ap3.filter((e) => /a hit/.test(e.text) && e.undoable).at(-1);
  if (undoEntry) { const u3 = watch(await ann.cmd({ type: 'undo', logId: undoEntry.id })); assert.deepEqual(u3.body.result, {}, 'a restore that could not be complete says nothing'); }
  watch(await ann.get());
  const feed = (await ann.get()).body.state.log.map((e) => e.text).join('\n'); assert.ok(!/less was put back|\(now/.test(feed), 'no partial-restore note and no (now x/y) in what she reads');
  /* things she may not do to it do not answer with it either */
  for (const c of [{ type: 'adjust', cardId: brute, field: 'hp', delta: -1 }, { type: 'track', id: brute, field: 'hp', value: 0 }, { type: 'move', id: brute, x: 1, y: 1 }]) watch(await ann.cmd(c));
  watch(await ann.cmd({ type: 'nextRound' })); await t.gm.cmd({ type: 'nextRound' }); watch(await ann.get());
  const view = (await ann.get()).body.state.cards[brute]; assert.deepEqual([view.hp, view.progress && Object.keys(view.progress).sort().join(), view.timer && Object.keys(view.timer).sort().join()], [{ hidden: true }, 'hidden,label', 'hidden,label']);
  clean('whole play-through'); assert.ok((await t.state()).log.some((e) => /\(now/.test(e.text)), 'the GM’s feed does have them');
});

test('a player’s own dice are theirs to see, even against a card whose numbers are hidden: what is hidden is the target, not the roll', async () => {
  const t = await table({ dice: [d20(14), die(5, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), ghoul = find(await t.state(), 'Pit Ghoul');
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { hideNumbers: true } });
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id }); assert.equal(lastRoll(r).check.d20, 14); assert.match(r.body.state.log.at(-1).text, /14 \+ 3 STR = 17 against Target 12/);
  const e = await ann.cmd({ type: 'effort', rollId: lastRoll(r).id, cat: 'weapons' }); assert.match(e.body.state.log.at(-1).text, /d6 5 \+ 3 Weapons = 8 damage/);
});

/* ---------- the blank hero ---------- */

test('+ HERO: a blank hero has no invented spread; the GM names it, edits it and gives it to a player, who then plays it', async () => {
  const t = await table(), ann = await t.join('Ann'), before = Object.keys((await t.state()).chars).length;
  const made = await t.gm.cmd({ type: 'charCreate', char: { x: 30, y: 30 } }); assert.equal(made.status, 200);
  const st = await t.state(), ch = st.chars[made.body.result.id]; assert.equal(Object.keys(st.chars).length, before + 1);
  assert.equal(ch.name, 'Unnamed Pilgrim'); assert.ok(Object.values(ch.stats).every((v) => v === 0), 'no stats given'); assert.ok(Object.values(ch.effort).every((v) => v === 0), 'no Effort given'); assert.equal(ch.armour, 0); assert.equal(ch.owner, null);
  const card = st.cards[ch.cardId]; assert.deepEqual(card.hp, { cur: 10, max: 10 }); assert.equal(card.kind, 'pc'); assert.ok(st.table.order.some((o) => o.id === ch.cardId), 'in the turn order');
  await t.gm.cmd({ type: 'cardUpdate', id: ch.cardId, patch: { name: 'Mara the Quick' } }); assert.equal((await t.state()).chars[ch.id].name, 'Mara the Quick', 'naming the token names the hero');
  await t.gm.cmd({ type: 'charUpdate', id: ch.id, patch: { name: 'Mara', stats: { DEX: 2, WIS: 1 }, effort: { guns: 1 } } });
  assert.equal((await ann.get()).body.state.chars[ch.id].name, 'Mara'); assert.equal((await ann.get()).body.state.cards[ch.cardId].name, 'Mara');
  await t.gm.cmd({ type: 'assign', charId: ch.id, pid: ann.pid }); assert.equal((await ann.get()).body.state.chars[ch.id].owner, ann.pid);
  const roll = await ann.cmd({ type: 'roll', charId: ch.id, stat: 'DEX', d20: 10 }); assert.equal(roll.status, 200); assert.match(roll.body.state.log.at(-1).text, /10 \+ 2 DEX = 12/);
  const bob = await t.join('Bob'); assert.equal((await bob.cmd({ type: 'roll', charId: ch.id, stat: 'DEX' })).status, 403, 'and no one else can roll it');
  await t.gm.cmd({ type: 'assign', charId: ch.id, pid: null }); assert.equal((await bob.cmd({ type: 'claim', charId: ch.id })).status, 200, 'unassigned, a player can take it');
});

test('only the GM can add a hero or ask for diagnostics', async () => {
  const t = await table(), ann = await t.join('Ann'); assert.equal((await ann.cmd({ type: 'charCreate', char: {} })).status, 403);
  assert.equal((await t.svc.handle({ method: 'GET', query: { code: t.code, diag: 1 }, token: ann.token })).status, 403);
  const d = await t.svc.handle({ method: 'GET', query: { code: t.code, diag: 1 }, token: t.gm.token }); assert.equal(d.status, 200); assert.match(d.body.node, /^v\d+\./); assert.equal(d.body.store, 'memory');
});
