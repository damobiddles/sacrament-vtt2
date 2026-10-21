import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, existsSync } from 'node:fs';

// The gate imports the generated page module, so make a stand-in if the build step has not run.
const gen = new URL('../netlify/functions/builder-page.mjs', import.meta.url);
if (!existsSync(gen)) writeFileSync(gen, 'export default "<title>Sacrament Node Builder</title>";\n');
const { handle } = await import('../netlify/functions/builder.mjs');
const mem = new Map();
const fakeStore = { get: async (k) => mem.get(k) || null, setJSON: async (k, v) => { mem.set(k, v); }, delete: async (k) => { mem.delete(k); } };
let deps = { passphrase: 'open sesame ', getStore: async () => fakeStore };
const gate = (req) => handle(req, deps);

const get = (path, cookie) => gate(new Request('http://x' + path, { headers: cookie ? { cookie } : {} }));
const post = (path, body) => gate(new Request('http://x' + path, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } }));

test('without a session the builder shows the sign-in page, not the tool', async () => {
  const r = await get('/builder/');
  assert.equal(r.status, 401);
  const t = await r.text();
  assert.match(t, /Passphrase/);
  assert.doesNotMatch(t, /Sacrament Node Builder/);
});

test('a wrong passphrase is refused and sets no cookie', async () => {
  const r = await post('/builder/login', 'passphrase=nope');
  assert.equal(r.status, 401);
  assert.equal(r.headers.get('set-cookie'), null);
});

test('the right passphrase (ignoring stray spaces) signs in and unlocks the page', async () => {
  const r = await post('/builder/login', 'passphrase=%20open%20sesame');
  assert.equal(r.status, 303);
  const c = r.headers.get('set-cookie');
  assert.match(c, /HttpOnly/); assert.match(c, /Secure/); assert.match(c, /SameSite=Strict/);
  const ok = await get('/builder/', c.split(';')[0]);
  assert.equal(ok.status, 200);
  assert.match(await ok.text(), /Sacrament Node Builder/);
});

test('a forged cookie does not unlock the page', async () => {
  const r = await get('/builder/', 'sac_builder=' + 'a'.repeat(64));
  assert.equal(r.status, 401);
});

test('a session cookie runs out, and one with its time changed is refused', async () => {
  const c = (await post('/builder/login', 'passphrase=open%20sesame')).headers.get('set-cookie').split(';')[0];
  const [name, val] = c.split('='); const [exp, sig] = val.split('.');
  assert.equal((await get('/builder/', c)).status, 200);
  assert.equal((await get('/builder/', name + '=' + (Number(exp) + 100000) + '.' + sig)).status, 401, 'a longer time with the old signature');
  assert.equal((await get('/builder/', name + '=' + (Date.now() - 1000) + '.' + sig)).status, 401, 'a time in the past');
});

test('without GM_PASSPHRASE the builder stays switched off', async () => {
  const keep = deps; deps = { ...deps, passphrase: '' };
  const r = await get('/builder/');
  deps = keep;
  assert.equal(r.status, 503);
});

async function session() {
  const r = await post('/builder/login', 'passphrase=open%20sesame');
  return r.headers.get('set-cookie').split(';')[0];
}
const publish = (cookie, body, q = '') => gate(new Request('http://x/builder/publish' + q, { method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body), headers: cookie ? { cookie } : {} }));
const lib = { nodes: [{ id: 'a1', type: 'action', name: 'Move', cost: 1, innate: true, level: 1, path: 'Common', desc: 'x', x: 5 }, { id: 'a2', type: 'spell', name: 'Bolt', cost: 2, level: 9, risk: 99, desc: '<b>hi</b>', stat: 'Nope' }, { id: 'zz', type: 'wizard', name: 'junk' }], edges: [['a1', 'a2'], ['a2', 'a2'], ['a1', 'missing']] };

test('publishing needs a session', async () => {
  assert.equal((await publish('', lib)).status, 401);
  assert.equal(mem.size, 0);
});

test('publishing keeps only valid abilities and edges, and clamps numbers', async () => {
  const r = await publish(await session(), lib);
  assert.equal(r.status, 200);
  const saved = mem.get('latest');
  assert.deepEqual(saved.nodes.map((n) => n.id), ['a1', 'a2']);
  assert.deepEqual(saved.edges, [['a1', 'a2']]);
  assert.equal(saved.nodes[1].level, 5);
  assert.equal(saved.nodes[1].risk, 5);
  assert.equal(saved.nodes[1].stat, undefined);
  assert.equal(saved.nodes[0].x, undefined);
});

test('a second publish keeps the first as previous, and reset removes the live one', async () => {
  const c = await session();
  await publish(c, { nodes: [{ id: 'n9', type: 'passive', name: 'New' }], edges: [] });
  assert.equal(mem.get('previous').nodes.length, 2);
  assert.equal(mem.get('latest').nodes[0].id, 'n9');
  assert.equal((await publish(c, '', '?reset=1')).status, 200);
  assert.equal(mem.has('latest'), false);
});

test('bad uploads are refused', async () => {
  const c = await session();
  assert.equal((await publish(c, 'not json')).status, 400);
  assert.equal((await publish(c, { nodes: [], edges: [] })).status, 400);
  assert.equal((await publish(c, { nodes: 'x', edges: [] })).status, 400);
});

test('gear tables are published too, and cleaned', async () => {
  const c = await session();
  const items = {
    weapons: [{ id: 'w1', n: 'Sword', t: 9, k: 'ranged', s: 3 }, { id: 'w1', n: 'Duplicate id' }, { id: 'bad id!', n: 'Nope' }],
    armour: [{ id: 'a1', n: 'Coat', w: 'plate' }],
    trinkets: [{ id: 't1', n: 'Ward', c: 2, r: 99, d: 'x' }],
    supplies: [{ id: 's1', n: 'Rations', s: 1 }],
  };
  const r = await publish(c, { nodes: [{ id: 'a1', type: 'action', name: 'Move' }], edges: [], items });
  assert.equal(r.status, 200);
  const saved = mem.get('latest');
  assert.equal(saved.items.weapons.length, 1);
  assert.equal(saved.items.weapons[0].t, 5);
  assert.equal(saved.items.weapons[0].k, 'ranged');
  assert.equal(saved.items.armour[0].w, 'light');
  assert.equal(saved.items.trinkets[0].r, 5);
  assert.equal(saved.wounds, undefined);
});

test('an incomplete gear table is dropped so the built-in gear is used', async () => {
  const c = await session();
  await publish(c, { nodes: [{ id: 'a1', type: 'action', name: 'Move' }], edges: [], items: { weapons: [] } });
  assert.equal(mem.get('latest').items, undefined);
});

test('the heals flag survives for spells, trinkets and supplies but not passives', async () => {
  const c = await session();
  await publish(c, { nodes: [{ id: 'm1', type: 'spell', name: 'Mend', level: 2, heal: true }, { id: 'p1', type: 'passive', name: 'Calm', heal: true }], edges: [],
    items: { weapons: [], armour: [], trinkets: [{ id: 't1', n: 'Bone', heal: true }], supplies: [{ id: 's1', n: 'Bandages', heal: true }, { id: 's2', n: 'Rations' }] } });
  const lib = mem.get('latest');
  assert.equal(lib.nodes.find((n) => n.id === 'm1').heal, true);
  assert.equal(lib.nodes.find((n) => n.id === 'p1').heal, undefined);
  assert.equal(lib.items.trinkets[0].heal, true);
  assert.equal(lib.items.supplies[0].heal, true);
  assert.equal(lib.items.supplies[1].heal, undefined);
});

test('the designer passphrase is DESIGNER_PASSPHRASE, with GM_PASSPHRASE as a fallback', async () => {
  const { default: real } = await import('../netlify/functions/builder.mjs');
  const login = (pass) => real(new Request('http://x/builder/login', { method: 'POST', body: 'passphrase=' + pass, headers: { 'content-type': 'application/x-www-form-urlencoded' } }));
  const keep = { d: process.env.DESIGNER_PASSPHRASE, g: process.env.GM_PASSPHRASE };
  try {
    delete process.env.DESIGNER_PASSPHRASE; process.env.GM_PASSPHRASE = 'old-one';
    assert.equal((await login('old-one')).status, 303);
    process.env.DESIGNER_PASSPHRASE = 'new-one';
    assert.equal((await login('new-one')).status, 303);
    assert.equal((await login('old-one')).status, 401); // once the designer passphrase is set, the old one stops working
  } finally {
    for (const [k, v] of [['DESIGNER_PASSPHRASE', keep.d], ['GM_PASSPHRASE', keep.g]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
});
