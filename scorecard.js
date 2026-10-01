/* ==========================================================================
   Group 72 Risk Advisors  ·  scorecard.js
   Insurance Risk Scorecard, short version. 18 questions, 5 categories,
   100 points, no EMR so no rescaling.

   Loss ratio 30 · Claim frequency 20 · Industry 20 · Safety 20 · Fleet 10

   Prospects never see a point value. Everything below is computed here and
   sent with the submission for Jace to review before he presents a score.
   ========================================================================== */

(function (root) {
  'use strict';

  /* ── Reference data ───────────────────────────────────────────────────── */

  // Hidden midpoints. Premium deliberately has no "$0 / no claims" band:
  // every insured business pays premium, and an empty premium would divide
  // by zero in the loss-ratio formula.
  var PREMIUM = {
    'under-10k':      5000,
    '10k-25k':       17500,
    '25k-50k':       37500,
    '50k-100k':      75000,
    '100k-250k':    175000,
    '250k-500k':    375000,
    '500k-1m':      750000,
    'over-1m':     1250000
  };

  var LOSSES = {
    'none':               0,
    'under-10k':       5000,
    '10k-25k':        17500,
    '25k-50k':        37500,
    '50k-100k':       75000,
    '100k-250k':     175000,
    '250k-500k':     375000,
    '500k-1m':       750000,
    'over-1m':      1500000
  };

  var TRADES = {
    contractor: [
      { v: 'interior-painting', t: 'Interior Painting',               p: 20 },
      { v: 'flooring',          t: 'Flooring',                        p: 20 },
      { v: 'cabinets',          t: 'Cabinet and Countertop Install',  p: 20 },
      { v: 'finish-carpentry',  t: 'Finish Carpentry',                p: 20 },
      { v: 'electrical',        t: 'Electrical',                      p: 15 },
      { v: 'plumbing',          t: 'Plumbing',                        p: 15 },
      { v: 'hvac',              t: 'HVAC',                            p: 15 },
      { v: 'drywall',           t: 'Drywall',                         p: 15 },
      { v: 'landscaping',       t: 'Landscaping',                     p: 15 },
      { v: 'fencing',           t: 'Fencing',                         p: 15 },
      { v: 'concrete-flatwork', t: 'Concrete Flatwork',               p: 15 },
      { v: 'general-contractor',t: 'General Contractor',              p:  9 },
      { v: 'framing',           t: 'Framing',                         p:  9 },
      { v: 'masonry',           t: 'Masonry',                         p:  9 },
      { v: 'excavation',        t: 'Excavation and Grading',          p:  9 },
      { v: 'siding-windows',    t: 'Siding and Windows',              p:  9 },
      { v: 'paving',            t: 'Paving',                          p:  9 },
      { v: 'exterior-painting', t: 'Exterior Painting',               p:  9 },
      { v: 'roofing',           t: 'Roofing',                         p:  4 },
      { v: 'demolition',        t: 'Demolition',                      p:  4 },
      { v: 'steel-erection',    t: 'Steel Erection',                  p:  4 },
      { v: 'tree-work',         t: 'Tree Trimming and Removal',       p:  4 },
      { v: 'utility-tower',     t: 'Utility and Tower Work',          p:  4 }
    ],
    manufacturer: [
      { v: 'electronics',       t: 'Electronics and Light Assembly',  p: 20 },
      { v: 'printing',          t: 'Printing',                        p: 20 },
      { v: 'apparel-textiles',  t: 'Apparel and Textiles',            p: 20 },
      { v: 'packaging',         t: 'Packaging',                       p: 20 },
      { v: 'plastics',          t: 'Plastics and Injection Molding',  p: 15 },
      { v: 'cnc-machine',       t: 'CNC and Machine Shop',            p: 15 },
      { v: 'cabinets-furniture',t: 'Cabinets and Furniture',          p: 15 },
      { v: 'food-processing',   t: 'Food Processing',                 p: 15 },
      { v: 'metal-fab',         t: 'Metal Fabrication and Welding',   p:  9 },
      { v: 'woodworking',       t: 'Woodworking',                     p:  9 },
      { v: 'chemical-blending', t: 'Chemical Blending',               p:  9 },
      { v: 'meat-processing',   t: 'Meat Processing',                 p:  9 },
      { v: 'foundry',           t: 'Foundry',                         p:  4 },
      { v: 'sawmill',           t: 'Sawmill',                         p:  4 },
      { v: 'heavy-stamping',    t: 'Heavy Stamping and Forging',      p:  4 },
      { v: 'chemical-mfg',      t: 'Chemical Manufacturing',          p:  4 }
    ]
  };

  var GRADES = [
    { min: 90, label: 'Preferred' },
    { min: 75, label: 'Standard Plus' },
    { min: 60, label: 'Standard' },
    { min:  0, label: 'Needs Attention' }
  ];

  /* ── Scoring ──────────────────────────────────────────────────────────── */

  function tradePoints(businessType, tradeValue) {
    var list = TRADES[businessType];
    if (!list) return 0;                       // business type "Other"
    for (var i = 0; i < list.length; i++) {
      if (list[i].v === tradeValue) return list[i].p;
    }
    return 0;                                  // trade "Other", tier assigned on review
  }

  function lossRatioPoints(ratio) {
    if (ratio === null) return 0;
    if (ratio < 0.20) return 30;
    if (ratio <= 0.30) return 22;
    if (ratio <= 0.50) return 15;
    if (ratio <= 0.70) return 7;
    return 0;
  }

  function frequencyPoints(rate) {
    if (rate === 0) return 20;
    if (rate < 0.25) return 16;
    if (rate < 0.50) return 10;
    if (rate < 1.00) return 5;
    return 0;
  }

  /**
   * @param {object} a  raw answers
   * @returns {object}  score, grade, category breakdown, reviewer flags
   */
  function score(a) {
    var out = { categories: {}, flags: [], hidden: {} };

    /* Industry, 20 */
    var industry = tradePoints(a.businessType, a.trade);
    if (a.businessType === 'contractor' &&
        (a.residential === '51-75' || a.residential === '76-100')) {
      industry -= 3;
    }
    if (a.businessType === 'manufacturer' && a.sensitiveProducts === 'yes') {
      industry -= 4;
    }
    industry = Math.max(0, industry);
    out.categories.industry = industry;

    /* Loss ratio, 30 */
    var premium = PREMIUM[a.premiumBand];
    var losses  = LOSSES[a.lossBand];
    var ratio   = null;
    if (typeof premium === 'number' && premium > 0 && typeof losses === 'number') {
      ratio = losses / (premium * 5);
    }
    out.hidden.premiumValue = premium != null ? premium : null;
    out.hidden.lossValue    = losses  != null ? losses  : null;
    out.hidden.lossRatio    = ratio;
    out.categories.lossRatio = lossRatioPoints(ratio);

    /* Claim frequency, 20 */
    var units  = Math.max(1, (Number(a.employees) || 0) + (Number(a.vehicles) || 0));
    var claims = Number(a.claims) || 0;
    var rate   = (claims / 5) / (units / 10);
    out.hidden.exposureUnits = units;
    out.hidden.claimRate     = rate;
    out.categories.frequency = frequencyPoints(rate);

    /* Safety, 20 */
    var safety = 0;
    safety += ({ '12-plus': 10, '4-11': 7, '1-3': 3, 'none': 0 })[a.safetyMeetings] || 0;
    // "I'm unsure" scores the same as No: only a confirmed Yes earns points.
    if (a.writtenSafetyProgram === 'yes') safety += 5;
    if (a.returnToWork === 'yes') safety += 5;
    out.categories.safety = safety;

    /* Fleet, 10. No vehicles earns the full allocation. */
    var vehicles = Number(a.vehicles) || 0;
    var fleet;
    if (vehicles === 0) {
      fleet = 10;
    } else {
      fleet = 0;
      if (a.driverPolicy === 'yes') fleet += 5;
      fleet += ({ 'most': 5, 'some': 2, 'none': 0 })[a.telematics] || 0;
    }
    out.categories.fleet = fleet;

    /* Total. No EMR in the short version, so no rescaling. */
    var total = industry + out.categories.lossRatio + out.categories.frequency +
                safety + fleet;
    out.score = Math.round(total);
    for (var i = 0; i < GRADES.length; i++) {
      if (out.score >= GRADES[i].min) { out.grade = GRADES[i].label; break; }
    }

    /* Reviewer flags */
    if (a.businessType === 'other' || a.trade === 'other') {
      out.flags.push('Business type or trade is "Other". Assign a tier and recalculate industry points.');
    }
    if (ratio !== null && ratio > 0.70 && claims <= 1) {
      out.flags.push('Loss ratio over 70% on ' + claims + ' claim(s). Likely a single large loss. Confirm before presenting.');
    }
    if (claims > 0 && losses === 0) {
      out.flags.push('Claims reported but losses of $0. Answers conflict, clarify on the call.');
    }
    if (claims === 0 && losses > 0) {
      out.flags.push('Losses reported but 0 claims. Answers conflict, clarify on the call.');
    }
    if (a.businessType === 'contractor' &&
        (a.subcontracted === '51-75' || a.subcontracted === '76-100')) {
      out.flags.push('Subcontracts more than 50% of work. Review contractual risk transfer on the call.');
    }
    var unsure = ['writtenSafetyProgram', 'returnToWork', 'driverPolicy']
      .filter(function (k) { return a[k] === 'unsure'; });
    if (unsure.length) {
      out.flags.push('Answered "I am unsure" on ' + unsure.length +
        ' safety or fleet question(s), scored as No. Worth confirming, the points may be there.');
    }
    return out;
  }

  root.G72Scorecard = {
    PREMIUM: PREMIUM,
    LOSSES: LOSSES,
    TRADES: TRADES,
    GRADES: GRADES,
    score: score
  };
})(typeof window !== 'undefined' ? window : globalThis);

/* ==========================================================================
   Modal controller. Four steps, branching on business type and vehicle
   count, validation per step, and a submit that posts to /api/scorecard.
   ========================================================================== */

(function () {
  'use strict';

  var root   = document.getElementById('scorecard');
  if (!root) return;

  var form   = document.getElementById('scForm');
  var steps  = [].slice.call(root.querySelectorAll('.sc__step'));
  var back   = document.getElementById('scBack');
  var next   = document.getElementById('scNext');
  var submit = document.getElementById('scSubmit');
  var status = document.getElementById('scStatus');
  var done   = document.getElementById('scDone');
  var bar    = document.getElementById('scProgress');
  var typeEl = document.getElementById('scType');
  var trade  = document.getElementById('scTrade');
  var tradeWrap = document.getElementById('scTradeWrap');
  var tradeOtherWrap = document.getElementById('scTradeOtherWrap');
  var lastFocus = null;
  var step = 0;

  /* ── open / close ─────────────────────────────────────────────────────── */

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    root.hidden = false;
    document.body.classList.add('sc-open');
    step = 0; render();
    var first = root.querySelector('input, select');
    if (first) first.focus();
  }
  function close() {
    root.hidden = true;
    document.body.classList.remove('sc-open');
    if (lastFocus) lastFocus.focus();
  }
  document.querySelectorAll('[data-scorecard-open]').forEach(function (el) {
    el.addEventListener('click', open);
  });
  document.querySelectorAll('[data-scorecard-close]').forEach(function (el) {
    el.addEventListener('click', close);
  });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !root.hidden) close();
  });
  // deep link: /#scorecard opens it
  if (location.hash === '#scorecard') open();

  /* ── branching ────────────────────────────────────────────────────────── */

  function fillTrades(type) {
    var list = window.G72Scorecard.TRADES[type];
    tradeWrap.hidden = !list;
    trade.innerHTML = '';
    if (!list) { tradeOtherWrap.hidden = (type !== 'other'); return; }
    var o = document.createElement('option');
    o.value = ''; o.textContent = 'Select one'; trade.appendChild(o);
    list.forEach(function (t) {
      var op = document.createElement('option');
      op.value = t.v; op.textContent = t.t; trade.appendChild(op);
    });
    var other = document.createElement('option');
    other.value = 'other'; other.textContent = 'Other'; trade.appendChild(other);
    tradeOtherWrap.hidden = true;
  }

  function applyBranching() {
    var type = typeEl.value;
    root.querySelectorAll('[data-only]').forEach(function (el) {
      el.hidden = el.getAttribute('data-only') !== type;
    });
    var veh = Number((form.elements.vehicles || {}).value || 0);
    root.querySelectorAll('[data-fleet]').forEach(function (el) { el.hidden = veh === 0; });
    var nofleet = root.querySelector('[data-nofleet]');
    if (nofleet) nofleet.hidden = veh !== 0;
  }

  typeEl.addEventListener('change', function () { fillTrades(typeEl.value); applyBranching(); });
  trade.addEventListener('change', function () {
    tradeOtherWrap.hidden = trade.value !== 'other';
  });
  form.elements.vehicles.addEventListener('input', applyBranching);

  /* ── steps ────────────────────────────────────────────────────────────── */

  function render() {
    steps.forEach(function (s, i) { s.classList.toggle('is-on', i === step); });
    back.hidden = step === 0;
    next.hidden = step === steps.length - 1;
    submit.hidden = step !== steps.length - 1;
    bar.style.transform = 'scaleX(' + ((step + 1) / steps.length) + ')';
    status.textContent = '';
    status.classList.remove('is-error');
    root.querySelector('.sc__panel').scrollTop = 0;
  }

  function validate() {
    var ok = true;
    steps[step].querySelectorAll('input, select').forEach(function (el) {
      var wrap = el.closest('.sf, .sc__check');
      if (wrap && wrap.hidden) return;
      var need = el.hasAttribute('required');
      var good = el.type === 'checkbox' ? el.checked
                                        : (!need || (el.value.trim() !== '' && el.checkValidity()));
      if (wrap) wrap.classList.toggle('is-invalid', !good);
      if (!good) ok = false;
    });
    if (!ok) {
      status.textContent = step === steps.length - 1
        ? 'Both boxes need to be checked before we can accept the form.'
        : 'A few answers are still needed on this step.';
      status.classList.add('is-error');
    }
    return ok;
  }

  next.addEventListener('click', function () {
    if (!validate()) return;
    step = Math.min(step + 1, steps.length - 1);
    render();
  });
  back.addEventListener('click', function () {
    step = Math.max(step - 1, 0); render();
  });
  form.addEventListener('input', function (e) {
    var wrap = e.target.closest('.sf, .sc__check');
    if (wrap) wrap.classList.remove('is-invalid');
  });

  /* ── submit ───────────────────────────────────────────────────────────── */

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;

    var answers = {};
    new FormData(form).forEach(function (v, k) { answers[k] = v; });
    answers.attestation = !!form.elements.attestation.checked;
    answers.disclaimer  = !!form.elements.disclaimer.checked;

    var result = window.G72Scorecard.score(answers);

    status.textContent = 'Sending...';
    submit.disabled = true;

    fetch('/api/scorecard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers, result: result })
    })
      .then(function (r) { if (!r.ok) throw new Error('bad status ' + r.status); })
      .then(function () {
        form.hidden = true;
        root.querySelector('.sc__progress').hidden = true;
        done.hidden = false;
      })
      .catch(function () {
        submit.disabled = false;
        status.textContent = 'That did not send. Email jace@group72ins.com and we will pick it up from there.';
        status.classList.add('is-error');
      });
  });

  fillTrades('');
  applyBranching();
})();
