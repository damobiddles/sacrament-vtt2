// The VTT's storage adapter, and the existing builder and node library, run over the REAL installed @netlify/blobs client. Only the network is replaced: a small
// HTTP stand-in that follows the client's documented protocol (the API's signed-URL step, then reads and conditional writes with If-Match / If-None-Match and ETags,
// 412 when a condition fails; or the edge URLs used inside a function). This checks how WE use the installed client. It does not check Netlify's service.
import test from 'node:test';
import assert from 'node:assert/strict';
import { getStore } from '@netlify/blobs';
import { blobStore, makeHandler } from '../netlify/functions/vtt.mjs';
import { makeService } from '../netlify/functions/_shared/vtt-service.mjs';
import { writeFileSync, existsSync } from 'node:fs';

const gen = new URL('../netlify/functions/builder-page.mjs', import.meta.url);
if (!existsSync(gen)) writeFileSync(gen, 'export default "<title>Sacrament Node Builder</title>";\n');

function mockNetwork() {
  const objects = new Map(); let n = 0; const log = []; const net = { failWrites: 0 };
  const respond = (status, body, headers = {}) => new Response(body == null ? null : typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body), { status, headers });
  const fetchImpl = async (url, opts = {}) => {
    const u = new URL(String(url)), method = (opts.method || 'GET').toUpperCase(), h = Object.fromEntries(Object.entries(opts.headers || {}).map(([k, v]) => [k.toLowerCase(), v]));
    log.push({ method, host: u.host, path: u.pathname, h });
    if (net.validToken && u.host === 'mock.api' && h.authorization !== 'Bearer ' + net.validToken) return respond(401, 'Failed to decode token: Token expired');   /* a token that has been replaced is refused */
    if (u.host === 'mock.api' && /signed-url/.test(h.accept || '')) return respond(200, { url: 'https://signed.mock/' + u.pathname.replace('/api/v1/blobs/', '') }); /* the signed-URL step */
    const key = u.host === 'mock.api' ? u.pathname.replace('/api/v1/blobs/', '') : u.pathname.replace(/^\/(region:[^/]+\/)?/, '');
    const cur = objects.get(key);
    if (method === 'GET') return cur ? respond(200, cur.body, { etag: cur.etag, 'content-type': 'application/json' }) : respond(404, null);
    if (method === 'DELETE') { objects.delete(key); return respond(204, null); }
    if (method === 'PUT') {
      if (h['if-none-match'] === '*' && cur) return respond(412, null);
      if (h['if-match'] !== undefined && (!cur || cur.etag !== h['if-match'])) return respond(412, null);
      if (net.failWrites > 0) { net.failWrites--; return respond(400, 'refused'); }   /* a conditional write that fails for another reason */
      const etag = '"' + (++n) + '"'; const raw = opts.body; objects.set(key, { body: raw instanceof ArrayBuffer ? Buffer.from(raw) : raw instanceof Uint8Array ? Buffer.from(raw) : String(raw), etag }); return respond(200, null, { etag });
    }
    return respond(405, null);
  };
  return Object.assign(net, { fetchImpl, objects, log });
}
const apiStore = (net, name = 'icrpg-vtt') => getStore({ name, siteID: 'site1', token: 'tok', apiURL: 'https://mock.api', fetch: net.fetchImpl, consistency: 'strong' });
const getStoreWithToken = (net, token) => getStore({ name: 'icrpg-vtt', siteID: 'site1', token, apiURL: 'https://mock.api', fetch: net.fetchImpl, consistency: 'strong' });
const edgeStore = (net, extra = {}) => getStore({ name: 'icrpg-vtt', siteID: 'site1', token: 'tok', edgeURL: 'https://edge.mock', fetch: net.fetchImpl, ...extra });

test('over the real client: create only if new, save only if unchanged, and the etag is what the client hands back', async () => {
  const net = mockNetwork(), s = blobStore(async () => apiStore(net));
  assert.equal(await s.get('AAAAAA'), null);
  assert.equal(await s.put('AAAAAA', { v: 1 }, null), true); assert.equal(await s.put('AAAAAA', { v: 9 }, null), false, 'a second create is refused (If-None-Match: *)');
  const a = await s.get('AAAAAA'); assert.deepEqual(a.data, { v: 1 }); assert.ok(a.etag);
  assert.equal(await s.put('AAAAAA', { v: 2 }, a.etag), true); assert.equal(await s.put('AAAAAA', { v: 3 }, a.etag), false, 'a stale save is refused (If-Match)');
  assert.deepEqual((await s.get('AAAAAA')).data, { v: 2 });
  const puts = net.log.filter((l) => l.method === 'PUT'); assert.ok(puts.some((p) => p.h['if-none-match'] === '*') && puts.some((p) => p.h['if-match']), 'the conditions went out as headers');
});

test('a conditional write that fails for any reason other than the condition is NOT taken as saved (the client alone would call it modified)', async () => {
  const net = mockNetwork(), s = blobStore(async () => apiStore(net)); await s.put('CCCCCC', { v: 1 }, null);
  const c = await s.get('CCCCCC');
  net.failWrites = 1; const raw = await apiStore(net).setJSON('room-CCCCCC', { v: 7 }, { onlyIfMatch: c.etag });
  assert.equal(raw.modified, true); assert.equal(raw.etag, '', 'the client alone says modified, with no etag: the trap');
  net.failWrites = 1; assert.equal(await s.put('CCCCCC', { v: 2 }, c.etag), false, 'our adapter takes an empty etag as not saved, so the command is simply run again');
  assert.deepEqual((await s.get('CCCCCC')).data, { v: 1 }); assert.equal(await s.put('CCCCCC', { v: 2 }, c.etag), true);
});

test('inside a function (edge URLs): a strong read needs an uncached URL; without one we read normally, writes never need it, and the conditional write still protects us', async () => {
  const net = mockNetwork();
  const without = blobStore(async () => edgeStore(net)); await without.put('DDDDDD', { v: 1 }, null);   /* no uncachedEdgeURL: the strong read throws BlobsConsistencyError */
  assert.deepEqual((await without.get('DDDDDD')).data, { v: 1 });
  const withIt = blobStore(async () => edgeStore(net, { uncachedEdgeURL: 'https://uncached.mock' })); assert.deepEqual((await withIt.get('DDDDDD')).data, { v: 1 });
  assert.ok(net.log.some((l) => l.host === 'uncached.mock'), 'a strong read went to the uncached URL');
});

test('the whole VTT service over the real client: a GM and a player, many commands at once, every change once', async () => {
  const net = mockNetwork(), svc = makeService({ store: blobStore(async () => apiStore(net)) });
  const made = await svc.handle({ method: 'POST', body: { op: 'create' } }); const code = made.body.code, gm = made.body.token;
  const j = await svc.handle({ method: 'POST', body: { op: 'join', code, name: 'Ann', joinKey: 'blobs-join-1' } }); assert.equal(j.status, 200);
  const ghoul = Object.values(made.body.state.cards).find((c) => c.name === 'Pit Ghoul');
  const rs = await Promise.all([...Array(8)].map((_, i) => svc.handle({ method: 'POST', body: { op: 'cmd', code, cmd: { type: 'track', id: ghoul.id, field: 'hp', mode: 'delta', value: -1, actionId: 'cl' + i + 'abcdefgh.1' } }, token: gm })));
  assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join());
  assert.equal((await svc.handle({ method: 'GET', query: { code }, token: gm })).body.state.cards[ghoul.id].hp.cur, 12);
  const p = await svc.handle({ method: 'GET', query: { code }, token: j.body.token }); assert.ok(!JSON.stringify(p.body).includes('SECRET'));
});

test('the existing builder still publishes, resets and reads over the real upgraded client', async () => {
  const { handle } = await import('../netlify/functions/builder.mjs'); const net = mockNetwork(); const store = apiStore(net, 'sacrament-library');
  const deps = { passphrase: 'open sesame', getStore: async () => store };
  const login = await handle(new Request('http://x/builder/login', { method: 'POST', body: 'passphrase=open%20sesame', headers: { 'content-type': 'application/x-www-form-urlencoded' } }), deps);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const lib = { nodes: [{ id: 'n1', name: 'Test', type: 'passive', path: 'Test', level: 1 }], edges: [] };
  const pub = await handle(new Request('http://x/builder/publish', { method: 'POST', body: JSON.stringify(lib), headers: { cookie } }), deps); assert.equal(pub.status, 200, await pub.clone().text());
  assert.equal((await store.get('latest', { type: 'json' })).nodes.length, 1);
  const pub2 = await handle(new Request('http://x/builder/publish', { method: 'POST', body: JSON.stringify(lib), headers: { cookie } }), deps); assert.equal(pub2.status, 200);
  assert.ok(await store.get('previous', { type: 'json' }), 'the previous one is kept');
  const reset = await handle(new Request('http://x/builder/publish?reset=1', { method: 'POST', headers: { cookie } }), deps); assert.equal(reset.status, 200);
  assert.equal(await store.get('latest', { type: 'json' }), null);
});

test('the public node library function still reads over the real client, with its context from the environment as Netlify provides it', async () => {
  const net = mockNetwork(); const store = apiStore(net, 'sacrament-library'); await store.setJSON('latest', { nodes: [], edges: [], at: 1 });
  const realFetch = globalThis.fetch; globalThis.fetch = net.fetchImpl; const prevCtx = process.env.NETLIFY_BLOBS_CONTEXT; process.env.NETLIFY_BLOBS_CONTEXT = Buffer.from(JSON.stringify({ siteID: 'site1', token: 'tok', apiURL: 'https://mock.api' })).toString('base64');
  try { const { default: nodes } = await import('../netlify/functions/nodes.mjs'); const r = await nodes(); assert.equal(r.status, 200); assert.equal((await r.json()).at, 1); }
  finally { globalThis.fetch = realFetch; if (prevCtx === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT; else process.env.NETLIFY_BLOBS_CONTEXT = prevCtx; }
});

test('over the real client: an image goes in as bytes and comes back as the same bytes, and the service serves it', async () => {
  const net = mockNetwork(), s = blobStore(async () => apiStore(net)), svc = makeService({ store: s });
  const made = await svc.handle({ method: 'POST', body: { op: 'create' } });
  const bytes = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(Array.from({ length: 600 }, (_, i) => (i * 37) % 256))]);
  const r = await svc.handle({ method: 'POST', token: made.body.token, body: { op: 'upload', code: made.body.code, data: bytes.toString('base64') } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const got = await svc.image(made.body.code, r.body.id); assert.equal(got.status, 200); assert.equal(got.mime, 'image/png'); assert.deepEqual(Buffer.from(got.bytes), bytes);
});

test('the function makes a store for every request: a token that expires while the function stays warm cannot break later requests', async () => {
  const net = mockNetwork(); let gen = 0;
  const getStore = async () => { gen++; net.validToken = 'tok' + gen; return getStoreWithToken(net, 'tok' + gen); };   /* each new store replaces the one before: older tokens are refused */
  const handler = makeHandler(getStore);
  const call = (method, body, qs = '', token = '') => handler(new Request('https://x.test/.netlify/functions/vtt' + qs, { method, headers: token ? { authorization: 'Bearer ' + token } : {}, body: body ? JSON.stringify(body) : undefined }));
  const made = await (await call('POST', { op: 'create' })).json(); assert.ok(made.ok, JSON.stringify(made));
  for (let i = 0; i < 4; i++) { const r = await call('GET', null, '?code=' + made.code, made.token); assert.equal(r.status, 200, 'request ' + i + ': ' + await r.text()); }
  const cmd = await call('POST', { op: 'cmd', code: made.code, cmd: { type: 'setTarget', value: 13, actionId: 'warmclient1g.1' } }, '', made.token); assert.equal(cmd.status, 200);
  assert.ok(gen >= 6, 'a store was made for each request, not kept (' + gen + ')');
});

test('(the mock really refuses an old token) a store kept across requests fails once its token has been replaced', async () => {
  const net = mockNetwork(); net.validToken = 'tok1'; const kept = blobStore(async () => getStoreWithToken(net, 'tok1'));
  assert.equal(await kept.get('AAAAAA'), null);   /* works while the token is current */
  net.validToken = 'tok2';
  await assert.rejects(() => kept.get('AAAAAA'), /Token expired|internal error|401/i);
});
