// The email-confirmed page (A2). Shows the failed copy when GoTrue refused
// the link, then drops the query and fragment from the address bar, so a
// one-time code is never left in the history or in a copied link.
import { confirmationOutcome, hasAuthParams } from "./lib/email-confirmed.js";

const { search, hash, pathname } = window.location;

if (confirmationOutcome(search, hash) === "failed") {
  for (const element of document.querySelectorAll("[data-email-confirmed][data-msg-failed]")) {
    element.textContent = element.dataset.msgFailed;
  }
}

if (hasAuthParams(search, hash)) {
  try {
    window.history.replaceState(null, "", pathname);
  } catch (error) {
    console.error(error);
  }
}
