// Regenerate the reviewed first free scene. Deliberate publication snapshot, not a live-table backup.
import fs from 'node:fs';import {createHash} from 'node:crypto';
import {emptyState} from '../netlify/functions/_shared/vtt-core.mjs';
import {addSample} from '../netlify/functions/_shared/vtt-sample.mjs';
import {exportScene} from '../netlify/functions/_shared/vtt-scene-pack.mjs';
const s=emptyState('EXAMPLE',0,'build-only-not-a-table');addSample(s,{now:0,rng:()=>.5});
const p=exportScene(s,'sc1'),assets=[];
p.manifest.instructions='The Pit Ghoul guards an iron-banded gate. The gate needs 20 Effort to clear. Imported enemies start at full HP and timers are paused. Start the four-round roof countdown when the party enters danger. When it reaches zero, describe the collapse and resolve the consequences using your normal rules: the timer does not apply damage automatically. Choose your own party and rewards. Change the encounter to fit your game.';
for(const image of p.sources){const bytes=fs.readFileSync(new URL('../site'+image.src,import.meta.url));globalThis.SacramentScenePack.dimensions(bytes,'image/webp');p.manifest.images.push({ref:image.ref,mime:'image/webp',size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});assets.push({ref:image.ref,data:bytes.toString('base64')});}
const file={manifest:p.manifest,assets};globalThis.SacramentScenePack.file(file);
fs.mkdirSync(new URL('../site/downloads/scenes/',import.meta.url),{recursive:true});fs.writeFileSync(new URL('../site/downloads/scenes/the-sealed-gate.sacrament-scene',import.meta.url),JSON.stringify(file));
console.log('Built the reviewed Sealed Gate scene: '+file.manifest.cards.length+' cards, no heroes or loot.');
