import type { createClient } from "@/lib/supabase/server";
import type { KnowledgeProvider } from "@/lib/knowledge/knowledge-provider";
import type {
  LearningObjective,
  Misconception,
  TeachingStrategy,
  MasteryCriteria,
} from "@/lib/knowledge/curriculum-types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * M5A's KnowledgeProvider implementation -- real Postgres tables
 * (web/supabase/migrations/0002_curriculum_foundation.sql), replacing
 * M3's static in-code dataset. Every method fails soft (returns
 * null/empty on a query error) rather than throwing -- curriculum reads
 * are a non-critical enhancement layered on top of M1's reply
 * generation, the same resilience posture rate-limit.ts and
 * router-agent.ts already established.
 *
 * Queries are deliberately two-step (fetch related IDs, then fetch rows
 * by ID) rather than embedded Postgrest joins -- avoids depending on
 * exact foreign-key constraint names in query strings, and mirrors the
 * simplicity of M3's in-memory Map-based lookups.
 */
export function createPostgresKnowledgeProvider(
  supabase: SupabaseServerClient,
): KnowledgeProvider {
  return {
    async getConcept(conceptId) {
      const { data, error } = await supabase
        .from("concepts")
        .select("id, name, description")
        .eq("id", conceptId)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    },

    async getPrerequisites(conceptId) {
      const { data: relationships, error: relationshipsError } = await supabase
        .from("concept_relationships")
        .select("from_concept_id")
        .eq("to_concept_id", conceptId)
        .eq("relationship_type", "prerequisite_of");

      if (relationshipsError || !relationships || relationships.length === 0) {
        return [];
      }

      const { data: concepts, error: conceptsError } = await supabase
        .from("concepts")
        .select("id, name, description")
        .in(
          "id",
          relationships.map((r) => r.from_concept_id),
        );

      if (conceptsError || !concepts) return [];
      return concepts;
    },

    async getLearningObjectives(conceptId) {
      const { data: links, error: linksError } = await supabase
        .from("concept_learning_objectives")
        .select("learning_objective_id")
        .eq("concept_id", conceptId);

      if (linksError || !links || links.length === 0) return [];
      const objectiveIds = links.map((l) => l.learning_objective_id);

      const { data: objectives, error: objectivesError } = await supabase
        .from("learning_objectives")
        .select("id, statement, blooms_level")
        .in("id", objectiveIds);

      if (objectivesError || !objectives || objectives.length === 0) return [];

      // A second query for the *complete* set of concept links per
      // objective -- an integrative objective (e.g. M3's
      // lo-word-problem-add-sub) belongs to more than one concept, and
      // LearningObjective.conceptIds should reflect all of them, not
      // just the one this lookup was scoped by.
      const { data: allLinks } = await supabase
        .from("concept_learning_objectives")
        .select("concept_id, learning_objective_id")
        .in("learning_objective_id", objectiveIds);

      const objectiveIdToConceptIds = new Map<string, string[]>();
      for (const link of allLinks ?? []) {
        const existing = objectiveIdToConceptIds.get(link.learning_objective_id) ?? [];
        existing.push(link.concept_id);
        objectiveIdToConceptIds.set(link.learning_objective_id, existing);
      }

      return objectives.map(
        (o): LearningObjective => ({
          id: o.id,
          statement: o.statement,
          bloomsLevel: o.blooms_level as LearningObjective["bloomsLevel"],
          conceptIds: objectiveIdToConceptIds.get(o.id) ?? [],
        }),
      );
    },

    async getMisconceptions(conceptId) {
      const { data, error } = await supabase
        .from("misconceptions")
        .select("id, concept_id, description, common_triggers")
        .eq("concept_id", conceptId);

      if (error || !data) return [];
      return data.map(
        (m): Misconception => ({
          id: m.id,
          conceptId: m.concept_id,
          description: m.description,
          commonTriggers: m.common_triggers ?? undefined,
        }),
      );
    },

    async getTeachingStrategies(conceptId) {
      const { data, error } = await supabase
        .from("teaching_strategies")
        .select("id, concept_id, description, when_to_use")
        .eq("concept_id", conceptId);

      if (error || !data) return [];
      return data.map(
        (t): TeachingStrategy => ({
          id: t.id,
          conceptId: t.concept_id,
          description: t.description,
          whenToUse: t.when_to_use ?? undefined,
        }),
      );
    },

    async getMasteryCriteria(learningObjectiveId) {
      const { data, error } = await supabase
        .from("mastery_criteria")
        .select("id, learning_objective_id, evidence_required")
        .eq("learning_objective_id", learningObjectiveId);

      if (error || !data) return [];
      return data.map(
        (m): MasteryCriteria => ({
          id: m.id,
          learningObjectiveId: m.learning_objective_id,
          evidenceRequired: m.evidence_required,
        }),
      );
    },
  };
}
