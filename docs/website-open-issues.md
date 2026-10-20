# Website open issues

Known places where the live site contradicts itself, the privacy policy, or the Ascend app.
The privacy policy (`src/privacy.njk`) and support page (`src/support.njk`) were checked
line by line against the Ascend code on 2026-09-30; everything below is what that check and the
redesign left open. Remove an entry when it's resolved.

## Policy and support page describe Ascend after pending app changes

These pages went live on 2026-09-30, ahead of the Ascend changes they describe. They become
accurate when those changes ship.

- **Apple Health "five types"** (privacy §2.4). True once the Ascend build that stops requesting
  active energy ships (`Ascend/Services/HealthKitService.swift`, `readTypes`); earlier builds
  still ask for it, and never use it.
- **Apple Health data, "Only you"** (privacy §2.8, now that the coach row is gone). True once the
  Ascend migration `supabase/migrations/20261005000010_coaching_is_one_way.sql` is applied: it
  drops `coach_snapshot_select`, which until then (`20260806000009_coaching_is_directionless.sql`)
  lets either person in an accepted coaching relationship read the other's Apple Health
  snapshots. Production had no coaching relationships on 2026-10-05, so nobody is exposed today.
  A push to `main` deploys at once, so merge these pages after `supabase db push` has applied it,
  and ideally with the Ascend build that stops requesting active energy.
- **Photo Meal Estimate** (privacy §2.5 and §2.6 say "a resized copy" is sent). True once the
  Ascend photo-upload fix ships; until then an unreadable photo is sent as the original file.

## Promises that depend on setup outside this repo

- **"We review reports within 24 hours"** (support page, and the Ascend Report sheet). Needs the
  Supabase `content_reports` alert webhook configured and monitored. If that can't be committed
  to, soften the wording in both places.
- **Account emails via Resend** (privacy §2.1 and §5). Assumes Supabase Auth's custom SMTP is set
  to Resend.

## Left open by the redesign

- **Cross-list signups.** `subscribers.email` is unique across every list (`schema.sql`), so the
  first form wins. Someone on the Sillage list who later uses an Ascend form is told "We'll email
  you when Ascend launches", but their row keeps `sillage-landing` and no Ascend confirmation is
  sent; the same happens the other way round. Either send each launch email to everyone on the
  list, or dedupe on (email, source), which needs a schema migration.
- **Launch emails.** They're sent outside this repo, and each needs what the confirmation emails
  now have: the removal line ("To be removed, reply to this email or write to
  privacy@aineara.com.") and `reply_to` set to privacy@aineara.com. The privacy policy promises
  both.
- **Training Load screenshot.** `05-training-load.png` isn't published: its "How to read this"
  card says staying in range "minimises injury risk", wording Ascend has since removed. Re-shoot
  it on current Ascend main (or crop the card off), copy it into `src/_images/ascend/`, and add it
  to `src/_data/ascendScreens.js` after `04-nutrition` in the rail, with the alt text
  `ascend.alt.05-training-load`. `01-today.png` also predates the app's current wording; if it's
  re-shot, rewrite `ascend.alt.01-today` as well, because its figures will change.
- **Plan Store pricing.** The pricing line on /ascend mentions only the subscriptions. If one-off
  plans are on sale in Ascend's Plan Store at launch, the line is true but incomplete; consider
  "Free to start. Optional Plus, Pro and Elite subscriptions, and plans you can buy once."

## Needed before Sillage launches

- **Email-confirmation page, `/sillage/confirmed`.** Sillage keeps Supabase's "Confirm email" off
  until this page exists (decided 2026-10-20). Once it's on, the link in the confirmation email
  confirms the address, then opens the Sillage Supabase project's Site URL in the browser, never
  the app. The default Site URL, `http://localhost:3000`, shows a connection error, and the
  homepage would put the Ascend waitlist form ("One email to confirm") in front of a new Sillage
  user. The page should:
  - say "Your email is confirmed. Go back to Sillage and sign in."
  - when the URL has `error_code`, say instead "This link was already used or has expired. Try
    signing in to Sillage. If it asks you to confirm your email first, tap Forgot your password?
    for a code, or create your account again for a new link."
  - have no form and no third-party script, which means a layout without the Cloudflare beacon
    that `src/_includes/layouts/base.njk` loads, and be `noindex`. Links that skip PKCE, such as
    dashboard invites, land on the Site URL with session tokens after the `#`.
  - clear `?code=` and any `#...` from the address bar with `history.replaceState`.

  Then set the Site URL to the page and turn "Confirm email" on. The background, including mail
  scanners and what an expired link does, is in the Sillage repo's `supabase/README.md`
  ("Confirm Sign Up").
- **Sillage account emails in the privacy policy.** This answers the TODO in §4 on the
  `sillage-privacy-draft` branch. Sign-up sends no confirmation email for now. Reset codes go
  through Resend from aineara.com once Sillage's Supabase custom SMTP is set up, so §4 needs
  that sentence and Sillage needs adding to Resend's row in §5. If "Confirm email" is turned on
  before launch, mention the confirmation email too.

## Other

- **Human coaching** is hidden in Ascend 1.0, so since 2026-10-05 the privacy policy and support
  page don't describe it. If it's switched back on, both need it again before that build ships:
  a row in privacy §2.8, "or coaching relationship" in the blocking sentences (privacy §2.8 and
  support "Sharing and safety"), and a support entry, each checked against what the app then does.
- `src/terms.njk` (its text moved unchanged from `public/terms.html`) is titled "Terms of Service"
  (the app says "Terms of Use"), names no product, and mentions "third-party payment providers"
  (Apple handles all billing). Needs a proper rewrite.
- `/README.md`, `/schema.sql` and `/.assetsignore` may still be served from a stale Cloudflare
  cache until about 2026-10-06; they are no longer in the deployed site.
