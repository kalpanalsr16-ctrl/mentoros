import type { ReactNode } from "react";
import styles from "./Badge.module.css";

export type BadgeVariant = "neutral" | "brand" | "success" | "warning" | "danger" | "safety";

export type BadgeProps = {
  children: ReactNode;
  variant?: BadgeVariant;
};

/**
 * Status labels — mastery level, difficulty, risk level, standard codes.
 * `safety` is reserved for Safety Agent gate states only (docs/design-system
 * §3.5) — never reused for a generic "this is risky" label.
 */
export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}
