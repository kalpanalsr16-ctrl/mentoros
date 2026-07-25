import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function ChatLoading() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Skeleton width={100} height={20} label="Loading" />
        <Skeleton width={160} height={20} label="Loading" />
      </header>
      <div className={styles.loadingBody}>
        <Skeleton width="60%" height={44} radius="var(--radius-md)" label="Loading conversation" />
        <Skeleton width="45%" height={44} radius="var(--radius-md)" label="Loading conversation" />
        <Skeleton width="100%" height={56} radius="var(--radius-md)" label="Loading message input" />
      </div>
    </div>
  );
}
