import type { ConceptRelationshipType } from "@/lib/knowledge/curriculum-types";

/**
 * Pure aggregation for GET /api/teacher/curriculum/:conceptId (Epic G6
 * Curriculum Explorer detail view) -- same DB-free, unit-testable split
 * as roster-aggregation.ts. `getConceptDetail` (the DB wrapper) fetches
 * the raw joined rows; everything here just shapes them.
 */

export type ChapterRef = { id: string; title: string } | null;
export type GradeRef = { id: string; gradeLevel: string } | null;
export type SubjectRef = { id: string; name: string } | null;

export type ObjectiveRow = { id: string; statement: string; bloomsLevel: string };
export type MasteryCriteriaRow = { id: string; learningObjectiveId: string; evidenceRequired: string };
export type MisconceptionRow = { id: string; description: string; commonTriggers: string | null };
export type TeachingStrategyRow = { id: string; description: string; whenToUse: string | null };
export type RelationshipRow = { fromConceptId: string; toConceptId: string; relationshipType: ConceptRelationshipType };

export type ConceptRef = { id: string; name: string };
export type RelatedConcept = ConceptRef & { relationshipType: ConceptRelationshipType };

export type ObjectiveWithCriteria = ObjectiveRow & { masteryCriteria: MasteryCriteriaRow[] };

export type ConceptDetail = {
  id: string;
  name: string;
  description: string;
  chapter: ChapterRef;
  grade: GradeRef;
  subject: SubjectRef;
  objectives: ObjectiveWithCriteria[];
  misconceptions: MisconceptionRow[];
  teachingStrategies: TeachingStrategyRow[];
  prerequisites: ConceptRef[];
  relatedConcepts: RelatedConcept[];
  provenance: {
    standardCode: string | null;
    source: string | null;
    effectiveFrom: string | null;
    effectiveUntil: string | null;
    lastReviewedBy: string | null;
    version: number;
  };
};

/**
 * A `prerequisite_of` edge reads `fromConceptId is a prerequisite of
 * toConceptId` (09_Curriculum_Foundation.md, A7). So an incoming edge
 * (`toConceptId === conceptId`) surfaces `fromConceptId` as one of this
 * concept's own prerequisites; every other edge -- including the reverse
 * direction of `prerequisite_of` (this concept being a prerequisite of
 * something else) -- is "related," tagged with its relationship type so
 * the page can still show direction-specific labels.
 */
export function splitRelationships(
  conceptId: string,
  rows: RelationshipRow[],
  nameById: Map<string, string>,
): { prerequisites: ConceptRef[]; relatedConcepts: RelatedConcept[] } {
  const prerequisites: ConceptRef[] = [];
  const relatedConcepts: RelatedConcept[] = [];

  for (const row of rows) {
    if (row.relationshipType === "prerequisite_of" && row.toConceptId === conceptId) {
      const id = row.fromConceptId;
      prerequisites.push({ id, name: nameById.get(id) ?? id });
      continue;
    }

    const otherId = row.fromConceptId === conceptId ? row.toConceptId : row.fromConceptId;
    relatedConcepts.push({ id: otherId, name: nameById.get(otherId) ?? otherId, relationshipType: row.relationshipType });
  }

  return { prerequisites, relatedConcepts };
}

export function groupMasteryCriteriaByObjective(
  objectives: ObjectiveRow[],
  masteryCriteria: MasteryCriteriaRow[],
): ObjectiveWithCriteria[] {
  return objectives.map((objective) => ({
    ...objective,
    masteryCriteria: masteryCriteria.filter((mc) => mc.learningObjectiveId === objective.id),
  }));
}
