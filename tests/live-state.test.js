import { test, before } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import copy from "../src/_data/copy.js";
import { ROOT, readHtml, isTemplated, norm, pageStrings } from "./helpers/site.js";
import { buildSite } from "./helpers/build.js";

const TEST_APP_STORE_URL = "https://apps.apple.com/app/id0000000000";
const LIVE_OUT = "_site-live";
const LIVE_DIR = join(ROOT, LIVE_OUT);

before(() => {
  buildSite({ outDir: LIVE_OUT, env: { AINEARA_TEST_ASCEND_LIVE_URL: TEST_APP_STORE_URL } });
  assert.ok(existsSync(join(LIVE_DIR, "ascend.html")), "the live build did not write _site-live/ascend.html");
});

function livePage(rel) {
  const root = readHtml(rel, LIVE_DIR);
  assert.ok(isTemplated(root), `_site-live/${rel} is still the legacy page`);
  return root;
}
const joinStrings = (value) => (typeof value === "string" ? value : Array.from(value).join("\n"));

test("ascend (live): no Ascend form and exactly one App Store badge, in the hero (D7)", () => {
  const root = livePage("ascend.html");
  assert.equal(root.querySelectorAll('form[data-app="ascend"]').length, 0);
  const badges = root.querySelectorAll(".app-store-badge");
  assert.equal(badges.length, 1, "Apple asks for one badge per layout");
  assert.ok(root.querySelector("section.ascend-hero .app-store-badge"), "the badge belongs in the hero");
  const [badge] = badges;
  assert.equal(badge.getAttribute("href"), TEST_APP_STORE_URL);
  const img = badge.querySelector("img");
  assert.equal(img.getAttribute("alt"), "Download on the App Store");
  assert.ok(Number(img.getAttribute("height")) >= 40, "Apple's minimum badge height is 40px");
});

test("ascend (live): the final heading links to the App Store instead of a second badge", () => {
  const root = livePage("ascend.html");
  const link = root.querySelector(`#get-ascend h2 a[href="${TEST_APP_STORE_URL}"]`);
  assert.ok(link, "no App Store link in the #get-ascend h2");
  assert.equal(norm(link.text), "Get Ascend on the App Store.");
  assert.ok(root.querySelector("#get-ascend p.disclaimer"));
});

test("ascend (live): live pricing line and live meta description", () => {
  const root = livePage("ascend.html");
  const pricing = norm(root.querySelector("#pricing").text);
  assert.ok(pricing.includes(copy["ascend.pricing"]));
  assert.ok(!pricing.includes(copy["ascend.pricing.waitlist"]));
  assert.equal(root.querySelector('meta[name="description"]').getAttribute("content"), copy["meta.ascend.description.live"]);
});

test("ascend (live): the live-only copy renders and the waitlist copy is gone", () => {
  const strings = joinStrings(pageStrings(livePage("ascend.html")));
  for (const id of ["ascend.pricing", "ascend.cta.heading.live", "ascend.alt.badge", "meta.ascend.description.live"]) {
    assert.ok(strings.includes(copy[id]), `missing ${id}`);
  }
  for (const id of ["ascend.cta.heading.waitlist", "signup.note.ascend"]) {
    assert.ok(!strings.includes(copy[id]), `${id} still shows after launch`);
  }
});
