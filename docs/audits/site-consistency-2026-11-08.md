# Consistency audit, 8 November 2026

Owner's request: check that the rules, loot, navigation, footers, look and game feel are consistent across the website, the Sacrament RPG Table and the solo game, fix what is found in one change, and list open questions. The only rule change is item 8 below, which the owner chose on a decision card.

## How it was checked

- **Rules and logic.** Read `site/vtt/rules.js`, `site/sheet/sheet-core.js`, the solo engine and every rules page for the Horror rules (natural 1 only on attack, spell or pushed action; pay in blood past 21), advancement marks, paths and grimoires. Ran the existing parity tests (603 unit tests pass).
- **Loot.** A script read every entry in `site/sheet/gear.js`: 30 starting items, 6 starting relics, 242 finds, 22 grimoires, 66 spells, 12 tags, 20 paths. It checked ids and names for duplicates, every tag is a real tag, uses and Horror costs are stated in the words, every relic has a path, flavour and a stated check, and every grimoire has exactly three spells with none shared.
- **Navigation and footers.** Every page under `site/` was opened at 1366×900 (desktop), 820×1180 (iPad) and 390×844 (phone): title, H1, menu item marked, rules tabs, footer, sideways scrolling, blackletter font, script errors and every internal link.
- **Game feel.** Compared the words the table's server writes to Activity with the solo story for rolls, hits, Horror, pay in blood, falling and dying, marks and path relics, and played the solo game to a fight.

## What was already right

- One source for the rules: the table and solo both read `rules.js`, `gear.js` and `sheet-core.js`; the parity test plays the same moments through both.
- Horror wording matches on the Rules page, Player guide, GM guide, Start here, Play in person, Paths and the errata page.
- 22 grimoires, three spells each, no spell in two books, no unused spell. 128 relics, all with a path, all costing at least 2 and stating their own-path cost.
- The menu is the approved eight items on every public page; each page marks its own section; the rules pages share one row of tabs.
- No blackletter font anywhere on the website or the table.
- Solo uses the table's dice and the same result card (SUCCESS, MISS, CRITICAL HIT, Roll damage) and the same Horror threshold lines.

## Fixed in this change

1. **Footer on My heroes and the solo start screen.** Both pages had none. The footer styles moved from `landing.css` to `theme.css` so pages without the website styles show it the same way. In solo it hides while a road is being played.
2. **Seven relics now name their check.** The Bone Bell (CHA), Censer of Ash (WIS), Widow's Listening Veil (WIS), Ward Medal of Saint Ursel (WIS), Vigil Coal (INT), Rod of the Ash Procession (INT) and Mourning Nail (WIS) always rolled that check, but their words did not say which. Words only: a script confirmed every number and setting is unchanged. Clarification added to the errata page.
3. **Six older relics had no flavour line** (Penitent's Chain, Bone Bell, Saint's Knucklebone, Censer of Ash, The Black Candle, The Executioner's Blade). They now have one, in the lore's tone.
4. **Rules page tag table on phones.** It was 476 px wide on a 390 px screen. On phones each tag is now a small labelled block.
5. **Paths in the solo game.** The solo hero sheet now explains paths in the same words as the sheet at the table, and the solo story says "(your own path: 1 less)" when a path relic costs less, as the table's Activity already did.
6. **One name per page.** The first rules tab said "The rules"; it now says "Rules", like the menu and the page heading.
7. **Owner's inventory page.** `/support/` was listed as a working page but has been retired (it redirects); three notes mentioned an archive folder that no longer exists; the page title now matches the rest of the site.
8. **Plain look-alike finds now work like their twins (owner's decision on the card, 8 November).** Eleven finds looked like starting gear but had no rules, so the loot page said "the GM decides" while the solo game already treated the candle stubs as a light and the hemp rope as rope. Now: candle stubs work like Tallow Candles, hemp rope like Rope and Grapnel, flint and steel like the tinderbox, spikes and mallet like Iron Spikes and Hammer, hard bread and chalk sticks like their twins, the Gravedigger's spade is a weapon like the Sexton's Spade (it already rolled like one), the iron-shod staff and silvered dagger say what they do, and the sallet and jerkin state their Defence +1. Solo lights candle stubs like candles and lets flint and steel light a fire. Errata entry added.

Tests added: `test/site-audit.test.mjs`, `e2e/footer-everywhere.spec.mjs` (its phone check is tagged `@phone`, so it runs only in the phone suite), and the solo parity test checks the path line.

## Open questions for the owner

1. **Two story spells have no tag** (The Last Verse and Its Real Name, both in The Unsealed Canticles). Without a tag the solo game never lets a hero cast them. Probably right for "the GM decides" spells; say if you want a tag on them.
2. **The table (`/vtt/`) and the printable hero sheet have no footer** on purpose: the table fills the screen and the sheet is for paper.
3. **Small wording differences between the table and solo**, left alone: the table says "(now 9)" after a Horror rise and solo says "(now 9 of 21)"; paying in blood reads "2d4 shows 3 + 2, 5 HP" at the table and "d4 3 + d4 2" in solo.
4. **The footer** links The Rib of Saint Hussey but not The Guest at Greave or the Paths page. Both are reachable from Play in person and the rules tabs.
5. **Still known:** the print-and-play kit has no paths or advancement yet.

## Not verified

- The live site (the cloud environment cannot reach playsacrament.com).
- Real phones, real iPads, Safari and Firefox. The phone and iPad sizes were checked in desktop Chrome only.
