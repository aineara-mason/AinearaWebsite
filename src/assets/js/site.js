// Site-wide behaviour, loaded as an ES module on every page (spec §6.1-6.2).
// Everything here is an enhancement: every page works without it.
import { readSavedTheme, saveTheme, otherTheme } from "./lib/theme.js";
import { isValidEmail, submitSignup } from "./lib/signup.js";

const root = document.documentElement;

function localStore() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function currentTheme() {
  return root.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// The head script already chose the starting theme. The toggle saves a
// choice only when it is clicked; until then the page follows the device
// setting live.
function initThemeToggle() {
  const toggle = document.querySelector(".theme-toggle");
  if (!toggle) return;
  const storage = localStore();
  const syncLabel = () => {
    const label = currentTheme() === "light" ? toggle.dataset.labelToDark : toggle.dataset.labelToLight;
    if (label) toggle.setAttribute("aria-label", label);
  };

  syncLabel();
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    const next = otherTheme(currentTheme());
    root.setAttribute("data-theme", next);
    saveTheme(storage, next);
    syncLabel();
  });

  if (typeof window.matchMedia !== "function") return;
  const media = window.matchMedia("(prefers-color-scheme: light)");
  const followDevice = (event) => {
    if (readSavedTheme(storage) !== null) return;
    root.setAttribute("data-theme", event.matches ? "light" : "dark");
    syncLabel();
  };
  if (typeof media.addEventListener === "function") media.addEventListener("change", followDevice);
  else if (typeof media.addListener === "function") media.addListener(followDevice);
}

function initNavMenu() {
  const toggle = document.querySelector(".nav-toggle");
  const menu = document.getElementById("nav-menu");
  if (!toggle || !menu) return;
  const isOpen = () => toggle.getAttribute("aria-expanded") === "true";
  const setOpen = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    menu.classList.toggle("is-open", open);
  };

  toggle.addEventListener("click", () => setOpen(!isOpen()));
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !isOpen()) return;
    setOpen(false);
    toggle.focus();
  });
  menu.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
  });
}

function revealAll() {
  document.querySelectorAll(".reveal").forEach((item) => item.classList.add("is-visible"));
}

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (items.length === 0) return;
  if (!("IntersectionObserver" in window)) {
    revealAll();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.12, rootMargin: "0px 0px -10% 0px" },
  );
  items.forEach((item) => observer.observe(item));
}

// Each enhancement runs on its own, so one that throws can't stop the rest.
// The head script has already added .js, so if the reveal fails, every
// section is shown rather than left hidden for the fade-in.
function run(init, fallback) {
  try {
    init();
  } catch (error) {
    console.error(error);
    fallback?.();
  }
}

run(initThemeToggle);
run(initNavMenu);
run(initReveal, revealAll);

/**
 * Signup forms (spec §6.3). Messages come only from the form's data-msg-*
 * attributes and the source only from data-source, so the copy stays in
 * src/_data/copy.js and the source allow-list stays in lib/signup.js.
 */
function wireSignupForms() {
  for (const form of document.querySelectorAll("form[data-signup]")) {
    const field = form.querySelector('input[type="email"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".signup-status");
    if (!field || !button || !status) continue;

    const buttonLabel = button.textContent;
    const { msgSuccess, msgInvalid, msgError, msgSending } = form.dataset;

    const clearMessages = () => {
      field.classList.remove("is-invalid");
      field.removeAttribute("aria-invalid");
      status.textContent = "";
    };

    const showInvalid = () => {
      field.classList.add("is-invalid");
      field.setAttribute("aria-invalid", "true");
      status.textContent = msgInvalid;
      field.focus();
    };

    const setSending = (sending) => {
      form.classList.toggle("is-sending", sending);
      if (sending) form.setAttribute("aria-busy", "true");
      else form.removeAttribute("aria-busy");
      button.disabled = sending;
      button.textContent = sending ? msgSending : buttonLabel;
    };

    field.addEventListener("input", clearMessages);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.classList.contains("is-sending")) return;
      if (!isValidEmail(field.value)) {
        showInvalid();
        return;
      }
      clearMessages();
      // Disabling the button drops its focus to <body>. Remember whether the
      // visitor pressed it, so a failure can hand focus back (WCAG 2.4.3).
      const buttonHadFocus = document.activeElement === button;
      setSending(true);

      let result;
      try {
        result = await submitSignup({ email: field.value, source: form.dataset.source });
      } catch {
        result = "error"; // RangeError: data-source is not one of the three known sources
      }

      if (result === "success") {
        const done = document.createElement("p");
        done.className = "signup-done";
        done.tabIndex = -1;
        done.textContent = msgSuccess;
        form.replaceWith(done);
        done.focus();
        return;
      }

      setSending(false);
      if (result === "invalid") {
        showInvalid();
        return;
      }
      // Only if focus is still lost: never pull it back from where the
      // visitor has moved on to while the form was sending.
      const focusLost = !document.activeElement || document.activeElement === document.body;
      if (buttonHadFocus && focusLost) button.focus();
      status.textContent = msgError;
    });
  }
}

run(wireSignupForms);
