import type { createClient } from "@/lib/supabase/server";
import { buildRoadmap, type RoadmapResult } from "@/lib/roadmap/roadmap-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Reads the published curriculum graph (chapters/concepts/
 * concept_relationships -- shared reference data, same read-only access
 * Knowledge Retrieval already has) plus this student's own
 * learner_concept_mastery rows, and hands them to buildRoadmap() (Epic
 * F3). No agent is called; this never writes. Not grade-scoped --
 * 02_Student_Experience.md's Learning Roadmap section names only these
 * four tables, and grades.grade_level (a text label like "Class 3") has
 * no existing mapping to learner_profiles.grade (a smallint) to filter
 * by, so this intentionally shows the full published curriculum, same as
 * every other reader of these tables today.
 */
export async function getRoadmapData(supabase: SupabaseServerClient, studentId: string): Promise<RoadmapResult | null> {
  const [chaptersRes, conceptsRes, edgesRes, masteryRes] = await Promise.all([
    supabase.from("chapters").select("id, title, sequence").eq("status", "published"),
    supabase.from("concepts").select("id, name, chapter_id").eq("status", "published"),
    supabase
      .from("concept_relationships")
      .select("from_concept_id, to_concept_id")
      .eq("relationship_type", "prerequisite_of")
      .eq("status", "published"),
    supabase.from("learner_concept_mastery").select("concept_id, mastery_score").eq("student_id", studentId),
  ]);

  if (chaptersRes.error || conceptsRes.error || edgesRes.error || masteryRes.error) {
    return null;
  }

  return buildRoadmap(
    (chaptersRes.data ?? []).map((c) => ({ id: c.id, title: c.title, sequence: c.sequence })),
    (conceptsRes.data ?? []).map((c) => ({ id: c.id, name: c.name, chapterId: c.chapter_id })),
    (edgesRes.data ?? []).map((e) => ({ fromConceptId: e.from_concept_id, toConceptId: e.to_concept_id })),
    (masteryRes.data ?? []).map((m) => ({ conceptId: m.concept_id, masteryScore: Number(m.mastery_score) })),
  );
}
