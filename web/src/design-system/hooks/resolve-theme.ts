/**
 * Pure theme-resolution logic, kept in its own .ts (no JSX) file so it
 * can be imported — by tests, or anything else — without pulling in
 * React/JSX at all. `use-theme.tsx` re-exports these for convenience;
 * import from here directly whenever JSX isn't otherwise needed.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "mentoros-theme-preference";

export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return preference;
}

/**
 * Inlined into app/layout.tsx via a `<script>` tag (not imported as a
 * module) so it runs synchronously before first paint — the standard
 * mechanism for avoiding a flash of the wrong theme on load, since
 * React itself can't apply the `data-theme` attribute until hydration.
 */
export const noFlashThemeScript = `
(function() {
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var preference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolved = preference === 'system' ? (systemPrefersDark ? 'dark' : 'light') : preference;
    document.documentElement.setAttribute('data-theme', resolved);
  } catch (e) {}
})();
`.trim();
