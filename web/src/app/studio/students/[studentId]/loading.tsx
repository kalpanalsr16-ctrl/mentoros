import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function StudentOverviewLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={100} height={20} label="Loading" />
      <Skeleton width={260} height={40} label="Loading student" />
      <div className={styles.conceptGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={80} height={80} radius="50%" label="Loading" />
        ))}
      </div>
    </div>
  );
}
