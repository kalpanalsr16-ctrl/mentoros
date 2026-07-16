/**
 * Responsive breakpoints. See
 * docs/design-system/02-Technical-Design-Foundations.md §6/§15.
 *
 * These are the single source of truth for both CSS Module media
 * queries (hand-written against these pixel values, since CSS custom
 * properties can't be used inside `@media` conditions) and the
 * `useMediaQuery` hook (`design-system/hooks/use-media-query.ts`) for
 * the rare cases that need JS-level responsive branching rather than
 * pure CSS.
 */

export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;

export const mediaQuery = {
  sm: `(min-width: ${breakpoints.sm}px)`,
  md: `(min-width: ${breakpoints.md}px)`,
  lg: `(min-width: ${breakpoints.lg}px)`,
  xl: `(min-width: ${breakpoints.xl}px)`,
} as const;
