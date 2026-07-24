import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function MisconceptionsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={280} height={40} label="Loading misconception reports" />
      <div className={styles.list}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={64} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
