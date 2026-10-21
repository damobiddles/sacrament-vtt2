// The authoritative core of the Sacrament RPG virtual tabletop. It holds no secrets of its own and touches no network or clock: a session is a plain object, a
// command is a plain object, and everything here is a function from one to the other. The service (vtt-service.mjs) stores the object and checks tokens;
// this file decides what a command means, whether the person may do it, and what each viewer is allowed to see.
//
// Why it lives outside site/: it is the part that knows about private GM notes and unrevealed cards. It is never sent to a browser.
//
// Rules arithmetic is in site/vtt/rules.js (the same file the browser uses to show a calculation), so the screen and the server cannot disagree.
import { createHmac } from 'node:crypto';
import '../../../site/vtt/rules.js';
import '../../../site/sheet/gear.js';
import '../../../site/sheet/sheet-core.js';
import { LOOT_NOTES } from './loot-notes.mjs';
const R = globalThis.SacramentRules;
const SC = globalThis.SacramentSheetCore;   /* the character sheet's rules: the same file the sheet in the browser runs */

export const LIMITS = { loot: 60, cards: 150, chars: 12, players: 12, scenes: 20, strokes: 120, points: 160, log: 200, rolls: 60, applied: 400, clients: 200, joins: 100, window: 64, name: 60, text: 2000, notes: 4000, url: 500 };

/* The dice for one command come from the room's secret and the command's action id, so a command that is run again (because a save lost a race, or the client sent
   it again) rolls exactly the same numbers. They cannot be predicted without the secret. */
export function seededRng(secret, actionId) {
  let n = 0;
  return () => createHmac('sha256', String(secret)).update(String(actionId) + ':' + (n++)).digest().readUInt32BE(0) / 4294967296;
}

export class Fail extends Error { constructor(code, message) { super(message); this.code = code; } }
const fail = (code, msg) => { throw new Fail(code, msg); };

const int = (v, d) => { v = parseInt(v, 10); return Number.isFinite(v) ? v : d; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const str = (v, max, d = '') => (v == null ? d : String(v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, max));
const url = (v) => { v = str(v, LIMITS.url).trim(); if (!v) return ''; if (/^https:\/\/[^\s"'<>]+$/.test(v) || /^\/[A-Za-z0-9._/-]+$/.test(v)) return v; fail('invalid', 'An image address must start with https:// (or be a path on this site).'); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

/* ---------- making a session ---------- */
export function emptyState(code, now, secret = '') {
  return { v: 1, code, createdAt: now, secret, clients: {}, joins: {}, gm: { hash: '' }, players: {}, settings: R.settingsOf({}), seq: 1,
    table: { target: 12, round: 1, idx: 0, order: [], scene: 'sc1' }, scenes: { sc1: { id: 'sc1', name: 'Scene 1', bg: '' } },
    supplyFix: 1, horror: { cur: 0, alert: 0 }, lootLib: [], recap: { since: now, round0: 1, heroes: {}, best: null, fell: [], died: [], found: [], scenes: [], rests: 0, horrorPeak: 0 }, cards: {}, layout: {}, chars: {}, rolls: {}, rollOrder: [], draw: [], pointers: {}, log: [], applied: {}, appliedOrder: [], z: 1 };
}
const nid = (s, p) => p + (s.seq++).toString(36);

export function addLog(s, who, text, o = {}) {
  /* private: only the GM reads it. only: the GM and that one player. gmText: what the GM reads in place of `text` (the numbers, say).
     dice: the dice the server rolled for it, [{ die: 20, n: 12 }], so every screen that reads the line can show them landing; diceGm: only the GM is shown them (the numbers are hidden from players). */
  const e = { id: nid(s, 'L'), at: o.now || 0, by: who.role === 'gm' ? 'gm' : who.pid, who: who.name || (who.role === 'gm' ? 'GM' : 'Player'), text: str(text, 400), gmText: o.gmText ? str(o.gmText, 400) : '', kind: o.kind || 'info', private: !!o.private, only: o.only || null, effects: o.effects || [], undone: false };
  if (o.dice && o.dice.length) { e.dice = o.dice; if (o.diceGm) e.diceGm = true; }
  s.log.push(e); if (s.log.length > LIMITS.log) s.log.splice(0, s.log.length - LIMITS.log);
  return e;
}
const cardName = (c) => (c && c.name) || 'it';

/* ---------- who can see what ---------- */
export const isGM = (a) => a.role === 'gm';
/* On the players' table right now: revealed, on the live scene, and not in someone's hands. Anything else is not for the feed either. */
export const isPublic = (s, c) => !!c && !c.owner && c.visible === true && (c.sceneId == null || c.sceneId === s.table.scene);
/* Whether the numbers of a card are kept from the players. A hero's own are never. */
export const numbersHidden = (c) => !!c && c.hideNumbers === true && c.kind !== 'pc';
export function cardVisibleTo(s, c, a) {
  if (!c) return false;
  if (isGM(a)) return true;
  if (c.owner) return c.owner === a.pid;           /* a card given to someone is theirs alone */
  if (!c.visible) return false;
  return c.sceneId == null || c.sceneId === s.table.scene;
}
const charOf = (s, id) => s.chars[id] || fail('not_found', 'No such character.');
const cardOf = (s, id) => s.cards[id] || fail('not_found', 'No such card.');
const ownsChar = (c, a) => isGM(a) || c.owner === a.pid;
const ownsCard = (s, c, a) => isGM(a) || c.owner === a.pid || (c.charId && s.chars[c.charId] && s.chars[c.charId].owner === a.pid);

/* Keys identify individual possessions, including identical items. Old saves gain keys
   deterministically on read; commands persist the same keys before changing inventory. */
function gearKeys(ch) {
  ch.gear = ch.gear || []; ch.gearSeq = int(ch.gearSeq, 0);
  const used = new Set();
  for (const g of ch.gear) {
    if (/^g[0-9]+$/.test(g.key || '')) ch.gearSeq = Math.max(ch.gearSeq, +g.key.slice(1));
  }
  for (const g of ch.gear) {
    if (!/^g[0-9]+$/.test(g.key || '') || used.has(g.key)) g.key = 'g' + (++ch.gearSeq);
    used.add(g.key);
  }
}
function gearIndex(ch, key) {
  if (!key) fail('conflict', 'Please refresh this page before changing or using equipment.');
  const i = ch.gear.findIndex((g) => g.key === key);
  if (i < 0) fail('conflict', 'That item has been removed. Your equipment has been refreshed.');
  return i;
}

/* What a viewer is sent of a hero. Everyone gets what is plain at the table (name, scores, Defence, calling, appearance); only the hero's player and the GM get the vow, background, notes and gear. */
function charView(c, whole) {
  gearKeys(c);
  const o = { id: c.id, name: c.name, owner: c.owner, cardId: c.cardId, stats: c.stats, effort: c.effort, armour: c.armour, defence: SC.defence(c), calling: c.calling || '', appearance: c.appearance || '' };
  /* what anyone is sent shows a supply in the pack, whatever an old save says (see fixSupplies) */
  if (whole) Object.assign(o, { vow: c.vow || '', background: c.background || '', notes: c.notes || '', gear: (c.gear || []).map((g) => Object.assign({}, g, { eq: g.eq === true && SC.canEquip(SC.itemOf(g)) })) });
  return o;
}

/* What one viewer is sent. Nothing the viewer may not see is in the result, so nothing has to be hidden again on the screen.
   opt.dv: the drawing the viewer already has (its drawV). If it is the current one, the drawing is left out of the answer: it can be large and rarely changes. */
export function project(s, a, opt = {}) {
  const gm = isGM(a), cards = {}, layout = {};
  for (const id of Object.keys(s.cards)) {
    const c = s.cards[id]; if (!cardVisibleTo(s, c, a)) continue;
    const mask = !gm && numbersHidden(c);
    const o = { id, kind: c.kind, name: c.name, img: c.img, desc: c.desc, visible: c.visible, owner: c.owner || null, charId: c.charId || null, sceneId: c.sceneId,
      hp: mask ? (c.hp ? { hidden: true } : null) : c.hp, progress: mask ? (c.progress ? { hidden: true, label: c.progress.label } : null) : c.progress, timer: mask ? (c.timer ? { hidden: true, label: c.timer.label } : null) : c.timer };
    if (c.kind === 'pc') o.dying = c.dying || null;   /* a hero's countdown is plain at the table, like their HP */
    if (gm) { o.gmNotes = c.gmNotes || ''; o.hideNumbers = !!c.hideNumbers; o.attack = c.attack == null ? null : c.attack; o.loot = c.loot || null; } else if (mask) o.numbersHidden = true;
    cards[id] = o; if (s.layout[id] && (!c.owner || gm)) layout[id] = s.layout[id];
  }
  /* Turn order: an entry the viewer cannot see keeps its place but loses its name. */
  /* The GM sees every entry by name, a card given to a player included (it would otherwise read "Unseen" and fall out of the order on the GM's next change to it). */
  const order = s.table.order.map((id) => (gm || (cardVisibleTo(s, s.cards[id], a) && !s.cards[id].owner) ? { id } : { hidden: true }));
  const scene = s.scenes[s.table.scene] || { id: '', name: '', bg: '' };
  /* a roll is the person's own; the card it names is shown only if they can see it, and its amounts only if the numbers are not hidden */
  const rolls = s.rollOrder.map((id) => s.rolls[id]).filter((r) => r && (gm || r.by === a.pid)).slice(-30).map((r) => {
    if (r.check && !r.check.success && !r.attack) r = Object.assign({}, r, { canPush: !pushBlock(s, r) });
    if (gm) return r;
    const t = r.targetCardId && cards[r.targetCardId] ? r.targetCardId : null; let ap = r.applied && cards[r.applied.cardId] ? { cardId: r.applied.cardId, field: r.applied.field } : null;
    if (ap && !(s.cards[ap.cardId] && numbersHidden(s.cards[ap.cardId]))) ap.applied = r.applied.applied;
    /* Applied to a card this person can no longer see (it is hidden, or on another scene): they are still told that it WAS applied, but not to what. Without this the roll reads "not applied yet". */
    else if (!ap && r.applied) ap = { cardId: null, field: null, unseen: true };
    return Object.assign({}, r, { targetCardId: t, applied: ap });
  });
  const out = {
    v: s.v, code: s.code, you: { role: a.role, pid: a.pid || null, name: gm ? 'GM' : (s.players[a.pid] || {}).name || '' },
    table: { target: s.table.target, round: s.table.round, idx: s.table.idx, order, scene: { id: scene.id, name: scene.name, bg: scene.bg } },
    settings: s.settings, cards, layout,
    chars: Object.fromEntries(Object.entries(s.chars).map(([id, c]) => [id, charView(c, gm || (!!a.pid && c.owner === a.pid))])),
    players: Object.values(s.players).map((p) => ({ id: p.id, name: p.name })),
    drawV: s.drawV || 0, pv: s.pv || 0, pointers: s.pointers, rolls, nextSession: s.next || null,
    log: s.log.filter((e) => gm || (!e.private && (!e.only || e.only === a.pid))).slice(-80).map((e) => ({ id: e.id, at: e.at, who: e.who, text: gm && e.gmText ? e.gmText : e.text, kind: e.kind, undone: e.undone, mine: e.by === (gm ? 'gm' : a.pid), undoable: !e.undone && e.effects.length > 0 && (gm || (e.by === a.pid && !e.effects.some((fx) => fx.t === 'horror' || fx.t === 'turn'))), dice: e.dice && (gm || !e.diceGm) ? e.dice : undefined })),
    /* the Rising Horror is the whole table's, so everyone sees it; only the GM is told of a threshold still to deal with */
    horror: Object.assign({ cur: horrorOf(s).cur, max: R.HORROR.max, thresholds: R.HORROR.thresholds }, gm ? { alert: horrorOf(s).alert } : {})
  };
  if (opt.dv == null || opt.dv === '' || +opt.dv !== out.drawV) out.draw = s.draw;
  if (gm) {
    out.scenes = Object.values(s.scenes).map((x) => ({ id: x.id, name: x.name, bg: x.bg }));
    out.lootLib = s.lootLib || [];
    out.recap = s.recap || null;
    out.alerts = Object.values(s.cards).filter((c) => c.timer && c.timer.fired).map((c) => ({ cardId: c.id, name: c.name }));
  }
  return out;
}

/* The drawing has changed: its number moves on, so every screen is sent it once more (see project). */
const drew = (s) => { s.drawV = (s.drawV || 0) + 1; };

/* ---------- trackers ---------- */
const TRACKERS = { hp: 'HP', progress: 'Effort' };
function tracker(v, kind) {
  if (v == null) return null;
  const max = clamp(int(v.max, 10), 1, 999), cur = clamp(int(v.cur, max), 0, max);
  const t = { cur, max }; if (kind === 'progress') t.label = str(v.label, 40, 'Effort'); return t;
}
/* A monster's attack bonus: a number from -10 to +10, or null when it has none set (an attack then counts as +0). Heroes attack with their own rolls, so a hero token has none. */
function attackBonus(v, kind) { if (kind === 'pc' || v == null || v === '') return null; const n = int(v, NaN); return Number.isFinite(n) ? clamp(n, -R.MAX_BONUS, R.MAX_BONUS) : null; }
function timer(v) {
  if (v == null) return null;
  const max = clamp(int(v.max, 4), 1, 99), cur = clamp(int(v.cur, max), 0, max);
  return { cur, max, auto: v.auto !== false, paused: v.paused === true, fired: cur === 0 && v.fired === true, label: str(v.label, 40, '') };
}

function newCard(s, p, a) {
  if (Object.keys(s.cards).length >= LIMITS.cards) fail('limit', 'That is as many cards as a table can hold.');
  const kind = ['card', 'token', 'loot', 'pc'].includes(p.kind) ? p.kind : 'card';
  const c = { id: nid(s, 'c'), kind, name: str(p.name, LIMITS.name, 'Unmarked Card') || 'Unmarked Card', img: url(p.img), desc: str(p.desc, LIMITS.text), gmNotes: str(p.gmNotes, LIMITS.notes),
    visible: p.visible !== false, owner: null, sceneId: own(p, 'sceneId') ? (p.sceneId && s.scenes[p.sceneId] ? p.sceneId : null) : (kind === 'pc' ? null : s.table.scene),
    hp: tracker(p.hp, 'hp'), progress: tracker(p.progress, 'progress'), timer: timer(p.timer), hideNumbers: p.hideNumbers === true && kind !== 'pc', attack: attackBonus(p.attack, kind) };
  if (p.charId) c.charId = p.charId;
  if (p.loot) c.loot = p.loot;   /* the item behind a loot card: the GM's alone */
  s.cards[c.id] = c;
  const w = int(p.w, kind === 'token' || kind === 'pc' ? 7 : 16), h = int(p.h, kind === 'token' || kind === 'pc' ? 7 : 22);
  s.layout[c.id] = { x: clamp(int(p.x, 40 + (s.seq % 7) * 4), 0, 100), y: clamp(int(p.y, 40 + (s.seq % 5) * 4), 0, 100), w: clamp(w, 3, 60), h: clamp(h, 3, 80), z: ++s.z };
  return c;
}

export function addCharacter(s, p) {
  if (Object.keys(s.chars).length >= LIMITS.chars) fail('limit', 'That is as many characters as a table can hold.');
  const stats = {}, effort = {};
  R.STATS.forEach((k) => { stats[k] = clamp(int(p.stats && p.stats[k], 0), -R.MAX_BONUS, R.MAX_BONUS); });
  R.CATS.forEach((k) => { effort[k] = clamp(int(p.effort && p.effort[k], 0), 0, R.MAX_BONUS); });
  const id = nid(s, 'h');
  const card = newCard(s, { kind: 'pc', name: p.name || 'Unnamed Pilgrim', img: p.img, desc: p.desc, hp: { cur: R.HEART, max: R.HEART }, charId: id, x: p.x, y: p.y }, { role: 'gm' });
  s.chars[id] = { id, name: str(p.name, LIMITS.name, 'Unnamed Pilgrim') || 'Unnamed Pilgrim', owner: null, cardId: card.id, stats, effort, armour: clamp(int(p.armour, 0), 0, R.MAX_BONUS),
    calling: '', vow: '', appearance: '', background: '', notes: '', gear: [] };
  if (p.sheet) Object.assign(s.chars[id], { calling: p.sheet.calling, vow: p.sheet.vow, appearance: p.sheet.appearance, background: p.sheet.background, notes: p.sheet.notes, gear: p.sheet.gear });
  s.table.order.push(card.id);
  return s.chars[id];
}

/* ---------- commands ---------- */
const GM_ONLY = new Set(['setTarget', 'settings', 'cardCreate', 'cardUpdate', 'cardDuplicate', 'cardDelete', 'track', 'trackerAdd', 'trackerRemove', 'giveCard', 'sceneCreate', 'sceneUpdate', 'sceneReveal', 'orderSet', 'turnSet', 'nextRound', 'charCreate', 'charUpdate', 'assign', 'drawClear', 'ack', 'monsterAttack', 'monsterEffort', 'lootRoll', 'lootSave', 'lootDelete', 'lootPlace', 'lootGive', 'lootCardEdit', 'horror', 'horrorAck', 'dying', 'rest', 'recapReset', 'nextSession']);

/* An action id is a client id and a counter: "k3j9x0ab2fg.17". A page has three lanes, each its own client id (the page's id plus g, d or t) and its own counter:
   g, the gameplay commands, sent one at a time in order; d, drawing; t, the pointer, which only ever matters in its latest position. Because they are separate clients
   to the server, a pointer or a drawing arriving late, early or not at all cannot touch the numbering of a roll or a hit. */
const ACTION = /^([a-z0-9]{6,20})\.([0-9]{1,9})$/;

/* Run one command for one actor. Mutates `s` (the service gives it a private copy). Returns { result, changed }.
   ctx: { rng: () => [0,1), now: ms }.
   Repeats and reordering. Within a client, commands may arrive in any order and each is applied once:
   - a command whose id was accepted recently returns what it returned then and changes nothing (the last 400 answers are kept, each bound to who sent it);
   - for each client the server keeps the highest counter accepted and the counters accepted in the 64 below it. A counter above the highest is new. One inside
     that window and not yet accepted is a late arrival and is applied (an earlier command that overtook or was overtaken is not lost). One inside it and already
     accepted is a repeat. One below the window cannot be told from a repeat whose answer has gone, so it is refused as stale. A pointer that is stale is ignored quietly.
   - a client id and an action id belong to the person who first used them; anyone else using them is refused. */
export function apply(s, cmd, a, ctx) {
  if (!cmd || typeof cmd !== 'object' || typeof cmd.type !== 'string') fail('invalid', 'That is not a command.');
  const m = ACTION.exec(String(cmd.actionId || '')); if (!m) fail('invalid', 'Bad action id.');
  const who = isGM(a) ? 'gm' : a.pid, cid = m[1], n = +m[2];
  if (own(s.applied, cmd.actionId)) {
    const e = s.applied[cmd.actionId]; if (e.by !== who) fail('conflict', 'That action id is already in use.');
    return { result: Object.assign({ duplicate: true }, e.result), changed: false };
  }
  const cl = own(s.clients, cid) ? s.clients[cid] : null;
  if (cl && cl.by !== who) fail('conflict', 'That client id is already in use.');
  let stale = false;
  if (cl && n <= cl.last && (n <= cl.last - LIMITS.window || cl.recent.includes(n))) stale = true;
  if (stale) { if (cmd.type === 'point') return { result: { ignored: true }, changed: false }; fail('stale', 'That action was already handled, or it is out of date.'); }
  if (GM_ONLY.has(cmd.type) && !isGM(a)) fail('forbidden', 'Only the GM can do that.');
  Object.values(s.chars).forEach(gearKeys);
  fixSupplies(s, ctx);
  const H = HANDLERS[cmd.type]; if (!H) fail('invalid', 'Unknown command: ' + str(cmd.type, 30));
  a = Object.assign({}, a, { name: isGM(a) ? 'GM' : (s.players[a.pid] || {}).name || 'Player' });
  const result = H(s, cmd, a, ctx) || {};
  Object.values(s.chars).forEach(gearKeys);
  if (cmd.type === 'point') s.pv = (s.pv || 0) + 1; else s.v += 1;   /* a pointer is not a change to the table: it has its own number, so screens are sent only the pointers (see the service's GET) */
  const last = cl ? Math.max(cl.last, n) : n;
  s.clients[cid] = { by: who, last, at: ctx.now, recent: ((cl ? cl.recent : []).concat([n])).filter((k) => k > last - LIMITS.window) };
  const ids = Object.keys(s.clients); if (ids.length > LIMITS.clients) ids.sort((x, y) => s.clients[x].at - s.clients[y].at).slice(0, ids.length - LIMITS.clients).forEach((k) => delete s.clients[k]);
  /* a pointer moves many times a second and means nothing a second time: it is numbered but must not push real answers out of the 400 */
  if (cmd.type !== 'point') { s.applied[cmd.actionId] = { by: who, result }; s.appliedOrder.push(cmd.actionId); while (s.appliedOrder.length > LIMITS.applied) delete s.applied[s.appliedOrder.shift()]; }
  return { result, changed: true };
}

/* A table saved before supplies were kept to the pack may have a hero with one marked as equipped. The first command after this rule puts every such hero right, once, and tells the GM
   (only the GM) which heroes and which items were moved. */
function fixSupplies(s, ctx) {
  if (s.supplyFix === 1) return; s.supplyFix = 1;
  const moved = [];
  for (const ch of Object.values(s.chars)) { const card = s.cards[ch.cardId], names = SC.unequipSupplies(ch, card && card.hp); if (names.length) moved.push(ch.name + ': ' + names.join(', ')); }
  if (moved.length) addLog(s, { role: 'gm' }, 'Supply items cannot be equipped, so these were moved to the pack: ' + moved.join('; ') + '.', { now: ctx.now, private: true, kind: 'info' });
}


/* ---------- the GM's own loot ---------- */
/* An item as the designer edits it, tidied (the sheet's own rules decide what is sensible), with the GM's private notes beside it. */
const design = (raw) => { raw = raw && typeof raw === 'object' ? raw : {}; return Object.assign(SC.designOf(SC.makeCustom(raw)), { notes: str(raw.notes, 1000) }); };
const libOf = (s) => (s.lootLib = s.lootLib || []);
/* What players read on a revealed loot card: the description, then what it does. */
const lootText = (d) => [d.flavour, d.does].filter(Boolean).join('\n\n');
/* The item a loot command means: one from the library, the one behind a card, or one sent whole (a rolled find, perhaps edited first). */
function lootSource(s, c) {
  if (c.libId) return { d: libOf(s).find((x) => x.id === c.libId) || fail('not_found', 'That item is no longer in the library.') };
  if (c.cardId) { const card = cardOf(s, c.cardId); return { card, d: card.loot || fail('invalid', 'That card is not a loot item.') }; }
  if (c.item) return { d: design(c.item) };
  fail('invalid', 'Choose an item.');
}
function dropCard(s, card) { delete s.cards[card.id]; delete s.layout[card.id]; leaveOrder(s, card.id); }
/* A card leaves the turn order: whoever is acting keeps the turn (a place before theirs going moves them up one); if it was the acting card's own turn, the next in line has it. */
function leaveOrder(s, id) {
  const at = s.table.order.indexOf(id); if (at < 0) return;
  s.table.order.splice(at, 1); if (at < s.table.idx) s.table.idx -= 1;
  s.table.idx = clamp(s.table.idx, 0, Math.max(0, s.table.order.length - 1));
}

const d = (ctx, sides) => 1 + Math.floor(ctx.rng() * sides);
const L = (s, a, ctx, text, o = {}) => addLog(s, a, text, Object.assign({ now: ctx.now }, o));
/* The dice for a log line: none when the person typed in what their own die shows. */
const diceOf = (manual, die, n) => (manual ? [] : [{ die, n }]);
/* A change to a number is recorded as how much it moved, so putting it back later moves it back by the same amount and leaves any other change alone. */
const delta = (card, field, d) => ({ t: 'delta', card, field, d });
/* Who reads a line about this card: nobody but the GM unless the card is on the players' table now. */
const vis = (s, card) => ({ private: !isPublic(s, card) });

function setNumber(card, field, d) {
  if (field === 'timer') { const t = card.timer; if (!t) fail('invalid', 'No timer.'); const before = t.cur; t.cur = clamp(t.cur + d, 0, t.max); if (t.cur > 0) t.fired = false; if (t.cur === 0 && before > 0) t.fired = true; return t.cur - before; }
  const t = card[field]; if (!t) fail('invalid', cardName(card) + ' has no ' + (TRACKERS[field] || field) + ' tracker.');
  const c = R.change(t.cur, t.max, d); t.cur = c.cur; return c.applied;
}
const adjustField = (s, card, field, d) => setNumber(card, field, d);
const label = (field) => (field === 'hp' ? 'HP' : field === 'timer' ? 'timer' : TRACKERS.progress);

/* Take a rolled Effort off (HP) or add it to (progress) a card, once, and write it in the feed with an Undo. */
function applyEffort(s, roll, card, field, a, ctx) {
  const amount = roll.effort.total, was = card[field].cur, applied = adjustField(s, card, field, field === 'hp' ? -amount : amount), t = card[field], hide = numbersHidden(card);
  const who = attackerNames(s, roll);
  const body = (n) => n + ' → ' + card.name + ': ' + label(field) + ' ' + (applied > 0 ? '+' : '') + applied + ' (now ' + t.cur + '/' + t.max + ').' + (field === 'hp' && t.cur === 0 ? ' ' + card.name + ' is at 0.' : '') + (field === 'progress' && t.cur === t.max ? ' ' + card.name + ' is complete.' : '');
  const full = body(who.gm), shown = hide ? who.pub + ' → ' + card.name + ': ' + (field === 'hp' ? 'a hit' : 'progress') + '.' : body(who.pub);
  const e = L(s, a, ctx, shown, { kind: 'apply', effects: [delta(card.id, field, applied), { t: 'roll', roll: roll.id }], private: !isPublic(s, card), gmText: shown !== full ? full : '' });
  roll.applied = { cardId: card.id, field, applied, log: e.id };
  if (field === 'hp' && applied < 0) recapBlow(s, ctx, roll, card, -applied);
  if (field === 'hp') settleHero(s, card, was, e, ctx);
  return hide && !isGM(a) ? {} : { applied };
}
/* A monster's blow that gets through on a hero at 0: no damage is rolled. A dying hero loses a round (at 0, dead); a stable one is dying again with a new d4;
   one at 0 with no countdown yet falls now. */
function blow(s, roll, hero, a, ctx) {
  if (hero.dying && hero.dying.dead) fail('invalid', hero.name + ' is dead.');
  const who = attackerNames(s, roll), before = hero.dying && clone(hero.dying); let after, dice = [];
  if (!before || before.stable) { const n = d(ctx, R.DYING.die); hero.dying = R.dyingFall(n); dice = diceOf(false, R.DYING.die, n); after = hero.name + ' is dying' + (before ? ' again' : '') + ': d' + R.DYING.die + ' shows ' + n + ', ' + rounds(n) + ' left.'; }
  else { hero.dying = R.dyingTick(before); after = hero.dying.dead ? hero.name + ' has died.' : hero.name + ' loses a round: ' + rounds(hero.dying.left) + ' left.'; }
  roll.blow = true; recapDeath(s, ctx, hero);
  const line = (n) => n + ' strikes ' + hero.name + ', who is down. ' + after;
  const e = L(s, a, ctx, line(who.pub), { kind: hero.dying.dead ? 'alert' : 'apply', effects: [dyingFx(hero, before), { t: 'roll', roll: roll.id }], private: !isPublic(s, hero), gmText: who.pub !== who.gm ? line(who.gm) : '', dice });
  roll.applied = { cardId: hero.id, field: 'hp', applied: 0, log: e.id };
  return { dying: hero.dying };
}
/* Who a roll's feed lines name. A monster that is hidden from the players is "Something" to them; the GM always reads its name. */
function attackerNames(s, roll) {
  const m = roll.attack && s.cards[roll.attack.cardId];
  if (!roll.attack) return { gm: roll.charName, pub: roll.charName };
  return { gm: roll.charName, pub: m && isPublic(s, m) ? m.name : 'Something' };
}

/* ---------- dying ---------- */
/* A hero's countdown is kept on the hero's token as card.dying ({ left, stable, dead }), and only while the hero is at 0 HP: anything that lifts them above 0 stands them up.
   A change to it is recorded with what it was before, so an Undo puts it back. */
const isHero = (card) => !!card && card.kind === 'pc' && !!card.hp;
const dyingFx = (card, before) => ({ t: 'dying', card: card.id, before: before ? clone(before) : null });
const rounds = (n) => n + (n === 1 ? ' round' : ' rounds');
const GM_VOICE = { role: 'gm', name: 'GM' };   /* lines the table writes itself: only the GM can undo them */
/* A hero falls: the d4 is rolled where everyone sees it, on a line of its own. */
function fall(s, card, ctx, how, before) {
  const n = d(ctx, R.DYING.die); card.dying = R.dyingFall(n); listAdd(recapOf(s, ctx).fell, card.name);
  L(s, GM_VOICE, ctx, card.name + ' ' + (how || 'falls') + ' and is dying: d' + R.DYING.die + ' shows ' + n + ', ' + rounds(n) + ' left.', { kind: 'alert', effects: [dyingFx(card, before || null)], private: !isPublic(s, card), dice: diceOf(false, R.DYING.die, n) });
}
/* After a hero's HP has moved from `was` and line `e` has said so: rising above 0 stands a dying or stable hero up (said on that line, and undone with it); falling to 0 starts the countdown. */
function settleHero(s, card, was, e, ctx) {
  if (!isHero(card)) return;
  if (card.hp.cur > 0 && card.dying) {
    if (e) { e.effects.push(dyingFx(card, card.dying)); const say = ' ' + card.name + ' is back on their feet.'; e.text = str(e.text + say, 400); if (e.gmText) e.gmText = str(e.gmText + say, 400); }
    card.dying = null;
  } else if (card.hp.cur === 0 && was > 0 && !card.dying) fall(s, card, ctx);
}
/* A dead hero's HP does not rise: the GM gives them a round back first (in their panel) if the table wants them back. */
const noRaisingTheDead = (card, d) => { if (isHero(card) && card.dying && card.dying.dead && d > 0) fail('invalid', card.name + ' is dead. The GM can give them a round back in their panel first.'); };
/* The words for a countdown as it stands. */
const sayDying = (card) => (card.dying.dead ? card.name + ' has died.' : card.dying.stable ? card.name + ' is stable.' : card.name + ' is dying: ' + rounds(card.dying.left) + ' left.');

/* ---------- the Rising Horror ---------- */
/* The meter, made on first use for a table saved before it existed. `alert` is the highest threshold passed that the GM has not yet dealt with (0 for none). */
const horrorOf = (s) => (s.horror = s.horror && typeof s.horror === 'object' ? s.horror : { cur: 0, alert: 0 });
/* Move the meter by d, and say so: one line for the move (with an Undo for the GM), then one line for each threshold passed. `say(applied, now)` writes the line. */
function moveHorror(s, a, ctx, d, say, dice) {
  const h = horrorOf(s), m = R.horrorMove(h.cur, d); h.cur = m.to; const R0 = recapOf(s, ctx); R0.horrorPeak = Math.max(R0.horrorPeak || 0, h.cur);
  if (m.crossed.length) h.alert = Math.max(h.alert || 0, m.crossed[m.crossed.length - 1]);
  if (h.alert && h.cur < h.alert) h.alert = 0;
  const e = L(s, a, ctx, say(m.applied, m.to), { kind: 'horror', effects: m.applied ? [{ t: 'horror', d: m.applied }] : [], dice });
  m.crossed.forEach((t) => L(s, { role: 'gm', name: 'GM' }, ctx, R.HORROR.lines[t], { kind: 'alert' }));
  return { cur: h.cur, applied: m.applied, crossed: m.crossed, arrived: m.arrived, log: e.id };
}
/* A hero has used something that tempts the Horror: its amount (fixed, or rolled now with the table's dice) goes on the meter, whatever the check did. No amount, no line. */
function temptHorror(s, a, ctx, ch, u) {
  const r = R.rollHorror(u.horror, (sides) => d(ctx, sides)); if (!r || r.amount <= 0) return null;
  const what = u.spell ? ch.name + ' read from ' + u.item.name + '.' : ch.name + ' used ' + u.item.name + '.';
  return moveHorror(s, a, ctx, r.amount, (applied, now) => what + (applied > 0 ? ' The Horror rises ' + (applied === r.amount ? r.text : applied + ' of ' + r.text) + ' (now ' + now + ').' : ' The Horror can rise no further (' + now + ').'));
}

/* A hero's d20 showing a natural 1 raises the Horror by itself, whatever the check was for. */
function natOne(s, a, ctx, ch, chk) {
  if (!chk.nat1) return null;
  return moveHorror(s, a, ctx, R.HORROR.nat1, (applied, now) => ch.name + ' rolled a natural 1.' + (applied > 0 ? ' The Horror rises ' + applied + ' (now ' + now + ').' : ' The Horror can rise no further (' + now + ').'));
}
/* Why a roll cannot be pushed now, or '' when it can. A push follows a failed check: the hero's latest roll, not itself a pushed second action, and not pushed already; on the hero's own turn, once a turn. */
function pushBlock(s, r) {
  if (!r || !r.check || r.attack || r.void) return 'There is nothing to push.';
  if (r.check.success) return 'That roll succeeded.';
  if (r.pushed) return 'That roll has been pushed already.';
  if (r.fromPush) return 'A pushed action cannot be pushed again.';
  if (s.rollOrder.slice(s.rollOrder.indexOf(r.id) + 1).some((id) => s.rolls[id] && s.rolls[id].charId === r.charId)) return 'Only the latest roll can be pushed.';
  const ch = s.chars[r.charId]; if (!ch) return 'That hero is no longer at the table.';
  if (ch.pushTurn && ch.pushTurn === turnKey(s, ch)) return 'You have pushed once this turn already.';
  return '';
}
/* The turn a push is counted against: the hero's own turn while the turn order runs, otherwise none. */
const turnKey = (s, ch) => (s.table.order.length && s.table.order[s.table.idx] === ch.cardId ? s.table.round + ':' + s.table.idx : '');
/* A new roll for a hero: if they have just pushed, this is their second action. */
function takeAction(ch, roll) { if (ch.pushPending) { roll.fromPush = true; ch.pushPending = false; } }

/* ---------- the session recap ---------- */
/* A running tally of tonight's game for the GM to share afterwards: each hero's rolls, the hardest blow, who fell, what was found, how high the Horror rose,
   the scenes shown. It names only what the players have seen (a hidden card is "something unseen"). It counts as things happen: an Undo does not take them back out.
   The GM starts it again with "Start a new session". A table saved before it existed starts counting at its first command. */
const recapOf = (s, ctx) => (s.recap = s.recap && typeof s.recap === 'object' ? s.recap : { since: ctx ? ctx.now : 0, round0: s.table.round, heroes: {}, best: null, fell: [], died: [], found: [], scenes: [], rests: 0, horrorPeak: horrorOf(s).cur });
const RECAP_MAX = 40;   /* each list keeps at most this many */
const listAdd = (l, v) => { if (l.length < RECAP_MAX) l.push(str(v, 120)); };
function recapCheck(s, ctx, ch, chk) {
  const R0 = recapOf(s, ctx), h = R0.heroes[ch.id] = R0.heroes[ch.id] || { name: ch.name, rolls: 0, hits: 0, n20: 0, n1: 0, dealt: 0 };
  h.name = ch.name; h.rolls += 1; if (chk.success) h.hits += 1; if (chk.nat20) h.n20 += 1; if (chk.nat1) h.n1 += 1;
}
function recapBlow(s, ctx, roll, card, amount) {
  const R0 = recapOf(s, ctx), on = isPublic(s, card) ? card.name : 'something unseen';
  if (!roll.attack && roll.charId && R0.heroes[roll.charId]) R0.heroes[roll.charId].dealt += amount;
  if (!roll.attack && (!R0.best || amount > R0.best.n)) R0.best = { who: roll.charName, n: amount, on: str(on, 60) };
}
const recapDeath = (s, ctx, card) => { const R0 = recapOf(s, ctx); if (card.dying && card.dying.dead && !R0.died.includes(card.name)) listAdd(R0.died, card.name); };

const HANDLERS = {
  setTarget(s, c, a, ctx) { /* to a number, or (from the + and − buttons) by an amount, so that quick presses each count */ const v = c.delta != null ? s.table.target + int(c.delta, 0) : int(c.value, NaN); if (!Number.isFinite(v)) fail('invalid', 'The Target is a number.'); const was = s.table.target; s.table.target = clamp(v, 1, 40); L(s, a, ctx, 'Target ' + was + ' → ' + s.table.target + '.'); return { target: s.table.target }; },
  settings(s, c, a, ctx) { const m = Object.assign({}, s.settings, c.patch || {}); if (c.patch && c.patch.dice) m.dice = Object.assign({}, s.settings.dice, c.patch.dice); s.settings = R.settingsOf(m); L(s, a, ctx, 'House rules changed.'); return {}; },

  cardCreate(s, c, a, ctx) {
    const card = newCard(s, c.card || {}, a); if (c.addToOrder) s.table.order.push(card.id);
    L(s, a, ctx, 'Added ' + card.name + '.', vis(s, card)); return { id: card.id };
  },
  cardUpdate(s, c, a, ctx) {
    const card = cardOf(s, c.id), p = c.patch || {}, wasPublic = isPublic(s, card);
    if (own(p, 'name')) { card.name = str(p.name, LIMITS.name, card.name) || card.name; if (card.charId && s.chars[card.charId]) s.chars[card.charId].name = card.name; } /* a hero and its token share a name */
    if (own(p, 'desc')) card.desc = str(p.desc, LIMITS.text);
    if (own(p, 'gmNotes')) card.gmNotes = str(p.gmNotes, LIMITS.notes);
    if (own(p, 'img')) card.img = url(p.img);
    if (own(p, 'visible')) card.visible = p.visible === true;
    if (own(p, 'attack')) card.attack = attackBonus(p.attack, card.kind);
    if (own(p, 'hideNumbers') && card.kind !== 'pc') card.hideNumbers = p.hideNumbers === true;
    if (own(p, 'kind') && ['card', 'token', 'loot'].includes(p.kind) && card.kind !== 'pc') card.kind = p.kind;
    if (own(p, 'sceneId')) card.sceneId = p.sceneId && s.scenes[p.sceneId] ? p.sceneId : null;
    if (own(p, 'w') || own(p, 'h')) { const l = s.layout[card.id]; if (own(p, 'w')) l.w = clamp(int(p.w, l.w), 3, 60); if (own(p, 'h')) l.h = clamp(int(p.h, l.h), 3, 80); }
    const nowPublic = isPublic(s, card);
    if (own(p, 'visible') && nowPublic !== wasPublic) L(s, a, ctx, (nowPublic ? 'Revealed ' : 'Hid ') + card.name + '.', { private: !nowPublic });
    return {};
  },
  cardDuplicate(s, c, a, ctx) {
    const src = cardOf(s, c.id), l = s.layout[src.id] || { x: 40, y: 40 };
    const copy = newCard(s, { kind: src.kind === 'pc' ? 'token' : src.kind, name: src.name + ' 2', img: src.img, desc: src.desc, gmNotes: src.gmNotes, visible: src.visible, hideNumbers: src.hideNumbers, sceneId: src.sceneId, attack: src.attack, loot: src.loot && clone(src.loot), hp: src.hp, progress: src.progress, timer: src.timer && Object.assign({}, src.timer, { fired: false }), x: l.x + 3, y: l.y + 3, w: l.w, h: l.h }, a);
    L(s, a, ctx, 'Duplicated ' + src.name + '.', vis(s, copy)); return { id: copy.id };
  },
  cardDelete(s, c, a, ctx) {
    const card = cardOf(s, c.id), open = isPublic(s, card); dropCard(s, card);
    Object.values(s.chars).forEach((ch) => { if (ch.cardId === card.id) { delete s.chars[ch.id]; } });
    L(s, a, ctx, 'Removed ' + card.name + '.', { private: !open }); return {};
  },
  track(s, c, a, ctx) { /* the GM edits a number directly: set it, or move it by an amount */
    const card = cardOf(s, c.id), field = c.field; if (!['hp', 'progress', 'timer'].includes(field)) fail('invalid', 'Choose hp, progress or timer.');
    const t = card[field]; if (!t) fail('invalid', cardName(card) + ' has no such tracker.');
    const quiet = !isPublic(s, card) || numbersHidden(card); /* a number the players cannot see is changed without saying so to them */
    let applied;
    if (c.what === 'max') { const m = clamp(int(c.value, t.max), 1, 999); t.max = m; t.cur = Math.min(t.cur, m); return {}; }
    else if (c.what === 'paused') { t.paused = c.value === true; if (!quiet) L(s, a, ctx, card.name + ' timer ' + (t.paused ? 'paused' : 'running') + '.'); return {}; }
    else if (c.what === 'auto') { t.auto = c.value === true; return {}; }
    else if (c.what === 'label') { t.label = str(c.value, 40); return {}; }
    const was = t.cur, want = c.mode === 'delta' ? int(c.value, 0) : int(c.value, NaN);
    if (!Number.isFinite(want)) fail('invalid', 'That is not a number.');
    const dl = c.mode === 'delta' ? want : clamp(want, 0, t.max) - t.cur; if (field === 'hp') noRaisingTheDead(card, dl);
    applied = adjustField(s, card, field, dl);
    const e = applied ? L(s, a, ctx, card.name + ' ' + label(field) + ' ' + (applied > 0 ? '+' : '') + applied + ' (now ' + t.cur + '/' + t.max + ').', { effects: [delta(card.id, field, applied)], private: quiet }) : null;
    if (field === 'hp') settleHero(s, card, was, e, ctx);
    return { applied };
  },
  trackerAdd(s, c) {
    const card = cardOf(s, c.id), f = c.field;
    if (f === 'hp') card.hp = card.hp || tracker({ cur: R.HEART, max: R.HEART }, 'hp');
    else if (f === 'progress') card.progress = card.progress || tracker({ cur: 0, max: R.HEART, label: 'Effort' }, 'progress');
    else if (f === 'timer') card.timer = card.timer || timer({ cur: 4, max: 4, auto: true });
    else fail('invalid', 'Choose hp, progress or timer.'); return {};
  },
  trackerRemove(s, c) { const card = cardOf(s, c.id); if (!['hp', 'progress', 'timer'].includes(c.field)) fail('invalid', 'Choose hp, progress or timer.'); card[c.field] = null; return {}; },
  ack(s, c) { const card = cardOf(s, c.id); if (card.timer) card.timer.fired = false; return {}; },

  giveCard(s, c, a, ctx) {
    const card = cardOf(s, c.id), pid = c.pid;
    if (pid == null) { card.owner = null; L(s, a, ctx, card.name + ' is back on the table.', vis(s, card)); return {}; }
    const p = s.players[pid] || fail('not_found', 'No such player.'); card.owner = pid; card.visible = true; if (card.kind === 'loot') listAdd(recapOf(s, ctx).found, p.name + ': ' + card.name);
    L(s, a, ctx, 'The GM gives you ' + card.name + '.', { only: pid, gmText: 'The GM gives ' + card.name + ' to ' + p.name + '.' }); return {};
  },
  move(s, c, a) {
    const card = cardOf(s, c.id); if (!cardVisibleTo(s, card, a)) fail('not_found', 'No such card.');
    if (!ownsCard(s, card, a)) fail('forbidden', 'That is not yours to move.');
    const l = s.layout[card.id]; if (!l) fail('invalid', 'That card is not on the table.');
    const x = +c.x, y = +c.y; if (!Number.isFinite(x) || !Number.isFinite(y)) fail('invalid', 'Bad position.');
    l.x = clamp(x, 0, 100); l.y = clamp(y, 0, 100); if (c.front !== false) l.z = ++s.z; return {};
  },

  sceneCreate(s, c, a, ctx) { if (Object.keys(s.scenes).length >= LIMITS.scenes) fail('limit', 'Too many scenes.'); const id = nid(s, 'sc'); s.scenes[id] = { id, name: str(c.name, LIMITS.name, 'Unmarked Ground') || 'Unmarked Ground', bg: url(c.bg) }; L(s, a, ctx, 'Prepared scene ' + s.scenes[id].name + '.', { private: true }); return { id }; },
  sceneUpdate(s, c) { const sc = s.scenes[c.id] || fail('not_found', 'No such scene.'); if (own(c, 'name')) sc.name = str(c.name, LIMITS.name, sc.name) || sc.name; if (own(c, 'bg')) sc.bg = url(c.bg); return {}; },
  sceneReveal(s, c, a, ctx) { const sc = s.scenes[c.id] || fail('not_found', 'No such scene.'); s.table.scene = sc.id; listAdd(recapOf(s, ctx).scenes, sc.name); L(s, a, ctx, 'The scene: ' + sc.name + '.'); return {}; },

  orderSet(s, c) {
    if (!Array.isArray(c.order)) fail('invalid', 'The order is a list.');
    const seen = new Set(), order = c.order.filter((id) => s.cards[id] && !seen.has(id) && seen.add(id)); const cur = s.table.order[s.table.idx];
    s.table.order = order; const at = order.indexOf(cur); s.table.idx = at >= 0 ? at : clamp(s.table.idx, 0, Math.max(0, order.length - 1)); return {};
  },
  turnSet(s, c) { s.table.idx = clamp(int(c.idx, 0), 0, Math.max(0, s.table.order.length - 1)); return {}; },
  endTurn(s, c, a, ctx) {
    expectTurn(s, c);
    const cur = s.cards[s.table.order[s.table.idx]];
    const mine = cur && cur.charId && s.chars[cur.charId] && s.chars[cur.charId].owner === a.pid;
    if (!isGM(a) && !mine) fail('forbidden', 'It is not your turn.');
    return advance(s, a, ctx, false);
  },
  nextRound(s, c, a, ctx) { expectTurn(s, c); return advance(s, a, ctx, true); },

  charCreate(s, c, a, ctx) { const ch = addCharacter(s, Object.assign({ name: 'Unnamed Pilgrim' }, c.char || {})); L(s, a, ctx, 'Added ' + ch.name + '.'); return { id: ch.id }; },
  charUpdate(s, c) {
    const ch = charOf(s, c.id), p = c.patch || {};
    if (own(p, 'name')) { ch.name = str(p.name, LIMITS.name, ch.name) || ch.name; const card = s.cards[ch.cardId]; if (card) card.name = ch.name; }
    if (p.stats) R.STATS.forEach((k) => { if (own(p.stats, k)) ch.stats[k] = clamp(int(p.stats[k], 0), -R.MAX_BONUS, R.MAX_BONUS); });
    if (p.effort) R.CATS.forEach((k) => { if (own(p.effort, k)) ch.effort[k] = clamp(int(p.effort[k], 0), 0, R.MAX_BONUS); });
    if (own(p, 'armour')) ch.armour = clamp(int(p.armour, 0), 0, R.MAX_BONUS); return {};
  },
  sheet(s, c, a, ctx) { /* a change on the character sheet: the hero's player, or the GM. The rules are the sheet's own (sheet-core.js), so what the screen allowed is what is allowed here. */
    const ch = charOf(s, c.charId); if (!ownsChar(ch, a)) fail('forbidden', 'That is not your hero.');
    const card = s.cards[ch.cardId], was = card && card.hp ? card.hp.cur : 0;
    const op = Object.assign({}, c.op);
    if (op.op === 'remove' || op.op === 'move') op.index = gearIndex(ch, op.gearKey);
    const r = SC.edit(ch, op, { gm: isGM(a) }, card && card.hp);
    if (!r.ok) fail('limit', r.why);
    if (card && card.hp) settleHero(s, card, was, null, ctx);
    if (card && c.op.op === 'text' && c.op.field === 'name') card.name = ch.name;   /* a hero and its token share a name */
    if (isGM(a) && c.op.op === 'add') {   /* the GM putting an item on a hero's sheet (a d100 find, say) is a gift: its player is told, as for a gift from the library */
      const it = SC.item(c.op.id), name = it ? it.name : 'an item', gmText = 'The GM gives ' + name + ' to ' + ch.name + '.'; listAdd(recapOf(s, ctx).found, ch.name + ': ' + name);
      L(s, a, ctx, 'The GM gives you ' + name + '.', ch.owner ? { only: ch.owner, gmText } : { private: true, gmText });
    }
    return {};
  },
  bringHero(s, c, a) { /* a hero built on My heroes, brought to this table: checked against the build rules, then made like any other hero */
    if (!isGM(a) && Object.values(s.chars).some((x) => x.owner === a.pid)) fail('invalid', 'You already have a hero at this table.');
    const hero = SC.cleanHero(c.hero), probs = SC.problems(hero, { gm: isGM(a), arriving: true });
    if (probs.length) fail('invalid', 'That hero does not fit the rules: ' + probs.join(' '));
    const hearts = hero.gear.reduce((n, g) => n + (g.eq && SC.item(g.id).hearts ? SC.item(g.id).hearts : 0), 0);
    const ch = addCharacter(s, { name: hero.name, desc: hero.appearance, stats: hero.stats, effort: hero.effort, armour: hero.armour, sheet: hero });
    const card = s.cards[ch.cardId]; card.hp = { cur: R.HEART * (1 + hearts), max: R.HEART * (1 + hearts) };
    if (!isGM(a)) ch.owner = a.pid;
    return { id: ch.id };
  },
  assign(s, c, a, ctx) { const ch = charOf(s, c.charId); if (c.pid && !s.players[c.pid]) fail('not_found', 'No such player.'); ch.owner = c.pid || null; L(s, a, ctx, ch.name + (ch.owner ? ' is played by ' + s.players[ch.owner].name + '.' : ' is free to claim.')); return {}; },
  claim(s, c, a, ctx) {
    if (isGM(a)) fail('invalid', 'The GM assigns characters.');
    const ch = charOf(s, c.charId); if (ch.owner) fail('forbidden', 'That character already has a player.');
    if (Object.values(s.chars).some((x) => x.owner === a.pid)) fail('forbidden', 'You already have a character.');
    ch.owner = a.pid; L(s, a, ctx, 'Now playing ' + ch.name + '.'); return {};   /* the feed already starts the line with the player's name */
  },

  roll(s, c, a, ctx) {
    const ch = charOf(s, c.charId); if (!ownsChar(ch, a)) fail('forbidden', 'That is not your character.');
    if (!R.STATS.includes(c.stat)) fail('invalid', 'Choose a stat.');
    const adj = ['easy', 'normal', 'hard'].includes(c.adj) ? c.adj : 'normal'; const manual = c.d20 != null && c.d20 !== '';
    const d20 = manual ? int(c.d20, 0) : d(ctx, 20); if (d20 < 1 || d20 > 20) fail('invalid', 'A d20 shows 1 to 20.');
    let target = null; if (c.targetCardId) { const tc = cardOf(s, c.targetCardId); if (!cardVisibleTo(s, tc, a)) fail('not_found', 'No such card.'); target = tc.id; }
    const chk = R.check({ d20, stat: ch.stats[c.stat], target: s.table.target, adj, settings: s.settings });
    const roll = { id: nid(s, 'r'), by: isGM(a) ? 'gm' : a.pid, charId: ch.id, charName: ch.name, stat: c.stat, check: chk, manual, targetCardId: target, effort: null, applied: null, void: false, at: ctx.now };
    takeAction(ch, roll); s.rolls[roll.id] = roll; s.rollOrder.push(roll.id); while (s.rollOrder.length > LIMITS.rolls) delete s.rolls[s.rollOrder.shift()];
    recapCheck(s, ctx, ch, chk);
    const tc = target && s.cards[target];
    L(s, a, ctx, ch.name + ' · ' + R.sayCheck(chk, c.stat) + (tc ? ' (' + tc.name + ')' : '') + (manual ? ' [physical die]' : ''), { kind: 'roll', private: !!(tc && !isPublic(s, tc)), dice: diceOf(manual, 20, d20) });
    const out = { rollId: roll.id }, hr = natOne(s, a, ctx, ch, chk); if (hr) out.horror = { cur: hr.cur, applied: hr.applied, crossed: hr.crossed };
    return out;
  },
  useItem(s, c, a, ctx) { /* a hero uses an item: a check with the item's stat; on a success the player then rolls the item's own Effort die (see `effort`), plus their bonus in that kind. No Effort kind, no Effort roll;
     no stat either (a spell said without a check), no roll at all. Whatever it is, if it tempts the Horror the meter rises by its amount. */
    const ch = charOf(s, c.charId); if (!ownsChar(ch, a)) fail('forbidden', 'That is not your character.');
    const index = gearIndex(ch, c.gearKey);
    let u = SC.useOf(ch, index, c.spellId); if (!u.ok) fail('invalid', u.why);
    const adj = ['easy', 'normal', 'hard'].includes(c.adj) ? c.adj : 'normal', manual = c.d20 != null && c.d20 !== '';
    if (manual && (int(c.d20, 0) < 1 || int(c.d20, 0) > 20)) fail('invalid', 'A d20 shows 1 to 20.');
    let target = null; if (c.targetCardId) { const tc = cardOf(s, c.targetCardId); if (!cardVisibleTo(s, tc, a)) fail('not_found', 'No such card.'); target = tc.id; }
    const tc = target && s.cards[target], priv = !!(tc && !isPublic(s, tc)), out = { rollId: null };
    if (u.pick) { /* a grimoire read by the die: the die chooses the spell, and the reader casts it */
      const sides = u.pick, n = d(ctx, sides), sp = u.spells[n - 1]; u = SC.useSpell(u, sp); out.picked = { n, spellId: sp.id, name: sp.name };
      L(s, a, ctx, ch.name + ' reads ' + u.item.name + ': d' + sides + ' shows ' + n + ', ' + sp.name + '.', { kind: 'roll', dice: diceOf(false, sides, n) });
    }
    const tempts = (u.spell || u.item).temptsHorror ? ' It tempts the Horror.' : ''; let nat = null;
    if (!u.stat) ch.pushPending = false;   /* a pushed second action with no roll is still the second action */
    if (u.stat) {
      const d20 = manual ? int(c.d20, 0) : d(ctx, 20);
      const chk = R.check({ d20, stat: ch.stats[u.stat], target: s.table.target, adj, settings: s.settings });
      const roll = { id: nid(s, 'r'), by: isGM(a) ? 'gm' : a.pid, charId: ch.id, charName: ch.name, stat: u.stat, check: chk, manual, targetCardId: target, effort: null, applied: null, void: false, at: ctx.now, item: u.name, use: { index, gearKey: c.gearKey, spellId: c.spellId || null } };
      takeAction(ch, roll); s.rolls[roll.id] = roll; s.rollOrder.push(roll.id); while (s.rollOrder.length > LIMITS.rolls) delete s.rolls[s.rollOrder.shift()];
      recapCheck(s, ctx, ch, chk);
      L(s, a, ctx, ch.name + ' uses ' + u.name + ' · ' + R.sayCheck(chk, u.stat) + (tc ? ' (' + tc.name + ')' : '') + (manual ? ' [physical die]' : '') + tempts, { kind: 'roll', private: priv, dice: diceOf(manual, 20, d20) });
      if (u.cat) roll.cat = u.cat;   /* the item's own kind of Effort: on a success the player rolls it as its own step ("Roll damage"), so the blow lands first and the damage after */
      out.rollId = roll.id;
      nat = natOne(s, a, ctx, ch, chk);
    } else L(s, a, ctx, ch.name + ' uses ' + u.name + ' (no roll).' + (tc ? ' (' + tc.name + ')' : '') + tempts, { kind: 'roll', private: priv });
    if (u.gear.uses != null && u.item.uses != null) u.gear.uses = Math.max(0, u.gear.uses - 1);   /* a flask is used up whether or not the blow lands */
    const hr = temptHorror(s, a, ctx, ch, u) || nat; if (hr) out.horror = { cur: hr.cur, applied: hr.applied, crossed: hr.crossed };
    return out;
  },
  push(s, c, a, ctx) { /* after a failed check the hero may push for a second action: the Horror rises, and their next roll is that action */
    const r = s.rolls[c.rollId] || fail('not_found', 'That roll is no longer at the table.'), ch = charOf(s, r.charId);
    if (!ownsChar(ch, a) || r.by !== (isGM(a) ? 'gm' : a.pid)) fail('forbidden', 'That is not your roll.');
    const why = pushBlock(s, r); if (why) fail('invalid', why);
    r.pushed = true; ch.pushPending = true; ch.pushTurn = turnKey(s, ch) || null;
    const hr = moveHorror(s, a, ctx, R.HORROR.push, (applied, now) => ch.name + ' pushes for a second action.' + (applied > 0 ? ' The Horror rises ' + applied + ' (now ' + now + ').' : ' The Horror can rise no further (' + now + ').'));
    return { horror: { cur: hr.cur, applied: hr.applied, crossed: hr.crossed } };
  },
  horror(s, c, a, ctx) { /* the GM moves the meter by hand: by an amount, to a number (0 resets it), or down by a d6 the server rolls in front of the table */
    const h = horrorOf(s);
    if (c.mode === 'lowerRoll') {
      if (!h.cur) fail('invalid', 'The Horror is already at 0.');
      const n = d(ctx, R.HORROR.lowerDie);
      const r = moveHorror(s, a, ctx, -n, (applied, now) => 'Horror d' + R.HORROR.lowerDie + ': ' + n + '. The GM lowers the Horror by ' + Math.abs(applied) + (Math.abs(applied) === n ? '' : ' of ' + n) + ' (now ' + now + ').', diceOf(false, R.HORROR.lowerDie, n));
      return { cur: r.cur, applied: r.applied, rolled: n };
    }
    const v = int(c.value, NaN); if (!Number.isFinite(v)) fail('invalid', 'The Horror is a number.');
    const dl = c.mode === 'set' ? clamp(v, 0, R.HORROR.max) - h.cur : clamp(v, -R.HORROR.max, R.HORROR.max);
    if (!dl) return { cur: h.cur, applied: 0 };
    const r = moveHorror(s, a, ctx, dl, (applied, now) => 'The GM ' + (applied > 0 ? 'raises' : 'lowers') + ' the Horror by ' + Math.abs(applied) + ' (now ' + now + ').');
    return { cur: r.cur, applied: r.applied, crossed: r.crossed };
  },
  horrorAck(s) { horrorOf(s).alert = 0; return {}; },
  nextSession(s, c, a, ctx) { /* the GM's date for the next game, shown to everyone at the table in their own time; null clears it */
    if (c.at == null || c.at === '') { s.next = null; L(s, a, ctx, 'The next session is not set.'); return {}; }
    const at = +c.at; if (!Number.isFinite(at) || at < 1e12 || at > 1e13) fail('invalid', 'Choose a date and time.');
    s.next = { at: Math.round(at), note: str(c.note, 120).trim() }; L(s, a, ctx, 'The GM has set the next session.'); return {};
  },
  recapReset(s, c, a, ctx) { s.recap = null; recapOf(s, ctx); L(s, a, ctx, 'A new session begins.'); return {}; },
  lootRoll(s, c, a, ctx) { /* the GM rolls on the d100 loot table (or types what a physical d100 shows); a number that leads into a sub-table rolls that table too (or takes the
     GM's own number for it, from `ns`). Only the GM is told; what to do with the find is theirs. */
    const typed = Array.isArray(c.ns) ? c.ns.slice(0, 4) : c.n != null && c.n !== '' ? [c.n] : [];
    const r = SC.rollLoot((sides) => d(ctx, sides), typed); if (!r.ok) fail(/^Nothing is listed/.test(r.why) ? 'not_found' : 'invalid', r.why);
    const it = r.item, said = SC.sayLoot(r.steps);
    L(s, a, ctx, 'Loot roll ' + said + ': ' + it.name + '.', { kind: 'roll', private: true, dice: r.steps.filter((st) => !st.typed).map((st) => ({ die: st.die, n: st.n })) });
    return { n: r.steps[0].n, steps: r.steps, said, itemId: it.id, name: it.name, category: it.category || '', flavour: it.flavour || '', tempts: !!it.temptsHorror, gmNote: LOOT_NOTES[it.id] || '',
      design: it.kind === 'grimoire' ? null : Object.assign(SC.designOf(it), { notes: LOOT_NOTES[it.id] || '' }) };   /* a grimoire carries spells, so it is handed out as itself and not edited here */
  },
  lootSave(s, c, a, ctx) { /* design or change an item in the table's loot library */
    const lib = libOf(s), d = design(c.item);
    if (c.id) { const i = lib.findIndex((x) => x.id === c.id); if (i < 0) fail('not_found', 'That item is no longer in the library.'); d.id = c.id; lib[i] = d; }
    else { if (lib.length >= LIMITS.loot) fail('limit', 'That is as many items as the library can hold.'); d.id = nid(s, 'x'); lib.push(d); }
    L(s, a, ctx, 'Saved ' + d.name + ' to the loot library.', { private: true }); return { id: d.id };
  },
  lootDelete(s, c, a, ctx) { const lib = libOf(s), i = lib.findIndex((x) => x.id === c.id); if (i < 0) fail('not_found', 'That item is no longer in the library.'); const [d] = lib.splice(i, 1); L(s, a, ctx, 'Deleted ' + d.name + ' from the loot library.', { private: true }); return {}; },
  lootPlace(s, c, a, ctx) { /* the item goes on the table as a loot card, hidden until the GM reveals it */
    const { d } = lootSource(s, c), card = newCard(s, { kind: 'loot', name: d.name, desc: lootText(d), gmNotes: d.notes, visible: false, loot: clone(d) }, a);
    L(s, a, ctx, 'Put ' + d.name + ' on the table, hidden.', { private: true }); return { id: card.id };
  },
  lootCardEdit(s, c, a, ctx) { const card = cardOf(s, c.cardId); if (!card.loot) fail('invalid', 'That card is not a loot item.'); const d = design(c.item); card.loot = d; card.name = d.name; card.desc = lootText(d); card.gmNotes = d.notes; return {}; },
  lootGive(s, c, a, ctx) { /* the item goes onto the hero's sheet as a copy; if it came from a card, the card leaves the table. Nothing changes unless the sheet can take it. */
    const ch = charOf(s, c.charId), { card, d } = lootSource(s, c), pc = s.cards[ch.cardId], id = nid(s, 'x'), def = SC.makeCustom(Object.assign({}, d, { id }));
    const r = SC.edit(ch, { op: 'add', id, def }, { gm: true }, pc && pc.hp); if (!r.ok) fail('limit', r.why);
    if (card) dropCard(s, card); listAdd(recapOf(s, ctx).found, ch.name + ': ' + def.name);
    L(s, a, ctx, 'The GM gives you ' + def.name + '.', ch.owner ? { only: ch.owner, gmText: 'The GM gives ' + def.name + ' to ' + ch.name + '.' } : { private: true, gmText: 'The GM gives ' + def.name + ' to ' + ch.name + '.' }); return { id };
  },
  monsterAttack(s, c, a, ctx) { /* the GM's: a monster rolls d20 + its attack bonus against a hero's Defence */
    const att = cardOf(s, c.cardId), tgt = cardOf(s, c.targetCardId);
    if (att.kind === 'pc') fail('invalid', 'A hero attacks with its own rolls. Choose a monster.');
    const ch = tgt.kind === 'pc' && tgt.charId && s.chars[tgt.charId], hero = ch && tgt.hp ? ch : fail('invalid', 'Choose a hero to attack.');
    const manual = c.d20 != null && c.d20 !== '', d20 = manual ? int(c.d20, 0) : d(ctx, 20);
    let res; try { res = R.attack({ d20, bonus: att.attack || 0, defence: SC.defence(hero) }); } catch (err) { fail('invalid', err.message); }
    const roll = { id: nid(s, 'r'), by: 'gm', charId: null, charName: att.name, stat: null, check: res, attack: { cardId: att.id }, manual, targetCardId: tgt.id, effort: null, applied: null, void: false, at: ctx.now };
    s.rolls[roll.id] = roll; s.rollOrder.push(roll.id); while (s.rollOrder.length > LIMITS.rolls) delete s.rolls[s.rollOrder.shift()];
    const who = attackerNames(s, roll), hide = numbersHidden(att), line = (n) => n + ' attacks ' + tgt.name + (hide ? (res.hit ? ': hit.' : ': miss.') : ' · ' + R.sayAttack(res)) + (manual ? ' [physical die]' : '');
    L(s, a, ctx, line(who.pub), { kind: 'roll', private: !isPublic(s, tgt), gmText: who.pub !== who.gm || hide ? line(who.gm).replace(/: (hit|miss)\.$/, ' · ' + R.sayAttack(res)) : '', dice: diceOf(manual, 20, d20), diceGm: hide });
    return { rollId: roll.id };
  },
  monsterEffort(s, c, a, ctx) { /* on a hit: the monster's Effort is rolled and goes straight onto the hero's hit points */
    const roll = s.rolls[c.rollId] || fail('not_found', 'That roll is gone.'); if (roll.void) fail('invalid', 'That roll was undone.');
    if (!roll.attack) fail('invalid', 'That was not a monster attack.');
    if (roll.effort || roll.blow) fail('conflict', 'Effort has already been rolled for this attack.');
    if (!roll.check.hit) fail('invalid', 'The attack missed, so there is no Effort to roll.');
    const hero = s.cards[roll.targetCardId] || fail('not_found', 'That hero is no longer on the table.'); if (!hero.hp) fail('invalid', hero.name + ' has no HP tracker.');
    if (isHero(hero) && hero.hp.cur === 0) return blow(s, roll, hero, a, ctx);
    const cat = R.CATS.includes(c.cat) ? c.cat : fail('invalid', 'Choose a kind of Effort.');
    const size = R.settingsOf(s.settings).dice[cat], manual = c.rolled != null && c.rolled !== '', rolled = manual ? int(c.rolled, 0) : d(ctx, size);
    let e; try { e = R.effort({ cat, rolled, bonus: 0, settings: s.settings }); } catch (err) { fail('invalid', err.message); }
    e.manual = manual; roll.effort = e;
    const who = attackerNames(s, roll);
    L(s, a, ctx, who.pub + ' · ' + R.sayEffort(e, 'damage') + (manual ? ' [physical die]' : ''), { kind: 'roll', private: !isPublic(s, hero), gmText: who.pub !== who.gm ? who.gm + ' · ' + R.sayEffort(e, 'damage') + (manual ? ' [physical die]' : '') : '', dice: diceOf(manual, e.die, e.rolled) });
    return applyEffort(s, roll, hero, 'hp', a, ctx);
  },
  dying(s, c, a, ctx) { /* the GM's hand on a hero's countdown: stable after a Tend, hurt again while stable, a round more or less, or the d4 for a hero at 0 who has none */
    const card = cardOf(s, c.cardId); if (!isHero(card)) fail('invalid', 'Choose a hero.');
    if (card.hp.cur !== 0) fail('invalid', card.name + ' is not at 0.');
    const st = card.dying, before = st && clone(st), say = (t) => L(s, a, ctx, t, { kind: card.dying && card.dying.dead ? 'alert' : 'info', effects: [dyingFx(card, before)], private: !isPublic(s, card) });
    if (c.op === 'fall') { if (st) fail('conflict', card.name + ' is already ' + (st.dead ? 'dead.' : st.stable ? 'stable.' : 'dying.')); fall(s, card, ctx); return { dying: card.dying }; }
    if (!st) fail('invalid', card.name + ' is not dying.');
    if (c.op === 'stable') { if (st.dead) fail('invalid', card.name + ' is dead.'); if (st.stable) fail('conflict', card.name + ' is already stable.'); card.dying = Object.assign({}, st, { stable: true }); say(card.name + ' is stable. The countdown stops.'); }
    else if (c.op === 'hurt') { if (!st.stable) fail('conflict', card.name + ' is not stable.'); fall(s, card, ctx, 'is hurt again', before); }
    else if (c.op === 'round') {
      const dl = int(c.d, 0) > 0 ? 1 : -1; card.dying = R.dyingAdjust(st, dl); recapDeath(s, ctx, card);
      if (card.dying.left === st.left && card.dying.dead === st.dead) return { dying: card.dying };
      say('The GM ' + (dl > 0 ? 'gives ' + card.name + ' a round back' : 'takes a round off ' + card.name + '’s countdown') + '. ' + sayDying(card));
    } else fail('invalid', 'Choose stable, hurt or round.');
    return { dying: card.dying };
  },
  rest(s, c, a, ctx) { /* the party rests in a safe place: every living hero recovers a Heart (standing up anyone down), and the Horror falls by a d6 for every two of them. One line, one Undo. */
    const heroes = Object.values(s.cards).filter((card) => isHero(card) && !(card.dying && card.dying.dead));
    if (!heroes.length) fail('invalid', 'There is no living hero to rest.');
    const effects = [], parts = [];
    heroes.forEach((card) => {
      const applied = adjustField(s, card, 'hp', R.REST.heal); if (applied) effects.push(delta(card.id, 'hp', applied));
      let up = ''; if (card.dying && card.hp.cur > 0) { effects.push(dyingFx(card, card.dying)); card.dying = null; up = ', back on their feet'; }
      if (applied) parts.push(card.name + ' +' + applied + ' HP (now ' + card.hp.cur + '/' + card.hp.max + ')' + up);
    });
    const healed = parts.length ? parts.join('; ') + (parts.length < heroes.length ? '; the rest are already at full' : '') + '.' : 'Everyone is already at full health.';
    /* the Horror's dice, rolled where everyone sees them; with the meter at 0 there is nothing to lower, so none are rolled */
    const h = horrorOf(s), n = h.cur > 0 ? R.restDice(heroes.length) : 0, rolled = []; for (let i = 0; i < n; i++) rolled.push(d(ctx, R.REST.horrorDie));
    const total = rolled.reduce((x, y) => x + y, 0), m = R.horrorMove(h.cur, -total); h.cur = m.to; if (h.alert && h.cur < h.alert) h.alert = 0;
    if (m.applied) effects.push({ t: 'horror', d: m.applied });
    const horror = n ? 'Horror ' + n + 'd' + R.REST.horrorDie + ': ' + rolled.join(' + ') + (n > 1 ? ' = ' + total : '') + '. The Horror falls by ' + Math.abs(m.applied) + (Math.abs(m.applied) === total ? '' : ' of ' + total) + ' (now ' + m.to + ').' : 'The Horror is at 0.';
    recapOf(s, ctx).rests += 1;
    const e = L(s, a, ctx, 'The party rests. ' + healed + ' ' + horror, { kind: 'horror', effects, dice: rolled.map((x) => ({ die: R.REST.horrorDie, n: x })) });
    return { log: e.id, horror: h.cur };
  },
  effort(s, c, a, ctx) {
    const roll = s.rolls[c.rollId] || fail('not_found', 'That roll is gone.'); if (roll.void) fail('invalid', 'That roll was undone.');
    if (!isGM(a) && roll.by !== a.pid) fail('forbidden', 'That is not your roll.');
    if (roll.effort && !(isGM(a) && c.force)) fail('conflict', 'Effort has already been rolled for this attempt.');
    if (!roll.check) fail('invalid', 'That Effort has no check to follow.');
    if (!roll.check.success && !(isGM(a) && c.force)) fail('invalid', 'The attempt missed, so there is no Effort to roll.');
    /* After an item, its own kind of Effort is rolled; a natural 20 may still take Ultimate when the table offers it */
    const ult = c.cat === 'ultimate' && roll.check.offerUltimate;
    const ch = charOf(s, roll.charId), cat = roll.cat && !ult ? roll.cat : R.CATS.includes(c.cat) ? c.cat : fail('invalid', 'Choose a kind of Effort.');
    const size = R.settingsOf(s.settings).dice[cat], manual = c.rolled != null && c.rolled !== '', rolled = manual ? int(c.rolled, 0) : d(ctx, size);
    let e; try { e = R.effort({ cat, rolled, bonus: ch.effort[cat], settings: s.settings }); } catch (err) { fail('invalid', err.message); }
    e.manual = manual; roll.effort = e; const tc = roll.targetCardId && s.cards[roll.targetCardId];
    L(s, a, ctx, roll.charName + ' · ' + R.sayEffort(e, tc && tc.hp ? 'damage' : 'Effort') + (manual ? ' [physical die]' : ''), { kind: 'roll', private: !!(tc && !isPublic(s, tc)), dice: diceOf(manual, e.die, e.rolled) });
    return { rollId: roll.id };
  },
  freeEffort(s, c, a, ctx) { /* Effort on its own, with no check before it: a standing blow, a physical roll, a task the GM has already allowed */
    const ch = charOf(s, c.charId); if (!ownsChar(ch, a)) fail('forbidden', 'That is not your character.');
    const cat = R.CATS.includes(c.cat) ? c.cat : fail('invalid', 'Choose a kind of Effort.');
    const size = R.settingsOf(s.settings).dice[cat], manual = c.rolled != null && c.rolled !== '', rolled = manual ? int(c.rolled, 0) : d(ctx, size);
    let e; try { e = R.effort({ cat, rolled, bonus: ch.effort[cat], settings: s.settings }); } catch (err) { fail('invalid', err.message); }
    e.manual = manual;
    const roll = { id: nid(s, 'r'), by: isGM(a) ? 'gm' : a.pid, charId: ch.id, charName: ch.name, stat: null, check: null, manual: false, targetCardId: null, effort: e, applied: null, void: false, at: ctx.now };
    s.rolls[roll.id] = roll; s.rollOrder.push(roll.id); while (s.rollOrder.length > LIMITS.rolls) delete s.rolls[s.rollOrder.shift()];
    L(s, a, ctx, ch.name + ' · ' + R.sayEffort(e) + (manual ? ' [physical die]' : ''), { kind: 'roll', dice: diceOf(manual, e.die, e.rolled) }); return { rollId: roll.id };
  },
  apply(s, c, a, ctx) {
    const roll = s.rolls[c.rollId] || fail('not_found', 'That roll is gone.'); if (roll.void) fail('invalid', 'That roll was undone.');
    if (!isGM(a) && roll.by !== a.pid) fail('forbidden', 'That is not your roll.');
    if (!roll.effort) fail('invalid', 'Roll Effort first.');
    if (roll.applied) fail('conflict', 'That Effort has already been applied. Undo it first to apply it somewhere else.');
    const card = cardOf(s, c.cardId); if (!cardVisibleTo(s, card, a)) fail('not_found', 'No such card.');
    const field = c.field; if (!['hp', 'progress'].includes(field) || !card[field]) fail('invalid', cardName(card) + ' has no ' + (TRACKERS[field] || 'such') + ' tracker.');
    return applyEffort(s, roll, card, field, a, ctx);
  },
  adjust(s, c, a, ctx) { /* a number on the table moved by hand: players only on their own character's HP, the GM on anything */
    const card = cardOf(s, c.cardId); if (!cardVisibleTo(s, card, a)) fail('not_found', 'No such card.');
    const field = c.field || 'hp'; if (!['hp', 'progress'].includes(field)) fail('invalid', 'Choose hp or progress.');
    if (!isGM(a) && !(field === 'hp' && card.charId && s.chars[card.charId] && s.chars[card.charId].owner === a.pid)) fail('forbidden', 'You can only change your own HP.');
    const dl = clamp(int(c.delta, 0), -999, 999); if (field === 'hp') noRaisingTheDead(card, dl);
    const was = card[field] ? card[field].cur : 0, applied = adjustField(s, card, field, dl); if (!applied) return { applied: 0 };
    const e = L(s, a, ctx, card.name + ' ' + label(field) + ' ' + (applied > 0 ? '+' : '') + applied + ' (now ' + card[field].cur + '/' + card[field].max + ').', { effects: [delta(card.id, field, applied)], private: !isPublic(s, card) || numbersHidden(card) });
    if (field === 'hp') settleHero(s, card, was, e, ctx);
    return { applied };
  },
  undo(s, c, a, ctx) {
    const e = s.log.find((x) => x.id === c.logId) || fail('not_found', 'That entry is no longer there.');
    if (e.undone) fail('conflict', 'That has already been undone.');
    if (!e.effects.length) fail('invalid', 'That cannot be undone.');
    if (!isGM(a) && e.by !== a.pid) fail('forbidden', 'You can only undo your own actions.');
    if (!isGM(a) && e.effects.some((fx) => fx.t === 'horror')) fail('forbidden', 'Only the GM can lower the Horror.');
    if (!isGM(a) && e.effects.some((fx) => fx.t === 'turn')) fail('forbidden', 'Only the GM can take a turn back.');   /* a new round also ticks timers and countdowns for everyone */
    if ((e.private || e.only) && !isGM(a) && !e.only) fail('not_found', 'That entry is no longer there.');
    for (const fx of e.effects) {
      if (fx.t === 'turn' && (s.table.idx !== fx.to.idx || s.table.round !== fx.to.round)) fail('conflict', 'The turn has moved on since then, so it cannot be taken back.');
      if ((fx.t === 'delta' || fx.t === 'dying') && !s.cards[fx.card]) fail('conflict', 'That card is gone, so there is nothing to put back.');
    }
    /* Each number moves back by what that action moved it, clamped to its ends. If a later change has already taken it to an end, the part that no longer fits is lost. */
    let short = false, concealed = false;
    for (const fx of e.effects) {
      if (fx.t === 'delta') { const card = s.cards[fx.card]; if (numbersHidden(card)) concealed = true; if (card[fx.field]) { const got = adjustField(s, card, fx.field, -fx.d); if (got !== -fx.d) short = true; } }
      else if (fx.t === 'turn') { s.table.idx = fx.from.idx; s.table.round = fx.from.round; }
      else if (fx.t === 'roll') { const r = s.rolls[fx.roll]; if (r) { r.applied = null; r.blow = false; } }
      else if (fx.t === 'dying') s.cards[fx.card].dying = fx.before ? clone(fx.before) : null;
      else if (fx.t === 'horror') { const h = horrorOf(s), m = R.horrorMove(h.cur, -fx.d); h.cur = m.to; if (m.applied !== -fx.d) short = true; if (h.alert && h.cur < h.alert) h.alert = 0; }
    }
    /* a hero put back above 0 is not dying, whatever the countdown was */
    e.effects.forEach((fx) => { const card = (fx.t === 'delta' || fx.t === 'dying') && s.cards[fx.card]; if (isHero(card) && card.hp.cur > 0) card.dying = null; });
    e.undone = true;
    L(s, a, ctx, 'Undid: ' + e.text + (short && !e.gmText ? ' (part of it no longer fits, so less was put back)' : ''), { private: e.private, only: e.only, gmText: e.gmText ? 'Undid: ' + e.gmText + (short ? ' (part of it no longer fits, so less was put back)' : '') : '' });
    return short && (isGM(a) || !concealed) ? { partial: true } : {}; /* whether a hidden number was at its limit is itself a hidden number */
  },

  draw(s, c, a) {
    if (!Array.isArray(c.pts) || c.pts.length < 2) fail('invalid', 'A line needs two points.');
    const pts = c.pts.slice(0, LIMITS.points).map((p) => [clamp(+p[0], 0, 100), clamp(+p[1], 0, 100)]).filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
    s.draw.push({ id: nid(s, 'd'), by: isGM(a) ? 'gm' : a.pid, color: /^#[0-9a-f]{6}$/i.test(c.color) ? c.color : '#e0b040', pts });
    while (s.draw.length > LIMITS.strokes) s.draw.shift(); drew(s); return {};
  },
  drawUndo(s, c, a) { const who = isGM(a) ? 'gm' : a.pid; for (let i = s.draw.length - 1; i >= 0; i--) if (s.draw[i].by === who) { s.draw.splice(i, 1); drew(s); break; } return {}; },
  drawClear(s) { s.draw = []; drew(s); return {}; },
  point(s, c, a, ctx) { s.pointers[isGM(a) ? 'gm' : a.pid] = { x: clamp(+c.x || 0, 0, 100), y: clamp(+c.y || 0, 0, 100), at: ctx.now, name: a.name }; return {}; }
};

/* A command that moves the turn says which turn the person was looking at. If it has moved since (someone else pressed first), nothing happens, so two clicks on
   the same turn can never advance it twice. */
function expectTurn(s, c) {
  if (c.expect && (c.expect.round !== s.table.round || c.expect.idx !== s.table.idx)) fail('conflict', 'The turn has already moved on.');
}

/* Moving the turn on. A new round (the last place has just finished, or the GM pressed Next round) ticks every automatic timer down by one: see R.tickTimers. */
function advance(s, a, ctx, forceRound) {
  const from = { idx: s.table.idx, round: s.table.round }, effects = [], prev = !forceRound && s.cards[s.table.order[s.table.idx]];
  let to;
  if (forceRound || !s.table.order.length) to = { idx: 0, round: s.table.round + 1, newRound: true }; else to = R.nextTurn(s.table.order.length, s.table.idx, s.table.round);
  Object.values(s.chars).forEach((ch) => { ch.pushPending = false; });   /* a second action not taken by the end of the turn is gone */
  s.table.idx = to.idx; s.table.round = to.round; effects.push({ t: 'turn', from, to: { idx: to.idx, round: to.round } });
  const ticked = [], alerts = [], dying = [];
  if (to.newRound) {
    const cards = Object.values(s.cards).filter((c) => c.timer);
    R.tickTimers(cards.map((c) => c.timer)).forEach((t) => { const c = cards[t.i]; effects.push(delta(c.id, 'timer', -1)); ticked.push(c); if (t.fired) alerts.push(c); });
    /* each dying hero loses a round (a stable or dead one does not); undoing the turn gives it back */
    Object.values(s.cards).filter((c) => isHero(c) && c.hp.cur === 0 && c.dying && !c.dying.stable && !c.dying.dead).forEach((c) => { effects.push(dyingFx(c, c.dying)); c.dying = R.dyingTick(c.dying); recapDeath(s, ctx, c); dying.push(c); });
  }
  const cur = s.cards[s.table.order[s.table.idx]], round = to.newRound ? 'Round ' + s.table.round + '. ' : '';
  /* the line names who finished (End turn) and who is next, each only where the players may see that card; the GM reads both names */
  const pub = (prev && isPublic(s, prev) ? prev.name + ' ends their turn. ' : '') + round + (cur && isPublic(s, cur) ? (cur.name + '’s turn.') : cur ? 'The turn moves on.' : 'No one is in the turn order.');
  const gmLine = (prev ? prev.name + ' ends their turn. ' : '') + round + (cur ? cur.name + '’s turn' + (isPublic(s, cur) ? '.' : ' (hidden).') : 'No one is in the turn order.');
  L(s, a, ctx, pub, { kind: 'turn', effects, gmText: gmLine !== pub ? gmLine : '' });
  /* The alert: public only for a card the players can see and whose numbers are not hidden. Otherwise only the GM is told. */
  dying.forEach((c) => L(s, GM_VOICE, ctx, sayDying(c), { kind: c.dying.dead ? 'alert' : 'info', private: !isPublic(s, c) }));
  alerts.forEach((c) => L(s, { role: 'gm', name: 'GM' }, ctx, 'TIME: ' + c.name + (c.timer.label ? ' (' + c.timer.label + ')' : '') + ' has reached 0.', { kind: 'alert', private: !isPublic(s, c) || numbersHidden(c) }));
  /* what the person who pressed is told: the GM learns which timers moved, a player only the new turn */
  return isGM(a) ? { round: s.table.round, idx: s.table.idx, ticked: ticked.map((c) => c.id), fired: alerts.map((c) => c.id) } : { round: s.table.round, idx: s.table.idx };
}
