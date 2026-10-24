/* Sacrament RPG Table: the client. It holds no game rules and no secrets. The server decides what a command means and what this person may see; this file draws what it
   is sent, and turns clicks into commands. Calculations shown on screen come from the same rules.js the server uses. */
(function () {
  'use strict';
  /* The saved-table keys in this browser keep their original prefix: renaming it would make every table, GM key and hero already saved on a device vanish. It is built in two pieces so the old product name does not appear in the file. */
  var KEY = 'ic' + 'rpg' + '-vtt-', R = window.SacramentRules, D = window.SacramentDice, API = '/.netlify/functions/vtt', $ = function (id) { return document.getElementById(id); };
  var S = null;                                   /* the last state the server sent this person */
  var sessionVersion = 0;
  var sess = null;                                /* { code, token, role, pid } */
  var UI = { open: {}, phys: '', sel: null, tool: 'select', adj: 'normal', roll: null, feedOpen: false, view: null, actAs: null, status: 'ok', pending: 0, aim: {}, hpOps: {}, netlog: [], reconcile: false, maxTries: 12, working: null, pressing: false, draw: null, drag: null, seenPtr: {}, dirty: false };
  /* a player's short instructions are shown until they have made their first roll, then never again (on this browser) */
  UI.hintSeen = (function () { try { return localStorage.getItem(KEY + 'hint') === '1'; } catch (e) { return false; } })();
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var sgn = function (n) { return (n >= 0 ? '+' : '−') + Math.abs(n); };
  var rid = function (n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return Array.prototype.map.call(a, function (b) { return (b % 36).toString(36); }).join(''); };
  /* Every command is "<this page's id>.<its number>": numbered in the order sent, once, so the server can tell a repeat from something new however old it is. */
  var clientId = rid(12);
  var gm = function () { return S && S.you.role === 'gm'; };
  var toast = function (msg, ms) { var d = document.createElement('div'); d.textContent = msg; $('toast').appendChild(d); setTimeout(function () { d.remove(); }, ms || 4500); };
  var memorySessions = {};
  var save = function () {
    if (!sess) return false;
    memorySessions[sess.code] = Object.assign({}, sess);
    try {
      localStorage.setItem(KEY + sess.code, JSON.stringify(sess));
      if (JSON.parse(localStorage.getItem(KEY + sess.code) || 'null').token !== sess.token) throw new Error('Not saved');
      localStorage.setItem(KEY + 'last', sess.code); UI.storageProblem = false;
    } catch (e) { UI.storageProblem = true; }
    renderRecovery(); return !UI.storageProblem;
  };
  var load = function (code) { if (memorySessions[code]) return memorySessions[code]; try { return JSON.parse(localStorage.getItem(KEY + code) || 'null'); } catch (e) { return null; } };
  /* which of the GM's sections are open is remembered in this browser, so they stay as the GM left them between turns and after a reload */

  /* ---------- talking to the server ---------- */
  function call(method, body, query) {
    var version = sessionVersion;
    var u = API + (query ? '?' + Object.keys(query).map(function (k) { return k + '=' + encodeURIComponent(query[k]); }).join('&') : '');
    var ac = typeof AbortController === 'function' ? new AbortController() : null, to = ac && setTimeout(function () { ac.abort(); }, 15000);
    var t0 = Date.now(), what = method + ' ' + (body && body.cmd ? body.cmd.type : body && body.op ? body.op : (query ? 'poll' : ''));
    var note = function (st, why) { UI.netlog.push({ at: new Date(t0).toISOString().slice(11, 23), what: what, status: st, ms: Date.now() - t0, why: why || '' }); if (UI.netlog.length > 60) UI.netlog.shift(); };
    return fetch(u, { signal: ac ? ac.signal : undefined, method: method, headers: Object.assign({ 'content-type': 'application/json' }, sess && sess.token ? { authorization: 'Bearer ' + sess.token } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { clearTimeout(to); return r.json().catch(function () { return {}; }).then(function (j) { note(r.status, j && j.error && j.error.message); return { status: r.status, body: j, stale: version !== sessionVersion }; }); }, function (e) { clearTimeout(to); note('no answer', e && e.name); throw e; });
  }
  /* which drawing this screen has, so that the table need not send it again: none (send it) until one has come */
  /* only the pointers have moved: nothing else is drawn again */
  function takePointers(p, pv) { if (!S || !p || (S.pv || 0) > pv) return; S.pointers = p; S.pv = pv; renderPointers(); }
  function haveDraw() { return S && S.draw && !UI.drawStale ? S.drawV : ''; }
  function take(st) {
    if (!sess || (st && st.code !== sess.code)) return;   /* a late reply belongs to its original table */
    if (st && (!S || st.v >= S.v)) {
      /* The drawing comes only when it has changed: an answer without it means "the one you have". Should that not be the one it names, the table is read again whole. */
      if (!st.draw) { if (S && S.draw && S.drawV === st.drawV) st.draw = S.draw; else { st.draw = (S && S.draw) || []; UI.drawStale = true; setTimeout(function () { poll(true); }, 0); } }
      else UI.drawStale = false;
      /* The players have been moved to another scene: what was open (a roll, a selected card, a marked target) belonged to the old one, and a roll about a card they can no longer see would read as "not applied yet". */
      if (S && S.table && st.table && S.table.scene && st.table.scene && S.table.scene.id !== st.table.scene.id) { UI.roll = null; UI.aim = {}; UI.working = null; if (UI.sel && !st.cards[UI.sel]) UI.sel = null; else if (!gm()) UI.sel = null; }
      var was = S && { mine: !gm() && myTurn(), round: S.table.round, idx: S.table.idx };
      if (!S || st.v !== S.v) UI.lastActive = Date.now();   /* the table has changed: ask again soon */
      spin(st.log); var fresh = UI.freshLog || []; S = st; UI.dirty = false;
      if (gm() && UI.view && !S.scenes.some(function (sc) { return sc.id === UI.view; })) { UI.view = null; UI.sel = null; UI.sceneRename = null; UI.sceneDelete = null; }
      if (UI.sceneDelete === S.table.scene.id) UI.sceneDelete = null;
      if (was) noticeChanges(was, fresh);
      if (!UI.rollChecked) { /* after a reload, pick up where the person was: the latest roll of theirs that still has something to do */
        UI.rollChecked = true; var mine = S.rolls.filter(function (r) { return (r.attack || S.chars[r.charId]) && ((r.effort && !r.applied) || (r.check && r.check.success && !r.effort && !r.healingResolved)); }); if (mine.length) UI.roll = mine[mine.length - 1].id;
      }
      remember();
      render();
    }
  }
  /* What this browser keeps of a table for the Your tables list: who you are there, the scene last seen and when. Saved only when it changes. */
  function remember() {
    if (!sess || !S) return; var label = S.table.scene.name || '', day = new Date().toISOString().slice(0, 10);
    if (sess.role === S.you.role && sess.pid === (S.you.pid || undefined) && sess.label === label && sess.day === day) return;
    sess.role = S.you.role; if (S.you.pid) sess.pid = S.you.pid; else delete sess.pid; sess.label = label; sess.day = day; sess.at = Date.now(); save();
  }

  /* Dice landing on screen: every new line in the activity feed that carries the server's dice shows them tumbling, on every screen that is sent the line.
     What was already in the feed when the table opened is not replayed, and after a long gap only the latest few are shown. */
  function spin(log) {
    var fresh = UI.seenLog ? log.filter(function (e) { return !UI.seenLog[e.id]; }) : []; UI.freshLog = fresh;
    if (!UI.seenLog) UI.seenLog = {}; log.forEach(function (e) { UI.seenLog[e.id] = 1; });
    fresh.filter(function (e) { return e.dice && !e.undone; }).slice(-3).forEach(function (e) { D.show(e.dice, String(e.text).split(/ · |: /)[0].slice(0, 40), e.mine); });
  }
  D.onLand = function () { if (S) render(); };

  /* Telling a player what has just happened to them, so nothing important lives only in the one-line feed:
     the turn reaching them (a short banner and a lit strip), a blow on their hero (a short banner once the dice have landed),
     and, when the turn moves on, the finished roll is put away (it stays in the feed). */
  function noticeChanges(was, fresh) {
    var moved = was.round !== S.table.round || was.idx !== S.table.idx;
    if (moved && UI.roll) { var r = S.rolls.filter(function (x) { return x.id === UI.roll; })[0]; if (!r || r.applied || (r.check && !r.check.success)) UI.roll = null; }
    var ch = !gm() && myChar(); if (!ch) return;
    if (!was.mine && myTurn()) notice('turn', 'Your turn, ' + ch.name + '.');
    fresh.filter(function (e) { return !e.mine && !e.undone; }).forEach(function (e) {
      var m = String(e.text).match(/^(.*) → (.*): HP -(\d+) \(now (\d+)\/(\d+)\)/);
      if (m && m[2] === ch.name) notice('hit', (m[1] || 'Something') + ' hits you: −' + m[3] + ' HP (now ' + m[4] + ' of ' + m[5] + ').');
    });
  }
  /* A notice on the table for a few seconds. It waits for the dice to land, so it never tells the number before the die shows it. */
  function notice(kind, text) {
    var tries = 0, version = sessionVersion; chime(kind); flagTab(kind === 'turn' ? 'Your turn' : 'You are hit');
    (function show() { if (version !== sessionVersion) return; if (D.busy() && tries++ < 20) { setTimeout(show, 150); return; }
      UI.notice = { kind: kind, text: text, until: Date.now() + 6000 }; if (S) renderTable();
      clearTimeout(UI.noticeTimer); UI.noticeTimer = setTimeout(function () { UI.notice = null; if (S) render(); }, 6000); })();
  }   /* the result panel and the activity line waited for the dice; they can show the result now */

  /* Reaching a player who is in another tab: the tab's title says what happened until they come back, and a soft chime sounds (it can be turned off under My dice).
     A browser lets a page make a sound only after a press on it, so the sound is readied on the first press. */
  var TITLE = document.title, audio = null;
  UI.soundOff = (function () { try { return localStorage.getItem(KEY + 'sound') === '0'; } catch { return false; } })();
  function flagTab(what) { if (document.hidden) document.title = '● ' + what + ' · ' + TITLE; }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) document.title = TITLE; });
  document.addEventListener('pointerdown', function () {
    if (audio || UI.soundOff) return;
    try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) { audio = new AC(); if (audio.resume) audio.resume(); } } catch { audio = null; }
  }, true);
  function chime(kind) {
    if (UI.soundOff || !audio) return;
    try {
      var t = audio.currentTime + 0.02, notes = kind === 'turn' ? [523.25, 783.99] : [196, 146.83];   /* your turn: a rising fifth; a blow: a low falling one */
      notes.forEach(function (f, i) {
        var o = audio.createOscillator(), g = audio.createGain(), at = t + i * 0.16;
        o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
        o.connect(g); g.connect(audio.destination); o.start(at); o.stop(at + 0.55);
      });
      UI.chimed = (UI.chimed || 0) + 1;
    } catch {}
  }

  /* Commands travel in three lanes, each numbered on its own so that one cannot disturb another:
     g, the gameplay commands (rolls, Effort, HP, turns, edits): one at a time, in order, and each resent with the same action id until it is answered, so it can
        never count twice;
     d, drawing: the same, but apart from gameplay, so a slow line cannot hold up a turn;
     t, the pointer: only its latest position matters, so it is never queued or resent. */
  var lanes = { g: mkLane('g'), d: mkLane('d') }, pointer = { id: clientId + 't', seq: 0, busy: false, next: null };
  function mkLane(l) { return { id: clientId + l, seq: 0, q: [], running: false, gameplay: l === 'g', version: sessionVersion }; }
  function send(cmd, done, lane) {
    if (UI.reconcile && (lane || 'g') === 'g') { toast('Checking what was saved. Try again in a moment.', 3000); if (done) done(null); return Promise.resolve(null); }   /* no fresh attempt until the table has been read again */
    var L = lanes[lane || 'g']; cmd.actionId = cmd.actionId || L.id + '.' + (++L.seq); if (L.gameplay) { UI.pending++; setStatus('busy'); }
    return new Promise(function (resolve) { L.q.push({ cmd: cmd, resolve: resolve, done: done, tries: 0 }); if (!L.running) pump(L); });
  }
  function sendPoint(x, y, sceneId) {
    sceneId = sceneId || UI.pointScene || viewScene();
    var current = pointer;
    if (!sess) return;
    if (pointer.busy) { pointer.next = { x: x, y: y, sceneId: sceneId }; return; }
    pointer.busy = true;
    call('POST', { op: 'cmd', code: sess.code, dv: haveDraw(), cmd: { type: 'point', sceneId: sceneId, x: x, y: y, actionId: pointer.id + '.' + (++pointer.seq) } }).then(function (r) { if (current !== pointer || r.stale) return; if (r.status === 200 && r.body.ok) { var st = r.body.state; if (S && st && st.v === S.v) takePointers(st.pointers, st.pv); else take(st); } }, function () {})
      .then(function () { if (current !== pointer) return; pointer.busy = false; if (pointer.next) { var n = pointer.next; pointer.next = null; sendPoint(n.x, n.y, n.sceneId); } });
  }
  function pump(L) {
    if (L.version !== sessionVersion || !sess || (L.gameplay && UI.reconcile)) { L.running = false; return; }
    var job = L.q[0]; if (!job) { L.running = false; return; } L.running = true;
    call('POST', { op: 'cmd', code: sess.code, dv: haveDraw(), cmd: job.cmd }).then(function (r) {
      if (L.version !== sessionVersion || r.stale) return;
      if (r.status === 200 && r.body.ok) { take(r.body.state); finish(L, job, r.body); }
      else if (r.status === 503 || r.status === 0) retry(L, job, 'the table answered ' + r.status + (r.body && r.body.error ? ': ' + r.body.error.message : ''));
      else if (r.status === 409 && r.body.error && r.body.error.code === 'stale') { finish(L, job, null); poll(true); } /* already handled: nothing to say */
      else if (r.status === 401) { setStatus('bad', 'You are no longer at this table'); finish(L, job, null); }
      else { UI.lastError = (r.body.error && r.body.error.message) || ''; toast((UI.lastError || 'That did not work.') + ' Nothing was changed; the table has been refreshed.', 8000); finish(L, job, null); poll(true); }
    }, function (e) { retry(L, job, 'no answer (' + (e && e.name) + ')'); });
  }
  function retry(L, job, why) {
    if (L.version !== sessionVersion) return;
    job.tries++;
    if (job.tries > UI.maxTries) {
      /* Giving up on this command: it may or may not have been saved. Nothing new can be sent until the table has been read again, and what it shows is then what counts. */
      UI.reconcile = true; setStatus('bad', 'Checking what was saved…', why); finish(L, job, null); poll(true); return;
    }
    setStatus('bad', 'Offline: retrying', 'Attempt ' + job.tries + ' of ' + UI.maxTries + ', same command resent each time (so it applies once). Last problem: ' + why); setTimeout(function () { pump(L); }, Math.min(4000, 400 * job.tries));
  }
  function finish(L, job, body) {
    if (L.version !== sessionVersion) return;
    L.q.shift(); if (L.gameplay) { UI.pending--; if (!L.q.length) setStatus(UI.status === 'bad' && !body ? 'bad' : 'ok'); }
    if (job.done) job.done(body); job.resolve(body); pump(L);
  }

  function setStatus(s, text, why) { UI.status = s; UI.statusText = text || ''; UI.statusWhy = why || ''; renderStatus(); }
  var failures = 0, timer = null, polling = false, again = false;
  function poll(now) {
    clearTimeout(timer);
    if (!sess) return;
    if (polling) { again = true; return; }           /* one request at a time: a second loop must never start */
    polling = true; var version = sessionVersion;
    call('GET', null, { code: sess.code, since: S ? S.v : '', dv: haveDraw(), pv: S ? S.pv : '' }).then(function (r) {
      if (version !== sessionVersion || r.stale) return;
      if (r.status === 200) { failures = 0; if (r.body.state) take(r.body.state); else if (r.body.pointers) takePointers(r.body.pointers, r.body.pv); if (UI.reconcile) { UI.reconcile = false; if (!lanes.g.running) pump(lanes.g); toast('Reconnected. The table now shows what was saved: check it before trying again.', 9000); } if (!lanes.g.q.length) setStatus('ok'); }
      else if (r.status === 401 || r.status === 404) { setStatus('bad', r.status === 404 ? 'This table has gone' : 'You are no longer at this table'); return; }
      else fail();
    }, fail).then(function () { if (version !== sessionVersion) return; polling = false; timer = setTimeout(poll, again ? 0 : pollGap()); again = false; });
    function fail() { if (version !== sessionVersion) return; failures++; setStatus('bad', 'Offline: reconnecting'); }
  }

  function resetSession() {
    window.SacramentDialogs.reset();
    sessionVersion++; clearTimeout(timer); clearTimeout(UI.nudge); clearTimeout(UI.leaveTimer); polling = false; again = false;
    Object.keys(lanes).forEach(function (k) { lanes[k].q.forEach(function (job) { job.resolve(null); }); });
    clientId = rid(12); lanes = { g: mkLane('g'), d: mkLane('d') };
    pointer = { id: clientId + 't', seq: 0, busy: false, next: null };
    UI.pending = 0; UI.reconcile = false; UI.working = null; UI.rolling = false;
    UI.rollChecked = false; UI.seenLog = null; UI.view = null; UI.actAs = null;
    UI.sceneDelete = null; UI.sceneDeleting = false; UI.cardEdit = null; UI.atk = null; UI.askItem = null; UI.loot = null; UI.lootBusy = false;
    UI.mapWide = false; UI.removePlayerAsk = null; UI.removeBusy = null; UI.drawScene = null; UI.pointScene = null;
    UI.attackChoice = null; UI.gmDiceResult = null; UI.gmDiceBusy = false; UI.gmDiceOpen = false; UI.tab = 'play'; UI.sub = null; UI.gmStrip = false; UI.adding = false;
    if ($('lootOverlay')) { $('lootOverlay').hidden = true; $('lootOverlay').innerHTML = ''; }
    UI.aim = {}; UI.hpOps = {}; UI.roll = null; UI.draw = null; UI.drag = null; UI.pointing = false; UI.sel = null; UI.sheet = null;
    UI.notice = null; clearTimeout(UI.noticeTimer); UI.arrivalSeen = false;
    UI.storageProblem = false; UI.recoveryOpen = false; UI.recoveryDismissed = false;
    if ($('recoveryWarning')) $('recoveryWarning').hidden = true;
  }

  /* How long to wait before asking again: a second while anything is happening; once nothing has changed and nobody here has touched the screen for a minute,
     two and a half seconds (a quiet table costs fewer requests); four in a background tab. Any change or any touch brings it back to a second. */
  var IDLE_AFTER = 60000;
  UI.lastActive = Date.now();
  function pollGap() { return document.hidden ? 4000 : Date.now() - UI.lastActive > IDLE_AFTER ? 2500 : 1000; }
  ['pointerdown', 'keydown'].forEach(function (k) { document.addEventListener(k, function () { var wasIdle = Date.now() - UI.lastActive > IDLE_AFTER; UI.lastActive = Date.now(); if (wasIdle && sess && !polling) poll(); }, true); });

  /* ---------- helpers on the state ---------- */
  function myChar() {
    if (!S) return null; var cs = Object.keys(S.chars).map(function (k) { return S.chars[k]; });
    if (gm()) return S.chars[UI.actAs] || cs[0] || null;
    return cs.filter(function (c) { return c.owner === S.you.pid; })[0] || null;
  }
  /* "Your hero" is the one a player owns. A GM owns none: the GM *acts as* one, chosen in the strip, and that is marked differently. (Before, an unowned hero was "(you)" to the GM because
     null === null: a GM has no player id and an unassigned hero has no owner.) */
  function ownsHero(c) { return !!(S.you.pid && c && c.charId && S.chars[c.charId] && S.chars[c.charId].owner === S.you.pid); }
  function actingHero(c) { var ch = gm() && myChar(); return !!(ch && c && c.charId === ch.id); }
  function onTable(c) { return !c.owner && (gm() ? (c.sceneId == null || c.sceneId === viewScene()) : true); }
  function viewScene() { return UI.view || (S && S.table.scene.id); }
  function canMove(c) { return gm() || (c.charId && S.chars[c.charId] && S.chars[c.charId].owner === S.you.pid); }
  function turnCardId() { var e = S.table.order[S.table.idx]; return e && e.id || null; }
  function myTurn() { var id = turnCardId(); if (!id) return false; if (gm()) return true; var c = S.cards[id]; return !!(c && c.charId && S.chars[c.charId] && S.chars[c.charId].owner === S.you.pid); }
  var cardList = function () { return Object.keys(S.cards).map(function (k) { return S.cards[k]; }); };
  var cardByName = function (n) { return cardList().filter(function (c) { return c.name === n; })[0]; };
  var bgUrl = function (u) { return u ? 'url("' + esc(u).replace(/\(/g, '%28').replace(/\)/g, '%29') + '")' : 'none'; };

  /* ---------- drawing the screen ---------- */
  /* Write a part of the screen only when what it shows has changed: an update that leaves it the same (most updates, for most parts) costs nothing, and a button or
     card there keeps its focus. `el._h` is what was last written; clear it to force the next write. */
  function put(el, h) { if (!el || el._h === h) return; el.innerHTML = h; el._h = h; }
  function render() {
    if (!S) return;
    if (UI.pressing) { UI.renderLate = true; return; }   /* a button is held down: redrawing now would replace it between the press and the release, and the click would be lost */
    $('entry').hidden = true; $('app').hidden = false;
    renderTop(); renderTable(); renderPanelSoon(); renderFeed(); renderStrip(); renderStatus(); renderSheet(); renderLoot();
  }

  /* ---------- the character sheet: a full-screen panel over the table. The table keeps running and stays connected underneath; closing the sheet returns straight to play. ---------- */
  var sheetView = null;
  var sheetHost = {
    get: function () {
      var ch = S && UI.sheet && S.chars[UI.sheet]; if (!ch) return null;
      var card = S.cards[ch.cardId], G = gm(), mine = ch.owner === S.you.pid, hasHp = !!(card && card.hp && !card.hp.hidden);
      return { hero: heroOf(ch), hp: hasHp ? { cur: shownHp(card), max: card.hp.max } : null, canEdit: G || mine, canHp: (G || mine) && hasHp, gm: G, live: true, dice: S.settings.dice, title: mine ? 'your hero' : G ? 'seen as the GM' : '' };
    },
    use: function (index, spellId, done, gearKey) { var id = UI.sheet; closeSheet(); doUseItem(id, index, spellId, gearKey); done(true); },
    act: function (op, done) { UI.lastError = ''; send({ type: 'sheet', charId: UI.sheet, op: op }, function (b) { done(!!b, b ? '' : (UI.lastError || 'The table did not take that change. Nothing was changed.')); }); },
    hp: function (d) { var ch = S.chars[UI.sheet], card = ch && S.cards[ch.cardId]; if (card && card.hp) hpQueue(card.id, { d: d }, function (done) { send({ type: 'adjust', cardId: card.id, field: 'hp', delta: d }, done); }); },
    close: function () { closeSheet(); }
  };
  function openSheet(charId) {
    if (!S || !S.chars[charId]) return;
    if (gm()) UI.actAs = charId;
    UI.sheet = charId; UI.sheetFrom = document.activeElement; var el = $('sheetOverlay'); el.hidden = false; window.SacramentDialogs.open(el, UI.sheetFrom);
    if (!sheetView) sheetView = window.SacramentSheet.mount(el, sheetHost);
    sheetView.say(''); el.scrollTop = 0; setTimeout(function () { var c = el.querySelector('[data-sh=close]'); if (c) c.focus(); }, 0);
  }
  function closeSheet() { UI.sheet = null; var el = $('sheetOverlay'); el.hidden = true; el.innerHTML = ''; UI.sheetFrom = null; window.SacramentDialogs.close(el); render(); }
  /* the GM's loot designer: a second overlay, drawn only on the GM's own actions and on changes to the library, so typing is never interrupted */
  var lootView = null, lootHost = {
    dice: function () { return S ? S.settings.dice : R.DEFAULT_DICE; },
    lib: function () { return (S && S.lootLib) || []; },
    heroes: function () { return S ? Object.keys(S.chars).map(function (k) { return { id: k, name: S.chars[k].name }; }) : []; },
    send: function (cmd, done) { return send(cmd, done); },
    close: function () { closeLoot(); }
  };
  /* one press, one command: a second press while the first is on its way does nothing */
  function lootOnce(cmd, done) { if (UI.lootBusy) return; UI.lootBusy = true; send(cmd, function (b) { UI.lootBusy = false; if (done) done(b); }); }
  function openLoot(spec) {
    var el = $('lootOverlay'); if (!el || !S || !gm()) return;
    if (!lootView) lootView = window.SacramentLoot.mount(el, lootHost);
    UI.lootFrom = document.activeElement; el.hidden = false; window.SacramentDialogs.open(el, UI.lootFrom); lootView.open(spec); el.scrollTop = 0;
    setTimeout(function () { var c = el.querySelector('[data-lb=close]'); if (c) c.focus(); }, 0);
  }
  function closeLoot() { var el = $('lootOverlay'); el.hidden = true; el.innerHTML = ''; UI.lootFrom = null; window.SacramentDialogs.close(el); render(); }
  function renderLoot() { var el = $('lootOverlay'); if (el && !el.hidden && lootView) lootView.refresh(); }
  function renderSheet() {
    var el = $('sheetOverlay'); if (!el) return;
    if (!UI.sheet) { if (!el.hidden) el.hidden = true; return; }
    if (!S.chars[UI.sheet]) { closeSheet(); return; }
    if (sheetView) sheetView.draw();
  }

  function renderTop() {
    var t = S.table, G = gm(), cur = turnCardId() && S.cards[turnCardId()];
    put($('tTarget'), '<span class="lbl">Target</span>' + (G ? '<button class="chip" data-do="target" data-d="-1" aria-label="Lower the Target">−</button>' : '') +
      '<span class="big" id="tgtv">' + t.target + '</span>' + (G ? '<button class="chip" data-do="target" data-d="1" aria-label="Raise the Target">+</button>' : ''));
    put($('tRound'), '<span class="lbl">Round</span><span class="big">' + t.round + '</span>' + (G ? '<button class="chip" data-do="nextRound" title="Start the next round: every running timer loses 1">Next round</button>' : ''));
    put($('tTurn'), '<span class="lbl">Turn</span><span class="who">' + (cur ? esc(cur.name) : (t.order.length ? 'Unseen' : 'No one')) + '</span>' +
      (G && t.order.length ? '<button class="btn small main" data-do="endTurn">Next turn</button>' : ''));
    var tm = cardList().filter(function (c) { return c.timer && (gm() ? onTable(c) || true : true); });
    renderHorror();
    put($('tTimers'), tm.map(function (c) { var T = c.timer; return '<button class="chip' + (!T.hidden && T.cur === 0 ? ' hot' : '') + (c.visible ? '' : ' hid') + '" data-do="select" data-id="' + c.id + '" title="' + esc(c.name) + (c.visible ? '' : ' (hidden from players)') + (T.paused ? ' (paused)' : '') + '">' + esc(T.label || c.name) + ' <b>' + (T.hidden ? '?' : T.cur) + '</b>' + (T.paused ? ' ⏸' : '') + '</button>'; }).join(''));
  }

  /* The Rising Horror: one meter for the whole table, quiet in the top bar. 21 small ticks, the thresholds marked, the number beside it. Nobody changes it here:
     the GM's controls are in the Table tab. */
  function renderHorror() {
    var el = $('tHorror'), H = S.horror; if (!el || !H) return;
    var ticks = ''; for (var i = 1; i <= H.max; i++) ticks += '<i class="' + (i <= H.cur ? 'on' : '') + (H.thresholds.indexOf(i) >= 0 ? ' th' : '') + '"></i>';
    var h = '<span class="lbl">Horror</span><span class="hz-meter' + (H.cur >= H.max ? ' arrived' : '') + '" role="meter" aria-valuemin="0" aria-valuemax="' + H.max + '" aria-valuenow="' + H.cur + '" aria-label="The Rising Horror: ' + H.cur + ' of ' + H.max + '" title="The Rising Horror. It rises when a spell is cast or a relic used; marks at ' + H.thresholds.join(', ') + '.">' + ticks + '</span><span class="hz-n"><b>' + H.cur + '</b>/' + H.max + '</span>';
    if (el.dataset.h !== h) { el.innerHTML = h; el.dataset.h = h; }
  }
  /* What the Horror says on the table: the GM is alerted at each threshold until they mark it dealt with; at 21 everyone is told it has arrived (a player may put the notice away). */
  function horrorBanner() {
    var H = S.horror, b = ''; if (!H) return '';
    if (H.cur < H.max) UI.arrivalSeen = false;
    if (gm() && H.alert) b += '<div class="alert hz">' + esc(R.HORROR.lines[H.alert] || 'The Horror rises.') + ' <span class="note">(' + H.cur + ' of ' + H.max + ')</span> <button class="chip" data-do="horrorAck">Dealt with</button></div>';
    else if (!gm() && H.cur >= H.max && !UI.arrivalSeen) b += '<div class="alert hz" role="alert">' + esc(R.HORROR.lines[H.max]) + ' <button class="chip" data-do="arrivalSeen">OK</button></div>';
    return b;
  }

  function renderRecovery() {
    var box = $('recoveryWarning'); if (!box || !sess) return;
    box.hidden = !(UI.recoveryOpen || (UI.storageProblem && !UI.recoveryDismissed));
    if (box.hidden) return;
    $('recoveryMessage').textContent = UI.storageProblem
      ? 'This browser cannot remember your place at this table. Save the private recovery link below before closing this page.'
      : 'Save this private recovery link somewhere safe. Anyone with it can return as you, so do not share it with players.';
    var link = location.origin + '/vtt/?room=' + sess.code + '#key=' + sess.token;
    if ($('recoveryLink').value !== link) $('recoveryLink').value = link;
  }
  function renderStatus() {
    renderRecovery();
    var el = $('tStatus'); if (!el || !S) return; el.dataset.role = gm() ? 'gm' : 'player';
    if (UI.pressing) { UI.renderLate = true; return; }
    var cls = UI.status, txt = UI.statusText || (cls === 'busy' ? 'Saving…' : 'Saved');
    el.innerHTML = '<span class="pill ' + (cls === 'bad' ? 'bad' : cls === 'busy' ? 'busy' : 'ok') + '" role="status"' + (UI.statusWhy ? ' title="' + esc(UI.statusWhy) + '"' : '') + '>' + esc(txt) + '</span>' + (gm() ? '' : '<span class="pill" title="The code of this table">' + esc(S.code) + '</span>' +
      '<button class="chip' + (UI.leaveAsk ? ' hot' : '') + '" data-do="leave" title="' + (gm() ? 'Leave this table. As the GM you can come back only with your GM link.' : 'Leave this table and go back to the start. You can join again with the code.') + '">' + (UI.leaveAsk ? 'Sure? Leave' : 'Leave') + '</button>');
    if (UI.storageProblem) el.insertAdjacentHTML('beforeend', '<button class="chip" data-do="showRecovery">Save recovery link</button>');
  }
  /* Leaving: forget this table in this browser and return to the first screen, where a new table can be made or another joined. Two presses, because the GM's place cannot be got back. */
  function leaveTable() {
    if (UI.pending > 0) { toast('Wait for Saved, then leave.'); return; }
    if (!UI.leaveAsk) { UI.leaveAsk = true; renderStatus(); if (gm()) renderPanel(); clearTimeout(UI.leaveTimer); UI.leaveTimer = setTimeout(function () { UI.leaveAsk = false; if (S) { renderStatus(); if (gm()) renderPanel(); } }, 5000); return; }
    clearTimeout(UI.leaveTimer); UI.leaveAsk = false;
    delete memorySessions[sess.code];
    try { localStorage.removeItem(KEY + sess.code); localStorage.removeItem(KEY + 'last'); } catch (e) {}
    resetSession(); sess = null; S = null; UI.sel = null; UI.roll = null; UI.aim = {}; UI.hpOps = {}; UI.reconcile = false; UI.working = null; UI.rolling = false; UI.rollChecked = false; UI.seenLog = null; clearTimeout(timer);
    history.replaceState(null, '', '/vtt/'); $('app').hidden = true; $('entry').hidden = false; $('resume').hidden = true; $('joinCode').value = ''; $('makeMsg').textContent = '';
    listTables();
  }

  /* a rolled Effort that has not been applied yet, and the card it would go to: made obvious on the table */
  /* The card an Effort will go to: the selected card if it can take it (HP or an Effort bar, and not a hero), otherwise the card the roll named. The TARGET mark, the Apply
     button's label and the card it changes are all this one card, so what is marked is what is applied to. */
  function canTake(c) { return !!(c && c.kind !== 'pc' && (c.hp || c.progress)); }
  /* The target of a rolled Effort is chosen once and then stays: the card the roll named, or else the card selected when the Effort first appeared. Selecting another card to
     look at it does not move it; the panel offers "Change target" for that. If the chosen card has gone, or cannot take Effort, a new one is chosen the same way. */
  function applyTarget(r) {
    if (!r || !r.effort || r.applied) return null;
    var c = UI.aim[r.id] && S.cards[UI.aim[r.id]];
    if (!canTake(c) && (UI.aim[r.id] || r.targetCardId)) { c = S.cards[UI.aim[r.id] || r.targetCardId]; return canTake(c) ? c : null; }
    if (!canTake(c)) { var named = r.targetCardId && S.cards[r.targetCardId], sel = UI.sel && S.cards[UI.sel]; c = canTake(named) ? named : canTake(sel) ? sel : null; if (c) UI.aim[r.id] = c.id; else delete UI.aim[r.id]; }
    return c;
  }
  function aimId() { var r = UI.roll && S.rolls.filter(function (x) { return x.id === UI.roll; })[0]; if (!(r && r.effort && !r.applied)) return null; var t = applyTarget(r); return t ? t.id : null; }
  function renderTable() {
    if (UI.drag) { UI.dirty = true; return; }
    var G = gm(), view = viewScene(), tbl = $('table');
    tbl.className = 't-' + UI.tool;
    $('mapViewport').classList.toggle('wide', !!UI.mapWide);
    $('mapWidthHint').hidden = !UI.mapWide || tbl.offsetHeight <= $('mapViewport').clientHeight + 1;
    $('mapWidthToggle').textContent = UI.mapWide ? 'Fit map' : 'Fill width';
    $('mapWidthToggle').setAttribute('aria-pressed', String(!!UI.mapWide));
    $('mapWidthToggle').title = UI.mapWide ? 'Show the whole map' : 'Use the available width; scroll to see the rest of the map';
    var sc = (S.scenes || []).filter(function (x) { return x.id === view; })[0] || S.table.scene;
    $('bg').style.backgroundImage = bgUrl(sc.bg);
    var html = '', want = [], turnId = turnCardId(), aim = aimId();
    cardList().filter(onTable).sort(function (a, b) { return ((S.layout[a.id] || {}).z || 0) - ((S.layout[b.id] || {}).z || 0); }).forEach(function (c) {
      var l = S.layout[c.id]; if (!l) return;
      var tok = c.kind === 'token' || c.kind === 'pc', own = ownsHero(c), acting = actingHero(c), mine = own || acting;
      var cls = 'c ' + (tok ? 'tok ' : '') + (c.id === UI.sel ? 'sel ' : '') + (c.id === aim ? 'aim ' : '') + (mine ? 'mine ' : '') + (c.id === turnId ? 'turn ' : '') + (!c.visible ? 'hid ' : '') + (c.kind === 'pc' && c.hp && !c.hp.hidden && c.hp.cur === 0 ? 'down ' : '');
      var inner = '';
      if (tok) {
        inner += c.img ? '<div class="cimg" style="background-image:' + bgUrl(c.img) + '"></div>' : '<div class="init">' + esc((c.name || '?').charAt(0)) + '</div>';
        inner += '<div class="tag">' + esc(c.name) + (own ? ' (you)' : acting ? ' (acting)' : '') + (downMark(c) ? ' · ' + downMark(c) : '') + (c.hp ? (c.hp.hidden ? ' · HP ?' : ' ' + heartsHtml(c.hp.cur, c.hp.max, 'sm')) : '') + (c.timer && !c.timer.hidden ? ' · ⏱' + c.timer.cur : '') + '</div>';
      } else {
        if (c.img) inner += '<div class="cimg" style="background-image:' + bgUrl(c.img) + '"></div>';
        inner += '<div class="ct">' + esc(c.name) + '</div>' + (c.desc ? '<div class="cd">' + esc(c.desc) + '</div>' : '<div class="cd"></div>');
        var bars = '';
        if (c.hp) bars += c.hp.hidden ? '<div class="bar"><span>HP ?</span></div>' : '<div class="hpbar">' + heartsHtml(c.hp.cur, c.hp.max, 'sm') + '</div>';
        if (c.progress) bars += c.progress.hidden ? '<div class="bar pr"><span>' + esc(c.progress.label || 'Effort') + ' ?</span></div>' : '<div class="bar pr"><i style="width:' + Math.round(100 * c.progress.cur / c.progress.max) + '%"></i><span>' + esc(c.progress.label || 'Effort') + ' ' + c.progress.cur + '/' + c.progress.max + '</span></div>';
        if (c.timer) bars += c.timer.hidden ? '<div class="tm">' + esc(c.timer.label || 'Timer') + ': ?</div>' : '<div class="tm' + (c.timer.cur === 0 ? ' hot' : '') + '">' + esc(c.timer.label || 'Timer') + ': ' + c.timer.cur + (c.timer.cur === 0 ? ' · NOW' : '') + (c.timer.paused ? ' (paused)' : '') + '</div>';
        if (bars) inner += '<div class="bars">' + bars + '</div>';
      }
      html = '<div class="' + cls + (tok ? 'tokwrap ' : '') + '" tabindex="0" role="button" aria-label="' + esc(c.name) + '" aria-pressed="' + (c.id === UI.sel) + '" data-id="' + c.id + '" style="left:' + l.x + '%;top:' + l.y + '%;width:' + l.w + 'cqw;height:' + (tok ? l.w : l.h) + 'cqw;z-index:' + l.z + '">' + inner + '</div>';
      want.push({ id: c.id, h: html });
    });
    putCards(want);
    /* drawing */
    put($('ink'), (S.draw || []).filter(function (s) { return (s.sceneId || S.table.scene.id) === view; }).map(function (s) { return '<polyline points="' + s.pts.map(function (p) { return p[0] + ',' + p[1]; }).join(' ') + '" stroke="' + esc(s.color) + '"/>'; }).join(''));
    /* the toolbar and the banner */
    if (!G && UI.tool === 'draw') UI.tool = 'select';
    put($('toolbar'), ['select:Select', 'point:Point'].concat(G ? ['draw:Draw'] : []).map(function (t) { var k = t.split(':'); return '<button class="chip' + (UI.tool === k[0] ? ' hot' : '') + '" data-do="tool" data-tool="' + k[0] + '" aria-pressed="' + (UI.tool === k[0]) + '">' + k[1] + '</button>'; }).join('') +
      (UI.tool === 'point' ? '<span class="note tip">Press and hold on the table, then move: everyone sees where you point.</span>' : UI.tool === 'draw' ? '<span class="note tip">Press and drag on the table to draw.</span>' : '') +
      (UI.tool === 'draw' ? '<button class="chip" data-do="drawUndo">Undo line</button>' + (G ? '<button class="chip" data-do="drawClear">Clear drawing</button>' : '') : ''));
    var b = '';
    if (G && S.alerts && S.alerts.length) b += S.alerts.map(function (a) { return '<div class="alert">TIME: ' + esc(a.name) + ' has reached 0 <button class="chip" data-do="ack" data-id="' + a.cardId + '">Resolved</button></div>'; }).join('');
    b += horrorBanner();
    if (UI.notice && UI.notice.until > Date.now()) b += '<div class="notice ' + UI.notice.kind + '" role="status">' + esc(UI.notice.text) + '</div>';
    if (G && view !== S.table.scene.id) b += '<div class="preview">Preparing: players do not see this scene</div>';
    put($('banner'), b);
    renderPointers();
  }
  /* The cards on the table, each written only when it has changed: a card someone is looking at, focused with the keyboard, or about to click is not replaced by
     an update about something else. One that is replaced keeps the keyboard focus it had. */
  function putCards(want) {
    var box = $('cards'), have = {}, seen = {}, f = document.activeElement, focusId = f && f.parentNode === box ? f.dataset.id : null;
    Array.prototype.forEach.call(box.children, function (el) { have[el.dataset.id] = el; });
    want.forEach(function (w) {
      seen[w.id] = 1; var el = have[w.id]; if (el && el._h === w.h) return;
      var tmp = document.createElement('div'); tmp.innerHTML = w.h; var n = tmp.firstChild; n._h = w.h;
      if (el) box.replaceChild(n, el); else box.appendChild(n);
      if (focusId === w.id) n.focus({ preventScroll: true });
    });
    Object.keys(have).forEach(function (id) { if (!seen[id]) box.removeChild(have[id]); });
  }
  /* Pointers: everyone's, yours too (dashed, "You") so that you can see it working. One stays 4 seconds after it last moved, then goes (a timer redraws it away: nothing else would). */
  function renderPointers() {
    clearTimeout(UI.ptrTimer); if (!S) return;
    var now = Date.now(), ph = '', soonest = 0, G = gm(), mine = G ? 'gm' : S.you.pid;
    Object.keys(S.pointers || {}).forEach(function (k) {
      var p = S.pointers[k], seen = UI.seenPtr[k]; if ((p.sceneId || S.table.scene.id) !== viewScene()) return; if (!seen || seen.at !== p.at) UI.seenPtr[k] = seen = { at: p.at, when: now };
      var left = 4000 - (now - seen.when); if (left <= 0) return;
      soonest = soonest ? Math.min(soonest, left) : left;
      ph += '<div class="ptr' + (k === mine ? ' me' : '') + '" style="left:' + p.x + '%;top:' + p.y + '%"><span>' + (k === mine ? 'You' : esc(p.name || '')) + '</span></div>';
    });
    put($('pointers'), ph); if (soonest) UI.ptrTimer = setTimeout(renderPointers, soonest + 50);
  }

  /* the contextual panel is not rebuilt while someone is typing in it */
  /* Only a box someone may be typing in (or an open choice list) holds the redraw back: a checkbox or a button having focus does not, or the figures beside it would go stale. */
  function typing(el) { return !!el && $('panel').contains(el) && (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|file|range|color)$/i.test(el.type))); }
  function renderPanelSoon() { if (typing(document.activeElement)) { UI.panelLate = true; return; } renderPanel(); }
  /* The rebuild put off while someone types is made when focus leaves the panel's fields, not when it moves from one field to another: rebuilding then would destroy the field they have just clicked into, and with it what they type. */
  document.addEventListener('focusout', function (e) { var rt = e.relatedTarget; if (typing(rt)) return; setTimeout(function () { if (UI.panelLate && S && !UI.pressing) { UI.panelLate = false; renderPanel(); } }, 0); });
  /* While a control is held down nothing is redrawn; whatever arrived meanwhile is drawn as soon as it is released (after the click has been delivered). */
  var pressTimer = null, releaseTimer = null;
  function release() { clearTimeout(pressTimer); clearTimeout(releaseTimer); if (!UI.pressing) return; releaseTimer = setTimeout(function () { UI.pressing = false; if (UI.renderLate || UI.panelLate) { UI.renderLate = false; UI.panelLate = false; if (S) render(); } }, 0); }
  document.addEventListener('pointerdown', function (e) { if (e.target.closest && e.target.closest('[data-do]')) { clearTimeout(releaseTimer); UI.pressing = true; clearTimeout(pressTimer); pressTimer = setTimeout(function () { release(); }, 4000); } }, true);
  document.addEventListener('pointerup', release, true); document.addEventListener('pointercancel', release, true);

  /* The GM's monster attack, in the same panel as a player's roll: the roll against Defence, then (on a hit) "Roll damage" rolls it and takes it off the hero. The die it uses can be changed and is remembered. */
  function attackRollView(r, ch) {
    var hero = S.cards[r.targetCardId], hn = hero ? hero.name : 'the hero', h = r.attack.sceneBonus ? '<p class="note">Base attack ' + sgn(r.attack.baseBonus) + ' + scene danger ' + r.attack.sceneBonus + '.</p>' : '';
    h += '<p class="note">attacks ' + esc(hn) + '</p><div class="calc ' + (ch.success ? 'ok' : 'bad') + '">' + esc(R.sayAttack(ch)) + '</div>' + (r.manual ? '<p class="note">A physical die.</p>' : '');
    var downH = hero && hero.kind === 'pc' && hero.hp && hero.hp.cur === 0 ? hero.dying || { none: true } : null;
    if (!ch.success) h += '<p>Missed. No damage to roll.</p>';
    else if (r.blow && r.applied) h += '<p><b>Struck.</b> ' + downMark(hero, true) + ' Use Undo in the Activity feed to take it back.</p>';
    else if (!r.effort && downH) {   /* a blow on a hero who is down: no damage, the countdown moves instead */
      var busyB = UI.working === 'effort:' + r.id;
      h += downH.dead ? '<p>' + esc(hn) + ' is dead.</p>' : '<p><b>A hit</b> on ' + esc(hn) + ', who is down. No damage is rolled.</p>' + (busyB ? '<p class="note" role="status">Striking…</p>' : '') +
        '<div class="row col"><button class="btn main" data-do="monsterEffort" data-cat="weapons" data-roll="' + r.id + '"' + (busyB ? ' disabled aria-busy="true"' : '') + '>' + (downH.none ? esc(hn) + ' falls: roll the d4' : downH.stable ? 'Hurt again: ' + esc(hn) + ' rolls a new d4' : 'Take a round off ' + esc(hn) + '’s countdown') + '</button></div>';
    }
    else if (!r.effort) {
      var busyE = UI.working === 'effort:' + r.id, mk = UI.monCat || 'weapons';
      h += '<p><b>A hit.</b> Now roll the damage.</p>' + (busyE ? '<p class="note" role="status">Rolling damage…</p>' : '') +
        '<div class="row col"><button class="btn main" data-do="monsterEffort" data-cat="' + mk + '" data-roll="' + r.id + '"' + (busyE ? ' disabled aria-busy="true"' : '') + ' title="Rolls it and takes it off ' + esc(hn) + ' now">Roll damage: ' + R.CAT_NAMES[mk] + ' d' + S.settings.dice[mk] + '</button></div>' +
        '<div class="opt row2" role="group" aria-label="Die for the damage"><span class="note">Another die:</span>' + R.CATS.filter(function (k) { return k !== mk; }).map(function (k) { return '<button class="chip" data-do="monCat" data-cat="' + k + '">' + R.CAT_NAMES[k] + ' d' + S.settings.dice[k] + '</button>'; }).join('') + '</div>' + physical('physE', 'Own die for damage');
    } else {
      h += '<div class="calc">' + esc(R.sayEffort(r.effort, 'damage')) + '</div>';
      if (r.applied) h += '<p><b>Applied</b> to ' + esc(hn) + ': HP ' + r.applied.applied + (downMark(hero) ? '. ' + esc(hn) + ' is down: ' + downMark(hero, true) : '.') + ' Use Undo in the Activity feed to take it back.</p>';
      else h += '<p class="note"><b>Undone.</b> ' + esc(hn) + ' has the points back.</p><div class="row col"><button class="btn main" data-do="apply" data-roll="' + r.id + '" data-card="' + r.targetCardId + '" data-field="hp">Apply again to ' + esc(hn) + ': −' + r.effort.total + ' HP</button></div>';
    }
    return h + '<div class="row" style="margin-top:8px"><button class="btn small" data-do="dismissRoll">Done</button></div></div>';
  }
  function rollCard() {
    if (UI.attackChoice) {
      var pending = UI.attackChoice, targets = cardList().filter(function (c) { return onTable(c) && (pending.healing ? !!c.hp : canTake(c)); });
      return '<div class="sec"><h3>' + (pending.healing ? 'Choose who to heal' : 'Choose a target') + '</h3><p>' + esc(pending.name) + '</p><label class="field">' + (pending.healing ? 'Healing target' : 'Attack target') + '<select id="attackTarget"><option value="">Choose a target…</option>' + targets.map(function (c) { return '<option value="' + c.id + '"' + (UI.attackTarget === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label><div class="row"><button class="btn main" data-do="confirmAttack">' + (pending.healing ? 'Heal selected target' : 'Attack selected target') + '</button><button class="btn" data-do="cancelAttack">Cancel</button></div><p class="note">' + (pending.healing ? 'Healing is applied automatically after a successful check, within the listed rest limit.' : 'Damage will keep this target. Nothing has been rolled yet.') + '</p></div>';
    }
    if (UI.rolling || D.busy()) return '<div class="sec"><h3>' + esc(UI.rolling || 'Rolling') + '</h3><p class="note" role="status">Rolling…</p></div>';   /* the previous roll is not offered while a new one is on its way, and a new one waits until its dice have landed */
    var r = UI.roll && S.rolls.filter(function (x) { return x.id === UI.roll; })[0]; if (!r) return '';
    var ch = r.check, h = '<div class="sec"><h3>' + esc(r.charName) + (r.item ? ' · ' + esc(r.item) : '') + (r.stat ? ' · ' + r.stat : r.attack ? ' · attack' : ' · Effort') + '</h3>';
    var tgt = applyTarget(r);
    if (r.attack) return h + attackRollView(r, ch);
    if (!S.chars[r.charId]) return h + '<p>' + esc(r.charName) + ' is no longer at the table, so this roll has nothing more to do.</p><div class="row"><button type="button" class="link" data-do="dismissRoll">Done with this roll</button></div></div>';   /* the hero was taken off the table while the roll was open */
    if (r.targetCardId && S.cards[r.targetCardId]) h += '<p class="note">Target: ' + esc(S.cards[r.targetCardId].name) + '</p>';
    if (ch) {
      h += '<div class="calc ' + (ch.success ? 'ok' : 'bad') + '">' + esc(R.sayCheck(ch, r.stat)) + '</div>' + (r.manual ? '<p class="note">A physical die.</p>' : '');
      if (ch.nat20 && !r.nonDamage) h += '<p class="note">Natural 20. Ultimate Effort is on offer' + (S.settings.nat20Ultimate ? '' : ' (switched off at this table)') + '.</p>';
      if (ch.nat1) h += '<p class="note">Natural 1. The Horror rises by 1.</p>';
      if (r.fromPush && !ch.success) h += '<p class="note">That was your pushed second action.</p>';
    }
    if (r.healing && r.healing.stable) h += '<p>The patient is stable. Their dying countdown has stopped.</p>';
    else if (r.healingAttempt && !r.healing) h += '<p>Healing check failed. No healing was applied.</p>';
    else if (r.healing) h += '<p>Healing rolled: <b>' + r.healing.amount + '</b>. ' + (r.applied ? 'Applied to ' + esc(S.cards[r.applied.cardId] ? S.cards[r.applied.cardId].name : 'the patient') + '.' : 'Undone. The healing and its rest allowance have been restored.') + '</p>';
    else if (r.nonDamage) h += '<p>' + (ch && ch.success ? 'Success. ' : 'The check failed. ') + 'The GM resolves this effect. No damage to roll.</p>';
    else if (ch && !ch.success && !gm()) h += '<p>Missed. No damage to roll.</p>';
    else if (!r.effort) {
      var c = S.chars[r.charId], dice = S.settings.dice;
      var busyE = UI.working === 'effort:' + r.id, word = (r.isAttack || (tgt ? tgt.hp : r.cat)) ? 'damage' : 'Effort';   /* against a foe (or with a weapon, spell or tool in hand) it is damage; against an obstacle's Effort bar, or a plain check, it is Effort */
      if (r.cat) {   /* an item: its own die, one button, rolled when the player is ready */
        h += (ch && ch.success ? '<p><b>' + (word === 'damage' ? 'A hit!' : 'Success!') + '</b> Now roll the ' + word + '.</p>' : '') + (busyE ? '<p class="note" role="status">Rolling ' + word + '…</p>' : '') +
          '<div class="row col"><button class="btn main" data-do="effort" data-cat="' + r.cat + '" data-roll="' + r.id + '"' + (busyE ? ' disabled aria-busy="true"' : '') + '>Roll ' + word + ': ' + R.CAT_NAMES[r.cat] + ' d' + dice[r.cat] + (c.effort[r.cat] ? ' ' + sgn(c.effort[r.cat]) : '') + (r.weaponBonus ? ' +2 heavy' : '') + '</button>' +
          (ch && ch.offerUltimate && r.cat !== 'ultimate' ? '<button class="btn" data-do="effort" data-cat="ultimate" data-roll="' + r.id + '"' + (busyE ? ' disabled aria-busy="true"' : '') + '>Natural 20: roll Ultimate d' + dice.ultimate + (c.effort.ultimate ? ' ' + sgn(c.effort.ultimate) : '') + (r.weaponBonus ? ' +2 heavy' : '') + ' instead</button>' : '') + '</div>' + physical('physE', 'Physical die for ' + word);
      } else
      h += '<h4>Roll ' + word + '</h4><p class="hint">Pick what you did it with: Basic for bare hands or a clumsy tool, Weapons for melee weapons, bows, crossbows or slings; Guns for guns and gunpowder weapons; Magic for a spell.</p>' + (busyE ? '<p class="note" role="status">Rolling ' + word + '…</p>' : '') + '<div class="cats">' + R.CATS.map(function (k) { return '<button data-do="effort" data-cat="' + k + '" data-roll="' + r.id + '"' + (busyE ? ' disabled aria-busy="true"' : '') + (k === 'ultimate' && ch && ch.nat20 ? ' class="hint"' : '') + '>' + R.CAT_NAMES[k] + ' d' + dice[k] + '<b>' + sgn(c.effort[k]) + '</b></button>'; }).join('') + '</div>' + physical('physE', 'Physical die for ' + word);
    } else {
      var ef = r.applied ? r.applied.field === 'hp' : tgt ? !!tgt.hp && !tgt.progress : false;
      h += '<div class="calc">' + esc(R.sayEffort(r.effort, ef ? 'damage' : 'Effort')) + '</div>';
      if (r.applied) { var ac = S.cards[r.applied.cardId]; h += '<p><b>Applied</b> to ' + esc(ac ? ac.name : 'a card that is no longer in view') + (r.applied.applied == null ? '.' : ': ' + (r.applied.field === 'hp' ? 'HP ' : 'Effort ') + (r.applied.applied > 0 ? '+' : '') + r.applied.applied + '.') + '</p>'; }
      else if (tgt && (tgt.hp || tgt.progress)) {
        var sel2 = UI.sel && S.cards[UI.sel], other = sel2 && sel2.id !== tgt.id && canTake(sel2) ? sel2 : null;
        h += '<p class="note"><b>Not applied yet.</b> Target: ' + esc(tgt.name) + '.' + (other ? '' : ' Looking at another card does not change it.') + '</p>' +
          (other ? '<div class="row"><button class="btn small" data-do="aim" data-roll="' + r.id + '" data-card="' + other.id + '">Change target to ' + esc(other.name) + '</button></div>' : '') + '<div class="row col">' +
          (UI.working === 'apply:' + r.id ? '<button class="btn" disabled aria-busy="true">Applying to ' + esc(tgt.name) + '…</button>' : '') +  (UI.working === 'apply:' + r.id ? '' : tgt.hp ? '<button class="btn main" data-do="apply" data-roll="' + r.id + '" data-card="' + tgt.id + '" data-field="hp">Apply to ' + esc(tgt.name) + ': −' + r.effort.total + ' HP</button>' : '') +
           (UI.working === 'apply:' + r.id ? '' : tgt.progress ? '<button class="btn main" data-do="apply" data-roll="' + r.id + '" data-card="' + tgt.id + '" data-field="progress">Apply to ' + esc(tgt.name) + ': +' + r.effort.total + ' Effort</button>' : '') + '</div>';
      } else h += (UI.sel && canTake(S.cards[UI.sel]) ? '<button class="btn" data-do="aim" data-roll="' + r.id + '" data-card="' + UI.sel + '">Set target to ' + esc(S.cards[UI.sel].name) + '</button>' : '') + '<p class="note"><b>Not applied yet.</b> Select a card with HP or an Effort bar on the table, then apply this to it. Nothing changes until you do.</p>';
    }
    if (ch) h += pushView(r);
    if (r.applied) h += '<p class="hint">' + (gm() ? 'Use Next turn above when everyone is ready.' : 'Tell the GM when you are finished. The GM advances turns.') + '</p>';
    h += '<div class="row"><button type="button" class="link" data-do="dismissRoll">Done with this roll</button></div></div>';
    return h;
  }
  /* After a failed check: the offer to push for a second action (the Horror rises by 1), and once pushed, a quick way to try the same thing again. Only to the one who rolled. */
  function pushView(r) {
    if (gm() && r.by !== 'gm') return '';
    var full = S.horror && S.horror.cur >= S.horror.max, latest = !S.rolls.some(function (x) { return x.charId === r.charId && x.at > r.at; });
    if (r.canPush) {
      var busy = UI.working === 'push:' + r.id;
      return '<div class="push"><p class="lure">The Horror is listening. It would give you another chance.</p>' +
        '<button class="btn push-go" data-do="push" data-roll="' + r.id + '"' + (busy ? ' disabled aria-busy="true"' : '') + '>' + (busy ? 'Pushing…' : 'Push: act again <span>' + (full ? 'the Horror is at ' + S.horror.max : '+1 Horror') + '</span>') + '</button>' +
        '<p class="note">A second action, now: try again or do something else. Or let the failure stand.</p></div>';
    }
    if (r.pushed && latest) return '<div class="push done"><p><b>You pushed.</b> Take your second action: the same again, or choose a stat or item below.</p>' +
      '<button class="btn main" data-do="again" data-roll="' + r.id + '">Same again: ' + esc(r.item ? r.item : r.stat) + '</button></div>';
    return '';
  }
  /* The second action, the same as the first: the same stat (or item), the same difficulty, at the same thing. */
  function rollAgain(r) {
    if (r.targetCardId && S.cards[r.targetCardId]) UI.sel = r.targetCardId; if (gm()) UI.actAs = r.charId;
    UI.adj = (r.check && r.check.adj) || 'normal';
    if (r.use) { if (!r.use.gearKey) { toast('Choose that item from your sheet again.'); return; } doUseItem(r.charId, r.use.index, r.use.spellId, r.use.gearKey); } else doRoll(r.stat, true, !!r.isAttack);
  }
  var physical = function (id, label) { return '<div class="phys"><label>' + label + '<input id="' + id + '" type="number" min="1" max="20" inputmode="numeric" placeholder="optional"></label></div>'; };

  function renderPanel() {
    var P = $('panel'), c = UI.sel && S.cards[UI.sel], h = rollCard();
    if (UI.adding) { P.innerHTML = h + '<div class="sec"><p class="note">Adding…</p></div>'; return; }   /* the panel must not show the old card, with its name box, while the new one is on its way */
    if (c && !(gm() ? true : cardVisibleToMe(c))) { UI.sel = null; c = null; }
    if (UI.cardEdit && UI.cardEdit !== UI.sel) UI.cardEdit = null; if (UI.atk && UI.atk !== UI.sel) UI.atk = null;
    if (c) h += gm() ? gmCard(c) : playerCard(c); else h += gm() ? gmTable() : playerTable();
    /* On a phone the panel can be put away, so that the scene and the controls under it stay in reach. It opens again by itself when something new is selected or rolled. */
    P.innerHTML = h; P.classList.toggle('empty', !h.trim());
  }
  /* The GM toolbar: one button for each section this view has, always at the top of the tray. A button opens (or closes) its section and brings it into view. */
  var cardVisibleToMe = function (c) { return !!c; };

  /* A hero at 0: dying (with the rounds left), stable, dead, or just at 0 for a hero who has no countdown yet. `long` spells it out for a panel or the strip. */
  function downMark(c, long) {
    if (!c || c.kind !== 'pc' || !c.hp || c.hp.hidden || c.hp.cur !== 0) return '';
    var st = c.dying, t = !st ? 'AT 0' : st.dead ? 'DEAD' : st.stable ? 'STABLE' : 'DYING ' + st.left;
    return '<b class="atzero"' + (st ? ' title="' + (st.dead ? 'Dead' : st.stable ? 'Stable: the countdown has stopped' : st.left + (st.left === 1 ? ' round' : ' rounds') + ' left') + '"' : '') + '>' + t + '</b>' + (long && st && !st.dead && !st.stable ? ' <span class="note">' + st.left + (st.left === 1 ? ' round' : ' rounds') + ' left</span>' : '');
  }
  /* The GM's hand on a hero's countdown, in the hero's panel: Stable after a successful Tend, hurt again while stable, a round more or less to put a mistake right. */
  function dyingControls(c) {
    var st = c.dying, b = function (op, label, extra, title) { return '<button class="btn small" data-do="dying" data-id="' + c.id + '" data-op="' + op + '"' + (extra || '') + (title ? ' title="' + title + '"' : '') + '>' + label + '</button>'; };
    if (!st) return '<div class="row">' + b('fall', 'Start the countdown (d4)', '', 'Roll the d4 for a hero who is at 0') + '</div>';
    if (st.dead) return '<div class="row">' + b('round', 'Give a round back', ' data-d="1"', 'Brings the hero back to dying, with 1 round left') + '</div>';
    return '<div class="row">' + (st.stable ? b('hurt', 'Hurt again (new d4)') : b('stable', 'Stable', '', 'After a successful Tend: the countdown stops')) + b('round', '−1 round', ' data-d="-1"') + b('round', '+1 round', ' data-d="1"') + '</div>' +
      '<p class="hint">' + (st.stable ? 'Stable: the countdown has stopped. Any healing stands them up.' : 'One round comes off at each new round. Any healing stands them up.') + '</p>';
  }
  function trackerView(c) {
    var o = '';
    if (downMark(c)) o += '<p>' + downMark(c, true) + '</p>';
    if (c.hp) o += c.hp.hidden ? '<p>HP unknown</p>' : '<p>' + heartsHtml(c.hp.cur, c.hp.max, 'md') + ' <span class="hpn">HP <b>' + c.hp.cur + '</b> of ' + c.hp.max + '</span></p>';
    if (c.progress) o += c.progress.hidden ? '<p>' + esc(c.progress.label || 'Effort') + ' unknown</p>' : '<p>' + esc(c.progress.label || 'Effort') + ' <b>' + c.progress.cur + '</b> of ' + c.progress.max + '</p>';
    if (c.timer) o += c.timer.hidden ? '<p>' + esc(c.timer.label || 'Timer') + ': unknown</p>' : '<p>' + esc(c.timer.label || 'Timer') + ' <b>' + c.timer.cur + '</b> of ' + c.timer.max + (c.timer.paused ? ' (paused)' : '') + '</p>';
    return o;
  }
  function playerCard(c) {
    var mine = c.owner === S.you.pid;
    return '<div class="row"><button type="button" class="link" data-do="deselect">Back</button></div><div class="sec"><h3>' + esc(c.name) + '</h3>' + (c.img ? '<div style="height:120px;background:' + bgUrl(c.img) + ' center/cover"></div>' : '') + (c.desc ? '<p>' + esc(c.desc) + '</p>' : '') + trackerView(c) +
      (c.kind !== 'pc' && (c.hp || c.progress) && myChar() && !c.owner && !UI.hintSeen ? '<p class="note hint">' + (window.SacramentSheetCore.actions(heroOf(myChar())).length ? 'To attack or try this, choose what you are using below, or tap a stat to roll against it.' : 'To attack or try this, tap a stat below to roll against it.') + '</p>' : '') +
      (ownsHero(c) ? '<p><button class="btn small" data-do="sheet" data-id="' + c.charId + '">Open your sheet</button></p>' : '') + (mine ? '<p class="hint">Given to you by the GM.</p>' : '') + '</div>';
  }
  /* heroes built on the My heroes page in this browser can be brought to the table: the table checks them against the rules and makes them yours */
  function bringBox() {
    var list = window.SacramentHeroes ? window.SacramentHeroes.read().heroes : [];
    return '<h4>Bring a hero from My heroes</h4><p class="note">Choose a saved hero below, or create one in a new tab and return here. This makes a separate table copy; later edits on My heroes do not update it.</p>' + (list.length ? list.map(function (x) { return '<div class="hero"><b>' + esc(x.name) + '</b>' + (x.calling ? ' <span class="note">' + esc(x.calling) + '</span>' : '') + '<p><button class="btn small" data-do="bring" data-id="' + esc(x.id) + '">Bring ' + esc(x.name) + ' to this table</button></p></div>'; }).join('') : '<p class="note">You have no heroes saved in this browser yet.</p>') +
      '<p class="note"><a href="/character/" target="_blank" rel="noopener">Make or edit heroes on the My heroes page</a> (opens in a new tab; this table stays open).</p>';
  }
  /* What a fallen hero's player can do, in the Rules page's words */
  function downHelp(c) {
    if (!downMark(c)) return '';
    var st = c.dying, t = !st ? '<b>You are at 0 HP.</b> The GM starts your countdown.' : st.dead ? '<b>' + esc(c.name) + ' has died.</b>' :
      st.stable ? '<b>You are stable.</b> The countdown has stopped. Any healing puts you back on your feet.' :
      '<b>You are dying: ' + st.left + (st.left === 1 ? ' round' : ' rounds') + ' left.</b> One comes off at each new round. An ally in reach can Tend you (a WIS check), and then the GM marks you stable. Any healing puts you back on your feet.';
    return '<div class="down-help" role="status"><p>' + t + '</p></div>';
  }
  function playerTable() {
    var ch = myChar(), own = cardList().filter(function (c) { return c.owner === S.you.pid; });
    if (!ch) {
      var free = Object.keys(S.chars).map(function (k) { return S.chars[k]; }).filter(function (c) { return !c.owner; });
      return '<div class="sec"><h3>Choose your hero</h3>' + (free.length ? '<p class="hint">Pick a hero to play.</p>' : Object.keys(S.chars).length ? '<p>Every hero already has a player. Bring your own hero below or ask the GM to add another. You can watch the table meanwhile.</p>' : '<p>There are no heroes yet. Bring one from My heroes below, or ask the GM to add one. You can watch the table meanwhile.</p>') +
        free.map(function (c) { var card = S.cards[c.cardId]; return '<div class="hero"><b>' + esc(c.name) + '</b> ' + (card && card.hp && !card.hp.hidden ? heartsHtml(card.hp.cur, card.hp.max, 'md') : '') + (card && card.desc ? '<p>' + esc(card.desc) + '</p>' : '') + '<p class="note">' + R.STATS.filter(function (k) { return c.stats[k]; }).map(function (k) { return k + ' ' + sgn(c.stats[k]); }).join(' · ') + ' · Effort ' + R.CATS.filter(function (k) { return c.effort[k]; }).map(function (k) { return R.CAT_NAMES[k] + ' ' + sgn(c.effort[k]); }).join(', ') + '</p><button class="btn small main" data-do="claim" data-id="' + c.id + '">Play ' + esc(c.name) + '</button></div>'; }).join('') + bringBox() + '<p><a href="/player-guide/" target="_blank" rel="noopener">New player guide (new tab)</a></p></div>';
    }
    var cur = turnCardId() && S.cards[turnCardId()];
    return '<div class="sec"><h3>' + esc(ch.name) + ' <span class="note">(you)</span></h3>' + downHelp(S.cards[ch.cardId]) +
      (myTurn() ? '<p class="turnline mine"><b>Your turn.</b> Tell the GM when you are finished.</p>' : cur ? '<p class="turnline">It is <b>' + esc(cur.name) + '</b>’s turn.</p>' : '') + (UI.hintSeen ? '' : '<p class="hint">Drag your token to move. To attack, select an enemy first, then use a weapon below or in My character.</p>') + '<details class="player-first-turn"><summary>Your first turn</summary><ol><li>Tell the GM what you want to do.</li><li>Select an enemy before using a weapon. Open My character for your sheet and Ready to use actions.</li><li>After a successful attack, roll damage and Apply to the named target.</li><li>Tell the GM when you are finished; the GM moves to the next turn.</li></ol><p><a href="/player-guide/" target="_blank" rel="noopener">Player rules (new tab)</a> · <a href="/how-to-play/" target="_blank" rel="noopener">First game checklist (new tab)</a></p></details></div>' +
      (own.length ? '<div class="sec"><h3>Your gear</h3>' + own.map(function (c) { return '<p><b>' + esc(c.name) + '</b> ' + esc(c.desc || '') + '</p>'; }).join('') + '</div>' : '') + nextBox();
  }
  /* HP as hearts: each Heart is 10 points, filled one after another from the first. A last Heart that holds fewer than 10 is drawn smaller, so no capacity is implied that is not
     there. Fill rises from the bottom in proportion to the points left in that Heart. Hidden numbers never reach here: the caller shows "HP ?" instead. */
  var HEART_PATH = 'M12 21.2C12 21.2 2 14.6 2 8.2 2 4.9 4.5 2.6 7.4 2.6c1.9 0 3.6 1 4.6 2.7 1-1.7 2.7-2.7 4.6-2.7C19.5 2.6 22 4.9 22 8.2 22 14.6 12 21.2 12 21.2Z';
  function heartsHtml(cur, max, cls, silent) {
    max = Math.floor(+max); if (!(max > 0)) return ''; cur = Math.max(0, Math.min(max, Math.floor(+cur) || 0));
    var out = '', n = Math.ceil(max / 10);
    for (var i = 0; i < n; i++) {
      var cap = Math.min(10, max - 10 * i), f = Math.max(0, Math.min(cap, cur - 10 * i)) / cap, k = Math.max(0.5, cap / 10);
      out += '<span class="ht' + (f === 0 ? ' e' : f === 1 ? ' f' : ' p') + '" style="--k:' + k + '"><svg viewBox="0 0 24 22" class="bg"><path d="' + HEART_PATH + '"/></svg>' +
        (f > 0 ? '<svg viewBox="0 0 24 22" class="fg" style="clip-path:inset(' + (100 - Math.round(f * 1000) / 10) + '% 0 0 0)"><path d="' + HEART_PATH + '"/></svg>' : '') + '</span>';
    }
    return '<span class="hearts ' + (cls || '') + '"' + (silent ? ' aria-hidden="true"' : ' role="img" aria-label="' + cur + ' of ' + max + ' hit points" title="' + cur + '/' + max + '"') + '>' + out + '</span>';
  }
  function stepper(label, id, field, t, extra) {
    return '<div class="row"><b>' + label + '</b><span class="stepper"><button data-do="track" data-id="' + id + '" data-field="' + field + '" data-d="-5" aria-label="' + label + ' minus 5">−5</button><button data-do="track" data-id="' + id + '" data-field="' + field + '" data-d="-1" aria-label="' + label + ' minus 1">−1</button>' +
      '<input type="number" value="' + t.cur + '" data-set="' + field + '" data-id="' + id + '" aria-label="' + label + ' now"><button data-do="track" data-id="' + id + '" data-field="' + field + '" data-d="1" aria-label="' + label + ' plus 1">+1</button><button data-do="track" data-id="' + id + '" data-field="' + field + '" data-d="5" aria-label="' + label + ' plus 5">+5</button></span>' +
      '<span>of <input type="number" value="' + t.max + '" data-max="' + field + '" data-id="' + id + '" aria-label="' + label + ' maximum"></span>' + (extra || '') + '<button class="chip" data-do="trackerRemove" data-id="' + id + '" data-field="' + field + '" aria-label="Remove ' + label + '">✕</button></div>';
  }
  /* A selected card, for the GM: what is needed during play (its numbers, the main action, whether players see it). Everything else is one tap away on the Edit card screen. */
  function numbersBlock(c) {
    var id = c.id, h = '';
    if (c.hp) h += '<div class="row">' + heartsHtml(shownHp(c), c.hp.max, 'md' + (hpQueued(c.id) ? ' pend' : '')) + queuedBadge(c) + '</div>' + stepper('HP', id, 'hp', c.hp);
    if (c.progress) h += stepper('Effort', id, 'progress', c.progress);
    if (c.timer) h += stepper('Timer', id, 'timer', c.timer, '<label class="check"><input type="checkbox" data-tflag="auto" data-id="' + id + '"' + (c.timer.auto ? ' checked' : '') + '> each round</label><label class="check"><input type="checkbox" data-tflag="paused" data-id="' + id + '"' + (c.timer.paused ? ' checked' : '') + '> paused</label>');
    return h;
  }
  function gmCard(c) {
    if (UI.cardEdit === c.id) return gmCardEdit(c);
    var id = c.id, pc = c.kind === 'pc', h = '<div class="row between"><button type="button" class="link" data-do="deselect">Back</button><span class="pill">' + (c.visible ? 'Shown to players' : 'Hidden from players') + '</span></div>';
    h += '<h3 class="cardname">' + esc(c.name) + '</h3>' + (c.gmNotes ? '<p class="note gmnote"><b>Your note:</b> ' + esc(c.gmNotes) + '</p>' : '') + numbersBlock(c) + (downMark(c) ? '<div class="sec down-gm"><p>' + downMark(c, true) + '</p>' + dyingControls(c) + '</div>' : '');
    if (c.charId && S.chars[c.charId]) { var ch = S.chars[c.charId]; h += '<div class="row"><button class="btn small" data-do="sheet" data-id="' + ch.id + '">Open ' + esc(ch.name) + '’s sheet</button><span class="hint">Defence ' + ch.defence + '</span></div>'; }
    var fights = !pc && (c.kind === 'enemy' || c.kind === 'obstacle' || !!c.hp || !!c.progress);   /* Hazards and obstacles can attack heroes as well as enemies. */
    if (fights) {
      var heroes = Object.keys(S.chars).map(function (k) { return S.chars[k]; }).filter(function (x) { var hc = S.cards[x.cardId]; return hc && hc.hp && !hc.hp.hidden; });
      if (UI.atk !== id) h += '<div class="row"><button class="btn main grow" data-do="attackToggle" data-id="' + id + '">Attack a hero…</button></div>';
      else h += '<div class="sec"><h4>Attack a hero</h4><div class="row"><label>Attack bonus<input type="number" min="-10" max="10" data-edit="attack" data-id="' + id + '" value="' + (c.attack == null ? '' : c.attack) + '" placeholder="+0"></label>' +
        (heroes.length ? '<label>Target<select id="atkHero" aria-label="Hero to attack">' + heroes.map(function (x) { return '<option value="' + x.cardId + '"' + (UI.atkHero === x.cardId ? ' selected' : '') + '>' + esc(x.name) + ' · Defence ' + x.defence + '</option>'; }).join('') + '</select></label>' : '') + '</div>' +
        (heroes.length ? physical('physA', 'Own d20 (optional)') + '<div class="row"><button class="btn main" data-do="monsterAttack" data-id="' + id + '"' + (UI.rolling ? ' disabled' : '') + '>Attack with ' + esc(c.name) + '</button><button type="button" class="link" data-do="attackToggle" data-id="' + id + '">Cancel</button></div>' : '<p class="hint">No hero with HP to attack.</p>') +
        '<p class="hint">d20 + the attack bonus against the hero’s Defence.' + (c.visible ? '' : ' This card is hidden, so players read “Something attacks…”.') + '</p></div>';
    }
    if (c.loot) h += lootCardPanel(c);
    h += '<div class="row"><button class="btn small' + (!fights && !c.visible ? ' main' : '') + '" data-do="visible" data-id="' + id + '">' + (c.visible ? 'Hide from players' : 'Show to players') + '</button><button class="btn small" data-do="cardEdit" data-id="' + id + '">Edit card</button>' + (fights ? '<button class="btn small" data-do="saveMonster" data-id="' + id + '" title="Keep this monster in this browser, to add it to any table you run">Save to my monsters</button>' : '') + '</div>';
    return h;
  }
  function gmCardEdit(c) {
    var id = c.id, pc = c.kind === 'pc';
    var h = '<div class="row between"><button type="button" class="link" data-do="cardEditDone">Back to the card</button>' + (c.visible ? '' : '<span class="pill">Hidden from players</span>') + '</div><h3>Edit card</h3>' + (c.visible ? '' : '<p class="hint">Players do not see this card yet. Name it, then show it.</p><div class="row"><button class="btn small" data-do="visible" data-id="' + id + '">Show to players</button></div>');
    h += '<label>Name<input data-edit="name" data-id="' + id + '" value="' + esc(c.name) + '" maxlength="60"></label>' +
      '<label>Description (players see this)<textarea rows="3" data-edit="desc" data-id="' + id + '" maxlength="2000">' + esc(c.desc) + '</textarea></label>' +
      '<label>Private notes (only you see these)<textarea rows="3" data-edit="gmNotes" data-id="' + id + '" maxlength="4000">' + esc(c.gmNotes || '') + '</textarea></label>' +
      '';
    h += '<h4>Numbers</h4>' + numbersBlock(c) + '<div class="row">' + (!c.hp ? '<button class="btn small" data-do="trackerAdd" data-id="' + id + '" data-field="hp">Add HP</button>' : '') + (!c.progress ? '<button class="btn small" data-do="trackerAdd" data-id="' + id + '" data-field="progress">Add an Effort bar</button>' : '') + (!c.timer ? '<button class="btn small" data-do="trackerAdd" data-id="' + id + '" data-field="timer">Add a timer</button>' : '') +
      (!pc && (c.hp || c.progress || c.timer) ? '<button class="btn small ' + (c.hideNumbers ? 'on' : '') + '" data-do="hideNumbers" data-id="' + id + '" aria-pressed="' + !!c.hideNumbers + '" title="Players see the card but not its numbers">' + (c.hideNumbers ? 'Numbers hidden from players' : 'Hide the numbers from players') + '</button>' : '') + '</div>';
    if (c.charId && S.chars[c.charId]) { var ch = S.chars[c.charId];
      h += '<h4>Hero: ' + esc(ch.name) + '</h4><p class="hint">Defence ' + ch.defence + ' (10 + CON + armour, armour counting for at most +5).</p><div class="row">' + R.STATS.map(function (k) { return '<label>' + k + '<input type="number" min="-10" max="10" value="' + ch.stats[k] + '" data-stat="' + k + '" data-char="' + ch.id + '"></label>'; }).join('') + '</div>' +
        '<div class="row">' + R.CATS.map(function (k) { return '<label>' + R.CAT_NAMES[k] + ' Effort<input type="number" min="0" max="10" value="' + ch.effort[k] + '" data-eff="' + k + '" data-char="' + ch.id + '"></label>'; }).join('') + '<label>Armour<input type="number" min="0" max="10" value="' + ch.armour + '" data-armour="1" data-char="' + ch.id + '"></label></div>'; }
    h += '<h4>Give, move, copy</h4>';
    if (!pc && S.players.length) h += '<div class="row"><select id="giveTo" aria-label="Give to">' + S.players.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join('') + '</select><button class="btn small" data-do="give" data-id="' + id + '">Give to player</button>' + (c.owner ? '<button class="btn small" data-do="take" data-id="' + id + '">Put back on table</button>' : '') + '</div>';
    if (S.scenes && S.scenes.length > 1 && !pc) h += '<label>Scene<select data-edit="sceneId" data-id="' + id + '">' + S.scenes.map(function (sc) { return '<option value="' + sc.id + '"' + (c.sceneId === sc.id ? ' selected' : '') + '>' + esc(sc.name) + '</option>'; }).join('') + '</select></label>';
    h += '<div class="row"><button class="btn small" data-do="dup" data-id="' + id + '">Duplicate</button>' + (!pc ? '<button class="btn small danger" data-do="del" data-id="' + id + '">' + (UI.confirmDel === id ? 'Really remove?' : 'Remove') + '</button>' : '') + '</div>';
    return h;
  }
  /* the GM's loot table: roll a d100 (or type a physical one), see what it gives, then put it on the table (hidden) or hand it to a hero */
  function lootPanel() {
    var L0 = UI.loot, heroes = Object.keys(S.chars).map(function (k) { return S.chars[k]; }), lib = S.lootLib || [];
    var heroSel = heroes.length ? '<label class="giveto">Give to<select id="lootHero" aria-label="Hero to give loot to">' + heroes.map(function (c) { return '<option value="' + c.id + '"' + (UI.giveHero === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' : '';
    var h = '<div class="row"><button class="btn small main" data-do="lootRoll">Roll loot (d100)</button><button class="btn small" data-do="designLoot">Design loot</button><label class="phys">Own dice<input id="physL" style="width:8em" type="text" inputmode="numeric" placeholder="optional" title="What your own d100 shows. If it leads into a sub-table, add that die after a space: 87 4" aria-label="Your own d100, optional; for a sub-table add its die after a space"></label></div>' + (heroSel ? '<div class="row" style="margin-top:6px">' + heroSel + '</div>' : '');
    if (L0) {
      var D = L0.design;
      h += '<div class="sec" role="status"><h4>' + esc(L0.said || String(L0.n)) + ': ' + esc(L0.name) + '</h4><p class="note">' + esc(L0.category) + (L0.horrorText ? ' · ' + esc(L0.horrorText) : '') + '</p><p>' + esc(L0.flavour) + '</p>' + (L0.gmNote ? '<p class="unv"><b>For you only:</b> ' + esc(L0.gmNote) + '</p>' : '') +
        '<div class="row">' + (D ? '<button class="btn small" data-do="rollEdit">Edit a copy first</button><button class="btn small" data-do="rollPlace">Put it on the table (hidden)</button>' : '<button class="btn small" data-do="lootCard">Put it on the table (hidden)</button>') +
        (heroes.length ? '<button class="btn small main" data-do="lootGive">Give it to this hero</button>' : '') + '</div></div>';
    }
    h += '<h4 class="libh">Your loot library (' + lib.length + ')</h4>' + (lib.length ? lib.map(function (it) {
      return '<div class="lt-item"><h4>' + esc(it.name) + '</h4><span class="note">' + esc(it.category) + ' · ' + (it.equippable ? 'Equippable' : 'Supply') + (it.temptsHorror ? ' · ' + esc(window.SacramentSheetCore.horrorText(it)) : '') + '</span><div class="lt-row"><button class="btn small" data-do="libEdit" data-id="' + it.id + '">Edit</button><button class="btn small" data-do="libPlace" data-id="' + it.id + '">Put on table</button>' + (heroes.length ? '<button class="btn small" data-do="libGive" data-id="' + it.id + '">Give</button>' : '') + '</div></div>';
    }).join('') : '<p class="note">Nothing designed yet. Use Design loot to make your own items.</p>');
    return h + '<p class="note">Only you see the roll and the library. A card put on the table starts hidden; reveal it when the players should see it.</p>';
  }
  /* a loot card made from an item: give it to a hero (the card leaves the table), or change the item */
  var plain = function (title, body) { return '<div class="sec"><h4>' + title + '</h4>' + body + '</div>'; };
  function lootCardPanel(c) {
    var D = c.loot, heroes = Object.keys(S.chars).map(function (k) { return S.chars[k]; });
    return plain('Loot item', '<p class="note">' + esc(D.category) + (D.cat ? ' · ' + esc(window.SacramentRules.CAT_NAMES[D.cat]) + ' Effort' : '') + ' · ' + (D.equippable ? 'Equippable' : 'Supply') + (D.temptsHorror ? ' · ' + esc(window.SacramentSheetCore.horrorText(D)) : '') + '</p>' + (D.notes ? '<p class="unv"><b>Your notes:</b> ' + esc(D.notes) + '</p>' : '') +
      (heroes.length ? '<div class="row"><label class="giveto">Give to<select id="cardHero" aria-label="Hero to give it to">' + heroes.map(function (x) { return '<option value="' + x.id + '">' + esc(x.name) + '</option>'; }).join('') + '</select></label><button class="btn small main" data-do="cardGive" data-id="' + c.id + '">Give to hero</button></div><p class="note">Giving puts it on their sheet and takes the card off the table.</p>' : '') +
      '<div class="row"><button class="btn small" data-do="cardEditLoot" data-id="' + c.id + '">Edit item</button></div>');
  }
  /* The GM's tray when no card is selected: four tabs, grouped by when they are used. No fold-outs. */
  var TABS = [['play', 'Play'], ['scene', 'Scene'], ['loot', 'Loot'], ['table', 'Table']];
  function gmTable() {
    var tab = UI.tab || 'play', body = tab === 'scene' ? tabScene() : tab === 'loot' ? lootPanel() : tab === 'table' ? tabTable() : tabPlay();
    return '<div class="tabs" role="tablist" aria-label="GM tray">' + TABS.map(function (t) { return '<button type="button" role="tab" data-do="gmtab" data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + '</button>'; }).join('') + '</div><div class="tabbody' + (tab === 'play' ? ' play-tray' : '') + '">' + body + '</div>';
  }
  function tabPlay() {
    var t = S.table, edit = !!UI.editOrder, inOrder = t.order.map(function (e) { return e.id; });
    var addable = cardList().filter(function (c) { return inOrder.indexOf(c.id) < 0 && c.kind !== 'loot' && onTable(c); });
    var h = startBox() + '<section class="play-section"><div class="row between"><h3>Turn order</h3>' + (t.order.length ? '<button type="button" class="link" data-do="editOrder" aria-pressed="' + edit + '">' + (edit ? 'Done' : 'Edit order') + '</button>' : '') + '</div>';
    h += t.order.length ? '<ul class="ol turn-order' + (edit ? ' editing' : '') + '">' + t.order.map(function (e, i) {
      var c = e.id && S.cards[e.id], now = i === t.idx;
      return '<li class="' + (now ? 'cur' : '') + '"><button type="button" class="n" data-do="turnTo" data-i="' + i + '" title="Make it this turn">' + esc(c ? c.name : 'Unseen') + (now ? ' <span class="pill">now</span>' : '') + '</button>' +
        (edit ? '<button class="chip" data-do="up" data-i="' + i + '" aria-label="Move earlier"' + (i ? '' : ' disabled') + '>Up</button><button class="chip" data-do="down" data-i="' + i + '" aria-label="Move later"' + (i < t.order.length - 1 ? '' : ' disabled') + '>Down</button><button class="chip" data-do="outOrder" data-i="' + i + '" aria-label="Remove from the order">Remove</button>' : '') + '</li>';
    }).join('') + '</ul>' : '<p class="hint">Nobody is in the turn order yet.</p>';
    if (edit && addable.length) h += '<div class="row"><select id="addOrder" aria-label="Add to the order">' + addable.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('') + '</select><button class="btn small" data-do="addOrder">Add</button></div>';
    h += '<p class="hint">Tap a card or token on the table to act on it. Tap a name to make it their turn.</p>';
    var living = cardList().filter(function (c) { return c.kind === 'pc' && c.hp && !(c.dying && c.dying.dead); }).length, nd = R.restDice(living);
    if (!living) UI.restAsk = false;
    return h + '</section><section class="play-section"><h3>Rest</h3><div class="row"><button class="btn small' + (UI.restAsk ? ' danger' : '') + '" data-do="rest"' + (living ? '' : ' disabled') + '>' + (UI.restAsk ? 'Sure? The party rests' : 'Party rest') + '</button></div>' +
      '<p class="hint">For a rest in a safe place: every living hero recovers 1 Heart (the fallen stand up) and the Horror falls by ' + (nd || 1) + 'd' + R.REST.horrorDie + ' (a d' + R.REST.horrorDie + ' for every two living heroes). One Undo takes it back.</p></section><section class="play-section"><h3>Monster attacks</h3><label class="check"><input type="checkbox" data-setting="sceneDanger"' + (S.settings.sceneDanger ? ' checked' : '') + '> Add scene danger automatically</label><p class="hint">At Target ' + S.table.target + ', add +' + R.sceneDanger(S.table.target) + ' to monster attacks. Keep each monster’s Attack bonus as its base bonus. Remove any scene bonus you previously added by hand before switching this on.</p></section><section class="play-section">' + nextControls() + '</section>';
  }
  /* A new table: until a player has taken up a hero, the first thing in the GM's tray is how to get them in. */
  function startBox() {
    var heroes = Object.keys(S.chars), playing = heroes.some(function (k) { return S.chars[k].owner; });
    if (playing) return '';
    return '<div class="sec start"><h3>Getting started</h3><p class="hint">Your players join with this code, or with the invite link.</p><div class="row"><b class="code">' + esc(S.code) + '</b><button class="btn main grow" data-do="copy">Copy invite link</button></div>' +
      (heroes.length ? '<p class="hint">Each player picks a free hero when they join, or brings one from My heroes. This box goes away once someone has.</p>' : '<p class="hint">There are no heroes yet. Add a blank one for each player, or let them bring a hero from My heroes.</p><div class="row"><button class="btn small" data-do="addHero">Add a blank hero</button></div>') + '</div>';
  }
  function tabScene() {
    var live = S.table.scene.id, view = viewScene(), bg = (S.scenes.filter(function (x) { return x.id === view; })[0] || {}).bg || '';
    var h = '<h3>Scenes</h3><ul class="ol scene-list">' + S.scenes.map(function (x) {
      var isLive = x.id === live, isView = x.id === view;
      var right = isLive ? '<span class="pill">Live</span>' : '';
      if (!isView) right += '<button class="btn small" data-do="openScene" data-scene="' + x.id + '">Open</button>';
      else if (!isLive) right += '<span class="pill">Preparing</span><button class="btn small main" data-do="reveal" data-scene="' + x.id + '">Show to players</button>';
      if (!isLive) right += '<button type="button" class="btn small danger" data-do="deleteScene" data-scene="' + x.id + '" aria-label="Delete scene: ' + esc(x.name) + '">Delete</button>';
      right += '<button type="button" class="btn small" data-do="renameScene" data-scene="' + x.id + '" aria-label="Rename scene: ' + esc(x.name) + '">Rename</button>';
      return '<li class="' + (isView ? 'cur' : '') + '"><span class="n">' + esc(x.name) + '</span>' + right + '</li>';
    }).join('') + '</ul><p class="hint">Show another scene to players before deleting the live scene. Heroes and items held by players are kept.</p>';
    var deleting = S.scenes.filter(function (x) { return x.id === UI.sceneDelete; })[0];
    if (deleting) h += '<div class="sec scene-delete"><h4>Delete ' + esc(deleting.name) + '?</h4><p>This permanently removes this scene, its table cards and its drawings. Heroes and items held by players are kept. This cannot be undone. Uploaded pictures are kept in case another scene uses them.</p><div class="row"><button class="btn small danger" data-do="confirmSceneDelete" data-scene="' + deleting.id + '"' + (UI.sceneDeleting ? ' disabled aria-busy="true"' : '') + '>Delete this scene</button><button class="btn small" data-do="cancelSceneDelete">Cancel</button></div></div>';
    var renaming = S.scenes.filter(function (x) { return x.id === UI.sceneRename; })[0];
    if (renaming) h += '<div class="sec scene-rename"><h4>Rename ' + esc(renaming.name) + '</h4><label>Scene name<input id="sceneName" maxlength="60" required value="' + esc(UI.sceneName || '') + '"' + (UI.sceneRenameSaving ? ' disabled' : '') + '></label><div class="row"><button type="button" class="btn small main" data-do="saveSceneName"' + (UI.sceneRenameSaving ? ' disabled aria-busy="true"' : '') + '>' + (UI.sceneRenameSaving ? 'Saving…' : 'Save name') + '</button><button type="button" class="btn small" data-do="cancelSceneName"' + (UI.sceneRenameSaving ? ' disabled' : '') + '>Cancel</button></div></div>';
    h += '<div class="row"><input id="newScene" placeholder="New scene name" maxlength="60" aria-label="New scene name"><button class="btn small" data-do="newScene">Add</button></div>';
    h += '<div class="row"><button type="button" class="link" data-do="sceneBg" aria-expanded="' + !!UI.sceneBg + '">' + (UI.sceneBg ? 'Hide picture settings' : 'Change the picture for this scene') + '</button></div>';
    if (UI.sceneBg) h += '<label>Picture address<input id="bgUrl" value="' + esc(bg) + '" placeholder="https://…"></label><label>Or upload one<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-upload="bg"></label>';
    h += '<h3>Add to the table</h3><div class="row"><button class="btn small" data-do="addEnemy" title="A token with 1 Heart, in the turn order">Enemy</button><button class="btn small" data-do="addObstacle" title="A card with an Effort bar">Obstacle</button><button class="btn small" data-do="addCard">Card</button></div>';
    return h + monsterList();
  }
  /* The GM's monsters: kept in this browser (like My heroes), so one made at one table can be added to any other. A monster added comes in hidden, in the turn order, at full HP. */
  function monsters() { try { var l = JSON.parse(localStorage.getItem(KEY + 'monsters') || '[]'); return Array.isArray(l) ? l : []; } catch { return []; } }
  function keepMonsters(l) { try { localStorage.setItem(KEY + 'monsters', JSON.stringify(l)); return true; } catch { return false; } }
  function saveMonster(c) {
    var l = (S.layout[c.id] || {}), m = { name: c.name, kind: c.kind === 'token' ? 'token' : 'card', desc: c.desc || '', gmNotes: c.gmNotes || '', img: c.img || '', hp: c.hp ? c.hp.max : 10, attack: c.attack, hideNumbers: !!c.hideNumbers, w: l.w, h: l.h };
    var list = monsters().filter(function (x) { return x.name !== m.name; }); list.unshift(m);
    if (list.length > 50) { toast('You can keep 50 monsters. Forget one first.'); return; }
    toast(keepMonsters(list) ? 'Saved ' + m.name + ' to your monsters. Add it to any table from the Scene tab.' : 'This browser could not save it.', 6000);
  }
  function monsterList() {
    var list = monsters();
    return '<h3>Your monsters</h3>' + (list.length ? '<ul class="ol">' + list.map(function (m, i) {
      return '<li><span class="n">' + esc(m.name) + ' <span class="note">' + (m.hp ? m.hp + ' HP' : '') + (m.attack != null ? ' · attack ' + sgn(m.attack) : '') + '</span></span><button class="btn small" data-do="addMonster" data-i="' + i + '">Add</button><button class="btn small' + (UI.forgetMon === i ? ' danger' : '') + '" data-do="forgetMonster" data-i="' + i + '">' + (UI.forgetMon === i ? 'Sure?' : 'Forget') + '</button></li>';
    }).join('') + '</ul>' : '<p class="hint">None yet. Select an enemy on the table and press Save to my monsters. They are kept in this browser, for every table you run here.</p>');
  }
  function addMonster(m) {
    var card = { kind: m.kind === 'token' ? 'token' : 'card', name: m.name, desc: m.desc, gmNotes: m.gmNotes, img: m.img, hp: { cur: m.hp || 10, max: m.hp || 10 }, attack: m.attack, hideNumbers: !!m.hideNumbers, sceneId: viewScene(), visible: false };
    card.w = m.w || 9; card.h = m.h || 9; var at = freeSpot(card.w, card.kind === 'token' ? card.w : card.h); card.x = at.x; card.y = at.y;
    send({ type: 'cardCreate', card: card, addToOrder: true }, function (b) { if (b) { UI.sel = b.result.id; render(); toast('Added ' + m.name + ', hidden. Show it when the players should see it.', 6000); } });
  }
  function tabTable() {
    if (UI.sub) return '<div class="row"><button type="button" class="link" data-do="gmsub" data-s="">Back</button></div>' + (UI.sub === 'rules' ? '<h3>House rules</h3>' + rulesPanel() : UI.sub === 'recap' ? recapPanel() : '<h3>Running things by hand</h3><p class="hint">Catalogue healing, bandage uses and once-per-rest limits are automated. Scene danger can be switched on in Play. Custom items written only as free text, ranges, esoteric effects and other rules outside the automated controls are run by hand. Change HP with − and + on a hero’s strip or in any card’s panel, and say what happens.</p><p class="hint">The table keeps the dying countdown: a hero at 0 rolls a d4, loses a round at each new round, and dies at 0. Press Stable in their panel after a successful Tend. <b>Party rest</b> is in the Play tab. A new hero starts with 10 HP (1 Heart), plus any Hearts from their gear.</p>');
    var h = '<h3>Invite players</h3><div class="row"><b class="code">' + esc(S.code) + '</b><button class="btn main grow" data-do="copy">Copy invite link</button></div>';
    h += horrorControls();
    h += '<h3>Players</h3>' + (S.players.length ? '<ul class="ol">' + S.players.map(function (p) { var mine = Object.keys(S.chars).filter(function (k) { return S.chars[k].owner === p.id; })[0]; return '<li class="player-row"><span class="n">' + esc(p.name) + '</span><select data-assign="' + p.id + '" aria-label="Hero for ' + esc(p.name) + '"><option value="">No hero</option>' + Object.keys(S.chars).map(function (k) { var c = S.chars[k]; return '<option value="' + k + '"' + (k === mine ? ' selected' : '') + (c.owner && c.owner !== p.id ? ' disabled' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select><button class="btn small danger" data-do="removePlayer" data-pid="' + p.id + '"' + (UI.removeBusy === p.id ? ' disabled' : '') + ' aria-label="' + (UI.removePlayerAsk === p.id ? 'Confirm removal of ' : 'Remove ') + esc(p.name) + '">' + (UI.removeBusy === p.id ? 'Removing…' : UI.removePlayerAsk === p.id ? 'Confirm removal' : 'Remove') + '</button>' + (UI.removePlayerAsk === p.id ? '<p class="hint player-warning">Their current access will stop and their hero becomes available. Private possessions return hidden to the GM. They can join again with the invitation code.</p><button class="btn small" data-do="cancelRemovePlayer">Cancel</button>' : '') + '</li>'; }).join('') + '</ul>' : '<p class="hint">Nobody has joined yet. Send them the invite link.</p>');
    h += '<div class="row"><button class="btn small" data-do="addHero" title="A blank hero: name it, then fill in its numbers by hand">Add a blank hero</button></div>';
    h += diceSwitch();
    h += '<h3>Your GM link</h3><div class="row"><button class="btn small" data-do="copyKey">Copy your GM link</button></div><p class="hint">Keep it somewhere private, such as your notes. It brings you back to this table as the GM on any device, or after this browser forgets. Anyone who has it can run the table, so do not send it to players.</p>';
    h += '<h3>More</h3><ul class="ol links"><li><button type="button" class="n" data-do="gmsub" data-s="rules">House rules</button></li><li><button type="button" class="n" data-do="gmsub" data-s="manual">Running things by hand</button></li><li><button type="button" class="n" data-do="gmsub" data-s="recap">Session recap</button></li></ul>';
    h += '<div class="row"><button class="btn small" data-do="showRecovery">Save your recovery link</button></div>';
    h += '<div class="row"><button class="btn small danger" data-do="leave">' + (UI.leaveAsk ? 'Sure? Only your GM link brings you back' : 'Leave table') + '</button></div>';
    return h;
  }
  function diceSwitch() { return '<label class="check"><input type="checkbox" data-diceanim' + (D.off() ? '' : ' checked') + '> Show dice tumbling on this screen</label>' + (gm() ? '' : '<label class="check"><input type="checkbox" data-sound' + (UI.soundOff ? '' : ' checked') + '> A chime when it is your turn or you are hit</label>'); }
  /* The GM's hand on the Rising Horror: down by a d6 (rolled where everyone sees it), up or down by one, set it to a number, or reset it to 0 (asked twice).
     Each change is in the feed with an Undo. */
  function horrorControls() {
    var H = S.horror; if (!H) return '';
    if (!H.cur) UI.hzResetAsk = false;
    return '<h3>The Horror</h3><div class="row hz-gm" role="group" aria-label="The Rising Horror"><span class="n"><b>' + H.cur + '</b> of ' + H.max + '</span>' +
      '<button class="btn small" data-do="horrorRoll"' + (H.cur ? '' : ' disabled') + ' title="Roll a d' + R.HORROR.lowerDie + ' in front of the table and lower the Horror by what it shows">Lower by d' + R.HORROR.lowerDie + '</button>' +
      '<button class="btn small" data-do="horrorAdj" data-d="-1" aria-label="Lower the Horror by 1">−1</button><button class="btn small" data-do="horrorAdj" data-d="1" aria-label="Raise the Horror by 1">+1</button>' +
      (H.cur > 0 ? '<button class="btn small' + (UI.hzResetAsk ? ' danger' : '') + '" data-do="horrorReset">' + (UI.hzResetAsk ? 'Sure? Reset to 0' : 'Reset to 0') + '</button>' : '') +
      '<span class="hz-set"><label>Set to<input id="hzSet" type="number" min="0" max="' + H.max + '" inputmode="numeric" value="' + H.cur + '"></label><button class="btn small" data-do="horrorSet">Set</button></span></div>' +
      '<p class="hint">It rises by itself when a spell is cast or a relic used, and is marked at ' + H.thresholds.join(', ') + '. It only falls when you lower it.</p>';
  }
  /* The next session: the GM sets it in the Play tab; everyone reads it in their own time, with links to put it in a calendar (three hours, by default). */
  function sayWhen(ms) { return new Date(ms).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  var utc = function (ms) { return new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); };
  var icsText = function (t) { return String(t).replace(/\\/g, '\\\\').replace(/[,;]/g, function (c) { return '\\' + c; }).replace(/\n/g, '\\n'); };
  function calendarLinks(N) {
    var end = N.at + 3 * 3600000, link = location.origin + '/vtt/?room=' + S.code, title = 'Sacrament RPG', about = (N.note ? N.note + '\n' : '') + 'The table: ' + link;
    var google = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + utc(N.at) + '/' + utc(end) + '&details=' + encodeURIComponent(about);
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Sacrament RPG//Table//EN', 'BEGIN:VEVENT', 'UID:' + S.code + '-' + N.at + '@sacrament-table', 'DTSTAMP:' + utc(N.at), 'DTSTART:' + utc(N.at), 'DTEND:' + utc(end), 'SUMMARY:' + icsText(title), 'DESCRIPTION:' + icsText(about), 'URL:' + link, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    return '<div class="row cal"><a class="btn small" href="' + esc(google) + '" target="_blank" rel="noopener">Add to Google Calendar</a><a class="btn small" href="data:text/calendar;charset=utf-8,' + esc(encodeURIComponent(ics)) + '" download="sacrament-next-session.ics">Other calendars (.ics)</a></div>';
  }
  function nextBox() {
    var N = S.nextSession; if (!N || !N.at) return '';
    return '<div class="sec next"><h3>Next session</h3><p><b>' + esc(sayWhen(N.at)) + '</b>' + (N.at < Date.now() ? ' <span class="note">(passed)</span>' : '') + '</p>' + (N.note ? '<p>' + esc(N.note) + '</p>' : '') + calendarLinks(N) + '</div>';
  }
  var localInput = function (ms) { var d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
  function nextControls() {
    var N = S.nextSession;
    return '<h3>Next session</h3>' + (N && N.at ? '<p><b>' + esc(sayWhen(N.at)) + '</b>' + (N.note ? ' · ' + esc(N.note) : '') + '</p>' + calendarLinks(N) : '<p class="hint">Not set. Set it and every player sees it, in their own time, with a link to add it to their calendar.</p>') +
      '<div class="row"><label>When<input id="nextAt" type="datetime-local" value="' + (N && N.at ? localInput(N.at) : '') + '"></label><label class="grow">Note (optional)<input id="nextNote" maxlength="120" placeholder="Bring dice and snacks" value="' + esc(N && N.note || '') + '"></label></div>' +
      '<div class="row"><button class="btn small" data-do="nextSet">' + (N && N.at ? 'Change the date' : 'Set the date') + '</button>' + (N && N.at ? '<button class="btn small" data-do="nextClear">Clear it</button>' : '') + '</div>';
  }
  /* The session recap: tonight's game in a few lines the GM can copy into the group's chat. Made from the table's tally (see the core), which names only what the players saw. */
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  function recapLines() {
    var C = S.recap, H = S.horror; if (!C) return [];
    var when = C.since ? new Date(C.since).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }) : '', out = ['Sacrament RPG: the session' + (when ? ' of ' + when : '')];
    var rounds = Math.max(1, S.table.round - (C.round0 || 1) + 1), scenes = C.scenes.length ? C.scenes : [S.table.scene.name];
    out.push(plural(rounds, 'round', 'rounds') + ', in ' + scenes.join(', ') + '.');
    Object.keys(C.heroes).map(function (k) { return C.heroes[k]; }).forEach(function (h) {
      out.push(h.name + ': ' + plural(h.rolls, 'roll', 'rolls') + ', ' + h.hits + ' succeeded' + (h.n20 ? ', ' + (h.n20 === 1 ? 'a natural 20' : h.n20 + ' natural 20s') : '') + (h.n1 ? ', ' + (h.n1 === 1 ? 'a natural 1' : h.n1 + ' natural 1s') : '') + (h.dealt ? ', ' + h.dealt + ' damage dealt' : '') + '.');
    });
    if (C.best) out.push('The hardest blow: ' + C.best.who + ', ' + C.best.n + ' damage on ' + C.best.on + '.');
    var stood = C.fell.filter(function (n) { return C.died.indexOf(n) < 0; });
    if (stood.length) out.push('Fell, and lived: ' + stood.filter(function (n, i) { return stood.indexOf(n) === i; }).join(', ') + '.');
    if (C.died.length) out.push('Died: ' + C.died.join(', ') + '.');
    if (C.found.length) out.push('Found: ' + C.found.join('; ') + '.');
    if (C.rests) out.push('The party rested ' + (C.rests === 1 ? 'once' : C.rests === 2 ? 'twice' : C.rests + ' times') + '.');
    if (H && !Math.max(C.horrorPeak || 0, H.cur)) out.push('The Horror did not stir.');
    else if (H) out.push('The Horror rose to ' + Math.max(C.horrorPeak || 0, H.cur) + ' of ' + H.max + (H.cur !== Math.max(C.horrorPeak || 0, H.cur) ? ' (it stands at ' + H.cur + ')' : '') + '.');
    if (S.nextSession && S.nextSession.at) out.push('Next time: ' + sayWhen(S.nextSession.at) + '.');
    return out;
  }
  function recapPanel() {
    var lines = recapLines();
    return '<h3>Session recap</h3><div class="recap" id="recapText">' + lines.map(function (l, i) { return i ? '<p>' + esc(l) + '</p>' : '<p><b>' + esc(l) + '</b></p>'; }).join('') + '</div>' +
      '<div class="row"><button class="btn small main" data-do="copyRecap">Copy the recap</button><button class="btn small' + (UI.recapAsk ? ' danger' : '') + '" data-do="recapReset">' + (UI.recapAsk ? 'Sure? Start counting again' : 'Start a new session') + '</button></div>' +
      '<p class="hint">Paste it into your group’s chat after the game. It names only what the players have seen. Undo does not take things back out of it. Start a new session at the beginning of the next game.</p>';
  }
  function rulesPanel() {
    var s = S.settings, h = '<p class="unv">House rules for this table. Everything else is a fixed rule.</p>';
    h += '<label class="check"><input type="checkbox" data-setting="nat20Ultimate"' + (s.nat20Ultimate ? ' checked' : '') + '> A natural 20 offers Ultimate Effort</label>';
    h += '<h4>Effort dice</h4><div class="row">' + R.CATS.map(function (k) { return '<label>' + R.CAT_NAMES[k] + '<select data-die="' + k + '">' + [4, 6, 8, 10, 12, 20].map(function (d) { return '<option' + (s.dice[k] === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></label>'; }).join('') + '</div>';
    return h;
  }
  function renderFeed() {
    var L = S.log, last = L[L.length - 1], open = UI.feedOpen;
    /* The line does not give the number away while the dice are still in the air: it names the roll in the air, even when a line about its result (a natural 1 raising the Horror) came after it. */
    var air = D.rolling() && L.filter(function (e) { return e.dice && !e.undone; }).pop(), said = air ? air.who + ': ' + String(air.text).split(/ · |: /)[0] + ' rolls…' : last ? last.who + ': ' + last.text : '';
    var h = '<div class="bar1"><button class="chip" data-do="feed" aria-expanded="' + open + '">' + (open ? 'Hide activity' : 'Activity') + '</button><span class="last" aria-live="polite">' + (last ? esc(said) : 'Nothing written yet.') + '</span></div>';
    if (open) h += '<ol>' + L.slice(-30).map(function (e) { return '<li class="' + (e.undone ? 'undone ' : '') + e.kind + '"><span class="w">' + esc(e.who) + '</span><span class="tx">' + esc(e.text) + '</span>' + (e.undoable ? '<button class="chip" data-do="undo" data-id="' + e.id + '" aria-label="Undo">Undo</button>' : '') + '</li>'; }).reverse().join('') + '</ol>';
    else if (last && last.undoable) h = h.replace('</div>', '<button class="chip" data-do="undo" data-id="' + last.id + '">Undo last</button></div>');
    var f = $('feed'); if (f.dataset.h !== h) { f.innerHTML = h; f.dataset.h = h; }
  }

  /* HP clicks that have been sent but not confirmed, per card, in order. What the table holds (confirmed) and what it will hold when they are saved (shown) are told apart everywhere HP can be changed. */
  function shownHp(card) { var v = card.hp.cur; (UI.hpOps[card.id] || []).forEach(function (o) { v = o.set !== undefined ? o.set : v + o.d; v = Math.max(0, Math.min(card.hp.max, v)); }); return v; }
  function hpQueued(id) { return (UI.hpOps[id] || []).length; }
  function hpQueue(id, op, fire) {
    (UI.hpOps[id] = UI.hpOps[id] || []).push(op); render();
    fire(function () { var q = UI.hpOps[id] || [], i = q.indexOf(op); if (i >= 0) q.splice(i, 1); render(); });
  }
  function queuedBadge(card) { var n = hpQueued(card.id); return n ? '<span class="queued" role="status" title="These changes have been sent and are not yet confirmed">saving ' + n + ': ' + card.hp.cur + ' → ' + shownHp(card) + '</span>' : ''; }
  /* Selecting a card. For the GM, selecting a hero's token also makes that hero the one the roll bar controls, and opens the bar. */
  function pickCard(id) { UI.sel = id; var c = S && S.cards[id]; if (gm() && c && c.charId && S.chars[c.charId]) { UI.actAs = c.charId; UI.gmStrip = true; } }
  function gmDiceView() {
    var out = '<div class="gm-dice' + (UI.gmDiceOpen ? ' open' : '') + '"><button class="chip" data-do="gmDiceToggle" aria-expanded="' + !!UI.gmDiceOpen + '">GM dice</button>';
    if (UI.gmDiceOpen) out += '<label>Dice <select id="gmDie">' + [4,6,8,10,12,20,100].map(function (n) { return '<option value="' + n + '"' + (n === (UI.gmDie || 6) ? ' selected' : '') + '>d' + n + '</option>'; }).join('') + '</select></label><label>Number <input id="gmDiceCount" type="number" min="1" max="20" value="' + (UI.gmDiceCount || 1) + '"></label><label><input id="gmDicePrivate" type="checkbox"' + (UI.gmDicePrivate ? ' checked' : '') + '> GM only</label><button class="chip" data-do="gmDiceRoll"' + (UI.gmDiceBusy ? ' disabled' : '') + '>Roll GM dice</button><span role="status">' + esc(UI.gmDiceResult || 'For damage or any other roll. Apply results by hand.') + '</span>';
    return out + '</div>';
  }
  function renderStrip() {
    var el = $('strip'), ch = myChar(), G = gm(), h = G ? gmDiceView() : '';
    if (!ch) {
      var anyFree = Object.keys(S.chars).some(function (k) { return !S.chars[k].owner; });
      h += G ? '<span class="note">No heroes yet. Nobody has taken up the road.</span>' : anyFree ? '<b>Pick a hero to play.</b> <span class="note">Then your stats appear here.</span>' : Object.keys(S.chars).length ? '<b>No hero is free.</b> <span class="note">Ask the GM to add one. You can watch the table.</span>' : '<b>No heroes yet.</b> <span class="note">Nobody has taken up the road. Ask the GM to add one for you. You can watch the table.</span>';
      el.innerHTML = h; return;
    }
    if (G && !UI.gmStrip) { el.innerHTML = h + '<button class="chip" data-do="gmstrip" aria-expanded="false" title="Roll for a hero">Roll as ' + esc(ch.name) + '…</button>'; return; }
    var card = S.cards[ch.cardId], hp = card && card.hp, keep = UI.phys || '';
    h += '<div class="me' + (G ? ' gm' : '') + '">' + (G ? '<button class="chip" data-do="gmstrip" aria-expanded="true">Hide</button><label class="actas"><span class="note">Acting as</span><select id="actAs" aria-label="Acting as (the hero the strip below controls)">' + Object.keys(S.chars).map(function (k) { return '<option value="' + k + '"' + (k === ch.id ? ' selected' : '') + '>' + esc(S.chars[k].name) + '</option>'; }).join('') + '</select></label>' : '<b title="Your hero">' + esc(ch.name) + '</b>') + '</div>';
    if (hp) h += '<div class="hp"><span class="stepper"><button data-do="hpAdj" data-id="' + card.id + '" data-d="-1" aria-label="Lose 1 HP">−</button>' + heartsHtml(shownHp(card), hp.max, 'md' + (hpQueued(card.id) ? ' pend' : ''), true) + '<span class="v' + (hpQueued(card.id) ? ' pend' : '') + '" aria-label="' + shownHp(card) + ' of ' + hp.max + ' hit points' + (hpQueued(card.id) ? ' (saving)' : '') + '">' + shownHp(card) + '/' + hp.max + '</span><button data-do="hpAdj" data-id="' + card.id + '" data-d="1" aria-label="Gain 1 HP">+</button></span>' + queuedBadge(card) + '</div>';
    h += '<span class="def" title="A monster must roll this or more to hit you">Defence <b>' + ch.defence + '</b></span>';
    if (downMark(card)) h += downMark(card, true).replace('<b ', '<b role="status" ');
    h += '<div class="stats" role="group" aria-label="Roll a stat">' + R.STATS.map(function (k) { return '<button class="stat" data-do="roll" data-stat="' + k + '" aria-label="Roll ' + k + ' ' + sgn(ch.stats[k]) + '">' + k + '<b>' + sgn(ch.stats[k]) + '</b></button>'; }).join('') + '</div>';
    var foe = aimFoe(), choices = foe && window.SacramentSheetCore.actions(heroOf(ch)).some(function (a) { return a.ok; });
    if (choices) {
      /* Keep the map visible when an enemy or obstacle is selected. */
      h += '<div class="aim-prompt" role="group" aria-label="Selected target">' +
        '<span class="q">How are you going to deal with <b>' + esc(foe.name) + '</b>?</span>' +
        '<button class="chip" data-do="sheet" data-id="' + ch.id + '" aria-label="Open your character sheet to choose an action">Open character sheet</button>' +
        (UI.askItem && UI.askItem.card === foe.id ? '<button class="chip" data-do="roll" data-stat="' + UI.askItem.stat + '" data-noitem="1"' + (foe.hp ? ' data-attack="1"' : '') + '>Roll ' + UI.askItem.stat + ' with no item' + (foe.hp ? ' (attack)' : '') + '</button>' + (foe.hp ? '<button class="chip" data-do="check" data-stat="' + UI.askItem.stat + '">Roll ' + UI.askItem.stat + ' check</button>' : '') : '') +
        '</div>';
    }
    h += '<div class="seg" role="group" aria-label="Next roll">' + ['easy', 'normal', 'hard'].map(function (a) { return '<button data-do="adj" data-adj="' + a + '" aria-pressed="' + (UI.adj === a) + '">' + a + (a === 'easy' ? ' −3' : a === 'hard' ? ' +3' : '') + '</button>'; }).join('') + '</div>';
    h += '<div class="opt">' + (choices ? '' : '<button class="chip" data-do="sheet" data-id="' + ch.id + '" title="Your hero\u2019s sheet: scores, gear, notes">' + (G ? 'Character sheet' : 'My character') + '</button>') + '<button class="chip" data-do="toggle" data-key="more" aria-expanded="' + !!UI.optMore + '" title="Roll Effort on its own, or use your own dice">More</button></div>' +
      (UI.optMore ? '<div class="opt row2"><button class="chip" data-do="toggle" data-key="effort" aria-expanded="' + !!UI.optEffort + '">Effort</button><button class="chip" data-do="toggle" data-key="dice" aria-expanded="' + !!UI.optDice + '">My dice</button></div>' : '');
    var gear = cardList().filter(function (c) { return c.owner && (G ? false : c.owner === S.you.pid); });
    if (gear.length) h += '<div class="gear"><span class="note">Gear</span>' + gear.map(function (c) { return '<button class="chip" data-do="select" data-id="' + c.id + '">' + esc(c.name) + '</button>'; }).join('') + '</div>';
    if (UI.optEffort) h += '<div class="efs row2" role="group" aria-label="Effort bonuses"><span class="note">Roll Effort on its own:</span><input id="physF" type="number" min="1" max="20" inputmode="numeric" placeholder="own die" aria-label="Result of your own physical die, optional">' + R.CATS.map(function (k) { return '<button class="ef" data-do="freeEffort" data-cat="' + k + '" title="Roll ' + R.CAT_NAMES[k] + ' Effort on its own">' + R.CAT_NAMES[k] + ' d' + S.settings.dice[k] + ' <b>' + sgn(ch.effort[k]) + '</b></button>'; }).join('') + '</div>';
    if (UI.optDice) h += '<div class="phys row2">' + diceSwitch() + '</div>';
    if (UI.optDice) h += '<div class="phys row2"><label>Physical d20 for the next roll<input data-phys type="number" min="1" max="20" inputmode="numeric" placeholder="—" value="' + esc(keep) + '"></label><span class="note">Type what your own die shows, then click a stat. Effort has its own box when you roll it.</span></div>';
    el.innerHTML = h; el.classList.toggle('myturn', !G && myTurn());
    var sel = $('actAs'); if (sel) sel.onchange = function () { UI.actAs = sel.value; render(); };
    var pi = el.querySelector('input[data-phys]'); if (pi) pi.oninput = function () { UI.phys = pi.value; };
  }
  /* What pressing a Use button does, in words, for its hover text. */
  /* The aim of the hero's next roll: a selected card on the table that is not a hero and has HP or an Effort bar */
  function aimFoe() { var c = UI.sel && S.cards[UI.sel]; return c && c.kind !== 'pc' && onTable(c) && (c.hp || c.progress) ? c : null; }
  function itemButtons(usable) {
    return usable.map(function (a) { return '<button class="ef' + (a.ok ? '' : ' dim') + '" data-do="useItem" data-i="' + a.index + '"' + (a.spellId ? ' data-spell="' + esc(a.spellId) + '"' : '') + ' title="' + esc(!a.ok ? a.why : useHow(a)) + '">' + esc(a.name) + ' · ' + (a.pick ? 'd' + a.pick + ' spell' : a.cat ? R.CAT_NAMES[a.cat] + ' d' + S.settings.dice[a.cat] : a.stat ? a.stat + ' check' : 'no roll') + (a.horror ? ' · Horror ' + R.sayHorrorAmount(a.horror) : '') + '</button>'; }).join('');
  }
  function useHow(a) {
    var how = a.pick ? 'Roll d' + a.pick + ' and cast the spell that comes up' : a.cat ? 'Check with ' + a.stat + ', then on a success you roll its ' + R.CAT_NAMES[a.cat] + ' die for damage' : a.stat ? 'Check with ' + a.stat + ' (no Effort)' : 'No roll';
    return how + (a.horror ? '. The Horror rises ' + R.sayHorrorAmount(a.horror) + '.' : a.pick ? '. The Horror rises by that spell\u2019s amount.' : '.');
  }
  function physVal(id) { var i = $(id); var v = i && i.value.trim(); if (i) i.value = ''; return v ? +v : undefined; }
  function doRoll(stat, noItem, attack) {
    var ch = myChar(); if (!ch || UI.rolling) return;   /* one click, one roll: a second click while the first is on its way is ignored */
    /* Aimed at a foe with an item to hand: the first click on a stat asks first, so nobody swings bare-handed by mistake. "Roll with no item" (or the same stat again) goes ahead. */
    var foe = aimFoe(), asked = UI.askItem && foe && UI.askItem.card === foe.id && UI.askItem.stat === stat;
    if (foe && !noItem && !asked && window.SacramentSheetCore.actions(heroOf(ch)).some(function (a) { return a.ok; })) { UI.askItem = { card: foe.id, stat: stat }; renderStrip(); return; }
    UI.askItem = null;
    UI.rolling = 'Rolling ' + stat; var d20 = UI.phys && String(UI.phys).trim() ? +UI.phys : undefined; UI.phys = ''; var pi = document.querySelector('#strip input[data-phys]'); if (pi) pi.value = '';
    var sel = UI.sel && S.cards[UI.sel], target = sel && sel.kind !== 'pc' && onTable(sel) ? sel.id : undefined;
    renderPanel();
    send({ type: 'roll', charId: ch.id, stat: stat, attack: attack === true, adj: UI.adj, d20: d20, targetCardId: target }, function (b) { UI.rolling = false; if (b) { UI.roll = b.result.rollId; UI.adj = 'normal'; UI.hintSeen = true; try { localStorage.setItem(KEY + 'hint', '1'); } catch (e) {} } render(); });
  }
  /* a hero as the sheet's rules see it (what the table knows of a hero that is yours, or any hero for the GM) */
  function heroOf(ch) { return { name: ch.name, calling: ch.calling || '', vow: ch.vow || '', appearance: ch.appearance || '', background: ch.background || '', notes: ch.notes || '', stats: ch.stats, effort: ch.effort, armour: ch.armour || 0, gear: ch.gear || [] }; }
  /* Using an item: one click makes the check with the item's stat. On a success the panel offers "Roll damage" with the item's own die, then Apply. */
  function doUseItem(charId, index, spellId, gearKey, chosenTarget) {
    var ch = S.chars[charId]; if (!ch || UI.rolling) return;
    gearKey = gearKey || (ch.gear[index] && ch.gear[index].key);
    if (!gearKey) { toast('That item is no longer available. Open your sheet again.'); return; }
    var use = window.SacramentSheetCore.useOf(heroOf(ch), index, spellId);
    if (!use.ok) { toast(use.why); return; }
    var selected = use.healing && use.healing.self ? S.cards[ch.cardId] : chosenTarget ? S.cards[chosenTarget] : UI.sel && S.cards[UI.sel];
    function usableTarget(card) { return card && onTable(card) && (use.healing ? !!card.hp : canTake(card)); }
    if (chosenTarget && !usableTarget(selected)) { toast('That target is no longer available. Choose another.'); UI.attackChoice = null; render(); return; }
    if ((use.cat || use.healing) && !usableTarget(selected)) { UI.attackTarget = null; UI.attackChoice = {charId: charId, index: index, spellId: spellId, gearKey: gearKey, name: use.name, healing: !!use.healing}; render(); return; }
    UI.attackChoice = null;
    UI.askItem = null; UI.rolling = 'Using an item'; var d20 = UI.phys && String(UI.phys).trim() ? +UI.phys : undefined; UI.phys = ''; var pi = document.querySelector('#strip input[data-phys]'); if (pi) pi.value = '';
    var target = selected && onTable(selected) && (use.healing || !use.cat || selected.kind !== 'pc') ? selected.id : undefined;
    renderPanel();
    send({ type: 'useItem', charId: charId, index: index, gearKey: gearKey, spellId: spellId || undefined, adj: UI.adj, d20: d20, targetCardId: target }, function (b) { UI.rolling = false; if (b) { UI.roll = b.result.rollId; UI.adj = 'normal'; if (b.result.healing && !b.result.rollId) toast(b.result.healing.stable ? 'The patient is stable.' : 'Healing applied: ' + (b.result.healing.applied == null ? b.result.healing.amount : b.result.healing.applied) + ' HP.'); if (b.result.picked) toast('The die shows ' + b.result.picked.n + ': ' + b.result.picked.name + '.', 6000); } render(); });
  }
  function reorder(i, d) { var o = S.table.order.map(function (e) { return e.id; }); if (o.some(function (x) { return !x; })) return; var j = i + d; if (j < 0 || j >= o.length) return; var x = o[i]; o[i] = o[j]; o[j] = x; send({ type: 'orderSet', order: o }); }
  /* a place on the table where a new card of this size overlaps nothing, nearest the middle; units are those of the table's width (it is 100 wide and 62.5 high) */
  function freeSpot(w, h) {
    var boxes = cardList().filter(onTable).map(function (c) { var l = S.layout[c.id]; if (!l) return null; var tok = c.kind === 'token' || c.kind === 'pc'; return { x: l.x, y: l.y * 0.625, w: l.w, h: tok ? l.w : l.h }; }).filter(Boolean), best = null;
    for (var y = 20; y <= 90; y += 10) for (var x = 15; x <= 90; x += 10) {
      var cx = x, cy = y * 0.625; if (cx - w / 2 < 0 || cx + w / 2 > 100 || cy - h / 2 < 0 || cy + h / 2 > 62.5) continue;
      var clash = boxes.some(function (b) { return Math.abs(cx - b.x) < (w + b.w) / 2 + 1 && Math.abs(cy - b.y) < (h + b.h) / 2 + 1; });
      if (!clash) { var dd = Math.abs(x - 50) + Math.abs(y - 50); if (!best || dd < best.d) best = { x: x, y: y, d: dd }; }
    }
    return best || { x: 50, y: 50 };
  }
  function newCard(kind) {
    var card = { kind: kind === 'enemy' ? 'token' : 'card', name: kind === 'enemy' ? 'Nameless Creature' : kind === 'obstacle' ? 'Barred Way' : 'Unmarked Card', sceneId: viewScene(), visible: false };   /* hidden until the GM has named it and shows it */
    card.w = kind === 'enemy' ? 9 : 16; card.h = kind === 'enemy' ? 9 : 22; var at = freeSpot(card.w, card.h); card.x = at.x; card.y = at.y;
    if (kind === 'enemy') card.hp = { cur: 10, max: 10 }; if (kind === 'obstacle') card.progress = { cur: 0, max: 10, label: 'Effort' };
    UI.sel = null; UI.adding = true; render();
    send({ type: 'cardCreate', card: card, addToOrder: kind === 'enemy' }, function (b) { UI.adding = false; if (!b) render(); if (b) { UI.sel = b.result.id; UI.cardEdit = b.result.id; render(); setTimeout(function () { var i = document.querySelector('[data-edit=name]'); if (i) { i.focus(); i.select(); } }, 30); } });
  }

  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.id === 'gmDie') UI.gmDie = +t.value;
    if (t.id === 'gmDiceCount') UI.gmDiceCount = +t.value;
    if (t.id === 'gmDicePrivate') UI.gmDicePrivate = t.checked;
    if (t.id === 'attackTarget') UI.attackTarget = t.value;
  });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-do]'); if (!b || !S) return; var d = b.dataset, c = S.cards[d.id];
    switch (d.do) {
      case 'mapWidth': UI.mapWide = !UI.mapWide; renderTable(); break;
      case 'target': send({ type: 'setTarget', delta: +d.d }); break;   /* by an amount: a press made before the screen catches up still counts */
      case 'nextRound': send({ type: 'nextRound', expect: { round: S.table.round, idx: S.table.idx } }); break;
      case 'endTurn': send({ type: 'endTurn', expect: { round: S.table.round, idx: S.table.idx } }, function () { UI.roll = null; render(); }); break;
      case 'gmstrip': UI.gmStrip = !UI.gmStrip; render(); break;
      case 'select': pickCard(d.id); render(); break;
      case 'gmDiceToggle': UI.gmDiceOpen = !UI.gmDiceOpen; renderStrip(); break;
      case 'gmDiceRoll': {
        if (!gm() || UI.gmDiceBusy) break;
        UI.gmDie = +$('gmDie').value; UI.gmDiceCount = +$('gmDiceCount').value; UI.gmDicePrivate = $('gmDicePrivate').checked;
        UI.gmDiceBusy = true;
        send({type:'gmDice', sides:UI.gmDie, count:UI.gmDiceCount, private:UI.gmDicePrivate}, function (b) { UI.gmDiceBusy = false; if (b) UI.gmDiceResult = (UI.gmDicePrivate ? 'GM only: ' : 'Shared: ') + b.result.dice.map(function (x) { return x.n; }).join(' + ') + ' = ' + b.result.total; render(); });
        renderStrip(); break;
      }
      case 'confirmAttack': { var choice = UI.attackChoice, targetChoice = $('attackTarget'); if (!choice || !targetChoice || !targetChoice.value) { toast('Choose a target first.'); break; } doUseItem(choice.charId, choice.index, choice.spellId, choice.gearKey, targetChoice.value); break; }
      case 'cancelAttack': UI.attackChoice = null; render(); break;
      case 'deselect': UI.sel = null; render(); break;
      case 'tool': if (d.tool === 'draw' && !gm()) break; UI.tool = d.tool; render(); break;
      case 'adj': UI.adj = d.adj; renderStrip(); break;
      case 'toggle': UI['opt' + d.key.charAt(0).toUpperCase() + d.key.slice(1)] = !UI['opt' + d.key.charAt(0).toUpperCase() + d.key.slice(1)]; renderStrip(); break;
      case 'hideNumbers': send({ type: 'cardUpdate', id: d.id, patch: { hideNumbers: !c.hideNumbers } }); break;
      case 'leave': UI.sceneRename = null; leaveTable(); break;
      case 'gmtab': UI.tab = d.t; UI.sub = null; UI.editOrder = false; renderPanel(); { var tb = $('panel'); if (tb) tb.scrollTop = 0; } break;
      case 'editOrder': UI.editOrder = !UI.editOrder; renderPanel(); break;
      case 'openScene': UI.sceneRename = null; UI.view = d.scene === S.table.scene.id ? null : d.scene; render(); break;
      case 'sceneBg': UI.sceneBg = !UI.sceneBg; renderPanel(); break;
      case 'gmsub': UI.sub = d.s || null; renderPanel(); break;
      case 'roll': doRoll(d.stat, !!d.noitem, d.attack === '1'); break;
      case 'monCat': UI.monCat = d.cat; renderPanel(); break;
      case 'check': doRoll(d.stat, true, false); break;
      case 'freeEffort': { var ch = myChar(); if (ch) { var v = physVal('physF'); send({ type: 'freeEffort', charId: ch.id, cat: d.cat, rolled: v }, function (bd) { if (bd) { UI.roll = bd.result.rollId; render(); } }); } break; }
      case 'effort': { if (UI.working) break; var key = 'effort:' + d.roll, rolledE = physVal('physE'); UI.working = key; renderPanel(); send({ type: 'effort', rollId: d.roll, cat: d.cat, rolled: rolledE }, function () { UI.working = null; render(); }); break; }
      case 'push': { if (UI.working) break; UI.working = 'push:' + d.roll; renderPanel(); send({ type: 'push', rollId: d.roll }, function () { UI.working = null; render(); }); break; }
      case 'again': { var ra = S.rolls.filter(function (x) { return x.id === d.roll; })[0]; if (ra) rollAgain(ra); break; }
      case 'apply': { if (UI.working) break; var key2 = 'apply:' + d.roll; UI.working = key2; renderPanel(); send({ type: 'apply', rollId: d.roll, cardId: d.card, field: d.field }, function () { UI.working = null; render(); }); break; }
      case 'monsterAttack': {
        if (UI.rolling || UI.working) break; var hs = $('atkHero'); if (!hs || !hs.value) break; UI.atkHero = hs.value;
        var d20a = physVal('physA'); UI.rolling = 'Rolling the attack'; renderPanel();
        send({ type: 'monsterAttack', cardId: d.id, targetCardId: hs.value, d20: d20a }, function (b) { UI.rolling = false; if (b) UI.roll = b.result.rollId; render(); }); break; }
      case 'monsterEffort': { if (UI.working) break; var keyM = 'effort:' + d.roll, rolledM = physVal('physE'); UI.working = keyM; renderPanel(); send({ type: 'monsterEffort', rollId: d.roll, cat: d.cat, rolled: rolledM }, function () { UI.working = null; render(); }); break; }
      case 'aim': UI.aim[d.roll] = d.card; render(); break;
      case 'dismissRoll': UI.roll = null; render(); break;
      case 'hpAdj': { if (c && c.hp) hpQueue(d.id, { d: +d.d }, function (done) { send({ type: 'adjust', cardId: d.id, field: 'hp', delta: +d.d }, done); }); break; }
      case 'claim': send({ type: 'claim', charId: d.id }); break;
      case 'cardEdit': UI.cardEdit = d.id; renderPanel(); { var tb2 = $('panel'); if (tb2) tb2.scrollTop = 0; } break;
      case 'cardEditDone': UI.cardEdit = null; renderPanel(); break;
      case 'attackToggle': UI.atk = UI.atk === d.id ? null : d.id; renderPanel(); break;
      case 'sheet': openSheet(d.id); break;
      case 'useItem': { var uch = myChar(); if (!uch) break; var uu = window.SacramentSheetCore.useOf(heroOf(uch), +d.i, d.spell || ''); if (!uu.ok) { toast(uu.why, 6000); break; } doUseItem(uch.id, +d.i, d.spell || ''); break; }
      case 'designLoot': openLoot({ fresh: true }); break;
      case 'libEdit': { var le = (S.lootLib || []).filter(function (x) { return x.id === d.id; })[0]; if (le) openLoot({ item: le, id: le.id }); break; }
      case 'libPlace': lootOnce({ type: 'lootPlace', libId: d.id }, function (b) { if (b) toast('Put on the table, hidden. Reveal it from its card.'); }); break;
      case 'libGive': { var lgs = $('lootHero'); if (!lgs || !lgs.value) break; var lgn = S.chars[lgs.value] && S.chars[lgs.value].name; lootOnce({ type: 'lootGive', libId: d.id, charId: lgs.value }, function (b) { if (b) toast('Given to ' + lgn + '.'); }); break; }
      case 'rollEdit': if (UI.loot && UI.loot.design) openLoot({ item: UI.loot.design, mode: 'copy' }); break;
      case 'rollPlace': if (UI.loot && UI.loot.design) lootOnce({ type: 'lootPlace', item: UI.loot.design }, function (b) { if (b) toast('Put on the table, hidden. Reveal it from its card.'); }); break;
      case 'cardGive': { var cgs = $('cardHero'); if (!cgs || !cgs.value) break; var cgn = S.chars[cgs.value] && S.chars[cgs.value].name; lootOnce({ type: 'lootGive', cardId: d.id, charId: cgs.value }, function (b) { if (b) { UI.sel = null; toast('Given to ' + cgn + '.'); render(); } }); break; }
      case 'cardEditLoot': if (c && c.loot) openLoot({ item: c.loot, mode: 'card', cardId: c.id }); break;
      case 'lootRoll': { var pl = $('physL'), own = pl ? pl.value.trim() : ''; if (pl) pl.value = ''; if (own && !/^[0-9]+([ ,]+[0-9]+)*$/.test(own)) { toast('Type the numbers your own dice show, such as 87, or 87 4 for a sub-table.'); break; }
        send({ type: 'lootRoll', ns: own ? own.split(/[ ,]+/).map(Number) : undefined }, function (b) { if (b) UI.loot = b.result; render(); }); break; }
      case 'lootCard': { var L0 = UI.loot; if (!L0) break; send({ type: 'cardCreate', card: { kind: 'loot', name: L0.name, desc: L0.flavour, gmNotes: [L0.category, L0.tempts ? 'Tempts the Horror.' : '', L0.gmNote].filter(Boolean).join(' · '), visible: false } }); toast('Added "' + L0.name + '" to the table, hidden. Reveal it when the party finds it.', 5000); break; }
      case 'lootGive': { var L1 = UI.loot, lootSel = $('lootHero'); if (!L1 || !lootSel || !lootSel.value) break; var lootTo = lootSel.value; send({ type: 'sheet', charId: lootTo, op: { op: 'add', id: L1.itemId } }, function (b) { if (b) toast('Gave "' + L1.name + '" to ' + (S.chars[lootTo] ? S.chars[lootTo].name : 'the hero') + '.', 4000); }); break; }
      case 'bring': { var mine = window.SacramentHeroes && window.SacramentHeroes.read().heroes.filter(function (h) { return h.id === d.id; })[0]; if (mine) send({ type: 'bringHero', hero: mine }); break; }
      case 'undo': send({ type: 'undo', logId: d.id }); break;
      case 'feed': UI.feedOpen = !UI.feedOpen; $('feed').dataset.h = ''; renderFeed(); break;
      case 'copy': { var link = location.origin + '/vtt/?room=' + S.code; if (navigator.clipboard) navigator.clipboard.writeText(link).then(function () { toast('Link copied: ' + link); }, function () { toast(link); }); else toast(link); break; }
      case 'ack': send({ type: 'ack', id: d.id }); break;
      case 'saveMonster': if (c) saveMonster(c); break;
      case 'addMonster': { var am = monsters()[+d.i]; if (am) addMonster(am); break; }
      case 'forgetMonster': {
        clearTimeout(UI.forgetMonTimer);
        if (UI.forgetMon !== +d.i) { UI.forgetMon = +d.i; renderPanel(); UI.forgetMonTimer = setTimeout(function () { UI.forgetMon = null; if (S) renderPanel(); }, 5000); break; }
        UI.forgetMon = null; keepMonsters(monsters().filter(function (x, i) { return i !== +d.i; })); renderPanel(); break;
      }
      case 'nextSet': { var na = $('nextAt') && $('nextAt').value, ms = na ? new Date(na).getTime() : NaN; if (!Number.isFinite(ms)) { toast('Choose a date and a time first.'); break; } send({ type: 'nextSession', at: ms, note: $('nextNote').value }, function (b) { if (b) toast('The next session is set. Every player can see it.'); }); break; }
      case 'nextClear': send({ type: 'nextSession', at: null }); break;
      case 'copyRecap': { var rt = recapLines().join('\n'); if (navigator.clipboard) navigator.clipboard.writeText(rt).then(function () { toast('The recap is copied.'); }, function () { toast('Could not copy. Select the text and copy it instead.'); }); else toast('Select the text and copy it instead.'); break; }
      case 'recapReset': {   /* asked twice, like Reset */
        clearTimeout(UI.recapTimer);
        if (!UI.recapAsk) { UI.recapAsk = true; renderPanel(); UI.recapTimer = setTimeout(function () { UI.recapAsk = false; if (S) renderPanel(); }, 5000); break; }
        UI.recapAsk = false; send({ type: 'recapReset' }, function (b) { if (b) toast('A new session: the recap starts again.'); }); break;
      }
      case 'showRecovery': UI.recoveryOpen = true; renderRecovery(); break;
      case 'copyKey': { if (!gm()) break; var kl = location.origin + '/vtt/?room=' + S.code + '#key=' + sess.token; if (navigator.clipboard) navigator.clipboard.writeText(kl).then(function () { toast('Your GM link is copied. Keep it private.'); }, function () { UI.recoveryOpen = true; renderRecovery(); }); else { UI.recoveryOpen = true; renderRecovery(); } break; }
      case 'horrorAck': send({ type: 'horrorAck' }); break;
      case 'arrivalSeen': UI.arrivalSeen = true; renderTable(); break;
      case 'horrorAdj': send({ type: 'horror', mode: 'delta', value: +d.d }); break;
      case 'horrorSet': { var hv = $('hzSet') && $('hzSet').value.trim(); if (!/^[0-9]+$/.test(hv || '')) { toast('Type a number from 0 to ' + S.horror.max + '.'); break; } send({ type: 'horror', mode: 'set', value: +hv }); break; }
      case 'horrorRoll': send({ type: 'horror', mode: 'lowerRoll' }); break;
      case 'rest': {   /* asked twice, like Reset: the first press turns the button into "Sure?" for five seconds */
        clearTimeout(UI.restTimer);
        if (!UI.restAsk) { UI.restAsk = true; renderPanel(); UI.restTimer = setTimeout(function () { UI.restAsk = false; if (S) renderPanel(); }, 5000); break; }
        UI.restAsk = false; send({ type: 'rest' }); break;
      }
      case 'dying': send({ type: 'dying', cardId: d.id, op: d.op, d: d.d ? +d.d : undefined }); break;
      case 'horrorReset': {   /* asked twice, like leaving: the first press turns the button into "Sure?" for five seconds */
        clearTimeout(UI.hzResetTimer);
        if (!UI.hzResetAsk) { UI.hzResetAsk = true; renderPanel(); UI.hzResetTimer = setTimeout(function () { UI.hzResetAsk = false; if (S) renderPanel(); }, 5000); break; }
        UI.hzResetAsk = false; send({ type: 'horror', mode: 'set', value: 0 }); break;
      }
      case 'addHero': { var at = freeSpot(7, 7); UI.sel = null; UI.adding = true; render(); send({ type: 'charCreate', char: { name: 'Unnamed Pilgrim', x: at.x, y: at.y } }, function (bd) { UI.adding = false; if (!bd) render(); if (bd) { var ch = S.chars[bd.result.id]; if (ch) { UI.sel = ch.cardId; UI.cardEdit = ch.cardId; render(); setTimeout(function () { var i = document.querySelector('[data-edit=name]'); if (i) { i.focus(); i.select(); } }, 30); } } }); break; }
      case 'addCard': newCard('card'); break;
      case 'addEnemy': newCard('enemy'); break;
      case 'addObstacle': newCard('obstacle'); break;
      case 'visible': send({ type: 'cardUpdate', id: d.id, patch: { visible: !c.visible } }); break;
      case 'dup': send({ type: 'cardDuplicate', id: d.id }, function (bd) { if (bd) { UI.sel = bd.result.id; UI.cardEdit = bd.result.id; render(); } }); break;
      case 'del': if (UI.confirmDel === d.id) { UI.confirmDel = null; UI.sel = null; send({ type: 'cardDelete', id: d.id }); } else { UI.confirmDel = d.id; renderPanel(); } break;
      case 'track': if (d.field === 'hp' && c && c.hp) hpQueue(d.id, { d: +d.d }, function (done) { send({ type: 'track', id: d.id, field: 'hp', mode: 'delta', value: +d.d }, done); }); else send({ type: 'track', id: d.id, field: d.field, mode: 'delta', value: +d.d }); break;
      case 'trackerAdd': send({ type: 'trackerAdd', id: d.id, field: d.field }); break;
      case 'trackerRemove': send({ type: 'trackerRemove', id: d.id, field: d.field }); break;
      case 'give': send({ type: 'giveCard', id: d.id, pid: $('giveTo').value }); break;
      case 'take': send({ type: 'giveCard', id: d.id, pid: null }); break;
      case 'reveal': send({ type: 'sceneReveal', id: d.scene || viewScene() }, function () { UI.view = null; }); break;
      case 'renameScene': {
        if (!gm() || UI.sceneRenameSaving) break;
        var sceneToName = S.scenes.filter(function (x) { return x.id === d.scene; })[0]; if (!sceneToName) break;
        UI.sceneRename = sceneToName.id; UI.sceneName = sceneToName.name; renderPanel();
        var sceneInput = $('sceneName'); if (sceneInput) { sceneInput.focus(); sceneInput.select(); } break;
      }
      case 'cancelSceneName': {
        if (UI.sceneRenameSaving) break;
        var cancelledScene = UI.sceneRename; UI.sceneRename = null; renderPanel();
        var cancelReturn = document.querySelector('[data-do="renameScene"][data-scene="' + cancelledScene + '"]'); if (cancelReturn) cancelReturn.focus(); break;
      }
      case 'saveSceneName': {
        if (!gm() || !UI.sceneRename || UI.sceneRenameSaving) break;
        var nameInput = $('sceneName'), sceneName = nameInput && nameInput.value.trim();
        if (!sceneName) { if (nameInput) { nameInput.setCustomValidity('Enter a scene name.'); nameInput.reportValidity(); nameInput.focus(); } break; }
        var renamedId = UI.sceneRename; UI.sceneName = sceneName; UI.sceneRenameSaving = true; renderPanel();
        send({ type: 'sceneUpdate', id: renamedId, name: sceneName }, function (bd) {
          UI.sceneRenameSaving = false; if (bd) UI.sceneRename = null; renderPanel();
          if (bd) { toast('Scene renamed.'); var renameReturn = document.querySelector('[data-do="renameScene"][data-scene="' + renamedId + '"]'); if (renameReturn) renameReturn.focus(); }
        }); break;
      }
      case 'deleteScene': UI.sceneDelete = d.scene; render(); break;
      case 'cancelSceneDelete': UI.sceneDelete = null; render(); break;
      case 'confirmSceneDelete': { if (UI.sceneDeleting) break; UI.sceneDeleting = true; var sid = d.scene; render(); send({ type: 'sceneDelete', id: sid }, function (b) { UI.sceneDeleting = false; if (b) { if (UI.view === sid) UI.view = null; UI.sceneDelete = null; UI.sel = null; } render(); }); break; }
      case 'newScene': { var nm = $('newScene').value.trim(); if (nm) send({ type: 'sceneCreate', name: nm }, function (bd) { if (bd) { UI.view = bd.result.id; render(); } }); break; }
      case 'turnTo': send({ type: 'turnSet', idx: +d.i }); break;
      case 'up': reorder(+d.i, -1); break; case 'down': reorder(+d.i, 1); break;
      case 'outOrder': send({ type: 'orderSet', order: S.table.order.map(function (x) { return x.id; }).filter(function (x, i) { return i !== +d.i; }) }); break;
      case 'addOrder': { var v2 = $('addOrder').value; if (v2) send({ type: 'orderSet', order: S.table.order.map(function (x) { return x.id; }).concat([v2]) }); break; }
      case 'cancelRemovePlayer': UI.removePlayerAsk = null; renderPanel(); break;
      case 'removePlayer':
        if (!gm() || UI.removeBusy) break;
        if (UI.removePlayerAsk !== d.pid) { UI.removePlayerAsk = d.pid; renderPanel(); break; }
        UI.removeBusy = d.pid; renderPanel();
        send({ type: 'playerRemove', pid: d.pid }, function () { UI.removeBusy = null; UI.removePlayerAsk = null; render(); }); break;
      case 'drawUndo': send({ type: 'drawUndo', sceneId: viewScene() }, null, 'd'); break;
      case 'drawClear': send({ type: 'drawClear', sceneId: viewScene() }, null, 'd'); break;
    }
  });
  /* edits made in the panel are sent when the field is left */
  /* Uploading: the picture is made smaller in the browser first (the long edge at most 1920 px for a background, 800 for a card), then sent to the table, which keeps it and gives back an address. */
  function prepareImage(file, maxEdge) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return reject(new Error('Choose a PNG, JPEG, WebP or GIF picture.'));
      var fin = function (blob) { var fr = new FileReader(); fr.onload = function () { resolve(String(fr.result).split(',')[1] || ''); }; fr.onerror = function () { reject(new Error('Could not read that file.')); }; fr.readAsDataURL(blob); };
      if (typeof createImageBitmap !== 'function') { if (file.size > 2400000) return reject(new Error('That picture is too large; make it smaller first.')); return fin(file); }
      createImageBitmap(file).then(function (bm) {
        var k = Math.min(1, maxEdge / Math.max(bm.width, bm.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(bm.width * k)); cv.height = Math.max(1, Math.round(bm.height * k));
        cv.getContext('2d').drawImage(bm, 0, 0, cv.width, cv.height);
        cv.toBlob(function (blob) { if (!blob) return reject(new Error('Could not prepare that picture.')); fin(blob); }, 'image/webp', 0.86);
      }, function () { reject(new Error('That file could not be read as a picture.')); });
    });
  }
  function uploadPicture(input) {
    var file = input.files && input.files[0]; if (!file) return; var version = sessionVersion, code = sess.code, scene = viewScene();
    toast('Uploading…', 3000);
    prepareImage(file, 1920).then(function (data) { if (version !== sessionVersion) return null; return call('POST', { op: 'upload', code: code, data: data }); }).then(function (r) {
      if (!r || r.stale || version !== sessionVersion) return;
      if (r.status !== 200 || !r.body.ok) throw new Error((r.body.error && r.body.error.message) || 'The upload did not work.');
      send({ type: 'sceneUpdate', id: scene, bg: r.body.url });
      toast('Image added.'); input.value = ''; if (document.activeElement === input) input.blur();
    }).catch(function (e) { if (version !== sessionVersion) return; toast((e && e.message || 'The upload did not work.') + ' Nothing was changed.', 8000); input.value = ''; });
  }
  document.addEventListener('input', function (e) { if (e.target.id === 'sceneName') { UI.sceneName = e.target.value; e.target.setCustomValidity(''); } });
  document.addEventListener('change', function (e) {
    var t = e.target; if (!S || !t.dataset) return;
    if (t.dataset.upload === 'bg') return uploadPicture(t);
    if (t.dataset.edit) { var patch = {}; patch[t.dataset.edit] = t.value; send({ type: 'cardUpdate', id: t.dataset.id, patch: patch }); }
    else if (t.dataset.set) { var cc = S.cards[t.dataset.id]; if (t.dataset.set === 'hp' && cc && cc.hp) hpQueue(t.dataset.id, { set: +t.value }, function (done) { send({ type: 'track', id: t.dataset.id, field: 'hp', value: +t.value }, done); }); else send({ type: 'track', id: t.dataset.id, field: t.dataset.set, value: +t.value }); }
    else if (t.dataset.max) send({ type: 'track', id: t.dataset.id, field: t.dataset.max, what: 'max', value: +t.value });
    else if (t.dataset.tflag) send({ type: 'track', id: t.dataset.id, field: 'timer', what: t.dataset.tflag, value: t.checked });
    else if (t.dataset.assign) { /* a player's character: free the one they had, then give them the one chosen */
      var pid = t.dataset.assign, had = Object.keys(S.chars).filter(function (x) { return S.chars[x].owner === pid; });
      had.forEach(function (k) { if (k !== t.value) send({ type: 'assign', charId: k, pid: null }); }); if (t.value) send({ type: 'assign', charId: t.value, pid: pid });
    }
    else if (t.dataset.char) { var pt = {}; if (t.dataset.stat) pt.stats = (function () { var o = {}; o[t.dataset.stat] = +t.value; return o; })(); else if (t.dataset.eff) pt.effort = (function () { var o = {}; o[t.dataset.eff] = +t.value; return o; })(); else pt.armour = +t.value; send({ type: 'charUpdate', id: t.dataset.char, patch: pt }); }
    else if (t.hasAttribute('data-diceanim')) D.setOff(!t.checked);
    else if (t.hasAttribute('data-sound')) { UI.soundOff = !t.checked; try { localStorage.setItem(KEY + 'sound', UI.soundOff ? '0' : '1'); } catch {} }
    else if (t.dataset.setting) { var p = {}; p[t.dataset.setting] = t.checked; send({ type: 'settings', patch: p }); }
    else if (t.dataset.die) { send({ type: 'settings', patch: { dice: (function () { var o = {}; o[t.dataset.die] = +t.value; return o; })() } }); }
    else if (t.id === 'lootHero') UI.giveHero = t.value;
    else if (t.id === 'bgUrl') send({ type: 'sceneUpdate', id: viewScene(), bg: t.value.trim() });
  });
  document.addEventListener('keydown', function (e) {
    if (e.target.id === 'sceneName' && (e.key === 'Enter' || e.key === 'Escape')) { e.preventDefault(); var nameAction = document.querySelector('[data-do="' + (e.key === 'Enter' ? 'saveSceneName' : 'cancelSceneName') + '"]'); if (nameAction) nameAction.click(); return; }
    if (e.key === 'Escape' && $('lootOverlay') && !$('lootOverlay').hidden) { e.preventDefault(); closeLoot(); return; }
    if (e.key === 'Escape' && UI.sheet) { e.preventDefault(); closeSheet(); return; }
    if (e.key === 'Enter' && e.target.matches && e.target.matches('input[data-edit],input[data-set],input[data-max],#bgUrl,#newScene')) { e.target.blur(); if (e.target.id === 'newScene') { var b = document.querySelector('[data-do=newScene]'); if (b) b.click(); } }
    var cEl = e.target.closest && e.target.closest('.c');
    if (cEl && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); pickCard(cEl.dataset.id); render(); }
    if (cEl && S && /^Arrow/.test(e.key) && canMove(S.cards[cEl.dataset.id])) { /* a move without a mouse */
      e.preventDefault(); var l = S.layout[cEl.dataset.id], st = e.shiftKey ? 5 : 1, dx = e.key === 'ArrowLeft' ? -st : e.key === 'ArrowRight' ? st : 0, dy = e.key === 'ArrowUp' ? -st : e.key === 'ArrowDown' ? st : 0;
      l.x = Math.max(0, Math.min(100, l.x + dx)); l.y = Math.max(0, Math.min(100, l.y + dy)); cEl.style.left = l.x + '%'; cEl.style.top = l.y + '%'; cEl._h = null;
      clearTimeout(UI.nudge); var id = cEl.dataset.id; UI.nudge = setTimeout(function () { send({ type: 'move', id: id, x: l.x, y: l.y }); }, 350);
    }
    if (e.key === 'Escape') { UI.sel = null; render(); }
  });

  /* ---------- the table: selecting, dragging, pointing, drawing ---------- */
  function tablePoint(ev) { var r = $('table').getBoundingClientRect(); return [Math.max(0, Math.min(100, 100 * (ev.clientX - r.left) / r.width)), Math.max(0, Math.min(100, 100 * (ev.clientY - r.top) / r.height))]; }
  var lastPoint = 0;
  $('table').addEventListener('pointerdown', function (ev) {
    if (!S || ev.button > 0 || UI.drag || UI.draw || UI.pointing) return;
    if (ev.target.closest('#toolbar') || ev.target.closest('#banner')) return;
    if (UI.tool === 'draw' && gm()) { UI.drawScene = viewScene(); UI.gesturePointer = ev.pointerId; UI.draw = [tablePoint(ev)]; $('table').setPointerCapture(ev.pointerId); return; }
    if (UI.tool === 'point') { UI.pointScene = viewScene(); UI.gesturePointer = ev.pointerId; var p = tablePoint(ev); sendPoint(p[0], p[1]); $('table').setPointerCapture(ev.pointerId); UI.pointing = true; return; }
    var cEl = ev.target.closest('.c');
    if (!cEl) { if (UI.sel) { UI.sel = null; render(); } return; }
    var id = cEl.dataset.id, c = S.cards[id]; pickCard(id); UI.confirmDel = null;
    if (canMove(c)) { var l = S.layout[id]; UI.drag = { id: id, el: cEl, sx: ev.clientX, sy: ev.clientY, ox: l.x, oy: l.y, moved: false, pid: ev.pointerId }; cEl.setPointerCapture(ev.pointerId); }
    else render();
  });
  $('table').addEventListener('pointermove', function (ev) {
    if (UI.draw && ev.pointerId === UI.gesturePointer) { var p = tablePoint(ev), q = UI.draw[UI.draw.length - 1]; if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) > .4) { UI.draw.push(p); $('ink').innerHTML += ''; var pl = $('ink').querySelector('polyline.live'); if (!pl) { $('ink').insertAdjacentHTML('beforeend', '<polyline class="live" stroke="#e0b040"/>'); pl = $('ink').querySelector('polyline.live'); } pl.setAttribute('points', UI.draw.map(function (a) { return a[0] + ',' + a[1]; }).join(' ')); } return; }
    if (UI.pointing && ev.pointerId === UI.gesturePointer && Date.now() - lastPoint > 250) { lastPoint = Date.now(); var pp = tablePoint(ev); sendPoint(pp[0], pp[1]); return; }
    var d = UI.drag; if (!d || ev.pointerId !== d.pid) return; var r = $('table').getBoundingClientRect(), dx = ev.clientX - d.sx, dy = ev.clientY - d.sy;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 5) return; d.moved = true; d.el.classList.add('drag');
    d.x = Math.max(0, Math.min(100, d.ox + 100 * dx / r.width)); d.y = Math.max(0, Math.min(100, d.oy + 100 * dy / r.height)); d.el.style.left = d.x + '%'; d.el.style.top = d.y + '%';
  });
  function endPointer(ev) {
    // Ignore secondary pointers: they must never finish another finger's gesture.
    if (UI.drag && ev.pointerId !== UI.drag.pid) return;
    if ((UI.draw || UI.pointing) && ev.pointerId !== UI.gesturePointer) return;
    UI.gesturePointer = null;
    // A cancelled pointer gesture (lost capture, interrupted touch, OS gesture)
    // must not commit a token move or a partially drawn line.
    if (ev && ev.type === 'pointercancel') {
      UI.draw = null; UI.pointing = false;
      var cancelled = UI.drag; UI.drag = null;
      if (cancelled) { cancelled.el.classList.remove('drag'); cancelled.el._h = null; }
      var live = $('ink').querySelector('polyline.live'); if (live) live.remove();
      $('ink')._h = null;
      render();
      return;
    }
    if (UI.draw) { var pts = UI.draw; UI.draw = null; if (pts.length > 1) { var step = Math.ceil(pts.length / 150); pts = pts.filter(function (p, i) { return i % step === 0 || i === pts.length - 1; }); send({ type: 'draw', sceneId: UI.drawScene, pts: pts, color: '#e0b040' }, null, 'd'); } var pl = $('ink').querySelector('polyline.live'); if (pl) pl.remove(); return; }
    $('ink')._h = null;   /* the line being drawn was added by hand: the next drawing of the ink replaces it */
    UI.pointing = false; var d = UI.drag; if (!d) return; UI.drag = null; d.el.classList.remove('drag'); d.el._h = null;
    if (d.moved) { var l = S.layout[d.id]; l.x = d.x; l.y = d.y; send({ type: 'move', id: d.id, x: d.x, y: d.y }); }
    render();
  }
  $('table').addEventListener('pointerup', endPointer); $('table').addEventListener('pointercancel', endPointer);

  $('recoveryDownload').addEventListener('click', function () {
    var link = $('recoveryLink').value, blob = new Blob(['Private Sacrament table recovery link. Keep this safe; do not share it.\n\n' + link + '\n'], { type: 'text/plain' });
    var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url;
    a.download = 'sacrament-table-' + sess.code + '-recovery.txt'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  });
  $('recoveryClose').addEventListener('click', function () { UI.recoveryOpen = false; UI.recoveryDismissed = true; renderRecovery(); });

  /* ---------- starting: make, join, resume ---------- */
  function enter(s, state) { resetSession(); sess = s; save(); S = null; UI.sel = null; take(state); poll(); history.replaceState(null, '', '/vtt/?room=' + s.code); }
  $('makeForm').addEventListener('submit', function (e) {
    e.preventDefault(); var version = sessionVersion, mb = this.querySelector('button[type=submit]'); if (mb.disabled) return; mb.disabled = true; $('makeMsg').textContent = '';
    call('POST', { op: 'create', key: $('makeKey').value, sample: $('makeSample').checked }).then(function (r) {
      if (version !== sessionVersion || r.stale) return;
      if (r.status === 200) { enter({ code: r.body.code, token: r.body.token, role: 'gm' }, r.body.state); if (UI.trying) { try { localStorage.setItem(KEY + 'try', r.body.code); } catch {} toast('This is a sample table and you are the GM. Click a hero to roll for them, or copy the invite link to bring a friend.', 9000); } }
      else { $('makeMsg').textContent = (r.body.error && r.body.error.message) || 'Could not make a table.'; if (r.status === 403) $('keyRow').hidden = false; }
    }, function () { if (version !== sessionVersion) return; $('makeMsg').textContent = 'Could not reach the server.'; }).then(function () { mb.disabled = false; });
  });
  /* Joining is one person however many times the button is pressed: the attempt has a key that is kept for the tab, and a place already held is resumed, not joined again. */
  var joinKeyFor = function (code) { var k = KEY + 'join-' + code; try { var v = sessionStorage.getItem(k); if (!v) { v = rid(16); sessionStorage.setItem(k, v); } return v; } catch (e) { return rid(16); } };
  $('joinForm').addEventListener('submit', function (e) {
    e.preventDefault(); var version = sessionVersion, btn = this.querySelector('button[type=submit]'); if (btn.disabled) return; $('joinMsg').textContent = '';
    var code = $('joinCode').value.trim().toUpperCase(), prev = load(code);
    if (prev && resume(code)) return;
    btn.disabled = true;
    call('POST', { op: 'join', code: code, name: $('joinName').value.trim(), joinKey: joinKeyFor(code) }).then(function (r) {
      if (version !== sessionVersion || r.stale) return;
      if (r.status === 200) enter({ code: code, token: r.body.token, role: 'player', pid: r.body.pid }, r.body.state);
      else $('joinMsg').textContent = (r.body.error && r.body.error.message) || 'Could not join.';
    }, function () { if (version !== sessionVersion) return; $('joinMsg').textContent = 'Could not reach the server.'; }).then(function () { btn.disabled = false; });
  });
  function resume(code) {
    var s = load(code); if (!s) return false; resetSession(); sess = s; var version = sessionVersion;
    call('GET', null, { code: code }).then(function (r) { if (version !== sessionVersion || r.stale) return; if (r.status === 200) { S = null; take(r.body.state); poll(); } else { sess = null; $('entry').hidden = false; $('resume').hidden = false; $('resume').textContent = r.status === 404 ? 'That table has gone.' : 'Your place at that table was not recognised.'; } },
      function () { if (version !== sessionVersion) return; sess = s; $('entry').hidden = false; $('resume').hidden = false; $('resume').textContent = 'Could not reach the server.'; });
    return true;
  }
  /* Your tables: every table this browser holds a place at, newest first, to open again or forget. Forgetting a GM's place asks twice. */
  function savedTables() {
    var out = [];
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k.indexOf(KEY) !== 0 || !/^[A-Z0-9]{4,10}$/.test(k.slice(KEY.length))) continue; var v = load(k.slice(KEY.length)); if (v && v.token && v.code) out.push(v); } } catch {}
    return out.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  }
  function listTables() {
    var box = $('myTables'), list = savedTables(); if (!box) return; box.hidden = !list.length;
    $('myTablesList').innerHTML = list.map(function (t) {
      var ask = UI.forgetAsk === t.code;
      return '<li><span class="n"><span><b class="code">' + esc(t.code) + '</b> ' + (t.role === 'gm' ? 'You are the GM' : 'You are a player') + (t.label ? ' · ' + esc(t.label) : '') + (t.day ? ' <span class="note">· last opened ' + esc(t.day) + '</span>' : '') + '</span></span>' +
        '<a class="btn small main" href="/vtt/?room=' + encodeURIComponent(t.code) + '">Open</a><button type="button" class="btn small' + (ask ? ' danger' : '') + '" data-forget="' + esc(t.code) + '">' + (ask ? (t.role === 'gm' ? 'Sure? Only your GM link brings it back' : 'Sure? Forget it') : 'Forget') + '</button></li>';
    }).join('');
  }
  $('myTablesList').addEventListener('click', function (e) {
    var b = e.target.closest('[data-forget]'); if (!b) return; var code = b.dataset.forget;
    clearTimeout(UI.forgetTimer);
    if (UI.forgetAsk !== code) { UI.forgetAsk = code; listTables(); UI.forgetTimer = setTimeout(function () { UI.forgetAsk = null; listTables(); }, 5000); return; }
    UI.forgetAsk = null; delete memorySessions[code]; try { localStorage.removeItem(KEY + code); if (localStorage.getItem(KEY + 'last') === code) localStorage.removeItem(KEY + 'last'); } catch {}
    listTables();
  });
  /* A GM link (/vtt/?room=CODE#key=…): the key is kept in this browser like any table's, and taken out of the address at once. The part after # is never sent to the server by the browser. */
  (function () {
    var m = /^#key=([A-Za-z0-9_-]{20,80})$/.exec(location.hash || ''), r = (new URLSearchParams(location.search).get('room') || '').toUpperCase();
    if (!m || !/^[A-Z0-9]{4,10}$/.test(r)) return;
    memorySessions[r] = { code: r, token: m[1], role: 'gm' };
    try { localStorage.setItem(KEY + r, JSON.stringify(memorySessions[r])); } catch {}
    history.replaceState(null, '', '/vtt/?room=' + r);
  })();
  listTables();
  /* Putting the table on a phone's home screen: where the browser offers it (Chrome, Edge, Android), a button on the first screen asks; on an iPhone or iPad, a line says how. Opened from the home screen, neither shows. */
  (function () {
    var standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true, offer = null;
    if (standalone) return;
    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); offer = e; $('install').hidden = false; });
    $('installBtn').addEventListener('click', function () { if (!offer) return; var o = offer; offer = null; $('install').hidden = true; o.prompt(); });
    window.addEventListener('appinstalled', function () { $('install').hidden = true; });
    if (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) $('installIos').hidden = false;
  })();
  var q = new URLSearchParams(location.search), room = (q.get('room') || '').toUpperCase(), last = room || (function () { try { return localStorage.getItem(KEY + 'last') || ''; } catch (e) { return ''; } })();
  if (room) {
    /* an invitation link: joining that table is the main thing on the page; running one's own is still there, below and quieter */
    $('joinCode').value = room; $('entry').classList.add('invited'); var im = $('inviteMsg'); im.hidden = false; im.textContent = 'You have been invited to the table ' + room + '. Enter your name and press Join.';
    setTimeout(function () { var n = $('joinName'); if (n && !$('entry').hidden) n.focus(); }, 50);
  }
  /* From the landing page: /vtt/?join (a player) or /vtt/?run (a GM). The same two forms as ever, with the right one first and ready; a table already in progress is offered as a link rather than reopened. */
  var intent = !room && (q.has('run') ? 'run' : q.has('join') ? 'join' : '');
  if (intent) {
    var en = $('entry'), im2 = $('inviteMsg'); en.classList.add('mode-' + intent); im2.hidden = false;
    im2.textContent = intent === 'join' ? 'Joining a game: type the six-letter table code your GM gave you, and your name.' : 'Running a game: press Make a table. You will get a code to share with your players.';
    setTimeout(function () { var t = intent === 'join' ? $('joinCode') : en.querySelector('#makeForm button[type=submit]'); if (t && !en.hidden) t.focus(); }, 50);
    var saved = last; last = '';
    if (saved && load(saved)) { var rs = $('resume'); rs.hidden = false; rs.textContent = 'You already have a table in progress: '; var ra = document.createElement('a'); ra.href = '/vtt/?room=' + encodeURIComponent(saved); ra.textContent = 'go back to table ' + saved; rs.appendChild(ra); }
  }
  /* From the home page's Try it now: a sample table with you as the GM, in one step. One per browser: trying again opens the same one. */
  if (!room && q.has('try')) {
    UI.trying = true; last = '';
    var tried = (function () { try { return localStorage.getItem(KEY + 'try') || ''; } catch { return ''; } })();
    if (tried && load(tried)) last = tried;
    else { $('makeSample').checked = true; $('entry').hidden = false; var mf = $('makeForm'); if (mf.requestSubmit) mf.requestSubmit(); else mf.querySelector('button[type=submit]').click(); }
  }
  if (!(last && resume(last)) && !UI.trying) $('entry').hidden = false;
  /* A player can create a local hero in the linked second tab while this table is idle. */
  function refreshLocalHeroes() { if (S && !gm() && !myChar()) render(); }
  window.addEventListener('storage', function (e) { if (window.SacramentHeroes && (e.key === window.SacramentHeroes.KEY || e.key === null)) refreshLocalHeroes(); });
  window.addEventListener('focus', refreshLocalHeroes);
  window.addEventListener('online', function () { poll(true); });
  window.__vtt = { state: function () { return S; }, ui: UI, net: function () { return UI.netlog.slice(); } };
})();
