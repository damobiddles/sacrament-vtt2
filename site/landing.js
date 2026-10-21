/* The newsletter form on /newsletter/. Stage 1: it checks the form and says plainly that signup is not switched on. It sends nothing anywhere. */
(function () {
  var f = document.getElementById('newsletter'); if (!f) return;
  var msg = document.getElementById('nl-msg'), email = document.getElementById('nl-email'), consent = document.getElementById('nl-consent');
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
    msg.className = 'msg bad';
    if (!ok) { msg.textContent = 'Please type your email address.'; email.focus(); return; }
    if (!consent.checked) { msg.textContent = 'Please tick the box to say you are happy to be emailed.'; consent.focus(); return; }
    msg.className = 'msg';
    msg.textContent = 'Thank you. Signup is not switched on yet, so nothing was sent. Please come back soon.';
  });
})();
