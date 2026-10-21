// Checks a DEPLOYED Sacrament RPG table over HTTP, against the real function and the real storage. Nothing here is mocked: it makes real tables on the site you point it at
// (each is a few kilobytes in Netlify Blobs; there is no delete) and plays them.
//   node scripts/vtt/live-check.mjs https://playsacrament.com [--deep]
// --deep also pushes 420 commands through one table to prove a very old command is refused (takes a couple of minutes).
const base = (process.argv[2] || '').replace(/\/$/, ''); const deep = process.argv.includes('--deep');
if (!/^https?:\/\//.test(base)) { console.error('Usage: node scripts/vtt/live-check.mjs https://your-site [--deep]'); process.exit(2); }
const URL_ = base + '/.netlify/functions/vtt'; const results = []; const T = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (name, ok, detail) => { results.push([name, !!ok]); console.log((ok ? 'PASS ' : 'FAIL ') + name + (detail !== undefined && !ok ? '  — ' + String(detail).slice(0, 260) : (detail !== undefined ? '  — ' + String(detail).slice(0, 160) : ''))); };
/* a dropped socket on the way to the site is retried, as a real page does (every command carries its id, so a resend cannot count twice) */
const again = async (f) => { for (let i = 0; ; i++) { try { return await f(); } catch (e) { if (i >= 3) throw e; await T(400 * (i + 1)); } } };
const post = (body, token) => again(() => post1(body, token));
const post1 = async (body, token) => { const t0 = Date.now(); const r = await fetch(URL_, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, body: j, ms: Date.now() - t0 }; };
const get = (q, token) => again(async () => { const r = await fetch(URL_ + '?' + new URLSearchParams(q), { headers: token ? { authorization: 'Bearer ' + token } : {} }); return { status: r.status, body: await r.json().catch(() => ({})) }; });
const rid = () => Math.random().toString(36).slice(2, 14).padEnd(12, 'x');
const find = (st, n) => Object.values(st.cards).find((c) => c.name === n);
const lanes = {}; const cmd = (who, c, lane = 'g') => { const k = who.token + lane; lanes[k] = lanes[k] || { id: rid() + lane, n: 0 }; const L = lanes[k]; return post({ op: 'cmd', code: who.code, cmd: { actionId: L.id + '.' + (++L.n), ...c } }, who.token); };
const raw = (who, id, n, c) => post({ op: 'cmd', code: who.code, cmd: { actionId: id + '.' + n, ...c } }, who.token);
const state = async (who) => (await get({ code: who.code }, who.token)).body.state;

console.log('Target: ' + base + '\n');
console.log('--- the runtime');
{
  const made = await post({ op: 'create' }); if (made.status !== 200) { check('a table can be made on the site', false, made.status + ' ' + JSON.stringify(made.body)); process.exit(1); }
  const gm = { code: made.body.code, token: made.body.token }; check('a table can be made (a real write to the store)', true, gm.code);
  const d = await get({ code: gm.code, diag: 1 }, gm.token);
  if (d.status === 200) { const [maj, min] = d.body.node.slice(1).split('.').map(Number); check('the function runs on Node 22.12 or later (what @netlify/blobs 11 needs)', maj > 22 || (maj === 22 && min >= 12), d.body.node); if (/^https?:\/\/localhost/.test(base)) console.log('INFO local run: the store is ' + d.body.store); else check('the store is Netlify Blobs', d.body.store === 'blobs', d.body.store); console.log('INFO strong-consistency reads available in the function: ' + d.body.strongRead + (d.body.strongRead === false ? ' (reads fall back to ordinary reads; the conditional writes still protect every change)' : '')); }
  else check('diagnostics answer (the deployed version has them)', false, d.status + ' ' + JSON.stringify(d.body));

  console.log('--- joining and resuming');
  const key = 'live-' + rid(); const j1 = await post({ op: 'join', code: gm.code, name: 'Ann', joinKey: key }), j2 = await post({ op: 'join', code: gm.code, name: 'Ann', joinKey: key }), j3 = await post({ op: 'join', code: gm.code, name: 'Ann', joinKey: key });
  const ann = { code: gm.code, token: j1.body.token, pid: j1.body.pid }; const j4 = await post({ op: 'join', code: gm.code, name: 'Bob', joinKey: 'live-' + rid() }); const bob = { code: gm.code, token: j4.body.token, pid: j4.body.pid };
  const st0 = await state(gm);
  check('a repeated join is one player (same key three times, one place)', j1.body.pid === j2.body.pid && j2.body.pid === j3.body.pid && st0.players.filter((p) => p.name === 'Ann').length === 1);
  const resumed = await get({ code: gm.code }, ann.token); check('a player resumes with the token they hold', resumed.status === 200 && resumed.body.state.you.pid === ann.pid);
  check('the GM resumes with theirs, and sees the GM view', (await get({ code: gm.code }, gm.token)).body.state.you.role === 'gm');
  check('a wrong token is refused, and so is no token', (await get({ code: gm.code }, 'nope')).status === 401 && (await get({ code: gm.code }, '')).status === 401);
  check('an unknown table is not found', (await get({ code: 'ZZZZZZ' }, ann.token)).status === 404);
  const thorne = Object.values(st0.chars).find((c) => c.name === 'Thorne'), wisp = Object.values(st0.chars).find((c) => c.name === 'Wisp');
  await cmd(ann, { type: 'claim', charId: thorne.id }); await cmd(bob, { type: 'claim', charId: wisp.id });
  check('each player took a hero, and a second attempt on a taken one is refused', (await cmd(bob, { type: 'claim', charId: thorne.id })).status === 403);

  console.log('--- concurrent actions and conditional writes');
  const ghoul = find(st0, 'Pit Ghoul'), gate = find(st0, 'The Sealed Gate'), clock = find(st0, 'The Ceiling Groans');
  const batch = [...Array(12)].map(() => cmd(gm, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 })).concat(
    [...Array(4)].map(() => cmd(ann, { type: 'adjust', cardId: thorne.cardId, field: 'hp', delta: -1 })), [...Array(3)].map(() => cmd(bob, { type: 'adjust', cardId: wisp.cardId, field: 'hp', delta: -1 })),
    [...Array(3)].map(() => cmd(gm, { type: 'track', id: clock.id, field: 'timer', mode: 'delta', value: -1 })), [cmd(gm, { type: 'setTarget', value: 14 }), cmd(gm, { type: 'track', id: gate.id, field: 'progress', mode: 'delta', value: 5 })]);
  const t0 = Date.now(); const res = await Promise.all(batch); const dt = Date.now() - t0;
  check('all ' + res.length + ' simultaneous commands from three people were accepted (none lost to a busy table)', res.every((r) => r.status === 200), res.map((r) => r.status).join() + ' ' + JSON.stringify([...new Set(res.filter((r) => r.status !== 200).map((r) => JSON.stringify(r.body || r.json || r.data || {})))].slice(0, 2)) + ' in ' + dt + ' ms');
  const st1 = await state(gm);
  check('every accepted change is in the stored table: the ghoul took 12, Thorne 4, Wisp 3, the countdown 3, the gate 5, the Target moved', find(st1, 'Pit Ghoul').hp.cur === 8 && st1.cards[thorne.cardId].hp.cur === 6 && st1.cards[wisp.cardId].hp.cur === 7 && find(st1, 'The Ceiling Groans').timer.cur === 1 && find(st1, 'The Sealed Gate').progress.cur === 5 && st1.table.target === 14, JSON.stringify([find(st1, 'Pit Ghoul').hp.cur, st1.cards[thorne.cardId].hp.cur, st1.cards[wisp.cardId].hp.cur, find(st1, 'The Ceiling Groans').timer.cur, find(st1, 'The Sealed Gate').progress.cur, st1.table.target]));
  check('(a write that overwrote another would have lost some of those: each of the 22 is one version of the table, and they all stand)', st1.v - st0.v >= 22 + 2, 'versions ' + st0.v + ' → ' + st1.v);
  const slow = Math.max(...res.map((r) => r.ms)); console.log('INFO slowest of the 22 simultaneous commands: ' + slow + ' ms; the whole batch: ' + dt + ' ms');

  console.log('--- retries do not duplicate');
  const cid = rid();
  const same = await Promise.all([1, 2, 3].map(() => raw(ann, cid + 'g', 1, { type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id, d20: 15 })));
  const rollsNow = (await state(ann)).rolls; check('the same roll sent three times at once is one roll, with one result', same.every((r) => r.status === 200) && rollsNow.length === 1 && new Set(same.map((r) => r.body.result.rollId)).size === 1 && same.filter((r) => r.body.result.duplicate).length === 2, JSON.stringify(same.map((r) => [r.status, r.body.result && r.body.result.duplicate])));
  const dice = rollsNow[0].check.d20; const later = await raw(ann, cid + 'g', 1, { type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: gate.id, d20: 15 }); check('sent again later it still gives the same roll, not a new one', later.body.result.duplicate === true && (await state(ann)).rolls.length === 1 && (await state(ann)).rolls[0].check.d20 === dice, 'd20 ' + dice);
  const rollId = rollsNow[0].id; let applied;
  if (rollsNow[0].check.success) { const e = await raw(ann, cid + 'g', 2, { type: 'effort', rollId, cat: 'weapons' }); check('Effort rolled once', e.status === 200); const ap = await Promise.all([3, 3, 3].map((n) => raw(ann, cid + 'g', n, { type: 'apply', rollId, cardId: gate.id, field: 'progress' }))); const prog = find(await state(gm), 'The Sealed Gate').progress.cur; applied = prog - 5;
    check('applying it three times at once changes the gate once', ap.every((r) => r.status === 200) && applied === (await state(ann)).rolls[0].effort.total, 'progress ' + prog + ', effort ' + (await state(ann)).rolls[0].effort.total); }
  else console.log('INFO the live roll missed (d20 ' + dice + '), so the Effort and Apply retry checks were skipped for this run; run it again');
  const hpBefore = find(await state(gm), 'Pit Ghoul').hp.cur; const dmg = await Promise.all([1, 2, 3].map(() => raw(gm, cid + 'h', 1, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -3 })));
  check('a damage edit sent three times is taken once', dmg.every((r) => r.status === 200) && find(await state(gm), 'Pit Ghoul').hp.cur === hpBefore - 3);
  const bFirst = await raw(gm, cid + 'o', 2, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -2 }); const bSecond = await raw(gm, cid + 'o', 1, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 });
  check('two commands that arrive in the wrong order are both applied, once', bFirst.status === 200 && bSecond.status === 200 && find(await state(gm), 'Pit Ghoul').hp.cur === hpBefore - 6);
  check('a pointer, however late, does not disturb gameplay', (await raw(gm, cid + 't', 90, { type: 'point', x: 5, y: 5 })).status === 200 && (await raw(gm, cid + 'z', 1, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 })).status === 200);

  console.log('--- hidden information (over the real service)');
  const secret = await cmd(gm, { type: 'cardCreate', card: { name: 'Hidden Hexagon', visible: false, gmNotes: 'PRIVATE-NOTE-XYZ', timer: { cur: 1, max: 1, auto: true, label: 'Hex ritual' } } });
  const brute = (await cmd(gm, { type: 'cardCreate', card: { name: 'Veiled Brute', kind: 'token', hp: { cur: 113, max: 137 }, progress: { cur: 71, max: 89 }, timer: { cur: 53, max: 59, auto: true }, hideNumbers: true } })).body.result.id;
  const seen = []; const w = (r) => { seen.push(JSON.stringify(r.body)); return r; };
  w(await get({ code: gm.code }, ann.token)); const r1 = w(await cmd(ann, { type: 'roll', charId: thorne.id, stat: 'STR', targetCardId: brute, d20: 15 })); const rid1 = r1.body.state.rolls.at(-1).id;
  w(await cmd(ann, { type: 'effort', rollId: rid1, cat: 'weapons', rolled: 4 })); const ap = w(await cmd(ann, { type: 'apply', rollId: rid1, cardId: brute, field: 'hp' }));
  const left = find(await state(gm), 'Veiled Brute').hp.cur; w(await cmd(ann, { type: 'undo', logId: ap.body.state.log.at(-1).id })); w(await cmd(ann, { type: 'apply', rollId: rid1, cardId: brute, field: 'hp' }));
  await cmd(gm, { type: 'nextRound', expect: { round: (await state(gm)).table.round, idx: (await state(gm)).table.idx } }); w(await get({ code: gm.code }, ann.token)); w(await get({ code: gm.code }, bob.token));
  const all = seen.join('\n'); const numbers = ['113', '137', '71', '89', '53', '59', String(left)];
  check('a player is never sent the GM’s notes, a hidden card, its countdown, or the name of a hidden timer', !/PRIVATE-NOTE-XYZ|Hidden Hexagon|Hex ritual|Warden|rusted bar|bone whistle|Beyond the Gate|"gmNotes"|"secret"|"hash"/.test(all));
  check('…or any figure of a card whose numbers are hidden (HP, maximum, progress, countdown, what is left), in state, command answers or undo answers', numbers.every((n) => !new RegExp('(?<![A-Za-z0-9])' + n + '(?![A-Za-z0-9])').test(all)), numbers.filter((n) => new RegExp('(?<![A-Za-z0-9])' + n + '(?![A-Za-z0-9])').test(all)).map((n) => n + ' in ...' + (all.match(new RegExp('.{0,40}(?<![A-Za-z0-9])' + n + '(?![A-Za-z0-9]).{0,20}')) || [''])[0] + '...').join(' | '));
  check('the GM does see them, and the hit stands once (undone and applied again)', find(await state(gm), 'Veiled Brute').hp.cur === left && left === 113 - 7, 'left ' + left);
  check('players can still see their own dice', /d6 4 \+ 3 Weapons = 7/.test(all) && /15 \+ 3 STR/.test(all));
  check('the other player could not use the first player’s roll or ids', (await raw(bob, cid + 'g', 7, { type: 'roll', charId: wisp.id, stat: 'DEX' })).status === 409);
  void secret;

  if (deep) {
    console.log('--- an old command, after more than 400 others (this takes a while)');
    const old = rid(); await raw(gm, old + 'g', 1, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }); const h0 = find(await state(gm), 'Pit Ghoul').hp.cur;
    const flood = rid(); for (let i = 1; i <= 410; i++) { await raw(gm, flood + 'g', i, { type: 'setTarget', value: 12 + (i % 3) }); if (i % 50 === 0) console.log('INFO ' + i + ' commands sent'); }
    const replay = await raw(gm, old + 'g', 1, { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1 }); check('a command repeated after 410 others is refused as stale and does nothing', replay.status === 409 && find(await state(gm), 'Pit Ghoul').hp.cur === h0, replay.status);
  }

  console.log('\nTable used: ' + gm.code + ' (GM token not printed). Save failures and the offline banner are checked in the browser: node scripts/vtt/e2e.cjs with VTT_BASE set.');
}
console.log('\n' + results.filter((r) => r[1]).length + ' passed, ' + results.filter((r) => !r[1]).length + ' failed'); process.exit(results.some((r) => !r[1]) ? 1 : 0);
