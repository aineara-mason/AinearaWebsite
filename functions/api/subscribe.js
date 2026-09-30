/**
 * Aineara — Email Capture Pages Function
 * Route: /api/subscribe (POST)
 *
 * The site's signup forms POST JSON { email, source }. Sources and emails:
 *   aineara-homepage  homepage waitlist strip            → Ascend email
 *   ascend-landing    /ascend hero and final call to action → Ascend email
 *   sillage-landing   /sillage                           → Sillage email
 * Any other or missing source is stored as null and gets no email.
 * Every confirmation email ends with a removal line, and replies go to
 * privacy@aineara.com (REPLY_TO), as the privacy policy says.
 *
 * Cloudflare Dashboard setup required:
 *
 * 1. D1 binding (Settings → Functions → D1 database bindings):
 *    Variable name: DB
 *    Database:      aineara-waitlist
 *
 * 2. Secret (Settings → Variables and Secrets):
 *    RESEND_API_KEY — your Resend API key (re_...)
 */

const ALLOWED_ORIGINS = [
  'https://aineara.com',
  'https://www.aineara.com',
];

const FROM_ADDRESS = 'Aineara <hello@aineara.com>';

const REPLY_TO = 'privacy@aineara.com';

const ALLOWED_SOURCES = new Set(['aineara-homepage', 'ascend-landing', 'sillage-landing']);

// Neutral studio look: white background, #0A0A0A text, #666666 footer text
// (5.74:1 on white), #E5E5EA rules. 'Inter' is single-quoted because the
// stack sits inside double-quoted style attributes.
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Inter', Helvetica, Arial, sans-serif";

const PRIVACY_LINK =
  '<a href="mailto:privacy@aineara.com" style="color:#666666;text-decoration:underline;">privacy@aineara.com</a>';

function emailHtml(paragraphs, footerLines) {
  const body = paragraphs
    .map((html) => `              <p style="margin:0 0 20px;font-family:${FONT_STACK};font-size:16px;line-height:1.6;color:#0A0A0A;">${html}</p>`)
    .join('\n');
  const footer = footerLines
    .map((html) => `              <p style="margin:0 0 8px;font-family:${FONT_STACK};font-size:13px;line-height:1.6;color:#666666;">${html}</p>`)
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FFFFFF;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:48px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0;font-family:${FONT_STACK};font-size:13px;font-weight:600;letter-spacing:0.14em;color:#0A0A0A;">AINEARA</p>
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #E5E5EA;padding-top:32px;padding-bottom:12px;">
${body}
            </td>
          </tr>
          <tr>
            <td style="border-top:1px solid #E5E5EA;padding-top:24px;">
${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

const EMAILS = {
  ascend: {
    subject: "You're on the Ascend waitlist.",
    text: `Thanks for joining the Ascend waitlist.

Ascend is our iPhone app for training and nutrition. We'll send you one more email, when it launches on the App Store. Nothing else.

You can read about it at https://aineara.com/ascend.

— Aineara

---
You're receiving this because this address was added to the Ascend waitlist at aineara.com.
To be removed, reply to this email or write to privacy@aineara.com.`,
    html: emailHtml(
      [
        'Thanks for joining the Ascend waitlist.',
        "Ascend is our iPhone app for training and nutrition. We'll send you one more email, when it launches on the App Store. Nothing else.",
        'You can read about it at <a href="https://aineara.com/ascend" style="color:#0A0A0A;text-decoration:underline;">https://aineara.com/ascend</a>.',
        '— Aineara',
      ],
      [
        "You're receiving this because this address was added to the Ascend waitlist at aineara.com.",
        `To be removed, reply to this email or write to ${PRIVACY_LINK}.`,
      ],
    ),
  },
  sillage: {
    subject: "You're on the Sillage waitlist.",
    text: `Thanks for joining the Sillage waitlist.

Sillage is an app for fragrance collectors that we're still building. We'll send you one more email, when it launches. Nothing else.

— Aineara

---
You're receiving this because this address was added to the Sillage waitlist at aineara.com.
To be removed, reply to this email or write to privacy@aineara.com.`,
    html: emailHtml(
      [
        'Thanks for joining the Sillage waitlist.',
        "Sillage is an app for fragrance collectors that we're still building. We'll send you one more email, when it launches. Nothing else.",
        '— Aineara',
      ],
      [
        "You're receiving this because this address was added to the Sillage waitlist at aineara.com.",
        `To be removed, reply to this email or write to ${PRIVACY_LINK}.`,
      ],
    ),
  },
};

// Ascend copy for both Ascend forms, Sillage copy for /sillage, and no
// email for an unknown or missing source (stored as null).
function emailForSource(source) {
  if (source === 'aineara-homepage' || source === 'ascend-landing') return EMAILS.ascend;
  if (source === 'sillage-landing') return EMAILS.sillage;
  return null;
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('Origin') || '';
  return new Response(null, { status: 204, headers: corsHeaders(origin) });
}

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin') || '';

  if (!env.RESEND_API_KEY) {
    console.error('[subscribe] Missing RESEND_API_KEY secret — check Cloudflare Pages settings');
    return json({ error: 'Service misconfigured. Please contact hello@aineara.com.' }, 500, origin);
  }

  if (!env.DB) {
    console.error('[subscribe] Missing DB binding — check Cloudflare Pages D1 bindings');
    return json({ error: 'Service misconfigured. Please contact hello@aineara.com.' }, 500, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  // JSON null, an array or a bare value is not a signup.
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'Invalid request body' }, 400, origin);
  }

  const { email, source } = body;

  if (typeof email !== 'string') {
    return json({ error: 'Invalid email address' }, 400, origin);
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return json({ error: 'Invalid email address' }, 400, origin);
  }

  const storedSource = ALLOWED_SOURCES.has(source) ? source : null;

  // ── 1. Store in D1 ──────────────────────────────────────────────────────
  try {
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)'
    )
      .bind(normalizedEmail, storedSource)
      .run();

    // If no rows were changed, email already existed — still return success
    // but skip sending the confirmation email again.
    if (result.meta.changes === 0) {
      return json({ success: true, already_subscribed: true }, 200, origin);
    }
  } catch (err) {
    console.error('[subscribe] D1 error:', { message: err.message, email: normalizedEmail });
    return json({ error: 'Something went wrong. Please try again.' }, 500, origin);
  }

  // ── 2. Send the confirmation email for this source via Resend ───────────
  const message = emailForSource(storedSource);
  if (!message) {
    return json({ success: true }, 200, origin);
  }

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [normalizedEmail],
        reply_to: REPLY_TO,
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    });

    if (!resendRes.ok) {
      const resendData = await resendRes.json().catch(() => ({}));
      console.error('[subscribe] Resend error:', { status: resendRes.status, body: resendData, email: normalizedEmail });
    }
  } catch (err) {
    console.error('[subscribe] Resend fetch error:', { message: err.message, email: normalizedEmail });
  }

  return json({ success: true }, 200, origin);
}
