# Sacrament: Hearts

A simpler Sacrament, with the Looming Horror folded in: the rules the site now runs on. These are the design notes behind them. The rules are a draft for a first human playtest.

| Read | What it is |
|---|---|
| [`00-audit.md`](00-audit.md) | What the existing project has, what is kept, what conflicts, what was left alone. |
| [`01-rules.md`](01-rules.md) | The core rules reference (draft v0.1). |
| [`02-library.md`](02-library.md) | The starter library, the foes, how to make a hero and four ready-to-play heroes. Generated from the data. |
| [`03-adventure.md`](03-adventure.md) | *The Drowned Reliquary of Saint Odrin*: a one-session adventure that tests combat, exploration, a Hearts obstacle, magic, pushing, recovery and the Horror. |
| [`validation.md`](validation.md) | The arithmetic and a crude simulation, with what they do not show. |

## The pages

- `/rules/` the rules, with the tables drawn from the live data
- `/character/` the hero sheet and maker (the four ready heroes; ten slots)
- `/play/` the live table; `/play/local/` the same on one device
- `/legacy/` characters from the earlier rules, read only, with a conversion

## Checks

```
npm test                          # includes test/hearts.test.mjs
node scripts/hearts/validate.mjs  # writes validation.md
node scripts/hearts/docs.mjs      # writes 02-library.md
node scripts/hearts/ui-test.cjs   # drives the rules, hero sheet, one-device table and legacy pages in a browser
node scripts/table-test/run.cjs   # the live table, against a stand-in for Firestore
```
