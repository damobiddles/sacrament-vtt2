---
title: GM guide
summary: Prepare a first session, run encounters and understand what the Sacrament RPG Table handles for you.
---
This is a public guide to the **current VTT**, checked against the application on 25 October 2026. It contains controls and rules guidance, not private setting material. Read the [player guide](/player-guide/) for character creation, checks, Effort and player actions.

[First game checklist](/how-to-play/) · [Run a table](/vtt/?run) · [Player guide](/player-guide/) · [Current Loot Tables](/loot/)

## Prepare your first table

1. Open **Run a table** and press **Make a table**. Leave **Start with the sample encounter** checked for a worked example; untick it for an empty table.
2. Open the **Table** tab. Save your **private GM recovery link** somewhere safe. Anyone with that link can run the table. Never send it as an invitation or include it in a bug report.
3. Use **Copy invite link** for players instead. They join with a name, then claim a supplied hero or bring one from My heroes.
4. Agree on the Target, table options and any house rules before rolling. Explain that ordinary weapons use d6, guns d8, healing spells have no casting Horror, and Push follows failed attacks only.
5. Start with one visible enemy and one clear problem. Walk a player through choosing a target, using a weapon, rolling damage and seeing it applied automatically.

Your browser remembers tables under **Your tables** on the VTT entry page. Returning in that browser normally restores your GM access. A table code alone does not restore GM authority on another device: use the private recovery link. There are no accounts. Keep the link before clearing browser data. **Back to my tables** returns to the saved list without forgetting your access. The separate **Forget** action intentionally removes this browser’s saved access.

## Help a new player create a hero

Send them to [My heroes](/character/) and suggest Fighter for a straightforward weapon user, Scout for ranged weapons, Scholar for magic or Healer for healing prayers. Each generates a legal starting allocation and kit. These are editable starting choices, not permanent classes.

The sheet has **six score points**, **four Effort points**, **10 equipped slots and 10 pack slots**. New heroes start with 10 HP, plus Hearts from gear. Grimoires cost three slots and hold three spells. The current VTT counts all carried Horror-tempting items, including supernatural curios, toward its three-item magic limit. Ordinary ranged weapons use Weapons, not Guns. Only one body armour, helmet and shield contributes; a two-handed weapon needs the shield packed.

A player can instead start blank and allocate points with the sheet controls. Do not assume an empty sheet is ready: review scores, Effort and equipment together. The Table tab lets you add a blank hero and assign existing heroes to players. Use the character sheet to fill in their scores and gear.

My heroes stores browser-local characters. **Bring a hero** creates a separate copy at the table; later local edits do not synchronise into that copy. Ask players to make private backups of their local heroes. If a player changes device, let them rejoin, then assign their existing table hero rather than duplicating it.

## Find the controls

The tray keeps **Play**, **Scene**, **Loot** and **Table** tabs visible while you inspect or edit a card. Choose a tab directly, or use **Back** to return to that tab's overview. The selected card is not necessarily the character whose turn it is: the panel names the live scene and current turn.

- **Play:** turn order, attacks and results, Party rest and refreshing abilities for a new live encounter.
- **Scene:** add enemies, obstacles and cards; prepare, rename and show scenes.
- **Loot:** roll catalogue loot, design your own items and award them.
- **Table:** invitations, recovery, players, house rules, manual Horror adjustments and next-session notes.

The **GM view** badge marks your controls; players see **Player view**. Select an enemy or obstacle and choose **Attack a hero…** to attack. To help a player or cover an absent player, select their hero, open their sheet, and use **Roll for** or **Ready to use**. Hero rolls stay in the sheet, leaving the main GM controls clear. In a narrow window, scroll the map and controls area to reach the rest of the tray. **GM dice** in the footer rolls d4, d6, d8, d10, d12, d20 or d100, with a choice of shared or GM-only results. These standalone rolls do not alter HP.

## Checks and Effort

Set one visible **Target** for the current situation. A hero rolls d20 + a score and succeeds by meeting or beating it. Easy lowers the Target by 3; Hard raises it by 3. Call difficulty before the roll. If the outcome is obvious, describe it without rolling.

A normal check may resolve the situation immediately. Use Effort when the amount matters: damage to a foe or progress against an obstacle. Basic d4, Weapons d6, Guns d8, Magic d10 and Ultimate d12 are the default dice; heroes add their matching Effort bonus. Item actions supply their own category. Healing follows its listed dice without the Magic Effort bonus.

For **hero checks**, the total determines success, even on a natural 1 or 20. A hero's natural 1 adds 1 Horror. A successful natural 20 offers Ultimate when the table option is on. For **monster attacks**, natural 1 always misses and natural 20 always hits. Do not apply that monster exception to hero checks.

Players should select a target before attacking. A successful attack carries that target into damage; rolling damage applies it automatically. An ordinary failed check cannot Push. A player can Push a failed attack only on their own active turn: +1 Horror for a second immediate action, once, with no further Push of that action. For an exception, select that hero and press **Allow this Push (+1 Horror)** on their latest failed attack. It spends the cost and grants one extra action atomically. Without turn order, only the GM can grant this exception.

## Turns and monster attacks

The Play tab's **Turn order** lets you inspect a character without changing whose turn it is. Use **Edit order** and **Set turn** for a deliberate turn jump; the same editor adds, removes and reorders entries. The GM’s **Next turn** in Play advances it; finishing the last entry starts a new round. **Next round** also advances the round. Countdowns lose one at the new round, so avoid advancing it twice by mistake. Discuss movement and action limits at the table; the software does not adjudicate every narrative action or distance.

To attack, select a monster and press **Attack a hero…**. Choose its target and set its Attack bonus, then press **Attack**. The result is compared with **Defence: 10 + CON + armour**, with armour capped at +5 and the combined modifier capped at +10. A natural 1 always misses; a natural 20 always hits. On a hit, choose the Effort die to apply damage immediately. Player attacks also apply their rolled damage automatically. **Undo** beside the damage event in **Activity** reverses it. Activity is also where checks, damage, healing, Horror and other outcomes appear. A hidden attacker is presented to players as “Something”.

**Automatic scene danger is optional and off by default.** In **Table → House rules**, you can enable adding max(0, Target − 11) to monster attacks: Target 12 adds +1; Target 14 adds +3. It uses the current Target. If you have already included scene danger in a monster's base bonus, remove that part before enabling it to avoid counting it twice. Keeping the option off preserves manually prepared bonuses.

## Healing, dying and Party rest

Supported catalogue healing applies HP, charges and rest limits automatically. Healing can target the user or another visible HP target; drinking heals the drinker. The GM checks range. A caster at 0 cannot act and healing does not raise a dead hero.

The once-per-rest limit belongs to the **recipient and healing source**, shared across books and casters. A recipient at 0 can receive that source again. Full-health and otherwise ineligible uses do not spend charges; failed checks can spend a charge without spending the recipient's allowance.

Bandages make an Easy WIS Tend check on a dying target: success marks Stable; a natural 20 also heals d4. On an injured or stable target they heal d6 after a WIS check. Mend heals d8 after WIS and adds no casting Horror. Healing relics keep their listed Horror cost. Use manual HP and Stable controls for a Tend or free-text effect resolved outside the supported item actions.

At 0 HP a hero gets a d4 dying countdown. Each new round removes one; zero means death. A hit on an already dying hero removes a round; hitting a stable hero restarts dying. Healing of at least 1 HP stands a living hero up and clears dying. Stable stops the countdown without healing.

When the fiction allows it, press **Party rest** in Play. It heals living heroes 10 HP up to their maximum, refreshes healing allowances and reduces positive Horror by one d10 per two living heroes, rounding up. It does not raise dead heroes. The GM decides whether the location is safe and enough time has passed.

Healing Undo restores the related HP, charge and allowance. Undo later related healing or rests first if warned. Horror costs have their own GM Undo; do not assume undoing HP also undoes Horror.

## Horror and consequences

The shared meter runs from 0 to 21. Healing spells add 0 casting Horror; other spells add 1, whether or not they succeed. Relics and other items use their stated cost. A hero's natural 1 and a Push each add 1 separately. A non-healing spell with a natural 1 therefore adds 2.

Crossing **7, 14 or 21** announces the threshold and alerts you. **You decide what the Horror does.** The VTT does not automatically run aftershock tables, forbid magic or apply overflow damage at 21. Use the Table tab or Activity Undo to adjust mistakes; Party rest can lower the meter. Explain any additional consequences you choose before players accept a risk.

## Scenes, maps and privacy

In Scene, add a named scene and **Open** it to prepare it privately. Add and move cards, change its picture and rename it without losing its contents. **Show to players** makes it live for everyone. Prepared enemies cannot attack live heroes: show their scene first. Unfinished monster attacks cannot carry damage into a different live scene. Prepared scenes and their names stay private until shown. The Target is a table setting; changing scenes does not give each scene its own saved Target.

The map automatically fits the available space without stretching the artwork. **Point** shows people looking at the same scene where you mean. Drawing, undoing lines and clearing drawing are GM-only. Select **Draw**, then choose **Colour**: blue for water, green for trees, red for fire, or gold, white and black. The choice affects new lines only. Everyone viewing the scene sees the saved colours.

A hidden card is not sent to players. **Hide the numbers from players** shows the card without its HP or counters. Public descriptions are visible when the card is shown; private GM notes are not. Character gear and private notes are shared with their owner and the GM. Never put GM secrets in a public description or a shared dice result.

## Loot and custom effects

Roll loot in Loot or enter your own d100 result. Sub-tables use d100 too. Only you see the find and any private GM notes until you reveal or award it. Put a find on the table hidden, or give it straight to a hero. [Current Loot Tables](/loot/) is generated from the same catalogue as the VTT.

The designer supports your own loot. Keep three known spells in each grimoire and read the displayed size, Effort and Horror cost before awarding it. Supported healing mechanics can survive newly designed copies; older custom items written only as free text remain manual. Do not assume a familiar item name makes its effects automatic. The Grimoire with no title uses a d6, split evenly across its three spells.

## What the VTT handles and what you decide

- **Automatic:** shared saves and rolls; permitted player actions; item attack targets; attack damage applied automatically when rolled; supported catalogue healing; charges and healing rest limits; dying countdowns; Party rest; listed Horror costs and threshold alerts.
- **Your ruling:** whether to roll; range and positioning; movement and narrative action costs; esoteric spell effects; free-text custom effects; secondary item effects not represented by controls; conditions and Horror consequences; when a rest is allowed.
- **Your choice:** optional scene-danger automation and table dice settings. Explain those choices to players.

If saving or connection problems appear, leave the page open while it retries. Review Activity before repeating an action. Use disposable tables to experiment, and send a [feedback report](/feedback/) with the steps and device/browser, never private access links.

## Delete a scene

In Scene, a scene that is not live has a **Delete** button. Read the confirmation and press **Delete this scene** to permanently remove its table cards and drawings. Heroes and items held by players are kept. To delete the live scene, show a different scene first. You cannot remove the last scene. Uploaded pictures are kept because other scenes may use them.


## Distance and range

{{RANGES}}


## Tracked powers and critical damage

Rend the Veil selects several foes, uses one check and one damage roll, and applies the result to those selected targets together. You confirm range and who is affected. Damage applies as soon as it is rolled. One Undo restores the whole damage event. Once-per-scene uses, including failed attempts, are tracked per caster and source across copies and reconnections. Returning to an old scene or resting does not reset them. In Play, confirm **Refresh scene abilities** only when starting a new encounter in the named live scene; this invalidates unfinished limited rolls from the old encounter. To correct a mistaken use, undo its damage first, then its attempt; undo Horror separately if appropriate. The Executioner's Blade has an automated final-blow action with its listed 3-Horror cost and scene limit.

For new hero checks, a successful natural 20 adds an extra Ultimate die to normal damage/Effort when enabled. Normal and Ultimate bonuses count once each; an ability already using Ultimate counts that bonus only once. The heavy +2 is also added only once. Earlier pending rolls retain their earlier rule. Monster natural rolls still govern hits and misses only. Crossbows have +2 accuracy, Weapons d6 and their reload Move; the GM still manages reloads and the Move budget.


## Turn orders belong to scenes

Each scene remembers its own turn order and current actor. A scene visited for the first time starts with the heroes; enemies added while preparing it join that scene’s order. Switch scenes without clearing or rebuilding the list. Returning restores the order you left, including deliberate removals or an empty order. The Play tab edits the live scene’s order. Preparing another scene does not change it. Deleted enemies are removed from saved orders. Rounds remain shared across the table; simply switching scenes does not advance a round, timers or dying countdowns. Automatic, unpaused timers tick every table round, including on hidden scenes. Use the existing pause control in Edit card when a countdown should wait.
