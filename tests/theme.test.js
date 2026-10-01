import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { ROOT } from "./helpers/site.js";
import { THEME_KEY, THEMES, readSavedTheme, saveTheme, resolveTheme, otherTheme } from "../src/assets/js/lib/theme.js";

const SCRIPT = readFileSync(path.join(ROOT, "src/_includes/scripts/theme-init.js"), "utf8");

// A stand-in for localStorage that counts writes.
function fakeStorage(saved, { throws = false } = {}) {
  const storage = {
    writes: 0,
    getItem(key) {
      if (throws) throw new Error("SecurityError: storage is disabled");
      return key === THEME_KEY ? saved : null;
    },
    setItem() {
      storage.writes += 1;
      if (throws) throw new Error("SecurityError: storage is disabled");
    },
  };
  return storage;
}

// Runs theme-init.js the way a browser would: in a fresh global with a fake
// document, localStorage and matchMedia. noMatchMedia leaves matchMedia out,
// as in browsers too old to have it.
function runThemeInit({
  saved = null,
  prefersLight = false,
  storageThrows = false,
  storageBlocked = false,
  noMatchMedia = false,
} = {}) {
  const attributes = {};
  const classes = new Set();
  const storage = fakeStorage(saved, { throws: storageThrows });
  const context = {
    document: {
      documentElement: {
        classList: { add: (name) => classes.add(name) },
        setAttribute: (name, value) => {
          attributes[name] = String(value);
        },
      },
    },
  };
  if (!noMatchMedia) {
    context.matchMedia = (query) => ({
      media: query,
      matches: query === "(prefers-color-scheme: light)" && prefersLight,
    });
  }
  if (storageBlocked) {
    Object.defineProperty(context, "localStorage", {
      get() {
        throw new Error("SecurityError: storage is blocked");
      },
    });
  } else {
    context.localStorage = storage;
  }
  context.window = context;
  vm.runInNewContext(SCRIPT, context);
  return { theme: attributes["data-theme"], classes, storage };
}

test("theme-init.js is a classic script that Nunjucks can include", () => {
  assert.doesNotMatch(SCRIPT, /^\s*(import|export)\b/m, "no module syntax");
  assert.doesNotMatch(SCRIPT, /\{[{%#]/, "no Nunjucks delimiters");
  assert.match(SCRIPT, /aineara-theme/);
});

test("with nothing saved, the device setting decides", () => {
  assert.equal(runThemeInit({ prefersLight: true }).theme, "light");
  assert.equal(runThemeInit({ prefersLight: false }).theme, "dark");
});

test("a saved choice overrides the device either way", () => {
  assert.equal(runThemeInit({ saved: "light", prefersLight: false }).theme, "light");
  assert.equal(runThemeInit({ saved: "dark", prefersLight: true }).theme, "dark");
});

test("an invalid saved value falls back to the device", () => {
  assert.equal(runThemeInit({ saved: "blue", prefersLight: true }).theme, "light");
  assert.equal(runThemeInit({ saved: "", prefersLight: false }).theme, "dark");
});

test("the head script never writes to storage", () => {
  for (const saved of [null, "light", "dark", "blue"]) {
    for (const prefersLight of [true, false]) {
      assert.equal(runThemeInit({ saved, prefersLight }).storage.writes, 0);
    }
  }
});

test("storage that throws still gets a theme, without an error", () => {
  assert.equal(runThemeInit({ storageThrows: true, prefersLight: true }).theme, "light");
  assert.equal(runThemeInit({ storageBlocked: true, prefersLight: false }).theme, "dark");
});

test("without matchMedia the theme is dark, without an error", () => {
  const { theme, classes } = runThemeInit({ noMatchMedia: true });
  assert.equal(theme, "dark");
  assert.ok(classes.has("js"));
  assert.equal(runThemeInit({ noMatchMedia: true, saved: "light" }).theme, "light");
});

test("the js class is added", () => {
  assert.ok(runThemeInit().classes.has("js"));
});

test("the lib helpers agree with the head script on every combination", () => {
  for (const saved of [null, "", "light", "dark", "blue"]) {
    for (const prefersLight of [true, false]) {
      for (const storageThrows of [false, true]) {
        const { theme, storage } = runThemeInit({ saved, prefersLight, storageThrows });
        assert.equal(
          resolveTheme(readSavedTheme(storage), prefersLight),
          theme,
          `saved=${saved} prefersLight=${prefersLight} storageThrows=${storageThrows}`,
        );
      }
    }
  }
});

test("lib constants and helpers", () => {
  assert.equal(THEME_KEY, "aineara-theme");
  assert.deepEqual(THEMES, ["dark", "light"]);
  assert.ok(Object.isFrozen(THEMES));
  assert.equal(otherTheme("dark"), "light");
  assert.equal(otherTheme("light"), "dark");
  assert.equal(readSavedTheme(null), null);
});

test("saveTheme reports success and never throws", () => {
  const storage = fakeStorage(null);
  assert.equal(saveTheme(storage, "light"), true);
  assert.equal(storage.writes, 1);
  assert.equal(saveTheme(storage, "blue"), false);
  assert.equal(storage.writes, 1);
  assert.equal(saveTheme(fakeStorage(null, { throws: true }), "dark"), false);
  assert.equal(saveTheme(null, "dark"), false);
});
