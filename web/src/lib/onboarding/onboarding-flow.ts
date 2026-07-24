import type { ChipOption } from "@/design-system/primitives/ChipSelect";

/**
 * Pure step/data logic for the onboarding flow (Sprint 4, Epic F1),
 * separated from OnboardingFlow.tsx so it's directly unit-testable
 * without rendering React -- same split this codebase already uses for
 * resolve-shell.ts and resolve-theme.ts.
 */

export type OnboardingStep = "welcome" | "grade" | "goals" | "style" | "diagnostic";

/**
 * Shared with app/app/profile/ProfileForm.tsx (Epic F8) -- Profile is
 * "this same flow's persistent, editable form" per
 * 02_Student_Experience.md's Profile section, so it reuses these exact
 * option sets rather than maintaining a second copy that could drift.
 */
export const GRADE_OPTIONS: ChipOption[] = Array.from({ length: 10 }, (_, i) => ({
  value: String(i + 1),
  label: `Grade ${i + 1}`,
}));

export const GOAL_OPTIONS: ChipOption[] = [
  { value: "ImproveGrades", label: "Improve my grades" },
  { value: "BuildConfidence", label: "Build confidence" },
  { value: "PrepareForExams", label: "Prepare for exams" },
  { value: "LearnAhead", label: "Learn ahead of class" },
  { value: "CatchUp", label: "Catch up on the basics" },
  { value: "ForFun", label: "Just for fun" },
];

export const STYLE_OPTIONS: ChipOption[] = [
  { value: "Visual", label: "Pictures and diagrams" },
  { value: "Conversational", label: "Talking it through" },
  { value: "StepByStep", label: "Step by step" },
  { value: "ExampleFirst", label: "Show me an example first" },
  { value: "PracticeFirst", label: "Let me try it myself" },
];

/**
 * "Skippable after step 2" (docs/design-system/04-UX-Design-Experiences.md
 * §11.2) -- grade is Step 2 here (Welcome doesn't count as a real
 * question), so Skip is offered from "grade" onward, never on "welcome".
 */
export const STEP_ORDER: OnboardingStep[] = ["welcome", "grade", "goals", "style", "diagnostic"];

export function nextStep(current: OnboardingStep): OnboardingStep | null {
  const index = STEP_ORDER.indexOf(current);
  return STEP_ORDER[index + 1] ?? null;
}

export function isSkippable(step: OnboardingStep): boolean {
  return step !== "welcome";
}

export type OnboardingSelections = {
  grade: string[];
  goals: string[];
  style: string[];
};

/**
 * Only ever includes fields the student actually answered -- Skip (even
 * with every array empty) still produces a valid, if empty, PATCH body,
 * which is exactly what onboarding needs: a minimal learner_profiles row
 * gets written either way (see PATCH /api/student/profile's upsert), so
 * the student is never re-prompted, but nothing is invented on their
 * behalf for fields they didn't touch.
 */
export function buildProfilePatchBody(selections: OnboardingSelections): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (selections.grade[0]) {
    body.grade = Number(selections.grade[0]);
  }
  if (selections.goals.length > 0) {
    body.learningGoals = selections.goals;
  }
  if (selections.style[0]) {
    body.preferredLearningStyle = selections.style[0];
  }

  return body;
}
