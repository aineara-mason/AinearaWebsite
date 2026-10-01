import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import site from "../src/_data/site.js";
import { ROOT } from "./helpers/site.js";

const BADGE = "src/assets/img/app-store-badge.svg";

test("Ascend status is waitlist or live, and live follows it", () => {
  const { status, live } = site.apps.ascend;
  assert.ok(["waitlist", "live"].includes(status), `unknown Ascend status "${status}"`);
  assert.equal(live, status === "live");
});

test("a live Ascend has an App Store URL and Apple's badge; a waitlist Ascend has no URL", () => {
  const { live, appStoreUrl } = site.apps.ascend;
  if (live) {
    assert.match(appStoreUrl, /^https:\/\/apps\.apple\.com\//);
    assert.ok(existsSync(join(ROOT, BADGE)), `Ascend is live but ${BADGE} is missing: save Apple's official badge there, unmodified`);
  } else {
    assert.equal(appStoreUrl, "");
  }
});

test("Sillage is in development", () => {
  assert.equal(site.apps.sillage.status, "in-development");
});

test("the analytics token is 32 lowercase hex characters", () => {
  assert.match(site.analyticsToken, /^[0-9a-f]{32}$/);
});
