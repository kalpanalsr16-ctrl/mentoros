import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ClassOverviewLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={100} height={20} label="Loading" />
      <Skeleton width={220} height={40} label="Loading class" />
      <div className={styles.statGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
      <div className={styles.rosterList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={56} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
