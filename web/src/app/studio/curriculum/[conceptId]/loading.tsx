import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ConceptDetailLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={20} label="Loading" />
      <Skeleton width={320} height={40} label="Loading concept" />
      <div className={styles.itemList}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
