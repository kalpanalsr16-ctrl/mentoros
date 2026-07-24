const VALID_CONFIDENCE = ["Low", "Medium", "High"] as const;
const VALID_LEARNING_STYLE = [
  "Visual",
  "Conversational",
  "StepByStep",
  "ExampleFirst",
  "PracticeFirst",
] as const;

export type ProfileUpdateResult =
  | { ok: true; update: Record<string, unknown> }
  | { ok: false; error: string };

/**
 * Validates and shapes PATCH /api/student/profile's request body into a
 * `learner_profiles` upsert payload -- extracted from the route handler
 * (Epic F8) so it's unit-testable without a real Supabase client. Only
 * ever reads four named fields off `body` (grade, confidence,
 * preferredLearningStyle, learningGoals) and only ever writes their four
 * `learner_profiles` column counterparts -- by construction, nothing else
 * on the request body (however named, e.g. an attempted `masteryScore` or
 * `mastery_score`) can reach the returned update object. `learner_
 * concept_mastery` (the actual mastery table) is a different table this
 * function never touches at all; only Memory Agent writes there.
 */
export function buildProfileUpdate(studentId: string, body: unknown): ProfileUpdateResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const input = body as Record<string, unknown>;
  const update: Record<string, unknown> = { id: studentId };

  if (input.grade !== undefined) {
    if (typeof input.grade !== "number" || input.grade < 1 || input.grade > 12) {
      return { ok: false, error: "grade must be a number between 1 and 12." };
    }
    update.grade = input.grade;
  }

  if (input.confidence !== undefined) {
    if (!VALID_CONFIDENCE.includes(input.confidence as (typeof VALID_CONFIDENCE)[number])) {
      return { ok: false, error: "Invalid confidence value." };
    }
    update.confidence = input.confidence;
  }

  if (input.preferredLearningStyle !== undefined) {
    if (!VALID_LEARNING_STYLE.includes(input.preferredLearningStyle as (typeof VALID_LEARNING_STYLE)[number])) {
      return { ok: false, error: "Invalid preferredLearningStyle value." };
    }
    update.preferred_learning_style = input.preferredLearningStyle;
  }

  if (input.learningGoals !== undefined) {
    if (!Array.isArray(input.learningGoals) || !input.learningGoals.every((g: unknown) => typeof g === "string")) {
      return { ok: false, error: "learningGoals must be an array of strings." };
    }
    update.learning_goals = input.learningGoals;
  }

  return { ok: true, update };
}
