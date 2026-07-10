import type { createClient } from "@/lib/supabase/server";
import type { ConceptSearchProvider } from "@/lib/knowledge/concept-search-provider";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * M5B's ConceptSearchProvider implementation. Delegates the actual
 * matching to search_concept_id() (see
 * web/supabase/migrations/0002_curriculum_foundation.sql): an exact
 * case-insensitive name match first, falling back to Postgres trigram
 * similarity (pg_trgm) for a fuzzy/paraphrased topic. A real improvement
 * over M3's exact-match-only StaticCurriculumProvider, but still not
 * semantic search -- that's deferred until real curriculum scale
 * justifies an embedding provider (see the M5 design agreement).
 */
export function createTrigramConceptSearchProvider(
  supabase: SupabaseServerClient,
): ConceptSearchProvider {
  return {
    async findConceptIdByTopic(topic, subtopic) {
      if (!topic) return null;

      const { data, error } = await supabase.rpc("search_concept_id", {
        search_topic: topic,
        search_subtopic: subtopic ?? null,
      });

      if (error || !data) return null;
      return data;
    },
  };
}
