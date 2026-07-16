/**
 * Motion tokens. See docs/design-system/05-Motion-And-States.md §17.
 *
 * Every consumer of these tokens MUST also respect
 * `prefers-reduced-motion` (see `useReducedMotion` in
 * `design-system/hooks/use-media-query.ts`) — that pairing is a hard
 * requirement per the Accessibility Guidelines, not optional per-component.
 */

export const duration = {
  instant: "100ms",
  fast: "150ms",
  base: "220ms",
  slow: "360ms",
  /** Reserved for achievement/celebration moments only — see doc §17.3. */
  celebratory: "600ms",
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const;
