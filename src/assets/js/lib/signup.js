/**
 * Signup logic shared by every waitlist form (spec §6.3).
 * Pure module: nothing touches window or document at the top level, so
 * node:test can import it.
 */
export const SOURCES = Object.freeze(["aineara-homepage", "ascend-landing", "sillage-landing"]);
export const ENDPOINT = "/api/subscribe";

// Same pattern as functions/api/subscribe.js, applied after trimming.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value ?? "").trim());
}

export function appForSource(source) {
  if (!SOURCES.includes(source)) throw new RangeError(`Unknown signup source: ${source}`);
  return source === "sillage-landing" ? "sillage" : "ascend";
}

export async function submitSignup({ email, source, fetchImpl = globalThis.fetch }) {
  if (!SOURCES.includes(source)) throw new RangeError(`Unknown signup source: ${source}`);
  let response;
  try {
    response = await fetchImpl(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), source }),
    });
  } catch {
    return "error";
  }
  if (response.ok) return "success"; // any 2xx, including { success: true, already_subscribed: true }
  if (response.status === 400) return "invalid";
  return "error";
}
