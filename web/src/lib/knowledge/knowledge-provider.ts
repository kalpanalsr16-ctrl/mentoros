import type {
  Concept,
  LearningObjective,
  Misconception,
  TeachingStrategy,
  MasteryCriteria,
} from "@/lib/knowledge/curriculum-types";

/**
 * Storage-agnostic contract for reading curriculum knowledge -- Planning
 * Agent (M3) depends only on this interface, never on a database or a
 * specific dataset. Today's implementation (StaticCurriculumProvider) is
 * backed by an in-code dataset for a single chapter; M5's Knowledge
 * Retrieval Agent can later hand Planning a Postgres/pgvector-backed
 * implementation without any change to Planning Agent's own code.
 */
export interface KnowledgeProvider {
  /**
   * Resolves free-text topic/subtopic (as extracted by Router Agent, which
   * has no taxonomy to validate against -- see M2-01's open issue) into a
   * real Concept. A simple name match today; real semantic matching is
   * explicitly M5's problem, not faked here.
   */
  findConceptByTopic(
    topic: string | undefined,
    subtopic?: string,
  ): Promise<Concept | null>;

  getPrerequisites(conceptId: string): Promise<Concept[]>;
  getLearningObjectives(conceptId: string): Promise<LearningObjective[]>;
  getMisconceptions(conceptId: string): Promise<Misconception[]>;
  getTeachingStrategies(conceptId: string): Promise<TeachingStrategy[]>;
  getMasteryCriteria(learningObjectiveId: string): Promise<MasteryCriteria[]>;
}
