# Aineara Website

Marketing site for Aineara — the AI-native product studio.

## Stack
- Built by Eleventy 3. For now the pages are the files in `public/`, copied through unchanged
- Hosted on Cloudflare Pages
- Waitlist signups stored in Cloudflare D1, confirmation emails sent via Resend

## File Structure
```
AinearaWebsite/
├── public/             # The pages, copied unchanged into _site/ by the build
│   ├── index.html, sillage.html, ascend.html, privacy.html, terms.html, support.html, 404.html
│   ├── css/            # Styles
│   ├── js/             # Cursor, nav, reveal, form logic
│   ├── _redirects      # Cloudflare Pages redirect rules
│   ├── robots.txt
│   └── sitemap.xml
├── src/                # Eleventy input folder (no templates yet)
├── eleventy.config.js  # Build config: src/ in, _site/ out, public/ copied through
├── package.json        # npm scripts and exact dev dependency versions
├── .node-version       # Node major version for Cloudflare builds
├── tests/              # node:test checks on the built _site/
├── scripts/
│   └── check-live.js   # Compares a deployed site with the local _site/
├── functions/
│   └── api/subscribe.js  # Pages Function: POST /api/subscribe (D1 + Resend)
├── schema.sql          # D1 schema (run once in the D1 console)
└── README.md
```

Only the build output, `_site/` (git-ignored), is served. `functions/` stays at
the repo root, where Pages looks for it, and is never published as a static file.

## Deploying to Cloudflare Pages

### From GitHub
1. Push this folder to a GitHub repository
2. Go to Cloudflare Dashboard → Pages → Create a project
3. Connect your GitHub repo
4. Build settings:
   - Framework preset: None
   - Build command: `npx @11ty/eleventy`
   - Build output directory: `_site`
   - Root directory: (leave blank)
5. Click Deploy
6. Go to Custom Domains → add `aineara.com`
   Cloudflare will auto-configure DNS since the domain is already on Cloudflare

The Node version is pinned by `.node-version` at the repo root, because
Cloudflare's build image ignores `engines` in `package.json`. Pages installs the
dev dependencies from `package-lock.json` before it runs the build command.
Never commit a `bun.lock` or `bun.lockb`: Pages picks its package manager from
the lockfile.

Every push to `main` deploys aineara.com, so run `npm test` (see Local
Development) before you push. To undo a bad deploy, open the project's
Deployments list, pick the previous production deployment and choose
"Rollback to this deployment".

### Checking a deploy
Compare what Cloudflare serves with a local build:
```bash
PATH="/opt/homebrew/bin:$PATH" npm run build
PATH="/opt/homebrew/bin:$PATH" npm run check-live -- https://aineara.com
```
It checks every page, the 404 page, the `/home` and `/privacy.html` redirects,
every other built file, and that the Pages Function answers. It sends only GET
and OPTIONS requests, so it never adds a signup or sends an email. HTML is
compared byte for byte, which needs Cloudflare's Email Address Obfuscation
(the aineara.com zone's Security → Settings page) turned off. While it's on,
add `--allow-email-obfuscation` to mask email addresses before comparing.

## Connecting Your Domain
Since your domain is already on Cloudflare:
1. In Pages project → Custom Domains → Set up a custom domain
2. Enter `aineara.com`
3. Cloudflare will auto-add the required DNS records
4. HTTPS is automatic — no extra config needed

## Waitlist Signup (`/api/subscribe`)
The signup forms on `/`, `/ascend` and `/sillage` (wired up in `public/js/main.js`)
POST `{ email, source }` to `/api/subscribe`, a Cloudflare Pages Function in
`functions/api/subscribe.js`. `source` records which form was used
(`aineara-homepage`, `ascend-landing` or `sillage-landing`).

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
Eleventy and the tests need real Node, version 22 or newer. If `node` on your
PATH is Bun's wrapper (as on the studio Mac), put Homebrew's Node first, on the
same line as every node, npm or npx command:
```bash
PATH="/opt/homebrew/bin:$PATH" npm ci      # install the pinned dev dependencies
PATH="/opt/homebrew/bin:$PATH" npm start   # build, watch and serve at http://localhost:8080
PATH="/opt/homebrew/bin:$PATH" npm test    # wipe _site/, rebuild it, run every test
```
The dev server doesn't run Pages Functions or apply `_redirects`, so
`/api/subscribe` doesn't exist there. To run it locally, build first, then use
Wrangler, with the secret in a `.dev.vars` file (already git-ignored):
```bash
PATH="/opt/homebrew/bin:$PATH" npm run build
PATH="/opt/homebrew/bin:$PATH" npx wrangler pages dev _site
```
