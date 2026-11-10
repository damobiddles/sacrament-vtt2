/* Sacrament RPG solo: "The Pilgrim Road", a run of five scenes. An opening sets why the hero is on the road (the charge: a relic to carry, or a missing
   pilgrim to find); three middle scenes are drawn from the pool and put in a sensible order (engine.js pickOrder); the finale answers the charge.
   Words only, as in adventure-silent-bell.js: every number comes from the rules and the gear list through engine.js. Foes' numbers are the game's own,
   as a GM sets a monster's. Names follow docs/lore/sacrament-lore.md (Part 1 and the naming guide only). */
(function (root) {
  'use strict';
  var A = root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  var LIGHTS = ['lantern', 'candles', 'stubs', 'candle', 'lastrites', 'drownedlantern'], FIRE = LIGHTS.concat(['tinder', 'flintsteel']), ROPES = ['rope', 'hemprope'];
  var relic = function (api) { return api.charge() === 'relic'; };
  /* What the road says about the hero's charge: the stolen relic, the missing sister, or the runaway deacon (road-far.js). */
  var told = function (api, t) { return t[api.charge()] || t.missing; };

  root.SacramentSoloCampaigns = root.SacramentSoloCampaigns || {};
  root.SacramentSoloCampaigns['pilgrim-road'] = {
    id: 'pilgrim-road',
    title: 'The Pilgrim Road',
    blurb: 'Five nights on the pilgrim road, out to the boundary stones. Every road is different.',
    intro: 'The pilgrim road runs from the heartlands to the boundary of the consecrated land, five days on foot. You have walked it before. Not like this.',
    /* road-wide.js (2026-11-10) adds an opening for each charge (courier, convent, lodging) and three middle scenes (plaguegate, scriptorium, fold) */
    scenes: ['priory', 'cart', 'warrant', 'courier', 'convent', 'lodging', 'ford', 'silent-bell', 'barn', 'gibbet', 'ossuary', 'hospice', 'wood', 'bridge', 'pit', 'inn', 'field', 'plaguegate', 'scriptorium', 'fold', 'shrine', 'mere', 'barrow'],
    middle: 3,
    /* the closing line on the end card, by how the run ended (won, dead, or fled: crawled out of the finale alive) */
    endings: {
      won: ['You came to the end of the road and walked back from it. Few can say as much.', 'The road is quiet behind you. It will not stay quiet.', 'What you set out to do is done. You do not speak of the rest.'],
      dead: ['The road keeps what it takes. Someone will find your scallop shell in the spring.', 'No bell was rung for you. The road does not ring bells.', 'You fell short of the boundary stones, as many have.'],
      fled: ['You lived. That is all the road gave you, and it was not nothing.', 'You got away with your life and nothing else. The road remembers your face.']
    }
  };

  /* ---------- people met on the road (the owner's own, 2026-11-06) ----------
     Each run meets a few of them, at most one in a scene, in the place the scene begins. Their names show in green. What they offer uses the rules as
     they are: a find from the d100, a rest, a thing from the gear list, or knowing the last foe's ways (your first attack there is Easy). */
  root.SacramentSoloCameos = [
    { id: 'xian', name: 'Xian of Wycbold', label: 'Trade with Xian of Wycbold',
      meet: 'By the road sits Xian of Wycbold, a relic-seller with a tray of saints\' knuckles, none of them saints\'.',
      run: function (api) { api.say('"For you, friend, a true one," says Xian of Wycbold, and turns the tray so you cannot see the others. "Pay me when you are rich."', 'npc'); api.loot('From Xian of Wycbold\'s tray'); } },
    { id: 'dom', name: 'Ser Dom of Cookham', label: 'Let Ser Dom of Cookham keep watch', when: function (api) { return !api.s.rested; },
      meet: 'Ser Dom of Cookham, a knight-errant in rust-red mail, has made a small fire here and seems glad of the company.',
      run: function (api) { api.say('"Sleep," says Ser Dom of Cookham, laying his sword across his knees. "Nothing comes past me. Nothing has in eleven years, though I admit very little has tried."', 'npc'); api.rest(); } },
    { id: 'rupert', name: 'Rupert the Druid', label: 'Speak with Rupert the Druid',
      meet: 'A man in a coat of leaves is watching you from the hedge. The Inquisition would very much like to meet Rupert the Druid. So far it has not.',
      run: function (api) { api.say('"The Church calls this a sin," says Rupert the Druid, pressing a bundle into your hands. "The Church has never had a cut go bad on it in a ditch."', 'npc'); api.give('bandages', 'Rupert the Druid gives you'); } },
    { id: 'matthew', name: 'Matthew of the Brown Order of Farts', label: 'Hear out Matthew of the Brown Order',
      meet: 'A friar in a brown habit, stained browner, is begging at the roadside: Matthew of the Brown Order of Farts. The Church has never recognised the order. The order has never asked.',
      run: function (api) { api.story('clue', true); api.story('tracks', true); api.story('notes', true); api.say('"I have walked to the boundary and back nine times," says Matthew of the Brown Order of Farts. "I know what waits at the end of this road, and how it moves. Listen."', 'npc'); api.say('You know the last foe\'s ways now: your first attack in the last scene will be Easy.', 'note'); } },
    { id: 'biddles', name: 'Lord Biddles of Wooburn', label: 'Accept Lord Biddles of Wooburn\'s hospitality',
      meet: 'A coach is stopped on the road, and out of it climbs Lord Biddles of Wooburn, a minor lord with a major appetite, who insists that you eat.',
      run: function (api) { api.say('"Nobody walks past my coach hungry," says Lord Biddles of Wooburn. "Bad luck. Worse manners." He gives you a parcel from his own hamper.', 'npc'); api.give('rations', 'Lord Biddles of Wooburn gives you'); } },
    { id: 'rachel', name: 'Rachel, Witch-finder General', label: 'Answer Rachel, Witch-finder General',
      meet: 'Three riders block the road, and the one in front wears a black hat and a silver pin: Rachel, Witch-finder General. She looks at you for a long time before she speaks.',
      run: function (api) { api.say('"You are not what I am hunting," says Rachel, Witch-finder General, at last. "But you will meet it before I do." She presses a stoppered flask into your hand. "Oil from the chrism at Saint Aubrel\'s. On the blade, not on yourself."', 'npc'); api.give('oil', 'Rachel, Witch-finder General gives you'); } },
    { id: 'simon', name: 'Simon the Scholar', label: 'Hear what Simon the Scholar has read',
      /* his help is earned with a riddle: the first answer is the right one (the game shuffles them), and a wrong one costs nothing but his help */
      riddles: [
        { q: 'The more of me you take, the more you leave behind. What am I?', a: ['Footsteps', 'Coins', 'Candles'] },
        { q: 'I am lit to keep the dark away, and the dark eats me all the same. What am I?', a: ['A candle', 'A prayer', 'A lantern\'s glass'] },
        { q: 'I am rung for every dead man and I never hear a word of it. What am I?', a: ['A bell', 'A priest', 'A raven'] },
        { q: 'The poor have it, the rich want for it, and if you eat it you die. What is it?', a: ['Nothing', 'Salt', 'Bread'] },
        { q: 'I have a spine and no bones, and they lock me away for what I know. What am I?', a: ['A book', 'A heretic', 'A key'] },
        { q: 'I stand at the head of every sleeper and I never wake one. What am I?', a: ['A gravestone', 'A candle', 'A confessor'] },
        { q: 'The man who makes me sells me, the man who buys me never uses me, and the man who uses me never knows. What am I?', a: ['A coffin', 'A shroud', 'An indulgence'] },
        { q: 'I walk the whole road beside you and leave you the moment the light does. What am I?', a: ['Your shadow', 'Your sin', 'Your name'] }
      ],
      ask: function (q) { return '"Everything on this road is written down somewhere," says Simon the Scholar, a finger in his book. "First, a riddle: ' + q + '"'; },
      wrong: function (right) { return 'Simon the Scholar laughs, not unkindly. "' + right + '. Never mind. Some of us read, and some of us walk." He goes back to his book and does not look up again.'; },
      meet: 'Under a hawthorn sits Simon the Scholar, a thin man with ink to the elbows and a satchel of borrowed books, reading by what is left of the light.',
      run: function (api) { api.story('forewarned', true); api.say('"Just so," says Simon the Scholar, turning pages. "Here. This is what you will meet next, and here is where it is weak."', 'npc'); api.say('You know the next foe\'s ways: your first attack against it will be Easy.', 'note'); } },
    { id: 'gussetweasel', name: 'Gussetweasel, the Necromancer', label: 'Admire the invisible bats of Gussetweasel, the Necromancer',
      meet: 'A man in a moth-eaten cloak is bowing to an empty sky: Gussetweasel, the Necromancer, with his amazing invisible bats. He swears there are a great many of them.',
      run: function (api) {
        api.say('"Behold!" says Gussetweasel, the Necromancer, sweeping his arm at nothing. "My amazing invisible bats. They see in the dark, so I need not, and you, friend, plainly cannot."', 'npc');
        /* what he offers is the gear list's own: a light if you have none (the dark makes searching Hard), otherwise what his bats have seen ahead */
        if (!api.has(LIGHTS)) api.give('lantern', 'Gussetweasel, the Necromancer gives you');
        else { api.story('forewarned', true); api.say('"They have flown ahead," he adds, listening to the empty air. "They tell me what waits for you, and where it is soft."', 'npc'); api.say('You know the next foe\'s ways: your first attack against it will be Easy.', 'note'); }
      } }
  ];

  /* ---------- openings ---------- */
  A.priory = {
    id: 'priory', act: 'opening', gives: 'relic', title: 'The Prior\'s Errand', target: 11, start: 'cloister',
    intro: function (api) { api.say('Hollowmere Priory, at the end of the day. The brothers have gone in to supper. Prior Severin Ashby has not.'); },
    horror: { 7: 'In the chapel a brother starts the Compline psalm, and stops halfway, as if he has lost his place.' },
    fall: function () { return 'They find you in the morning among the barrels, and say a mass for you, and send someone else.'; },
    rooms: {
      cloister: {
        name: 'The Cloister', short: 'the cloister', art: 'cloister',
        text: function (api) { return 'A square of wet grass under four walks of arches. A well in the middle.' + (api.flag('talked') ? ' The Prior has gone in.' : ' Prior Severin Ashby waits by the well with his hands in his sleeves.') + ' Steps lead down to the undercroft; the gatehouse is to the east.'; },
        secret: 'The well remembers every face that has looked into it. Tonight it remembers the Prior\'s, three times, and each time he was afraid.',
        exits: { down: 'undercroft', east: { to: 'gatehouse', when: function (api) { return api.flag('talked'); }, closed: 'The Prior is waiting to speak to you.' } },
        actions: [
          { id: 'prior', label: 'Speak with the Prior', words: ['prior', 'talk', 'severin', 'speak'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true); api.story('relic', true);
              api.say('"The shrine at Saint Aubrel\'s Cross has been robbed," he says. "The last shrine on the road, at the boundary stones. Its relic is gone and the niche stands empty, and the boundary there is only salt and prayer now."', 'npc');
              api.say('He puts a lead box in your hands, heavier than it looks. "Saint Dunstan\'s Rib. Set it in the niche. Do not open the box. Do not let anyone take it from you."', 'npc');
              api.say('You carry Saint Dunstan\'s Rib, in a lead box. Bring it to the shrine at Saint Aubrel\'s Cross.', 'note');
              api.say('As he turns to go he adds, "And if you would: something is at the candles in the undercroft. The brothers will not go down."');
            } },
          { id: 'rest', label: 'Sleep in the guest cell', words: ['rest', 'sleep', 'cell'], when: function (api) { return api.flag('talked') && !api.s.rested && (api.s.hp.cur < api.s.hp.max || api.s.horror > 0); },
            run: function (api) { api.say('A narrow bed and a crucifix. You sleep, and do not dream.'); api.rest(); } }
        ]
      },
      undercroft: {
        name: 'The Undercroft', short: 'the undercroft', art: 'undercroft', dark: true,
        text: function (api) { return 'Barrels, sacks of grain, and the priory\'s winter candles in their boxes.' + (api.flag('beat_rats') ? ' The boxes are torn open and the floor is quiet.' : ' Something has been at the boxes. The sacks are moving.'); },
        exits: { up: 'cloister' },
        enter: function (api) { if (!api.flag('beat_rats') && !api.s.fight) api.fight('rats'); },
        actions: [
          { id: 'boxes', label: 'Search the candle boxes', words: ['search', 'boxes', 'candles', 'box'], when: function (api) { return api.flag('beat_rats') && !api.flag('boxes'); },
            run: function (api) { api.flag('boxes', true); api.say('Most of the candles are gnawed to the wick. Under them, wrapped in an old altar cloth, something a brother hid long ago.'); api.loot('The candle boxes'); } }
        ]
      },
      gatehouse: {
        name: 'The Gatehouse', short: 'the gatehouse', art: 'cloister',
        text: 'The gate stands open on the pilgrim road. Brother Konrad Tarn, the porter, holds up a lantern to see you off.',
        exits: { west: 'cloister' },
        actions: [
          { id: 'porter', label: 'Ask the porter for candles', words: ['porter', 'konrad', 'ask', 'candles'], when: function (api) { return !api.flag('porter'); },
            run: function (api) { api.flag('porter', true); api.say('"The road\'s dark past the second day," he says, and gives you what he has.'); api.give('candles', 'Brother Konrad gives you'); } },
          { id: 'go', label: 'Set out on the road', words: ['set', 'out', 'leave', 'road', 'go'],
            run: function (api) { api.end('won', 'You walk out under the gate with the lead box against your chest. Behind you the porter closes the gate, and you hear the bar go down.'); } }
        ]
      }
    },
    foes: {
      rats: { name: 'The Chapel Rats', art: 'rats', hp: 8, attack: 1, damage: 4, beast: true,
        card: 'A dozen rats as big as cats, fat on church tallow, moving together as if one thing were steering them.',
        appears: 'The sacks heave and the rats come out of them all at once, a dozen of them, fat on tallow, and they do not run from your light. They come at it.',
        hits: 'Teeth in your ankle, your wrist, your calf',
        defeated: 'The last of them squeal and pour away into a drain. The ones that stay, stay still.',
        weakness: 'The dead remember the winter the rats came before: they break and run when the biggest one falls. Find it.' }
    }
  };

  A.cart = {
    id: 'cart', act: 'opening', gives: 'missing', title: 'The Empty Cart', target: 11, start: 'crossroads',
    intro: function (api) { api.say('Grimsby Fold, where the pilgrim road meets the drove road. Dusk, with rain coming.'); },
    fall: function () { return 'You lie in the ditch by the cart until the rain stops. Hob Sallow is gone. So is the road.'; },
    obstacles: {
      wheel: { name: 'The sunken wheel', room: 'crossroads', max: 6, stat: 'STR', cat: 'basic', answers: { shelter: 'The rain bends away from the ditch, and the mud firms under the wheel.', bind: 'The cart stops sliding and stays where it is held. The wheel comes up out of the ditch more easily.', move: 'The stones under the axle shift, and you never touch them. The wheel sits higher.' },
        text: 'One wheel of the cart sunk to the hub in the ditch. Heave (STR, Basic Effort), lift it on your back (STR, Weapons Effort, but a failure hurts), or pack the ditch first (INT, once: half of what is left). Each failed try brings the rain closer; once it comes, every try is Hard.',
        clock: 'rain', hard: function (api) { return !!api.flag('rain'); },
        ways: [
          { id: 'lift', kind: 'bold', label: 'Lift the axle on your back', stat: 'STR', say: 'You crouch under the axle and stand up into it.', what: 'Lifting the axle', failSay: 'Something in your back gives before the wheel does' },
          { id: 'pack', kind: 'trick', label: 'Pack the ditch with stones first', stat: 'INT', say: 'You fill the rut in front of the wheel with stones from the wall.', what: 'Packing the ditch', failSay: 'The stones sink in the mud as fast as you lay them.' }
        ],
        isDone: function (api) { return !!api.flag('freed'); },
        done: function (api) {
          api.flag('freed', true); api.story('missing', true);
          api.say('The wheel comes up out of the ditch with a noise like a boot from mud. Hob Sallow wipes his face.');
          api.say('"I carried a pilgrim from Saint Aubrel\'s," he says. "Sister Ignatia Vesper, of the Seventh Bell. Last night she climbed down off the cart and walked away toward the boundary, talking to someone I couldn\'t see. She said her mother was calling her. Her mother is ten years in the ground."', 'npc');
          api.say('You set out to find Sister Ignatia before the road takes her.', 'note');
        } }
    },
    timers: {
      rain: { name: 'The rain', room: 'crossroads', max: 4, tick: 'fail',
        text: 'Rain is coming over the hill. It loses 1 each failed try at the wheel. When it comes, every try at the wheel is Hard.',
        out: function (api) { api.flag('rain', true); api.say('The rain comes on hard and the ditch runs like a stream. From now on every try at the wheel is Hard.', 'note'); } }
    },
    rooms: {
      crossroads: {
        name: 'The Crossroads', short: 'the crossroads', art: 'crossroads',
        text: function (api) { return 'A plague cart stands ' + (api.flag('freed') ? 'on the road again, its wheel caked with mud.' : 'half in the ditch, one wheel sunk to the hub.') + ' The carter, Hob Sallow, sits on the shaft. The cart is empty. A wayshrine leans at the crossing.'; },
        secret: 'Under the wayshrine someone has scratched a name, fresh: IGNATIA. Under it, older, the same name again, in the same hand.',
        exits: { north: { to: 'lane', when: function (api) { return api.flag('freed'); }, closed: '"Help me or leave me," says Hob. He will not tell you which way she went until the cart is out of the ditch.' } },
        actions: [
          { id: 'hob', label: 'Talk to Hob Sallow', words: ['talk', 'hob', 'carter', 'ask'], when: function (api) { return !api.flag('freed') && !api.flag('asked'); },
            run: function (api) { api.flag('asked', true); api.say('"Help me get her out of the ditch," he says, meaning the cart, "and I\'ll tell you what I saw. It\'s not a thing to say standing in the rain."', 'npc'); } },
          { id: 'wheel', label: 'Heave the wheel out of the ditch', words: ['wheel', 'heave', 'lift', 'push', 'help', 'cart'], when: function (api) { return !api.flag('freed'); },
            run: function (api) {
              api.say('You get your shoulder under the axle and Hob takes the horse\'s head.');
              var c = api.work('wheel', { what: 'Heaving the wheel' });
              if (!c.success) api.say('The wheel slides back into the ditch with a sucking sound. Hob swears at the horse.');
              else if (!api.flag('freed')) api.say('It comes up a hand\'s width. Not yet.');
            } },
          { id: 'search', label: 'Search the empty cart', words: ['search', 'cart', 'straw'], when: function (api) { return api.flag('freed') && !api.flag('searched'); },
            run: function (api) { api.flag('searched', true); api.say('Straw, a blanket, and under the boards what the plague dead left behind and the carter forgot.'); api.loot('The cart'); } },
          { id: 'rest', label: 'Rest at the wayshrine', words: ['rest', 'pray', 'shrine'], when: function (api) { return !api.s.rested && (api.s.hp.cur < api.s.hp.max || api.s.horror > 0); },
            run: function (api) { api.say('You sit with your back to the wayshrine while the rain comes and goes.'); api.rest(); } }
        ]
      },
      lane: {
        name: 'The Sunken Lane', short: 'the lane', art: 'lane',
        text: 'A sunken lane between black hedges. In the mud, the prints of bare feet, walking steady, toward the boundary.',
        exits: { south: 'crossroads' },
        actions: [
          { id: 'tracks', label: 'Read her tracks', words: ['read', 'tracks', 'prints', 'study'], when: function (api) { return !api.flag('tracks'); },
            run: function (api) {
              api.flag('tracks', true);
              var c = api.check('WIS', { what: 'Reading the tracks' });
              if (c.success) { api.story('tracks', true); api.say('She never stumbles, never stops, never turns her head. Someone walking in their sleep walks like that. You will know her walk again.'); api.say('When you find her, you will know how to reach her: your first attack in the last scene will be Easy.', 'note'); }
              else api.say('The rain has had them. You make out only the direction: the boundary.');
            } },
          { id: 'follow', label: 'Follow her tracks', words: ['follow', 'go', 'walk'],
            run: function (api) { api.end('won', 'You follow the bare footprints into the dark. Behind you, Hob Sallow turns his cart for home and does not look back.'); } }
        ]
      }
    }
  };

  /* ---------- the middle of the road ---------- */
  A.ford = {
    id: 'ford', act: 'middle', lean: 'early', tease: 'The river is up, and the ferry is gone.', title: 'The Drowned Ford', target: 12, start: 'bank',
    intro: function (api) { api.say('The road comes down to the river Tarn, and the river has come up to meet it.'); },
    fall: function () { return 'The river takes you, gently, the way it takes everything. Downstream they will find the lead box, or a pair of boots.'; },
    obstacles: {
      ford: { name: 'The ford', room: 'bank', max: 6, stat: 'STR', cat: 'basic', answers: { bind: 'The water over the next stones slows and holds. You cross a stretch of it as if it were a floor.', move: 'You step out of the shade on this bank into the shade under the alders, halfway over.', hide: 'Whatever watches from the brown water loses sight of you, and you cross the deep stretch unseen.' },
        text: 'Forty yards of stepping stones under fast brown water. Wade (STR, Basic Effort; Easy with a rope, and a failure knocks you down unless you have one), leap from stone to stone (DEX, Weapons Effort, but a failure hurts), or read the current for the shallows (WIS, once: half of what is left). Once the river is over the stones, every try is Hard.',
        hard: function (api) { return !!api.flag('flood'); },
        progress: function (api) { if (api.bar('ford') >= 3 && !api.flag('beat_acolyte') && !api.s.fight) api.fight('acolyte'); },
        ways: [
          { id: 'leap', kind: 'bold', label: 'Leap from stone to stone', stat: 'DEX', say: 'You go across the stones at a run.', what: 'Leaping the stones', failSay: 'A stone rolls under your foot and you go down hard in the shallows' },
          { id: 'read', kind: 'trick', label: 'Read the current for the shallows', stat: 'WIS', say: 'You watch the water for a long moment, where it runs smooth and where it breaks.', what: 'Reading the current', failSay: 'The water tells you nothing you can use.' }
        ],
        isDone: function (api) { return !!api.flag('crossed'); },
        done: function (api) { api.flag('crossed', true); api.timer('river', 'stop'); api.end('won', 'You haul yourself out on the far bank and lie there in the reeds until you can feel your hands. The road goes on, uphill, out of the valley.'); } }
    },
    timers: {
      river: { name: 'The rising river', room: 'bank', max: 6, tick: 'action',
        text: 'The river is coming up. It loses 1 each time you do something here. At 0 the stones are under and every try at the ford is Hard.',
        out: function (api) { api.flag('flood', true); api.say('The last stone goes under. From here on, crossing is Hard.', 'note'); } }
    },
    rooms: {
      bank: {
        name: 'The Riverbank', short: 'the riverbank', art: 'ford',
        text: function (api) { return 'The ferryman\'s hut is empty and the ferry is gone. Beyond the reeds the ford\'s stepping stones show as a line of pale broken water.' + (api.flag('flood') ? ' They are under now.' : ' The river is rising.'); },
        secret: 'Every year the ford takes someone. Last spring it was an acolyte carrying a censer to a burial on the far bank. He never put it down.',
        enter: function (api, first) { if (first) api.timer('river', 'start'); },
        actions: [
          { id: 'hut', label: 'Search the ferryman\'s hut', words: ['hut', 'search', 'ferryman'], when: function (api) { return !api.flag('hut'); },
            run: function (api) { api.flag('hut', true); api.say('A cold hearth, a stool, and on a peg by the door, what the ferryman did not take with him.'); if (api.has(ROPES)) api.loot('The ferryman\'s hut'); else api.give('rope', 'You take'); } },
          { id: 'wade', label: 'Wade the ford', words: ['wade', 'ford', 'cross', 'stones', 'river'],
            run: function (api) {
              var adj = api.has(ROPES) ? 'easy' : 'normal';
              api.say(api.has(ROPES) ? 'You tie off your rope on the ferry post and go in, paying it out behind you.' : 'You go in. The cold takes your breath.');
              var c = api.work('ford', { adj: adj, what: 'Wading the ford' });
              if (!c.success) { if (api.has(ROPES)) { api.say('The current takes your feet, and the rope holds you. You haul yourself back to the stones.'); return; } var n = api.die(4); api.hurt(n, 'The current knocks your legs out from under you (d4 ' + n + ')'); }
            } }
        ]
      }
    },
    foes: {
      acolyte: { name: 'The Drowned Acolyte', art: 'acolyte', hp: 14, attack: 2, damage: 6, undead: true,
        card: 'A boy in an acolyte\'s white, grey with river mud, a censer still on its chain in his hand. He has been in the water a long time.',
        appears: 'In the middle of the ford something stands up out of the water: a boy in an acolyte\'s white, grey with river mud, the censer still swinging on its chain.',
        hits: 'The censer chain whips across your face',
        defeated: 'He folds back into the river and the current takes him downstream, the censer last.',
        weakness: 'The dead tell you the river took him from upstream. Keep the current at your back and he cannot keep his feet.' }
    }
  };

  A.barn = {
    id: 'barn', act: 'middle', lean: 'any', tease: 'A shuttered village, and a tithe barn with its door open.', title: 'The Tithe Barn', target: 12, start: 'barn',
    intro: function (api) { api.say('Night catches you at Nether Ashby. The village is barred and shuttered. The tithe barn is not.'); },
    fall: function () { return 'In the morning the reeve finds two bodies in the Church\'s grain, and has to decide whose sin it was.'; },
    rooms: {
      barn: {
        name: 'The Tithe Barn', short: 'the tithe barn', art: 'barn',
        text: function (api) {
          return 'A long hall of oak posts and stacked sheaves, the Church\'s tenth of the harvest. Rain on the roof.'
            + (api.flag('calm') ? ' Faustin sleeps against a post, his hands folded.' : api.flag('beat_penitent') ? ' The far end is empty now.' : ' At the far end, under the sheaves, a man in a hair shirt sits with his back to you, very thin, eating grain from his hand.');
        },
        secret: 'The grain whispers what it heard: a man walked here barefoot from Aubrecht, and has eaten nothing but the Church\'s tenth for nine days, and thinks it a penance.',
        actions: [
          { id: 'speak', label: 'Speak to the thin man', words: ['speak', 'talk', 'man', 'penitent', 'thin'], when: function (api) { return !api.flag('spoke') && !api.s.fight; },
            run: function (api) {
              api.flag('spoke', true);
              api.say('You say good evening, as you would to anyone.');
              var c = api.check('WIS', { what: 'Finding the right words' });
              if (c.success) {
                api.flag('calm', true);
                api.say('He turns. "Faustin," he says. "Penitent. I walked from Aubrecht." He gives you the half of his grain without being asked, and from his shirt, something he says he no longer needs.', 'npc');
                api.loot('Faustin\'s gift');
                api.say(told(api, { relic: '"The shrine at Saint Aubrel\'s Cross? Empty. I prayed there to nothing. At night something scrapes at the boundary stones, and laughs."', missing: '"A sister in grey? She slept here two nights ago. She talked in her sleep, to her mother. In the morning I could not wake her and she walked away anyway."', warrant: '"A deacon in black? He came in out of the rain three nights ago and read all night by a stub of candle. He would not tell me what. He would not let me see."' }), 'npc');
              } else { api.say('He turns. He has not eaten anything but grain in a long time, and he has decided that you are a sin.'); api.fight('penitent'); }
            } },
          { id: 'pack', label: 'Search his pack', words: ['search', 'pack', 'bag'], when: function (api) { return api.flag('beat_penitent') && !api.flag('pack'); },
            run: function (api) { api.flag('pack', true); api.say('A scourge, a crust, a psalter with the pages cut out, and one thing worth keeping.'); api.loot('The penitent\'s pack'); } },
          { id: 'rest', label: 'Sleep in the sheaves', words: ['rest', 'sleep', 'sheaves'], when: function (api) { return (api.flag('calm') || api.flag('beat_penitent')) && !api.s.rested && (api.s.hp.cur < api.s.hp.max || api.s.horror > 0); },
            run: function (api) { api.say('You burrow into the Church\'s tenth and sleep like a stolen thing.'); api.rest(); } },
          { id: 'go', label: 'Go on at first light', words: ['go', 'leave', 'dawn', 'light'], when: function (api) { return api.flag('calm') || api.flag('beat_penitent'); },
            run: function (api) { api.end('won', 'You go out into a grey dawn. Behind you the barn doors swing in the wind, and the village stays shut.'); } }
        ]
      }
    },
    foes: {
      penitent: { name: 'The Gaunt Penitent', art: 'penitent', hp: 10, attack: 1, damage: 4,
        card: 'A man in a hair shirt, starved to rope and bone, with a scourge in his fist. He believes he is doing God\'s work.',
        appears: 'He comes at you with the scourge, weeping, saying your sins aloud as if he could read them off you.',
        hits: 'The scourge lays your arm open',
        defeated: 'He sits down hard in the straw and weeps, and will not look at you again. When you next look up he is gone, and his pack is not.',
        weakness: 'The dead in the grain tell you he has not slept in nine days. Wait for him to sway, then strike.' }
    }
  };

  A.gibbet = {
    id: 'gibbet', act: 'middle', lean: 'early', tease: 'A cage on a post where the roads meet.', title: 'The Gibbet at Holloway Cross', target: 12, start: 'gibbet',
    intro: function (api) { api.say('At Holloway Cross the reeve hangs thieves where the roads meet, so every road can see them.'); },
    fall: function () { return 'The reeve\'s men find you under the gibbet in the morning, and take you for another thief.'; },
    obstacles: {
      cage: { name: 'The gibbet cage', room: 'gibbet', max: 5, stat: 'DEX', cat: 'basic', open: true, opened: 'The lock turns over by itself and the cage door swings wide.', answers: { bind: 'The swinging cage stops dead on its chain, and the lock is easier to work.' },
        text: 'An iron cage on a tall post, locked. Pick the lock (DEX, Basic Effort), wrench the door (STR, Weapons Effort, but a failure cuts you on the rusted iron), or work out the lock (INT, once: half of what is left). Fill the bar and it gives. The light is going while you work.',
        ways: [
          { id: 'wrench', kind: 'bold', label: 'Wrench the cage door', stat: 'STR', say: 'You brace your feet on the post and haul on the bars.', what: 'Wrenching the door', failSay: 'The rusted iron opens your palm' },
          { id: 'study', kind: 'trick', label: 'Work out how the lock was made', stat: 'INT', say: 'You look at the lock the way its smith did.', what: 'Working out the lock', failSay: 'It is no make of lock you know.' }
        ],
        isDone: function (api) { return !!api.flag('cage'); },
        done: function (api) { api.flag('cage', true); api.say('The lock gives and the cage door swings down. The hanged man leans out toward you as if to say something.'); } }
    },
    timers: {
      dark: { name: 'Until full dark', room: 'gibbet', max: 5, tick: 'action',
        text: 'The light is going. It loses 1 each time you do something here. At full dark the Crossroads Hound comes, unless the wayshrine is lit.',
        out: function (api) {
          if (api.flag('candle')) { api.say('Full dark. A big lean dog comes out of the hedge, circles the lit wayshrine twice, and goes away up the north road.', 'win'); return; }
          api.say('Full dark. Something comes out of the hedge at a run.', 'foe'); api.fight('hound');
        } }
    },
    rooms: {
      gibbet: {
        name: 'Holloway Cross', short: 'the crossing', art: 'gibbet', dead: true,
        text: function (api) { return 'An iron cage creaks on a tall post over the crossing. The man in it has been dead a week. Crows. ' + (api.flag('candle') ? 'The wayshrine\'s candle burns.' : 'A wayshrine stands by the road with its candle out.') + ' The light is going.'; },
        secret: function (api) { return api.charge() === 'warrant' ? 'The hanged man answers in a voice like a sack of gravel. "A deacon on a horse stopped under me to read by the wayshrine\'s candle. He read aloud. I wish he had not. He went on toward the boundary, and the candle went out behind him."' : relic(api) ? 'The hanged man answers in a voice like a sack of gravel. He did the theft they hanged him for: he took the relic from the shrine at Saint Aubrel\'s Cross, and sold it to an old woman who was scraping salt off the boundary stones. "She paid in salt," he says. "I should have known."' : 'The hanged man answers in a voice like a sack of gravel. "A sister in grey passed under me two nights back, walking in her sleep, toward the mere past the boundary. Someone was calling her, in a voice she knew. I knew it too. It was my mother\'s."'; },
        enter: function (api, first) { if (first) api.timer('dark', 'start'); },
        actions: [
          { id: 'cage', label: 'Open the gibbet cage', words: ['cage', 'open', 'climb', 'lock'], when: function (api) { return !api.flag('cage'); },
            run: function (api) { api.say('You climb the post and work at the lock.'); var c = api.work('cage', { what: 'Picking the lock' }); if (!c.success) api.say('The lock will not turn. A crow watches you.'); else if (!api.flag('cage')) api.say('Something gives inside it. Not all of it.'); } },
          { id: 'search', label: 'Search the hanged man', words: ['search', 'hanged', 'body', 'man'], when: function (api) { return api.flag('cage') && !api.flag('searched'); },
            run: function (api) { api.flag('searched', true); api.say('The reeve\'s men took his boots and his coat. They did not look in his mouth.'); api.loot('The hanged man'); if (relic(api)) api.story('clue', true); } },
          { id: 'candle', label: 'Light the wayshrine candle', words: ['light', 'candle', 'wayshrine', 'shrine'], when: function (api) { return !api.flag('candle') && !!api.has(FIRE); },
            run: function (api) { api.flag('candle', true); api.say('You light the wayshrine\'s candle from your own. The little flame stands up straight in the wind. The folk say a Crossroads Hound will not cross a lit wayshrine\'s light.'); } },
          { id: 'go', label: 'Leave the crossing', words: ['leave', 'go', 'walk', 'on'], when: function (api) { return !api.s.fight; },
            run: function (api) { api.end('won', 'You take the road that leads to the boundary. Behind you the cage creaks, and creaks, and the crows settle again.'); } }
        ]
      }
    },
    foes: {
      hound: { name: 'The Crossroads Hound', art: 'hound', hp: 10, attack: 2, damage: 6, beast: true,
        card: 'A big lean dog with no collar and no master. The folk say Crossroads Hounds belong to the crossing, and the crossing feeds them.',
        appears: 'A big lean dog, no collar, no master, comes at you low and silent. Its eyes catch the last of the light and keep it.',
        hits: 'Its teeth close on your forearm',
        defeated: 'It lies down in the road as if tired, and when you look again there is nothing in the road at all.',
        weakness: 'The hanged man laughs, a dry sound: "It has to go round the long way to come at you again. Make it."' }
    }
  };

  A.ossuary = {
    id: 'ossuary', act: 'middle', lean: 'late', tease: 'A burned abbey whose bone-house did not burn.', title: 'The Bone-House at Mourne', target: 12, start: 'ossuary',
    intro: function (api) { api.say('Mourne Abbey burned a hundred years ago. Its bone-house did not. The road goes past its door, and the rain makes you go in.'); },
    fall: function () { return 'You lie down among the bones, and the bone-house counts one more.'; },
    obstacles: {
      grille: { name: 'The iron grille', room: 'ossuary', max: 6, stat: 'STR', cat: 'basic', open: true, answers: { silence: 'The grille stops ringing when you strike it. Nothing in the walls hears you work.', shelter: 'You say the short burial office over the shelves. The bones settle, and you work faster for not watching them.', hide: 'The dead in the walls cannot see you clearly. You work the grille without their eyes on you.' },
        text: 'An iron grille closes off the inner chapel. Force it (STR, Basic Effort), throw yourself at it (STR, Weapons Effort, but a failure hurts), or find where the mortar is rotten (INT, once: half of what is left). Each failed try wakes the bones a little more.',
        clock: 'bones',
        ways: [
          { id: 'throw', kind: 'bold', label: 'Throw yourself at the grille', stat: 'STR', say: 'You take a run at it across the bone-strewn floor.', what: 'Throwing yourself at it', failSay: 'The grille throws you back onto the bones' },
          { id: 'mortar', kind: 'trick', label: 'Find where the mortar is rotten', stat: 'INT', say: 'You run your fingers along the stone where the bars are set.', what: 'Finding the rot', failSay: 'The mortar is as good as the day it was laid.' }
        ],
        opened: 'The grille groans and comes away from the stone.',
        isDone: function (api) { return !!api.flag('grille'); },
        done: function (api) { if (!api.flag('grille')) { api.flag('grille', true); api.say('The inner chapel is open. A lamp hangs there, long out, over a small altar.'); } } }
    },
    timers: {
      bones: { name: 'The bones stir', room: 'ossuary', max: 3, tick: 'fail',
        text: 'Each failed try at the grille rattles the bones in their rows. When they wake, the Horror rises 2.',
        out: function (api) { api.say('The bones rattle in their rows from one end of the vault to the other, and do not stop for a long time.', 'horror'); api.horror(2, 'The dead are awake.'); } }
    },
    rooms: {
      ossuary: {
        name: 'The Bone-House', short: 'the bone-house', art: 'ossuary', dark: true, dead: true,
        text: function (api) { return 'Skulls stacked to the vault in rows, long bones bundled like firewood beneath them.' + (api.flag('grille') ? ' The grille to the inner chapel hangs open.' : ' An iron grille closes off an inner chapel.') + ' The stair you came down is behind you.'; },
        secret: 'The bones count themselves for you, a dry rattle in the dark: four hundred and twelve. And one on the stair who never finished dying.',
        enter: function (api, first) { if (first && !api.flag('beat_wraith')) api.fight('wraith'); },
        actions: [
          { id: 'grille', label: 'Force the grille', words: ['grille', 'force', 'gate', 'bars', 'chapel'], when: function (api) { return !api.flag('grille'); },
            run: function (api) { var c = api.work('grille', { what: 'Forcing the grille' }); if (!c.success) api.say('The grille holds. The skulls watch.'); else if (!api.flag('grille')) api.say('It moves a finger\'s width in its stone.'); } },
          { id: 'altar', label: 'Search the inner chapel', words: ['altar', 'search', 'inner', 'lamp'], when: function (api) { return api.flag('grille') && !api.flag('altar'); },
            run: function (api) { api.flag('altar', true); api.say('Under the altar cloth, where the last brother of Mourne put it for safekeeping:'); api.loot('The inner chapel'); } },
          { id: 'rest', label: 'Rest among the bones', words: ['rest', 'sleep'], when: function (api) { return api.flag('beat_wraith') && !api.s.rested && (api.s.hp.cur < api.s.hp.max || api.s.horror > 0); },
            run: function (api) { api.say('The dead are poor company and good guards.'); api.rest(); } },
          { id: 'go', label: 'Climb out into the rain', words: ['climb', 'leave', 'go', 'out', 'stair'], when: function (api) { return api.flag('beat_wraith'); },
            run: function (api) { api.end('won', 'You climb the stair. Nothing follows you up it now.'); } }
        ]
      }
    },
    foes: {
      wraith: { name: 'The Stair Wraith', art: 'wraith', hp: 12, attack: 2, damage: 6, undead: true,
        card: 'A monk\'s shape in a monk\'s rags, all the colour gone out of it. It comes down stairs without touching them.',
        appears: 'Behind you, on the stair, something sighs. It comes down without touching the steps: a monk\'s shape in a monk\'s rags, all the colour gone out of it.',
        hits: 'Its cold hands pass into your chest and close',
        defeated: 'It goes back up the stair, slowly, step by step, and at the top it is not there.',
        weakness: 'The bones tell you it was the last brother of Mourne, who would not leave the stair while the abbey burned. Stand below it, and it hesitates.' }
    }
  };

  /* ---------- the end of the road ---------- */
  A.shrine = {
    id: 'shrine', act: 'finale', fits: ['relic'], title: 'Saint Aubrel\'s Cross', target: 13, start: 'stones',
    /* how the road can end here, for the end card and the Chronicle */
    endings: { whole: 'The boundary made whole', niche: 'The Rib in the niche, the line still broken', fed: 'The Salt Hag fed and gone' },
    intro: function (api) { api.say('The last day. The road climbs to the boundary of the consecrated land, and to the shrine at Saint Aubrel\'s Cross.'); },
    fall: function () { return 'The salt is scraped from the last stone by morning. The niche stays empty, and the lead box is never found.'; },
    obstacles: {
      salt: { name: 'The broken salt line', room: 'stones', max: 6, stat: 'WIS', cat: 'basic', answers: { shelter: 'The old words go into the salt as you lay it. The line holds better than salt alone.', hide: 'Whatever watches from the hill loses you. You lay a long stretch of the line unwatched.', learn: 'You see where the line used to run, stone by stone. The gaps are easier to close.' },
        text: 'The salt line between the boundary stones, scraped away in long gaps. Walk it praying (WIS, Basic Effort; Easy with a salt pouch), pour it thick and fast (WIS, Weapons Effort, but a failure costs 1 Horror), or follow the old line by the saints\' marks (INT, once: half of what is left). Each failed try draws what scraped it closer; when it comes, you fight it with the line still broken.',
        clock: 'hag',
        ways: [
          { id: 'pour', kind: 'bold', label: 'Pour the salt thick and fast', stat: 'WIS', say: 'You pour it in a hurry, gap after gap.', what: 'Pouring the line', failHorror: 1, failSay: 'The salt blows away in the dark, and the gaps seem wider than before.' },
          { id: 'marks', kind: 'trick', label: 'Follow the old line by the saints\' marks', stat: 'INT', say: 'Each stone\'s saint looks along the line to the next. You follow their eyes.', what: 'Following the marks', failSay: 'The marks are worn past reading.' }
        ],
        isDone: function (api) { return !!api.flag('mended'); },
        done: function (api) { api.flag('mended', true); api.say('The line is whole again, white from stone to stone. Up the hill, something hisses as if burned.'); } }
    },
    timers: {
      hag: { name: 'Something on the hill', room: 'stones', max: 4, tick: 'fail',
        text: 'Each failed try at the salt line draws what scraped it closer. When it comes, the line is still broken.',
        out: function (api) { if (api.flag('beat_hag') || api.flag('fed') || api.s.fight) return; api.say('An old woman comes down the hill toward you, quickly, a horn spoon in her hand.', 'foe'); api.fight('hag'); } }
    },
    rooms: {
      stones: {
        name: 'The Boundary Stones', short: 'the boundary stones', art: 'stones',
        text: function (api) { return 'A line of boundary stones runs over the hill, each with a saint\'s mark cut in it. Between them runs a salt line, white in the dusk' + (api.flag('mended') ? ', whole.' : ', broken in long gaps where something has scraped it away.') + ' Beyond the stones the land goes on, unblessed. Up the hill, the shrine.'; },
        secret: 'Three of the stones bear the same new marks: spoon-scrapes, small and patient, made over many nights.',
        exits: { up: 'shrine' },
        actions: [
          /* the salt pouch can mend the line, or buy the hag off: one or the other */
          { id: 'feed', label: 'Leave your salt pouch on the last stone for her', item: 'saltpouch', words: ['feed', 'leave', 'offer', 'pouch'], when: function (api) { return !api.flag('mended') && !api.flag('beat_hag') && !api.flag('fed') && !api.s.fight && !!api.has('saltpouch'); },
            run: function (api) {
              api.spend('saltpouch', 'You leave on the last boundary stone'); api.say('You step back. After a long time an old woman comes down the hill with a horn spoon in her hand, and squats by the stone, and eats.');
              var c = api.check('CHA', { what: 'Holding still while she eats' });
              if (c.success) { api.flag('fed', true); api.timer('hag', 'stop'); api.say('She licks the spoon clean, looks at you as if she might remember your face, and walks off over the boundary into the unblessed land without looking back. The shrine is empty of her.'); }
              else { api.say('She finishes it, and is still hungry, and you are standing very close.'); api.fight('hag'); }
            } },
          { id: 'salt', label: 'Mend the salt line', words: ['salt', 'mend', 'line', 'pray'], when: function (api) { return !api.flag('mended') && !api.flag('beat_hag') && !api.flag('fed'); },
            run: function (api) { api.say(api.has('saltpouch') ? 'You open your salt pouch and walk the line, praying the Doorward.' : 'You gather what salt is left in the grass and walk the line, praying the Doorward.'); var c = api.work('salt', { adj: api.has('saltpouch') ? 'easy' : 'normal', what: 'Mending the line' }); if (!c.success) api.say('The wind takes it.'); else if (!api.flag('mended')) api.say('A little of the line is whole again.'); } }
        ]
      },
      shrine: {
        name: 'The Shrine', short: 'the shrine', art: 'shrine',
        text: function (api) { return 'A stone hood over an empty niche. The reliquary door hangs open.' + (api.flag('beat_hag') || api.flag('fed') ? ' The step is swept clean.' : ' On the step, a heap of grey salt, scraped and gathered, and the smell of the sea a hundred miles from any sea.'); },
        secret: 'The niche remembers what stood in it: a finger of Saint Aubrel in a silver case. It remembers the hand that took it, and the old woman who bought it, and that she ate the case.',
        exits: { down: 'stones' },
        enter: function (api) { if (!api.flag('beat_hag') && !api.flag('fed') && !api.s.fight) api.fight('hag'); },
        actions: [
          { id: 'set', label: 'Set Saint Dunstan\'s Rib in the niche', words: ['set', 'rib', 'relic', 'niche', 'place', 'box'], when: function (api) { return api.flag('beat_hag') || api.flag('fed'); },
            run: function (api) {
              api.say('You open the lead box at last. Inside, on red cloth, a brown curved bone, and nothing else. You set it in the niche and close the reliquary door.');
              if (api.flag('fed')) { api.say('Out past the stones, a long way off, something is singing to itself with its mouth full.', 'end'); api.end('won', 'You have carried Saint Dunstan\'s Rib to the boundary, and paid the road\'s toll in salt. The Salt Hag is out there still, beyond the stones, and fed. This is the end of the run.', 'fed'); return; }
              if (!api.flag('mended')) { api.say('The wind drops. Down the hill the salt line still lies broken in the grass, and the Rib will have to hold the gaps alone.', 'end'); api.end('won', 'You have carried Saint Dunstan\'s Rib to the boundary. Someone will have to come back with salt before the winter. Perhaps it will be you. This is the end of the run.', 'niche'); return; }
              api.say('The wind drops. Along the hill, as far as you can see, the salt line glitters as if wet.', 'end');
              api.end('won', 'You have carried Saint Dunstan\'s Rib to the boundary. The road home is five days, and every one of them is a little lighter. This is the end of the run.', 'whole');
            } }
        ]
      }
    },
    foes: {
      hag: { name: 'The Salt Hag', art: 'hag', hp: 16, attack: 2, damage: 6,
        card: 'A very old woman with a horn spoon, who scrapes the salt from boundary stones and eats it. She is much stronger than she looks.',
        appears: function (api) {
          var f = api.s.fight, out = 'Behind the shrine an old woman is scraping salt from a boundary stone with a horn spoon, and eating it. She is very old, and she stands up quickly.';
          if (api.flag('mended')) { f.hp.cur = Math.max(1, f.hp.cur - 6); out += ' The mended line has burned her: she starts hurt.'; }
          if (api.story('clue')) { f.easy = (f.easy || 0) + 1; out += ' You know her from the hanged man\'s story, and how she will come at you: your first attack is Easy.'; }
          return out;
        },
        hits: 'Her horn spoon opens your cheek to the bone',
        defeated: 'She falls into her own heap of salt, and it takes her the way water takes salt. In a moment there is only a horn spoon and a silver case, bent and empty.',
        weakness: 'The niche tells you: she cannot step over salt she did not scrape. Keep a line of it at your back.' }
    }
  };

  A.mere = {
    id: 'mere', act: 'finale', fits: ['missing'], title: 'The Mere of Ossvaer', target: 13, start: 'edge',
    endings: { saved: 'Sister Ignatia led home', pulled: 'Sister Ignatia pulled from the water', alone: 'Home alone' },
    intro: function (api) { api.say('The last day. Past the boundary stones the road gives up. The footprints do not.'); },
    fall: function () { return 'You hear your own mother calling, at the end, and you go to her. The mere is very still afterwards.'; },
    timers: {
      ignatia: { name: 'Sister Ignatia\'s last steps', room: 'mere', max: 5,
        text: 'Sister Ignatia is walking into the mere, one step each round. At 0 the water closes over her.',
        out: function (api) { api.flag('lost', true); api.say('Sister Ignatia takes the last step. The water closes over her grey habit without a sound.', 'hurt'); } }
    },
    rooms: {
      edge: {
        name: 'Beyond the Stones', short: 'beyond the stones', art: 'stones',
        text: 'The last boundary stone stands behind you. Ahead is moor, and on the moor a mere, black and flat, ringed with standing stones that no saint\'s mark was ever cut into. A figure in grey stands at the water\'s edge, very still.',
        secret: 'The moor remembers every pilgrim who walked out this way in their sleep. It has stopped counting.',
        exits: { north: 'mere' },
        actions: [
          { id: 'call', label: 'Call her name', words: ['call', 'shout', 'name', 'ignatia'], when: function (api) { return !api.flag('called'); },
            run: function (api) { api.flag('called', true); api.say('"Ignatia!" She does not turn. Across the water, in a voice you know, someone answers for her.'); api.horror(1, 'The voice is your own mother\'s.'); } }
        ]
      },
      mere: {
        name: 'The Mere', short: 'the mere', art: 'mere',
        text: function (api) { return 'Black water, flat as slate, in a ring of leaning stones.' + (api.flag('lost') ? ' There is no one at the water\'s edge now.' : api.flag('beat_widow') ? ' Sister Ignatia stands up to her knees in the water, shaking, awake.' : ' Sister Ignatia stands up to her knees in it, walking slowly out, answering someone softly.'); },
        secret: 'The stones remember the mere\'s other name, and it is the name of a woman.',
        exits: { south: 'edge' },
        enter: function (api) { if (!api.flag('beat_widow') && !api.s.fight) { api.fight('widow'); if (!api.flag('lost')) { api.timer('ignatia', 'start'); api.say('Sister Ignatia is still walking. Each round, she is a step deeper.', 'note'); } } },
        actions: [
          { id: 'lead', label: 'Lead Sister Ignatia out of the water', words: ['lead', 'ignatia', 'sister', 'take', 'help'], when: function (api) { return api.flag('beat_widow') && !api.flag('lost'); },
            run: function (api) {
              api.say('She lets you take her hand. Her eyes are open. "She sounded just like her," she says. "Just like her."', 'npc');
              api.end('won', 'You walk Sister Ignatia back over the boundary stones, and she does not look behind her, and neither do you. This is the end of the run.', 'saved');
            } },
          /* the water has closed over her: going in after her is one try, Easy on a rope */
          { id: 'dive', label: 'Go into the mere after her', words: ['dive', 'swim', 'water', 'after', 'pull'], when: function (api) { return api.flag('beat_widow') && api.flag('lost') && !api.flag('dived'); },
            run: function (api) {
              api.flag('dived', true); var rope = api.has(ROPES);
              api.say(rope ? 'You tie your rope round a leaning stone and wade out, and go under where the grey habit went down.' : 'You wade out and go under where the grey habit went down. The cold shuts your eyes for you.');
              if (rope) api.used(rope.name);
              var c = api.check('STR', { adj: rope ? 'easy' : 'normal', what: 'Pulling her out' });
              if (c.success) {
                api.flag('pulled', true);
                api.say('Your hand finds wool, then an arm. You come up with her, both of you coughing black water, and drag her up the bank. She is breathing. She looks at you as if she has been a long way away.', 'npc');
                api.end('won', 'You carry Sister Ignatia back over the boundary stones on your back. She will not speak of the mere, and in the spring she takes the veil again. This is the end of the run.', 'pulled');
              } else { var n = api.die(6); api.hurt(n, 'The cold and the weed have you before you find her, and you only just find the bank again (d6 shows ' + n + ')'); api.horror(1, 'Something under the water held your ankle a moment, and let go.'); }
            } },
          { id: 'turn', label: 'Turn back for the boundary', words: ['turn', 'back', 'leave', 'go'], when: function (api) { return api.flag('beat_widow') && api.flag('lost'); },
            run: function (api) { api.end('won', api.story('convent') ? 'You walk back alone over the boundary stones. At Vesperholt you will have to tell Mother Cordula, and the sisters, and her mother\'s grave. This is the end of the run.' : 'You walk back alone over the boundary stones. In Grimsby Fold you will have to tell Hob Sallow, and her order, and her mother\'s grave. This is the end of the run.', 'alone'); } }
        ]
      }
    },
    foes: {
      widow: { name: 'The Mere Widow', art: 'widow', hp: 16, attack: 2, damage: 6, undead: true,
        card: 'A drowned woman in a widow\'s veil who calls in the voices of your dead. Folk say she wants company, and is never satisfied.',
        appears: function (api) {
          var f = api.s.fight, out = 'The water in front of Sister Ignatia rises into a shape: a woman in a widow\'s veil, streaming, her arms already open. She speaks with your mother\'s voice.';
          if (api.story('tracks')) { f.easy = (f.easy || 0) + 1; out += ' You know Ignatia\'s ways now; you know which way she will move, and where the widow will be. Your first attack is Easy.'; }
          return out;
        },
        hits: 'Cold hands pull you toward the water',
        defeated: 'The widow comes apart like a wave on stone. For a moment the mere is only a mere.',
        weakness: 'The stones tell you: she cannot leave the water. Fight her from the bank.' }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
