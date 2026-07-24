import { Badge } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import type { RoadmapNode } from "@/lib/roadmap/roadmap-aggregation";
import styles from "./RoadmapPath.module.css";

export type RoadmapPathProps = {
  nodes: RoadmapNode[];
};

/**
 * Learning Roadmap's chapter -> concept sequence (Epic F3,
 * docs/ui-architecture/02_Student_Experience.md) -- a connected line of
 * nodes, current position highlighted, mastered concepts visually
 * distinct from not-yet-covered ones. "next" nodes render a plain, dim
 * placeholder rather than a ProgressRing at 0% -- a real ring at 0%
 * would read as "attempted and failed", not "not started yet".
 */
export function RoadmapPath({ nodes }: RoadmapPathProps) {
  return (
    <div className={styles.path} role="list">
      {nodes.map((node, index) => (
        <div
          key={node.conceptId}
          className={`${styles.nodeWrap} ${index > 0 ? styles.connected : ""}`}
          role="listitem"
        >
          <div className={`${styles.node} ${styles[node.status]}`}>
            {node.status === "next" ? (
              <span className={styles.placeholder} aria-label={`${node.conceptName}: not yet covered`} />
            ) : (
              <ProgressRing
                value={node.masteryScore}
                size={56}
                label={`${node.conceptName}: ${node.masteryScore}% mastery`}
              />
            )}
            {node.status === "current" && (
              <span className={styles.currentBadge}>
                <Badge variant="brand">Current</Badge>
              </span>
            )}
          </div>

          <p className={styles.conceptName}>{node.conceptName}</p>
        </div>
      ))}
    </div>
  );
}
