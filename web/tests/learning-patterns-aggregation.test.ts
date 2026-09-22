import { test } from "node:test";
import assert from "node:assert/strict";
import { buildRepeatedChallenges } from "@/lib/learning-patterns/learning-patterns-aggregation";
import type { ConfusionItem } from "@/lib/misconceptions/student-confusion-aggregation";

function confusion(overrides: Partial<ConfusionItem>): ConfusionItem {
  return {
    text: "Borrowing across zero",
    frequency: 3,
    conceptIds: ["subtraction-with-regrouping"],
    conceptNames: ["Subtraction with regrouping"],
    firstSeenAt: "2026-01-01",
    lastSeenAt: "2026-01-10",
    ...overrides,
  };
}

test("attaches a real prerequisite concept name when one exists in concept_relationships", () => {
  const prereqs = new Map([["subtraction-with-regrouping", "Subtraction without regrouping"]]);
  const result = buildRepeatedChallenges([confusion({})], prereqs);
  assert.equal(result[0].prerequisiteConceptName, "Subtraction without regrouping");
});

test("omits the prerequisite line (null, not a guess) when no real prerequisite edge exists", () => {
  const result = buildRepeatedChallenges([confusion({})], new Map());
  assert.equal(result[0].prerequisiteConceptName, null);
});

test("preserves the underlying confusion data untouched", () => {
  const result = buildRepeatedChallenges([confusion({ frequency: 5 })], new Map());
  assert.equal(result[0].frequency, 5);
  assert.equal(result[0].text, "Borrowing across zero");
});
