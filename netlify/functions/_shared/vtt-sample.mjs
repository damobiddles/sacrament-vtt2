// The sample encounter a new room starts with: one scene, an enemy, a sealed gate (a task with progress), a countdown, and a loot card the GM can reveal.
// It is ordinary cards and characters made with the same functions the GM uses, nothing special-cased.
import { apply, addCharacter } from './vtt-core.mjs';

let n = 0;

export function addSample(s, ctx) {
  const gm = { role: 'gm' };
  s.scenes.sc1.name = 'The Sealed Gate'; s.scenes.sc1.bg = '/vtt/stone.webp';
  s.table.target = 12;
  addCharacter(s, { name: 'Thorne', x: 22, y: 70, stats: { STR: 3, DEX: 0, CON: 2, INT: 0, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 3, guns: 0, magic: 0, ultimate: 0 }, armour: 2,
    desc: 'A road-worn sellsword. Mail coat, notched axe.' });
  addCharacter(s, { name: 'Wisp', x: 34, y: 78, stats: { STR: 0, DEX: 2, CON: 1, INT: 3, WIS: 0, CHA: 0 }, effort: { basic: 1, weapons: 0, guns: 1, magic: 2, ultimate: 0 }, armour: 0,
    desc: 'A thin scholar with ash on her fingers and a satchel of chalk.' });
  addCharacter(s, { name: 'Brother Anselm Vey', x: 17, y: 55, stats: { STR: 0, DEX: 0, CON: 1, INT: 0, WIS: 3, CHA: 2 }, effort: { basic: 1, weapons: 1, guns: 0, magic: 2, ultimate: 0 }, armour: 1,
    desc: 'A lapsed brother of the Seventh Bell. Still prays, mostly from habit.' });
  addCharacter(s, { name: 'Tilda the Ratcatcher', x: 47, y: 74, stats: { STR: 1, DEX: 3, CON: 1, INT: 1, WIS: 0, CHA: 0 }, effort: { basic: 1, weapons: 2, guns: 1, magic: 0, ultimate: 0 }, armour: 0,
    desc: 'Long knife, short temper, and a sack that moves.' });
  /* each hero carries what their description names, so the sample shows the item-first attack ("What are you using on …?") from the first click */
  const gear = { 'Thorne': [{ id: 'hatchet', eq: true }], 'Wisp': [{ id: 'embers', eq: true }, { id: 'chalk', eq: false }], 'Brother Anselm Vey': [{ id: 'cudgel', eq: true }, { id: 'beads', eq: false }], 'Tilda the Ratcatcher': [{ id: 'knife', eq: true }, { id: 'sling', eq: true }] };
  Object.values(s.chars).forEach((ch) => { if (gear[ch.name]) ch.gear = gear[ch.name]; });
  const run = (cmd) => apply(s, Object.assign({ actionId: 'sample.' + (++n) }, cmd), gm, ctx).result;
  const make = (card) => run({ type: 'cardCreate', card }).id;
  const gate = make({ name: 'The Sealed Gate', kind: 'card', x: 62, y: 30, w: 20, h: 26, desc: 'Iron-banded oak, three paces wide, sealed from the other side. Something heavy is wedged behind it.',
    progress: { cur: 0, max: 20, label: 'Effort' }, gmNotes: 'SECRET: a rusted bar behind the gate, 2 Hearts of Effort. A hero who looks through the keyhole (WIS) sees the bar and the stairs beyond. The ghoul will not follow past the gate.' });
  const ghoul = make({ name: 'Pit Ghoul', kind: 'token', x: 46, y: 36, w: 9, h: 9, desc: 'Grey, wet, hungry. It drags itself from the pit.', hp: { cur: 20, max: 20 }, gmNotes: 'SECRET: bright light makes it hesitate (it attacks last in the round). Carries a bone whistle.' });
  const clock = make({ name: 'The Ceiling Groans', kind: 'card', x: 84, y: 66, w: 14, h: 18, desc: 'Dust sifts from the vault above. When the sound stops, the roof comes down.', timer: { cur: 4, max: 4, auto: true, label: 'The roof fails' }, gmNotes: 'When this reaches 0, the roof collapses on the front half of the room: describe it, then choose what it costs.' });
  make({ name: 'Warden’s Bell', kind: 'loot', x: 20, y: 25, w: 13, h: 17, visible: false, desc: 'A hand bell of black iron. Anyone who rings it can be heard on the far side of the gate.', gmNotes: 'Loot: reveal when the ghoul is down, or give it straight to whoever searches the bones.' });
  const order = Object.values(s.cards).filter((c) => c.kind === 'pc').map((c) => c.id).concat([ghoul]);
  run({ type: 'orderSet', order });
  const second = run({ type: 'sceneCreate', name: 'Beyond the Gate' }).id;
  void gate; void clock; void second;
  s.log.length = 0; s.clients = {}; s.applied = {}; s.appliedOrder = []; // a clean feed and no history to start with
  return s;
}
