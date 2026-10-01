import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import site from "../src/_data/site.js";
import {
  SITE_DIR,
  PAGES,
  listFiles,
  isJunk,
  readHtml,
  templatedPages,
  resolveReference,
  pageStrings,
} from "./helpers/site.js";
import { SOURCES, appForSource } from "../src/assets/js/lib/signup.js";
// Task 11 imports, under their own names.
import { test as t11Test } from "node:test";
import t11Assert from "node:assert/strict";
import { existsSync as t11Exists, readFileSync as t11Read } from "node:fs";
import { join as t11Join } from "node:path";
import {
  PAGES as T11_PAGES,
  SITE_DIR as T11_SITE_DIR,
  isTemplated as t11IsTemplated,
  pngSize as t11PngSize,
  readHtml as t11ReadHtml,
} from "./helpers/site.js";
import t11Site from "../src/_data/site.js";

const BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";

// Shared Definitions §13: banned on every templated page (case-insensitive).
// The page tests add each page's own list.
const BANNED = [
  "exclusive launch pricing",
  "inside look",
  "what's yours stays yours",
  "at home on your device",
  "ai-native",
  "first app from aineara",
  "second app from aineara",
  "underrated",
  "corrects itself",
  "ascend-homepage",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

const templated = templatedPages();
const parsed = new Map();
function html(rel) {
  if (!parsed.has(rel)) parsed.set(rel, readHtml(rel));
  return parsed.get(rel);
}

function srcsetUrls(value) {
  return String(value ?? "")
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/)[0])
    .filter(Boolean);
}

function references(root) {
  const refs = [];
  for (const el of root.querySelectorAll("a[href], link[href]")) refs.push(el.getAttribute("href"));
  for (const el of root.querySelectorAll("script[src], img[src]")) refs.push(el.getAttribute("src"));
  for (const el of root.querySelectorAll("img[srcset], source[srcset]")) refs.push(...srcsetUrls(el.getAttribute("srcset")));
  return refs;
}

test("every page is a flat .html file", () => {
  for (const rel of PAGES) {
    assert.ok(existsSync(path.join(SITE_DIR, rel)), `_site/${rel} is missing`);
    const nested = `${rel.replace(/\.html$/, "")}/index.html`;
    assert.ok(!existsSync(path.join(SITE_DIR, nested)), `_site/${nested} should not exist`);
  }
});

test("every page loads the analytics beacon with the site's token", () => {
  for (const rel of PAGES) {
    const beacon = html(rel).querySelector(`script[src="${BEACON_SRC}"]`);
    assert.ok(beacon, `${rel}: no Cloudflare Web Analytics beacon`);
    assert.ok(beacon.hasAttribute("defer"), `${rel}: the beacon should be deferred`);
    const config = JSON.parse(beacon.getAttribute("data-cf-beacon") ?? "{}");
    assert.equal(config.token, site.analyticsToken, `${rel}: wrong beacon token`);
  }
});

test("the 404 page is built from the base layout", () => {
  assert.ok(templated.includes("404.html"), "_site/404.html has no Eleventy generator tag");
});

for (const rel of templated) {
  test(`${rel}: one language, one h1, one main`, () => {
    const root = html(rel);
    assert.equal(root.querySelector("html")?.getAttribute("lang"), "en");
    assert.equal(root.querySelectorAll("h1").length, 1, "exactly one h1");
    const mains = root.querySelectorAll("main");
    assert.equal(mains.length, 1, "exactly one main");
    assert.equal(mains[0].getAttribute("id"), "main");
  });

  test(`${rel}: the skip link is the first focusable element`, () => {
    const focusable = html(rel)
      .querySelector("body")
      .querySelectorAll("a[href], button, input, select, textarea, [tabindex]")
      .filter((el) => el.getAttribute("tabindex") !== "-1");
    const first = focusable[0];
    assert.ok(first, "nothing is focusable");
    assert.ok(
      first.tagName === "A" && first.classList.contains("skip-link") && first.getAttribute("href") === "#main",
      `the first focusable element is <${first.tagName.toLowerCase()} class="${first.getAttribute("class") ?? ""}">`,
    );
  });

  test(`${rel}: the theme script runs before any stylesheet`, () => {
    const head = html(rel).querySelector("head");
    const first = head.querySelector("script");
    assert.ok(first, "no <script> in <head>");
    assert.equal(first.getAttribute("src"), undefined, "the first head script must be inline");
    assert.match(first.text, /aineara-theme/);
    const ordered = head.querySelectorAll("script, link[rel~=stylesheet], style");
    assert.equal(ordered[0], first, "a stylesheet comes before the theme script");
  });

  test(`${rel}: stylesheets, scripts and images use absolute paths`, () => {
    for (const el of html(rel).querySelectorAll("link[rel~=stylesheet], script[src], img[src], img[srcset], source[srcset]")) {
      const urls = el.tagName === "LINK" ? [el.getAttribute("href")] : [el.getAttribute("src"), ...srcsetUrls(el.getAttribute("srcset"))];
      for (const url of urls.filter(Boolean)) {
        if (url === BEACON_SRC) continue;
        assert.match(url, /^\/(?!\/)/, `${rel}: "${url}" is not an absolute path`);
      }
    }
  });

  test(`${rel}: every link and asset reference resolves`, () => {
    for (const ref of references(html(rel))) {
      const target = resolveReference(ref, rel);
      if (target === null) continue;
      assert.ok(target.file, `${rel}: "${ref}" doesn't match a file in _site`);
      if (target.fragment && target.file.endsWith(".html")) {
        assert.ok(html(target.file).getElementById(target.fragment), `${rel}: "${ref}" points at a missing id`);
      }
    }
  });

  test(`${rel}: the theme toggle starts hidden`, () => {
    const toggle = html(rel).querySelector(".theme-toggle");
    assert.ok(toggle, "no .theme-toggle");
    assert.ok(toggle.hasAttribute("hidden"), ".theme-toggle must start hidden (JavaScript reveals it)");
  });

  test(`${rel}: every image has alt, width and height`, () => {
    for (const img of html(rel).querySelectorAll("img")) {
      const name = img.getAttribute("src") ?? img.toString().slice(0, 80);
      for (const attribute of ["alt", "width", "height"]) {
        assert.ok(img.hasAttribute(attribute), `${rel}: ${name} has no ${attribute}`);
      }
    }
  });

  test(`${rel}: no banned phrases`, () => {
    const haystack = `${readFileSync(path.join(SITE_DIR, rel), "utf8")}\n${pageStrings(html(rel))}`.toLowerCase();
    for (const phrase of BANNED) assert.ok(!haystack.includes(phrase), `${rel} contains "${phrase}"`);
  });
}

test("no Google Fonts, system-ui or hidden cursor in the assets or templated pages", () => {
  const assetsDir = path.join(SITE_DIR, "assets");
  const files = [
    ...listFiles(assetsDir)
      .filter((file) => /\.(css|js|txt|svg|json|xml|html)$/.test(file))
      .map((file) => path.join(assetsDir, file)),
    ...templated.map((rel) => path.join(SITE_DIR, rel)),
  ];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const pattern of [/fonts\.googleapis\.com/i, /fonts\.gstatic\.com/i, /system-ui/i, /cursor\s*:\s*none/i]) {
      assert.doesNotMatch(text, pattern, `${path.relative(SITE_DIR, file)} matches ${pattern}`);
    }
  }
});

test("only rules scoped to .js hide .reveal", () => {
  const cssDir = path.join(SITE_DIR, "assets/css");
  for (const file of listFiles(cssDir).filter((name) => name.endsWith(".css"))) {
    const css = readFileSync(path.join(cssDir, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/(?:^|[\s;])opacity\s*:\s*0(?![.\d])/.test(body)) continue;
      for (const selector of selectors.split(",").map((part) => part.trim())) {
        if (selector.includes(".reveal")) {
          assert.match(selector, /^(?:html)?\.js\s/, `${file}: "${selector}" hides .reveal without .js`);
        }
      }
    }
  }
});

test("every relative module import in the site's scripts resolves", () => {
  const jsDir = path.join(SITE_DIR, "assets/js");
  for (const file of listFiles(jsDir).filter((name) => name.endsWith(".js"))) {
    const code = readFileSync(path.join(jsDir, file), "utf8");
    for (const [, specifier] of code.matchAll(/(?:\bfrom|\bimport)\s*["'](\.{1,2}\/[^"']+)["']/g)) {
      const target = path.resolve(path.dirname(path.join(jsDir, file)), specifier);
      assert.ok(existsSync(target), `assets/js/${file} imports ${specifier}, which isn't in _site`);
    }
  }
});

test("the Inter font and both licences are published", () => {
  const font = path.join(SITE_DIR, "assets/fonts/inter-latin-wght-normal.woff2");
  assert.ok(existsSync(font), "the Inter woff2 is missing");
  assert.equal(readFileSync(font).subarray(0, 4).toString("latin1"), "wOF2", "the font isn't a woff2 file");
  for (const licence of ["assets/licenses/inter-OFL.txt", "assets/licenses/lucide-LICENSE.txt"]) {
    assert.ok(existsSync(path.join(SITE_DIR, licence)), `_site/${licence} is missing`);
  }
});

test("_site has no junk files", () => {
  assert.deepEqual(listFiles(SITE_DIR).filter(isJunk), []);
});

// ── Task 5: signup forms ──────────────────────────────────────────────
// No page includes the partial until Task 6, so this passes with 0 forms
// for now; the diagnostic line shows how many forms were really checked.
// site.js skips a form that lacks the email input, submit button or
// .signup-status (it then falls back to a native POST to the page URL), and
// shows an empty message for a missing data-msg-* attribute.
test("signup forms post one known source and have a no-JavaScript note", (t) => {
  let checked = 0;
  for (const rel of templated) {
    const page = html(rel);
    for (const form of page.querySelectorAll("form.signup-form")) {
      checked += 1;
      const source = form.getAttribute("data-source");
      const where = `${rel} form[data-source="${source}"]`;
      assert.equal(form.getAttribute("method"), "post", `${where}: method`);
      assert.equal(form.hasAttribute("action"), false, `${where}: must not have an action`);
      assert.ok(SOURCES.includes(source), `${where}: unknown source`);
      assert.equal(form.getAttribute("data-app"), appForSource(source), `${where}: data-app`);
      for (const name of ["data-msg-success", "data-msg-invalid", "data-msg-error", "data-msg-sending"]) {
        assert.ok(form.getAttribute(name)?.trim(), `${where}: ${name} is missing or empty`);
      }
      assert.ok(form.querySelector('button[type="submit"]'), `${where}: no button[type="submit"]`);
      const inputs = form.querySelectorAll('input[type="email"]');
      assert.equal(inputs.length, 1, `${where}: needs exactly one email input`);
      const id = inputs[0].getAttribute("id");
      assert.match(id ?? "", /^signup-email-[a-z0-9-]+$/, `${where}: email input id`);
      assert.equal(page.querySelectorAll(`[id="${id}"]`).length, 1, `${where}: id "${id}" is not unique on the page`);
      assert.ok(form.querySelector(`label[for="${id}"]`), `${where}: no label[for="${id}"]`);
      const status = form.querySelector(".signup-status");
      assert.ok(status, `${where}: no .signup-status`);
      assert.equal(status.getAttribute("role"), "status", `${where}: .signup-status role`);
      assert.equal(status.getAttribute("aria-live"), "polite", `${where}: .signup-status aria-live`);
      assert.equal(status.getAttribute("id"), id.replace(/^signup-email-/, "signup-status-"), `${where}: .signup-status id`);
      const describedBy = (inputs[0].getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean);
      for (const ref of describedBy) {
        assert.ok(page.getElementById(ref), `${where}: aria-describedby "${ref}" isn't on the page`);
      }
      const noscript = form.parentNode.childNodes.find((node) => node.rawTagName?.toLowerCase() === "noscript");
      assert.ok(noscript, `${where}: no sibling <noscript>`);
      assert.ok(
        noscript.querySelector('.signup-nojs a[href="mailto:hello@aineara.com"]'),
        `${where}: the no-JS note needs a mailto:hello@aineara.com link`,
      );
    }
  }
  t.diagnostic(`${checked} signup form(s) checked`);
});

test("no page uses the dead ascend-homepage source", () => {
  for (const rel of PAGES) {
    const file = path.join(SITE_DIR, rel);
    if (!existsSync(file)) continue;
    assert.equal(readFileSync(file, "utf8").includes("ascend-homepage"), false, `${rel} contains ascend-homepage`);
  }
});

// ── Task 11: favicons, link-preview images, the generated sitemap, robots.txt,
// _redirects, canonical URLs, and public/ retired.

// Pinned bytes, from public/robots.txt:1-4 and public/_redirects:1-2.
const T11_ROBOTS = "User-agent: *\nAllow: /\n\nSitemap: https://aineara.com/sitemap.xml\n";
const T11_REDIRECTS = "# Redirect rules: <source> <destination> [status]\n/home / 301\n";
// D9: terms and 404 are noindex and stay out of the sitemap.
const T11_SITEMAP_LOCS = [
  "https://aineara.com/",
  "https://aineara.com/ascend",
  "https://aineara.com/privacy",
  "https://aineara.com/sillage",
  "https://aineara.com/support",
];
const T11_OG_PAGES = { "index.html": "home", "ascend.html": "ascend", "sillage.html": "sillage" };
const t11Bytes = (rel) => t11Read(t11Join(T11_SITE_DIR, rel));

t11Test("T11: every page is a template and the legacy folders are gone", () => {
  for (const rel of T11_PAGES) {
    t11Assert.ok(t11IsTemplated(t11ReadHtml(rel)), `${rel} is not built from a template`);
  }
  for (const dir of ["css", "js", "public"]) {
    t11Assert.equal(t11Exists(t11Join(T11_SITE_DIR, dir)), false, `_site/${dir} should not exist`);
  }
});

t11Test("T11: every page links the favicon set, and the icons have their pinned sizes", () => {
  for (const rel of T11_PAGES) {
    const root = t11ReadHtml(rel);
    const svg = root.querySelector('link[rel="icon"][type="image/svg+xml"]');
    const png = root.querySelector('link[rel="icon"][type="image/png"]');
    const touch = root.querySelector('link[rel="apple-touch-icon"]');
    t11Assert.equal(svg?.getAttribute("href"), "/assets/img/favicon.svg", `${rel}: SVG favicon link`);
    t11Assert.equal(png?.getAttribute("href"), "/assets/img/favicon-32.png", `${rel}: PNG favicon link`);
    t11Assert.equal(png?.getAttribute("sizes"), "32x32", `${rel}: PNG favicon sizes`);
    t11Assert.equal(touch?.getAttribute("href"), "/assets/img/apple-touch-icon.png", `${rel}: apple-touch-icon link`);
  }
  const svgText = t11Bytes("assets/img/favicon.svg").toString("utf8");
  t11Assert.match(svgText, /viewBox="0 0 32 32"/);
  t11Assert.match(svgText, /rx="7"/);
  t11Assert.match(svgText, /@media \(prefers-color-scheme: dark\)/);
  t11Assert.doesNotMatch(svgText, /<text/, "the A must be a path, not text");
  t11Assert.deepEqual(t11PngSize(t11Bytes("assets/img/favicon-32.png")), { width: 32, height: 32 });
  const touchPng = t11Bytes("assets/img/apple-touch-icon.png");
  t11Assert.deepEqual(t11PngSize(touchPng), { width: 180, height: 180 });
  t11Assert.equal(touchPng[25], 2, "apple-touch-icon.png must be opaque RGB (PNG colour type 2)");
});

t11Test("T11: index, ascend and sillage link a 1200x630 PNG link-preview image", () => {
  for (const [rel, og] of Object.entries(T11_OG_PAGES)) {
    const content = t11ReadHtml(rel).querySelector('meta[property="og:image"]')?.getAttribute("content");
    t11Assert.equal(content, `${t11Site.url}/assets/img/og/${og}.png`, `${rel}: og:image`);
    const file = t11Join(T11_SITE_DIR, content.slice(t11Site.url.length));
    t11Assert.ok(t11Exists(file), `${rel}: ${file} is missing`);
    t11Assert.deepEqual(t11PngSize(t11Read(file)), { width: 1200, height: 630 }, `${rel}: og image size`);
  }
});

t11Test("T11: sitemap.xml lists exactly the indexable pages, sorted", () => {
  const xml = t11Bytes("sitemap.xml").toString("utf8");
  t11Assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n'), "sitemap.xml starts with the XML declaration");
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1]);
  t11Assert.deepEqual(locs, T11_SITEMAP_LOCS);
  t11Assert.doesNotMatch(xml, /<lastmod>/);
});

t11Test("T11: robots.txt and _redirects are byte-identical to the pinned contents", () => {
  t11Assert.deepEqual(t11Bytes("robots.txt"), Buffer.from(T11_ROBOTS, "utf8"));
  t11Assert.deepEqual(t11Bytes("_redirects"), Buffer.from(T11_REDIRECTS, "utf8"));
});

t11Test("T11: indexable pages have a canonical URL and noindex pages have none", () => {
  const noindex = [];
  for (const rel of T11_PAGES) {
    const root = t11ReadHtml(rel);
    const robots = root.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "";
    const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href");
    if (robots.includes("noindex")) {
      noindex.push(rel);
      t11Assert.equal(canonical, undefined, `${rel} is noindex but has a canonical link`);
    } else {
      const cleanPath = "/" + rel.replace(/index\.html$/, "").replace(/\.html$/, "");
      t11Assert.equal(canonical, t11Site.url + cleanPath, `${rel}: canonical`);
    }
  }
  t11Assert.deepEqual(noindex.sort(), ["404.html", "terms.html"]);
});
