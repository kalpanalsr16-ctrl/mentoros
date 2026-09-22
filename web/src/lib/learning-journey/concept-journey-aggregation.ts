import { mapAssessmentEvents, type AssessmentEventRow, type AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

/**
 * Concept Detail's timeline (learner UI redesign). Deliberately does NOT
 * include a "times explained" count: `concept_explained` events
 * (route.ts) log only model/nextStep/confidence/tokens/latency -- no
 * conceptId or conceptName was ever logged on that event, so there is no
 * reliable way to attribute a past explanation turn to this specific
 * concept. Guessing via router topic/subtopic substring matching would
 * be exactly the "unreliable inference" this redesign was told not to
 * build. Practice and Assessment events DO carry a real conceptId
 * (route.ts logs both), so those two are the real, attributable history
 * this page shows.
 */
export type PracticeEventRow = { id: string; created_at: string; payload: Record<string, unknown> };

export type ConceptPracticeItem = {
  id: string;
  createdAt: string;
  difficulty: string | null;
  questionCount: number | null;
};

export type ConceptJourney = {
  practiceItems: ConceptPracticeItem[];
  assessmentItems: AssessmentHistoryItem[];
};

/**
 * "Why MentorOS thinks this" -- built only from fields that genuinely
 * exist on learner_concept_mastery (attempts, mastery_score,
 * last_practiced_at, common_mistakes). Deliberately does not claim a
 * hint count or per-question correctness -- no such data is logged
 * anywhere in this codebase (no practice_attempts/question_attempts
 * table exists, and practice_generated only logs an aggregate
 * questionCount, never per-question results).
 */
export function buildConceptReasoning(
  attempts: number,
  masteryScore: number,
  lastPracticedAt: string | null,
  commonMistakes: string[],
  now: Date = new Date(),
): string {
  if (attempts === 0) {
    return "You haven't attempted this concept yet, so there's nothing to base an assessment on.";
  }

  const attemptPhrase = `${attempts} attempt${attempts === 1 ? "" : "s"} so far`;
  const daysAgo = lastPracticedAt
    ? Math.floor((now.getTime() - new Date(lastPracticedAt).getTime()) / (24 * 60 * 60 * 1000))
    : null;
  const recencyPhrase =
    daysAgo === null ? "" : daysAgo === 0 ? ", last practiced today" : `, last practiced ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago`;
  const mistakePhrase = commonMistakes.length > 0 ? ` Recurring mistake noted: "${commonMistakes[0]}".` : "";

  return `${attemptPhrase}${recencyPhrase}. Current understanding: ${masteryScore}%.${mistakePhrase}`;
}

export function mapPracticeEvents(rows: PracticeEventRow[]): ConceptPracticeItem[] {
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    difficulty: typeof row.payload.difficulty === "string" ? row.payload.difficulty : null,
    questionCount: typeof row.payload.questionCount === "number" ? row.payload.questionCount : null,
  }));
}

export function buildConceptJourney(
  practiceRows: PracticeEventRow[],
  assessmentRows: AssessmentEventRow[],
): ConceptJourney {
  return {
    practiceItems: mapPracticeEvents(practiceRows).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    assessmentItems: mapAssessmentEvents(assessmentRows).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}
