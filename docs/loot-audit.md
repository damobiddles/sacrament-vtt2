# Loot logic review — 23 October 2026

Scope: the shared catalogue in `site/sheet/gear.js`, its roll tables, character-sheet presentation and GM loot handoff. Private loot in existing tables was not inspected or changed. This is a consistency review, not proof of game balance.

## Catalogue changes

- Eight grimoires, exactly three different spells per book. All 23 existing spell definitions and IDs remain. Ward appears in both The Seventh Penance and The Threshold Lectionary; there are 24 book entries, not 24 unique spells.
- Three new books house the redistributed spells: The Cinder Lectionary, The Book of Last Confessions and The Threshold Lectionary. Existing book/item IDs remain stable; their revised contents apply wherever those standard catalogue books are used.
- A d8 Grimoire sub-table serves d100 results 96–99. The overall chance of a grimoire remains 4%; each of the eight books has an equal share. Existing individual book odds change accordingly. Existing starting-book permissions remain; new books are GM-awarded finds.
- The untitled book still casts randomly, now using d6 results 1–2, 3–4 and 5–6 for its three spells.
- Spells have explicit Damage, Healing or Esoteric effect labels. Existing damage dice, Horror costs and effect descriptions are preserved.
- The public Current Loot Tables page is generated from the catalogue and deliberately excludes private GM notes and table-specific custom loot.

## Logic fixes

- Removed inappropriate damage-roll categories from Physician's satchel, the found lockpicks, Saint's finger bone, The Warden's Bell, Ashen Rosary, Drowned Saint's Lantern, Hound-tooth charm and Fragment of stained glass. Their existing public descriptions concern treatment, tools, detection, deterrence or revelation rather than attacks. Added plain descriptions identifying GM-resolved effects; did not invent healing amounts, durations or ranges.
- Retained stat checks on magical utility finds when converted to custom loot. Such a check no longer implies damage.
- The existing rolled-grimoire path deliberately handed out standard books by catalogue ID and skipped custom editing. Generic custom loot did not recognise grimoires. The designer now supports actual grimoire definitions, preserving three known spell IDs through save, edit, placement and giving instead of treating a book as a curio. Server-side validation rejects incomplete/duplicate spell sets. Existing canonical handouts remain supported.
- Spell-selection randomness now distinguishes the number of choices from the die's number of sides.

## Findings still needing decisions or further automation

- Several found objects have flavour but no defined mechanical effect. The public reference says this explicitly. Examples include The Thorned Reliquary, Candle of Last Rites, Bone flute and Shard of a binding seal. Existing Effort/Horror settings on these ambiguous items have not been replaced with invented powers.
- Healing amounts, targeting, costs and once-per-rest limits need the separate healing-automation work already in the backlog. This release does not implement that work.
- Special weapon manoeuvres, ammunition, reload costs, conditional effects and once-per-scene restrictions still need GM adjudication wherever the VTT does not enforce them. In particular, Rend the Veil's once-per-scene restriction is printed but not newly automated here.
- The found Gravedigger's spade uses Weapons Effort while the starting Sexton's Spade uses Basic Effort. That may be intentional; it needs a balance decision before changing saved item behaviour.
- A public reference exposes the shared item list by design; it cannot reveal a GM's private custom items, unrevealed finds or private notes.

Validation and publication evidence are recorded separately in the release notes under `/workspace/sacrament-audit/`.

## Catalogue expansion — 23 October 2026

The owner chose 178 total items: 89 additions, doubling each category to 28 weapons, 14 armour pieces, 92 supplies/tools/curios, 28 relics and 16 grimoires. All additions are GM-awarded finds, not new player-selectable starting equipment. Existing item definitions and all 23 spells are unchanged, apart from item roll ranges. The eight new books each combine three existing spells around a theme; they add no new spell rules. New relics use existing damage, healing, disguise, movement, warding and information effects. Manual effects say what the GM applies; no healing or status automation was added. Mundane tools and valuables define practical uses without invented numerical bonuses or prices.

All five sub-tables now use d100 so the larger pools work with ordinary physical dice and require no extra nesting. Main category probabilities stay 35% supplies, 23% arms/tools, 22% valuables/curios, 15% relics, 4% grimoires and 1% binding seal. Within each category, entries receive as nearly equal a share as a d100 permits; individual item odds and the old printed sub-table numbers change. There are 145 rollable finds and 33 starting/direct-award-only entries. The website is still generated from the single VTT catalogue.

Expansion tests check exact counts, the unchanged original item/spell definitions, every sub-table face, both roll boundaries of every addition, GM-only acquisition, book conversion, representative server handouts and public-page completeness. These are consistency checks; fun and balance still need playtesting.

## Approved equipment balance — 23 October 2026

All sixteen standard grimoires and all custom grimoires now cost exactly three slots. Ordinary heavy melee weapons (Tithe Barn Maul and Vesper Guard's Axe) use Weapons Effort plus the character's normal bonus plus 2; the extra 2 remains when a natural 20 upgrades that attack to Ultimate. Reach/control weapons keep their normal damage and stated abilities. Bows, crossbows and other declared two-handed weapons require the shield to be moved to the pack before use. This is enforced on item use; the existing Move cost of swapping gear remains table-managed.

The catalogue and designer carry explicit weapon styles and armour parts. Only one body armour, helmet and shield can contribute. Legacy overlapping armour is moved to the pack on the next ordinary table command (not pointer movement), with a private GM notice. Every item and gear key is preserved. Removing duplicate extra Hearts preserves wounds where possible, keeps fallen heroes at zero and leaves a living hero at least 1 HP. Overfull book loadouts show their slot totals and must be rearranged before item use; nothing is automatically discarded. The same armour correction runs for browser-saved heroes. Old custom weapons default to one-handed and old custom armour to body until the GM chooses an appropriate role.

The server records the weapon's +2 on the attack, so concurrent gear changes cannot alter pending damage. Client-supplied damage bonuses are ignored; retries do not duplicate damage. The shared catalogue page, roller and sheets display the new slot costs and equipment roles. Existing spell effects, Horror costs and loot probabilities are unchanged. Reach/control effects, range adjudication and swapping costs retain their existing GM-managed behaviour.
