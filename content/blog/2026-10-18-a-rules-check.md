---
title: A rules check: one adventure, played 1,500 times
date: 2026-10-18
summary: We checked the engine and the VTT against the Basic Rules, played a short adventure through a simulator, and found a starting kit that broke the gear rule, three mismatches, and a design question about the Looming Horror.
---
A new character picked up a Reliquary Focus, and that broke the rules. Fixing it turned into a proper rules check. This post is what we checked, what we found, and one short adventure told from the simulator's log.

## What we checked

There are two parts, and both are in the repository (`npm run rules-check`).

- **The rules against the engine.** 39 checks compare the Basic Rules with the code the builder and the VTT share: scores, picks, gear, magic, harm, and the library of abilities and items. They also compare the aftershock and Death Bargain tables on the rules page with the ones the VTT rolls. The fast ones run on every change.
- **The adventure.** A simulator plays one short adventure for three characters, Osric the Warden, Eadgyth the Cantor and Cuthbert the Wanderer, with an NPC, Leofwyn, in tow. It uses the real rules engine, and it checks the rules' limits on every run: harm stays between 0 and 12, the Looming Horror between 0 and 21, only a 2 on the Death Bargain kills, and healing happens once between rests. We ran it for 1,500 seeds, once without the aftershock tables and once with them.

The simulator is a model of a table, not the VTT. It plays one style (Eadgyth sings and heals, Cuthbert casts, Osric holds the line), and it does not model distance or area spells. The browser tests are the check on the VTT, and they pass.

## What we found, and fixed

- **The starting kit broke the gear rule.** A new character carried a level 2 Reliquary Focus. The rules say you can choose gear up to your own level, and the table's own check refused the character. It also gave every new character +1 Spirit, when the rules say everyone starts at +0. The kit now holds a Candle-Stub Charm, which is level 1, and a test fails if a new character ever breaks the rules again.
- **Armour was described two ways.** The page said armour "rolls nd6" and then "absorbs n+1" for medium. The engine rolls n, n+1 or n+2 dice. The page now says that.
- **The VTT and the rules page told the aftershock tables differently.** One row said "adds 1 Looming" where the rules say "adds 1 to the Looming Horror", and one row had an example the page lacked. The two now match.
- **The simulator let adversaries act twice.** When the GM spends a Horror Token the adversaries act now and have then acted for the round, but the simulator also gave them their turn at the end of the round. This is our correction: the numbers in this post are from the fixed simulator, and the first version of it said the adventure was far harder than it is (Leofwyn survived 55% of the time, not 82%, and someone fell in 21% of runs with aftershocks, not 9%). The adversary tuning in [the last post](/blog/rules-after-the-first-playtest/) was done with the same simulator, so the adversaries are probably easier than that post says. We have not retuned them.
- **The false calm was only half built.** A 6 on the Stirring puts +1 on the next aftershock roll, and a 7 counts as a 6. The VTT's roller ignored it. It now applies the +1 and the cap.

## One adventure

Here is seed 1164, in short. The log is the simulator's own.

At the Hart and Hallow, Cuthbert fails to read the burial ledger (12 against 15) and Eadgyth fails to steady Godric the reeve (7 against 12), so the Looming Horror is already at 2 before a blow is struck. Osric leans on the miller's door and succeeds, but Godric slips away and warns the sexton.

In the churchyard, Osric hits the Plague Rat Swarm for 8 and pushes for a second Action, which costs 1 on the ladder, and misses. The GM spends a Horror Token to bring the swarm and the Grave Hound forward, and Osric's Mail Hauberk and Guard turn both attacks into 0 harm. Eadgyth sings a Hymn and casts two Dissonant Notes, and the swarm is down. Cuthbert casts two Firebolts. Every spell raised the ladder, and by the end of the round it stands on 9.

> **Aftershock at 9.** The GM rolls a d6: 5. Shadows lag: every hurt character marks 1 more harm.

Nobody is hurt yet, so nothing happens. In the second round the GM spends another Horror Token, and the ladder drops to 8. The hound hits Cuthbert for 10, and Cuthbert's Arcane Ward soaks 2 of it. The Ward raises the ladder by 1, and that puts it back on 9.

> **Aftershock at 9.** The GM rolls a d6: 5. Shadows lag: every hurt character marks 1 more harm.

This time Cuthbert is hurt. He marks 1 more harm and fills a Wound, which raises the ladder again. Eadgyth rolls a natural 20, deals 21 damage, and the hound falls.

In the crypt, Godric has warned the sexton, so the adversaries go first. By the end of the first round the ladder reaches 15.

> **Aftershock at 15.** The GM rolls a d6: 2. The adversaries swell: +1 damage die until the scene ends.

In the second round the GM spends a Horror Token and the ladder drops to 14. The sexton hits Osric for 5 harm and fills a Wound, which puts the ladder back on 15.

> **Aftershock at 15.** The GM rolls a d6: 6. The Horror feeds: every spell raises the ladder by 1 more until it is below 15.

The sexton's next attack is two 6s, a critical hit, and Osric's armour counts for half. He takes 9 harm and is dying. Eadgyth sings and casts, and each spell now raises the ladder by 2. Her Dissonant Note is a natural 20, 28 damage, and the sexton falls. The ladder reaches 21.

> **Aftershock at 21.** The GM rolls a d6: 4. The floor opens: a Hard (15) Body check or a fall.

In the morning the party rests. Osric heals a Wound and is at 8 of 12, and the ladder falls by a 4 to 17. Everyone is alive and Leofwyn has 10 of 14 HP. Nothing in the adventure went wrong by the rules. What the run shows is how often a milestone speaks. Two of the five aftershocks came from the ladder dropping off a milestone and climbing back on.

## The numbers

Over 1,500 runs:

- **Without aftershocks:** everyone is standing at the end in 100% of runs, and someone falls to 12 harm in 1%. Leofwyn survives 82% of the time. The ladder peaks at 16.4 on average, and every run reaches 9, 72% reach 15 and 12% reach 21.
- **With aftershocks:** someone falls in 9% of runs, and in 1% the whole party goes down. Leofwyn survives 72% of the time. 31% of runs reach 21, and in 13% of runs the aftershock on 21 says "Dawn does not come", so the party cannot rest.
- **Where the ladder comes from:** about 73% of its rises are from spells and items (15 a run), then pushes (3.1), failed checks (1.8) and filled Wounds (0.7). That is a spell-heavy table, so a martial party would climb slower.

## Two questions for the design

We have not changed these, because they are choices and not mistakes.

1. **A milestone speaks again each time the ladder climbs onto it.** The rules also let the GM spend a Horror Token to drop the ladder by 1, which the simulator's GM does in every round. So a ladder sitting on 8, 14 or 20 gives a new aftershock whenever anything raises it, and a session averages 1.6 aftershocks at 9, 0.95 at 15 and 1.2 at 21. Should a milestone speak once a scene, or only after a rest has taken the ladder below it?
2. **"The Horror feeds" can take the ladder from 15 to 21 in a round.** With every spell costing 1 more, a Cantor who sings and casts raises the ladder by 4 on her own turn. That may be what we want, a short slide into the worst thing, but it should be a choice.

The rules are still a draft. If something here looks wrong, or the simulator played your table badly, tell us.

## Update: only a rest lowers the ladder

We have settled the first question by removing the way down. The Horror Token is gone, so adversaries always go last, and nothing in play lowers the Looming Horror except the party's long rest in a safe place and its d6 roll. That meant changing three rites (Penance, Benediction and Last Penance reduced the ladder, and now do other things) and the Death Bargain results Mercy and Death Refuses You, which no longer drop it either. The GM can still set the ladder by hand to correct a mistake, and the VTT's rules no longer let a player's client write a lower number. The rules check now fails if anything else is added.

The same 1,500 runs with aftershocks and the new rule: the 9 milestone speaks once a run, as intended (the ladder never drops off it mid-fight), 15 speaks 0.9 times and 21 speaks 0.55 times. But the ladder stays high. 90% of runs reach 15 and 55% reach 21, and in 8% of runs "Dawn does not come" stops the only rest, so the ladder cannot fall at all. Someone falls in 2% of runs and Leofwyn survives 81% of the time. That is a table with one rest, at the end. We will see how it plays with more.
