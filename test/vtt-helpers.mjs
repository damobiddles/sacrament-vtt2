import { makeService, memoryStore } from '../netlify/functions/_shared/vtt-service.mjs';

/* A table in a memory store, and a way to speak as the GM or as a player. `dice` is a queue of results the server will roll (in order); when it is empty
   the dice are middling.
   The sample heroes carry the gear their descriptions name; most tests count a hero's gear from nothing, so it is taken off unless `gear` is true. */
export async function table({ dice = null, store = memoryStore(), gear = false } = {}) {
  const q = (dice || []).slice(); let clock = 1000;
  const rng = dice ? () => (q.length ? q.shift() : 0.5) : null;   /* with no dice given the server's own, seeded, dice are used */
  const svc = makeService({ store, rng, now: () => ++clock });
  const made = await svc.handle({ method: 'POST', body: { op: 'create' } });
  const code = made.body.code;
  if (!gear) { const room = await store.get(code); Object.values(room.data.chars).forEach((ch) => { ch.gear = []; }); await store.put(code, room.data, room.etag); }
  const who = (token) => ({
    token,
    /* each call is, by default, a new client's first command; give { client, n } to send as one client in order */
    cmd: (cmd, extra = {}) => svc.handle({ method: 'POST', body: { op: 'cmd', code, cmd: Object.assign({ actionId: (extra.client || 'k' + Math.random().toString(36).slice(2, 12)) + '.' + (extra.n || 1) }, cmd) }, token }),
    get: (since) => svc.handle({ method: 'GET', query: { code, since }, token })
  });
  const gm = who(made.body.token); const join = async (name) => { const j = await svc.handle({ method: 'POST', body: { op: 'join', code, name } }); const p = who(j.body.token); p.pid = j.body.pid; return p; };
  const queue = (...v) => q.push(...v);
  return { svc, code, gm, join, queue, state: async () => (await gm.get()).body.state };
}
export const d20 = (n) => (n - 0.5) / 20, die = (n, sides) => (n - 0.5) / sides;
export const find = (st, name) => Object.values(st.cards).find((c) => c.name === name);
export const charNamed = (st, name) => Object.values(st.chars).find((c) => c.name === name);

