import type { AssessmentReport, MasteryStatus, RecommendedNextStep } from "@/lib/agents/assessment-agent";

export type AssessmentEventRow = {
  id: string;
  created_at: string;
  payload: Record<string, unknown>;
};

export type AssessmentHistoryItem = {
  id: string;
  conceptName: string;
  createdAt: string;
  report: AssessmentReport;
};

const VALID_STATUSES: MasteryStatus[] = ["Beginner", "NeedsSupport", "Developing", "Proficient", "Mastered"];
const VALID_NEXT_STEPS: RecommendedNextStep[] = [
  "ContinueLearning",
  "GenerateMorePractice",
  "ReturnToConceptExplanation",
  "StartRevision",
  "AdvanceToNextTopic",
];

function isValidStatus(value: unknown): value is MasteryStatus {
  return typeof value === "string" && (VALID_STATUSES as string[]).includes(value);
}

function isValidNextStep(value: unknown): value is RecommendedNextStep {
  return typeof value === "string" && (VALID_NEXT_STEPS as string[]).includes(value);
}

/**
 * Maps raw `assessment_completed` event rows into the shape Assessment
 * History renders -- `report` is a real `AssessmentReport`, the exact
 * type `AssessmentFeedbackCard` (design-system/patterns/) already
 * expects, so the history page reuses that component directly rather
 * than building a second renderer for the same data, per
 * 02_Student_Experience.md's explicit reuse instruction. Pure and
 * separately unit-testable from the Supabase query in
 * get-assessment-history.ts.
 */
export function mapAssessmentEvents(rows: AssessmentEventRow[]): AssessmentHistoryItem[] {
  return rows.map((row) => {
    const payload = row.payload;
    return {
      id: row.id,
      conceptName: typeof payload.conceptName === "string" ? payload.conceptName : "This concept",
      createdAt: row.created_at,
      report: {
        masteryScore: typeof payload.masteryScore === "number" ? payload.masteryScore : 0,
        status: isValidStatus(payload.status) ? payload.status : "Beginner",
        misconceptions: Array.isArray(payload.misconceptions)
          ? payload.misconceptions.filter((item): item is string => typeof item === "string")
          : [],
        feedback: typeof payload.feedback === "string" ? payload.feedback : "",
        recommendedNextStep: isValidNextStep(payload.recommendedNextStep)
          ? payload.recommendedNextStep
          : "ContinueLearning",
      },
    };
  });
}
