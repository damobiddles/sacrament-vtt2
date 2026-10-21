# Sacrament lore reference

**Every session reads this before writing any name, line of flavour, page text or example in the Sacrament RPG website or table.** It is a reference for the writer, not a page of the site: it lives in `docs/`, which is never published.

Two parts. **Part 1 (public)** is the world as the Church tells it: it may appear on the site. **Part 2 (GM only)** is what is really true: it must never appear on the public site, in page source, or in anything sent to players. A test (`test/lore-secret.test.mjs`) fails if the guarded phrases in Part 2 appear anywhere the site serves.

## How to use it

* **Content only.** Lore changes words and names. It never changes how anything works, and **it never renames a game mechanic or rules term** (Target, Effort, Hearts, the Looming Horror, Move, Action and so on). The owner will rename those separately. The horror that magic tempts is called **the Horror** everywhere: in the world's own voice, and in the rules, where it is the Looming Horror.
* **Buttons and navigation keep plain, clear labels** ("Join a game", "Make a table", "Roll"). Flavour goes around them, never instead of them.
* **Tone: dark, grounded, sparing.** A few strong lines beat a lot of purple prose. Short sentences. Concrete things (a bell, a wax seal, a salt line on a doorstep) over abstractions. No jokes at the world's expense, no winking.
* **Never use names, places or text from other games, books or films.** If a name feels familiar from elsewhere, drop it and make another.
* **Never hint at Part 2** in anything players or visitors can see. Do not foreshadow it, even vaguely ("something stirs below"). The Church's account is what the public world believes, and the page speaks in that voice.
* New names follow the **Naming guide** at the end. Names already in the table (Thorne, Wisp, The Sealed Gate, Pit Ghoul, The Ceiling Groans, Warden's Bell, Beyond the Gate) fit it and stay.

---

## PART 1: PUBLIC

*(The world as the Church tells it. May appear on the site.)*

### The world

A dark fantasy world of the late medieval and early Renaissance: stone churches and plague carts, printing presses and pilgrim roads, candlelit scriptoria and gibbets at the crossroads. **Humans rule it.** Other peoples are feared and despised. The Church teaches that they sided with the demons in the Age of Ash, or were made by them, and a person of any other people lives quietly or not at all.

### History, as taught

1. **The Age of Ash.** Demons ruled and men were slaves. The sky was the colour of a cold hearth.
2. **The Binding.** The First Saints sealed the demons beneath the earth, at terrible cost. Most of the Saints did not live to see it hold. Their names are feast days now.
3. **The Hallowed Age.** The present. The Church is the guardian of the Binding and of everyone who lives above it.

### The Church

Much like the early Catholic Church: a **pontiff**, **cardinals**, **monastic orders**, parish priests, **relics** in reliquaries, **pilgrimages** to saints' shrines, and **indulgences** bought against sin. It keeps the calendar, the schools and most of the hospitals. It is the largest landholder after the crown, and it feels no need to say so.

* **The Inquisition** hunts witches and unsanctioned magic. Its officers are lawyers and confessors first. A summons from them is rarely the end of the story, and rarely a good start.
* **The Order of the Vault** keeps captured monsters in the **Undervaults**, beneath the capital, **Aubrecht**, to study them. Its brothers are scholars with strong stomachs. Little of what they learn is published.

### Magic

Magic is **forbidden and dangerous**. The Church holds that using it tempts **the Horror**, which takes many forms: some say a hunger, some a stranger in a familiar face, some a quiet that follows a person home. Sanctioned rites are another matter, the Church says, and the difference is a matter of ordination.

### The land

**Nobles** hold the civilised heartlands, inside the **consecrated boundaries**: marked by **wayshrines** at the crossroads and **boundary stones** along the fields. Within them there are roads, tithes, courts and market days.

Beyond lie the **Unhallowed lands**: wild, unexplored, and full of **ruins from before the Binding**. Few go. Fewer return with the same number of friends.

### Monsters

Monsters are **hunted**, or **captured and kept below the city**. Common folk name them for what they are seen to do (see the Naming guide), not for what scholars would call them.

---

## PART 2: GM ONLY

**Never appears anywhere the site serves, in page source, in the table's text, or in anything sent to players. Do not hint at it.**

* **The sacraments are the original binding rites.** The Church's miracles and forbidden magic are **the same power**, drawn from what lies bound beneath the world.
* **Every use, sanctioned or not, weakens the bindings.**
* **The bindings are failing.**

### Guarded phrases

The check reads this list. If one of these appears (any capitalisation or spacing) in `site/`, `content/` or `netlify/functions/`, the tests fail. Add a phrase here whenever you write another way of saying the secret in a document; remove none.

- `original binding rites`
- `sacraments are the original`
- `are the same power`
- `is the same power`
- `drawn from what lies bound`
- `what lies bound beneath`
- `weakens the bindings`
- `weaken the bindings`
- `weakening the bindings`
- `bindings are failing`
- `bindings are breaking`
- `bindings are weakening`
- `church miracles and forbidden magic`
- `miracles and magic are the same`

*(The word "binding" on its own is fine: the public history is about the Binding. The secret is the connection between the sacraments, magic and the failing of the bindings.)*

---

## NAMING GUIDE

Use this for **all new names** from now on.

### People

Medieval and Renaissance European, with **saints' names** and **Latin-touched clerical names**. A given name, a short surname or a place or devotion.

* Examples: **Brother Anselm Vey**, **Cardinal Ottoline Marrow**, **Sister Agathe of the Seventh Bell**.
* Given names: Anselm, Agathe, Benedikt, Cordula, Dunstan, Eulalia, Faustin, Gisela, Hildreth, Ignatia, Jorun, Konrad, Lucan, Mathilde, Nikolas, Odo, Perpetua, Rainald, Severin, Theodric, Ursel, Valentin, Wulfram.
* Surnames: Vey, Marrow, Thorne, Ashby, Greave, Holloway, Sallow, Tarn, Vesper, Wick, Crane, Dray, Mourne, Pell.
* Clerical forms: Brother, Sister, Father, Mother (of a house), Prior, Abbot, Abbess, Canon, Deacon, Cardinal, Inquisitor, "of the Seventh Bell", "of Saint Aubrel's", "the Penitent".
* Common folk: a trade or a feature (Tilda the Ratcatcher, Old Wick, Hob Sallow).

### Places

* **Heartlands:** weathered **English or Germanic** names. Examples: **Grimsby Fold**, **Hollowmere**, **Saint Aubrel's Cross**. Patterns: -by, -fold, -mere, -wick, -holt, -stead, -ford, -barrow, "Saint ___'s Cross", "Upper/Nether ___". The capital is **Aubrecht**.
* **The Unhallowed lands and pre-Binding ruins:** **older, stranger names** that sound like they outlived their language, with odd consonants and no obvious meaning. Examples to extend from: Ithren Veil, the Dun of Orrath, Kesh-Umbra, Vael Orrun. Keep them rare and unexplained: nobody on the surface can say what they meant.
* Boundary furniture: wayshrines, boundary stones, tithe barns, hospices, ossuaries, bell towers.

### Items and relics

**Devotional and grim.** A thing a pilgrim, a warden or a penitent would carry, named for its use or its saint.

* Examples: **the Warden's Bell**, **the Thorned Reliquary**, **a Penitent's Blade**.
* More: a Salt-Wax Candle, the Vigil Lantern, Saint Dunstan's Rib (a relic), a Pilgrim's Staff, a Censer of the Second Hour, a Confessor's Key, an Indulgence (sealed, with a stranger's name on it), the Cord of Quiet Hours.

### Grimoires

**Forbidden-sounding scripture.** A psalter, canticle, litany, lectionary or "Book of ___".

* Examples: **the Ashen Psalter**, **the Unsealed Canticles**, **the Book of Quiet Mouths**.
* More: the Litany of Low Doors, the Cinder Lectionary, the Seventh Penance.

### Monsters

**What the common folk call them**: plain, a little frightened, named for place, habit or the unfortunate thing they used to be.

* Examples: **Pit Ghoul**, **Drowned Acolyte**, **Stair Wraith**.
* More: Bell-Ringer, Crossroads Hound, Gaunt Penitent, Salt Hag, Candle-Eater, Mere Widow, Chapel Rat.
* Scholars of the Order of the Vault may use Latin names in the Undervault ledgers. Common folk never do.

### Never

* Names, places or text from other games, books or films.
* The Part 2 secret, or a hint of it.
* Renaming a game mechanic or rules term.
