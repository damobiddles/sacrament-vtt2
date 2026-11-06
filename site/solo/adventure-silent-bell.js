/* Sacrament RPG solo: the first test scene, "The Silent Bell". Four places, one foe, one find from the real loot table.
   Words only: every number a check, an attack or a find uses comes from the rules (rules.js) and the gear list (gear.js) through engine.js.
   The game is the GM here: it sets the Target, says when a room is dark (Hard without a light), and what a failed check costs.
   Names follow docs/lore/sacrament-lore.md (Part 1 only). */
(function (root) {
  'use strict';
  var ROPES = ['rope', 'hemprope'], BARS = ['crowbar'];

  root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  root.SacramentSoloAdventures['silent-bell'] = {
    id: 'silent-bell',
    title: 'The Silent Bell',
    blurb: 'Wrenholt is a hamlet of nine houses and a chapel. Its bell has not rung for three nights.',
    target: 12,
    start: 'gate',
    intro: function (api) {
      api.say('Dusk, on the pilgrim road. You reach Wrenholt as the light goes: nine houses, shutters closed, and a chapel with a squat bell tower. At this hour the bell should be ringing the vigil. It is not.');
    },
    /* What the game, as GM, makes of the Horror's thresholds. Words only. */
    horror: {
      7: 'Somewhere in the hamlet a dog starts barking, and stops all at once.',
      14: 'Every flame you can see leans the same way, toward you.',
      21: 'You hear your own name, said softly, from a room you have not entered.'
    },
    fall: function () { return 'You fall on the cold stone. The last thing you see is a small flame, bending close. Wrenholt stays silent another night.'; },
    rooms: {
      gate: {
        name: 'The Lychgate', short: 'the lychgate', art: 'gate',
        text: function (api) {
          return 'A roofed gate of black timber, the churchyard behind it. A line of salt runs across the path, broken in one place, as if something stepped over it carefully.'
            + ' A wayshrine stands by the gate with a tin offering box at its foot.' + (api.flag('talked') ? '' : ' In the nearest house a shutter opens a finger\'s width. Someone is watching you.')
        },
        exits: { north: 'nave' },
        actions: [
          { id: 'talk', label: 'Talk to the watcher at the shutter', words: ['talk', 'shutter', 'watcher', 'woman', 'ask'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true);
              api.say('"You\'re not from the Church," says a woman\'s voice. "Good. They\'d only write it down." She will not open the shutter further.');
              api.say('"Brother Odo Pell keeps the bell. Three nights ago he went in to ring the vigil and never came out. Then the candles in the houses started going out on their own. Ring the bell, stranger. Please."', 'npc');
              api.say('Her name, she says, is Tilda Crane. The shutter closes.');
            } },
          { id: 'box', label: 'Search the offering box', words: ['box', 'offering', 'search', 'tin'], when: function (api) { return !api.flag('box'); },
            run: function (api) {
              api.flag('box', true);
              api.say('The lid is wired shut with a twist of copper. You open it. Pilgrims leave what they can spare at a wayshrine, and some of them could spare a great deal.');
              api.loot('What the pilgrims left');
              api.say('Saint Cordula looks down from her niche. She will forgive you, or she will not.');
            } },
          { id: 'rest', label: 'Rest at the wayshrine', words: ['rest', 'pray', 'sleep', 'shrine'], when: function (api) { return !api.s.rested && (api.s.hp.cur < api.s.hp.max || api.s.horror > 0); },
            run: function (api) { api.say('You kneel at the wayshrine with your back to the gate and keep the vigil yourself for a while.'); api.rest(); } }
        ]
      },
      nave: {
        name: 'The Nave', short: 'the nave', art: 'nave',
        text: function (api) {
          return 'Twelve pews and a lectern under one high window. Every candle in the chapel has been eaten down to the iron: no stubs, no drips of wax, just bare black wicks standing in their holders like hairs.'
            + ' The sexton\'s ledger lies open on the lectern.'
            + (api.flag('door') ? ' The tower door stands open.' : ' A low door to the east leads to the tower. It is locked.')
            + ' Steps go down to the crypt; cold air comes up them.';
        },
        exits: {
          south: 'gate',
          east: { to: 'tower', when: function (api) { return api.flag('door'); }, closed: 'The tower door is locked. Brother Odo would have the key.' },
          down: 'crypt'
        },
        actions: [
          { id: 'ledger', label: 'Read the sexton\'s ledger', words: ['ledger', 'read', 'book', 'lectern'], when: function (api) { return !api.flag('ledger'); },
            run: function (api) {
              api.flag('ledger', true);
              api.say('Brother Odo\'s hand is small and careful, then not careful at all.');
              var c = api.check('INT', { what: 'Reading the last pages' });
              if (c.success) {
                api.flag('knows', true);
                api.say('"Candles gone again. It comes up from below for them. It will take a flame from your hand before it takes your hand. Hold the light out, and strike while it feeds."', 'npc');
                api.say('You know how to meet it now: your first attack against it will be Easy.', 'note');
              } else api.say('The last pages are smeared with tallow. You make out only: "...from below. It is always hungry."', 'npc');
            } },
          { id: 'force', label: function (api) { return api.has(BARS) ? 'Lever the tower door with your crowbar' : 'Force the tower door'; }, words: ['force', 'door', 'break', 'kick', 'lever', 'crowbar'], when: function (api) { return !api.flag('door'); },
            run: function (api) {
              var bar = api.has(BARS);
              api.say(bar ? 'You set the crowbar in the jamb.' : 'You put your shoulder to the old oak.');
              var c = api.check('STR', { adj: bar ? 'easy' : 'hard', what: 'Forcing the door' });
              if (c.success) { api.flag('door', true); api.say('The lock tears out of the frame with a noise like a shot. The tower stair is behind it.'); }
              else api.say('The door holds. The noise goes down the crypt steps and does not come back.');
              if (!c.success && !api.flag('beat_eater') && !api.flag('roused')) { api.flag('roused', true); api.say('Something on the crypt stair heard you. It is coming up.', 'foe'); api.fight('eater'); }
            } }
        ]
      },
      crypt: {
        name: 'The Crypt', short: 'the crypt', art: 'crypt', dark: true,
        text: function (api) {
          return 'A low vault. Shelves of old bones in their niches, and on the floor a man in a sexton\'s black, curled on his side.'
            + (api.flag('beat_eater') ? (api.flag('key') ? ' Brother Odo breathes, slow and shallow.' : ' He is breathing.') : ' Something crouches over him.');
        },
        exits: { up: 'nave' },
        enter: function (api) { if (!api.flag('beat_eater') && !api.s.fight) api.fight('eater'); },
        actions: [
          { id: 'odo', label: 'See to Brother Odo', words: ['odo', 'brother', 'sexton', 'man', 'body', 'key'], when: function (api) { return api.flag('beat_eater') && !api.flag('key'); },
            run: function (api) {
              api.flag('key', true);
              api.say('His skin is cold and smooth as wax, but he is alive. His eyes open. "The rope," he whispers. "It ate the rope. The tallow in it." He presses an iron key into your hand: the tower.');
              api.flag('door', true);
              api.say('You now hold the tower key. The tower door is open to you.', 'note');
            } },
          { id: 'hoard', label: 'Search the thing\'s nest', words: ['nest', 'hoard', 'search', 'pile'], when: function (api) { return api.flag('beat_eater') && !api.flag('hoard'); },
            run: function (api) {
              api.flag('hoard', true);
              api.say('In a niche, among the gnawed iron of a hundred candle holders, something it did not eat.');
              api.loot('The nest');
            } }
        ]
      },
      tower: {
        name: 'The Bell Tower', short: 'the bell tower', art: 'tower',
        text: function (api) {
          return 'A ladder, a trapdoor, and the bell: green bronze, older than the chapel. The bell rope has been gnawed through two yards above the floor; the rest hangs out of reach.'
            + (api.has(ROPES) ? ' You have rope.' : '');
        },
        exits: { west: 'nave' },
        actions: [
          { id: 'tie', label: 'Tie your rope to the bell rope', words: ['tie', 'rope', 'knot'], when: function (api) { return !!api.has(ROPES); },
            run: function (api) { var r = api.has(ROPES); api.say('You climb the ladder, knot your ' + r.name.toLowerCase() + ' to the frayed end, and drop it down.'); ring(api); } },
          { id: 'climb', label: 'Climb the frame and ring it by hand', words: ['climb', 'ring', 'bell', 'frame'], when: function (api) { return !api.has(ROPES); },
            run: function (api) {
              var c = api.check('DEX', { what: 'Climbing the bell frame' });
              if (c.success) { api.say('You get your hands on the bell\'s lip and swing it.'); ring(api); }
              else { var n = api.die(4); api.hurt(n, 'You slip and land badly (d4 ' + n + ')'); if (!api.s.over) api.say('The bell sways and is still. You can try again.'); }
            } }
        ]
      }
    },
    foes: {
      eater: {
        name: 'The Candle-Eater', art: 'eater', hp: 12, attack: 2, damage: 6,
        appears: function (api) {
          var f = api.s.fight; if (api.flag('knows')) f.easy = 1;
          return 'It is the size of a starved dog and the colour of tallow. Where its face should be there is a wick, and the wick is lit. ' + (api.lit() ? 'It turns toward your light.' : 'It turns toward the sound of your breathing.');
        },
        hits: 'Soft hands, hot as a candle\'s pool, close on you',
        defeated: 'The Candle-Eater folds in on itself and runs, like wax too near a fire. Its wick gutters and goes out. The vault is very quiet.',
        after: function (api) { if (api.s.room !== 'crypt') api.say('It came up out of the crypt. Whatever it left down there is still below.', 'note'); }
      }
    },
    /* A spell or item with no Effort die: what the game makes of it here. */
    onUse: function (api, src) {
      if (src.id === 'kindle') { api.flag('lit', true); api.say('A small flame stands in your palm. It lights the room around you.', 'note'); return true; }
      return false;
    }
  };

  function ring(api) {
    api.say('The bell speaks. Once, twice, nine times for the vigil, and the sound goes out over the fields to the boundary stones and back.', 'end');
    api.say('In Wrenholt, one by one, candles are lit behind the shutters.');
    api.end('won', 'You rang the silent bell. This is the end of the test scene.');
  }
})(typeof window !== 'undefined' ? window : globalThis);
