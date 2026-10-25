> **Rules audit, 24 October 2026:** `/rules/`, `/player-guide/`, `/gm-guide/` and `/loot/` now use the current VTT reference and shared range definitions: Close (melee), Near (up to 30 feet), Far, Very Far (GM judgement). The older public draft is retained only in `docs/hearts/earlier-public-rules.html`. See `rules-audit-2026-10-24.md` for the complete audit and decisions still needed.

> **Current update — 24 October 2026:** catalogue healing, target selection, bandage charges and rest limits are automated. Known healing items keep those mechanics when newly awarded through the loot designer; existing free-text custom copies are kept intact and remain manual. Scene danger is an opt-in Play switch; remove any manually included scene bonus before enabling it. Monster natural 1 always misses, natural 20 always hits (owner decision). My character opens the player sheet. Dialogs trap and restore keyboard focus. Damage totals and hardest blow now track Undo; other recap lists are historical event records. Older descriptions below are historical where they conflict with this update.

# Sacrament RPG Table

A small shared table, at `/vtt/`. One screen: the table stays in view while a player rolls, applies Effort and ends the turn.
It is separate from the Sacrament table at `/play/` (which runs Sacrament's own rules, with the Looming Horror). Nothing here changes that one.

> **The rules are provisional.** Nothing in `site/vtt/rules.js` has been checked against the the original rulebook. It stays provisional, and rule disagreements at the table are noted and not settled, until the book extracts listed in `rules-baseline.md` are supplied.

## Status of claims

Three different things are meant by "tested" in this file. Local means a test run on a developer machine against `npm run vtt`. Live means run against https://playsacrament.com (commit `a0ef6f5`; the core-loop fixes were deployed and live-run afterwards: see `live-check-results.md`).

| Behaviour | Locally tested | Live tested | Not verified |
|---|---|---|---|
| Making a table, joining, resuming, claiming a hero, GM **+ Hero** | yes (unit + browser) | yes | |
| Rolls, Effort, Apply, End turn, undo, countdown, loot, hidden cards, hidden numbers | yes | yes | |
| Concurrent saves, retries, reordered requests, repeated commands | yes | yes (24 simultaneous commands) | |
| Hidden information is absent from what players are sent | yes (raw responses searched) | yes | |
| Offline banner and catching up | yes | yes | |
| Function runtime is Node 22, strong reads, conditional writes through real Blobs | stand-in client only | yes | |
| The builder's reading of its library | | yes (`/api/nodes` answers; builder gate refuses without a passphrase) | |
| The builder's **publish** | | | yes (needs the owner's passphrase and overwrites the live library; not run) |
| Clicks under load: lost redraws, slow replies, dropped replies, rapid HP clicks, pending Effort target | yes (`npm run vtt-flow`, 16 checks) | yes (16 checks, three runs) | |
| Storage availability on the live site | yes (a replaced token is refused in the real-client test) | outages of 40 and 2 minutes and the "Offline: reconnecting" episode were an expired Blobs token kept by a warm function; fixed in `3500bad` and not seen since | a function instance kept warm for hours |
| Image uploads (GM only; type by bytes; limits; served per table) | yes (`test/vtt-images.test.mjs`, 7; the real Blobs client round trip; `flow.cjs` section 9) | see `live-check-results.md` | |
| Rules against the original rulebook | | | **yes: everything** |
| Latency of changes arriving | yes (local numbers below) | | **yes: not measured on the live site** |
| Phones, tablets, Safari, touch | partial (a small-screen layout in a desktop browser) | | **yes: no real device** |
| Cleaning up test tables | | | yes (Blobs has no delete here; live test tables remain) |

## Running it

Run it locally: `npm run vtt` (opens on http://localhost:8788/vtt/, rooms saved in `.vtt-data/`). Test it: `npm test` (rules, permissions, shared state) and `npm run vtt-e2e` (a GM and two players in real browsers).

## The screen

* **Top strip:** a labelled GM view or Player view, scene Target (the GM has − and +), round, whose turn it is, visible timers, Horror and connection/save state. Only the GM has **Next round** here; **Next turn** is beside the turn order in Play. The GM's table code, invitation and Leave controls are in the **Table** tab; players have their code and Leave in the header. Leave asks twice and forgets that session in this browser without removing the saved table or hero. Keep the private recovery link before leaving a GM session.
* **The table:** cards and tokens placed freely (percent coordinates, no grid, no zones; range is whatever the picture shows), an optional background, a pointer and basic drawing.
* **Contextual panel:** what you selected. A roll in progress is always at its top. Nothing selected: the table's own controls (GM) or help (player).
* **Activity feed:** one line, expandable. Each entry that can be taken back has an Undo button.
* **Player strip:** one row: HP with − and +, the six stats (click to roll), Easy/Normal/Hard for the next roll, Sheet, Items (when the hero has something to use) and **More**, which holds **Effort** (roll Effort on its own) and **My dice** (type what your own d20 shows). Gear the GM has given you appears here. The GM instead has a GM dice footer. Occasional hero checks and item actions are in that hero’s sheet, opened from their selected card. The header labels GM view and Player view with different accent colours. In narrow GM windows the map and tray share a scroll area, so their controls remain reachable without overlapping.
* **A new player** is shown the heroes that are free, each with a description, stats and a Play button, in the panel; the strip says what to do next.
* **GM quick adds:** on the **Scene** tab, **Enemy** (a token with 1 Heart, already in the turn order), **Obstacle** (a card with an Effort bar) and **Card**, each placed where nothing is and opened on its *Edit card* screen to be named.
* **Marks on the table:** the card a rolled Effort is about to go to is marked TARGET, and the panel says **Not applied yet** until the Apply button is pressed. The target of a rolled Effort is fixed when the Effort appears (the card the roll named, otherwise the card selected then) and stays while you look at other cards; to move it, select the other card and press **Change target to ...** in the panel. The mark, the Apply button's label and the card that changes are always the same card. While a roll, an Effort or an Apply is on its way the panel says so (*Rolling…*, *Rolling Effort…*, *Applying…*) and its buttons are off; HP clicks show at once as pending (amber) and are each sent once; a refused action says what happened and that nothing changed.

**Telling people what is happening** (the UX pass, 2026-10-21; tested locally in `e2e/ux-feedback.spec.mjs` and `test/vtt-ux-feedback.test.mjs`):

* A new GM's **Play** tab starts with *Getting started* (the code, **Copy invite link**, and **Add a blank hero** on an empty table) until a player has taken up a hero. The GM's feed says "*Kit*: Joined the table." when someone arrives.
* When the turn reaches a player, a gold notice says "Your turn, *Wisp*." for six seconds and their strip is lit along its top; their own panel says "Your turn." or whose turn it is. The feed says who finished: "Thorne ends their turn. Wisp’s turn." (a hidden card's name only to the GM).
* When the turn moves on, a finished roll (a miss, with its Push offer, or an applied one) is put away from the panel; it stays in the feed. A roll still waiting for Effort or Apply stays.
* A hit on a player's hero (a line "*X* → *hero*: HP -*n*" not written by that player) shows them a red notice, after the dice land: "Pit Ghoul hits you: −4 HP (now 6 of 10)."
* A fallen hero's player reads what it means in their panel: dying (rounds left, Tend is a WIS check, the GM marks them stable, any healing stands them up), stable, or dead.
* A d100 find the GM gives with *Give it to this hero* (and anything the GM adds to a hero's sheet) is told to that hero's player: "The GM gives you *item*." It has no Undo; the GM can take it off the sheet.
* What comes off HP is called **damage** in the result and the feed ("= 7 damage."); what fills an Effort bar is still Effort. The five Effort buttons after a plain stat roll carry one line saying which is which.
* The GM's short card view shows the card's private note, and only a card with HP that is not a hero leads with **Attack a hero…**; a hidden card without HP leads with **Show to players**. New **Enemy**, **Obstacle** and **Card** start hidden: name them, then show them.
* The sample heroes carry the gear their descriptions name: Thorne a Gravedigger's Hatchet, Wisp The Ashen Psalter and chalk, Brother Anselm a Pilgrim's Staff and prayer beads, Tilda a Confessor's Knife and a sling. (The rule tests take it off, through `table()` in `test/vtt-helpers.mjs`, unless they ask for it.)

The routine turn, "force the gate": click the gate, click STR, click an Effort kind, click Apply, click End turn. Five clicks, no dialogue, no other window. Checks without Effort, rolls with nothing selected, and physical dice are all supported.

**Dice on screen** (`site/vtt/dice.js`): when the server rolls, a flat die (d4 to d20, and the GM's d100) tumbles over the table for about a second and lands on the server's number, on every screen that is shown that roll's line in the activity feed. The browser only shows the number; it never picks it. The roller's result panel says "Rolling…" and the activity line says "*name* rolls…" until the die lands. Typed-in physical dice show no die. A monster whose numbers are hidden shows its die to the GM only, and rolls the players cannot see (a hidden card, the loot table) stay with the GM. Each person can switch it off for their own screen with **Show dice tumbling on this screen** (players: More, My dice; GM: Table tab), and a device set to reduce motion never shows it. Tests: `test/vtt-dice.test.mjs`, `e2e/dice.spec.mjs`.

## Images

The GM can paste an https address **or upload a picture**: under **Scene → Change the picture for this scene** (the scene's background) and on a card's *Edit card* screen (the card's picture). The browser first makes the picture smaller (long edge at most 1920 px for a background, 800 for a card; re-encoded as WebP, so an animated GIF becomes a still), then sends it to the table. The server decides the type from the file's first bytes (PNG, JPEG, WebP or GIF only; **SVG and anything else are refused**), keeps it in Netlify Blobs next to the room, and gives back an address of the form `/.netlify/functions/vtt/img/<table>/<id>`. Limits: 2.5 MB each after shrinking, 60 images and 60 MB a table. Only the GM can upload. Anyone who has the address can fetch it (the id is random and is only in what the table sends its members), and an image is served only for the table it was uploaded to. Images are never deleted (Blobs has no delete here), including when a card or scene stops using one.

## What a card is

One structure: name, image, description, and optional **HP**, **Effort progress**, **countdown**, private **GM notes**, **visible/hidden**, and an **owner** (when the GM gives it to a player). Enemies, obstacles, scenery, loot and timed threats are all that. "Token" and "card" differ only in how they are drawn. Heroes are cards with a character attached (stats, Effort bonuses, armour). Equipment is a text card; **no effects are inferred from text**.

## The server decides

The browser holds no rules and no secrets. A client sends *commands* (roll, effort, apply, move, ...); the server, in `netlify/functions/_shared/vtt-core.mjs`:

* checks the token and what that person may do (GM, or a player acting on their own hero and their own rolls);
* rolls the dice (or takes a typed-in physical result, marked as such);
* applies the change as a **delta** to a number, never as a copied-over value;
* records it in the log with enough to reverse it;
* sends each person only what they may see (`project`). Hidden cards, GM notes, prepared scenes, other scenes' cards and token hashes are not in what a player is sent. That is tested by searching the raw response, not the screen.

**Duplicates and races.** Every command carries an action id. The server remembers the last 400; a repeat returns the first result and changes nothing. A save is conditional on the room not having changed since it was read; if it has, the server reads again and re-runs the command (up to 30 times with a short random wait). The client resends a command, with the same id, if the network drops or the table is busy, so a reconnect cannot apply damage twice.

**Correction.** Undo reverses the recorded *amounts*, not the old values, so a later, unrelated change (a GM adding 1 to the same bar) survives. A player can undo only their own entries, and never a turn change (an End turn that starts a new round also ticks timers and countdowns for everyone); the GM can undo any. Turn changes can be undone only while the turn has not moved on. An applied Effort that is undone can be applied again, perhaps elsewhere.

**Saving and reconnection.** Every accepted command is saved before it is acknowledged. A reload, or the server restarting, brings back the table from the stored room: the browser keeps a token per table.

## Rules

`site/vtt/rules.js` is the arithmetic, apart from the interface and the server (the browser uses it only to show the sentence, "12 + 2 STR = 14 against Target 13."). **Nothing is verified against the book.** `rules-baseline.md` lists every rule, where it came from (two pasted summaries, or an inference, or a house choice), what is not implemented because no rule was established, and exactly which extracts would verify it. The GM sees two settings, under *House rules*: whether a natural 20 offers Ultimate Effort, and the Effort die for each kind (the sources disagree on Magic).

**Turns and timers, exactly.** The turn order is a list the GM edits; it goes clockwise round the table. When the last place ends their turn (or the GM presses **Next round**), the round number goes up and **every automatic, un-paused timer loses 1**, including the timers of hidden cards. A timer never goes below 0; the tick that takes it to 0 raises a banner for the GM and, for a card the players can see with its numbers shown, a line in the feed ("TIME: ..."), once. Nothing else happens: the GM decides what it means and presses Resolved. A manual timer (not "each round") or a paused one does not move; the GM can set or step any timer at any time. End turn and Next round carry the turn the person was looking at, and are refused if it has moved on (two people pressing it, or a double click, cannot advance it twice).

## Who sees what

Each person is sent only what they may see, and the same rule decides what the feed says, so a hidden thing leaves no trace in public:

* A card that is hidden, or on a scene that is not live, or in someone's hands, is not sent to other players; **nor is any line about it** in the feed, a timer alert, the turn line ("The turn moves on", not its name), or the results of their own commands (an End turn by a player does not list what ticked).
* **Showing a card but hiding its numbers** (the GM's *Numbers shown / hidden* button): players are sent only that it has HP, an Effort bar or a countdown, not the figures. Their hits on it are applied, and the feed tells them "a hit", with the numbers in the GM's feed only. The GM's own edits to those numbers, and a countdown reaching 0 on such a card, are told to the GM alone. A hero's own numbers cannot be hidden.
* A gift of loot is told to its new owner (and the GM), not to the table.

## Repeats, reordering and races

* A page sends its commands in three **lanes**, each numbered on its own (a different client id to the server): **gameplay** (rolls, Effort, HP, turns, edits), one at a time, in order, each resent with the same action id until answered; **drawing**, the same but apart from gameplay; and the **pointer**, which is never queued or resent (only its latest position matters). A pointer or a drawing, early, late or lost, cannot touch the numbering of a roll or a hit. A request that never answers is given up after 15 seconds and resent.
* The server does not assume arrival order. For each client it keeps the highest counter accepted and the counters accepted in the 64 below it. A counter above is new; one inside the window that has not been accepted is a **late arrival and is applied** (an earlier command that was overtaken is not lost); one inside it that has been accepted is a repeat (it gets its first answer back, from the last 400 answers kept); one below the window cannot be told from a repeat whose answer has gone, so it is **refused as stale**. A stale pointer is ignored quietly. A client id and an action id belong to whoever first used them; another person using one is refused, and learns nothing.
* **Dice belong to the action and to the server.** They come from the room's secret (kept only on the server, never sent to anyone) and the action id, so a command re-run after a lost save race rolls the same numbers, and nothing a client sends (a seed, a die, an id) chooses them. A fresh id is a fresh roll, and every roll is in the feed. The one thing a player can set is a **physical die result they type in**, which is marked "[physical die]" in the feed: that is trust, by design.
* A save is conditional on the room being unchanged since it was read; if not, the server reads again and re-runs (up to 30 times with a short random wait). If the storage fails for any other reason the answer is "try again", and the client resends the same command, up to 12 times, then says it could not save.
* Joining carries a key for the attempt, so a double click, a retry or a reload is the same player; a browser that already holds a place resumes it. One click on a stat is one roll (a second click while the first is on its way is ignored).
* End turn and Next round carry the turn the person was looking at and are refused if it has moved on.

## Heroes

The GM's **+ Hero** (under *Players and heroes*) makes a blank hero: no stats, no Effort, no armour, nothing invented, and **10 HP (1 Heart), which is provisional** (see the rules baseline). Its token opens with its name selected: name it, set the numbers under *Hero*, and give it to a player from the Players list (or leave it free and a player can take it up). A hero and its token share a name.

## The GM's tray

With nothing selected the GM's tray has four tabs, grouped by when they are used (`gmTable` in `vtt.js`): **Play** (the turn order: tap a name to make it their turn; *Edit order* shows Up, Down and Remove and an *Add* list of the cards not yet in the order), **Scene** (the scenes, with *Show to players* on the one being prepared; a new-scene box; *Change the picture for this scene*; and *Enemy / Obstacle / Card*), **Loot** (the d100 roll, *Design loot* and the library: see the section below) and **Table** (the invite link and code, *Players* and who has which hero, *Add a blank hero*, *House rules*, *Running things by hand*, and *Leave table*, which asks twice). Copy link, the table code and Leave are no longer in the GM's top bar (a player's top bar keeps Leave). The chosen tab is remembered while a card is looked at.

A selected card replaces the tabs with a short view: **Back**, its name and whether players see it, its numbers (HP with − and +, Effort, timer), one main button (for a monster **Attack a hero…**, which opens the hero, own-d20 and **Attack with …** controls in place) and two quiet ones (**Hide from players** or **Show to players**, **Edit card**). *Edit card* holds the name, description, private notes, picture, adding and hiding numbers, a hero's scores, giving the card to a player, moving it to another scene, duplicating and removing (which asks twice). A new card, hero or copy opens straight on that screen. There are no icons, no capital-letter buttons and no fold-outs; one button per area is filled, the rest are outlined. Nothing here is sent to players. On a phone the page does not scroll: the tray fills what is left under the scene and scrolls inside itself. Tested locally: `e2e/gm-tray.spec.mjs`; the phone checks are in the phone suite.

A player's tray shows only what they selected (the card, its hearts, the roll, **Roll Effort**, the one main **Apply to …** button). The short instructions ("tap a stat below to roll") show until the player's first roll and then not again on that browser. **End turn** is in the top bar only; **Back** returns from a card; **Done with this roll** puts a finished roll away.

## The character sheet

One sheet, `site/sheet/sheet.js`, is used in two places: over the table (a **Sheet** button on the strip, and in a hero's panel; it fills the screen, the table stays connected underneath, **Close sheet** or Escape returns to play) and on the **My heroes** page (`/character/`, heroes saved in this browser). Its rules are `site/sheet/sheet-core.js`, which runs in the browser (so a refusal is explained on the sheet) and on the server (which has the last word); the numbers (6 points, no more than 6 in one score, 4 Effort points, ten equipped and ten pack slots, at most three relics and grimoires, one grimoire a player may pick) are in `site/vtt/rules.js` under `BUILD`.

* **Who can change what.** A player edits their own hero only (`sheet` command, refused with 403 for anyone else's). The GM edits any hero, under the same limits (the card panel's number boxes are still the free override). A hero's vow, background, notes and gear are sent only to its player and the GM; everyone gets name, scores, Effort, Defence, calling and appearance.
* **Supplies stay in the pack.** An item can be equipped unless it is a supply (its `kind`), or its own `equippable` flag in `gear.js` says otherwise: this is read from the data, never from a name. A supply shows a small **Supply** label where the Equip button would be (the sheet is the only place an Equip button appears), is never put in the equipped set to make room, and the server refuses to equip one. A table or a My heroes hero saved before this rule is put right on its next use: the GM's activity feed (GM only) or a note on the page names the hero and the items moved to the pack.
* **Gear.** The lists are in **`site/sheet/gear.js`**, the one file to edit (178 current items, including 16 themed grimoires and 43 spells; earlier owned books remain supported separately). The Rules page and the old rules engine read the same file. Armour worn raises Defence (armour counts for at most +5 with the GM's own armour number); a Plate Harness adds a Heart while worn.
* **The Rising Horror.** Every spell, grimoire and relic carries `temptsHorror: true` and a `horror` amount: a whole number, or dice in quotes (`"d4+2"`) rolled at the moment of use (a test fails if one is missing or a plain item has it). See *The Rising Horror* below.
* **Bringing a hero.** At a table with no hero of yours, **Bring a hero** copies one from My heroes; the table checks the build rules (a ready-made kit may arrive with up to three relics and grimoires) and makes it yours.
* **Tested locally:** `test/sheet-core.test.mjs`, `test/gear-data.test.mjs`, `test/vtt-sheet.test.mjs`, `e2e/sheet-table.spec.mjs`, `e2e/my-heroes.spec.mjs`.

## Using items and the loot table

* **Using an item** (`useItem`): an item or spell with an Effort kind (`cat` in `site/sheet/gear.js`) rolls a check with its own stat (`roll`) against the Target; on a success the result panel offers one **Roll damage** button (**Roll Effort** against an obstacle) for that Effort's die (the table's own dice settings) plus the hero's bonus in that kind; nothing is rolled until the player presses it (a natural 20 may take Ultimate instead, where the table offers it), and the usual Apply step follows. No Effort kind, no roll. A weapon, relic or grimoire must be equipped; a grimoire is used through one of its spells; a flask with `uses` is used up, hit or miss. The hero's player or the GM can do it. It is reached from **Use** on the sheet, from **Items** on the strip, and, whenever a foe or obstacle is selected, from the strip's **What are you using on …?** row; clicking a stat while aiming at a foe asks first ("Roll STR with no item") when the hero has an item ready. Physical dice work for the check (the My dice box) and for the damage (the box under Roll damage).
* **The loot table** (`lootRoll`, GM only): a d100 (or the number typed from a physical die) picks one of 52 items (`loot: [from, to]` in `gear.js`). A d100 range can instead lead to a **sub-table** with its own die (`tables` in `gear.js`; an item on it carries `table` and its own `loot` range). The sub-table's die is rolled at once, up to 3 tables deep (`rollLoot` in `sheet-core.js`), and the feed shows the path, e.g. "87 → Relics d8: 4". The d100 has four (the owner's layout, 2026-10-20): 1–35 *Supplies* (d20), 36–58 *Arms and tools* (d12), 59–80 *Valuables and curios* (d12), 81–95 *Relics* (d8); 96–100 are the four grimoires and the seal shard, straight from the d100. A few items fill two rows so every row has something; the owner may swap those for new items. A GM with their own dice types every number, separated by a space ("87 4"); any number not typed is rolled. The GM is told privately, and can make a hidden card from it or give it to a hero's sheet. Players cannot pick these items on their own sheet. Notes only the GM may read are in `netlify/functions/_shared/loot-notes.mjs`, never in `gear.js`, which every browser receives.
* **No Effort die.** A spell, relic or item that tempts the Horror but has no Effort kind can still be used: with a stat in `roll` it makes a check and rolls no Effort; with no stat it is used with no roll at all. Either way the Horror rises. A plain item with no Effort kind is still refused.
* **A grimoire read by the die** (`"pick": 4` in `gear.js`, the Grimoire with no title): it has one Read action; the server rolls the die and the reader casts the spell that comes up, with that spell's own roll and Horror.
* **Not built:** once-per-scene limits on spells, and effects for relics beyond their Effort die: the GM rules what an item does beyond its roll.
* **Tested locally:** `test/sheet-use.test.mjs`, `test/vtt-use-item.test.mjs`, `test/gear-data.test.mjs`, `e2e/use-item.spec.mjs`.

## The Rising Horror

* **The numbers** are in `site/vtt/rules.js` (`HORROR`): the maximum (21), the thresholds (7, 14, 21) and their feed lines. `R.rollHorror` works out an amount, `R.horrorMove` moves the meter and names the thresholds passed.
* **One meter per table** (`s.horror` in `vtt-core.mjs`), sent to everyone. A table saved before it existed starts at 0.
* **It rises in `useItem`**, after the check, whatever the check did: one feed line, for example "Thorne read from The Ashen Psalter. The Horror rises 3 (now 12)." A rolled amount shows its roll. An amount of 0 adds nothing and says nothing. At 21 it stays at 21 ("can rise no further").
* **Thresholds:** each one passed is its own feed line (kind `alert`), lowest first, and sets the GM's alert (`horror.alert`, sent only to the GM) until the GM presses **Dealt with** (`horrorAck`). At 21 every player sees "The Horror has arrived." on the table until they press OK. The table applies no effect: the GM decides.
* **Only the GM moves it:** `horror` (mode `delta` or `set`; 0 resets it) and `horrorAck` are GM-only. Undo of any line that moved the meter is the GM's alone: a player is not offered it and the server refuses it. Undoing the rise that passed a threshold clears the alert.
* **On the screen:** a slim meter in the top bar (21 ticks, the thresholds taller); the GM's controls (−1, +1, Set to, Reset to 0) at the top of the **Table** tab.
* **Tested locally:** `test/horror-rules.test.mjs`, `test/vtt-horror.test.mjs`, `e2e/horror.spec.mjs` (a GM and a player in separate browsers, and at 360×640). **Not verified:** real phones and Safari.

## The GM's own loot (designer and library)

The GM can make their own items, keep them in a library for that table, and hand them out. In the GM's **Loot** section there is a **Design loot** button next to **Roll loot (d100)**.

- **The form** (a full-screen window; on a phone the Library and Design are two tabs): name, category (Weapon, Armour, Curio, Mundane, Valuable, Relic), Effort type (or none), the stat it is checked with, uses, slots, Defence (armour), a description players read, ability text, equippable or supply, Tempts the Horror yes/no with an amount (0 or more), and rules notes only the GM reads. A preview shows what a player will see.
- **The library** is saved with the table and only the GM is ever sent it. Each item can be edited, put on the table, given to a hero, or deleted (it asks twice).
- **A rolled item** from the d100 table can be changed first (**Edit a copy first**), then put on the table or given. It is not added to the library unless the GM saves it there. A rolled grimoire is handed out as itself (it carries spells), so it cannot be edited here.
- **Put on the table** makes a loot card that starts **hidden**. Players are told nothing until the GM reveals it; then they read the name, description and what it does. The rules notes and the item behind the card are never sent to players. A selected loot card has a **Loot item** section: **Give to hero** puts it on the hero's sheet and takes the card off the table; **Edit item** changes it.
- **Giving** puts a copy of the item on the hero's sheet. Changing or deleting the item in the library afterwards never changes what a hero already holds. A supply goes to the pack and cannot be equipped; if the pack is full the give is refused in words and the card stays. A second press while the first is on its way does nothing, and a resent command applies once.
- **Players** cannot design, give or place anything (the server refuses it) and cannot slip a made-up item onto a sheet through the sheet or by bringing a hero.
- Code: `site/vtt/loot.js` (the window), the `loot*` commands in `netlify/functions/_shared/vtt-core.mjs`, and `makeCustom`/`designOf`/`itemOf` in `site/sheet/sheet-core.js`. Tests: `test/vtt-loot-design.test.mjs`, `e2e/loot-design.spec.mjs`.

## Monster attacks (the GM's)

A monster card has an optional **Attack bonus** (−10 to +10; blank counts as +0). In its panel, **Attack a hero** picks a hero (each is listed with its **Defence**, which is 10 + CON + armour, armour counting for at most +5, the bonus never above +10, as on the Rules page) and rolls d20 + the bonus; **it hits when the total reaches the Defence**. A natural 1 or 20 has no special effect. On a hit the GM presses **Roll damage** (Weapons die by default; **Another die** changes it, and the choice is remembered on that screen): it is rolled (no monster Effort bonus) and taken off the hero's HP in the same step, with an **Undo** in the feed like any apply; HP stops at 0 and a hero brought to 0 starts dying (see below). A hit on a hero who is already down rolls no damage: the button becomes **Take a round off …'s countdown** (or, for a stable hero, **Hurt again**, a new d4). Everyone reads the attack, the roll, hit or miss and the damage in the feed. Only the GM can do any of this. A monster hidden from the players still attacks: players read "Something attacks Thorne" and "Something → Thorne: HP −4", never its name, and its attack bonus is never sent to them. The numbers live in `site/vtt/rules.js` (`DEFENCE_BASE`, `ARMOUR_CAP`, `DEFENCE_MAX`). The scene-danger bonus on the Rules page is not automated: the GM includes it in the monster's attack bonus. Tested locally (`test/vtt-monster-attack.test.mjs`, `e2e/monster-attack.spec.mjs`); see `live-check-results.md` for the live run.

## Dying and the party's rest

Built on the owner's request (2026-10-21), following the Rules page (`#dying`). The arithmetic is in `site/vtt/rules.js` (`DYING`, `dyingFall`, `dyingTick`, `dyingAdjust`, `REST`, `restDice`); the commands are `dying` and `rest` in `vtt-core.mjs` (GM only), with the falling and standing up in `settleHero`.

- **Falling.** Whatever takes a hero from above 0 to 0 (a monster's damage, an Apply, **−** on the strip, the GM's numbers), the server rolls a **d4** and writes "Thorne falls and is dying: d4 shows 3, 3 rounds left." with the die tumbling for everyone. The token, the strip and the panel show **DYING 3**, then **STABLE** or **DEAD** (a hero at 0 with no countdown, from a table saved before this, shows **AT 0** and the GM has **Start the countdown (d4)**). The countdown is kept on the hero's token (`card.dying`, `{ left, stable, dead }`) and only while HP is 0.
- **Rounds.** Each new round (the turn order passing its last place, or **Next round**) takes one off every dying hero; at 0 the feed says "Thorne has died." as an alert. Undoing the turn gives the round back. A stable or dead hero does not move.
- **Blows.** A monster's hit on a dying hero takes a round off instead of rolling damage; on a stable hero it starts a new d4.
- **The GM's buttons** (the hero's panel, at 0): **Stable** (after a successful Tend: Tend itself is an ordinary WIS check), **Hurt again (new d4)**, **−1 round**, **+1 round**, and **Give a round back** for a dead hero. Players cannot use them; the lines the table writes itself can only be undone by the GM.
- **Healing.** Any HP gain stands a dying or stable hero up ("… is back on their feet."); undoing it puts the countdown back as it was. A dead hero's HP does not rise until the GM gives them a round back.
- **Party rest** (GM, Play tab, asks twice): every living hero recovers 1 Heart (the fallen stand up), and the Horror falls by a d10 for every two living heroes (1 to 2: 1d10; 3 to 4: 2d10; 5 to 6: 3d10), all on one feed line with one Undo. The dead are not counted.
- Tested locally: `test/vtt-dying.test.mjs`, `e2e/dying.spec.mjs`.

## What is run by hand

Healing from items and prayers and their once-per-rest limits, Mastery, loot effects, the scene-danger bonus on monster attacks (the GM includes it in the monster's attack bonus; the owner chose to keep it by hand, 2026-10-21) and anything else the rules baseline lists as not implemented. The controls are the ordinary ones: **− and +** on a hero's strip (players, on their own hero), the number steppers in any card's panel (GM), private notes, and the feed. There are no switches for these; they stay manual until the rules are verified.

## Deploying

* The service is `netlify/functions/vtt.mjs`, keeping rooms in Netlify Blobs with conditional writes. That needs `@netlify/blobs` 11 (the site used 8 before, which has no conditional writes) and therefore **Node 22.12 or later**; `netlify.toml` now sets `NODE_VERSION = "22"` for that reason.
* Optional: set `VTT_CREATE_KEY` in Netlify. If set, making a table asks for it. Joining needs only the table code.
* **What has been checked.** `test/vtt-blobs-client.test.mjs` runs our adapter over the real installed `@netlify/blobs` 11.1.4 client with only the network replaced by a stand-in; that is a **local** test and not a test of Netlify's service (it found two problems, now fixed: a store-wide `consistency: 'strong'` would make every write need an uncached URL, and a conditional write that fails for any other reason than the condition is reported as `modified: true` with an empty etag). The **live** checks (see the table at the top and `live-check-results.md`) confirmed on playsacrament.com that the function runs Node 22, that strong reads and conditional writes work, and that the table plays through in real browsers. Still **not verified**: the builder's publish, latency on the live site, real devices, and the rules.
* **Checking a deployment.** `node scripts/vtt/live-check.mjs https://your-site` plays real tables on the site over HTTP (join and resume, 24 simultaneous commands, retries, reordering, hidden information, the function's real Node version and whether strong reads work); add `--deep` to also test a command repeated after more than 400 others. `VTT_BASE=https://your-site node scripts/vtt/e2e.cjs` runs the whole browser play-through against it, including the offline banner. Both leave small test tables in Blobs (there is no delete). `docs/vtt/live-check-results.md` records the last run and what it could not check.

## How quickly changes arrive (local measurements only)

Clients poll once a second after the previous reply, not on a fixed clock, so a change takes **between a moment and about a second plus two round trips** to arrive; it is not capped at one second. Measured on the local server with `npm run vtt-latency` (30 changes each, landing at random points in the player's cycle, with a delay added to every request to stand in for a slower connection):

| Delay added each way | Fastest | Median | 95th percentile | Slowest |
|---|---|---|---|---|
| none | 77 ms | 719 ms | 987 ms | 1040 ms |
| 150 ms | 193 ms | 848 ms | 1306 ms | 1314 ms |
| 400 ms | 497 ms | 1140 ms | 1649 ms | 1780 ms |

Your own actions appear at once (the reply to your command carries the new state). A tab in the background polls every 4 seconds. These are **local** numbers. They say nothing about Netlify's real latency or a cold function, which has **not been measured**; the playtest records whether delays cause confusion or repeated clicks.

## Running the sample encounter (a first playtest)

You need: one GM (a laptop), two or three players (any device), and the site address.

1. **GM:** open `/vtt/`, leave "Start with the sample encounter" ticked, press **Make a table**. Note the six-character code at the top right; **Copy link** gives the join address.
2. **Players:** open the link (or `/vtt/`, enter the code and a name) and press **Join**. Each sees *Choose your hero* in the panel: press **Play Thorne** or **Play Wisp**. A third player is told every hero is taken: the GM presses **+ Hero** (with nothing selected, under *Players and heroes*), names it, gives it numbers under *Hero*, and either assigns it from the Players list or lets the player take it up.
3. **GM, optionally:** change the **Target** with − and + (the sample starts at 12). Turn order is Thorne, Wisp, Pit Ghoul.
4. **Thorne's turn.** The player clicks **The Sealed Gate**, then **STR**: the panel shows the sum, for example "9 + 3 STR = 12 against Target 12" (**illustrative: the dice are random, so yours will differ**). If the roll succeeds, click an Effort kind (e.g. **Weapons**); the gate is marked TARGET and the panel says *Not applied yet*. Press **Apply to The Sealed Gate** and the Effort bar moves. If the roll misses there is no Effort to apply; press **End turn**. (A physical die: open **My dice** before the stat, or type the Effort result in the box under the Effort buttons.)
5. **The countdown.** *The roof fails* is 4. It loses 1 each time a new round starts (after the Pit Ghoul's turn, or **Next round**). At 0 the GM sees a red banner; the players see NOW. The GM describes what happens and presses **Resolved**.
6. **The ghoul.** A player selects the **Pit Ghoul**, clicks a stat, and (if the roll succeeds) an Effort kind. The button reads **Apply to Pit Ghoul: −N HP**, where N is the Effort rolled (illustrative: it depends on the dice). **That one click lowers the ghoul's HP once; nothing else is needed.** The GM edits HP by hand **only** to correct a mistake or for what the table does not automate (a monster's attack on a hero, healing). If the mistake was an Apply, press **Undo** on that line in Activity first. At 0 HP the ghoul stays on the table: the GM decides what that means and removes or hides it. **Numbers shown / hidden** keeps the players from seeing its HP. **+ Enemy** adds a surprise.
7. **Loot.** *Warden's Bell* is hidden (dashed, on the GM's table only). Click it, **Revealed to players**, or open *More* and **Give to player**.
8. **Mistakes.** Anyone can open **Activity** and press **Undo** on their own entries (the GM on any).
9. **Reconnecting.** Close a tab and open `/vtt/` again on the same device: it resumes. The page shows **Saving…**, **Saved** or **Offline: retrying**.

## Sample encounter

A new table can start with one: *The Sealed Gate* (a task with 2 Hearts of Effort), a *Pit Ghoul* (HP), a countdown (*The roof fails*, 4 rounds), two heroes to claim (Thorne, Wisp), a hidden loot card (*Warden's Bell*), and a prepared second scene. Each card carries private notes the players never see.

## Your tables, the GM link, Try it now (2026-10-21)

* **Your tables.** The first screen lists every table this browser holds a place at (newest first): its code, whether you are the GM or a player, the scene last seen and the day. *Open* goes back to it; *Forget* (asked twice) drops it from this browser.
* **The GM link** (Table tab, *Copy your GM link*): `/vtt/?room=CODE#key=…`. Opened anywhere, it keeps the key in that browser and takes it out of the address at once. The part after `#` is never sent to the server. Anyone with it can run the table.
* **Try it now** on the home page opens `/vtt/?try`: a sample table is made with the visitor as the GM. One per browser: trying again opens the same table.
* **Putting it on a home screen.** `/vtt/manifest.webmanifest` (start and scope `/vtt/`). Where the browser offers to install, the first screen shows *Put the table on this device*; on an iPhone or iPad a line says Share, then Add to Home Screen. No offline mode (no service worker). Not verified on a real phone.

## Between sessions (2026-10-21)

* **Next session** (GM, Play tab): a date, a time and a short note. Every player sees it in their panel in their own time zone, with *Add to Google Calendar* and an `.ics` file for other calendars (three hours long).
* **Session recap** (GM, Table tab, *More*): the core keeps a tally as the game goes (`s.recap`): each hero's rolls, successes, natural 20s and 1s and damage dealt, the hardest blow, who fell and who died, what was handed out, rests, the Horror's peak and the scenes shown. Only the GM is sent it. A card the players could not see is "something unseen". It counts as things happen: an Undo does not take them back out. *Start a new session* (asked twice) clears it. A table made before this starts counting at its first command.
* **Your monsters** (GM, Scene tab): *Save to my monsters* on an enemy's card keeps it in this browser (up to 50), with its name, description, notes, picture, HP, attack bonus and size. *Add* puts it on any table you run here: hidden, in the turn order, at full HP.
* **A player in another tab** is told their turn has come or that they are hit: the tab's title changes until they return, and a soft chime sounds (turned off under *More*, *My dice*). Browsers allow the sound only after the player has pressed something on the page.
* **Polling when idle.** After a minute with no change and no press, the table asks for news every 2.5 s instead of every second (4 s in a background tab, as before). Any change or press brings it back to 1 s.

## Not built, on purpose or not yet

* **Push.** Clients poll after each reply (1 s later, 4 s in a background tab). A real push channel is not available on plain Netlify functions, so a change takes a moment to about a second plus two round trips to appear, and is not capped at one second. Pointers and drawing share that delay.
* Per-card Targets; line of sight, lighting, automated movement, video, compendia.
* **Dying rules**, a monster's own Effort bonus, the scene-danger bonus on its attacks, loot tables and anything else the project has not confirmed. They are kept manual: the GM edits HP and writes the story.
* **Accounts.** A table is its code and the token each browser keeps. The first screen lists the tables this browser holds (*Your tables*), and a GM can keep a *GM link* (Table tab) that brings them back on any device. A player who loses their token rejoins as a new player; the GM can re-assign a hero. Rooms are not expired.
* Limits: twelve players, 150 cards, 12 heroes.

### Scene turn orders — 25 October 2026

Each scene now remembers its own turn order and current actor. New scenes start with heroes; tracked enemies added while preparing join that scene’s order. Returning restores edits, removals and empty orders. Preparing a scene leaves the live Play order alone. Deleted/moved enemies cannot reappear in saved orders; new heroes join existing scene orders. Existing tables preserve their active order and separate their tracked prepared enemies on the first scene change. Rounds remain table-wide, and switching scenes does not advance timers/dying or reset scene powers. Player replies include only the live order with the existing hidden-entry protection.

Regression coverage: `test/scene-turn-orders.test.mjs` checks restoration, legacy saves across several prepared scenes, empty orders, newly added heroes, prepared enemy privacy, deletion/movement, stale scene commands, Undo scope and unchanged timers/rounds. `e2e/scene-turn-orders.spec.mjs` checks both browser roles, scene switches and reloads on a disposable table. Release evidence is in `/workspace/sacrament-audit/scene-orders-*.log`.

Release validation: quick checks passed (462 unit cases, lint/type checks and quick contrast), followed by all seven scene-order regressions including the added multi-scene legacy-save case. The 142 existing laptop browser cases, both new scene-order cases, full laptop contrast, 65 table scenarios, 75 reliability checks, 26 hero/conversion checks and the phone smoke test passed. Only the corrected scene-opening walkthrough and the added empty-order case were rerun; no timeout or assertion threshold was relaxed. Empty orders retain Edit order after reload so the GM can add their first actor again. Screenshots were inspected at laptop size. Physical devices, Safari and the full phone suite were not checked in this release.

### Roll reveal — 25 October 2026

Checks and attacks now have a brief centred reveal: larger dice when animation is enabled, then a word-and-symbol result (Success, Miss, Failed check or Critical hit/success), total against Target/Defence, actor, item and visible target. The dark backdrop draws attention without a dismissal step. Success uses gold and failure uses red; wording/symbols do not rely on colour. The result is announced as a polite status, never takes keyboard focus, and stays while its optional action button has focus. The roller can use Roll damage to invoke the existing damage control once; Apply remains a separate step. Downed-target monster handling and non-damage checks keep their existing controls. There is no new sound.

Physical dice, reduced motion and the existing dice-animation switch show the still result immediately. New checks replace an older reveal; all original records remain in Activity. Reconnecting does not replay history, and leaving or switching scenes clears the presentation. Server-generated display metadata follows the log's existing audience; hidden monster numbers and unrevealed target names are omitted. Standalone GM dice remain neutral and private GM rolls remain private. No rules, saved-data names or ownership permissions changed.

Evidence: `test/roll-reveal.test.mjs`, `e2e/roll-reveal.spec.mjs`, the existing dice suite and `/workspace/sacrament-audit/reveal-*.log` / `reveal-critical.png` / `reveal-miss.png`. The browser checks exercise the damage shortcut, actual rather than assumed natural-20 success, public/private outcomes, reduced motion, automatic clearing, focus retention and reconnect. Routine phone smoke is required; physical devices, Safari and assistive technology remain unverified.

Release validation passed: lint/type checks, 468 distinct unit cases, 148 laptop browser cases (plus one existing skip), quick and full laptop contrast, the 65-case table suite, 75-case reliability walkthrough, 26-case hero/conversion suite and routine phone smoke. The broad run exposed a pre-existing GM count draft being lost on an incoming update; saving that number on input fixes it. Its original exact-2d8/private-result test and the new update-during-typing regression pass without weakened assertions or longer time limits. Only the affected cases were rerun. Live verification is separate from these local checks.

### Streamlined GM controls, automatic damage and support — 25 October 2026

Invitations now live only in Table; Play has a short pointer there. The GM footer shows the die, count, GM-only switch and Roll GM dice without an expansion click, and uses the player-style gold divider. Role labels and player-only hero controls remain distinct.

Rolling attack damage now applies it to the recorded target in the same server command, including area damage to the selected foes together. Changing the selected card cannot redirect it. The server validates the target first, retries are idempotent, masked HP stays masked, and one Undo restores the damage. Targeted item Effort can advance its obstacle automatically. Ordinary narrative/task Effort and standalone GM dice still support manual placement. The new client requests `autoApply`; older cached clients and already-rolled pending damage retain their explicit Apply path. Completed damage is never retrospectively changed. This supersedes the earlier separate-Apply descriptions in this document.

The owner chose the supplied Ko-fi floating widget, with no navbar support button. Public pages load the exact supplied account/settings after page load. A padded floating direct link is available if the script fails, and a footer support link remains available. The widget is not loaded in the VTT, character editor or private builder. Privacy text describes the third-party connection. The cloud proxy blocked the real Ko-fi CDN twice, so further external retrieval attempts stopped. Local tests stub the documented draw API to verify the requested settings and separately block it to verify the real fallback. They do not verify Ko-fi's payment window; that external window remains unverified here.

Evidence: `test/automatic-effort.test.mjs`, `e2e/streamlined-gm.spec.mjs`, the updated interaction/privacy/contrast checks, and `/workspace/sacrament-audit/streamline-*.log`. Old assertions were updated to check automatic HP changes and completed damage after reconnect, rather than a now-obsolete Apply button. Coverage of manual legacy commands, target locking, duplicate actions, hidden HP, Undo and separate GM dice remains intact. No time limit or assertion threshold was weakened. Full phone review, physical devices, Safari and real assistive technology remain outside this routine release; phone smoke is required before publication.

Release checks passed: 472 unit cases, lint/type checking, quick/full contrast, 151 laptop browser cases (plus one existing skip), 65 table scenarios, 75 reliability checks, 26 hero/conversion cases and the required phone smoke check. The first phone check found a floating-support/control overlap; narrow-screen placement now hides the closed floating button when it would cover an interactive control, while the footer link stays available. Phone smoke and support contract/fallback checks pass after that correction. On desktop, the widget remains floating as requested. Final button-copy and guide wording were rebuilt without rerunning unrelated suites. Live verification is recorded separately after publication; the external Ko-fi payment window is still outside verified coverage.


### GM session flow, 25 October 2026

The GM tabs now stay visible on selected-card, edit and roll views, with standard arrow/Home/End keyboard navigation. Selecting an order name inspects a card; **Set turn** is explicit inside Edit order. Play holds the live encounter, order, Party rest and named encounter refresh. Scheduling is in Table and optional scene danger in Table → House rules. Combat precedes routine counters; tracker maximums/removal and saved monster templates are in Edit card. Existing timer scope is unchanged and labelled: automatic timers tick every table round, including in hidden scenes.

A prepared enemy cannot attack live heroes. The server also refuses unfinished monster damage after the live scene changes; hidden enemies in the live scene can still attack. Refreshing powers is restricted to the live encounter and its UI is not offered while preparing another scene.

**Back to my tables** retains GM authority in this browser. Intentional Forget remains on Your tables. Player Leave keeps its existing two-press departure. Recovery copy/download actions are grouped together. Applied damage offers **Undo this damage** bound to the existing damage event and existing permission/conflict checks; unrelated later actions are retained. No game rules, storage names or saved history are migrated. This section supersedes the earlier tray-layout descriptions above.


## Activity and player actions — 25 October 2026

**Release preparation.** This replaces the earlier descriptions below. The player dice footer retains the compact-laptop height limit, and shared updates preserve typed physical dice, open preferences and keyboard focus. Publication follows the required release checks.

This supersedes earlier descriptions of player sheet actions, footer HP controls and central roll reveals. Players choose items, spells, targets, difficulty or an unarmed attack in Play, then commit the prepared action in the bottom strip. That strip also holds ordinary stat checks, pending damage and standalone Effort. The sheet manages scores, equipment and notes; its player Use buttons have been removed. Manual player HP edits live in Play. The GM keeps standalone footer dice, enemy attacks in Play and one selected-hero sheet route for covering an absent player.

Activity is the home for checks and their server-authorised outcomes, damage, healing, Horror, confirmations and event-specific Undo. Its expanded history replaces the collapsed preview. Browser-only feedback stays local to the current session and never becomes a shared entry. Connection/saving and recovery warnings remain visible separately. Validation stays beside sheet fields and the target chooser. Superseded by the owner’s subsequent dice request: dice now tumble over the scene with success/failure; successful attacks wait for Roll damage, and other results have Continue. The shortcut uses the existing damage command. Prepared items retain their gear key and target; missing or replaced equipment cannot silently become a different item. No game rules or saved-data names changed.

Coverage includes physical critical dice during another person's update, preparation without spending an action, replacement equipment safety, player and GM assistance routes, attack-to-damage target retention, Push, healing/rest limits, dying, reduced motion and interrupted-roll recovery. Run the release suite and routine phone smoke before publication; real devices and Safari remain separate checks.


Release validation for this change: lint/type checks and all 475 unit tests passed. The full laptop browser run passed 157 cases; its two obsolete sheet-control expectations were updated and passed on rerun, alongside the new spectator-to-GM regression (160 browser cases passed in total, with the existing live-only skip retained). Both full contrast sets, quick contrast, all 65 table checks, 75 reliability checks, 26 character/conversion checks and the routine 360×640 phone smoke passed. The former 72px footer now meets the unchanged 70px laptop limit. No test thresholds or time limits were increased. Production file/server verification follows publication; real phones, Safari and live browser automation remain unverified here.

## Audit fixes and persistent dice, 25 October 2026

New armour copies retain their extra Hearts through design/library/card/award and preserve wounds. Existing saved definitions are not rewritten. New custom designs reject malformed Horror costs rather than silently saving zero; validation appears inside the accessible designer, and server rejections use that same local status. Sling and Black Candle range metadata now agrees with their existing descriptions.

Reload restores only the current actor’s valid unfinished action in the current scene, not another player’s damage in an unselected GM view. New hero rolls record their scene; older pending attacks are checked against available targets. Shared sheet, prepared-action and catalogue explanations distinguish automatic checks/damage/healing/Horror from manual conditions, buffs, movement, quantities and durations. No-roll actions say Use; manual quantities do not claim to be live remaining-use counters. Ward’s manual preparation does not inherit an enemy target.

The owner requested scene-centred tumbling dice again. Results have no dismissal timer: own successful attacks await Roll damage, misses/non-damage checks have Continue. The shortcut forwards to the existing roll control, preserving physical dice, target, auto-application and duplicate-command guards. Another viewer’s roll cannot replace your pending hit. Reduced motion or animations switched off show static result text. Hidden numbers remain server-masked. Scene/session changes clear presentations; reconnect does not replay history. Neutral GM dice retain their short animation. No game rule, item ID or saved-storage key was changed. Genuine balance choices in the audit remain decisions for the owner.

Release checks also reproduced a recovery race: a GET begun before an interrupted command could release queued gameplay. Polling now records whether the read started inside recovery; an older response cannot clear that barrier. A deterministic browser test holds that old response and verifies that the queue waits for a fresh read. The scene-result background passes map clicks through; only its action button intercepts presses.

## Themed grimoires, 25 October 2026

The owner approved themed books and publication. There are still 178 current items, 145 rollable finds and 16 current grimoires, with three spells and three slots each. Ten themes distinguish Fire, Cold, Energy, Necromancy, Nature, Druidic, Demonic, Healing/protection, Silence/deception and Doors/passage. Every current three-spell selection is different. All original 23 spells are unchanged; 20 bounded new spells bring the shared registry to 43, and every spell appears in a current book.

New editions use new item IDs when their contents changed. `SACRAMENT_GEAR.retiredGrimoires` preserves 13 complete earlier definitions. Sheet-core indexes those for item lookup/import/owned possessions but excludes them from `items`, new-choice lists and loot tables. No saved inventory migration or storage-key change is needed. Existing original spell IDs, custom definitions, spell limits and older random-book selections remain available. The old engine includes compatibility definitions for conversion. Current generation uses the current starter IDs, allocating Weapons rather than unused Magic Effort when the selected book has no damaging spell.

Themes display on sheets, the public catalogue, custom previews and the GM designer; custom three-spell books may freely mix known spells. Public old item anchors lead to their new editions. The website and roller derive from the same current data. Non-healing spells cost 1 Horror; Mend still costs 0, with the separate natural-1 rule unchanged. New damage spells use Magic d10 and existing automatic target/application/Undo. New narrative/control effects explicitly state their boundaries and manual steps; this release does not add a condition/duration or terrain engine. Random books correctly advertise their d6 (three evenly paired spell results).

Regression coverage checks every original definition and spell, current catalogue themes/count/uniqueness, new spell commands and costs, action retries, automatic damage/Undo, custom-theme round trips, new and original random mappings and original-book casting permissions. Browser coverage includes current catalogue links, saved My heroes, current choices, custom themed awards and player damage/manual control actions. Routine release gates and phone smoke are required before publication.

Physical d20 entry follow-up: tracing showed preparation could replace the footer input after the browser had resolved it for typing/autofill. `putStrip` now keeps the actual d20 node for the same hero/session across compatible redraws, synchronises its visible draft, and restores focus. `takeD20` consumes the visible value, with the existing GM sheet fallback. Session resets and hero changes clear unused drafts. Regression cases cover browser restoration without input events, ordinary checks and attacks, preparation plus another viewer's update, the persistent hit display, and changing tables in the same page. Server roll authority, damage, costs and numeric limits are unchanged.

The same node preservation covers all footer dice fields in an unchanged action/session, including GM die/count/GM-only controls and typed Effort. A dedicated browser-restoration test verifies both the entered GM count and private visibility after another viewer joins. Different actors/sessions invalidate the cached strip HTML so identical-looking controls cannot retain an old draft.
