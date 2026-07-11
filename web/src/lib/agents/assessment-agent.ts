import type { ClaudeMessage } from "@/lib/agents/context-agent";
import type { LearningPlan } from "@/lib/agents/planning-agent";
import {
  describePersonalizationForPrompt,
  type PersonalizationProfile,
} from "@/lib/agents/personalization-agent";
import type { Concept, LearningObjective, Misconception } from "@/lib/knowledge/curriculum-types";
import type { AssessmentAgentResult } from "@/lib/llm/client";

/**
 * Assessment Agent's input contract, per
 * 05_Agent_Architecture/10_Assessment_Agent.md's Inputs section: Learner
 * Response, Practice Context, Learning Plan (M3), Personalization Profile
 * (M4), and Context Object. `concept` is nullable here, unlike Concept/
 * Practice Agent's contexts -- Assessment can still evaluate a learner's
 * answer even when no curriculum concept resolved for this turn (e.g. the
 * router classified "Assessment" intent on a free-form answer to a
 * question asked several turns back in a different topic).
 *
 * `practiceContext` is a deliberate simplification of the spec's richer
 * Practice Context (original question, difficulty level, hint history):
 * it's the immediately preceding assistant message's text, extracted by
 * extractPracticeContext() below, since nothing in this codebase tags a
 * given assistant turn as "this was a generated practice question" yet
 * (no persisted PracticeSet/hint-history store). Honest best-effort
 * context, not the full spec'd shape.
 */
export type AssessmentAgentContext = {
  concept: Concept | null;
  learningObjectives: LearningObjective[];
  misconceptions: Misconception[];
  practiceContext: string;
  plan: LearningPlan;
  personalizationProfile: PersonalizationProfile;
  history: ClaudeMessage[];
};

/**
 * Per 10_Assessment_Agent.md's Mastery Levels table -- kept as a named,
 * exported constant (not inlined) so deriveMasteryStatus() below can be
 * unit-tested against the exact documented thresholds.
 */
export const MASTERY_LEVEL_THRESHOLDS = [
  { min: 90, status: "Mastered" as const },
  { min: 75, status: "Proficient" as const },
  { min: 60, status: "Developing" as const },
  { min: 40, status: "NeedsSupport" as const },
  { min: 0, status: "Beginner" as const },
];

export type MasteryStatus = (typeof MASTERY_LEVEL_THRESHOLDS)[number]["status"];

export type RecommendedNextStep =
  | "ContinueLearning"
  | "GenerateMorePractice"
  | "ReturnToConceptExplanation"
  | "StartRevision"
  | "AdvanceToNextTopic";

/**
 * The model outputs `masteryScore` only; `status` is derived
 * deterministically here rather than trusted from the model, so the
 * spec's Mastery Levels table is actually enforced every time rather than
 * hoped to be applied consistently by the model on each call.
 */
export type AssessmentReport = {
  masteryScore: number;
  status: MasteryStatus;
  misconceptions: string[];
  feedback: string;
  recommendedNextStep: RecommendedNextStep;
};

/**
 * Deterministic mapping from a 0-100 mastery score to the spec's Mastery
 * Levels table. Exported and pure so it's directly unit-testable at each
 * documented boundary (40/60/75/90).
 */
export function deriveMasteryStatus(masteryScore: number): MasteryStatus {
  const level = MASTERY_LEVEL_THRESHOLDS.find((l) => masteryScore >= l.min);
  return (level ?? MASTERY_LEVEL_THRESHOLDS[MASTERY_LEVEL_THRESHOLDS.length - 1]).status;
}

/**
 * Best-effort Practice Context extraction: the immediately preceding
 * assistant message in `history`. `history`'s last entry is always the
 * current user turn just saved (see context-agent.ts), so the previous
 * assistant message -- if any -- is the second-to-last entry. Returns an
 * empty string (not undefined/null) when there isn't one, so callers can
 * always interpolate it directly into a prompt.
 */
export function extractPracticeContext(history: ClaudeMessage[]): string {
  for (let i = history.length - 2; i >= 0; i--) {
    if (history[i].role === "assistant") {
      return history[i].content;
    }
  }
  return "";
}

/**
 * `generate` is an injected function (the caller passes generateAssessment
 * from lib/llm/client in production) -- same seam as every other agent in
 * this codebase. Fails open.
 */
export async function evaluateResponse(
  context: AssessmentAgentContext,
  generate: (context: AssessmentAgentContext) => Promise<AssessmentAgentResult>,
): Promise<AssessmentAgentResult> {
  return generate(context);
}

/**
 * Composes the structured AssessmentReport into the plain-text message
 * MentorOS actually stores/displays, per the spec's Feedback Strategy
 * (recognize effort, identify strengths, explain mistakes, suggest
 * improvement, recommend next action) -- `feedback` is expected to
 * already read as that full structure (the system prompt asks for it),
 * so this just appends the mastery estimate as a short trailing line
 * rather than re-deriving the feedback text.
 */
export function formatAssessmentReportAsReply(report: AssessmentReport): string {
  return `${report.feedback}\n\n(Estimated mastery: ${report.masteryScore}/100 -- ${report.status})`;
}

/**
 * Builds the system prompt driving generateAssessment(), grounded in
 * 10_Assessment_Agent.md's Assessment Principles, Evaluation Dimensions,
 * Feedback Strategy, Misconception Detection, and Progress Decision
 * sections.
 *
 * The full spec's Assessment State write and cross-session mastery
 * tracking are deliberately not implemented -- there's no Memory Agent
 * (M8) yet to own persisted mastery, per the same "don't build a writer
 * before something reads it" reasoning M3/M4/M6 already established.
 * This produces one assessment for one learner response; it doesn't
 * accumulate evidence across turns.
 */
export function buildAssessmentAgentSystemPrompt(context: AssessmentAgentContext): string {
  const { concept, learningObjectives, misconceptions, practiceContext, plan, personalizationProfile } = context;

  const conceptText = concept
    ? `Concept being assessed: "${concept.name}" -- ${concept.description}`
    : "No specific curriculum concept was resolved for this turn -- assess the response on its own terms.";

  const objectivesText = learningObjectives.length
    ? learningObjectives.map((o) => `- ${o.statement}`).join("\n")
    : "- (none recorded for this concept)";

  const misconceptionsText = misconceptions.length
    ? misconceptions.map((m) => `- ${m.description}`).join("\n")
    : "- (none recorded for this concept)";

  return `You are the Assessment Agent inside MentorOS, an AI tutor for Primary and High School students. Your job is to evaluate how well the student understands a concept, not just whether their final answer is correct -- per 05_Agent_Architecture/10_Assessment_Agent.md, you are out of scope for explaining concepts, generating practice questions, or updating the learner profile; those are handled elsewhere.

${conceptText}

Learning objectives relevant to this assessment:
${objectivesText}

Known misconceptions to check for in the student's response:
${misconceptionsText}

The question or practice prompt the student was responding to (best-effort context; may be empty if none was found): "${practiceContext}"

Planning Agent's decision for this turn: strategy "${plan.strategy}" (${plan.rationale}).

Personalization guidance: ${describePersonalizationForPrompt(personalizationProfile)}

Evaluate the student's most recent message (the last message in the conversation) as their response. Consider correctness, conceptual understanding, reasoning, and whether the response reveals any of the misconceptions listed above -- not just whether the final answer matches. Follow this feedback structure: recognize effort, identify what they got right, explain any mistake, suggest an improvement, then recommend a next action.

Respond with:
- masteryScore: your estimate of this response's mastery, 0 to 100.
- misconceptions: an array of misconception names/descriptions this response revealed (empty array if none).
- feedback: the full feedback following the structure above, as natural, encouraging prose -- this is shown directly to the student.
- recommendedNextStep: one of ContinueLearning, GenerateMorePractice, ReturnToConceptExplanation, StartRevision, or AdvanceToNextTopic.`;
}
