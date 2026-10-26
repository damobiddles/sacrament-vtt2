// The session service: the same code answers on Netlify (backed by Blobs) and in the local server used for tests (backed by a file or memory).
// It checks who is asking, loads the room, hands the command to the core, and saves the result only if nobody else saved first.
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { apply, addLog, emptyState, project, projectPointers, seededRng, Fail, LIMITS } from './vtt-core.mjs';
import { exportScene, validateScene, capacity as sceneCapacity } from './vtt-scene-pack.mjs';
import { addSample } from './vtt-sample.mjs';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const hash = (t) => createHash('sha256').update(String(t)).digest('hex');
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
const newToken = () => randomBytes(24).toString('base64url');
const randomCode = () => Array.from(randomBytes(6), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
/* A save that finds the room changed reads it again and re-runs the command, after a short, growing, random wait so that people acting together do not keep colliding. */
const ATTEMPTS = 30, pause = (n) => new Promise((r) => setTimeout(r, Math.random() * Math.min(40, 3 * n)));
const defaultRng = () => randomBytes(4).readUInt32BE(0) / 0x100000000;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const clone = (o) => JSON.parse(JSON.stringify(o));
const out = (status, body) => ({ status, body });
const err = (status, code, message) => out(status, { error: { code, message } });

/* Uploaded images: kept beside the room, by an unguessable id, and listed in the room (state.images) so that only images that belong to a table are served. Only the GM uploads.
   The type is decided from the file's first bytes, never from what the browser says it is; SVG (which can carry script) is not accepted. */
export const IMAGES = { maxBytes: 2500000, perTable: 60, tableBytes: 60000000 };
export function sniffImage(b) {
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  if (b.length > 6 && (b.toString('latin1', 0, 6) === 'GIF87a' || b.toString('latin1', 0, 6) === 'GIF89a')) return 'image/gif';
  return null;
}

/* store: { get(code) -> { data, etag } | null, put(code, data, etag|null) -> boolean (false when someone else saved first) } */
export function makeService({ store, rng = null, now = Date.now, createKey = '' }) {
  async function load(code) { const r = await store.get(code); return r || null; }

  function who(state, token) {
    if (!token) return null;
    const h = hash(token);
    if (state.gm.hash && same(state.gm.hash, h)) return { role: 'gm' };
    for (const p of Object.values(state.players)) if (same(p.hash, h)) return { role: 'player', pid: p.id };
    return null;
  }

  /* Change the room: run `fn` on a private copy, then save it if no one else has. If someone has, load again and run it again (a command with an action id that
     already went through is recognised and does nothing the second time). */
  async function mutate(code, token, actionId, fn, view = {}) {
    for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
      if (attempt) await pause(attempt);
      const cur = await load(code); if (!cur) return err(404, 'no_room', 'No such table.');
      const state = clone(cur.data), a = who(state, token); if (!a) return err(401, 'auth', 'You are not at this table.');
      const ctx = { now: now(), rng: rng || seededRng(state.secret, String(actionId)) };
      let r; try { r = fn(state, a, ctx); } catch (e) { if (e instanceof Fail) return err(e.code === 'forbidden' ? 403 : e.code === 'not_found' ? 404 : e.code === 'conflict' || e.code === 'stale' ? 409 : 400, e.code, e.message); throw e; }
      if (r.changed === false) return out(200, { ok: true, result: r.result, v: state.v, state: project(state, a, view) });
      if (await store.put(code, state, cur.etag)) return out(200, { ok: true, result: r.result, v: state.v, state: project(state, a, view), extra: r.extra });
    }
    return err(503, 'busy', 'The table is busy. Try again.');
  }

  return {
    /* An image for the browser: { status, bytes, mime } (bytes only on 200). It is public to anyone who has the address, which only people at the table are given. */
    async image(code, id) {
      code = String(code || '').toUpperCase(); id = String(id || '');
      if (!/^[A-Z0-9]{4,10}$/.test(code) || !/^[a-f0-9]{24}$/.test(id) || !store.getImage) return { status: 404 };
      const cur = await load(code); const meta = cur && cur.data.images && cur.data.images[id]; if (!meta) return { status: 404 };
      const img = await store.getImage(code, id); return img ? { status: 200, bytes: img.bytes, mime: meta.mime } : { status: 404 };
    },
    /** @param {{ method: string, query?: Record<string, any>, body?: any, token?: string }} request */
    async handle({ method, query = {}, body = null, token = '' }) {
      try {
        if (method === 'GET') {
          const code = String(query.code || '').toUpperCase(), cur = await load(code); if (!cur) return err(404, 'no_room', 'No such table.');
          const a = who(cur.data, token); if (!a) return err(401, 'auth', 'You are not at this table.');
          /* What a deployment check needs to know, for a GM only: which Node the function really runs on and whether the store can read with strong consistency. */
          if (query.diag) { if (a.role !== 'gm') return err(403, 'forbidden', 'Only the GM can ask.'); return out(200, { node: process.version, store: store.kind || 'unknown', ...(store.diagnose ? await store.diagnose(code) : {}) }); }
          if (query.since != null && query.since !== '' && +query.since === cur.data.v) {
            /* nothing has changed on the table; if only the pointers have moved, they are sent alone (they are the same for everyone) */
            const pv = cur.data.pv || 0; return out(200, query.pv == null || query.pv === '' || +query.pv === pv ? { unchanged: true, v: cur.data.v } : { unchanged: true, v: cur.data.v, pv, pointers: projectPointers(cur.data, a) });
          }
          return out(200, { v: cur.data.v, state: project(cur.data, a, { dv: query.dv }) });
        }
        if (method !== 'POST' || !body || typeof body !== 'object') return err(400, 'invalid', 'Bad request.');
        const code = String(body.code || '').toUpperCase();
        if (body.op === 'create') {
          if (createKey && !same(createKey, body.key || '')) return err(403, 'forbidden', 'A key is needed to make a table here.');
          let why = '';
          for (let i = 0; i < 6; i++) {
            const c = randomCode(), state = emptyState(c, now(), randomBytes(24).toString('hex')), gmToken = newToken(); state.gm.hash = hash(gmToken);
            if (body.sample !== false) addSample(state, { rng: rng || defaultRng, now: now() });
            let saved = false; try { saved = await store.put(c, state, null); } catch (e) { why = String(e && e.name) + ': ' + String(e && e.message).slice(0, 160); }
            if (saved) return out(200, { ok: true, code: c, token: gmToken, state: project(state, { role: 'gm' }) });
          }
          return err(503, 'busy', 'Could not make a table. Try again.' + ((why || store.lastRefusal) ? ' (storage: ' + (why || store.lastRefusal) + ')' : ''));
        }
        if (body.op === 'join') {
          /* Joining is the same person once however many times it is sent: by the key the browser made for this attempt, or by the token it already holds. */
          const name = String(body.name || '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, 30); if (!name) return err(400, 'invalid', 'Give a name.');
          const joinKey = /^[A-Za-z0-9_-]{8,64}$/.test(String(body.joinKey || '')) ? String(body.joinKey) : '';
          for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
            if (attempt) await pause(attempt);
            const cur = await load(code); if (!cur) return err(404, 'no_room', 'No table has that code. Check it with your GM.');
            const state = clone(cur.data);
            const known = body.token && who(state, body.token);
            if (known && known.role === 'player') return out(200, { ok: true, pid: known.pid, token: body.token, rejoined: true, state: project(state, known) });
            const tokenFor = (salt = '') => createHmac('sha256', state.secret).update('join:' + joinKey + (salt ? ':' + salt : '')).digest('base64url');
            const jk = joinKey && hash(joinKey);
            if (jk && own(state.joins, jk) && state.players[state.joins[jk]]) { const pid = state.joins[jk]; return out(200, { ok: true, pid, token: tokenFor(state.players[pid].joinSalt || ''), rejoined: true, state: project(state, { role: 'player', pid }) }); }
            if (Object.keys(state.players).length >= LIMITS.players) return err(403, 'limit', 'The table is full.');
            const joinSalt = randomBytes(12).toString('hex');
            const token = joinKey ? tokenFor(joinSalt) : newToken(), pid = 'p' + (state.seq++).toString(36);
            state.players[pid] = { id: pid, name, joinSalt, hash: hash(token), joinedAt: now() }; state.v += 1;
            addLog(state, { role: 'player', pid, name }, 'Joined the table.', { now: now() });   /* the GM learns someone has arrived before they pick a hero */
            if (jk) { state.joins[jk] = pid; const ks = Object.keys(state.joins); if (ks.length > LIMITS.joins) delete state.joins[ks[0]]; }
            if (await store.put(code, state, cur.etag)) return out(200, { ok: true, pid, token, state: project(state, { role: 'player', pid }) });
          }
          return err(503, 'busy', 'The table is busy. Try again.');
        }
        if (['sceneExport','sceneCheck','sceneBegin','sceneStage','sceneCancel'].includes(body.op)) {
          const room=await load(code);if(!room)return err(404,'no_room','No such table.');
          const actor=who(room.data,token);if(!actor||actor.role!=='gm')return err(403,'forbidden','Only the GM can share scenes.');
          if(body.op==='sceneExport'){
            try{return out(200,{ok:true,...exportScene(room.data,String(body.sceneId))});}catch(e){return err(400,'invalid',e.message);}
          }
          const jobId=String(body.jobId||'');
          if(body.op==='sceneCheck'||body.op==='sceneBegin'){
            const manifest=body.manifest,packId=String(body.packId||'');
            try{validateScene(manifest);if(!/^[a-f0-9]{64}$/.test(packId))throw Error('Invalid scene fingerprint.');}catch(e){return err(400,'invalid',e.message);}
            const duplicates=Object.values(room.data.scenes).filter(sc=>sc.packId===packId).map(sc=>sc.name);
            if(body.op==='sceneCheck'){
              try{sceneCapacity(room.data,manifest);return out(200,{ok:true,duplicates});}catch(e){return err(400,'limit',e.message);}
            }
            if(!/^[a-f0-9]{24}$/.test(jobId))return err(400,'invalid','Invalid import request.');
            const result=await mutate(code,token,jobId,state=>{
              const existing=Object.values(state.scenes).find(sc=>sc.importJob===jobId);
              if(existing)return {changed:false,result:{id:existing.id,alreadyImported:true}};
              const jobs=state.sceneImports||(state.sceneImports={}),old=jobs[jobId];
              if(old){if(old.packId!==packId||JSON.stringify(old.manifest)!==JSON.stringify(manifest))throw new Fail('invalid','That import request is already in use.');return {changed:false,result:{jobId}};}
              const expired=[];Object.keys(jobs).forEach(id=>{if(jobs[id].expires<now()){expired.push(...Object.values(jobs[id].assets));delete jobs[id];}});
              if(Object.keys(jobs).length>=2)throw new Fail('invalid','Finish or cancel the other scene imports first.');
              if(Object.values(state.scenes).some(sc=>sc.packId===packId)&&body.allowDuplicate!==true)throw new Fail('conflict','This scene is already in this table. Confirm that you want another copy.');
              const reserved=Object.values(jobs).flatMap(j=>j.manifest.images);
              try{sceneCapacity(state,manifest,reserved.length,reserved.reduce((n,i)=>n+i.size,0));}catch(e){throw new Fail('invalid',e.message);}
              jobs[jobId]={packId,nonce:randomBytes(12).toString('hex'),manifest:clone(manifest),expires:now()+1800000,assets:{}};state.v++;
              return {result:{jobId},extra:{expired}};
            });
            if(result.status===200&&store.deleteImage)for(const asset of result.body.extra?.expired||[])await store.deleteImage(code,asset.id);
            // Temporary blob ids and import jobs are never returned in a projected game.
            if(result.body)delete result.body.extra;return result;
          }
          if(!/^[a-f0-9]{24}$/.test(jobId))return err(400,'invalid','Invalid import request.');
          if(body.op==='sceneCancel'){
            const result=await mutate(code,token,jobId,state=>{const job=state.sceneImports?.[jobId];if(!job)return {changed:false,result:{cancelled:true}};delete state.sceneImports[jobId];state.v++;return {result:{cancelled:true},extra:{assets:Object.values(job.assets)}};});
            if(result.status===200&&store.deleteImage)for(const asset of result.body.extra?.assets||[])await store.deleteImage(code,asset.id);
            if(result.body)delete result.body.extra;return result;
          }
          if(!store.putImage)return err(501,'unsupported','This table cannot store scene images.');
          const job=room.data.sceneImports?.[jobId];
          const completed=Object.values(room.data.scenes).find(sc=>sc.importJob===jobId);
          if(completed)return out(200,{ok:true,result:{alreadyImported:true,id:completed.id}});
          if(!job||job.expires<now())return err(400,'invalid','This import expired. Select the file again.');
          const image=job.manifest.images.find(i=>i.ref===body.ref);
          if(!image||typeof body.data!=='string'||body.data.length>IMAGES.maxBytes*1.4||body.data.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(body.data))return err(400,'invalid','Invalid scene image.');
          const bytes=Buffer.from(body.data,'base64'),mime=sniffImage(bytes);
          if(bytes.length!==image.size||mime!==image.mime||createHash('sha256').update(bytes).digest('hex')!==image.sha256)return err(400,'invalid','A scene image is missing or damaged.');
          try{globalThis.SacramentScenePack.dimensions(bytes,mime);}catch(e){return err(400,'invalid',e.message);}
          const id=createHmac('sha256',room.data.secret).update('scene:'+job.nonce+':'+image.ref+':'+image.sha256).digest('hex').slice(0,24);
          await store.putImage(code,id,bytes,mime);
          const result=await mutate(code,token,jobId,state=>{
            if(state.images?.[id])return {changed:false,result:{uploaded:true}};
            const pending=state.sceneImports?.[jobId];if(!pending||pending.nonce!==job.nonce||pending.expires<now())throw new Fail('invalid','This import was cancelled or expired.');
            if(pending.assets[image.ref])return {changed:false,result:{uploaded:true}};
            pending.assets[image.ref]={id,mime,size:bytes.length};state.v++;return {result:{uploaded:true}};
          });
          if(result.status!==200&&store.deleteImage){const current=await load(code);if(!current?.data.images?.[id]&&current?.data.sceneImports?.[jobId]?.nonce!==job.nonce)await store.deleteImage(code,id);}
          return result;
        }
        if (body.op === 'upload') {
          if (!store.putImage) return err(501, 'unsupported', 'This table cannot keep images.');
          const cur = await load(code); if (!cur) return err(404, 'no_room', 'No such table.');
          const a = who(cur.data, token); if (!a) return err(401, 'auth', 'You are not at this table.'); if (a.role !== 'gm') return err(403, 'forbidden', 'Only the GM can upload images.');
          const text = String(body.data || ''); if (!/^[A-Za-z0-9+/=]+$/.test(text)) return err(400, 'invalid', 'That is not an image.'); if (text.length > IMAGES.maxBytes * 1.4) return err(413, 'too_big', 'That image is too large (the limit is about 2.5 MB; it is made smaller before it is sent).');
          const bytes = Buffer.from(text, 'base64'); if (bytes.length > IMAGES.maxBytes) return err(413, 'too_big', 'That image is too large.');
          const mime = sniffImage(bytes); if (!mime) return err(400, 'invalid', 'That is not a PNG, JPEG, WebP or GIF image.');
          const had = cur.data.images || {}, n = Object.keys(had).length, total = Object.values(had).reduce((t, m) => t + m.size, 0);
          if (n >= IMAGES.perTable || total + bytes.length > IMAGES.tableBytes) return err(403, 'limit', 'This table has as many images as it can keep.');
          const id = randomBytes(12).toString('hex'); await store.putImage(code, id, bytes, mime);
          const r = await mutate(code, token, 'img.' + id, (state) => { state.images = state.images || {}; if (Object.keys(state.images).length >= IMAGES.perTable || Object.values(state.images).reduce((sum, meta) => sum + meta.size, 0) + bytes.length > IMAGES.tableBytes) throw new Fail('limit', 'This table has as many images as it can keep.'); state.images[id] = { mime, size: bytes.length, at: now() }; return { result: { id, url: '/.netlify/functions/vtt/img/' + code + '/' + id } }; });
          if (r.status !== 200 && store.deleteImage) await store.deleteImage(code, id);
          return r.status === 200 ? out(200, { ok: true, id, url: '/.netlify/functions/vtt/img/' + code + '/' + id }) : r;
        }
        if (body.op === 'cmd') return await mutate(code, token, body.cmd && body.cmd.actionId, (state, a, ctx) => apply(state, body.cmd, a, ctx), { dv: body.dv });
        return err(400, 'invalid', 'Unknown request.');
      } catch (e) { console.error('vtt: unexpected failure', e && e.stack || e); return err(503, 'unavailable', 'The table could not be reached. Trying again is safe. (' + String(e && e.name).slice(0, 40) + ': ' + String(e && e.message).slice(0, 120) + ')'); }
    }
  };
}

/* ---------- stores ---------- */
export function memoryStore() {
  const m = new Map(); let n = 0;
  return {
    kind: 'memory',
    async get(code) { const r = m.get(code); return r ? { data: JSON.parse(r.json), etag: r.etag } : null; },
    async putImage(code, id, bytes, mime) { m.set('img:' + code + id, { bytes: Buffer.from(bytes), mime }); },
    async deleteImage(code, id) { m.delete('img:' + code + id); },
    async getImage(code, id) { return m.get('img:' + code + id) || null; },
    async put(code, data, etag) { const r = m.get(code); if (etag === null ? !!r : !r || r.etag !== etag) return false; m.set(code, { json: JSON.stringify(data), etag: String(++n) }); return true; },
    _raw: m
  };
}
