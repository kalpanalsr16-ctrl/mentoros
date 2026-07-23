import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveChildRecommendation } from "@/lib/parent-portal/child-recommendation";
import type { AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

function item(overrides: Partial<AssessmentHistoryItem["report"]> & { conceptName?: string }): AssessmentHistoryItem {
  return {
    id: "1",
    createdAt: new Date().toISOString(),
    conceptName: overrides.conceptName ?? "Fractions",
    report: {
      masteryScore: 0.5,
      status: "Developing",
      misconceptions: [],
      feedback: "",
      recommendedNextStep: "ContinueLearning",
      ...overrides,
    },
  };
}

test("deriveChildRecommendation returns null with no assessment history", () => {
  assert.equal(deriveChildRecommendation([]), null);
});

test("deriveChildRecommendation uses the most recent item (items[0]), not the oldest", () => {
  const items = [
    item({ conceptName: "Fractions", recommendedNextStep: "StartRevision" }),
    item({ conceptName: "Decimals", recommendedNextStep: "AdvanceToNextTopic" }),
  ];
  const result = deriveChildRecommendation(items);
  assert.equal(result?.conceptName, "Fractions");
  assert.equal(result?.step, "StartRevision");
});

test("deriveChildRecommendation produces a plain sentence naming the concept, for every step", () => {
  const steps: Array<AssessmentHistoryItem["report"]["recommendedNextStep"]> = [
    "ContinueLearning",
    "GenerateMorePractice",
    "ReturnToConceptExplanation",
    "StartRevision",
    "AdvanceToNextTopic",
  ];
  for (const step of steps) {
    const result = deriveChildRecommendation([item({ conceptName: "Algebra", recommendedNextStep: step })]);
    assert.equal(result?.step, step);
    assert.ok(result?.sentence.includes("Algebra"), `sentence for ${step} should name the concept`);
  }
});
