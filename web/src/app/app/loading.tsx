import { PageContainer } from "@/design-system/layouts/PageContainer";
import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./page.module.css";

/**
 * Next.js's loading.tsx convention -- shown automatically while
 * app/page.tsx's async server component is fetching. Matches the
 * StatTile/Card layout exactly, per docs/ui-architecture/
 * 02_Student_Experience.md's Dashboard Loading state.
 */
export default function DashboardLoading() {
  return (
    <PageContainer narrow as="main">
      <div className={styles.page}>
        <Skeleton width={220} height={40} label="Loading dashboard" />
        <Skeleton width={160} height={44} label="Loading" />
        <div className={styles.statGrid}>
          <Skeleton height={84} label="Loading" />
          <Skeleton height={84} label="Loading" />
          <Skeleton height={84} label="Loading" />
        </div>
        <Skeleton height={80} label="Loading" />
      </div>
    </PageContainer>
  );
}
