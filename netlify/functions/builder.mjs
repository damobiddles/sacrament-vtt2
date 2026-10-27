// Password gate for the node builder at /builder/.
// The page itself lives in private/builder.html, outside the published folder, and is only returned
// to someone holding a valid session cookie. The passphrase is DESIGNER_PASSPHRASE, set in Netlify
// (GM_PASSPHRASE still works as a fallback, from before the GM and the designer were different roles).
import { createHmac, timingSafeEqual } from 'node:crypto';
import page from './builder-page.mjs';
import { sanitizeLibrary } from './_shared/library.mjs';

const COOKIE = 'sac_builder';
const MAX_AGE = 60 * 60 * 12; // twelve hours

/* The session cookie is an expiry time and a signature of it, so it stops working when it runs out and cannot be reused for ever. */
const sign = (pass, exp) => createHmac('sha256', pass).update('sacrament-builder-session.' + exp).digest('hex');
const token = (pass, now = Date.now()) => { const exp = now + MAX_AGE * 1000; return exp + '.' + sign(pass, exp); };
function valid(cookie, pass, now = Date.now()) {
  const m = /^(\d{10,15})\.([0-9a-f]{64})$/.exec(String(cookie || ''));
  return !!m && +m[1] > now && same(m[2], sign(pass, m[1]));
}
function same(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}
function cookieOf(req, name) {
  const m = (req.headers.get('cookie') || '').split(/;\s*/).map((c) => c.split('=')).find((p) => p[0] === name);
  return m ? m.slice(1).join('=') : '';
}
const json = (b, st) => new Response(JSON.stringify(b), { status: st, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const headers = (extra) => ({ 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra });

function login(message, status = 401) {
  const body = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>Sacrament, designer sign-in</title><link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/theme.css"><script src="/nav.js"></script>
<style>main{max-width:30rem;margin:12vh auto;padding:0 16px}h1{font-size:3rem;margin:10px 0 18px}form{display:flex;flex-direction:column;gap:12px}
input{font:inherit;color:var(--fg);background:var(--bg2);border:1px solid var(--line);padding:10px 12px}p.err{color:#e07a6a;min-height:1.5em;margin:0}</style></head>
<body><main><div class="label">Node builder</div><h1>Designers only</h1>
<p>This tool is for the people writing the rules. Enter the passphrase to continue.</p>
<form method="POST" action="/builder/login"><label class="label" for="p">Passphrase</label>
<input id="p" name="passphrase" type="password" autocomplete="current-password" autofocus required>
<p class="err" role="alert">${esc(message || '')}</p><button class="btn" type="submit">Enter</button></form></main></body></html>`;
  return new Response(body, { status, headers: headers() });
}

export async function handle(req, deps) {
  const pass = (deps.passphrase || '').trim();
  const url = new URL(req.url);
  const route = url.pathname.replace(/\/+$/, '');

  if (!pass) return new Response('The node builder is not switched on: DESIGNER_PASSPHRASE has not been set on the server.', { status: 503, headers: headers() });

  if (route === '/builder/login' && req.method === 'POST') {
    const form = new URLSearchParams(await req.text());
    if (same((form.get('passphrase') || '').trim(), pass)) {
      return new Response(null, { status: 303, headers: {
        location: '/builder/', 'cache-control': 'no-store',
        'set-cookie': `${COOKIE}=${token(pass)}; Path=/builder; Max-Age=${MAX_AGE}; HttpOnly; Secure; SameSite=Strict`,
      } });
    }
    await wait(800); // slows down guessing
    return login('That passphrase is not right.');
  }

  if (route === '/builder/publish' && req.method === 'POST') {
    if (!valid(cookieOf(req, COOKIE), pass)) return json({ error: 'Sign in again.' }, 401);
    const json_ = (b, st = 200) => new Response(JSON.stringify(b), { status: st, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
    let store;
    try { store = await deps.getStore(); } catch { return json_({ error: 'Publishing is not available here. It needs Netlify.' }, 503); }
    try {
      if (url.searchParams.get('reset') === '1') {
        const cur = await store.get('latest', { type: 'json' });
        if (cur) await store.setJSON('previous', cur);
        await store.delete('latest');
        return json_({ ok: true, reset: true });
      }
      const text = await req.text();
      if (text.length > 400 * 1024) return json_({ error: 'That library is too large.' }, 413);
      let lib; try { lib = sanitizeLibrary(JSON.parse(text)); } catch (e) { return json_({ error: e.message || 'That is not a valid library.' }, 400); }
      const cur = await store.get('latest', { type: 'json' });
      if (cur) await store.setJSON('previous', cur);
      const rec = { ...lib, at: Date.now() };
      await store.setJSON('latest', rec);
      return json_({ ok: true, nodes: lib.nodes.length, edges: lib.edges.length, at: rec.at });
    } catch { return json_({ error: 'Could not save. Try again.' }, 500); }
  }

  if (route === '/builder/logout') {
    return new Response(null, { status: 303, headers: { location: '/', 'set-cookie': `${COOKIE}=; Path=/builder; Max-Age=0; HttpOnly; Secure; SameSite=Strict` } });
  }

  if (route === '/builder' && valid(cookieOf(req, COOKIE), pass)) return new Response(page, { status: 200, headers: headers() });
  if (route === '/builder') return login('', 401);
  return new Response('Not found', { status: 404 });
}

// Netlify Blobs only exists inside Netlify, so it is loaded on first use. Tests pass their own store.
// The store is made for each request, never kept: its access token expires, and a warm function that kept an old one answered with "Token expired".
async function realStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'sacrament-library', consistency: 'strong' });
}
export default (req) => handle(req, { passphrase: process.env.DESIGNER_PASSPHRASE || process.env.GM_PASSPHRASE, getStore: realStore });

export const config = { path: ['/builder', '/builder/*'] };
