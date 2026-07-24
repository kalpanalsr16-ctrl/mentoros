"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  resolveTheme,
  THEME_STORAGE_KEY,
  noFlashThemeScript,
  type ThemePreference,
  type ResolvedTheme,
} from "./resolve-theme";

export { resolveTheme, noFlashThemeScript, type ThemePreference, type ResolvedTheme };

// A minimal external store for the persisted preference: `useSyncExternalStore`
// needs something to subscribe to that updates synchronously outside of
// React, per docs/design-system's own reasoning against setState-in-effect.
// `window`'s native "storage" event only fires in OTHER tabs, so writes
// made in this tab notify `listeners` directly (see `setPreference` below).
const listeners = new Set<() => void>();

function readStoredPreference(): ThemePreference {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function subscribeToPreference(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setPreference(next: ThemePreference) {
  window.localStorage.setItem(THEME_STORAGE_KEY, next);
  listeners.forEach((listener) => listener());
}

function usePreference(): ThemePreference {
  return useSyncExternalStore(subscribeToPreference, readStoredPreference, () => "system");
}

function useSystemPrefersDark(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );
}

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Theme system (Sprint 1 scope): reads/persists an explicit light/dark/
 * system preference, applies it as `data-theme` on <html> (which
 * design-system/tokens/tokens.css's `[data-theme]` selectors respond
 * to), and stays in sync with OS-level changes when preference is
 * "system", and with changes made in other tabs. Wraps the whole app
 * once, in app/layout.tsx.
 *
 * The `data-theme` DOM attribute itself is set synchronously by the
 * inline `noFlashThemeScript` before React ever mounts (see
 * app/layout.tsx) — this provider's job is keeping React's own state
 * (and therefore ThemeToggle's UI) in sync after that, not the initial
 * paint.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const preference = usePreference();
  const systemPrefersDark = useSystemPrefersDark();
  const resolvedTheme = resolveTheme(preference, systemPrefersDark);

  // Keeps the DOM attribute in sync with subsequent React-driven changes
  // (e.g. ThemeToggle). This is exactly what useEffect is for --
  // synchronizing an external system (the DOM) with React state -- and
  // doesn't call setState, so it doesn't trip the same lint rule the
  // state reads above were rewritten to satisfy.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", resolvedTheme);
  }, [resolvedTheme]);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
