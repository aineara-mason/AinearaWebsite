import { test } from "node:test";
import assert from "node:assert/strict";
import { SOURCES, ENDPOINT, isValidEmail, appForSource, submitSignup } from "../src/assets/js/lib/signup.js";

const THREE_SOURCES = ["aineara-homepage", "ascend-landing", "sillage-landing"];

// A fetch stub that records every call and answers with respond().
function recorder(respond) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { calls, fetchImpl };
}

const reply = (status, body) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("SOURCES is frozen and holds exactly the three live sources", () => {
  assert.ok(Object.isFrozen(SOURCES));
  assert.deepEqual([...SOURCES], THREE_SOURCES);
  assert.equal(ENDPOINT, "/api/subscribe");
});

test("isValidEmail trims, then needs something@something.something", () => {
  for (const ok of ["a@b.co", " a@b.co "]) assert.equal(isValidEmail(ok), true, JSON.stringify(ok));
  for (const bad of ["", "a@b", "a b@c.de", "@b.co"]) assert.equal(isValidEmail(bad), false, JSON.stringify(bad));
});

test("appForSource maps each source to its app and rejects anything else", () => {
  assert.equal(appForSource("aineara-homepage"), "ascend");
  assert.equal(appForSource("ascend-landing"), "ascend");
  assert.equal(appForSource("sillage-landing"), "sillage");
  assert.throws(() => appForSource("ascend-homepage"), RangeError);
  assert.throws(() => appForSource(undefined), RangeError);
});

test("submitSignup makes exactly one JSON POST with the trimmed email and the source", async () => {
  const { calls, fetchImpl } = recorder(() => reply(200, { success: true }));
  const result = await submitSignup({ email: "  a@b.co ", source: "ascend-landing", fetchImpl });
  assert.equal(result, "success");
  assert.equal(calls.length, 1);
  const [{ url, init }] = calls;
  assert.equal(url, "/api/subscribe");
  assert.equal(init.method, "POST");
  assert.equal(new Headers(init.headers).get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(init.body), { email: "a@b.co", source: "ascend-landing" });
});

test("submitSignup maps responses to success, invalid or error", async () => {
  const cases = [
    ["200 success", () => reply(200, { success: true }), "success"],
    ["200 already_subscribed", () => reply(200, { success: true, already_subscribed: true }), "success"],
    ["204 no body", () => reply(204), "success"],
    ["400", () => reply(400, { error: "Invalid email address" }), "invalid"],
    ["500", () => reply(500, { error: "Something went wrong. Please try again." }), "error"],
    ["404", () => reply(404), "error"],
    ["thrown fetch", () => { throw new TypeError("Failed to fetch"); }, "error"],
  ];
  for (const [label, respond, expected] of cases) {
    const { fetchImpl } = recorder(respond);
    assert.equal(await submitSignup({ email: "a@b.co", source: "sillage-landing", fetchImpl }), expected, label);
  }
});

test("submitSignup passes an AbortSignal so a stalled request can time out", async () => {
  const { calls, fetchImpl } = recorder(() => reply(200, { success: true }));
  await submitSignup({ email: "a@b.co", source: "ascend-landing", fetchImpl });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test("submitSignup resolves error when the connection stalls past the timeout", { timeout: 2000 }, async () => {
  // Never answers; rejects only when the request's signal aborts.
  const fetchImpl = (url, init) =>
    new Promise((resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal.reason));
    });
  const result = await submitSignup({ email: "a@b.co", source: "sillage-landing", fetchImpl, timeoutMs: 20 });
  assert.equal(result, "error");
});

test("submitSignup rejects an unknown source before fetching", async () => {
  const { calls, fetchImpl } = recorder(() => reply(200, { success: true }));
  await assert.rejects(submitSignup({ email: "a@b.co", source: "evil", fetchImpl }), RangeError);
  assert.equal(calls.length, 0);
});

test("submitSignup uses the global fetch by default", async (t) => {
  const mocked = t.mock.method(globalThis, "fetch", async () => reply(200, { success: true }));
  assert.equal(await submitSignup({ email: "a@b.co", source: "aineara-homepage" }), "success");
  assert.equal(mocked.mock.callCount(), 1);
});
