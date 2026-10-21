/* The sample heroes carry the gear their descriptions name. The long walk-throughs (e2e.cjs, flow.cjs) are about the core turn, with plain stat rolls,
   so they empty every pack first, as the GM, through the table's own sheet command (what the sheet's Drop button sends). Gives up after 15 seconds. */
module.exports = async function emptyPacks(gm) {
  const work = gm.evaluate(async () => {
    const s = window.__vtt.state(), key = Object.keys(localStorage).find((k) => k.endsWith(s.code) && !k.includes('join-'));
    const token = JSON.parse(localStorage.getItem(key)).token, client = 'emptypk' + Math.random().toString(36).slice(2, 8); let n = 0;
    for (const ch of Object.values(s.chars)) for (let i = (ch.gear || []).length - 1; i >= 0; i--) {
      const r = await fetch('/.netlify/functions/vtt', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + token },
        body: JSON.stringify({ op: 'cmd', code: s.code, cmd: { actionId: client + '.' + (++n), type: 'sheet', charId: ch.id, op: { op: 'remove', index: i, gearKey: ch.gear[i].key } } }) });
      if (r.status !== 200) throw new Error('could not empty ' + ch.name + '’s pack: ' + r.status);
    }
  });
  let timer; const limit = new Promise((_, no) => { timer = setTimeout(() => no(new Error('STUCK for 15s: emptying the sample heroes’ packs')), 15000); });
  await Promise.race([work, limit]).finally(() => clearTimeout(timer));
  await gm.waitForFunction(() => Object.values(window.__vtt.state().chars).every((c) => !(c.gear || []).length), null, { timeout: 10000 });
};
