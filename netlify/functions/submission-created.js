// Runs automatically after every verified Netlify Forms submission.
// For the "trip-planner" form it emails the visitor the same road trip plan the website builds.
// Needs two environment variables in Netlify (Project configuration → Environment variables):
//   RESEND_API_KEY  – API key from resend.com (free tier is fine)
//   MAIL_FROM       – e.g. "Rainforest to the Coast <trips@rainforesttothecoast.com>" (domain verified in Resend)
// Until both are set, this function does nothing and submissions still reach info@visitgraysharbor.com.
const RTCPlan = require('../../assets/planner-core.js');

exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body || '{}');
    if (!payload || payload.form_name !== 'trip-planner') return { statusCode: 200, body: 'skip' };
    const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
    const d = payload.data || {};
    if (!key || !from || !d.email) { console.log('Plan email not sent: email service not configured'); return { statusCode: 200, body: 'not configured' }; }

    const toArr = (v) => (Array.isArray(v) ? v : v ? String(v).split(/,\s*/) : []);
    const likes = d.plan_likes ? toArr(d.plan_likes) : toArr(d.interests).map((x) => RTCPlan.LEAD_MAP[x]);
    const p = RTCPlan.build({ start: d.plan_start, days: d.trip_days || d.plan_days || 3, season: d.plan_season, likes });
    const name = (d.first_name || '').trim();

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from, to: [d.email], bcc: ['info@visitgraysharbor.com'], reply_to: 'info@visitgraysharbor.com',
        subject: (name ? name + ', your' : 'Your') + ' Rainforest to the Coast road trip guide',
        html: RTCPlan.toEmail(p, name), text: RTCPlan.toText(p, name)
      })
    });
    console.log('Plan email status', res.status);
    return { statusCode: 200, body: 'ok' };
  } catch (e) {
    console.log('Plan email error', e.message);
    return { statusCode: 200, body: 'error' };
  }
};
