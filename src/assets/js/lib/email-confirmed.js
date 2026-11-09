// Reads the address the confirmation email's link lands on. GoTrue confirms
// the email before it redirects, then adds ?code= (PKCE, which Ascend uses).
// When it refuses the link (expired, already used) it adds error and
// error_code instead, in the query or after the "#" depending on the flow.
export function confirmationOutcome(search, hash) {
  const sources = [String(search ?? ""), String(hash ?? "").replace(/^#/, "")].map((part) => new URLSearchParams(part));
  return sources.some((params) => params.has("error") || params.has("error_code")) ? "failed" : "confirmed";
}

// True when the address carries anything after the path that should not stay
// in the address bar or the browser history.
export function hasAuthParams(search, hash) {
  return String(search ?? "").replace(/^\?/, "") !== "" || String(hash ?? "").replace(/^#/, "") !== "";
}
