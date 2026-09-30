// Shared helpers for the tests that read the built site in _site/.
// Task 1 exports: ROOT, SITE_DIR, PUBLIC_DIR, listFiles, isJunk.
// Task 4 exports: PAGES, readHtml, isTemplated, templatedPages,
// resolveReference, norm, pageStrings.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "node-html-parser";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const SITE_DIR = path.join(ROOT, "_site");
export const PUBLIC_DIR = path.join(ROOT, "public");

// Every file under dir, as sorted POSIX paths relative to dir, dotfiles included.
export function listFiles(dir) {
  const files = [];
  const walk = (absolute, relative) => {
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const rel = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(absolute, entry.name), rel);
      else files.push(rel);
    }
  };
  walk(dir, "");
  return files.sort();
}

// macOS litter: a .DS_Store anywhere in the path, or a Finder duplicate
// such as "index 2.html" or "notes 2".
export function isJunk(rel) {
  return rel.split("/").includes(".DS_Store") || / 2(\.[^/]*)?$/.test(path.posix.basename(rel));
}

export const PAGES = ["index.html", "ascend.html", "sillage.html", "privacy.html", "terms.html", "support.html", "404.html"];

// Script and style bodies stay raw text; <noscript> children are parsed as
// HTML so the no-JS signup note can be queried.
export function readHtml(rel, dir = SITE_DIR) {
  return parse(readFileSync(path.join(dir, rel), "utf8"), {
    blockTextElements: { script: true, style: true },
  });
}

export function isTemplated(root) {
  const generator = root.querySelector('meta[name="generator"]');
  return (generator?.getAttribute("content") ?? "").startsWith("Eleventy");
}

export function templatedPages(dir = SITE_DIR) {
  return PAGES.filter((rel) => existsSync(path.join(dir, rel)) && isTemplated(readHtml(rel, dir)));
}

function isFile(file) {
  return existsSync(file) && statSync(file).isFile();
}

const EXTERNAL = /^(?:https?:|mailto:|tel:|data:|\/\/)/i;

// Resolves an href, src or srcset URL the way Cloudflare Pages serves _site:
// "/" is index.html, "/x" is x.html, else the file x, else x/index.html.
// Returns null for references the site doesn't serve (other origins, mail,
// phone, data URLs, the /api/subscribe function). Otherwise returns
// { file, fragment }, where file is the matching path relative to dir, or
// null when nothing matches.
export function resolveReference(ref, fromRel, dir = SITE_DIR) {
  const raw = String(ref).trim();
  if (EXTERNAL.test(raw)) return null;
  const hashAt = raw.indexOf("#");
  const fragment = hashAt === -1 ? "" : decodeURIComponent(raw.slice(hashAt + 1));
  let target = hashAt === -1 ? raw : raw.slice(0, hashAt);
  const queryAt = target.indexOf("?");
  if (queryAt !== -1) target = target.slice(0, queryAt);
  if (target === "/api/subscribe") return null;
  if (target === "") return { file: fromRel, fragment };
  const absolute = target.startsWith("/") ? target : path.posix.join("/", path.posix.dirname(fromRel), target);
  const clean = decodeURIComponent(path.posix.normalize(absolute)).replace(/^\/+/, "");
  let candidates;
  if (clean === "") candidates = ["index.html"];
  else if (clean.endsWith("/")) candidates = [`${clean}index.html`];
  else candidates = [`${clean}.html`, clean, `${clean}/index.html`];
  const file = candidates.find((candidate) => isFile(path.join(dir, candidate))) ?? null;
  return { file, fragment };
}

export function norm(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

const STRING_ATTRIBUTES = new Set(["alt", "aria-label", "title", "placeholder", "content"]);

// Everything a visitor or a screen reader can meet on a page, normalized:
// the text, the <title>, and the alt, aria-label, title, placeholder,
// content and data-* attribute values. One string, one entry per line.
export function pageStrings(root) {
  const parts = [norm(root.text), norm(root.querySelector("title")?.text)];
  for (const element of root.querySelectorAll("*")) {
    for (const [name, value] of Object.entries(element.attributes)) {
      const key = name.toLowerCase();
      if (STRING_ATTRIBUTES.has(key) || key.startsWith("data-")) parts.push(norm(value));
    }
  }
  return parts.filter(Boolean).join("\n");
}
