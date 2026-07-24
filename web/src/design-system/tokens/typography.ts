/**
 * Typography tokens. See
 * docs/design-system/02-Technical-Design-Foundations.md §4.
 *
 * Two registers, on purpose: Fraunces for display/celebratory moments,
 * Geist Sans/Mono for everything structural. Font loading itself happens
 * in app/layout.tsx via next/font — this file only names the CSS
 * variables next/font produces, so components can reference them without
 * importing next/font directly.
 */

export const fontFamily = {
  display: "var(--font-fraunces)",
  sans: "var(--font-geist-sans)",
  mono: "var(--font-geist-mono)",
} as const;

export type TypeScaleToken =
  | "displayXl"
  | "display2xl"
  | "displayLg"
  | "headingLg"
  | "headingMd"
  | "headingSm"
  | "bodyLg"
  | "bodyMd"
  | "bodySm"
  | "caption"
  | "monoMd"
  | "monoSm";

/** Matches doc §4.2's table exactly — kept as data so a contrast/scale audit can iterate it. */
export const typeScale: Record<TypeScaleToken, { size: string; lineHeight: string }> = {
  display2xl: { size: "3rem", lineHeight: "1.1" },
  displayXl: { size: "2.25rem", lineHeight: "1.15" },
  displayLg: { size: "1.75rem", lineHeight: "1.2" },
  headingLg: { size: "1.5rem", lineHeight: "1.3" },
  headingMd: { size: "1.25rem", lineHeight: "1.35" },
  headingSm: { size: "1.0625rem", lineHeight: "1.4" },
  bodyLg: { size: "1.125rem", lineHeight: "1.6" },
  bodyMd: { size: "1rem", lineHeight: "1.6" },
  bodySm: { size: "0.875rem", lineHeight: "1.5" },
  caption: { size: "0.75rem", lineHeight: "1.4" },
  monoMd: { size: "0.875rem", lineHeight: "1.5" },
  monoSm: { size: "0.75rem", lineHeight: "1.4" },
};
