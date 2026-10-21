# Audit: what the earlier game had, and what the Hearts redesign did with it

*Status: the redesign has been adopted. The first sections are the audit made before the change, written from `main` at the time. The last section records what was done and how to undo it.*

*Written from the repository as it stands on `main` (the commit before the `redesign-hearts` branch). Every claim here comes from reading the files named, not from memory.*

## What exists today

| Part | Where | Size | What it does |
|---|---|---|---|
| Basic rules page | `site/rules/index.html` | 264 lines | Checks against a difficulty ladder (Easy 8, Routine 12, Hard 15, Heroic 18, Legendary 22), scores starting at +0, picks, paths and levels, a 12-box harm track with Wounds, armour dice with durability, a free Move plus one Action plus one reaction a round, a push for a second Action. |
| Rules engine | `site/character/rules.js` | 202 lines | Scores, picks, abilities, gear, armour dice, the dying state. |
| Library | `site/character/data.js` | 73 abilities, 16 weapons, 11 armour pieces, 14 trinkets, 9 supplies | Ability trees (paths with prerequisites), level-scaled damage, items. Now also `fx` effect data. |
| Effects layer | `site/character/fx.js`, `fxrun.js` | | Hooks and effects for cards: reactions in the hit dialog, buffs, attack plans, a target picker. |
| Character builder and sheet | `site/character/index.html`, the sheet inside `site/play/index.html` | | Build by picks; the sheet plays the character. |
| Virtual table | `site/play/index.html` | about 5,000 lines | Hex and square map, tokens, adversaries with a Difficulty each, live tables over Firebase, the Looming Horror ladder, the adversary-turn planner. |
| Node builder | `private/builder.html` + Netlify functions | | The password-gated tool that publishes the ability library. |
| Tests | `test/`, `scripts/playtest/`, `scripts/table-test/` | 98 unit tests, a rules check, a stress model, 10 browser table scripts | Describe the existing rules. |

## What the new design keeps

- **The Looming Horror**, its 0 to 21 track, its three thresholds (9, 15, 21) and their six-row aftershock tables, kept where they still make sense and **marked *kept* or *adapted* row by row** in `site/hearts/data.js` and the rules.
- **Only a party rest in a safe place lowers the Horror**, by a d6 (now a d6 per two heroes).
- **Body, Mind and Spirit**, a d20 plus a score against a number, natural 20 succeeds and natural 1 fails.
- **The dying idea**, but replaced: see below.
- **The look**: `theme.css`, the dark palette, the parchment light theme, the typefaces and the top bar.
- **The infrastructure for a later integration**: the live-table plumbing (Firebase, the roll log as a message channel, the transactional Horror ladder) and the test harness that fakes it.

## What conflicts with the simpler design

| Existing | Why it conflicts | In the prototype |
|---|---|---|
| The five-step difficulty ladder per adversary | The brief wants one visible Target Number per scene | One TN per scene (10, 12, 14, 16), with Easy (−3) and Hard (+3) |
| Scores that start at +0 and grow with passives | Characters feel weak and checks feel punishing | A +2/+1/+0 spread, gear adds to a cap of +5 |
| 12-box harm, Wounds, Wound-triggered Horror | Two systems for one thing, and Horror from damage | One health: 2 Hearts (20 points) |
| Armour dice, durability, repair | A second subsystem | One armour number: a Defence bonus, never more than +4 |
| Ability trees, picks, paths, levels, prerequisites | The heart of the complexity | Removed. A hero is what they carry |
| Level-scaled damage dice | Ties power to levels | Effort die by source, d4 to d12 |
| Free Move, Action, reaction, push (second Action costing 1) | Reactions need a separate prompt flow | Move, Action, push once a turn. No reactions in v0.1 |
| Hex and square grid, measured movement | The brief asks for distance bands | Engaged, Close, Far, Distant |
| Horror from failed checks and Wounds | The brief says voluntary only | Voluntary only: spells, relics, pushes |
| Death Bargains | Optional later module | Set aside |
| `fx` abilities layer | Built for ability cards | Kept in the repository, unused by the prototype. A natural home for item effects if the prototype becomes the game |

## What I did, and what I left alone

- **Nothing existing was changed.** The prototype lives in `site/hearts/` with its own pages, its own data and its own saved-character key in the browser (`sacrament-hearts-v0`). It reads nothing from, and writes nothing to, the existing sheet, the live table or Firebase. No saved character or campaign is touched.
- **It is on a branch** (`redesign-hearts`) and is **not linked** from the site, the sitemap or the top bar, and each page asks search engines not to index it. It has not been published.
- **The old tests still describe the old game.** They remain because the old game remains live. If the Hearts rules are adopted, these should be retired or rewritten: `test/rules.test.mjs`, `test/library.test.mjs`, `test/dying.test.mjs`, `test/cards.test.mjs`, the rules check and stress model in `scripts/playtest/`, and the fx tests. New tests for the prototype are in `test/hearts.test.mjs`.
- **The multi-player VTT was not rewritten.** Its map, tokens and Firebase code are about 5,000 lines of tangled rules. The prototype gives a table tool that runs on one device (Target, Hearts, turns, dice, the Horror track, resting, dying). Connecting it to the live shared table is the next step if the rules survive a playtest; the engine is pure functions so the connection is small.

## If the prototype becomes the game

1. Retire the old tests listed above and the old rules page; move `site/hearts/` to the main paths.
2. Migrate saved characters: scores to the +2/+1/+0 spread by rank, health to 2 Hearts, gear by name to the nearest library item. Offer the old sheet as read-only until a human has chosen.
3. Port the Firebase table to the new engine: Target and Hearts are tiny documents, and the Horror ladder is already transactional.
4. Reuse the `fx` layer for relics and spells if item effects need to be data.

## Adoption: what was done

- **Pages at the main paths.** The rules are at `/rules/`, the hero sheet at `/character/`, the live table at `/play/` and the one-device table at `/play/local/`. The shared code moved from `site/hearts/` to `site/game/`.
- **The earlier game was archived, not deleted.** The old VTT and builder pages, the retired tests and scripts and the old effects layer are in `archive/` (not published). The earlier rules page and library are in `site/legacy/`. Everything is also in git history.
- **Earlier characters.** They are read in place from the browser's storage, at `/legacy/`, read only. A new Hearts hero is made from one only when a person chooses, after a preview they can edit (scores by rank, gear mapped by name to the nearest item, anything left behind written into the hero's notes). The old character is never changed or removed.
- **The table was ported.** It uses new Firestore collections (`htable`, `hheroes`, `hrolls`); the earlier game's documents are not read or written. The Horror position is raised by players in a transaction; the thresholds and aftershocks are the GM's page's job. The new rules in `firestore.rules` must be published for the live table to work.
- **The effects layer was reused in spirit.** Items and spells have `fx` (what they do beyond roll, Effort and Horror), with a sanitiser and a vocabulary that fits Hearts (`site/game/fx.js`). The engine reads it generically, so a new relic is a row of data. While moving the hard-coded behaviour into data, one gap turned up and was fixed: holy oil set a flag that nothing read, and now does what the item says. The earlier layer (`site/legacy/fx.js`) is kept only because the node builder loads it.
- **Not done.** The tile map (builder, tokens, fog, light) is gone from the live site; its tile art is still in `site/play/tiles/`. The node builder still publishes the earlier ability library and nothing reads it. The session recap function exists but nothing calls it yet.

## How to undo it

The earlier game is one revert away: `git revert` the merge of `adopt-hearts`. The Firestore rules are additive, so the earlier game's rules and data are unaffected either way.
