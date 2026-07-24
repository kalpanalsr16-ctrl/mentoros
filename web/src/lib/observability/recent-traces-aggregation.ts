import { buildObservabilityReport, type EventRow, type ObservabilityReport } from "@/lib/agents/observability-agent";

/**
 * EventRow plus trace_id -- observability-agent.ts's EventRow omits it
 * because getObservabilityReport() always already knows the traceId it's
 * querying for (one trace at a time). Grouping a whole window of events
 * across many traces needs trace_id on each row to bucket by.
 */
export type EventRowWithTrace = EventRow & { trace_id: string };

/** ObservabilityReport plus the one field it doesn't carry -- when the trace happened, needed for the table's timestamp column and both time-series charts. */
export type RecentTrace = ObservabilityReport & { timestamp: string };

export type RecentTracesFilters = {
  workflow?: string;
  errorsOnly?: boolean;
};

export type PipelineSummaryStats = {
  totalInteractions: number;
  averageLatencyMs: number | null;
  errorRate: number;
};

export type TrendPoint = { timestamp: string; value: number };

/**
 * Groups a flat window of `events` rows (already date-range-scoped by the
 * caller's query, already RLS-scoped to one student) by trace_id and
 * builds one RecentTrace per group -- reuses buildObservabilityReport()
 * (lib/agents/observability-agent.ts) exactly, rather than a second
 * per-trace summarizer. Sorted most-recent-first, matching the doc's
 * "recent-traces list" ordering.
 */
export function groupIntoRecentTraces(events: EventRowWithTrace[]): RecentTrace[] {
  const byTrace = new Map<string, EventRowWithTrace[]>();
  for (const event of events) {
    if (!byTrace.has(event.trace_id)) byTrace.set(event.trace_id, []);
    byTrace.get(event.trace_id)!.push(event);
  }

  const traces: RecentTrace[] = [];
  for (const [traceId, traceEvents] of byTrace) {
    const report = buildObservabilityReport(traceId, traceEvents);
    const timestamp = traceEvents
      .map((e) => e.created_at)
      .reduce((earliest, t) => (t < earliest ? t : earliest));
    traces.push({ ...report, timestamp });
  }

  return traces.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

/** Pure filter over already-grouped traces -- workflow type and an error-only toggle, per the doc's Filters list (date range is applied at the query level, before grouping). */
export function filterRecentTraces(traces: RecentTrace[], filters: RecentTracesFilters): RecentTrace[] {
  return traces.filter((t) => {
    if (filters.workflow && t.workflow !== filters.workflow) return false;
    if (filters.errorsOnly && t.errorCount === 0) return false;
    return true;
  });
}

/** "Pipeline summary stats: total interactions, average latency, error rate" (06_Dashboard_Architecture.md). */
export function computeSummaryStats(traces: RecentTrace[]): PipelineSummaryStats {
  const latencies = traces.map((t) => t.totalLatencyMs).filter((l): l is number => l !== null);
  const withErrors = traces.filter((t) => t.errorCount > 0).length;

  return {
    totalInteractions: traces.length,
    averageLatencyMs: latencies.length > 0 ? latencies.reduce((sum, l) => sum + l, 0) / latencies.length : null,
    errorRate: traces.length > 0 ? withErrors / traces.length : 0,
  };
}

/** Chronological (oldest-first) points for a time-series chart -- traces with no value for this metric (e.g. no latency logged) are dropped rather than plotted as zero. */
export function buildTrendPoints(traces: RecentTrace[], metric: "latency" | "cost"): TrendPoint[] {
  return traces
    .map((t) => ({
      timestamp: t.timestamp,
      value: metric === "latency" ? t.totalLatencyMs : t.estimatedCostUsd,
    }))
    .filter((p): p is TrendPoint => p.value !== null)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
