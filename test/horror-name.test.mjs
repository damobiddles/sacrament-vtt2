// The looming horror is called the Horror everywhere (the rules, the table, the sheet, the site and the lore). "The Hollow" no longer means it.
// Not caught on purpose: names that merely contain the word, such as the Hollow Bishop (a foe), Hollowmere (a place), Holloway (a surname), and the old-rules items in site/legacy.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'test-results', 'playwright-report', 'legacy', 'inventory', '.vtt-data', '.vtt-data-e2e']);
const SELF = path.join('test', 'horror-name.test.mjs');
const OLD = /\b[Tt]he Hollow\b(?! (Bishop|Saint|Crown))|\b[Tt]empts? the Hollow\b|\btempting the Hollow\b/;

function* files(dir) {
  for (const f of readdirSync(dir)) {
    const full = path.join(dir, f); if (SKIP_DIRS.has(f)) continue;
    const st = statSync(full); if (st.isDirectory()) { yield* files(full); continue; }
    if (/\.(js|mjs|cjs|md|html|json|css|txt|toml)$/.test(f)) yield full;
  }
}

test('"the Hollow" is not used for the horror anywhere in the project', () => {
  const found = [];
  for (const f of files(root)) {
    const rel = path.relative(root, f); if (rel === SELF) continue;
    readFileSync(f, 'utf8').split('\n').forEach((line, i) => { if (OLD.test(line)) found.push(rel + ':' + (i + 1) + '  ' + line.trim().slice(0, 110)); });
  }
  assert.deepEqual(found, [], 'still says the Hollow:\n' + found.join('\n'));
});

test('the sheet and the table say Tempts the Horror', async () => {
  await import('../site/vtt/rules.js'); await import('../site/sheet/gear.js'); await import('../site/sheet/sheet-core.js');
  const sheet = readFileSync(path.join(root, 'site/sheet/sheet.js'), 'utf8'), table = readFileSync(path.join(root, 'site/vtt/vtt.js'), 'utf8');
  assert.match(sheet, /C\.horrorText/); assert.match(globalThis.SacramentSheetCore.horrorText({temptsHorror:true,horror:1}), /Tempts the Horror/); assert.match(table, /Tempts the Horror/);
  const G = globalThis.SACRAMENT_GEAR;
  assert.ok([...G.items, ...G.relics, ...G.grimoires, ...G.found, ...G.spells].some((i) => i.temptsHorror === true), 'the data still carries the temptsHorror flag');
});
