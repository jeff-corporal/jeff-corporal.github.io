/* =========================================================
   Jeff Corporal, CPA — page behavior
   ========================================================= */

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Hero reconciliation: balances after the loading screen ---------- */
  function playRecon() {
    var recon = document.getElementById('recon');
    var diff = document.getElementById('reconDiff');
    if (!recon || recon.classList.contains('run') || recon.classList.contains('show')) return;

    if (reduceMotion) { recon.classList.add('show'); return; }

    recon.classList.add('run');
    if (!diff) return;

    // the "Difference" counts down to 0.00 right after the adjusting row appears
    var start = 1240.50;
    var delay = 2000;      // ms after the sequence starts
    var length = 900;      // ms the count takes
    diff.textContent = format(start);

    setTimeout(function () {
      var t0 = performance.now();
      (function tick(now) {
        var p = Math.max(0, Math.min((now - t0) / length, 1));
        var eased = 1 - Math.pow(1 - p, 3);
        diff.textContent = format(start * (1 - eased));
        if (p < 1) requestAnimationFrame(tick);
        else diff.textContent = '0.00';
      })(t0);
    }, delay);
  }

  function format(n) {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /* ---------- 2. Loading screen ----------
     Plays once per visit (not on every refresh), and you can click to skip it. */
  var loader = document.getElementById('loader');
  var seen = false;
  try { seen = sessionStorage.getItem('jc-loaded') === '1'; } catch (e) {}

  function finishLoading() {
    if (!loader || loader.classList.contains('done')) return;
    loader.classList.add('done');
    try { sessionStorage.setItem('jc-loaded', '1'); } catch (e) {}
    setTimeout(playRecon, 500);   // start once the screen has mostly slid away
  }

  if (!loader || seen || reduceMotion) {
    if (loader) loader.classList.add('skip', 'done');
    document.addEventListener('DOMContentLoaded', playRecon);
  } else {
    var minTime = new Promise(function (r) { setTimeout(r, 2500); });
    var pageReady = new Promise(function (r) {
      if (document.readyState === 'complete') r();
      else window.addEventListener('load', r);
    });
    Promise.all([minTime, pageReady]).then(finishLoading);
    setTimeout(finishLoading, 5000);            // safety net on slow connections
    loader.addEventListener('click', finishLoading);
  }

  document.addEventListener('DOMContentLoaded', function () {

    /* ---------- 3. Moving tools row: copy the list so it loops smoothly ---------- */
    document.querySelectorAll('.track').forEach(function (track) {
      Array.prototype.slice.call(track.children).forEach(function (li) {
        var copy = li.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        track.appendChild(copy);
      });
      track.classList.add('ready');
    });

    /* ---------- 4. Menu: sliding highlight + active section ---------- */
    var nav = document.getElementById('nav');
    var indicator = document.getElementById('navIndicator');
    var links = Array.prototype.slice.call(nav.querySelectorAll('a'));
    var targets = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
    var current = null;
    var navigating = false;
    var navTimer;

    function moveIndicator(link) {
      indicator.style.width = link.offsetWidth + 'px';
      indicator.style.height = link.offsetHeight + 'px';
      indicator.style.transform = 'translate(' + link.offsetLeft + 'px,' + link.offsetTop + 'px)';
    }

    function setActive(i) {
      if (current === i) return;
      current = i;
      links.forEach(function (a, n) { a.classList.toggle('active', n === i); });
      moveIndicator(links[i]);
      // on phones the menu scrolls sideways, so keep the active link in view
      if (nav.scrollWidth > nav.clientWidth) {
        var l = links[i];
        nav.scrollTo({ left: l.offsetLeft - (nav.clientWidth - l.offsetWidth) / 2, behavior: 'smooth' });
      }
    }

    function whichSection() {
      var line = window.innerHeight * 0.35;
      var active = 0;
      targets.forEach(function (t, i) {
        if (t && t.getBoundingClientRect().top <= line) active = i;
      });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
        active = targets.length - 1;
      }
      return active;
    }

    /* ---------- 5. Scroll progress bar ---------- */
    var bar = document.getElementById('progress');
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
        if (!navigating) setActive(whichSection());
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () {
      if (current !== null) moveIndicator(links[current]);
    });
    setActive(whichSection());
    onScroll();

    /* ---------- 6. Clicking a link: glide there and outline where you landed ---------- */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var target = document.querySelector(a.getAttribute('href'));
        if (!target) return;

        var idx = targets.indexOf(target);
        if (idx > -1) setActive(idx);
        if (reduceMotion) return;

        navigating = true;
        target.classList.remove('spot');
        void target.offsetWidth;          // restart the animation
        target.classList.add('spot');

        clearTimeout(navTimer);
        navTimer = setTimeout(function () {
          target.classList.remove('spot');
          navigating = false;
          setActive(whichSection());
        }, 1300);
      });
    });

    /* ---------- 7. FAQ: only one answer open at a time ---------- */
    var faqs = document.querySelectorAll('.faq details');
    faqs.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        faqs.forEach(function (other) { if (other !== d) other.open = false; });
      });
    });

    /* ---------- 8. Footer year ---------- */
    var year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  });
})();
