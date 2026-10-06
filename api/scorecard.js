/* ==========================================================================
   POST /api/scorecard
   Emails a completed Insurance Risk Scorecard to Jace via Resend's REST API.

   No npm dependency: this calls the API with fetch, which Vercel's Node
   runtime provides natively. That means no package.json, no install step
   on deploy, and nothing to keep patched.

   Environment variables in Vercel:
     RESEND_API_KEY    required. from resend.com, starts "re_"
     SCORECARD_TO      required. e.g. jace@group72ins.com
     SCORECARD_FROM    optional. defaults to Resend's shared sender, which
                       works immediately. To send as @group72insurance.com,
                       verify the domain in Resend first, then set this.
     SCORECARD_CC      optional, comma separated

   The prospect is never shown the score. It is delivered here so Jace can
   check the reviewer flags before presenting it.
   ========================================================================== */

const LABELS = {
  businessName: 'Business name',
  contactName: 'Contact',
  contactTitle: 'Title',
  email: 'Email',
  phone: 'Phone',
  businessType: 'Business type',
  trade: 'Primary trade',
  tradeOther: 'Described as',
  employees: 'Employees',
  vehicles: 'Vehicles',
  residential: 'Residential work',
  subcontracted: 'Work subcontracted',
  sensitiveProducts: 'Sensitive products',
  premiumBand: 'Avg annual premium (5 yr)',
  lossBand: 'Total incurred losses (5 yr)',
  claims: 'Claims filed (5 yr)',
  safetyMeetings: 'Safety meetings per year',
  writtenSafetyProgram: 'Written safety program',
  returnToWork: 'Return-to-work program',
  driverPolicy: 'Written driver policy',
  telematics: 'Telematics or dash cams'
};

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    RESEND_API_KEY,
    MAIL_TO, SCORECARD_TO,          // MAIL_TO is shared with /api/lead
    MAIL_FROM, SCORECARD_FROM,
    MAIL_CC, SCORECARD_CC
  } = process.env;

  const to   = MAIL_TO || SCORECARD_TO;
  const from = SCORECARD_FROM || MAIL_FROM || 'Group 72 Scorecard <onboarding@resend.dev>';
  const cc   = SCORECARD_CC || MAIL_CC;

  if (!RESEND_API_KEY || !to) {
    console.error('scorecard: missing RESEND_API_KEY or MAIL_TO');
    return res.status(500).json({ error: 'Mail is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  }
  const answers = (body && body.answers) || {};
  const result  = (body && body.result)  || {};

  if (!answers.email || !answers.businessName) {
    return res.status(400).json({ error: 'Missing business name or email' });
  }
  if (!answers.attestation || !answers.disclaimer) {
    return res.status(400).json({ error: 'Attestation and disclaimer are required' });
  }

  const cat   = result.categories || {};
  const hid   = result.hidden || {};
  const flags = Array.isArray(result.flags) ? result.flags : [];

  const rows = Object.keys(LABELS)
    .filter((k) => answers[k] !== undefined && answers[k] !== '')
    .map((k) => `<tr><td style="padding:4px 14px 4px 0;color:#6b7280">${esc(LABELS[k])}</td>
                     <td style="padding:4px 0"><strong>${esc(answers[k])}</strong></td></tr>`)
    .join('');

  const breakdown = [
    ['Loss ratio', cat.lossRatio, 30],
    ['Claim frequency', cat.frequency, 20],
    ['Industry / trade', cat.industry, 20],
    ['Safety program', cat.safety, 20],
    ['Fleet and drivers', cat.fleet, 10]
  ].map(([n, v, m]) =>
      `<tr><td style="padding:3px 14px 3px 0">${n}</td>
           <td style="padding:3px 0"><strong>${v == null ? 0 : v}</strong> / ${m}</td></tr>`
    ).join('');

  const ratioPct  = typeof hid.lossRatio === 'number' ? (hid.lossRatio * 100).toFixed(1) + '%' : 'n/a';
  const ratePer10 = typeof hid.claimRate === 'number' ? hid.claimRate.toFixed(3) : 'n/a';

  const flagHtml = flags.length
    ? `<div style="margin-top:22px;padding:14px 16px;border-left:3px solid #DD7227;background:#fdf6f1">
         <p style="margin:0 0 8px;font-weight:600;color:#0E2445">Review before presenting</p>
         <ul style="margin:0;padding-left:18px;color:#374151">
           ${flags.map((f) => `<li style="margin-bottom:5px">${esc(f)}</li>`).join('')}
         </ul></div>`
    : '';

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:640px;color:#0E2445">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#AC935B">
      Insurance Risk Scorecard</p>
    <h1 style="margin:0 0 18px;font-size:22px">${esc(answers.businessName)}</h1>

    <div style="padding:16px 18px;background:#E9E5DC;border-radius:3px">
      <div style="font-size:38px;font-weight:700;line-height:1">${esc(result.score)}<span
        style="font-size:17px;font-weight:400;color:#6b7280">/100</span></div>
      <div style="margin-top:2px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#AC935B">
        ${esc(result.grade)}</div>
    </div>

    <h2 style="margin:24px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Breakdown</h2>
    <table style="font-size:14px;border-collapse:collapse">${breakdown}</table>

    <h2 style="margin:24px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Derived</h2>
    <table style="font-size:14px;border-collapse:collapse">
      <tr><td style="padding:3px 14px 3px 0">Loss ratio</td><td><strong>${ratioPct}</strong></td></tr>
      <tr><td style="padding:3px 14px 3px 0">Exposure units</td><td><strong>${esc(hid.exposureUnits)}</strong></td></tr>
      <tr><td style="padding:3px 14px 3px 0">Claims / yr / 10 units</td><td><strong>${ratePer10}</strong></td></tr>
    </table>

    ${flagHtml}

    <h2 style="margin:24px 0 6px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280">Answers</h2>
    <table style="font-size:14px;border-collapse:collapse">${rows}</table>

    <p style="margin-top:26px;font-size:11px;line-height:1.5;color:#9ca3af">
      Educational assessment only. Not a quote, an underwriting decision, a carrier rating,
      or a guarantee of coverage. Attestation and disclaimer were both accepted at submission.</p>
  </div>`;

  const payload = {
    from,
    to: to.split(',').map((s) => s.trim()).filter(Boolean),
    reply_to: answers.email,
    subject: `Scorecard: ${answers.businessName}, ${result.score}/100 ${result.grade}`,
    html
  };
  if (cc) payload.cc = cc.split(',').map((s) => s.trim()).filter(Boolean);

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      console.error('scorecard: resend responded', r.status, await r.text());
      return res.status(502).json({ error: 'Send failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('scorecard: send failed', err);
    return res.status(502).json({ error: 'Send failed' });
  }
};
