/**
 * Spacing and radius tokens. See
 * docs/design-system/02-Technical-Design-Foundations.md §5.
 * 4px base unit — every value below is a multiple of 0.25rem.
 */

export const space = {
  space0: "0",
  space1: "0.25rem",
  space2: "0.5rem",
  space3: "0.75rem",
  space4: "1rem",
  space5: "1.25rem",
  space6: "1.5rem",
  space8: "2rem",
  space10: "2.5rem",
  space12: "3rem",
  space16: "4rem",
  space20: "5rem",
  space24: "6rem",
} as const;

export const radius = {
  radiusSm: "6px",
  radiusMd: "10px",
  radiusLg: "16px",
  radiusFull: "9999px",
} as const;
