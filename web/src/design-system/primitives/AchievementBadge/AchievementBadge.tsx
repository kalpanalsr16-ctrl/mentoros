"use client";

import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import styles from "./AchievementBadge.module.css";

export type AchievementBadgeProps = {
  icon: ReactNode;
  label: string;
  /**
   * Achievements grid only (Epic F7) -- when provided, plays the
   * `duration-celebratory` motion (design system §17.3) once per device,
   * the first time this key is seen (tracked in localStorage), then never
   * again. The Dashboard's streak badge omits this prop entirely and
   * keeps behaving exactly as it did before F7 -- this is additive, not a
   * change to that existing call site.
   */
  celebrateKey?: string;
};

/**
 * Minimal version of the pattern named in docs/ui-architecture/
 * 02_Student_Experience.md's Dashboard section -- just enough for the
 * Dashboard's streak display. The full Achievements screen (milestone
 * grid, `duration-celebratory` first-view motion, doc §07's Epic F7) is
 * its own later task; this doesn't anticipate that design, just doesn't
 * block on it either.
 */
export function AchievementBadge({ icon, label, celebrateKey }: AchievementBadgeProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Direct DOM manipulation, not React state -- this is a one-time,
  // non-reactive trigger (has this device ever seen this achievement
  // before?), not UI state that needs to re-render anything else.
  useEffect(() => {
    if (!celebrateKey || !ref.current) return;
    const seenKey = `mentoros:achievement-seen:${celebrateKey}`;
    if (!window.localStorage.getItem(seenKey)) {
      ref.current.classList.add(styles.celebrate);
      window.localStorage.setItem(seenKey, "1");
    }
  }, [celebrateKey]);

  return (
    <div ref={ref} className={styles.badge}>
      <span className={styles.icon} aria-hidden="true">
        {icon}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
