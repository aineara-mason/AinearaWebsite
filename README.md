# Aineara Website

Marketing site for Aineara, a software studio in New York that makes iPhone apps.

## Stack
- Eleventy 3 builds the site from Nunjucks templates in `src/` into `_site/`
- @11ty/eleventy-img turns the Ascend screenshots and mark into resized WebP files at build time
- Self-hosted Inter (latin subset) and Lucide icons from npm: the build copies the Inter file and inlines each icon
- Tests: `node:test` with node-html-parser, run against the built `_site/`
- Hosted on Cloudflare Pages
- Waitlist signups stored in Cloudflare D1, confirmation emails sent via Resend

## File Structure
```
AinearaWebsite/
├── src/                        # Eleventy input; the build writes _site/, the only folder that gets published
│   ├── index.njk, ascend.njk, sillage.njk, privacy.njk, terms.njk, support.njk, 404.njk
│   ├── tokens.css.njk          # Renders /assets/css/tokens.css from _data/tokens.js
│   ├── sitemap.njk             # Generated sitemap of the indexable pages
│   ├── robots.txt
│   ├── _redirects              # Cloudflare Pages redirect rules
│   ├── _data/
│   │   ├── site.js             # Studio details, analytics token, privacy date, Ascend status
│   │   ├── copy.js             # Every user-facing string, keyed by id
│   │   ├── tokens.js           # Design tokens: colour, type, space, radius, motion
│   │   └── ascendScreens.js    # Ascend screenshots, alt text ids, rail order
│   ├── _includes/
│   │   ├── layouts/            # base.njk (head, nav, footer) and legal.njk
│   │   ├── partials/           # Nav, footer, signup form, app cards, screenshot, Ascend mark, App Store badge
│   │   └── scripts/            # theme-init.js, inlined in <head> to set the theme before first paint
│   ├── _images/ascend/         # Original Ascend PNGs; only the resized WebP files are published
│   └── assets/
│       ├── css/                # site.css, ascend.css, sillage.css, legal.css
│       ├── js/                 # site.js (ES module) and lib/ (theme and signup logic)
│       └── img/                # Favicons and og/ link-preview images
├── functions/
│   └── api/subscribe.js        # Pages Function: POST /api/subscribe (D1 + Resend)
├── scripts/
│   ├── check-live.js           # GET/OPTIONS-only check of a deployment against _site/
│   └── make-static-images.js   # Makes the favicon and link-preview PNGs (run locally, output committed)
├── tests/                      # node:test suites, helpers and legal-text snapshots
├── docs/                       # Design spec and the open issues list
├── eleventy.config.js
├── package.json, package-lock.json
├── .node-version               # Node version for Cloudflare builds
├── schema.sql                  # D1 schema (run once in the D1 console)
└── README.md
```

Only `_site/` is served. `functions/` stays at the repo root, where Pages looks
for it, and is never published as a static file.

## Commands
Run these from the repo root with real Node. On the owner's Mac, `node` on the
PATH is Bun's wrapper and npm silently runs under Bun, so put Homebrew first on
the same line:
```bash
PATH="/opt/homebrew/bin:$PATH" npm clean-install    # install exactly what package-lock.json lists
PATH="/opt/homebrew/bin:$PATH" npm run build        # build _site/
PATH="/opt/homebrew/bin:$PATH" npm start            # dev server at http://localhost:8080
PATH="/opt/homebrew/bin:$PATH" npm test             # wipe _site/, rebuild, run every test
PATH="/opt/homebrew/bin:$PATH" npm run images       # remake the favicon and link-preview PNGs
PATH="/opt/homebrew/bin:$PATH" npm run check-live -- https://aineara.com
```
`PATH="/opt/homebrew/bin:$PATH" node -p "process.versions.bun ?? process.version"`
should print `v26.5.0`. Never run `bun install`, and never commit `bun.lock` or
`bun.lockb`: Cloudflare picks the package manager from the lockfile.

`npm run images` uses sharp and the Mac's system fonts, and the build never runs
it. Run it after changing `src/assets/img/favicon.svg`, the `og.*` strings in
`src/_data/copy.js` or the colours in `src/_data/tokens.js`, look at every PNG,
and commit them.

`npm run check-live` compares a deployment with your local `_site/` (build
first). It only sends GET and OPTIONS requests and never posts to
`/api/subscribe`.

## Tests
`npm test` wipes and rebuilds `_site/` first (the `pretest` script), then runs
every `tests/**/*.test.js` file with `node:test`:

- `site.test.js`: flat page paths, every link and asset resolves, the analytics
  beacon, signup form sources, favicons, link-preview images, the sitemap,
  robots.txt, `_redirects`, canonical URLs and banned phrases
- `copy.test.js`: each page shows its `copy.js` strings verbatim
- `contrast.test.js`: every colour pair meets WCAG 2.1 AA (4.5:1 text, 3:1
  borders and focus ring)
- `theme.test.js` and `signup.test.js`: the theme and signup logic
- `site-js.test.js`: `site.js` run against a small fake DOM (theme toggle,
  mobile menu, fade-in fallback and the signup form states)
- `subscribe.test.js`: the Pages Function with a mocked D1 and Resend (email by
  source, unknown source stored as null, no second email for a duplicate)
- `site-data.test.js` and `live-state.test.js`: `site.js` invariants, and a
  second build (`_site-live/`) with Ascend switched to live
- `pages/*.test.js`: the homepage, Ascend, Sillage, the legal pages and 404

`tests/snapshots/*.txt` hold the verified privacy, support and terms text.
Change them only by hand, and say why in the commit message.

To run one file:
```bash
PATH="/opt/homebrew/bin:$PATH" npm run build -- --quiet && PATH="/opt/homebrew/bin:$PATH" node --test tests/site.test.js
```

## Deploying to Cloudflare Pages
Cloudflare Pages builds `main` from GitHub on every push, so a push to `main` is
a live deploy. The build command only builds; it doesn't run the tests. Run
`npm test` locally before every push.

Build settings (Workers & Pages › project › Settings › Builds › Build configuration):
- Framework preset: None
- Build command: `npx @11ty/eleventy`
- Build output directory: `_site`
- Root directory: (leave blank)

Pages installs dependencies with `npm clean-install` before the build, and takes
the Node version from `.node-version` (`26`; its build image ignores `engines`
in package.json). If a build log shows Node 26 can't be installed, pin `24`
instead.

Keep Email Address Obfuscation off (Security › Scrape Shield). It rewrites every
address on the page and shows "[email protected]" when JavaScript is off, and
`check-live` compares HTML byte for byte.

### Connecting Your Domain
Since your domain is already on Cloudflare:
1. In Pages project → Custom Domains → Set up a custom domain
2. Enter `aineara.com`
3. Cloudflare will auto-add the required DNS records
4. HTTPS is automatic — no extra config needed

### Preview deployments
Every other branch gets a preview build at its own `pages.dev` address. Preview
has no D1 or Resend bindings, so forms there show the error state; the success
paths are covered by `tests/subscribe.test.js` and by one real signup per form
after each release. Never bind the production database or the live Resend key
to Preview: previews would write real rows and send real email.

## Waitlist Signup (`/api/subscribe`)
Four forms on three pages POST `{ email, source }` to `/api/subscribe`, a
Cloudflare Pages Function in `functions/api/subscribe.js`. They share one
template (`src/_includes/partials/signup.njk`) and one script
(`src/assets/js/site.js` with `src/assets/js/lib/signup.js`). `source` records
which form was used:

| Form | `source` | Confirmation email |
|---|---|---|
| Homepage waitlist strip (`/`) | `aineara-homepage` | Ascend |
| Ascend hero and final call to action (`/ascend`) | `ascend-landing` | Ascend |
| Sillage (`/sillage`) | `sillage-landing` | Sillage |

What the function does:
1. Validates the email and normalizes it (lowercase, trimmed). A body that isn't
   a JSON object, an email that isn't a string, or an address longer than 254
   characters gets `400`.
2. Stores it in D1 with `INSERT OR IGNORE`. Any other `source`, or none, is
   stored as null. The `email` column is unique across all lists, so repeat
   signups are ignored, return success with `already_subscribed: true`, and do
   **not** trigger a second confirmation email.
3. Sends that app's confirmation email through Resend from `hello@aineara.com`,
   with replies going to `privacy@aineara.com`. Each email ends with how to be
   removed from the list. A signup stored with a null source gets no email but
   still returns success. If Resend fails, the error is logged and the visitor
   still sees success, since their signup is already saved.

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
```bash
PATH="/opt/homebrew/bin:$PATH" npm start
```
That builds the site, serves it at http://localhost:8080 and rebuilds on save.
Like Cloudflare, it serves `support.html` at `/support` and `404.html` for
unknown paths. It doesn't apply `_redirects` or run Pages Functions, so the
forms can't sign up locally.

To run `/api/subscribe` locally, build first and use Wrangler, with the secret
in a `.dev.vars` file (already git-ignored):
```bash
PATH="/opt/homebrew/bin:$PATH" npm run build
PATH="/opt/homebrew/bin:$PATH" npx wrangler pages dev _site
```

Claude Code's Browser pane starts the same dev server on port 8080 from the
configuration `eleventy` in `.claude/launch.json` (git-ignored).

## Launch day [OWNER]
When Ascend is on sale in the App Store:

1. Download Apple's official "Download on the App Store" badge from App Store
   Marketing Tools (https://toolbox.marketingtools.apple.com/app-store/).
2. Save it unmodified as `src/assets/img/app-store-badge.svg`. Apple requires
   the unaltered artwork, and serving it from this site keeps visitors' IP
   addresses away from Apple.
3. In `src/_data/site.js`, set `ASCEND_STATUS = "live"` and set
   `ASCEND_APP_STORE_URL` to the app's `https://apps.apple.com/…` address.
4. Revisit the pricing line (`ascend.pricing` in `src/_data/copy.js`). If one-off
   plans are on sale in Ascend's Plan Store, it's incomplete; see
   `docs/website-open-issues.md`.
5. Run `npm test`, then push.

Once Ascend is live, the /ascend hero and the homepage waitlist strip show the
App Store badge instead of a form, the /ascend final heading links to the App
Store, the homepage card says "On the App Store", and /sillage keeps its
waitlist form.

## Rollback
- **Fastest:** in the Cloudflare dashboard, Workers & Pages › project ›
  Deployments › the previous production deployment › Rollback to this
  deployment. Only production deployments can be rollback targets.
- **In git:** revert the change on `main` and push; the push deploys the
  reverted site. For a merge commit, use `git revert -m 1` with the merge's
  hash.
