import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildDimensionTrends,
  computeSafetyCleanRate,
  computeHallucinationRiskRate,
  filterBySourceAgent,
  buildFlaggedInteractions,
  type EvaluationCompletedRow,
  type FlaggedInteractionRow,
} from "@/lib/evaluation-analytics/evaluation-analytics-aggregation";

function row(overrides: Partial<EvaluationCompletedRow> = {}): EvaluationCompletedRow {
  return {
    createdAt: "2026-01-10T12:00:00Z",
    sourceAgent: "Concept",
    overallScore: 90,
    groundedness: 90,
    accuracy: 90,
    educationalQuality: 90,
    personalization: 90,
    clarity: 90,
    safety: 100,
    hallucinationRisk: "Low",
    ...overrides,
  };
}

test("buildDimensionTrends averages per day and skips null groundedness rather than treating it as 0", () => {
  const rows = [
    row({ createdAt: "2026-01-10T08:00:00Z", groundedness: 80 }),
    row({ createdAt: "2026-01-10T20:00:00Z", groundedness: null }),
  ];
  const trends = buildDimensionTrends(rows);
  assert.equal(trends.groundedness.length, 1);
  assert.equal(trends.groundedness[0].value, 80);
});

test("buildDimensionTrends produces one point per day, sorted ascending, across all dimensions", () => {
  const rows = [
    row({ createdAt: "2026-01-12T00:00:00Z", overallScore: 80 }),
    row({ createdAt: "2026-01-10T00:00:00Z", overallScore: 60 }),
    row({ createdAt: "2026-01-10T12:00:00Z", overallScore: 70 }),
  ];
  const trends = buildDimensionTrends(rows);
  assert.deepEqual(
    trends.overallScore.map((p) => p.date),
    ["2026-01-10", "2026-01-12"],
  );
  assert.equal(trends.overallScore[0].value, 65);
});

test("computeSafetyCleanRate returns 0 for an empty window, not NaN", () => {
  assert.equal(computeSafetyCleanRate([]), 0);
});

test("computeSafetyCleanRate computes the percentage at/above the clean threshold", () => {
  const rows = [row({ safety: 100 }), row({ safety: 96 }), row({ safety: 80 }), row({ safety: 40 })];
  assert.equal(computeSafetyCleanRate(rows), 50);
});

test("computeHallucinationRiskRate counts only High risk, not Medium", () => {
  const rows = [
    row({ hallucinationRisk: "High" }),
    row({ hallucinationRisk: "Medium" }),
    row({ hallucinationRisk: "Low" }),
    row({ hallucinationRisk: null }),
  ];
  assert.equal(computeHallucinationRiskRate(rows), 25);
});

test("filterBySourceAgent returns everything when no filter is given", () => {
  const rows = [row({ sourceAgent: "Concept" }), row({ sourceAgent: "Practice" })];
  assert.equal(filterBySourceAgent(rows, null).length, 2);
});

test("filterBySourceAgent narrows to the requested agent", () => {
  const rows = [row({ sourceAgent: "Concept" }), row({ sourceAgent: "Practice" }), row({ sourceAgent: "Practice" })];
  assert.equal(filterBySourceAgent(rows, "Practice").length, 2);
});

test("buildFlaggedInteractions merges, sorts newest-first, and caps at 20", () => {
  const flagged: FlaggedInteractionRow[] = Array.from({ length: 25 }, (_, i) => ({
    traceId: `t${i}`,
    sourceAgent: "Concept",
    createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    reason: "low_quality",
    detail: "NeedsImprovement",
  }));
  const result = buildFlaggedInteractions(flagged);
  assert.equal(result.length, 20);
  assert.equal(result[0].traceId, "t24");
});
