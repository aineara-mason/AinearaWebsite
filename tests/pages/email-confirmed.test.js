// A2: the page the link in Ascend's sign-up confirmation email lands on
// (redirectTo https://aineara.com/email-confirmed). Checks the built page,
// that nothing links to it, and runs its script against a small fake DOM.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import copy from "../../src/_data/copy.js";
import { confirmationOutcome, hasAuthParams } from "../../src/assets/js/lib/email-confirmed.js";
import { ROOT, SITE_DIR, PAGES, readHtml, isTemplated, norm, listFiles } from "../helpers/site.js";

const REL = "email-confirmed.html";
const root = readHtml(REL);
const main = root.querySelector("main#main");
const text = (element) => norm(element?.text);

test("email-confirmed is a flat page built from the base layout", () => {
  assert.ok(isTemplated(root), `_site/${REL} has no Eleventy generator tag`);
  assert.ok(main, "no main#main");
});

test("email-confirmed stays out of search results, link previews and the sitemap", () => {
  assert.equal(root.querySelector('meta[name="robots"]')?.getAttribute("content"), "noindex");
  assert.equal(root.querySelector('link[rel="canonical"]'), null, "noindex pages have no canonical");
  const og = root.querySelectorAll("meta").filter((meta) => (meta.getAttribute("property") ?? "").startsWith("og:"));
  assert.equal(og.length, 0, "no og:* tags");
  const sitemap = readFileSync(path.join(SITE_DIR, "sitemap.xml"), "utf8");
  assert.doesNotMatch(sitemap, /email-confirmed/, "the sitemap lists the page");
});

test("no page, nav or footer links to email-confirmed", () => {
  for (const rel of PAGES) {
    for (const link of readHtml(rel).querySelectorAll("a[href]")) {
      assert.doesNotMatch(link.getAttribute("href"), /email-confirmed/, `${rel} links to the page`);
    }
  }
});

test("email-confirmed loads no third-party script and no form", () => {
  for (const script of root.querySelectorAll("script[src]")) {
    assert.match(script.getAttribute("src"), /^\/(?!\/)/, `third-party script ${script.getAttribute("src")}`);
  }
  assert.ok(root.querySelector('script[type="module"][src="/assets/js/email-confirmed.js"]'), "the page script is missing");
  assert.equal(root.querySelectorAll("form").length, 0, "the page has a form");
});

test("email-confirmed title, description and confirmed copy", () => {
  assert.equal(text(root.querySelector("title")), "Email confirmation — Aineara");
  assert.equal(
    root.querySelector('meta[name="description"]')?.getAttribute("content"),
    copy["meta.email-confirmed.description"],
  );
  const hero = main?.querySelector("section.hero");
  assert.ok(hero, "no section.hero inside main#main");
  assert.equal(text(hero.querySelector(".label")), "Ascend");
  const heading = hero.querySelector("h1");
  assert.equal(text(heading), "Your email is confirmed.");
  const line = hero.querySelector("h1 + p");
  assert.equal(text(line), `Go back to Ascend and tap "I've confirmed it", or sign in.`);
  assert.equal(heading.getAttribute("data-msg-failed"), copy["email-confirmed.failed.heading"]);
  assert.equal(line.getAttribute("data-msg-failed"), copy["email-confirmed.failed.line"]);
  assert.equal(root.querySelectorAll(".reveal").length, 0, "the page never fades in");
});

test("the page script is published", () => {
  const published = listFiles(path.join(SITE_DIR, "assets/js"));
  assert.ok(published.includes("email-confirmed.js"), "assets/js/email-confirmed.js is missing");
  assert.ok(published.includes("lib/email-confirmed.js"), "assets/js/lib/email-confirmed.js is missing");
});

// ── The outcome, from what GoTrue appends to the redirect ─────────────────

test("a PKCE code, or nothing at all, reads as confirmed", () => {
  assert.equal(confirmationOutcome("?code=0b4c3f1e-2a7d-4e55-9a51-1b2d3c4e5f60", ""), "confirmed");
  assert.equal(confirmationOutcome("", ""), "confirmed");
  assert.equal(confirmationOutcome(undefined, undefined), "confirmed");
});

test("a refused link reads as failed, in the query or the fragment", () => {
  assert.equal(
    confirmationOutcome("?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired", ""),
    "failed",
  );
  assert.equal(confirmationOutcome("", "#error=access_denied&error_code=otp_expired"), "failed");
  assert.equal(confirmationOutcome("", "#error_code=otp_expired"), "failed");
  assert.equal(confirmationOutcome("?code=abc", "#error=server_error"), "failed");
});

test("an error word inside another parameter is not an error", () => {
  assert.equal(confirmationOutcome("?code=error", "#type=error_code"), "confirmed");
});

test("hasAuthParams is true only when something follows the path", () => {
  assert.equal(hasAuthParams("", ""), false);
  assert.equal(hasAuthParams("?", "#"), false);
  assert.equal(hasAuthParams("?code=abc", ""), true);
  assert.equal(hasAuthParams("", "#access_token=x"), true);
});

// ── The page script, against a fake DOM ───────────────────────────────────

const PAGE_JS = pathToFileURL(path.join(ROOT, "src/assets/js/email-confirmed.js")).href;
let loads = 0;
const saved = { window: globalThis.window, document: globalThis.document };

afterEach(() => {
  globalThis.window = saved.window;
  globalThis.document = saved.document;
});

function element(textContent, msgFailed) {
  return { textContent, dataset: { msgFailed } };
}

async function runPage(href, { replaceStateThrows = false } = {}) {
  const url = new URL(href);
  const heading = element(copy["email-confirmed.heading"], copy["email-confirmed.failed.heading"]);
  const line = element(copy["email-confirmed.line"], copy["email-confirmed.failed.line"]);
  const replaced = [];
  globalThis.document = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-email-confirmed][data-msg-failed]");
      return [heading, line];
    },
  };
  globalThis.window = {
    location: { search: url.search, hash: url.hash, pathname: url.pathname },
    history: {
      replaceState(state, unused, target) {
        if (replaceStateThrows) throw new Error("SecurityError");
        replaced.push(target);
      },
    },
  };
  loads += 1;
  await import(`${PAGE_JS}?case=${loads}`);
  return { heading: heading.textContent, line: line.textContent, replaced };
}

test("a confirmed landing keeps the copy and clears the code from the address bar", async () => {
  const page = await runPage("https://aineara.com/email-confirmed?code=0b4c3f1e");
  assert.equal(page.heading, copy["email-confirmed.heading"]);
  assert.equal(page.line, copy["email-confirmed.line"]);
  assert.deepEqual(page.replaced, ["/email-confirmed"]);
});

test("a refused link shows the failed copy and clears the error from the address bar", async () => {
  const page = await runPage("https://aineara.com/email-confirmed#error=access_denied&error_code=otp_expired");
  assert.equal(page.heading, copy["email-confirmed.failed.heading"]);
  assert.equal(page.line, copy["email-confirmed.failed.line"]);
  assert.deepEqual(page.replaced, ["/email-confirmed"]);
});

test("a bare visit leaves the address bar alone", async () => {
  const page = await runPage("https://aineara.com/email-confirmed");
  assert.equal(page.heading, copy["email-confirmed.heading"]);
  assert.deepEqual(page.replaced, []);
});

test("if the browser refuses replaceState, the failed copy still shows", async (t) => {
  t.mock.method(console, "error", () => {});
  const page = await runPage("https://aineara.com/email-confirmed?error=access_denied", { replaceStateThrows: true });
  assert.equal(page.heading, copy["email-confirmed.failed.heading"]);
  assert.deepEqual(page.replaced, []);
});
