import { test } from "node:test";
import assert from "node:assert/strict";
import { validateAssessmentInput, computeTotalPoints, type AssessmentQuestion } from "@/lib/teacher-assessments/assessment-builder-aggregation";

function question(overrides: Partial<AssessmentQuestion> = {}): AssessmentQuestion {
  return { id: "q1", text: "What is 2+2?", points: 1, ...overrides };
}

test("validateAssessmentInput rejects an empty title", () => {
  const result = validateAssessmentInput("  ", [question()]);
  assert.equal(result.valid, false);
});

test("validateAssessmentInput rejects zero questions", () => {
  const result = validateAssessmentInput("Quiz", []);
  assert.equal(result.valid, false);
});

test("validateAssessmentInput rejects a question with empty text", () => {
  const result = validateAssessmentInput("Quiz", [question({ text: "  " })]);
  assert.equal(result.valid, false);
});

test("validateAssessmentInput rejects a non-positive points value", () => {
  assert.equal(validateAssessmentInput("Quiz", [question({ points: 0 })]).valid, false);
  assert.equal(validateAssessmentInput("Quiz", [question({ points: -1 })]).valid, false);
  assert.equal(validateAssessmentInput("Quiz", [question({ points: NaN })]).valid, false);
});

test("validateAssessmentInput accepts a well-formed title + questions", () => {
  const result = validateAssessmentInput("Quiz", [question(), question({ id: "q2", points: 2 })]);
  assert.equal(result.valid, true);
});

test("computeTotalPoints sums every question's points", () => {
  const questions = [question({ points: 1 }), question({ id: "q2", points: 3 }), question({ id: "q3", points: 2 })];
  assert.equal(computeTotalPoints(questions), 6);
});

test("computeTotalPoints returns 0 for an empty question list", () => {
  assert.equal(computeTotalPoints([]), 0);
});
