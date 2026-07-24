import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton table/card rows, per docs/ui-architecture/02_Student_Experience.md's Practice History Loading state. */
export default function PracticeHistoryLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading practice history" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
      ))}
    </div>
  );
}
