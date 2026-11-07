# Sacrament RPG solo (`/solo/`)

A solo, 80s-text-adventure-style game for one hero, with pictures painted like an illuminated manuscript and an 8-bit soundtrack, playable on a phone, tablet or computer. **Status: The Pilgrim Road, a five-scene run (2026-11-06); not linked from the site, `noindex`.**

## A run: The Pilgrim Road (owner, 2026-11-06)

A game is **five scenes**, picked in a semi-random order that always makes sense as a story (`site/solo/road.js`, picked by `startRun`/`pickOrder` in the engine):

1. **An opening** (one of two), which sets what the hero carries along the road: *The Priory Gate* (a saint's relic to bring to a shrine) or *The Empty Cart* (a missing sister to find).
2. **Three middle scenes** drawn from five: *The Drowned Ford*, *The Penitent's Barn*, *The Gibbet Crossroads*, *The Silent Bell*, *The Ossuary Stair*. Each says whether it fits early, anywhere or late on the road, and the three are put in that order.
3. **A finale that matches the opening:** the relic ends at *The Salt Shrine*, the missing sister at *The Mere of Ossvaer*.

HP, Horror, gear and used healing carry from scene to scene. When a scene is done the player may rest once (if hurt) before going on. Earlier scenes can leave marks that matter later (tracks found at the cart, a clue from an NPC make the finale's first attack Easy).

**Friends on the road (owner's names, 2026-11-06 and 2026-11-07):** Xian of Wycbold, Ser Dom of Cookham, Rupert the Druid, Matthew of the Brown Order of Farts, Lord Biddles of Wooburn, Rachel, Witch-finder General, Simon the Scholar and Gussetweasel, the Necromancer (with his amazing invisible bats; added 2026-11-07). Up to three turn up per run, never in the finale, each in the first place of a scene, and each helps once (a find, a free rest, bandages, rations, a clue, a Flask of Holy Oil, or reading up on the next foe: the first attack against it is Easy; Gussetweasel gives a Hooded Lantern to a hero with no light, otherwise his bats tell of the next foe). **Their names always show in green.** The names are the owner's own and stay exactly as given.

**Hearts over foes (owner, 2026-11-06):** a foe's life shows as Hearts (10 HP a Heart, as at the table) above it in the picture and on its card.

**Timers** can now tick per fight round (Odo's breath) or per thing done outside a fight (the rising river, full dark at the gibbet).

The save version went to 2: a game saved before the run existed is not loaded, and the player starts again.

## Pitch

You play one hero alone through short written adventures in the world of Sacrament. Each place has a picture in the style of an illuminated manuscript and its own tune, a few lines of text, and big buttons for what you can do. (A box for typing commands, in the old text-adventure way, was removed at the owner's request on 2026-11-06: every move has a button.) The game is the GM: it sets the Target, says when it is dark, and decides what a failure costs. Everything else is the real rules.

* **Heroes:** bring a hero from My heroes, or take a ready-made one (the hero generator). The game plays a **copy**; My heroes is never changed.
* **Rules reused, not rewritten:** checks (`R.check`), Effort damage (`R.effort`, natural 20 critical), monster attacks against Defence (`R.attack`, `C.defence`), the Horror meter with thresholds, the natural-1 rule (attacks, spells, pushes only), push for 1 Horror after a missed attack, pay in blood past 21, rest (a Heart back, Horror down d10), healing items and spells with their once-per-rest limit, crossbow and heavy-weapon bonuses.
* **One set of rules, checked (owner, 2026-11-07):** `test/solo-rules-parity.test.mjs` plays the same moment with the same dice through the table's server and through the solo engine (a grimoire read by the die, the Horror for a natural 1 on each kind of action, healing with a natural 20) and fails if they disagree. It also fails if the engine defines rule numbers of its own. Fixed in the same change: a grimoire read by the die now casts the same spell as at the table (the shared `C.pickSpell`; solo used a different order before) and can be read in a fight at all; a push gives a second action of any kind, not only another attack; a hero at 0 HP may take the same healing again; a dying hero cannot use bandages on themselves (the bandages' own words); a hero at 0 HP pays no blood (as at the table); the Black Candle and the Drowned Saint's Lantern give light only when used, with their Horror, not just by being carried.
* **Solo's own rules are written down (owner, 2026-11-07):** the Rules page section "Playing alone" says what is different alone (falling alone: heal yourself, not with bandages, or crawl away; help for an ally has no use alone). Darkness follows the Hooded Lantern: a WIS check to search or notice is Hard, nothing else; tallow candles spend a use when lit in a dark scene. The parity test checks each of these against the Rules page and the gear list.
* **Gear and loot:** items, spells and grimoires come from `site/sheet/gear.js` through `C.actions`/`C.useOf`; finds are rolled on the real d100 loot table (`C.rollLoot`).
* **Pictures:** medieval miniatures, as in an illuminated book (owner, 2026-11-06), drawn in code as SVG (`art.js`): flat mineral colours (lapis, vermilion, verdigris, ochre, lead white) inside a dark ink outline, night skies of lapis sown with gold stars, walls hung with a red-and-blue chequer, light shown as gold rays, a vellum mottle and a gilded border over every picture. The hero is a pilgrim in a hooded mantle, face shown plainly, with a scallop shell; the mantle is lapis with a spell book, vermilion with armour, green otherwise. Subtle motion with CSS: stars glinting, mist drifting, a hem stirring, eyes that blink, wax that drips, flames that flicker (all still for reduced motion). No image files. (Pixel art first, then anime, then dark fantasy; the owner asked for medieval / renaissance on 2026-11-06. The dark fantasy version is in git history.)
* **Always on show (owner, 2026-11-06):** the scene's Target sits beside HP and Horror, with a "Dark: searching is Hard" tag when, without a light, a WIS check to search or notice is Hard (the Hooded Lantern's rule, owner 2026-11-07). Every spell and item button has a **?** that opens what it does, in the gear list's own words, and the hero sheet lists each grimoire's spells with their text.
* **Cards, obstacles and timers (owner, 2026-11-06), borrowed from the table:** a row of cards under the picture shows what is in the place: the foe (HP, attack), an **obstacle** with an Effort bar (the tower door: each try is a STR check, Easy with a crowbar; a success rolls Basic Effort into a bar of 6; a failed try is loud) and a **timer** (Brother Odo's breath: 5, loses 1 at the start of each new round while the Candle-Eater feeds; at 0 he dies and it heals 4). Tap a card to read it.
* **Story spells and items (owner, 2026-11-06, now shared rules):** what a spell or item with no damage die does is no longer a solo-only ruling. Each carries `tags` (and sometimes `needs`) in `site/sheet/gear.js`, with the 12 tags and their defaults listed there under `tags` and shown on the Rules page ("Story spells and items: when in doubt") and on every sheet card. The solo engine applies them: in a fight by the tag's default (hide/daze: the foe's next attack rolls 3 less; bind: it loses its next attack after a successful check; snuff/silence/beast against a foe marked `flame`/`caster`/`beast`; guard; learn against a `weakness`); out of one by the scene (light a dark room, learn a secret or the shape of a dark place, open an `open` obstacle, and each obstacle's `answers: { tag: words }`, which take half of what is left off its bar, once per tag). An adventure can still answer a spell its own way first (`spells` in the scene). **A spell or item nothing here answers shows "No use here", and tapping it costs nothing.** The snare and the lockpicks have no Use button at the table (no check the table makes), so the solo game does not offer them either.
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
| `site/solo/road-wilds.js` | More middle scenes for the road: the Hospice at Dray, the Charcoal Wood, the Toll Bridge at Crane's Holt. |
| `site/solo/road-far.js` | A third reason to be on the road (the Inquisitor's Warrant, answered at the Barrow at Ulm Vethra) and three more middle scenes: the Plague Pit at Pellstead, the Players at Tarnby, the Field at Fallowby. |
| `site/solo/art.js` | The pictures, as illuminated miniatures (SVG). |
| `site/solo/music.js` | The 8-bit soundtrack (Web Audio, no files). |
| `site/solo/solo.js`, `solo.css`, `index.html` | The screen. Saves the game in the browser under `sacrament-solo-v1`. |

## Open questions for the owner

1. **Falling alone.** At the table a hero at 0 HP is dying (d4 rounds) and someone can tend them. Alone there is no one, so the test scene ends the attempt. Keep that, or give solo heroes a dying roll of their own?
2. **Horror thresholds.** At 7, 14 and 21 the GM decides what happens. Here the scene only adds a line of text. Should solo thresholds have effects?
3. **Keep finds?** Should a hero who finishes an adventure take finds and wounds back to My heroes, or stay a copy?
4. **Ward on yourself.** Decided 2026-11-07: Ward protects an ally, so alone it has no use (Rules page, "Playing alone").
6. **Balance.** In a simulated run with random choices about 4 runs in 10 reach the end. Easier or harder?
5. Fonts are now the site's own (Cormorant Garamond, Source Sans 3).

## Feedback and the home-page look (2026-11-06)

* Every choice that rolls shows the number it needs, the chance, and what failing costs. The game works this out by playing the choice on a copy of the game with a low die (`odds()` in `engine.js`), so no adventure needs extra data and the real game is never touched.
* Hits, wounds, Horror and finds can be felt: short sounds (when sound is on), numbers that float off the picture, a jolt on phones that support it, a small card for each find, and a "scene cleared" card. The picture darkens as Horror passes 7, 14 and 21 (looks only; no rule changed).
* The page uses the home page's look: serif headings, gold tracked labels, red buttons with the double edge, a drop cap on each place.
* Pictures stay drawn in code (owner's decision, 2026-11-06: painting every new place and foe would not keep up as scenes are added), in the warmer home-page colours. The support for a painting is still there if one is ever wanted: to add one, put it at `site/art/solo/<place>.webp` (about 1600 × 960) and add one line to `PAINT` in `art.js`; a foe painting goes at `site/art/solo/foe-<id>.webp` on a transparent background and one line in `FOE_PAINT`. 

## Horror, falling and finds: the solo game's GM calls (owner, 2026-11-06)

The rules leave a threshold's consequence to the GM; in the solo game the game is the GM. These are GM calls, not rule changes: `rules.js`, the rules page and the table are untouched.

* **Horror 7, shaken:** the next check or attack is Hard (once).
* **Horror 14, hunted:** every foe met from then on has 2 more HP.
* **Horror 21, arrived:** the rules' pay-in-blood, and no more rest between scenes.
* **Falling:** the rules' dying roll (d4 rounds; each new round and each blow that gets through takes one off). The dying hero may heal (any healing stands them up) or crawl away with a CON check: out of the scene with 1 HP, leaving behind what they found in it. In the last scene, crawling away ends the road alive but unfinished.
* **Break away (shared rule, Rules page, 2026-11-07):** in a fight, instead of acting, a DEX check against the Target (`R.BREAK_AWAY`). Success: clear, no attack; failure: the foe attacks as usual. Solo's GM calls (owner, 2026-11-07): only before the finale; getting away ends the scene, leaves its find behind and raises the Horror 1 (a GM's raise, so no blood at 21). Night falls: scenes 1-2 evening, 3-4 dusk, the finale at night with every place dark.
* **Finds:** a hero from My heroes who finishes the road may press "Bring your finds home" once; each find still carried goes into the saved hero if there is room.
* **The foe's next move** shows on its card with the real numbers (the roll it needs to hit you, the chance, its damage die). **Brace** spends the turn for +2 Defence until the hero's next turn, like the Guard ruling.

## Obstacles: several ways through, and a clock (owner, 2026-11-06)

Every obstacle offers at least two ways through instead of one button to press again and again:

* **Bold** (a stat check, then Weapons Effort d6 off the bar). A failure costs something: d4 hurt, or Horror where it fits.
* **Trick** (a different stat, once per obstacle). A success takes half of what is left off the bar.
* Every failed try ticks the obstacle's **clock**. When it runs out something gets worse: the rain makes every try Hard (wheel), the flood rises (ford), bones wake (+2 Horror, grille), the Hag comes (salt), the Eater wakes (door).

New obstacles only need data: `ways`, `clock` (a timer with `tick: 'fail'`), and optional `hard(api)` / `progress(api)`. No rules changed: these are the solo game's own GM calls.
