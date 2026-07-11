import type { ClaudeMessage } from "@/lib/agents/context-agent";
import type { LearningPlan } from "@/lib/agents/planning-agent";
import {
  describePersonalizationForPrompt,
  type PersonalizationProfile,
} from "@/lib/agents/personalization-agent";
import type {
  Concept,
  LearningObjective,
  Misconception,
  TeachingStrategy,
} from "@/lib/knowledge/curriculum-types";
import type { ConceptAgentResult } from "@/lib/llm/client";

/**
 * Concept Agent's input contract, per
 * 05_Agent_Architecture/08_Concept_Agent.md's Inputs section: Knowledge
 * Package (concept + everything M5 resolved for it), Learning Plan (M3),
 * Personalization Profile (M4), and Context Object (M1's conversation
 * history). `concept` is non-null here -- callers only construct this
 * once Planning has actually resolved one (see the route's
 * `plan.strategy !== "Diagnostic"` gate); Concept Agent has nothing to
 * teach without a Knowledge Package, per its own Inputs section.
 */
export type ConceptAgentContext = {
  concept: Concept;
  learningObjectives: LearningObjective[];
  misconceptions: Misconception[];
  teachingStrategies: TeachingStrategy[];
  plan: LearningPlan;
  personalizationProfile: PersonalizationProfile;
  history: ClaudeMessage[];
};

/**
 * Structured teaching output, per 08_Concept_Agent.md's Outputs section
 * (`concept`/`explanation`/`example`/`next_step`/`confidence`, renamed to
 * camelCase for this codebase's convention). `nextStep` and `confidence`
 * are logged as observability payload in M6 v1 but not acted on -- there's
 * no Practice Agent (M7) yet to consume a "Practice" recommendation, and
 * no re-retrieval loop for a low-confidence result (see M6's gate review
 * for what's deliberately deferred and why).
 */
export type TeachingResponse = {
  concept: string;
  explanation: string;
  example: string;
  nextStep: "Practice" | "Clarification" | "Summary";
  confidence: number;
};

/**
 * `generate` is an injected function (the caller passes
 * generateConceptExplanation from lib/llm/client in production), mirroring
 * router-agent.ts's classifyIntent seam -- this module has no runtime
 * dependency on the Anthropic SDK, so the (currently trivial) orchestration
 * here is unit-testable with a mock, and this file stays purely about what
 * Concept Agent needs as input, not how generation happens.
 *
 * Fails open: a generation failure returns the same shape
 * classifyIntentWithClaude/generateTeachingReply's failures already do,
 * so the route can fall back to the existing free-text reply path rather
 * than surfacing a raw error to the student.
 */
export async function explainConcept(
  context: ConceptAgentContext,
  generate: (context: ConceptAgentContext) => Promise<ConceptAgentResult>,
): Promise<ConceptAgentResult> {
  return generate(context);
}

/**
 * Composes the structured TeachingResponse into the plain-text message
 * MentorOS actually stores/displays -- the chat surface is a simple text
 * transcript (messages.content), not a renderer for structured teaching
 * output, so `explanation` and `example` are joined into one reply here
 * rather than the route needing to know this shape.
 */
export function formatTeachingResponseAsReply(response: TeachingResponse): string {
  return response.example
    ? `${response.explanation}\n\nFor example: ${response.example}`
    : response.explanation;
}

/**
 * Builds the system prompt driving generateConceptExplanation(), grounded
 * directly in 08_Concept_Agent.md's Teaching Principles, Teaching
 * Framework, Explanation Styles, Example Selection, Understanding Checks,
 * and Prompt Strategy sections. Kept here (not in lib/llm/client.ts) and
 * as a pure string-building function, same convention
 * describePersonalizationForPrompt() already established -- unit-testable
 * without touching the Anthropic SDK.
 *
 * The full spec's Adaptive Teaching / Retry Strategy (re-explaining across
 * turns when a learner stays confused) is deliberately not implemented
 * here -- there's no signal anywhere in the pipeline yet for "the learner
 * is still confused by the previous explanation" (Router classifies
 * intent categories, not confusion-with-a-prior-turn), and building one
 * without Assessment/Reflection (M7/M8) existing to inform it would be
 * guessing. What *is* implemented: the framework's steps collapsed into a
 * single response (Connect/Explain/Illustrate/Example folded into
 * `explanation` and `example`; Check Understanding becomes a question at
 * the end of `explanation`; Summarize/Transition becomes `nextStep`).
 */
export function buildConceptAgentSystemPrompt(context: ConceptAgentContext): string {
  const { concept, learningObjectives, misconceptions, teachingStrategies, plan, personalizationProfile } = context;

  const objectivesText = learningObjectives.length
    ? learningObjectives.map((o) => `- ${o.statement}`).join("\n")
    : "- (none recorded for this concept)";

  const misconceptionsText = misconceptions.length
    ? misconceptions
        .map((m) => `- ${m.description}${m.commonTriggers ? ` (commonly triggered by: ${m.commonTriggers})` : ""}`)
        .join("\n")
    : "- (none recorded for this concept)";

  const strategiesText = teachingStrategies.length
    ? teachingStrategies
        .map((s) => `- ${s.description}${s.whenToUse ? ` (use when: ${s.whenToUse})` : ""}`)
        .join("\n")
    : "- (none recorded for this concept)";

  return `You are the Concept Agent inside MentorOS, an AI tutor for Primary and High School students. Your job is to teach this concept in a way that maximizes understanding, not to just answer a question -- per 05_Agent_Architecture/08_Concept_Agent.md, you are out of scope for retrieving content, generating assessments, evaluating answers, or choosing the teaching strategy; those are already decided for you below.

Concept to teach: "${concept.name}" -- ${concept.description}

Learning objectives for this concept:
${objectivesText}

Known misconceptions to watch for and gently correct if relevant:
${misconceptionsText}

Suggested teaching strategies for this concept:
${strategiesText}

Planning Agent's decision for this turn: strategy "${plan.strategy}" (${plan.rationale}).

Personalization guidance: ${describePersonalizationForPrompt(personalizationProfile)}

Follow this teaching framework when composing your explanation: Connect to what the student likely already knows, Explain the core idea clearly, Illustrate it, work through one Example, then end with a short Check Understanding question (e.g. "What do you think happens next?" or "Can you try explaining that back in your own words?"). Do not invent facts about the concept beyond what's given above.

Respond with:
- concept: the concept's name.
- explanation: the full Connect-Explain-Illustrate-Check narrative described above, as one piece of natural teaching prose.
- example: one concrete worked example matching the personalization guidance's example style.
- nextStep: "Practice" if the student seems ready to try problems on their own, "Clarification" if you think they'll need another explanation pass first, or "Summary" if this is wrapping up a revision.
- confidence: your own confidence (0 to 1) that this explanation will land for this student.`;
}
