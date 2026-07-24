import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton card list, per docs/ui-architecture/02_Student_Experience.md's Revision Planner Loading state. */
export default function RevisionLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading revision plan" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={64} radius="var(--radius-md)" label="Loading" />
      ))}
    </div>
  );
}
