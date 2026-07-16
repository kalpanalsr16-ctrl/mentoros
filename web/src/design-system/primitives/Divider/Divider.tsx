import styles from "./Divider.module.css";

export type DividerProps = {
  orientation?: "horizontal" | "vertical";
};

/** 1px, `ink-200` — see docs/design-system/03-Component-Library.md §7.2. */
export function Divider({ orientation = "horizontal" }: DividerProps) {
  const classes = [styles.divider, orientation === "vertical" ? styles.vertical : styles.horizontal].join(" ");
  // <hr> carries an implicit horizontal-only semantic in most assistive
  // tech, so a vertical divider uses role="separator" instead, per WAI-ARIA.
  if (orientation === "vertical") {
    return <div className={classes} role="separator" aria-orientation="vertical" />;
  }
  return <hr className={classes} />;
}
