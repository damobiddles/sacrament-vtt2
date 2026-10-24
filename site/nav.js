/* Sacrament shared navigation.
   Add <script src="/nav.js"></script> (or ../nav.js) to the <head> of any page and it gets the same top bar.
   To add a page to the bar, add it to PAGES below. Colours and fonts come from theme.css. */
(function () {
  var PAGES = [
    ['Home', '/'],
    ['Rules and guides', '/rules/'],
    ['Resources', '/resources/'],
    ['Updates', '/blog/']
  ];
  var root = document.documentElement;
  // There is one theme (dark). A light choice saved in someone's browser by the earlier version is cleared and ignored.
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
    if (document.body.hasAttribute('data-no-nav') || document.body.hasAttribute('data-focus')) return;
    var path = location.pathname.replace(/index\.html$/, '');
    var bar = document.createElement('nav');
    bar.className = 'sac-nav';
    bar.setAttribute('aria-label', 'Sacrament');
    // The VTT, the character builder and the admin node builder are not reached from this bar. Inside them
    // the bar carries nothing that leads away, so only the logo, which goes home, and the theme switch are left.
    var focused = path.indexOf('/vtt/') === 0 || document.body.hasAttribute('data-focus') || path.indexOf('/character/') === 0 || path.indexOf('/builder/') === 0;
    var links = focused ? '' : PAGES.map(function (p) {
      var on = p[1] === '/' ? path === '/' : path.indexOf(p[1]) === 0 || (p[1] === '/resources/' && path.indexOf('/brand/') === 0);
      return '<a href="' + p[1] + '"' + (on ? ' aria-current="page"' : '') + '>' + p[0] + '</a>';
    }).join('');
    bar.innerHTML = '<a class="sac-mark" href="/" title="Back to the Sacrament home page"><img src="/favicon.svg" alt="" width="24" height="24">Sacrament</a>' + '<span class="sac-links">' + links + '</span>';
    document.body.insertBefore(bar, document.body.firstChild);
    // A copyright line on every page that is not the table or the node builder. The landing page has its own footer.
    if (!document.querySelector('footer') && path.indexOf('/builder/') !== 0 && !document.body.hasAttribute('data-no-footer')) {
      var foot = document.createElement('footer');
      foot.className = 'sac-foot';
      foot.innerHTML = '<b>Sacrament</b><p><a href="/privacy/">Privacy Policy</a> &middot; <a href="/terms/">Terms of Use</a></p><p>&copy; ' + new Date().getFullYear() + ' Dungeon Jukebox, also known as Damien Bidmead. All rights reserved.</p>';
      document.body.appendChild(foot);
    }
    document.dispatchEvent(new Event('sac-nav-ready'));
    root.style.setProperty('--navh', bar.offsetHeight + 'px');
  }
  if (document.body) build(); else document.addEventListener('DOMContentLoaded', build);
})();
