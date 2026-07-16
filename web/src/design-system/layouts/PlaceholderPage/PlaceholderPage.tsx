import { Skeleton } from "@/design-system/primitives/Skeleton";
import styles from "./PlaceholderPage.module.css";

export type PlaceholderPageProps = {
  title: string;
  description: string;
};

/**
 * Sprint 1 explicitly builds routing structure and page containers, not
 * screen content — every route this sprint wires up renders this until
 * its real screen is implemented in a later, separately-scoped sprint
 * (per docs/ui-architecture/13_Implementation_Sequence.md's Epics F/G/H).
 * The skeleton row is a honest visual cue that real content belongs here,
 * not a functioning empty state for a screen that doesn't exist yet.
 */
export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className={styles.placeholder}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <Skeleton width={320} height={80} label="Screen content, coming in a later sprint" />
    </div>
  );
}
