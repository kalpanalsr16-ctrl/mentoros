import type { createClient } from "@/lib/supabase/server";
import { mapPracticeEvents, type PracticeHistoryItem } from "@/lib/practice-history/practice-history-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type PracticeHistoryData = {
  hasActivity: boolean;
  items: PracticeHistoryItem[];
};

/**
 * Reads `practice_generated` rows from `events` (self-read RLS,
 * 0006_events_self_read.sql) -- a historical read of Practice Agent's
 * past output, per 02_Student_Experience.md's Practice History section.
 * No agent is called; this never writes.
 */
export async function getPracticeHistoryData(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<PracticeHistoryData | null> {
  const { data, error } = await supabase
    .from("events")
    .select("id, created_at, payload")
    .eq("student_id", studentId)
    .eq("event_name", "practice_generated")
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  const rows = data ?? [];
  return { hasActivity: rows.length > 0, items: mapPracticeEvents(rows) };
}
