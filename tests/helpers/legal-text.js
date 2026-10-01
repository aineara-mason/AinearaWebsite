// tests/helpers/legal-text.js
//
// legalText(html) turns a legal page's <main> into plain lines, so a test can
// compare its words with a frozen snapshot (spec §3.2 and §7):
//   - one line per h1–h3, p, li and table row; h1–h3 start with "# ", "## ", "### "
//   - a link outside those gets a line of its own, so its target is still checked
//   - table cells are joined with " | "
//   - <br> becomes a space and <a> becomes "text <href>"
//   - entities are decoded and whitespace is collapsed
//
// Run it once, in Task 9, while public/ still holds the verified pages
// (real Node, not Bun's wrapper):
//   PATH="/opt/homebrew/bin:$PATH" node tests/helpers/legal-text.js --write
// After that, change tests/snapshots/*.txt only by hand, and say why in the
// commit message.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";
import { ROOT } from "./site.js";

export const LEGAL_PAGES = ["privacy", "support", "terms"];
export const SNAPSHOT_DIR = path.join(ROOT, "tests", "snapshots");

const PARSE_OPTIONS = { blockTextElements: { script: true, style: true } };
// "a" only matters here for a link outside every other line element: one
// inside a line element is read by inline() and never reaches collect().
const LINE_TAGS = new Set(["h1", "h2", "h3", "p", "li", "a"]);
const HEADING_PREFIX = { h1: "# ", h2: "## ", h3: "### " };
const SKIP_TAGS = new Set(["script", "style", "template"]);
const ELEMENT = 1;
const TEXT = 3;

const collapse = (s) => s.replace(/\s+/g, " ").trim();
const tagOf = (node) => (node.nodeType === ELEMENT ? (node.rawTagName || "").toLowerCase() : "");

// The text of a node as it reads inline. Links keep their target.
function inline(node) {
  if (node.nodeType === TEXT) return node.text;
  if (node.nodeType !== ELEMENT) return "";
  const tag = tagOf(node);
  if (tag === "br") return " ";
  if (SKIP_TAGS.has(tag)) return "";
  const inner = node.childNodes.map(inline).join("");
  return tag === "a" ? `${inner} <${node.getAttribute("href") ?? ""}>` : inner;
}

function collect(node, lines) {
  if (node.nodeType === TEXT) {
    // Text outside any line element still counts, so nothing is silently dropped.
    const stray = collapse(node.text);
    if (stray) lines.push(stray);
    return;
  }
  if (node.nodeType !== ELEMENT) return;
  const tag = tagOf(node);
  if (SKIP_TAGS.has(tag)) return;
  if (tag === "tr") {
    const cells = node.childNodes.filter((child) => ["th", "td"].includes(tagOf(child)));
    lines.push(cells.map((cell) => collapse(inline(cell))).join(" | "));
    return;
  }
  if (LINE_TAGS.has(tag)) {
    const text = collapse(inline(node));
    if (text) lines.push((HEADING_PREFIX[tag] ?? "") + text);
    return;
  }
  for (const child of node.childNodes) collect(child, lines);
}

export function legalText(html) {
  const lines = [];
  collect(parse(html, PARSE_OPTIONS), lines);
  return lines.join("\n") + "\n";
}

export function mainHtml(file) {
  const main = parse(readFileSync(file, "utf8"), PARSE_OPTIONS).querySelector("main");
  if (!main) throw new Error(`No <main> in ${file}`);
  return main.outerHTML;
}

function writeSnapshots() {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  for (const name of LEGAL_PAGES) {
    const source = path.join(ROOT, "public", `${name}.html`);
    if (!existsSync(source)) {
      console.error(
        `${path.relative(ROOT, source)} no longer exists. The snapshots were frozen once, in Task 9; edit them by hand and explain why in the commit.`,
      );
      process.exit(1);
    }
    const text = legalText(mainHtml(source));
    const target = path.join(SNAPSHOT_DIR, `${name}.txt`);
    writeFileSync(target, text);
    console.log(`Wrote ${path.relative(ROOT, target)} (${text.split("\n").length - 1} lines)`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv.includes("--write")) {
    console.error('Usage: PATH="/opt/homebrew/bin:$PATH" node tests/helpers/legal-text.js --write');
    process.exit(1);
  }
  writeSnapshots();
}
