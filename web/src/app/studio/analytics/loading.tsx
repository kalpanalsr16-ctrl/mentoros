import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ProgressAnalyticsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={40} label="Loading reports" />
      <div className={styles.statGrid}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
      <Skeleton width="100%" height={220} radius="var(--radius-md)" label="Loading chart" />
    </div>
  );
}
