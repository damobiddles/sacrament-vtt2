// The Sacrament RPG table's session service on Netlify. All the behaviour is in _shared/vtt-service.mjs; this file only turns a request into its inputs and a result
// into a response, and keeps rooms in Netlify Blobs. A save is conditional on the room not having changed since it was read (onlyIfMatch), so two people
// acting at once cannot overwrite each other.
// Optional environment variable: VTT_CREATE_KEY. If set, making a new table needs it, so strangers cannot fill the store.
import { makeService } from './_shared/vtt-service.mjs';

/* Over the installed client (@netlify/blobs 11):
   - a read asks for strong consistency, which in a function needs the environment's `uncachedEdgeURL`; if the platform has not given one the client throws a
     BlobsConsistencyError, and we read without it. A save is conditional, so an out-of-date read can only cost a retry, never a lost write.
   - setJSON with a condition answers { modified: false } on a 412, and otherwise answers { modified: true, etag } *without looking at the status*. A failed write
     therefore comes back with an empty etag, so only a non-empty etag counts as saved. If a write was in fact saved and the answer was lost, running the command
     again finds its action id already applied and does nothing. */
export function blobStore(getStore) {
  let blobs;
  const store = async () => blobs || (blobs = await getStore());
  const key = (code) => 'room-' + code; let refusal = '';
  return {
    kind: 'blobs',
    get lastRefusal() { return refusal; },
    /* Is a strong read possible here? (It needs the platform's uncached URL; a missing one is a BlobsConsistencyError.) */
    async diagnose(code) {
      const st = await store();
      try { await st.getWithMetadata(key(code), { type: 'json', consistency: 'strong' }); return { strongRead: true }; }
      catch (e) { return e && e.name === 'BlobsConsistencyError' ? { strongRead: false } : { strongRead: 'error: ' + String(e && e.name) }; }
    },
    async get(code) {
      const st = await store(); let r;
      try { r = await st.getWithMetadata(key(code), { type: 'json', consistency: 'strong' }); }
      catch (e) { if (e && e.name === 'BlobsConsistencyError') r = await st.getWithMetadata(key(code), { type: 'json' }); else throw e; }
      return r && r.data ? { data: r.data, etag: r.etag } : null;
    },
    async putImage(code, id, bytes, mime) { await (await store()).set('img-' + code + '-' + id, bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), { metadata: { mime } }); },
    async deleteImage(code, id) { await (await store()).delete('img-' + code + '-' + id); },
    async getImage(code, id) { const buf = await (await store()).get('img-' + code + '-' + id, { type: 'arrayBuffer' }); return buf ? { bytes: Buffer.from(buf) } : null; },
    async put(code, data, etag) {
      const r = await (await store()).setJSON(key(code), data, etag === null ? { onlyIfNew: true } : { onlyIfMatch: etag }), saved = !!(r && r.modified && r.etag);
      if (!saved && !(r && r.modified === false)) { refusal = JSON.stringify(r); console.error('vtt: the store refused a write', refusal); }   /* not a lost race (that is modified:false) but a failure: leave a trace in the function log */
      return saved;
    }
  };
}
/* No store-wide consistency: a store set to 'strong' makes every write need the uncached URL too. Reads ask for it one by one (see blobStore). */
const realStore = async () => { const { getStore } = await import('@netlify/blobs'); return getStore({ name: 'icrpg-vtt' }) /* the storage area keeps its original name: renaming it would hide every saved table */; };

/* One request: its own store (and so its own, current, access token) and its own service. A store kept from an earlier request holds the token it was made with, and that token
   expires: a warm function that kept one answered every request with BlobsInternalError "Token expired". `getStore` is a parameter so that a test can count the calls. */
export function makeHandler(getStore, createKey = '') {
  return async (req) => {
  const service = makeService({ store: blobStore(getStore), createKey });
  const url = new URL(req.url); let body = null;
  const im = /\/img\/([A-Za-z0-9]+)\/([a-f0-9]+)$/.exec(url.pathname);
  if (im && req.method === 'GET') {
    const r = await service.image(im[1], im[2]); if (r.status !== 200) return new Response('Not found', { status: r.status });
    return new Response(r.bytes, { status: 200, headers: { 'content-type': r.mime, 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=31536000, immutable' } });
  }
  if (req.method === 'POST') { try { body = await req.json(); } catch { return Response.json({ error: { code: 'invalid', message: 'Bad request.' } }, { status: 400 }); } }
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const r = await service.handle({ method: req.method, query: Object.fromEntries(url.searchParams), body, token });
  return Response.json(r.body, { status: r.status, headers: { 'cache-control': 'no-store' } });
  };
}
export default makeHandler(realStore, process.env.VTT_CREATE_KEY || '');
