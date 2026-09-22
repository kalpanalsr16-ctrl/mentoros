import type { RetentionWeekBucket } from "@/lib/retention/retention-aggregation";
import styles from "./RetentionTrendChart.module.css";

/**
 * A deliberately simple trend visualization -- plain CSS bars, no
 * charting library (none exists elsewhere in this project, and this
 * data is at most 3 points). Only ever rendered by the caller when there
 * are >= 2 real weekly buckets; a single point has no trend to show.
 */
export function RetentionTrendChart({ buckets }: { buckets: RetentionWeekBucket[] }) {
  const max = Math.max(100, ...buckets.map((b) => b.averageScore));

  return (
    <div className={styles.chart} role="img" aria-label={`Retention trend: ${buckets.map((b) => `${b.averageScore}%`).join(", then ")}`}>
      {buckets.map((bucket, index) => {
        const weeksAgo = buckets.length - 1 - index;
        const label = weeksAgo === 0 ? "This week" : weeksAgo === 1 ? "Last week" : `${weeksAgo} weeks ago`;
        return (
          <div key={bucket.weekStart} className={styles.column}>
            <span className={styles.value}>{bucket.averageScore}%</span>
            <div className={styles.barTrack}>
              <div className={styles.bar} style={{ height: `${(bucket.averageScore / max) * 100}%` }} />
            </div>
            <span className={styles.label}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}
