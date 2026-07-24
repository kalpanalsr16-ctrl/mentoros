import type { createClient } from "@/lib/supabase/server";
import {
  groupIntoRecentTraces,
  filterRecentTraces,
  computeSummaryStats,
  buildTrendPoints,
  type RecentTrace,
  type RecentTracesFilters,
  type PipelineSummaryStats,
  type TrendPoint,
  type EventRowWithTrace,
} from "@/lib/observability/recent-traces-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RecentTracesData = {
  summary: PipelineSummaryStats;
  traces: RecentTrace[];
  latencyTrend: TrendPoint[];
  costTrend: TrendPoint[];
};

export type RecentTracesQuery = RecentTracesFilters & {
  /** ISO date strings; both optional -- omitted means "no lower/upper bound." */
  from?: string;
  to?: string;
};

/**
 * Reads this student's own `events` within an optional date range (RLS
 * already scopes to student_id = auth.uid(), same self-read policy the
 * AI Transparency Panel uses -- Architecture Explorer intentionally
 * shows only the signed-in account's own trace history, per this
 * sprint's scoping decision, not a new cross-student access model) and
 * groups them into per-trace summaries for Epic E6. Filters/stats are
 * computed over that same grouped list so the table, charts, and summary
 * tiles always agree, per the dataviz method's "filters scope everything
 * below them" rule.
 */
export async function getRecentTraces(
  supabase: SupabaseServerClient,
  query: RecentTracesQuery,
): Promise<RecentTracesData | null> {
  let request = supabase
    .from("events")
    .select("trace_id, event_name, payload, created_at, conversation_id, student_id");

  if (query.from) request = request.gte("created_at", query.from);
  if (query.to) request = request.lte("created_at", query.to);

  const { data, error } = await request;
  if (error) {
    return null;
  }

  const allTraces = groupIntoRecentTraces((data ?? []) as EventRowWithTrace[]);
  const traces = filterRecentTraces(allTraces, { workflow: query.workflow, errorsOnly: query.errorsOnly });

  return {
    summary: computeSummaryStats(traces),
    traces,
    latencyTrend: buildTrendPoints(traces, "latency"),
    costTrend: buildTrendPoints(traces, "cost"),
  };
}
