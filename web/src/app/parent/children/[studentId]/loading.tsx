import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ChildDetailLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={160} height={20} label="Loading" />
      <Skeleton width={320} height={80} label="Loading child detail" />
    </div>
  );
}
