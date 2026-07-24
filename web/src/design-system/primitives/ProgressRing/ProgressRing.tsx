import styles from "./ProgressRing.module.css";

export type ProgressRingProps = {
  /** 0-100. */
  value: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
};

/** Mastery-percentage display (docs/design-system §14.1) — a visual encoding, not just a raw number. */
export function ProgressRing({ value, size = 56, strokeWidth = 5, label }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const tone = clamped >= 80 ? "success" : clamped >= 50 ? "" : "warning";

  return (
    <span
      className={styles.wrap}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${Math.round(clamped)}% mastery`}
    >
      <svg width={size} height={size}>
        <circle className={styles.track} cx={size / 2} cy={size / 2} r={radius} strokeWidth={strokeWidth} />
        <circle
          className={`${styles.fill} ${tone ? styles[tone] : ""}`}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className={styles.label} style={{ fontSize: size * 0.28 }} aria-hidden="true">
        {Math.round(clamped)}
      </span>
    </span>
  );
}
