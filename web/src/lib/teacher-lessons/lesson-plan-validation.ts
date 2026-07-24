export type LessonStatus = "draft" | "published";

export const VALID_LESSON_STATUSES: LessonStatus[] = ["draft", "published"];

export type LessonPlanInput = {
  title: string;
  classId: string;
  status: string;
};

export type ValidationResult = { valid: true } | { valid: false; error: string };

export function isValidLessonStatus(status: string): status is LessonStatus {
  return (VALID_LESSON_STATUSES as string[]).includes(status);
}

/**
 * Only title/classId/status are validated here -- the class-ownership
 * and concept-existence checks both require a DB round-trip, so they
 * stay in create-lesson.ts/update-lesson.ts rather than this pure
 * module. Objectives/materials/procedure/notes are deliberately never
 * required (approved design: "teachers should be able to save an
 * incomplete draft").
 */
export function validateLessonInput(input: LessonPlanInput): ValidationResult {
  if (input.title.trim().length === 0) {
    return { valid: false, error: "A title is required." };
  }
  if (input.classId.trim().length === 0) {
    return { valid: false, error: "A class is required." };
  }
  if (!isValidLessonStatus(input.status)) {
    return { valid: false, error: "Invalid status." };
  }
  return { valid: true };
}
