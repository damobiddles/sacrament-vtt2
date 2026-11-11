/* Sacrament RPG solo: the first test scene, "The Silent Bell". Four places, one foe, one find from the real loot table.
   Words only: every number a check, an attack or a find uses comes from the rules (rules.js) and the gear list (gear.js) through engine.js.
   The game is the GM here: it sets the Target, says when a room is dark (searching is Hard without a light), and what a failed check costs.
   Names follow docs/lore/sacrament-lore.md (Part 1 only). */
(function (root) {
  'use strict';
  var ROPES = ['rope', 'hemprope'], BARS = ['crowbar'];

  root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  root.SacramentSoloAdventures['silent-bell'] = {
    id: 'silent-bell', act: 'middle', lean: 'any', tease: 'A village where the bell has stopped ringing.',
    title: 'The Silent Bell',
    blurb: 'Wrenholt is a hamlet of nine houses and a chapel. Its bell has not rung for three nights.',
    target: 12,
    start: 'gate',
    intro: function (api) {
      api.say('Dusk. You reach Wrenholt as the light goes: nine houses, shutters closed, and a chapel with a squat bell tower. At this hour the bell should be ringing the vigil. It is not.');
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
        secret: 'Under the wayshrine\'s stone lip someone has scratched a tally of nights: three, each one crossed with a little flame. Tilda has been counting too.',
        actions: [
          { id: 'talk', label: 'Talk to the watcher at the shutter', words: ['talk', 'shutter', 'watcher', 'woman', 'ask'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true);
              api.say('"You\'re not from the Church," says a woman\'s voice. "Good. They\'d only write it down." She will not open the shutter further.');
              api.say('"Brother Odo Pell keeps the bell. Three nights ago he went in to ring the vigil and never came out. Then the candles in the houses started going out on their own. Ring the bell, stranger. Please."', 'npc');
              if (api.charge() === 'missing') api.say('"A sister in grey? She went by at noon, walking fast, with her eyes shut. Toward the boundary."', 'npc');
              if (api.charge() === 'relic') api.say('"The shrine at the Cross? Robbed, they say. The boundary\'s thin there now. I would not go."', 'npc');
              if (api.charge() === 'warrant') api.say('"A deacon? He rode through yesterday without stopping, with a book open on the saddle in front of him. Toward the boundary."', 'npc');
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
        secret: 'Wax has been scraped from the floor in long strokes, all leading to the crypt steps. Whatever ate the candles carried nothing away: it ate where it stood, and went back down.',
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
              var c = api.work('door', { adj: bar ? 'easy' : 'normal', what: 'Forcing the door' });
              if (c.success && !api.flag('door')) api.say('The wood groans and gives a little. Not yet.');
              else if (!c.success) api.say('The door holds. The noise goes down the crypt steps and does not come back.');
            } }
        ]
      },
      crypt: {
        name: 'The Crypt', short: 'the crypt', art: 'crypt', dark: true,
        text: function (api) {
          return 'A low vault. Shelves of old bones in their niches, and on the floor a man in a sexton\'s black, curled on his side.'
            + (api.flag('odo_dead') ? ' He is not breathing.' : api.flag('beat_eater') ? (api.flag('key') ? ' Brother Odo breathes, slow and shallow.' : ' He is breathing.') : ' Something crouches over him, feeding.');
        },
        exits: { up: 'nave' },
        dead: true,
        secret: 'The old bones answer in dry whispers. Three nights ago the sexton came down with a lit candle, and it was the candle it wanted first. It still wants light more than it wants you.',
        enter: function (api) { if (!api.flag('beat_eater') && !api.s.fight) { api.fight('eater'); if (!api.flag('odo_dead')) { api.timer('odo', 'start'); api.say('Brother Odo is still alive under it. Each round it feeds, he has less breath left.', 'note'); } } },
        actions: [
          { id: 'odo', label: function (api) { return api.flag('odo_dead') ? 'Take the key from Brother Odo\'s hand' : 'See to Brother Odo'; }, words: ['odo', 'brother', 'sexton', 'man', 'body', 'key'], when: function (api) { return api.flag('beat_eater') && !api.flag('key'); },
            run: function (api) {
              api.flag('key', true);
              if (api.flag('odo_dead')) { api.say('His hand is cold and smooth as wax. In it, an iron key: the tower. You close his eyes.'); api.flag('door', true); api.say('You now hold the tower key. The tower door is open to you.', 'note'); return; }
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
        card: 'The size of a starved dog and the colour of tallow, with a lit wick where its face should be. It eats light: candles first, then the warmth of the living.',
        flame: true,
        snuffed: 'Its wick gutters and goes out. It gropes for you blind and does not attack this turn, until the wick lights itself again.',
        weakness: 'The dead remember how it fed on them: it will take a flame from your hand before it takes your hand. Hold the light out, and strike while it feeds.',
        defeated: 'The Candle-Eater folds in on itself and runs, like wax too near a fire. Its wick gutters and goes out. The vault is very quiet.',
        after: function (api) { api.timer('odo', 'stop'); if (api.s.room !== 'crypt') api.say('It came up out of the crypt. Whatever it left down there is still below.', 'note'); }
      }
    },
    /* Obstacles: cards with an Effort bar, as at the table. */
    obstacles: {
      door: { name: 'The tower door', room: 'nave', max: 6, stat: 'STR', cat: 'basic', tool: { weapons: true, items: ['crowbar', 'spikes', 'spikesmallet'], gun: true }, open: true, answers: { silence: 'Your blows on the door make no sound at all. You can put your shoulder into it without fear.', move: 'You step into the shadow by the font and out of the shadow behind the door, and lift the bar from inside.' },
        text: 'Old oak and an iron lock. Force it (STR, Basic Effort; Easy with a crowbar), or lift it off its old hinges (INT, once, Easy: half of what is left). Fill the bar and the door gives. A failed try is loud.',
        ways: [
          { id: 'hinges', kind: 'trick', label: 'Lift the door off its old hinges', stat: 'INT', say: 'The hinges are older than the lock. You look for the pins.', what: 'Working the hinges', failSay: 'The pins are rusted solid.' }
        ],
        clock: 'noise',
        opened: 'The lock tears out of the frame with a noise like a shot.',
        isDone: function (api) { return !!api.flag('door'); },
        done: function (api) { if (!api.flag('door')) { api.flag('door', true); api.say('The tower door stands open. The stair is behind it.'); } } }
    },
    /* Timers: they lose 1 at the start of each new round while they run, as at the table. */
    timers: {
      noise: { name: 'The noise', room: 'nave', max: 1, tick: 'fail',
        text: 'The chapel is very quiet. One failed try at the tower door is loud enough to be heard on the crypt stair.',
        out: function (api) { if (api.flag('beat_eater') || api.s.fight) return; api.flag('roused', true); api.say('Something on the crypt stair heard you. It is coming up.', 'foe'); api.fight('eater'); } },
      odo: { name: 'Brother Odo\'s breath', room: 'crypt', max: 5,
        text: 'The Candle-Eater is feeding on Brother Odo. He loses a breath at the start of each new round. Kill it, or stop it eating, before it reaches 0.',
        out: function (api) {
          api.flag('odo_dead', true);
          api.say('Under the Candle-Eater, Brother Odo lets out one long breath and does not take another.', 'hurt');
          if (api.s.fight) api.foeHeal(4, 'It has fed. The Candle-Eater swells');
        } }
    },
    /* Spells this scene answers in its own way, before the tags in the gear list. */
    spells: {
      waxmouth: function (api) {
        var t = api.s.timers && api.s.timers.odo; if (!api.s.fight || !t || !t.on) return null;
        return { run: function () { api.timer('odo', 'stop'); api.say('Wax wells up over the wick-mouth and seals it. It cannot eat. Under it, Brother Odo draws a breath, and then another.', 'win'); } };
      }
    }
  };

  function ring(api) {
    api.say('The bell speaks. Once, twice, nine times for the vigil, and the sound goes out over the fields to the boundary stones and back.', 'end');
    api.say('In Wrenholt, one by one, candles are lit behind the shutters.' + (api.flag('odo_dead') ? ' Down in the crypt, Brother Odo does not hear it.' : ' Down in the crypt, Brother Odo hears it, and weeps.'));
    api.end('won', 'You rang the silent bell, and Wrenholt will sleep tonight.');
  }
})(typeof window !== 'undefined' ? window : globalThis);
