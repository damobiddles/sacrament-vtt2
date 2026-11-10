/* One navigation and footer definition for built pages and older public pages. */
(function (root) {
  'use strict';
  var PAGES = [
    ['The game', '/the-game/'], ['The setting', '/setting/'], ['Start here', '/how-to-play/'], ['Rules', '/rules/'],
    ['Play online', '/play-online/'], ['Play solo', '/solo/'], ['Play in person', '/play-in-person/'], ['Resources', '/resources/']
  ];
  function section(path) {
    path = path.replace(/index\.html$/, '');
    if (/^\/(player-guide|gm-guide|rules)(\/|$)/.test(path)) return '/rules/';
    if (/^\/adventures(\/|$)/.test(path)) return '/play-in-person/';
    if (/^\/(loot|brand|adventure|scenes)(\/|$)/.test(path)) return '/resources/';
    var match = PAGES.filter(function (p) { return p[1] === '/' ? path === '/' : path.indexOf(p[1]) === 0; })[0];
    return match ? match[1] : '';
  }
  function navigation(path) {
    var current = section(path);
    return '<nav class="ic-nav" aria-label="Sacrament RPG"><div class="ic-nav-inner"><a class="ic-brand" href="/" aria-label="Sacrament RPG home"><img src="/favicon.svg" alt="" width="28" height="28">Sacrament RPG</a><ul>' + PAGES.map(function (p) { return '<li><a href="' + p[1] + '"' + (p[1] === current ? ' aria-current="page"' : '') + '>' + p[0] + '</a></li>'; }).join('') + '</ul></div></nav>';
  }
  function footer() {
    return '<footer class="ic-foot"><div class="wrap"><div class="site-footer-grid"><div><b>Sacrament RPG</b><p>A dark fantasy roleplaying game, played in your browser or around a real table.</p></div><nav aria-label="Play and learn"><b>Play and learn</b><a href="/how-to-play/">Start here</a><a href="/play-online/">Play online</a><a href="/vtt/?join">Join a game</a><a href="/vtt/?run">Run a game</a><a href="/character/">My heroes</a><a href="/solo/">Play solo</a><a href="/play-in-person/">Play in person</a><a href="/rules/">Rules</a><a href="/rules/paths/">Paths</a><a href="/player-guide/">Player guide</a><a href="/gm-guide/">GM guide</a><a href="/rules/updates/">Updates and errata</a></nav><nav aria-label="Explore and get help"><b>Explore and get help</b><a href="/resources/">Resources</a><a href="/loot/">Current Loot Tables</a><a href="/news/">News</a><a href="/feedback/">Send feedback</a><a href="/adventures/the-guest-at-greave/">The Guest at Greave</a><a href="/adventures/the-rib-of-saint-hussey/">The Rib of Saint Hussey</a><a href="https://www.youtube.com/@DungeonJukebox" target="_blank" rel="noopener noreferrer">Dungeon Jukebox on YouTube</a></nav></div><p class="site-legal"><a href="https://ko-fi.com/sacramentrpg" target="_blank" rel="noopener noreferrer">Support on Ko-fi</a> · <a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms of Use</a></p><p>© ' + new Date().getFullYear() + ' Dungeon Jukebox, also known as Damien Bidmead. All rights reserved.</p></div></footer>';
  }
  root.SacramentSite = { navigation: navigation, footer: footer, section: section };
  if (typeof document === 'undefined') return;
  try { localStorage.removeItem('sacrament-theme'); } catch {}
  function backToTop() {
    if (/^\/(vtt|character|builder)(\/|$)/.test(location.pathname) || document.body.hasAttribute('data-no-nav')) return;
    var button = document.createElement('button');
    button.type = 'button'; button.className = 'sac-back-top'; button.hidden = true;
    button.textContent = '↑ Back to top';
    button.addEventListener('click', function () {
      var heading = document.querySelector('h1');
      if (heading) { if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
      window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    });
    document.body.appendChild(button);
    function update() { button.hidden = window.scrollY < 400; }
    window.addEventListener('scroll', update, { passive: true }); update();
  }

  /* Public pages only. Keep the padded direct link if the external widget
     cannot load; never load this donation script in a table or hero editor. */
  function supportWidget() {
    if (document.querySelector('script[data-sac-kofi]')) return;
    var fallback = document.createElement('div'); fallback.className = 'ic-kofi support-floating-fallback';
    fallback.innerHTML = '<a class="btn kofi-button" href="https://ko-fi.com/sacramentrpg" target="_blank" rel="noopener noreferrer" aria-label="Support Sacrament on Ko-fi (opens in a new tab)"><img class="kofi-cup" src="/brand/assets/kofi-cup.svg" alt="" width="24" height="24">Support me</a>';
    document.body.appendChild(fallback);
    /* A floating donation button must not cover the site's own controls. */
    function fitSupport() {
      var narrow = root.matchMedia('(max-width: 650px)').matches;
      var widgets = document.querySelectorAll('.support-floating-fallback, .floatingchat-container-wrap, .floatingchat-container-wrap-mobi');
      var controls = narrow ? Array.from(document.querySelectorAll('button,a[href],input,select,textarea,summary')).filter(function (el) { return !el.closest('.support-floating-fallback,.floatingchat-container-wrap,.floatingchat-container-wrap-mobi'); }) : [];
      widgets.forEach(function (widget) {
        if (!narrow) { widget.style.visibility = ''; return; }
        var rect = widget.getBoundingClientRect();
        /* An opened payment panel may overlay the page deliberately. */
        if (rect.height > 160 || widget.contains(document.activeElement)) { widget.style.visibility = ''; return; }
        var blocked = controls.some(function (el) {
          var r = el.getBoundingClientRect(), css = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && css.visibility !== 'hidden' && css.display !== 'none' && r.left < rect.right && r.right > rect.left && r.top < rect.bottom && r.bottom > rect.top;
        });
        widget.style.visibility = blocked ? 'hidden' : '';
      });
    }
    var pendingFit = false;
    function queueFit() { if (pendingFit) return; pendingFit = true; root.requestAnimationFrame(function () { pendingFit = false; fitSupport(); }); }
    root.addEventListener('scroll', queueFit, { passive: true }); root.addEventListener('resize', queueFit); root.addEventListener('load', fitSupport, { once: true }); fitSupport();
    function load() {
      var script = document.createElement('script'); script.src = 'https://storage.ko-fi.com/cdn/scripts/overlay-widget.js'; script.async = true; script.referrerPolicy = 'origin'; script.dataset.sacKofi = '1';
      script.onload = function () {
        if (!root.kofiWidgetOverlay || typeof root.kofiWidgetOverlay.draw !== 'function') return;
        try {
          root.kofiWidgetOverlay.draw('sacramentrpg', {
            'type': 'floating-chat',
            'floating-chat.donateButton.text': 'Support me',
            'floating-chat.donateButton.background-color': '#323842',
            'floating-chat.donateButton.text-color': '#fff'
          });
        } catch { return; }
        var observer;
        function ready() {
          var widget = document.querySelector('.floatingchat-container-wrap, .floatingchat-container-wrap-mobi');
          if (!widget) return;
          var fallback = document.querySelector('.ic-kofi'); if (fallback) fallback.hidden = true;
          widget.setAttribute('aria-label', 'Support Sacrament on Ko-fi');
          fitSupport(); if (observer) observer.disconnect();
        }
        observer = new MutationObserver(ready); observer.observe(document.body, { childList: true, subtree: true }); ready();
        setTimeout(function () { observer.disconnect(); }, 10000);
      };
      script.onerror = function () { /* The direct link remains available. */ };
      document.body.appendChild(script);
    }
    if (document.readyState === 'complete') setTimeout(load, 0);
    else root.addEventListener('load', function () { setTimeout(load, 0); }, { once: true });
  }

  /* Anonymous play counts (site/analytics.js): every page that has this menu. analytics.js itself leaves out the owner's private pages. */
  function stats() {
    if (root.SacStats || document.querySelector('script[src="/analytics.js"]')) return;
    /* until the file arrives, what the table or the solo game counts waits here */
    var early = [], later = function (what) { return function () { early.push([what, Array.prototype.slice.call(arguments)]); }; };
    root.SacStats = { early: early, track: later('track'), clock: later('clock'), stop: later('stop') };
    var s = document.createElement('script'); s.src = '/analytics.js'; document.head.appendChild(s);
  }

  function build() {
    stats();
    backToTop();
    if (document.body.hasAttribute('data-no-nav')) return;
    var path = location.pathname.replace(/index\.html$/, '');
    var focused = /^\/(vtt|character|builder)(\/|$)/.test(path);
    if (focused) {
      var bar = document.createElement('nav'); bar.className = 'sac-nav'; bar.setAttribute('aria-label', 'Sacrament');
      bar.innerHTML = '<a class="sac-mark" href="/" title="Back to the Sacrament home page"><img src="/favicon.svg" alt="" width="24" height="24">Sacrament</a>';
      document.body.insertBefore(bar, document.body.firstChild);
      document.documentElement.style.setProperty('--navh', bar.offsetHeight + 'px');
      /* My heroes is a page you scroll, so it ends with the site footer like every public page; the table and the builder fill the screen and do not. */
      if (/^\/character\/?$/.test(path) && !document.querySelector('body > footer') && !document.body.hasAttribute('data-no-footer')) document.body.insertAdjacentHTML('beforeend', footer());
    } else {
      if (!document.querySelector('link[href="/landing.css"]')) {
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/landing.css'; document.head.appendChild(css);
      }
      if (!document.querySelector('.ic-nav')) document.body.insertAdjacentHTML('afterbegin', navigation(path));
      supportWidget();
      if (!document.querySelector('body > footer') && !document.body.hasAttribute('data-no-footer')) document.body.insertAdjacentHTML('beforeend', footer());
    }
    var main = document.querySelector('main');
    if (main && !focused) {
      if (!main.id) main.id = 'main-content'; main.tabIndex = -1;
      var skip = document.createElement('a'); skip.className = 'site-skip'; skip.href = '#' + main.id; skip.textContent = 'Skip to content'; document.body.insertBefore(skip, document.body.firstChild);
    }
    document.dispatchEvent(new Event('sac-nav-ready'));
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})(typeof window !== 'undefined' ? window : globalThis);
