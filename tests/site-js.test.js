// Runs src/assets/js/site.js against a small fake DOM installed on
// globalThis, so the theme toggle, mobile menu and reveal behaviour (spec
// §6.1-6.2) are checked without a browser. Each case imports a fresh copy of
// the module, because site.js wires everything up when it loads.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./helpers/site.js";
import { THEME_KEY } from "../src/assets/js/lib/theme.js";

const SITE_JS = pathToFileURL(path.join(ROOT, "src/assets/js/site.js")).href;
const LABEL_TO_LIGHT = "Switch to the light theme";
const LABEL_TO_DARK = "Switch to the dark theme";

let loads = 0;
async function loadSiteJs() {
  loads += 1;
  await import(`${SITE_JS}?case=${loads}`);
}

class FakeElement {
  constructor(doc, tag, { id = null, classes = [], attributes = {}, parent = null } = {}) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.id = id;
    this.parentElement = parent;
    this.hidden = false;
    this.listeners = {};
    this.attributes = new Map(Object.entries(attributes));
    this.dataset = {};
    for (const [name, value] of this.attributes) {
      if (!name.startsWith("data-")) continue;
      this.dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    const names = new Set(classes);
    this.classList = {
      add: (name) => names.add(name),
      remove: (name) => names.delete(name),
      contains: (name) => names.has(name),
      toggle: (name, force = !names.has(name)) => {
        if (force) names.add(name);
        else names.delete(name);
        return force;
      },
    };
    doc.elements.push(this);
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  dispatch(type, event = {}) {
    event.target ??= this;
    for (const listener of this.listeners[type] ?? []) listener(event);
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  // Only the selectors site.js uses: "tag", ".class" and "tag[attribute]".
  matches(selector) {
    const match = /^([a-z]+)?(?:\.([\w-]+))?(?:\[([\w-]+)\])?$/.exec(selector);
    if (!match || selector === "") throw new Error(`The fake DOM doesn't support the selector ${selector}`);
    const [, tag, className, attribute] = match;
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    if (className && !this.classList.contains(className)) return false;
    if (attribute && !this.attributes.has(attribute)) return false;
    return true;
  }

  closest(selector) {
    for (let node = this; node; node = node.parentElement) {
      if (node.matches(selector)) return node;
    }
    return null;
  }
}

class FakeDocument {
  constructor() {
    this.elements = [];
    this.listeners = {};
    this.documentElement = new FakeElement(this, "html", { classes: ["js"] });
    this.body = new FakeElement(this, "body", { parent: this.documentElement });
    this.activeElement = this.body;
  }

  querySelectorAll(selector) {
    return this.elements.filter((element) => element.matches(selector));
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  getElementById(id) {
    return this.elements.find((element) => element.id === id) ?? null;
  }

  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  dispatch(type, event = {}) {
    event.target ??= this;
    for (const listener of this.listeners[type] ?? []) listener(event);
  }
}

function fakeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    values,
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

// A stand-in for the browser's IntersectionObserver that lets a test decide
// which elements scroll into view.
class FakeIntersectionObserver {
  static instances = [];

  constructor(callback, options) {
    this.callback = callback;
    this.options = options;
    this.observed = new Set();
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element) {
    this.observed.add(element);
  }

  unobserve(element) {
    this.observed.delete(element);
  }

  enter(element) {
    this.callback([{ target: element, isIntersecting: true }], this);
  }
}

// Builds the parts of a page that site.js looks for: the theme toggle, the
// mobile menu with two links, and three fade-in sections.
function installDom({ theme = "dark", saved = {}, intersectionObserver = null, themeToggleThrows = false } = {}) {
  const doc = new FakeDocument();
  const html = doc.documentElement;
  html.setAttribute("data-theme", theme);
  const body = doc.body;

  const themeToggle = new FakeElement(doc, "button", {
    classes: ["theme-toggle"],
    attributes: { "data-label-to-light": LABEL_TO_LIGHT, "data-label-to-dark": LABEL_TO_DARK },
    parent: body,
  });
  themeToggle.hidden = true;
  if (themeToggleThrows) {
    themeToggle.addEventListener = () => {
      throw new Error("theme toggle broke");
    };
  }

  const navToggle = new FakeElement(doc, "button", {
    classes: ["nav-toggle"],
    attributes: { "aria-expanded": "false", "aria-controls": "nav-menu" },
    parent: body,
  });
  const menu = new FakeElement(doc, "ul", { id: "nav-menu", parent: body });
  const item = new FakeElement(doc, "li", { parent: menu });
  const link = new FakeElement(doc, "a", { attributes: { href: "/ascend" }, parent: item });
  const label = new FakeElement(doc, "span", { parent: link });
  new FakeElement(doc, "a", { attributes: { href: "/sillage" }, parent: menu });

  const reveals = [1, 2, 3].map(() => new FakeElement(doc, "section", { classes: ["reveal"], parent: body }));

  const changeListeners = [];
  const storage = fakeStorage(saved);
  const win = {
    localStorage: storage,
    matchMedia: (query) => ({
      media: query,
      matches: false,
      addEventListener: (type, listener) => {
        if (type === "change") changeListeners.push(listener);
      },
    }),
  };
  if (intersectionObserver) win.IntersectionObserver = intersectionObserver;

  globalThis.window = win;
  globalThis.document = doc;
  globalThis.Element = FakeElement;
  if (intersectionObserver) globalThis.IntersectionObserver = intersectionObserver;

  const deviceChange = (matches) => {
    for (const listener of changeListeners) listener({ matches });
  };
  return { doc, html, themeToggle, navToggle, menu, link, label, reveals, storage, deviceChange };
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Element;
  delete globalThis.IntersectionObserver;
  FakeIntersectionObserver.instances = [];
});

test("the theme toggle is unhidden and labelled for the theme it switches to", async () => {
  const dark = installDom({ theme: "dark" });
  await loadSiteJs();
  assert.equal(dark.themeToggle.hidden, false);
  assert.equal(dark.themeToggle.getAttribute("aria-label"), LABEL_TO_LIGHT);

  const light = installDom({ theme: "light" });
  await loadSiteJs();
  assert.equal(light.themeToggle.getAttribute("aria-label"), LABEL_TO_DARK);
});

test("clicking the toggle flips the theme, saves it and swaps the label", async () => {
  const page = installDom({ theme: "dark" });
  await loadSiteJs();

  page.themeToggle.dispatch("click");
  assert.equal(page.html.getAttribute("data-theme"), "light");
  assert.equal(page.storage.getItem(THEME_KEY), "light");
  assert.equal(page.themeToggle.getAttribute("aria-label"), LABEL_TO_DARK);

  page.themeToggle.dispatch("click");
  assert.equal(page.html.getAttribute("data-theme"), "dark");
  assert.equal(page.storage.getItem(THEME_KEY), "dark");
  assert.equal(page.themeToggle.getAttribute("aria-label"), LABEL_TO_LIGHT);
});

test("the device setting is followed only while nothing is saved", async () => {
  const page = installDom({ theme: "dark" });
  await loadSiteJs();

  page.deviceChange(true);
  assert.equal(page.html.getAttribute("data-theme"), "light");
  assert.equal(page.themeToggle.getAttribute("aria-label"), LABEL_TO_DARK);
  page.deviceChange(false);
  assert.equal(page.html.getAttribute("data-theme"), "dark");
  assert.equal(page.storage.getItem(THEME_KEY), null, "following the device saves nothing");

  page.themeToggle.dispatch("click");
  assert.equal(page.storage.getItem(THEME_KEY), "light");
  page.deviceChange(false);
  assert.equal(page.html.getAttribute("data-theme"), "light", "a saved choice wins over the device");
});

test("a choice saved on an earlier visit stops the device from changing the theme", async () => {
  const page = installDom({ theme: "light", saved: { [THEME_KEY]: "light" } });
  await loadSiteJs();
  page.deviceChange(false);
  assert.equal(page.html.getAttribute("data-theme"), "light");
});

test("the nav toggle opens the menu and Escape closes it and returns focus", async () => {
  const page = installDom();
  await loadSiteJs();

  page.navToggle.dispatch("click");
  assert.equal(page.navToggle.getAttribute("aria-expanded"), "true");
  assert.ok(page.menu.classList.contains("is-open"));

  page.link.focus();
  page.doc.dispatch("keydown", { key: "Escape" });
  assert.equal(page.navToggle.getAttribute("aria-expanded"), "false");
  assert.ok(!page.menu.classList.contains("is-open"));
  assert.equal(page.doc.activeElement, page.navToggle);
});

test("Escape does nothing while the menu is closed", async () => {
  const page = installDom();
  await loadSiteJs();
  page.link.focus();
  page.doc.dispatch("keydown", { key: "Escape" });
  assert.equal(page.doc.activeElement, page.link);
});

test("clicking a link in the menu closes it", async () => {
  const page = installDom();
  await loadSiteJs();

  page.navToggle.dispatch("click");
  page.menu.dispatch("click", { target: page.menu });
  assert.ok(page.menu.classList.contains("is-open"), "a click that isn't on a link leaves it open");

  page.menu.dispatch("click", { target: page.label });
  assert.equal(page.navToggle.getAttribute("aria-expanded"), "false");
  assert.ok(!page.menu.classList.contains("is-open"));
});

test("without IntersectionObserver every fade-in section is shown", async () => {
  const page = installDom();
  await loadSiteJs();
  for (const section of page.reveals) assert.ok(section.classList.contains("is-visible"));
});

test("with IntersectionObserver a section is shown once it scrolls into view", async () => {
  const page = installDom({ intersectionObserver: FakeIntersectionObserver });
  await loadSiteJs();

  const [observer] = FakeIntersectionObserver.instances;
  assert.deepEqual(observer.options, { threshold: 0.12, rootMargin: "0px 0px -10% 0px" });
  assert.equal(observer.observed.size, 3);
  for (const section of page.reveals) assert.ok(!section.classList.contains("is-visible"));

  observer.enter(page.reveals[0]);
  assert.ok(page.reveals[0].classList.contains("is-visible"));
  assert.ok(!observer.observed.has(page.reveals[0]), "each section is shown only once");
  assert.ok(!page.reveals[1].classList.contains("is-visible"));
});

test("one enhancement that throws doesn't stop the others", async (t) => {
  const logged = t.mock.method(console, "error", () => {});
  const page = installDom({ themeToggleThrows: true });
  await loadSiteJs();

  assert.equal(logged.mock.callCount(), 1, "the error is still reported");
  assert.match(String(logged.mock.calls[0].arguments[0]), /theme toggle broke/);
  for (const section of page.reveals) assert.ok(section.classList.contains("is-visible"));
  page.navToggle.dispatch("click");
  assert.equal(page.navToggle.getAttribute("aria-expanded"), "true");
  assert.ok(page.menu.classList.contains("is-open"));
});

test("if the reveal script throws, every fade-in section is shown anyway", async (t) => {
  t.mock.method(console, "error", () => {});
  class BrokenObserver {
    constructor() {
      throw new Error("IntersectionObserver broke");
    }
  }
  const page = installDom({ intersectionObserver: BrokenObserver });
  await loadSiteJs();
  for (const section of page.reveals) assert.ok(section.classList.contains("is-visible"));
});
