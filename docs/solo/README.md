# Sacrament RPG solo (`/solo/`)

A solo, 80s-text-adventure-style game for one hero, with dark fantasy pictures and an 8-bit soundtrack, playable on a phone, tablet or computer. **Status: first test scene, not linked from the site, `noindex`.**

## Pitch

You play one hero alone through short written adventures in the world of Sacrament. Each place has a dark fantasy picture and its own tune, a few lines of text, and big buttons for what you can do (or type it: `look`, `n`, `read ledger`, `attack`). The game is the GM: it sets the Target, says when it is dark, and decides what a failure costs. Everything else is the real rules.

* **Heroes:** bring a hero from My heroes, or take a ready-made one (the hero generator). The game plays a **copy**; My heroes is never changed.
* **Rules reused, not rewritten:** checks (`R.check`), Effort damage (`R.effort`, natural 20 critical), monster attacks against Defence (`R.attack`, `C.defence`), the Horror meter with thresholds, the natural-1 rule (attacks, spells, pushes only), push for 1 Horror after a missed attack, pay in blood past 21, rest (a Heart back, Horror down d10), healing items and spells with their once-per-rest limit, crossbow and heavy-weapon bonuses.
* **Gear and loot:** items, spells and grimoires come from `site/sheet/gear.js` through `C.actions`/`C.useOf`; finds are rolled on the real d100 loot table (`C.rollLoot`).
* **Pictures:** dark fantasy, drawn in code as SVG (`art.js`): a hooded hero whose face is lost in shadow, fog, a grain over everything, light only from flames and the moon. The hero's cloak comes from their name, the weapon and lamp from what they carry. Subtle motion with CSS: drifting fog and embers, a cloak hem that stirs, eyes that blink, wax that drips, flames that flicker (all still for reduced motion). No image files. (Pixel art first, then anime; the owner asked for dark fantasy on 2026-11-06.)
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
| `site/solo/adventure-silent-bell.js` | The test scene: words, places, one foe. Words only; numbers come from the rules. |
| `site/solo/art.js` | The dark fantasy pictures (SVG). |
| `site/solo/music.js` | The 8-bit soundtrack (Web Audio, no files). |
| `site/solo/solo.js`, `solo.css`, `index.html` | The screen. Saves the game in the browser under `sacrament-solo-v1`. |

## Open questions for the owner

1. **Falling alone.** At the table a hero at 0 HP is dying (d4 rounds) and someone can tend them. Alone there is no one, so the test scene ends the attempt. Keep that, or give solo heroes a dying roll of their own?
2. **Horror thresholds.** At 7, 14 and 21 the GM decides what happens. Here the scene only adds a line of text. Should solo thresholds have effects?
3. **Keep finds?** Should a hero who finishes an adventure take finds and wounds back to My heroes, or stay a copy?
4. **Esoteric spells** (no Effort die) only show their text unless the scene handles them (Kindle lights the crypt). Each adventure would need to write more of these.
5. Fonts are now the site's own (Cormorant Garamond, Source Sans 3).
