import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

export default function AssistantLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={220} height={40} label="Loading" />
      <Skeleton width={360} height={20} label="Loading" />
      <div className={styles.chatShell}>
        <div className={styles.messages}>
          <Skeleton width="50%" height={44} radius="var(--radius-md)" label="Loading conversation" />
          <Skeleton width="70%" height={44} radius="var(--radius-md)" label="Loading conversation" />
        </div>
        <Skeleton width="100%" height={72} radius="0" label="Loading message input" />
      </div>
    </div>
  );
}
