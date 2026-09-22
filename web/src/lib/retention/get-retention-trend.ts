import type { createClient } from "@/lib/supabase/server";
import { buildRetentionTrend, type RetentionWeekBucket } from "@/lib/retention/retention-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AssessmentCompletedPayload = {
  conceptId?: string;
  masteryScore?: number;
};

/**
 * Reads this student's own assessment_completed events (same table/RLS
 * path get-student-confusion.ts and get-assessment-history.ts already
 * use) to reconstruct a weekly trend on demand -- learner_concept_mastery
 * itself has no history to read one from directly.
 */
export async function getRetentionTrend(supabase: SupabaseServerClient, studentId: string, now: Date = new Date()): Promise<RetentionWeekBucket[]> {
  const { data, error } = await supabase
    .from("events")
    .select("payload, created_at")
    .eq("student_id", studentId)
    .eq("event_name", "assessment_completed")
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  const events = data
    .map((row) => {
      const payload = row.payload as AssessmentCompletedPayload;
      return {
        conceptId: payload.conceptId ?? "",
        masteryScore: typeof payload.masteryScore === "number" ? payload.masteryScore : null,
        createdAt: row.created_at,
      };
    })
    .filter((e): e is { conceptId: string; masteryScore: number; createdAt: string } => e.masteryScore !== null);

  return buildRetentionTrend(events, now);
}
