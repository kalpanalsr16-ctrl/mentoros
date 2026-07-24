import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton form fields, per docs/ui-architecture/02_Student_Experience.md's Settings Loading state. */
export default function SettingsLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading settings" />
      {Array.from({ length: 2 }).map((_, i) => (
        <Skeleton key={i} width={360} height={48} radius="var(--radius-md)" label="Loading" />
      ))}
    </div>
  );
}
