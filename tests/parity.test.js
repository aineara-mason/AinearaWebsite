// Part A (owner decision D1): Eleventy copies public/ through unchanged, so
// the built _site/ must be a byte-for-byte copy of public/. Task 3 relaxes
// this once templates start adding files; Task 11 deletes it with public/.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_DIR, PUBLIC_DIR, listFiles, isJunk } from "./helpers/site.js";

const MISSING = "_site/ is missing: build first with `npm run build` (npm test does this in pretest)";
const publicFiles = () => listFiles(PUBLIC_DIR).filter((rel) => !isJunk(rel));
const siteFiles = () => listFiles(SITE_DIR).filter((rel) => !isJunk(rel));

test("_site exists", () => {
  assert.ok(existsSync(SITE_DIR), MISSING);
});

test("_site has exactly the same files as public/ (the 17 legacy files)", () => {
  assert.ok(existsSync(SITE_DIR), MISSING);
  const expected = publicFiles();
  assert.equal(expected.length, 17, `public/ should hold 17 files, found ${expected.length}: ${expected.join(", ")}`);
  assert.deepEqual(siteFiles(), expected);
});

test("every file in _site is byte-identical to its public/ original", () => {
  assert.ok(existsSync(SITE_DIR), MISSING);
  for (const rel of publicFiles()) {
    const built = path.join(SITE_DIR, rel);
    assert.ok(existsSync(built), `_site/${rel} is missing`);
    assert.ok(readFileSync(built).equals(readFileSync(path.join(PUBLIC_DIR, rel))), `_site/${rel} differs from public/${rel}`);
  }
});

test("pages stay flat files, never <name>/index.html", () => {
  assert.ok(existsSync(SITE_DIR), MISSING);
  assert.ok(existsSync(path.join(SITE_DIR, "privacy.html")), "_site/privacy.html is missing");
  assert.ok(existsSync(path.join(SITE_DIR, "404.html")), "_site/404.html is missing");
  assert.equal(existsSync(path.join(SITE_DIR, "privacy", "index.html")), false, "_site/privacy/index.html must not exist");
  assert.equal(existsSync(path.join(SITE_DIR, "404", "index.html")), false, "_site/404/index.html must not exist");
});
