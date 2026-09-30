import { test } from "node:test";
import assert from "node:assert/strict";
import copy from "../src/_data/copy.js";
import { readHtml, isTemplated, norm, pageStrings } from "./helpers/site.js";

// Shared Definitions §10, "Page map for tests/copy.test.js" (waitlist build).
// The nav and footer aria-labels ride along with the every-page ids.
const EVERY_PAGE = [
  "a11y.skip", "a11y.menu", "a11y.theme.toLight", "a11y.theme.toDark",
  "nav.apps", "nav.about", "nav.cta",
  "footer.copy", "footer.privacy", "footer.terms", "footer.support",
  "a11y.nav.main", "a11y.nav.footer",
];

const signupSet = (app) => [
  "signup.label", "signup.placeholder", "signup.button", "signup.sending", "signup.invalid", "signup.error",
  `signup.note.${app}`, `signup.success.${app}`, `signup.nojs.${app}`,
];

const feature = (name) => ["label", "heading", "1", "2", "3", "4"].map((key) => `ascend.${name}.${key}`);

const PAGE_IDS = {
  "index.html": [
    "title.home", "meta.home.description",
    "home.hero.label", "home.hero.heading", "home.hero.line", "home.hero.button",
    "home.apps.label",
    "home.cards.ascend.name", "home.cards.ascend.label", "home.cards.ascend.tagline", "home.cards.ascend.line", "home.cards.ascend.link",
    "home.cards.sillage.name", "home.cards.sillage.label", "home.cards.sillage.line", "home.cards.sillage.link",
    "home.principles.label",
    "home.principles.1.title", "home.principles.1.body",
    "home.principles.2.title", "home.principles.2.body",
    "home.principles.3.title", "home.principles.3.body",
    "home.about.label", "home.about.heading", "home.about",
    "home.waitlist.heading",
    ...signupSet("ascend"),
  ],
  "ascend.html": [
    "title.ascend", "meta.ascend.description.waitlist",
    "ascend.hero.label", "ascend.hero.heading", "ascend.hero.subhead",
    "a11y.rail",
    ...feature("train"), ...feature("eat"), ...feature("stay"),
    "ascend.data.heading", "ascend.data.1", "ascend.data.2", "ascend.data.3", "ascend.data.4", "ascend.data.link",
    "ascend.pricing.label", "ascend.pricing.waitlist", "ascend.pricing.note",
    "ascend.cta.heading.waitlist", "ascend.cta.disclaimer",
    "ascend.alt.01-today", "ascend.alt.04-nutrition", "ascend.alt.06-plans", "ascend.alt.07-weekly-report",
    ...signupSet("ascend"),
  ],
  "sillage.html": [
    "title.sillage", "meta.sillage.description",
    "sillage.label", "sillage.name", "sillage.line.1", "sillage.line.2", "sillage.back",
    ...signupSet("sillage"),
  ],
  "privacy.html": ["title.privacy", "meta.privacy.description"],
  "terms.html": ["title.terms", "meta.terms.description"],
  "support.html": ["title.support", "meta.support.description"],
  "404.html": ["404.title", "404.label", "404.heading", "404.line", "404.button", "meta.404.description"],
};

// Checked by tests/live-state.test.js against the live build instead.
const LIVE_ONLY = [
  "home.cards.ascend.label.live", "home.waitlist.live.heading", "home.hero.line.live", "meta.home.description.live",
  "ascend.pricing", "ascend.cta.heading.live", "ascend.alt.badge", "meta.ascend.description.live",
];

// Never page text: identical to success, held back by D6, the empty mark
// alt, and the link-preview image text.
const NEVER_RENDERED = [
  "signup.already.ascend", "signup.already.sillage",
  "ascend.alt.05-training-load", "ascend.alt.mark",
  "og.home", "og.ascend", "og.sillage",
];

test("copy.js holds exactly the ids the page map uses", () => {
  const mapped = new Set([...EVERY_PAGE, ...Object.values(PAGE_IDS).flat(), ...LIVE_ONLY, ...NEVER_RENDERED]);
  assert.deepEqual([...mapped].filter((id) => typeof copy[id] !== "string"), [], "ids missing from src/_data/copy.js");
  assert.deepEqual(Object.keys(copy).filter((id) => !mapped.has(id)), [], "ids in src/_data/copy.js that no page uses");
});

test("copy follows the house style", () => {
  for (const [id, text] of Object.entries(copy)) {
    assert.doesNotMatch(text, /[‘’“”]/, `${id}: use straight quotes and apostrophes`);
    assert.doesNotMatch(text, /\.\.\./, `${id}: use … (U+2026), not three dots`);
    assert.doesNotMatch(text, /!/, `${id}: no exclamation marks (spec §5.5)`);
    assert.doesNotMatch(text, /→/, `${id}: use the Lucide arrow icon, not → (D15)`);
  }
  assert.equal(copy["signup.sending"], "Sending…");
});

for (const [rel, ids] of Object.entries(PAGE_IDS)) {
  test(`${rel} shows its copy verbatim`, (t) => {
    const root = readHtml(rel);
    if (!isTemplated(root)) {
      t.skip("not templated yet");
      return;
    }
    const strings = pageStrings(root);
    for (const id of [...EVERY_PAGE, ...ids]) {
      assert.ok(strings.includes(norm(copy[id])), `${rel}: ${id} is not on the page verbatim: "${copy[id]}"`);
    }
  });
}
