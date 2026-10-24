import { esc } from './markdown.mjs';

const kinds = { weapon: 'Weapons', armour: 'Armour and shields', supply: 'Supplies, tools and curios', relic: 'Relics', grimoire: 'Grimoires' };
const effortName = k => ({ basic: 'Basic', weapons: 'Weapons', guns: 'Guns and gunpowder', magic: 'Magic', ultimate: 'Ultimate' })[k] || k;
const range = r => r[0] === r[1] ? String(r[0]) : r.join('–');
const effect = s => s.effect === 'healing' || s.heal ? 'Healing' : s.effect === 'esoteric' || !s.cat ? 'Esoteric effect' : 'Damage';
const cost = s => s.temptsHorror ? 'Horror +' + esc(s.horror || 0) + '. ' + esc(s.horrorReason || 'Using supernatural power tempts the Horror.') : 'No Horror cost';

// Only the public catalogue is accepted here. Private GM loot notes are never imported.
export function lootCatalogue(g) {
  const items = [...g.items, ...g.relics, ...g.grimoires, ...(g.found || [])];
  const spells = new Map(g.spells.map(s => [s.id, s]));
  const tables = [{ id: 'd100', name: 'Main loot table', die: 100 }, ...(g.tables || [])];
  const rolls = tables.map(t => {
    const rows = items.filter(i => i.loot && (i.table || 'd100') === t.id).map(i => ({ n: i.loot, html: `<a href="#item-${esc(i.id)}">${esc(i.name)}</a>` }));
    for (const sub of g.tables || []) if ((sub.on || 'd100') === t.id) rows.push({ n: sub.loot, html: `<a href="#table-${esc(sub.id)}">${esc(sub.name)} — roll d${sub.die}</a>` });
    rows.sort((a, b) => a.n[0] - b.n[0]);
    return `<section id="table-${esc(t.id)}"><h2>${esc(t.name)} · d${t.die}</h2><table class="loot-rolls"><thead><tr><th scope="col">Roll</th><th scope="col">Result</th></tr></thead><tbody>${rows.map(r => `<tr><th scope="row">${range(r.n)}</th><td>${r.html}</td></tr>`).join('')}</tbody></table></section>`;
  }).join('');
  const list = Object.entries(kinds).map(([kind, title]) => `<section id="loot-${kind}"><h2>${title}</h2>${items.filter(i => i.kind === kind).map(i => {
    const details = [`${i.slots} ${i.slots === 1 ? 'slot' : 'slots'}`, i.use || 'GM resolves use'];
    if (kind !== 'grimoire') {
      if (i.weaponStyle) details.push(i.weaponStyle === 'single' ? 'One hand' : 'Two hands');
      if (i.weaponStyle === 'heavy' && i.cat === 'weapons') details.push('+2 heavy damage');
      if (i.armourPart) details.push(i.armourPart === 'body' ? 'Body armour' : i.armourPart === 'head' ? 'Helmet' : 'Shield');
      if (i.roll) details.push(i.roll + ' check');
      if (i.cat) details.push('Damage: ' + effortName(i.cat) + ' Effort' + (i.effort ? ' d' + i.effort : ' (table die)'));
      if (i.defence) details.push('Defence +' + i.defence);
      if (i.hearts) details.push('Hearts +' + i.hearts);
      if (i.uses) details.push(i.uses + ' uses');
      if (i.temptsHorror) details.push('Horror +' + i.horror + '. ' + i.horrorReason);
    }
    const spellList = kind === 'grimoire' ? `<ul class="loot-spells">${i.spells.map(id => {
      const s = spells.get(id);
      return `<li><h4>${esc(s.name)} <span class="loot-effect">${effect(s)}</span></h4><p>${esc(s.does)}</p><p class="small">${s.roll ? esc(s.roll) + ' check' : 'No check'}${s.cat ? ' · ' + esc(effortName(s.cat)) + ' Effort d' + s.effort : s.heal ? ' · Healing d' + s.effort + ' (table applies)' : ''} · ${esc(s.band || 'GM decides range')} · ${cost(s)}</p></li>`;
    }).join('')}</ul>` : '';
    return `<article class="loot-entry" id="item-${esc(i.id)}"><h3>${esc(i.name)}</h3><p class="small">${esc(details.join(' · '))}</p>${i.flavour ? '<p><i>' + esc(i.flavour) + '</i></p>' : ''}${i.does ? '<p>' + esc(i.does) + '</p>' : '<p class="small">No additional mechanical effect is defined. The GM decides how this find is used.</p>'}${spellList}</article>`;
  }).join('')}</section>`).join('');
  return `<section id="loot-roller" class="loot-roller" aria-labelledby="loot-roller-title" hidden><h2 id="loot-roller-title">What did you find?</h2><p>Try a random find from the current loot tables.</p><button class="btn" type="button">Roll loot</button><div id="loot-result" role="status" aria-live="polite" aria-atomic="true"></div></section><noscript><p>Enable JavaScript to try the loot roller, or use the roll tables below.</p></noscript><script defer src="/vtt/rules.js"></script><script defer src="/sheet/gear.js"></script><script defer src="/sheet/sheet-core.js"></script><script defer src="/loot-roller.js"></script><nav class="loot-jumps" aria-label="Loot sections"><p><b>Roll tables</b><br>${tables.map(t => `<a href="#table-${esc(t.id)}">${esc(t.name)} (d${t.die})</a>`).join(' · ')}</p><p><b>Item catalogue</b><br>${Object.entries(kinds).map(([k, v]) => `<a href="#loot-${k}">${k === 'grimoire' ? 'Grimoires and spells' : v}</a>`).join(' · ')}</p></nav><p>${items.length} catalogue items · ${items.filter(i => i.kind === 'grimoire').length} grimoires · ${g.spells.length} different spells.</p>${rolls}${list}`;
}
