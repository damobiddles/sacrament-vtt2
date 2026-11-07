/* Sacrament RPG solo: the second batch of scenes for "The Pilgrim Road" (road.js): a third reason to be on the road (an opening and the finale that
   answers it) and three more middle scenes. Words only, as in road.js: every number comes from the rules and the gear list through engine.js. Foes'
   numbers are the game's own, as a GM sets a monster's. Each scene gives the spell and item tags (gear.js, "When in doubt" on the Rules page) something
   to answer, and each has more than one way through: talk, a trick, a fight. Names follow docs/lore/sacrament-lore.md (Part 1 and the naming guide only). */
(function (root) {
  'use strict';
  var A = root.SacramentSoloAdventures = root.SacramentSoloAdventures || {};
  /* What the road says about the hero's charge: the stolen relic, the missing sister, or the runaway deacon. */
  var told = function (api, t) { return t[api.charge()] || t.missing; };
  var hurt = function (api) { return api.s.hp.cur < api.s.hp.max || api.s.horror > 0; };

  /* ---------- an opening: the Inquisition's warrant for a deacon who stole a forbidden book ---------- */
  A.warrant = {
    id: 'warrant', act: 'opening', gives: 'warrant', title: 'The Inquisitor\'s Warrant', target: 11, start: 'chapter',
    intro: function (api) { api.say('Wexstead, a market town on the pilgrim road. The Inquisition keeps a chapter-house on the square, and tonight its door is open to you.'); },
    fall: function () { return 'The Inquisition writes your name in a ledger, under a line, and sends for someone else.'; },
    rooms: {
      chapter: {
        name: 'The Chapter-House', short: 'the chapter-house', art: 'chapter',
        text: function (api) {
          return 'A long room of dark panelling, a table under a crucifix, ledgers in rows to the ceiling.'
            + (api.flag('talked') ? ' Inquisitor Mathilde Orme has gone back to her writing.' : ' Inquisitor Mathilde Orme sits at the table writing, and does not look up.')
            + (api.flag('beat_pardoner') || api.flag('questioned') ? ' The cell at the back stands open.' : ' In a cell at the back a man in a pardoner\'s coat sits on the floor with his hands tied.');
        },
        secret: 'The ledgers remember every name written in them. One page is newer than the rest: Deacon Nikolas Brand, keeper of this house\'s strongroom for twelve years, for the theft of a forbidden book. The ink is still soft.',
        actions: [
          { id: 'inquisitor', label: 'Speak with the Inquisitor', words: ['speak', 'talk', 'inquisitor', 'mathilde', 'orme'], when: function (api) { return !api.flag('talked'); },
            run: function (api) {
              api.flag('talked', true); api.story('warrant', true);
              api.say('"Deacon Nikolas Brand kept our strongroom for twelve years," she says, still writing. "Four nights ago he walked out of it with a book we have kept locked since before I was born, the Unsealed Canticles, and took the pilgrim road toward the boundary."', 'npc');
              api.say('She seals a paper and pushes it across the table. "A warrant. Bring him back to answer for it, or bring back the book. I would rather the book."', 'npc');
              api.say('You carry the Inquisition\'s warrant for Deacon Nikolas Brand. Find him before he reads the book.', 'note');
              api.say('"The pardoner in the cell sold him a horse," she adds. "Question him, if you have the stomach. He will talk to you sooner than to me."');
            } },
          { id: 'pardoner', label: 'Question the pardoner', words: ['question', 'pardoner', 'cell', 'benedikt', 'ask'], when: function (api) { return api.flag('talked') && !api.flag('questioned') && !api.flag('beat_pardoner') && !api.s.fight; },
            run: function (api) {
              api.flag('questioned', true); api.say('You crouch at the bars. The pardoner smiles at you as if you were a customer.');
              var c = api.check('CHA', { what: 'Questioning the pardoner' });
              if (c.success) {
                api.story('notes', true);
                api.say('"Benedikt," he says. "Pardoner. I sold your deacon a horse and he paid me in indulgences, signed. He talked all night about the barrow at Ulm Vethra, past the last boundary stone, where he means to read. He is no fighter. He holds the book in his left hand and he never lets go of it."', 'npc');
                api.say('You know how the deacon will move: your first attack in the last scene will be Easy.', 'note');
                api.loot('From the pardoner\'s coat');
              } else { api.say('"Indulgences!" he says brightly, and the rope falls off his wrists. He has had a knife in his sleeve the whole time.'); api.fight('pardoner'); }
            } },
          { id: 'coat', label: 'Search the pardoner\'s coat', words: ['search', 'coat', 'pardoner'], when: function (api) { return api.flag('beat_pardoner') && !api.flag('coat'); },
            run: function (api) { api.flag('coat', true); api.say('Lead seals sewn into the lining, a hundred pardons with the names left blank, and one thing worth having.'); api.loot('The pardoner\'s coat'); } },
          { id: 'rest', label: 'Sleep in the Inquisition\'s guest room', words: ['rest', 'sleep', 'bed'], when: function (api) { return api.flag('talked') && !api.s.rested && !api.s.fight && hurt(api); },
            run: function (api) { api.say('A clean bed and a door that locks from the outside. You sleep anyway.'); api.rest(); } },
          { id: 'go', label: 'Set out on the road', words: ['set', 'out', 'leave', 'road', 'go'], when: function (api) { return api.flag('talked') && !api.s.fight; },
            run: function (api) { api.end('won', 'You go out into the square with the warrant inside your coat. Behind you the Inquisitor\'s pen starts again.'); } }
        ]
      }
    },
    foes: {
      pardoner: { name: 'The Pardoner', art: 'pardoner', hp: 8, attack: 1, damage: 4,
        card: 'A seller of pardons in a coat sewn with lead seals, quick and cheerful, with a knife up his sleeve.',
        appears: 'He comes out of the cell low and fast, still smiling, the little knife held close.',
        hits: 'His knife finds the gap under your arm',
        defeated: 'He sits down against the wall holding his side, and laughs. "Fair," he says. "Fair." And then he tells you everything anyway.',
        after: function (api) {
          api.story('notes', true);
          api.say('"The barrow at Ulm Vethra, past the last boundary stone. That is where he means to read. He holds the book in his left hand, and he never lets go of it."', 'npc');
          api.say('You know how the deacon will move: your first attack in the last scene will be Easy.', 'note');
        },
        weakness: 'The ledgers say he has been taken eleven times and never once fought fair. Watch his other hand.' }
    }
  };

  /* ---------- the finale that answers it: the deacon reading at the barrow ---------- */
  A.barrow = {
    id: 'barrow', act: 'finale', fits: ['warrant'], title: 'The Barrow at Ulm Vethra', target: 13, start: 'barrow',
    intro: function (api) { api.say('The last day. Past the last boundary stone the pilgrim road goes on as a sheep track, and then as nothing. On a bare hill stands the barrow the pardoner named.'); },
    fall: function () { return 'A shepherd finds the warrant a year later, in the heather by the barrow, its seal unbroken. Of the deacon and the book, nothing.'; },
    timers: {
      reading: { name: 'The deacon\'s reading', room: 'barrow', max: 4, tick: 'action',
        text: 'He is reading aloud. It loses 1 each time you do something here before you face him. At 0 he reaches the end of the page, and the Horror rises 3.',
        out: function (api) { api.say('He reaches the end of the page and says its last word, and the word goes through you like cold water.', 'horror'); api.horror(3, 'The page is read.'); if (!api.s.fight && !api.flag('beat_deacon') && !api.flag('yielded')) api.fight('deacon'); } }
    },
    rooms: {
      barrow: {
        name: 'Ulm Vethra', short: 'the barrow', art: 'barrow',
        text: function (api) {
          return 'A long mound of turf on a bare hill, older than the Church, with a doorway of three great stones at one end.'
            + (api.flag('beat_deacon') ? ' The deacon lies in the heather by his fire. The book lies face down beside him.'
              : api.flag('yielded') ? ' The deacon sits by his fire with his hands in his lap and the book closed on the ground in front of him.'
                : ' Before the doorway, by a small fire, a man in a deacon\'s black sits cross-legged with a book open on his knees, reading aloud.');
        },
        secret: 'The stones of the doorway are cut with names in letters nobody living can read. They know the deacon. He came here as a boy, they say, to read the names, and he has never stopped wanting to know what they say.',
        enter: function (api, first) { if (first) { api.timer('reading', 'start'); api.say('He is reading. Each thing you do here before you face him, he reads further.', 'note'); } },
        actions: [
          { id: 'call', label: 'Call on him to surrender', words: ['call', 'surrender', 'speak', 'talk', 'warrant'], when: function (api) { return !api.flag('called') && !api.flag('beat_deacon') && !api.s.fight; },
            run: function (api) {
              api.flag('called', true); api.say('You hold up the Inquisition\'s warrant so the fire lights the seal, and say his name.');
              var c = api.check('CHA', { what: 'Calling him to surrender' });
              if (c.success) {
                api.flag('yielded', true); api.timer('reading', 'stop');
                api.say('"The Inquisition," he says, and laughs, and closes the book. "Of course. Mathilde always did finish her ledgers." He holds out his wrists.', 'npc');
              } else { api.say('He looks up, and keeps reading, and the words are for you now.'); api.timer('reading', 'stop'); api.fight('deacon'); }
            } },
          { id: 'rush', label: 'Go for the book', words: ['rush', 'book', 'attack', 'fight', 'grab'], when: function (api) { return !api.flag('beat_deacon') && !api.flag('yielded') && !api.s.fight; },
            run: function (api) { api.say('You go at him across the fire.'); api.timer('reading', 'stop'); api.fight('deacon'); } },
          { id: 'burn', label: 'Burn the book in his fire', words: ['burn', 'book', 'fire'], when: function (api) { return !!api.flag('beat_deacon'); },
            run: function (api) {
              api.say('The pages go up one at a time, slowly, as if each of them were being read one last time.', 'end');
              api.end('won', 'You walk back over the boundary with the deacon on a rope and the ash of the Unsealed Canticles in your boots. At Wexstead the Inquisitor writes it in her ledger, and thanks you in four words. This is the end of the run.');
            } },
          { id: 'lead', label: 'Take him back to answer', words: ['take', 'lead', 'back', 'deacon', 'go'], when: function (api) { return !!api.flag('yielded'); },
            run: function (api) {
              api.say('He walks ahead of you all the way to the boundary, and never once asks for the book back.', 'npc');
              api.end('won', 'At Wexstead the Inquisitor takes the deacon and the book from you without a word, and locks them both away. You do not ask where. This is the end of the run.');
            } }
        ]
      }
    },
    foes: {
      deacon: { name: 'The Runaway Deacon', art: 'deacon', hp: 16, attack: 2, damage: 6, caster: true,
        card: 'Deacon Nikolas Brand, in torn black, with a forbidden book open in his left hand. He reads from it as he fights, and the words hurt to hear.',
        appears: function (api) {
          var f = api.s.fight, out = 'He gets to his feet with the book held open in front of him, and reads at you.';
          if (api.story('notes')) { f.easy = (f.easy || 0) + 1; out += ' The pardoner was right: he keeps the book in his left hand and turns his whole body to guard it. Your first attack is Easy.'; }
          return out;
        },
        hits: 'He reads a line at you, and your nose runs with blood',
        defeated: 'He goes down on his knees, and the book falls out of his hand at last, face down in the heather.',
        weakness: 'The stones tell you he cannot read and strike at once. When he turns a page, close with him.' }
    }
  };

  /* ---------- the plague pit: helping the sexton bury the dead before what eats them comes up ---------- */
  var thanks = function (api) { if (api.flag('thanked')) return; api.flag('thanked', true); api.say('Wulf gives you what the dead had on them that the lime would only waste.'); api.loot('The sexton\'s thanks'); };
  A.pit = {
    id: 'pit', act: 'middle', lean: 'early', tease: 'A rope across the road, and a bell on the rope.', title: 'The Plague Pit at Pellstead', target: 12, start: 'pit',
    intro: function (api) { api.say('Pellstead has the plague. A rope across the road, and a bell on the rope. Past it, at the edge of the churchyard, an old man is filling a pit.'); },
    fall: function () { return 'The sexton puts you in the pit with the others and says the words over all of you at once, which is quicker.'; },
    obstacles: {
      fill: { name: 'The open pit', room: 'pit', max: 6, stat: 'STR', cat: 'basic', clock: 'stirring',
        answers: { shelter: 'You say the burial office over the pit as you work. The dead lie easier, and the earth goes in faster.', bind: 'The loose earth at the edge of the pit holds together and goes down in one slab.', move: 'The spoil heap shifts by itself and slides into the pit.' },
        text: 'A long pit half full of the plague dead, white with lime. Shovel the earth in (STR, Basic Effort), bring the spoil heap down in one go (STR, Weapons Effort, but a failure buries you to the waist and hurts), or ask the sexton where the ground is soft (WIS, once: half of what is left). Each failed try gives what is down there more time.',
        ways: [
          { id: 'heap', kind: 'bold', label: 'Bring the spoil heap down in one go', stat: 'STR', say: 'You dig out the foot of the spoil heap and let it come.', what: 'Bringing the heap down', failSay: 'The heap comes down on you instead' },
          { id: 'soft', kind: 'trick', label: 'Ask the sexton where the ground is soft', stat: 'WIS', say: 'You ask Wulf where to dig. He tells you, though he does not like to.', what: 'Asking the sexton', failSay: 'He only shakes his head and digs.' }
        ],
        isDone: function (api) { return !!api.flag('filled'); },
        done: function (api) {
          api.flag('filled', true); if (api.s.fight) return;
          api.say('The last of the earth goes in. Something under it moves once, and then does not.');
          if (!api.flag('beat_ghoul')) api.say('"That one was coming up," says Wulf the Sexton. "Every night it got a little further."', 'npc');
          thanks(api);
        } }
    },
    timers: {
      stirring: { name: 'Something in the pit', room: 'pit', max: 3, tick: 'fail',
        text: 'Each failed try at the pit gives what is under the dead more time. At 0 the Pit Ghoul climbs out.',
        out: function (api) { if (api.flag('beat_ghoul') || api.s.fight) return; api.say('The dead at the bottom of the pit heave, and something long and grey pulls itself up out of them.', 'foe'); api.fight('ghoul'); } }
    },
    rooms: {
      pit: {
        name: 'The Plague Pit', short: 'the plague pit', art: 'pit', dead: true,
        text: function (api) {
          return 'The churchyard at Pellstead. The church is shut, a plague cross daubed on its door. At the edge of the yard is a long pit'
            + (api.flag('filled') ? ', filled and trodden flat.' : ', half full and white with lime.') + ' Wulf the Sexton, an old man in a leather apron, is shovelling earth into it without stopping.';
        },
        secret: function (api) {
          return 'The dead in the pit answer all together, from under the lime: "Something was down here before us. It eats." '
            + told(api, { relic: '"An old woman with salt in her apron came by. She did not stop for us either."', missing: '"A sister in grey walked past the rope in her sleep. She did not hear the bell."', warrant: '"A deacon in black rode by on a borrowed horse, reading as he rode. He did not look up once."' });
        },
        enter: function (api, first) { if (first) api.timer('stirring', 'start'); },
        actions: [
          { id: 'sexton', label: 'Speak to the sexton', words: ['speak', 'talk', 'sexton', 'wulf'], when: function (api) { return !api.flag('spoke') && !api.s.fight; },
            run: function (api) { api.flag('spoke', true); api.say('"Plague," says Wulf the Sexton, still shovelling. "Forty of them, and I am behind. Something comes up out of the pit at night and takes them back out, a few at a time. Help me get the earth in, and I will owe you."', 'npc'); } },
          { id: 'shovel', label: 'Shovel earth into the pit', words: ['shovel', 'dig', 'fill', 'earth', 'bury'], when: function (api) { return !api.flag('filled'); },
            run: function (api) { api.say('Wulf hands you a spare spade.'); var c = api.work('fill', { what: 'Filling the pit' }); if (!c.success) api.say('The earth slides back off the lime. Under it, something shifts.'); } },
          { id: 'go', label: 'Go on past the rope', words: ['go', 'leave', 'on', 'rope'], when: function (api) { return (api.flag('filled') || api.flag('beat_ghoul')) && !api.s.fight; },
            run: function (api) { api.end('won', 'You go out past the rope and the bell. Behind you the sexton is singing as he treads the earth down, a song with no tune.'); } }
        ]
      }
    },
    foes: {
      ghoul: { name: 'The Pit Ghoul', art: 'ghoul', hp: 12, attack: 2, damage: 6,
        card: 'A long grey thing with too many joints, that lives under the plague dead and eats them. The lime has burned it white in patches.',
        appears: 'It comes up out of the pit on all fours, quick as a dog, floured with lime.',
        hits: 'Its teeth close on your shoulder, and they are not a man\'s teeth',
        defeated: 'It slides back into the pit and lies among the dead, one more of them now.',
        after: function (api) { if (api.flag('filled')) thanks(api); else api.say('With it gone, the pit is only a pit. Wulf holds out the spade again.', 'npc'); },
        weakness: 'The dead tell you it cannot bear the lime. Drive it back toward the white, and it flinches.' }
    }
  };

  /* ---------- the players at the inn: which of them is not one of the company? ---------- */
  var ROLES = ['saint', 'demon', 'fool'], ROLE = { saint: 'the Saint', demon: 'the Demon', fool: 'the Fool' };
  var CLUE = {
    saint: 'The Saint\'s gilded halo is painted on a board, and the board casts no shadow.',
    demon: 'The Demon\'s horns are wood and glue, and under them the Demon has no breath that shows in the cold.',
    fool: 'The Fool laughs a beat before every joke, as if it had heard them all a long time ago.'
  };
  var accuse = function (role) {
    return { id: 'accuse_' + role, label: 'Name ' + ROLE[role] + ' as the stranger', words: ['accuse', 'name', role], when: function (api) { return !api.flag('accused') && !api.s.fight && !api.flag('beat_mummer'); },
      run: function (api) {
        api.flag('accused', true); api.timer('play', 'stop');
        api.say('You climb onto the cart in the middle of the scene and pull the mask from ' + ROLE[role] + '.');
        if (api.flag('false') === role) { api.flag('unmasked', true); api.say('Under the mask there is another face, and another under that.', 'foe'); }
        else { api.say('Under the mask is a frightened young man called Lucan, who has played ' + ROLE[role] + ' since he was twelve. The crowd roars. And in the noise, ' + ROLE[api.flag('false')] + ' steps down off the cart and comes for you.'); api.horror(1, 'You named the wrong one.'); }
        api.fight('mummer');
      } };
  };
  A.inn = {
    id: 'inn', act: 'middle', lean: 'any', tease: 'Players in the inn yard tonight.', title: 'The Players at Tarnby', target: 12, start: 'yard',
    intro: function (api) { api.say('At Tarnby the inn yard is full. A company of travelling players has made a stage of their cart, and tonight they play the Binding as the Church tells it: a Saint, a Demon, and a Fool to make the children laugh.'); },
    fall: function () { return 'The players move on in the morning, three of them, or four. Nobody at Tarnby can say which.'; },
    timers: {
      play: { name: 'The play', room: 'yard', max: 5, tick: 'action',
        text: 'The play has five scenes. It loses 1 each time you do something here. When it ends, the stranger among the players takes someone from the crowd.',
        out: function (api) { if (api.s.fight || api.flag('beat_mummer')) return; api.say('The play ends and the crowd cheers. In the cheering, ' + ROLE[api.flag('false')] + ' steps down off the cart, takes a child by the hand, and walks toward the gate. You are the only one who sees.', 'foe'); api.fight('mummer'); } }
    },
    rooms: {
      yard: {
        name: 'The Inn Yard at Tarnby', short: 'the inn yard', art: 'inn',
        text: function (api) {
          return 'An inn yard lit with torches, packed with farmers and their children. On the players\' cart a Saint in gold, a Demon in red and a Fool in motley are halfway through the Binding.'
            + (api.flag('beat_mummer') ? ' The play has stopped. Three players sit on the edge of the cart, very quiet.' : ' There were three players in the company when they came through the gate. There are three on the cart. Something about it is wrong.');
        },
        secret: function (api) { return 'The cart remembers who came into the yard tonight: three players, and one more that came in with them in the dark. It is wearing the face of ' + ROLE[api.flag('false')] + '.'; },
        enter: function (api, first) { if (first) { api.flag('false', ROLES[api.die(3) - 1]); api.timer('play', 'start'); } },
        actions: [
          { id: 'master', label: 'Talk to the players\' master', words: ['talk', 'master', 'theodric', 'speak'], when: function (api) { return !api.flag('master') && !api.s.fight && !api.flag('beat_mummer'); },
            run: function (api) {
              api.flag('master', true);
              api.say('"Three of us," says Master Theodric, counting the takings. "Three since Aubrecht. But I have fed four every night this week, and I cannot tell you who the fourth is. I look at them and they are all my own."', 'npc');
              api.say(told(api, { relic: '"An old woman paid us in salt to play at Saint Aubrel\'s Cross next month. We are not going."', missing: '"A sister in grey watched us last night from the back, with her eyes shut. She laughed in all the right places."', warrant: '"A deacon in black bought a horse off a pardoner here four days ago. Paid in indulgences, signed."' }), 'npc');
            } },
          { id: 'watch', label: 'Watch the players closely', words: ['watch', 'look', 'study', 'players'], when: function (api) { return !api.flag('clued') && !api.flag('accused') && !api.s.fight && !api.flag('beat_mummer'); },
            run: function (api) {
              api.say('You push to the front of the crowd and watch the players, not the play.');
              var c = api.check('WIS', { what: 'Watching the players' });
              if (c.success) { api.flag('clued', true); api.say(CLUE[api.flag('false')], 'npc'); }
              else api.say('They are good. You forget to watch, and laugh at the Fool with everyone else.');
            } },
          accuse('saint'), accuse('demon'), accuse('fool'),
          { id: 'cart', label: 'Search the players\' cart', words: ['search', 'cart', 'costumes'], when: function (api) { return api.flag('beat_mummer') && !api.flag('cart'); },
            run: function (api) { api.flag('cart', true); api.say('Costumes, a box of greasepaint, a painted sky on a roll of canvas. Master Theodric tells you to take what you like. He means it.'); api.loot('The players\' cart'); } },
          { id: 'go', label: 'Go on in the morning', words: ['go', 'leave', 'morning', 'on'], when: function (api) { return !!api.flag('beat_mummer'); },
            run: function (api) { api.end('won', 'In the morning the players go one way and you go the other. Master Theodric counts his company twice before they leave.'); } }
        ]
      }
    },
    foes: {
      mummer: { name: 'The Painted Mummer', art: 'mummer', hp: 12, attack: 2, damage: 6, caster: true,
        card: 'A player in a painted mask that is not a mask. It wears faces the way the players wear costumes, and it speaks in other people\'s voices.',
        appears: function (api) {
          var f = api.s.fight, out = 'It turns its painted face to you, and for a moment the face is yours.';
          if (api.flag('unmasked')) { f.easy = (f.easy || 0) + 1; out += ' You found it before it was ready: your first attack is Easy.'; }
          return out;
        },
        hits: 'It speaks in the voice of someone you buried, and while you listen it strikes',
        defeated: 'The mask falls into the straw, and there is nothing behind it but the smell of greasepaint.',
        weakness: 'The cart tells you it cannot keep a face it has not seen. Shut your eyes and come at it by its voice.' }
    }
  };

  /* ---------- the old battlefield: sneak past the knight who holds it, fight him, or give him his rites ---------- */
  A.field = {
    id: 'field', act: 'middle', lean: 'late', tease: 'An old battlefield that the crows keep.', title: 'The Field at Fallowby', target: 12, start: 'field',
    intro: function (api) { api.say('Past Fallowby the road crosses an old battlefield, where the lords of the heartlands fought each other a hundred years ago. Nobody ploughs it. The crows have it.'); },
    fall: function () { return 'You lie down on the field with the others. The crows come, and in a hundred years somebody will plough you up.'; },
    obstacles: {
      field: { name: 'The field of the dead', room: 'field', max: 6, stat: 'DEX', cat: 'basic', clock: 'eye',
        answers: { hide: 'The knight\'s helm turns past you as if you were not there, and you cross a long stretch of the field under it.', move: 'You step into the shadow of a dead tree and out of the shadow of the far hedge, halfway over.', beast: 'The crows lift all at once and wheel off to the left, and show you the dry way across.' },
        text: 'Half a mile of broken ground, old pits and older bones, and the knight in the middle of it. Pick a way across (DEX, Basic Effort), run for the far hedge (DEX, Weapons Effort, but a failure puts your foot through a ribcage and hurts), or follow the old cart track the armies used (INT, once: half of what is left). Each failed try draws the knight\'s eye.',
        ways: [
          { id: 'run', kind: 'bold', label: 'Run for the far hedge', stat: 'DEX', say: 'You keep low and run.', what: 'Running the field', failSay: 'Your foot goes through an old ribcage and you go down' },
          { id: 'track', kind: 'trick', label: 'Follow the armies\' old cart track', stat: 'INT', say: 'You look for where the ground was flattened a hundred years ago by wheels.', what: 'Finding the old track', failSay: 'The grass has had it. Every way looks the same.' }
        ],
        isDone: function (api) { return !!api.flag('crossed'); },
        done: function (api) { api.flag('crossed', true); if (api.s.fight) return; api.end('won', 'You come out through the far hedge onto the road. The knight has not moved from his place. He watches you go.'); } }
    },
    timers: {
      eye: { name: 'The knight\'s eye', room: 'field', max: 3, tick: 'fail',
        text: 'Each failed try at the crossing draws the knight\'s eye. At 0 he sees you, and comes.',
        out: function (api) { if (api.s.fight || api.flag('beat_knight') || api.flag('rites')) return; api.say('The knight turns his helm toward you, raises his sword to it in salute, and comes on across the field.', 'foe'); api.fight('knight'); } }
    },
    rooms: {
      field: {
        name: 'The Field at Fallowby', short: 'the field', art: 'field', dead: true,
        text: function (api) {
          return 'A wide grey field under a low sky, all hummocks and old pits, with rusted iron in the grass.'
            + (api.flag('beat_knight') || api.flag('rites') ? ' In the middle of it a suit of old armour lies in the grass, and the crows have gone.' : ' In the middle of it a knight in old armour stands among the crows, leaning on his sword, as if the battle were only resting.');
        },
        secret: function (api) {
          return 'The bones of the field tell you about him: Ser Rainald of Fallowby, who held this field for his lord and was never told the war was over. Nobody came back to bury him. '
            + told(api, { relic: '"An old woman went by with a horn spoon," the bones add. "She scraped the salt off the field-stone, and he let her pass."', missing: '"A sister in grey crossed in her sleep," the bones add. "He saluted her. She did not see."', warrant: '"A deacon rode across at a gallop, reading," the bones add. "The knight let him by. He will not fight a man who will not draw."' });
        },
        enter: function (api, first) { if (first) api.timer('eye', 'start'); },
        actions: [
          { id: 'cross', label: 'Pick a way across the field', words: ['cross', 'field', 'walk', 'sneak'], when: function (api) { return !api.flag('crossed') && !api.flag('beat_knight') && !api.flag('rites') && !api.s.fight; },
            run: function (api) { api.say('You go out among the hummocks, keeping the knight on your left.'); var c = api.work('field', { what: 'Crossing the field' }); if (!c.success) api.say('Something cracks under your boot. Out in the field, a helm turns.'); } },
          { id: 'duel', label: 'Accept the knight\'s challenge', words: ['duel', 'challenge', 'fight', 'knight'], when: function (api) { return !api.flag('beat_knight') && !api.flag('rites') && !api.s.fight; },
            run: function (api) { api.timer('eye', 'stop'); api.say('You walk out to him in the open and draw. He raises his sword to his helm, and lowers it.'); api.fight('knight'); } },
          { id: 'rites', label: 'Give the knight his burial rites', words: ['rites', 'pray', 'bury', 'office'], when: function (api) { return !api.flag('tried') && !api.flag('beat_knight') && !api.s.fight; },
            run: function (api) {
              api.flag('tried', true); api.timer('eye', 'stop');
              api.say('You walk out to him with empty hands, kneel in the grass in front of him, and begin the office for the dead.');
              var c = api.check('WIS', { what: 'Saying the office' });
              if (c.success) {
                api.flag('rites', true);
                api.say('He listens to all of it. When you reach the end he goes down on one knee, and then he lies down in the grass, and he is only bones in old armour.', 'win');
                api.loot('Ser Rainald\'s harness');
              } else { api.say('You stumble on the words. He hears that it is not said right, and lifts his sword.'); api.fight('knight'); }
            } },
          { id: 'bones', label: 'Search the dead in the grass', words: ['search', 'dead', 'bones', 'grass'], when: function (api) { return !api.flag('searched') && !api.s.fight; },
            run: function (api) { api.flag('searched', true); api.say('Rusted mail, a boot with the foot still in it, and one thing the crows did not want.'); api.loot('The battlefield'); } },
          { id: 'go', label: 'Walk on across the field', words: ['go', 'on', 'leave', 'walk'], when: function (api) { return (api.flag('beat_knight') || api.flag('rites')) && !api.s.fight; },
            run: function (api) { api.end('won', 'You walk across the field in the open. The crows do not come back while you are on it.'); } }
        ]
      }
    },
    foes: {
      knight: { name: 'The Unburied Knight', art: 'knight', hp: 16, attack: 2, damage: 6, undead: true,
        card: 'A knight in old plate, rust and crows, who still holds a battlefield nobody wants. He fights fair, and he does not tire.',
        appears: 'He comes on at a walk, his sword held up before his helm, the way knights were taught a hundred years ago.',
        hits: 'His old sword comes down on you like a door closing',
        defeated: 'He falls with a noise like a dropped kitchen and lies still, and the crows come down on him at once.',
        weakness: 'The bones tell you his own squire killed him from behind. He guards his back too well. Come at him from the front, openly.' }
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
