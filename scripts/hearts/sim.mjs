/* A small model of play for the Hearts prototype, used to sanity-check the numbers. It is a crude policy, not a player: everyone is within reach of everyone,
   heroes act in a fixed order and follow simple rules. It shows whether the arithmetic hangs together. It is NOT evidence that the game is balanced or fun. */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

export function load(seed = 1) {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL('../../site/sheet/gear.js', import.meta.url), 'utf8'), ctx);
  for (const f of ['data.js', 'fx.js', 'engine.js']) vm.runInContext(readFileSync(new URL('../../site/game/' + f, import.meta.url), 'utf8'), ctx);
  let s = seed >>> 0;
  const rng = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const D = ctx.window.HEARTS_DATA, E = ctx.window.HeartsEngine(D, rng);
  return { D, E, rng, reseed: (n) => { s = n >>> 0; } };
}

/* How a hero chooses. Returns the plan for this hero's Action. */
function plan(E, h, party, foes, horror, opt) {
  const down = party.find((x) => x.dying && !x.dead);
  const has = (id) => E.has(h, id);
  const standing = (x) => !x.dead && !x.dying && !x.stable && x.hp > 0;
  const canMend = () => has('litany') && party.some((x) => !x.dead && x.hp > 0 && x.hp <= x.max * 0.4 && !x.healed.mend);
  if (down && down !== h && (down.dying.count <= 2 || !party.some((x) => x !== h && standing(x) && x !== down && opt.otherTends))) return { k: 'tend', who: down };
  if (canMend()) return { k: 'spell', spell: 'mend', who: party.filter((x) => !x.dead && x.hp > 0 && x.hp <= x.max * 0.4 && !x.healed.mend).sort((a, b) => a.hp - b.hp)[0] };
  if (has('bandages') && party.some((x) => !x.dead && x.hp > 0 && x.hp <= x.max * 0.4 && !x.healed.bandage)) return { k: 'bandage', who: party.filter((x) => !x.dead && x.hp > 0 && x.hp <= x.max * 0.4 && !x.healed.bandage)[0] };
  const budget = opt.horrorBudget == null ? 99 : opt.horrorBudget;
  if (has('dust') && horror.pos + 2 <= budget && foes.length) return { k: 'spell', spell: 'unmake' };
  if (has('embers') && horror.pos + 1 <= budget && foes.length) return { k: 'spell', spell: 'ember' };
  if (has('blade') && horror.pos + 1 <= budget) return { k: 'weapon', item: 'blade' };
  const w = ['billhook', 'crossbow', 'spear', 'hatchet', 'cudgel'].find(has);
  return { k: 'weapon', item: w || 'fists' };
}

/* One fight. Returns what happened. */
export function fight(env, party, foeDefs, scene, horror, opt = {}) {
  const { E, D, rng } = env;
  const foes = foeDefs.map((id) => { const e = E.enemy(id); return { def: e, hp: e.hearts * E.HEART, name: e.name }; });
  let rounds = 0, downs = 0, pushes = 0, dmgTaken = 0, horrorGained = 0, strain = 0;
  const start = party.map((c) => c.hp);
  const pay = (h, cost) => { const r = E.raise(horror, cost); horrorGained += r.applied; if (r.strain) { strain += r.strain; E.hurt(h, r.strain); } return r; };
  foes.forEach((f) => { f.tags = []; });
  while (foes.some((f) => f.hp > 0) && party.some((c) => !c.dead && !c.dying && !c.stable && c.hp > 0) && rounds < 30) {
    rounds++;
    for (const h of party) {
      if (h.dead || h.dying || h.stable || h.hp <= 0) continue;
      let actions = 1; if (opt.pushProb && rng() < opt.pushProb && E.canUseMagic(horror)) { actions = 2; const r = pay(h, E.cost(horror, 1)); pushes++; }
      for (let a = 0; a < actions; a++) {
        const live = foes.filter((f) => f.hp > 0); if (!live.length) break;
        const p = plan(E, h, party, live, horror, opt);
        const tn = E.tn(scene);
        if (p.k === 'tend') { const ch = E.check(E.modifier(h.scores.WIS, 0), E.tn(scene, 'easy')); E.tend(p.who, ch); continue; }
        if (p.k === 'bandage') { const ch = E.check(E.modifier(h.scores.WIS, 0), tn); if (ch.success) E.heal(p.who, E.d(6), false, 'bandage'); continue; }
        if (p.k === 'spell') {
          const sp = E.spell(p.spell);
          const t = sp.heal ? p.who : live.sort((x, y) => x.hp - y.hp)[0];
          const r = E.use({ horror, scene, turn: null }, h, sp.from, sp.id, { target: t });
          if (r.cost) horrorGained += r.horror ? r.horror.applied : 0; if (r.horror && r.horror.strain) strain += r.horror.strain;
          continue;
        }
        const t = live.sort((x, y) => x.hp - y.hp)[0];
        if (p.item === 'fists') { const ch = E.check(E.modifier(h.scores.STR, 0), tn); if (ch.success) t.hp -= E.effort(E.effortAgainst(4, t.def, 'weapon'), ch.crit).total; continue; }
        const r = E.use({ horror, scene, turn: null }, h, p.item, '', { target: t });
        if (r.horror) { horrorGained += r.horror.applied; if (r.horror.strain) strain += r.horror.strain; }
      }
    }
    /* the foes */
    for (const f of foes) {
      if (f.hp <= 0) continue;
      for (let a = 0; a < (f.def.attacks || 1); a++) {
        const standing = party.filter((c) => !c.dead && !c.dying && !c.stable && c.hp > 0);
        const pool = standing.length ? standing : party.filter((c) => c.dying && !c.dead);
        if (!pool.length) break;
        const tgt = pool[Math.floor(rng() * pool.length)];
        const ch = E.foeAttack(tgt, f.def.defend, scene);
        if (!ch.hit) continue;
        const dmg = E.effort(f.def.effort).total;
        const was = tgt.hp, r = E.hurt(tgt, dmg); dmgTaken += Math.min(was, dmg);
        if (r.fell) downs++;
      }
    }
    E.endRound(party);
  }
  const won = !foes.some((f) => f.hp > 0);
  E.endScene(party);
  return { won, rounds, downs, pushes, dmgTaken, horrorGained, strain, lost: start.reduce((a, s, i) => a + (s - party[i].hp), 0), maxTotal: party.reduce((a, c) => a + c.max, 0), deaths: party.filter((c) => c.dead).length };
}

export function makeParty(env, ids) { return ids.map((id) => env.E.newCharacter(env.D.CHARACTERS.find((c) => c.id === id))); }
