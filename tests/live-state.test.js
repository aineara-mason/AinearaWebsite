// Builds the site a second time with Ascend marked live, through the
// test-only override in src/_data/site.js, and checks the pages that change.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ROOT, readHtml, isTemplated, norm, pageStrings } from "./helpers/site.js";
import { buildSite } from "./helpers/build.js";
import copy from "../src/_data/copy.js";

const TEST_APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
const LIVE_DIR = path.join(ROOT, "_site-live");
const STALE_MARKER = path.join(LIVE_DIR, "stale-marker.txt");

// A file left over from an earlier build, which the build must clear so no
// page or image that is no longer generated can satisfy a check below.
mkdirSync(LIVE_DIR, { recursive: true });
writeFileSync(STALE_MARKER, "left over from an earlier build\n");

// The build finishes before any describe() below reads a page.
await buildSite({ outDir: LIVE_DIR, env: { AINEARA_TEST_ASCEND_LIVE_URL: TEST_APP_STORE_URL } });

const text = (el) => norm(el.text);

function one(scope, selector) {
  const el = scope.querySelector(selector);
  assert.ok(el, `missing ${selector}`);
  return el;
}

test("the live build starts from an empty _site-live", () => {
  assert.ok(!existsSync(STALE_MARKER), "_site-live/stale-marker.txt survived the build");
});

describe("ascend.html with Ascend live", () => {
  const root = readHtml("ascend.html", LIVE_DIR);

  test("has no Ascend signup form", () => {
    assert.ok(isTemplated(root), "_site-live/ascend.html is still the legacy page");
    assert.equal(root.querySelectorAll('form[data-app="ascend"]').length, 0);
    assert.ok(!pageStrings(root).includes(copy["signup.note.ascend"]), "signup.note.ascend still shows after launch");
  });

  test("shows exactly one App Store badge, in the hero", () => {
    const badges = root.querySelectorAll(".app-store-badge");
    assert.equal(badges.length, 1, "exactly one badge on the page");
    one(root, "section.ascend-hero .app-store-badge");
    assert.equal(badges[0].getAttribute("href"), TEST_APP_STORE_URL);
    const img = one(badges[0], "img");
    assert.equal(img.getAttribute("alt"), copy["ascend.alt.badge"]);
    assert.ok(Number(img.getAttribute("height")) >= 40, "the badge is at least 40px tall");
  });

  test("turns the #get-ascend heading into the App Store link", () => {
    const link = one(root, `#get-ascend h2 a[href="${TEST_APP_STORE_URL}"]`);
    assert.equal(text(link), copy["ascend.cta.heading.live"]);
    one(root, "#get-ascend p.disclaimer");
    assert.ok(
      !pageStrings(root).includes(copy["ascend.cta.heading.waitlist"]),
      "ascend.cta.heading.waitlist still shows after launch",
    );
  });

  test("shows the live pricing line", () => {
    const pricing = text(one(root, "#pricing"));
    assert.ok(pricing.includes(copy["ascend.pricing"]), "ascend.pricing");
    assert.ok(!pricing.includes(copy["ascend.pricing.waitlist"]), "ascend.pricing.waitlist still shows after launch");
  });

  test("uses the live meta description", () => {
    assert.equal(
      one(root, 'meta[name="description"]').getAttribute("content"),
      copy["meta.ascend.description.live"],
    );
  });
});

describe("index.html with Ascend live", () => {
  const root = readHtml("index.html", LIVE_DIR);

  test("swaps the waitlist form for one App Store badge under the live heading", () => {
    assert.equal(root.querySelectorAll('form[data-app="ascend"]').length, 0, "no Ascend form");
    assert.equal(root.querySelectorAll(".app-store-badge").length, 1, "exactly one badge on the page");
    const strip = one(root, "section#waitlist");
    assert.equal(text(one(strip, "h2")), copy["home.waitlist.live.heading"]);
    const badge = one(strip, "a.app-store-badge");
    assert.equal(badge.getAttribute("href"), TEST_APP_STORE_URL);
    assert.equal(one(badge, "img").getAttribute("alt"), copy["ascend.alt.badge"]);
    const html = strip.innerHTML;
    assert.ok(html.indexOf("<h2") < html.indexOf("app-store-badge"), "the badge sits under the heading");
  });

  test("labels the Ascend card On the App Store", () => {
    assert.equal(text(one(root, ".app-card--ascend .app-card-label")), copy["home.cards.ascend.label.live"]);
  });

  test("uses the live hero line and meta description", () => {
    const hero = one(root, "main#main > section.hero");
    assert.ok(
      hero.querySelectorAll("p").some((p) => text(p) === copy["home.hero.line.live"]),
      "the live hero line",
    );
    assert.equal(
      one(root, 'meta[name="description"]').getAttribute("content"),
      copy["meta.home.description.live"],
    );
  });

  test("drops the waitlist hero line, heading, card label and signup note", () => {
    const strings = pageStrings(root);
    for (const key of ["home.hero.line", "home.waitlist.heading", "home.cards.ascend.label", "signup.note.ascend"]) {
      assert.ok(!strings.includes(copy[key]), `${key} still shows after launch`);
    }
  });
});

describe("sillage.html with Ascend live", () => {
  const root = readHtml("sillage.html", LIVE_DIR);

  test("keeps the Sillage signup form", () => {
    const forms = root.querySelectorAll("form.signup-form");
    assert.equal(forms.length, 1, "one signup form on /sillage");
    assert.equal(forms[0].getAttribute("data-source"), "sillage-landing");
    assert.equal(forms[0].getAttribute("data-app"), "sillage");
    assert.equal(root.querySelectorAll(".app-store-badge").length, 0, "no App Store badge on /sillage");
  });
});
