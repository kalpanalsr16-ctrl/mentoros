import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function HomeworkGeneratorLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={260} height={40} label="Loading homework generator" />
      <Skeleton width="100%" height={44} radius="var(--radius-md)" label="Loading" />
      <Skeleton width="100%" height={44} radius="var(--radius-md)" label="Loading" />
    </div>
  );
}
