import { Card } from "@/design-system/primitives/Card";
import styles from "./StatTile.module.css";

export type StatTileProps = {
  label: string;
  value: string | number;
  /** Omitted entirely when there's nothing to compare against yet (e.g. a brand-new student). */
  trend?: { direction: "up" | "down" | "flat"; label: string };
};

/** Dashboard metric display (docs/design-system/03-Component-Library.md §7.3). */
export function StatTile({ label, value, trend }: StatTileProps) {
  return (
    <Card className={styles.tile}>
      <p className={styles.label}>{label}</p>
      <p className={styles.value}>{value}</p>
      {trend && <p className={`${styles.trend} ${styles[trend.direction]}`}>{trend.label}</p>}
    </Card>
  );
}
