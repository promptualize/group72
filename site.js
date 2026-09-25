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
    runHeadline();
    setTimeout(function () { if (intro && intro.parentNode) intro.remove(); }, 1400);
  }

  /* ── 1a. Headline build ────────────────────────────────────────────────
     "Insurance for" types itself, then the black words land one at a time.
     Staged synchronously so nothing flashes before the intro clears. The
     full text lives in the HTML, so with JS off the headline just reads. */

  var tw    = document.querySelector('.hero__h .tw');
  var black = document.querySelector('.hero__h .black');
  var words = black ? [].slice.call(black.querySelectorAll('.w')) : [];
  var typeText = tw ? tw.textContent : '';

  if (!reduce && tw && words.length) {
    tw.textContent = '';
    black.classList.add('is-staged');
  }

  function runHeadline() {
    if (reduce || !tw || !words.length) return;

    var i = 0;
    tw.classList.add('is-typing');

    function type() {
      tw.textContent = typeText.slice(0, ++i);
      if (i < typeText.length) {
        // slight jitter keeps it off a metronome
        setTimeout(type, 88 + Math.random() * 46);
      } else {
        setTimeout(function () { tw.classList.remove('is-typing'); }, 620);
        words.forEach(function (w, n) {
          setTimeout(function () { w.classList.add('is-set'); }, 300 + n * 330);
        });
      }
    }
    setTimeout(type, 430);
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
    // Two thresholds give hysteresis: reveal once 12% is showing, and only
    // re-arm once the element is completely gone. Without the gap, anything
    // sitting near a viewport edge would flicker on every scroll tick.
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.intersectionRatio >= 0.12) e.target.classList.add('is-in');
        else if (e.intersectionRatio === 0) e.target.classList.remove('is-in');
      });
    }, { threshold: [0, 0.12], rootMargin: '0px 0px -7% 0px' });
    reveals.forEach(function (el, i) {
      el.style.setProperty('--reveal-delay', (i % 4) * 85 + 'ms');
      io.observe(el);
    });
  }

  /* ── 2a. Coverage rows, active on touch ────────────────────────────────
     Desktop gilds and indents a row on hover. Touch has no hover, so the
     same treatment follows scroll position: a narrow band across the middle
     of the viewport marks whichever row is passing through it. */

  var rows = document.querySelectorAll('.lines li');
  var mqRows = window.matchMedia('(max-width: 700px)');

  if (rows.length && !reduce && 'IntersectionObserver' in window) {
    var rio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        e.target.classList.toggle('is-hot', e.isIntersecting && mqRows.matches);
      });
    }, { rootMargin: '-49% 0px -49% 0px', threshold: 0 });
    rows.forEach(function (li) { rio.observe(li); });

    // leaving mobile clears any row left lit
    mqRows.addEventListener('change', function () {
      if (!mqRows.matches) {
        rows.forEach(function (li) { li.classList.remove('is-hot'); });
      }
    });
  }

  /* ── 2b. Lines we place ────────────────────────────────────────────────
     Each line is written at a rate drawn from its own length, so a long
     phrase takes longer than a short one the way a hand would. Lines
     overlap slightly so eight of them do not take eight beats. */

  var script = document.querySelector('.script');
  if (script && !reduce) {
    var at = 0;
    [].forEach.call(script.querySelectorAll('li'), function (li) {
      var chars = li.textContent.trim().length;
      var t = Math.max(0.36, chars * 0.032);
      li.style.setProperty('--t', t.toFixed(2) + 's');
      li.style.setProperty('--d', at.toFixed(2) + 's');
      at += t * 0.52;
    });
  }

  /* ── 3. Pillar carousel (mobile) ───────────────────────────────────────
     The four cards become a snap carousel under 700px. Auto-rotates, and
     stops for good the moment the visitor takes over. */

  function carousel(trackSel, dotsId, label) {
    var track = document.querySelector(trackSel);
    var dotsBox = document.getElementById(dotsId);
    if (!track || !dotsBox) return;

    var mq = window.matchMedia('(max-width: 700px)');
    var cards = [].slice.call(track.children);
    var timer = null, userTook = false;

    cards.forEach(function (card, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'tab');
      var name = card.querySelector('.pillar__i, h3');
      b.setAttribute('aria-label', name ? name.textContent : label + ' ' + (i + 1));
      b.addEventListener('click', function () { userTook = true; stop(); goTo(i); });
      dotsBox.appendChild(b);
    });
    var dots = [].slice.call(dotsBox.children);

    function mark(i) {
      dots.forEach(function (d, n) { d.setAttribute('aria-selected', String(n === i)); });
      cards.forEach(function (c, n) { c.classList.toggle('is-active', n === i); });
    }
    function current() {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }
    function goTo(i) {
      var c = cards[i];
      track.scrollTo({ left: c.offsetLeft - (track.clientWidth - c.offsetWidth) / 2, behavior: 'smooth' });
      mark(i);
    }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function start() {
      if (timer || userTook || reduce || !mq.matches) return;
      timer = setInterval(function () { goTo((current() + 1) % cards.length); }, 4000);
    }

    track.addEventListener('scroll', function () { mark(current()); }, { passive: true });
    ['pointerdown', 'touchstart', 'wheel'].forEach(function (ev) {
      track.addEventListener(ev, function () { userTook = true; stop(); }, { passive: true });
    });
    mq.addEventListener('change', function () { stop(); start(); mark(current()); });

    mark(0);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.25 }).observe(track);
    } else { start(); }
  }

  carousel('.pillars', 'pillarDots', 'Pillar');

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

  // Pillar icons hide themselves if the artwork is not in /assets.
  document.querySelectorAll('.pillar__ico').forEach(function (im) {
    var hide = function () { im.style.display = 'none'; };
    im.addEventListener('error', hide);
    if (im.complete && im.naturalWidth === 0) hide();
  });
})();
