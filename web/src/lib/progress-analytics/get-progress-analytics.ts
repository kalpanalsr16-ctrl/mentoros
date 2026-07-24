import type { createClient } from "@/lib/supabase/server";
import { buildClassOverview, type MasteryRow } from "@/lib/teacher-roster/roster-aggregation";
import { buildMasteryTrend, rangeToDays, type MasteryEventRow, type Range, type TrendPoint } from "@/lib/progress-analytics/progress-analytics-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ProgressAnalyticsResult =
  | { status: "ok"; data: { className: string; trend: TrendPoint[]; atRiskCount: number } }
  | { status: "error" }
  | { status: "forbidden" };

/**
 * `/studio/analytics?classId=&range=` (Epic G11) -- docs/ui-architecture/
 * 10_API_Contracts.md's `GET /api/teacher/analytics`. Same ownership
 * shape as get-class-overview.ts/get-misconception-report.ts (single
 * 403, RLS can't distinguish "doesn't exist" from "not yours").
 * `atRiskCount` reuses buildClassOverview's roster computation so this
 * screen's "at risk" figure can never drift from Class Overview's --
 * conceptName is irrelevant to that count, so a placeholder is fine here.
 */
export async function getProgressAnalytics(
  supabase: SupabaseServerClient,
  teacherId: string,
  classId: string,
  range: Range,
): Promise<ProgressAnalyticsResult> {
  const { data: classRow, error: classError } = await supabase
    .from("classes")
    .select("id, name")
    .eq("id", classId)
    .eq("teacher_id", teacherId)
    .maybeSingle();

  if (classError) return { status: "error" };
  if (!classRow) return { status: "forbidden" };

  const { data: rosterRows, error: rosterError } = await supabase
    .from("class_students")
    .select("student_id")
    .eq("class_id", classId);

  if (rosterError) return { status: "error" };

  const studentIds = (rosterRows ?? []).map((r) => r.student_id);
  if (studentIds.length === 0) {
    return { status: "ok", data: { className: classRow.name, trend: [], atRiskCount: 0 } };
  }

  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("student_id, concept_id, mastery_score")
    .in("student_id", studentIds);

  if (masteryError) return { status: "error" };

  const flatMasteryRows: MasteryRow[] = (masteryRows ?? []).map((r) => ({
    studentId: r.student_id,
    conceptId: r.concept_id,
    conceptName: r.concept_id,
    masteryScore: Number(r.mastery_score),
  }));
  const roster = studentIds.map((id) => ({ studentId: id, studentName: id }));
  const { atRiskCount } = buildClassOverview(roster, flatMasteryRows);

  const cutoff = new Date(Date.now() - rangeToDays(range) * 24 * 60 * 60 * 1000).toISOString();
  const { data: eventRows, error: eventsError } = await supabase
    .from("events")
    .select("created_at, payload")
    .in("student_id", studentIds)
    .eq("event_name", "assessment_completed")
    .gte("created_at", cutoff);

  if (eventsError) return { status: "error" };

  const masteryEventRows: MasteryEventRow[] = (eventRows ?? [])
    .map((e) => {
      const payload = e.payload as Record<string, unknown>;
      return { createdAt: e.created_at, masteryScore: typeof payload.masteryScore === "number" ? payload.masteryScore : null };
    })
    .filter((r): r is MasteryEventRow => r.masteryScore !== null);

  return {
    status: "ok",
    data: { className: classRow.name, trend: buildMasteryTrend(masteryEventRows), atRiskCount },
  };
}
