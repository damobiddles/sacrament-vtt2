/* Sacrament, Hearts prototype: the game's data. Nothing here touches the live rules (site/character/data.js) or any saved character.
   Items, enemies, characters and the Looming Horror tables are all here so the rules page, the character builder, the table tool and the tests read one source. */
(function () {
  'use strict';
  var root = typeof window !== 'undefined' ? window : globalThis;

  /* Effort dice, smallest to largest. */
  var DICE = [4, 6, 8, 10, 12];

  /* The Target Number a scene sets. The GM says it aloud and writes it where everyone can see it. */
  var SCENES = [
    { tn: 10, name: 'Wary', note: 'A tense place with room to breathe: a quiet crypt, a deserted road.' },
    { tn: 12, name: 'Dangerous', note: 'The usual setting for a fight or a hard task.' },
    { tn: 14, name: 'Deadly', note: 'Something here is far better at this than you are.' },
    { tn: 16, name: 'Doomed', note: 'The Turning has begun. Reserve it for the worst of the night.' }
  ];

  /* Distance bands, near to far. A Move changes your band by one. */
  var BANDS = [
    { id: 'engaged', name: 'Engaged', note: 'Close enough to touch. Blades and fists.' },
    { id: 'close', name: 'Close', note: 'A few strides. Reach weapons, thrown things, a shout.' },
    { id: 'far', name: 'Far', note: 'Across the room. Bows, crossbows and spells.' },
    { id: 'distant', name: 'Distant', note: 'Out of the fight. Leaving the scene from here ends it.' }
  ];

  /* Item kinds: weapon, armour, supply, relic (dangerous, costs Horror to use), grimoire (holds spells).
     use: when it is used: 'Action', 'Move', 'Free' (once per turn), or 'Always' (carried or worn).
     effort: the Effort die it rolls, where it rolls one. horror: the Looming Horror it adds each time it is used.
     Every item lists what it lets you DO; the numbers are the smaller part of it. */
  /* The items and spells are not written here: they live in site/sheet/gear.js, the one file to edit, so the character sheet, the table and this prototype agree.
     That file calls the d8 Effort "guns", as the table does; this prototype's engine calls it "ranged", so the name is changed on the way in. */
  var GEAR = root.SACRAMENT_GEAR; if (!GEAR) throw new Error('Load /sheet/gear.js before /game/data.js.');
  var inName = function (o) { var c = JSON.parse(JSON.stringify(o)); if (c.cat === 'guns') c.cat = 'ranged'; return c; };
  var ITEMS = GEAR.items.concat(GEAR.relics, GEAR.grimoires).map(inName);

  /* The spells, as the Book of Dust and the others hold them. The prototype's Horror cost is paid once, when the casting roll is made. */
  /* Only the spells of books this prototype has (the found grimoires are the table's). A rolled Horror amount ("d4+2") counts here as its average, rounded up: the prototype has no dice for it. */
  var books = {}; ITEMS.forEach(function (i) { books[i.id] = true; });
  var avg = function (v) { var m = /^([1-9]?)d([0-9]+)(?:\+([0-9]+))?$/.exec(String(v)); return m ? Math.ceil((+m[1] || 1) * (+m[2] + 1) / 2 + (+m[3] || 0)) : v; };
  var SPELLS = GEAR.spells.filter(function (s) { return books[s.from]; }).map(inName).map(function (s) { s.horrorText = String(s.horror); s.horror = avg(s.horror); return s; });

  /* The four ready-to-play characters. Six points of stats and four of Effort, as a player would spend them. Every kit fits in the ten slots. */
  var CHARACTERS = [
    { id: 'maren', name: 'Sister Maren', calling: 'Penitent', vow: 'To mend what the Horror breaks.',
      scores: { STR: 1, DEX: 0, CON: 2, INT: 0, WIS: 3, CHA: 0 }, effort: { basic: 0, weapons: 2, ranged: 0, magic: 1, ultimate: 1 }, kit: ['cudgel', 'gambeson', 'litany', 'bandages', 'knucklebone', 'lantern'],
      note: 'The healer. Her prayers and relics keep people standing, and every one of them costs a little of the night.' },
    { id: 'aldric', name: 'Brother Aldric', calling: 'Sworn blade', vow: 'To stand between them and it.',
      scores: { STR: 3, DEX: 0, CON: 2, INT: 0, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 3, ranged: 0, magic: 0, ultimate: 0 }, kit: ['billhook', 'brigandine', 'shield', 'oil', 'rope'],
      note: 'The wall. He takes the foes’ attention, raises his shield over a friend and hooks the dangerous ones into reach.' },
    { id: 'wren', name: 'Wren Ashdown', calling: 'Cartographer', vow: 'To find the way out and come back with it.',
      scores: { STR: 0, DEX: 3, CON: 1, INT: 1, WIS: 1, CHA: 0 }, effort: { basic: 1, weapons: 0, ranged: 3, magic: 0, ultimate: 0 }, kit: ['crossbow', 'gambeson', 'picks', 'rope', 'lantern', 'bandages', 'spirits'],
      note: 'The scout. She shoots from Far, works locks and mechanisms, and reads the room before anyone walks into it.' },
    { id: 'ottoline', name: 'Ottoline Vane', calling: 'Heretic scholar', vow: 'To know it, whatever it costs.',
      scores: { STR: 0, DEX: 1, CON: 1, INT: 3, WIS: 1, CHA: 0 }, effort: { basic: 0, weapons: 0, ranged: 0, magic: 3, ultimate: 1 }, kit: ['hatchet', 'embers', 'dust', 'chain'],
      note: 'The caster. The most power in the party, and the quickest way to wake what is listening.' }
  ];

  /* Enemies. Hearts × 10 is their health. Effort is the die they roll when they hit. defend: the score a hero uses to avoid the blow.
     armoured: a blow against it rolls its Effort one size down (a heavy weapon, a relic or a spell is not slowed). */
  var ENEMIES = [
    { id: 'rats', name: 'Plague rat swarm', hearts: 1, effort: 6, defend: 'CON', moves: 1, armoured: false, note: 'Quick and everywhere. A bitten hero’s next INT check is Hard (+3).' },
    { id: 'penitent', name: 'Gaunt penitent', hearts: 1, effort: 8, defend: 'CON', moves: 1, armoured: false, note: 'Starved, flayed, still devout. Fights without noticing its wounds.' },
    { id: 'hound', name: 'Grave hound', hearts: 1, effort: 8, defend: 'CON', moves: 2, armoured: false, note: 'Crosses two bands in a Move.' },
    { id: 'sexton', name: 'Drowned sexton', hearts: 2, effort: 10, defend: 'CON', moves: 1, armoured: true, unholy: true, note: 'Wet, patient, and wearing a mourner’s iron collar. Unholy.' },
    { id: 'knight', name: 'Relic-bound knight', hearts: 3, effort: 10, defend: 'CON', moves: 1, armoured: true, unholy: true, note: 'A saint’s bone sewn under the plate. Makes two attacks each turn.', attacks: 2 },
    { id: 'bishop', name: 'The Hollow Bishop', hearts: 5, effort: 12, defend: 'WIS', moves: 1, armoured: false, unholy: true, note: 'A boss. Defended against with WIS. Makes one attack each turn, and when it hits, the hero adds 1 Horror.', attacks: 1 }
  ];

  /* The Looming Horror: a shared track from 0 to 21 with three thresholds. Tables are the project's existing aftershock tables, kept where they still
     make sense and adapted where they named parts of the old rules (reactions, boxes of harm, Wounds). 'kept' or 'adapted' says which. */
  var HORROR = { top: 21, thresholds: [9, 15, 21] };
  var AFTERSHOCKS = {
    9: { title: 'The Stirring', intro: 'Something small and wrong. Roll a d6.', rows: [
      { t: 'Cold breath: every character’s next Move this round is lost.', from: 'adapted (was: no reaction next round)' },
      { t: 'A whisper names one character. Their next check is Hard (+3).', from: 'adapted (was −2)' },
      { t: 'The animals panic. The next check to move quietly or to calm anything is Hard (+3).', from: 'kept' },
      { t: 'The dead stir: add one weak adversary, such as a plague rat swarm, to the scene.', from: 'kept' },
      { t: 'Shadows lag: every hurt character takes 2 damage that nothing reduces.', from: 'adapted (was: 1 more harm)' },
      { t: 'A false calm. Nothing happens, but the next aftershock roll is at +1 (a 7 counts as a 6).', from: 'kept' }] },
    15: { title: 'The Turning', intro: 'The land answers. Roll a d6.', rows: [
      { t: 'The ground shakes: every character takes 4 damage that nothing reduces.', from: 'adapted (was: 2 harm)' },
      { t: 'The adversaries swell: each rolls its Effort one size larger until the scene ends (to a maximum of d12).', from: 'adapted (was: 1 extra damage die)' },
      { t: 'The night is troubled: the next rest does not lower the Looming Horror.', from: 'kept' },
      { t: 'The way out closes. Leaving takes a Hard (+3) check, and each failure adds 1 to the Looming Horror.', from: 'kept' },
      { t: 'Reinforcements: the GM adds one adversary of their choice.', from: 'kept' },
      { t: 'The Horror feeds: every spell and relic adds 1 more Horror until the track falls below 15.', from: 'kept' }] },
    21: { title: 'The Arrival', intro: 'Whatever waited has come. Roll a d6.', rows: [
      { t: 'The thing at the bottom of the ladder stands in the room. Bring on the scene’s greatest adversary.', from: 'kept' },
      { t: 'Every character takes 5 damage (half a Heart) that nothing reduces.', from: 'adapted (was: a Wound, 4 harm)' },
      { t: 'No magic can be cast or relic used until the track falls below 21. Nothing is attempted, so nothing is paid.', from: 'adapted (was: all magic fails)' },
      { t: 'The floor opens: each character passes a Hard (+3) DEX check or falls somewhere apart from the rest.', from: 'kept' },
      { t: 'One character is taken. The others find them with a Hard (+3) WIS check or lose them.', from: 'adapted (was Heroic 18)' },
      { t: 'Dawn does not come: the party cannot rest until it leaves this place.', from: 'kept' }] }
  };

  root.HEARTS_DATA = { DICE: DICE, SCENES: SCENES, BANDS: BANDS, ITEMS: ITEMS, SPELLS: SPELLS, CHARACTERS: CHARACTERS, ENEMIES: ENEMIES, HORROR: HORROR, AFTERSHOCKS: AFTERSHOCKS };
})();
