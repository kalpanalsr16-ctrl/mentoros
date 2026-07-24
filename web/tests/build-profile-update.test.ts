import { test } from "node:test";
import assert from "node:assert/strict";
import { buildProfileUpdate } from "@/lib/profile/build-profile-update";

const MASTERY_FIELD_NAMES = [
  "masteryScore",
  "mastery_score",
  "attempts",
  "lastPracticedAt",
  "last_practiced_at",
  "commonMistakes",
  "common_mistakes",
  "conceptId",
  "concept_id",
];

test("buildProfileUpdate writes only the four learner_profiles preference columns, plus id", () => {
  const result = buildProfileUpdate("student-1", {
    grade: 5,
    confidence: "High",
    preferredLearningStyle: "Visual",
    learningGoals: ["ImproveGrades"],
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(Object.keys(result.update).sort(), [
    "confidence",
    "grade",
    "id",
    "learning_goals",
    "preferred_learning_style",
  ]);
  assert.equal(result.update.id, "student-1");
});

test("buildProfileUpdate never lets any mastery-table field reach the update object, even if present on the request body", () => {
  const maliciousBody: Record<string, unknown> = {
    grade: 5,
    masteryScore: 999,
    mastery_score: 999,
    attempts: 999,
    lastPracticedAt: "2026-01-01",
    last_practiced_at: "2026-01-01",
    commonMistakes: ["hacked"],
    common_mistakes: ["hacked"],
    conceptId: "some-concept",
    concept_id: "some-concept",
  };

  const result = buildProfileUpdate("student-1", maliciousBody);
  assert.equal(result.ok, true);
  if (!result.ok) return;

  for (const field of MASTERY_FIELD_NAMES) {
    assert.equal(field in result.update, false, `${field} must never appear in a learner_profiles update`);
  }
});

test("buildProfileUpdate rejects an out-of-range grade", () => {
  const result = buildProfileUpdate("student-1", { grade: 13 });
  assert.equal(result.ok, false);
});

test("buildProfileUpdate rejects an invalid confidence value", () => {
  const result = buildProfileUpdate("student-1", { confidence: "Extreme" });
  assert.equal(result.ok, false);
});

test("buildProfileUpdate rejects a non-array learningGoals", () => {
  const result = buildProfileUpdate("student-1", { learningGoals: "not-an-array" });
  assert.equal(result.ok, false);
});

test("buildProfileUpdate accepts an empty body (only id in the update)", () => {
  const result = buildProfileUpdate("student-1", {});
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.update, { id: "student-1" });
});
