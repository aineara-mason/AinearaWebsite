// tests/subscribe.test.js
// Unit tests for the signup Pages Function, functions/api/subscribe.js
// (spec §6.4). D1 and Resend are mocked: nothing here reaches the network
// or a database, and no email is sent. Never point these tests at a live
// or preview /api/subscribe.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "node-html-parser";
import { onRequestOptions, onRequestPost } from "../functions/api/subscribe.js";
import { contrastRatio } from "./helpers/contrast.js";

const FUNCTION_URL = "https://aineara.com/api/subscribe";
const ORIGIN = "https://aineara.com";
const ADDRESS = "reader@example.com";
const INSERT_SQL = "INSERT OR IGNORE INTO subscribers (email, source) VALUES (?, ?)";
const MISCONFIGURED = { error: "Service misconfigured. Please contact hello@aineara.com." };

// Shared definitions §11, verbatim.
const ASCEND = {
  subject: "You're on the Ascend waitlist.",
  text: `Thanks for joining the Ascend waitlist.

Ascend is our iPhone app for training and nutrition. We'll send you one more email, when it launches on the App Store. Nothing else.

You can read about it at https://aineara.com/ascend.

— Aineara

---
You're receiving this because this address was added to the Ascend waitlist at aineara.com.
To be removed, reply to this email or write to privacy@aineara.com.`,
};

const SILLAGE = {
  subject: "You're on the Sillage waitlist.",
  text: `Thanks for joining the Sillage waitlist.

Sillage is an app for fragrance collectors that we're still building. We'll send you one more email, when it launches. Nothing else.

— Aineara

---
You're receiving this because this address was added to the Sillage waitlist at aineara.com.
To be removed, reply to this email or write to privacy@aineara.com.`,
};

const normText = (s) => s.replace(/\s+/g, " ").trim();

function postRaw(body) {
  return new Request(FUNCTION_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body,
  });
}

const post = (value) => postRaw(JSON.stringify(value));

// D1 records every bind; with runThrows, run() rejects. Resend (global
// fetch) records every request and answers with resend(). console.error is
// muted. t.mock undoes all of it after each test.
function setup(t, { changes = 1, runThrows = false, resend = () => new Response('{"id":"test"}', { status: 200 }), env = {} } = {}) {
  const calls = [];
  const run = async () => {
    if (runThrows) throw new Error("D1_ERROR: test failure");
    return { meta: { changes } };
  };
  const DB = { prepare(sql) { return { bind(...a) { calls.push({ sql, a }); return { run }; } }; } };
  const sent = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    sent.push({ url: String(url), init, payload: JSON.parse(init.body) });
    return resend();
  });
  t.mock.method(console, "error", () => {});
  return { env: { RESEND_API_KEY: "test-key", DB, ...env }, calls, sent };
}

async function subscribe(t, request, options) {
  const { env, calls, sent } = setup(t, options);
  const res = await onRequestPost({ request, env });
  return { status: res.status, body: await res.json(), calls, sent };
}

// ── By source ───────────────────────────────────────────────────────────
for (const [source, copy, app] of [
  ["aineara-homepage", ASCEND, "Ascend"],
  ["ascend-landing", ASCEND, "Ascend"],
  ["sillage-landing", SILLAGE, "Sillage"],
]) {
  test(`${source}: stores the source and sends the ${app} email`, async (t) => {
    const { status, body, calls, sent } = await subscribe(t, post({ email: ADDRESS, source }));
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true });
    assert.deepEqual(calls, [{ sql: INSERT_SQL, a: [ADDRESS, source] }]);
    assert.equal(sent.length, 1);
    const [{ url, init, payload }] = sent;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(init.method, "POST");
    assert.equal(init.headers.Authorization, "Bearer test-key");
    assert.equal(payload.subject, copy.subject);
    assert.equal(payload.text, copy.text);
    assert.equal(payload.from, "Aineara <hello@aineara.com>");
    assert.equal(payload.reply_to, "privacy@aineara.com");
    assert.deepEqual(payload.to, [ADDRESS]);
  });
}

// D10: an unknown or missing source is stored as null and gets no email.
for (const [label, value] of [
  ["an unknown source", { email: ADDRESS, source: "evil" }],
  ["a missing source", { email: ADDRESS }],
]) {
  test(`${label} is stored as null and gets no email`, async (t) => {
    const { status, body, calls, sent } = await subscribe(t, post(value));
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true });
    assert.deepEqual(calls, [{ sql: INSERT_SQL, a: [ADDRESS, null] }]);
    assert.equal(sent.length, 0);
  });
}

test("a duplicate signup succeeds and sends no second email", async (t) => {
  const { status, body, sent } = await subscribe(t, post({ email: ADDRESS, source: "ascend-landing" }), { changes: 0 });
  assert.equal(status, 200);
  assert.deepEqual(body, { success: true, already_subscribed: true });
  assert.equal(sent.length, 0);
});

test("the address is trimmed and lowercased before it is checked and stored", async (t) => {
  const { status, calls } = await subscribe(t, post({ email: "  Reader@Example.COM  ", source: "sillage-landing" }));
  assert.equal(status, 200);
  assert.deepEqual(calls, [{ sql: INSERT_SQL, a: [ADDRESS, "sillage-landing"] }]);
});

// ── Bad input ───────────────────────────────────────────────────────────
for (const [label, request, error] of [
  ["an invalid address", () => post({ email: "not-an-email", source: "ascend-landing" }), "Invalid email address"],
  ["a body that isn't JSON", () => postRaw("{not json"), "Invalid request body"],
  ["a JSON null body", () => postRaw("null"), "Invalid request body"],
  ["an array instead of an address", () => post({ email: [ADDRESS], source: "ascend-landing" }), "Invalid email address"],
  // RFC 5321 caps an address at 254 characters; this one is 255.
  ["an address longer than 254 characters", () => post({ email: "a@" + "b".repeat(249) + ".com", source: "ascend-landing" }), "Invalid email address"],
]) {
  test(`${label} gets 400 and never reaches the database`, async (t) => {
    const { status, body, calls, sent } = await subscribe(t, request());
    assert.equal(status, 400);
    assert.deepEqual(body, { error });
    assert.equal(calls.length, 0);
    assert.equal(sent.length, 0);
  });
}

test("a 254-character address is accepted and stored", async (t) => {
  const email = "a@" + "b".repeat(248) + ".com";
  assert.equal(email.length, 254);
  const { status, body, calls } = await subscribe(t, post({ email, source: "ascend-landing" }));
  assert.equal(status, 200);
  assert.deepEqual(body, { success: true });
  assert.deepEqual(calls, [{ sql: INSERT_SQL, a: [email, "ascend-landing"] }]);
});

// ── Missing environment ─────────────────────────────────────────────────
for (const missing of ["RESEND_API_KEY", "DB"]) {
  test(`a missing ${missing} gets 500`, async (t) => {
    const { status, body, calls, sent } = await subscribe(t, post({ email: ADDRESS, source: "ascend-landing" }), {
      env: { [missing]: undefined },
    });
    assert.equal(status, 500);
    assert.deepEqual(body, MISCONFIGURED);
    assert.equal(calls.length, 0);
    assert.equal(sent.length, 0);
  });
}

// ── D1 failure ──────────────────────────────────────────────────────────
// The server-failure state the signup forms show (spec §6.3).
test("a D1 error gets 500 and sends no email", async (t) => {
  const { status, body, calls, sent } = await subscribe(t, post({ email: ADDRESS, source: "ascend-landing" }), {
    runThrows: true,
  });
  assert.equal(status, 500);
  assert.deepEqual(body, { error: "Something went wrong. Please try again." });
  assert.deepEqual(calls, [{ sql: INSERT_SQL, a: [ADDRESS, "ascend-landing"] }]);
  assert.equal(sent.length, 0);
});

// ── Resend failures never fail the signup ───────────────────────────────
for (const [label, resend] of [
  ["Resend answers 500", () => new Response('{"message":"test failure"}', { status: 500 })],
  ["the Resend request throws", () => { throw new TypeError("network down"); }],
]) {
  test(`the signup still succeeds when ${label}`, async (t) => {
    const { status, body, sent } = await subscribe(t, post({ email: ADDRESS, source: "ascend-landing" }), { resend });
    assert.equal(status, 200);
    assert.deepEqual(body, { success: true });
    assert.equal(sent.length, 1);
  });
}

// ── The HTML email ──────────────────────────────────────────────────────
for (const [source, copy, app] of [
  ["ascend-landing", ASCEND, "Ascend"],
  ["sillage-landing", SILLAGE, "Sillage"],
]) {
  test(`the ${app} HTML email matches its text, links privacy@ and uses readable colours`, async (t) => {
    const { sent } = await subscribe(t, post({ email: ADDRESS, source }));
    assert.equal(sent.length, 1);
    const { html } = sent[0].payload;
    const htmlWords = normText(parse(html).text);
    for (const line of copy.text.split("\n")) {
      if (line.trim() === "" || line === "---") continue;
      assert.ok(htmlWords.includes(normText(line)), `HTML is missing the line: ${line}`);
    }
    assert.ok(html.includes('href="mailto:privacy@aineara.com"'), "no mailto:privacy@aineara.com link");
    if (app === "Ascend") assert.ok(html.includes('href="https://aineara.com/ascend"'), "no link to the Ascend page");
    assert.match(html, /background:#FFFFFF/i, "the email is on white");
    assert.doesNotMatch(html, /#444(?![0-9a-f])/i);
    assert.doesNotMatch(html, /#080808/i);
    // Every text colour value, whatever its form: the lookbehind skips
    // background-color. Each must be #RGB or #RRGGBB, so a 3-digit grey
    // like #999 (2.85:1) is checked too.
    const colours = [...html.matchAll(/(?<![-\w])color:\s*([^;"']+)/gi)].map((m) => m[1].trim());
    assert.ok(colours.length > 0, "the HTML sets its text colours");
    for (const colour of colours) {
      assert.match(colour, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, `text colour ${colour} must be #RGB or #RRGGBB`);
      const ratio = contrastRatio(colour, "#FFFFFF");
      assert.ok(ratio >= 4.5, `${colour} on #FFFFFF is ${ratio.toFixed(2)}:1; text needs 4.5:1`);
    }
  });
}

test("OPTIONS answers 204 with the CORS headers", async () => {
  const res = await onRequestOptions({
    request: new Request(FUNCTION_URL, { method: "OPTIONS", headers: { Origin: ORIGIN } }),
  });
  assert.equal(res.status, 204);
  assert.equal(res.headers.get("Access-Control-Allow-Origin"), ORIGIN);
  assert.equal(res.headers.get("Access-Control-Allow-Methods"), "POST, OPTIONS");
});
