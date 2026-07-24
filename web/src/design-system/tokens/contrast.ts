/**
 * WCAG 2.1 contrast-ratio checking — pure functions, no DOM dependency,
 * so this can run in a unit test (see web/tests/contrast.test.ts) exactly
 * as docs/design-system/02-Technical-Design-Foundations.md §16 requires:
 * "every text/background token pairing... must resolve to >=4.5:1 for
 * body text, >=3:1 for large text."
 */

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const r = parseInt(normalized.substring(0, 2), 16);
  const g = parseInt(normalized.substring(2, 4), 16);
  const b = parseInt(normalized.substring(4, 6), 16);
  return [r, g, b];
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1 §1.4.3, in the 0-1 range. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const [rLin, gLin, bLin] = [r, g, b].map(channelToLinear);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

/** Contrast ratio between two colors, always >=1 regardless of argument order. */
export function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA);
  const lumB = relativeLuminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

export const WCAG_AA_BODY_TEXT = 4.5;
export const WCAG_AA_LARGE_TEXT = 3;

export function meetsAA(hexForeground: string, hexBackground: string, isLargeText = false): boolean {
  const ratio = contrastRatio(hexForeground, hexBackground);
  return ratio >= (isLargeText ? WCAG_AA_LARGE_TEXT : WCAG_AA_BODY_TEXT);
}
