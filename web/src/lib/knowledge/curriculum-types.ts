/**
 * TypeScript mirror of 09_Curriculum_Foundation.md's Part A (Curriculum
 * Structure) and Part B (Pedagogical Knowledge) entities. These types are
 * the contract KnowledgeProvider implementations return -- storage-agnostic
 * on purpose, so a Postgres-backed implementation (M5) returns the exact
 * same shapes a static, in-code implementation does today.
 */

export type ConceptRelationshipType =
  | "prerequisite_of"
  | "builds_on"
  | "related_to"
  | "part_of";

export type Concept = {
  id: string;
  name: string;
  description: string;
};

export type ConceptRelationship = {
  fromConceptId: string;
  toConceptId: string;
  type: ConceptRelationshipType;
};

export type BloomsLevel =
  | "Remember"
  | "Understand"
  | "Apply"
  | "Analyze"
  | "Evaluate"
  | "Create";

export type LearningObjective = {
  id: string;
  statement: string;
  bloomsLevel: BloomsLevel;
  conceptIds: string[];
};

/**
 * Misconception, TeachingStrategy, and MasteryCriteria carry the
 * narrower Pedagogical Knowledge metadata profile (Part C2) --
 * `source`/`lastReviewedBy` only, deliberately no curriculum-standard
 * reference or effective dates. See 09_Curriculum_Foundation.md's Part C
 * for the full rationale.
 */
export type Misconception = {
  id: string;
  conceptId: string;
  description: string;
  commonTriggers?: string;
  source?: string;
  lastReviewedBy?: string;
};

export type TeachingStrategy = {
  id: string;
  conceptId: string;
  description: string;
  whenToUse?: string;
  source?: string;
  lastReviewedBy?: string;
};

export type MasteryCriteria = {
  id: string;
  learningObjectiveId: string;
  evidenceRequired: string;
  source?: string;
  lastReviewedBy?: string;
};
