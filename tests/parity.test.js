import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { SITE_DIR, PUBLIC_DIR, listFiles, isJunk } from "./helpers/site.js";

// Part A (Task 1) proved _site/ was a byte-for-byte copy of public/. From
// Task 3 on that can't hold both ways: templates add files public/ never
// had (tokens.css first), and each page task deletes its legacy files from
// public/ as a template replaces them. So the check is now one-way: every
// file still in public/ must reach _site/ unchanged, and extra _site/ files
// are fine. Task 11 deletes this test along with the last of public/.

test("_site exists", () => {
  assert.ok(existsSync(SITE_DIR), "run `npm run build` first");
});

test("every non-junk file in public/ is in _site with identical bytes", () => {
  const legacy = listFiles(PUBLIC_DIR).filter((rel) => !isJunk(rel));
  assert.ok(legacy.length > 0, "public/ is empty");
  for (const rel of legacy) {
    const built = path.join(SITE_DIR, rel);
    assert.ok(existsSync(built), `_site/${rel} is missing`);
    assert.ok(readFileSync(built).equals(readFileSync(path.join(PUBLIC_DIR, rel))), `_site/${rel} differs from public/${rel}`);
  }
});

test("pages stay flat files", () => {
  assert.ok(!existsSync(path.join(SITE_DIR, "privacy/index.html")), "_site/privacy/index.html should not exist");
  assert.ok(!existsSync(path.join(SITE_DIR, "404/index.html")), "_site/404/index.html should not exist");
});
