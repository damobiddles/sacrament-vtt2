---
title: Rules and guides
summary: The current Sacrament RPG rules used by the VTT, with player and GM guides and one shared range reference.
---
These are the **current VTT rules**. The earlier experimental draft is retained in the project notes and is no longer presented as playable rules here. The [Player guide](/player-guide/) explains your character and first turn; the [GM guide](/gm-guide/) explains running the table. For a first session, use the [first game checklist](/how-to-play/). What has changed recently, and corrections to earlier text, are on [Rules updates and errata](/rules/updates/). Playing on paper? The numbers are the same; [Play in person](/play-in-person/) has printable sheets and a one-page summary.

## The numbers at the table

{{RULE_VALUES}}

The values above come from the VTT rules file used by the server. GMs may change Effort dice, enable automatic scene danger or switch off the natural-20 Ultimate option for their own table. Explain house rules before play.

## Checks and natural rolls

Roll d20 and add the relevant score. Meet or beat the Target to succeed. Easy and Hard change the Target, not the number of dice. The Target cannot fall below 1. A single check modifier is capped at +10.

A hero's natural 1 adds 1 Horror on an attack roll, a spell roll or a pushed second action of any kind. A natural 1 on any other check adds no Horror: ordinary checks, items that do not deal damage (such as bandages) and a weapon used on an obstacle's progress are plain checks. Every spell counts, healing spells included. **Hero success still depends on the total:** natural 1 and natural 20 do not override it. A successful natural 20 adds an extra Ultimate die (normally d12) to the normal damage or Effort roll when enabled. Add the normal Effort bonus and the Ultimate bonus once each. If the normal ability already uses Ultimate, count that bonus only once. Heavy ordinary melee weapons add their +2 damage only once. Older pending rolls keep the rule they began with.

**Darkness.** Without a light, a WIS check to search or notice in a dark place is Hard (+3), as the Hooded Lantern says. Anything else the dark does is the GM's call.

Monster attacks are different: natural 1 always misses and natural 20 always hits. Otherwise the monster's d20 plus Attack bonus must meet the hero's Defence.

## A turn and an attack

Tell the GM what you do and agree whether a check is needed. Movement, action costs, positioning, reloads and special manoeuvres are adjudicated by the GM; the VTT does not count them for you. A Push grants another Action after a failed attack; it does not grant another Move or reload a crossbow.

Select an enemy or obstacle, then use a weapon or spell. Choose a target when asked. On success, roll damage or Effort; the VTT applies it to the named target automatically. Damage against HP reduces health; Effort against an obstacle fills its progress. Looking at a different card does not change the attack’s recorded target. Only the GM advances turns. Passing the last entry starts a new round and ticks running timers and dying countdowns once.

Only a failed attack can be pushed. Push adds 1 Horror and makes the next action the second action; that action cannot itself be pushed. Players can Push only during their own active turn, once. For an explicit exception, the GM selects the hero and presses **Allow this Push (+1 Horror)** beside their latest failed attack. This grants the extra action and charges Horror once; the extra action cannot be pushed. Without turn order, only this GM exception can grant a Push. A fresh round begins a new exchange; the VTT does not count all narrative Moves and Actions.

## Distance and range

{{RANGES}}

## Equipment

Each item lists its slots. Only equipped weapons, armour, relics and grimoires work; supplies work from the pack. Wear one body armour, one helmet and one shield. Two-handed weapons require your shield to be packed. Ordinary weapons, including bows and crossbows, use Weapons d6; guns and gunpowder use Guns d8. Heavy ordinary melee adds +2 damage. Crossbows add +2 to their attack checks but still roll ordinary Weapons d6 and cost a Move to reload; bows do not get that accuracy bonus and can keep their Move. Reach/control weapons retain their listed manoeuvres instead of that bonus; the GM resolves those manoeuvres.

Grimoires take **three slots** and each contains **three spells**. Read the spell's own range, effect and Horror cost. A book has no single range shared by all its spells. A hero may choose one starting grimoire; found books and relics are awarded by the GM. The current VTT limits carried Horror-tempting items to three, including relics, grimoires and supernatural curios. Packed items count too. This is broader than the older wording “three relics and grimoires”.

## Story spells and items: when in doubt

Many spells and relics have no damage die: their words describe what happens, and the GM decides the rest (Pillar of Ash fills the room with ash; Hush takes a voice). Each one now carries one or two **tags** saying what it is good for, and each tag has a default effect. **The spell's or item's own words always come first.** Use the tag when the words leave it open and you want a quick answer. The solo game always uses it. Costs do not change: the same Horror, and the same check where the words ask for one.

Out of a fight, a tag says what kind of trouble the spell can answer: a fitting spell is one more way past an obstacle or a danger, as the GM judges (in the solo game it takes half of what is left on an obstacle's bar, or opens it outright where the words say so). A few spells say "needs a corpse close by" or "only against the undead". *The Last Verse* and *Its Real Name* have no tag: they stay the GM's call.

{{TAGS}}

## Healing, dying and rest

Healing spells have no casting Horror cost. Their natural 1 can still add the separate natural-1 point. Healing relics use their own listed cost. Healing never exceeds maximum HP and cannot raise a dead hero.

Supported healing is automatic. Most sources work once per recipient and source per rest, across copies and casters; a recipient at 0 HP may receive that source again. A full-health or ineligible target spends no charge. A failed check can spend a consumable charge without using the recipient's healing allowance.

Bandages require Close contact. On an injured target they check WIS and heal d6; on a dying target they make an Easy WIS Tend check, stopping the countdown on success. A natural 20 on Tend also heals d4. Mend checks WIS and heals d8. Ordinary healing on a natural 20 adds d12 when Ultimate is enabled; it does not use Effort bonuses.

A fallen hero at 0 HP cannot act. A hit on a dying hero takes a countdown round instead of rolling damage. Stable stops the countdown at 0 HP; another hit restarts dying with a new d4. Healing at least 1 HP puts a living fallen hero back on their feet.

The GM decides whether a place and time allow Party rest. It heals living heroes, refreshes healing allowances and lowers Horror as shown above. It does not restore spent consumables or bring the dead back. Undo related healing and rests in reverse order when warned.

## Horror and GM rulings

Non-healing spells cost 1 Horror even if the check fails. A natural 1 and a Push add separate costs. Reaching a threshold alerts the GM; the GM chooses the consequence. At 21 the meter stays capped, and the hero pays in blood instead: each point of their Horror cost that cannot go on the meter (a Push, a natural 1 that counts, a spell or an item) costs them d4 HP. That HP loss can drop a hero to 0 and start their dying countdown. The GM's own manual raises cost no blood. The current VTT does not automatically impose aftershocks, magic bans or rest bans.

Range, sight, cover, ammunition, reloads, Guard, Assist, Dazed, conditional bonuses, esoteric magic (see "when in doubt" above) require GM adjudication unless the controls explicitly say they are automated. Rend the Veil lets you choose several foes before the check, roll damage once; it applies to the selected foes together automatically. One Undo restores all that damage. The GM still confirms eligible targets and range. Once-per-scene abilities spend their use on the attempt, including a miss; copies share the same caster/source allowance. Rest, refreshing the page or leaving and returning to a scene do not refill it. In Play, the GM can confirm **Refresh scene abilities** for a new encounter in the named live scene; unfinished limited rolls from the previous encounter cannot then be applied. To restore a mistaken use, the GM undoes its damage first and then its attempt in Activity. Horror has its own Undo. The Executioner's Blade has a separate **final blow** action: Ultimate damage, 3 Horror and one attempt per scene, all tracked by the VTT.

## Playing alone

The [solo game](/solo/) uses every rule on this page. There the game is the GM, and it makes the GM's calls itself: each scene's Target, its foes and obstacles, when a place is dark, what Horror 7, 14 and 21 bring, and a rest after each scene. One rule is different, because no one else is there to help:

- **Falling alone.** At 0 HP a hero alone is dying as usual (d4 rounds), but may still act on their turn in two ways: use healing on themselves (a spell or relic; bandages cannot tend yourself), or crawl away with a CON check, leaving the scene at 1 HP and leaving behind what they found in it. A failed crawl costs a round.
- Spells and items that protect **an ally**, such as Ward, have no use alone.

The [Current Loot Tables](/loot/) page uses the same catalogue as the VTT. GMs can create custom loot in their own tables. Custom descriptions do not automatically implement new effects. Private GM notes and custom table loot are not published in that catalogue.
