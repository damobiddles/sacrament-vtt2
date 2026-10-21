// The time-limit wrapper (scripts/with-timeout.mjs) must stop a stuck command quickly, and pass a normal command's result through.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const run = (secs, ...cmd) => spawnSync('node', ['scripts/with-timeout.mjs', String(secs), ...cmd], { cwd: new URL('..', import.meta.url).pathname, encoding: 'utf8', timeout: 20000 });

test('a command that never finishes is stopped at the limit, with a clear message and exit code 124', () => {
  const t0 = Date.now();
  const r = run(1, 'node', '-e', 'setInterval(() => {}, 1000)');
  assert.equal(r.status, 124);
  assert.match(r.stderr, /TIME LIMIT/);
  assert.ok(Date.now() - t0 < 8000, 'took far longer than the limit');
});

test('a command that finishes in time keeps its own exit code and output', () => {
  assert.equal(run(10, 'node', '-e', 'console.log("fine")').stdout.trim(), 'fine');
  assert.equal(run(10, 'node', '-e', 'process.exit(0)').status, 0);
  assert.equal(run(10, 'node', '-e', 'process.exit(3)').status, 3);
});

test('NAME=value words before the command set environment variables for it', () => {
  assert.equal(run(10, 'GREETING=hello there', 'node', '-e', 'console.log(process.env.GREETING)').stdout.trim(), 'hello there');
});
