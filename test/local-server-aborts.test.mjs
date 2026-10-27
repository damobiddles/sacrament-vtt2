// The local test server (scripts/vtt/server.mjs) must survive a browser that gives up on a request halfway. It used to stop completely
// ("aborted"), and every later request, and so every later test, failed with "connection refused".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../scripts/vtt/server.mjs';

test('a request abandoned halfway through its body does not take the server down', async () => {
  const s = await startServer({ port: 0, dir: mkdtempSync(join(tmpdir(), 'vtt-abort-')) });
  try {
    for (let i = 0; i < 3; i++) {
      await new Promise((done) => {
        const c = net.connect(s.port, '127.0.0.1', () => {
          c.write('POST /.netlify/functions/vtt HTTP/1.1\r\nHost: x\r\nContent-Type: application/json\r\nContent-Length: 500\r\n\r\n{"op":"cmd"');   // promises 500 bytes, sends 12, then hangs up
          setTimeout(() => { c.destroy(); done(); }, 30);
        });
        c.on('error', () => {});
      });
    }
    await new Promise((r) => setTimeout(r, 300));
    const res = await fetch('http://127.0.0.1:' + s.port + '/vtt/');
    assert.equal(res.status, 200, 'the server still answers after the abandoned requests');
  } finally { s.server.closeAllConnections(); await new Promise((r) => s.server.close(r)); }
});
