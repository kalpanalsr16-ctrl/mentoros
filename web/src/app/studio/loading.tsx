import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton matching the action-tile/StatTile layout, per docs/design-system/05-Motion-And-States.md §19.1's rule. */
export default function StudioDashboardLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading studio" />
      <div className={styles.actionGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
      <div className={styles.statGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
