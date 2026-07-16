import styles from "./Avatar.module.css";

export type AvatarProps = {
  /** Full name or email — the first letter becomes the monogram. */
  label: string;
  size?: number;
};

function initialFrom(label: string): string {
  const trimmed = label.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

/**
 * Monogram-only, per docs/design-system/03-Component-Library.md §7.2 —
 * no photo-upload flow in scope for this phase.
 */
export function Avatar({ label, size }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={size ? ({ "--size": `${size}px` } as React.CSSProperties) : undefined}
      aria-hidden="true"
    >
      {initialFrom(label)}
    </span>
  );
}
