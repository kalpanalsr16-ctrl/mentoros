import { type ButtonHTMLAttributes, forwardRef } from "react";
import { Spinner } from "@/design-system/primitives/Spinner";
import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Replaces the label with a Spinner and disables the button — never
   * disables silently without this visual explanation
   * (docs/design-system/03-Component-Library.md §7.2). */
  loading?: boolean;
};

/**
 * The one Button for the whole system — four variants, two sizes, per
 * docs/design-system/03-Component-Library.md §7.2. `danger` is reserved
 * for genuinely destructive actions only.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading = false, disabled, children, className, ...rest }, ref) => {
    const classes = [styles.button, styles[variant], size === "sm" ? styles.sm : "", className]
      .filter(Boolean)
      .join(" ");

    return (
      <button ref={ref} className={classes} disabled={disabled || loading} {...rest}>
        {loading ? <Spinner size={16} label="Loading" /> : children}
      </button>
    );
  },
);

Button.displayName = "Button";
