# Sacrament: Hearts. The starter library, the ready heroes and the foes

*Generated from `site/game/data.js` by `node scripts/hearts/docs.mjs`. Edit the data, not this file.*

Every item says how many **slots** it takes (a hero carries ten), when it is **used** (Action, Move, Free, or carried), the **roll** it needs, the **Effort die** it rolls, and the **Horror** it adds each time. What it *lets you do* is the point; the numbers are the smaller part.

## Weapons

| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |
|---|---|---|---|---|---|---|
| **Pilgrim's Staff** | 1 | Action | STR | d6 | — | Strike an Engaged foe. A hit may leave a living foe Dazed instead of hurt: its next attack rolls 3 less. |
| **Penitent's Blade** | 1 | Action | STR | d6 | — | Strike an Engaged foe. Held in a Guard it is a better parry: your Guard gives Defence +3 instead of +2. |
| **Hunting Bow** | 2 | Action | DEX | d8 | — | Shoot a foe in Close or Far. Unlike the crossbow it can fire every Action, but not while a foe is Engaged with you. When you push, the second shot may be at a different foe. |
| **Gravedigger's Hatchet** | 1 | Action | STR | d6 | — | Strike an Engaged foe, or throw it at a foe in Close. A thrown hatchet lies where it lands: fetching it takes a Move. |
| **Boar Spear** | 2 | Action | STR | d6 | — | Reach: Strike a foe in Engaged or Close without moving. Braced: when a foe moves from Close into Engaged with you, your next Strike on it before its next turn is Easy (−3). |
| **Warden's Billhook** | 2 | Action | STR | d6 | — | Strike an Engaged foe. Instead of damage, a hit can hook it: drag it one band towards you, or topple it so that it spends its next Move standing. |
| **Windlass Crossbow** | 2 | Action | DEX | d8 | — | Shoot a foe in Close or Far. Reloading takes your Move, so it fires at most once a turn unless you push. It cannot be used while a foe is Engaged with you. |
| **Confessor's Knife** | 1 | Action | STR | d6 | — | Strike an Engaged foe. Small enough to hide in a sleeve. |
| **Sexton's Spade** | 1 | Action | STR | d4 | — | Strike an Engaged foe with a tool, not a weapon. Also digs. |
| **Shepherd's Sling** | 1 | Action | DEX | d4 | — | Shoot a foe in Close or Far. A shepherd's tool, not a weapon of war. |

## Armour and shields

| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |
|---|---|---|---|---|---|---|
| **Quilted Gambeson** | 1 | Always | — | Defence +2 | — | Defence +2 when you defend with CON. Quiet, and you can sleep in it. |
| **Brigandine Coat** | 2 | Always | — | Defence +3 | — | Defence +3 when you defend with CON. Plates riveted inside cloth: it clinks. |
| **Plate Harness** | 3 | Always | — | Defence +4 | — | Defence +4 when you defend with CON, and it carries you through a blow: +1 Heart while worn. You cannot Dash, and a DEX check to be quiet or to swim is Hard (+3). |
| **Heater Shield** | 1 | Action | — | Defence +1 | — | Defence +1 when you defend with CON. As an Action, raise it over an Engaged ally: until your next turn they also get +1 Defence. |
| **Kettle Helm** | 1 | Always | — | Defence +1 | — | Defence +1 when you defend with CON. A pot of iron with a brim. Your head rings when it is struck, and you hear less. |

## Supplies

| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |
|---|---|---|---|---|---|---|
| **Linen Bandages** | 1 | Action | WIS | — | — | Tend an Engaged ally who is dying or hurt (3 uses). On a dying ally the check is Easy (−3). On a hurt ally, success heals 1d6 (once per person per rest). |
| **Hooded Lantern** | 1 | Always | — | — | — | Light to the edge of Close. In the dark, without it, every WIS check to search or notice is Hard (+3). |
| **Rope and Grapnel** | 1 | Move | — | — | — | As a Move, throw the grapnel to cross a gap or climb a wall in the same scene without a check, and let an ally follow. |
| **Locksmith's Picks** | 1 | Action | DEX | — | — | Open a lock, or take a Hearts obstacle made of a lock, mechanism or trap: add Effort d6 to its progress. Without picks such obstacles cannot be worked at all. |
| **Flask of Holy Oil** | 1 | Action | — | — | — | Anoint a weapon (2 uses). Until the end of the scene its Effort steps up one size against the unquiet dead and anything marked Unholy. |
| **Flask of Aqua Vitae** | 1 | Free | — | — | — | Drink: heal 1d6 now, and you may take your next Action this turn even if you pushed. One use. Strong stuff: your next INT check is Hard (+3). |
| **Tallow Candles** | 1 | Action | — | — | — | Light a candle (3 uses): it gives light to Close for the rest of the scene. They gutter in wind. |
| **Tinderbox and Flint** | 1 | Always | — | — | — | Lights candles, lanterns and fires. Without it nothing can be lit. |
| **Wayshrine Crowbar** | 1 | Always | — | — | — | Forcing a door, lid or shutter: the STR check is Easy (-3). |
| **Iron Spikes and Hammer** | 1 | Action | — | — | — | Wedge a door open or shut. A foe forcing a door you have spiked rolls Hard (+3). |
| **Pilgrim's Cloak** | 1 | Always | — | — | — | Waxed wool against rain and cold. No Defence. |
| **Hardtack and Waterskin** | 1 | Always | — | — | — | Food and water for the road. The story uses it; the rules do not. |
| **Chalk and Charcoal** | 1 | Always | — | — | — | Mark a wall, a floor, a door. The story uses it; the rules do not. |
| **Prayer Beads** | 1 | Always | — | — | — | Counting them steadies the hands. The story uses it; the rules do not. |
| **Scrivener's Kit** | 1 | Action | INT | — | — | Quill, ink and sealing wax. Write, copy or read a letter (INT). |

## Relics (dangerous: each use adds Horror)

| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |
|---|---|---|---|---|---|---|
| **Penitent's Chain** | 1 | Free | — | — | +1 | Once per turn, before you roll a check: take 1d4 damage that nothing reduces, and add +3 to the roll. |
| **Bone Bell** | 1 | Action | CHA | — | +2 | Ring it. On a success every foe in Engaged or Close is Dazed (its next attack rolls 3 less). It also wakes anything sleeping nearby. |
| **Saint's Knucklebone** | 1 | Action | — | d8 | +1 | No roll. An ally in Engaged or Close heals Effort d8. Once per person per rest. |
| **Censer of Ash** | 1 | Action | WIS | — | +2 | Swing it. On a success, until the end of the next round every foe’s Effort steps down one size (to a minimum of d4). |
| **The Black Candle** | 1 | Free | — | — | +1 | Light it for the rest of the scene. You see in the dark and you can tell where the unquiet dead are within Far. Once lit, it cannot be put out until the scene ends. |
| **The Executioner's Blade** | 2 | Action | STR | d10 | +1 | Strike an Engaged foe with Effort d10. Each Strike adds 1 Horror. Once per scene, a Strike may roll d12 instead for 3 Horror in all. |

## Grimoires (they hold spells)

| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |
|---|---|---|---|---|---|---|
| **The Ashen Psalter** | 1 | Action | INT | d10 | +1 | Two spells, each cast as an Action. Ember: a foe in Close or Far is struck by flame for Effort d10 (1 Horror). Kindle: set fire to, or put out, something small; light it up to Close (1 Horror, no roll). |
| **The Seventh Penance** | 1 | Action | WIS | d8 | +1 | Two prayers, each said as an Action. Mend: an ally in Engaged or Close heals Effort d8, once per person per rest (1 Horror). Ward: an ally in Engaged or Close gets +2 Defence until your next turn (1 Horror). |
| **The Book of Quiet Mouths** | 2 | Action | INT | d10 | +2 | Three forbidden workings. Unmake: a foe in Close or Far takes Effort d10 force (2 Horror). Speak with the Dead: ask a corpse one question, WIS check (2 Horror). Rend the Veil: once per scene, every foe in Close takes Effort d12 (3 Horror). |

## Spells

A spell is cast from a grimoire you carry. The Horror is paid when you roll, hit or miss.

| Spell | Book | Roll | Effort | Horror | Reach | What it does |
|---|---|---|---|---|---|---|
| **Ember** | The Ashen Psalter | INT | d10 | +1 | far | Flame strikes a foe in Close or Far. |
| **Kindle** | The Ashen Psalter | none | — | +1 | close | Set fire to, or put out, something small. Light to Close. No roll. |
| **Mend** | The Seventh Penance | WIS | d8 | +1 | close | An ally in Engaged or Close heals Effort d8. Once per person per rest. |
| **Ward** | The Seventh Penance | WIS | — | +1 | close | An ally in Engaged or Close gets +2 Defence until your next turn. |
| **Unmake** | The Book of Quiet Mouths | INT | d10 | +2 | far | A foe in Close or Far takes Effort d10 force, and is left Dazed: its next attack rolls 3 less. |
| **Speak with the Dead** | The Book of Quiet Mouths | WIS | — | +2 | engaged | Ask a corpse one question. It answers truly, and briefly. |
| **Rend the Veil** | The Book of Quiet Mouths | INT | d12 | +3 | close | Once per scene: every foe in Close takes Effort d12. |

## Foes

Hearts are 10 points each. A foe rolls its Effort die when its attack gets through your Defence. *Armoured* foes slow plain weapons (§6 of the rules).

| Foe | Hearts | Effort | You defend with | Moves | Notes |
|---|---|---|---|---|---|
| **Plague rat swarm** | 1 | d6 | CON | 1 band | Quick and everywhere. A bitten hero’s next INT check is Hard (+3). |
| **Gaunt penitent** | 1 | d8 | CON | 1 band | Starved, flayed, still devout. Fights without noticing its wounds. |
| **Grave hound** | 1 | d8 | CON | 2 bands | Crosses two bands in a Move. |
| **Drowned sexton** | 2 | d10 | CON · armoured · unholy | 1 band | Wet, patient, and wearing a mourner’s iron collar. Unholy. |
| **Relic-bound knight** | 3 | d10 ×2 | CON · armoured · unholy | 1 band | A saint’s bone sewn under the plate. Makes two attacks each turn. |
| **The Hollow Bishop** | 5 | d12 | WIS · unholy | 1 band | A boss. Defended against with WIS. Makes one attack each turn, and when it hits, the hero adds 1 Horror. |

## Making a hero

1. **Pick a Calling** for a kit, or build your own: ten slots, no more than three relics and grimoires.
2. **Spend 6 points** on STR, DEX, CON, INT, WIS and CHA (no more than 6 in one), and **4 points of Effort** on Basic, Weapons, Ranged, Magic and Ultimate.
3. **Health** is 1 Heart (10 points), more from gear. **Defence** is your score, plus armour and shield for CON (armour and shield never more than +5; never more than +10 in all).
4. **Write a vow** in one sentence, and a name.

That is all. There are no levels and no abilities to learn: what a hero can do is what they carry.

## Four ready-to-play heroes

### Sister Maren, Penitent

*To mend what the Horror breaks.*

The healer. Her prayers and relics keep people standing, and every one of them costs a little of the night.

**STR +1 · DEX +0 · CON +2 · INT +0 · WIS +3 · CHA +0** · Effort weapons +2, magic +1, ultimate +1 · 1 Heart (10) · Defence +4 · **4 equipped, 2 carried**

- Pilgrim's Staff (1 slot)
- Quilted Gambeson (1 slot)
- The Seventh Penance (1 slot)
- Linen Bandages (1 slot)
- Saint's Knucklebone (1 slot)
- Hooded Lantern (1 slot)

### Brother Aldric, Sworn blade

*To stand between them and it.*

The wall. He takes the foes’ attention, raises his shield over a friend and hooks the dangerous ones into reach.

**STR +3 · DEX +0 · CON +2 · INT +0 · WIS +1 · CHA +0** · Effort basic +1, weapons +3 · 1 Heart (10) · Defence +6 · **5 equipped, 2 carried**

- Warden's Billhook (2 slots)
- Brigandine Coat (2 slots)
- Heater Shield (1 slot)
- Flask of Holy Oil (1 slot)
- Rope and Grapnel (1 slot)

### Wren Ashdown, Cartographer

*To find the way out and come back with it.*

The scout. She shoots from Far, works locks and mechanisms, and reads the room before anyone walks into it.

**STR +0 · DEX +3 · CON +1 · INT +1 · WIS +1 · CHA +0** · Effort basic +1, ranged +3 · 1 Heart (10) · Defence +3 · **3 equipped, 5 carried**

- Windlass Crossbow (2 slots)
- Quilted Gambeson (1 slot)
- Locksmith's Picks (1 slot)
- Rope and Grapnel (1 slot)
- Hooded Lantern (1 slot)
- Linen Bandages (1 slot)
- Flask of Aqua Vitae (1 slot)

### Ottoline Vane, Heretic scholar

*To know it, whatever it costs.*

The caster. The most power in the party, and the quickest way to wake what is listening.

**STR +0 · DEX +1 · CON +1 · INT +3 · WIS +1 · CHA +0** · Effort magic +3, ultimate +1 · 1 Heart (10) · Defence +1 · **5 equipped, 0 carried**

- Gravedigger's Hatchet (1 slot)
- The Ashen Psalter (1 slot)
- The Book of Quiet Mouths (2 slots)
- Penitent's Chain (1 slot)

