# Sacrament rules and loot audit — 24 October 2026

Scope: current VTT arithmetic, server actions, sheet/equipment rules, all 178 catalogue items and 23 spells, public rules/role guides, loot page, and the boundary between automation and GM rulings. This is a consistency and logic audit, not a claim that every build has been balanced through playtesting. The owner's decisions in chat take precedence over earlier drafts.

## Corrections made

1. **A hero at 0 HP could still perform some actions.** Healing had a guard, but ordinary checks, attacks, other item uses, standalone Effort and Push were not consistently blocked. These new actions are now refused on the server without spending charges or Horror. Recovering restores actions. Already recorded damage and rolls are preserved; the GM retains standalone dice and explicit correction tools.
2. **Public rules contradicted the VTT.** `/rules/` now contains the current reference. The obsolete public draft is kept in `docs/hearts/earlier-public-rules.html`, outside the published site. Its automatic hero natural rolls, additive critical damage, old Horror rules, aftershocks and d6 rests are not presented as current rules. The older adventure and dated news remain labelled historical records.
3. **Old ranges meant different things.** Current definitions are Close (sword/melee reach), Near (beyond melee, up to 30 feet), Far (ordinary ranged distance beyond 30 feet), and Very Far (exceptional range, GM judgement, explicitly suitable weapon/ability). Near is not a polearm's reach. No fixed boundary for Very Far was invented.
4. **Range values were missing from normal displays and lost in custom copies.** Sheets, individual spells, the public catalogue, target prompts and GM loot previews now show the same range labels. Custom ranges survive designer/library/card/hero-copy conversion. The designer supports the agreed bands, Self and Special/GM ruling. An unspecified existing custom range stays unspecified; private tables are not rewritten.
5. **Catalogue corrections.** Melee and reach weapons remain Close. A hatchet is Close in melee and Near when thrown. Standard bows, crossbows and slings reach Far; the Boundary Watch Longbow explicitly reaches Very Far. Touch-based items and bandages remain Close; Mend and the existing short-range healing relics reach Near and can heal self. Personal disguise/information effects are marked Self. Undefined relic powers use Special rather than invented range limits. Every grimoire defers to its three spells.
6. **Crossbow text implied an extra Move from Push.** Reload still costs a Move; Push grants an Action and does not itself reload. No weapon die, damage bonus, charge, cost, loot probability, ID, slot count or spell assignment was changed.

The website's rule-values summary is generated from the same constants as the VTT. Player/GM/loot range tables share that definition. Catalogue entries still come from the single gear list. A regression fingerprint separately protects all catalogue mechanics and roll probabilities while allowing the approved range/text changes.

## Priorities still requiring decisions

### High: turn budgets and Push outside the active hero's turn

The VTT enforces failed attacks only, latest roll only, once per own turn, and no repeated Push of the pushed action. It deliberately permits ordinary narrative rolls outside turn order and does not count Moves/Actions. The Push counter is not a complete out-of-turn action budget. A GM must enforce that limit outside the hero's own turn or with no turn order. Recommend deciding whether Push should be available only on a hero's combat turn, with a separately explicit GM allowance outside combat. Do not silently introduce a new turn restriction while auditing rules.

### High: area effects and alternate relic modes remain manual

Rend the Veil describes every foe in Near and a once-per-scene limit. The current damage workflow applies to a selected target, not all eligible targets; the GM must apply the remaining results and enforce the scene limit. The Executioner's Blade's optional d12/3-Horror mode is not a separate automated action. Conditional Dazed, Guard/Assist, holy oil's die upgrade, armour penalties, and special manoeuvres also need GM adjudication. Public rules now distinguish these from automation. Recommend defining each supported mode and trigger before adding automation.

### High: several loot powers are not actually defined

The Thorned Reliquary, Candle of Last Rites, Shard of a binding seal and Bone flute have damage categories but descriptions that do not explain the attack. Their automatic damage prompts should not be mistaken for a complete ability definition. Holy water also needs explicit eligible targets/effect; the Hunter's snare needs trigger, duration and whether it damages or restrains. These need authored effects or removal of inappropriate damage categories after an owner decision. No powers were invented here.

### Medium: crossbows have a disadvantage without a clear compensation

Bow and crossbow both use d6, require two hands and take two slots. Crossbows require a reload Move; bows do not. The corrected text makes this disadvantage visible. Recommend choosing a benefit (for example, a deliberate accuracy or ready-shot advantage) or removing the reload distinction. Neither choice was applied because it would change rules.

### Medium: Ultimate can be a worse option

Damage Ultimate replaces the normal die and uses the Ultimate bonus. Magic d10+3 averages 8.5; Ultimate d12+0 averages 6.5. The normal roll remains available, so a player need not take the worse choice. Decide whether critical damage should instead add a die, keep the original bonus, or remain a specialist's optional upgrade. Healing's natural-20 d12 is additive, which is a separate current rule and is now stated explicitly.

### Medium: magic-item limit includes more than relics and books

The current code counts every carried item marked as tempting Horror, including Bone flute and Hound-tooth charm, and counts packed gear. Older wording said only three relics/grimoires. Public rules now disclose the actual current implementation. Decide whether to retain that broader magical-item limit or restrict it to relics and books. No inventory was removed or reclassified.

### Medium: party rest counts all living hero cards

Rest scales with all living hero cards at the table, including unclaimed sample or reserve heroes. It does not infer the active party from connected players. Decide whether an explicit active-party marker is needed; do not exclude unclaimed heroes automatically because a GM may be running one for an absent player. The d10 scaling itself matches the approved rule.

### Medium: a found spade can attack from the pack

The found Gravedigger's spade is a supply with Weapons Effort, while the starter Sexton's Spade is a weapon that must be equipped. Reclassifying it changes readiness and catalogue category counts. Decide whether to make it a weapon or explicitly allow tools to be readied as part of an action. Both remain d6, as requested.

### Playtest questions

- Heroes use their total on natural 1/20; monsters automatically miss/hit. This is consistent with the current approved implementation but should be an explicit choice because players may expect symmetry.
- Healing spells cost no casting Horror, but a natural 1 still adds the separate natural-1 point. Confirm that distinction remains intended.
- Horror caps at 21; it has no automatic overflow penalty or magic ban. Its consequences need to be meaningful in GM play, or further use can become effectively free.
- Plate harness grants +1 Heart as well as high Defence. Its Dash/DEX drawbacks are manual; forgetting them makes it unusually strong.
- There are no standard gun/rifle finds in the 178-item catalogue. Custom guns use d8; the designer can explicitly assign Very Far to a rifle. No new firearms were added during this audit.
- Several esoteric spells have powerful effects without checks. Range labels clarify reach but do not settle resistance, duration, eligible targets or narrative limits.

## Rules checked

| Area | Result / boundary |
|---|---|
| Checks | d20 + score; Easy/Hard move Target by 3; Target min 1; bonus cap +10; hero total determines success |
| Dice | Basic d4, ordinary weapons d6, guns d8, magic d10, Ultimate d12; table settings remain supported |
| Creation | Six score points, maximum 6 in one; four Effort points; generator remains legal |
| Equipment | 10 equipped + 10 pack slots; three-slot/three-spell grimoires; one armour per part; two hands exclude shield; heavy +2 retained on Ultimate |
| Defence | 10 + CON + armour; armour cap +5, combined modifier cap +10; monster natural 1/20 overrides total |
| Combat | Target remains attached through damage/reload; damage/obstacle progress distinct; GM-only turn advancement |
| Dying | d4; ticks once per new round; Stable pauses; hit while dying removes a round; healing stands up living heroes; no raising dead |
| Healing | Supported sources, charges, per-recipient/source limits, downed exception, critical healing and Undo checked |
| Rest | Living heroes heal 10; d10 per two living heroes rounded up; no consumable refill; Undo preserves charge/allowance state |
| Horror | 0–21; alerts 7/14/21; healing spell 0, other spell 1; listed relic costs; natural 1 and Push separate; no automatic aftershocks |
| Loot | 178 items, 23 spells, 16 books; IDs, categories, odds, slots, costs and existing mechanics preserved |
| Ranges | All 201 entries reviewed; no automatic distance measurement or range enforcement introduced |
| Privacy | Existing ownership, hidden cards, GM notes, private custom libraries and stored access keys unchanged |

## Complete catalogue review

[All 178 items and 23 spells, with previous/current ranges and review notes](loot-ranges-2026-10-24.csv).

Mundane valuables and practical tools do not receive invented combat ranges. Their uses remain governed by their descriptions and the GM. Existing authored custom loot remains table-local and retains its own wording; the shared catalogue does not overwrite private custom definitions.

## Validation

New tests reproduced the missing range model/copy metadata and fallen-hero action guard before correction. They pass afterwards, including recovery, unchanged charges/Horror on refusal, and GM dice. A separate fingerprint protects every non-range catalogue mechanic, ID and loot probability. The older whole-definition fingerprints were updated only for the approved range/text corrections; they were not removed.

Quick validation passed 442 unit cases, lint/type checking and quick contrast; the additional catalogue-invariants test also passes (443 distinct unit cases in total). The full laptop browser run passed 140 cases with one existing skip. Full contrast, the 65-case table suite, 75-case walkthrough, 26-case hero/conversion suite and required quick phone smoke check pass. No time limits or accessibility/privacy thresholds were raised or weakened. Local screenshots of the current rules, longbow and sheet range tags were inspected. Evidence is under `/workspace/sacrament-audit/`: `rules-audit-before.log`, `rules-audit-after.log`, `rules-quick-fixed.log`, `rules-invariants.log`, `rules-targeted.log`, `rules-release.log` and `rules-visual.log`.

Physical devices, Safari and the full phone suite remain unverified in this pass. The report is an audit against current owner-approved VTT behaviour, not an external rulebook or an exhaustive balance simulation. Live verification uses a disposable table only.
