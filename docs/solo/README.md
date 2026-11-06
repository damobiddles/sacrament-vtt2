# Sacrament RPG solo (`/solo/`)

A solo, 80s-text-adventure-style game for one hero, with pictures painted like an illuminated manuscript and an 8-bit soundtrack, playable on a phone, tablet or computer. **Status: The Pilgrim Road, a five-scene run (2026-11-06); not linked from the site, `noindex`.**

## A run: The Pilgrim Road (owner, 2026-11-06)

A game is **five scenes**, picked in a semi-random order that always makes sense as a story (`site/solo/road.js`, picked by `startRun`/`pickOrder` in the engine):

1. **An opening** (one of two), which sets what the hero carries along the road: *The Priory Gate* (a saint's relic to bring to a shrine) or *The Empty Cart* (a missing sister to find).
2. **Three middle scenes** drawn from five: *The Drowned Ford*, *The Penitent's Barn*, *The Gibbet Crossroads*, *The Silent Bell*, *The Ossuary Stair*. Each says whether it fits early, anywhere or late on the road, and the three are put in that order.
3. **A finale that matches the opening:** the relic ends at *The Salt Shrine*, the missing sister at *The Mere of Ossvaer*.

HP, Horror, gear and used healing carry from scene to scene. When a scene is done the player may rest once (if hurt) before going on. Earlier scenes can leave marks that matter later (tracks found at the cart, a clue from an NPC make the finale's first attack Easy).

**Friends on the road (owner's names, 2026-11-06):** Xian of Wycbold, Ser Dom of Cookham, Rupert the Druid, Matthew of the Brown Order of Farts and Lord Biddles of Wooburn. Up to three turn up per run, never in the finale, each in the first place of a scene, and each helps once (a find, a free rest, bandages, rations, or a clue). **Their names always show in green.** The names are the owner's own and stay exactly as given.

**Hearts over foes (owner, 2026-11-06):** a foe's life shows as Hearts (10 HP a Heart, as at the table) above it in the picture and on its card.

**Timers** can now tick per fight round (Odo's breath) or per thing done outside a fight (the rising river, full dark at the gibbet).

The save version went to 2: a game saved before the run existed is not loaded, and the player starts again.

## Pitch

You play one hero alone through short written adventures in the world of Sacrament. Each place has a picture in the style of an illuminated manuscript and its own tune, a few lines of text, and big buttons for what you can do. (A box for typing commands, in the old text-adventure way, was removed at the owner's request on 2026-11-06: every move has a button.) The game is the GM: it sets the Target, says when it is dark, and decides what a failure costs. Everything else is the real rules.

* **Heroes:** bring a hero from My heroes, or take a ready-made one (the hero generator). The game plays a **copy**; My heroes is never changed.
* **Rules reused, not rewritten:** checks (`R.check`), Effort damage (`R.effort`, natural 20 critical), monster attacks against Defence (`R.attack`, `C.defence`), the Horror meter with thresholds, the natural-1 rule (attacks, spells, pushes only), push for 1 Horror after a missed attack, pay in blood past 21, rest (a Heart back, Horror down d10), healing items and spells with their once-per-rest limit, crossbow and heavy-weapon bonuses.
* **Gear and loot:** items, spells and grimoires come from `site/sheet/gear.js` through `C.actions`/`C.useOf`; finds are rolled on the real d100 loot table (`C.rollLoot`).
* **Pictures:** medieval miniatures, as in an illuminated book (owner, 2026-11-06), drawn in code as SVG (`art.js`): flat mineral colours (lapis, vermilion, verdigris, ochre, lead white) inside a dark ink outline, night skies of lapis sown with gold stars, walls hung with a red-and-blue chequer, light shown as gold rays, a vellum mottle and a gilded border over every picture. The hero is a pilgrim in a hooded mantle, face shown plainly, with a scallop shell; the mantle is lapis with a spell book, vermilion with armour, green otherwise. Subtle motion with CSS: stars glinting, mist drifting, a hem stirring, eyes that blink, wax that drips, flames that flicker (all still for reduced motion). No image files. (Pixel art first, then anime, then dark fantasy; the owner asked for medieval / renaissance on 2026-11-06. The dark fantasy version is in git history.)
* **Always on show (owner, 2026-11-06):** the scene's Target sits beside HP and Horror, with a "Hard: dark" tag when the dark makes every check Hard. Every spell and item button has a **?** that opens what it does, in the gear list's own words, and the hero sheet lists each grimoire's spells with their text.
* **Cards, obstacles and timers (owner, 2026-11-06), borrowed from the table:** a row of cards under the picture shows what is in the place: the foe (HP, attack), an **obstacle** with an Effort bar (the tower door: each try is a STR check, Easy with a crowbar; a success rolls Basic Effort into a bar of 6; a failed try is loud) and a **timer** (Brother Odo's breath: 5, loses 1 at the start of each new round while the Candle-Eater feeds; at 0 he dies and it heals 4). Tap a card to read it.
* **Story spells (owner, 2026-11-06):** spells with no Effort die (Hush, Kindle, Open Door...) are given solo rulings in `site/solo/spells.js`, from their own words: light a dark place; learn its shape (Echo Bell: the dark stops making checks Hard); Dazed or can't see you (the foe's next attack rolls 3 less); +2 Defence until your next turn; put out a burning foe's flame (it loses its next attack); open or bring down an obstacle; learn one true thing (in a fight: your next attack is Easy; out of one: the place's secret; the dead-speaking spells need the dead nearby). An adventure can answer a spell its own way first (Mouth of Wax stops the Candle-Eater feeding on Odo). **A spell nothing here answers shows "No use here", and tapping it costs nothing.** Ward (an ally only) has no use alone: whether it may target yourself is still the owner's open call. These are solo rulings, not rules; the owner may change any of them.
* **A foe's death:** when the last hit lands, the foe sags and melts into its own wax and its flame goes out (about 2 seconds; skipped for reduced motion).
* **Music:** original 8-bit tunes played by the browser itself (`music.js`, Web Audio: two square-wave voices, a triangle bass, a noise drum). One tune per place, one for a fight, one each for winning and falling. Off until the player taps "♪ Off" in the top bar; the choice is remembered in this browser. No sound files. A unit test checks every voice of a tune is the same length so they loop in step.
* **Dice:** the table's own tumbling dice and result card (`site/vtt/dice.js`), with the same words: CRITICAL HIT, SUCCESS, MISS, FAILED CHECK, HIT. A hit waits for **Roll damage** on the card, as at the table.
* **Combat in turns, borrowed from the table:** a turn strip (round, the hero, the foe, the foe's wax meter). On your turn: attack, cast or use an item. A hit waits for Roll damage; a miss offers a push (+1 Horror) or End your turn. Then the foe attacks against your Defence, d20 and damage die together on one card.
* **Installable:** `manifest.webmanifest` lets a phone add it to the home screen. Not yet offline (no service worker).

## Files

| File | What |
|---|---|
| `site/solo/engine.js` | The engine: no page, no clock, no random source (dice are passed in). Tested by `test/solo.test.mjs`. |
| `site/solo/adventure-silent-bell.js` | The Silent Bell (a middle scene): words, places, one foe. Words only; numbers come from the rules. |
| `site/solo/road.js` | The Pilgrim Road: the run's other eight scenes and the five friends on the road. |
| `site/solo/spells.js` | Solo rulings for story spells. |
| `site/solo/art.js` | The pictures, as illuminated miniatures (SVG). |
| `site/solo/music.js` | The 8-bit soundtrack (Web Audio, no files). |
| `site/solo/solo.js`, `solo.css`, `index.html` | The screen. Saves the game in the browser under `sacrament-solo-v1`. |

## Open questions for the owner

1. **Falling alone.** At the table a hero at 0 HP is dying (d4 rounds) and someone can tend them. Alone there is no one, so the test scene ends the attempt. Keep that, or give solo heroes a dying roll of their own?
2. **Horror thresholds.** At 7, 14 and 21 the GM decides what happens. Here the scene only adds a line of text. Should solo thresholds have effects?
3. **Keep finds?** Should a hero who finishes an adventure take finds and wounds back to My heroes, or stay a copy?
4. **Ward on yourself.** Ward targets an ally; alone it shows "No use here". Whether it may target yourself is your call.
6. **Balance.** In a simulated run with random choices about 4 runs in 10 reach the end. Easier or harder?
5. Fonts are now the site's own (Cormorant Garamond, Source Sans 3).

## Feedback and the home-page look (2026-11-06)

* Every choice that rolls shows the number it needs, the chance, and what failing costs. The game works this out by playing the choice on a copy of the game with a low die (`odds()` in `engine.js`), so no adventure needs extra data and the real game is never touched.
* Hits, wounds, Horror and finds can be felt: short sounds (when sound is on), numbers that float off the picture, a jolt on phones that support it, a small card for each find, and a "scene cleared" card. The picture darkens as Horror passes 7, 14 and 21 (looks only; no rule changed).
* The page uses the home page's look: serif headings, gold tracked labels, red buttons with the double edge, a drop cap on each place.
* Pictures stay drawn in code (owner's decision, 2026-11-06: painting every new place and foe would not keep up as scenes are added), in the warmer home-page colours. The support for a painting is still there if one is ever wanted: to add one, put it at `site/art/solo/<place>.webp` (about 1600 × 960) and add one line to `PAINT` in `art.js`; a foe painting goes at `site/art/solo/foe-<id>.webp` on a transparent background and one line in `FOE_PAINT`. 
