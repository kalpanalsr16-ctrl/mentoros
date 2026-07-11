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
import type { PracticeAgentResult } from "@/lib/llm/client";

/**
 * Practice Agent's input contract, per
 * 05_Agent_Architecture/09_Practice_Agent.md's Inputs section: Learning
 * Plan (M3), Personalization Profile (M4), Knowledge Package (M5), and
 * "Concept Agent Output" -- represented here as `history` (the same
 * Context Object every other agent already uses), not a dedicated
 * persisted Concept-Agent-output store. Nothing in this codebase persists
 * an agent's structured output between turns yet; Practice Agent reads
 * what was just explained the same way Concept Agent reads what was
 * previously said, through conversation history.
 *
 * `concept` is non-null -- callers only construct this once a topic has
 * actually resolved (see the route's gate: Router's primaryIntent is
 * "Practice" and a concept resolved), per Practice Agent's own Inputs
 * section requiring a Knowledge Package to generate aligned questions
 * from.
 */
export type PracticeAgentContext = {
  concept: Concept;
  learningObjectives: LearningObjective[];
  misconceptions: Misconception[];
  teachingStrategies: TeachingStrategy[];
  plan: LearningPlan;
  personalizationProfile: PersonalizationProfile;
  history: ClaudeMessage[];
};

/**
 * Practice Agent's own five-level difficulty scale, per
 * 09_Practice_Agent.md's Difficulty Levels section -- deliberately
 * distinct from Planning's three-level `difficulty` (Beginner/
 * Intermediate/Advanced); Practice's scale is finer-grained by design.
 */
export type PracticeDifficulty = "Beginner" | "Easy" | "Medium" | "Advanced" | "Challenge";

/**
 * Structured output, per 09_Practice_Agent.md's Outputs section
 * (renamed to camelCase for this codebase's convention).
 */
export type PracticeSet = {
  topic: string;
  questions: string[];
  difficulty: PracticeDifficulty;
  estimatedTime: string;
  learningGoal: string;
};

/**
 * `generate` is an injected function (the caller passes
 * generatePracticeSet from lib/llm/client in production), the same seam
 * router-agent.ts's classifyIntent and concept-agent.ts's explainConcept
 * already use -- unit-testable without the Anthropic SDK, fails open.
 */
export async function createPracticeSet(
  context: PracticeAgentContext,
  generate: (context: PracticeAgentContext) => Promise<PracticeAgentResult>,
): Promise<PracticeAgentResult> {
  return generate(context);
}

/**
 * Composes the structured PracticeSet into the plain-text message
 * MentorOS actually stores/displays, same reasoning as
 * formatTeachingResponseAsReply() in concept-agent.ts.
 */
export function formatPracticeSetAsReply(set: PracticeSet): string {
  const numberedQuestions = set.questions.map((question, index) => `${index + 1}. ${question}`).join("\n");
  return `${set.learningGoal}\n\n${numberedQuestions}`;
}

/**
 * Builds the system prompt driving generatePracticeSet(), grounded in
 * 09_Practice_Agent.md's Practice Principles, Question Types, Difficulty
 * Levels, Question Sequencing, and Misconception Targeting sections.
 *
 * The full spec's Adaptive Practice (react to how the learner performs
 * across multiple practice sessions) and Hint Strategy's progressive
 * multi-step hints are deliberately not implemented here -- there's no
 * persisted practice history to adapt against yet (same "no Learning
 * State writer" gap M6 already flagged), and hints require a dedicated
 * HintRequested interaction this milestone doesn't add. What v1 does:
 * generates one aligned, misconception-aware practice set per request,
 * sequenced per Bloom's-aligned progression within that one set.
 */
export function buildPracticeAgentSystemPrompt(context: PracticeAgentContext): string {
  const { concept, learningObjectives, misconceptions, teachingStrategies, plan, personalizationProfile } = context;

  const objectivesText = learningObjectives.length
    ? learningObjectives.map((o) => `- ${o.statement}`).join("\n")
    : "- (none recorded for this concept)";

  const misconceptionsText = misconceptions.length
    ? misconceptions.map((m) => `- ${m.description}`).join("\n")
    : "- (none recorded for this concept)";

  const strategiesText = teachingStrategies.length
    ? teachingStrategies.map((s) => `- ${s.description}`).join("\n")
    : "- (none recorded for this concept)";

  return `You are the Practice Agent inside MentorOS, an AI tutor for Primary and High School students. Your job is to design personalized, curriculum-aligned practice that reinforces understanding -- per 05_Agent_Architecture/09_Practice_Agent.md, you are out of scope for explaining concepts, evaluating answers, or updating learner memory; those are handled elsewhere.

Concept to practice: "${concept.name}" -- ${concept.description}

Learning objectives to reinforce:
${objectivesText}

Known misconceptions to intentionally probe for (per the spec's Misconception Targeting):
${misconceptionsText}

Suggested teaching strategies for this concept (useful context for what's already been taught):
${strategiesText}

Planning Agent's decision for this turn: strategy "${plan.strategy}", recommended difficulty "${plan.difficulty}" (${plan.rationale}).

Personalization guidance: ${describePersonalizationForPrompt(personalizationProfile)}

Generate 3 to 5 questions, sequenced along Recall -> Understand -> Apply -> Analyze (per the spec's Question Sequencing), drawing from the spec's supported formats (Concept Check, Worked Example Completion, Multiple Choice, Numerical Problems, Word Problems, True/False, Explain Your Thinking, Challenge) as fits the concept -- do not make every question the same format. At least one question should be designed to reveal one of the misconceptions listed above, if any are listed. Do not invent facts about the concept beyond what's given above.

Respond with:
- topic: the concept's name.
- questions: an array of 3 to 5 question strings, in the sequence described above.
- difficulty: one of Beginner, Easy, Medium, Advanced, or Challenge -- informed by Planning's recommended difficulty above, but using this finer five-level scale.
- estimatedTime: a short human-readable estimate (e.g. "8 minutes").
- learningGoal: one sentence framing what this practice set is for, shown to the student before the questions.`;
}
