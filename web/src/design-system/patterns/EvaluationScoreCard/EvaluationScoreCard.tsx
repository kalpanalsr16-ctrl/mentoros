import { useState } from "react";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { ProgressRing } from "@/design-system/primitives/ProgressRing";
import { ChevronRightIcon, ChevronDownIcon } from "@/design-system/icons";
import type { AgentNodeView } from "@/lib/observability/transparency-provider";
import styles from "./EvaluationScoreCard.module.css";

const QUALITY_BADGE: Record<string, BadgeVariant> = {
  Good: "success",
  Acceptable: "brand",
  NeedsImprovement: "warning",
};

type Dimension = { label: string; value: number | null };

/**
 * The Evaluation Agent's trace node, specialized (docs/design-system §7.3:
 * "EvaluationScoreCard -- Card + Progress ring") rather than reusing
 * AgentTraceNode's generic detail list -- the six scored dimensions
 * (groundedness/accuracy/educationalQuality/personalization/clarity/
 * safety, 07_AI_Transparency_Panel.md's exact set) read better as rings
 * than as text rows. `node.raw` is the already-logged evaluation_completed
 * payload -- read directly for the numeric scores rather than re-parsing
 * AgentTraceNode's stringified detail list.
 */
export function EvaluationScoreCard({ node }: { node: AgentNodeView }) {
  const [expanded, setExpanded] = useState(false);
  const raw = node.raw;

  if (node.status === "failed") {
    return (
      <div className={styles.node}>
        <div className={styles.head}>
          <span className={styles.agent}>Evaluation</span>
          <Badge variant="danger">Failed</Badge>
        </div>
      </div>
    );
  }

  const dimensions: Dimension[] = [
    { label: "Groundedness", value: typeof raw.groundedness === "number" ? raw.groundedness : null },
    { label: "Accuracy", value: typeof raw.accuracy === "number" ? raw.accuracy : null },
    { label: "Educational quality", value: typeof raw.educationalQuality === "number" ? raw.educationalQuality : null },
    { label: "Personalization", value: typeof raw.personalization === "number" ? raw.personalization : null },
    { label: "Clarity", value: typeof raw.clarity === "number" ? raw.clarity : null },
    { label: "Safety", value: typeof raw.safety === "number" ? raw.safety : null },
  ];

  return (
    <div className={styles.node}>
      <button type="button" className={styles.head} onClick={() => setExpanded((v) => !v)} aria-expanded={expanded}>
        {expanded ? <ChevronDownIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
        <span className={styles.agent}>Evaluation</span>
        <Badge variant={QUALITY_BADGE[String(raw.qualityStatus)] ?? "neutral"}>{node.headline}</Badge>
        <span className={styles.latency}>{node.latencyMs !== null ? `${node.latencyMs}ms` : "—"}</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          <div className={styles.ringGrid}>
            {dimensions.map((d) => (
              <div key={d.label} className={styles.ringItem}>
                {d.value !== null ? (
                  <ProgressRing value={d.value} size={44} />
                ) : (
                  <span className={styles.notEvaluable}>—</span>
                )}
                <span className={styles.ringLabel}>{d.label}</span>
              </div>
            ))}
          </div>
          {typeof raw.hallucinationRisk === "string" && (
            <p className={styles.hallucination}>Hallucination risk: {raw.hallucinationRisk}</p>
          )}
        </div>
      )}
    </div>
  );
}
