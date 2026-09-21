import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./loading.module.css";

/**
 * Renders inside ChatLayout's LearnerShell automatically (Next.js's
 * loading.tsx convention) -- Header/Sidebar are already visible while
 * this shows, so this only needs the conversation-area skeleton, not a
 * second header.
 */
export default function ChatLoading() {
  return (
    <div className={styles.body}>
      <Skeleton width="60%" height={44} radius="var(--radius-md)" label="Loading conversation" />
      <Skeleton width="45%" height={44} radius="var(--radius-md)" label="Loading conversation" />
      <Skeleton width="100%" height={56} radius="var(--radius-md)" label="Loading message input" />
    </div>
  );
}
