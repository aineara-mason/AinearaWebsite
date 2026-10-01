// Runs src/assets/js/site.js against a small fake DOM installed on
// globalThis, so the theme toggle, mobile menu, reveal behaviour and signup
// forms (spec §6.1-6.3) are checked without a browser. Each case imports a
// fresh copy of the module, because site.js wires everything up when it loads.
import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ROOT } from "./helpers/site.js";
import { THEME_KEY } from "../src/assets/js/lib/theme.js";
import copy from "../src/_data/copy.js";

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
    this.textContent = "";
    this.value = "";
    this.disabled = false;
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

  // Resolves once every listener has finished, so a test can await an async
  // handler such as the signup form's submit.
  dispatch(type, event = {}) {
    event.target ??= this;
    return Promise.all((this.listeners[type] ?? []).map((listener) => listener(event)));
  }

  focus() {
    this.ownerDocument.activeElement = this;
  }

  contains(node) {
    for (let current = node; current; current = current.parentElement) {
      if (current === this) return true;
    }
    return false;
  }

  querySelectorAll(selector) {
    return this.ownerDocument.elements.filter(
      (element) => element !== this && this.contains(element) && element.matches(selector),
    );
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  // Only the selectors site.js uses: "tag", ".class", "tag[attribute]" and
  // 'tag[attribute="value"]'.
  matches(selector) {
    const match = /^([a-z]+)?(?:\.([\w-]+))?(?:\[([\w-]+)(?:="([^"]*)")?\])?$/.exec(selector);
    if (!match || selector === "") throw new Error(`The fake DOM doesn't support the selector ${selector}`);
    const [, tag, className, attribute, value] = match;
    if (tag && this.tagName !== tag.toUpperCase()) return false;
    if (className && !this.classList.contains(className)) return false;
    if (attribute && !this.attributes.has(attribute)) return false;
    if (value !== undefined && this.attributes.get(attribute) !== value) return false;
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
// `storage` replaces the working localStorage (null for none), and
// `localStorageThrows` makes reading window.localStorage itself throw, as
// some browsers do when site data is blocked.
function installDom({
  theme = "dark",
  saved = {},
  storage = fakeStorage(saved),
  localStorageThrows = false,
  intersectionObserver = null,
  themeToggleThrows = false,
} = {}) {
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
  const win = {
    matchMedia: (query) => ({
      media: query,
      matches: false,
      addEventListener: (type, listener) => {
        if (type === "change") changeListeners.push(listener);
      },
    }),
  };
  if (localStorageThrows) {
    Object.defineProperty(win, "localStorage", {
      get() {
        throw new Error("storage is blocked");
      },
    });
  } else {
    win.localStorage = storage;
  }
  if (intersectionObserver) win.IntersectionObserver = intersectionObserver;

  // Frames run only when a test calls nextFrame().
  const frames = [];
  win.requestAnimationFrame = (callback) => frames.push(callback);

  globalThis.window = win;
  globalThis.document = doc;
  globalThis.Element = FakeElement;
  globalThis.requestAnimationFrame = win.requestAnimationFrame;
  if (intersectionObserver) globalThis.IntersectionObserver = intersectionObserver;

  const deviceChange = (matches) => {
    for (const listener of changeListeners) listener({ matches });
  };
  const nextFrame = () => {
    for (const callback of frames.splice(0)) callback();
  };
  return { doc, html, themeToggle, navToggle, menu, link, label, reveals, storage, deviceChange, frames, nextFrame };
}

// Adds a signup form as src/_includes/partials/signup.njk renders it, with
// its messages from copy.js. Call it before loadSiteJs().
function addSignupForm({ doc }, { id = "home", app = "ascend", source = "aineara-homepage" } = {}) {
  const wrapper = new FakeElement(doc, "div", { classes: ["signup"], parent: doc.body });
  const form = new FakeElement(doc, "form", {
    classes: ["signup-form"],
    attributes: {
      method: "post",
      novalidate: "",
      "data-signup": "",
      "data-app": app,
      "data-source": source,
      "data-msg-success": copy[`signup.success.${app}`],
      "data-msg-invalid": copy["signup.invalid"],
      "data-msg-error": copy["signup.error"],
      "data-msg-sending": copy["signup.sending"],
    },
    parent: wrapper,
  });
  const label = new FakeElement(doc, "label", {
    classes: ["visually-hidden"],
    attributes: { for: `signup-email-${id}` },
    parent: form,
  });
  label.textContent = copy["signup.label"];
  const row = new FakeElement(doc, "div", { classes: ["signup-row"], parent: form });
  const field = new FakeElement(doc, "input", {
    id: `signup-email-${id}`,
    classes: ["field"],
    attributes: {
      id: `signup-email-${id}`,
      type: "email",
      name: "email",
      required: "",
      "aria-describedby": `signup-note-${id} signup-status-${id}`,
    },
    parent: row,
  });
  const button = new FakeElement(doc, "button", {
    classes: ["button", "button--primary"],
    attributes: { type: "submit" },
    parent: row,
  });
  button.textContent = copy["signup.button"];
  const note = new FakeElement(doc, "p", {
    id: `signup-note-${id}`,
    classes: ["signup-note"],
    attributes: { id: `signup-note-${id}` },
    parent: form,
  });
  note.textContent = copy[`signup.note.${app}`];
  const status = new FakeElement(doc, "p", {
    id: `signup-status-${id}`,
    classes: ["signup-status"],
    attributes: { id: `signup-status-${id}`, role: "status", "aria-live": "polite" },
    parent: form,
  });
  return { form, field, button, status };
}

const submit = (form) => form.dispatch("submit", { preventDefault() {} });

// Holds the next fetch open until the test calls answer(status), so the test
// can move focus while the form is sending.
function pendingFetch(t) {
  let respond;
  const fetch = t.mock.method(globalThis, "fetch", () => new Promise((resolve) => (respond = resolve)));
  return { fetch, answer: (status) => respond(new Response(null, { status })) };
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.Element;
  delete globalThis.IntersectionObserver;
  delete globalThis.requestAnimationFrame;
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

// With storage blocked the choice can't be saved, but it must still win over
// the device for the rest of the visit (spec §2 decision 3, §6.1).
const blockedStorage = {
  getItem() {
    throw new Error("storage is blocked");
  },
  setItem() {
    throw new Error("storage is blocked");
  },
};
for (const [when, options] of [
  ["storage throws on every read and write", { storage: blockedStorage }],
  ["there is no storage", { storage: null }],
  ["reading window.localStorage throws", { localStorageThrows: true }],
]) {
  test(`a toggle choice still beats the device when ${when}`, async () => {
    const page = installDom({ theme: "dark", ...options });
    await loadSiteJs();

    page.themeToggle.dispatch("click");
    assert.equal(page.html.getAttribute("data-theme"), "light");
    page.deviceChange(false);
    assert.equal(page.html.getAttribute("data-theme"), "light", "the device doesn't undo the click");
    assert.equal(page.themeToggle.getAttribute("aria-label"), LABEL_TO_DARK);
  });
}

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

test("a 400 reply doesn't pull focus back from where the visitor moved on to", async (t) => {
  const page = installDom();
  const signup = addSignupForm(page);
  await loadSiteJs();
  const server = pendingFetch(t);

  signup.field.value = "name@example.com";
  signup.button.focus();
  const sent = submit(signup.form);
  assert.equal(server.fetch.mock.callCount(), 1);
  page.link.focus(); // the visitor tabs to a link outside the form while it sends
  server.answer(400);
  await sent;

  assert.equal(page.doc.activeElement, page.link, "focus stays on the link");
  assert.equal(signup.status.textContent, copy["signup.invalid"]);
  assert.ok(signup.field.classList.contains("is-invalid"));
  assert.equal(signup.field.getAttribute("aria-invalid"), "true");
  assert.equal(signup.button.disabled, false);
});

// Disabling the button may drop its focus to <body> (Safari and Firefox do;
// Chromium keeps it on the disabled button). Either way it hasn't gone
// anywhere the visitor chose, so the field takes it.
for (const [where, whileSending] of [
  ["is lost to <body>", (page) => page.doc.body.focus()],
  ["is still on the button", () => {}],
]) {
  test(`a 400 reply focuses the field when focus ${where}`, async (t) => {
    const page = installDom();
    const signup = addSignupForm(page);
    await loadSiteJs();
    const server = pendingFetch(t);

    signup.field.value = "name@example.com";
    signup.button.focus();
    const sent = submit(signup.form);
    whileSending(page);
    server.answer(400);
    await sent;

    assert.equal(page.doc.activeElement, signup.field);
    assert.equal(signup.status.textContent, copy["signup.invalid"]);
    assert.equal(signup.field.getAttribute("aria-invalid"), "true");
  });
}

test("a repeat invalid submit clears the status, then writes it again on the next frame", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 200 }));
  const page = installDom();
  const signup = addSignupForm(page);
  await loadSiteJs();

  signup.field.value = "name@example";
  signup.field.focus();
  await submit(signup.form);
  assert.equal(signup.status.textContent, copy["signup.invalid"]);
  page.nextFrame();

  await submit(signup.form);
  assert.equal(signup.status.textContent, "", "the live region has to change to be announced again");
  page.nextFrame();
  assert.equal(signup.status.textContent, copy["signup.invalid"]);
  assert.ok(signup.field.classList.contains("is-invalid"));
  assert.equal(page.doc.activeElement, signup.field);
  assert.equal(fetch.mock.callCount(), 0, "nothing is sent");
});

test("typing before that frame keeps the status clear", async () => {
  const page = installDom();
  const signup = addSignupForm(page);
  await loadSiteJs();

  signup.field.value = "name@example";
  await submit(signup.form);
  await submit(signup.form);
  signup.field.value = "name@example.";
  signup.field.dispatch("input");
  page.nextFrame();

  assert.equal(signup.status.textContent, "");
  assert.ok(!signup.field.classList.contains("is-invalid"));
});
