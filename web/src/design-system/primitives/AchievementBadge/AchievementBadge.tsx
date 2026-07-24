import type { ReactNode } from "react";
import styles from "./AchievementBadge.module.css";

export type AchievementBadgeProps = {
  icon: ReactNode;
  label: string;
};

/**
 * Minimal version of the pattern named in docs/ui-architecture/
 * 02_Student_Experience.md's Dashboard section -- just enough for the
 * Dashboard's streak display. The full Achievements screen (milestone
 * grid, `duration-celebratory` first-view motion, doc §07's Epic F7) is
 * its own later task; this doesn't anticipate that design, just doesn't
 * block on it either.
 */
export function AchievementBadge({ icon, label }: AchievementBadgeProps) {
  return (
    <div className={styles.badge}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
