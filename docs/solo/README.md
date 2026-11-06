# Sacrament RPG solo (`/solo/`)

A solo, 80s-text-adventure-style game for one hero, with anime-style pictures, playable on a phone, tablet or computer. **Status: first test scene, not linked from the site, `noindex`.**

## Pitch

You play one hero alone through short written adventures in the world of Sacrament. Each place has an anime-style picture, a few lines of text, and big buttons for what you can do (or type it: `look`, `n`, `read ledger`, `attack`). The game is the GM: it sets the Target, says when it is dark, and decides what a failure costs. Everything else is the real rules.

* **Heroes:** bring a hero from My heroes, or take a ready-made one (the hero generator). The game plays a **copy**; My heroes is never changed.
* **Rules reused, not rewritten:** checks (`R.check`), Effort damage (`R.effort`, natural 20 critical), monster attacks against Defence (`R.attack`, `C.defence`), the Horror meter with thresholds, the natural-1 rule (attacks, spells, pushes only), push for 1 Horror after a missed attack, pay in blood past 21, rest (a Heart back, Horror down d10), healing items and spells with their once-per-rest limit, crossbow and heavy-weapon bonuses.
* **Gear and loot:** items, spells and grimoires come from `site/sheet/gear.js` through `C.actions`/`C.useOf`; finds are rolled on the real d100 loot table (`C.rollLoot`).
* **Pictures:** anime style, drawn in code as SVG (`art.js`): painted skies, rim light, large-eyed characters. The hero's hair, skin and eyes come from their name; the cloak from what they carry. Flames, breathing and stars move with CSS (still for reduced motion). No image files. (The first version was pixel art; the owner asked for anime style on 2026-11-06.)
* **Dice:** the table's own tumbling dice and result card (`site/vtt/dice.js`), with the same words: CRITICAL HIT, SUCCESS, MISS, FAILED CHECK, HIT. A hit waits for **Roll damage** on the card, as at the table.
* **Combat in turns, borrowed from the table:** a turn strip (round, the hero, the foe, the foe's wax meter). On your turn: attack, cast or use an item. A hit waits for Roll damage; a miss offers a push (+1 Horror) or End your turn. Then the foe attacks against your Defence, d20 and damage die together on one card.
* **Installable:** `manifest.webmanifest` lets a phone add it to the home screen. Not yet offline (no service worker).

## Files

| File | What |
|---|---|
| `site/solo/engine.js` | The engine: no page, no clock, no random source (dice are passed in). Tested by `test/solo.test.mjs`. |
| `site/solo/adventure-silent-bell.js` | The test scene: words, places, one foe. Words only; numbers come from the rules. |
| `site/solo/art.js` | The anime-style pictures (SVG). |
| `site/solo/solo.js`, `solo.css`, `index.html` | The screen. Saves the game in the browser under `sacrament-solo-v1`. |

## Open questions for the owner

1. **Falling alone.** At the table a hero at 0 HP is dying (d4 rounds) and someone can tend them. Alone there is no one, so the test scene ends the attempt. Keep that, or give solo heroes a dying roll of their own?
2. **Horror thresholds.** At 7, 14 and 21 the GM decides what happens. Here the scene only adds a line of text. Should solo thresholds have effects?
3. **Keep finds?** Should a hero who finishes an adventure take finds and wounds back to My heroes, or stay a copy?
4. **Esoteric spells** (no Effort die) only show their text unless the scene handles them (Kindle lights the crypt). Each adventure would need to write more of these.
5. Fonts are now the site's own (Cormorant Garamond, Source Sans 3).
