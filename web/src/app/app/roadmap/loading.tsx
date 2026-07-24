import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton in the roadmap's node-and-line shape, per docs/ui-architecture/02_Student_Experience.md's Learning Roadmap Loading state. */
export default function RoadmapLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading roadmap" />
      <div className={styles.skeletonRow}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width={56} height={56} radius="var(--radius-full)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
