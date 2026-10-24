/* One navigation and footer definition for built pages and older public pages. */
(function (root) {
  'use strict';
  var PAGES = [
    ['Home', '/'], ['Start here', '/how-to-play/'], ['The game', '/the-game/'],
    ['The setting', '/setting/'], ['Resources', '/resources/'], ['News', '/news/'], ['Feedback', '/feedback/']
  ];
  function section(path) {
    path = path.replace(/index\.html$/, '');
    if (/^\/(player-guide|gm-guide|rules)(\/|$)/.test(path)) return '/how-to-play/';
    if (/^\/(loot|brand|adventure)(\/|$)/.test(path)) return '/resources/';
    if (/^\/(blog|news)(\/|$)/.test(path)) return '/news/';
    var match = PAGES.filter(function (p) { return p[1] === '/' ? path === '/' : path.indexOf(p[1]) === 0; })[0];
    return match ? match[1] : '';
  }
  function navigation(path) {
    var current = section(path);
    return '<nav class="ic-nav" aria-label="Sacrament RPG"><div class="ic-nav-inner"><a class="ic-brand" href="/" aria-label="Sacrament RPG home"><img src="/favicon.svg" alt="" width="28" height="28">Sacrament RPG</a><ul>' + PAGES.map(function (p) { return '<li><a href="' + p[1] + '"' + (p[1] === current ? ' aria-current="page"' : '') + '>' + p[0] + '</a></li>'; }).join('') + '</ul><div class="ic-kofi"><a class="btn kofi-button" href="https://ko-fi.com/J4M02969C2" target="_blank" rel="noopener noreferrer" aria-label="Support Sacrament on Ko-fi (opens in a new tab)">Support me on Ko-fi</a></div></div></nav>';
  }
  function footer() {
    return '<footer class="ic-foot"><div class="wrap"><div class="site-footer-grid"><div><b>Sacrament RPG</b><p>A dark fantasy game and a shared table in your browser.</p></div><nav aria-label="Play and learn"><b>Play and learn</b><a href="/how-to-play/">First game checklist</a><a href="/vtt/?join">Join a table</a><a href="/vtt/?run">Create a table</a><a href="/character/">My heroes</a><a href="/player-guide/">Player rules</a><a href="/gm-guide/">GM rules</a></nav><nav aria-label="Explore and get help"><b>Explore and get help</b><a href="/resources/">Downloads and reference</a><a href="/loot/">Current Loot Tables</a><a href="/news/">Latest news</a><a href="/feedback/">Send feedback</a></nav></div><p class="site-legal"><a href="/privacy/">Privacy Policy</a> · <a href="/terms/">Terms of Use</a></p><p>© ' + new Date().getFullYear() + ' Dungeon Jukebox, also known as Damien Bidmead. All rights reserved.</p></div></footer>';
  }
  root.SacramentSite = { navigation: navigation, footer: footer, section: section };
  if (typeof document === 'undefined') return;
  try { localStorage.removeItem('sacrament-theme'); } catch (e) {}
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

  function build() {
    backToTop();
    if (document.body.hasAttribute('data-no-nav')) return;
    var path = location.pathname.replace(/index\.html$/, '');
    var focused = /^\/(vtt|character|builder)(\/|$)/.test(path);
    if (focused) {
      var bar = document.createElement('nav'); bar.className = 'sac-nav'; bar.setAttribute('aria-label', 'Sacrament');
      bar.innerHTML = '<a class="sac-mark" href="/" title="Back to the Sacrament home page"><img src="/favicon.svg" alt="" width="24" height="24">Sacrament</a>';
      document.body.insertBefore(bar, document.body.firstChild);
      document.documentElement.style.setProperty('--navh', bar.offsetHeight + 'px');
    } else {
      if (!document.querySelector('link[href="/landing.css"]')) {
        var css = document.createElement('link'); css.rel = 'stylesheet'; css.href = '/landing.css'; document.head.appendChild(css);
      }
      if (!document.querySelector('.ic-nav')) document.body.insertAdjacentHTML('afterbegin', navigation(path));
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
