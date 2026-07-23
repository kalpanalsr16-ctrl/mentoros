import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function AssessmentsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={220} height={40} label="Loading assessments" />
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={64} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
