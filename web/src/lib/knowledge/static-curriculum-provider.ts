import type { KnowledgeProvider } from "@/lib/knowledge/knowledge-provider";
import type {
  Concept,
  ConceptRelationship,
  LearningObjective,
  Misconception,
  TeachingStrategy,
  MasteryCriteria,
} from "@/lib/knowledge/curriculum-types";

export type CurriculumDatasetMetadata = {
  board: string;
  grade: string;
  subject: string;
  chapter: string;
};

/**
 * A single, self-contained curriculum dataset -- one chapter's worth of
 * Part A/B entities from 09_Curriculum_Foundation.md. Which board, grade,
 * subject, and chapter this represents is data (see metadata), never part
 * of this engine's own name or code -- a second dataset (a different
 * chapter, grade, or subject) plugs into the exact same provider.
 */
export type CurriculumDataset = {
  metadata: CurriculumDatasetMetadata;
  concepts: Concept[];
  relationships: ConceptRelationship[];
  learningObjectives: LearningObjective[];
  misconceptions: Misconception[];
  teachingStrategies: TeachingStrategy[];
  masteryCriteria: MasteryCriteria[];
};

/**
 * First KnowledgeProvider implementation: an in-memory, in-code dataset,
 * no database involved. Deliberately generic over `dataset` -- this file
 * never mentions NCERT, a grade, or a subject; that specificity lives
 * entirely in whichever dataset is passed in (see
 * lib/knowledge/datasets/).
 */
export function createStaticCurriculumProvider(
  dataset: CurriculumDataset,
): KnowledgeProvider {
  const conceptsById = new Map(dataset.concepts.map((c) => [c.id, c]));

  return {
    async findConceptByTopic(topic, subtopic) {
      if (!topic) return null;
      const normalize = (s: string) => s.trim().toLowerCase();
      const target = subtopic ? normalize(subtopic) : normalize(topic);

      const bySubtopic = dataset.concepts.find(
        (c) => normalize(c.name) === target,
      );
      if (bySubtopic) return bySubtopic;

      const byTopic = dataset.concepts.find(
        (c) => normalize(c.name) === normalize(topic),
      );
      return byTopic ?? null;
    },

    async getPrerequisites(conceptId) {
      return dataset.relationships
        .filter(
          (r) => r.toConceptId === conceptId && r.type === "prerequisite_of",
        )
        .map((r) => conceptsById.get(r.fromConceptId))
        .filter((c): c is Concept => c !== undefined);
    },

    async getLearningObjectives(conceptId) {
      return dataset.learningObjectives.filter((o) =>
        o.conceptIds.includes(conceptId),
      );
    },

    async getMisconceptions(conceptId) {
      return dataset.misconceptions.filter((m) => m.conceptId === conceptId);
    },

    async getTeachingStrategies(conceptId) {
      return dataset.teachingStrategies.filter(
        (t) => t.conceptId === conceptId,
      );
    },

    async getMasteryCriteria(learningObjectiveId) {
      return dataset.masteryCriteria.filter(
        (m) => m.learningObjectiveId === learningObjectiveId,
      );
    },
  };
}
