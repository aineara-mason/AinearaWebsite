// Shared helpers for tests that read the built site in _site/.
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const SITE_DIR = path.join(ROOT, "_site");
export const PUBLIC_DIR = path.join(ROOT, "public");

// Every file under `dir`, recursively, dotfiles included, as sorted POSIX
// paths relative to `dir` (for example "css/style.css").
export function listFiles(dir) {
  const files = [];
  const walk = (absDir, relDir) => {
    for (const entry of readdirSync(absDir, { withFileTypes: true })) {
      const rel = relDir ? `${relDir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path.join(absDir, entry.name), rel);
      else files.push(rel);
    }
  };
  walk(dir, "");
  return files.sort();
}

// Finder litter that never belongs in the site: .DS_Store anywhere in the
// path, and "Copy 2" duplicates such as "index 2.html" or "style 2.css".
export function isJunk(rel) {
  return rel.split("/").includes(".DS_Store") || / 2(\.[^/]*)?$/.test(path.posix.basename(rel));
}
