import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function LessonDetailLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={20} label="Loading" />
      <Skeleton width={320} height={40} label="Loading lesson" />
      <Skeleton width="100%" height={300} radius="var(--radius-md)" label="Loading editor" />
    </div>
  );
}
