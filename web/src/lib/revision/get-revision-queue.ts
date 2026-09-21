import type { createClient } from "@/lib/supabase/server";
import { buildRevisionQueue, type RevisionQueue } from "@/lib/revision/revision-queue-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads this student's own learner_concept_mastery + concept names --
 * same shape as get-progress-data.ts's join, filtered to weak concepts
 * by buildRevisionQueue. Not revision_schedule (see that module's own
 * doc comment for why).
 */
export async function getRevisionQueue(supabase: SupabaseServerClient, studentId: string): Promise<RevisionQueue | null> {
  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("concept_id, mastery_score, last_practiced_at")
    .eq("student_id", studentId);

  if (masteryError) {
    return null;
  }

  const rows = masteryRows ?? [];
  if (rows.length === 0) {
    return { dueNow: [], upcoming: [] };
  }

  const conceptIds = rows.map((r) => r.concept_id);
  const { data: concepts, error: conceptsError } = await supabase.from("concepts").select("id, name").in("id", conceptIds);

  if (conceptsError) {
    return null;
  }

  const nameById = new Map((concepts ?? []).map((c) => [c.id, c.name]));

  return buildRevisionQueue(
    rows.map((r) => ({
      conceptId: r.concept_id,
      conceptName: nameById.get(r.concept_id) ?? r.concept_id,
      masteryScore: Number(r.mastery_score),
      lastPracticedAt: r.last_practiced_at,
    })),
  );
}
