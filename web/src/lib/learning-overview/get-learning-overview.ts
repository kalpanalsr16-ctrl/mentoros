import type { createClient } from "@/lib/supabase/server";
import { buildLearningOverview, type OverviewChapter } from "@/lib/learning-overview/learning-overview-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Same three tables get-roadmap-data.ts reads (published chapters/
 * concepts + this student's learner_concept_mastery), minus the
 * prerequisite edges query -- My Learning's status model doesn't need
 * topological ordering, just chapter grouping. Two independent readers
 * of the same underlying data, not a duplicated write path.
 */
export async function getLearningOverview(supabase: SupabaseServerClient, studentId: string): Promise<OverviewChapter[] | null> {
  const [chaptersRes, conceptsRes, masteryRes] = await Promise.all([
    supabase.from("chapters").select("id, title, sequence").eq("status", "published"),
    supabase.from("concepts").select("id, name, chapter_id").eq("status", "published"),
    supabase
      .from("learner_concept_mastery")
      .select("concept_id, mastery_score, last_practiced_at, common_mistakes, attempts")
      .eq("student_id", studentId),
  ]);

  if (chaptersRes.error || conceptsRes.error || masteryRes.error) {
    return null;
  }

  return buildLearningOverview(
    (chaptersRes.data ?? []).map((c) => ({ id: c.id, title: c.title, sequence: c.sequence })),
    (conceptsRes.data ?? []).map((c) => ({ id: c.id, name: c.name, chapterId: c.chapter_id })),
    (masteryRes.data ?? []).map((m) => ({
      conceptId: m.concept_id,
      masteryScore: Number(m.mastery_score),
      lastPracticedAt: m.last_practiced_at,
      commonMistakes: m.common_mistakes ?? [],
      attempts: m.attempts ?? 0,
    })),
  );
}
