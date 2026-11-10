// Anonymous play counts (site/analytics.js, Umami Cloud, the owner's choice 2026-11-09).
// What must hold: nothing is sent off the real site, an address never carries a table code or GM key,
// events carry only short plain words or numbers from the allowed list, and the table and solo code never pass a name, code or key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../site/analytics.js', import.meta.url), 'utf8');

const withId = source.replace(/var WEBSITE_ID = '[^']*';/, "var WEBSITE_ID = 'test-id';");

function load(hostname, pathname = '/', robots = '', src = source) {
  const added = [];
  const document = {
    readyState: 'complete', hidden: false, head: { appendChild: (el) => added.push(el) },
    querySelector: (q) => (q === 'meta[name=robots]' && robots ? { getAttribute: () => robots } : null), addEventListener() {},
    createElement: () => ({ dataset: {}, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }),
  };
  const window = { location: { hostname, pathname, href: 'https://' + hostname + pathname, origin: 'https://' + hostname }, document };
  vm.runInNewContext(src, { window, URL, setInterval, clearInterval, Date, Math, Object, isFinite });
  return { stats: window.SacStats, window, added };
}

test('nothing is sent from this computer, a preview, or before the Website ID is filled in', () => {
  for (const host of ['localhost', 'deploy-preview-62--sacramentv2.netlify.app', 'playsacrament.com']) {
    const { stats, added } = load(host);
    stats.track('solo-start', { path: 'Hunter' });
    assert.equal(stats.log.length, 1, 'kept in the log for the console on ' + host);
    const idEmpty = /var WEBSITE_ID = '';/.test(source);
    assert.equal(stats.live(), host === 'playsacrament.com' && !idEmpty, host);
    assert.equal(added.length, stats.live() ? 1 : 0, 'Umami script only on the live site, ' + host);
  }
});

test('the owner\'s private pages are never counted', () => {
  assert.equal(load('playsacrament.com', '/solo/', '', withId).stats.live(), true, 'a public page is counted once the ID is in');
  assert.equal(load('playsacrament.com', '/builder/', '', withId).stats.live(), false);
  assert.equal(load('playsacrament.com', '/unlisted/', 'noindex, nofollow', withId).stats.live(), false);
});

test('an address loses everything after ? and #, so table codes and GM keys never leave', () => {
  const { stats, window } = load('localhost');
  assert.equal(stats.bare('https://playsacrament.com/vtt/?room=ABC123#key=secretsecretsecretsecret'), 'https://playsacrament.com/vtt/');
  const p = window.__sacStatsBeforeSend('event', { url: '/vtt/?room=ABC123', referrer: 'https://playsacrament.com/vtt/?room=ABC123#key=x', data: { role: 'gm', name: 'Aldo', code: 'ABC123' } });
  assert.equal(p.url, '/vtt/');
  assert.equal(p.referrer, 'https://playsacrament.com/vtt/');
  assert.deepEqual({ ...p.data }, { role: 'gm' });
});

test('events carry only allowed keys with short plain values', () => {
  const { stats } = load('localhost');
  assert.deepEqual({ ...stats.clean({ role: 'gm', name: 'Aldo of Wendholt', code: 'ABC123', token: 'x', minutes: 5.4, hard: true, place: 'the <b>crypt</b>', scene: 'x'.repeat(41) }) }, { role: 'gm', minutes: 5, hard: true });
  stats.track('Bad Name!', {}); stats.track('table-roll', { kind: 'roll' });
  assert.deepEqual(JSON.parse(JSON.stringify(stats.log.map((e) => e.name))), ['table-roll']);
});

test('the table and the solo game pass no name, table code, key or typed text to a count', () => {
  for (const file of ['site/vtt/vtt.js', 'site/solo/solo.js']) {
    const code = fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8');
    const calls = code.match(/\bcount\('[^']+',[^;]*?\}\)/g) || [];
    assert.ok(calls.length >= 4, file + ' counts something');
    for (const c of calls) assert.doesNotMatch(c, /\.code\b|token|\.name\b|joinName|\.value\b|\bpid\b|label|note/, file + ': ' + c);
  }
});

test('the counting script comes straight from Umami (real countries), and the privacy page says so', () => {
  const toml = fs.readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
  assert.doesNotMatch(toml, /umami/i, 'not passed on through this site: Umami would see Netlify\'s server, not the visitor\'s country');
  assert.match(source, /s\.src = 'https:\/\/cloud\.umami\.is\/script\.js'/); assert.doesNotMatch(source, /data-host-url/);
  assert.match(source, /data-exclude-search/); assert.match(source, /data-exclude-hash/); assert.match(source, /data-do-not-track/);
  const privacy = fs.readFileSync(new URL('../content/landing/privacy.md', import.meta.url), 'utf8');
  assert.match(privacy, /Umami/); assert.match(privacy, /no cookies/); assert.doesNotMatch(privacy, /own analytics/);
});
