import type { RecommendedNextStep } from "@/lib/agents/assessment-agent";
import type { AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

export type ChildRecommendation = {
  conceptName: string;
  step: RecommendedNextStep;
  sentence: string;
};

/**
 * "Surfaces the same 'suggested next step' logic... aggregated across
 * recent turns" (04_Parent_Portal.md's Recommendations section). Read
 * literally, that's the *current* recommendation, not a tally across
 * many -- the most recent assessment's recommendedNextStep already is
 * the aggregate state, since Assessment Agent produces one fresh value
 * per turn rather than something a parent should average. Items arrive
 * newest-first (getAssessmentHistoryData orders by created_at desc), so
 * this is just items[0].
 *
 * "Design Principle 1.2 applies to parent-facing surfaces too... never
 * a long list" -- a single Card, one plain sentence, not the short
 * badge label (AssessmentFeedbackCard's own SHORT labels) a student sees
 * in-context.
 */
const SENTENCE_BY_STEP: Record<RecommendedNextStep, (conceptName: string) => string> = {
  ContinueLearning: (name) => `${name} is progressing well -- no change needed, just keep going at the current pace.`,
  GenerateMorePractice: (name) => `A bit more practice on ${name} would help build confidence.`,
  ReturnToConceptExplanation: (name) => `Revisiting the explanation for ${name} may help clear up some confusion.`,
  StartRevision: (name) => `It's a good time to revise ${name} to keep it fresh.`,
  AdvanceToNextTopic: (name) => `${name} looks solid -- ready to move on to the next topic.`,
};

export function deriveChildRecommendation(items: AssessmentHistoryItem[]): ChildRecommendation | null {
  if (items.length === 0) return null;
  const latest = items[0];
  return {
    conceptName: latest.conceptName,
    step: latest.report.recommendedNextStep,
    sentence: SENTENCE_BY_STEP[latest.report.recommendedNextStep](latest.conceptName),
  };
}
