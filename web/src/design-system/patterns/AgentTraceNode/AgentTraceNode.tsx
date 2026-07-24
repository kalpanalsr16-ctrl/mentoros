import { useState } from "react";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { ChevronRightIcon, ChevronDownIcon } from "@/design-system/icons";
import type { AgentNodeStatus, AgentNodeView } from "@/lib/observability/transparency-provider";
import styles from "./AgentTraceNode.module.css";

const STATUS_BADGE: Record<AgentNodeStatus, BadgeVariant> = {
  success: "success",
  blocked: "safety",
  failed: "danger",
};

function formatCost(costUsd: number): string {
  return costUsd < 0.001 ? "<$0.001" : `$${costUsd.toFixed(3)}`;
}

/**
 * One pipeline stage in the AI Transparency Panel (docs/ui-architecture/
 * 07_AI_Transparency_Panel.md, docs/design-system §7.3). Collapsed shows
 * only the agent's decision + latency, matching every section's own
 * "collapsed shows X" rule in that doc. Expanding shows the human-readable
 * detail fields first; the raw event payload is a second, separate,
 * opt-in disclosure -- never shown by default, and never containing a
 * prompt or chain-of-thought (07's "hard rule").
 */
export function AgentTraceNode({ node }: { node: AgentNodeView }) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const hasCallMetadata = node.model !== undefined;

  return (
    <div className={styles.node}>
      <button
        type="button"
        className={styles.head}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        {expanded ? <ChevronDownIcon aria-hidden="true" /> : <ChevronRightIcon aria-hidden="true" />}
        <span className={styles.agent}>
          {node.agent}
          {node.derived && <span className={styles.derivedTag}>derived</span>}
        </span>
        <Badge variant={STATUS_BADGE[node.status]}>{node.headline}</Badge>
        <span className={styles.latency}>{node.latencyMs !== null ? `${node.latencyMs}ms` : "—"}</span>
      </button>

      {expanded && (
        <div className={styles.body}>
          {node.details.length > 0 && (
            <dl className={styles.details}>
              {node.details.map((d) => (
                <div key={d.label} className={styles.detailRow}>
                  <dt>{d.label}</dt>
                  <dd>{d.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {hasCallMetadata && (
            <p className={styles.callMeta}>
              {node.model} · {node.inputTokens ?? 0}+{node.outputTokens ?? 0} tok ·{" "}
              {formatCost(node.costUsd ?? 0)}
            </p>
          )}

          {Object.keys(node.raw).length > 0 && (
            <button type="button" className={styles.rawToggle} onClick={() => setShowRaw((v) => !v)}>
              {showRaw ? "Hide raw payload" : "Inspect raw payload"}
            </button>
          )}
          {showRaw && <pre className={styles.raw}>{JSON.stringify(node.raw, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}
