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
* **Last full automated phone suite:** 2026-10-24, the owner-authorised backlog pass. Pending phone-review queue: guided My heroes creation, new-player table help, current player/GM guide pages, Rules hub, site-owned Ko-fi support button, unified public navigation/footer, home-page journeys, Resources hub, scene-deletion confirmation, GM-only turn controls and the resumed GM layout (routine phone smoke check required before publication). This is simulated Chromium phone testing; physical devices, Safari and real assistive technology remain unverified.



## Known open issues (do not claim they are fixed)

* **Unexplained 7-second delay:** once, three HP presses on the GM page showed "Saving…" for about 7 s, then "Offline: retrying"; all applied exactly once. Not reproduced. In the browser console `__vtt.net()` shows the last 60 requests; read that before guessing. Details: `docs/vtt/live-check-results.md`.
* **Live contrast check, one timeout:** once, the contrast check against the live site (laptop size) hit its per-step time limit; the same run passed minutes later and on the phone size. Cause unknown; the limit names the stuck step if it recurs.
* **Not verified:** the passphrase builder's publish, real phones and Safari, whether the storage token fix holds after hours on a warm server, and the rules against any rulebook.
* **Waiting on the owner:** the "Your call" items on `/inventory/`, the text in `content/landing/` and `site.json` (contact link, privacy draft; the donate link goes to the Ko-fi page).

## Current loot reference

The owner requested three spells per grimoire and preservation of all spells across additional books. `/loot/` (Current Loot Tables) is generated from `site/sheet/gear.js`, with no private GM loot notes. The 96–99 d100 range uses the Grimoires d100 sub-table. The catalogue has 178 items (145 rollable finds); all five sub-tables now use d100, while main-table category odds remain unchanged. Catalogue spells have an explicit damage/healing/esoteric effect label. Read-by-die books use `pick` for the number of spells and `pickDie` for the die; the untitled book maps a d6 evenly onto three spells. Existing item and spell IDs must stay stable. GM-designed grimoires preserve exactly three known spell IDs through their saved definitions.



## Equipment balance (owner approved)

All grimoires, including GM-designed ones, cost exactly three slots. Weapons have `weaponStyle`: single, heavy, reach or ranged. Heavy ordinary melee (`cat: weapons`) adds +2 damage, retained on an Ultimate upgrade; reach/control weapons keep normal damage. Two-handed weapons cannot be used while a shield is equipped: move it to the pack. Armour has `armourPart`: body, head or shield; one of each contributes. Saved overlapping armour moves to the pack once without deleting items, preserving wounds where possible and leaving a living hero at least 1 HP. Overfull old book loadouts show a warning and must be rearranged before item use. Old custom weapons default to single-handed and old custom armour to body; their GM may choose the appropriate role in the designer.


Drawing is GM-only: players have Select and Point, can see GM ink, and cannot send draw/drawUndo/drawClear commands. Existing ink is preserved.




Owner-approved weapon dice: all ordinary catalogue weapons (including bows, crossbows, slings and weapon-listed tools) use Weapons d6. Guns/gunpowder use Guns d8. Custom ranged style means bow/crossbow d6; firearm style means two-handed gun/gunpowder d8; single-handed Guns remains available. Existing Effort points are not silently reassigned: sheets explain that old bow bonuses under Guns can be moved to Weapons. New scouts invest in Weapons. Old pending item attacks are resolved with the corrected category when their possession can still be identified; completed damage is preserved.




Backlog pass authorised by the owner on 2026-10-24: phone suite and Safari review, healing/rest automation, opt-in scene danger, My character, reliability/security follow-ups, accessibility and maintenance. Monster natural 1 always misses and natural 20 always hits, explicitly approved in chat. Run the full phone suite for this pass; subsequent routine work returns to the normal phone-check policy.

New behaviour: catalogue healing is server-applied and once-per-recipient/source per rest; downed recipients may be healed again, dead heroes cannot be raised, and a fallen caster cannot act. Bandages Tend dying heroes; critical Tend heals d4. Natural-20 ordinary healing adds d12, following the existing healing engine. Healing Undo restores HP/charge/allowance; undo later healing/rests first. Canonical healing mechanics survive newly designed/awarded loot copies through a validated healingSource; old free-text copies stay unchanged/manual. Scene danger is off by default to protect existing manually adjusted monster bonuses.


Owner decisions, 2026-10-24: party-rest Horror reduction is now d10 per two living heroes, rounded up. Only GMs may advance turns; the button is Next turn. Non-live scenes can be deleted with confirmation, keeping heroes and held gear. Obstacles use the existing Attack a hero controls. The owner explicitly held the GM layout redesign after the compact-window attempt: keep the existing GM hero strip; moving occasional hero rolls into a sheet-only workflow and stronger visual GM/player differentiation remain on the follow-up list.


GM layout resumed by the owner, 2026-10-24: the main GM player strip and Acting as marker are removed. Select a hero and open their sheet for occasional checks or item actions; enemies/obstacles still attack through their selected panel, and standalone GM dice stay in the footer. Explicit GM view / Player view labels use different accents. Narrow GM windows scroll the map and tray together to avoid overlap. Storage keys, permissions and rules stay unchanged.

Rules/range audit, 2026-10-24: the owner defines Close as sword/melee reach, Near as beyond melee up to 30 feet, Far as ordinary ranged distance beyond 30 feet, and Very Far as exceptional range requiring a suitable weapon/ability; the GM judges the Far/Very Far boundary. `SacramentRules.RANGES` and its range helpers are shared by the website, sheets and loot designer. The longbow explicitly reaches Very Far; reach weapons are Close, never 30-foot melee attacks. `/rules/` is generated from `content/landing/rules.md` and live rule constants; the earlier draft is private project history in `docs/hearts/earlier-public-rules.html`. New actions by fallen heroes are server-blocked. See `docs/audits/rules-and-loot-2026-10-24.md` and its 201-entry CSV for unresolved balance decisions; do not treat them as approved rule changes. Pending phone review also includes the current rules/range references, range tags and custom-range fields.

Loot/combat follow-up authorised by the owner, 2026-10-24: see `docs/audits/loot-powers-and-combat-2026-10-24.md`. Crossbows now have their own `crossbow` weaponStyle (+2 attack accuracy, d6, two hands; reload Move stays manual). New hero successful-natural-20 damage/Effort adds an extra Ultimate die with each category bonus counted once; `criticalRule: 'extra'` distinguishes new rolls from older pending replacement-critical rolls. Rend chooses multiple visible foes and applies/undoes their damage together. Scene allowances are scoped to scene/caster/canonical ability, survive rest and reconnect, and share across copies; the GM confirms a refresh for a new encounter. The binding-seal shard and Executioner's Blade final blow are tracked; alternate blade use is 3 Horror once per scene. Push requires the current exchange and own active turn, with a separate explicit GM exception; no second-action Push. These decisions supersede the corresponding open findings in the earlier rules/range audit. New power/GM refresh controls join the pending full phone-review queue; routine phone smoke remains required.

Scene turn orders, 25 October 2026: each scene stores `turns: { order, idx }`; `table.order/idx` remain the authoritative live view for compatibility. On leaving, save that scene’s current order/actor; on first visits, seed heroes and tracked enemies belonging to that scene. Seed all legacy prepared scenes before the first switch so previously tracked enemies are retained. Prepared quick-add enemies join their own scene, not the live order. Deleting/moving cards updates saved orders; new heroes join existing orders. Empty/edited orders are preserved. The round stays table-wide; revealing scenes does not tick timers/dying or refresh scene powers. Scene-aware turn/order commands and Undo prevent changing another scene accidentally. Prepared orders are never projected to players. Full phone review remains pending; routine phone smoke is required before publication.

Roll reveal authorised by the owner, 25 October 2026: server log entries for hero/monster/healing checks link to their roll and scene, and project only audience-safe `outcome` presentation metadata. Never send raw private rolls/gear or hidden monster numbers to other viewers. `dice.js` shows a brief centred result card, including physical dice and reduced motion, with no added sound or dismissal step; neutral GM dice keep their old presentation. Its optional Roll damage button invokes the existing panel control and leaves Apply separate. Timers/intervals are cleared on replacing a reveal, session reset or scene switch; focus on its action keeps it readable. Reconnects do not replay historical results. Full phone review of the new reveal remains pending; routine phone smoke must pass before publication. No rules or stored key names changed.

Owner-approved streamlining, 25 October 2026: invitations are only in Table; the GM dice footer is permanently expanded and has a gold divider. New UI Effort commands request `autoApply` for attacks/HP damage, area spells and targeted item actions; the server validates recorded targets and applies within the same command. Old callers without that flag and already-rolled pending Effort keep their manual Apply path. Undo restores automatic damage; no stored history is rewritten. Ordinary task Effort and neutral GM dice remain manual where placement is needed. Public guides supersede their former separate-Apply instructions. The owner selected the supplied Ko-fi floating overlay, not a navbar button; `nav.js` loads it on public pages only, with a floating direct-link fallback, footer link, supplied account/colours and privacy notice. Never load the support widget in VTT/character/private builder pages. The cloud proxy denied the real Ko-fi CDN twice; real popup verification is blocked, and tests use a contract stand-in plus blocked-script fallback checks. Do not claim the third-party payment window was verified. Routine phone smoke remains required; full phone/Safari review remains pending.

GM usability cleanup approved by the owner, 25 October 2026: the four GM tabs remain visible during selected-card, edit and roll views, with arrow/Home/End keyboard navigation. Order names inspect cards; manual Set turn is inside Edit order. Scheduling is in Table, scene danger in Table → House rules, and the named live encounter's ability refresh in Play (not offered while preparing another scene). Combat precedes counters; tracker setup and saved monster templates are in Edit card. Back to my tables preserves GM authority; intentional Forget remains on Your tables. Player Leave keeps its existing two-press behavior. Recovery copy/download controls are grouped, and damage results offer event-specific Undo through existing permissions/conflict handling. Both UI and server reject prepared-scene monster attacks and damage carried into another live scene. Hidden enemies in the live scene may still attack. Timer scope, rest/Horror dice, saved keys, history and all other game rules stay unchanged. Automatic timers still tick every table round, including hidden scenes, and existing pause controls explain that scope. Guides and layout tests supersede their earlier instructions that tabs disappear, order-name clicks immediately change turns, or a GM must forget access to leave.

Map-width switching removed at the owner’s request, 25 October 2026: no Fill width / Fit map button or wide-mode behavior remains. The map always uses its existing fitted view. Shared token coordinates and scene data are unchanged. Current guidance and the map-layout regression test reflect this removal.

The owner also removed the live-encounter heading and invite/first-session-help introduction from Play, 25 October 2026. Play starts directly at Turn order. Invitations and hero creation remain in Table; the selected-card context and encounter-refresh confirmation still identify the live scene where needed.

Owner decision, 25 October 2026: Next turn is only beside the turn order in the GM’s Play tab, not in the top strip. The header still displays the current actor and round; Next round remains its secondary manual override. Automatic round advancement and player permissions are unchanged. This supersedes earlier instructions to keep Next turn in the header.

GM drawing colours requested by the owner, 25 October 2026: Draw shows one labelled basic colour selector (Gold, Blue/water, Green/trees, Red/fire, White, Black). A stroke captures the chosen colour when drawing starts, uses it for the local preview and sends it through the existing server-validated colour field. Existing ink retains its saved colours; players see the same saved strokes but still cannot draw, undo or clear. Colour selection is local to the current page/session, persists across tool/scene changes, and resets to Gold on reload or changing session. No stored keys, permissions, scene scope or game rules change.

Owner-approved audit fixes and dice restoration, 25 October 2026: see the latest section of docs/vtt/README.md. Preserve armour Hearts through newly made custom copies without rewriting saved inventories. Validate new custom Horror costs; put designer errors in its own accessible status. Shared automationText explains manual conditions/buffs/quantities, and no-roll actions say Use. Pending-roll reload is actor/scene/target-aware. Dice results now appear over the scene again: own hits stay until Roll damage, other results have Continue; no dismissal timer. This supersedes the earlier Activity-only visual presentation, not Activity history or event Undo. Reduced motion keeps static results; privacy and existing damage command safeguards stay authoritative. Confession/Speak, Holy Oil balance and Ward self-targeting remain unapproved rule choices.

Owner-approved themed grimoires, 25 October 2026: 16 current books across ten themes, 43 spells (all 23 original spells unchanged plus 20 new spells), still three slots/three spells. See docs/vtt/README.md. Thirteen changed editions have new IDs; the original IDs and full definitions live in `G.retiredGrimoires`, indexed by sheet-core for existing characters/backups but excluded from the current catalogue and loot pool. Never delete those definitions as unused or silently replace owned books. Existing custom copies remain frozen. Themes are optional validated labels on designed books and do not restrict custom spell mixtures. New damage uses existing Magic d10; all non-healing spells still cost 1 Horror, healing 0 plus the separate natural-1 rule. New control/narrative effects are bounded and explicitly manual. Catalogue/roller/sheets read shared gear data; item counts and loot odds are unchanged.

Physical die entry: keep the same actor/session's actual d20 input node when rebuilding the footer. Replacing it during preparation can send typing/autofill to a detached field. Consume the visible value with takeD20; clear unused drafts on session/hero changes. Do not restore the previous render-from-cache-only approach. The themed-grimoire browser regressions also cover this release blocker.
