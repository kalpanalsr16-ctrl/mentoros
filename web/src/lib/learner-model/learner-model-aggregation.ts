import type { ConceptStatus, OverviewChapter } from "@/lib/learning-overview/learning-overview-aggregation";
import type { RetentionClassification } from "@/lib/retention/retention-aggregation";

export type PrerequisiteState = "mastered" | "developing" | "missing";

export type PrerequisiteLink = { conceptId: string; conceptName: string; state: PrerequisiteState };

export type EvidenceRow = { conceptId: string; createdAt: string; masteryScore: number };

export type LearnerModelConcept = {
  conceptId: string;
  conceptName: string;
  status: ConceptStatus;
  masteryScore: number;
  retentionStatus: RetentionClassification | null;
  attempts: number;
  lastPracticedAt: string | null;
  commonMistakes: string[];
  evidenceCount: number;
  lastAssessedAt: string | null;
  lastAssessedScore: number | null;
  prerequisites: PrerequisiteLink[];
  reasoning: string;
};

export type LearnerModelChapter = { chapterId: string; chapterTitle: string; concepts: LearnerModelConcept[] };

/** A prerequisite counts as mastered only when MentorOS has mastered it, developing when it's been attempted, missing when it's untouched. */
export function prerequisiteState(status: ConceptStatus | undefined): PrerequisiteState {
  if (status === "mastered") return "mastered";
  if (status === undefined || status === "new") return "missing";
  return "developing";
}

/**
 * Joins the published curriculum (overview), its prerequisite edges, and the
 * student's own assessed evidence into one model. Edges touching a concept
 * outside the overview (draft content) are ignored, so unpublished curriculum
 * never appears as learner state.
 */
export function buildLearnerModel(
  chapters: OverviewChapter[],
  prerequisiteEdges: { fromId: string; toId: string }[],
  evidence: EvidenceRow[],
): LearnerModelChapter[] {
  const conceptById = new Map<string, { name: string; status: ConceptStatus }>();
  for (const chapter of chapters) {
    for (const concept of chapter.concepts) {
      conceptById.set(concept.conceptId, { name: concept.conceptName, status: concept.status });
    }
  }

  return chapters.map((chapter) => ({
    chapterId: chapter.chapterId,
    chapterTitle: chapter.chapterTitle,
    concepts: chapter.concepts.map((concept) => {
      const own = evidence
        .filter((e) => e.conceptId === concept.conceptId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const prerequisites = prerequisiteEdges
        .filter((edge) => edge.toId === concept.conceptId && conceptById.has(edge.fromId))
        .map((edge) => {
          const prereq = conceptById.get(edge.fromId)!;
          return { conceptId: edge.fromId, conceptName: prereq.name, state: prerequisiteState(prereq.status) };
        });
      return {
        conceptId: concept.conceptId,
        conceptName: concept.conceptName,
        status: concept.status,
        masteryScore: concept.masteryScore,
        retentionStatus: concept.retentionStatus,
        attempts: concept.attempts,
        lastPracticedAt: concept.lastPracticedAt,
        commonMistakes: concept.commonMistakes,
        evidenceCount: own.length,
        lastAssessedAt: own[0]?.createdAt ?? null,
        lastAssessedScore: own[0]?.masteryScore ?? null,
        prerequisites,
        reasoning: concept.reasoning,
      };
    }),
  }));
}
