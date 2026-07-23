import type { PracticeDifficulty } from "@/lib/agents/practice-agent";
import type { LearningPlan } from "@/lib/agents/planning-agent";
import type { PersonalizationProfile } from "@/lib/agents/personalization-agent";
import type { PreferredLearningStyle } from "@/lib/learner/learner-state";

/**
 * Constructs the two synthetic context pieces Practice Agent's real
 * PracticeAgentContext needs (LearningPlan, PersonalizationProfile) for
 * a teacher-initiated homework generation -- there is no live student
 * turn here, so Planning/Personalization Agent's actual decision
 * functions don't apply (both require a live IntentObject/PlanningContext
 * that doesn't exist outside a real chat turn). This module builds the
 * same output *types* directly instead, using real student data when a
 * specific student is targeted, and Personalization Agent's own
 * documented "Recovery Strategy" default (03_Teacher_Studio.md's
 * Homework Generator section names "reuses Practice Agent's existing
 * generation pattern" -- this extends that same reasoning to
 * Personalization's contract) when generating for a whole class or an
 * unknown student. Neither planning-agent.ts nor personalization-agent.ts
 * is imported or modified -- only their exported types.
 */

const PRACTICE_TO_PLANNING_DIFFICULTY: Record<PracticeDifficulty, LearningPlan["difficulty"]> = {
  Beginner: "Beginner",
  Easy: "Beginner",
  Medium: "Intermediate",
  Advanced: "Advanced",
  Challenge: "Advanced",
};

export function mapPracticeDifficultyToLevel(difficulty: PracticeDifficulty): LearningPlan["difficulty"] {
  return PRACTICE_TO_PLANNING_DIFFICULTY[difficulty];
}

export function buildHomeworkLearningPlan(difficulty: PracticeDifficulty): LearningPlan {
  return {
    strategy: "PracticeFirst",
    difficulty: mapPracticeDifficultyToLevel(difficulty),
    pace: "Medium",
    followUpRequired: false,
    rationale: "Teacher-selected difficulty for homework generation -- not a live Planning Agent decision.",
  };
}

export type StudentPersonalizationInput = {
  confidence?: "Low" | "Medium" | "High";
  preferredLearningStyle?: PreferredLearningStyle;
} | null;

/**
 * `student` is null for a class-wide generation (no single learner to
 * personalize for) or when a targeted student has no learner_profile row
 * yet -- both fall to the same standard, encouraging default, mirroring
 * Personalization Agent's own "insufficient learner information" branch.
 */
export function buildHomeworkPersonalizationProfile(
  student: StudentPersonalizationInput,
  difficulty: PracticeDifficulty,
): PersonalizationProfile {
  const level = mapPracticeDifficultyToLevel(difficulty);

  if (student?.confidence === "Low") {
    return {
      teachingStyle: student.preferredLearningStyle ?? "StepByStep",
      difficulty: level,
      pace: "Slow",
      exampleStyle: "RealLife",
      encouragement: "High",
      hintLevel: "Progressive",
      rationale: "Student's recorded confidence is low -- extra encouragement and step-by-step framing.",
    };
  }

  if (student?.preferredLearningStyle) {
    return {
      teachingStyle: student.preferredLearningStyle,
      difficulty: level,
      pace: "Medium",
      exampleStyle: "RealLife",
      encouragement: "Medium",
      hintLevel: "Progressive",
      rationale: `Using this student's recorded ${student.preferredLearningStyle} learning-style preference.`,
    };
  }

  return {
    teachingStyle: "StepByStep",
    difficulty: level,
    pace: "Medium",
    exampleStyle: "RealLife",
    encouragement: "Medium",
    hintLevel: "Progressive",
    rationale: "No specific learner profile available (class-wide generation, or an unknown student) -- standard, encouraging default.",
  };
}
