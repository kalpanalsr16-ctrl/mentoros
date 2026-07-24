"use client";

import { useSyncExternalStore } from "react";
import { mediaQuery, type Breakpoint } from "@/design-system/tokens/breakpoints";

/**
 * Responsive framework, JS side. CSS Modules using the documented
 * breakpoints directly (docs/design-system/02-Technical-Design-Foundations.md
 * §6/§15) remain the default mechanism for pure styling — this hook is
 * only for the cases that need to change *what renders*, not just how it
 * looks (e.g. Teacher Studio's sidebar collapsing to a bottom tab bar
 * below `md`, per docs/design-system/04-UX-Design-Experiences.md §9.2).
 *
 * Built on `useSyncExternalStore` (React's documented mechanism for
 * subscribing to a browser API like `matchMedia`) rather than
 * useState+useEffect, specifically to avoid setting state synchronously
 * inside an effect body — `getServerSnapshot` returns `false` so SSR and
 * the first client render agree, then the real value takes over.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Convenience wrapper over the documented breakpoint tokens. */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  return useMediaQuery(mediaQuery[breakpoint]);
}

/**
 * Accessibility Guidelines §16's reduced-motion requirement, as a hook —
 * the global CSS rule in app/globals.css handles the blanket case;
 * this exists for components that branch their *behavior* (e.g. skip an
 * entrance animation's JS-driven sequencing entirely), not just duration.
 */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
