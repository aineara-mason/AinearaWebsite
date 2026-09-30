// Site-wide behaviour, loaded as an ES module on every page (spec §6.1-6.2).
// Everything here is an enhancement: every page works without it.
import { readSavedTheme, saveTheme, otherTheme } from "./lib/theme.js";

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

function initReveal() {
  const items = document.querySelectorAll(".reveal");
  if (items.length === 0) return;
  if (!("IntersectionObserver" in window)) {
    items.forEach((item) => item.classList.add("is-visible"));
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

initThemeToggle();
initNavMenu();
initReveal();
