// tests/pages/legal.test.js
// Privacy, support and terms keep their verified words (spec §3.2, §7). Each
// page's <main> must read exactly like the text frozen from the legacy public/
// pages in Task 9. Privacy may differ only by the five §6.5 edits below
// (shared definitions §12).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import site from "../../src/_data/site.js";
import { LEGAL_PAGES, SNAPSHOT_DIR, legalText } from "../helpers/legal-text.js";
import { SITE_DIR, readHtml } from "../helpers/site.js";

// `from` is the frozen legacy line, and `to` is what the page must say now.
// A `to` of null deletes the line.
const PRIVACY_EDITS = [
  {
    // public/privacy.html:58
    from: "Last updated: September 29, 2026",
    to: `Last updated: ${site.legal.privacyUpdated}`,
  },
  {
    // public/privacy.html:187
    from: "Fonts. Pages load fonts from Google Fonts, so your browser sends your IP address to Google.",
    to: null,
  },
  {
    // public/privacy.html:188
    from: "Cookies. The site's own code sets no cookies. It saves a light or dark theme setting in your browser's local storage: your device's setting when you first visit, or your choice if you use the theme toggle.",
    to: "Cookies. The site's own code sets no cookies. It remembers your light or dark choice in your browser's local storage, only if you use the theme toggle.",
  },
  {
    // public/privacy.html:189
    from: "Waitlists. If you join a waitlist, we store your email address, which form you used and when. We send one confirmation email, through our email provider Resend, and one email when the product launches. We don't send other marketing. To be removed, email privacy@aineara.com <mailto:privacy@aineara.com>.",
    to: "Waitlists. If you join a waitlist, we store your email address, which form you used and when. We send one confirmation email about the app you signed up for (the homepage form is for Ascend), through our email provider Resend, and one email when that app launches. We don't send other marketing. To be removed, reply to one of these emails or write to privacy@aineara.com <mailto:privacy@aineara.com>.",
  },
  {
    // public/privacy.html:213
    from: "Google | Website fonts, and our email inboxes (support@ and privacy@aineara.com) | IP address and request details; emails you send us and what you put in them",
    to: "Google | Our email inboxes (hello@, support@ and privacy@aineara.com) | Emails you send us and what you put in them",
  },
];

const toLines = (text) => text.replace(/\n$/, "").split("\n");
const snapshotLines = (name) => toLines(readFileSync(path.join(SNAPSHOT_DIR, `${name}.txt`), "utf8"));
const pageLines = (name) => toLines(legalText(readHtml(`${name}.html`).querySelector("main").outerHTML));
const rawPage = (name) => readFileSync(path.join(SITE_DIR, `${name}.html`), "utf8");

function applyEdits(lines, edits) {
  const out = [...lines];
  for (const { from, to } of edits) {
    const at = out.flatMap((line, i) => (line === from ? [i] : []));
    assert.equal(at.length, 1, `the snapshot must contain this line exactly once: ${from}`);
    if (to === null) out.splice(at[0], 1);
    else out[at[0]] = to;
  }
  return out;
}

test("privacy.html matches its snapshot with the §6.5 edits applied", () => {
  assert.deepEqual(pageLines("privacy"), applyEdits(snapshotLines("privacy"), PRIVACY_EDITS));
});

for (const name of ["support", "terms"]) {
  test(`${name}.html matches its snapshot`, () => {
    assert.deepEqual(pageLines(name), snapshotLines(name));
  });
}

for (const name of LEGAL_PAGES) {
  test(`${name}.html uses the legal layout`, () => {
    const root = readHtml(`${name}.html`);
    const raw = rawPage(name);
    assert.ok(root.querySelector("main#main.legal"), "main#main.legal is missing");
    assert.equal(root.querySelectorAll(".reveal").length, 0, "legal pages never use .reveal");
    assert.doesNotMatch(raw, /<[a-z][^>]*\sstyle=/i, "no inline style= attributes");
    assert.ok(!raw.includes("css/privacy.css"), "still links the legacy privacy.css");
    assert.ok(raw.includes('href="/assets/css/legal.css"'), "legal.css is not linked");
    // A wrap scrolls sideways on phones, and its table holds nothing
    // focusable, so the wrap itself must take focus (WCAG 2.1.1) and be a
    // named region, like the Ascend screenshot rail.
    const wraps = root.querySelectorAll(".legal-table-wrap");
    assert.equal(wraps.length, name === "privacy" ? 3 : 0, "unexpected number of table wraps");
    for (const wrap of wraps) {
      assert.equal(wrap.getAttribute("tabindex"), "0", "a table wrap is not keyboard-scrollable");
      assert.equal(wrap.getAttribute("role"), "region", "a table wrap is not a region");
      const labelledBy = wrap.getAttribute("aria-labelledby");
      const label = labelledBy ? root.getElementById(labelledBy)?.text : wrap.getAttribute("aria-label");
      assert.ok(label?.trim(), "a table wrap has no accessible name");
    }
  });
}

test("only terms.html is noindex", () => {
  const robots = (name) =>
    readHtml(`${name}.html`).querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;
  assert.equal(robots("terms"), "noindex");
  assert.equal(robots("privacy"), null);
  assert.equal(robots("support"), null);
});

test("privacy.html no longer mentions Google Fonts", () => {
  assert.doesNotMatch(rawPage("privacy"), /google fonts/i);
});
