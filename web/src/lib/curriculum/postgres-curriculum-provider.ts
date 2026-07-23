import type { createClient } from "@/lib/supabase/server";
import type { CurriculumProvider, CurriculumSearchResult } from "@/lib/curriculum/curriculum-provider";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const SEARCH_LIMIT = 20;

/** Escapes ILIKE's own wildcard characters so a search term is matched literally, not interpreted as a user-supplied pattern. */
function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

/**
 * G5's CurriculumProvider implementation, reusing M5's existing
 * curriculum tables (0002_curriculum_foundation.sql) read-only -- no new
 * migration, no new RLS (concepts' existing "authenticated users can
 * read" policy already covers this). Mirrors
 * createPostgresKnowledgeProvider's exact shape: a factory over the
 * request-scoped Supabase client, fail-soft (returns `[]` on a query
 * error rather than throwing), so it plugs into the same
 * dependency-injection convention wherever G6 ends up constructing it.
 *
 * Only `published` concepts are ever returned -- draft/deprecated rows
 * stay invisible to a teacher browsing the curriculum, same governance
 * `status` already enforces everywhere else this column is read.
 * `curriculum_standard_reference` maps directly to `standardCode` --
 * real, already-existing data, nothing new added for this sprint.
 */
export function createPostgresCurriculumProvider(supabase: SupabaseServerClient): CurriculumProvider {
  return {
    source: "postgres",

    async search(query) {
      const trimmed = query.trim();
      if (!trimmed) return [];

      const { data, error } = await supabase
        .from("concepts")
        .select("id, name, curriculum_standard_reference")
        .eq("status", "published")
        .ilike("name", `%${escapeIlikePattern(trimmed)}%`)
        .limit(SEARCH_LIMIT);

      if (error || !data) return [];

      return data.map(
        (c): CurriculumSearchResult => ({
          id: c.id,
          name: c.name,
          source: "postgres",
          standardCode: c.curriculum_standard_reference ?? undefined,
        }),
      );
    },
  };
}
