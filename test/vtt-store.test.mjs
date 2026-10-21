import test from 'node:test';
import assert from 'node:assert/strict';
import { blobStore } from '../netlify/functions/vtt.mjs';
import { makeService } from '../netlify/functions/_shared/vtt-service.mjs';
import { fileStore } from '../scripts/vtt/server.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/* A stand-in for a Netlify Blobs store with the same conditional-write behaviour (onlyIfNew, onlyIfMatch return modified:false when the condition fails). The real
   service could not be reached from the build environment, so this checks our use of the interface, not Netlify itself. */
function fakeBlobs() {
  const m = new Map(); let n = 0;
  return {
    async getWithMetadata(key) { const r = m.get(key); return r ? { data: JSON.parse(r.json), etag: r.etag, metadata: {} } : null; },
    async setJSON(key, value, opts = {}) {
      const r = m.get(key);
      if (opts.onlyIfNew && r) return { modified: false };
      if (opts.onlyIfMatch !== undefined && (!r || r.etag !== opts.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n); m.set(key, { json: JSON.stringify(value), etag }); return { modified: true, etag };
    }
  };
}

test('the Blobs adapter creates only if new and saves only if the room is unchanged since it was read', async () => {
  const s = blobStore(async () => fakeBlobs());
  assert.equal(await s.get('AAAAAA'), null);
  assert.equal(await s.put('AAAAAA', { v: 1 }, null), true); assert.equal(await s.put('AAAAAA', { v: 9 }, null), false, 'a second create is refused');
  const a = await s.get('AAAAAA'); assert.deepEqual(a.data, { v: 1 });
  assert.equal(await s.put('AAAAAA', { v: 2 }, a.etag), true); assert.equal(await s.put('AAAAAA', { v: 3 }, a.etag), false, 'a stale save is refused');
  assert.deepEqual((await s.get('AAAAAA')).data, { v: 2 });
});

for (const [name, mkStore] of [['Blobs adapter', () => blobStore(async () => fakeBlobs())], ['file store', () => fileStore(mkdtempSync(join(tmpdir(), 'vttt-')))]]) {
  test('the whole service works the same on the ' + name + ', including many people at once', async () => {
    const svc = makeService({ store: mkStore() });
    const made = await svc.handle({ method: 'POST', body: { op: 'create' } }); const code = made.body.code, gmT = made.body.token;
    const cmd = (c) => svc.handle({ method: 'POST', body: { op: 'cmd', code, cmd: c }, token: gmT });
    const st = made.body.state, ghoul = Object.values(st.cards).find((c) => c.name === 'Pit Ghoul');
    const rs = await Promise.all([...Array(12)].map(() => cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1, actionId: 'x' + Math.random().toString(36).slice(2, 12) + '.1' })));
    assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join());
    assert.equal((await svc.handle({ method: 'GET', query: { code }, token: gmT })).body.state.cards[ghoul.id].hp.cur, 8);
    const again = await Promise.all([cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -3, actionId: 'sameclient1.1' }), cmd({ type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -3, actionId: 'sameclient1.1' })]);
    assert.ok(again.every((r) => r.status === 200)); assert.equal((await svc.handle({ method: 'GET', query: { code }, token: gmT })).body.state.cards[ghoul.id].hp.cur, 5);
  });
}

test('a table can be made only with the key, when one is set', async () => {
  const svc = makeService({ store: blobStore(async () => fakeBlobs()), createKey: 'sesame' });
  assert.equal((await svc.handle({ method: 'POST', body: { op: 'create' } })).status, 403); assert.equal((await svc.handle({ method: 'POST', body: { op: 'create', key: 'nope' } })).status, 403);
  assert.equal((await svc.handle({ method: 'POST', body: { op: 'create', key: 'sesame' } })).status, 200);
});
