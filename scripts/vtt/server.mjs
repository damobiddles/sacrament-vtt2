// A local server for the Sacrament RPG table: the static site from site/, plus the same session service the Netlify function runs, saving rooms to a folder.
// Used for development and by the end-to-end test. Usage: node scripts/vtt/server.mjs [port] [dataDir]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rename, rm } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeService } from '../../netlify/functions/_shared/vtt-service.mjs';

const ROOT = fileURLToPath(new URL('../../site/', import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };

/* A folder of JSON files, one per room. A save is conditional on the file's version, as the Blobs store's is; a queue per room makes check-and-write one step. */
export function fileStore(dir) {
  const queues = new Map();
  const path = (code) => join(dir, code.replace(/[^A-Z0-9]/g, '') + '.json');
  const serial = (code, fn) => { const q = (queues.get(code) || Promise.resolve()).then(fn, fn); queues.set(code, q.catch(() => {})); return q; };
  const read = async (code) => { try { const t = JSON.parse(await readFile(path(code), 'utf8')); return { data: t.data, etag: String(t.etag) }; } catch { return null; } };
  return {
    kind: 'file',
    get: (code) => serial(code, () => read(code)),
    putImage: async (code, id, bytes, mime) => { await mkdir(join(dir, 'img'), { recursive: true }); await writeFile(join(dir, 'img', code.replace(/[^A-Z0-9]/g, '') + '-' + id.replace(/[^a-f0-9]/g, '')), bytes); },
    deleteImage: async (code, id) => { await rm(join(dir, 'img', code.replace(/[^A-Z0-9]/g, '') + '-' + id.replace(/[^a-f0-9]/g, '')), { force: true }); },
    getImage: async (code, id) => { try { return { bytes: await readFile(join(dir, 'img', code.replace(/[^A-Z0-9]/g, '') + '-' + id.replace(/[^a-f0-9]/g, ''))) }; } catch { return null; } },
    put: (code, data, etag) => serial(code, async () => {
      const cur = await read(code); if (etag === null ? !!cur : !cur || cur.etag !== etag) return false;
      await mkdir(dir, { recursive: true }); const tmp = path(code) + '.tmp'; await writeFile(tmp, JSON.stringify({ etag: (cur ? +cur.etag : 0) + 1, data })); await rename(tmp, path(code)); return true;
    })
  };
}

/** @param {{ port?: number, dir?: string, createKey?: string }} [options] */
export function startServer({ port = 0, dir, createKey = '' } = {}) {
  const service = makeService({ store: fileStore(dir), createKey });
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const im = /^\/\.netlify\/functions\/vtt\/img\/([A-Za-z0-9]+)\/([a-f0-9]+)$/.exec(url.pathname);
    if (im) { const r = await service.image(im[1], im[2]); if (r.status !== 200) { res.writeHead(r.status); return res.end(); } res.writeHead(200, { 'content-type': r.mime, 'x-content-type-options': 'nosniff', 'cache-control': 'public, max-age=31536000, immutable' }); return res.end(r.bytes); }
    if (url.pathname === '/.netlify/functions/vtt') {
      if (req.method === 'POST') { /* images arrive as base64 in JSON */ }
      let raw = ''; for await (const c of req) raw += c; let body = null;
      if (req.method === 'POST') { try { body = JSON.parse(raw || 'null'); } catch { res.writeHead(400); return res.end('{}'); } }
      const r = await service.handle({ method: req.method, query: Object.fromEntries(url.searchParams), body, token: (req.headers.authorization || '').replace(/^Bearer\s+/i, '') });
      res.writeHead(r.status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); return res.end(JSON.stringify(r.body));
    }
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, ''); if (p.endsWith('/')) p += 'index.html';
    try { const buf = await readFile(join(ROOT, p)); res.writeHead(200, { 'content-type': TYPES[extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' }); res.end(buf); }
    catch { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('Not found'); }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: /** @type {import('node:net').AddressInfo} */ (server.address()).port, service })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.argv[2] || 8788, dir = process.argv[3] || join(process.cwd(), '.vtt-data');
  startServer({ port, dir }).then((s) => console.log('Sacrament RPG table on http://localhost:' + s.port + '/vtt/  (rooms saved in ' + dir + ')'));
}
