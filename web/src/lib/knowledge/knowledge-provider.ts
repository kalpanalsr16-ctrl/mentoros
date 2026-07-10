import type {
  Concept,
  LearningObjective,
  Misconception,
  TeachingStrategy,
  MasteryCriteria,
} from "@/lib/knowledge/curriculum-types";

/**
 * Storage-agnostic contract for reading curriculum knowledge -- Planning
 * Agent (M3) depends only on this interface, never on a database
 * directly. M5A's implementation (PostgresKnowledgeProvider) is backed
 * by real Postgres tables; this interface itself doesn't change when
 * that swap happens, and won't change again if a future implementation
 * (e.g. a caching layer, or eventually pgvector-assisted retrieval)
 * replaces PostgresKnowledgeProvider.
 *
 * As of M5, this interface is deliberately search-free -- resolving a
 * free-text topic into a concept ID is ConceptSearchProvider's job (see
 * concept-search-provider.ts), so search can evolve independently of how
 * curriculum knowledge is stored and looked up by ID.
 */
export interface KnowledgeProvider {
  getConcept(conceptId: string): Promise<Concept | null>;
  getPrerequisites(conceptId: string): Promise<Concept[]>;
  getLearningObjectives(conceptId: string): Promise<LearningObjective[]>;
  getMisconceptions(conceptId: string): Promise<Misconception[]>;
  getTeachingStrategies(conceptId: string): Promise<TeachingStrategy[]>;
  getMasteryCriteria(learningObjectiveId: string): Promise<MasteryCriteria[]>;
}
