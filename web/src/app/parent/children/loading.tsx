import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ParentChildrenLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={220} height={40} label="Loading linked children" />
      <Skeleton width={360} height={140} radius="var(--radius-md)" label="Loading" />
    </div>
  );
}
