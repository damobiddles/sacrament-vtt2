/* Anonymous play counts (the owner's choice, 2026-11-09: Umami Cloud, free plan).
   What it may send: page visits (the address WITHOUT anything after ? or #, so a table code or GM key never leaves the browser)
   and short named events such as "solo-start" with a few plain words or numbers from the list in ALLOWED below.
   It never sends names, table codes, GM keys, notes or anything typed. No cookies; nothing is stored in the browser.
   It only sends from the real site, and only once WEBSITE_ID is filled in. Everywhere else (this computer, previews, tests)
   events are only kept in SacStats.log, so they can be checked in the browser console. */
(function (root) {
  'use strict';
  /* From Umami: Settings, Websites, Edit, Website ID. Not a secret (it is in every page's source). Empty: nothing is sent. */
  var WEBSITE_ID = '';
  var LIVE_HOSTS = ['playsacrament.com'];
  /* The owner's own pages are not counted. */
  var PRIVATE = /^\/(builder|inventory)(\/|$)/;
  /* The free plan has 100,000 events a month, and each property counts as one: keep events few and properties fewer. */
  var ALLOWED = ['role', 'sample', 'kind', 'path', 'hard', 'place', 'scene', 'step', 'result', 'end', 'minutes', 'link', 'file'];
  var CLOCK_EVERY = 5;        /* minutes between "still playing" counts */
  var CLOCK_MAX = 12 * 60;    /* a tab left open overnight stops counting after twelve hours */

  var log = [], queue = [], sending = false;
  var live = LIVE_HOSTS.indexOf(root.location && root.location.hostname) >= 0 && !!WEBSITE_ID && !PRIVATE.test(root.location.pathname);

  /* Only allowed keys, and only plain values: a number, true/false, or a short plain word (letters, digits, spaces, - _ ' .). */
  function clean(data) {
    var out = {};
    if (!data || typeof data !== 'object') return out;
    ALLOWED.forEach(function (k) {
      var v = data[k];
      if (typeof v === 'number' && isFinite(v)) out[k] = Math.round(v);
      else if (typeof v === 'boolean') out[k] = v;
      else if (typeof v === 'string' && /^[A-Za-z0-9 _'.-]{1,40}$/.test(v)) out[k] = v;
    });
    return out;
  }
  /* An address with nothing after ? or #. */
  function bare(u) { return typeof u === 'string' ? u.replace(/[?#].*$/, '') : u; }
  /* Umami calls this before every send (data-before-send): one more guard on top of data-exclude-search / data-exclude-hash. */
  root.__sacStatsBeforeSend = function (type, payload) {
    if (!payload || typeof payload !== 'object') return payload;
    payload.url = bare(payload.url); payload.referrer = bare(payload.referrer);
    if (payload.data) payload.data = clean(payload.data);
    return payload;
  };

  function track(name, data) {
    if (!/^[a-z][a-z0-9-]{1,39}$/.test(name)) return;
    var d = clean(data);
    log.push({ name: name, data: d, at: Date.now() }); if (log.length > 60) log.shift();
    if (live) send(name, d);
  }
  function send(name, d) {
    if (sending && root.umami && typeof root.umami.track === 'function') { try { root.umami.track(name, d); } catch { /* counting must never break play */ } }
    else if (queue.length < 20) queue.push([name, d]);   /* pressed before Umami's script arrived: sent when it does */
  }

  /* Play time: while a game screen is open, every CLOCK_EVERY minutes the tab is in front counts as "still playing" (minutes so far).
     A tab in the background does not count. Starting a clock again restarts it. */
  var clocks = {};
  function clock(name, data) {
    stop(name);
    var c = clocks[name] = { minutes: 0, data: data || {} };
    c.timer = setInterval(function () {
      if (root.document && root.document.hidden) return;
      c.minutes++;
      if (c.minutes % CLOCK_EVERY === 0) track(name, Object.assign({}, typeof c.data === 'function' ? c.data() : c.data, { minutes: c.minutes }));
      if (c.minutes >= CLOCK_MAX) stop(name);
    }, 60000);
  }
  function stop(name) { var c = clocks[name]; if (c) { clearInterval(c.timer); delete clocks[name]; } }

  /* A few links on the public pages are counted when pressed: the ways into the table and the solo game, and downloads. */
  function linkEvent(a) {
    var href = a.getAttribute('href') || '', u;
    try { u = new URL(href, root.location.href); } catch { return null; }
    if (u.origin !== root.location.origin) return null;
    if (/\.pdf$/i.test(u.pathname)) return ['download', { file: u.pathname.split('/').pop().replace(/\.pdf$/i, '') }];
    if (/^\/vtt\/?$/.test(u.pathname) && !/^\/vtt/.test(root.location.pathname)) return ['click-table', { link: u.searchParams.has('try') ? 'try' : u.searchParams.has('run') ? 'run' : u.searchParams.has('join') ? 'join' : 'table' }];
    if (/^\/play-online\/?$/.test(u.pathname)) return ['click-play-online', {}];
    if (/^\/solo\/?$/.test(u.pathname) && !/^\/solo/.test(root.location.pathname)) return ['click-play-solo', {}];
    return null;
  }
  if (root.document) {
    root.document.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a[href]') : null; if (!a) return;
      var ev = linkEvent(a); if (ev) track(ev[0], ev[1]);
    }, true);
  }

  function load() {
    if (!live || root.document.querySelector('script[data-sac-stats]')) return;
    var s = root.document.createElement('script');
    s.defer = true; s.src = '/stats/s.js'; s.dataset.sacStats = '1';
    /* served from this site (netlify.toml passes it on to Umami), so fewer ad blockers hide the visit */
    s.setAttribute('data-website-id', WEBSITE_ID);
    s.setAttribute('data-host-url', root.location.origin + '/stats');
    s.setAttribute('data-domains', LIVE_HOSTS.join(','));
    s.setAttribute('data-exclude-search', 'true');
    s.setAttribute('data-exclude-hash', 'true');
    s.setAttribute('data-do-not-track', 'true');
    s.setAttribute('data-before-send', '__sacStatsBeforeSend');
    s.onload = function () { sending = true; var q = queue; queue = []; q.forEach(function (e) { send(e[0], e[1]); }); };
    root.document.head.appendChild(s);
  }
  if (root.document) { if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', load); else load(); }

  var early = root.SacStats && root.SacStats.early;
  root.SacStats = { track: track, clock: clock, stop: stop, log: log, clean: clean, bare: bare, linkEvent: linkEvent, live: function () { return live; } };
  (early || []).forEach(function (c) { root.SacStats[c[0]].apply(null, c[1]); });
})(typeof window !== 'undefined' ? window : globalThis);
