// Pure theme helpers shared by site.js and the tests. The inline head script
// (src/_includes/scripts/theme-init.js) applies the same rules before first
// paint, and tests/theme.test.js keeps the two in step. Nothing here touches
// window or document at the top level, because Node imports this file.
export const THEME_KEY = "aineara-theme";
export const THEMES = Object.freeze(["dark", "light"]);

export function readSavedTheme(storage) {
  try {
    const value = storage.getItem(THEME_KEY);
    return THEMES.includes(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveTheme(storage, theme) {
  if (!THEMES.includes(theme)) return false;
  try {
    storage.setItem(THEME_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function resolveTheme(saved, prefersLight) {
  if (THEMES.includes(saved)) return saved;
  return prefersLight ? "light" : "dark";
}

export function otherTheme(theme) {
  return theme === "light" ? "dark" : "light";
}
