// Homepage (/) as the studio home: spec §5.1. Every string comes from src/_data/copy.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SITE_DIR, readHtml, isTemplated, norm } from "../helpers/site.js";
import copy from "../../src/_data/copy.js";
import site from "../../src/_data/site.js";

const root = readHtml("index.html");
const live = site.apps.ascend.live;
const text = (el) => norm(el.text);

// Banned on index.html only (plan shared definitions, section 13).
const BANNED_ON_HOME = ["than anyone else", "stays on your device"];

function one(scope, selector) {
  const el = scope.querySelector(selector);
  assert.ok(el, `missing ${selector}`);
  return el;
}

test("is built from the base layout", () => {
  assert.ok(isTemplated(root), "index.html has no Eleventy generator meta");
});

test("sections come in the spec order, with .reveal only below the hero", () => {
  const sections = root.querySelectorAll("main#main > section");
  assert.equal(sections.length, 5, "hero, #apps, #principles, #about, #waitlist");
  assert.ok(sections[0].classList.contains("hero"), "the first section is the studio hero");
  assert.equal(sections[0].classList.contains("reveal"), false, "the hero never fades in");
  assert.deepEqual(sections.slice(1).map((s) => s.id), ["apps", "principles", "about", "waitlist"]);
  for (const s of sections.slice(1)) assert.ok(s.classList.contains("reveal"), `#${s.id} fades in`);
});

test("the hero has the label, heading, line and Meet Ascend button", () => {
  const hero = one(root, "main#main > section.hero");
  assert.equal(text(one(hero, ".label")), copy["home.hero.label"]);
  assert.equal(text(one(hero, "h1.display")), copy["home.hero.heading"]);
  const line = live ? copy["home.hero.line.live"] : copy["home.hero.line"];
  assert.ok(hero.querySelectorAll("p").some((p) => text(p) === line), `hero line "${line}"`);
  const button = one(hero, ".hero-actions a.button.button--primary");
  assert.equal(button.getAttribute("href"), "/ascend");
  assert.equal(text(button), copy["home.hero.button"]);
});

test("#apps has its label and the navy Ascend card", () => {
  const apps = one(root, "section#apps");
  assert.equal(text(one(apps, "h2.label")), copy["home.apps.label"]);
  const card = one(apps, ".app-card.app-card--ascend.scope-ascend");
  const mark = one(card, "img.app-mark");
  assert.equal(mark.getAttribute("alt"), "", "the mark is decorative");
  assert.equal(mark.getAttribute("loading"), "lazy");
  assert.equal(text(one(card, "h3.app-card-title")), copy["home.cards.ascend.name"]);
  const label = live ? copy["home.cards.ascend.label.live"] : copy["home.cards.ascend.label"];
  assert.equal(text(one(card, ".app-card-label")), label);
  assert.equal(text(one(card, "p.heading")), copy["home.cards.ascend.tagline"]);
  assert.equal(text(one(card, ".app-card-line")), copy["home.cards.ascend.line"]);
  const link = one(card, "a.app-card-link");
  assert.equal(link.getAttribute("href"), "/ascend");
  assert.equal(text(link), copy["home.cards.ascend.link"]);
  one(link, "svg.icon");
});

test("#apps has the Sillage card and no third card", () => {
  const apps = one(root, "section#apps");
  const card = one(apps, ".app-card.app-card--sillage.scope-sillage");
  assert.equal(text(one(card, "h3.app-card-title")), copy["home.cards.sillage.name"]);
  assert.equal(text(one(card, ".app-card-label")), copy["home.cards.sillage.label"]);
  assert.equal(text(one(card, ".app-card-line")), copy["home.cards.sillage.line"]);
  const link = one(card, "a.app-card-link");
  assert.equal(link.getAttribute("href"), "/sillage");
  assert.equal(text(link), copy["home.cards.sillage.link"]);
  assert.equal(card.querySelectorAll("img").length, 0, "the Ascend mark only sits on navy");
  assert.equal(apps.querySelectorAll(".app-card").length, 2, "Ascend and Sillage only (no UnderRated)");
});

test("#principles has the three principles in order", () => {
  const section = one(root, "section#principles");
  assert.equal(text(one(section, "h2.label")), copy["home.principles.label"]);
  const blocks = section.querySelectorAll(".principles > .principle");
  assert.equal(blocks.length, 3, "three principles");
  blocks.forEach((block, i) => {
    assert.equal(text(one(block, "h3.principle-title")), copy[`home.principles.${i + 1}.title`]);
    assert.equal(text(one(block, ".principle-body")), copy[`home.principles.${i + 1}.body`]);
  });
});

test("#about has its label, heading and paragraph", () => {
  const about = one(root, "section#about");
  assert.equal(text(one(about, ".label")), copy["home.about.label"]);
  assert.equal(text(one(about, "h2")), copy["home.about.heading"]);
  assert.ok(about.querySelectorAll("p").some((p) => text(p) === copy["home.about"]), "the About paragraph");
});

test(
  "#waitlist has its heading and the homepage Ascend form",
  { skip: live && "Ascend is live: tests/live-state.test.js checks the badge strip" },
  () => {
    const strip = one(root, "section#waitlist.waitlist-strip");
    assert.equal(text(one(strip, "h2")), copy["home.waitlist.heading"]);
    assert.equal(root.querySelectorAll("form.signup-form").length, 1, "one form on the page");
    const form = one(strip, "form.signup-form");
    assert.equal(form.getAttribute("data-source"), "aineara-homepage");
    assert.equal(form.getAttribute("data-app"), "ascend");
    one(form, "#signup-email-home");
    assert.equal(text(one(form, "#signup-note-home")), copy["signup.note.ascend"]);
  },
);

test("the nav CTA goes to /ascend and the link preview is the studio image", () => {
  assert.equal(one(root, ".site-header .nav-cta").getAttribute("href"), "/ascend");
  assert.equal(
    one(root, 'meta[property="og:image"]').getAttribute("content"),
    "https://aineara.com/assets/img/og/home.png",
  );
});

test("contains none of the homepage's banned phrases", () => {
  const html = root.toString().toLowerCase();
  for (const phrase of BANNED_ON_HOME) assert.ok(!html.includes(phrase), `found "${phrase}"`);
});

test("site.css styles the homepage components", () => {
  const css = readFileSync(path.join(SITE_DIR, "assets/css/site.css"), "utf8");
  for (const selector of [".app-card--ascend", ".app-card--sillage", ".app-mark", ".principles", ".waitlist-strip"]) {
    assert.ok(css.includes(selector), `site.css has no ${selector} rule`);
  }
});
