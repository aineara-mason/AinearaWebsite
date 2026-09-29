# Aineara Website

Marketing site for Aineara — the AI-native product studio.

## Stack
- Pure HTML / CSS / JS — no build step required
- Hosted on Cloudflare Pages
- Waitlist signups stored in Cloudflare D1, confirmation emails sent via Resend

## File Structure
```
AinearaWebsite/
├── public/             # The website — this is the only folder that gets published
│   ├── index.html, sillage.html, ascend.html, privacy.html, terms.html
│   ├── css/            # Styles
│   ├── js/             # Cursor, nav, reveal, form logic
│   ├── _redirects      # Cloudflare Pages redirect rules
│   ├── robots.txt
│   └── sitemap.xml
├── functions/
│   └── api/subscribe.js  # Pages Function: POST /api/subscribe (D1 + Resend)
├── schema.sql          # D1 schema (run once in the D1 console)
└── README.md
```

Only `public/` is served. `functions/` stays at the repo root, where Pages looks
for it, and is never published as a static file.

## Deploying to Cloudflare Pages

### Option A — GitHub (recommended)
1. Push this folder to a GitHub repository
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect your GitHub repo
4. Build settings:
   - Framework preset: None
   - Build command: (leave blank)
   - Build output directory: `public`
5. Click Deploy
6. Go to Custom Domains → add `aineara.com`
   Cloudflare will auto-configure DNS since the domain is already on Cloudflare

### Option B — Direct upload (fastest)
1. Go to Cloudflare Dashboard → Pages → Create a project
2. Choose "Upload assets"
3. Drag and drop the `public/` folder
4. Add custom domain after deploy

## Connecting Your Domain
Since your domain is already on Cloudflare:
1. In Pages project → Custom Domains → Set up a custom domain
2. Enter `aineara.com`
3. Cloudflare will auto-add the required DNS records
4. HTTPS is automatic — no extra config needed

## Waitlist Signup (`/api/subscribe`)
The signup forms on the Sillage and Ascend pages (wired up in `public/js/main.js`)
POST `{ email, source }` to `/api/subscribe`, a Cloudflare Pages Function in
`functions/api/subscribe.js`. `source` records which form was used
(`sillage-landing`, `ascend-homepage` or `ascend-landing`).

What the function does:
1. Validates the email and normalizes it (lowercase, trimmed).
2. Stores it in D1 with `INSERT OR IGNORE`. The `email` column is unique, so
   repeat signups are ignored, return success with `already_subscribed: true`,
   and do **not** trigger a second confirmation email.
3. Sends a confirmation email through Resend from `hello@aineara.com`.
   If Resend fails, the error is logged and the visitor still sees success,
   since their signup is already saved.

CORS headers only grant browser access to `aineara.com` and `www.aineara.com`.
(This limits other websites' scripts, not direct API calls.)

### Setup checklist
These live in Cloudflare and Resend, not in this repo, so a new project or
account needs them redone:

- **D1 database** named `aineara-waitlist`, with the table created from
  `schema.sql`. Paste only the SQL statements into the D1 console (the leading
  comment lines make it reject the query as empty).
- **D1 binding** on the Pages project (Settings → Bindings): variable name
  `DB` → `aineara-waitlist`.
- **Secret** on the Pages project (Settings → Variables and Secrets):
  `RESEND_API_KEY`, with Sending access.
- **Resend domain**: `aineara.com` verified in Resend. The DNS records go on
  the `send` and `resend._domainkey` names, and Resend flags any conflicting
  record at those names.
- **Redeploy** after changing bindings or secrets. Pages only applies them to
  new deployments.

If the function can't see the binding or the secret it returns
`500 Service misconfigured`. That is the first thing to check after an account
or project move.

### Reading signups
Use the D1 console (D1 → `aineara-waitlist` → Console):
```sql
SELECT email, source, created_at FROM subscribers ORDER BY created_at DESC;
```

## Local Development
The static pages need no build step — open `public/index.html` in a browser, or run:
```bash
npx serve public
```
That serves the pages only. `/api/subscribe` is a Pages Function and doesn't
exist under `serve`. To run it locally, use `npx wrangler pages dev public`,
with the secret in a `.dev.vars` file (already git-ignored).
