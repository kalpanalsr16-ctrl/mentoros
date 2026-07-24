import type { createClient } from "@/lib/supabase/server";
import {
  computeStreak,
  pickRevisionSuggestion,
  pickRecentConcepts,
  type MasteryRow,
} from "@/lib/dashboard/dashboard-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type DashboardData = {
  hasActivity: boolean;
  streak: number;
  recentConcepts: MasteryRow[];
  revisionSuggestion: MasteryRow | null;
};

/**
 * The one place that reads learner_concept_mastery/concepts/messages for
 * the Student Dashboard -- shared by GET /api/student/dashboard and
 * app/page.tsx's own server-side render, so the query logic exists once,
 * not duplicated between an API route and the page that could just call
 * it directly. Two flat queries + an in-memory join (concept_id -> name)
 * rather than a relational embedded select -- no precedent for that
 * style elsewhere in this codebase.
 */
export async function getDashboardData(
  supabase: SupabaseServerClient,
  studentId: string,
): Promise<DashboardData | null> {
  const { data: masteryRows, error: masteryError } = await supabase
    .from("learner_concept_mastery")
    .select("concept_id, mastery_score, last_practiced_at")
    .eq("student_id", studentId);

  // Null signals "aggregate failed" -- the graceful-degradation case
  // (docs/ui-architecture/02_Student_Experience.md's Dashboard Error
  // state: show only the Continue button, the one action that always works).
  if (masteryError) {
    return null;
  }

  const rows = masteryRows ?? [];
  const conceptIds = rows.map((r) => r.concept_id);

  const { data: concepts } =
    conceptIds.length > 0
      ? await supabase.from("concepts").select("id, name").in("id", conceptIds)
      : { data: [] };

  const nameById = new Map((concepts ?? []).map((c) => [c.id, c.name]));

  const masteryData: MasteryRow[] = rows.map((r) => ({
    conceptId: r.concept_id,
    conceptName: nameById.get(r.concept_id) ?? r.concept_id,
    masteryScore: Number(r.mastery_score),
    lastPracticedAt: r.last_practiced_at,
  }));

  const { data: messageRows } = await supabase.from("messages").select("created_at").eq("role", "user");

  return {
    hasActivity: masteryData.length > 0,
    streak: computeStreak((messageRows ?? []).map((m) => new Date(m.created_at))),
    recentConcepts: pickRecentConcepts(masteryData),
    revisionSuggestion: pickRevisionSuggestion(masteryData),
  };
}
