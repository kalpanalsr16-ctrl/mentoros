import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ParentRequestsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={220} height={40} label="Loading parent requests" />
      <div className={styles.list}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
