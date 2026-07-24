import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton ring grid, per docs/ui-architecture/02_Student_Experience.md's Progress Loading state. */
export default function ProgressLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading progress" />
      <div className={styles.conceptGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} width={56} height={56} radius="var(--radius-full)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
