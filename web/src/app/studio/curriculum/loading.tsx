import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function CurriculumLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={260} height={40} label="Loading curriculum" />
      <div className={styles.chapterList}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="100%" height={72} radius="var(--radius-md)" label="Loading" />
        ))}
      </div>
    </div>
  );
}
