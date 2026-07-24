import type { createClient } from "@/lib/supabase/server";
import type { EvaluationSourceAgent } from "@/lib/agents/evaluation-agent";
import { rangeToDays, type Range } from "@/lib/progress-analytics/progress-analytics-aggregation";
import {
  buildDimensionTrends,
  computeSafetyCleanRate,
  computeHallucinationRiskRate,
  filterBySourceAgent,
  buildFlaggedInteractions,
  type EvaluationCompletedRow,
  type EvaluationDimension,
  type FlaggedInteractionRow,
  type TrendPoint,
} from "@/lib/evaluation-analytics/evaluation-analytics-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type EvaluationAnalyticsData = {
  className: string;
  trends: Record<EvaluationDimension, TrendPoint[]>;
  safetyCleanRate: number;
  hallucinationRiskRate: number;
  flaggedInteractions: FlaggedInteractionRow[];
  interactionCount: number;
};

export type EvaluationAnalyticsResult = { status: "ok"; data: EvaluationAnalyticsData } | { status: "error" } | { status: "forbidden" };

/**
 * `/studio/evaluation?classId=&range=&sourceAgent=` (Epic I1) --
 * teacher-scoped per the approved scope-down (see the migration-free
 * decision recorded in this sprint's summary): reads evaluation_completed/
 * low_quality_detected/hallucination_detected events for a teacher's own
 * class roster only, via the *existing* teacher-read policy on `events`
 * (0012_events_teacher_read.sql) -- no new RLS, no admin role invented.
 * Same ownership/roster shape as get-progress-analytics.ts exactly.
 */
export async function getEvaluationAnalytics(
  supabase: SupabaseServerClient,
  teacherId: string,
  classId: string,
  range: Range,
  sourceAgent: EvaluationSourceAgent | null,
): Promise<EvaluationAnalyticsResult> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (classError) return { status: "error" };
  if (!classRow) return { status: "forbidden" };

  const { data: rosterRows, error: rosterError } = await supabase.from("class_students").select("student_id").eq("class_id", classId);
  if (rosterError) return { status: "error" };

  const studentIds = (rosterRows ?? []).map((r) => r.student_id);
  const empty: EvaluationAnalyticsData = {
    className: classRow.name,
    trends: buildDimensionTrends([]),
    safetyCleanRate: 0,
    hallucinationRiskRate: 0,
    flaggedInteractions: [],
    interactionCount: 0,
  };
  if (studentIds.length === 0) {
    return { status: "ok", data: empty };
  }

  const cutoff = new Date(Date.now() - rangeToDays(range) * 24 * 60 * 60 * 1000).toISOString();
  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select("trace_id, event_name, created_at, payload")
    .in("student_id", studentIds)
    .in("event_name", ["evaluation_completed", "low_quality_detected", "hallucination_detected"])
    .gte("created_at", cutoff);

  if (eventsError) return { status: "error" };

  const rows = eventRows ?? [];

  const completedRows: EvaluationCompletedRow[] = rows
    .filter((r) => r.event_name === "evaluation_completed")
    .map((r) => {
      const p = r.payload as Record<string, unknown>;
      return {
        createdAt: r.created_at,
        sourceAgent: p.sourceAgent as EvaluationSourceAgent,
        overallScore: Number(p.overallScore ?? 0),
        groundedness: typeof p.groundedness === "number" ? p.groundedness : null,
        accuracy: Number(p.accuracy ?? 0),
        educationalQuality: Number(p.educationalQuality ?? 0),
        personalization: Number(p.personalization ?? 0),
        clarity: Number(p.clarity ?? 0),
        safety: Number(p.safety ?? 0),
        hallucinationRisk: (p.hallucinationRisk as EvaluationCompletedRow["hallucinationRisk"]) ?? null,
      };
    });

  const flagged: FlaggedInteractionRow[] = rows
    .filter((r) => r.event_name === "low_quality_detected" || r.event_name === "hallucination_detected")
    .map((r) => {
      const p = r.payload as Record<string, unknown>;
      const isLowQuality = r.event_name === "low_quality_detected";
      return {
        traceId: r.trace_id,
        sourceAgent: p.sourceAgent as EvaluationSourceAgent,
        createdAt: r.created_at,
        reason: isLowQuality ? ("low_quality" as const) : ("hallucination" as const),
        detail: isLowQuality ? `Overall score ${p.overallScore}` : `Groundedness ${p.groundedness}`,
      };
    });

  const filteredCompleted = filterBySourceAgent(completedRows, sourceAgent);
  const filteredFlagged = filterBySourceAgent(flagged, sourceAgent);

  return {
    status: "ok",
    data: {
      className: classRow.name,
      trends: buildDimensionTrends(filteredCompleted),
      safetyCleanRate: computeSafetyCleanRate(filteredCompleted),
      hallucinationRiskRate: computeHallucinationRiskRate(filteredCompleted),
      flaggedInteractions: buildFlaggedInteractions(filteredFlagged),
      interactionCount: filteredCompleted.length,
    },
  };
}
