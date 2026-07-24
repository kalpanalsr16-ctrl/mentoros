import { test } from "node:test";
import assert from "node:assert/strict";
import { mapAssessmentEvents, type AssessmentEventRow } from "@/lib/assessment-history/assessment-history-aggregation";

function row(overrides: Partial<AssessmentEventRow>): AssessmentEventRow {
  return {
    id: "evt-1",
    created_at: "2026-07-01T00:00:00.000Z",
    payload: {
      conceptName: "Addition",
      masteryScore: 82,
      status: "Proficient",
      misconceptions: ["Forgets to carry the 1"],
      feedback: "Nice work on regrouping.",
      recommendedNextStep: "AdvanceToNextTopic",
    },
    ...overrides,
  };
}

test("mapAssessmentEvents builds a full AssessmentReport straight from payload", () => {
  const [item] = mapAssessmentEvents([row({})]);
  assert.equal(item.conceptName, "Addition");
  assert.deepEqual(item.report, {
    masteryScore: 82,
    status: "Proficient",
    misconceptions: ["Forgets to carry the 1"],
    feedback: "Nice work on regrouping.",
    recommendedNextStep: "AdvanceToNextTopic",
  });
});

test("mapAssessmentEvents falls back safely when a pre-Sprint-F5 row has none of the new fields", () => {
  const [item] = mapAssessmentEvents([
    row({ payload: { masteryScore: 40, status: "NeedsSupport" } }),
  ]);
  assert.equal(item.conceptName, "This concept");
  assert.deepEqual(item.report.misconceptions, []);
  assert.equal(item.report.feedback, "");
  assert.equal(item.report.recommendedNextStep, "ContinueLearning");
});

test("mapAssessmentEvents falls back to Beginner/ContinueLearning for invalid enum values", () => {
  const [item] = mapAssessmentEvents([
    row({ payload: { status: "Nonsense", recommendedNextStep: "Nonsense" } }),
  ]);
  assert.equal(item.report.status, "Beginner");
  assert.equal(item.report.recommendedNextStep, "ContinueLearning");
});

test("mapAssessmentEvents drops non-string entries from a malformed misconceptions array", () => {
  const [item] = mapAssessmentEvents([
    row({ payload: { misconceptions: ["real one", 42, null] } }),
  ]);
  assert.deepEqual(item.report.misconceptions, ["real one"]);
});
