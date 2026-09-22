import { Card } from "@/design-system/primitives/Card";
import styles from "./StatTile.module.css";

export type StatTileProps = {
  label: string;
  value: string | number;
  /** Omitted entirely when there's nothing to compare against yet (e.g. a brand-new student). */
  trend?: { direction: "up" | "down" | "flat"; label: string };
  /** Colors the value for at-a-glance severity (e.g. an eval run's Flagged/Errors count). Defaults to neutral. */
  tone?: "neutral" | "success" | "warning" | "danger";
};

/** Dashboard metric display (docs/design-system/03-Component-Library.md §7.3). */
export function StatTile({ label, value, trend, tone = "neutral" }: StatTileProps) {
  return (
    <Card className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={`${styles.value} ${styles[tone]}`}>{value}</p>
      {trend && <p className={`${styles.trend} ${styles[trend.direction]}`}>{trend.label}</p>}
    </Card>
  );
}
