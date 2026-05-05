export type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "interactive-gpx-theme";
const THEME_MODES = new Set<ThemeMode>(["system", "light", "dark"]);

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

export function applyThemeMode(mode: ThemeMode) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = mode;
}

export function persistThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (mode === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
    }
  } catch {
    // Theme persistence is nice-to-have; private browsing storage failures should not block the app.
  }
}

function isThemeMode(value: string | null): value is ThemeMode {
  return Boolean(value && THEME_MODES.has(value as ThemeMode));
}
