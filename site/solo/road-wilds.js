/* Sacrament RPG solo: more middle scenes for "The Pilgrim Road" (road.js), so that runs differ more (owner, 2026-11-06: "we need lots more scenes").
   Words only, as in road.js: every number comes from the rules and the gear list through engine.js. Foes' numbers are the game's own, as a GM sets a
   monster's. Each scene gives the spell and item tags (gear.js, "When in doubt" on the Rules page) something to answer: a foe that casts, burns or is
   an animal, an obstacle with "answers", the dead close by, a secret. Names follow docs/lore/sacrament-lore.md (Part 1 and the naming guide only). */
(function (root) {
  'use strict';
  var A = root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  /* What the road says about the hero's charge: the stolen relic, the missing sister, or the runaway deacon (road-far.js). */
  var told = function (api, t) { return t[api.charge()] || t.missing; };

  /* ---------- the hospice: a vigil with the sick, and the sister who sings them to sleep ---------- */
  A.hospice = {
    id: 'hospice', act: 'middle', lean: 'any', title: 'The Hospice at Dray', target: 12, start: 'ward',
    intro: function (api) { api.say('At Dray the Church keeps a hospice for travellers who fall sick on the road. The door is open. Somebody inside is singing.'); },
    fall: function () { return 'Sister Gisela lays you out with the others at dawn, and writes your name in the register in a careful hand.'; },
    timers: {
      vigil: { name: 'Until the singing starts', room: 'ward', max: 5, tick: 'action',
        text: 'The night is getting on. It loses 1 each time you do something here. At 0 the Lullaby Sister comes down the ward, singing.',
        out: function (api) { api.say('The candles gutter. At the far end of the ward a sister in an old grey habit is walking between the beds, singing low, and the sick are going quiet one by one.', 'foe'); api.fight('sister'); } }
    },
    rooms: {
      ward: {
        name: 'The Hospice Ward', short: 'the ward', art: 'hospice', dead: true,
        text: function (api) {
          return 'A long whitewashed room, twelve beds, a crucifix at each end. Sister Gisela Pell, the only sister here, moves between the sick with a basin.'
            + (api.flag('beat_sister') ? ' The ward is quiet now, and the sick are only sleeping.' : ' Three of the beds hold the dead, sheeted, waiting for the morning cart.');
        },
        secret: function (api) {
          return 'The sheeted dead answer together, in one thin voice: "Sister Perpetua kept this house before Gisela. She died of the fever she nursed, and she still keeps it. She sings the sick to sleep, and they do not wake."'
            + ' ' + told(api, { relic: '"She sang to a man carrying a box of saint\'s bone. He got up and walked away from it, toward the boundary stones. She could not hold him."', missing: '"A sister in grey stopped here. Perpetua sang to her and she would not sleep. She said her mother sang it better."', warrant: '"A deacon in black slept here a night. Perpetua sang to him, and he sang back, out of a book. She has not sung so well since."' });
        },
        enter: function (api, first) { if (first) api.timer('vigil', 'start'); },
        actions: [
          { id: 'tend', label: 'Help Sister Gisela with the sick', words: ['help', 'tend', 'sick', 'gisela'], when: function (api) { return !api.flag('tended') && !api.s.fight; },
            run: function (api) {
              api.flag('tended', true); api.say('You carry water, change straw, hold a man still while she lances a swelling.');
              var c = api.check('WIS', { what: 'Nursing the sick' });
              if (c.success) { api.say('"You have done this before," says Sister Gisela Pell. She gives you what a hospice can spare.', 'npc'); api.give('bandages', 'Sister Gisela gives you'); }
              else api.say('A boy dies under your hands, quietly, while you are looking the other way.');
            } },
          { id: 'register', label: 'Read the death register', words: ['read', 'register', 'book', 'deaths'], when: function (api) { return !api.flag('register'); },
            run: function (api) {
              api.flag('register', true); api.say('The register lies open on a stand by the door. Gisela\'s hand, and before it another, older hand.');
              var c = api.check('INT', { what: 'Reading the register' });
              if (c.success) { api.flag('knows', true); api.say('The older hand stops in the middle of a word. Under it Gisela has written: "Sister Perpetua Vesper, of the fever. Buried without the bell." Without the bell. Whatever she is, she was never rung out of this house.', 'npc'); }
              else api.say('Names and dates and causes, in the order they came. You lose your place.');
            } },
          { id: 'salt', label: 'Salt the threshold of the ward', words: ['salt', 'threshold', 'door'], when: function (api) { return !api.flag('salted') && !api.flag('beat_sister') && !api.s.fight && !!api.has('saltpouch'); },
            run: function (api) { api.flag('salted', true); api.say('You lay a line of salt across the ward door, as the boundary stones are salted. Gisela watches you and does not stop you.'); } },
          { id: 'wait', label: 'Sit the vigil and wait for the singing', words: ['wait', 'vigil', 'sit', 'watch'], when: function (api) { return !api.flag('beat_sister') && !api.s.fight; },
            run: function (api) { api.say('You take a stool at the end of the ward and wait. The candles burn down.'); api.timer('vigil', 'stop'); api.say('The singing starts sooner than you thought.', 'foe'); api.fight('sister'); } },
          { id: 'go', label: 'Go on at first light', words: ['go', 'leave', 'dawn', 'light'], when: function (api) { return !!api.flag('beat_sister'); },
            run: function (api) { api.end('won', 'Sister Gisela rings the hospice bell for Sister Perpetua at dawn, nine times, and you are on the road before the last of it.'); } }
        ]
      }
    },
    foes: {
      sister: { name: 'The Lullaby Sister', art: 'sister', hp: 12, attack: 2, damage: 4, undead: true, caster: true,
        card: 'A sister in an old grey habit, grey all through, who walks the ward at night singing the sick to sleep. They do not wake.',
        appears: function (api) {
          var f = api.s.fight, out = 'She turns toward you without stopping her song. It is a lullaby. Your eyelids are very heavy.';
          if (api.flag('salted')) { f.hp.cur = Math.max(1, f.hp.cur - 4); out += ' She steps over the salt at the door, and it burns her: she starts hurt.'; }
          if (api.flag('knows')) { f.easy = (f.easy || 0) + 1; out += ' You know her name now. Say it, and your first blow is Easy.'; }
          return out;
        },
        hits: 'Her song closes over you like warm water',
        defeated: 'The song stops in the middle of a line. There is nobody at the end of the ward, only the smell of tallow.',
        weakness: 'The dead tell you her name: Perpetua Vesper. Call her by it and she falters, as if someone had rung for her.' }
    }
  };

  /* ---------- the charcoal wood: a road choked with briars, and the boar that lives in the clamps ---------- */
  A.wood = {
    id: 'wood', act: 'middle', lean: 'early', title: 'The Charcoal Wood', target: 12, start: 'wood',
    intro: function (api) { api.say('The road goes into Wulfram\'s Wood, where the charcoal burners work. Smoke lies under the trees like water.'); },
    fall: function () { return 'The charcoal burners find what the boar left, and bury it under a clamp, which is a warm grave, they say, and an honest one.'; },
    obstacles: {
      briars: { name: 'The briars', room: 'wood', max: 6, stat: 'STR', cat: 'basic', clock: 'smoke',
        answers: { move: 'The briars lean away from you, one by one, as if you were someone they knew. A long stretch of the road opens.', hide: 'Whatever is moving in the smoke loses you, and you work a long stretch of the road without it near.', beast: 'A hind steps out of the smoke, looks at you, and goes off along a path you had not seen. You follow her a long way.' },
        text: 'The road is lost under a wall of briars. Cut a way through (STR, Basic Effort), force through the thorns (STR, Weapons Effort, but a failure tears you open), or find the deer path (WIS, once: half of what is left). Each failed try fills the wood with more smoke, and something in it is coming closer.',
        ways: [
          { id: 'force', kind: 'bold', label: 'Force through the thorns', stat: 'STR', say: 'You put your arms over your face and go at the briars with your whole weight.', what: 'Forcing the briars', failSay: 'The thorns open your arms to the elbow' },
          { id: 'deer', kind: 'trick', label: 'Look for the deer path', stat: 'WIS', say: 'You stop, and look low, where the deer go.', what: 'Finding the deer path', failSay: 'Every gap you find closes after a few yards.' }
        ],
        isDone: function (api) { return !!api.flag('through'); },
        done: function (api) { api.flag('through', true); if (api.s.fight) return; api.end('won', 'You come out of the briars onto the road again, black to the elbows with charcoal and blood. The smoke thins behind you.'); } }
    },
    timers: {
      smoke: { name: 'The smoke in the wood', room: 'wood', max: 3, tick: 'fail',
        text: 'The burners\' clamps are smoking. It loses 1 each failed try at the briars. At 0 the Cinder Boar comes out of the smoke.',
        out: function (api) { api.say('The smoke parts. Something comes out of it at a trot, glowing at the seams.', 'foe'); api.fight('boar'); } }
    },
    rooms: {
      wood: {
        name: 'Wulfram\'s Wood', short: 'the wood', art: 'wood',
        text: function (api) {
          return 'Oaks, and between the oaks the round turf clamps of the charcoal burners, smoking. A burners\' hut of bark and wattle. The burners themselves are gone.'
            + (api.flag('through') ? ' The way through the briars is open.' : ' Ahead the road is lost under briars taller than a man.');
        },
        secret: function (api) {
          return 'You learn it from the ash: the burners left yesterday, in a hurry, after the boar came out of a clamp they had just opened. It had been in there all through the burning.'
            + ' ' + told(api, { relic: 'Before they ran they saw a man go by on the road with a box under his arm, walking as if somebody was calling him.', missing: 'Before they ran they saw a girl in grey go by on the road, walking in her sleep.', warrant: 'Before they ran they saw a deacon go by on a lathered horse, reading as he rode.' });
        },
        actions: [
          { id: 'cut', label: 'Cut a way through the briars', words: ['cut', 'briars', 'hack', 'through'], when: function (api) { return !api.flag('through'); },
            run: function (api) { api.say('You cut and drag and cut.'); var c = api.work('briars', { what: 'Cutting the briars' }); if (!c.success) api.say('The briars spring back as fast as you cut them.'); } },
          { id: 'hut', label: 'Search the burners\' hut', words: ['search', 'hut', 'burners'], when: function (api) { return !api.flag('hut') && !api.s.fight; },
            run: function (api) { api.flag('hut', true); api.say('Bark beds, a cold pot, and under a bed something the burners forgot in their hurry.'); api.loot('The burners\' hut'); } },
          { id: 'go', label: 'Go on through the wood', words: ['go', 'leave', 'on', 'walk'], when: function (api) { return !!api.flag('through') && !api.s.fight; },
            run: function (api) { api.end('won', 'You come out of Wulfram\'s Wood with the smoke in your hair, and it does not leave you for days.'); } }
        ]
      }
    },
    foes: {
      boar: { name: 'The Cinder Boar', art: 'boar', hp: 14, attack: 2, damage: 6, beast: true, flame: true,
        card: 'A great boar that lay in a charcoal clamp through the whole burning and came out alive. It glows at the seams, and it is angry.',
        appears: 'It comes at you low and fast, tusks first, trailing smoke. Where it treads, the leaf litter catches.',
        hits: 'A tusk opens your thigh, and the wound is hot',
        snuffed: 'The fire in its seams goes out, and the boar stops dead, shaking its head, and does not come at you this turn.',
        defeated: 'It goes down in the leaves and lies there smoking. By the time you reach it, it is only charcoal, boar-shaped.',
        after: function (api) { if (api.flag('through')) api.end('won', 'You go on through the briars and out of the wood. Behind you the charcoal boar crumbles in the wind.'); },
        weakness: 'The ash tells you how the burners kill a fire: smother it, and come at it from upwind. Keep the smoke behind you and your next blow is Easy.' }
    }
  };

  /* ---------- the toll bridge: a rotten bridge over a gorge, and a dead man who still takes the toll ---------- */
  A.bridge = {
    id: 'bridge', act: 'middle', lean: 'late', title: 'The Toll Bridge at Crane\'s Holt', target: 12, start: 'bridge',
    intro: function (api) { api.say('At Crane\'s Holt the road crosses a gorge on a bridge of rope and plank. There has been a toll here as long as there has been a bridge.'); },
    fall: function () { return 'The gorge keeps you. In spring the river brings what is left down to the villages, and the reeve writes it up as a fall.'; },
    obstacles: {
      span: { name: 'The rotten bridge', room: 'bridge', max: 6, stat: 'DEX', cat: 'basic', clock: 'ropes',
        blocked: function (api) { return !api.flag('passed') && !api.flag('beat_tollman'); },
        answers: { bind: 'The bridge stops swaying and holds as still as stone while you cross a long stretch of it.', move: 'You step into the shadow of the near post and out of the shadow of a post halfway over.' },
        text: 'Forty yards of rope and grey planks over the gorge, half of them rotten. Cross plank by plank (DEX, Basic Effort), run for the far side (DEX, Weapons Effort, but a failure means a fall), or find the sound planks first (INT, once: half of what is left). Each failed try loosens the old ropes.',
        hard: function (api) { return !!api.flag('sagging'); },
        ways: [
          { id: 'run', kind: 'bold', label: 'Run for the far side', stat: 'DEX', say: 'You take a breath and run.', what: 'Running the bridge', failSay: 'A plank goes under you and you catch a rope with one hand, and hang there, and climb back', when: function (api) { return api.flag('passed') || api.flag('beat_tollman'); } },
          { id: 'sound', kind: 'trick', label: 'Find the sound planks', stat: 'INT', say: 'You look at the planks the way the man who laid them did, and see which were laid last.', what: 'Finding the sound planks', failSay: 'Every plank looks as grey as every other.', when: function (api) { return api.flag('passed') || api.flag('beat_tollman'); } }
        ],
        isDone: function (api) { return !!api.flag('crossed'); },
        done: function (api) { api.flag('crossed', true); api.end('won', 'You step off the last plank onto rock. Behind you the bridge sways for a long time, though there is no wind.'); } }
    },
    timers: {
      ropes: { name: 'The old ropes', room: 'bridge', max: 3, tick: 'fail',
        text: 'The bridge is held up by ropes older than you. It loses 1 each failed try at the crossing. At 0 one rope parts, the bridge sags, and every try is Hard.',
        out: function (api) { api.flag('sagging', true); api.say('A rope parts with a sound like a bowstring. The bridge drops on one side and hangs there, crooked. From here on, crossing is Hard.', 'note'); } }
    },
    rooms: {
      bridge: {
        name: 'Crane\'s Holt', short: 'the bridge', art: 'bridge',
        text: function (api) {
          return 'A tollhouse of black stone at the near end of the bridge, its door open. The gorge is very deep; you can hear the river but not see it.'
            + (api.flag('passed') || api.flag('beat_tollman') ? ' Nobody stands in the road now.' : ' In the road before the bridge stands a tall man in a toll-keeper\'s coat, with his hand out. His hand is grey.');
        },
        secret: function (api) {
          return 'The tollhouse stones remember him: Valentin Crane, toll-keeper, forty years at the bridge. He fell from it the winter it was last mended, and nobody paid him for the work.'
            + ' ' + told(api, { relic: '"A man paid me with a saint\'s bone," the stones say in his voice. "I gave it back. It was not his to pay with."', missing: '"A girl in grey paid me in her sleep," the stones say in his voice. "With her mother\'s name. I let her by."', warrant: '"A deacon paid me with a page torn from his book," the stones say in his voice. "I have not been able to put it down."' });
        },
        actions: [
          { id: 'answer', label: 'Speak to the toll-keeper', words: ['speak', 'talk', 'toll', 'keeper', 'pay'], when: function (api) { return !api.flag('passed') && !api.flag('beat_tollman') && !api.s.fight; },
            run: function (api) {
              api.say('"Toll," he says, in a voice from the bottom of the gorge. "What is owed?"');
              var c = api.check('CHA', { what: 'Answering the toll-keeper' });
              if (c.success) { api.flag('passed', true); api.say('"Forty years of work, and a winter\'s mending," you tell him, "and nobody paid you." He looks at you a long time. Then he steps aside, and is not there.', 'npc'); }
              else { api.say('"Not enough," he says, and comes for you.'); api.fight('tollman'); }
            } },
          { id: 'tollhouse', label: 'Search the tollhouse', words: ['search', 'tollhouse', 'house'], when: function (api) { return !api.flag('tollhouse') && !api.s.fight; },
            run: function (api) { api.flag('tollhouse', true); api.say('A table, a stool, a strongbox with the lid torn off. Forty years of tolls, gone. Not quite all of it.'); api.loot('The tollhouse'); } },
          { id: 'cross', label: 'Cross plank by plank', words: ['cross', 'bridge', 'planks', 'walk'], when: function (api) { return (api.flag('passed') || api.flag('beat_tollman')) && !api.flag('crossed'); },
            run: function (api) { api.say('You go out onto the planks, testing each one.'); var c = api.work('span', { what: 'Crossing the bridge' }); if (!c.success) api.say('A plank cracks under your foot and you step back, heart going.'); } }
        ]
      }
    },
    foes: {
      tollman: { name: 'The Toll-Keeper', art: 'tollman', hp: 16, attack: 2, damage: 6, undead: true,
        card: 'A tall dead man in a toll-keeper\'s coat, grey-handed, who still stands in the road before the bridge and asks for what is owed.',
        appears: 'He does not hurry. He holds out his grey hand as he comes, as if you might still pay.',
        hits: 'His grey hand closes on your wrist, cold as river water',
        defeated: 'He goes down on one knee in the road, and then he is a coat on the stones, and then he is nothing.',
        weakness: 'The stones of his tollhouse tell you he has not been paid in forty years. Hold out a coin, and he looks at it, and your next blow is Easy.' }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
