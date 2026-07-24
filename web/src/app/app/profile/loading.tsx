import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/** Skeleton form fields, per docs/ui-architecture/02_Student_Experience.md's Profile Loading state. */
export default function ProfileLoading() {
  return (
    <div className={styles.page}>
      <Skeleton width={200} height={40} label="Loading profile" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} width="100%" height={48} radius="var(--radius-md)" label="Loading" />
      ))}
    </div>
  );
}
