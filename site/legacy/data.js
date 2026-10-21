/* Generated from the node library and item lists in table/index.html. */
window.SAC_DATA = {
 "nodes": [
  {
   "id": "mv",
   "type": "action",
   "use": "free",
   "name": "Move",
   "level": 1,
   "innate": true,
   "path": "Common",
   "desc": "Move up to Near (30 ft).",
   "fx": [
    {
     "on": "use",
     "do": "note",
     "text": "free Move: position is on the map"
    }
   ]
  },
  {
   "id": "st",
   "type": "action",
   "use": "action",
   "name": "Strike",
   "level": 1,
   "innate": true,
   "path": "Common",
   "desc": "One weapon attack. A melee weapon reaches Melee and a ranged weapon reaches Near. Roll a d20 and add Body and your weapon’s level against the adversary’s difficulty, then roll the weapon’s damage.",
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "weapon"
    }
   ]
  },
  {
   "id": "gd",
   "type": "action",
   "use": "action",
   "name": "Guard",
   "level": 1,
   "innate": true,
   "path": "Common",
   "desc": "Raise your guard. Until your next turn, armour rolls against the first hit add +1d6.",
   "fx": [
    {
     "on": "use",
     "do": "bonus",
     "to": "armour",
     "dice": "+1d6",
     "target": "self",
     "limit": "nextHit"
    }
   ]
  },
  {
   "id": "m4",
   "type": "spell",
   "use": "action",
   "name": "Firebolt",
   "desc": "Ranged. 3d6 fire damage that ignores armour. Ignites loose flammables in the target tile.",
   "path": "Arcane",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "spell"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "3d6",
     "ignoresArmour": true
    },
    {
     "on": "hit",
     "do": "note",
     "text": "ignites loose flammables"
    }
   ]
  },
  {
   "id": "m6",
   "type": "spell",
   "use": "reaction",
   "name": "Arcane Ward",
   "desc": "Reaction. Absorb 1d6 damage from one hit against you or an adjacent ally.",
   "path": "Arcane",
   "level": 1,
   "fx": [
    {
     "on": "incoming",
     "do": "mitigate",
     "absorb": "1d6",
     "target": "allyAdj",
     "limit": "reaction"
    }
   ]
  },
  {
   "id": "m7",
   "type": "passive",
   "name": "Battle Focus",
   "desc": "Once per round, when a Strike or spell of yours hits, add +1 to your next attack or check this round.",
   "path": "Arcane",
   "level": 1,
   "fx": [
    {
     "on": "hit",
     "do": "bonus",
     "to": "any",
     "n": 1,
     "target": "self",
     "limit": "round"
    }
   ]
  },
  {
   "id": "m8",
   "type": "spell",
   "use": "action",
   "name": "Blink Step",
   "desc": "Teleport to anywhere Near that you can see. You still have your free Move.",
   "risk": 1,
   "path": "Arcane",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "note",
     "text": "teleport to a place in sight"
    }
   ]
  },
  {
   "id": "m13",
   "type": "passive",
   "name": "Arcane Study",
   "desc": "Years in the library.",
   "stat": "Mind",
   "bonus": 1,
   "path": "Arcane",
   "level": 1
  },
  {
   "id": "m5",
   "type": "action",
   "use": "action",
   "name": "Spellstrike",
   "desc": "Strike, plus 2d6 force damage that ignores armour.",
   "magic": true,
   "risk": 1,
   "path": "Arcane",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "weapon"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "2d6",
     "ignoresArmour": true
    }
   ]
  },
  {
   "id": "m14",
   "type": "passive",
   "name": "Spell-Hardened",
   "desc": "You have been burned before.",
   "stat": "Spirit",
   "bonus": 1,
   "path": "Arcane",
   "level": 1
  },
  {
   "id": "m9",
   "type": "spell",
   "use": "action",
   "name": "Frost Lash",
   "desc": "A line reaching Far, 3d6 cold damage. Creatures hit cannot Move until your next turn.",
   "path": "Arcane",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "spell",
     "target": "line"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "3d6",
     "target": "line"
    },
    {
     "on": "hit",
     "do": "status",
     "tag": "cannot move",
     "limit": "nextTurn"
    }
   ]
  },
  {
   "id": "m10",
   "type": "spell",
   "use": "action",
   "name": "Overchannel",
   "desc": "Cast a damage spell you know and push it: raise the Looming Horror by up to 3 more. Each step adds 1d6 to its damage.",
   "risk": 1,
   "path": "Arcane",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "looming",
     "extra": 3
    },
    {
     "on": "damage",
     "do": "bonus",
     "to": "damage",
     "dice": "+1d6",
     "per": "step"
    }
   ]
  },
  {
   "id": "m11",
   "type": "action",
   "use": "action",
   "name": "Thunderclap Cleave",
   "desc": "Strike every enemy in Melee, then push each back to Near.",
   "path": "Arcane",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon",
     "target": "enemiesMelee"
    },
    {
     "on": "hit",
     "do": "note",
     "text": "push each back to Near"
    }
   ]
  },
  {
   "id": "m12",
   "type": "spell",
   "use": "action",
   "name": "Arcane Cataclysm",
   "desc": "Burst, medium radius. 6d6 force damage. Allies in the burst take half.",
   "risk": 2,
   "path": "Arcane",
   "level": 3,
   "fx": [
    {
     "on": "use",
     "do": "damage",
     "dice": "6d6",
     "allies": "half",
     "target": "burst"
    }
   ]
  },
  {
   "id": "n4",
   "type": "action",
   "use": "action",
   "name": "Scourge",
   "desc": "Attack, then take 1 harm. Add 1d6 to the damage.",
   "path": "Penitent",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "use",
     "do": "selfHarm",
     "n": 1
    },
    {
     "on": "damage",
     "do": "bonus",
     "to": "damage",
     "dice": "+1d6"
    }
   ]
  },
  {
   "id": "n5",
   "type": "passive",
   "name": "Hair Shirt",
   "desc": "Once per round, roll 1d6 and reduce one harm you take by that much.",
   "path": "Penitent",
   "level": 1,
   "fx": [
    {
     "on": "harm",
     "do": "mitigate",
     "reduce": "1d6",
     "limit": "round"
    }
   ]
  },
  {
   "id": "n12",
   "type": "action",
   "use": "action",
   "name": "Endure",
   "desc": "Brace. Halve the next harm you take before your next turn.",
   "path": "Penitent",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "mitigate",
     "halve": true,
     "target": "self",
     "limit": "nextHit"
    }
   ]
  },
  {
   "id": "n10",
   "type": "passive",
   "name": "Stigmata",
   "desc": "You bleed for your faith and do not break easily. Adds to your Body.",
   "stat": "Body",
   "bonus": 1,
   "path": "Penitent",
   "level": 1
  },
  {
   "id": "n11",
   "type": "passive",
   "name": "Martyr’s Resolve",
   "desc": "Suffering has taught you patience.",
   "stat": "Spirit",
   "bonus": 1,
   "path": "Penitent",
   "level": 1
  },
  {
   "id": "n8",
   "type": "passive",
   "name": "Vow of Silence",
   "desc": "While you have not spoken since your last turn, you may push for a second Action without raising the Looming Horror.",
   "path": "Penitent",
   "level": 2,
   "fx": [
    {
     "on": "always",
     "do": "looming",
     "freePush": true,
     "cond": "while not spoken since last turn"
    }
   ]
  },
  {
   "id": "n13",
   "type": "passive",
   "name": "Pilgrim’s Pack",
   "desc": "You travel light and carry more.",
   "cap": 2,
   "path": "Penitent",
   "level": 1
  },
  {
   "id": "n6",
   "type": "action",
   "use": "action",
   "name": "Flagellant Rush",
   "desc": "Move and Strike up to three times in one action. Take 1 harm per Strike.",
   "path": "Penitent",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon",
     "repeat": 3
    },
    {
     "on": "hit",
     "do": "selfHarm",
     "n": 1,
     "per": "Strike"
    }
   ]
  },
  {
   "id": "n7",
   "type": "spell",
   "use": "action",
   "name": "Absolution",
   "desc": "An ally within sight heals Wounds, 1 for each level of the spell, and clears one condition.",
   "path": "Penitent",
   "level": 2,
   "heal": true,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "byLevel": true,
     "clears": true,
     "target": "ally"
    }
   ]
  },
  {
   "id": "n14",
   "type": "action",
   "use": "action",
   "name": "Penance",
   "desc": "Take 2 harm. Add +2d6 to your armour roll against the first hit until your next turn. Once per long rest.",
   "path": "Penitent",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "selfHarm",
     "n": 2
    },
    {
     "on": "use",
     "do": "bonus",
     "to": "armour",
     "dice": "+2d6",
     "limit": "longRest"
    }
   ]
  },
  {
   "id": "n9",
   "type": "spell",
   "use": "action",
   "name": "Vigil of Ash",
   "desc": "All allies in a short radius ignore the next source of harm.",
   "risk": 1,
   "path": "Penitent",
   "level": 3,
   "fx": [
    {
     "on": "use",
     "do": "mitigate",
     "ignore": true,
     "target": "alliesNear"
    }
   ]
  },
  {
   "id": "w5",
   "type": "action",
   "use": "action",
   "name": "Shield Bash",
   "desc": "Strike for 1d6 and push the target to Near. If your attack roll beats its difficulty by 5 or more, it also loses its next action.",
   "path": "Warden",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "1d6"
    },
    {
     "on": "hit",
     "do": "status",
     "tag": "loses next action",
     "cond": "beats its difficulty by 5"
    },
    {
     "on": "hit",
     "do": "note",
     "text": "push to Near"
    }
   ]
  },
  {
   "id": "w6",
   "type": "action",
   "use": "reaction",
   "name": "Interpose",
   "desc": "Reaction. Take a hit meant for an ally in Melee or Near.",
   "path": "Warden",
   "level": 1,
   "fx": [
    {
     "on": "incoming",
     "do": "redirect",
     "from": "ally",
     "to": "self",
     "what": "hit",
     "limit": "reaction"
    }
   ]
  },
  {
   "id": "w7",
   "type": "passive",
   "name": "Iron Constitution",
   "desc": "Built like a gatepost.",
   "stat": "Body",
   "bonus": 1,
   "path": "Warden",
   "level": 1
  },
  {
   "id": "w8",
   "type": "passive",
   "name": "Veteran’s Eye",
   "desc": "You have seen this fight before.",
   "stat": "Mind",
   "bonus": 1,
   "path": "Warden",
   "level": 1
  },
  {
   "id": "w9",
   "type": "passive",
   "name": "Quartermaster",
   "desc": "You always have room for one more thing.",
   "cap": 2,
   "path": "Warden",
   "level": 1
  },
  {
   "id": "w10",
   "type": "passive",
   "name": "Armourer’s Craft",
   "desc": "When your armour would lose durability, roll 1d6. On a 5 or 6 it does not. Repair it during a rest.",
   "path": "Warden",
   "level": 2,
   "fx": [
    {
     "on": "durability",
     "do": "durability",
     "save": 5
    }
   ]
  },
  {
   "id": "w11",
   "type": "action",
   "use": "action",
   "name": "Hold the Line",
   "desc": "Allies within Near cannot be moved, and enemies cannot move past them until your next turn.",
   "path": "Warden",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "note",
     "text": "allies cannot be moved, enemies cannot pass"
    }
   ]
  },
  {
   "id": "w12",
   "type": "passive",
   "name": "Sentinel",
   "desc": "Once per round, make a free Strike on an enemy that moves into your reach.",
   "path": "Warden",
   "level": 2,
   "fx": [
    {
     "on": "enemyMove",
     "do": "attack",
     "kind": "weapon",
     "free": true,
     "limit": "round"
    }
   ]
  },
  {
   "id": "w13",
   "type": "spell",
   "use": "action",
   "name": "Smite",
   "desc": "Strike with radiant force, adding 3d6 damage.",
   "path": "Warden",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "damage",
     "do": "bonus",
     "to": "damage",
     "dice": "+3d6"
    }
   ]
  },
  {
   "id": "w14",
   "type": "spell",
   "use": "action",
   "name": "Aegis of Faith",
   "desc": "Allies within Near add +1d6 to their armour roll against the next hit.",
   "risk": 1,
   "path": "Warden",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "bonus",
     "to": "armour",
     "dice": "+1d6",
     "target": "alliesNear",
     "limit": "nextHit"
    }
   ]
  },
  {
   "id": "w15",
   "type": "action",
   "use": "action",
   "name": "Last Bastion",
   "desc": "For one round you cannot be moved, and your harm cannot go above 11.",
   "path": "Warden",
   "level": 3,
   "fx": [
    {
     "on": "use",
     "do": "mitigate",
     "cap": 11,
     "limit": "oneRound"
    },
    {
     "on": "use",
     "do": "note",
     "text": "cannot be moved"
    }
   ]
  },
  {
   "id": "c4",
   "type": "spell",
   "use": "action",
   "name": "Hymn of Courage",
   "desc": "Allies who can hear you add +1 to their next check.",
   "path": "Cantor",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "bonus",
     "to": "check",
     "n": 1,
     "target": "alliesEarshot",
     "limit": "nextCheck"
    }
   ]
  },
  {
   "id": "c5",
   "type": "spell",
   "use": "action",
   "name": "Litany of Mending",
   "desc": "An ally in earshot heals Wounds, 1 for each level of the spell.",
   "path": "Cantor",
   "level": 1,
   "heal": true,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "byLevel": true,
     "target": "ally"
    }
   ]
  },
  {
   "id": "c6",
   "type": "spell",
   "use": "action",
   "name": "Dissonant Note",
   "desc": "Ranged. 3d6 sonic damage that ignores armour. The target is deafened until your next turn.",
   "risk": 1,
   "path": "Cantor",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "spell"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "3d6",
     "ignoresArmour": true
    },
    {
     "on": "hit",
     "do": "status",
     "tag": "deafened",
     "limit": "nextTurn"
    }
   ]
  },
  {
   "id": "c7",
   "type": "passive",
   "name": "Resonant Voice",
   "desc": "Your voice commands the room.",
   "stat": "Spirit",
   "bonus": 1,
   "path": "Cantor",
   "level": 1
  },
  {
   "id": "c8",
   "type": "passive",
   "name": "Perfect Pitch",
   "desc": "You hear what others miss.",
   "stat": "Mind",
   "bonus": 1,
   "path": "Cantor",
   "level": 1
  },
  {
   "id": "c9",
   "type": "action",
   "use": "action",
   "name": "Call and Response",
   "desc": "An ally who can hear you takes a free Move right now, out of turn, even if they have already acted.",
   "path": "Cantor",
   "level": 1,
   "fx": [
    {
     "on": "use",
     "do": "note",
     "text": "an ally takes a free Move out of turn"
    }
   ]
  },
  {
   "id": "c10",
   "type": "passive",
   "name": "Counterpoint",
   "desc": "Once per round, when an ally you can hear fails a check, they may reroll it.",
   "path": "Cantor",
   "level": 2,
   "fx": [
    {
     "on": "check",
     "do": "reroll",
     "target": "ally",
     "limit": "round"
    }
   ]
  },
  {
   "id": "c11",
   "type": "spell",
   "use": "action",
   "name": "Choral Shield",
   "desc": "Allies in earshot: the next time an adversary crits them, their armour takes no durability damage.",
   "path": "Cantor",
   "level": 2,
   "fx": [
    {
     "on": "durability",
     "do": "durability",
     "noLoss": true,
     "target": "alliesEarshot"
    }
   ]
  },
  {
   "id": "c12",
   "type": "spell",
   "use": "action",
   "name": "Requiem",
   "desc": "Roll a Spirit check. Every enemy in sight whose difficulty it meets or beats loses its next action.",
   "risk": 1,
   "path": "Cantor",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "check",
     "score": "Spirit",
     "target": "enemiesSight"
    },
    {
     "on": "hit",
     "do": "status",
     "tag": "loses next action"
    }
   ]
  },
  {
   "id": "c13",
   "type": "spell",
   "use": "action",
   "name": "Hush",
   "desc": "Silence an area for one round. No spells or trinkets can be activated inside.",
   "risk": 2,
   "path": "Cantor",
   "level": 2,
   "fx": [
    {
     "on": "use",
     "do": "note",
     "text": "an area is silent for a round: no spells or trinkets"
    }
   ]
  },
  {
   "id": "c14",
   "type": "spell",
   "use": "action",
   "name": "Benediction",
   "desc": "A rite. Every ally within sight heals 1 Wound. Once per long rest.",
   "path": "Cantor",
   "level": 3,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "wounds": 1,
     "target": "alliesSight",
     "limit": "longRest"
    }
   ]
  },
  {
   "id": "c15",
   "type": "spell",
   "use": "action",
   "name": "Symphony of Ruin",
   "desc": "All enemies in sight take 6d6 damage.",
   "risk": 2,
   "path": "Cantor",
   "level": 3,
   "fx": [
    {
     "on": "use",
     "do": "damage",
     "dice": "6d6",
     "target": "enemiesSight"
    }
   ]
  },
  {
   "id": "m15",
   "type": "spell",
   "use": "action",
   "name": "Chain Lightning",
   "desc": "Lightning leaps between up to four enemies in sight. Each takes 5d6 damage.",
   "path": "Arcane",
   "level": 4,
   "risk": 1,
   "fx": [
    {
     "on": "use",
     "do": "damage",
     "dice": "5d6",
     "target": "enemiesSight"
    }
   ]
  },
  {
   "id": "m16",
   "type": "spell",
   "use": "action",
   "name": "Unmake",
   "desc": "One adversary in sight loses its armour dice for a minute.",
   "path": "Arcane",
   "level": 4,
   "risk": 2,
   "fx": [
    {
     "on": "use",
     "do": "status",
     "tag": "armour stripped",
     "target": "enemy",
     "limit": "minute"
    }
   ]
  },
  {
   "id": "m17",
   "type": "passive",
   "name": "Warded Mind",
   "desc": "Your will is a locked door. Adds to your Spirit.",
   "path": "Arcane",
   "level": 4,
   "stat": "Spirit",
   "bonus": 1
  },
  {
   "id": "m18",
   "type": "spell",
   "use": "action",
   "name": "Rend the Veil",
   "desc": "Every enemy in sight takes 8d6 force damage that ignores armour.",
   "path": "Arcane",
   "level": 5,
   "risk": 3,
   "fx": [
    {
     "on": "use",
     "do": "damage",
     "dice": "8d6",
     "ignoresArmour": true,
     "target": "enemiesSight"
    }
   ]
  },
  {
   "id": "m19",
   "type": "passive",
   "name": "Archmage’s Focus",
   "desc": "The first spell you cast each round raises the Looming Horror by 1 less (never below 1).",
   "path": "Arcane",
   "level": 5,
   "fx": [
    {
     "on": "cast",
     "do": "looming",
     "discount": 1,
     "cond": "first spell each round, never below 1"
    }
   ]
  },
  {
   "id": "n15",
   "type": "action",
   "use": "action",
   "name": "Scourged Vigor",
   "desc": "Take 2 harm. Your next attack adds 3d6 damage.",
   "path": "Penitent",
   "level": 4,
   "fx": [
    {
     "on": "use",
     "do": "selfHarm",
     "n": 2
    },
    {
     "on": "use",
     "do": "bonus",
     "to": "damage",
     "dice": "+3d6",
     "limit": "nextAttack"
    }
   ]
  },
  {
   "id": "n16",
   "type": "action",
   "use": "reaction",
   "name": "Martyr’s Shield",
   "desc": "Take the hit meant for an ally within Near. Roll your own armour against it.",
   "path": "Penitent",
   "level": 4,
   "fx": [
    {
     "on": "incoming",
     "do": "redirect",
     "from": "ally",
     "to": "self",
     "what": "hit",
     "limit": "reaction"
    }
   ]
  },
  {
   "id": "n17",
   "type": "spell",
   "use": "action",
   "name": "Rite of Restoration",
   "desc": "An ally within sight heals Wounds, 1 for each level of the spell (up to all three), and clears every condition.",
   "path": "Penitent",
   "level": 4,
   "heal": true,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "byLevel": true,
     "clears": true,
     "target": "ally",
     "cond": "up to 3"
    }
   ]
  },
  {
   "id": "n18",
   "type": "action",
   "use": "action",
   "name": "Last Penance",
   "desc": "Take 4 harm. Make one Strike or damage-spell attack that hits automatically and rolls its damage dice twice, as a critical hit. Once per long rest.",
   "path": "Penitent",
   "level": 5,
   "fx": [
    {
     "on": "use",
     "do": "selfHarm",
     "n": 4,
     "limit": "longRest"
    },
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon",
     "auto": true
    },
    {
     "on": "damage",
     "do": "damage",
     "double": true
    },
    {
     "on": "use",
     "do": "note",
     "text": "a damage spell can be used instead of a Strike"
    }
   ]
  },
  {
   "id": "n19",
   "type": "passive",
   "name": "Saint’s Endurance",
   "desc": "The first time each fight would put you at 12 harm, you stay at 11 instead.",
   "path": "Penitent",
   "level": 5,
   "fx": [
    {
     "on": "harm",
     "do": "mitigate",
     "cap": 11,
     "limit": "fight"
    }
   ]
  },
  {
   "id": "w16",
   "type": "action",
   "use": "action",
   "name": "Phalanx",
   "desc": "Allies within Near add +1d6 to their armour rolls until your next turn.",
   "path": "Warden",
   "level": 4,
   "fx": [
    {
     "on": "use",
     "do": "bonus",
     "to": "armour",
     "dice": "+1d6",
     "target": "alliesNear",
     "limit": "nextTurn"
    }
   ]
  },
  {
   "id": "w17",
   "type": "action",
   "use": "action",
   "name": "Sunder",
   "desc": "One weapon attack. The target’s armour dice are halved, rounded down, against it.",
   "path": "Warden",
   "level": 4,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "hit",
     "do": "armour",
     "change": "halve",
     "target": "enemy"
    }
   ]
  },
  {
   "id": "w18",
   "type": "passive",
   "name": "Bulwark of Faith",
   "desc": "Your worn armour has 1 extra durability.",
   "path": "Warden",
   "level": 4,
   "fx": [
    {
     "on": "always",
     "do": "durability",
     "extra": 1
    }
   ]
  },
  {
   "id": "w19",
   "type": "action",
   "use": "action",
   "name": "Judgement",
   "desc": "One weapon attack. Roll your weapon’s damage twice and add both. A critical hit does not double it again.",
   "path": "Warden",
   "level": 5,
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon"
    },
    {
     "on": "damage",
     "do": "damage",
     "double": true
    }
   ]
  },
  {
   "id": "w20",
   "type": "passive",
   "name": "Unbroken",
   "desc": "Critical hits never cost your armour durability.",
   "path": "Warden",
   "level": 5,
   "fx": [
    {
     "on": "durability",
     "do": "durability",
     "noLoss": true
    }
   ]
  },
  {
   "id": "c16",
   "type": "spell",
   "use": "action",
   "name": "Canticle of Renewal",
   "desc": "An ally within earshot heals Wounds, 1 for each level of the spell (up to all three).",
   "path": "Cantor",
   "level": 4,
   "heal": true,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "byLevel": true,
     "target": "ally",
     "cond": "up to 3"
    }
   ]
  },
  {
   "id": "c17",
   "type": "spell",
   "use": "action",
   "name": "Chorus of Dread",
   "desc": "Every enemy in earshot rolls 1 fewer damage die on its attacks until your next turn.",
   "path": "Cantor",
   "level": 4,
   "risk": 1,
   "fx": [
    {
     "on": "use",
     "do": "status",
     "tag": "rolls 1 fewer damage die",
     "target": "enemiesEarshot",
     "limit": "nextTurn"
    }
   ]
  },
  {
   "id": "c18",
   "type": "passive",
   "name": "Harmonic Resonance",
   "desc": "Your voice carries power. Adds to your Spirit.",
   "path": "Cantor",
   "level": 4,
   "stat": "Spirit",
   "bonus": 1
  },
  {
   "id": "c19",
   "type": "spell",
   "use": "action",
   "name": "Requiem Aeternam",
   "desc": "Every ally in earshot heals 1 Wound and every enemy in sight takes 6d6 damage.",
   "path": "Cantor",
   "level": 5,
   "risk": 2,
   "heal": true,
   "heals": 1,
   "fx": [
    {
     "on": "use",
     "do": "heal",
     "wounds": 1,
     "target": "alliesEarshot"
    },
    {
     "on": "use",
     "do": "damage",
     "dice": "6d6",
     "target": "enemiesSight"
    }
   ]
  },
  {
   "id": "c20",
   "type": "passive",
   "name": "Perfect Harmony",
   "desc": "You hear the whole table breathing. Adds to your Mind.",
   "path": "Cantor",
   "level": 5,
   "stat": "Mind",
   "bonus": 1
  },
  {
   "id": "m20",
   "type": "spell",
   "use": "action",
   "name": "Searing Ray",
   "risk": 2,
   "level": 3,
   "path": "Arcane",
   "desc": "Ranged. 4d6 fire damage that ignores armour.",
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "spell"
    },
    {
     "on": "damage",
     "do": "damage",
     "dice": "4d6",
     "ignoresArmour": true
    }
   ]
  },
  {
   "id": "m21",
   "type": "passive",
   "name": "Mind’s Eye",
   "level": 3,
   "stat": "Mind",
   "bonus": 1,
   "path": "Arcane",
   "desc": "You see the shape of a thing before it moves. Adds to your Mind."
  },
  {
   "id": "n20",
   "type": "passive",
   "name": "Bloodied Resolve",
   "level": 3,
   "stat": "Body",
   "bonus": 1,
   "path": "Penitent",
   "desc": "What breaks others hardens you. Adds to your Body."
  },
  {
   "id": "w21",
   "type": "action",
   "use": "action",
   "name": "Cleaving Blow",
   "level": 3,
   "path": "Warden",
   "desc": "Strike an adversary, then strike a second adversary in Melee with the same weapon. Roll each attack separately.",
   "fx": [
    {
     "on": "use",
     "do": "attack",
     "kind": "weapon",
     "repeat": 2,
     "target": "enemy"
    }
   ]
  },
  {
   "id": "c21",
   "type": "passive",
   "name": "Steady Voice",
   "level": 3,
   "stat": "Spirit",
   "bonus": 1,
   "path": "Cantor",
   "desc": "Your voice does not shake. Adds to your Spirit."
  }
 ],
 "edges": [
  [
   "st",
   "m5"
  ],
  [
   "m6",
   "m14"
  ],
  [
   "m4",
   "m9"
  ],
  [
   "m7",
   "m10"
  ],
  [
   "m5",
   "m11"
  ],
  [
   "m9",
   "m12"
  ],
  [
   "m10",
   "m12"
  ],
  [
   "st",
   "n4"
  ],
  [
   "n4",
   "n10"
  ],
  [
   "n5",
   "n11"
  ],
  [
   "n5",
   "n8"
  ],
  [
   "n12",
   "n13"
  ],
  [
   "n4",
   "n6"
  ],
  [
   "n5",
   "n7"
  ],
  [
   "n11",
   "n14"
  ],
  [
   "n7",
   "n9"
  ],
  [
   "n8",
   "n9"
  ],
  [
   "st",
   "w5"
  ],
  [
   "gd",
   "w6"
  ],
  [
   "st",
   "w8"
  ],
  [
   "w7",
   "w9"
  ],
  [
   "w7",
   "w10"
  ],
  [
   "w6",
   "w11"
  ],
  [
   "w8",
   "w12"
  ],
  [
   "w5",
   "w13"
  ],
  [
   "w6",
   "w14"
  ],
  [
   "w11",
   "w15"
  ],
  [
   "w12",
   "w15"
  ],
  [
   "c4",
   "c5"
  ],
  [
   "c4",
   "c6"
  ],
  [
   "st",
   "c9"
  ],
  [
   "c8",
   "c10"
  ],
  [
   "c5",
   "c11"
  ],
  [
   "c6",
   "c12"
  ],
  [
   "c6",
   "c13"
  ],
  [
   "c11",
   "c14"
  ],
  [
   "c10",
   "c14"
  ],
  [
   "c12",
   "c15"
  ],
  [
   "c13",
   "c15"
  ],
  [
   "m9",
   "m15"
  ],
  [
   "m12",
   "m16"
  ],
  [
   "m14",
   "m17"
  ],
  [
   "m15",
   "m18"
  ],
  [
   "m16",
   "m18"
  ],
  [
   "m17",
   "m19"
  ],
  [
   "n6",
   "n15"
  ],
  [
   "n14",
   "n16"
  ],
  [
   "n7",
   "n17"
  ],
  [
   "n15",
   "n18"
  ],
  [
   "n16",
   "n18"
  ],
  [
   "n17",
   "n19"
  ],
  [
   "w11",
   "w16"
  ],
  [
   "w13",
   "w17"
  ],
  [
   "w10",
   "w18"
  ],
  [
   "w16",
   "w19"
  ],
  [
   "w17",
   "w19"
  ],
  [
   "w18",
   "w20"
  ],
  [
   "c11",
   "c16"
  ],
  [
   "c13",
   "c17"
  ],
  [
   "c10",
   "c18"
  ],
  [
   "c16",
   "c19"
  ],
  [
   "c17",
   "c19"
  ],
  [
   "c18",
   "c20"
  ],
  [
   "m4",
   "m20"
  ],
  [
   "m13",
   "m21"
  ],
  [
   "n10",
   "n20"
  ],
  [
   "w5",
   "w21"
  ],
  [
   "c7",
   "c21"
  ]
 ],
 "items": {
  "weapons": [
   {
    "id": "w1",
    "n": "Arming Sword",
    "t": 1,
    "k": "melee",
    "s": 1
   },
   {
    "id": "w2",
    "n": "Hunting Bow",
    "t": 1,
    "k": "ranged",
    "s": 1
   },
   {
    "id": "w3",
    "n": "Pilgrim’s Staff",
    "t": 1,
    "k": "melee",
    "s": 1
   },
   {
    "id": "w4",
    "n": "Knight’s Longsword",
    "t": 2,
    "k": "melee",
    "s": 1
   },
   {
    "id": "w5",
    "n": "War Bow",
    "t": 2,
    "k": "ranged",
    "s": 1
   },
   {
    "id": "w6",
    "n": "Iron-Shod Maul",
    "t": 2,
    "k": "melee",
    "s": 2
   },
   {
    "id": "w7",
    "n": "Saint’s Blade",
    "t": 3,
    "k": "melee",
    "s": 1
   },
   {
    "id": "w8",
    "n": "Reliquary Crossbow",
    "t": 3,
    "k": "ranged",
    "s": 2
   },
   {
    "id": "w9",
    "n": "Martyr’s Edge",
    "t": 4,
    "k": "melee",
    "s": 2
   },
   {
    "id": "w10",
    "n": "Cathedral Glaive",
    "t": 3,
    "k": "melee",
    "s": 2
   },
   {
    "id": "w11",
    "n": "Penitent’s Longbow",
    "t": 3,
    "k": "ranged",
    "s": 1
   },
   {
    "id": "w12",
    "n": "Silvered Falchion",
    "t": 3,
    "k": "melee",
    "s": 1
   },
   {
    "id": "w13",
    "n": "Executioner’s Greatsword",
    "t": 4,
    "k": "melee",
    "s": 2
   },
   {
    "id": "w14",
    "n": "Seraph’s Longbow",
    "t": 4,
    "k": "ranged",
    "s": 1
   },
   {
    "id": "w15",
    "n": "Blade of the Hollow Saint",
    "t": 5,
    "k": "melee",
    "s": 2
   },
   {
    "id": "w16",
    "n": "Bow of Sorrows",
    "t": 5,
    "k": "ranged",
    "s": 1
   }
  ],
  "armour": [
   {
    "id": "a1",
    "n": "Quilted Coat",
    "t": 1,
    "w": "light"
   },
   {
    "id": "a2",
    "n": "Leather Jerkin",
    "t": 2,
    "w": "light"
   },
   {
    "id": "a3",
    "n": "Mail Hauberk",
    "t": 2,
    "w": "medium"
   },
   {
    "id": "a4",
    "n": "Brigandine",
    "t": 3,
    "w": "medium"
   },
   {
    "id": "a5",
    "n": "Plate Harness",
    "t": 3,
    "w": "heavy"
   },
   {
    "id": "a6",
    "n": "Sanctified Plate",
    "t": 4,
    "w": "heavy"
   },
   {
    "id": "a7",
    "n": "Shadow-Stitched Cloak",
    "t": 3,
    "w": "light"
   },
   {
    "id": "a8",
    "n": "Veil of Saints",
    "t": 4,
    "w": "light"
   },
   {
    "id": "a9",
    "n": "Warded Hauberk",
    "t": 4,
    "w": "medium"
   },
   {
    "id": "a10",
    "n": "Armour of the First Saint",
    "t": 5,
    "w": "heavy"
   },
   {
    "id": "a11",
    "n": "Mantle of Dawn",
    "t": 5,
    "w": "light"
   }
  ],
  "trinkets": [
   {
    "id": "t1",
    "n": "Chalk Ward",
    "t": 1,
    "r": 0,
    "s": 1,
    "d": "Draw a line spirits must pass a difficulty 12 Spirit check to cross.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "note",
      "text": "a ward line, difficulty 12 Spirit check to cross"
     }
    ]
   },
   {
    "id": "t2",
    "n": "Candle-Stub Charm",
    "t": 1,
    "s": 1,
    "d": "Light an area for an hour, or douse every flame within Near. It needs no action: it is part of the story.",
    "use": "none",
    "fx": [
     {
      "on": "use",
      "do": "note",
      "text": "light or douse flames"
     }
    ]
   },
   {
    "id": "t3",
    "n": "Reliquary Focus",
    "t": 2,
    "s": 1,
    "sc": {
     "Spirit": 1
    },
    "d": "A saint’s knucklebone in a silver case. Carried, it steadies your voice.",
    "use": "none",
    "fx": [
     {
      "on": "always",
      "do": "score",
      "stat": "Spirit",
      "n": 1
     }
    ]
   },
   {
    "id": "t4",
    "n": "Warding Ring",
    "t": 2,
    "r": 1,
    "s": 1,
    "d": "Reaction. Reduce one hit against you by 2d6.",
    "use": "reaction",
    "fx": [
     {
      "on": "incoming",
      "do": "mitigate",
      "reduce": "2d6",
      "limit": "reaction"
     }
    ]
   },
   {
    "id": "t5",
    "n": "Saint’s Finger-Bone",
    "t": 3,
    "r": 1,
    "s": 1,
    "d": "An ally in sight heals 1 Wound.",
    "heal": true,
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "heal",
      "wounds": 1,
      "target": "ally"
     }
    ]
   },
   {
    "id": "t6",
    "n": "Hollow Crown",
    "t": 3,
    "r": 2,
    "s": 1,
    "d": "Ask the GM one question the dead would know.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "note",
      "text": "ask the GM a question"
     }
    ]
   },
   {
    "id": "t7",
    "n": "Heart of the Cathedral",
    "t": 4,
    "r": 2,
    "s": 1,
    "d": "Everyone in sight ignores the next harm they would take.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "mitigate",
      "ignore": true,
      "target": "everyone"
     }
    ]
   },
   {
    "id": "t8",
    "n": "Bell of Unmaking",
    "t": 3,
    "r": 1,
    "s": 1,
    "d": "Roll a Spirit check. Every enemy in earshot whose difficulty it meets or beats loses its next action.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "check",
      "score": "Spirit",
      "target": "enemiesEarshot"
     },
     {
      "on": "hit",
      "do": "status",
      "tag": "loses next action"
     }
    ]
   },
   {
    "id": "t9",
    "n": "Lantern of the Faithful",
    "t": 3,
    "r": 0,
    "s": 1,
    "d": "Allies in sight add +2 to Spirit checks this round.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "bonus",
      "to": "check",
      "n": 2,
      "stat": "Spirit",
      "target": "alliesSight",
      "limit": "oneRound"
     }
    ]
   },
   {
    "id": "t10",
    "n": "Censer of Ash",
    "t": 4,
    "r": 2,
    "s": 1,
    "d": "Fill a room with smoke. Enemies inside roll 2 fewer damage dice for a minute.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "status",
      "tag": "rolls 2 fewer damage dice",
      "target": "enemiesSight",
      "limit": "minute"
     }
    ]
   },
   {
    "id": "t11",
    "n": "Mirror of the Penitent",
    "t": 4,
    "r": 1,
    "s": 1,
    "d": "Reaction. Reflect one spell back at its caster.",
    "use": "reaction",
    "fx": [
     {
      "on": "incoming",
      "do": "redirect",
      "from": "self",
      "to": "caster",
      "what": "spell",
      "limit": "reaction"
     }
    ]
   },
   {
    "id": "t12",
    "n": "Seal of the Last Saint",
    "t": 4,
    "r": 3,
    "s": 1,
    "d": "Once per long rest. One fallen ally returns with 4 harm (1 Wound).",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "revive",
      "harm": 4,
      "limit": "longRest"
     }
    ]
   },
   {
    "id": "t13",
    "n": "Vial of First Light",
    "t": 5,
    "r": 3,
    "s": 1,
    "d": "Every adversary in sight loses its next attack.",
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "status",
      "tag": "loses next attack",
      "target": "enemiesSight"
     }
    ]
   },
   {
    "id": "t14",
    "n": "Rosary of Many Names",
    "t": 5,
    "r": 2,
    "s": 1,
    "d": "Heal one Wound on yourself and one ally within sight.",
    "heal": true,
    "use": "action",
    "fx": [
     {
      "on": "use",
      "do": "heal",
      "wounds": 1,
      "target": "selfAlly"
     }
    ]
   }
  ],
  "supplies": [
   {
    "id": "s1",
    "n": "Rations ×3",
    "s": 1
   },
   {
    "id": "s2",
    "n": "Rope and pitons",
    "s": 1
   },
   {
    "id": "s3",
    "n": "Torches ×5",
    "s": 1
   },
   {
    "id": "s4",
    "n": "Healer’s kit",
    "s": 1,
    "heal": true,
    "d": "A healer's tools.",
    "fx": [
     {
      "on": "use",
      "do": "heal",
      "wounds": 1
     }
    ]
   },
   {
    "id": "s5",
    "n": "Holy water ×3",
    "s": 1
   },
   {
    "id": "s6",
    "n": "Repair tools",
    "s": 1
   },
   {
    "id": "s7",
    "n": "Blessed oil ×3",
    "t": 3,
    "s": 1,
    "d": "Anoint a weapon: +1d6 damage for one fight.",
    "fx": [
     {
      "on": "use",
      "do": "bonus",
      "to": "damage",
      "dice": "+1d6",
      "target": "self",
      "limit": "fight"
     }
    ]
   },
   {
    "id": "s8",
    "n": "Master repair kit",
    "t": 3,
    "s": 1,
    "d": "Repair armour in the middle of a fight, using one action.",
    "fx": [
     {
      "on": "use",
      "do": "durability",
      "repair": true
     }
    ]
   },
   {
    "id": "s9",
    "n": "Sanctified bandages ×5",
    "t": 4,
    "s": 1,
    "d": "Used outside combat.",
    "heal": true,
    "fx": [
     {
      "on": "use",
      "do": "heal",
      "wounds": 1,
      "cond": "outside combat"
     }
    ]
   }
  ]
 }
};
