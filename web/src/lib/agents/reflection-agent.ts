import type { ClaudeMessage } from "@/lib/agents/context-agent";
import type { Concept } from "@/lib/knowledge/curriculum-types";
import type { LearnerState } from "@/lib/learner/learner-state";
import type { AssessmentReport } from "@/lib/agents/assessment-agent";
import type { ReflectionAgentResult } from "@/lib/llm/client";

/**
 * Reflection Agent's input contract, per
 * 05_Agent_Architecture/11_Reflection_Agent.md's Inputs section:
 * Assessment Report (M7), Practice/Learning Session Summary (represented
 * as `history`, same simplification Practice/Assessment Agent already
 * make -- nothing persists a structured session summary anywhere), and
 * Learner Profile (read-only; `learnerState` is exactly what Planning
 * Agent already read for this same turn via PlanningContext.learnerState,
 * not a second fetch).
 */
export type ReflectionAgentContext = {
  concept: Concept | null;
  assessmentReport: AssessmentReport;
  learnerState: LearnerState;
  history: ClaudeMessage[];
};

/**
 * Per 11_Reflection_Agent.md's Reflection Categories section.
 */
export type LearningStatus =
  | "FullyMastered"
  | "MostlyMastered"
  | "PartiallyMastered"
  | "NeedsRevision"
  | "AtRisk";

/**
 * Structured output, per 11_Reflection_Agent.md's Outputs section
 * (renamed to camelCase). This is never shown to the student directly --
 * it's internal, feeding Memory Agent only (see route.ts's wiring and
 * M8's gate review for why: no session-end UX exists yet to show a
 * "Today's Learning Summary" to, so this milestone doesn't introduce one
 * ahead of a real surface for it).
 */
export type ReflectionReport = {
  concept: string;
  learningStatus: LearningStatus;
  confidence: "Low" | "Medium" | "High";
  misconceptions: string[];
  recommendedAction: string;
  reflectionSummary: string;
};

/**
 * `generate` is an injected function (the caller passes
 * generateReflection from lib/llm/client in production) -- same seam
 * every other agent in this codebase uses. Fails open.
 */
export async function reflectOnSession(
  context: ReflectionAgentContext,
  generate: (context: ReflectionAgentContext) => Promise<ReflectionAgentResult>,
): Promise<ReflectionAgentResult> {
  return generate(context);
}

/**
 * Builds the system prompt driving generateReflection(), grounded in
 * 11_Reflection_Agent.md's Reflection Principles, Evidence Considered,
 * Reflection Dimensions, Reflection Categories, and Prompt Strategy
 * sections.
 *
 * The full spec's richer Evidence Considered inputs (hint dependency,
 * difficulty progression, clarification-request counts, persistence/
 * engagement signals) aren't independently tracked anywhere in this
 * codebase yet -- this reflects on the Assessment Report and the visible
 * conversation, same evidence boundary Assessment Agent itself already
 * works within.
 */
export function buildReflectionAgentSystemPrompt(context: ReflectionAgentContext): string {
  const { concept, assessmentReport, learnerState } = context;

  const conceptText = concept
    ? `Concept: "${concept.name}" -- ${concept.description}`
    : "No specific curriculum concept was resolved for this turn -- reflect on the response on its own terms.";

  const priorMasteryText =
    concept && learnerState.masteryByConcept?.[concept.id] !== undefined
      ? `This learner's previously recorded mastery of this concept was ${learnerState.masteryByConcept[concept.id]} (on a 0-1 scale).`
      : "No prior mastery is recorded for this learner on this concept -- this may be their first attempt.";

  const weakConceptsText = learnerState.weakConceptIds?.length
    ? `This learner's previously recorded weak concepts: ${learnerState.weakConceptIds.join(", ")}.`
    : "";

  return `You are the Reflection Agent inside MentorOS, an AI tutor for Primary and High School students. Your job is to interpret learning evidence and determine what the learner has actually understood -- not just re-report their score. Per 05_Agent_Architecture/11_Reflection_Agent.md, you are out of scope for teaching, generating practice, retrieving knowledge, or evaluating answers directly; those are handled elsewhere. You look beyond the numeric score to conceptual understanding, effort, and learning patterns.

${conceptText}

${priorMasteryText}
${weakConceptsText}

The Assessment Agent's report for this response:
- Mastery score: ${assessmentReport.masteryScore}/100 (${assessmentReport.status})
- Misconceptions detected: ${assessmentReport.misconceptions.length ? assessmentReport.misconceptions.join(", ") : "none"}
- Feedback given: "${assessmentReport.feedback}"
- Recommended next step: ${assessmentReport.recommendedNextStep}

Considering the full conversation, the assessment above, and this learner's history, reflect on what they truly understood versus what the score alone suggests (e.g. a correct answer with shaky reasoning is not the same as confident mastery).

Respond with:
- concept: the concept's name (or a short description of the topic if no concept was resolved).
- learningStatus: one of FullyMastered, MostlyMastered, PartiallyMastered, NeedsRevision, or AtRisk.
- confidence: your confidence in this reflection itself -- Low, Medium, or High.
- misconceptions: an array of misconceptions this learner appears to still hold (may overlap with the Assessment Agent's list, or be empty).
- recommendedAction: a short phrase describing what should happen next (e.g. "Additional Practice", "Move to Next Topic", "Revisit Explanation").
- reflectionSummary: one or two sentences summarizing what was actually learned, in plain language.`;
}
