import test from 'node:test';
import assert from 'node:assert/strict';
import { table, d20, die, find, charNamed } from './vtt-helpers.mjs';

test('a new table starts with the sample encounter: an enemy, a sealed gate, a countdown, and a loot card the players cannot see', async () => {
  const t = await table(), ann = await t.join('Ann'); const g = await t.state(), p = (await ann.get()).body.state;
  for (const n of ['Pit Ghoul', 'The Sealed Gate', 'The Ceiling Groans', 'Warden’s Bell']) assert.ok(find(g, n), n);
  assert.equal(find(g, 'The Ceiling Groans').timer.cur, 4); assert.equal(find(g, 'The Sealed Gate').progress.max, 20);
  assert.equal(find(p, 'Warden’s Bell'), undefined, 'unrevealed: not sent');
  assert.equal(Object.keys(g.chars).length, 4); assert.equal(g.table.order.length, 5);
});

test('players are never sent GM notes, unrevealed cards, scene plans or anyone’s tokens; the raw data is searched, not just the screen', async () => {
  const t = await table(), ann = await t.join('Ann'); const body = JSON.stringify((await ann.get()).body);
  for (const secret of ['SECRET', 'rusted bar', 'bone whistle', 'Warden', 'Beyond the Gate', 'hash', 'gmNotes']) assert.ok(!body.includes(secret), 'leaked: ' + secret);
  const gmBody = JSON.stringify((await t.gm.get()).body); assert.ok(gmBody.includes('rusted bar') && gmBody.includes('Warden') && gmBody.includes('Beyond the Gate'));
  assert.ok(!gmBody.includes('"hash"') && !gmBody.includes(ann.token), 'not even the GM is sent token hashes');
  /* and after revealing then hiding again, it goes */
  const st = await t.state(), bell = find(st, 'Warden’s Bell');
  await t.gm.cmd({ type: 'cardUpdate', id: bell.id, patch: { visible: true } }); assert.ok(find((await ann.get()).body.state, 'Warden’s Bell'));
  await t.gm.cmd({ type: 'cardUpdate', id: bell.id, patch: { visible: false } }); assert.equal(find((await ann.get()).body.state, 'Warden’s Bell'), undefined);
});

test('nobody without a token, or with the wrong one, gets anything; a player token is not a GM token', async () => {
  const t = await table(), ann = await t.join('Ann');
  assert.equal((await t.svc.handle({ method: 'GET', query: { code: t.code }, token: '' })).status, 401);
  assert.equal((await t.svc.handle({ method: 'GET', query: { code: t.code }, token: 'nope' })).status, 401);
  assert.equal((await t.svc.handle({ method: 'GET', query: { code: 'ZZZZZZ' }, token: ann.token })).status, 404);
  const r = await ann.cmd({ type: 'setTarget', value: 20 }); assert.equal(r.status, 403); assert.equal((await t.state()).table.target, 12);
});

test('players cannot do the GM’s things: edit cards, trackers, order, scenes, loot, rules or other people’s characters', async () => {
  const t = await table(), ann = await t.join('Ann'), st = await t.state(), gate = find(st, 'The Sealed Gate'), ghoul = find(st, 'Pit Ghoul');
  const tries = [{ type: 'cardUpdate', id: gate.id, patch: { name: 'X' } }, { type: 'cardCreate', card: { name: 'X' } }, { type: 'cardDelete', id: ghoul.id }, { type: 'track', id: ghoul.id, field: 'hp', value: 0 },
    { type: 'orderSet', order: [] }, { type: 'sceneReveal', id: Object.keys(st.scenes || {})[0] || 'sc1' }, { type: 'giveCard', id: gate.id, pid: ann.pid }, { type: 'settings', patch: { nat20AutoSuccess: true } },
    { type: 'charUpdate', id: Object.keys(st.chars)[0], patch: { stats: { STR: 10 } } }, { type: 'nextRound' }, { type: 'drawClear' }, { type: 'assign', charId: Object.keys(st.chars)[0], pid: ann.pid }];
  for (const c of tries) { const r = await ann.cmd(c); assert.equal(r.status, 403, c.type); }
  const after = await t.state(); assert.equal(find(after, 'Pit Ghoul').hp.cur, 20); assert.equal(find(after, 'The Sealed Gate').name, 'The Sealed Gate');
});

test('a player owns one character: claiming, no stealing, no second one; only the owner moves, rolls and adjusts it', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob'); const st = await t.state(), thorne = charNamed(st, 'Thorne'), wisp = charNamed(st, 'Wisp');
  assert.equal((await ann.cmd({ type: 'claim', charId: thorne.id })).status, 200);
  assert.equal((await bob.cmd({ type: 'claim', charId: thorne.id })).status, 403, 'already taken'); assert.equal((await ann.cmd({ type: 'claim', charId: wisp.id })).status, 403, 'only one each');
  assert.equal((await bob.cmd({ type: 'claim', charId: wisp.id })).status, 200);
  assert.equal((await bob.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' })).status, 403, 'Bob cannot roll for Thorne');
  assert.equal((await bob.cmd({ type: 'move', id: thorne.cardId, x: 5, y: 5 })).status, 403); assert.equal((await ann.cmd({ type: 'move', id: thorne.cardId, x: 5, y: 6 })).status, 200);
  assert.equal((await bob.cmd({ type: 'adjust', cardId: thorne.cardId, field: 'hp', delta: -3 })).status, 403); assert.equal((await ann.cmd({ type: 'adjust', cardId: thorne.cardId, field: 'hp', delta: -3 })).status, 200);
  const s2 = (await bob.get()).body.state; assert.equal(s2.cards[thorne.cardId].hp.cur, 7); assert.deepEqual(s2.layout[thorne.cardId].x, 5);
  assert.equal((await ann.cmd({ type: 'adjust', cardId: find(s2, 'Pit Ghoul').id, field: 'hp', delta: -3 })).status, 403, 'players cannot adjust enemies by hand');
  assert.equal((await ann.cmd({ type: 'move', id: find(s2, 'Pit Ghoul').id, x: 1, y: 1 })).status, 403, 'or move them');
});

test('forcing the gate: select, roll STR, see the sum, roll Effort, apply to the gate, end the turn', async () => {
  const t = await table({ dice: [d20(12), die(4, 6)] }), ann = await t.join('Ann'); const st = await t.state(), thorne = charNamed(st, 'Thorne'), gate = find(st, 'The Sealed Gate');
  await ann.cmd({ type: 'claim', charId: thorne.id });
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', adj: 'normal', targetCardId: gate.id }); assert.equal(r.status, 200);
  const roll = r.body.state.rolls.find((x) => x.id === r.body.result.rollId); assert.equal(roll.check.total, 15); assert.equal(roll.check.target, 12); assert.equal(roll.check.success, true);
  assert.match(r.body.state.log.at(-1).text, /12 \+ 3 STR = 15 against Target 12\. Success\. \(The Sealed Gate\)/);
  const e = await ann.cmd({ type: 'effort', rollId: roll.id, cat: 'weapons' }); assert.equal(e.body.state.rolls.at(-1).effort.total, 7); assert.match(e.body.state.log.at(-1).text, /d6 4 \+ 3 Weapons = 7 Effort\./);
  const before = find(await t.state(), 'The Sealed Gate').progress.cur; assert.equal(before, 0, 'nothing changes until Apply');
  const ap = await ann.cmd({ type: 'apply', rollId: roll.id, cardId: gate.id, field: 'progress' }); assert.equal(ap.body.result.applied, 7);
  assert.equal(find(await t.state(), 'The Sealed Gate').progress.cur, 7);
  assert.equal((await ann.cmd({ type: 'apply', rollId: roll.id, cardId: gate.id, field: 'progress' })).status, 409, 'once only');
  const turn = await t.gm.cmd({ type: 'endTurn' }); assert.equal(turn.status, 200); assert.equal(turn.body.state.table.idx, 1);
});

test('checks without Effort, rolls with no target, and physical dice typed in', async () => {
  const t = await table({ dice: [d20(3)] }), ann = await t.join('Ann'), st = await t.state(), thorne = charNamed(st, 'Thorne'); await ann.cmd({ type: 'claim', charId: thorne.id });
  const miss = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'DEX' }); const roll = miss.body.state.rolls.at(-1); assert.equal(roll.targetCardId, null); assert.equal(roll.check.success, false);
  assert.equal((await ann.cmd({ type: 'effort', rollId: roll.id, cat: 'basic' })).status, 400, 'a miss has no Effort');
  const phys = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', d20: 17 }); const r2 = phys.body.state.rolls.at(-1); assert.equal(r2.check.d20, 17); assert.equal(r2.manual, true); assert.match(phys.body.state.log.at(-1).text, /physical die/);
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', d20: 25 })).status, 400);
  const eff = await ann.cmd({ type: 'effort', rollId: r2.id, cat: 'weapons', rolled: 6 }); assert.equal(eff.body.state.rolls.at(-1).effort.total, 9);
  assert.equal((await ann.cmd({ type: 'effort', rollId: r2.id, cat: 'weapons', rolled: 1 })).status, 409, 'no re-rolling for a better number');
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', d20: 14, adj: 'hard' })).body.state.rolls.at(-1).check.target, 15);
});

test('a roll cannot reach a card the player cannot see', async () => {
  const t = await table({ dice: [d20(20), die(3, 6)] }), ann = await t.join('Ann'), st = await t.state(), thorne = charNamed(st, 'Thorne'), bell = find(st, 'Warden’s Bell'); await ann.cmd({ type: 'claim', charId: thorne.id });
  assert.equal((await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: bell.id })).status, 404);
  const r = await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR' }); const id = r.body.state.rolls.at(-1).id; await ann.cmd({ type: 'effort', rollId: id, cat: 'basic' });
  assert.equal((await ann.cmd({ type: 'apply', rollId: id, cardId: bell.id, field: 'hp' })).status, 404);
});

test('the same command sent twice is applied once, even when the second arrives while the first is still being saved', async () => {
  const t = await table(), st = await t.state(), ghoul = find(st, 'Pit Ghoul');
  const cmd = { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -4, actionId: 'dupclient1.1' };
  const [a, b, c] = await Promise.all([t.gm.cmd(cmd), t.gm.cmd(cmd), t.gm.cmd(cmd)]);
  assert.ok([a, b, c].every((r) => r.status === 200)); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 16);
  assert.ok([a, b, c].some((r) => r.body.result.duplicate), 'the repeats say so');
  assert.equal((await t.state()).log.filter((e) => /Pit Ghoul HP/.test(e.text)).length, 1);
});

test('many people acting at once: every change lands exactly once and none overwrites another', async () => {
  const t = await table(), st = await t.state(), ghoul = find(st, 'Pit Ghoul'), clock = find(st, 'The Ceiling Groans');
  await Promise.all([...Array(10)].map((_, i) => t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 })).concat([...Array(3)].map(() => t.gm.cmd({ type: 'track', id: clock.id, field: 'timer', mode: 'delta', value: -1 }))));
  const after = await t.state(); assert.equal(find(after, 'Pit Ghoul').hp.cur, 10); assert.equal(find(after, 'The Ceiling Groans').timer.cur, 1);
});

test('undo takes back one action and leaves later, unrelated ones alone', async () => {
  const t = await table({ dice: [d20(15), die(5, 6)] }), ann = await t.join('Ann'), st = await t.state(), thorne = charNamed(st, 'Thorne'), gate = find(st, 'The Sealed Gate'), ghoul = find(st, 'Pit Ghoul'); await ann.cmd({ type: 'claim', charId: thorne.id });
  const id = (await ann.cmd({ type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id })).body.state.rolls.at(-1).id; await ann.cmd({ type: 'effort', rollId: id, cat: 'weapons' });
  const ap = await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' }); assert.equal(find(await t.state(), 'The Sealed Gate').progress.cur, 8);
  await t.gm.cmd({ type: 'track', id: gate.id, field: 'progress', mode: 'delta', value: 3 });         /* a later change by the GM to the same number */
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -5 });            /* and one elsewhere */
  const entry = ap.body.state.log.at(-1); assert.equal(entry.undoable, true);
  const u = await ann.cmd({ type: 'undo', logId: entry.id }); assert.equal(u.status, 200);
  const after = await t.state(); assert.equal(find(after, 'The Sealed Gate').progress.cur, 3, 'only Ann’s 8 came off; the GM’s 3 stayed'); assert.equal(find(after, 'Pit Ghoul').hp.cur, 15);
  assert.equal((await ann.cmd({ type: 'undo', logId: entry.id })).status, 409, 'once only');
  const again = await ann.cmd({ type: 'apply', rollId: id, cardId: gate.id, field: 'progress' }); assert.equal(again.status, 200, 'after an undo the Effort can be applied again, perhaps to somewhere else');
});

test('undo is the author’s or the GM’s only', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob'), st = await t.state(), thorne = charNamed(st, 'Thorne'); await ann.cmd({ type: 'claim', charId: thorne.id });
  const r = await ann.cmd({ type: 'adjust', cardId: thorne.cardId, field: 'hp', delta: -4 }); const entry = r.body.state.log.at(-1);
  assert.equal((await bob.get()).body.state.log.at(-1).undoable, false); assert.equal((await bob.cmd({ type: 'undo', logId: entry.id })).status, 403);
  assert.equal((await t.gm.cmd({ type: 'undo', logId: entry.id })).status, 200); assert.equal((await t.state()).cards[thorne.cardId].hp.cur, 10);
});

test('turns and timers: the countdown loses 1 when a new round begins, the GM is alerted at 0, and nothing else moves', async () => {
  const t = await table(), ann = await t.join('Ann'), st = await t.state(), thorne = charNamed(st, 'Thorne'); await ann.cmd({ type: 'claim', charId: thorne.id });
  const clock = () => find(null, '') ; void clock;
  const timerOf = async () => find(await t.state(), 'The Ceiling Groans').timer;
  assert.equal((await t.gm.cmd({ type: 'endTurn' })).status, 200, 'the GM advances Thorne’s turn'); assert.equal((await ann.cmd({ type: 'endTurn' })).status, 403, 'then it is Wisp’s turn, not Ann’s');
  assert.equal((await timerOf()).cur, 4, 'no new round yet');
  for (let i = 0; i < 3; i++) await t.gm.cmd({ type: 'endTurn' }); const wrap = await t.gm.cmd({ type: 'endTurn' }); /* Wisp, Brother Anselm, Tilda, then the ghoul, wraps to round 2 */
  assert.equal(wrap.body.state.table.round, 2); assert.equal(wrap.body.state.table.idx, 0); assert.equal((await timerOf()).cur, 3);
  for (let i = 0; i < 3; i++) await t.gm.cmd({ type: 'nextRound' });
  const z = await timerOf(); assert.equal(z.cur, 0); assert.equal(z.fired, true);
  assert.deepEqual((await t.state()).alerts.map((a) => a.name), ['The Ceiling Groans']);
  assert.ok((await ann.get()).body.state.log.some((e) => /TIME: The Ceiling Groans/.test(e.text)), 'the table sees it too, the GM decides what it means');
  await t.gm.cmd({ type: 'nextRound' }); assert.equal((await timerOf()).cur, 0, 'it stays at 0');
  await t.gm.cmd({ type: 'ack', id: find(await t.state(), 'The Ceiling Groans').id }); assert.deepEqual((await t.state()).alerts, []);
});

test('a paused timer does not move, a manual one does not move by itself, and the GM can set either', async () => {
  const t = await table(), st = await t.state(), clock = find(st, 'The Ceiling Groans');
  await t.gm.cmd({ type: 'track', id: clock.id, field: 'timer', what: 'paused', value: true }); await t.gm.cmd({ type: 'nextRound' }); assert.equal(find(await t.state(), 'The Ceiling Groans').timer.cur, 4);
  await t.gm.cmd({ type: 'track', id: clock.id, field: 'timer', what: 'paused', value: false }); await t.gm.cmd({ type: 'track', id: clock.id, field: 'timer', what: 'auto', value: false });
  await t.gm.cmd({ type: 'nextRound' }); assert.equal(find(await t.state(), 'The Ceiling Groans').timer.cur, 4);
  await t.gm.cmd({ type: 'track', id: clock.id, field: 'timer', value: 2 }); assert.equal(find(await t.state(), 'The Ceiling Groans').timer.cur, 2);
});

test('undoing a turn is refused once the turn has moved on; a hidden timer ticks and alerts only the GM', async () => {
  const t = await table(), ann = await t.join('Ann'), st = await t.state(); const thorne = charNamed(st, 'Thorne'); await ann.cmd({ type: 'claim', charId: thorne.id });
  const e1 = (await t.gm.cmd({ type: 'endTurn' })).body.state.log.at(-1); await t.gm.cmd({ type: 'endTurn' });
  assert.equal((await t.gm.cmd({ type: 'undo', logId: e1.id })).status, 409);
  assert.equal((await ann.cmd({ type: 'undo', logId: e1.id })).status, 403, 'a player never takes a turn back (only the GM does)');
  const sec = await t.gm.cmd({ type: 'cardCreate', card: { name: 'Hidden dread', visible: false, timer: { cur: 1, max: 1, auto: true }, gmNotes: 'The cult arrives' } }); assert.equal(sec.status, 200);
  await t.gm.cmd({ type: 'nextRound' }); const gmState = await t.state(); assert.equal(gmState.alerts.length, 1);
  const seen = JSON.stringify((await ann.get()).body); assert.ok(!seen.includes('Hidden dread') && !seen.includes('cult arrives'));
});

test('the GM can give a loot card to a player: it is theirs alone, off the table, and the others never see it', async () => {
  const t = await table(), ann = await t.join('Ann'), bob = await t.join('Bob'), st = await t.state(), bell = find(st, 'Warden’s Bell');
  await t.gm.cmd({ type: 'giveCard', id: bell.id, pid: ann.pid });
  const a = (await ann.get()).body.state, b = (await bob.get()).body.state;
  assert.equal(a.cards[bell.id].owner, ann.pid); assert.equal(a.layout[bell.id], undefined, 'not on the table'); assert.equal(find(b, 'Warden’s Bell'), undefined);
  assert.ok(a.log.some((e) => /The GM gives you Warden’s Bell/.test(e.text))); assert.ok(!(await bob.get()).body.state.log.some((e) => /Bell/.test(e.text)), 'a private gift is not announced to the table'); assert.ok((await t.state()).log.some((e) => /gives Warden’s Bell to Ann/.test(e.text)), 'the GM’s feed names both');
  await t.gm.cmd({ type: 'giveCard', id: bell.id, pid: null }); assert.ok(find((await bob.get()).body.state, 'Warden’s Bell'), 'taken back, it is on the table for everyone (the GM can hide it again)');
});

test('preparing and revealing a scene: its cards stay off the players’ table until the GM reveals it', async () => {
  const t = await table(), ann = await t.join('Ann'); const sc = (await t.gm.cmd({ type: 'sceneCreate', name: 'The Stairs' })).body.result.id;
  await t.gm.cmd({ type: 'sceneUpdate', id: sc, bg: 'https://example.com/stairs.jpg' });
  await t.gm.cmd({ type: 'cardCreate', card: { name: 'Stair Wraith', sceneId: sc, hp: { cur: 10, max: 10 } } });
  assert.equal(find((await ann.get()).body.state, 'Stair Wraith'), undefined);
  await t.gm.cmd({ type: 'sceneReveal', id: sc }); const p = (await ann.get()).body.state;
  assert.ok(find(p, 'Stair Wraith')); assert.equal(p.table.scene.bg, 'https://example.com/stairs.jpg'); assert.equal(find(p, 'Pit Ghoul'), undefined, 'the old scene’s cards are no longer shown'); assert.ok(find(p, 'Thorne'), 'heroes travel');
  assert.equal((await t.gm.cmd({ type: 'sceneUpdate', id: sc, bg: 'javascript:alert(1)' })).status, 400, 'only https images');
});

test('GM quick actions: create, duplicate, edit every tracker, reorder, target, and hide', async () => {
  const t = await table(), ann = await t.join('Ann'), st = await t.state(), ghoul = find(st, 'Pit Ghoul');
  const created = await t.gm.cmd({ type: 'cardCreate', card: { name: 'Chest' } }); assert.equal(created.status, 200); const chest = created.body.result.id;
  assert.equal((await t.state()).cards[chest].hp, null, 'a card needs no stats');
  const dup = (await t.gm.cmd({ type: 'cardDuplicate', id: ghoul.id })).body.result.id; assert.equal((await t.state()).cards[dup].name, 'Pit Ghoul 2'); assert.equal((await t.state()).cards[dup].hp.cur, 20);
  await t.gm.cmd({ type: 'trackerAdd', id: chest, field: 'progress' }); await t.gm.cmd({ type: 'track', id: chest, field: 'progress', what: 'max', value: 30 }); await t.gm.cmd({ type: 'track', id: chest, field: 'progress', value: 12 });
  assert.deepEqual({ cur: (await t.state()).cards[chest].progress.cur, max: (await t.state()).cards[chest].progress.max }, { cur: 12, max: 30 });
  await t.gm.cmd({ type: 'track', id: ghoul.id, field: 'hp', value: 999 }); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 20, 'clamped to its maximum');
  const order = (await t.state()).table.order.map((o) => o.id).reverse(); await t.gm.cmd({ type: 'orderSet', order }); assert.deepEqual((await t.state()).table.order.map((o) => o.id), order);
  await t.gm.cmd({ type: 'setTarget', value: 15 }); assert.equal((await ann.get()).body.state.table.target, 15); assert.equal((await t.gm.cmd({ type: 'setTarget', value: 'x' })).status, 400);
  await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { visible: false } }); const p = (await ann.get()).body.state; assert.equal(find(p, 'Pit Ghoul'), undefined); assert.ok(p.table.order.some((o) => o.hidden), 'its place in the order is kept, its name is not');
});

test('reconnecting: the same token gets the whole table back; an unchanged poll says so; a stale view catches up', async () => {
  const t = await table(), ann = await t.join('Ann'); const first = (await ann.get()).body; assert.ok(first.state.cards);
  const same = (await ann.get(first.v)).body; assert.equal(same.unchanged, true);
  await t.gm.cmd({ type: 'setTarget', value: 14 }); const next = (await ann.get(first.v)).body; assert.equal(next.state.table.target, 14); assert.ok(next.v > first.v);
  const fresh = (await ann.get()).body; assert.equal(fresh.state.table.target, 14);
});

test('the log and the other limits: no hidden-card entries for players, bad input is refused, a table has a ceiling', async () => {
  const t = await table(), ann = await t.join('Ann'); await t.gm.cmd({ type: 'cardCreate', card: { name: 'Trapdoor', visible: false } });
  assert.ok((await t.state()).log.some((e) => /Trapdoor/.test(e.text))); assert.ok(!(await ann.get()).body.state.log.some((e) => /Trapdoor/.test(e.text)));
  assert.equal((await t.gm.cmd({ type: 'cardCreate', card: { name: 'X', img: 'http://insecure.example/x.png' } })).status, 400);
  assert.equal((await t.gm.cmd({ type: 'nope' })).status, 400); assert.equal((await t.gm.cmd({ type: 'track', id: 'zz', field: 'hp', value: 1 })).status, 404);
  const many = await Promise.all([...Array(12)].map((_, i) => t.join('P' + i))); assert.equal(many.length, 12);
  const full = await t.svc.handle({ method: 'POST', body: { op: 'join', code: t.code, name: 'One too many' } }); assert.equal(full.status, 403, 'a table of twelve is full');
});

test('Effort on its own (no check first) can be rolled from the character’s bonuses and applied like any other', async () => {
  const t = await table({ dice: [die(2, 8)] }), ann = await t.join('Ann'), st = await t.state(), wisp = charNamed(st, 'Wisp'), ghoul = find(st, 'Pit Ghoul'); await ann.cmd({ type: 'claim', charId: wisp.id });
  const r = await ann.cmd({ type: 'freeEffort', charId: wisp.id, cat: 'guns' }); const roll = r.body.state.rolls.at(-1); assert.equal(roll.check, null); assert.equal(roll.effort.total, 3); /* d8 2 + 1 Guns */
  assert.equal((await ann.cmd({ type: 'apply', rollId: roll.id, cardId: ghoul.id, field: 'hp' })).body.result.applied, -3); assert.equal(find(await t.state(), 'Pit Ghoul').hp.cur, 17);
  assert.equal((await ann.cmd({ type: 'freeEffort', charId: charNamed(st, 'Thorne').id, cat: 'basic' })).status, 403);
});

test('the GM edits a hero’s stats, Effort bonuses and armour; the player sees the new numbers, and the cap holds', async () => {
  const t = await table(), ann = await t.join('Ann'), st = await t.state(), thorne = charNamed(st, 'Thorne'); await ann.cmd({ type: 'claim', charId: thorne.id });
  await t.gm.cmd({ type: 'charUpdate', id: thorne.id, patch: { stats: { STR: 4, DEX: 99 }, effort: { weapons: 5 }, armour: 3, name: 'Thorne the Tall' } });
  const c = Object.values((await ann.get()).body.state.chars).find((x) => x.owner === ann.pid); assert.equal(c.stats.STR, 4); assert.equal(c.stats.DEX, 10, 'never more than +10'); assert.equal(c.effort.weapons, 5); assert.equal(c.armour, 3); assert.equal(c.name, 'Thorne the Tall');
  assert.equal((await t.state()).cards[c.cardId].name, 'Thorne the Tall', 'the token follows the name');
});
