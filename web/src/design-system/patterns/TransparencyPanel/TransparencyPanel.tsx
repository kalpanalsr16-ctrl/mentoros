"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/design-system/icons";
import { Skeleton } from "@/design-system/primitives/Skeleton";
import { AgentTraceNode } from "@/design-system/patterns/AgentTraceNode";
import { EvaluationScoreCard } from "@/design-system/patterns/EvaluationScoreCard";
import type { TraceView } from "@/lib/observability/transparency-provider";
import styles from "./TransparencyPanel.module.css";

export type TransparencyPanelProps = {
  traceId: string | null;
  onClose: () => void;
};

function formatCost(costUsd: number): string {
  return costUsd < 0.001 ? "<$0.001" : `$${costUsd.toFixed(3)}`;
}

/**
 * The "How I answered" panel (docs/ui-architecture/07_AI_Transparency_
 * Panel.md, docs/design-system §13.2) -- off by default, toggled from the
 * chat surface, pre-scoped to one turn's trace_id at a time. Depends only
 * on the GET /api/observability/trace/:traceId contract, never on the
 * `events` schema directly, per the TransparencyProvider abstraction this
 * endpoint sits on top of.
 */
export function TransparencyPanel({ traceId, onClose }: TransparencyPanelProps) {
  const [traceView, setTraceView] = useState<TraceView | null>(null);
  const [loadStatus, setLoadStatus] = useState<"loading" | "error" | "ready">("loading");

  // No traceId is a real, distinct state ("no turn selected yet") -- derived
  // straight from the prop rather than mirrored into state, so there's
  // nothing to synchronize here and no setState needed for that case.
  const status = traceId === null ? "idle" : loadStatus;

  useEffect(() => {
    if (!traceId) return;

    let cancelled = false;

    fetch(`/api/observability/trace/${traceId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`${res.status}`))))
      .then((data: TraceView) => {
        if (!cancelled) {
          setTraceView(data);
          setLoadStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [traceId]);

  return (
    <aside className={styles.panel} aria-label="How I answered">
      <div className={styles.header}>
        <div>
          <p className={styles.title}>How I answered</p>
          {traceView && (
            <p className={styles.summaryLine}>
              {traceView.summary.totalLatencyMs !== null ? `${(traceView.summary.totalLatencyMs / 1000).toFixed(1)}s` : "—"}
              {" · "}
              {formatCost(traceView.summary.totalCostUsd)}
              {" · "}
              {traceView.summary.totalInputTokens + traceView.summary.totalOutputTokens} tok
              {traceView.summary.errorCount > 0 && ` · ${traceView.summary.errorCount} error${traceView.summary.errorCount > 1 ? "s" : ""}`}
            </p>
          )}
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
          <CloseIcon aria-hidden="true" />
        </button>
      </div>

      <div className={styles.body}>
        {status === "idle" && <p className={styles.empty}>No turn selected yet -- send a message, or open reasoning from one below.</p>}
        {status === "loading" && (
          <div className={styles.skeletons}>
            <Skeleton height={32} label="Loading trace" />
            <Skeleton height={32} label="Loading trace" />
            <Skeleton height={32} label="Loading trace" />
          </div>
        )}
        {status === "error" && <p className={styles.empty}>Couldn&apos;t load this trace.</p>}
        {status === "ready" && traceView && (
          <div className={styles.nodes}>
            {traceView.nodes.map((node) =>
              node.agent === "Evaluation" ? (
                <EvaluationScoreCard key={node.agent} node={node} />
              ) : (
                <AgentTraceNode key={node.agent} node={node} />
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
