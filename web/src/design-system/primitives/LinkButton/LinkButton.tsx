import type { ButtonHTMLAttributes, ReactNode } from "react";
import styles from "./LinkButton.module.css";

export type LinkButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: ReactNode;
  children: ReactNode;
};

/**
 * Small text-style action, distinct from Button's primary/secondary/ghost
 * variants -- for low-emphasis per-item affordances (docs/ui-architecture/
 * 05_Chat_Experience.md's "message actions" row: Copy, Regenerate, View
 * reasoning). Only "View reasoning" is wired up as of Sprint 3; this
 * primitive exists so the others have somewhere consistent to land later,
 * not because they're built now.
 */
export function LinkButton({ icon, children, className, ...rest }: LinkButtonProps) {
  const classes = [styles.link, className].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
