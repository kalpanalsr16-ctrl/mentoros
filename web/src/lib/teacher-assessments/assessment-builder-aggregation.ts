export type AssessmentQuestion = {
  id: string;
  text: string;
  points: number;
};

export type AssessmentSummary = {
  id: string;
  title: string;
  questionCount: number;
  totalPoints: number;
  createdAt: string;
};

export type ValidationResult = { valid: true } | { valid: false; error: string };

/**
 * `assessments_authored.questions` has no schema-level constraint (see
 * the migration's own comment) -- validated here instead, at the same
 * layer every other jsonb-payload write path in this codebase validates
 * at (e.g. create-link-request.ts's UUID check). A title is required;
 * an assessment needs at least one question; every question needs
 * non-empty text and a positive points value.
 */
export function validateAssessmentInput(title: string, questions: AssessmentQuestion[]): ValidationResult {
  if (title.trim().length === 0) {
    return { valid: false, error: "A title is required." };
  }
  if (questions.length === 0) {
    return { valid: false, error: "At least one question is required." };
  }
  for (const question of questions) {
    if (question.text.trim().length === 0) {
      return { valid: false, error: "Every question needs text." };
    }
    if (!Number.isFinite(question.points) || question.points <= 0) {
      return { valid: false, error: "Every question needs a positive points value." };
    }
  }
  return { valid: true };
}

export function computeTotalPoints(questions: AssessmentQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.points, 0);
}
