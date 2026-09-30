import { test } from "node:test";
import assert from "node:assert/strict";
import { readHtml, isTemplated, norm } from "../helpers/site.js";

const root = readHtml("404.html");
const main = root.querySelector("main#main");
const text = (element) => norm(element?.text);

test("404 is built from the base layout", () => {
  assert.ok(isTemplated(root), "_site/404.html has no Eleventy generator tag");
  assert.ok(main, "no main#main");
});

test("404 stays out of search results and link previews", () => {
  assert.equal(root.querySelector('meta[name="robots"]')?.getAttribute("content"), "noindex");
  assert.equal(root.querySelector('link[rel="canonical"]'), null, "noindex pages have no canonical");
  const og = root.querySelectorAll("meta").filter((meta) => (meta.getAttribute("property") ?? "").startsWith("og:"));
  assert.equal(og.length, 0, "no og:* tags");
});

test("404 title and description", () => {
  assert.equal(text(root.querySelector("title")), "Page not found — Aineara");
  assert.equal(root.querySelector('meta[name="description"]')?.getAttribute("content"), "Page not found — Aineara.");
});

test("404 shows the studio hero", () => {
  const hero = main?.querySelector("section.hero");
  assert.ok(hero, "no section.hero inside main#main");
  assert.equal(text(hero.querySelector(".label")), "Error 404");
  assert.equal(text(hero.querySelector("h1")), "This page doesn't exist.");
  assert.ok(text(hero).includes("The link may be broken, or the page may have moved."), "the line is missing");
  const home = hero.querySelector('a.button--primary[href="/"]');
  assert.ok(home, 'no a.button--primary[href="/"]');
  assert.equal(text(home), "Return Home");
  assert.equal(root.querySelectorAll(".reveal").length, 0, "404 never fades in");
});

test("404 has the site nav and footer", () => {
  assert.ok(root.querySelector("header.site-header nav.nav"), "no site nav");
  const footer = root.querySelector("footer.site-footer");
  assert.ok(footer, "no site footer");
  for (const href of ["/privacy", "/terms", "/support", "mailto:hello@aineara.com"]) {
    assert.ok(footer.querySelector(`a[href="${href}"]`), `the footer has no link to ${href}`);
  }
});
