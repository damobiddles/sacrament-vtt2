# Weekly consistency audit, 9 November 2026

The weekly routine: check rules, loot, navigation, look and game feel across the website, the Sacrament RPG Table and the solo game, fix what is found in one change, and list open questions. Since last week's audit (8 November) three changes landed: the Penitent's Chain, Bone Bell and Censer of Ash working on their own (#61), the Rib of Saint Hussey GM pack and news post (#62) and the November dispatch (#63). No rule was changed.

## How it was checked

- **Rules and logic.** `npm run check` (615 unit tests, including the solo/table parity test) passes. Read the Horror, paths and advancement wording on every rules page, the solo engine and the table's server, and the new news posts.
- **Loot.** A script read all of `site/sheet/gear.js`: no duplicate ids or names, every tag is a real tag, every relic has one of the 20 paths and costs at least 2 Horror, every item with uses states them, every relic that runs out says what happens, 22 grimoires with 3 spells each and no spell in two books.
- **Navigation and look.** Every page (37) opened at desktop (1366×900), iPad (820×1180) and phone (390×844) in desktop Chrome: title, H1, menu (8 items + logo), marked section, rules tabs (5), footer, sideways scrolling, blackletter font, broken requests, and every internal link and anchor.
- **Game feel.** Compared the table's Activity lines with the solo story for the Chain, dice, Horror, pay in blood and rests.

## What was already right

- Horror (natural 1 only on attack, spell or push; pay in blood past 21), marks and paths read the same on Rules, Player guide, GM guide, Start here, Play in person and the news posts.
- No page scrolls sideways at any of the three sizes; every page except the table and the printable sheet (by design) has the footer; no blackletter font anywhere.
- The only broken links are on the owner's inventory page, listing retired addresses on purpose (they redirect on the live site).
- The new Chain/Bell/Censer behaviour reads the same listed effects in the table and solo.

## Fixed in this change

1. **Paths page: a pushed relic roll.** It said a relic's natural 1 adds Horror "only when the relic is used to attack". A relic used as a pushed second action counts too, as the Rules page says and both the table and the solo game already do. Words only; clarification added to the errata page.
2. **Solo dice in the table's words.** The solo story wrote dice as "(d6 4)" and "d4 3 + d4 2"; the table writes "d6 shows 4" and "2d4 shows 3 + 2". Solo now uses the table's form for foe hits, healing, pay in blood, rests and the Penitent's Chain. A rest in solo now also says "now 5 of 21", like a rise does.
3. **November dispatch: rules tab names.** It listed the tabs as "Rules, Player guide, GM guide and Rules updates"; the tabs are Rules, Paths, Player guide, GM guide and Updates and errata.

Tests added: in `test/solo.test.mjs` (dice wording, watched failing before the fix) and `test/site-audit.test.mjs` (the Paths sentence and errata entry, the dispatch tab names).

## Open questions for the owner (carried over, still undecided)

1. The Last Verse and Its Real Name have no tag, so solo never offers them.
2. The table says "(now 9)" after a Horror rise and solo says "(now 9 of 21)". Left as is: solo writes every number "of" its maximum (HP 7 of 10), the table writes 7/10.
3. The footer links The Rib of Saint Hussey but not The Guest at Greave or Paths.
4. The print-and-play kit has no paths or advancement yet.

## Not verified

The live site (the cloud environment cannot reach it), real phones and iPads, Safari and Firefox.
