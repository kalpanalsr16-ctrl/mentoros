"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/design-system/primitives/Card";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { StatTile } from "@/design-system/primitives/StatTile";
import styles from "./page.module.css";

export type EvalItemStatus = "pending" | "running" | "pass" | "fail" | "error";

export type EvalRunItem = {
  id: string;
  golden_id: string;
  question: string;
  source_agent: string | null;
  status: EvalItemStatus;
  latency_ms: number | null;
  overall_score: number | null;
  groundedness_score: number | null;
  accuracy_score: number | null;
  safety_score: number | null;
  hallucination_risk: string | null;
  response_excerpt: string | null;
  error_message: string | null;
};

const STATUS_LABEL: Record<EvalItemStatus, string> = {
  pending: "Pending",
  running: "Running…",
  pass: "Pass",
  fail: "Fail",
  error: "Error",
};

const STATUS_VARIANT: Record<EvalItemStatus, BadgeVariant> = {
  pending: "neutral",
  running: "brand",
  pass: "success",
  fail: "danger",
  error: "warning",
};

/**
 * Live table for one eval run (docs/evaluation-strategy-report.md's named
 * golden-set gap). Subscribes to Supabase Realtime on both tables so a
 * teacher (or, for a run marked public, a visitor on /eval) watches rows
 * flip from "Pending" to "Running…" to a real Pass/Fail while
 * `npm run eval:golden` is still executing elsewhere -- no polling.
 */
export function EvalRunLiveView({
  runId,
  initialLabel,
  initialStatus,
  initialItems,
}: {
  runId: string;
  initialLabel: string;
  initialStatus: string;
  initialItems: EvalRunItem[];
}) {
  const [items, setItems] = useState<EvalRunItem[]>(initialItems);
  const [runStatus, setRunStatus] = useState(initialStatus);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`eval-run-${runId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "eval_run_items", filter: `run_id=eq.${runId}` },
        (payload) => {
          const row = payload.new as EvalRunItem;
          if (!row?.id) return;
          setItems((prev) => {
            const index = prev.findIndex((item) => item.id === row.id);
            if (index === -1) return [...prev, row];
            const next = [...prev];
            next[index] = row;
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "eval_runs", filter: `id=eq.${runId}` },
        (payload) => {
          const row = payload.new as { status?: string };
          if (row?.status) setRunStatus(row.status);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [runId]);

  const summary = useMemo(() => {
    const finished = items.filter((item) => item.status === "pass" || item.status === "fail");
    const passCount = items.filter((item) => item.status === "pass").length;
    const latencies = finished.filter((i) => i.latency_ms != null).map((i) => i.latency_ms!);
    const scores = finished.filter((i) => i.overall_score != null).map((i) => i.overall_score!);

    return {
      passRate: finished.length > 0 ? Math.round((passCount / finished.length) * 100) : null,
      avgLatencyMs: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null,
      avgOverallScore: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      completed: finished.length,
      total: items.length,
    };
  }, [items]);

  return (
    <div className={styles.runView}>
      <div className={styles.runHeadRow}>
        <div>
          <p className={styles.runLabel}>{initialLabel}</p>
          <p className={styles.runMeta}>
            {summary.completed} / {summary.total} questions scored
          </p>
        </div>
        <Badge variant={runStatus === "completed" ? "success" : "brand"}>
          {runStatus === "completed" ? "Completed" : "Running"}
        </Badge>
      </div>

      <div className={styles.statGrid}>
        <StatTile label="Pass rate" value={summary.passRate !== null ? `${summary.passRate}%` : "—"} />
        <StatTile label="Avg latency" value={summary.avgLatencyMs !== null ? `${summary.avgLatencyMs}ms` : "—"} />
        <StatTile label="Avg overall score" value={summary.avgOverallScore !== null ? summary.avgOverallScore : "—"} />
      </div>

      <div className={styles.itemList}>
        {items.map((item) => (
          <Card key={item.id} className={styles.itemCard}>
            <div className={styles.itemHeadRow}>
              <p className={styles.itemQuestion}>{item.question}</p>
              <Badge variant={STATUS_VARIANT[item.status]}>{STATUS_LABEL[item.status]}</Badge>
            </div>

            {(item.status === "pass" || item.status === "fail") && (
              <div className={styles.itemMetrics}>
                {item.source_agent && <span className={styles.metric}>{item.source_agent}</span>}
                <span className={styles.metric}>{item.latency_ms}ms</span>
                <span className={styles.metric}>overall {item.overall_score}</span>
                {item.groundedness_score !== null && <span className={styles.metric}>groundedness {item.groundedness_score}</span>}
                {item.accuracy_score !== null && <span className={styles.metric}>accuracy {item.accuracy_score}</span>}
                {item.safety_score !== null && <span className={styles.metric}>safety {item.safety_score}</span>}
                {item.hallucination_risk && <span className={styles.metric}>hallucination risk: {item.hallucination_risk}</span>}
              </div>
            )}

            {item.status === "error" && item.error_message && <p className={styles.itemError}>{item.error_message}</p>}

            {item.response_excerpt && <p className={styles.itemExcerpt}>&ldquo;{item.response_excerpt}&rdquo;</p>}
          </Card>
        ))}
      </div>
    </div>
  );
}
