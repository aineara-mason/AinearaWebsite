import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, posix } from "node:path";
import copy from "../../src/_data/copy.js";
import ascendScreens from "../../src/_data/ascendScreens.js";
import tokens from "../../src/_data/tokens.js";
import { ROOT, SITE_DIR, readHtml, isTemplated, norm, pageStrings } from "../helpers/site.js";

// Shared Definitions §13: phrases banned on ascend.html only.
const BANNED_ON_ASCEND = ["hrv", "resting heart rate", "sleep stage", "injur", "coach", "05-training-load"];
const BUDGET_BYTES = 1_000_000; // spec §6.6: first load under about 1 MB

function ascendPage() {
  const root = readHtml("ascend.html");
  assert.ok(isTemplated(root), "_site/ascend.html is still the legacy page");
  return root;
}
const text = (el) => norm(el.text);
const altOf = (id) => copy[ascendScreens.items[id].altId];
const meta = (root, key) => root.querySelector(`meta[property="${key}"], meta[name="${key}"]`);
const joinStrings = (value) => (typeof value === "string" ? value : Array.from(value).join("\n"));

test("head: title, description, stylesheet, body class, link preview and nav CTA", () => {
  const root = ascendPage();
  assert.equal(text(root.querySelector("title")), copy["title.ascend"]);
  assert.equal(meta(root, "description").getAttribute("content"), copy["meta.ascend.description.waitlist"]);
  assert.ok(root.querySelector('link[rel="stylesheet"][href="/assets/css/ascend.css"]'), "ascend.css is not linked");
  assert.ok(root.querySelector("body").classList.contains("page-ascend"), "body needs .page-ascend");
  assert.equal(meta(root, "og:image").getAttribute("content"), "https://aineara.com/assets/img/og/ascend.png");
  assert.equal(root.querySelector("a.nav-cta").getAttribute("href"), "#get-ascend");
});

test("hero: navy scope, eager decorative mark, label, heading, D5 subhead and the hero form", () => {
  const root = ascendPage();
  const hero = root.querySelector("section.ascend-hero.scope-ascend");
  assert.ok(hero, "no section.ascend-hero.scope-ascend");
  const mark = hero.querySelector("img.ascend-mark");
  assert.ok(mark, "no img.ascend-mark in the hero");
  assert.equal(mark.getAttribute("alt"), "");
  assert.equal(mark.getAttribute("loading"), "eager");
  assert.equal(text(hero.querySelector(".label")), copy["ascend.hero.label"]);
  assert.equal(text(hero.querySelector("h1")), copy["ascend.hero.heading"]);
  assert.ok(text(hero).includes(copy["ascend.hero.subhead"]), "the D5 subhead is missing");
  const form = hero.querySelector("form.signup-form");
  assert.ok(form, "no signup form in the hero");
  assert.equal(form.getAttribute("data-app"), "ascend");
  assert.equal(form.getAttribute("data-source"), "ascend-landing");
  assert.ok(form.querySelector("#signup-email-ascend-hero"));
  assert.equal(hero.querySelectorAll(".app-store-badge").length, 0, "no badge before launch");
});

test("exactly two forms, ascend-hero then ascend-cta, both ascend-landing", () => {
  const root = ascendPage();
  const forms = root.querySelectorAll("form.signup-form").map((form) => [
    form.querySelector('input[type="email"]').getAttribute("id"),
    form.getAttribute("data-app"),
    form.getAttribute("data-source"),
  ]);
  assert.deepEqual(forms, [
    ["signup-email-ascend-hero", "ascend", "ascend-landing"],
    ["signup-email-ascend-cta", "ascend", "ascend-landing"],
  ]);
});

test("#screens: labelled rail with one lazy screenshot per rail id, in order, with its alt text", () => {
  const root = ascendPage();
  const screens = root.querySelector("#screens");
  assert.ok(screens, "no #screens");
  assert.equal(screens.getAttribute("aria-label"), copy["a11y.rail"]);
  const imgs = screens.querySelectorAll("img");
  assert.equal(imgs.length, ascendScreens.rail.length);
  imgs.forEach((img, i) => {
    assert.equal(img.getAttribute("loading"), "lazy", `rail image ${i + 1} loading`);
    assert.equal(img.getAttribute("alt"), altOf(ascendScreens.rail[i]), `rail image ${i + 1} alt`);
  });
});

test("#train, #eat and #stay: label, heading, four bullets in order and the paired screenshot", () => {
  const root = ascendPage();
  for (const id of ["train", "eat", "stay"]) {
    const section = root.querySelector(`#${id}`);
    assert.ok(section, `no #${id}`);
    assert.ok(section.classList.contains("feature") && section.classList.contains("reveal"), `#${id} needs .feature.reveal`);
    assert.equal(text(section.querySelector(".label")), copy[`ascend.${id}.label`]);
    assert.equal(text(section.querySelector("h2")), copy[`ascend.${id}.heading`]);
    assert.deepEqual(
      section.querySelectorAll("ul.feature-list > li").map(text),
      [1, 2, 3, 4].map((n) => copy[`ascend.${id}.${n}`]),
    );
    const shots = section.querySelectorAll("img");
    assert.equal(shots.length, 1, `#${id} needs exactly one screenshot`);
    assert.equal(shots[0].getAttribute("alt"), altOf(ascendScreens.features[id]));
  }
});

test("#your-data: heading, four lines and the privacy-policy link", () => {
  const root = ascendPage();
  const data = root.querySelector("#your-data");
  assert.ok(data, "no #your-data");
  assert.equal(text(data.querySelector("h2")), copy["ascend.data.heading"]);
  assert.deepEqual(data.querySelectorAll("li").map(text), [1, 2, 3, 4].map((n) => copy[`ascend.data.${n}`]));
  const link = data.querySelector('a[href="/privacy"]');
  assert.ok(link, "no link to /privacy");
  assert.equal(text(link), copy["ascend.data.link"]);
});

test("#pricing: waitlist wording and the subscription note, no live line", () => {
  const root = ascendPage();
  const pricing = root.querySelector("#pricing");
  assert.ok(pricing, "no #pricing");
  assert.equal(text(pricing.querySelector("h2")), copy["ascend.pricing.label"]);
  const body = text(pricing);
  assert.ok(body.includes(copy["ascend.pricing.waitlist"]));
  assert.ok(body.includes(copy["ascend.pricing.note"]));
  assert.ok(!body.includes(copy["ascend.pricing"]), "the live pricing line shows before launch");
});

test("#get-ascend: navy call to action with the waitlist heading, a form and the disclaimer", () => {
  const root = ascendPage();
  const cta = root.querySelector("section#get-ascend.ascend-cta.scope-ascend");
  assert.ok(cta, "no section#get-ascend.ascend-cta.scope-ascend");
  assert.equal(text(cta.querySelector("h2")), copy["ascend.cta.heading.waitlist"]);
  assert.ok(cta.querySelector("form.signup-form #signup-email-ascend-cta"), "no ascend-cta form");
  assert.equal(text(cta.querySelector("p.disclaimer")), copy["ascend.cta.disclaimer"]);
});

test("every image is WebP (src and every srcset candidate)", () => {
  const root = ascendPage();
  const imgs = root.querySelectorAll("img");
  assert.ok(imgs.length > 0);
  for (const img of imgs) {
    assert.match(img.getAttribute("src"), /\.webp$/);
    for (const candidate of (img.getAttribute("srcset") || "").split(",").filter(Boolean)) {
      assert.match(candidate.trim().split(/\s+/)[0], /\.webp$/);
    }
  }
});

test("ascendScreens points at copied originals with alt text, and leaves 05 out (D6)", () => {
  const { items, rail, features, mark } = ascendScreens;
  assert.ok(existsSync(join(ROOT, mark)), `${mark} is missing`);
  for (const item of Object.values(items)) {
    assert.ok(existsSync(join(ROOT, item.file)), `${item.file} is missing`);
    assert.ok(copy[item.altId], `copy.js has no ${item.altId}`);
  }
  for (const id of [...rail, ...Object.values(features)]) assert.ok(items[id], `unknown screen ${id}`);
  assert.equal("05-training-load" in items, false);
  assert.equal(existsSync(join(ROOT, "src/_images/ascend/05-training-load.png")), false);
});

// "1.4s" or "1400ms" in seconds.
function seconds(time) {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(time);
  assert.ok(match, `can't read the time ${time}`);
  return Number(match[1]) / (match[2] === "ms" ? 1000 : 1);
}

test("ascend.css: pulse keyframes, a pulse that stops within five seconds and a reduced-motion override", () => {
  const css = readFileSync(join(SITE_DIR, "assets/css/ascend.css"), "utf8");
  assert.match(css, /@keyframes ascend-pulse\s*\{/);
  const animation = /\.ascend-mark\s*\{[^}]*animation:\s*([^;]+);/.exec(css)?.[1];
  assert.ok(animation, ".ascend-mark has no animation");
  const parts = animation.trim().split(/\s+/);
  assert.deepEqual(parts.slice(0, 2), ["ascend-pulse", "var(--duration-pulse)"]);
  // WCAG 2.2.2 Pause, Stop, Hide: motion that starts on its own must stop within 5 seconds.
  assert.equal(parts.includes("infinite"), false, `the pulse never stops: ${animation}`);
  const counts = parts.filter((part) => /^\d+$/.test(part)).map(Number);
  assert.equal(counts.length, 1, `the pulse needs one whole-number iteration count: ${animation}`);
  assert.ok(counts[0] > 0, `the pulse runs ${counts[0]} times`);
  const total = counts[0] * seconds(tokens.motion.durationPulse);
  assert.ok(total <= 5, `the pulse runs for ${total}s, over 5s`);
  assert.ok(parts.includes("alternate"), `the pulse should alternate: ${animation}`);
  assert.ok(parts.includes("forwards"), `the pulse should hold its last frame: ${animation}`);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.ascend-mark\s*\{\s*animation:\s*none;\s*\}/);
});

test("no Sillage classes and none of the Ascend-only banned phrases", () => {
  const root = ascendPage();
  const sillageClasses = root
    .querySelectorAll("*")
    .flatMap((el) => (el.getAttribute("class") || "").split(/\s+/))
    .filter((name) => name.startsWith("sillage-"));
  assert.deepEqual(sillageClasses, []);
  const haystack = joinStrings(pageStrings(root)).toLowerCase();
  for (const phrase of BANNED_ON_ASCEND) assert.equal(haystack.includes(phrase), false, `ascend.html contains "${phrase}"`);
});

// ── First-load budget ────────────────────────────────────────────────
const isLocal = (url) => typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
const localPath = (url) => join(SITE_DIR, decodeURIComponent(url.split(/[?#]/)[0]));

function largestCandidate(img) {
  const srcset = img.getAttribute("srcset");
  if (!srcset) return img.getAttribute("src");
  return srcset
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/))
    .map(([url, descriptor = "1x"]) => ({ url, size: parseFloat(descriptor) }))
    .sort((a, b) => b.size - a.size)[0].url;
}

// Adds a module and every static import it pulls in (import … from "…", import "…").
function addModuleGraph(url, files) {
  const file = localPath(url);
  if (files.has(file)) return;
  files.add(file);
  const code = readFileSync(file, "utf8");
  for (const match of code.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*["']([^"']+)["']|^\s*import\s*["']([^"']+)["']/gm)) {
    const spec = match[1] ?? match[2];
    assert.ok(spec.startsWith(".") || spec.startsWith("/"), `${url} imports the bare specifier ${spec}`);
    addModuleGraph(spec.startsWith("/") ? spec : posix.resolve(posix.dirname(url), spec), files);
  }
}

test("first load of /ascend stays under 1,000,000 bytes", (t) => {
  const root = ascendPage();
  const files = new Set([join(SITE_DIR, "ascend.html")]);
  for (const link of root.querySelectorAll('link[rel="stylesheet"]')) {
    const href = link.getAttribute("href");
    if (!isLocal(href)) continue;
    files.add(localPath(href));
    const css = readFileSync(localPath(href), "utf8");
    for (const match of css.matchAll(/url\(\s*(["']?)([^"')]+)\1\s*\)/g)) {
      if (isLocal(match[2])) files.add(localPath(match[2])); // the Inter woff2
    }
  }
  for (const script of root.querySelectorAll("script[src]")) {
    const src = script.getAttribute("src");
    if (isLocal(src)) addModuleGraph(src, files); // the external beacon is skipped
  }
  for (const img of root.querySelectorAll("img")) {
    const url = largestCandidate(img);
    if (isLocal(url)) files.add(localPath(url));
  }
  const total = [...files].reduce((sum, file) => sum + statSync(file).size, 0);
  t.diagnostic(`/ascend first load: ${files.size} files, ${total} bytes`);
  assert.ok(total < BUDGET_BYTES, `${total} bytes is over the ${BUDGET_BYTES}-byte budget`);
});
