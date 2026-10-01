// WCAG 2.1 colour maths for the contrast tests (Task 3) and the email
// colour check (Task 10).
// Relative luminance: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// Contrast ratio:     https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio

// "#RRGGBB", "#RGB", "rgb(r,g,b)", "rgba(r,g,b,a)" or an {r, g, b, a}
// object -> {r, g, b, a} with channels 0-255 and alpha 0-1. Anything out of
// range or malformed (NaN, "1.2.3") throws a TypeError rather than giving a
// ratio that looks like a pass.
export function parseColor(color) {
  const parsed = readColor(color);
  const inRange = (value, max) => Number.isFinite(value) && value >= 0 && value <= max;
  if (![parsed.r, parsed.g, parsed.b].every((channel) => inRange(channel, 255)) || !inRange(parsed.a, 1)) {
    throw new TypeError(`Colour out of range or malformed: ${JSON.stringify(color)}`);
  }
  return parsed;
}

function readColor(color) {
  if (color && typeof color === "object") {
    return { r: color.r, g: color.g, b: color.b, a: color.a ?? 1 };
  }
  const value = String(color).trim();
  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join("") : hex[1];
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
      a: 1,
    };
  }
  const rgb = value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }
  throw new TypeError(`Unsupported colour: ${color}`);
}

// Paints fg (which may be translucent) over an opaque bg and returns the
// opaque colour the eye sees.
export function composite(fg, bg) {
  const top = parseColor(fg);
  const bottom = parseColor(bg);
  if (bottom.a !== 1) throw new RangeError(`Background must be opaque: ${JSON.stringify(bg)}`);
  // Capped at 255: the float mix can land a hair above it (white at alpha
  // .061 over white gives 255.00000000000003), which parseColor would reject.
  const mix = (over, under) => Math.min(255, top.a * over + (1 - top.a) * under);
  return { r: mix(top.r, bottom.r), g: mix(top.g, bottom.g), b: mix(top.b, bottom.b), a: 1 };
}

export function relativeLuminance(color) {
  const { r, g, b, a } = parseColor(color);
  if (a !== 1) throw new RangeError(`Luminance needs an opaque colour: ${JSON.stringify(color)}`);
  // WCAG 2.1 has used 0.04045 here since May 2021 (it was 0.03928). For
  // 8-bit channels both thresholds give the same result.
  const linear = (channel) => {
    const s = channel / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

// fg may be rgba: it is composited over bg first. bg must be opaque.
export function contrastRatio(fg, bg) {
  const fgLuminance = relativeLuminance(composite(fg, bg));
  const bgLuminance = relativeLuminance(bg);
  return (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);
}
