// scripts/make-static-images.js
//
// Makes the favicon PNGs and the 1200x630 link-preview images:
//   src/assets/img/favicon-32.png         32x32, from favicon.svg
//   src/assets/img/apple-touch-icon.png   180x180, opaque, from favicon.svg
//   src/assets/img/og/home.png, og/ascend.png, og/sillage.png
// Run it locally on macOS with `npm run images`, look at every PNG, and
// commit them. The Eleventy build never runs it.
//
// Text is drawn as SVG <text> and rasterized by sharp's librsvg, which finds
// the Mac's system fonts through fontconfig
// (https://sharp.pixelplumbing.com/install/, "Fonts"). The self-hosted Inter
// woff2 can't be used here: sharp's libvips builds FreeType with brotli
// disabled, and WOFF2 needs brotli
// (https://github.com/lovell/sharp-libvips/blob/v1.3.4/build/posix.sh).
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import copy from "../src/_data/copy.js";
import tokens from "../src/_data/tokens.js";

if (process.versions.bun) throw new Error('Run with real Node: PATH="/opt/homebrew/bin:$PATH"');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const IMG_DIR = path.join(ROOT, "src/assets/img");
const OG_DIR = path.join(IMG_DIR, "og");
const FAVICON_SVG = path.join(IMG_DIR, "favicon.svg");
const ASCEND_MARK = path.join(ROOT, "src/_images/ascend/AscendMark.png");

const OG = { width: 1200, height: 630, pad: 80 };
const SANS = "Helvetica Neue, Helvetica, Arial, sans-serif";
const WORDMARK = "AINEARA"; // the nav wordmark "Aineara", uppercased as site.css shows it

const esc = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// "Train smarter. Eat better. Go further." -> ["Train smarter.", "Eat better.", "Go further."]
const sentences = (text) => text.match(/[^.]+\.?/g).map((part) => part.trim()).filter(Boolean);

// SVG <text> elements, one per line; the last line sits on the `last` baseline.
function textLines(lines, { x, last, size, weight, family, fill, tracking = "0em", anchor = "start" }) {
  const step = Math.round(size * tokens.leading.display);
  const letterSpacing = (size * parseFloat(tracking)).toFixed(2);
  return lines
    .map(
      (line, i) =>
        `<text x="${x}" y="${last - (lines.length - 1 - i) * step}" text-anchor="${anchor}" ` +
        `font-family="${esc(family)}" font-size="${size}" font-weight="${weight}" ` +
        `letter-spacing="${letterSpacing}" fill="${fill}">${esc(line)}</text>`,
    )
    .join("");
}

function ogSvg({ fill, defs = "", body }) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG.width}" height="${OG.height}" viewBox="0 0 ${OG.width} ${OG.height}">` +
      `${defs}<rect width="${OG.width}" height="${OG.height}" fill="${fill}"/>${body}</svg>`,
  );
}

async function save(pipeline, file, width, height) {
  const info = await pipeline.png({ compressionLevel: 9 }).toFile(file);
  const rel = path.relative(ROOT, file);
  if (info.width !== width || info.height !== height) {
    throw new Error(`${rel} came out ${info.width}x${info.height}, expected ${width}x${height}`);
  }
  console.log(`wrote ${rel} (${width}x${height}, ${info.size} bytes)`);
}

async function favicons() {
  const source = await readFile(FAVICON_SVG, "utf8");
  // Rasterize the light version (black tile, white A). Dropping the dark block
  // keeps the PNGs independent of how librsvg handles media queries.
  const light = source.replace(/@media \(prefers-color-scheme: dark\) \{[\s\S]*?\}\s*\}/, "");
  if (light === source) throw new Error("favicon.svg has no @media (prefers-color-scheme: dark) block");
  const svg = Buffer.from(light);
  await save(sharp(svg, { density: 72 }).resize(32, 32), path.join(IMG_DIR, "favicon-32.png"), 32, 32);
  // iOS rounds the corners itself, so fill them: the touch icon is an opaque square.
  await save(
    sharp(svg, { density: (72 * 180) / 32 }).resize(180, 180).flatten({ background: tokens.studio.dark.page }),
    path.join(IMG_DIR, "apple-touch-icon.png"),
    180,
    180,
  );
}

async function ogHome() {
  const studio = tokens.studio.dark;
  const body =
    textLines([WORDMARK], {
      x: OG.pad, last: OG.pad + 26, size: 26, weight: tokens.weight.label,
      family: SANS, fill: studio.text, tracking: tokens.tracking.label,
    }) +
    textLines(sentences(copy["og.home"]), {
      x: OG.pad, last: OG.height - OG.pad, size: 80, weight: tokens.weight.display,
      family: SANS, fill: studio.text, tracking: tokens.tracking.display,
    });
  await save(sharp(ogSvg({ fill: studio.page, body })), path.join(OG_DIR, "home.png"), OG.width, OG.height);
}

async function ogAscend() {
  const ascend = tokens.ascend;
  const markSize = 144;
  const defs =
    `<defs><linearGradient id="surface" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${ascend.surfaceTop}"/><stop offset="1" stop-color="${ascend.surfaceBottom}"/>` +
    `</linearGradient></defs>`;
  const body = textLines(sentences(copy["og.ascend"]), {
    x: OG.pad, last: OG.height - OG.pad, size: 80, weight: tokens.weight.display,
    family: SANS, fill: ascend.text, tracking: tokens.tracking.display,
  });
  const mark = await sharp(ASCEND_MARK).resize(markSize, markSize).png().toBuffer();
  await save(
    sharp(ogSvg({ fill: "url(#surface)", defs, body })).composite([{ input: mark, left: OG.pad, top: OG.pad }]),
    path.join(OG_DIR, "ascend.png"),
    OG.width,
    OG.height,
  );
}

async function ogSillage() {
  const sillage = tokens.sillage.dark;
  const [name, ...rest] = sentences(copy["og.sillage"]); // "Sillage.", "In development."
  const inset = 48;
  const centre = OG.width / 2;
  const family = tokens.font.sillageDisplay;
  const weight = tokens.weight.sillageDisplay;
  const body =
    `<rect x="${inset}" y="${inset}" width="${OG.width - 2 * inset}" height="${OG.height - 2 * inset}" ` +
    `fill="none" stroke="${sillage.hairline}" stroke-width="2"/>` +
    textLines([name], { x: centre, last: 318, size: 120, weight, family, fill: sillage.text, anchor: "middle" }) +
    textLines([rest.join(" ")], { x: centre, last: 398, size: 44, weight, family, fill: sillage.gold, anchor: "middle" });
  await save(sharp(ogSvg({ fill: sillage.page, body })), path.join(OG_DIR, "sillage.png"), OG.width, OG.height);
}

await mkdir(OG_DIR, { recursive: true });
await favicons();
await ogHome();
await ogAscend();
await ogSillage();
