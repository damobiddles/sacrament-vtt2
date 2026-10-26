// Regression tests for the stabilisation pass: each one is a defect found by reading the implementation, or a promise it now has to keep.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';
import { memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';
import { seededRng } from '../netlify/functions/_shared/vtt-core.mjs';

const claim = async (t, who, name) => { const st = await t.state(); const ch = charNamed(st, name); await who.cmd({ type: 'claim', charId: ch.id }); return ch; };
const rollOf = (r) => r.body.state.rolls.at(-1);

/* ---------- 2. shared state ---------- */

test('DEFECT: a command that loses a save race and is run again rolled new dice. Now the dice belong to the action: the same action rolls the same numbers however often it is run', async () => {
  /* a store that refuses the first save of any command, as if someone else had saved first, so the server must read and run it again */
  const inner = memoryStore(); let refuse = 0;
  const store = { get: (c) => inner.get(c), put: async (c, d, e) => { if (refuse > 0 && e !== null) { refuse--; return false; } return inner.put(c, d, e); } };
  const t = await table({ store }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const secret = (await inner.get(t.code)).data.secret;
  for (const [n, who] of [[1, 'k1abcdefgh'], [2, 'k2abcdefgh'], [3, 'k3abcdefgh']]) {
    refuse = n; /* it will have to run n+1 times */
    const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }, { client: who, n: 1 });
    assert.equal(r.status, 200); const expect = 1 + Math.floor(seededRng(secret, who + '.1')() * 20);
    assert.equal(rollOf(r).check.d20, expect, 'run ' + (n + 1) + ' times, it is still the one roll the action id gives');
  }
});

test('the dice cannot be predicted from the action id alone, and a different action rolls differently', async () => {
  const a = seededRng('secret-one', 'k1abcdefgh.1'), b = seededRng('secret-two', 'k1abcdefgh.1'), c = seededRng('secret-one', 'k1abcdefgh.2');
  const xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()]; assert.notDeepEqual(xs, ys); assert.notDeepEqual(xs, zs);
  assert.deepEqual([seededRng('secret-one', 'k1abcdefgh.1')(), 0].slice(0, 1), [xs[0]]);
});

test('DEFECT: a command sent again after its id had fallen out of the 400 remembered could be applied a second time. Now it is refused as stale', async () => {
  const t = await table(), st = await t.state(), ghoul = find(st, 'Pit Ghoul');
  const first = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -3 }, { client: 'oldclient01', n: 1 }); assert.equal(first.status, 200);
  for (let i = 1; i <= 450; i++) await t.gm.cmd({ type: 'setTarget', value: 12 }, { client: 'busyclient1', n: i });   /* push 450 other commands through the table */
  assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 17);
  const replay = await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -3 }, { client: 'oldclient01', n: 1 });
  assert.equal(replay.status, 409); assert.equal(replay.body.error.code, 'stale'); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 17, 'not applied twice');
  const recent = await t.gm.cmd({ type: 'setTarget', value: 12 }, { client: 'busyclient1', n: 450 }); assert.equal(recent.status, 200); assert.equal(recent.body.result.duplicate, true, 'a recent one is still answered as a repeat');
  assert.equal((await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }, { client: 'oldclient01', n: 2 })).status, 200, 'the next counter from that client is fine');
  assert.equal((await t.gm.cmd({ type: 'setTarget', value: 12 }, { client: 'busyclient1', n: 10 })).status, 409, 'and so is anything older than what the client has already sent');
  assert.equal((await t.gm.cmd({ type: 'point', x: 1, y: 1 }, { client: 'bad id!' })).status, 400, 'an id of the wrong shape is refused');
});

test('the memory of clients and of answers stays bounded, and a flood of pointer moves does not push a real answer out of it', async () => {
  const inner = memoryStore(), t = await table({ store: inner }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne');
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }, { client: 'annclient01', n: 1 }); assert.equal(r.status, 200);
  for (let i = 1; i <= 450; i++) await t.gm.cmd({ type: 'point', x: 1, y: 1 }, { client: 'pointerclient', n: i });
  const again = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }, { client: 'annclient01', n: 1 }); assert.equal(again.body.result.duplicate, true, 'her roll is still remembered, so a retry gets the same answer');
  for (let i = 0; i < 230; i++) await t.gm.cmd({ type: 'setTarget', value: 10 + (i % 5) }, { client: 'cl' + String(i).padStart(8, '0'), n: 1 });
  const raw = (await inner.get(t.code)).data; assert.ok(Object.keys(raw.clients).length <= 200, 'clients: ' + Object.keys(raw.clients).length); assert.ok(raw.appliedOrder.length <= 400 && Object.keys(raw.applied).length <= 400);
});

test('undo around the limits: it puts back what the action really moved, no more, even after later healing, later damage and a changed maximum', async () => {
  const t = await table({ dice: [d20(15), die(6, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), st = await t.state(), ghoul = find(st, 'Pit Ghoul');
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', value: 3 });                       /* the ghoul is at 3 */
  const id = rollOf(await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id })).id; await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' }); /* d6 6 + 3 = 9 */
  const ap = await ann.cmd({ type: 'apply', rollId: id, cardId: ghoul.id, field: 'hp' }); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 0);
  assert.equal(ap.body.result.applied, -3, 'it took only 3: the ghoul had no more');
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: 4 });       /* later healing: 4 */
  assert.equal((await ann.cmd({ type: 'undo', logId: ap.body.state.log.at(-1).id })).status, 200);
  assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 7, 'the 3 it really took are given back, on top of the later 4: not 9, not 0');
  /* later damage that has already taken it to 0: an undo of damage cannot go below the ends either */
  const t2 = await table(), s2 = await t2.state(), g2 = find(s2, 'Pit Ghoul');
  const heal = await t2.gm.cmd({ type: 'track', id: g2.id, field: 'hp', mode: 'delta', value: -5 }); await t2.gm.cmd({ type: 'track', id: g2.id, field: 'hp', mode: 'delta', value: -99 });
  const u = await t2.gm.cmd({ type: 'undo', logId: heal.body.state.log.at(-1).id }); assert.equal(u.status, 200); assert.equal(find(await t2.state(), 'Pit Ghoul').hp.cur, 5, 'the later 99 took it to 0; the 5 returns; nothing is invented');
  /* full: the part that no longer fits is lost, and the table is told */
  const t3 = await table(), s3 = await t3.state(), g3 = find(s3, 'Pit Ghoul');
  const dmg = await t3.gm.cmd({ type: 'track', id: g3.id, field: 'hp', mode: 'delta', value: -6 }); await t3.gm.cmd({ type: 'track', id: g3.id, field: 'hp', mode: 'delta', value: 6 });
  const un = await t3.gm.cmd({ type: 'undo', logId: dmg.body.state.log.at(-1).id }); assert.equal(find(await t3.state(), 'Pit Ghoul').hp.cur, 20); assert.equal(un.body.result.partial, true); assert.match(un.body.state.log.at(-1).text, /less was put back/);
});

test('undo when the object is gone is refused whole, and changes nothing else', async () => {
  const t = await table(), st = await t.state(), ghoul = find(st, 'Pit Ghoul'), gate = find(st, 'The Sealed Gate');
  const a = await t.gm.cmd({ type: 'track', id: gate.id, field: 'progress', mode: 'delta', value: 5 }); await t.gm.cmd({ type: 'cardDelete', id: gate.id });
  const u = await t.gm.cmd({ type: 'undo', logId: a.body.state.log.at(-1).id }); assert.equal(u.status, 409); assert.match(u.body.error.message, /gone/);
  assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, ghoul.hp.cur);
});

test('undoing and applying Effort again never counts it twice: one live application per roll, whatever the order', async () => {
  const t = await table({ dice: [d20(15), die(4, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), st = await t.state(), gate = find(st, 'The Sealed Gate'), ghoul = find(st, 'Pit Ghoul');
  const id = rollOf(await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' })).id; await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' });      /* 7 */
  const progress = async () => find(await t.state(), 'The Sealed Gate').progress.cur;
  const ap1 = await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' }); assert.equal(await progress(), 7);
  assert.equal((await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' })).status, 409); assert.equal(await progress(), 7);
  const e1 = ap1.body.state.log.at(-1).id; await ann.cmd({ type: 'undo', logId: e1 }); assert.equal(await progress(), 0);
  assert.equal((await ann.cmd({ type: 'undo', logId: e1 })).status, 409, 'the same undo twice'); assert.equal(await progress(), 0);
  const ap2 = await ann.cmd({ type: 'apply', rollId: id, cardId: ghoul.id, field: 'hp' }); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 13); assert.equal(await progress(), 0);
  assert.equal((await ann.cmd({ type: 'undo', logId: e1 })).status, 409, 'the first entry stays dead after a second application');
  await ann.cmd({ type: 'undo', logId: ap2.body.state.log.at(-1).id }); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 20);
  assert.equal((await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' })).status, 200); assert.equal(await progress(), 7);
  assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 20, 'only the last application stands');
});

test('the turn: a retried End turn or Next round ticks the timers once, and two people pressing it for the same turn move it once', async () => {
  const t = await table(), ann = await t.join('Ann'); await claim(t, ann, 'Thorne');
  const timer = async () => find(await t.state(), 'The Ceiling Groans').timer.cur;
  const turn = (await t.state()).table; assert.equal(turn.round, 1);
  /* the same Next round sent three times (a retry, a stuck connection) */
  const same = await Promise.all([1, 2, 3].map(() => t.gm.cmd({ type: 'nextRound', expect: { round: 1, idx: 0 } }, { client: 'gmretry001', n: 1 })));
  assert.ok(same.every((r) => r.status === 200)); assert.equal((await t.state()).table.round, 2); assert.equal(await timer(), 3);
  /* a person double-clicks: two different actions, both for the turn they could see */
  const dbl = await Promise.all([t.gm.cmd({ type: 'nextRound', expect: { round: 2, idx: 0 } }), t.gm.cmd({ type: 'nextRound', expect: { round: 2, idx: 0 } })]);
  assert.deepEqual(dbl.map((r) => r.status).sort(), [200, 409]); assert.equal((await t.state()).table.round, 3); assert.equal(await timer(), 2);
  /* Two GM tabs advance the same visible turn: one succeeds, one conflicts. */
  const both = await Promise.all([t.gm.cmd({ type: 'endTurn', expect: { round: 3, idx: 0 } }), t.gm.cmd({ type: 'endTurn', expect: { round: 3, idx: 0 } })]);
  assert.deepEqual(both.map((r) => r.status).sort(), [200, 409]); assert.equal((await t.state()).table.idx, 1); assert.equal((await t.state()).table.round, 3);
  /* retried after the counter has moved on: stale, and the timer does not move */
  const again = await t.gm.cmd({ type: 'nextRound' }, { client: 'gmretry001', n: 1 }); assert.equal(again.body.result.duplicate, true); assert.equal(await timer(), 2);
  await t.gm.cmd({ type: 'point', x: 1, y: 1 }, { client: 'gmother0001', n: 100 }); assert.equal((await t.gm.cmd({ type: 'nextRound' }, { client: 'gmother0001', n: 3 })).status, 409, 'a counter far below the highest accepted is stale (the window is 64)'); assert.equal(await timer(), 2);
});

test('DEFECT: joining twice made two players. Now the same attempt, the same token, or a double click is one player', async () => {
  const t = await table(); const code = t.code;
  const join = (body) => t.svc.handle({ method: 'POST', body: Object.assign({ op: 'join', code, name: 'Ann' }, body) });
  const [a, b, c] = await Promise.all([join({ joinKey: 'attempt-0001' }), join({ joinKey: 'attempt-0001' }), join({ joinKey: 'attempt-0001' })]);
  assert.equal(new Set([a, b, c].map((r) => r.body.pid)).size, 1); assert.equal(new Set([a, b, c].map((r) => r.body.token)).size, 1, 'and the same token');
  assert.equal((await t.state()).players.length, 1);
  const again = await join({ token: a.body.token, name: 'Another name' }); assert.equal(again.body.pid, a.body.pid); assert.equal(again.body.rejoined, true); assert.equal((await t.state()).players.length, 1);
  const other = await join({ joinKey: 'attempt-0002', name: 'Bob' }); assert.notEqual(other.body.pid, a.body.pid); assert.equal((await t.state()).players.length, 2);
  const token = await t.svc.handle({ method: 'GET', query: { code }, token: a.body.token }); assert.equal(token.status, 200);
});

/* ---------- 3. what each person is told ---------- */

const everything = (r) => JSON.stringify(r.body);

test('a hidden timer does not exist for the players: not in the order tick, the turn line, the alert, the results they are sent, or the undo records', async () => {
  const t = await table(), ann = await t.join('Ann'); await claim(t, ann, 'Thorne');
  const dread = (await t.gm.cmd({ type: 'cardCreate', card: { name: 'Cult Ritual', visible: false, timer: { cur: 1, max: 1, auto: true, label: 'The ritual completes' }, gmNotes: 'summons the Warden' } })).body.result.id;
  await t.gm.cmd({ type: 'orderSet', order: [...(await t.state()).table.order.map((o) => o.id), dread] });
  const seen = []; const watch = (r) => { seen.push(everything(r)); return r; };
  /* walk the whole order, the player pressing End turn when it is hers, so the round wraps and the hidden timer reaches 0 */
  await t.gm.cmd({ type: 'endTurn', expect: { round: 1, idx: 0 } }); watch(await ann.get()); for (let i = 0; i < 4; i++) await t.gm.cmd({ type: 'endTurn' });   /* Wisp, Brother Anselm, Tilda, the ghoul: the ritual is next */
  const last = watch(await ann.get()); void last;
  const wrap = await t.gm.cmd({ type: 'endTurn' }); assert.equal(wrap.body.state.table.round, 2); assert.equal(find(await t.state(), 'Cult Ritual').timer.cur, 0);
  assert.equal((await t.state()).alerts.length, 1, 'the GM is alerted');
  seen.push(everything(await ann.get()));
  const gmLog = (await t.state()).log.map((e) => e.text).join('|'); assert.match(gmLog, /TIME: Cult Ritual/);
  const body = seen.join('\n'); for (const word of ['Cult Ritual', 'ritual', 'summons', 'Warden']) assert.ok(!body.includes(word), 'a player was sent: ' + word);
  /* a player who presses End turn when the round wraps is not told what ticked */
  const t2 = await table(), a2 = await t2.join('Ann'); const th = await claim(t2, a2, 'Thorne'); const o = (await t2.state()).table.order.map((x) => x.id);
  const h2 = (await t2.gm.cmd({ type: 'cardCreate', card: { name: 'Secret Clock', visible: false, timer: { cur: 1, max: 1, auto: true } } })).body.result.id;
  await t2.gm.cmd({ type: 'orderSet', order: [o[0]] });
  const denied = await a2.cmd({ type: 'endTurn' }); assert.equal(denied.status, 403); assert.ok(!everything(denied).includes('Secret Clock'));
  const r = await t2.gm.cmd({ type: 'endTurn' }); assert.equal(r.status, 200);
  const player = await a2.get(); assert.ok(!everything(player).includes('Secret Clock')); assert.equal(find(await t2.state(), 'Secret Clock').timer.cur, 0); void th; void h2;
});

test('the turn line does not name a hidden card whose turn it is; a visible timer on a card in another scene is not announced either', async () => {
  const t = await table(), ann = await t.join('Ann'); const sc = (await t.gm.cmd({ type: 'sceneCreate', name: 'Elsewhere' })).body.result.id;
  const away = (await t.gm.cmd({ type: 'cardCreate', card: { name: 'Distant Bell', sceneId: sc, visible: true, timer: { cur: 1, max: 1, auto: true } } })).body.result.id; void away;
  const hidden = (await t.gm.cmd({ type: 'cardCreate', card: { name: 'Ambusher', visible: false, hp: { cur: 8, max: 8 } } })).body.result.id;
  await t.gm.cmd({ type: 'orderSet', order: [hidden] });
  const r = await t.gm.cmd({ type: 'nextRound' }); assert.equal(r.status, 200);
  const view = JSON.stringify((await ann.get()).body); assert.ok(!view.includes('Ambusher') && !view.includes('Distant Bell'));
  assert.ok((await ann.get()).body.state.log.some((e) => /Round 2/.test(e.text)), 'the round change is public');
  assert.ok((await t.state()).log.some((e) => /Ambusher/.test(e.text)), 'the GM’s feed names it');
});

test('showing an enemy while hiding its numbers: the players are not sent them, in the card, the feed, the results or their own roll records', async () => {
  const t = await table({ dice: [d20(15), die(5, 6)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), ghoul = find(await t.state(), 'Pit Ghoul');
  await t.gm.cmd({ type: 'trackerAdd', id: ghoul.id, field: 'timer' }); await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'timer', what: 'label', value: 'It drags itself free' });
  assert.equal((await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { hideNumbers: true } })).status, 200);
  const view = (await ann.get()).body.state, c = view.cards[ghoul.id];
  assert.deepEqual(c.hp, { hidden: true }); assert.equal(c.numbersHidden, true); assert.deepEqual(c.timer, { hidden: true, label: 'It drags itself free' }); assert.equal(view.cards[ghoul.id].gmNotes, undefined);
  const id = rollOf(await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: ghoul.id })).id; await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' });  /* d6 5 + 3 = 8 */
  const ap = await ann.cmd({ type: 'apply', rollId: id, cardId: ghoul.id, field: 'hp' }); assert.equal(ap.status, 200);
  assert.deepEqual(ap.body.result, {}, 'she is not told how much of its HP that was'); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 12, 'but it was applied');
  const raw = JSON.stringify((await ann.get()).body); assert.ok(!/"cur":20|"cur":12|\(now 12\/20\)|-8/.test(raw.replace(/"v":\d+/g, '')), 'no number from the ghoul reached her: ' + (raw.match(/.{30}(\(now 12|"cur":12|"cur":20).{20}/) || [''])[0]);
  assert.ok((await ann.get()).body.state.log.some((e) => /Thorne → Pit Ghoul: a hit\./.test(e.text)));
  assert.ok((await t.state()).log.some((e) => /Pit Ghoul: HP -8 \(now 12\/20\)/.test(e.text)), 'the GM reads the numbers');
  const mine = (await ann.get()).body.state.rolls.at(-1); assert.equal(mine.applied.cardId, ghoul.id); assert.equal(mine.applied.applied, undefined);
  /* the GM's own edits to those numbers are not announced, and its timer reaching 0 alerts only the GM */
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -2 }); assert.ok(!(await ann.get()).body.state.log.some((e) => /12|-2|10/.test(e.text.replace(/Round|Target|d6|d20/g, '')) && /Ghoul/.test(e.text) && /HP/.test(e.text)));
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'timer', value: 1 }); await t.gm.cmd({ type: 'nextRound' });
  assert.ok((await t.state()).log.some((e) => /TIME: Pit Ghoul/.test(e.text))); assert.ok(!(await ann.get()).body.state.log.some((e) => /TIME/.test(e.text)), 'the players are not alerted by a countdown they cannot read');
  /* undo of her hit does not announce the numbers either, and still works */
  const u = await ann.cmd({ type: 'undo', logId: ap.body.state.log.at(-1).id }); assert.equal(u.status, 200); assert.ok(!JSON.stringify(u.body).includes('(now'));
  /* showing the numbers again */
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { hideNumbers: false } }); assert.ok((await ann.get()).body.state.cards[ghoul.id].hp.cur >= 0);
  /* a hero's own numbers cannot be hidden */
  const h = (await t.state()).chars[thorne.id].cardId; await t.gm.cmd({ type: 'cardUpdate', id: h, patch: { hideNumbers: true } }); assert.ok(typeof (await ann.get()).body.state.cards[h].hp.cur === 'number');
});

test('a gift of loot is told to its owner only; the GM’s feed names both', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob'), bell = find(await t.state(), 'Warden’s Bell');
  await t.gm.cmd({ type: 'giveCard', id: bell.id, pid: ann.pid });
  assert.ok((await ann.get()).body.state.log.some((e) => /gives you Warden/.test(e.text))); assert.ok(!JSON.stringify((await bob.get()).body).includes('Warden'));
});

test('no response sent to a player in a whole play-through contains anything the GM has marked secret', async () => {
  const t = await table({ dice: [d20(15), die(3, 6), d20(12)] }), ann = await t.join('Ann'), thorne = await claim(t, ann, 'Thorne'), st = await t.state(), gate = find(st, 'The Sealed Gate');
  const seen = []; const w = async (p) => { const r = await p; seen.push(JSON.stringify(r.body)); return r; };
  const id = rollOf(await w(ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id }))).id; await w(ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' })); await w(ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' }));
  await w(ann.cmd({ type: 'endTurn' })); await w(ann.get()); await w(ann.cmd({ type: 'adjust', cardId: thorne.cardId, field: 'hp', delta: -2 })); await w(ann.cmd({ type: 'setTarget', value: 3 }));
  await w(ann.cmd({ type: 'cardUpdate', id: find(st, 'Warden’s Bell').id, patch: { visible: true } })); await w(ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: find(st, 'Warden’s Bell').id }));
  const all = seen.join('\n'); for (const secret of ['SECRET', 'rusted bar', 'bone whistle', 'Warden', 'Beyond the Gate', 'gmNotes', 'secret"']) assert.ok(!all.includes(secret), secret);
});
