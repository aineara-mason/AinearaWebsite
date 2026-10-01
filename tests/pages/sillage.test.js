// Sillage page (/sillage): spec §5.3, one screen in the Sillage scope.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SITE_DIR, readHtml, isTemplated, norm } from "../helpers/site.js";
import copy from "../../src/_data/copy.js";

const root = readHtml("sillage.html");
const text = (el) => norm(el.text);

// Named in the legacy page (public/sillage.html:187-188, 192, 205-206, 210):
// two sample reviewers, their handles, and two third-party fragrances with
// their houses. None may come back (spec §5.3).
const BANNED_ON_SILLAGE = [
  "Elise Moreau",
  "Thomas Park",
  "@elise.olfactory",
  "@thomas.scent",
  "Baccarat",
  "MFK",
  "Oud Wood",
  "Tom Ford",
];

function one(scope, selector) {
  const el = scope.querySelector(selector);
  assert.ok(el, `missing ${selector}`);
  return el;
}

test("is built from the base layout with the Sillage stylesheet", () => {
  assert.ok(isTemplated(root), "sillage.html has no Eleventy generator meta");
  assert.equal(text(one(root, "title")), copy["title.sillage"]);
  one(root, 'link[rel="stylesheet"][href="/assets/css/sillage.css"]');
});

test("main is one Sillage-scoped screen with the label, name and two lines", () => {
  const main = one(root, "main#main.sillage-page.scope-sillage");
  assert.equal(text(one(main, ".label")), copy["sillage.label"]);
  assert.equal(text(one(main, "h1.sillage-name")), copy["sillage.name"]);
  assert.deepEqual(
    main.querySelectorAll(".sillage-lines p").map(text),
    [copy["sillage.line.1"], copy["sillage.line.2"]],
  );
  assert.equal(root.querySelectorAll(".reveal").length, 0, "nothing on /sillage fades in");
});

test("#waitlist holds the Sillage form with the Sillage note", () => {
  const waitlist = one(root, "main#main section#waitlist");
  assert.equal(root.querySelectorAll("form.signup-form").length, 1, "one form on the page");
  const form = one(waitlist, "form.signup-form");
  assert.equal(form.getAttribute("data-source"), "sillage-landing");
  assert.equal(form.getAttribute("data-app"), "sillage");
  assert.equal(form.getAttribute("data-msg-success"), copy["signup.success.sillage"]);
  one(form, "#signup-email-sillage");
  assert.equal(text(one(form, "#signup-note-sillage")), copy["signup.note.sillage"]);
  assert.equal(text(one(waitlist, "noscript .signup-nojs")), copy["signup.nojs.sillage"]);
});

test("links back to Aineara with the arrow-left icon", () => {
  const back = one(root, 'main#main a.sillage-back[href="/"]');
  assert.equal(text(back), copy["sillage.back"]);
  one(back, "svg.icon");
});

test("uses the Sillage link-preview image", () => {
  assert.equal(
    one(root, 'meta[property="og:image"]').getAttribute("content"),
    "https://aineara.com/assets/img/og/sillage.png",
  );
});

test("names no reviewers, handles, or third-party fragrances or houses", () => {
  const html = root.toString().toLowerCase();
  for (const phrase of BANNED_ON_SILLAGE) {
    assert.ok(!html.includes(phrase.toLowerCase()), `found "${phrase}"`);
  }
});

test("sillage.css styles the scope with the Sillage tokens", () => {
  const css = readFileSync(path.join(SITE_DIR, "assets/css/sillage.css"), "utf8");
  for (const token of [
    "--sillage-page",
    "--sillage-hairline",
    "--sillage-gold",
    "--sillage-button-bg",
    "--sillage-button-text",
    "--font-sillage-display",
  ]) {
    assert.ok(css.includes(`var(${token})`), `sillage.css never uses var(${token})`);
  }
});
