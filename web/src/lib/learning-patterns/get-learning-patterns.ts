import type { createClient } from "@/lib/supabase/server";
import { getStudentConfusion } from "@/lib/misconceptions/get-student-confusion";
import { buildRepeatedChallenges, type RepeatedChallenge } from "@/lib/learning-patterns/learning-patterns-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Real repeated-confusion data (getStudentConfusion, unchanged) joined
 * against the curriculum's own concept_relationships graph (real, seeded
 * reference data -- 0002/0003 migrations) to attach "revisit X first"
 * when a genuine prerequisite edge exists. Returns null only on a real
 * query failure; an empty array is the honest, expected common case.
 */
export async function getLearningPatterns(supabase: SupabaseServerClient, studentId: string): Promise<RepeatedChallenge[] | null> {
  const confusion = await getStudentConfusion(supabase, studentId);
  if (!confusion) return null;

  const conceptIds = [...new Set(confusion.flatMap((item) => item.conceptIds))];
  if (conceptIds.length === 0) {
    return buildRepeatedChallenges(confusion, new Map());
  }

  const { data: edges, error: edgesError } = await supabase
    .from("concept_relationships")
    .select("from_concept_id, to_concept_id")
    .eq("relationship_type", "prerequisite_of")
    .in("to_concept_id", conceptIds);

  if (edgesError) return null;

  const prerequisiteByConceptId = new Map<string, string>();
  if (edges && edges.length > 0) {
    const prerequisiteIds = [...new Set(edges.map((e) => e.from_concept_id))];
    const { data: prerequisiteConcepts, error: conceptsError } = await supabase
      .from("concepts")
      .select("id, name")
      .in("id", prerequisiteIds);

    if (conceptsError) return null;

    const nameById = new Map((prerequisiteConcepts ?? []).map((c) => [c.id, c.name]));
    for (const edge of edges) {
      const name = nameById.get(edge.from_concept_id);
      if (name) prerequisiteByConceptId.set(edge.to_concept_id, name);
    }
  }

  return buildRepeatedChallenges(confusion, prerequisiteByConceptId);
}
