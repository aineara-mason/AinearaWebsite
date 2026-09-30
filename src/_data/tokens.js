// Every design value from spec §4.1–4.4
// (docs/superpowers/specs/2026-09-30-website-redesign-design.md:84-158).
// src/tokens.css.njk renders these as CSS custom properties at
// /assets/css/tokens.css, and tests/contrast.test.js checks every colour
// pair. Change a value here, never in the CSS.
export default {
  studio: {
    dark: {
      page: "#000000",
      section: "#0A0A0A",
      fill: "#1C1C1E",
      text: "#FAFAFA",
      textSecondary: "#8C8C8C",
      hairline: "rgba(255,255,255,.08)",
      fieldBorder: "#6E6E73",
      buttonBg: "#FAFAFA",
      buttonText: "#000000",
      error: "#FF6961",
    },
    light: {
      page: "#FFFFFF",
      section: "#F5F5F5",
      fill: "#F2F2F7",
      text: "#0A0A0A",
      textSecondary: "#666666",
      hairline: "rgba(0,0,0,.08)",
      fieldBorder: "#8A8A8E",
      buttonBg: "#0A0A0A",
      buttonText: "#FFFFFF",
      error: "#D70015",
    },
  },
  // Ascend sections look the same in both themes, as in the app.
  ascend: {
    surfaceTop: "#1C1C2E",
    surfaceBottom: "#0C1F3F",
    text: "#FFFFFF",
    textSecondary: "rgba(255,255,255,.75)",
    buttonBg: "#1A6CF6",
    buttonText: "#FFFFFF",
    buttonSecondaryBg: "rgba(255,255,255,.12)",
    buttonSecondaryText: "#FFFFFF",
    accent: "#4A90F8",
    accentOnLight: "#1560DC",
    // Not in the spec table: the navy scope ignores the theme, so it needs
    // its own error colour.
    error: "#FF6961",
  },
  sillage: {
    dark: {
      page: "#080808",
      surface: "#111110",
      text: "#F0EDE8",
      textSecondary: "#888683",
      gold: "#C9915A",
      buttonBg: "#C9915A",
      buttonText: "#080808",
      hairline: "rgba(201,145,90,.35)",
    },
    light: {
      page: "#F5F0E8",
      surface: "#F5F0E8",
      text: "#1A1714",
      textSecondary: "#6B6257",
      gold: "#8A5C28",
      buttonBg: "#B07840",
      buttonText: "#080808",
      hairline: "rgba(150,90,40,.25)",
    },
  },
  font: {
    sans: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
    sillageDisplay: "Georgia, serif",
  },
  text: {
    display: "clamp(2.5rem, 7vw, 5.5rem)",
    heading: "clamp(1.75rem, 4vw, 2.75rem)",
    cardTitle: "1.25rem",
    body: "1.0625rem",
    small: "0.9375rem",
    caption: "0.8125rem",
    label: "0.75rem",
  },
  weight: { display: 700, heading: 700, cardTitle: 600, label: 600, sillageDisplay: 400 },
  tracking: { display: "-0.03em", heading: "-0.02em", label: "0.14em" },
  leading: { display: 1.05, body: 1.55 },
  radius: { tile: "10px", field: "12px", button: "14px", card: "16px", hero: "24px", pill: "999px" },
  space: ["4px", "8px", "12px", "16px", "24px", "32px", "48px", "64px", "96px", "128px"],
  gutter: { phone: "16px", tablet: "24px", desktop: "40px" },
  container: { page: "1200px", reading: "760px" },
  breakpoint: { tablet: "768px", desktop: "1024px" },
  shadow: { screenshot: "0 6px 24px rgba(0,0,0,.15)" },
  motion: {
    durationState: "200ms",
    easeState: "ease",
    easeSpring: "cubic-bezier(0.16,1,0.3,1)",
    durationReveal: "0.5s",
    durationPulse: "1.4s",
  },
  focus: { width: "2px", offset: "3px" },
};
