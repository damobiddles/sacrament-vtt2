/* Sacrament RPG solo: a wider Pilgrim Road (owner, 2026-11-10: "more opening scenes ... make the game wider ... more outcomes and more beginnings, and
   more opportunities to use some of the loot"). Three more openings, one for each reason to be on the road, so the same charge can begin in a different
   place, and three more middle scenes. Every scene has things that only the right gear opens up: a choice that shows when the hero carries the item
   (marked "Useful here"), as well as the spell and item tags.
   Words only, as in road.js: every number comes from the rules and the gear list through engine.js. Foes' numbers are the game's own, as a GM sets a
   monster's; Easy, Hard and a foe that starts hurt are the GM's calls, as in the other scenes. Names follow docs/lore/sacrament-lore.md (Part 1 and the
   naming guide only). The charges stay the same story wherever they begin: Saint Dunstan's Rib for the robbed shrine at Saint Aubrel's Cross, Sister
   Ignatia Vesper of the Seventh Bell walking in her sleep toward the boundary, and Deacon Nikolas Brand with the Unsealed Canticles. */
(function (root) {
  'use strict';
  var A = root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  var told = function (api, t) { return t[api.charge()] || t.missing; };
  var hurt = function (api) { return api.s.hp.cur < api.s.hp.max || api.s.horror > 0; };
  var ROPES = ['rope', 'hemprope', 'climbline'], FIRE = ['tinder', 'flintsteel', 'lantern', 'candles', 'stubs'], WATER = ['waterskins', 'winesk', 'ladlepot'];
  var COIN = ['purse', 'garnets', 'silverclasp', 'enamelbrooch', 'amberbeads', 'silverthimble'], PAPERS = ['safepassage', 'signet', 'warrant', 'guildseal', 'bordercharter'];

  /* ---------- an opening for the relic: the Prior's courier, hurt and hiding in a wayside chapel ---------- */
  A.courier = {
    id: 'courier', act: 'opening', gives: 'relic', title: 'The Courier\'s Chapel', target: 11, start: 'chapel',
    intro: function (api) { api.say('Thornwick, a day out from Hollowmere Priory. At dusk the road passes the wayside chapel of Saint Hildreth, and its door is barred from the inside. Someone in there is praying, badly, between his teeth.'); },
    fall: function () { return 'Brother Lucan prays over you until his voice gives out. In the morning the hound has gone, and so has the lead box.'; },
    obstacles: {
      ladder: { name: 'The loft ladder', room: 'chapel', max: 5, stat: 'STR', cat: 'basic', answers: { move: 'You are up among the beams without touching a rung.', bind: 'The ladder stops shaking and holds as if it were nailed to the wall.' },
        text: 'A ladder to the bell-loft with half its rungs gone. Climb what is left (STR, Basic Effort; Easy with a rope or climbing line thrown over a beam), go up it fast (DEX, Weapons Effort, but a fall hurts), or work out which rungs still hold (INT, once: half of what is left). Each failed try is loud, and something outside is listening.',
        clock: 'prowl',
        ways: [
          { id: 'scramble', kind: 'bold', label: 'Go up the ladder fast', stat: 'DEX', say: 'You take the ladder at a run, two rungs at a time.', what: 'Going up fast', failSay: 'A rung snaps and you come down on the flagstones' },
          { id: 'rungs', kind: 'trick', label: 'Work out which rungs still hold', stat: 'INT', say: 'You test each rung with your hand before you trust it with your weight.', what: 'Testing the rungs', failSay: 'They all look as rotten as each other.' }
        ],
        isDone: function (api) { return !!api.flag('climbed'); },
        done: function (api) { api.flag('climbed', true); api.say('You haul yourself through the trapdoor into the bell-loft.'); } }
    },
    timers: {
      prowl: { name: 'Something outside', room: 'chapel', max: 3, tick: 'fail',
        text: 'Something is walking round the chapel walls. It loses 1 each failed try at the ladder. At 0 it comes in through the vestry window.',
        out: function (api) { if (api.flag('beat_hound') || api.s.fight) return; api.say('Glass breaks in the vestry. A black dog the size of a calf comes through the window and drops onto the flagstones without a sound.', 'foe'); api.fight('hound'); } }
    },
    rooms: {
      chapel: {
        name: 'Saint Hildreth\'s Chapel', short: 'the chapel', art: 'wayside',
        text: function (api) {
          return 'A chapel no bigger than a byre: four benches, a painted saint, a ladder to the bell-loft.'
            + (api.flag('talked') ? ' Brother Lucan Wick lies on the altar step with his leg' + (api.flag('tended') ? ' bound.' : ' torn open.') : ' On the altar step lies a young brother in the priory\'s black, his leg torn open, a candle in each fist.')
            + (api.flag('beat_hound') ? ' The thing that walked round the walls lies by the vestry door.' : ' Outside, something walks round the walls, and stops, and walks again.');
        },
        secret: 'The painted saint remembers every prayer said under her. Tonight\'s are all the same: that the dog outside will not find the window in the vestry.',
        exits: { up: { to: 'loft', when: function (api) { return api.flag('climbed'); }, closed: 'The ladder is missing half its rungs. Climb it first.' } },
        actions: [
          { id: 'lucan', label: 'Speak with the hurt brother', words: ['speak', 'talk', 'brother', 'lucan'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true);
              api.say('"Brother Lucan Wick, of Hollowmere," he says. "The Prior sent me to Saint Aubrel\'s Cross with a relic for the shrine, and something has followed me since the wood. A dog. It is not a dog."', 'npc');
              api.say('"I hid the box in the bell-loft, where it cannot climb. I cannot climb either, now. Take it on for me. Saint Dunstan\'s Rib, in a lead box. Set it in the niche at the Cross, and do not open the box before."', 'npc');
              api.say('Fetch Saint Dunstan\'s Rib from the bell-loft, and carry it to the shrine at Saint Aubrel\'s Cross.', 'note');
            } },
          { id: 'tend', label: 'Bind Brother Lucan\'s leg with your bandages', item: 'bandages', words: ['bind', 'bandage', 'tend', 'leg'], when: function (api) { return api.flag('talked') && !api.flag('tended') && !api.s.fight && !!api.has('bandages'); },
            run: function (api) {
              api.flag('tended', true); api.spend('bandages', 'You use up');
              api.say('He bites on his sleeve while you bind it. Afterwards he presses something into your hand. "The Prior gave me this for the road. You need it more than I do now."', 'npc');
              api.loot('Brother Lucan\'s thanks');
            } },
          { id: 'spirits', label: 'Give Brother Lucan your aqua vitae', item: 'spirits', words: ['spirits', 'drink', 'aqua', 'vitae'], when: function (api) { return api.flag('talked') && !api.flag('dogwise') && !api.flag('beat_hound') && !!api.has('spirits'); },
            run: function (api) {
              api.flag('dogwise', true); api.spend('spirits', 'You hand over');
              api.say('He drinks half of it and the colour comes back into his face. "It came at me twice in the wood," he says. "Both times it went for my left side, the side the lamp was not. Keep the light on your left."', 'npc');
              api.say('You know how the hound will come at you: your first attack against it will be Easy.', 'note');
            } },
          { id: 'climb', label: 'Climb the ladder', words: ['climb', 'ladder', 'up', 'loft'], when: function (api) { return api.flag('talked') && !api.flag('climbed') && !api.s.fight; },
            run: function (api) {
              var rope = api.has(ROPES);
              api.say(rope ? 'You throw your ' + rope.name.toLowerCase() + ' over a beam and climb with it taking half your weight.' : 'You go up the ladder rung by rung.');
              if (rope) api.used(rope.name);
              var c = api.work('ladder', { adj: rope ? 'easy' : 'normal', what: 'Climbing the ladder' });
              if (!c.success) api.say('A rung goes under your foot with a crack like a shot. Outside, the walking stops.');
              else if (!api.flag('climbed')) api.say('You get a little higher.');
            } },
          { id: 'door', label: 'Unbar the door and face what is outside', words: ['door', 'unbar', 'face', 'fight', 'outside'], when: function (api) { return api.flag('box') && !api.flag('beat_hound') && !api.s.fight; },
            run: function (api) { api.say('You lift the bar and open the door on the dark. It is waiting on the step.'); api.fight('hound'); } },
          { id: 'window', label: 'Slip out by the vestry window', words: ['slip', 'window', 'vestry', 'sneak'], when: function (api) { return api.flag('box') && !api.flag('beat_hound') && !api.flag('tried_window') && !api.s.fight; },
            run: function (api) {
              api.flag('tried_window', true); api.say('You wait until the walking is on the far side of the chapel, and go out through the vestry window with the box inside your coat.');
              var c = api.check('DEX', { what: 'Slipping out unheard' });
              if (c.success) api.end('won', 'You are a mile down the road before you hear it howl behind you, once, at the chapel door. Brother Lucan has his candles. You have the Rib.');
              else { api.say('Your foot finds a slate in the dark, and it cracks. The walking stops, and then it is running.'); api.fight('hound'); }
            } },
          { id: 'rest', label: 'Sleep with your back to the altar', words: ['rest', 'sleep', 'altar'], when: function (api) { return api.flag('talked') && !api.s.rested && !api.s.fight && hurt(api); },
            run: function (api) { api.say('Brother Lucan keeps the candles lit. You sleep, a little, between the times it stops walking.'); api.rest(); } },
          { id: 'go', label: 'Set out on the road', words: ['set', 'out', 'leave', 'road', 'go'], when: function (api) { return api.flag('box') && api.flag('beat_hound') && !api.s.fight; },
            run: function (api) { api.end('won', 'You leave Brother Lucan with the door barred and both candles lit, and walk on toward the boundary with the lead box against your chest.'); } }
        ]
      },
      loft: {
        name: 'The Bell-Loft', short: 'the bell-loft', art: 'tower', dark: true,
        text: function (api) { return 'A cracked bell on a worm-eaten frame, pigeon dirt a hand deep, and the cold coming through the louvres.' + (api.flag('box') ? '' : ' Wedged behind the bell frame, a lead box the size of a missal.'); },
        secret: 'The bell remembers being rung for the dead of Thornwick, every one, in the plague year. It would like to be rung again. It will not get its wish tonight.',
        exits: { down: 'chapel' },
        actions: [
          { id: 'box', label: 'Take the lead box', words: ['take', 'box', 'lead', 'rib', 'relic'], when: function (api) { return !api.flag('box'); },
            run: function (api) {
              api.flag('box', true); api.story('relic', true);
              api.say('It is heavier than it looks, and cold, and you do not open it.');
              api.say('You carry Saint Dunstan\'s Rib, in a lead box. Bring it to the shrine at Saint Aubrel\'s Cross.', 'note');
            } },
          { id: 'nest', label: 'Search the pigeon dirt', words: ['search', 'dirt', 'nest', 'pigeons'], when: function (api) { return !api.flag('nest'); },
            run: function (api) {
              api.flag('nest', true);
              var c = api.check('WIS', { what: 'Searching the loft' });
              if (c.success) { api.say('Under the dirt, where a bell-ringer dropped it a hundred years ago, something worth the dirt on your hands.'); api.loot('The bell-loft'); }
              else api.say('Pigeon dirt, all the way down.');
            } }
        ]
      }
    },
    foes: {
      hound: { name: 'The Lych Hound', art: 'hound', hp: 10, attack: 1, damage: 4, beast: true,
        card: 'A black dog the size of a calf, that walks round churches at night and does not bark. It has followed Brother Lucan since the wood.',
        appears: function (api) {
          var f = api.s.fight, out = 'It comes across the flagstones low and quick, without a sound, its eyes the colour of the candle flames.';
          if (api.flag('dogwise')) { f.easy = (f.easy || 0) + 1; out += ' It goes for your left side, as Brother Lucan said. You are ready: your first attack is Easy.'; }
          return out;
        },
        hits: 'Its teeth close on your forearm and shake',
        defeated: 'It lies down by the vestry door as if it were only tired, and when you look again there is nothing there but a wet mark on the flagstones.',
        weakness: 'The painted saint has seen it before: it never comes at the side the light is on. Hold your light on the other side and wait for it.' }
    }
  };

  /* ---------- an opening for the missing sister: her own house, and her locked cell ---------- */
  A.convent = {
    id: 'convent', act: 'opening', gives: 'missing', title: 'The House of the Seventh Bell', target: 11, start: 'garth',
    intro: function (api) { api.say('Vesperholt, the house of the Sisters of the Seventh Bell, an hour before Compline. The portress lets you in without a word, and locks the gate behind you.'); },
    fall: function () { return 'The sisters lay you out in the chapter house and ring the seventh bell for you, which is a great honour, and no use.'; },
    obstacles: {
      cell: { name: 'Sister Ignatia\'s door', room: 'dorter', max: 5, stat: 'STR', cat: 'basic', open: true, opened: 'The bolt draws back on its own, slowly, as if someone on the other side had decided to let you in.',
        answers: { move: 'You are standing in the cell without having opened the door.', bind: 'The bolt stops trembling in its staples, and the next push nearly has it.' },
        text: 'An oak door bolted from the inside, though the cell is empty. Force it (STR, Basic Effort; Easy with a crowbar), throw your weight at it (STR, Weapons Effort, but a failure hurts), or lift the bolt with a blade through the gap (DEX, once: half of what is left). Each failed try is loud in the quiet house; when the night bell rings, every try is Hard.',
        clock: 'compline', hard: function (api) { return !!api.flag('rung'); },
        ways: [
          { id: 'shoulder', kind: 'bold', label: 'Throw your weight at the door', stat: 'STR', say: 'You put your shoulder into the door, hard.', what: 'Shouldering the door', failSay: 'The door does not care, and your shoulder does' },
          { id: 'blade', kind: 'trick', label: 'Lift the bolt with a blade through the gap', stat: 'DEX', say: 'You slide a blade into the gap by the bolt and feel for it.', what: 'Lifting the bolt', failSay: 'The blade slips off the bolt every time.' }
        ],
        isDone: function (api) { return !!api.flag('opened'); },
        done: function (api) { api.flag('opened', true); api.say('The door swings in on a cold cell and an open shutter.'); } }
    },
    timers: {
      compline: { name: 'The night bell', room: 'dorter', max: 3, tick: 'fail',
        text: 'The house is very quiet. It loses 1 each failed try at the door. At 0 the seventh bell rings by itself, and every try at the door is Hard.',
        out: function (api) { api.flag('rung', true); api.say('Up in the tower the seventh bell rings once, though nobody is in the tower. Along the dorter, behind every door, the sisters start to pray.', 'horror'); api.horror(1, 'Nobody rang it.'); } }
    },
    rooms: {
      garth: {
        name: 'The Garth', short: 'the garth', art: 'cloister',
        text: function (api) { return 'A square of cut grass inside four cloister walks, and the bell tower over it with its seven bells.' + (api.flag('talked') ? ' Mother Cordula Marrow waits under the arches.' : ' An old nun in a black veil, Mother Cordula Marrow, the abbess, is waiting for you under the arches.') + ' A stair leads up to the dorter.'; },
        secret: 'The grass remembers the feet that crossed it three nights ago: bare, walking straight, never once on the path. Then the gate, which was locked, and was not.',
        exits: { up: { to: 'dorter', when: function (api) { return api.flag('talked'); }, closed: 'Mother Cordula is waiting for you.' } },
        actions: [
          { id: 'abbess', label: 'Speak with Mother Cordula', words: ['speak', 'talk', 'abbess', 'mother', 'cordula'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true); api.story('missing', true); api.story('convent', true);
              api.say('"Sister Ignatia Vesper," she says. "Three nights ago she rose at Matins and walked out of the gate, which was locked, and down the pilgrim road. Her eyes were shut. She was singing a song her mother used to sing. Her mother is ten years in the ground."', 'npc');
              api.say('"Find her before the road does. I would go myself, but I am seventy, and the house needs me more than she does. God forgive me."', 'npc');
              api.say('You set out to find Sister Ignatia before the road takes her.', 'note');
              api.say('"Her cell is bolted on the inside," Mother Cordula adds. "None of my sisters will open it. Perhaps you will."', 'npc');
            } },
          { id: 'rest', label: 'Sleep in the guest house', words: ['rest', 'sleep', 'guest'], when: function (api) { return api.flag('talked') && !api.s.rested && hurt(api); },
            run: function (api) { api.say('A straw bed and the bells telling the hours. You sleep through every one.'); api.rest(); } },
          { id: 'go', label: 'Set out on the road', words: ['set', 'out', 'leave', 'road', 'go'], when: function (api) { return api.flag('talked'); },
            run: function (api) { api.end('won', 'The portress unlocks the gate for you and locks it again behind you. Down the hill the pilgrim road runs toward the boundary, pale in the dark.'); } }
        ]
      },
      dorter: {
        name: 'The Dorter', short: 'the dorter', art: 'dorter', dark: true,
        text: function (api) { return 'A long whitewashed passage of cells, a door every six feet, a candle-niche between each pair, all of them dark.' + (api.flag('opened') ? ' Sister Ignatia\'s door stands open at the end.' : ' The door at the end is Sister Ignatia\'s, and it is bolted.'); },
        secret: 'The cells remember every sister who has slept in them. One of them has been dreaming the same dream for three weeks: a woman singing at the edge of black water, out past the stones.',
        exits: { down: 'garth', west: { to: 'cell', when: function (api) { return api.flag('opened'); }, closed: 'Sister Ignatia\'s door is bolted.' } },
        actions: [
          { id: 'force', label: 'Force the door', words: ['force', 'door', 'open', 'push'], when: function (api) { return !api.flag('opened'); },
            run: function (api) {
              var bar = api.has('crowbar');
              api.say(bar ? 'You set your crowbar in the gap by the bolt and lean on it.' : 'You set your hands to the door and push.');
              if (bar) api.used(bar.name);
              var c = api.work('cell', { adj: bar ? 'easy' : 'normal', what: 'Forcing the door' });
              if (!c.success) api.say('The noise goes down the passage and comes back. Behind the other doors, nobody stirs, very carefully.');
              else if (!api.flag('opened')) api.say('Something gives in the frame. Not enough.');
            } },
          { id: 'keys', label: 'Try the hospice key ring on her door', item: 'hospicekeys', words: ['keys', 'key', 'ring'], when: function (api) { return !api.flag('opened') && !api.flag('keys') && !!api.has('hospicekeys'); },
            run: function (api) {
              api.flag('keys', true); api.say('A hospice and a convent buy their locks from the same smith. The fourth key you try fits the outer plate, and with it you can reach the bolt.');
              api.clear('cell', 'The bolt slides back with a sigh.');
            } }
        ]
      },
      cell: {
        name: 'Sister Ignatia\'s Cell', short: 'her cell', art: 'dorter', dark: true,
        text: function (api) { return 'A cot, a stool, a crucifix turned to face the wall. The shutter stands open on the night.' + (api.flag('letters') ? '' : ' On the cot lies a bundle of letters tied with grey thread.'); },
        secret: 'The crucifix was turned to the wall by her own hand, gently, so that it would not have to watch.',
        exits: { east: 'dorter' },
        actions: [
          { id: 'letters', label: 'Read her letters', words: ['read', 'letters', 'bundle'], when: function (api) { return !api.flag('letters'); },
            run: function (api) {
              api.flag('letters', true); api.say('Every letter is to her mother, and none was ever sent.');
              var c = api.check('INT', { what: 'Reading the letters' });
              if (c.success) { api.story('tracks', true); api.say('In each one she says where she will go when her mother calls: out past the stones, where the water is, and that she will walk in on her mother\'s left so as not to tread on her hem. You will know her when you find her.'); api.say('You know how she will move: your first attack in the last scene will be Easy.', 'note'); }
              else api.say('Her hand gets smaller and smaller toward the end, until you cannot read it at all.');
            } },
          { id: 'search', label: 'Search the cell', words: ['search', 'cot', 'stool'], when: function (api) { return !api.flag('searched'); },
            run: function (api) { api.flag('searched', true); api.say('Under the cot, wrapped in a stocking, the one thing she owned that the rule allows a sister to own, and one it does not.'); api.loot('Sister Ignatia\'s cell'); } },
          { id: 'follow', label: 'Climb out of the window after her', words: ['climb', 'window', 'follow', 'shutter'], when: function (api) { return api.flag('letters') || api.flag('searched'); },
            run: function (api) { api.end('won', 'You go out the way she went, over the sill and down the ivy, and the convent lets you go without a sound. Below, the pilgrim road runs toward the boundary.'); } }
        ]
      }
    }
  };

  /* ---------- an opening for the warrant: the deacon's empty lodging, and what he left in the cellar ---------- */
  A.lodging = {
    id: 'lodging', act: 'opening', gives: 'warrant', title: 'The Deacon\'s Lodging', target: 11, start: 'study',
    intro: function (api) { api.say('Wexstead. Deacon Nikolas Brand lodged above the chandler\'s on Tallow Lane. The Inquisition has sealed his door, and Brother Valentin Crane, the Inquisitor\'s clerk, breaks the seal for you.'); },
    fall: function () { return 'Brother Valentin writes a careful account of what happened in the cellar, and Inquisitor Orme files it unread.'; },
    obstacles: {
      chest: { name: 'The deacon\'s strongbox', room: 'study', max: 5, stat: 'STR', cat: 'basic', open: true, opened: 'The hasp lifts by itself, and the lid comes up.',
        answers: { learn: 'You see where a careful man keeps a key he must never lose: in the hollow leg of his own chair. You are nearly in.' },
        text: 'An iron-bound box under the bed, locked. Prise the lid (STR, Basic Effort; Easy with a crowbar), smash the hasp off (STR, Weapons Effort, but a failure hurts), or find where he hid the key (WIS, once: half of what is left). Each failed try is loud; at the third the chandler sends for the watch, and every try is Hard.',
        clock: 'chandler', hard: function (api) { return !!api.flag('watch'); },
        ways: [
          { id: 'smash', kind: 'bold', label: 'Smash the hasp off', stat: 'STR', say: 'You take the poker to the hasp.', what: 'Smashing the hasp', failSay: 'The poker skids off the iron and into your hand' },
          { id: 'key', kind: 'trick', label: 'Look for where he hid the key', stat: 'WIS', say: 'You stand where he stood and think like a careful man.', what: 'Finding the key', failSay: 'He was more careful than you.' }
        ],
        isDone: function (api) { return !!api.flag('unlocked'); },
        done: function (api) {
          api.flag('unlocked', true);
          api.say('Inside: indulgences signed by the deacon, a purse, a copy of a map with the barrow at Ulm Vethra circled three times, and one thing worth taking.');
          api.loot('The deacon\'s strongbox');
        } }
    },
    timers: {
      chandler: { name: 'The chandler downstairs', room: 'study', max: 3, tick: 'fail',
        text: 'The chandler is listening at the foot of the stair. It loses 1 each failed try at the strongbox. At 0 he sends for the watch, and every try is Hard.',
        out: function (api) { api.flag('watch', true); api.say('Down in the shop a door bangs and someone runs for the watch. From now on, every try at the strongbox is Hard.', 'note'); } }
    },
    rooms: {
      study: {
        name: 'The Deacon\'s Rooms', short: 'his rooms', art: 'study',
        text: function (api) {
          return 'Two rooms over the shop that smell of tallow from below: a narrow bed, a desk under the window, books stacked on the floor to the height of a man.'
            + (api.flag('talked') ? ' Brother Valentin waits by the door, writing in a small book.' : ' Brother Valentin Crane, a young clerk with ink on his cuffs, waits by the door.')
            + ' A trapdoor in the floor leads down to the cellar.';
        },
        secret: 'The books on the floor remember being read, every one, by candlelight, aloud. He was practising. He had a good voice for it.',
        exits: { down: { to: 'cellar', when: function (api) { return api.flag('talked'); }, closed: 'Brother Valentin is waiting to speak to you.' } },
        actions: [
          { id: 'clerk', label: 'Speak with Brother Valentin', words: ['speak', 'talk', 'clerk', 'valentin', 'brother'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true); api.story('warrant', true);
              api.say('"Inquisitor Orme\'s compliments," he says. "Deacon Nikolas Brand kept our strongroom for twelve years. Four nights ago he walked out of it with the Unsealed Canticles and took the pilgrim road toward the boundary."', 'npc');
              api.say('He gives you a sealed paper. "Her warrant. Bring him back to answer for it, or bring back the book. She would rather the book."', 'npc');
              api.say('You carry the Inquisition\'s warrant for Deacon Nikolas Brand. Find him before he reads the book.', 'note');
              api.say('"Nobody has been down to his cellar," he adds, not looking at the trapdoor. "The chandler says it talks at night."', 'npc');
            } },
          { id: 'desk', label: 'Read his commonplace book', words: ['read', 'desk', 'commonplace', 'notes', 'book'], when: function (api) { return api.flag('talked') && !api.flag('desk'); },
            run: function (api) {
              api.flag('desk', true); api.say('On the desk, his commonplace book, written small, in a hand that never once blots.');
              var c = api.check('INT', { what: 'Reading his notes' });
              if (c.success) { api.story('notes', true); api.say('He wrote down rules for himself. The last of them, underlined: "Keep the book in the left hand, always. Never let go of it to strike. The words are the weapon."'); api.say('You know how the deacon will move: your first attack in the last scene will be Easy.', 'note'); }
              else api.say('Psalms, accounts, the price of candles. If there is anything else in it, he hid it well.');
            } },
          { id: 'prise', label: 'Prise open the strongbox', words: ['prise', 'strongbox', 'box', 'chest', 'open'], when: function (api) { return api.flag('talked') && !api.flag('unlocked'); },
            run: function (api) {
              var bar = api.has('crowbar');
              api.say(bar ? 'You get your crowbar under the lid.' : 'You get your fingers under the lid and heave.');
              if (bar) api.used(bar.name);
              var c = api.work('chest', { adj: bar ? 'easy' : 'normal', what: 'Prising the lid' });
              if (!c.success) api.say('It bangs back down. Below, the chandler stops whatever he was doing.');
              else if (!api.flag('unlocked')) api.say('The lid gives a finger\'s width, and stops.');
            } },
          { id: 'rest', label: 'Sleep in the deacon\'s bed', words: ['rest', 'sleep', 'bed'], when: function (api) { return api.flag('talked') && !api.s.rested && !api.s.fight && hurt(api); },
            run: function (api) { api.say('It is a hard bed, and it smells of him. You sleep anyway, with your back to the trapdoor.'); api.rest(); } },
          { id: 'go', label: 'Set out on the road', words: ['set', 'out', 'leave', 'road', 'go'], when: function (api) { return api.flag('talked') && !api.s.fight; },
            run: function (api) { api.end('won', 'You go down the stair past the chandler, who does not look at you, and out onto Tallow Lane with the warrant inside your coat.'); } }
        ]
      },
      cellar: {
        name: 'The Cellar', short: 'the cellar', art: 'undercroft', dark: true,
        text: function (api) {
          return 'Tallow barrels, a smell of mutton fat, and on the flagstones three circles drawn in chalk, one inside the other, scuffed where someone stood in the middle.'
            + (api.flag('beat_mutterer') ? ' The corner is quiet now.' : api.flag('chalked') ? ' The circles are closed with your chalk. In the corner, the muttering has gone thin.' : ' In the far corner, where the light does not reach, something is muttering, over and over, the same few words.');
        },
        secret: 'The chalk remembers his feet in the middle of the circles, night after night, and his voice. Whatever he read down here, it learned the words before he did.',
        exits: { up: 'study' },
        actions: [
          { id: 'chalk', label: 'Close his circles with your own chalk', item: ['chalk', 'chalksticks'], words: ['chalk', 'circle', 'close', 'draw'], when: function (api) { return !api.flag('chalked') && !api.flag('beat_mutterer') && !api.s.fight && !!api.has(['chalk', 'chalksticks']); },
            run: function (api) { api.flag('chalked', true); api.say('Where his circles are scuffed open you draw them shut again, carefully, all three. In the corner the muttering stumbles over its words, and starts again more quietly.'); } },
          { id: 'face', label: 'Go into the dark corner', words: ['corner', 'face', 'fight', 'dark', 'go'], when: function (api) { return !api.flag('beat_mutterer') && !api.s.fight; },
            run: function (api) { api.say('You go toward the muttering.'); api.fight('mutterer'); } },
          { id: 'circles', label: 'Search the middle of the circles', words: ['search', 'middle', 'circles'], when: function (api) { return api.flag('beat_mutterer') && !api.flag('circles'); },
            run: function (api) { api.flag('circles', true); api.say('Where he stood: wax, a tooth, and something he dropped and did not come back for.'); api.loot('The middle of the circles'); } }
        ]
      }
    },
    foes: {
      mutterer: { name: 'The Mutterer', art: 'wraith', hp: 10, attack: 1, damage: 4, caster: true, undead: true,
        card: 'A shape of soot and tallow-smoke in the corner of the deacon\'s cellar, saying over and over the words he practised down here. It learned them first.',
        appears: function (api) {
          var f = api.s.fight, out = 'The muttering stands up out of the corner: a shape of soot with no face, saying the deacon\'s words at you in the deacon\'s voice.';
          if (api.flag('chalked')) { f.hp.cur = Math.max(1, f.hp.cur - 4); out += ' Your chalk has shut it in: it is thin and starts hurt.'; }
          return out;
        },
        hits: 'It says a word at you, and your teeth ache to the root',
        defeated: 'It loses its place in the words, and stammers, and goes out like a snuffed wick. The cellar smells only of fat.',
        weakness: 'The chalk tells you: it only knows the words he read here. Say them back to it wrong and it stumbles.' }
    }
  };

  /* ---------- a middle scene: a walled town shut for the plague, and many ways in ---------- */
  A.plaguegate = {
    id: 'plaguegate', act: 'middle', lean: 'early', tease: 'A walled town with its gate shut for the plague.', title: 'The Plague Gate at Marrowby', target: 12, start: 'gate',
    intro: function (api) { api.say('Marrowby has shut its gate against the plague, and the pilgrim road runs through Marrowby, and nowhere else.'); },
    fall: function () { return 'They bring you in through the gate at last, on the cart, with the others.'; },
    obstacles: {
      wall: { name: 'The town wall', room: 'gate', max: 6, stat: 'STR', cat: 'basic', answers: { move: 'You are on the wall walk without having climbed it.', bind: 'The loose stones lock together under your hands.', hide: 'The watch on the gatehouse looks straight at you, and through you. You climb a good way unseen.' },
        text: 'Twenty feet of old stone, with ivy. Climb it (STR, Basic Effort; Easy with a rope or climbing line), go up the ivy fast (DEX, Weapons Effort, but a fall hurts), or pick the stretch the watch cannot see (WIS, once: half of what is left). Each failed try draws the watch; when they see you, every try is Hard.',
        clock: 'watch', hard: function (api) { return !!api.flag('seen'); },
        ways: [
          { id: 'ivy', kind: 'bold', label: 'Go up the ivy fast', stat: 'DEX', say: 'You take the ivy at a run.', what: 'Climbing fast', failSay: 'The ivy comes away from the wall in your hands' },
          { id: 'blind', kind: 'trick', label: 'Pick the stretch the watch cannot see', stat: 'WIS', say: 'You watch the gatehouse lantern go along the wall walk, and back, and count.', what: 'Watching the watch', failSay: 'Every stretch of the wall is in plain view of somebody.' }
        ],
        isDone: function (api) { return !!api.flag('in'); },
        done: function (api) { api.flag('in', true); api.timer('watch', 'stop'); api.say('You drop down inside the wall into a lane full of shut doors with red crosses on them.'); api.go('yard'); } }
    },
    timers: {
      watch: { name: 'The watch on the gate', room: 'gate', max: 3, tick: 'fail',
        text: 'A lantern goes along the wall walk. It loses 1 each failed try at the wall. At 0 they see you, and every try at the wall is Hard.',
        out: function (api) { api.flag('seen', true); api.say('"There!" A lantern swings your way and a bell starts on the gatehouse. From now on every try at the wall is Hard.', 'note'); } }
    },
    rooms: {
      gate: {
        name: 'The Plague Gate', short: 'the gate', art: 'towngate',
        text: function (api) { return 'A gatehouse with its portcullis down and a red cross daubed on the gate. Old Theodric, the gatewarden, leans on the parapet above with a pike he has not used in years.' + (api.flag('in') ? '' : ' "Nobody in," he calls down. "Nobody out. Not for the Pontiff himself."'); },
        secret: function (api) { return 'The gate remembers everyone it let through before it shut. ' + told(api, { relic: 'The last was a thief with a box of saint\'s bone, who paid in salt and went out by the other gate toward the boundary stones.', missing: 'The last was a sister in grey with her eyes shut, who walked through the portcullis bars as if they were not there.', warrant: 'The last was a deacon on a horse, who read a line to the portcullis, and it went up.' }); },
        actions: [
          { id: 'talk', label: 'Talk your way in', words: ['talk', 'ask', 'plead', 'theodric', 'warden'], when: function (api) { return !api.flag('in') && !api.flag('pleaded'); },
            run: function (api) {
              api.flag('pleaded', true); api.say('You call up to him that you are a pilgrim, that you only want to pass through, that you have not been near the sick.');
              var c = api.check('CHA', { what: 'Talking him round' });
              if (c.success) { api.flag('in', true); api.timer('watch', 'stop'); api.say('"Pass, then," says Old Theodric, "and God help you in there." The portcullis goes up just high enough to crawl under.', 'npc'); api.go('yard'); }
              else api.say('"They all say that," says Old Theodric. "The ones who say it loudest are the ones we bury."', 'npc');
            } },
          { id: 'papers', label: 'Show him your papers', item: PAPERS, words: ['papers', 'show', 'letter', 'seal', 'warrant', 'signet'], when: function (api) { return !api.flag('in') && !!api.has(PAPERS); },
            run: function (api) {
              var p = api.has(PAPERS); api.flag('in', true); api.timer('watch', 'stop');
              api.say('You hold up your ' + p.name.toLowerCase() + ' so the lantern falls on it. Old Theodric cannot read, but he knows a seal when he sees one.');
              api.say('"Well, why didn\'t you say?" The portcullis goes up.', 'npc'); api.go('yard');
            } },
          { id: 'mask', label: 'Go up as a physician\'s man, in your linen mask', item: 'plaguemask', words: ['mask', 'physician', 'doctor'], when: function (api) { return !api.flag('in') && !!api.has('plaguemask'); },
            run: function (api) {
              api.flag('in', true); api.timer('watch', 'stop');
              api.say('You tie on the linen mask and call up that the physician sent for you. "About time," says Old Theodric. The portcullis goes up, and he steps well back from it.', 'npc'); api.go('yard');
            } },
          { id: 'bribe', label: 'Pay the gatewarden', item: COIN, words: ['pay', 'bribe', 'coin', 'purse'], when: function (api) { return !api.flag('in') && !!api.has(COIN); },
            run: function (api) {
              api.spend(COIN, 'You throw up to him'); api.flag('in', true); api.timer('watch', 'stop');
              api.say('Old Theodric bites it, which is a brave thing to do in a plague town. "In you go, then. Quick." The portcullis goes up.', 'npc'); api.go('yard');
            } },
          { id: 'climb', label: 'Climb the wall away from the gate', words: ['climb', 'wall', 'ivy'], when: function (api) { return !api.flag('in'); },
            run: function (api) {
              var rope = api.has(ROPES);
              api.say(rope ? 'Round the corner from the gate you throw your ' + rope.name.toLowerCase() + ' over a merlon and climb.' : 'Round the corner from the gate you find handholds in the old stone and climb.');
              if (rope) api.used(rope.name);
              var c = api.work('wall', { adj: rope ? 'easy' : 'normal', what: 'Climbing the wall' });
              if (!c.success && !api.flag('in')) api.say('You come back down faster than you went up. Up on the wall walk, a lantern stops.');
              else if (!api.flag('in')) api.say('You get a little higher.');
            } }
        ]
      },
      yard: {
        name: 'The Physician\'s Yard', short: 'the yard', art: 'inn', dead: true,
        text: function (api) {
          return 'A yard behind the physician\'s house, full of the dead under sacking, waiting for the cart. Mistress Eulalia Dray, the town\'s physician, works at a trestle in a beaked mask.'
            + (api.flag('beat_king') || api.flag('burned') ? ' The heap by the wall is quiet now.' : ' Something under the heap of sacking by the wall is moving, and squeaking, in many voices at once.');
        },
        secret: function (api) { return 'The dead under the sacking agree on one thing: the rats brought it, and the rats are one rat, and it lives under the heap. ' + told(api, { relic: 'One of them saw the thief with the saint\'s bone go out by the far gate. He was scratching at his neck already.', missing: 'One of them saw the sister in grey walk through the town at midnight, singing, and every dog in Marrowby went quiet.', warrant: 'One of them heard the deacon read at the far gate. It went up for him. Nobody has been able to shut it properly since.' }); },
        actions: [
          { id: 'doctor', label: 'Speak with the physician', words: ['speak', 'talk', 'physician', 'eulalia', 'doctor'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true);
              api.say('"You came in? Then you are either a fool or a saint, and we are short of both." Mistress Eulalia Dray points her knife at the heap. "It lives under there. It is a knot of rats grown together by the tail, and it carries the plague out every night. Kill it, and Marrowby may live."', 'npc');
              api.say(told(api, { relic: '"Your thief with the box of bone? I lanced his neck and he paid me in salt. He went out by the far gate toward the boundary stones. He will not get there."', missing: '"A sister in grey came through at midnight, singing. I called to her. She answered in my own mother\'s voice, and I have not slept since."', warrant: '"A deacon came through on a horse, reading. The rats came out to listen to him. They have been bolder ever since."' }), 'npc');
            } },
          { id: 'burn', label: 'Set fire to the heap', item: FIRE, words: ['burn', 'fire', 'light', 'heap'], when: function (api) { return !api.flag('beat_king') && !api.flag('burned') && !api.s.fight && !!api.has(FIRE); },
            run: function (api) {
              var fire = api.has(FIRE); api.say('You get a flame from your ' + fire.name.toLowerCase() + ' into the sacking at the bottom of the heap.');
              var c = api.check('DEX', { what: 'Setting the heap alight' });
              if (c.success) { api.flag('burned', true); api.say('The heap goes up all at once, sacking and straw and what is under it. Something screams in many voices and then in fewer. Mistress Dray takes her mask off for the first time in a month to watch it burn.'); }
              else { api.say('The flame catches and goes out, and the heap comes apart, and it comes out of the middle of it at you.'); api.fight('king'); }
            } },
          { id: 'heap', label: 'Pull the sacking off the heap', words: ['pull', 'sacking', 'heap', 'fight'], when: function (api) { return !api.flag('beat_king') && !api.flag('burned') && !api.s.fight; },
            run: function (api) { api.say('You take a corner of the sacking and pull.'); api.fight('king'); } },
          { id: 'help', label: 'Help the physician at her trestle', words: ['help', 'trestle', 'sick', 'nurse'], when: function (api) { return api.flag('talked') && !api.flag('helped') && !api.s.fight; },
            run: function (api) {
              api.flag('helped', true); api.say('You hold the lamp and the basin while she works, and do not look at what she is doing.');
              var c = api.check('CON', { what: 'Keeping your stomach' });
              if (c.success) { api.say('"You will do," says Mistress Dray, and gives you what a physician can spare.', 'npc'); api.give('physician', 'Mistress Dray gives you'); }
              else { var n = api.die(4); api.hurt(n, 'You breathe the yard in, and it sits in your chest like a stone (d4 ' + n + ')'); }
            } },
          { id: 'go', label: 'Go out by the far gate', words: ['go', 'leave', 'far', 'gate', 'out'], when: function (api) { return (api.flag('beat_king') || api.flag('burned')) && !api.s.fight; },
            run: function (api) { api.end('won', 'Old Theodric\'s brother keeps the far gate, and he lets you out without a word, and makes the sign against plague at your back.'); } }
        ]
      }
    },
    foes: {
      king: { name: 'The Rat Knot', art: 'rats', hp: 12, attack: 2, damage: 6, beast: true,
        card: 'A dozen plague rats grown together by their tails into one thing, that moves like one thing and squeals in many voices. Marrowby\'s plague goes out from it every night.',
        appears: 'The heap comes apart and out of the middle of it comes a wheel of rats, a dozen of them knotted together at the tail, rolling at you, every mouth open.',
        hits: 'A dozen teeth find your leg at once',
        defeated: 'The knot comes apart at last, and the rats that are left run every way at once, each on its own, and are only rats.',
        weakness: 'The dead under the sacking know it: cut the tails at the middle and it is a dozen frightened rats. Go for the knot, not the teeth.' }
    }
  };

  /* ---------- a middle scene: the abbey's book-room on fire, and something in it still copying ---------- */
  A.scriptorium = {
    id: 'scriptorium', act: 'middle', lean: 'any', tease: 'Smoke over an abbey, and its bells ringing for fire.', title: 'The Burning Scriptorium', target: 12, start: 'scriptorium',
    intro: function (api) { api.say('At Ashby Holt the abbey\'s scriptorium is on fire. The brothers are running the books out into the rain in their arms, and the abbot is on his knees in the mud.'); },
    fall: function () { return 'They find you in the ash with a book held to your chest, which is something. The abbot has it rebound.'; },
    obstacles: {
      fire: { name: 'The fire', room: 'scriptorium', max: 6, stat: 'CON', cat: 'basic', answers: { snuff: 'The flames on the nearest desks lie down and go out: ordinary fire, after all.', shelter: 'The heat parts around you like water round a stone, and you work in the middle of it.', bind: 'The burning beam over the door stops in its fall and hangs there while you work under it.' },
        text: 'The book-room is burning from the far end. Carry water and fight it (CON, Basic Effort; Easy with water skins or a ladle and pot), beat it out with your coat (STR, Weapons Effort, but the heat hurts), or shut the shutters to starve it (INT, once: half of what is left). Each failed try lets it climb; when the roof catches, every try is Hard.',
        clock: 'roof', hard: function (api) { return !!api.flag('roof'); },
        progress: function (api) { if (api.bar('fire') >= 3 && !api.flag('beat_copyist') && !api.s.fight) { api.say('At the far end, in the heart of the fire, someone is still sitting at a desk, writing.', 'foe'); api.fight('copyist'); } },
        ways: [
          { id: 'beat', kind: 'bold', label: 'Beat the flames out with your coat', stat: 'STR', say: 'You pull off your coat and go at the fire with it.', what: 'Beating out the fire', failSay: 'The fire comes up your sleeve' },
          { id: 'shutters', kind: 'trick', label: 'Shut the shutters to starve it', stat: 'INT', say: 'You go along the wall closing every shutter the fire has not reached.', what: 'Starving the fire', failSay: 'The shutters are swollen with the rain and will not close.' }
        ],
        isDone: function (api) { return !!api.flag('out'); },
        done: function (api) { api.flag('out', true); api.timer('roof', 'stop'); api.say('The last of it hisses out under your feet. The scriptorium is black and steaming and three walls are standing, and most of the books are in the rain outside.'); } }
    },
    timers: {
      roof: { name: 'The roof', room: 'scriptorium', max: 4, tick: 'fail',
        text: 'The fire is climbing toward the roof beams. It loses 1 each failed try at the fire. At 0 the roof catches, and every try at the fire is Hard.',
        out: function (api) { api.flag('roof', true); var n = api.die(4); api.hurt(n, 'The roof catches with a roar and burning thatch comes down on you (d4 ' + n + ')'); api.say('From now on every try at the fire is Hard.', 'note'); } }
    },
    rooms: {
      scriptorium: {
        name: 'The Scriptorium', short: 'the scriptorium', art: 'scriptorium',
        text: function (api) {
          return 'A long room of desks under tall windows, the desks still covered with open books and pots of ink.'
            + (api.flag('out') ? ' It is black and wet and still now.' : ' The far end is a wall of fire, and it is coming down the room desk by desk.')
            + ' Brother Anselm Vey, the librarian, is carrying out books with his beard singed off.';
        },
        secret: function (api) { return 'The books that are burning remember what is in them, and they are saying it as they go. One of them is the abbey\'s road-book, where the brothers write who passed. ' + told(api, { relic: 'Its last line: a thief with a box of saint\'s bone, who asked the way to Saint Aubrel\'s Cross, and laughed when he was told.', missing: 'Its last line: a sister in grey who did not stop, and did not give her name, and was singing.', warrant: 'Its last line: Deacon N. Brand, who asked to see the abbey\'s oldest book, and was refused, and left before Lauds.' }); },
        actions: [
          { id: 'water', label: 'Carry water to the fire', words: ['water', 'carry', 'well', 'fight', 'fire'], when: function (api) { return !api.flag('out') && !api.s.fight; },
            run: function (api) {
              var pail = api.has(WATER);
              api.say(pail ? 'You fill your ' + pail.name.toLowerCase() + ' at the well and run it in, again and again.' : 'You run water from the well in your hat.');
              if (pail) api.used(pail.name);
              var c = api.work('fire', { adj: pail ? 'easy' : 'normal', what: 'Fighting the fire' });
              if (!c.success && !api.flag('out')) api.say('The fire eats what you threw and wants more.');
              else if (!api.flag('out')) api.say('A desk goes dark. Then another.');
            } },
          { id: 'books', label: 'Wrap the last books in your oilcloth and carry them out', item: ['oilcloth', 'cloak'], words: ['wrap', 'oilcloth', 'cloak', 'books', 'save'], when: function (api) { return !api.flag('books') && !api.s.fight && !!api.has(['oilcloth', 'cloak']); },
            run: function (api) {
              var it = api.has(['oilcloth', 'cloak']); api.flag('books', true);
              api.say('You wrap an armful of books from the nearest desks in your ' + it.name.toLowerCase() + ' and carry them out into the rain, where they stay dry.');
              api.say('"Those were the gospels," says Brother Anselm, and he weeps, and makes you take something from the treasury for it.', 'npc'); api.loot('The treasury of Ashby Holt');
            } },
          { id: 'anselm', label: 'Ask Brother Anselm what happened', words: ['ask', 'anselm', 'librarian', 'talk'], when: function (api) { return !api.flag('asked'); },
            run: function (api) {
              api.flag('asked', true);
              api.say('"Brother Odric," he says. "Our copyist. He would not leave his desk when the lamp went over. He would not leave it after, either. He is still at the far end, writing. He has been dead an hour."', 'npc');
            } },
          { id: 'thanks', label: 'Take the abbot\'s thanks', words: ['thanks', 'abbot', 'reward'], when: function (api) { return api.flag('out') && !api.flag('thanked') && !api.s.fight; },
            run: function (api) { api.flag('thanked', true); api.say('The abbot gets up out of the mud and gives you what the abbey can spare, which tonight is more than usual.'); api.loot('The abbot\'s thanks'); } },
          { id: 'go', label: 'Go on in the rain', words: ['go', 'leave', 'rain', 'on'], when: function (api) { return (api.flag('out') || api.flag('beat_copyist')) && !api.s.fight; },
            run: function (api) { api.end('won', 'You go on smelling of smoke. Behind you the brothers are carrying the books back in, one at a time, and reading the titles aloud as they go.'); } },
          { id: 'leave', label: 'Leave them to it', words: ['leave', 'walk', 'away'], when: function (api) { return !api.flag('out') && !api.flag('beat_copyist') && !api.s.fight; },
            run: function (api) { api.end('won', 'You go on up the road. The bells of Ashby Holt are still ringing for fire when you are out of sight of the smoke, and then they stop.'); } }
        ]
      }
    },
    foes: {
      copyist: { name: 'The Burning Copyist', art: 'monk', hp: 12, attack: 2, damage: 6, flame: true, undead: true,
        card: 'Brother Odric, the abbey\'s copyist, an hour dead and burning, who will not leave his desk. He gets up from it for you.',
        snuffed: 'The fire on him goes out and he stands smoking, lost, looking for his pen. He does not attack this turn.',
        appears: 'In the heart of the fire a monk is sitting at a desk, writing, and he is on fire, and he has been on fire for an hour. He puts down his pen, and gets up.',
        hits: 'His burning hands take you by the face',
        defeated: 'He sits back down at his desk, and the fire on him goes out, and he is only a dead man with a pen in his hand.',
        weakness: 'The burning books tell you: he cannot bear to see a book burn. Hold one up to the flames and he will turn to save it.' }
    }
  };

  /* ---------- a middle scene: the high fold, and the wolf that comes off the tops at dusk ---------- */
  A.fold = {
    id: 'fold', act: 'middle', lean: 'late', tease: 'Sheep crying on the high moor, and no dog.', title: 'The Fold at Upper Greave', target: 12, start: 'fold',
    intro: function (api) { api.say('On the high moor at Upper Greave the road passes a sheepfold of piled stone. The sheep are crying. A woman sits on the wall with a crook across her knees, and she has not slept.'); },
    fall: function () { return 'Jorun Holloway buries you by the fold wall, deep, with stones on top, as she buries the ewes.'; },
    obstacles: {
      gap: { name: 'The gap in the fold wall', room: 'fold', max: 5, stat: 'STR', cat: 'basic', answers: { move: 'A stone the size of a calf rolls into the gap and stops there, and you never touched it.', bind: 'The loose stones lock into each other and hold.', beast: 'The sheep stop crying and press together in the far corner, out of your way. You work faster.' },
        text: 'Where the wolf has pulled the wall down. Pile the stones back (STR, Basic Effort), heave the big capstone in (STR, Weapons Effort, but it can fall on you), or wedge the gap with the hurdles (INT, once: half of what is left). It must be mended before full dark, or she walks straight in.',
        ways: [
          { id: 'capstone', kind: 'bold', label: 'Heave the big capstone into the gap', stat: 'STR', say: 'You get your arms round the capstone and lift.', what: 'Heaving the capstone', failSay: 'It rolls back onto your foot' },
          { id: 'hurdles', kind: 'trick', label: 'Wedge the gap with the hurdles', stat: 'INT', say: 'You lash the shepherd\'s hurdles across the gap and pile stones against them.', what: 'Wedging the gap', failSay: 'The hurdles will not stand.' }
        ],
        isDone: function (api) { return !!api.flag('mended'); },
        done: function (api) { api.flag('mended', true); api.say('The wall is whole again, chest-high all round. "She will have to come over it," says Jorun, "and she does not like to jump."', 'npc'); } }
    },
    timers: {
      dusk: { name: 'Until full dark', room: 'fold', max: 6, tick: 'action',
        text: 'The light is going. It loses 1 each time you do something here. At 0 the Grey Mother comes down off the tops.',
        out: function (api) { if (api.flag('beat_wolf') || api.s.fight) return; api.say('Up on the skyline something grey stands up out of the heather, and comes down toward the fold at a lope.', 'foe'); api.fight('wolf'); } }
    },
    rooms: {
      fold: {
        name: 'The High Fold', short: 'the fold', art: 'fold',
        text: function (api) {
          return 'A round fold of piled stone on a bare hill, forty ewes inside it, and a shepherd\'s hut of turf beside it. The moor goes up behind to the tops.'
            + (api.flag('beat_wolf') ? ' The sheep have stopped crying.' : api.flag('mended') ? ' The wall is whole.' : ' On the far side the wall is pulled down in a gap you could drive a cart through.');
        },
        secret: function (api) { return 'The stones of the fold remember every wolf that has tried them, back before there were boundary stones. This one is the oldest. ' + told(api, { relic: 'She smelled salt on the wind three nights ago, from over the boundary, and something with it she has never smelled before: an old saint\'s bone, a long way from its niche.', missing: 'Three nights ago she followed a sister in grey for a mile, close enough to touch, and did not, because the sister was singing to her too.', warrant: 'Three nights ago a man on a horse read aloud as he rode past, and she lay down in the heather until he had gone.' }); },
        enter: function (api, first) { if (first) api.timer('dusk', 'start'); },
        actions: [
          { id: 'jorun', label: 'Speak with the shepherd', words: ['speak', 'talk', 'shepherd', 'jorun'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true);
              api.say('"Jorun Holloway," she says. "Three nights the Grey Mother has come down off the tops and taken a ewe. She is older than my grandfather. My dog went after her the first night and I have not seen him since. Help me keep her off till dawn, and you can have what I have."', 'npc');
              api.say(told(api, { relic: '"Saint Aubrel\'s Cross? Two days on. A man went by with a box under his arm, scratching his neck. He was going the right way to die."', missing: '"A sister in grey? She walked past at dusk with her eyes shut, and the Grey Mother walked beside her like a dog, all the way to the skyline."', warrant: '"A deacon? He rode past reading, and the sheep all lay down. They have never done that for anyone."' }), 'npc');
            } },
          { id: 'pile', label: 'Pile the stones back in the gap', words: ['pile', 'stones', 'gap', 'mend', 'wall'], when: function (api) { return !api.flag('mended') && !api.s.fight; },
            run: function (api) {
              api.say('You lift the fallen stones back one at a time, the heavy ones at the bottom, as Jorun shows you.');
              var c = api.work('gap', { what: 'Mending the wall' });
              if (!c.success && !api.flag('mended')) api.say('A whole course slides back down into the grass.');
              else if (!api.flag('mended')) api.say('The gap is a little narrower.');
            } },
          { id: 'bane', label: 'Hang wolfsbane on the fold gate', item: 'wolfsbane', words: ['wolfsbane', 'bane', 'hang', 'gate'], when: function (api) { return !api.flag('bane') && !api.flag('beat_wolf') && !api.s.fight && !!api.has('wolfsbane'); },
            run: function (api) { api.flag('bane', true); api.spend('wolfsbane', 'You tie to the gatepost'); api.say('"That will sicken her, if she comes near it," says Jorun. "And she will. She always comes in by the gate."', 'npc'); } },
          { id: 'fire', label: 'Build a fire at the gap', item: FIRE, words: ['fire', 'build', 'light', 'burn'], when: function (api) { return !api.flag('fire') && !api.flag('beat_wolf') && !api.s.fight && !!api.has(FIRE); },
            run: function (api) { api.flag('fire', true); var f = api.has(FIRE); api.say('You get a fire going with your ' + f.name.toLowerCase() + ' and the dry heather from Jorun\'s hut, between the fold and the dark. The ewes go quiet in the light.'); } },
          { id: 'wait', label: 'Wait for her by the wall', words: ['wait', 'watch', 'ready'], when: function (api) { return api.flag('talked') && !api.flag('beat_wolf') && !api.s.fight; },
            run: function (api) { api.say('You sit on the wall beside Jorun and watch the tops go from brown to black.'); } },
          { id: 'thanks', label: 'Take what Jorun has', words: ['thanks', 'take', 'reward'], when: function (api) { return api.flag('beat_wolf') && !api.flag('thanked'); },
            run: function (api) { api.flag('thanked', true); api.say('"Not much," says Jorun Holloway, "but you earned it all." Bread, cheese, and from the back of the hut, something her grandfather found up on the tops.', 'npc'); api.give('rations', 'Jorun gives you'); api.loot('From the back of the hut'); } },
          { id: 'rest', label: 'Sleep in the shepherd\'s hut', words: ['rest', 'sleep', 'hut'], when: function (api) { return api.flag('talked') && !api.s.rested && !api.s.fight && hurt(api); },
            run: function (api) { api.say('Jorun keeps watch. You sleep on her bed of heather and dream about nothing at all.'); api.rest(); } },
          { id: 'go', label: 'Go on at first light', words: ['go', 'leave', 'dawn', 'light', 'on'], when: function (api) { return api.flag('beat_wolf') && !api.s.fight; },
            run: function (api) { api.end('won', 'At dawn the moor is empty to the tops. Jorun walks you to the road and stands there with her crook until you are out of sight.'); } }
        ]
      }
    },
    foes: {
      wolf: { name: 'The Grey Mother', art: 'wolf', hp: 14, attack: 2, damage: 6, beast: true,
        card: 'A grey she-wolf as big as a pony, white at the muzzle, older than anyone on the moor can remember. She takes a ewe a night and is never seen in daylight.',
        appears: function (api) {
          var f = api.s.fight, out = 'She comes down off the tops at a lope and stops twenty yards from the fold, looking at you, not at the sheep.';
          if (api.flag('bane')) { f.hp.cur = Math.max(1, f.hp.cur - 4); out += ' She comes in by the gate, as Jorun said, and the wolfsbane catches her full in the face: she starts hurt.'; }
          if (api.flag('mended')) { f.easy = (f.easy || 0) + 1; out += ' The wall is whole and she has to come over it, badly: your first attack is Easy.'; }
          if (api.flag('fire')) { f.easy = (f.easy || 0) + 1; out += ' She will not come near the fire, and has to come at you round it, where you are ready.'; }
          return out;
        },
        hits: 'Her jaws close on your shoulder and she drags you down',
        defeated: 'She backs away from you, slowly, and lies down in the heather at the edge of the firelight, and puts her head on her paws, and does not get up.',
        weakness: 'The fold stones remember: she is old, and lame in the left foreleg. Make her turn on it.' }
    }
  };

})(typeof window !== 'undefined' ? window : globalThis);
