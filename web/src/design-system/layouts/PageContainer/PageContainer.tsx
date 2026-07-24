import type { ReactNode } from "react";
import styles from "./PageContainer.module.css";

export type PageContainerProps = {
  children: ReactNode;
  /** Caps width at 720px (chat's reading-comfort width) instead of the
   * default 1200px — see docs/design-system/02-Technical-Design-Foundations.md
   * §6's grid note. */
  narrow?: boolean;
  as?: "div" | "main" | "section";
};

/** Layout Rules' shared content-width mechanism — every page template uses this. */
export function PageContainer({ children, narrow = false, as: Tag = "div" }: PageContainerProps) {
  const classes = [styles.container, narrow ? styles.narrow : ""].filter(Boolean).join(" ");
  return <Tag className={classes}>{children}</Tag>;
}
