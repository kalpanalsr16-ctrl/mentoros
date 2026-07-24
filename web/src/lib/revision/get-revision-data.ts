import type { createClient } from "@/lib/supabase/server";
import { groupRevisionItems, type RevisionGroups, type RevisionRow } from "@/lib/revision/revision-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type RevisionData = RevisionGroups;

/**
 * Reads this student's own revision_schedule rows (Epic F6) plus the
 * concept names they reference -- two flat queries + an in-memory join,
 * same shape as get-dashboard-data.ts/get-progress-data.ts, rather than a
 * relational embedded select. Nothing populates revision_schedule yet
 * (the scheduling job is out of scope for this document); an empty
 * result here is the honest, expected state today, not an error.
 */
export async function getRevisionData(supabase: SupabaseServerClient, studentId: string): Promise<RevisionData | null> {
  const { data: scheduleRows, error: scheduleError } = await supabase
    .from("revision_schedule")
    .select("id, concept_id, due_at")
    .eq("student_id", studentId);

  if (scheduleError) {
    return null;
  }

  const rows = scheduleRows ?? [];
  if (rows.length === 0) {
    return { dueNow: [], upcoming: [] };
  }

  const conceptIds = [...new Set(rows.map((r) => r.concept_id))];
  const { data: concepts, error: conceptsError } = await supabase
    .from("concepts")
    .select("id, name")
    .in("id", conceptIds);

  if (conceptsError) {
    return null;
  }

  const nameById = new Map((concepts ?? []).map((c) => [c.id, c.name]));

  const revisionRows: RevisionRow[] = rows.map((r) => ({
    id: r.id,
    conceptId: r.concept_id,
    conceptName: nameById.get(r.concept_id) ?? r.concept_id,
    dueAt: r.due_at,
  }));

  return groupRevisionItems(revisionRows);
}
