import type { createClient } from "@/lib/supabase/server";
import { aggregateStudentConfusion, type ConfusionItem } from "@/lib/misconceptions/student-confusion-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AssessmentCompletedPayload = {
  misconceptions?: string[];
  conceptName?: string | null;
};

/**
 * Reads this student's own assessment_completed events (same events/RLS
 * self-read path assessment-history already uses) -- no new table, no
 * new write path, just a different aggregation over data already logged
 * for every real assessment turn.
 */
export async function getStudentConfusion(supabase: SupabaseServerClient, studentId: string): Promise<ConfusionItem[] | null> {
  const { data, error } = await supabase
    .from("events")
    .select("payload, created_at")
    .eq("student_id", studentId)
    .eq("event_name", "assessment_completed")
    .order("created_at", { ascending: true });

  if (error) {
    return null;
  }

  const rows = (data ?? []).map((row) => {
    const payload = row.payload as AssessmentCompletedPayload;
    return {
      misconceptions: payload.misconceptions ?? [],
      conceptName: payload.conceptName ?? null,
      createdAt: row.created_at,
    };
  });

  return aggregateStudentConfusion(rows);
}
