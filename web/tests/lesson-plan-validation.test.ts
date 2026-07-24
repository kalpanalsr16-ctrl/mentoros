import { test } from "node:test";
import assert from "node:assert/strict";
import { validateLessonInput, isValidLessonStatus } from "@/lib/teacher-lessons/lesson-plan-validation";

test("isValidLessonStatus accepts only draft/published", () => {
  assert.equal(isValidLessonStatus("draft"), true);
  assert.equal(isValidLessonStatus("published"), true);
  assert.equal(isValidLessonStatus("archived"), false);
  assert.equal(isValidLessonStatus(""), false);
});

test("validateLessonInput rejects an empty title", () => {
  const result = validateLessonInput({ title: "  ", classId: "c1", status: "draft" });
  assert.equal(result.valid, false);
});

test("validateLessonInput rejects an empty classId", () => {
  const result = validateLessonInput({ title: "Fractions intro", classId: "", status: "draft" });
  assert.equal(result.valid, false);
});

test("validateLessonInput rejects an invalid status", () => {
  const result = validateLessonInput({ title: "Fractions intro", classId: "c1", status: "archived" });
  assert.equal(result.valid, false);
});

test("validateLessonInput accepts a well-formed minimal input", () => {
  const result = validateLessonInput({ title: "Fractions intro", classId: "c1", status: "draft" });
  assert.equal(result.valid, true);
});
