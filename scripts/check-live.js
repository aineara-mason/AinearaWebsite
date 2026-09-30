// Compares a deployed copy of the site with the local _site/ build.
//
//   node scripts/check-live.js <baseUrl> [--allow-email-obfuscation]
//
// It sends GET and OPTIONS requests only. It never POSTs, so it can't add a
// waitlist row or send an email. Prints PASS or FAIL per check and exits 1 if
// any check fails or _site/ is missing.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_DIR, listFiles, isJunk } from "../tests/helpers/site.js";

const FLAG = "--allow-email-obfuscation";
const USAGE = `Usage: node scripts/check-live.js <baseUrl> [${FLAG}]`;
const PAGES = [
  ["/", "index.html"],
  ["/ascend", "ascend.html"],
  ["/sillage", "sillage.html"],
  ["/privacy", "privacy.html"],
  ["/terms", "terms.html"],
  ["/support", "support.html"],
];
const OBFUSCATION_MARK = "/cdn-cgi/l/email-protection";
const TIMEOUT_MS = 15000;

const args = process.argv.slice(2);
const allowObfuscation = args.includes(FLAG);
const positional = args.filter((a) => !a.startsWith("--"));
const unknownFlags = args.filter((a) => a.startsWith("--") && a !== FLAG);
if (positional.length !== 1 || unknownFlags.length > 0) {
  console.error(USAGE);
  process.exit(1);
}

let base;
try {
  base = new URL(positional[0]);
} catch {
  base = null;
}
if (!base || !["http:", "https:"].includes(base.protocol)) {
  console.error(`Not an http(s) URL: ${positional[0]}\n${USAGE}`);
  process.exit(1);
}

if (!existsSync(SITE_DIR)) {
  console.error("FAIL  _site/ is missing. Build it first: npm run build");
  process.exit(1);
}

let passed = 0;
let failed = 0;
const pass = (msg) => { passed += 1; console.log(`PASS  ${msg}`); };
const fail = (msg) => { failed += 1; console.log(`FAIL  ${msg}`); };

async function request(pathname, method = "GET", headers = {}) {
  const url = new URL(pathname, base);
  const res = await fetch(url, { method, headers, redirect: "manual", signal: AbortSignal.timeout(TIMEOUT_MS) });
  const body = method === "OPTIONS" ? Buffer.alloc(0) : Buffer.from(await res.arrayBuffer());
  return { url, res, body };
}

// Cloudflare's Email Address Obfuscation (Scrape Shield) rewrites the email
// addresses in served HTML (not those in <head>, <script>, <noscript> or
// attributes other than a[href]) and injects a decoder script. With
// --allow-email-obfuscation, both sides are compared after each address
// (local) and each piece of Cloudflare's markup (live) is replaced with the
// same placeholder.
function normalizeEmails(html) {
  return html
    .replace(/<script data-cfasync="false" src="\/cdn-cgi\/scripts\/[^"]+\/cloudflare-static\/email-decode\.min\.js"><\/script>/g, "")
    .replace(/<a href="\/cdn-cgi\/l\/email-protection" class="__cf_email__" data-cfemail="[0-9a-f]+">\[email&#160;protected\]<\/a>/g, "EMAIL")
    .replace(/<span class="__cf_email__" data-cfemail="[0-9a-f]+">\[email&#160;protected\]<\/span>/g, "EMAIL")
    .replace(/\/cdn-cgi\/l\/email-protection#[0-9a-f]+/g, "mailto:EMAIL")
    .replace(/mailto:[^"'\s<>?]+/g, "mailto:EMAIL")
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/g, "EMAIL");
}

function firstDifference(a, b) {
  const la = a.split("\n");
  const lb = b.split("\n");
  for (let i = 0; i < Math.max(la.length, lb.length); i += 1) {
    if (la[i] === lb[i]) continue;
    if (la[i] === undefined || lb[i] === undefined) return `first difference at line ${i + 1} (one side ends there)`;
    let col = 0;
    while (la[i][col] === lb[i][col]) col += 1;
    const from = Math.max(0, col - 40);
    const cut = (s) => JSON.stringify(s.slice(from, col + 100));
    return `first difference at line ${i + 1}, column ${col + 1}\n        local: ${cut(la[i])}\n        live:  ${cut(lb[i])}`;
  }
  return "the bytes differ but every line matches (encoding or a final newline)";
}

function compareBody(label, rel, live, isHtml) {
  const local = readFileSync(path.join(SITE_DIR, rel));
  if (live.equals(local)) {
    pass(`${label}: ${live.length} bytes match _site/${rel}`);
    return;
  }
  const liveText = live.toString("utf8");
  const obfuscated = isHtml && liveText.includes(OBFUSCATION_MARK);
  if (obfuscated && allowObfuscation) {
    const a = normalizeEmails(local.toString("utf8"));
    const b = normalizeEmails(liveText);
    if (a === b) pass(`${label}: matches _site/${rel} once email addresses are masked (${FLAG})`);
    else fail(`${label}: differs from _site/${rel} even with email addresses masked; ${firstDifference(a, b)}`);
    return;
  }
  const note = obfuscated
    ? `\n        The live page contains Cloudflare Email Address Obfuscation (${OBFUSCATION_MARK}): turn it off (D2) or rerun with ${FLAG}`
    : "";
  fail(`${label}: ${live.length} bytes live vs ${local.length} in _site/${rel}; ${firstDifference(local.toString("utf8"), liveText)}${note}`);
}

async function check(label, fn) {
  try {
    await fn();
  } catch (err) {
    fail(`${label}: ${err.name}: ${err.message}`);
  }
}

console.log(`Comparing ${base.origin} with ${SITE_DIR}`);

// (a) Pages return 200 with the built bytes.
for (const [pathname, rel] of PAGES) {
  const label = `GET ${pathname}`;
  await check(label, async () => {
    const { res, body } = await request(pathname);
    if (res.status !== 200) return fail(`${label}: status ${res.status}, expected 200`);
    compareBody(label, rel, body, true);
  });
}

// (b) and (c) Redirects: /home is a _redirects rule; /privacy.html is Pages'
// own clean-URL redirect.
for (const [pathname, status, target] of [["/home", 301, "/"], ["/privacy.html", 308, "/privacy"]]) {
  const label = `GET ${pathname}`;
  await check(label, async () => {
    const { url, res } = await request(pathname);
    const location = res.headers.get("location");
    const resolved = location === null ? null : new URL(location, url).href;
    const expected = new URL(target, base).href;
    if (res.status === status && resolved === expected) pass(`${label}: ${status} to ${target}`);
    else fail(`${label}: status ${res.status}, location ${location}; expected ${status} to ${expected}`);
  });
}

// (d) Unknown paths get the 404 page with a 404 status.
{
  const pathname = `/check-live-missing-${Date.now()}`;
  const label = `GET ${pathname}`;
  await check(label, async () => {
    const { res, body } = await request(pathname);
    if (res.status !== 404) return fail(`${label}: status ${res.status}, expected 404`);
    compareBody(`${label} (404)`, "404.html", body, true);
  });
}

// (e) Every other built file, except _redirects, which Pages reads but never serves.
const assets = listFiles(SITE_DIR).filter((rel) => !isJunk(rel) && !rel.endsWith(".html") && rel !== "_redirects");
for (const rel of assets) {
  const pathname = "/" + rel.split("/").map(encodeURIComponent).join("/");
  const label = `GET ${pathname}`;
  await check(label, async () => {
    const { res, body } = await request(pathname);
    if (res.status !== 200) return fail(`${label}: status ${res.status}, expected 200`);
    compareBody(label, rel, body, false);
  });
}

// (f) The Pages Function answers a CORS preflight, which proves functions/ deployed.
{
  const label = "OPTIONS /api/subscribe";
  await check(label, async () => {
    const { res } = await request("/api/subscribe", "OPTIONS", { Origin: "https://aineara.com" });
    if (res.status === 204) pass(`${label}: 204, allow-origin ${res.headers.get("access-control-allow-origin")}`);
    else fail(`${label}: status ${res.status}, expected 204 (are Pages Functions deployed?)`);
  });
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
