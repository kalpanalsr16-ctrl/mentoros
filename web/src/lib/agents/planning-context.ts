import type { IntentObject } from "@/lib/agents/intent-object";
import type { LearnerState } from "@/lib/learner/learner-state";
import type {
  Concept,
  LearningObjective,
  Misconception,
  TeachingStrategy,
} from "@/lib/knowledge/curriculum-types";

/**
 * The standard input contract for Planning Agent -- aggregates everything
 * a planning decision needs (Router's intent, the learner's state, and
 * the resolved curriculum knowledge for the topic in question) into one
 * object, rather than Planning Agent pulling each piece separately. This
 * is the shape future Planning-adjacent work (Memory, Retrieval,
 * Analytics) should also build against, per the M3 design agreement.
 */
export type PlanningContext = {
  intent: IntentObject;
  learnerState: LearnerState;
  concept: Concept | null;
  learningObjectives: LearningObjective[];
  misconceptions: Misconception[];
  teachingStrategies: TeachingStrategy[];
};
