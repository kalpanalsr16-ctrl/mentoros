import type { createClient } from "@/lib/supabase/server";
import { getLearningOverview } from "@/lib/learning-overview/get-learning-overview";
import { getRevisionQueue } from "@/lib/revision/get-revision-queue";
import { buildRecommendedNext, type RecommendedNext } from "@/lib/recommended-next/recommended-next-aggregation";
import { buildLearnerModel, type EvidenceRow, type LearnerModelChapter } from "@/lib/learner-model/learner-model-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type LearnerModelData = {
  chapters: LearnerModelChapter[];
  evidenceTotal: number;
  recommendedNext: RecommendedNext | null;
};

/**
 * Reads the signed-in account's own learner state through its RLS-scoped
 * session: published curriculum and mastery (overview), published
 * prerequisite edges, its assessment events, and its revision queue.
 * Returns null if the overview can't be read.
 */
export async function getLearnerModel(
  supabase: SupabaseServerClient,
  studentId: string,
  now: Date = new Date(),
): Promise<LearnerModelData | null> {
  const [overview, edgesRes, evidenceRes, queue] = await Promise.all([
    getLearningOverview(supabase, studentId),
    supabase
      .from("concept_relationships")
      .select("from_concept_id, to_concept_id")
      .eq("relationship_type", "prerequisite_of")
      .eq("status", "published"),
    supabase
      .from("events")
      .select("payload, created_at")
      .eq("student_id", studentId)
      .eq("event_name", "assessment_completed")
      .order("created_at", { ascending: false })
      .limit(1000),
    getRevisionQueue(supabase, studentId),
  ]);

  if (!overview) return null;

  const edges = (edgesRes.data ?? []).map((e) => ({ fromId: e.from_concept_id, toId: e.to_concept_id }));
  const evidence: EvidenceRow[] = (evidenceRes.data ?? [])
    .filter((e) => typeof e.payload?.conceptId === "string" && typeof e.payload?.masteryScore === "number")
    .map((e) => ({
      conceptId: e.payload.conceptId as string,
      createdAt: e.created_at as string,
      masteryScore: e.payload.masteryScore as number,
    }));

  return {
    chapters: buildLearnerModel(overview, edges, evidence),
    evidenceTotal: evidence.length,
    recommendedNext: queue ? buildRecommendedNext(queue, now) : null,
  };
}
