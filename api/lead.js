/* ==========================================================================
   POST /api/lead
   Emails a contact-form submission to Jace via Resend's REST API.

   No npm dependency: plain fetch on Vercel's Node runtime, so there is no
   package.json and no install step on deploy.

   Environment variables in Vercel (shared with /api/scorecard):
     RESEND_API_KEY   required. from resend.com, starts "re_"
     MAIL_TO          required. e.g. jace@group72ins.com
     MAIL_FROM        optional. defaults to Resend's shared sender, which works
                      immediately. To send as @group72insurance.com, verify the
                      domain in Resend first, then set this.
     MAIL_CC          optional, comma separated
   ========================================================================== */

const esc = (s) =>
  String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const FIELDS = {
  name: 'Name',
  company: 'Company',
  email: 'Email',
  phone: 'Phone',
  message: 'Message'
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    RESEND_API_KEY,
    MAIL_TO,
    SCORECARD_TO,                 // fallback so one recipient var can serve both
    MAIL_FROM = 'Group 72 Website <onboarding@resend.dev>',
    MAIL_CC
  } = process.env;

  const to = MAIL_TO || SCORECARD_TO;
  if (!RESEND_API_KEY || !to) {
    console.error('lead: missing RESEND_API_KEY or MAIL_TO');
    return res.status(500).json({ error: 'Mail is not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: 'Bad JSON' }); }
  }
  body = body || {};

  // Honeypot. Real people never fill this; bots fill every field they find.
  // Answer 200 so the bot believes it succeeded and does not retry.
  if (body.website) return res.status(200).json({ ok: true });

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'That email does not look right' });
  }

  const rows = Object.keys(FIELDS)
    .filter((k) => String(body[k] || '').trim() !== '')
    .map((k) => `<tr>
        <td style="padding:5px 16px 5px 0;color:#6b7280;vertical-align:top">${esc(FIELDS[k])}</td>
        <td style="padding:5px 0;white-space:pre-wrap"><strong>${esc(body[k])}</strong></td>
      </tr>`)
    .join('');

  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;max-width:620px;color:#0E2445">
    <p style="margin:0 0 4px;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#AC935B">
      New enquiry from group72insurance.com</p>
    <h1 style="margin:0 0 18px;font-size:21px">${esc(name)}${
      body.company ? ' &middot; ' + esc(body.company) : ''
    }</h1>
    <table style="font-size:14px;border-collapse:collapse">${rows}</table>
    <p style="margin-top:24px;font-size:12px;color:#9ca3af">
      Reply directly to this email to reach them.</p>
  </div>`;

  const payload = {
    from: MAIL_FROM,
    to: to.split(',').map((s) => s.trim()).filter(Boolean),
    reply_to: email,
    subject: `Website enquiry: ${name}${body.company ? ' (' + body.company + ')' : ''}`,
    html
  };
  if (MAIL_CC) payload.cc = MAIL_CC.split(',').map((s) => s.trim()).filter(Boolean);

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
      console.error('lead: resend responded', r.status, await r.text());
      return res.status(502).json({ error: 'Send failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('lead: send failed', err);
    return res.status(502).json({ error: 'Send failed' });
  }
};
