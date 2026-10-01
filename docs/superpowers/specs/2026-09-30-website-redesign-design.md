# aineara.com redesign: design spec

- **Date:** 2026-09-30
- **Status:** approved in brainstorming; pending owner review of this document
- **Repo:** `/Users/masonstassi/Desktop/AinearaWebsite` (public on GitHub, deployed by Cloudflare Pages from `main`)

## 1. Goal

Redesign aineara.com so that Aineara, Ascend and Sillage share one design language, and the site
works as a studio home that leads with Ascend's launch. Ascend is the primary inspiration.

**The site's job for the next few months:** a studio homepage that introduces Aineara and leads with
Ascend; a full Ascend product page that drives waitlist signups now and App Store downloads after
launch; Sillage shown as "in development".

**Success looks like:**
- On an iPhone, the Ascend page looks and reads like the Ascend app.
- The studio, Ascend and Sillage are visibly one family, while each app keeps its own colour.
- No page copy contradicts the privacy policy or the Ascend app (see `docs/website-open-issues.md`).
- Every text colour pair meets WCAG 2.1 AA; the site works with keyboard only, reduced motion, and
  JavaScript turned off.
- The URLs the Ascend app hard-codes (`/privacy`, `/terms`, `/support`) never break.

## 2. Decisions made

| # | Decision | Choice |
|---|---|---|
| 1 | Site's job | Studio home + full Ascend page; Sillage "in development" |
| 2 | Brand architecture / colour | Neutral black-and-white studio; each app brings its own colour (Ascend blue/navy, Sillage gold) |
| 3 | Theme default | Follow the visitor's device; the toggle overrides and is only remembered once used |
| 4 | Typeface | The device's own font (SF Pro on Apple devices), Inter elsewhere, self-hosted |
| 5 | Logo | Text wordmark now; the Aineara logo is a separate later project (the layout leaves room for a mark) |
| 6 | Sillage page | One short screen in Sillage's own look, keeping its waitlist |
| 7 | Ascend headline | "Train smarter. Eat better. Go further." with the subhead "Training and nutrition in one app, with calorie targets that can adapt to your progress." (revised in planning: the App Store headline's "a calorie target that corrects itself" isn't true of the app) |
| 8 | Build | Eleventy templates, deployed by Cloudflare Pages |

Background research (Ascend, Sillage and the current site, with an adversarial check of every value)
informed these choices; the key facts are restated where they matter below.

## 3. Architecture

### 3.1 Source layout

```
src/
  _includes/
    layouts/base.njk      <head> (meta, OG, theme script, beacon), nav, footer
    layouts/legal.njk     extends base; 760px reading column for privacy, terms, support
    partials/             app cards, signup form, screenshot, App Store badge
  _data/site.js           studio name, URLs, contact addresses, analytics token,
                          apps: { ascend: { status: "waitlist" | "live", appStoreUrl }, sillage: { status: "in-development" } }
  index.njk  ascend.njk  sillage.njk  privacy.njk  terms.njk  support.njk  404.njk
  assets/
    css/  js/  fonts/ (Inter, woff2)  img/ (Ascend mark, screenshots, favicons, OG images)
  _redirects  robots.txt  sitemap.njk
functions/api/subscribe.js   unchanged location (Cloudflare looks for it at the repo root)
eleventy.config.js  package.json  (build output: _site/, git-ignored)
```

### 3.2 Constraints the build must keep

- **Flat output files.** Each page renders to a flat file (`support.html`, not `support/index.html`),
  so the URLs stay exactly `/`, `/ascend`, `/sillage`, `/privacy`, `/terms`, `/support`, and 404 is
  served for unknown paths. The Ascend app hard-codes `https://aineara.com/privacy`, `/terms` and
  `/support` (`Ascend/Configuration/LegalLinks.swift:35,40,51`).
- **`/home` redirect** (`_redirects`: `/home / 301`) is preserved; `robots.txt` is preserved; the
  sitemap is generated from the page list.
- **Absolute asset paths** everywhere (`/assets/css/...`), so the 404 page and any nested URL render.
- **The signup contract is unchanged:** `POST /api/subscribe` with JSON `{email, source}`, where
  `source` is one of `aineara-homepage`, `ascend-landing`, `sillage-landing` (the three live values
  today). D1 table and bindings are unchanged.
- **Cloudflare Web Analytics beacon** on every page (the privacy policy discloses it).
- **Privacy and support text** moves into templates word for word (it was verified against the
  Ascend code on 2026-09-30), except the edits in §6.5.

### 3.3 Deploy

- `package.json` adds Eleventy and its image plugin as dev dependencies, and pins the Node version.
- Cloudflare Pages settings change once: build command `npx @11ty/eleventy`, output directory
  `_site`. `functions/` stays at the repo root.

## 4. Design system

### 4.1 Colour

**Studio frame (neutral).**

| Role | Dark | Light |
|---|---|---|
| Page | `#000000` | `#FFFFFF` |
| Section | `#0A0A0A` | `#F5F5F5` |
| Card / field fill | `#1C1C1E` | `#F2F2F7` |
| Text | `#FAFAFA` | `#0A0A0A` |
| Secondary text | `#8C8C8C` | `#666666` |
| Hairline | `rgba(255,255,255,.08)` | `rgba(0,0,0,.08)` |
| Field border | `#6E6E73` | `#8A8A8E` |
| Primary button | `#FAFAFA` fill, `#000000` text | `#0A0A0A` fill, `#FFFFFF` text |
| Link | text colour, underlined | text colour, underlined |
| Error text | `#FF6961` | `#D70015` |
| Focus ring | 2px outline in the text colour, 3px offset | same |

**Ascend scope** (Ascend sections look the same in both themes, as in the app).

| Role | Value |
|---|---|
| Hero and card surface | `linear-gradient(180deg, #1C1C2E, #0C1F3F)` |
| Text / secondary on navy | `#FFFFFF` / `rgba(255,255,255,.75)` |
| Button | `#1A6CF6` fill, `#FFFFFF` text (never `#4A90F8` fill: white on it is 3.16:1) |
| Secondary button on navy | `rgba(255,255,255,.12)` fill, white text |
| Accent text on dark or navy | `#4A90F8` |
| Accent text on light surfaces | `#1560DC` (Ascend's `#1A6CF6` is 4.16:1 on `#F2F2F7`; this darker shade passes) |

**Sillage scope.**

| Role | Dark | Light |
|---|---|---|
| Page / surface | `#080808` / `#111110` | `#F5F0E8` |
| Text / secondary | `#F0EDE8` / `#888683` | `#1A1714` / `#6B6257` |
| Gold (text) | `#C9915A` | `#8A5C28` |
| Button | `#C9915A` fill, `#080808` text | `#B07840` fill, `#080808` text |
| Hairline | `rgba(201,145,90,.35)` | `rgba(150,90,40,.25)` |
| Display face | Georgia 400 (Georgia has no light weight) | same |

**Measured contrast (WCAG 2.1).** Studio text 16.30–20.12; studio secondary 5.06–6.25 (dark),
5.15–5.74 (light); white on `#1A6CF6` 4.65; `#4A90F8` 5.17–6.64 on dark/navy; `#1560DC` 5.03–5.62 on
light; Ascend secondary on navy 9.63–9.83; Sillage secondary 5.20–5.52 (dark), 5.27 (light); Sillage
gold text 6.91–7.33 (dark), 5.08 (light); Sillage buttons 7.33 / 5.35; error 6.03–7.45 (dark),
4.83–5.38 (light); field borders 3.36–4.14 (dark), 3.08–3.44 (light) against their surfaces.

### 4.2 Type

- **Stack:** `-apple-system, BlinkMacSystemFont, "Inter", sans-serif`. Apple devices render SF Pro
  and never download Inter; others get self-hosted Inter (woff2). Do not use `system-ui` (it would
  resolve to Segoe UI or Roboto instead of Inter). No Google Fonts.
- **Scale (rem, so zoom works):** display `clamp(2.5rem, 7vw, 5.5rem)`, 700, `-0.03em`, line-height
  1.05; section heading `clamp(1.75rem, 4vw, 2.75rem)`, 700, `-0.02em`; card title 1.25rem 600; body
  1.0625rem (17px) line-height 1.55; small 0.9375rem; caption 0.8125rem; label 0.75rem uppercase,
  `0.14em` tracking, 600, secondary colour.
- **Numbers:** `font-variant-numeric: tabular-nums` for stats. No rounded numerals (`ui-rounded` only
  works in Safari, and the app uses it in few places).
- **Sillage** titles and fragrance names: Georgia 400.

### 4.3 Shape, space, elevation

- **Radii:** 10 inner tiles · 12 fields and small cards · 14 buttons · 16 feature cards · 24 hero
  cards · pill (999px) chips.
- **Spacing steps:** 4, 8, 12, 16, 24, 32, 48, 64, 96, 128px. Page gutters 16px (phone), 24px (tablet),
  40px (desktop). Containers 1200px (pages) and 760px (reading).
- **Elevation:** flat tonal surfaces. One shadow, under app screenshots only:
  `0 6px 24px rgba(0,0,0,.15)`.

### 4.4 Motion

- State changes 150–250ms ease. Sections fade up once on entry (0.5s, the current spring curve
  `cubic-bezier(0.16,1,0.3,1)`).
- The Ascend page hero mark pulses three times on the 1.4s cycle (scale 1 → 1.06, opacity .85 → 1),
  as the app's startup screen does, about 4.2s in all, so it stops within five seconds (WCAG 2.2.2).
- `prefers-reduced-motion: reduce` turns off all motion, including the pulse.

### 4.5 Removed from today's site

The custom cursor, the amber glows and dot grid, the serif accent word, square corners, Google Fonts,
and amber as the studio colour.

### 4.6 Icons

A small open-licence set (Lucide, ISC licence) used sparingly. SF Symbols' licence doesn't cover the
web.

## 5. Pages

### 5.1 Homepage `/`

1. **Nav:** `AINEARA` wordmark · Apps · About · theme toggle · "Get Ascend" button (to `/ascend`).
2. **Studio hero:** label "A software studio"; heading "Apps built with intention."; line "We make
   iPhone apps for the things that matter to you. Ascend, for training and nutrition, launches
   first."; primary button "Meet Ascend".
3. **Apps:** a large Ascend card (navy gradient, mark, "Launching first", the tagline, link to
   `/ascend`) and a smaller Sillage card (Sillage dark/cream scope, gold hairline, "In development",
   link to `/sillage`). UnderRated is removed.
4. **Principles:** the three existing principles ("Intelligence, not complexity", "Precision over
   abundance", "Built for people, not personas") in a hairline grid. Copy kept, except principle 2's
   unprovable opening ("We ship fewer features than anyone else in the space"), which becomes "We'd
   rather ship fewer features and get each one right. Restraint is a design principle, not a
   limitation."
5. **About the studio:** one short paragraph in the plain voice. It replaces "AI-native, from the
   ground up" and does not claim data stays on the device.
6. **Waitlist strip:** "Get notified when Ascend launches", source `aineara-homepage`.
7. **Footer:** wordmark, © Aineara LLC, Privacy · Terms · Support, hello@aineara.com.

### 5.2 Ascend `/ascend`

1. **Hero** (full-bleed navy gradient): the Ascend mark with its pulse, label "Ascend by Aineara",
   heading "Train smarter. Eat better. Go further.", subhead "Training and nutrition in one app, with
   calorie targets that can adapt to your progress.", and the signup (source `ascend-landing`) while
   `status` is `waitlist`, or Apple's official "Download on the App Store" badge once `live`.
2. **Screenshot rail:** Today, Nutrition, Plans, Weekly report (light screenshots from
   `Ascend/docs/screenshots/`, resized at build time). Training load is left out until it's re-shot
   on the current app (its card says "minimises injury risk", a claim the app has walked back).
   Replace them with refreshed App Store screenshots when those exist; the pre-submission audit notes
   some are out of date.
3. **Train / Eat / Stay with it:** three feature sections (following the App Store listing's
   structure), each a screenshot and three or four plain bullets. Only claims the current app backs
   up; general-wellness wording (no claims about preventing injury or treating conditions). Every
   feature bullet, the "Your data" lines and the studio paragraph are checked against the Ascend code
   (the same claim-by-claim check the privacy policy went through) before the page is published.
4. **Your data:** no ads or trackers; Apple Health is read-only; AI only with your permission; delete
   your account any time. Links to the privacy policy. Wording must match the policy.
5. **Pricing without prices:** "Free to start. Optional Plus, Pro and Elite subscriptions. Prices are
   in the App Store."
6. **Final call to action** on navy: signup (source `ascend-landing`) or badge; one-line wellness
   disclaimer: "Ascend is a general wellness app, not medical advice."

### 5.3 Sillage `/sillage`

One screen in the Sillage scope: "In development", the Sillage name in Georgia, two lines on what it is
(for fragrance collectors), the signup (source `sillage-landing`), and a link back to Aineara. The
sample reviews from named people and third-party brand names are removed.

### 5.4 Legal and utility pages

- **Privacy, Terms, Support:** the shared legal layout in the studio frame. Privacy and Support keep
  their verified text (plus §6.5 edits). Terms is restyled only; rewriting it is a separate legal task.
- **404:** the studio hero with "Return home".

### 5.5 Copy rules (all pages)

- Headlines in sentence case ending with a period; buttons in Title Case; no exclamation marks.
- AI is how things work, not a headline.
- General-wellness wording; only claims the Ascend app backs up.
- No prices until App Store Connect prices are final.
- Nothing may contradict the privacy policy.

### 5.6 New assets

- **Favicon set:** an "A" in the wordmark style: SVG, 32px PNG, 180px apple-touch-icon.
- **Link-preview images:** 1200×630 PNGs for the studio, Ascend and Sillage pages, in the new style.
- **Ascend mark:** the existing transparent `AscendMark.png`, used only on navy (its light faces
  disappear on white), converted to WebP at build time.
- **App Store badge:** Apple's official badge artwork, added by the owner at launch (Apple requires
  the unaltered official artwork).

## 6. Behaviour

### 6.1 Theme

An inline script in `<head>` runs before first paint: use the saved choice if the visitor has used the
toggle, otherwise the device setting; set `data-theme` on `<html>`. Save to `localStorage`
(`aineara-theme`) only when the toggle is used. Until then, follow live changes to the device setting.
This removes the dark flash and today's bug where the device setting is saved on the first visit.

### 6.2 Progressive enhancement

Content is visible without JavaScript. The head script adds a `js` class to `<html>`; only then do
sections start hidden for the fade-in. The mobile menu uses `aria-expanded`, closes on Escape, and
returns focus to its button.

### 6.3 Signup forms

- Post `{email, source}` to `/api/subscribe` with one of the three sources.
- **States:** sending (button disabled, "Sending…"); success replaces the form with an app-specific
  thank-you ("already subscribed" counts as success); invalid email shows inline text (announced by
  screen readers via `aria-live`) plus the error border; server or network failure says to try again
  or email hello@aineara.com.
- **No JavaScript:** a short note with the email address instead of the form.
- **When Ascend is `live`:** Ascend forms are replaced by the App Store badge, and the homepage strip
  changes to match. The Sillage form keeps working.

### 6.4 Signup function (`functions/api/subscribe.js`)

Small changes only:
- Choose the confirmation email by source: Ascend copy for `aineara-homepage` and `ascend-landing`;
  Sillage copy for `sillage-landing`.
- Restyle the email in the neutral studio look; fix the footer contrast (today `#444444` on `#080808`,
  2.06:1).
- Add a removal line: to be removed, reply or write to privacy@aineara.com (the policy promises this).
- Store an unknown `source` as null instead of the value sent.

### 6.5 Privacy policy edits in the same change

- Remove the Google Fonts bullet in §3 and the "Website fonts" part of Google's row in §5 (Google
  stays for email).
- Theme storage: "remembers your light or dark choice in your browser's local storage, only if you
  use the theme toggle."
- Describe the per-app confirmation email and the removal line.

### 6.6 Assets and performance

Self-hosted fonts; screenshots with explicit width and height, lazy-loaded below the first screen,
with alt text describing each screen. Target: the Ascend page's first load under about 1 MB.

## 7. Testing

**Automated (`npm test`, run on the built `_site/` before every deploy):**
- Every page exists at its exact flat path, including `privacy.html`, `terms.html`, `support.html`,
  `404.html`.
- Every internal link and asset reference resolves; no reference to `fonts.googleapis.com` or
  `fonts.gstatic.com`.
- Every page contains the analytics beacon.
- Every signup form sends exactly one of the three sources.
- Every colour pair in §4.1 meets its WCAG threshold (4.5:1 text, 3:1 borders and focus ring).
- The privacy and support text matches a saved snapshot of the verified text, apart from the §6.5
  edits, so unintended changes fail.
- `subscribe.js` unit tests with a mock D1 and mock Resend: email choice by source, unknown source
  stored as null, duplicate signup sends no second email.

**Manual, in the browser:** phone, tablet and desktop widths in both themes; keyboard only; reduced
motion; JavaScript disabled. After deploy, one real signup per form with the owner's email.

## 8. Rollout

1. **Move to Eleventy with no visible change.** Rebuild the current site in Eleventy, confirm the
   output matches today's pages, and change Cloudflare's build command and output directory in the
   same push. (Changing the settings first would break `main` builds.)
2. **The redesign** on a `redesign` branch; review Cloudflare's preview build of the branch; merge.
3. **Rollback:** Cloudflare's "rollback to previous deployment", or `git revert`.
4. **Close open issues:** remove each entry in `docs/website-open-issues.md` as it is resolved. The
   redesign resolves the page-copy entries (waitlist promises, "What's yours stays yours", walked-back
   Ascend claims, launch order, UnderRated, the Sillage-only confirmation email). Entries that depend
   on Ascend changes or the report webhook stay open.

## 9. Out of scope

- The Aineara logo (separate project; the layout leaves room for a mark).
- Rewriting the Terms of Use (needs legal review).
- Ascend app changes, including adopting `#1560DC` for blue text on light surfaces.
- The Sillage app.

## 10. Decisions made during planning

The implementation plan (`docs/superpowers/plans/2026-09-30-website-redesign.md`) records 19 further
owner decisions (D1–D19), all accepted at their recommended defaults on 2026-09-30. The ones that
change this spec are folded in above: the Ascend subhead (§2 row 7, §5.2), principle 2's wording
(§5.1) and leaving out the Training load screenshot (§5.2). The rest (for example turning off
Cloudflare's email obfuscation, building on Node 26, Latin-only Inter, and sending no confirmation
email for an unknown source) are implementation choices recorded in the plan.
