import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ChildDetailLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={20} label="Loading" />
      <Skeleton width={220} height={36} label="Loading child detail" />
      <Skeleton width="100%" height={140} radius="var(--radius-md)" label="Loading progress" />
    </div>
  );
}
