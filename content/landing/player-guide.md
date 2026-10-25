---
title: Player guide
summary: Create your first hero, join a table and understand the rules used by the current Sacrament RPG Table.
---
These are the **current VTT rules**, checked against the application on 25 October 2026. Sacrament is still being playtested. Your GM decides what happens in the fiction and explains any house rules before play. You do not need to memorise this page.

[First game checklist](/how-to-play/) · [Create a hero](/character/) · [Join a game](/vtt/?join) · [GM guide](/gm-guide/)

## Start here

1. Ask your GM for an invitation link or six-letter table code. You do not need an account.
2. Open [My heroes](/character/) in the same browser. Choose a focus and press **Generate a hero**. The suggestion already has scores, Effort and equipment.
3. Change the name and vow if you like, then press **Keep this hero**. You can customise the saved sheet afterwards. A focus is a starting kit, not a permanent class.
4. Open the invitation link, enter your player name and join. Choose **Bring a hero** to copy your saved hero into this table. Alternatively, choose **Play** beside an available hero the GM has supplied.
5. Open **My character** during play to see your sheet and its **Ready to use** actions. Tell the group what you want to do; the GM tells you whether a roll is needed.

**Two copies:** My heroes saves to this browser and device. Bringing a hero creates a separate table copy. Later edits on My heroes do not update that table copy. Download a private heroes backup before changing browser or device. Restore it on My heroes by choosing the downloaded JSON file, reviewing it and pressing **Restore backup**. Existing heroes are kept.

## Your character sheet

**Scores** are the numbers you add to a d20 check. You have six points to spend across six scores. The generator spends them for you; a blank hero needs you to allocate them.

- **STR — Strength:** force, lifting, climbing and most melee attacks.
- **DEX — Dexterity:** shooting, stealth, balance and delicate work.
- **CON — Constitution:** endurance; also contributes to Defence.
- **INT — Intelligence:** knowledge, investigation and most spellcasting.
- **WIS — Wisdom:** awareness, judgement, healing and tending the dying.
- **CHA — Charisma:** persuasion, leadership and presence.

**Effort** measures damage or progress after a successful check. You have four points to divide between its categories. These are bonuses to the matching Effort die, not bonuses to the d20 check. Healing uses its own listed dice.

**HP** means hit points, your remaining health. One Heart is 10 HP. A new hero starts with 10 HP, with extra maximum HP from gear that grants Hearts. **Defence** is 10 + CON + equipped armour bonus. Armour contributes at most +5; the combined CON and armour modifier is capped at +10.

Your name, calling and vow help describe who you are. A vow is a promise your GM can build a story around. You can edit these without changing the game rules.

## Checks: do you succeed?

The GM sets the **Target**, the number to meet or beat. Roll **d20 + the relevant score**. A d20 is a twenty-sided die. **Easy** lowers the Target by 3; **Hard** raises it by 3. Agree the difficulty before rolling.

Example: the Target is 12. You roll 10 and add STR +3, making 13: success. A successful conversation or a simple lock may need no further roll. The GM describes the result.

**Hero natural rolls:** a natural 1 is a 1 on the die before bonuses and adds 1 Horror. The current VTT judges a hero's success by the total; a natural 1 or 20 does not override that comparison. A successful natural 20 adds an extra Ultimate die (normally d12) to the normal Effort roll if the GM has enabled that option. Normal and Ultimate bonuses count once each; an ability already using Ultimate counts that bonus only once. Heavy damage adds +2 only once. Monster attacks have different natural-roll rules, explained in the GM guide.

## Attacks: target, roll, damage, apply

1. Select the enemy's card or token first.
2. Use your equipped weapon or spell from **Ready to use**, or your character's item actions. If you have not selected a target, choose one when asked. A stat roll can also offer an attack without an item; choose an ordinary check for other tasks.
3. The table rolls the check and compares the total with the Target.
4. On a successful attack, check the named target, then press **Roll damage**. The result changes that target’s HP or progress automatically. **Undo this damage** beside the result corrects that damage; Activity retains the full history.
5. Tell the GM when you are finished; the GM advances turns. **Undo last** can take back your own mistaken action when it is still safe to undo.

The damage target stays attached to that attack. Looking at another card does not redirect it. Choose the correct target before attacking. To correct a mistaken hit, Undo its damage in Activity first; the recorded result can then be deliberately reassigned using **Change target**.

**Effort dice:** Basic d4 for basic work or bare hands; Weapons d6 for ordinary weapons, including bows, crossbows and slings; Guns d8 for guns and gunpowder; Magic d10 for magical damage; Ultimate d12 when an effect or the table's critical option grants it. Add the bonus in the matching category. The GM can change table dice, so read the labels at your table. Heavy ordinary melee weapons add +2 damage, including a critical; crossbows add +2 to their attack checks but keep Weapons d6 and a Move to reload; reach weapons keep normal damage and their described reach or control.

**Push:** only a failed attack offers a Push. Taking it adds 1 Horror and grants an immediate second action: repeat the attempt or try something else. You can Push once during your own active turn; the pushed action cannot be pushed again. Outside that turn, ask the GM to use the explicit **Allow this Push** control on your failed attack. Failed ordinary checks do not offer it.

## Equipment and magic

You have **10 equipped slots and 10 pack slots**. Each item lists its size. Equipped gear is ready to use; supplies work from the pack. Keep spare weapons and armour in the pack. The current VTT allows at most three carried items marked as tempting Horror, including relics, grimoires and supernatural curios; packed items count too. One body armour, one helmet and one shield can contribute at a time. Put your shield in the pack before using a two-handed weapon. Ask the GM about swapping gear during a fight.

Every **grimoire takes three slots and contains three spells**. Damage, Healing and Esoteric labels distinguish what each spell does. Esoteric means an effect such as light, movement or influence: the GM resolves its description rather than automatically deducting HP. The starting equipment choices allow a grimoire; relics and found loot are awarded by the GM.

**Healing spells have no casting Horror cost. Other spells add 1 Horror when used, even if the check fails.** A healing relic can still have its own listed Horror cost. Read the item before using it; the table displays and records the cost. Free-text effects and secondary effects still need the GM's ruling.

Browse [Current Loot Tables](/loot/) for the same catalogue used by the VTT. GMs can also create their own loot for their own games.

## Healing, dying and resting

Select yourself or another visible target with HP, then use the healing action. The target must be within the item's stated range; the GM decides range. A drinking item heals its drinker. A hero at 0 HP cannot act, and healing cannot raise a dead hero.

Catalogue healing is automated: the table changes HP, spends charges and tracks rest limits. Most healing sources work **once per recipient per rest**, shared across copies and casters. A recipient at 0 HP can receive that source again. Healing never exceeds maximum HP; a full-health or otherwise ineligible target does not spend a charge. A failed healing check can spend a charge without using the recipient's healing allowance.

- **Linen bandages:** WIS check and d6 healing for an injured target. On a dying target, bandages instead make an Easy WIS Tend check: success stops the countdown at 0 HP; a natural 20 also heals d4.
- **Mend:** WIS check, d8 healing, no casting Horror. A natural 20 adds d12 when the table's Ultimate option is enabled.
- **Healing relics:** follow their listed healing and Horror cost. The table handles supported catalogue healing; custom items written only as text may need manual HP changes.

At **0 HP**, your hero gets a d4 dying countdown. It loses one at each new round and the hero dies when it reaches zero. Being hit while down can shorten it. Successful Tend makes you **Stable**, stopping the countdown. Healing of at least 1 HP puts a living downed hero back on their feet.

The GM's **Party rest** heals each living hero 10 HP, refreshes healing allowances and reduces Horror by one d10 per two living heroes, rounding up. The GM decides whether the place and time allow a rest. It does not bring dead heroes back.

## The shared Horror

The whole table shares a meter from **0 to 21**. It rises for non-healing spells, listed item costs, a hero's natural 1 and a Push. Those are separate costs: a non-healing spell that rolls a natural 1 adds 2 in total.

At **7, 14 and 21**, the VTT alerts the GM. The GM decides what happens in the story. It does not automatically apply aftershock tables, extra damage or other consequences. Tell your group before accepting a dangerous cost.

## Staying connected and getting help

Reopen the same table address in the same browser to return with your saved access. Keep the page open if it says **Saving** or **Offline: retrying**. On another browser or device, rejoin and ask the GM to assign your existing table hero; do not create a duplicate just to recover access.

You can move your own token and use **Point** to show the group a place. Drawing is GM-only. Your character's private gear and notes are visible to you and the GM, not the other players. Card descriptions may be public; do not put private information there.

Ask your GM when an effect, distance or consequence needs a ruling. Use [Feedback](/feedback/) for bugs or suggestions; never include a private GM recovery link.


## Distance and range

{{RANGES}}


## Area spells and scene abilities

Rend the Veil asks you to select the affected foes before rolling. The GM confirms range and eligibility. Roll once; damage applies to the selected foes together automatically. Once-per-scene powers spend their allowance on the attempt, even on a miss, and copies do not grant extra uses. Rest and reloading the page do not reset them. The GM can refresh scene abilities for a new encounter, or Undo a mistaken attempt after undoing its damage. The Executioner's Blade offers a separate final blow with its own 3-Horror cost and scene limit.

Standalone Effort and ordinary task checks can still use Apply when the GM needs to choose where the result belongs. Attacks and targeted item actions apply their rolled result automatically.
