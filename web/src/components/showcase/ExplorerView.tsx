"use client";

import { useState } from "react";
import { StatTile } from "@/design-system/primitives/StatTile";
import { Badge, type BadgeVariant } from "@/design-system/primitives/Badge";
import { Skeleton } from "@/design-system/primitives/Skeleton";
import { ChipSelect } from "@/design-system/primitives/ChipSelect";
import { LineTrendChart } from "@/design-system/patterns/LineTrendChart";
import { TraceNodeList } from "@/design-system/patterns/TransparencyPanel";
import { formatCostUsd, formatLatencyMs } from "@/lib/observability/format";
import type { RecentTracesData } from "@/lib/observability/get-recent-traces";
import type { RecentTrace } from "@/lib/observability/recent-traces-aggregation";
import type { TraceView } from "@/lib/observability/transparency-provider";
import styles from "./explorer.module.css";

const WORKFLOW_OPTIONS = [
  { value: "Concept Learning", label: "Concept Learning" },
  { value: "Practice", label: "Practice" },
  { value: "Assessment", label: "Assessment" },
  { value: "Safety Blocked", label: "Safety Blocked" },
  { value: "General Teaching", label: "General Teaching" },
  { value: "Unknown", label: "Unknown" },
];

const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "All time", days: null },
];

const WORKFLOW_BADGE: Record<string, BadgeVariant> = {
  "Concept Learning": "brand",
  Practice: "brand",
  Assessment: "brand",
  "Safety Blocked": "safety",
  "General Teaching": "neutral",
  Unknown: "neutral",
};

function traceRowLabel(traceId: string): string {
  return traceId.slice(0, 8);
}

export function ExplorerView({ initialData }: { initialData: RecentTracesData | null }) {
  const [data, setData] = useState(initialData);
  const [isRefetching, setIsRefetching] = useState(false);
  const [datePreset, setDatePreset] = useState<string[]>(["All time"]);
  const [workflow, setWorkflow] = useState<string[]>([]);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [traceView, setTraceView] = useState<TraceView | null>(null);
  const [traceLoadStatus, setTraceLoadStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");

  // Both fetches below are triggered directly from the event handlers that
  // change filters/selection (ChipSelect onChange, the checkbox, a trace
  // row's onClick) rather than from a useEffect watching that state --
  // these are user-initiated actions, not external state this component
  // needs to stay synchronized with, so there's no effect to write here.
  async function refetch(next: { datePreset?: string[]; workflow?: string[]; errorsOnly?: boolean }) {
    const nextDatePreset = next.datePreset ?? datePreset;
    const nextWorkflow = next.workflow ?? workflow;
    const nextErrorsOnly = next.errorsOnly ?? errorsOnly;

    if (next.datePreset) setDatePreset(next.datePreset);
    if (next.workflow) setWorkflow(next.workflow);
    if (next.errorsOnly !== undefined) setErrorsOnly(next.errorsOnly);

    const preset = DATE_PRESETS.find((p) => p.label === nextDatePreset[0]);
    const params = new URLSearchParams();
    if (preset?.days) {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - preset.days);
      params.set("from", from.toISOString());
    }
    if (nextWorkflow[0]) params.set("workflow", nextWorkflow[0]);
    if (nextErrorsOnly) params.set("errorsOnly", "true");

    // "Refetch keeps the frame" (dataviz method): the previous render stays
    // on screen at reduced opacity while this loads -- no skeleton, no
    // layout jump, so the charts/table/stats don't flash empty between
    // filter changes.
    setIsRefetching(true);
    try {
      const res = await fetch(`/api/observability/recent?${params.toString()}`);
      if (res.ok) setData(await res.json());
    } catch {
      // keep showing the previous data rather than clearing it on a
      // transient network error
    } finally {
      setIsRefetching(false);
    }
  }

  async function selectTrace(traceId: string) {
    setSelectedTraceId(traceId);
    setTraceLoadStatus("loading");
    try {
      const res = await fetch(`/api/observability/trace/${traceId}`);
      if (!res.ok) throw new Error(String(res.status));
      setTraceView(await res.json());
      setTraceLoadStatus("ready");
    } catch {
      setTraceLoadStatus("error");
    }
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Architecture Explorer</h1>
      <p className={styles.body}>Your own recent traces through the MentorOS pipeline.</p>

      {/* One row, above the content it scopes (dataviz method's filter
          composition rule) -- date range first, then the remaining
          dimensions. */}
      <div className={styles.filters}>
        <ChipSelect
          options={DATE_PRESETS.map((p) => ({ value: p.label, label: p.label }))}
          value={datePreset}
          onChange={(next) => refetch({ datePreset: next })}
          aria-label="Date range"
        />
        <ChipSelect
          options={WORKFLOW_OPTIONS}
          value={workflow}
          onChange={(next) => refetch({ workflow: next })}
          multi
          aria-label="Workflow type"
        />
        <label className={styles.errorsToggle}>
          <input
            type="checkbox"
            checked={errorsOnly}
            onChange={(e) => refetch({ errorsOnly: e.target.checked })}
          />
          Errors only
        </label>
      </div>

      <div className={styles.content} style={{ opacity: isRefetching ? 0.6 : 1 }}>
        {!data ? (
          <p className={styles.body}>Couldn&apos;t load recent traces right now.</p>
        ) : (
          <>
            <div className={styles.statGrid}>
              <StatTile label="Total interactions" value={data.summary.totalInteractions} />
              <StatTile
                label="Average latency"
                value={data.summary.averageLatencyMs !== null ? formatLatencyMs(data.summary.averageLatencyMs) : "—"}
              />
              <StatTile label="Error rate" value={`${Math.round(data.summary.errorRate * 100)}%`} />
            </div>

            <div className={styles.chartGrid}>
              <LineTrendChart
                title="Latency over time"
                points={data.latencyTrend}
                formatValue={formatLatencyMs}
                emptyLabel="No latency data in this range yet."
              />
              <LineTrendChart
                title="Cost over time"
                points={data.costTrend}
                formatValue={formatCostUsd}
                emptyLabel="No cost data in this range yet."
              />
            </div>

            <div className={styles.explorerLayout}>
              <div className={styles.traceList}>
                <p className={styles.sectionLabel}>Recent traces</p>
                {data.traces.length === 0 ? (
                  <p className={styles.body}>No traces match these filters.</p>
                ) : (
                  data.traces.map((trace: RecentTrace) => (
                    <button
                      key={trace.traceId}
                      type="button"
                      className={`${styles.traceRow} ${selectedTraceId === trace.traceId ? styles.traceRowSelected : ""}`}
                      onClick={() => selectTrace(trace.traceId)}
                    >
                      <span className={styles.traceId}>{traceRowLabel(trace.traceId)}</span>
                      <Badge variant={WORKFLOW_BADGE[trace.workflow] ?? "neutral"}>{trace.workflow}</Badge>
                      <span className={styles.traceMeta}>
                        {new Date(trace.timestamp).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      {trace.errorCount > 0 && <Badge variant="danger">{trace.errorCount} error{trace.errorCount > 1 ? "s" : ""}</Badge>}
                    </button>
                  ))
                )}
              </div>

              <div className={styles.traceDetail}>
                <p className={styles.sectionLabel}>Trace detail</p>
                {!selectedTraceId && <p className={styles.body}>Select a trace to see its full pipeline.</p>}
                {traceLoadStatus === "loading" && (
                  <div className={styles.detailSkeletons}>
                    <Skeleton height={64} label="Loading trace" />
                    <Skeleton height={64} label="Loading trace" />
                  </div>
                )}
                {traceLoadStatus === "error" && <p className={styles.body}>Couldn&apos;t load this trace.</p>}
                {traceLoadStatus === "ready" && traceView && (
                  <div className={styles.detailNodes}>
                    <TraceNodeList nodes={traceView.nodes} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
