import { readFileSync } from "node:fs";
import path from "node:path";
import Image from "@11ty/eleventy-img";

export const config = { dir: { input: "src", output: "_site", includes: "_includes", data: "_data" }, templateFormats: ["njk"], htmlTemplateEngine: "njk" };

// Inlines a Lucide icon from the installed lucide-static package (ISC; the
// licence is published at /assets/licenses/lucide-LICENSE.txt). Lucide's own
// class="lucide lucide-<name>" is kept, with "icon" merged into it, so the
// SVG never carries two class attributes; site.css swaps icons by those
// classes.
function lucideIcon(name) {
  const file = new URL(`./node_modules/lucide-static/icons/${name}.svg`, import.meta.url);
  const svg = readFileSync(file, "utf8")
    .replace(/^\s*<!--[\s\S]*?-->\s*/, "")
    .trim()
    .replace(/\s*\n\s*/g, " ");
  const classed = /^<svg\b[^>]*\sclass="/.test(svg)
    ? svg.replace(/^(<svg\b[^>]*?\s)class="/, '$1class="icon ')
    : svg.replace(/^<svg\b/, '<svg class="icon"');
  return classed.replace(/^<svg\b/, '<svg aria-hidden="true" focusable="false"');
}

export default function (eleventyConfig) {
  if (process.versions.bun) throw new Error("Run Eleventy with real Node: PATH=\"/opt/homebrew/bin:$PATH\"");

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy({
    "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2": "assets/fonts/inter-latin-wght-normal.woff2",
    "node_modules/@fontsource-variable/inter/LICENSE": "assets/licenses/inter-OFL.txt",
    "node_modules/lucide-static/LICENSE": "assets/licenses/lucide-LICENSE.txt",
  });
  // Neither is a template format, so they reach _site only through passthrough copy.
  eleventyConfig.addPassthroughCopy("src/_redirects");
  eleventyConfig.addPassthroughCopy("src/robots.txt");

  // Finder duplicates such as "index 2.njk" would render and clash on permalinks.
  eleventyConfig.ignores.add("src/**/* 2.*");

  // Cloudflare serves the flat files at clean URLs: /index.html is /, /ascend.html is /ascend.
  eleventyConfig.addFilter("cleanUrl", (u) => u.replace(/index\.html$/, "").replace(/\.html$/, ""));

  eleventyConfig.addShortcode("icon", lucideIcon);

  // T6: responsive WebP images from originals in src/_images/ (never published).
  eleventyConfig.addShortcode("image", async function (src, alt, widths, sizes, loading = "lazy", className = "") {
    if (alt === undefined) throw new Error(`image shortcode: missing alt for ${src} (pass "" for a decorative image)`);
    return Image(src, {
      widths,
      formats: ["webp"],
      outputDir: path.join(eleventyConfig.directories.output, "assets/img/"),
      urlPath: "/assets/img/",
      returnType: "html",
      htmlOptions: {
        imgAttributes: { alt, sizes, loading, decoding: "async", class: className },
        fallback: "largest",
      },
    });
  });
}
