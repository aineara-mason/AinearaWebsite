# Website open issues

Known places where the live site contradicts itself, the privacy policy, or the Ascend app.
The privacy policy (`public/privacy.html`) and support page (`public/support.html`) were checked
line by line against the Ascend code on 2026-09-30; everything below is what that check left open.
Remove an entry when it's resolved.

## Policy and support page describe Ascend after pending app changes

These pages went live on 2026-09-30, ahead of the Ascend changes they describe. They become
accurate when those changes ship.

- **Coaching** (privacy §2.8, support "Sharing and safety"). Written for the coach-access change
  planned in the Ascend repo: `docs/superpowers/plans/2026-09-30-coach-access-one-way.md`.
  That plan's Task 9 makes the remaining wording fixes, including adding the coach directory
  listing row and replacing "you see nothing of your coach's own data" (clients can see coach
  templates their own plans use).
- **Settings › Coaching invite inbox** (support page). Doesn't exist until that plan's Task 8 ships.
- **Photo Meal Estimate** (privacy §2.5 and §2.6 say "a resized copy" is sent). True once the
  Ascend photo-upload fix ships; until then an unreadable photo is sent as the original file.

## Promises that depend on setup outside this repo

- **"We review reports within 24 hours"** (support page, and the Ascend Report sheet). Needs the
  Supabase `content_reports` alert webhook configured and monitored. If that can't be committed
  to, soften the wording in both places.
- **Account emails via Resend** (privacy §2.1 and §5). Assumes Supabase Auth's custom SMTP is set
  to Resend.

## Site copy that contradicts the privacy policy

- **Waitlist emails.** The policy says one confirmation and one launch email, nothing else.
  `public/index.html` promises "exclusive launch pricing, and an inside look at what we're
  building"; `public/ascend.html` promises "an inside look at what we're building before anyone
  else sees it". Remove those promises, or change the policy and add an unsubscribe route.
- **"What's yours stays yours" / "at home on your device"** (`public/index.html`). Ascend stores
  data on our servers and, with consent, sends some to Anthropic. Reword.
- **The confirmation email** (`functions/api/subscribe.js`) always talks about Sillage, even for
  Ascend signups, and has no unsubscribe link.

## Site copy that contradicts the Ascend app

- **`public/ascend.html`** still makes claims the app has walked back: HRV and resting heart rate
  feeding readiness, sleep stages, coach/client features as described, and "exclusive launch
  pricing". The app follows the FDA General Wellness framing; the page should too.
- **Launch order.** `public/sillage.html` and `public/ascend.html` call Sillage the first app and
  Ascend the second. Ascend launches first.
- **UnderRated** is listed on the homepage but has no product behind it.

## Other

- `public/terms.html` is titled "Terms" (the app says "Terms of Use"), names no product, and
  mentions "third-party payment providers" (Apple handles all billing). Needs a proper rewrite.
- Light-theme links and muted text fall below WCAG AA contrast site-wide. Fix in the redesign.
- `/README.md`, `/schema.sql` and `/.assetsignore` may still be served from a stale Cloudflare
  cache until about 2026-10-06; they are no longer in the deployed site.
