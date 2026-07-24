import type { createClient } from "@/lib/supabase/server";
import { mapAssessmentEvents, type AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type AssessmentHistoryData = {
  hasActivity: boolean;
  items: AssessmentHistoryItem[];
};

/**
 * Reads `assessment_completed` rows from `events` (self-read RLS,
 * 0006_events_self_read.sql) -- a historical read of Assessment Agent's
 * past output, per 02_Student_Experience.md's Assessment History
 * section. No agent is called; this never writes.
 */
export async function getAssessmentHistoryData(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<AssessmentHistoryData | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id, created_at, payload")
    .eq("student_id", studentId)
    .eq("event_name", "assessment_completed")
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  const rows = data ?? [];
  return { hasActivity: rows.length > 0, items: mapAssessmentEvents(rows) };
}
