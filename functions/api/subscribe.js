/**
 * Aineara — Email Capture Pages Function
 * Route: /api/subscribe (POST)
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

const EMAIL_SUBJECT = "You're on the list.";

const EMAIL_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:60px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:48px;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:20px;letter-spacing:0.08em;color:#C9915A;">
                Aineara
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="border-top:1px solid #222;padding-top:40px;">
              <p style="margin:0 0 24px;font-family:'Georgia',serif;font-size:15px;line-height:1.8;color:#999;">
                Thank you for signing up.
              </p>
              <p style="margin:0 0 24px;font-family:'Georgia',serif;font-size:15px;line-height:1.8;color:#999;">
                Sillage is a place to keep your fragrance collection — beautifully logged,
                thoughtfully organized, and always with you. We're putting the final touches
                on something we're proud of.
              </p>
              <p style="margin:0 0 40px;font-family:'Georgia',serif;font-size:15px;line-height:1.8;color:#999;">
                We'll be in touch when it's ready.
              </p>
              <p style="margin:0;font-family:'Georgia',serif;font-size:15px;line-height:1.8;color:#999;">
                — The Aineara Team
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:48px;border-top:1px solid #222;margin-top:48px;">
              <p style="margin:0;font-size:12px;color:#444;font-family:Arial,sans-serif;line-height:1.6;">
                You're receiving this because you signed up at aineara.com.<br />
                No further emails until we launch.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

const EMAIL_TEXT = `Thank you for signing up.

Sillage is a place to keep your fragrance collection — beautifully logged, thoughtfully organized, and always with you. We're putting the final touches on something we're proud of.

We'll be in touch when it's ready.

— The Aineara Team

---
You're receiving this because you signed up at aineara.com.
No further emails until we launch.`;

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

  const { email, source } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Invalid email address' }, 400, origin);
  }

  const normalizedEmail = email.toLowerCase().trim();

  // ── 1. Store in D1 ──────────────────────────────────────────────────────
  try {
    const result = await env.DB.prepare(
      'INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)'
    )
      .bind(normalizedEmail, source || null)
      .run();

    // If no rows were changed, email already existed — still return success
    // but skip sending the confirmation email again.
    if (result.changes === 0) {
      return json({ success: true, already_subscribed: true }, 200, origin);
    }
  } catch (err) {
    console.error('[subscribe] D1 error:', { message: err.message, email: normalizedEmail });
    return json({ error: 'Something went wrong. Please try again.' }, 500, origin);
  }

  // ── 2. Send confirmation email via Resend ────────────────────────────────
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
        subject: EMAIL_SUBJECT,
        html: EMAIL_HTML,
        text: EMAIL_TEXT,
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
