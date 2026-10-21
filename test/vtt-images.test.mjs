// Image uploads: GM only, the type is decided from the bytes, limits hold, and an image is served only for the table it belongs to.
import test from 'node:test';
import assert from 'node:assert/strict';
import { table, find } from './vtt-helpers.mjs';
import { IMAGES, sniffImage } from '../netlify/functions/_shared/vtt-service.mjs';

const png = (extra = 20) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(extra, 7)]);
const jpg = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 1)]);
const webp = () => Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(10)]);
const up = (t, who, bytes, extra = {}) => t.svc.handle({ method: 'POST', token: who.token, body: Object.assign({ op: 'upload', code: t.code, data: bytes.toString('base64') }, extra) });

test('the type comes from the first bytes: PNG, JPEG, WebP and GIF are accepted; SVG, HTML and junk are not', () => {
  assert.equal(sniffImage(png()), 'image/png'); assert.equal(sniffImage(jpg()), 'image/jpeg'); assert.equal(sniffImage(webp()), 'image/webp');
  assert.equal(sniffImage(Buffer.from('GIF89a' + 'x'.repeat(10))), 'image/gif');
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')), null);
  assert.equal(sniffImage(Buffer.from('<html><body>hi</body></html>')), null); assert.equal(sniffImage(Buffer.alloc(0)), null);
});

test('the GM uploads an image and gets an address the table accepts; everyone at the table can fetch it', async () => {
  const t = await table(), ann = await t.join('Ann'), b = png(300);
  const r = await up(t, t.gm, b); assert.equal(r.status, 200); assert.match(r.body.url, new RegExp('^/\\.netlify/functions/vtt/img/' + t.code + '/[a-f0-9]{24}$'));
  const got = await t.svc.image(t.code, r.body.id); assert.equal(got.status, 200); assert.equal(got.mime, 'image/png'); assert.deepEqual(Buffer.from(got.bytes), b);
  const st = await t.state(), ghoul = find(st, 'Pit Ghoul');
  const set = await t.gm.cmd({ type: 'sceneUpdate', id: st.table.scene.id, bg: r.body.url }); assert.equal(set.status, 200);
  const upd = await t.gm.cmd({ type: 'cardUpdate', id: ghoul.id, patch: { img: r.body.url } }); assert.equal(upd.status, 200);
  assert.equal((await ann.get()).body.state.table.scene.bg, r.body.url);
});

test('a player cannot upload; a stranger cannot; nothing but the GM is told the list of images', async () => {
  const t = await table(), ann = await t.join('Ann');
  assert.equal((await up(t, ann, png())).status, 403); assert.equal((await up(t, { token: 'nope' }, png())).status, 401);
  await up(t, t.gm, png()); const seen = JSON.stringify((await ann.get()).body);
  assert.ok(!/"images"/.test(seen), 'the image list is not sent to players');
});

test('what is not an image is refused, whatever the browser claims; the stored type is the sniffed one', async () => {
  const t = await table();
  assert.equal((await up(t, t.gm, Buffer.from('<svg><script>1</script></svg>'), { mime: 'image/png' })).status, 400);
  assert.equal((await up(t, t.gm, Buffer.from('not an image at all'), { mime: 'image/png' })).status, 400);
  assert.equal((await up(t, t.gm, Buffer.alloc(0))).status, 400);
  const ok = await up(t, t.gm, jpg(), { mime: 'image/svg+xml' }); assert.equal(ok.status, 200); assert.equal((await t.svc.image(t.code, ok.body.id)).mime, 'image/jpeg');
  assert.equal((await t.svc.handle({ method: 'POST', token: t.gm.token, body: { op: 'upload', code: t.code, data: '<<not base64>>' } })).status, 400);
});

test('too large is refused, and a table keeps only so many images', async () => {
  const t = await table();
  assert.equal((await up(t, t.gm, png(IMAGES.maxBytes + 10))).status, 413);
  const first = await up(t, t.gm, png(5)); assert.equal(first.status, 200);
  for (let i = 1; i < IMAGES.perTable; i++) assert.equal((await up(t, t.gm, png(5))).status, 200);
  assert.equal((await up(t, t.gm, png(5))).status, 403);
  assert.equal((await t.svc.image(t.code, first.body.id)).status, 200);
});

test('an image is served only for the table it was uploaded to, and only if listed there; bad ids are 404', async () => {
  const a = await table(), b = await table(), r = await up(a, a.gm, png());
  const sameStore = await a.svc.image(b.code, r.body.id); assert.equal(sameStore.status, 404);
  for (const id of ['', 'x', '../../etc/passwd', 'a'.repeat(24), r.body.id.toUpperCase()]) assert.equal((await a.svc.image(a.code, id)).status, 404, id);
  assert.equal((await a.svc.image('../x', r.body.id)).status, 404);
});

test('uploading twice at once, and saving at the same time as other commands, loses nothing', async () => {
  const t = await table(); const rs = await Promise.all([up(t, t.gm, png(21)), up(t, t.gm, png(22)), up(t, t.gm, png(23)), t.gm.cmd({ type: 'setTarget', value: 14 })]);
  assert.ok(rs.every((r) => r.status === 200), rs.map((r) => r.status).join());
  for (const r of rs.slice(0, 3)) assert.equal((await t.svc.image(t.code, r.body.id)).status, 200);
  assert.equal((await t.state()).table.target, 14);
});
