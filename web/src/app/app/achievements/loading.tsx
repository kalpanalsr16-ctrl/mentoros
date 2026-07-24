import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton grid, per docs/ui-architecture/02_Student_Experience.md's Achievements Loading state. */
export default function AchievementsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading achievements" />
      <div className={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={120} height={36} radius="var(--radius-full)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
