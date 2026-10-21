// Public, read-only: the ability library most recently published from the node builder.
// The character builder and the VTT fetch this and fall back to their built-in library if there is none.
import { getStore } from '@netlify/blobs';

export default async () => {
  try {
    const rec = await getStore({ name: 'sacrament-library', consistency: 'strong' }).get('latest', { type: 'json' });
    if (!rec) return new Response(JSON.stringify({ error: 'none' }), { status: 404, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    return new Response(JSON.stringify(rec), { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=60' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'unavailable' }), { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
  }
};

export const config = { path: '/api/nodes' };
