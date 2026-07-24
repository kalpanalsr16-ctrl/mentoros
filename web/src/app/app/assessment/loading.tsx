import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton matching AssessmentFeedbackCard's shape, per docs/ui-architecture/02_Student_Experience.md's Assessment History Loading state. */
export default function AssessmentHistoryLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading assessment history" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
      ))}
    </div>
  );
}
