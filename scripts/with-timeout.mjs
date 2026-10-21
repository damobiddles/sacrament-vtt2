// Runs a command with a time limit, so nothing in this project can hang for ever.
// Usage: node scripts/with-timeout.mjs <seconds> [NAME=value ...] <command> [arguments...]   (NAME=value words set environment variables for the command)
// If the command is still running after that many seconds it is stopped (with everything it started), a plain message says which command and how
// long it was given, and the exit code is 124. Otherwise this exits with the command's own exit code.
import { spawn } from 'node:child_process';

const [secs, ...rest] = process.argv.slice(2);
const env = { ...process.env };
while (rest.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(rest[0])) { const [k, ...v] = rest.shift().split('='); env[k] = v.join('='); }
const [cmd, ...args] = rest;
const limit = Number(secs);
if (!(limit > 0) || !cmd) { console.error('Usage: node scripts/with-timeout.mjs <seconds> <command> [arguments...]'); process.exit(2); }

const child = spawn(cmd, args, { stdio: 'inherit', env, detached: process.platform !== 'win32', shell: false });
let timedOut = false;
const stop = () => { try { process.kill(process.platform === 'win32' ? child.pid : -child.pid, 'SIGKILL'); } catch { /* already gone */ } };
const timer = setTimeout(() => {
  timedOut = true;
  console.error(`\nTIME LIMIT: "${[cmd, ...args].join(' ').slice(0, 120)}" was still running after ${limit} seconds, so it was stopped. It was probably stuck, not slow: look at what it was doing last.`);
  stop();
}, limit * 1000);
child.on('error', (e) => { clearTimeout(timer); console.error('Could not start: ' + e.message); process.exit(127); });
child.on('exit', (code, signal) => { clearTimeout(timer); process.exit(timedOut ? 124 : code === null ? (signal ? 128 : 1) : code); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { stop(); process.exit(130); });
