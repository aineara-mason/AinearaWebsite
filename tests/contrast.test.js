import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import tokens from "../src/_data/tokens.js";
import { parseColor, composite, relativeLuminance, contrastRatio } from "./helpers/contrast.js";
import { SITE_DIR } from "./helpers/site.js";

const TEXT = 4.5; // WCAG 2.1 SC 1.4.3, normal-size text
const NON_TEXT = 3; // WCAG 2.1 SC 1.4.11, field borders and the focus ring

// Every pair in the plan's Shared Definitions §9, generated from the tokens.
// Hairlines are left out on purpose: they are decorative dividers, not the
// boundary of a control, so SC 1.4.11 doesn't apply to them.
function buildPairs() {
  const pairs = [];
  const add = (name, fg, bg, min) => pairs.push({ name, fg, bg, min });

  for (const theme of ["dark", "light"]) {
    const s = tokens.studio[theme];
    for (const surface of ["page", "section", "fill"]) {
      const bg = s[surface];
      add(`studio.${theme} text on ${surface}`, s.text, bg, TEXT);
      add(`studio.${theme} textSecondary on ${surface}`, s.textSecondary, bg, TEXT);
      add(`studio.${theme} error on ${surface}`, s.error, bg, TEXT);
      add(`studio.${theme} fieldBorder on ${surface}`, s.fieldBorder, bg, NON_TEXT);
      add(`studio.${theme} focus ring (text) on ${surface}`, s.text, bg, NON_TEXT);
    }
    add(`studio.${theme} buttonText on buttonBg`, s.buttonText, s.buttonBg, TEXT);
  }

  const a = tokens.ascend;
  for (const surface of ["surfaceTop", "surfaceBottom"]) {
    const bg = a[surface];
    add(`ascend text on ${surface}`, a.text, bg, TEXT);
    add(`ascend textSecondary on ${surface}`, a.textSecondary, bg, TEXT);
    add(`ascend error on ${surface}`, a.error, bg, TEXT);
    add(`ascend buttonSecondaryText on buttonSecondaryBg over ${surface}`, a.buttonSecondaryText, composite(a.buttonSecondaryBg, bg), TEXT);
    add(`ascend accent on ${surface}`, a.accent, bg, TEXT);
    add(`ascend field border (textSecondary) on ${surface}`, a.textSecondary, bg, NON_TEXT);
    add(`ascend focus ring (text) on ${surface}`, a.text, bg, NON_TEXT);
  }
  add("ascend buttonText on buttonBg", a.buttonText, a.buttonBg, TEXT);
  // On hover the primary button darkens to accentOnLight instead of dimming:
  // opacity 0.88 blends #1A6CF6 into the navy and white text on it drops to
  // about 4.24:1.
  add("ascend buttonText on hover (accentOnLight)", a.buttonText, a.accentOnLight, TEXT);
  for (const surface of ["page", "section", "fill"]) {
    add(`ascend accent on studio.dark ${surface}`, a.accent, tokens.studio.dark[surface], TEXT);
    add(`ascend accentOnLight on studio.light ${surface}`, a.accentOnLight, tokens.studio.light[surface], TEXT);
  }

  for (const theme of ["dark", "light"]) {
    const s = tokens.sillage[theme];
    const studio = tokens.studio[theme];
    for (const surface of ["page", "surface"]) {
      const bg = s[surface];
      add(`sillage.${theme} text on ${surface}`, s.text, bg, TEXT);
      add(`sillage.${theme} textSecondary on ${surface}`, s.textSecondary, bg, TEXT);
      add(`sillage.${theme} gold on ${surface}`, s.gold, bg, TEXT);
      add(`sillage.${theme} focus ring (text) on ${surface}`, s.text, bg, NON_TEXT);
      add(`sillage.${theme} field border (studio fieldBorder) on ${surface}`, studio.fieldBorder, bg, NON_TEXT);
      add(`sillage.${theme} error (studio error) on ${surface}`, studio.error, bg, TEXT);
    }
    add(`sillage.${theme} buttonText on buttonBg`, s.buttonText, s.buttonBg, TEXT);
  }
  return pairs;
}

const PAIRS = buildPairs();

// Shared Definitions §5: every custom property name the built tokens.css must declare.
const REQUIRED_PROPERTIES = [
  "--color-page", "--color-section", "--color-fill", "--color-text", "--color-text-secondary",
  "--color-hairline", "--color-field-border", "--color-button-bg", "--color-button-text", "--color-error",
  "--ascend-surface-top", "--ascend-surface-bottom", "--ascend-surface", "--ascend-text",
  "--ascend-text-secondary", "--ascend-button-bg", "--ascend-button-text", "--ascend-button-secondary-bg",
  "--ascend-button-secondary-text", "--ascend-accent", "--ascend-accent-on-light", "--ascend-accent-text",
  "--ascend-error",
  "--sillage-page", "--sillage-surface", "--sillage-text", "--sillage-text-secondary", "--sillage-gold",
  "--sillage-button-bg", "--sillage-button-text", "--sillage-hairline", "--font-sillage-display",
  "--weight-sillage-display",
  "--font-sans", "--text-display", "--text-heading", "--text-card-title", "--text-body", "--text-small",
  "--text-caption", "--text-label", "--weight-display", "--weight-heading", "--weight-card-title",
  "--weight-label", "--tracking-display", "--tracking-heading", "--tracking-label", "--leading-display",
  "--leading-body",
  "--radius-tile", "--radius-field", "--radius-button", "--radius-card", "--radius-hero", "--radius-pill",
  "--space-1", "--space-2", "--space-3", "--space-4", "--space-5", "--space-6", "--space-7", "--space-8",
  "--space-9", "--space-10", "--gutter", "--container-page", "--container-reading", "--shadow-screenshot",
  "--duration-state", "--ease-state", "--ease-spring", "--duration-reveal", "--duration-pulse",
  "--focus-width", "--focus-offset",
];

// The `name: value` declarations src/tokens.css.njk must render from the
// token data (Shared Definitions §5), so the built file is checked against
// the same numbers as the colour pairs above, not just for its names.
const kebab = (key) => key.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
const tokenDeclarations = (prefix, values) =>
  Object.entries(values).map(([key, value]) => `${prefix}${kebab(key)}: ${value}`);

const ROOT_DECLARATIONS = [
  "color-scheme: dark",
  ...tokenDeclarations("--color-", tokens.studio.dark),
  ...tokenDeclarations("--ascend-", tokens.ascend),
  ...tokenDeclarations("--sillage-", tokens.sillage.dark),
  "--ascend-surface: linear-gradient(180deg, var(--ascend-surface-top), var(--ascend-surface-bottom))",
  "--ascend-accent-text: var(--ascend-accent)",
  ...tokenDeclarations("--font-", tokens.font),
  ...tokenDeclarations("--text-", tokens.text),
  ...tokenDeclarations("--weight-", tokens.weight),
  ...tokenDeclarations("--tracking-", tokens.tracking),
  ...tokenDeclarations("--leading-", tokens.leading),
  ...tokenDeclarations("--radius-", tokens.radius),
  ...tokens.space.map((value, index) => `--space-${index + 1}: ${value}`),
  `--gutter: ${tokens.gutter.phone}`,
  ...tokenDeclarations("--container-", tokens.container),
  ...tokenDeclarations("--shadow-", tokens.shadow),
  ...tokenDeclarations("--", tokens.motion),
  ...tokenDeclarations("--focus-", tokens.focus),
];

const LIGHT_DECLARATIONS = [
  "color-scheme: light",
  ...tokenDeclarations("--color-", tokens.studio.light),
  ...tokenDeclarations("--sillage-", tokens.sillage.light),
  "--ascend-accent-text: var(--ascend-accent-on-light)",
];

function describeColor(color) {
  if (typeof color === "string") return color;
  const { r, g, b } = parseColor(color);
  return `rgb(${[r, g, b].map((channel) => Math.round(channel)).join(", ")})`;
}

function declarations(block) {
  return block
    .split(";")
    .map((declaration) => declaration.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

// Each expected declaration must be in the block exactly once, with exactly
// that value; a second declaration of the same name would override it.
function assertDeclares(block, expected, where) {
  const actual = declarations(block);
  const wrong = [];
  for (const declaration of expected) {
    const name = declaration.slice(0, declaration.indexOf(":") + 1);
    const found = actual.filter((candidate) => candidate.startsWith(name));
    if (found.length !== 1 || found[0] !== declaration) wrong.push({ expected: declaration, found });
  }
  assert.deepEqual(wrong, [], `${where} doesn't match src/_data/tokens.js`);
}

test("the contrast helper matches known WCAG ratios", () => {
  const near = (actual, expected) =>
    assert.ok(Math.abs(actual - expected) <= 0.01, `${actual.toFixed(3)} is not within 0.01 of ${expected}`);
  near(contrastRatio("#FFFFFF", "#1A6CF6"), 4.65);
  near(contrastRatio("#FFFFFF", "#4A90F8"), 3.16);
  near(contrastRatio("#FAFAFA", "#000000"), 20.12);
  assert.equal(relativeLuminance("#000000"), 0);
  assert.ok(Math.abs(relativeLuminance("#FFFFFF") - 1) < 1e-9);
});

test("rgba colours are composited over the surface they sit on", () => {
  assert.deepEqual(parseColor("rgba(255,255,255,.75)"), { r: 255, g: 255, b: 255, a: 0.75 });
  assert.deepEqual(composite("rgba(255,255,255,.5)", "#000000"), { r: 127.5, g: 127.5, b: 127.5, a: 1 });
  assert.throws(() => contrastRatio("#FFFFFF", "rgba(0,0,0,.5)"), RangeError);
  // Out-of-range or malformed values would otherwise give a false pass:
  // alpha 1.5 would put #808080 on white at 10.29:1 instead of 3.95:1.
  for (const bad of ["rgba(128,128,128,1.5)", "rgb(256,0,0)", "rgb(1.2.3,0,0)", { r: 0, g: 0, b: 0, a: 2 }, { r: 0, g: 0 }]) {
    assert.throws(() => parseColor(bad), TypeError, JSON.stringify(bad));
  }
  // The float mix can land a hair above 255; that must not count as out of range.
  assert.equal(contrastRatio("rgba(255,255,255,.061)", "#FFFFFF"), 1);
});

describe("every colour pair meets its WCAG 2.1 threshold", () => {
  test("the pair list is complete", () => {
    assert.equal(PAIRS.length, 80);
  });
  for (const { name, fg, bg, min } of PAIRS) {
    test(`${name} (at least ${min}:1)`, () => {
      const ratio = contrastRatio(fg, bg);
      assert.ok(
        ratio >= min,
        `${name}: ${ratio.toFixed(2)}:1 is below ${min}:1 (${describeColor(fg)} on ${describeColor(bg)})`,
      );
    });
  }
});

describe("the built /assets/css/tokens.css", () => {
  const file = path.join(SITE_DIR, "assets/css/tokens.css");
  const css = existsSync(file) ? readFileSync(file, "utf8") : "";

  test("exists", () => {
    assert.ok(css, `${file} is missing; run npm run build`);
  });

  test("declares every pinned custom property", () => {
    const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1]));
    assert.deepEqual(REQUIRED_PROPERTIES.filter((name) => !declared.has(name)), []);
    const root = css.match(/^:root\s*\{([^}]*)\}/m);
    assert.ok(root, "no top-level :root block");
    assertDeclares(root[1], ROOT_DECLARATIONS, ":root");
    // Nunjucks autoescapes: a value rendered without `| safe` comes out as
    // an HTML entity, and the `;` in `&quot;` ends the declaration early.
    assert.doesNotMatch(css, /&(?:quot;|amp;|lt;|gt;|#)/);
  });

  test("the light theme is the same with and without JavaScript", () => {
    const withJs = css.match(/:root\[data-theme="light"\]\s*\{([^}]*)\}/);
    const withoutJs = css.match(/@media \(prefers-color-scheme: light\)\s*\{\s*:root:not\(\[data-theme\]\)\s*\{([^}]*)\}/);
    assert.ok(withJs, 'no :root[data-theme="light"] block');
    assert.ok(withoutJs, "no @media (prefers-color-scheme: light) { :root:not([data-theme]) } block");
    assert.deepEqual(declarations(withoutJs[1]), declarations(withJs[1]));
    assert.ok(declarations(withJs[1]).includes("color-scheme: light"));
    assertDeclares(withJs[1], LIGHT_DECLARATIONS, ':root[data-theme="light"]');
    // Nothing else may be overridden: a stray --ascend-* line would make
    // Ascend sections change with the theme (spec §4.1).
    const names = (list) => list.map((declaration) => declaration.slice(0, declaration.indexOf(":"))).sort();
    assert.deepEqual(names(declarations(withJs[1])), names(LIGHT_DECLARATIONS));
  });

  test("widens the gutter at the tablet and desktop breakpoints", () => {
    const flat = css.replace(/\s+/g, " ");
    const missing = ["tablet", "desktop"]
      .map((size) => `@media (min-width: ${tokens.breakpoint[size]}) { :root { --gutter: ${tokens.gutter[size]}; } }`)
      .filter((block) => !flat.includes(block));
    assert.deepEqual(missing, [], "tokens.css doesn't match tokens.breakpoint and tokens.gutter");
  });

  test("never uses system-ui", () => {
    assert.doesNotMatch(css, /system-ui/);
  });
});

describe("button hover in the built /assets/css/site.css", () => {
  const file = path.join(SITE_DIR, "assets/css/site.css");
  const css = existsSync(file) ? readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "") : "";
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selectors, body]) => ({
    selectors: selectors.split(",").map((selector) => selector.trim().replace(/\s+/g, " ")),
    body: declarations(body),
  }));

  test("exists", () => {
    assert.ok(css, `${file} is missing; run npm run build`);
  });

  // A disabled button, such as the "Sending…" state, must not dim on hover.
  test("only enabled buttons change opacity on hover", () => {
    const offenders = [];
    for (const { selectors, body } of rules) {
      if (!body.some((declaration) => declaration.startsWith("opacity:"))) continue;
      for (const selector of selectors) {
        const compounds = selector.split(/\s*[\s>+~]\s*/);
        const dims = compounds.some(
          (compound) =>
            /\.button(?:--[a-z-]+)?(?![\w-])/.test(compound) &&
            compound.includes(":hover") &&
            !compound.includes(":not(:disabled)"),
        );
        if (dims) offenders.push(selector);
      }
    }
    assert.deepEqual(offenders, [], "a .button:hover rule sets opacity without :not(:disabled)");
  });

  // White on #1A6CF6 is only 4.65:1, so dimming the button into the navy
  // takes it below 4.5:1. Ascend's primary darkens to accentOnLight instead.
  test("the Ascend primary button darkens to accentOnLight on hover instead of dimming", () => {
    const selector = ".scope-ascend .button--primary:not(:disabled):hover";
    const body = rules.filter((rule) => rule.selectors.includes(selector)).flatMap((rule) => rule.body);
    assert.ok(body.length > 0, `site.css has no ${selector} rule`);
    const last = (name) => body.filter((declaration) => declaration.startsWith(`${name}:`)).at(-1);
    assert.equal(last("opacity"), "opacity: 1");
    assert.equal(last("background"), "background: var(--ascend-accent-on-light)");
  });
});
