import { test } from "node:test";
import assert from "node:assert/strict";
import { buildWeeklySummary } from "@/lib/parent-portal/weekly-summary";
import type { AssessmentHistoryItem } from "@/lib/assessment-history/assessment-history-aggregation";

const NOW = new Date("2026-01-15T12:00:00Z");

function item(daysAgo: number, conceptName: string, masteryScore: number): AssessmentHistoryItem {
  const createdAt = new Date(NOW.getTime() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  return {
    id: `${conceptName}-${daysAgo}-${masteryScore}`,
    createdAt,
    conceptName,
    report: { masteryScore, status: "Developing", misconceptions: [], feedback: "", recommendedNextStep: "ContinueLearning" },
  };
}

test("buildWeeklySummary returns the no-activity bullet when nothing happened in the window", () => {
  assert.deepEqual(buildWeeklySummary([], NOW), ["No practice activity this week."]);
});

test("buildWeeklySummary excludes events older than 7 days", () => {
  const items = [item(10, "Fractions", 90)];
  assert.deepEqual(buildWeeklySummary(items, NOW), ["No practice activity this week."]);
});

test("buildWeeklySummary reports improvement from the oldest to the newest in-window score", () => {
  // items arrive newest-first, matching getAssessmentHistoryData's own order.
  const items = [item(1, "Addition", 78), item(3, "Addition", 62)];
  const result = buildWeeklySummary(items, NOW);
  assert.equal(result.length, 1);
  assert.equal(result[0], "Practiced Addition 2 times this week and improved from 62% to 78% mastery.");
});

test("buildWeeklySummary reports a dip honestly, not spun as improvement", () => {
  const items = [item(1, "Subtraction", 50), item(3, "Subtraction", 70)];
  const result = buildWeeklySummary(items, NOW);
  assert.equal(result[0], "Practiced Subtraction 2 times this week and dipped from 70% to 50% mastery.");
});

test("buildWeeklySummary reports steady mastery for a single data point", () => {
  const items = [item(2, "Geometry", 80)];
  const result = buildWeeklySummary(items, NOW);
  assert.equal(result[0], "Practiced Geometry 1 time this week and is holding steady at 80% mastery.");
});

test("buildWeeklySummary caps at 3 bullets, most-practiced concepts first", () => {
  const items = [
    ...Array.from({ length: 5 }, (_, i) => item(1, "Popular", 50 + i)),
    ...Array.from({ length: 3 }, (_, i) => item(1, "Medium", 50 + i)),
    item(1, "Rare", 50),
  ];
  const result = buildWeeklySummary(items, NOW);
  assert.equal(result.length, 3);
  assert.ok(result[0].includes("Popular"));
  assert.ok(result[1].includes("Medium"));
  assert.ok(result[2].includes("Rare"));
});
