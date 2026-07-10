import type { IntentObject } from "@/lib/agents/intent-object";
import type { PlanningContext } from "@/lib/agents/planning-context";
import type { LearnerStateProvider } from "@/lib/learner/learner-state-provider";
import type { KnowledgeProvider } from "@/lib/knowledge/knowledge-provider";
import type { ConceptSearchProvider } from "@/lib/knowledge/concept-search-provider";

/**
 * Below this, a concept the learner has attempted before is still treated
 * as needing guided practice rather than pure practice -- named, not
 * inlined, so it can be tuned once real mastery data exists (M8).
 */
export const HIGH_MASTERY_THRESHOLD = 0.8;

export type TeachingStrategyName =
  | "Diagnostic"
  | "ConceptFirst"
  | "GuidedDiscovery"
  | "PracticeFirst"
  | "Revision";

export type LearningPlan = {
  strategy: TeachingStrategyName;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  pace: "Slow" | "Medium" | "Fast";
  followUpRequired: boolean;
  rationale: string;
};

/**
 * Assembles the standard Planning input contract. Planning Agent depends
 * only on the LearnerStateProvider/KnowledgeProvider/ConceptSearchProvider
 * interfaces passed in -- never imports a concrete implementation itself
 * -- so swapping any of them (M5's real retrieval and search, M8's real
 * mastery data) never requires a change here. Search (resolving a topic
 * to a concept ID) and storage (reading a concept's details by ID) are
 * deliberately separate calls, per the M5 design agreement, so search
 * can evolve independently of how curriculum knowledge is stored.
 */
export async function buildPlanningContext(
  intent: IntentObject,
  studentId: string,
  learnerStateProvider: LearnerStateProvider,
  knowledgeProvider: KnowledgeProvider,
  conceptSearchProvider: ConceptSearchProvider,
): Promise<PlanningContext> {
  const learnerState = await learnerStateProvider.getLearnerState(studentId);
  const conceptId = await conceptSearchProvider.findConceptIdByTopic(
    intent.topic,
    intent.subtopic,
  );
  const concept = conceptId ? await knowledgeProvider.getConcept(conceptId) : null;

  const [learningObjectives, misconceptions, teachingStrategies] = concept
    ? await Promise.all([
        knowledgeProvider.getLearningObjectives(concept.id),
        knowledgeProvider.getMisconceptions(concept.id),
        knowledgeProvider.getTeachingStrategies(concept.id),
      ])
    : [[], [], []];

  return {
    intent,
    learnerState,
    concept,
    learningObjectives,
    misconceptions,
    teachingStrategies,
  };
}

/**
 * Pure decision logic -- no I/O, easily unit-tested with a hand-built
 * PlanningContext. Mirrors 05_Agent_Architecture/05_Planning_agent.md's
 * Decision Tree and Recovery Strategy. Every real learner reports
 * `isKnown: false` until M8 exists, so the Diagnostic branch is expected
 * to dominate in production for now -- that's correct spec behavior, not
 * a bug (see Recovery Strategy: "If learner profile is incomplete: Ask
 * diagnostic questions").
 */
export function decidePlan(context: PlanningContext): LearningPlan {
  if (!context.learnerState.isKnown) {
    return {
      strategy: "Diagnostic",
      difficulty: "Beginner",
      pace: "Slow",
      followUpRequired: true,
      rationale: "Learner profile is unknown -- diagnosing before teaching.",
    };
  }

  if (!context.concept) {
    return {
      strategy: "Diagnostic",
      difficulty: "Beginner",
      pace: "Slow",
      followUpRequired: true,
      rationale:
        "No matching concept found in the curriculum dataset for this topic.",
    };
  }

  const conceptId = context.concept.id;
  const mastery = context.learnerState.masteryByConcept?.[conceptId];
  const isWeak = context.learnerState.weakConceptIds?.includes(conceptId);

  if (isWeak) {
    return {
      strategy: "Revision",
      difficulty: "Intermediate",
      pace: "Medium",
      followUpRequired: true,
      rationale: `${context.concept.name} is a recorded weak concept -- revisiting before moving on.`,
    };
  }

  if (mastery === undefined) {
    return {
      strategy: "ConceptFirst",
      difficulty: "Beginner",
      pace: "Slow",
      followUpRequired: true,
      rationale: `${context.concept.name} has no recorded attempts -- treating as new.`,
    };
  }

  if (mastery >= HIGH_MASTERY_THRESHOLD) {
    return {
      strategy: "PracticeFirst",
      difficulty: "Advanced",
      pace: "Fast",
      followUpRequired: false,
      rationale: `Mastery of ${context.concept.name} is high (${mastery}) -- favoring practice over re-explanation.`,
    };
  }

  return {
    strategy: "GuidedDiscovery",
    difficulty: "Intermediate",
    pace: "Medium",
    followUpRequired: true,
    rationale: `Mastery of ${context.concept.name} is partial (${mastery}) -- guiding before explaining directly.`,
  };
}

/**
 * Translates a LearningPlan into a short natural-language instruction
 * appended to M1's existing teaching-reply system prompt -- the concrete
 * way Planning's output becomes observable this milestone, without a
 * Concept Agent (M6) to execute a structured multi-step flow yet.
 */
export function describeLearningPlanForPrompt(plan: LearningPlan): string {
  const paceNote = `Keep the pace ${plan.pace.toLowerCase()} and the language ${plan.difficulty.toLowerCase()}-level.`;

  switch (plan.strategy) {
    case "Diagnostic":
      return `This student's background on this topic isn't known yet. Start by gently checking what they already know with a question before explaining anything. ${paceNote}`;
    case "ConceptFirst":
      return `This appears to be a new concept for the student. Explain the core idea clearly, give one worked example, then check understanding before moving on. ${paceNote}`;
    case "GuidedDiscovery":
      return `The student has some prior exposure to this topic but isn't fully confident. Guide them with a question or hint before explaining directly. ${paceNote}`;
    case "PracticeFirst":
      return `The student already shows strong mastery of this topic. Keep any explanation brief and favor a practice-oriented response. ${paceNote}`;
    case "Revision":
      return `This is a revision opportunity for a topic the student has struggled with before. Briefly recall the key idea, then focus on reinforcing it. ${paceNote}`;
  }
}
