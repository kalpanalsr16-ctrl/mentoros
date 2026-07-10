/**
 * TypeScript mirror of the subset of 12_Learner_Profile_Model.md that
 * Planning Agent (05_Agent_Architecture/05_Planning_agent.md) and
 * Personalization Agent (05_Agent_Architecture/06_Personalization_Agent.md)
 * actually read: mastery levels, weak/strong concepts, confidence,
 * learning goals, and preferred learning style. `isKnown: false` is a
 * real, first-class state -- not an error -- since no writer
 * (Assessment/Memory Agents) exists until M7/M8, so every real student is
 * "unknown" until then.
 */
export type PreferredLearningStyle =
  | "Visual"
  | "Conversational"
  | "StepByStep"
  | "ExampleFirst"
  | "PracticeFirst";

export type LearnerState = {
  isKnown: boolean;
  grade?: number;
  masteryByConcept?: Record<string, number>;
  weakConceptIds?: string[];
  strongConceptIds?: string[];
  confidence?: "Low" | "Medium" | "High";
  learningGoals?: string[];
  preferredLearningStyle?: PreferredLearningStyle;
};
