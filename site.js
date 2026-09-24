/* ==========================================================================
   Group 72 Risk Advisors  ·  site.js
   ========================================================================== */

(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var body = document.body;

  /* ── 0. Brand artwork detection ────────────────────────────────────────
     Every logo has a typeset fallback beside it. If the PNG is not in
     /assets yet, hide the image and reveal the type. Never shows broken. */

  function wireFallback(img) {
    var swap = function () {
      img.style.display = 'none';
      var fb = img.parentNode && img.parentNode.querySelector('.brand__fallback');
      if (fb) fb.style.display = 'grid';
    };
    img.addEventListener('error', swap);
    if (img.complete && img.naturalWidth === 0) swap();
  }
  document.querySelectorAll('.brand img').forEach(wireFallback);

  /* ── 1. Load screen ────────────────────────────────────────────────────
     Five pillars cycle through the ring, then resolve into the lockup. */

  var intro    = document.getElementById('intro');
  var label    = document.getElementById('introLabel');
  var lockup   = document.getElementById('introLockup');
  var fallback = document.getElementById('introFallback');
  var glyphs   = intro ? [].slice.call(intro.querySelectorAll('.intro__glyph')) : [];

  var finished = false;
  function finishIntro() {
    if (finished) return;
    finished = true;
    body.classList.remove('is-loading');
    body.classList.add('intro-done');
    setTimeout(function () { if (intro && intro.parentNode) intro.remove(); }, 1400);
  }

  // Hard stop. Whatever happens above, the page appears.
  var bail = setTimeout(finishIntro, 7000);

  function ready(img) {
    return new Promise(function (res) {
      if (img.complete) return res(img.naturalWidth > 0);
      img.addEventListener('load',  function () { res(img.naturalWidth > 0); });
      img.addEventListener('error', function () { res(false); });
    });
  }

  function runIntro() {
    if (!intro) { clearTimeout(bail); finishIntro(); return; }

    if (reduce) {
      intro.classList.add('is-resolved');
      setTimeout(function () { clearTimeout(bail); finishIntro(); }, 400);
      return;
    }

    Promise.all(glyphs.concat([lockup]).map(ready)).then(function (results) {
      var haveArt = results.every(Boolean);

      if (!haveArt) {
        // Artwork not dropped into /assets yet. Typeset load screen instead.
        intro.classList.add('no-art');
        if (fallback) fallback.style.display = 'grid';
        setTimeout(function () { intro.classList.add('is-resolved'); }, 220);
        setTimeout(function () { clearTimeout(bail); finishIntro(); }, 1500);
        return;
      }

      var STEP = 330, i = 0;
      intro.classList.add('has-art');

      function step() {
        glyphs.forEach(function (g, n) { g.classList.toggle('is-on', n === i); });
        if (label) label.textContent = glyphs[i].dataset.pillar || '';
        i++;
        if (i < glyphs.length) {
          setTimeout(step, STEP);
        } else {
          setTimeout(function () {
            intro.classList.add('is-resolved');   // ring out, lockup in and grows
            setTimeout(function () { clearTimeout(bail); finishIntro(); }, 1650);
          }, STEP);
        }
      }
      step();
    });
  }

  if (document.readyState === 'complete') runIntro();
  else window.addEventListener('load', runIntro);

  /* ── 2. Scroll reveal ──────────────────────────────────────────────────── */

  var reveals = document.querySelectorAll('[data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', (i % 4) * 85 + 'ms');
      io.observe(el);
    });
  }

  /* ── 3. Counters ───────────────────────────────────────────────────────── */

  function countUp(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    if (reduce) { el.textContent = target; return; }
    var dur = 1250, t0 = performance.now();
    (function tick(t) {
      var p = Math.min((t - t0) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    })(t0);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (es, o) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        countUp(e.target); o.unobserve(e.target);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(countUp);
  }

  /* ── 4. Nav ────────────────────────────────────────────────────────────── */

  var nav = document.getElementById('nav');
  var burger = document.getElementById('burger');
  var mobileNav = document.getElementById('mobileNav');

  function onScroll() {
    if (nav) nav.classList.toggle('is-stuck', window.scrollY > 24);
    var max = document.body.scrollHeight - window.innerHeight;
    document.documentElement.style.setProperty(
      '--scroll-progress', (max > 0 ? window.scrollY / max : 0).toFixed(4)
    );
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeNav() {
    if (!burger || !mobileNav) return;
    burger.classList.remove('is-open');
    burger.setAttribute('aria-expanded', 'false');
    mobileNav.hidden = true;
    body.classList.remove('nav-open');
  }
  if (burger && mobileNav) {
    burger.addEventListener('click', function () {
      var open = burger.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      mobileNav.hidden = !open;
      body.classList.toggle('nav-open', open);
    });
    mobileNav.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
    window.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeNav();
    });
  }

  /* ── 5. Form ───────────────────────────────────────────────────────────── */

  var form = document.getElementById('leadForm');
  var status = document.getElementById('formStatus');

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      status.classList.remove('is-error');

      var ok = true;
      form.querySelectorAll('[required]').forEach(function (input) {
        var wrap = input.closest('.ff');
        var valid = input.checkValidity() && input.value.trim() !== '';
        if (wrap) wrap.classList.toggle('is-invalid', !valid);
        if (!valid) ok = false;
      });
      if (!ok) {
        status.textContent = 'Add your name and a working email and we will take it from there.';
        status.classList.add('is-error');
        return;
      }

      var payload = Object.fromEntries(new FormData(form).entries());
      status.textContent = 'Sending...';

      // TODO: point at the real endpoint. Mirror api/submit-lead.js in the studio repo.
      fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { if (!r.ok) throw new Error('no endpoint'); return r; })
        .then(function () {
          form.reset();
          status.textContent = 'Got it. Jace will be in touch within one business day.';
        })
        .catch(function () {
          status.textContent = 'The form endpoint is not live yet. Email jace@group72ins.com directly.';
          status.classList.add('is-error');
        });
    });

    form.querySelectorAll('input, select, textarea').forEach(function (el) {
      el.addEventListener('input', function () {
        var wrap = el.closest('.ff');
        if (wrap) wrap.classList.remove('is-invalid');
      });
    });
  }

  /* ── 6. Housekeeping ───────────────────────────────────────────────────── */

  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();

  // Pillar icons and the portrait mark hide themselves if not yet dropped in.
  document.querySelectorAll('.pillar__ico, .portrait-ph__mark').forEach(function (im) {
    var hide = function () { im.style.display = 'none'; };
    im.addEventListener('error', hide);
    if (im.complete && im.naturalWidth === 0) hide();
  });
})();
