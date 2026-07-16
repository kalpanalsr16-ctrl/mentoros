import type { HTMLAttributes, ReactNode } from "react";
import styles from "./Card.module.css";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

/** Base container for nearly every composed pattern — docs/design-system/03-Component-Library.md §7.2. */
export function Card({ children, className, ...rest }: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
