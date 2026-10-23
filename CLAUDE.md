# CLAUDE.md: instructions for every session on this project

The owner is **not a developer**. Explain things in plain English, say what you did and what it means, and avoid jargon (or explain it when you must use it).

## What this project is

The website for **Sacrament RPG**, a tabletop role-playing game, and **the Sacrament RPG Table** (`/vtt/`): a virtual tabletop where one GM and their players share a table in their browsers. The table is the part being actively developed.

| Part | Where | What it does |
|---|---|---|
| The screen | `site/vtt/` (`index.html`, `vtt.js`, `loot.js` the GM's loot designer window, `dice.js` the dice tumbling on screen, `vtt.css`, `stone.webp`) | What GMs and players click: tokens, cards, scenes, dice, hearts, turns, the activity feed. Plain JavaScript, no framework. |
| The rules | `site/vtt/rules.js` | The arithmetic: d20 + stat against a Target, Effort dice, 10 points to a Heart, turns and timers. **Provisional**, not checked against any rulebook. Do not invent or change rules without being asked. |
| The table's brain | `netlify/functions/_shared/vtt-core.mjs`, `vtt-service.mjs`, `vtt-sample.mjs` | Decides what every action does (the server is the authority), who may see what, saving, undo. |
| Storage and web address | `netlify/functions/vtt.mjs` | Connects the brain to Netlify Blobs and to the web. |
| Local test server | `scripts/vtt/server.mjs` | The same brain on this computer, saving to a folder. |
| Home page and its pages | `content/landing/` (the text; see its README), `scripts/build-landing.mjs`, `site/landing.css` | `/`, `/the-game/`, `/setting/`, `/how-to-play/`, `/news/`, `/feedback/`, `/privacy/`. Built into `site/` and **not committed**. The home page has no sign-up form (the playtest sign-up and its `/thanks/` page were removed on the owner's request; earlier submissions stay under Forms in Netlify). The newsletter was removed at the owner’s request. `/newsletter/` redirects to `/feedback/`, which posts the private vtt-feedback form to Netlify Forms. The owner reviews submissions in the Netlify dashboard; no email address or visitor account is required. |
| Rules page, My heroes page, character sheet, updates | `site/rules/`, `site/character/` (My heroes), `site/sheet/` (`gear.js` the one gear list to edit, `sheet-core.js` the sheet's rules shared by browser and server, `sheet.js` the one sheet screen used over the table and on My heroes, `heroes.js` the heroes kept in the browser), `site/game/` (older rules engine, reads `gear.js`) and `site/legacy/` earlier-rules files used to bring old characters over, `content/blog/` built by `scripts/build-blog.mjs` | Do not move `site/legacy/*.js`: the hero page, `private/builder.html` and `netlify/functions/_shared/library.mjs` load them. |
| Passphrase builder | `private/builder.html`, `netlify/functions/builder*.mjs`, `nodes.mjs` | Needs the passphrase. Never publish over the live library. |
| Owner's overview | `/inventory/` (unlisted), data in `scripts/inventory/items.mjs`, `npm run inventory` | A test fails if the committed page is out of date. Update it when you add, move or retire a page. |

Notes for people: `docs/vtt/README.md` (how the table works, what is verified) and `docs/vtt/live-check-results.md` (what was tested live). Design notes for the rules: `docs/hearts/`.

**World and tone.** Before writing any name, flavour line, page text or example, read `docs/lore/sacrament-lore.md`: Part 1 is the public world (may appear on the site), Part 2 is the GM-only secret (**never** on the site, in page source or sent to players; do not hint at it), plus the naming guide for all new names. `test/lore-secret.test.mjs` fails if a guarded phrase from Part 2 appears under `site/`, `content/` or `netlify/functions/`. Lore changes words only: never how anything works, never a rules term, and buttons and navigation keep plain labels. Tone: dark, grounded, sparing.

**Names (owner's decision).** The game is **Sacrament RPG**; the table is the **Sacrament RPG Table**. The project is moving away from the ruleset the table was first built on, so **that ruleset, its name, its publisher and any links to their products must never appear**: not in page text, titles, link previews, alt text, error messages, emails, addresses, docs or scripts. No attribution, no "buy the book" links. The banned terms (any capitalisation) are listed in `test/no-old-name.test.mjs`, which fails if one appears under `site/`, `content/`, the server code, or anywhere else in the repo except its short allowed list (old-address redirects, saved-data names, the tests that check them). **One exception (owner's decision, 2026-10-21):** the playtest-launch news post `content/landing/blog/2026-10-21-the-table-is-open.md` (and its built page) thanks that game and its creator by name, with no shop links. Do not add the names anywhere else.

## Commands (exact)

Everything runs through `npm run`, and every command already has a time limit.

| Job | Command | Time |
|---|---|---|
| Install | `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install` (the browser is already installed here; elsewhere `npx playwright install chromium`) | |
| Run locally | `npm run vtt`, then http://localhost:8788/vtt/ (tables saved in `.vtt-data/`) | |
| **Quick checks: after every change** | `npm run check` = lint, type check, unit tests, quick contrast check (laptop size only; no phone tests) | about 30 s |
| **Full suite: before deploying** | `npm run check:full` = quick checks, then every browser suite (`test:e2e`, `vtt-e2e`, `vtt-flow`, `hearts-ui`), all at laptop size (the phone tests are left out), and ending with the fast phone check | about 4.5 min |
| **Fast phone check: before every deploy** | `npm run phone-check`: loads the home page and the table at 360×640 and fails on anything broken, overlapping or off-screen | under 30 s |
| **Phone suite: only when the owner asks for it by name** | `npm run phone-suite`: every phone test (the tests tagged `@phone`, the phone contrast set, the phone steps of `vtt-flow`) | a few minutes |
| **After deploying** | `npm run check:live` = `live-check` (24 HTTP checks), the Playwright suite and the walk-through against the live site | about 5 min |
| Single pieces | `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:contrast` (quick), `npm run test:e2e`, `npm run vtt-e2e`, `npm run vtt-flow`, `npm run hearts-ui`, `npm run live-check` | |
| Build | `npm run build` (Netlify does it) | |
| **Deploy** | No command: Netlify publishes when something is **pushed to `main`**, about a minute later. Pushing to `main` IS deploying. | |

In this cloud environment, live checks need `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` in front of the command. Redirects in `netlify.toml` do not run on the local server: prove them live (`curl -I`); a unit test reads the rules.

## Rules for every session

1. **Work in small steps.** For anything bigger than a small fix, show a plan and **wait for the owner's OK**.
2. **After every change run `npm run check`; before deploying run `npm run check:full`.** Do not say something is done until they pass. If something fails, say so with the output. Do not weaken or delete a test to make it pass (if a test is wrong, say why first).
3. **Anything visual or interactive:** run the app locally and look at it in a browser (Playwright screenshots) at laptop size. **While prototyping, do not test, mock up or screenshot phone layouts unless the owner asks.** The only phone step is the fast phone check before a deploy (see "Phone testing" below).
4. **Fixing a bug:** first write a test that reproduces it and watch it fail, then fix it and watch it pass.
5. **Never deploy unless all checks pass (including `npm run phone-check`), and tell the owner first.** Work on a branch; merge to `main` only when told.
6. **Commit after each working step**, in plain words (what and why). Do not commit while a check is failing.
7. **If you could not verify something, say so.** Keep "tested locally", "tested on the live site" and "not verified" separate.
8. **When you finish, summarise in plain English** what changed and what the owner should test.
9. **Every test, script and wait has a time limit, so it fails clearly instead of hanging.**
   * New scripts and test commands in `package.json` go through `node scripts/with-timeout.mjs <seconds> [NAME=value] <command>` (stops an overrun, names it, exits 124). New browser tests set `test.setTimeout`; Playwright's click and page-load limits are in `playwright.config.mjs`: do not raise them to hide a stuck step.
   * Anything you run yourself that could wait (a server, a download, `curl`, a test run) gets `timeout <seconds>`. **Never write an `until ...; do sleep ...; done` loop without a deadline** (count the tries or compare the clock), and never wait on a file or count that a possibly-failed job has to produce: also check the job itself.
   * Browser-test steps with no limit of their own (`page.evaluate`, browser-inspector calls) go through `bounded(...)` in `e2e/contrast-lib.mjs`.
   * Tests are split into the **quick** tier (lint, type check, unit, quick contrast: seconds to under 2 minutes) and the **full** tier (everything else). Keep the quick tier quick; put anything slow in the full tier.
   * When a limit fires, that is a finding: say what was stuck. Do not just raise the number or retry silently. Stop background jobs by their exact process id when they overrun.

**Protected branch.** `before-cleanup` is a snapshot of the project before the cleanup (commit `9791b3b`). **Never commit to it, rebase it, move it, force-push over it or delete it.** Recover anything removed with `git show before-cleanup:<path>` or `git checkout before-cleanup -- <path>`. (This environment cannot push tags; the owner may add a tag on that commit.)

Also: do not delete real game data, print access tokens (GM tokens, passphrases), or add features or change rules that were not asked for. Test only on disposable tables.

## Things worth knowing

* The server is the authority: the browser never decides a roll or a hit. Hidden information (GM notes, hidden cards) must never reach a player's browser; the tests search the raw replies for it.
* Every action carries an id, so a resent action applies once. Rolls are decided by the server from the action id.
* Storage is Netlify Blobs. Make a fresh store for each request (a kept one expires: "Token expired"). Needs Node 22.
* A click can be lost if the screen redraws between press and release; the press guard in `vtt.js` exists for this. Do not redraw while a button is held.
* **Saved data names must NOT be renamed:** the Blobs storage name in `netlify/functions/vtt.mjs` and the browser-storage prefix in `site/vtt/vtt.js` (written in two pieces on purpose). Renaming either hides every saved table, GM key and hero. `test/old-addresses.test.mjs` guards them. Invitation links are `/vtt/?room=CODE` and `/vtt/` must not move.
* **Old addresses** (the table website's old home, the retired `/play/` table, `/table`, `/tools`, `/legacy/`) are 301 redirects in `netlify.toml`. `/play/tiles/stone.webp` redirects to `/vtt/stone.webp` because earlier saved tables use it as a background. `test/old-addresses.test.mjs`, `test/play-retired.test.mjs` and `test/archive.test.mjs` read those rules.
* **Retiring a page or tool:** delete it, add a 301 for its old address (pages), update those tests and the inventory. There is no `archive/` folder: git history and `before-cleanup` keep everything.
* **One theme only (dark).** Colours live in `site/theme.css`: `--line` is for dividers, `--edge` is the outline of anything pressed or typed in (3:1 against the ground). Anything drawn over the table's picture carries its own dark colours in `site/vtt/vtt.css`. Do not dim text with `opacity`: it breaks contrast. `test/no-light-theme.test.mjs` guards this.
* **Contrast check** (`e2e/contrast.spec.mjs`): axe plus every button in every state (text 4.5:1, outlines 3:1; disabled 3:1). The laptop run is part of the regular checks (`npm run test:contrast` is the quick set; the full set runs at the end of `test:e2e`, on its own, because beside the other browser tests it ran out of its 4-minute limit); the phone run is tagged `@phone` and belongs to the phone suite. For a full list with pictures run it with `CONTRAST_AUDIT=1 CONTRAST_OUT=<folder>` (generated pictures are git-ignored).
* The game page describes the table's current mechanics in plain words; change that text together with `site/vtt/rules.js` when the rules change.
* Generated files (screenshots, videos, reports) are git-ignored; never commit them.
* Do not `pkill -f` (it kills your own shell): kill by explicit pid.
* Tests that flake: wait for a real condition, count distinct action ids (not requests), compare "sent elsewhere" against the site's own origin when running live.
* A Netlify Form is registered from the published page, which then loses its `data-netlify` mark: if a form is ever added back, check its name and action, not that mark. Netlify once failed to publish two pushes in a row: if a push does not appear within a few minutes, push an empty commit.
* The stop-hook "unpushed commits" message can be stale: run `git push -u origin <branch>` and compare with `git ls-remote`.

## Phone testing (paused while prototyping)

* **Quick checks and feature work skip phones.** Do not write, run or screenshot phone layouts while building something, and do not add phone mockups to plans, unless the owner asks. New phone-only tests are tagged `@phone` in their title so the regular runs leave them out (`--grep-invert @phone`).
* **Before each deploy: `npm run phone-check`** (under 30 seconds). It loads the home page and the table (as GM and as a player) at 360×640 and fails if anything is broken (script errors, a page that scrolls sideways), overlapping buttons, or controls off-screen. It is a smoke test, not a layout review.
* **The phone suite** (`npm run phone-suite`) holds the full phone tests. Run it only when the owner asks for "the phone suite". After a full pass, empty the list below and write the date.
* **Changed since the last full phone pass** (add a line for every feature built or changed that touches the screen, so the next phone suite knows what to look at). Last full phone pass: **2026-10-21**, the phone suite run on branch `claude/project-thread-327m9k` after the bug-hunt fixes (all green: the GM's top bar back to three rows, the player's My dice row shorter). Since then: the UX pass (branch `claude/project-thread-01nawz`): the GM's *Getting started* box, the gold "Your turn" and red "hits you" notices over the table, the lit strip on your turn, the dying help in the player's panel, the GM's note in the card view, the Effort hint line. The improvements (branch `claude/project-thread-l8nokf`): *Your tables* and the install line on the first screen, *Try it now* on the home page, the GM link and *Session recap* in the Table tab, *Next session* in the Play tab and the player's panel, *Your monsters* in the Scene tab and *Save to my monsters* on an enemy, the chime switch under My dice.

* Since that full phone pass: table recovery warning and downloadable private link; the combat choice now includes an explicit roll without an item, with one Sheet button. Check these in the next requested phone suite.

* Since that full phone pass: hero save warnings and backup downloads; player removal controls; scene-specific drawing and pointers; quick actions at the top of live sheets; optional Fill width map viewport.

## Known open issues (do not claim they are fixed)

* **Unexplained 7-second delay:** once, three HP presses on the GM page showed "Saving…" for about 7 s, then "Offline: retrying"; all applied exactly once. Not reproduced. In the browser console `__vtt.net()` shows the last 60 requests; read that before guessing. Details: `docs/vtt/live-check-results.md`.
* **Live contrast check, one timeout:** once, the contrast check against the live site (laptop size) hit its per-step time limit; the same run passed minutes later and on the phone size. Cause unknown; the limit names the stuck step if it recurs.
* **Not verified:** the passphrase builder's publish, real phones and Safari, whether the storage token fix holds after hours on a warm server, and the rules against any rulebook.
* **Waiting on the owner:** the "Your call" items on `/inventory/`, the text in `content/landing/` and `site.json` (contact link, privacy draft; the donate link goes to the Ko-fi page).

## Current loot reference

The owner requested three spells per grimoire and preservation of all spells across additional books. `/loot/` (Current Loot Tables) is generated from `site/sheet/gear.js`, with no private GM loot notes. The 96–99 d100 range uses the Grimoires d100 sub-table. The catalogue has 178 items (145 rollable finds); all five sub-tables now use d100, while main-table category odds remain unchanged. Catalogue spells have an explicit damage/healing/esoteric effect label. Read-by-die books use `pick` for the number of spells and `pickDie` for the die; the untitled book maps a d6 evenly onto three spells. Existing item and spell IDs must stay stable. GM-designed grimoires preserve exactly three known spell IDs through their saved definitions.

Since the last full phone pass: public loot catalogue, expanded grimoire selection and GM grimoire spell selectors.

Since the last full phone pass: a public loot roller on `/loot/`, using the VTT loot rules without reading or writing game sessions.

## Equipment balance (owner approved)

All grimoires, including GM-designed ones, cost exactly three slots. Weapons have `weaponStyle`: single, heavy, reach or ranged. Heavy ordinary melee (`cat: weapons`) adds +2 damage, retained on an Ultimate upgrade; reach/control weapons keep normal damage. Two-handed weapons cannot be used while a shield is equipped: move it to the pack. Armour has `armourPart`: body, head or shield; one of each contributes. Saved overlapping armour moves to the pack once without deleting items, preserving wounds where possible and leaving a living hero at least 1 HP. Overfull old book loadouts show a warning and must be rearranged before item use. Old custom weapons default to single-handed and old custom armour to body; their GM may choose the appropriate role in the designer.

Since the last full phone pass: three-slot books, equipment warnings and role labels, custom weapon/armour selectors, heavy damage and shield restriction.

Drawing is GM-only: players have Select and Point, can see GM ink, and cannot send draw/drawUndo/drawClear commands. Existing ink is preserved. Since the last full phone pass: player Draw controls removed.

Since the last full phone pass: shared website Back to top button appears after scrolling 400px; excluded from VTT, character and builder screens, supports reduced motion and returns focus to the page heading.

Since the last full phone pass: My heroes now has a starting-hero generator with preview/keep, and a local backup-file restore with review, duplicate skipping and separate copies for changed versions. Test these in the next requested phone suite. The later weapon update moves ordinary ranged weapons to Weapons d6; saved Effort allocations remain intact with a reminder to reassign old bow bonuses.

Since the last full phone pass: removed the ready-made hero selector from My heroes at the owner’s request; the generator, blank sheets and all existing saved heroes remain.

Owner-approved weapon dice: all ordinary catalogue weapons (including bows, crossbows, slings and weapon-listed tools) use Weapons d6. Guns/gunpowder use Guns d8. Custom ranged style means bow/crossbow d6; firearm style means two-handed gun/gunpowder d8; single-handed Guns remains available. Existing Effort points are not silently reassigned: sheets explain that old bow bonuses under Guns can be moved to Weapons. New scouts invest in Weapons. Old pending item attacks are resolved with the corrected category when their possession can still be identified; completed damage is preserved. Since the last full phone pass: weapon labels, designer firearm style, saved-archer reminder and corrected Effort guidance.
