import type { createClient } from "@/lib/supabase/server";
import type { ConceptRelationshipType } from "@/lib/knowledge/curriculum-types";
import {
  splitRelationships,
  groupMasteryCriteriaByObjective,
  type ConceptDetail,
  type RelationshipRow,
} from "@/lib/curriculum/curriculum-detail-aggregation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ConceptDetailResult = { status: "ok"; data: ConceptDetail } | { status: "not_found" };

/**
 * `/studio/curriculum/:conceptId` (Epic G6 detail view) -- fetches every
 * Part A/B/C entity 09_Curriculum_Foundation.md attaches to a concept.
 * Only `published` rows are ever visible to a teacher here, same
 * governance gate every other read of these tables already applies
 * (postgres-curriculum-provider.ts, list-curriculum-concepts.ts).
 *
 * A draft/deprecated/nonexistent conceptId all collapse to the same
 * `not_found` -- there's no ownership distinction to preserve here
 * (curriculum content isn't teacher-scoped), just published-or-not.
 */
export async function getConceptDetail(supabase: SupabaseServerClient, conceptId: string): Promise<ConceptDetailResult> {
  const { data: concept } = await supabase
    .from("concepts")
    .select("id, name, description, chapter_id, curriculum_standard_reference, source, effective_from, effective_until, last_reviewed_by, version")
    .eq("id", conceptId)
    .eq("status", "published")
    .maybeSingle();

  if (!concept) return { status: "not_found" };

  const { data: chapterRow } = concept.chapter_id
    ? await supabase.from("chapters").select("id, title, grade_id").eq("id", concept.chapter_id).maybeSingle()
    : { data: null };

  const { data: gradeRow } = chapterRow?.grade_id
    ? await supabase.from("grades").select("id, grade_level, subject_id").eq("id", chapterRow.grade_id).maybeSingle()
    : { data: null };

  const { data: subjectRow } = gradeRow?.subject_id
    ? await supabase.from("subjects").select("id, name").eq("id", gradeRow.subject_id).maybeSingle()
    : { data: null };

  const { data: objectiveLinks } = await supabase
    .from("concept_learning_objectives")
    .select("learning_objective_id")
    .eq("concept_id", conceptId);

  const objectiveIds = (objectiveLinks ?? []).map((l) => l.learning_objective_id);

  const { data: objectiveRows } =
    objectiveIds.length > 0
      ? await supabase
          .from("learning_objectives")
          .select("id, statement, blooms_level")
          .in("id", objectiveIds)
          .eq("status", "published")
      : { data: [] };

  const { data: masteryCriteriaRows } =
    objectiveIds.length > 0
      ? await supabase
          .from("mastery_criteria")
          .select("id, learning_objective_id, evidence_required")
          .in("learning_objective_id", objectiveIds)
          .eq("status", "published")
      : { data: [] };

  const { data: misconceptionRows } = await supabase
    .from("misconceptions")
    .select("id, description, common_triggers")
    .eq("concept_id", conceptId)
    .eq("status", "published");

  const { data: strategyRows } = await supabase
    .from("teaching_strategies")
    .select("id, description, when_to_use")
    .eq("concept_id", conceptId)
    .eq("status", "published");

  const { data: relationshipRows } = await supabase
    .from("concept_relationships")
    .select("from_concept_id, to_concept_id, relationship_type")
    .or(`from_concept_id.eq.${conceptId},to_concept_id.eq.${conceptId}`)
    .eq("status", "published");

  const relationships: RelationshipRow[] = (relationshipRows ?? []).map((r) => ({
    fromConceptId: r.from_concept_id,
    toConceptId: r.to_concept_id,
    relationshipType: r.relationship_type as ConceptRelationshipType,
  }));

  const relatedConceptIds = [
    ...new Set(relationships.map((r) => (r.fromConceptId === conceptId ? r.toConceptId : r.fromConceptId))),
  ];

  const { data: relatedConceptRows } =
    relatedConceptIds.length > 0 ? await supabase.from("concepts").select("id, name").in("id", relatedConceptIds) : { data: [] };

  const nameById = new Map((relatedConceptRows ?? []).map((c) => [c.id, c.name]));
  const { prerequisites, relatedConcepts } = splitRelationships(conceptId, relationships, nameById);

  const objectives = groupMasteryCriteriaByObjective(
    (objectiveRows ?? []).map((o) => ({ id: o.id, statement: o.statement, bloomsLevel: o.blooms_level })),
    (masteryCriteriaRows ?? []).map((mc) => ({
      id: mc.id,
      learningObjectiveId: mc.learning_objective_id,
      evidenceRequired: mc.evidence_required,
    })),
  );

  return {
    status: "ok",
    data: {
      id: concept.id,
      name: concept.name,
      description: concept.description,
      chapter: chapterRow ? { id: chapterRow.id, title: chapterRow.title } : null,
      grade: gradeRow ? { id: gradeRow.id, gradeLevel: gradeRow.grade_level } : null,
      subject: subjectRow ? { id: subjectRow.id, name: subjectRow.name } : null,
      objectives,
      misconceptions: (misconceptionRows ?? []).map((m) => ({ id: m.id, description: m.description, commonTriggers: m.common_triggers })),
      teachingStrategies: (strategyRows ?? []).map((s) => ({ id: s.id, description: s.description, whenToUse: s.when_to_use })),
      prerequisites,
      relatedConcepts,
      provenance: {
        standardCode: concept.curriculum_standard_reference,
        source: concept.source,
        effectiveFrom: concept.effective_from,
        effectiveUntil: concept.effective_until,
        lastReviewedBy: concept.last_reviewed_by,
        version: concept.version,
      },
    },
  };
}
