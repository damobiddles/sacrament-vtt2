/* Sacrament RPG solo: what a spell with no Effort die does when the game is the GM.
   At the table the GM reads a story spell (Hush, Kindle, Open Door...) and decides what it does. Alone, the game has to decide, so each such spell is given
   a ruling here, taken from its own words in gear.js. Where a spell's text already names a number (Dazed: its next attack rolls 3 less; +2 Defence until
   your next turn) that number is used as written. Where it does not, the ruling is one of a few small, plain effects, and the adventure says where it applies.
   A spell that nothing in the scene answers is shown as "No use here" and costs nothing, so a hero never spends Horror for nothing.
   These are solo rulings, not rules of the game: the owner may change any of them (docs/solo/README.md).

   kind:
     light  lights a dark place (the dark stops making checks Hard)
     map    learns the shape of a dark place: the dark stops making checks Hard here, though it stays dark
     daze   (fight) the foe's next attack rolls 3 less, as the spell says. undead: only against an undead foe
     guard  (fight) +2 Defence against the foe's next attack, as the spell says
     cover  (fight) the foe cannot see you: its next attack rolls 3 less
     snuff  (fight) puts out ordinary flames: a foe that burns (foe.flame) loses its next attack
     open   opens or brings down the obstacle in this place (obstacle.open)
     learn  learns one true thing: in a fight, how to meet the foe (your next attack is Easy, as the ledger gives); out of one, the place's secret.
            corpse: needs the dead close by (room.dead) */
(function (root) {
  'use strict';
  root.SacramentSoloSpells = {
    kindle: { kind: 'light', also: 'snuff' },
    palecandle: { kind: 'light' },
    echobell: { kind: 'map' },
    judgementclap: { kind: 'daze' },
    sextonbell: { kind: 'daze', undead: true },
    oakenhide: { kind: 'guard' },
    pillarash: { kind: 'cover' },
    snuffcandle: { kind: 'snuff' },
    opendoor: { kind: 'open' },
    psalmruin: { kind: 'open' },
    speak: { kind: 'learn', corpse: true },
    confession: { kind: 'learn', corpse: true },
    countdead: { kind: 'learn', corpse: true },
    watchingpage: { kind: 'learn' }
  };
})(typeof window !== 'undefined' ? window : globalThis);
