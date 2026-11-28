// Light / dark theme. "auto" follows Telegram's own theme (or the phone's setting outside Telegram).
// The choice is a per-device convenience, so it lives in localStorage.
const tg = window.Telegram?.WebApp;
const KEY = "theme";
export const THEMES = ["auto", "light", "dark"];

// Page background in each theme: also given to Telegram, so its header and the
// area around the mini app match the page instead of flashing white
const PAGE_BG = { light: "#f8fafc", dark: "#0c1322" };

export function getThemePref() {
  try {
    const saved = localStorage.getItem(KEY);
    return THEMES.includes(saved) ? saved : "auto";
  } catch {
    return "auto";
  }
}

function systemIsDark() {
  if (tg?.colorScheme) return tg.colorScheme === "dark";
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(pref = getThemePref()) {
  const dark = pref === "dark" || (pref === "auto" && systemIsDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.backgroundColor = dark ? PAGE_BG.dark : PAGE_BG.light;

  if (tg?.isVersionAtLeast?.("6.1")) {
    const bg = dark ? PAGE_BG.dark : PAGE_BG.light;
    tg.setHeaderColor?.(bg);
    tg.setBackgroundColor?.(bg);
  }
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    // private mode etc.: the theme still applies for this session
  }
  applyTheme(pref);
}

// Call once at startup. Re-applies when Telegram or the phone switches theme.
export function initTheme() {
  applyTheme();
  tg?.onEvent?.("themeChanged", () => applyTheme());
  window.matchMedia?.("(prefers-color-scheme: dark)").addEventListener?.("change", () => applyTheme());
}
