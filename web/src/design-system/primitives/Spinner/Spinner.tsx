import styles from "./Spinner.module.css";

export type SpinnerProps = {
  /** Pixel size; defaults to 1em so it inherits the surrounding text size. */
  size?: number;
  /** Accessible label — a spinner conveys no information without one. */
  label?: string;
};

/**
 * Reserved for short, indeterminate actions (Button's loading state,
 * form submission) — never a full-page load, which is Skeleton's job.
 * See docs/design-system/05-Motion-And-States.md §19.1's exact usage line.
 */
export function Spinner({ size, label = "Loading" }: SpinnerProps) {
  return (
    <span
      className={styles.spinner}
      style={size ? ({ "--size": `${size}px` } as React.CSSProperties) : undefined}
      role="status"
      aria-label={label}
    />
  );
}
