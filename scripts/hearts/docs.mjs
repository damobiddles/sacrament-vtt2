/* Writes docs/hearts/02-library.md from the data, so the printed library and the game cannot disagree.  Run: node scripts/hearts/docs.mjs */
import { writeFileSync } from 'node:fs';
import { load } from './sim.mjs';
const { D, E } = load(1);
const L = [];
const KIND = { weapon: 'Weapons', armour: 'Armour and shields', supply: 'Supplies', relic: 'Relics (dangerous: each use adds Horror)', grimoire: 'Grimoires (they hold spells)' };
L.push('# Sacrament: Hearts. The starter library, the ready heroes and the foes', '',
  '*Generated from `site/game/data.js` by `node scripts/hearts/docs.mjs`. Edit the data, not this file.*', '',
  'Every item says how many **slots** it takes (a hero carries ten), when it is **used** (Action, Move, Free, or carried), the **roll** it needs, the **Effort die** it rolls, and the **Horror** it adds each time. What it *lets you do* is the point; the numbers are the smaller part.', '');
for (const kind of ['weapon', 'armour', 'supply', 'relic', 'grimoire']) {
  L.push('## ' + KIND[kind], '', '| Item | Slots | Used | Roll | Effort | Horror | What it lets you do |', '|---|---|---|---|---|---|---|');
  for (const it of D.ITEMS.filter((i) => i.kind === kind)) {
    L.push(`| **${it.name}** | ${it.slots} | ${it.use} | ${it.roll || '—'} | ${it.effort ? 'd' + it.effort : it.defence ? 'Defence +' + it.defence : '—'} | ${it.horror ? '+' + it.horror : '—'} | ${it.does}${it.uses && !/use/.test(it.does) ? ' *(' + it.uses + (it.uses === 1 ? ' use' : ' uses') + ')*' : ''} |`);
  }
  L.push('');
}
L.push('## Spells', '', 'A spell is cast from a grimoire you carry. The Horror is paid when you roll, hit or miss.', '', '| Spell | Book | Roll | Effort | Horror | Reach | What it does |', '|---|---|---|---|---|---|---|');
for (const sp of D.SPELLS) L.push(`| **${sp.name}** | ${E.item(sp.from).name} | ${sp.roll || 'none'} | ${sp.effort ? 'd' + sp.effort : '—'} | +${sp.horror} | ${sp.band} | ${sp.does} |`);
L.push('', '## Foes', '', 'Hearts are 10 points each. A foe rolls its Effort die when its attack gets through your Defence. *Armoured* foes slow plain weapons (§6 of the rules).', '', '| Foe | Hearts | Effort | You defend with | Moves | Notes |', '|---|---|---|---|---|---|');
for (const e of D.ENEMIES) L.push(`| **${e.name}** | ${e.hearts} | d${e.effort}${e.attacks > 1 ? ' ×' + e.attacks : ''} | ${e.defend}${e.armoured ? ' · armoured' : ''}${e.unholy ? ' · unholy' : ''} | ${e.moves} band${e.moves > 1 ? 's' : ''} | ${e.note} |`);
L.push('', '## Making a hero', '',
  '1. **Pick a Calling** for a kit, or build your own: ten slots, no more than three relics and grimoires.',
  '2. **Spend 6 points** on STR, DEX, CON, INT, WIS and CHA (no more than 6 in one), and **4 points of Effort** on Basic, Weapons, Ranged, Magic and Ultimate.',
  '3. **Health** is 1 Heart (10 points), more from gear. **Defence** is your score, plus armour and shield for CON (armour and shield never more than +5; never more than +10 in all).',
  '4. **Write a vow** in one sentence, and a name.', '',
  'That is all. There are no levels and no abilities to learn: what a hero can do is what they carry.', '',
  '## Four ready-to-play heroes', '');
for (const def of D.CHARACTERS) {
  const c = E.newCharacter(def);
  L.push(`### ${def.name}, ${def.calling}`, '', `*${def.vow}*`, '', def.note, '',
    `**${E.SCORES.map((k) => k + ' ' + (def.scores[k] >= 0 ? '+' : '') + def.scores[k]).join(' · ')}** · Effort ${E.CATS.filter((k) => def.effort[k]).map((k) => k + ' +' + def.effort[k]).join(', ')} · ${c.max / 10} Heart${c.max > 10 ? 's' : ''} (${c.max}) · Defence ${E.defence(c, 'CON') >= 0 ? '+' : ''}${E.defence(c, 'CON')} · **${E.slotsUsed(c, 'eq')} equipped, ${E.slotsUsed(c, 'carry')} carried**`, '',
    def.kit.map((id) => `- ${E.item(id).name} (${E.item(id).slots} slot${E.item(id).slots > 1 ? 's' : ''})`).join('\n'), '');
}
writeFileSync(new URL('../../docs/hearts/02-library.md', import.meta.url), L.join('\n') + '\n');
console.log('written docs/hearts/02-library.md');
