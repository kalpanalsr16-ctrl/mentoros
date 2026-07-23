import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ParentDashboardLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={24} label="Loading your children" />
      <Skeleton width="100%" height={64} radius="var(--radius-md)" label="Loading" />
    </div>
  );
}
