import styles from "./Skeleton.module.css";

export type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  radius?: string;
  /** Rendered content this Skeleton is standing in for — used only for
   * the accessible label, never displayed. */
  label?: string;
};

/**
 * Content-shaped loading placeholder — must be sized to match the real
 * content it replaces (docs/design-system/05-Motion-And-States.md
 * §19.1), never a generic one-size box. Composing components pass
 * width/height/radius per instance rather than this component guessing.
 */
export function Skeleton({ width, height, radius, label = "Loading content" }: SkeletonProps) {
  const style = {
    "--width": typeof width === "number" ? `${width}px` : width,
    "--height": typeof height === "number" ? `${height}px` : height,
    "--radius": radius,
  } as React.CSSProperties;

  return <span className={styles.skeleton} style={style} role="status" aria-label={label} />;
}
