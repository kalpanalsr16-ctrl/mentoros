/**
 * Color tokens — source of truth, mirrored as CSS custom properties in
 * `tokens.css`. See docs/design-system/02-Technical-Design-Foundations.md
 * §3 for the full rationale. Keep this file and `tokens.css` in sync by
 * hand; there are few enough tokens that generating one from the other
 * would be more machinery than the problem warrants right now.
 */

export const brand = {
  indigo900: "#211D5C",
  indigo700: "#423E99",
  indigo500: "#5750B8",
  indigo300: "#8B85D6",
  indigo100: "#E8E6F7",
} as const;

/** Reserved for genuine achievement/encouragement moments only — see doc §3.3. */
export const accent = {
  amber700: "#A8641A",
  amber500: "#D9971F",
  amber300: "#F0C878",
  amber100: "#FBF0DC",
} as const;

export const ink = {
  ink950: "#14132B",
  ink800: "#2B2A4A",
  ink600: "#4E4C72",
  ink400: "#8987A8",
  ink300: "#B3B1CB",
  ink200: "#D7D6E6",
  ink100: "#EDECF5",
  ink050: "#F7F6FB",
  ink000: "#FFFFFF",
} as const;

export const semantic = {
  success600: "#2F8F5B",
  success100: "#E1F5EA",
  warning600: "#C15A1E",
  warning100: "#FBE4D3",
  // Adjusted from the originally-proposed #C4483C during Sprint 1 -- that
  // value only reached 3.89:1 against danger100, failing the WCAG AA
  // body-text floor this system commits to (see web/tests/contrast.test.ts).
  // Still a deliberately brick-red, non-alarm-coded danger color, just
  // darker; docs/design-system/02-Technical-Design-Foundations.md §3.5
  // should be amended to match when next revised.
  danger600: "#A83A2F",
  danger100: "#FAE1DE",
  info600: "#3B7FC4",
  info100: "#DDEBFA",
  /** Dedicated to Safety Agent gate states only — never reused for generic errors. */
  safety600: "#4A6580",
  safety100: "#E4EBF0",
} as const;

export const colors = { brand, accent, ink, semantic } as const;
